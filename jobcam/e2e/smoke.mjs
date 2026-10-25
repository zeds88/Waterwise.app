// End-to-end smoke test. Usage: npm run build && node e2e/smoke.mjs
// Requires Playwright (not a project dependency): npx playwright install chromium
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const PORT = 4173
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))

const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  permissions: ['camera', 'geolocation'], geolocation: { latitude: 32.7767, longitude: -96.797 },
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('dialog', (d) => d.accept())
const shot = (n) => page.screenshot({ path: `${process.env.SHOTS ?? '/tmp'}/jobcam-${n}.png` })
const url = `http://localhost:${PORT}/`

try {
  await page.goto(url)
  await page.getByText('No projects yet').waitFor()
  await shot('01-empty')

  // create project
  await page.getByRole('button', { name: 'New' }).click()
  await page.getByPlaceholder('Johnson – sprinkler repair').fill('Johnson – sprinkler repair')
  await page.getByPlaceholder('4821 Oak Ridge Dr').fill('4821 Oak Ridge Dr')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Johnson – sprinkler repair' }).waitFor()

  // capture two photos with the fake camera
  await page.getByRole('link', { name: 'Capture' }).first().click()
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0)
  await page.getByRole('button', { name: 'Before', exact: true }).click()
  await page.getByRole('button', { name: 'Take photo' }).click()
  await page.getByText('Saved ✓').waitFor()
  await page.getByRole('button', { name: 'Before', exact: true }).click() // untoggle
  await page.getByRole('button', { name: 'After', exact: true }).click()
  await page.getByRole('button', { name: 'Take photo' }).click()
  await page.getByText('2 saved').waitFor()
  await shot('02-capture')

  // back to project → photos present with tags
  await page.getByRole('link', { name: 'Projects' }).last().click()
  await page.getByText('2 photos').waitFor()
  await page.getByText('Johnson – sprinkler repair').click()
  await page.getByRole('button', { name: 'Open photo' }).first().waitFor()
  assert.equal(await page.getByRole('button', { name: 'Open photo' }).count(), 2)

  // open photo, annotate, caption
  await page.getByRole('button', { name: 'Open photo' }).first().click()
  await page.getByRole('button', { name: 'Mark up' }).click()
  const cv = page.getByLabel('Annotation canvas')
  const box = await cv.boundingBox()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Box' }).click()
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.8, { steps: 5 })
  await page.mouse.up()
  await shot('03-annotate')
  await page.getByRole('button', { name: 'Done marking' }).click()
  await page.getByText('Marked up').waitFor()
  await page.getByPlaceholder('What does this photo show?').fill('Leaking zone 4 valve')
  await page.keyboard.press('Escape')
  await page.getByText('Leaking zone 4 valve').first().waitFor({ state: 'attached' }).catch(() => {})

  // before / after compare
  await page.getByRole('button', { name: 'Select' }).click()
  const thumbs = page.locator('button[aria-label]').filter({ has: page.locator('img') })
  await thumbs.nth(0).click(); await thumbs.nth(1).click()
  await page.getByRole('button', { name: 'Before / after' }).click()
  await page.getByLabel('Before/after slider').waitFor()
  await shot('04-compare')
  await page.keyboard.press('Escape')

  // checklists
  await page.getByRole('button', { name: /Checklists/ }).click()
  await page.getByRole('button', { name: 'Pre-job walkthrough' }).click()
  await page.getByText('0/5').waitFor()
  await page.getByRole('checkbox').first().check()
  await page.getByText('1/5').waitFor()

  // estimate
  await page.getByRole('button', { name: /Estimate/ }).click()
  await page.getByRole('button', { name: 'New estimate' }).click()
  await page.getByLabel('Add from price book').selectOption({ index: 1 })
  await page.getByLabel('Unit price').first().waitFor()
  assert.equal(await page.getByLabel('Unit price').first().inputValue(), '35')
  await page.locator('span', { hasText: /^\$35\.00$/ }).last().waitFor()
  await shot('05-estimate')

  // ───── AI + video ─────
  const aiCalls = []
  const ANALYSIS = { summary: 'Cracked valve box lid with standing water.', caption: 'Cracked valve box', tags: ['Issue', 'Damage'], observations: ['Standing water in box'], issues: [{ title: 'Cracked lid', severity: 'high', evidence: 'Visible crack across lid', recommendation: 'Replace valve box lid' }], materials: ['Valve box lid'], safety: [], reasoning: 'The crack spans the lid and water pools below it, so the lid no longer protects the valve.', confidence: 'high' }
  const REVIEW = { summary: 'Repairs are mostly scoped; the valve box needs a new lid.', progress: 'Assessment done, repair pending', risks: ['Water intrusion may damage the valve'], nextSteps: ['Replace valve box lid', 'Re-test zone 4'], suggestedItems: [{ description: 'Replace zone valve', qty: 1, unit: 'ea' }, { description: 'Valve box lid', qty: 2, unit: 'ea' }], reasoning: 'Photos show a cracked lid and wet valve; both fixes are cheap compared to valve failure.' }
  await ctx.route('https://api.anthropic.com/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST,OPTIONS' }
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const body = req.postDataJSON()
    aiCalls.push({ headers: req.headers(), body })
    const content = body.messages[0].content
    const images = content.filter((c) => c.type === 'image').length
    const text = images ? JSON.stringify(ANALYSIS) : /ok/.test(content[0].text) && content[0].text.length < 60 ? 'ok' : JSON.stringify(REVIEW)
    await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text }] }) })
  })

  await page.getByRole('link', { name: 'Settings' }).last().click()
  await page.getByRole('button', { name: 'Claude', exact: true }).click()
  await page.getByPlaceholder('claude-sonnet-5-5').fill('claude-sonnet-5-5')
  await page.locator('input[type=password]').fill('sk-test')
  await page.getByRole('button', { name: 'Test connection' }).click()
  await page.getByText('Connection works').waitFor()
  await page.getByRole('link', { name: 'Projects' }).last().click()
  await page.getByText('Johnson – sprinkler repair').click()

  // upload a real video file (generated in-browser as webm)
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 240
    const g = c.getContext('2d'); const r = new MediaRecorder(c.captureStream(15), { mimeType: 'video/webm' })
    const ch = []; r.ondataavailable = (e) => ch.push(e.data); r.start()
    let n = 0; const t = setInterval(() => { g.fillStyle = `hsl(${n * 20},80%,50%)`; g.fillRect(0, 0, 320, 240); g.fillStyle = '#fff'; g.fillText('frame ' + n++, 20, 40) }, 60)
    await new Promise((res) => setTimeout(res, 2300)); clearInterval(t)
    await new Promise((res) => { r.onstop = res; r.stop() })
    const bytes = new Uint8Array(await new Blob(ch).arrayBuffer()); let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    return btoa(s)
  })
  await page.getByLabel('Upload photos or videos').setInputFiles({ name: 'walkthrough.webm', mimeType: 'video/webm', buffer: Buffer.from(b64, 'base64') })
  await page.getByRole('button', { name: 'Open video' }).first().waitFor()

  // record a second video with the (fake) camera
  await page.getByRole('link', { name: 'Capture' }).first().click()
  await page.getByRole('button', { name: 'video', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0)
  await page.getByRole('button', { name: 'Start recording' }).click()
  await page.getByText(/REC/).waitFor()
  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'Stop recording' }).click()
  await page.getByText('Saved ✓').waitFor({ timeout: 15000 })
  await page.getByRole('link', { name: 'Projects' }).last().click()
  await page.getByText('Johnson – sprinkler repair').click()
  await page.getByRole('button', { name: 'Open video' }).first().waitFor()
  await page.waitForFunction(() => document.querySelectorAll('.grid button[aria-label]').length === 4)
  assert.equal(await page.getByRole('button', { name: 'Open video' }).count(), 2)

  // open a video, confirm it plays, analyze it
  await page.getByRole('button', { name: 'Open video' }).first().click()
  const player = page.getByLabel('Video player')
  await player.waitFor()
  await page.waitForFunction(() => document.querySelector('video[aria-label="Video player"]')?.readyState >= 1)
  await page.getByRole('button', { name: 'Analyze', exact: true }).click()
  await page.getByText('Cracked valve box lid with standing water.').waitFor()
  await page.getByText('Replace valve box lid').first().waitFor()
  await page.getByText('How the AI reasoned').click()
  await shot('09-ai-video')
  const call = aiCalls.at(-1)
  assert.equal(call.headers['x-api-key'], 'sk-test')
  assert.ok(call.body.messages[0].content.filter((c) => c.type === 'image').length >= 2, 'video should send several frames')
  await page.getByRole('button', { name: 'Add to punch list' }).click()
  await page.getByRole('button', { name: 'Use caption' }).click()
  await page.keyboard.press('Escape')

  // analyze everything else, then AI job review
  await page.getByRole('button', { name: /Analyze all/ }).click()
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="AI analyzed"]').length === 4, null, { timeout: 30000 })
  await page.getByRole('button', { name: /Activity/ }).click()
  await page.getByRole('button', { name: 'Review this job' }).click()
  await page.getByText('Repairs are mostly scoped').waitFor()
  await shot('10-ai-review')
  const reviewCall = aiCalls.at(-1)
  assert.ok(!reviewCall.body.messages[0].content.some((c) => c.type === 'image'), 'job review must be text-only')
  assert.match(reviewCall.body.messages[0].content[0].text, /Cracked valve box lid/, 'review digest includes per-photo findings')
  await page.getByRole('button', { name: 'Create estimate from items' }).click()
  await page.getByLabel('Estimate title').last().waitFor()
  assert.ok((await page.getByLabel('Estimate title').evaluateAll((els) => els.map((e) => e.value))).includes('AI-suggested estimate'))
  await page.getByRole('button', { name: /Checklists/ }).click()
  await page.getByText('AI findings').waitFor()
  await page.getByText(/Cracked lid – Replace valve box lid/).waitFor()

  // report opens with photos + escaped content
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: 'Report' }).click()])
  await popup.waitForLoadState()
  await popup.getByRole('heading', { name: 'Johnson – sprinkler repair' }).waitFor()
  assert.equal(await popup.locator('figure img').count(), 4)
  await popup.getByText('▶ Video').first().waitFor()
  await popup.getByText('AI job review').waitFor()
  await popup.getByText('How the AI reasoned').first().waitFor()
  assert.ok((await popup.locator('.ai').count()) >= 4)
  await popup.getByRole('cell', { name: 'Replace sprinkler head' }).waitFor() // estimate edited moments ago must be in the report
  await popup.screenshot({ path: `${process.env.SHOTS ?? '/tmp'}/jobcam-06-report.png`, fullPage: true })
  await popup.close()

  // walk the job
  await page.getByRole('link', { name: 'Walk' }).last().click()
  await page.getByRole('button', { name: 'Try an example' }).click()
  await page.getByRole('button', { name: 'Organize' }).click()
  await page.getByText('Punch list').waitFor()
  await page.getByText('3 × Replace sprinkler head').waitFor()
  await shot('07-walk')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('heading', { name: 'Johnson – walkthrough' }).waitFor()

  // search by photo caption across projects
  await page.getByRole('link', { name: 'Projects' }).last().click()
  await page.getByLabel('Search').fill('leaking zone')
  await page.getByText('Johnson – sprinkler repair').waitFor()
  assert.equal(await page.getByText('Johnson – walkthrough').count(), 0)

  // backup round-trip
  await page.getByRole('link', { name: 'Settings' }).last().click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()])
  const path = await dl.path()
  const { readFileSync } = await import('node:fs')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(json.data.photos.length, 4)
  assert.equal(json.data.photos.filter((p) => p.kind === 'video').length, 2)
  assert.equal(json.data.projects.length, 2)
  await shot('08-settings')

  assert.deepEqual(errors, [])
  console.log('E2E PASS')
} catch (e) {
  await shot('FAIL').catch(() => {})
  console.error('E2E FAIL', e)
  process.exitCode = 1
} finally {
  await browser.close()
  server.kill()
}
