import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Loader2, Wand2, AlertCircle, Check, X, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { store } from '../lib/storage';

export default function JDMatch() {
  const navigate = useNavigate();
  const [doc, setDoc] = useState(() => store.getActive());
  const [jd, setJd] = useState(doc?.jd || '');
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (doc) store.update(doc.id, { jd });
  }, [jd, doc?.id]);

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Target className="mx-auto text-slate-500 mb-3" size={32} />
        <div className="text-white mb-1">No active CV.</div>
        <Link to="/" className="text-blue-400 text-sm hover:underline">Go to dashboard</Link>
      </div>
    );
  }

  const run = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.jdMatch(doc.cv, jd);
      store.update(doc.id, { jd_match: res, jd });
      setDoc((d) => ({ ...d, jd_match: res }));
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const tailor = async () => {
    setTailoring(true); setErr('');
    try {
      const { cv } = await api.tailor(doc.cv, jd);
      const newDoc = store.duplicate(doc.id, `${doc.name} (tailored)`);
      store.update(newDoc.id, { cv, jd });
      store.setActive(newDoc.id);
      navigate('/editor');
    } catch (e) { setErr(e.message); } finally { setTailoring(false); }
  };

  const match = doc.jd_match;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">JD Match</h1>
        <p className="text-sm text-slate-400 mt-1">
          Paste a job description. We compare it to <span className="text-slate-200">{doc.name}</span> and surface gaps.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="label">Job description</div>
          <textarea
            className="input min-h-[380px] font-mono text-xs"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here…"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={run} disabled={!jd.trim() || loading} className="btn-primary flex items-center gap-1.5">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}
              Analyse match
            </button>
            {match && (
              <button onClick={tailor} disabled={tailoring} className="btn-ghost flex items-center gap-1.5">
                {tailoring ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                Tailor CV to this JD
              </button>
            )}
          </div>
          {err && <div className="mt-3 text-sm text-red-300 flex items-center gap-2"><AlertCircle size={14} /> {err}</div>}
        </div>

        <div className="card p-5">
          {!match && !loading && (
            <div className="text-sm text-slate-500 text-center py-16">
              Paste a JD on the left and click <span className="text-slate-300">Analyse match</span>.
            </div>
          )}
          {loading && (
            <div className="text-sm text-slate-400 text-center py-16 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-400" size={28} /> Scoring…
            </div>
          )}
          {match && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <MatchGauge score={match.match_score} />
                <div className="flex-1">
                  <div className="text-xs text-slate-400">Match score</div>
                  <div className="text-sm text-slate-300">
                    {match.match_score >= 75 ? 'Strong alignment' : match.match_score >= 50 ? 'Decent — can be improved' : 'Significant gaps'}
                  </div>
                </div>
              </div>

              <KwSection title="Matched keywords" items={match.matched_keywords} tone="green" icon={<Check size={11} />} />
              <KwSection title="Missing keywords" items={match.missing_keywords} tone="red" icon={<X size={11} />} />
              <KwSection title="Matched skills" items={match.matched_skills} tone="green" />
              <KwSection title="Missing skills" items={match.missing_skills} tone="red" />

              {match.alignment_notes?.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Notes</div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {match.alignment_notes.map((n, i) => <li key={i}>• {n}</li>)}
                  </ul>
                </div>
              )}

              {match.tailoring_tips?.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Tailoring tips</div>
                  <ul className="space-y-1 text-sm text-blue-300">
                    {match.tailoring_tips.map((n, i) => <li key={i}>→ {n}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchGauge({ score }) {
  const n = Number(score) || 0;
  const color = n >= 75 ? '#22c55e' : n >= 50 ? '#f59e0b' : '#ef4444';
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (n / 100) * c;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} stroke="#1e293b" strokeWidth="6" fill="none" />
      <circle cx="42" cy="42" r={r} stroke={color} strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 42 42)" />
      <text x="42" y="47" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#e2e8f0">{n}</text>
    </svg>
  );
}

function KwSection({ title, items, tone = 'green', icon }) {
  if (!items?.length) return null;
  const chipClass = tone === 'red' ? 'chip-red' : tone === 'green' ? 'chip-green' : 'chip';
  return (
    <div>
      <div className="text-xs text-slate-400 mb-2">{title} ({items.length})</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((k, i) => (
          <span key={i} className={chipClass}>
            {icon}
            {typeof k === 'string' ? k : JSON.stringify(k)}
          </span>
        ))}
      </div>
    </div>
  );
}
