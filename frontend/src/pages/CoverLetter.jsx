import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, Copy, Check, AlertCircle, Download } from 'lucide-react';
import { api } from '../lib/api';
import { store } from '../lib/storage';

const TONES = ['professional', 'enthusiastic', 'concise', 'warm'];

export default function CoverLetter() {
  const [doc, setDoc] = useState(() => store.getActive());
  const [jd, setJd] = useState(doc?.jd || '');
  const [tone, setTone] = useState('professional');
  const [letter, setLetter] = useState(doc?.cover_letter || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (doc) store.update(doc.id, { jd, cover_letter: letter });
  }, [jd, letter, doc?.id]);

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Mail className="mx-auto text-slate-500 mb-3" size={32} />
        <div className="text-white mb-1">No active CV.</div>
        <Link to="/" className="text-blue-400 text-sm hover:underline">Go to dashboard</Link>
      </div>
    );
  }

  const generate = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.coverLetter(doc.cv, jd, tone);
      setLetter(res.letter);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const downloadTxt = () => {
    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cover-letter-${(doc.cv.full_name || 'me').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Cover Letter</h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate a draft using <span className="text-slate-200">{doc.name}</span> and a job description. Edit freely.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <div>
            <div className="label">Job description</div>
            <textarea
              className="input min-h-[240px] font-mono text-xs"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Tone</span>
              <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button onClick={generate} disabled={!jd.trim() || loading} className="btn-primary flex items-center gap-1.5 w-full justify-center">
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                {letter ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
          {err && <div className="text-sm text-red-300 flex items-center gap-2"><AlertCircle size={14} /> {err}</div>}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white">Draft</div>
            {letter && (
              <div className="flex items-center gap-2">
                <button onClick={copy} className="btn-ghost !py-1.5 flex items-center gap-1.5">
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={downloadTxt} className="btn-ghost !py-1.5 flex items-center gap-1.5">
                  <Download size={13} /> .txt
                </button>
              </div>
            )}
          </div>
          {letter ? (
            <textarea
              className="input min-h-[340px] leading-relaxed"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            />
          ) : (
            <div className="text-sm text-slate-500 text-center py-16">
              No draft yet. Paste a JD and click Generate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
