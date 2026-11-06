import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { testServer } from './test-server.js';

test('supplies form, package shortcut and persistent lost-response recovery', {
  timeout: 60000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base, api } = await testServer(t);
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(base + '/supplies', { waitUntil: 'networkidle0' });
  await page.type('[name="supply-name"]', 'Кофейные зёрна');
  await page.$eval('[name="supply-initial"]', element => { element.select(); });
  await page.type('[name="supply-initial"]', '2000');
  await page.click('[name="supply-pack-enabled"]');
  await page.click('details button[type="submit"]');
  await page.waitForSelector('[name="movement-supply"]');
  await page.setRequestInterception(true);
  let lost = false;
  page.on('request', async request => {
    if (!lost && request.url().endsWith('/api/accounting/supply-movements')) {
      lost = true;
      await fetch(request.url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request.postData() });
      await request.abort();
    } else await request.continue();
  });
  await page.click('.accounting-actions button[type="button"]');
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.includes('Нет подтверждения'));
  assert.equal((await api()).body.supplies[0].quantity, 1000);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[role="alert"] button');
  await page.waitForFunction(() => !localStorage.getItem('kassa-pending-supply-action'));
  assert.equal((await api()).body.supplies[0].quantity, 1000);
  await page.waitForFunction(() => document.querySelector('.supplies-stock-table')?.textContent.includes('1000'));
  assert.equal(await page.$eval('.supplies-other-operations', element => element.open), false);
  await page.click('.supplies-other-operations > summary');
  const amount = '.supplies-other-operations [name="supply-amount"]';
  const submit = '.supplies-other-operations button[type="submit"]';
  await page.type(amount, '500');
  await page.click(submit);
  await page.waitForFunction(() => document.querySelector('.supplies-other-operations [name="supply-amount"]').value === '');
  assert.equal((await api()).body.supplies[0].quantity, 1500);
  await page.select('[name="supply-operation"]', 'return');
  await page.type(amount, '100'); await page.click(submit);
  await page.waitForFunction(() => document.querySelector('.supplies-other-operations [name="supply-amount"]').value === '');
  assert.equal((await api()).body.supplies[0].quantity, 1600);
  await page.select('[name="supply-operation"]', 'waste');
  await page.type(amount, '20');
  assert.equal(await page.$eval('.supplies-other-operations form', form => form.checkValidity()), false);
  await page.type('.supplies-other-operations [name="supply-reason"]', 'Порча');
  await page.click(submit);
  await page.waitForFunction(() => document.querySelector('.supplies-other-operations [name="supply-amount"]').value === '');
  assert.equal((await api()).body.supplies[0].quantity, 1580);
  await page.click('.supplies-other-operations > summary');
  await page.type('.supplies-operation [name="supply-amount"]', '200');
  await page.click('.supplies-operation button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('.supplies-operation [name="supply-amount"]').value === '');
  assert.equal((await api()).body.supplies[0].quantity, 1380);
  for (const [width, height] of [[280, 653], [375, 812], [844, 390]]) {
    await page.setViewport({ width, height });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await page.$eval('.supplies-stock-table', table => table.getBoundingClientRect().width <= table.parentElement.clientWidth + 1));
  }
  await page.setViewport({ width: 375, height: 812 });
  await fs.mkdir('.hallmark/screenshots', { recursive: true });
  await page.screenshot({ path: '.hallmark/screenshots/supplies-simple-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
});
