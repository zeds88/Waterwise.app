import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppShell from './components/layout/AppShell';
import SplashScreen from './components/auth/SplashScreen';
import SignupForm from './components/auth/SignupForm';
import YardBaseline from './components/auth/YardBaseline';
import SavingsProjection from './components/auth/SavingsProjection';
import HomeScreen from './screens/HomeScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import ImpactScreen from './screens/ImpactScreen';
import InstallersScreen from './screens/InstallersScreen';
import ProfileScreen from './screens/ProfileScreen';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="mx-auto max-w-md min-h-screen bg-slate-50 shadow-2xl">
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/onboarding/baseline" element={<YardBaseline />} />
            <Route path="/onboarding/projection" element={<SavingsProjection />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="home" element={<HomeScreen />} />
              <Route path="schedule" element={<ScheduleScreen />} />
              <Route path="impact" element={<ImpactScreen />} />
              <Route path="installers" element={<InstallersScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
