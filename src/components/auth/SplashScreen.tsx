import { Navigate, useNavigate } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { state } = useApp();

  if (state.onboardingComplete) return <Navigate to="/app/home" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-cyan-400 flex flex-col items-center justify-between px-8 py-16 text-white">
      <div />
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 shadow-xl">
          <Droplets size={52} strokeWidth={1.8} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">WaterWise</h1>
        <p className="text-blue-50 text-lg leading-relaxed max-w-xs">
          Your lawn learns. Your bill shrinks. Your water saved.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <Button
          fullWidth
          onClick={() => navigate('/signup')}
          className="!bg-white !text-blue-700 !shadow-black/10 hover:!bg-blue-50"
        >
          Get Started
        </Button>
        <p className="text-center text-blue-100 text-sm">Free forever · No credit card needed</p>
      </div>
    </div>
  );
}
