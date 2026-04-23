import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import Editor from './pages/Editor';
import JDMatch from './pages/JDMatch';
import CoverLetter from './pages/CoverLetter';
import ExportPage from './pages/Export';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/jd-match" element={<JDMatch />} />
        <Route path="/cover-letter" element={<CoverLetter />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
