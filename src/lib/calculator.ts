import type { ClimateZone, GrassType, SavingsData, ZoneConfig, DailyWeather, WateringEvent } from '../types';

// Gallons per square foot per watering (from spec)
const WATERING_RATES: Record<GrassType, number> = {
  bermuda: 0.62,
  st_augustine: 0.75,
  zoysia: 0.58,
  fescue: 0.83,
  generic: 0.68,
};

// USDA climate zone multipliers
const CLIMATE_MULTIPLIERS: Record<ClimateZone, number> = {
  zone_8a: 1.1, // Hot, humid (Houston)
  zone_8b: 1.2, // Very hot (Austin, Dallas)
  zone_9a: 1.3, // Extreme heat (Southwest Texas)
};

const WATER_COST_PER_GALLON = 0.004; // average $/gallon in Texas
export const CO2_PER_GALLON = 0.0019; // kg CO2 per gallon

export const GRASS_LABELS: Record<GrassType, string> = {
  bermuda: 'Bermuda',
  st_augustine: 'St. Augustine',
  zoysia: 'Zoysia',
  fescue: 'Fescue',
  generic: 'Not sure / Mixed',
};

export const CLIMATE_LABELS: Record<ClimateZone, string> = {
  zone_8a: 'Zone 8a — Hot & humid (Houston)',
  zone_8b: 'Zone 8b — Very hot (Austin, Dallas)',
  zone_9a: 'Zone 9a — Extreme heat (SW Texas)',
};

/** Roughly derive a climate zone from a Texas zip code for the demo. */
export function guessClimateZone(zipCode: string): ClimateZone {
  const prefix = parseInt(zipCode.slice(0, 3), 10);
  if (Number.isNaN(prefix)) return 'zone_8b';
  if (prefix >= 770 && prefix <= 775) return 'zone_8a'; // Houston area
  if (prefix >= 780 && prefix <= 789) return 'zone_9a'; // South/SW Texas
  return 'zone_8b';
}

export function calculateSavings(
  yardSqFt: number,
  grassType: GrassType,
  climateZone: ClimateZone
): SavingsData {
  const rate = WATERING_RATES[grassType];
  // Typical homeowner waters ~3x per week, over-watering by 40-60%
  const baselinePerWeek = yardSqFt * rate * 3 * CLIMATE_MULTIPLIERS[climateZone];
  // WaterWise optimizes to ~1.5x per week with adaptive scheduling
  const optimizedPerWeek = yardSqFt * rate * 1.5;

  const weeklySavings = Math.max(0, baselinePerWeek - optimizedPerWeek);
  const monthlySavings = weeklySavings * 4.33;
  const annualSavings = monthlySavings * 12;

  return {
    weeklyGallonsSaved: Math.round(weeklySavings),
    monthlyGallonsSaved: Math.round(monthlySavings),
    monthlyCostSavings: parseFloat((monthlySavings * WATER_COST_PER_GALLON).toFixed(2)),
    annualGallonsSaved: Math.round(annualSavings),
    annualCostSavings: parseFloat((annualSavings * WATER_COST_PER_GALLON).toFixed(2)),
  };
}

/**
 * Adaptive schedule optimizer (from spec): builds the next 7 days of watering
 * events, skipping rain/freeze days and adjusting duration for temperature.
 */
export function optimizeSchedule(
  zones: ZoneConfig[],
  forecast: DailyWeather[],
  adaptiveMode: boolean
): WateringEvent[] {
  const events: WateringEvent[] = [];

  for (const zone of zones) {
    if (!zone.enabled) continue;

    for (let day = 0; day < 7; day++) {
      if (day % zone.frequencyDays !== 0) continue;

      const weather = forecast[day];
      let duration = zone.durationMinutes;
      let status: WateringEvent['status'] = 'scheduled';

      if (adaptiveMode && weather) {
        if (weather.tempLow < 32) continue; // pause if freeze
        if (weather.precipitation > 0.5) {
          events.push({ zoneId: zone.id, zoneName: zone.name, dayOffset: day, durationMinutes: 0, status: 'skipped-rain' });
          continue;
        }
        if (weather.tempHigh < 75) {
          duration = duration * 0.8;
          status = 'reduced-cool';
        } else if (weather.tempHigh > 95) {
          duration = duration * 1.2;
          status = 'increased-heat';
        }
      }

      events.push({
        zoneId: zone.id,
        zoneName: zone.name,
        dayOffset: day,
        durationMinutes: Math.round(duration),
        status,
      });
    }
  }

  return events.sort((a, b) => a.dayOffset - b.dayOffset);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
