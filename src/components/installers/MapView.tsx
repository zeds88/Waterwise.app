import { useState } from 'react';
import { MapPin, Star, Home } from 'lucide-react';
import Button from '../ui/Button';
import type { Installer } from '../../types';

interface Props {
  installers: Installer[];
  onSelect: (installer: Installer) => void;
}

/** Stylized mock map — no external map library needed for the prototype. */
export default function MapView({ installers, onSelect }: Props) {
  const [selected, setSelected] = useState<Installer | null>(null);

  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden h-[380px] bg-gradient-to-br from-emerald-50 to-cyan-50 border border-slate-200">
        {/* Fake streets */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-[20%] top-0 bottom-0 w-2 bg-white" />
          <div className="absolute left-[55%] top-0 bottom-0 w-3 bg-white" />
          <div className="absolute left-[85%] top-0 bottom-0 w-1.5 bg-white" />
          <div className="absolute top-[30%] left-0 right-0 h-3 bg-white" />
          <div className="absolute top-[62%] left-0 right-0 h-2 bg-white" />
          <div className="absolute top-[82%] left-0 right-0 h-1.5 bg-white" />
        </div>
        {/* Fake park */}
        <div className="absolute left-[8%] top-[38%] w-20 h-16 rounded-2xl bg-green-200/60" />
        <div className="absolute right-[6%] bottom-[8%] w-24 h-14 rounded-2xl bg-cyan-200/50" />

        {/* Home pin */}
        <div className="absolute" style={{ left: '46%', top: '46%' }}>
          <div className="w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800 border-[3px] border-white shadow-lg flex items-center justify-center text-white">
            <Home size={16} />
          </div>
        </div>

        {/* Installer pins */}
        {installers.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setSelected(inst)}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${inst.pin.x}%`, top: `${inst.pin.y}%` }}
            aria-label={`Select ${inst.businessName}`}
          >
            <div
              className={`flex items-center justify-center rounded-full border-[3px] border-white shadow-lg transition-all ${
                selected?.id === inst.id ? 'w-11 h-11 bg-blue-600 scale-110' : 'w-9 h-9 bg-cyan-500'
              }`}
            >
              <MapPin size={selected?.id === inst.id ? 18 : 15} className="text-white" />
            </div>
          </button>
        ))}
      </div>

      {/* Selected installer bottom card */}
      {selected && (
        <div className="mt-3 bg-white rounded-2xl border border-slate-100 shadow-lg p-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
              {selected.avatar}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{selected.businessName}</p>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                {selected.rating} · {selected.distanceMiles} mi · ${selected.priceLow}–${selected.priceHigh}
              </div>
            </div>
            <Button className="!py-2 !px-4 !text-sm" onClick={() => onSelect(selected)}>
              Book
            </Button>
          </div>
        </div>
      )}
      {!selected && (
        <p className="text-center text-slate-400 text-xs mt-3">Tap a pin to see installer details</p>
      )}
    </div>
  );
}
