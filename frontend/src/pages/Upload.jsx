import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { store } from '../lib/storage';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const onPick = (f) => {
    setError('');
    if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Please upload a PDF or DOCX file.');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError('File too large (max 15 MB).');
      return;
    }
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0]);
  };

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true); setError(''); setProgress('Extracting text…');
    try {
      setProgress('Parsing with AI…');
      const { cv } = await api.parse(file);
      const doc = store.create({ name: cv.full_name || file.name.replace(/\.[^.]+$/, ''), cv });
      store.setActive(doc.id);
      navigate('/editor');
    } catch (e) {
      setError(e.message || 'Failed to parse CV.');
    } finally {
      setLoading(false); setProgress('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Upload CV</h1>
        <p className="text-sm text-slate-400 mt-1">
          PDF or DOCX. We extract the text, then an AI model structures it into the editor.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`card p-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-600/5' : 'hover:border-slate-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => onPick(e.target.files?.[0])}
          className="hidden"
        />
        {file ? (
          <div>
            <FileText className="mx-auto text-blue-400 mb-3" size={32} />
            <div className="text-sm text-white font-medium">{file.name}</div>
            <div className="text-xs text-slate-500 mt-1">
              {(file.size / 1024).toFixed(0)} KB · Click to change
            </div>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto text-slate-500 mb-3" size={32} />
            <div className="text-sm text-slate-200 font-medium">
              Drop a file here or click to browse
            </div>
            <div className="text-xs text-slate-500 mt-1">PDF or DOCX, up to 15 MB</div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red-300 bg-red-600/10 border border-red-600/30 rounded px-3 py-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={!file || loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {loading ? (progress || 'Working…') : 'Parse & Open in Editor'}
        </button>
        <div className="text-xs text-slate-500">Typically takes 5-15s</div>
      </div>
    </div>
  );
}
