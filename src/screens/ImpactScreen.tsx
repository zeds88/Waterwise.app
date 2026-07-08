import { useState } from 'react';
import { Droplets, DollarSign, Leaf, Share2, Users, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import { useApp } from '../context/AppContext';
import { CO2_PER_GALLON, formatNumber } from '../lib/calculator';
import { IMPACT_HISTORY_RATIOS, NEIGHBORHOOD_HOUSEHOLDS, NEIGHBORHOOD_TOTAL_GALLONS } from '../data/mockData';

export default function ImpactScreen() {
  const { state, savings } = useApp();
  const [shared, setShared] = useState(false);
  if (!state.user || !savings) return null;

  const thisWeek = {
    weekLabel: 'This week',
    gallonsSaved: savings.weeklyGallonsSaved,
    dollarsSaved: savings.weeklyGallonsSaved * 0.004,
    co2Prevented: savings.weeklyGallonsSaved * CO2_PER_GALLON,
  };
  const pastWeeks = IMPACT_HISTORY_RATIOS.map((w) => {
    const gallons = Math.round(savings.weeklyGallonsSaved * w.ratio);
    return {
      weekLabel: w.weekLabel,
      gallonsSaved: gallons,
      dollarsSaved: gallons * 0.004,
      co2Prevented: gallons * CO2_PER_GALLON,
    };
  });
  const history = [...pastWeeks, thisWeek];
  const maxGallons = Math.max(...history.map((h) => h.gallonsSaved));
  const totalGallons = history.reduce((s, h) => s + h.gallonsSaved, 0);

  const share = async () => {
    const text = `I saved ${formatNumber(thisWeek.gallonsSaved)} gallons of water this week with WaterWise! 💧`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md px-5 pt-8 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Your Water Impact</h1>
          <p className="text-slate-500 text-sm mt-1">Week of Jul 6 – Jul 12</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Droplets size={22} className="mx-auto mb-2 text-cyan-500" />
            <div className="text-lg font-extrabold tabular-nums leading-tight">
              {formatNumber(thisWeek.gallonsSaved)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">gallons</div>
          </Card>
          <Card className="p-4 text-center">
            <DollarSign size={22} className="mx-auto mb-2 text-green-500" />
            <div className="text-lg font-extrabold tabular-nums leading-tight">
              ${thisWeek.dollarsSaved.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">saved</div>
          </Card>
          <Card className="p-4 text-center">
            <Leaf size={22} className="mx-auto mb-2 text-green-600" />
            <div className="text-lg font-extrabold tabular-nums leading-tight">
              {thisWeek.co2Prevented.toFixed(1)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">kg CO₂ avoided</div>
          </Card>
        </div>

        {/* History chart */}
        <Card className="p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-bold text-sm">Last 5 weeks</h2>
            <span className="text-xs text-slate-500">
              <span className="font-bold text-slate-900">{formatNumber(totalGallons)}</span> gal total
            </span>
          </div>
          <div className="flex justify-between gap-2">
            {history.map((h, i) => {
              const isCurrent = i === history.length - 1;
              return (
                <div key={h.weekLabel} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                    {(h.gallonsSaved / 1000).toFixed(1)}k
                  </span>
                  <div className="w-full h-24 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        isCurrent ? 'bg-gradient-to-t from-blue-600 to-cyan-400' : 'bg-slate-200'
                      }`}
                      style={{ height: `${Math.max(8, (h.gallonsSaved / maxGallons) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>
                    {isCurrent ? 'Now' : h.weekLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Neighborhood social proof */}
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0">
            <Users size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-sm">
              {state.user.zipCode} saved {formatNumber(NEIGHBORHOOD_TOTAL_GALLONS)} gallons together
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              {NEIGHBORHOOD_HOUSEHOLDS} WaterWise households in your neighborhood this month
            </p>
          </div>
        </Card>

        {/* Share */}
        <button
          onClick={share}
          className={`w-full rounded-2xl px-5 py-4 font-semibold flex items-center justify-center gap-2 transition-all ${
            shared
              ? 'bg-green-500 text-white'
              : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
          }`}
        >
          {shared ? (
            <>
              <Check size={18} /> Copied to clipboard!
            </>
          ) : (
            <>
              <Share2 size={18} /> Share your impact
            </>
          )}
        </button>
      </div>
    </div>
  );
}
