import { useState } from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import Card from '../ui/Card';
import type { ZoneConfig } from '../../types';

interface Props {
  zone: ZoneConfig;
  onUpdate: (zone: ZoneConfig) => void;
}

const CROP_EMOJI: Record<ZoneConfig['cropType'], string> = {
  grass: '🌿',
  perennials: '🌸',
  trees: '🌳',
};

export default function ZoneCard({ zone, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`overflow-hidden transition-all ${!zone.enabled ? 'opacity-60' : ''}`}>
      <button
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="text-2xl">{CROP_EMOJI[zone.cropType]}</span>
        <div className="flex-1">
          <p className="font-bold text-sm">{zone.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            Every {zone.frequencyDays} days · {zone.durationMinutes} min · {zone.soilType} soil
          </p>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4 animate-fade-up">
          {/* Enabled */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Zone active</span>
            <input
              type="checkbox"
              checked={zone.enabled}
              onChange={(e) => onUpdate({ ...zone, enabled: e.target.checked })}
              className="w-5 h-5 accent-blue-600"
            />
          </label>

          {/* Frequency */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Watering frequency</p>
            <div className="grid grid-cols-3 gap-2">
              {([3, 5, 7] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onUpdate({ ...zone, frequencyDays: f })}
                  className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    zone.frequencyDays === f
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {f}-day
                </button>
              ))}
            </div>
          </div>

          {/* Duration stepper */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Duration</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdate({ ...zone, durationMinutes: Math.max(5, zone.durationMinutes - 5) })}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                aria-label="Decrease duration"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold tabular-nums w-16 text-center text-sm">{zone.durationMinutes} min</span>
              <button
                onClick={() => onUpdate({ ...zone, durationMinutes: Math.min(60, zone.durationMinutes + 5) })}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                aria-label="Increase duration"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Moisture target */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Moisture target</span>
              <span className="text-sm font-bold text-blue-600 tabular-nums">{zone.moistureTarget}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={zone.moistureTarget}
              onChange={(e) => onUpdate({ ...zone, moistureTarget: Number(e.target.value) })}
              aria-label={`Moisture target for ${zone.name}`}
            />
          </div>

          {/* Soil type */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Soil type</p>
            <div className="grid grid-cols-3 gap-2">
              {(['clay', 'loam', 'sandy'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate({ ...zone, soilType: s })}
                  className={`rounded-xl border py-2 text-sm font-semibold capitalize transition-colors ${
                    zone.soilType === s
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
