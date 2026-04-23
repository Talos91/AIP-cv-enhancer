import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, downloadBlob } from '../lib/api';
import { store } from '../lib/storage';
import CvPreview from '../components/CvPreview';

const TEMPLATES = [
  { key: 'minimal', name: 'Minimal', desc: 'Clean sans-serif. Best for tech/product roles.' },
  { key: 'classic', name: 'Classic', desc: 'Serif. Traditional, safe for most industries.' },
  { key: 'modern',  name: 'Modern',  desc: 'Bold accent colour. Best for creative roles.' },
];

export default function ExportPage() {
  const [doc, setDoc] = useState(() => store.getActive());
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [err, setErr] = useState('');

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <FileText className="mx-auto text-slate-500 mb-3" size={32} />
        <div className="text-white mb-1">No active CV.</div>
        <Link to="/" className="text-blue-400 text-sm hover:underline">Go to dashboard</Link>
      </div>
    );
  }

  const setTemplate = (t) => {
    store.update(doc.id, { template: t });
    setDoc((d) => ({ ...d, template: t }));
  };

  const fname = (doc.cv.full_name || 'resume').replace(/\s+/g, '_');

  const doDocx = async () => {
    setLoadingDocx(true); setErr('');
    try {
      const blob = await api.exportDocx(doc.cv, doc.template);
      downloadBlob(blob, `${fname}.docx`);
    } catch (e) { setErr(e.message); } finally { setLoadingDocx(false); }
  };
  const doPdf = async () => {
    setLoadingPdf(true); setErr('');
    try {
      const blob = await api.exportPdf(doc.cv, doc.template);
      downloadBlob(blob, `${fname}.pdf`);
    } catch (e) { setErr(e.message); } finally { setLoadingPdf(false); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Export</h1>
        <p className="text-sm text-slate-400 mt-1">
          Pick a template, then download <span className="text-slate-200">{doc.name}</span>.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <div>
          <div className="grid gap-3">
            {TEMPLATES.map((t) => {
              const active = doc.template === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`card p-4 text-left transition-colors ${
                    active ? 'border-blue-600/50 bg-blue-600/10' : 'hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    {active && <CheckCircle2 size={16} className="text-blue-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{t.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="card p-5 mt-4">
            <div className="text-sm font-semibold text-white mb-3">Download</div>
            <div className="flex flex-col gap-2">
              <button onClick={doDocx} disabled={loadingDocx} className="btn-primary flex items-center gap-2 justify-center">
                {loadingDocx ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download .docx
              </button>
              <button onClick={doPdf} disabled={loadingPdf} className="btn-ghost flex items-center gap-2 justify-center">
                {loadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download .pdf
              </button>
              <p className="text-xs text-slate-500 mt-1">
                PDF export needs LibreOffice or pandoc+LaTeX on the server. If it fails, download the .docx and convert locally.
              </p>
            </div>
            {err && (
              <div className="mt-3 text-sm text-red-300 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> <span>{err}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5 overflow-auto max-h-[85vh]">
          <CvPreview cv={doc.cv} template={doc.template} />
        </div>
      </div>
    </div>
  );
}
