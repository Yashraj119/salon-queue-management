import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ScreenPage } from './ScreenPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<ScreenPage pageKey="home" />} />
        <Route path="/join" element={<ScreenPage pageKey="join" />} />
        <Route path="/status/:id" element={<ScreenPage pageKey="status" />} />
        <Route path="/reception" element={<ScreenPage pageKey="reception" />} />
        <Route path="/barber/:name" element={<ScreenPage pageKey="barber" />} />
        <Route path="/display" element={<ScreenPage pageKey="display" />} />
        <Route path="/admin" element={<ScreenPage pageKey="admin" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
