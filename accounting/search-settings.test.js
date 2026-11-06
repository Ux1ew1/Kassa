import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { testServer } from './test-server.js';

test('search prediction setting persists across cashier and admin; new-check icon stays centred', {
  timeout: 30000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base } = await testServer(t);
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.type('.search-input', 'амнри');
  assert.equal(await page.$$('.menu .item').then(items => items.length), 1);
  const toggle = async () => {
    await page.$eval('.container > h1', element => element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    await page.click('label:has(input[aria-label="Предугадывание в поиске"])');
    await page.click('.glass-dialog__close');
  };
  await toggle();
  assert.equal(await page.$$('.menu .item').then(items => items.length), 0);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.type('.search-input', 'амнри');
  assert.equal(await page.$$('.menu .item').then(items => items.length), 0);
  await page.click('.search-clear-button');
  await page.type('.search-input', 'Амери');
  assert.equal(await page.$$('.menu .item').then(items => items.length), 1);
  await page.goto(base + '/admin', { waitUntil: 'networkidle0' });
  await page.type('.admin-search-input', 'амнри');
  assert.equal(await page.$$('.admin-item').then(items => items.length), 0);
  await page.goto(base, { waitUntil: 'networkidle0' });
  await toggle();
  await page.type('.search-input', 'амнри');
  assert.equal(await page.$$('.menu .item').then(items => items.length), 1);
  for (const [width, height] of [[280, 653], [375, 812], [844, 390]]) {
    await page.setViewport({ width, height });
    const delta = await page.$eval('.newCheck', button => {
      const b = button.getBoundingClientRect(), icon = button.querySelector('svg').getBoundingClientRect();
      return { x: Math.abs((b.left + b.right - icon.left - icon.right) / 2), y: Math.abs((b.top + b.bottom - icon.top - icon.bottom) / 2) };
    });
    assert.ok(delta.x < 1 && delta.y < 1, JSON.stringify(delta));
  }
  await page.click('.newCheck');
  assert.equal(await page.$$('.check-item').then(items => items.length), 2);
  assert.deepEqual(errors, []);
});
