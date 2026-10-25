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
| **Video**: record in-app (with audio when allowed) or upload; playback, poster frames, durations | ✅ |
| **Upload** existing photos *and* videos (multi-select) | ✅ |
| Timestamp + GPS stamped on every photo, OpenStreetMap link | ✅ |
| Annotations: arrows, boxes, circles, freehand, text – **non-destructive** vectors | ✅ |
| Tags & filters, captions, cover photo | ✅ |
| Before / after slider | ✅ |
| Checklists with templates (pre-job, safety, punch list, closeout) | ✅ |
| Estimates with editable price book, tax, totals | ✅ |
| **Walk the job**: dictate a site walk → issues, punch list and priced estimate, on-device | ✅ |
| Voice dictation for photo captions | ✅ (browser Web Speech API) |
| Shareable report: self-contained HTML, print to PDF, email as a file | ✅ |
| **AI photo/video analysis**: summary, caption, tags, issues with severity + evidence + fix, materials, safety flags, confidence, and written *reasoning* | ✅ bring-your-own model |
| Video analysis by sampling timestamped frames | ✅ |
| **Narration**: speech-to-text of a video's soundtrack with tap-to-seek timestamps; the AI reads the transcript alongside the frames and flags where speech and visuals disagree | ✅ |
| Narration → punch list and priced estimate (reuses the walk-the-job parser) | ✅ |
| Speech engines: **on-device Whisper** (private, free, offline after first download; English or multilingual incl. Spanish) or any OpenAI-compatible transcription API | ✅ |
| **AI job review**: reasons across all photos, videos, notes and checklists → customer summary, progress, risks, ordered next steps, suggested billable items | ✅ |
| One-tap actions: use AI caption/tags, add findings or next steps to checklists, create a priced estimate from suggested items | ✅ |
| Batch "Analyze all" with confirmation | ✅ |
| Progress recap (local) | ✅ |
| Full backup / restore (JSON, photos included) | ✅ |
| Offline PWA, light/dark | ✅ |

### Where JobCam is different on purpose
- **Your data stays on your device.** Photos and videos are stored in IndexedDB. Nothing leaves
  the device unless *you* press Analyze / Review (then only that item's downscaled frames, or the
  text digest for a job review, go straight from your browser to the provider you configured) or
  you export a report.
- **Bring your own AI.** Claude, any OpenAI-compatible API, or a local vision model (Ollama
  `llava` / `qwen2.5vl`, LM Studio) for fully private analysis. No middleman, no markup.
- **AI shows its work.** Every analysis lists the evidence it saw and a reasoning trace, and is
  labelled with the model and confidence so you can verify before it reaches a customer.
- **Free forever, MIT licensed.** No per-user pricing, no storage caps beyond your device.
- **Annotations never touch the original.** Markup is stored as vectors and burned in only on export.

### Honest gaps (not built yet)
Multi-user accounts and real-time team sync, a hosted client portal / live share links,
native iOS/Android apps (the PWA is the mobile app for now), map view of all projects,
video trimming, e-signatures, and integrations (QuickBooks, Jobber, Zapier…). See the roadmap.

### Narration setup
Settings → *Video narration*. The default engine runs Whisper **in your browser** via transformers.js: the
first transcription downloads a ~40 MB model from huggingface.co and the ONNX runtime from jsdelivr, after which
the browser caches them. Audio never leaves the device. Whisper can mishear numbers and names, so the UI says
so, and silent clips are skipped rather than letting the model invent text. Choose a *multilingual* model for
Spanish. Alternatively pick *Transcription API* to upload just the audio (as 16 kHz WAV) to an OpenAI-compatible
`/audio/transcriptions` endpoint. Browser limit: videos over ~400 MB are refused.

> Tested: audio decode/resample/WAV encode in real Chromium, the API engine end to end, transcript UI,
> timestamp seeking, and narration reaching the AI prompt. **Not tested in CI:** the actual Whisper model
> download and inference (needs internet to huggingface.co) – try it once on a real device.

### AI setup
Settings → *AI analysis & reasoning* → pick Claude / OpenAI / Ollama / LM Studio → enter a vision-capable
model and key → **Test connection**. Keys are stored only in this browser. Calls are made directly from the
browser, so the provider must allow CORS (Anthropic and local servers do; for Ollama set `OLLAMA_ORIGINS=*`).
AI output can be wrong; the UI says so and nothing is auto-applied without a tap.

## Roadmap
1. **Self-hosted sync** – optional Supabase/Postgres + S3/R2 backend (schema with row-level security patterns already exist in `zeds88/contractor-app`), conflict-free merges, team roles.
2. **Live share links** & customer portal (read-only gallery + comments).
3. **Fully on-device AI** – small WASM/WebGPU vision models so analysis works with no provider at all, auto before/after pairing, and Whisper-powered dictation for captions in every browser.
4. Video trimming/compression, e-signatures, and PDF export without the print dialog.
5. **Integrations** – webhooks, Zapier/Make, QuickBooks estimate/invoice push.
6. **Map view** (MapLibre + OSM tiles) and per-job geofence reminders.

## Architecture

```
src/lib/        pure, tested logic: db (IndexedDB), ai (vision + reasoning, 2 providers),
                narration parser, estimate math, recap, report builder, backup, video frames
src/components/ Annotator, AiPanel, Compare, PhotoViewer, Checklists, EstimateTab, ui
src/screens/    Projects, ProjectDetail, Capture, Walk, SettingsScreen
public/         manifest, service worker (offline app shell), icons
e2e/smoke.mjs   Playwright end-to-end test with a fake camera
```

Stack: React 19 · TypeScript · Vite · Tailwind 3 · IndexedDB · Web Speech API · Service Worker.

### Testing
`npm test` runs 38 unit tests (both AI provider request shapes, JSON recovery, frame caps, WAV encoding, transcript normalisation, both speech engines). `npm run build && node e2e/smoke.mjs` drives the real app in
headless Chromium (fake camera + GPS): create project → capture → annotate → compare →
video upload + recording → AI analysis (mocked provider) → AI job review → checklist → estimate →
report → walk-the-job → search → backup.

## Ideas reused from the author's other projects
- **service-bot** (`ServiceBot_iPhone.html`): the "narrate the job → structured estimate"
  idea became `src/lib/narration.ts`.
- **contractor-app**: Supabase schema/RLS patterns, planned for the sync roadmap item.

## License
MIT – see [LICENSE](./LICENSE).
