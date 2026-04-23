import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Upload, Plus, Copy, Trash2, PencilLine, Target, Clock,
} from 'lucide-react';
import { store, EMPTY_CV } from '../lib/storage';

function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function Dashboard() {
  const [cvs, setCvs] = useState([]);
  const navigate = useNavigate();

  const reload = () => setCvs(store.list());
  useEffect(() => { reload(); }, []);

  const openCv = (id) => { store.setActive(id); navigate('/editor'); };
  const newCv = () => {
    const doc = store.create({ name: 'Untitled CV', cv: { ...EMPTY_CV } });
    store.setActive(doc.id);
    navigate('/editor');
  };
  const onDuplicate = (id) => { store.duplicate(id); reload(); };
  const onDelete = (id) => {
    if (!confirm('Delete this CV? This cannot be undone.')) return;
    store.delete(id); reload();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Your saved CVs. Everything is stored in this browser only.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Link to="/upload" className="card p-5 hover:border-blue-600/50 transition-colors group">
          <Upload className="text-blue-400 mb-3" size={22} />
          <div className="text-sm font-semibold text-white">Upload existing CV</div>
          <div className="text-xs text-slate-400 mt-1">Parse a PDF or DOCX with AI.</div>
        </Link>
        <button onClick={newCv} className="card p-5 hover:border-blue-600/50 transition-colors text-left">
          <Plus className="text-blue-400 mb-3" size={22} />
          <div className="text-sm font-semibold text-white">Start from scratch</div>
          <div className="text-xs text-slate-400 mt-1">Build a new CV in the editor.</div>
        </button>
        <Link to="/jd-match" className="card p-5 hover:border-blue-600/50 transition-colors">
          <Target className="text-blue-400 mb-3" size={22} />
          <div className="text-sm font-semibold text-white">Match a job</div>
          <div className="text-xs text-slate-400 mt-1">Paste a JD, see keyword gaps.</div>
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="text-sm font-semibold text-white">Saved CVs</div>
          <div className="text-xs text-slate-500">{cvs.length} total</div>
        </div>
        {cvs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No CVs yet. Upload one or start from scratch above.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {cvs.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/40">
                <FileText className="text-slate-500 shrink-0" size={18} />
                <button
                  onClick={() => openCv(c.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-white truncate">{c.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <Clock size={11} /> updated {relTime(c.updated_at)}
                    {c.ats?.overall != null && (
                      <span className="chip-blue">ATS {c.ats.overall}</span>
                    )}
                    {c.jd_match?.match_score != null && (
                      <span className="chip-green">JD {c.jd_match.match_score}</span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => openCv(c.id)}
                  className="btn-ghost !py-1.5 flex items-center gap-1.5"
                  title="Edit"
                >
                  <PencilLine size={13} /> Edit
                </button>
                <button
                  onClick={() => onDuplicate(c.id)}
                  className="text-slate-500 hover:text-slate-200 p-1.5"
                  title="Duplicate"
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-slate-500 hover:text-red-400 p-1.5"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
