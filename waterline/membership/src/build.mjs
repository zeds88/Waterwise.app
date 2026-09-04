// Builds the Waterline membership pieces (residential + commercial):
// inlines shared CSS + assets, renders PDF + PNG previews, checks for page overflow.
// Usage: CHROME_PATH=/path/to/chrome node build.mjs   (needs `playwright` and `qrcode` resolvable)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const QRCode = require('qrcode');

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..');
const assets = path.join(out, 'assets');

const b64 = (file, mime) => `data:${mime};base64,` + fs.readFileSync(file).toString('base64');
const css = fs.readFileSync(path.join(here, 'brand.css'), 'utf8');
const logo = b64(path.join(assets, 'waterline_logo.png'), 'image/png');
const photo = b64(path.join(assets, 'hero-commercial.jpg'), 'image/jpeg');
const qr = await QRCode.toDataURL('https://waterlinedfw.com', {
  margin: 0, width: 240, color: { dark: '#1B3A5C', light: '#FFFFFF' },
});
const chk =
  `<svg class="chk" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#2A5F8F"/>` +
  `<path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const tck =
  `<svg width="11" height="11" viewBox="0 0 20 20" style="vertical-align:-1px"><circle cx="10" cy="10" r="10" fill="#2A5F8F"/>` +
  `<path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const DOCS = ['residential', 'commercial'];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let failed = false;

for (const name of DOCS) {
  const src = fs.readFileSync(path.join(here, `${name}.src.html`), 'utf8');
  const html = src
    .replaceAll('__CSS__', css)
    .replaceAll('__LOGO__', logo)
    .replaceAll('__PHOTO__', photo)
    .replaceAll('__QR__', qr)
    .replaceAll('__CHK__', chk)
    .replaceAll('__TCK__', tck);
  const htmlPath = path.join(out, `waterline-membership-${name}.html`);
  fs.writeFileSync(htmlPath, html);

  const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: path.join(out, `waterline-membership-${name}.pdf`),
    width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: 'screen' });
  const pages = await page.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(out, `${name}-page-${i + 1}.png`) });
  }
  // Overflow check: content must stay above the footer (absolutely positioned), not just inside the page.
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('.page')].map((p, i) => {
      const footer = p.querySelector('.footer');
      const limit = footer ? footer.getBoundingClientRect().top - 4 : p.getBoundingClientRect().bottom;
      const els = [...p.querySelectorAll('*')].filter(
        (e) => !footer.contains(e) && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().bottom > limit,
      );
      const worst = Math.max(0, ...els.map((e) => e.getBoundingClientRect().bottom - limit));
      return { page: i + 1, overflowing: els.length, overflowPx: Math.round(worst) };
    }),
  );
  console.log(name, JSON.stringify(overflow));
  if (overflow.some((o) => o.overflowing > 0)) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
