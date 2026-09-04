// Builds the Waterline membership piece: inlines assets, renders PDF + PNG previews.
// Usage: node build.mjs  (needs `playwright` and `qrcode` resolvable from cwd or NODE_PATH)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const QRCode = require('qrcode');

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..');
const src = fs.readFileSync(path.join(here, 'membership.src.html'), 'utf8');

const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(out, 'waterline_logo.png')).toString('base64');
const qr = await QRCode.toDataURL('https://waterlinedfw.com', {
  margin: 0, width: 240, color: { dark: '#1B3A5C', light: '#FFFFFF' },
});
const chk = (fill) =>
  `<svg class="chk" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="${fill}"/>` +
  `<path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const tck =
  `<svg width="11" height="11" viewBox="0 0 20 20" style="vertical-align:-1px"><circle cx="10" cy="10" r="10" fill="#2A5F8F"/>` +
  `<path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const html = src
  .replaceAll('__LOGO__', logo)
  .replaceAll('__QR__', qr)
  .replaceAll('__CHK__', chk('#2A5F8F'))
  .replaceAll('__TCK__', tck);

const htmlPath = path.join(out, 'waterline-membership.html');
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: path.join(out, 'waterline-membership.pdf'),
  width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true,
});
await page.emulateMedia({ media: 'screen' });
const pages = await page.$$('.page');
for (let i = 0; i < pages.length; i++) {
  await pages[i].screenshot({ path: path.join(out, `page-${i + 1}.png`) });
}
// Overflow check: anything drawn past the page bottom is a layout bug.
const overflow = await page.evaluate(() =>
  [...document.querySelectorAll('.page')].map((p, i) => {
    const pb = p.getBoundingClientRect().bottom;
    const els = [...p.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().bottom > pb + 0.5);
    return { page: i + 1, overflowing: els.length, worst: els.slice(0, 3).map((e) => e.className || e.tagName) };
  }),
);
console.log(JSON.stringify(overflow));
await browser.close();
