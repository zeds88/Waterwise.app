export type GrassType = 'bermuda' | 'st_augustine' | 'zoysia' | 'fescue' | 'generic';
export type ClimateZone = 'zone_8a' | 'zone_8b' | 'zone_9a';

export interface UserProfile {
  firstName: string;
  email: string;
  zipCode: string;
  grassType: GrassType;
  yardSqFt: number;
  climateZone: ClimateZone;
  referralCode: string;
  referralCount: number;
  creditsEarned: number;
}

export interface SavingsData {
  weeklyGallonsSaved: number;
  monthlyGallonsSaved: number;
  monthlyCostSavings: number;
  annualGallonsSaved: number;
  annualCostSavings: number;
}

export type DayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface ZoneConfig {
  id: string;
  name: string;
  cropType: 'grass' | 'perennials' | 'trees';
  soilType: 'clay' | 'loam' | 'sandy';
  moistureTarget: number; // 1-10
  frequencyDays: 3 | 5 | 7;
  durationMinutes: number;
  enabled: boolean;
}

export interface Schedule {
  adaptiveMode: boolean;
  zones: ZoneConfig[];
}

export interface WateringEvent {
  zoneId: string;
  zoneName: string;
  dayOffset: number; // 0 = today
  durationMinutes: number;
  status: 'scheduled' | 'skipped-rain' | 'reduced-cool' | 'increased-heat';
}

export interface DailyWeather {
  dayOffset: number;
  tempHigh: number;
  tempLow: number;
  precipitation: number; // inches
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm';
}

export interface Installer {
  id: string;
  businessName: string;
  rating: number;
  reviewCount: number;
  distanceMiles: number;
  priceLow: number;
  priceHigh: number;
  nextAvailable: string;
  avatar: string; // initials
  certified: boolean;
  pin: { x: number; y: number }; // % positions on mock map
}

export interface Booking {
  id: string;
  installerId: string;
  installerName: string;
  serviceType: 'install' | 'install_audit';
  date: string;
  time: string;
  notes: string;
  totalAmount: number;
  status: 'confirmed';
}

export interface WeeklyImpactEntry {
  weekLabel: string;
  gallonsSaved: number;
  dollarsSaved: number;
  co2Prevented: number;
}
