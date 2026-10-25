# WaterWise Planner Pro — Visual Prototype

> Your lawn learns. Your bill shrinks. Your water saved.

A fully interactive, testable visual prototype of the WaterWise Planner Pro mobile app,
built as a mobile-first React web app. No backend required — all data is mocked and the
savings math runs client-side using the real algorithm from the product spec.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 — the app renders in a phone-width frame, so it's testable
on desktop or a real phone.

## What you can test

| Flow | What happens |
|---|---|
| **Onboarding** | Splash → signup → yard baseline (size slider, lawn type, zip) → animated savings projection |
| **Dashboard** | Live weekly savings (gallons, $, CO₂, rain skips), 7-day forecast strip, next watering event, action carousel |
| **Schedule** | Adaptive-mode toggle, expandable zone cards (frequency, duration, moisture, soil), 7-day calendar preview that reacts to weather |
| **Impact** | Weekly stat cards, 5-week trend chart, neighborhood social proof, share (Web Share API / clipboard) |
| **Installers** | List & mock-map views, installer cards, 4-step booking modal (date → time → review/pay → confirmation) |
| **Profile** | Yard summary, referral code with copy-to-clipboard, booking history, demo reset |

State persists to `localStorage`, so a page refresh keeps you signed in. Use
**Profile → Reset demo** to start over.

## Real business logic included

`src/lib/calculator.ts` implements the spec's algorithms:

- **Savings calculator** — watering rates per grass type (Bermuda 0.62, St. Augustine 0.75,
  Zoysia 0.58, Fescue 0.83 gal/sqft), USDA climate-zone multipliers (8a/8b/9a), baseline
  3×/week vs. optimized 1.5×/week, $0.004/gal Texas water cost.
- **Adaptive schedule optimizer** — skips watering when rain > 0.5", pauses on freeze,
  shortens duration on cool days (< 75°F), extends on hot days (> 95°F).

## Stack

React 18 · TypeScript · Vite · Tailwind CSS v3 · React Router v6 · lucide-react

## Structure

```
src/
├── App.tsx              # Routes + onboarding guard
├── context/             # Global state (Context + Reducer, localStorage persistence)
├── lib/calculator.ts    # Savings + adaptive-schedule algorithms
├── data/mockData.ts     # Installers, forecast, zones, impact history
├── components/          # ui primitives, layout, auth, schedule, installers
└── screens/             # Home, Schedule, Impact, Installers, Profile
```

## Notes

- The gamification layer from the original spec (badges, points, levels, leaderboards)
  was intentionally omitted per product direction.
- Payments, SMS, email, and maps are simulated — no external services are called.

---

**Also in this repo:** [`jobcam/`](./jobcam) – a free, open-source, local-first job site photo documentation app (separate package).
