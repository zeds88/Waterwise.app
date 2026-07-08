import { CloudRain } from 'lucide-react';
import Card from '../ui/Card';
import { MOCK_FORECAST } from '../../data/mockData';
import type { WateringEvent, ZoneConfig } from '../../types';

interface Props {
  events: WateringEvent[];
  zones: ZoneConfig[];
  adaptiveMode: boolean;
}

const ZONE_COLORS = ['bg-blue-500', 'bg-cyan-500', 'bg-green-500', 'bg-purple-500'];

const dayLabel = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'narrow' });
};

const dayNum = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getDate();
};

export default function WeekPreview({ events, zones, adaptiveMode }: Props) {
  const zoneColor = (zoneId: string) => ZONE_COLORS[zones.findIndex((z) => z.id === zoneId) % ZONE_COLORS.length];

  return (
    <Card className="p-4">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, day) => {
          const dayEvents = events.filter((e) => e.dayOffset === day);
          const rainSkipped = dayEvents.some((e) => e.status === 'skipped-rain');
          const active = dayEvents.filter((e) => e.status !== 'skipped-rain');
          const isRainDay = adaptiveMode && MOCK_FORECAST[day]?.precipitation > 0.5;

          return (
            <div
              key={day}
              className={`flex flex-col items-center rounded-xl py-2 gap-1.5 ${
                day === 0 ? 'bg-blue-50' : ''
              }`}
            >
              <span className="text-[10px] text-slate-400 font-semibold">{dayLabel(day)}</span>
              <span className={`text-sm font-bold tabular-nums ${day === 0 ? 'text-blue-600' : ''}`}>
                {dayNum(day)}
              </span>
              <div className="flex flex-col items-center gap-1 min-h-[26px]">
                {isRainDay || rainSkipped ? (
                  <CloudRain size={14} className="text-blue-400" />
                ) : (
                  active.map((e) => (
                    <span key={e.zoneId} className={`w-2 h-2 rounded-full ${zoneColor(e.zoneId)}`} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
        {zones.map((z, i) =>
          z.enabled ? (
            <div key={z.id} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${ZONE_COLORS[i % ZONE_COLORS.length]}`} />
              <span className="text-[11px] text-slate-500 font-medium">{z.name}</span>
            </div>
          ) : null
        )}
        <div className="flex items-center gap-1.5">
          <CloudRain size={12} className="text-blue-400" />
          <span className="text-[11px] text-slate-500 font-medium">Rain — skipped</span>
        </div>
      </div>
    </Card>
  );
}
