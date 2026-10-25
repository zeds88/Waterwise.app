# JobCam

Free, open-source, **local-first** job site photo documentation for contractors and
field crews. Capture photos, mark them up, track checklists and estimates, and send
customers a clean report – with no account, no subscription and no server.

> Independent project. Not affiliated with CompanyCam or any other vendor; no
> third-party code, fonts, logos or artwork were copied.

## Run it

```bash
cd jobcam
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # static site in dist/ – host anywhere (Vercel, Netlify, S3, GitHub Pages)
```

Open it on a phone and "Add to Home Screen" – it installs as an offline PWA.
(The camera and microphone need HTTPS or `localhost`.)

## What's in v0.1

| Capability | JobCam v0.1 |
|---|---|
| Projects (address, customer, status, search incl. photo captions & tags) | ✅ |
| Live camera, rapid multi-shot, front/back, tag-as-you-shoot | ✅ |
| Import existing photos | ✅ |
| Timestamp + GPS stamped on every photo, OpenStreetMap link | ✅ |
| Annotations: arrows, boxes, circles, freehand, text – **non-destructive** vectors | ✅ |
| Tags & filters, captions, cover photo | ✅ |
| Before / after slider | ✅ |
| Checklists with templates (pre-job, safety, punch list, closeout) | ✅ |
| Estimates with editable price book, tax, totals | ✅ |
| **Walk the job**: dictate a site walk → issues, punch list and priced estimate, on-device | ✅ |
| Voice dictation for photo captions | ✅ (browser Web Speech API) |
| Shareable report: self-contained HTML, print to PDF, email as a file | ✅ |
| Progress recap (local) + optional AI polish via *your own* OpenAI-compatible endpoint | ✅ |
| Full backup / restore (JSON, photos included) | ✅ |
| Offline PWA, light/dark | ✅ |

### Where JobCam is different on purpose
- **Your data stays on your device.** Photos are stored in IndexedDB. Nothing is uploaded
  unless you export a report or configure the optional AI endpoint (text only, never photos).
- **Free forever, MIT licensed.** No per-user pricing, no storage caps beyond your device.
- **Annotations never touch the original.** Markup is stored as vectors and burned in only on export.

### Honest gaps (not built yet)
Multi-user accounts and real-time team sync, a hosted client portal / live share links,
native iOS/Android apps (the PWA is the mobile app for now), map view of all projects,
video capture, e-signatures, and integrations (QuickBooks, Jobber, Zapier…). See the roadmap.

## Roadmap
1. **Self-hosted sync** – optional Supabase/Postgres + S3/R2 backend (schema with row-level security patterns already exist in `zeds88/contractor-app`), conflict-free merges, team roles.
2. **Live share links** & customer portal (read-only gallery + comments).
3. **On-device AI** – auto-tag/caption photos, detect before/after pairs, speech-to-text via Whisper (WASM) so dictation works in every browser.
4. **Video clips**, e-signatures, and PDF export without the print dialog.
5. **Integrations** – webhooks, Zapier/Make, QuickBooks estimate/invoice push.
6. **Map view** (MapLibre + OSM tiles) and per-job geofence reminders.

## Architecture

```
src/lib/        pure, tested logic: db (IndexedDB), narration parser, estimate math,
                recap, report builder, backup, annotation drawing
src/components/ Annotator, Compare, PhotoViewer, Checklists, EstimateTab, ui
src/screens/    Projects, ProjectDetail, Capture, Walk, SettingsScreen
public/         manifest, service worker (offline app shell), icons
e2e/smoke.mjs   Playwright end-to-end test with a fake camera
```

Stack: React 19 · TypeScript · Vite · Tailwind 3 · IndexedDB · Web Speech API · Service Worker.

### Testing
`npm test` runs 18 unit tests. `npm run build && node e2e/smoke.mjs` drives the real app in
headless Chromium (fake camera + GPS): create project → capture → annotate → compare →
checklist → estimate → report → walk-the-job → search → backup.

## Ideas reused from the author's other projects
- **service-bot** (`ServiceBot_iPhone.html`): the "narrate the job → structured estimate"
  idea became `src/lib/narration.ts`.
- **contractor-app**: Supabase schema/RLS patterns, planned for the sync roadmap item.

## License
MIT – see [LICENSE](./LICENSE).
