import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ruler, Sprout, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { GRASS_LABELS, guessClimateZone, CLIMATE_LABELS } from '../../lib/calculator';
import type { GrassType } from '../../types';

export default function YardBaseline() {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const [yardSqFt, setYardSqFt] = useState(5000);
  const [grassType, setGrassType] = useState<GrassType>('bermuda');
  const [zipCode, setZipCode] = useState('');

  const zipValid = /^\d{5}$/.test(zipCode);
  const climateZone = zipValid ? guessClimateZone(zipCode) : null;

  const submit = () => {
    if (!zipValid) return;
    const signup = JSON.parse(sessionStorage.getItem('signup') || '{"firstName":"Friend","email":"demo@waterwise.app"}');
    const code = (signup.firstName.slice(0, 4).toUpperCase() + zipCode.slice(0, 2) + 'H2O').slice(0, 8);
    dispatch({
      type: 'SET_USER',
      payload: {
        firstName: signup.firstName,
        email: signup.email,
        zipCode,
        grassType,
        yardSqFt,
        climateZone: climateZone!,
        referralCode: code,
        referralCount: 2,
        creditsEarned: 20,
      },
    });
    navigate('/onboarding/projection');
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md px-6 py-8 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/signup')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-blue-600 rounded-full" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Tell us about your yard</h1>
        <p className="text-slate-500 mb-8">We'll use this to project your water savings.</p>

        <div className="space-y-8 flex-1">
          {/* Yard size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ruler size={18} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Yard size</span>
            </div>
            <div className="text-center mb-3">
              <span className="text-4xl font-extrabold text-blue-600 tabular-nums">
                {yardSqFt.toLocaleString()}
              </span>
              <span className="text-slate-500 font-medium ml-1.5">sq ft</span>
            </div>
            <input
              type="range"
              min={500}
              max={20000}
              step={250}
              value={yardSqFt}
              onChange={(e) => setYardSqFt(Number(e.target.value))}
              aria-label="Yard size in square feet"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>500</span>
              <span>20,000</span>
            </div>
          </div>

          {/* Grass type */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sprout size={18} className="text-green-600" />
              <span className="text-sm font-semibold text-slate-700">Lawn type</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(GRASS_LABELS) as GrassType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrassType(g)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium text-left transition-colors ${
                    grassType === g
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {GRASS_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          {/* Zip code */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} className="text-red-500" />
              <span className="text-sm font-semibold text-slate-700">Zip code</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
              placeholder="78704"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Zip code"
            />
            {climateZone && (
              <p className="text-green-600 text-sm mt-2 font-medium animate-fade-up">
                ✓ {CLIMATE_LABELS[climateZone]}
              </p>
            )}
          </div>
        </div>

        <div className="pt-6">
          <Button fullWidth disabled={!zipValid} onClick={submit}>
            See my savings
          </Button>
        </div>
      </div>
    </div>
  );
}
