import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Booking, Schedule, SavingsData, UserProfile, ZoneConfig } from '../types';
import { calculateSavings } from '../lib/calculator';
import { DEFAULT_ZONES } from '../data/mockData';

interface AppState {
  user: UserProfile | null;
  onboardingComplete: boolean;
  schedule: Schedule;
  bookings: Booking[];
}

type Action =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'TOGGLE_ADAPTIVE' }
  | { type: 'UPDATE_ZONE'; payload: ZoneConfig }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'RESET' };

const initialState: AppState = {
  user: null,
  onboardingComplete: false,
  schedule: { adaptiveMode: true, zones: DEFAULT_ZONES },
  bookings: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true };
    case 'TOGGLE_ADAPTIVE':
      return { ...state, schedule: { ...state.schedule, adaptiveMode: !state.schedule.adaptiveMode } };
    case 'UPDATE_ZONE':
      return {
        ...state,
        schedule: {
          ...state.schedule,
          zones: state.schedule.zones.map((z) => (z.id === action.payload.id ? action.payload : z)),
        },
      };
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  savings: SavingsData | null;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = 'waterwise-state-v1';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...init, ...JSON.parse(saved) } as AppState;
    } catch {
      // ignore corrupt storage
    }
    return init;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const savings = useMemo(() => {
    if (!state.user) return null;
    return calculateSavings(state.user.yardSqFt, state.user.grassType, state.user.climateZone);
  }, [state.user]);

  return <AppContext.Provider value={{ state, savings, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
