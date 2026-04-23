// localStorage-backed CV versioning. No auth, no backend state.

const KEY = 'aip-cv-enhancer:store:v1';

export const EMPTY_CV = {
  full_name: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  website: '',
  summary: '',
  experience: [],
  education: [],
  skills: { technical: [], soft: [], languages: [], tools: [] },
  certifications: [],
  projects: [],
};

function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { cvs: {}, activeId: null };
    const s = JSON.parse(raw);
    return { cvs: s.cvs || {}, activeId: s.activeId || null };
  } catch {
    return { cvs: {}, activeId: null };
  }
}

function writeStore(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function uid() {
  return 'cv_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const store = {
  list() {
    const s = readStore();
    return Object.values(s.cvs).sort((a, b) => b.updated_at - a.updated_at);
  },
  get(id) {
    const s = readStore();
    return s.cvs[id] || null;
  },
  getActive() {
    const s = readStore();
    if (!s.activeId) return null;
    return s.cvs[s.activeId] || null;
  },
  setActive(id) {
    const s = readStore();
    s.activeId = id;
    writeStore(s);
  },
  create({ name, cv }) {
    const s = readStore();
    const id = uid();
    const now = Date.now();
    s.cvs[id] = {
      id,
      name: name || cv?.full_name || 'Untitled CV',
      cv: cv || { ...EMPTY_CV },
      jd: '',
      ats: null,
      jd_match: null,
      cover_letter: '',
      template: 'minimal',
      created_at: now,
      updated_at: now,
    };
    s.activeId = id;
    writeStore(s);
    return s.cvs[id];
  },
  update(id, patch) {
    const s = readStore();
    if (!s.cvs[id]) return null;
    s.cvs[id] = { ...s.cvs[id], ...patch, updated_at: Date.now() };
    writeStore(s);
    return s.cvs[id];
  },
  rename(id, name) {
    return this.update(id, { name });
  },
  delete(id) {
    const s = readStore();
    delete s.cvs[id];
    if (s.activeId === id) s.activeId = null;
    writeStore(s);
  },
  duplicate(id, newName) {
    const s = readStore();
    const src = s.cvs[id];
    if (!src) return null;
    const copy = this.create({ name: newName || `${src.name} (copy)`, cv: src.cv });
    this.update(copy.id, { jd: src.jd, template: src.template });
    return copy;
  },
};
