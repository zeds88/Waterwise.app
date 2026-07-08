import { useNavigate } from 'react-router-dom';
import { Droplets, DollarSign, Leaf, CloudRain, Sun, Cloud, CloudLightning, Wrench, Share2, CalendarDays, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import { useApp } from '../context/AppContext';
import { CO2_PER_GALLON, formatNumber, optimizeSchedule } from '../lib/calculator';
import { MOCK_FORECAST } from '../data/mockData';
import type { DailyWeather } from '../types';

const conditionIcon = (c: DailyWeather['condition']) => {
  switch (c) {
    case 'rain':
      return <CloudRain size={18} className="text-blue-500" />;
    case 'storm':
      return <CloudLightning size={18} className="text-purple-500" />;
    case 'cloudy':
      return <Cloud size={18} className="text-slate-400" />;
    default:
      return <Sun size={18} className="text-amber-500" />;
  }
};

const dayLabel = (offset: number) => {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tmrw';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

export default function HomeScreen() {
  const navigate = useNavigate();
  const { state, savings } = useApp();
  if (!state.user || !savings) return null;

  const weeklyCo2 = savings.weeklyGallonsSaved * CO2_PER_GALLON;
  const events = optimizeSchedule(state.schedule.zones, MOCK_FORECAST, state.schedule.adaptiveMode);
  const nextEvent = events.find((e) => e.status !== 'skipped-rain');
  const rainSkips = events.filter((e) => e.status === 'skipped-rain').length;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md px-5 pt-8 space-y-5">
        {/* Greeting */}
        <div>
          <p className="text-slate-500 text-sm">Good morning ☀️</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{state.user.firstName}'s Lawn</h1>
        </div>

        {/* Hero card */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white p-6 shadow-xl shadow-blue-600/20">
          <p className="text-blue-100 text-sm font-medium mb-1">Saved this week</p>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-5xl font-extrabold tabular-nums tracking-tight">
              {formatNumber(savings.weeklyGallonsSaved)}
            </span>
            <span className="text-blue-100 font-medium">gallons</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-white/15 rounded-xl py-2.5 px-1">
              <DollarSign size={16} className="mx-auto mb-1 text-green-300" />
              <div className="text-sm font-bold tabular-nums">${(savings.weeklyGallonsSaved * 0.004).toFixed(2)}</div>
              <div className="text-[10px] text-blue-100 mt-0.5">saved</div>
            </div>
            <div className="bg-white/15 rounded-xl py-2.5 px-1">
              <Leaf size={16} className="mx-auto mb-1 text-green-300" />
              <div className="text-sm font-bold tabular-nums">{weeklyCo2.toFixed(1)}</div>
              <div className="text-[10px] text-blue-100 mt-0.5">kg CO₂</div>
            </div>
            <div className="bg-white/15 rounded-xl py-2.5 px-1">
              <CloudRain size={16} className="mx-auto mb-1 text-cyan-200" />
              <div className="text-sm font-bold tabular-nums">{rainSkips}</div>
              <div className="text-[10px] text-blue-100 mt-0.5">rain skip{rainSkips === 1 ? '' : 's'}</div>
            </div>
          </div>
        </div>

        {/* Weather strip */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">7-day forecast · {state.user.zipCode}</h2>
            {state.schedule.adaptiveMode && (
              <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Adaptive on
              </span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {MOCK_FORECAST.map((w) => (
              <div
                key={w.dayOffset}
                className={`flex flex-col items-center gap-1 min-w-[52px] rounded-xl py-2.5 ${
                  w.dayOffset === 0 ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-[11px] text-slate-500 font-medium">{dayLabel(w.dayOffset)}</span>
                {conditionIcon(w.condition)}
                <span className="text-xs font-bold tabular-nums">{w.tempHigh}°</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Next watering */}
        {nextEvent && (
          <Card
            className="p-4 flex items-center gap-4 cursor-pointer hover:border-blue-200"
            onClick={() => navigate('/app/schedule')}
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center">
              <Droplets size={24} className="text-cyan-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">
                Next: {nextEvent.zoneName} · {dayLabel(nextEvent.dayOffset)}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {nextEvent.durationMinutes} min
                {nextEvent.status === 'increased-heat' && ' · extended for heat 🔥'}
                {nextEvent.status === 'reduced-cool' && ' · shortened, cool day'}
              </p>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </Card>
        )}

        {/* Action carousel */}
        <div>
          <h2 className="font-bold text-sm mb-3">Do more with WaterWise</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-5 px-5 pb-2">
            <button
              onClick={() => navigate('/app/installers')}
              className="snap-start min-w-[220px] bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-blue-200 transition-colors"
            >
              <Wrench size={20} className="text-blue-600 mb-2" />
              <p className="font-bold text-sm">Get a smart controller</p>
              <p className="text-slate-500 text-xs mt-1">Certified installers near you from $179</p>
            </button>
            <button
              onClick={() => navigate('/app/schedule')}
              className="snap-start min-w-[220px] bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-blue-200 transition-colors"
            >
              <CalendarDays size={20} className="text-green-600 mb-2" />
              <p className="font-bold text-sm">Tune your schedule</p>
              <p className="text-slate-500 text-xs mt-1">{state.schedule.zones.length} zones configured</p>
            </button>
            <button
              onClick={() => navigate('/app/profile')}
              className="snap-start min-w-[220px] bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-blue-200 transition-colors"
            >
              <Share2 size={20} className="text-purple-600 mb-2" />
              <p className="font-bold text-sm">Refer a neighbor</p>
              <p className="text-slate-500 text-xs mt-1">You both get $10 credit</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
