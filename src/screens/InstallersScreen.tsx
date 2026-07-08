import { useState } from 'react';
import { List, Map as MapIcon, Star, BadgeCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import MapView from '../components/installers/MapView';
import BookingModal from '../components/installers/BookingModal';
import { MOCK_INSTALLERS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import type { Installer } from '../types';

export default function InstallersScreen() {
  const { state } = useApp();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [booking, setBooking] = useState<Installer | null>(null);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md px-5 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Installers</h1>
            <p className="text-slate-500 text-sm mt-0.5">Near {state.user?.zipCode ?? 'you'}</p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'
              }`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setView('map')}
              aria-label="Map view"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                view === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'
              }`}
            >
              <MapIcon size={18} />
            </button>
          </div>
        </div>

        {state.bookings.length > 0 && (
          <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-sm text-green-800 animate-fade-up">
            <span className="font-bold">✓ Booking confirmed</span> — {state.bookings[state.bookings.length - 1].installerName} on{' '}
            {state.bookings[state.bookings.length - 1].date} at {state.bookings[state.bookings.length - 1].time}
          </div>
        )}

        {view === 'map' ? (
          <MapView installers={MOCK_INSTALLERS} onSelect={setBooking} />
        ) : (
          <div className="space-y-3">
            {MOCK_INSTALLERS.map((inst) => (
              <Card key={inst.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {inst.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">{inst.businessName}</p>
                      {inst.certified && <BadgeCheck size={15} className="text-blue-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold">{inst.rating}</span>
                      <span className="text-xs text-slate-400">({inst.reviewCount})</span>
                      <span className="text-xs text-slate-300 mx-1">·</span>
                      <span className="text-xs text-slate-500">{inst.distanceMiles} mi</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      ${inst.priceLow}–${inst.priceHigh} · Next: <span className="font-semibold text-green-600">{inst.nextAvailable}</span>
                    </p>
                  </div>
                </div>
                <Button
                  fullWidth
                  className="mt-3 !py-2.5 !text-sm"
                  onClick={() => setBooking(inst)}
                >
                  Schedule now
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BookingModal installer={booking} onClose={() => setBooking(null)} />
    </div>
  );
}
