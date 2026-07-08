import type { DailyWeather, Installer, ZoneConfig } from '../types';

export const DEFAULT_ZONES: ZoneConfig[] = [
  {
    id: 'z1',
    name: 'Front Yard',
    cropType: 'grass',
    soilType: 'clay',
    moistureTarget: 6,
    frequencyDays: 3,
    durationMinutes: 20,
    enabled: true,
  },
  {
    id: 'z2',
    name: 'Back Yard',
    cropType: 'grass',
    soilType: 'loam',
    moistureTarget: 5,
    frequencyDays: 3,
    durationMinutes: 25,
    enabled: true,
  },
  {
    id: 'z3',
    name: 'Side Garden',
    cropType: 'perennials',
    soilType: 'sandy',
    moistureTarget: 7,
    frequencyDays: 5,
    durationMinutes: 15,
    enabled: true,
  },
];

// Mock 7-day forecast: includes a rain day and a hot day so the
// adaptive optimizer visibly reacts.
export const MOCK_FORECAST: DailyWeather[] = [
  { dayOffset: 0, tempHigh: 92, tempLow: 74, precipitation: 0, condition: 'sunny' },
  { dayOffset: 1, tempHigh: 96, tempLow: 76, precipitation: 0, condition: 'sunny' },
  { dayOffset: 2, tempHigh: 88, tempLow: 72, precipitation: 0.1, condition: 'cloudy' },
  { dayOffset: 3, tempHigh: 84, tempLow: 70, precipitation: 0.8, condition: 'rain' },
  { dayOffset: 4, tempHigh: 90, tempLow: 73, precipitation: 0, condition: 'sunny' },
  { dayOffset: 5, tempHigh: 97, tempLow: 78, precipitation: 0, condition: 'sunny' },
  { dayOffset: 6, tempHigh: 91, tempLow: 75, precipitation: 0.2, condition: 'cloudy' },
];

export const MOCK_INSTALLERS: Installer[] = [
  {
    id: 'i1',
    businessName: 'AquaSmart Irrigation',
    rating: 4.9,
    reviewCount: 127,
    distanceMiles: 2.3,
    priceLow: 249,
    priceHigh: 399,
    nextAvailable: 'Tomorrow',
    avatar: 'AS',
    certified: true,
    pin: { x: 32, y: 28 },
  },
  {
    id: 'i2',
    businessName: 'GreenFlow Systems',
    rating: 4.7,
    reviewCount: 89,
    distanceMiles: 4.1,
    priceLow: 199,
    priceHigh: 349,
    nextAvailable: 'Thu, Jul 10',
    avatar: 'GF',
    certified: true,
    pin: { x: 62, y: 42 },
  },
  {
    id: 'i3',
    businessName: 'Texas H2O Pros',
    rating: 4.8,
    reviewCount: 203,
    distanceMiles: 5.6,
    priceLow: 299,
    priceHigh: 449,
    nextAvailable: 'Fri, Jul 11',
    avatar: 'TX',
    certified: true,
    pin: { x: 48, y: 65 },
  },
  {
    id: 'i4',
    businessName: 'SprinklerPro ATX',
    rating: 4.5,
    reviewCount: 56,
    distanceMiles: 7.2,
    priceLow: 179,
    priceHigh: 299,
    nextAvailable: 'Sat, Jul 12',
    avatar: 'SP',
    certified: false,
    pin: { x: 78, y: 22 },
  },
  {
    id: 'i5',
    businessName: 'EcoWater Install Co.',
    rating: 4.6,
    reviewCount: 74,
    distanceMiles: 8.9,
    priceLow: 229,
    priceHigh: 379,
    nextAvailable: 'Mon, Jul 14',
    avatar: 'EW',
    certified: true,
    pin: { x: 18, y: 58 },
  },
];

// Trailing 4 weeks of impact history, expressed as ratios of the user's
// live weekly savings so the chart stays meaningful for any yard size.
export const IMPACT_HISTORY_RATIOS: { weekLabel: string; ratio: number }[] = [
  { weekLabel: 'Jun 8', ratio: 0.68 },
  { weekLabel: 'Jun 15', ratio: 0.86 },
  { weekLabel: 'Jun 22', ratio: 0.74 },
  { weekLabel: 'Jun 29', ratio: 0.93 },
];

export const NEIGHBORHOOD_TOTAL_GALLONS = 48260;
export const NEIGHBORHOOD_HOUSEHOLDS = 34;

export const TIME_SLOTS = ['8:00 AM', '9:30 AM', '11:00 AM', '1:00 PM', '2:30 PM', '4:00 PM'];
