import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, PencilLine, Target, Mail, Download, Menu, X, Plus,
} from 'lucide-react';
import { useState } from 'react';
import { store, EMPTY_CV } from '../lib/storage';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/upload', icon: Upload, label: 'Upload CV' },
  { to: '/editor', icon: PencilLine, label: 'Editor' },
  { to: '/jd-match', icon: Target, label: 'JD Match' },
  { to: '/cover-letter', icon: Mail, label: 'Cover Letter' },
  { to: '/export', icon: Download, label: 'Export' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewCv = () => {
    const doc = store.create({ name: 'Untitled CV', cv: { ...EMPTY_CV } });
    store.setActive(doc.id);
    setSidebarOpen(false);
    navigate('/editor');
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-60 bg-slate-900 border-r border-slate-800
        flex flex-col transform transition-transform lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800">
          <span className="text-base font-bold text-blue-400 tracking-wide">AIP CV Enhancer</span>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewCv}
            className="w-full flex items-center justify-center gap-2 btn-primary"
          >
            <Plus size={14} /> New CV
          </button>
        </div>

        <nav className="flex-1 px-3 pb-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
          <div>All CVs stored locally in your browser.</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-5 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="ml-4 text-sm font-bold text-blue-400">AIP CV Enhancer</span>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
