import { Navigate, Outlet } from 'react-router-dom';
import TabBar from './TabBar';
import { useApp } from '../../context/AppContext';

export default function AppShell() {
  const { state } = useApp();

  if (!state.onboardingComplete) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      <TabBar />
    </div>
  );
}
