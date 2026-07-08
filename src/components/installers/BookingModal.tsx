import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ShieldCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { TIME_SLOTS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import type { Installer } from '../../types';

interface Props {
  installer: Installer | null;
  onClose: () => void;
}

const nextDays = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });

export default function BookingModal({ installer, onClose }: Props) {
  const { dispatch } = useApp();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<string>('');
  const [dateLabel, setDateLabel] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [service, setService] = useState<'install' | 'install_audit'>('install');
  const [notes, setNotes] = useState('');

  // Reset flow whenever a new installer is opened
  useEffect(() => {
    if (installer) {
      setStep(1);
      setDate('');
      setDateLabel('');
      setTime('');
      setService('install');
      setNotes('');
    }
  }, [installer]);

  if (!installer) return null;

  const auditPrice = 79;
  const total = service === 'install' ? installer.priceLow : installer.priceLow + auditPrice;

  const confirm = () => {
    dispatch({
      type: 'ADD_BOOKING',
      payload: {
        id: `b${Date.now()}`,
        installerId: installer.id,
        installerName: installer.businessName,
        serviceType: service,
        date: dateLabel,
        time,
        notes,
        totalAmount: total,
        status: 'confirmed',
      },
    });
    setStep(4);
  };

  const titles = ['Pick a date', 'Choose a time', 'Review & pay', 'Confirmed'];

  return (
    <Modal open onClose={onClose} title={titles[step - 1]}>
      {/* Step progress */}
      {step < 4 && (
        <div className="flex gap-1.5 mb-5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      )}

      {step > 1 && step < 4 && (
        <button
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-700"
        >
          <ChevronLeft size={16} /> Back
        </button>
      )}

      {/* Step 1: date */}
      {step === 1 && (
        <div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {nextDays(12).map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  setDate(d.key);
                  setDateLabel(`${d.weekday}, ${d.label}`);
                }}
                className={`rounded-xl border py-2.5 text-center transition-colors ${
                  date === d.key ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[10px] text-slate-400 font-semibold">{d.weekday}</div>
                <div className={`text-sm font-bold ${date === d.key ? 'text-blue-700' : ''}`}>{d.label}</div>
              </button>
            ))}
          </div>
          <Button fullWidth disabled={!date} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: time */}
      {step === 2 && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {TIME_SLOTS.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  time === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button fullWidth disabled={!time} onClick={() => setStep(3)}>
            Continue
          </Button>
        </div>
      )}

      {/* Step 3: review */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Service selection */}
          <div className="space-y-2">
            <button
              onClick={() => setService('install')}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                service === 'install' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between font-bold text-sm">
                <span>Smart controller install</span>
                <span>${installer.priceLow}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Device installation & WaterWise setup</p>
            </button>
            <button
              onClick={() => setService('install_audit')}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                service === 'install_audit' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between font-bold text-sm">
                <span>Install + irrigation audit</span>
                <span>${installer.priceLow + auditPrice}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Adds full sprinkler system health check</p>
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for the installer (gate code, pets, etc.)"
            rows={2}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />

          <div className="rounded-2xl bg-slate-50 p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Installer</span>
              <span className="font-semibold">{installer.businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">When</span>
              <span className="font-semibold">
                {dateLabel} · {time}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200">
              <span className="text-slate-500">Total</span>
              <span className="font-extrabold text-blue-700">${total}</span>
            </div>
          </div>

          <Button fullWidth onClick={confirm}>
            Pay ${total} — demo checkout
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} /> Prototype only — no real payment is processed
          </p>
        </div>
      )}

      {/* Step 4: confirmation */}
      {step === 4 && (
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 animate-pop-in">
            <Check size={40} className="text-green-600" strokeWidth={3} />
          </div>
          <h3 className="text-xl font-extrabold mb-2">You're booked!</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            {installer.businessName} will arrive {dateLabel} at {time}. A confirmation was sent to your email
            (in the real app 😉).
          </p>
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
