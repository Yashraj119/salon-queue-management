import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ScreenPage } from './ScreenPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ScreenPage titleKey="home" />} />
        <Route path="/join" element={<ScreenPage titleKey="join" />} />
        <Route path="/status/:id" element={<ScreenPage titleKey="status" />} />
        <Route path="/reception" element={<ScreenPage titleKey="reception" />} />
        <Route path="/barber/:name" element={<ScreenPage titleKey="barber" />} />
        <Route path="/display" element={<ScreenPage titleKey="display" />} />
        <Route path="/admin" element={<ScreenPage titleKey="admin" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
