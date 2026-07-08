import { useState } from 'react';
import { Copy, Check, Gift, LogOut, Ruler, Sprout, MapPin, MessageSquare, Mail } from 'lucide-react';
import Card from '../components/ui/Card';
import { useApp } from '../context/AppContext';
import { GRASS_LABELS, formatNumber } from '../lib/calculator';

export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const [copied, setCopied] = useState(false);
  if (!state.user) return null;
  const { user } = state;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode);
    } catch {
      // clipboard unavailable in some contexts — still show feedback for the demo
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md px-5 pt-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-2xl font-extrabold">
            {user.firstName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{user.firstName}</h1>
            <p className="text-slate-500 text-sm">{user.email}</p>
          </div>
        </div>

        {/* Yard summary */}
        <Card className="p-5">
          <h2 className="font-bold text-sm mb-4">Your yard</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Ruler size={16} className="text-blue-600" />
              <span className="text-slate-500 flex-1">Yard size</span>
              <span className="font-semibold">{formatNumber(user.yardSqFt)} sq ft</span>
            </div>
            <div className="flex items-center gap-3">
              <Sprout size={16} className="text-green-600" />
              <span className="text-slate-500 flex-1">Lawn type</span>
              <span className="font-semibold">{GRASS_LABELS[user.grassType]}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-red-500" />
              <span className="text-slate-500 flex-1">Location</span>
              <span className="font-semibold">{user.zipCode}</span>
            </div>
          </div>
        </Card>

        {/* Referrals */}
        <div className="rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 shadow-xl shadow-purple-600/20">
          <div className="flex items-center gap-2 mb-1">
            <Gift size={18} />
            <h2 className="font-bold">Share WaterWise, get $10</h2>
          </div>
          <p className="text-purple-100 text-sm mb-5">
            Friends get $10 off too when they join with your code.
          </p>

          <button
            onClick={copyCode}
            className="w-full bg-white/15 backdrop-blur border border-white/25 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-white/20 transition-colors"
          >
            <span className="text-2xl font-extrabold tracking-[0.2em]">{user.referralCode}</span>
            {copied ? <Check size={20} className="text-green-300" /> : <Copy size={20} className="text-purple-100" />}
          </button>
          {copied && <p className="text-green-300 text-xs font-semibold mt-2 animate-fade-up">Copied to clipboard!</p>}

          <div className="grid grid-cols-3 gap-3 mt-5 text-center">
            <div>
              <div className="text-xl font-extrabold tabular-nums">{user.referralCount}</div>
              <div className="text-[11px] text-purple-100">referred</div>
            </div>
            <div>
              <div className="text-xl font-extrabold tabular-nums">{user.referralCount}</div>
              <div className="text-[11px] text-purple-100">joined</div>
            </div>
            <div>
              <div className="text-xl font-extrabold tabular-nums">${user.creditsEarned}</div>
              <div className="text-[11px] text-purple-100">earned</div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button className="flex-1 bg-white/15 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-white/20 transition-colors">
              <MessageSquare size={15} /> Text
            </button>
            <button className="flex-1 bg-white/15 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-white/20 transition-colors">
              <Mail size={15} /> Email
            </button>
          </div>
        </div>

        {/* Bookings */}
        {state.bookings.length > 0 && (
          <Card className="p-5">
            <h2 className="font-bold text-sm mb-3">Your bookings</h2>
            <div className="space-y-2">
              {state.bookings.map((b) => (
                <div key={b.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-semibold">{b.installerName}</p>
                    <p className="text-slate-500 text-xs">
                      {b.date} · {b.time}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reset demo */}
        <button
          onClick={() => {
            dispatch({ type: 'RESET' });
            localStorage.removeItem('waterwise-state-v1');
          }}
          className="w-full rounded-2xl border border-red-100 text-red-500 py-3.5 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} /> Reset demo & start over
        </button>
      </div>
    </div>
  );
}
