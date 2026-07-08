import { CloudRain, Sparkles } from 'lucide-react';
import Card from '../components/ui/Card';
import ZoneCard from '../components/schedule/ZoneCard';
import WeekPreview from '../components/schedule/WeekPreview';
import { useApp } from '../context/AppContext';
import { optimizeSchedule } from '../lib/calculator';
import { MOCK_FORECAST } from '../data/mockData';

export default function ScheduleScreen() {
  const { state, dispatch } = useApp();
  const { schedule } = state;

  const events = optimizeSchedule(schedule.zones, MOCK_FORECAST, schedule.adaptiveMode);
  const rainSkips = events.filter((e) => e.status === 'skipped-rain').length;

  const firstRainDay = MOCK_FORECAST.find((w) => w.precipitation > 0.5);
  const rainDayName = firstRainDay
    ? new Date(Date.now() + firstRainDay.dayOffset * 86400000).toLocaleDateString('en-US', { weekday: 'long' })
    : '';

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md px-5 pt-8 space-y-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Watering Schedule</h1>

        {/* Adaptive mode toggle */}
        <Card className="p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Adaptive mode</p>
            <p className="text-slate-500 text-xs mt-0.5">Auto-adjusts for rain, heat & cold</p>
          </div>
          <button
            role="switch"
            aria-checked={schedule.adaptiveMode}
            aria-label="Toggle adaptive mode"
            onClick={() => dispatch({ type: 'TOGGLE_ADAPTIVE' })}
            className={`w-13 h-7 rounded-full transition-colors relative ${
              schedule.adaptiveMode ? 'bg-green-500' : 'bg-slate-300'
            }`}
            style={{ width: 52 }}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                schedule.adaptiveMode ? 'translate-x-6' : 'translate-x-0.5'
              }`}
              style={{ left: 0 }}
            />
          </button>
        </Card>

        {/* Rain skip banner */}
        {schedule.adaptiveMode && rainSkips > 0 && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3 animate-fade-up">
            <CloudRain size={20} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              <span className="font-bold">Rain expected {rainDayName}.</span> {rainSkips} watering
              {rainSkips === 1 ? ' was' : 's were'} skipped automatically — free savings!
            </p>
          </div>
        )}

        {/* 7-day preview */}
        <div>
          <h2 className="font-bold text-sm mb-3">Next 7 days</h2>
          <WeekPreview events={events} zones={schedule.zones} adaptiveMode={schedule.adaptiveMode} />
        </div>

        {/* Zones */}
        <div>
          <h2 className="font-bold text-sm mb-3">Your zones</h2>
          <div className="space-y-3">
            {schedule.zones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} onUpdate={(z) => dispatch({ type: 'UPDATE_ZONE', payload: z })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
