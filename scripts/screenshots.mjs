// Takes the screenshots in the README and the documentation: npm run screenshots
//
// Starts the service in this process with an example configuration that only
// uses the domains reserved for documentation (RFC 2606), photographs the
// support page in light and dark mode, on a desktop and a phone, and writes
// the images to docs/screenshots/. Nothing is left running.
//
// Needs Chromium for Playwright: npx playwright install chromium

import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const repo = path.resolve(import.meta.dirname, '..');
const out = path.join(repo, 'docs', 'screenshots');

process.env.LOG_LEVEL = 'silent';
const createApp = require('../index.js');
const loadSettings = require('../settings.js');

const settings = loadSettings({
  DOMAIN: 'example.com',
  COMPANY_NAME: 'Example Mail',
  IMAP_HOST: 'mail.example.com',
  SMTP_HOST: 'mail.example.com',
  POP_HOST: '',
});

const desktop = { viewport: { width: 1600, height: 900 } };
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// Chromium compresses its PNG files for speed. Packing the image data again at
// the highest level keeps every pixel and makes the files a good deal smaller.
// From wg-access-server's screenshot script.
function recompress(file) {
  const png = fs.readFileSync(file);
  const chunks = [];
  const idat = [];
  for (let pos = 8; pos < png.length; ) {
    const length = png.readUInt32BE(pos);
    const type = png.toString('latin1', pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + length);
    if (type === 'IDAT') {
      if (idat.length === 0) {
        chunks.push({ type });
      }
      idat.push(data);
    } else {
      chunks.push({ type, data });
    }
    pos += 12 + length;
  }
  const packed = zlib.deflateSync(zlib.inflateSync(Buffer.concat(idat)), { level: 9, memLevel: 9 });
  const parts = [png.subarray(0, 8)];
  for (const chunk of chunks) {
    const data = chunk.type === 'IDAT' ? packed : chunk.data;
    const header = Buffer.alloc(8);
    header.writeUInt32BE(data.length);
    header.write(chunk.type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([header.subarray(4), data])));
    parts.push(header, data, crc);
  }
  fs.writeFileSync(file, Buffer.concat(parts));
}

// section: photograph only that part of the page, with a margin around it
async function shoot(page, name, section) {
  // the theme switch fades the background
  await page.waitForTimeout(500);
  const file = path.join(out, `${name}.png`);
  if (section) {
    const box = await section.boundingBox();
    const margin = 32;
    const clip = { x: box.x - margin, y: box.y - margin, width: box.width + 2 * margin, height: box.height + margin };
    await page.screenshot({ path: file, fullPage: true, clip });
  } else {
    await page.screenshot({ path: file });
  }
  recompress(file);
  console.log(`  ${path.relative(repo, file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

async function screenshots(browser, base) {
  for (const theme of ['light', 'dark']) {
    const suffix = theme === 'dark' ? '-dark' : '';
    for (const [device, options] of [['desktop', desktop], ['phone', phone]]) {
      const context = await browser.newContext(options);
      // the page keeps the chosen theme in a cookie
      await context.addCookies([{ name: 'main_theme', value: theme, url: base }]);
      const page = await context.newPage();
      await page.goto(base);

      if (device === 'phone') {
        await shoot(page, `support-page-phone${suffix}`);
      } else {
        await shoot(page, `support-page${suffix}`);
        // the section alone: the page ends before it could scroll it to the top
        const section = page.locator('main > .container', { has: page.locator('#manualconfig') });
        await shoot(page, `manual-configuration${suffix}`, section);
      }
      await context.close();
    }
  }
}

fs.mkdirSync(out, { recursive: true });
const server = createApp(settings).listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch();
try {
  await screenshots(browser, `http://127.0.0.1:${server.address().port}/`);
} finally {
  await browser.close();
  server.close();
}
