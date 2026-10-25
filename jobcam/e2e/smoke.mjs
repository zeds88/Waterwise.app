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

  // report opens with photos + escaped content
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: 'Report' }).click()])
  await popup.waitForLoadState()
  await popup.getByRole('heading', { name: 'Johnson – sprinkler repair' }).waitFor()
  assert.equal(await popup.locator('figure img').count(), 2)
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
  assert.equal(json.data.photos.length, 2)
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
