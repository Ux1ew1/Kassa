import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { testServer } from './test-server.js';

test('all screens reflow across phone, tablet, desktop and landscape viewports', {
  timeout: 90000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base, menu } = await testServer(t);
  const items = [...menu.menus[0].items, ...Array.from({ length: 32 }, (_, index) => ({ id: index + 3,
    name: `Длинное название товара для проверки переноса и прокрутки ${index + 1}`, price: 1234567.89, show: true, category: 'еда' }))];
  await fetch(`${base}/api/menu`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, activeOrder: items.map(item => item.id) }) });
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sizes = [[280, 653], [320, 568], [375, 812], [430, 932], [768, 1024], [568, 320], [667, 375], [844, 390], [932, 430], [1024, 768], [1440, 900], [1920, 1080]];
  await fs.mkdir('.hallmark/screenshots', { recursive: true });
  for (const route of ['/', '/admin', '/ai-menu', '/reports']) {
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    await page.waitForSelector(route === '/' ? '.menu .item' : route === '/reports' ? '.accounting-check' : route === '/ai-menu' ? '.ai-modal--inline' : '.admin-menu');
    for (const [width, height] of sizes) {
      await page.setViewport({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const metrics = await page.evaluate(() => {
        const bounds = selector => { const box = document.querySelector(selector)?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
        return { width: innerWidth, overflow: document.documentElement.scrollWidth, bodyOverflow: document.body.scrollWidth,
          menu: bounds('.menu'), cart: bounds('.cashier-cart'), bottom: bounds('.bottom'), checks: bounds('.top__checks') };
      });
      assert.ok(metrics.overflow <= width + 1 && metrics.bodyOverflow <= width + 1, `${route} ${width}x${height}: page overflow ${JSON.stringify(metrics)}`);
      if (route === '/') {
        assert.ok(await page.$$eval('.menu > .item', items => items.every(item => item.querySelector('.item-price').getBoundingClientRect().bottom <= item.getBoundingClientRect().bottom + 1)), `prices fit their cards ${width}x${height}`);
        assert.ok(metrics.checks.left >= 0 && metrics.checks.right <= width + 1, `checks ${width}x${height}`);
        if (width >= 1024 || width >= 640 && width > height && height <= 600) {
          assert.ok(metrics.cart.left >= metrics.menu.right - 2, `side-by-side check ${width}x${height}`);
          assert.ok(metrics.bottom.top >= 0 && metrics.bottom.bottom <= height + 1, `payment visible ${width}x${height}: ${JSON.stringify(metrics)}`);
          assert.ok(metrics.menu.height >= 44, `usable menu area ${width}x${height}`);
          await page.$eval('.cashier-workspace > .menu', menu => { menu.scrollTop = menu.scrollHeight; });
          assert.ok(await page.$eval('.cashier-workspace > .menu', menu => menu.scrollHeight <= menu.clientHeight + 1 || menu.scrollTop > 0), `menu scrolls when needed ${width}x${height}`);
        }
      }
      if ((width === 844 || width === 1440) && route === '/') {
        await page.$eval('.menu', menu => { menu.scrollTop = 0; });
        await page.screenshot({ path: `.hallmark/screenshots/cashier-${width}x${height}.png` });
      }
    }
  }
  // Rotate during work without losing an open check, then verify short-screen dialogs.
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('.menu .item');
  await page.setViewport({ width: 844, height: 390 });
  await page.waitForFunction(() => document.querySelector('.cashier-cart .cart__item'));
  assert.ok((await page.$eval('.price', element => element.textContent)).includes('100'));
  await page.click('.amountButton');
  await page.waitForSelector('.change-modal__content');
  const modal = await page.$eval('.change-modal__content', element => {
    const box = element.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, scrollable: getComputedStyle(element).overflowY };
  });
  assert.ok(modal.top >= 0 && modal.bottom <= 391, JSON.stringify(modal));
  assert.equal(modal.scrollable, 'auto');
  assert.deepEqual(errors, []);
});
