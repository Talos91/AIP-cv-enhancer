import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, FileText, Briefcase, GraduationCap, Wrench, BadgeCheck, FolderGit2,
  Target, Loader2, Plus, Trash2, Wand2, Save, CheckCircle2, AlertCircle, Eye, EyeOff,
} from 'lucide-react';
import { api } from '../lib/api';
import { store, EMPTY_CV } from '../lib/storage';
import CvPreview from '../components/CvPreview';

const STEPS = [
  { key: 'personal',    label: 'Personal',      icon: User },
  { key: 'summary',     label: 'Summary',       icon: FileText },
  { key: 'experience',  label: 'Experience',    icon: Briefcase },
  { key: 'education',   label: 'Education',     icon: GraduationCap },
  { key: 'skills',      label: 'Skills',        icon: Wrench },
  { key: 'certs',       label: 'Certifications',icon: BadgeCheck },
  { key: 'projects',    label: 'Projects',      icon: FolderGit2 },
  { key: 'ats',         label: 'ATS Review',    icon: Target },
];

const TEMPLATES = ['minimal', 'classic', 'modern'];

export default function Editor() {
  const navigate = useNavigate();
  const [doc, setDoc] = useState(() => store.getActive());
  const [step, setStep] = useState('personal');
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [showPreview, setShowPreview] = useState(true);
  const saveTimer = useRef();

  useEffect(() => {
    if (!doc) {
      const created = store.create({ name: 'Untitled CV', cv: { ...EMPTY_CV } });
      store.setActive(created.id);
      setDoc(created);
    }
  }, [doc]);

  const updateCv = (patch) => {
    setDoc((prev) => ({ ...prev, cv: { ...prev.cv, ...patch } }));
    scheduleSave();
  };
  const setField = (k) => (e) => updateCv({ [k]: e.target.value });

  const scheduleSave = () => {
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc((d) => {
        if (!d) return d;
        store.update(d.id, { cv: d.cv, name: d.name, template: d.template });
        return d;
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);
    }, 400);
  };

  const setTemplate = (t) => {
    setDoc((d) => ({ ...d, template: t }));
    scheduleSave();
  };

  const setName = (e) => {
    setDoc((d) => ({ ...d, name: e.target.value }));
    scheduleSave();
  };

  if (!doc) return <div className="text-sm text-slate-500">Loading…</div>;
  const cv = doc.cv;

  return (
    <div className="max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={doc.name}
          onChange={setName}
          className="bg-transparent text-xl font-bold text-white focus:outline-none border-b border-transparent hover:border-slate-700 focus:border-blue-500 pb-1 w-80 max-w-full"
        />
        <div className="ml-auto flex items-center gap-2">
          <SaveBadge state={saveState} />
          <select
            value={doc.template}
            onChange={(e) => setTemplate(e.target.value)}
            className="input !w-auto"
          >
            {TEMPLATES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-ghost flex items-center gap-1.5"
            title="Toggle preview"
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            Preview
          </button>
          <button
            onClick={() => navigate('/export')}
            className="btn-primary flex items-center gap-1.5"
          >
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: showPreview ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr' }}>
        {/* Left: wizard */}
        <div className="card overflow-hidden flex min-h-[70vh]">
          <StepRail step={step} setStep={setStep} cv={cv} />
          <div className="flex-1 p-5 overflow-y-auto">
            {step === 'personal'   && <PersonalStep cv={cv} setField={setField} />}
            {step === 'summary'    && <SummaryStep  cv={cv} setField={setField} updateCv={updateCv} />}
            {step === 'experience' && <ExperienceStep cv={cv} updateCv={updateCv} />}
            {step === 'education'  && <EducationStep cv={cv} updateCv={updateCv} />}
            {step === 'skills'     && <SkillsStep cv={cv} updateCv={updateCv} />}
            {step === 'certs'      && <CertsStep cv={cv} updateCv={updateCv} />}
            {step === 'projects'   && <ProjectsStep cv={cv} updateCv={updateCv} />}
            {step === 'ats'        && <ATSStep doc={doc} setDoc={setDoc} />}
          </div>
        </div>

        {/* Right: preview */}
        {showPreview && (
          <div className="card p-5 overflow-y-auto max-h-[80vh] bg-slate-900">
            <CvPreview cv={cv} template={doc.template} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Components ----------------------------------------------------------------

function SaveBadge({ state }) {
  if (state === 'saving') return (
    <span className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Saving…</span>
  );
  if (state === 'saved') return (
    <span className="text-xs text-green-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> Saved</span>
  );
  return <span className="text-xs text-slate-500 flex items-center gap-1.5"><Save size={12} /> Autosaved</span>;
}

function StepRail({ step, setStep, cv }) {
  const completion = (key) => {
    if (key === 'personal') return cv.full_name && cv.email;
    if (key === 'summary') return (cv.summary || '').length > 30;
    if (key === 'experience') return (cv.experience || []).length > 0;
    if (key === 'education') return (cv.education || []).length > 0;
    if (key === 'skills') return Object.values(cv.skills || {}).some((a) => (a || []).length);
    return false;
  };
  return (
    <div className="w-48 border-r border-slate-800 p-2 shrink-0">
      {STEPS.map((s) => {
        const active = s.key === step;
        const done = completion(s.key);
        return (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
            }`}
          >
            <s.icon size={14} />
            <span className="flex-1 text-left">{s.label}</span>
            {done && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, ...rest }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...rest} />
    </label>
  );
}

// --- Personal ------------------------------------------------------------------
function PersonalStep({ cv, setField }) {
  return (
    <div>
      <SectionHeader title="Personal" subtitle="Contact details shown at the top of your CV." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name"       value={cv.full_name} onChange={setField('full_name')} />
        <Field label="Headline / title" value={cv.headline} onChange={setField('headline')} placeholder="e.g. Senior Product Designer" />
        <Field label="Email"    value={cv.email}    onChange={setField('email')} type="email" />
        <Field label="Phone"    value={cv.phone}    onChange={setField('phone')} />
        <Field label="Location" value={cv.location} onChange={setField('location')} placeholder="City, Country" />
        <Field label="LinkedIn" value={cv.linkedin} onChange={setField('linkedin')} />
        <Field label="Website"  value={cv.website}  onChange={setField('website')} />
      </div>
    </div>
  );
}

// --- Summary -------------------------------------------------------------------
function SummaryStep({ cv, setField }) {
  const len = (cv.summary || '').length;
  return (
    <div>
      <SectionHeader title="Summary" subtitle="3–5 sentences, first person, no buzzwords." />
      <textarea
        className="input min-h-[180px]"
        value={cv.summary || ''}
        onChange={setField('summary')}
        placeholder="Experienced product designer with 7+ years shipping B2B SaaS. Led design for…"
      />
      <div className="mt-1 text-xs text-slate-500 flex justify-between">
        <span>{len} chars</span>
        <span className={len < 200 ? 'text-amber-400' : len > 700 ? 'text-amber-400' : 'text-green-400'}>
          {len < 200 ? 'A bit short' : len > 700 ? 'Consider trimming' : 'Good length'}
        </span>
      </div>
    </div>
  );
}

// --- Experience ----------------------------------------------------------------
function ExperienceStep({ cv, updateCv }) {
  const items = cv.experience || [];
  const update = (i, patch) => {
    const next = items.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
    updateCv({ experience: next });
  };
  const add = () => updateCv({
    experience: [...items, { title: '', company: '', location: '', start: '', end: 'Present', bullets: [''] }],
  });
  const remove = (i) => updateCv({ experience: items.filter((_, idx) => idx !== i) });

  const setBullet = (i, j, v) => update(i, { bullets: items[i].bullets.map((b, k) => (k === j ? v : b)) });
  const addBullet = (i) => update(i, { bullets: [...(items[i].bullets || []), ''] });
  const removeBullet = (i, j) => update(i, { bullets: items[i].bullets.filter((_, k) => k !== j) });
  const rewrite = async (i, j, style) => {
    const cur = items[i].bullets[j];
    if (!cur) return;
    try {
      const { bullet } = await api.rewriteBullet(cur, style);
      setBullet(i, j, bullet);
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <SectionHeader title="Experience" subtitle="Most recent role first. Focus each bullet on outcomes, not tasks.">
        <button onClick={add} className="btn-ghost flex items-center gap-1.5"><Plus size={13} /> Add role</button>
      </SectionHeader>
      {items.length === 0 && <EmptyHint>Add your first role to begin.</EmptyHint>}
      {items.map((e, i) => (
        <div key={i} className="card p-4 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"    value={e.title}    onChange={(ev) => update(i, { title: ev.target.value })} />
            <Field label="Company"  value={e.company}  onChange={(ev) => update(i, { company: ev.target.value })} />
            <Field label="Location" value={e.location} onChange={(ev) => update(i, { location: ev.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" value={e.start} onChange={(ev) => update(i, { start: ev.target.value })} placeholder="Jan 2021" />
              <Field label="End"   value={e.end}   onChange={(ev) => update(i, { end: ev.target.value })}   placeholder="Present" />
            </div>
          </div>
          <div className="mt-3">
            <span className="label">Bullets</span>
            {(e.bullets || []).map((b, j) => (
              <div key={j} className="flex items-start gap-2 mb-2">
                <textarea
                  className="input flex-1 min-h-[42px]"
                  value={b}
                  rows={2}
                  onChange={(ev) => setBullet(i, j, ev.target.value)}
                  placeholder="Shipped X that increased Y by Z%..."
                />
                <div className="flex flex-col gap-1">
                  <RewriteMenu onPick={(style) => rewrite(i, j, style)} />
                  <button
                    onClick={() => removeBullet(i, j)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Remove bullet"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="btn-ghost !py-1 flex items-center gap-1.5 text-xs">
              <Plus size={12} /> Add bullet
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <Trash2 size={12} /> Remove role
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RewriteMenu({ onPick }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pick = async (s) => {
    setOpen(false); setBusy(true);
    try { await onPick(s); } finally { setBusy(false); }
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={busy}
        className="btn-ghost !py-1 !px-2 flex items-center gap-1 text-xs"
        title="AI rewrite"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 text-xs">
          {['stronger', 'quantified', 'concise', 'softer'].map((s) => (
            <button
              key={s}
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 capitalize"
            >
              Make {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Education -----------------------------------------------------------------
function EducationStep({ cv, updateCv }) {
  const items = cv.education || [];
  const update = (i, patch) => updateCv({
    education: items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
  });
  const add = () => updateCv({
    education: [...items, { degree: '', school: '', location: '', start: '', end: '', details: '' }],
  });
  const remove = (i) => updateCv({ education: items.filter((_, idx) => idx !== i) });
  return (
    <div>
      <SectionHeader title="Education">
        <button onClick={add} className="btn-ghost flex items-center gap-1.5"><Plus size={13} /> Add</button>
      </SectionHeader>
      {items.length === 0 && <EmptyHint>Add a degree or qualification.</EmptyHint>}
      {items.map((e, i) => (
        <div key={i} className="card p-4 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Degree"   value={e.degree}   onChange={(ev) => update(i, { degree: ev.target.value })} />
            <Field label="School"   value={e.school}   onChange={(ev) => update(i, { school: ev.target.value })} />
            <Field label="Location" value={e.location} onChange={(ev) => update(i, { location: ev.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" value={e.start} onChange={(ev) => update(i, { start: ev.target.value })} />
              <Field label="End"   value={e.end}   onChange={(ev) => update(i, { end: ev.target.value })} />
            </div>
          </div>
          <label className="block mt-3">
            <span className="label">Details (optional)</span>
            <textarea className="input" rows={2}
              value={e.details || ''}
              onChange={(ev) => update(i, { details: ev.target.value })}
              placeholder="Honours, GPA, thesis…"
            />
          </label>
          <div className="mt-2 flex justify-end">
            <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Skills --------------------------------------------------------------------
function SkillsStep({ cv, updateCv }) {
  const s = cv.skills || { technical: [], soft: [], languages: [], tools: [] };
  const setBucket = (k, arr) => updateCv({ skills: { ...s, [k]: arr } });
  return (
    <div>
      <SectionHeader title="Skills" subtitle="Press Enter to add, click × to remove." />
      {['technical', 'tools', 'languages', 'soft'].map((k) => (
        <TagEditor key={k} label={k[0].toUpperCase() + k.slice(1)} items={s[k] || []} setItems={(arr) => setBucket(k, arr)} />
      ))}
    </div>
  );
}

function TagEditor({ label, items, setItems }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    setItems([...items, v]); setInput('');
  };
  return (
    <div className="mb-4">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((t, i) => (
          <span key={i} className="chip">
            {t}
            <button
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              className="ml-1 text-slate-500 hover:text-red-400"
            >×</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-slate-600">No {label.toLowerCase()} skills yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          value={input}
          placeholder="Type a skill and press Enter"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button onClick={add} className="btn-ghost">Add</button>
      </div>
    </div>
  );
}

// --- Certs ---------------------------------------------------------------------
function CertsStep({ cv, updateCv }) {
  const items = cv.certifications || [];
  const update = (i, patch) => updateCv({
    certifications: items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
  });
  const add = () => updateCv({ certifications: [...items, { name: '', issuer: '', year: '' }] });
  const remove = (i) => updateCv({ certifications: items.filter((_, idx) => idx !== i) });
  return (
    <div>
      <SectionHeader title="Certifications">
        <button onClick={add} className="btn-ghost flex items-center gap-1.5"><Plus size={13} /> Add</button>
      </SectionHeader>
      {items.length === 0 && <EmptyHint>Optional – skip if none.</EmptyHint>}
      {items.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 mb-2">
          <input className="input" placeholder="Name"   value={c.name}   onChange={(e) => update(i, { name: e.target.value })} />
          <input className="input" placeholder="Issuer" value={c.issuer} onChange={(e) => update(i, { issuer: e.target.value })} />
          <input className="input" placeholder="Year"   value={c.year}   onChange={(e) => update(i, { year: e.target.value })} />
          <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 px-2"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// --- Projects ------------------------------------------------------------------
function ProjectsStep({ cv, updateCv }) {
  const items = cv.projects || [];
  const update = (i, patch) => updateCv({
    projects: items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
  });
  const add = () => updateCv({ projects: [...items, { name: '', description: '', link: '' }] });
  const remove = (i) => updateCv({ projects: items.filter((_, idx) => idx !== i) });
  return (
    <div>
      <SectionHeader title="Projects">
        <button onClick={add} className="btn-ghost flex items-center gap-1.5"><Plus size={13} /> Add</button>
      </SectionHeader>
      {items.length === 0 && <EmptyHint>Optional – include side projects if space allows.</EmptyHint>}
      {items.map((p, i) => (
        <div key={i} className="card p-4 mb-3">
          <Field label="Name" value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
          <label className="block mt-2">
            <span className="label">Description</span>
            <textarea className="input" rows={2}
              value={p.description}
              onChange={(e) => update(i, { description: e.target.value })}
            />
          </label>
          <Field label="Link" value={p.link} onChange={(e) => update(i, { link: e.target.value })} />
          <div className="mt-2 flex justify-end">
            <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- ATS -----------------------------------------------------------------------
function ATSStep({ doc, setDoc }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const ats = doc.ats;

  const run = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.atsScore(doc.cv);
      store.update(doc.id, { ats: res });
      setDoc((d) => ({ ...d, ats: res }));
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <SectionHeader title="ATS Review" subtitle="Run an AI review to score keyword density, structure, and impact.">
        <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-1.5">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}
          {ats ? 'Re-run' : 'Run ATS review'}
        </button>
      </SectionHeader>

      {err && <div className="text-sm text-red-300 mb-3"><AlertCircle size={14} className="inline" /> {err}</div>}

      {!ats && !loading && <EmptyHint>Click "Run ATS review" when you're ready.</EmptyHint>}

      {ats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <ScoreCard label="Overall" value={ats.overall} />
            {Object.entries(ats.section_scores || {}).map(([k, v]) => (
              <ScoreCard key={k} label={k} value={v} />
            ))}
          </div>
          <ListCard title="Strengths" items={ats.strengths} color="green" />
          <ListCard title="Weaknesses" items={ats.weaknesses} color="red" />
          <ListCard title="Suggestions" items={ats.suggestions} color="blue" />
        </>
      )}
    </div>
  );
}

function ScoreCard({ label, value }) {
  const n = Number(value) || 0;
  const color = n >= 75 ? 'text-green-400' : n >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-400 capitalize">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{n}</div>
    </div>
  );
}

function ListCard({ title, items, color = 'blue' }) {
  if (!items?.length) return null;
  const dot = { green: 'bg-green-400', red: 'bg-red-400', blue: 'bg-blue-400' }[color];
  return (
    <div className="card p-4 mb-3">
      <div className="text-sm font-semibold text-white mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyHint({ children }) {
  return <div className="text-sm text-slate-500 bg-slate-900/50 border border-dashed border-slate-800 rounded p-6 text-center">{children}</div>;
}
