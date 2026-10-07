import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const URL = process.argv[2] || 'http://localhost:8099/';
mkdirSync('_work/shots', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
const total = await p.evaluate(() => document.body.scrollHeight);
let i = 0;
for (let y = 0; y < total; y += 860) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(700); // deixa reveal + decode acontecer
  await p.screenshot({ path: `_work/shots/frame-${String(i).padStart(2,'0')}.png` });
  i++;
}
console.log(`✓ ${i} frames`);
await b.close();
