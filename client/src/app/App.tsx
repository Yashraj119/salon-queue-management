import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { HomePage } from './HomePage';
import { JoinQueuePage } from './JoinQueuePage';
import { ReceptionPage } from './ReceptionPage';
import { ScreenPage } from './ScreenPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinQueuePage />} />
        <Route path="/status/:id" element={<ScreenPage pageKey="status" />} />
        <Route path="/reception" element={<ReceptionPage />} />
        <Route path="/barber/:name" element={<ScreenPage pageKey="barber" />} />
        <Route path="/display" element={<ScreenPage pageKey="display" />} />
        <Route path="/admin" element={<ScreenPage pageKey="admin" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
