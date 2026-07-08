import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Droplets, DollarSign, Leaf } from 'lucide-react';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { CO2_PER_GALLON, formatNumber } from '../../lib/calculator';

/** Simple count-up hook for the reveal animation. */
function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

export default function SavingsProjection() {
  const navigate = useNavigate();
  const { state, savings, dispatch } = useApp();

  const monthlyGallons = useCountUp(savings?.monthlyGallonsSaved ?? 0);
  const annualDollars = useCountUp(savings?.annualCostSavings ?? 0);

  if (!state.user || !savings) return <Navigate to="/" replace />;

  const annualCo2 = savings.annualGallonsSaved * CO2_PER_GALLON;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-cyan-500 flex justify-center text-white">
      <div className="w-full max-w-md px-6 py-10 flex flex-col">
        <div className="flex-1 flex flex-col justify-center text-center">
          <p className="text-blue-100 font-medium mb-1 animate-fade-up">Nice yard, {state.user.firstName}! 🌱</p>
          <h1 className="text-2xl font-extrabold mb-10 animate-fade-up">Here's what WaterWise can save you</h1>

          <div className="mb-10 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="text-6xl font-extrabold tabular-nums tracking-tight">
              {formatNumber(Math.round(monthlyGallons))}
            </div>
            <div className="text-blue-100 font-medium mt-1">gallons saved / month</div>
          </div>

          <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
              <DollarSign size={20} className="mx-auto mb-2 text-green-300" />
              <div className="text-xl font-bold tabular-nums">${formatNumber(Math.round(annualDollars))}</div>
              <div className="text-[11px] text-blue-100 mt-0.5">saved / year</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
              <Droplets size={20} className="mx-auto mb-2 text-cyan-200" />
              <div className="text-xl font-bold tabular-nums">{formatNumber(savings.annualGallonsSaved)}</div>
              <div className="text-[11px] text-blue-100 mt-0.5">gal / year</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
              <Leaf size={20} className="mx-auto mb-2 text-green-300" />
              <div className="text-xl font-bold tabular-nums">{formatNumber(Math.round(annualCo2))}</div>
              <div className="text-[11px] text-blue-100 mt-0.5">kg CO₂ / year</div>
            </div>
          </div>

          <p className="text-blue-100/80 text-xs mt-8 max-w-xs mx-auto">
            Based on a {formatNumber(state.user.yardSqFt)} sq ft {state.user.grassType.replace('_', ' ')} lawn in{' '}
            {state.user.zipCode}, vs. typical 3×/week watering.
          </p>
        </div>

        <Button
          fullWidth
          onClick={() => {
            dispatch({ type: 'COMPLETE_ONBOARDING' });
            navigate('/app/home');
          }}
          className="!bg-white !text-blue-700 !shadow-black/10 hover:!bg-blue-50"
        >
          Start saving water
        </Button>
      </div>
    </div>
  );
}
