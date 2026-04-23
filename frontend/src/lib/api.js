const BASE = import.meta.env.VITE_API_BASE || '';

async function handle(res) {
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
}

export const api = {
  health: () => fetch(`${BASE}/api/health`).then(handle),

  parse: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/api/parse`, { method: 'POST', body: fd }).then(handle);
  },

  atsScore: (cv) =>
    fetch(`${BASE}/api/ats-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv }),
    }).then(handle),

  jdMatch: (cv, jd) =>
    fetch(`${BASE}/api/jd-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, jd }),
    }).then(handle),

  tailor: (cv, jd) =>
    fetch(`${BASE}/api/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, jd }),
    }).then(handle),

  rewriteBullet: (bullet, style) =>
    fetch(`${BASE}/api/rewrite-bullet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bullet, style }),
    }).then(handle),

  coverLetter: (cv, jd, tone) =>
    fetch(`${BASE}/api/cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, jd, tone }),
    }).then(handle),

  exportDocx: (cv, template) =>
    fetch(`${BASE}/api/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, template }),
    }).then(handle),

  exportPdf: (cv, template) =>
    fetch(`${BASE}/api/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, template }),
    }).then(handle),
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
