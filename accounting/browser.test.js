import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { testServer } from './test-server.js';

test('browser checkout, lost-response retry, two devices and report confirmation dialogs', {
  timeout: 60000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base, api } = await testServer(t);
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const firstContext = await browser.createBrowserContext();
  const secondContext = await browser.createBrowserContext();
  const cashier = await firstContext.newPage(); const second = await secondContext.newPage();
  const errors = []; cashier.on('pageerror', error => errors.push(error.message)); second.on('pageerror', error => errors.push(error.message));
  await cashier.setViewport({ width: 375, height: 812 }); await second.setViewport({ width: 375, height: 812 });
  assert.equal((await api('/menus/main', 'PUT', { enabled: true, mode: 'stop', quantities: { 1: 1, 2: 5 } })).status, 200);
  for (const page of [cashier, second]) {
    await page.goto(base, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.menu .item', { timeout: 8000 }).catch(async error => { throw new Error(`${error.message}\n${JSON.stringify(errors)}\n${await page.$eval('body', element => element.innerText)}`); }); await page.type('.search-input', 'амнри');
    await page.waitForFunction(() => document.querySelectorAll('.menu .item').length === 1);
    await page.click('.menu .item');
  }
  await cashier.click('.done-button');
  await cashier.waitForFunction(() => document.querySelector('.price').textContent.includes('Цена: 0'));
  await second.click('.done-button');
  await second.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('Не хватает товаров'));
  assert.ok((await second.$eval('.price', element => element.textContent)).includes('100'));
  assert.equal((await api()).body.current.receiptCount, 1);

  // The server commits this sale, but the browser receives a network failure.
  await cashier.click('.search-clear-button'); await cashier.type('.search-input', 'чай'); await cashier.click('.menu .item');
  await cashier.setRequestInterception(true);
  let lost = false;
  cashier.on('request', async request => {
    if (!lost && request.url().endsWith('/api/accounting/sales')) {
      lost = true;
      await fetch(request.url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request.postData() });
      await request.abort();
    } else await request.continue();
  });
  await cashier.click('.done-button');
  await cashier.waitForFunction(() => document.querySelector('[role="alert"]'));
  assert.equal((await api()).body.current.receiptCount, 2);
  await cashier.reload({ waitUntil: 'networkidle0' });
  await cashier.waitForFunction(() => document.querySelector('.cashier-notice[role="status"]')?.textContent.includes('Результат продажи'));
  const saved = await cashier.evaluate(() => JSON.parse(localStorage.getItem('checks'))[0].pendingSale);
  assert.ok(saved?.id);
  await cashier.click('.done-button');
  await cashier.waitForFunction(() => document.querySelector('.price').textContent.includes('Цена: 0'));
  assert.equal((await api()).body.current.receiptCount, 2);

  const manager = await firstContext.newPage();
  await manager.setViewport({ width: 375, height: 812 });
  await manager.goto(`${base}/admin`, { waitUntil: 'networkidle0' });
  await manager.waitForSelector('.accounting-panel');
  const clickText = async (page, text) => {
    await page.evaluate(text => {
      const target = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text);
      if (!target) throw new Error(`Button not found: ${text}`);
      target.click();
    }, text);
  };
  await clickText(manager, 'Очистить отчёты');
  await manager.waitForSelector('[role="dialog"]');
  await clickText(manager, 'Отмена');
  assert.equal((await api()).body.current.receiptCount, 2);
  await clickText(manager, 'Закрыть смену'); await manager.waitForSelector('[role="dialog"]');
  await manager.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent === 'Закрыть смену').click());
  await manager.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  assert.equal((await api()).body.archive.length, 1);
  const archiveId = (await api()).body.archive[0].id;
  await manager.select('.accounting-report-select select', archiveId);
  await manager.waitForSelector('.accounting-report-table');
  assert.equal(await manager.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await fs.mkdir('.hallmark/screenshots', { recursive: true });
  await manager.screenshot({ path: '.hallmark/screenshots/accounting-mobile.png', fullPage: true });
  await clickText(manager, 'Очистить отчёты'); await manager.waitForSelector('[role="dialog"]');
  assert.ok((await manager.$eval('[role="dialog"]', element => element.textContent)).includes('для всех сотрудников'));
  await clickText(manager, 'Удалить все отчёты');
  await manager.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  const state = (await api()).body;
  assert.equal(state.current, null); assert.equal(state.archive.length, 0); assert.equal(state.menus[0].items[1].quantity, 4);
  assert.equal((await api('/sales', 'POST', saved)).body.duplicate, true);
  assert.equal((await api()).body.current, null);
  assert.deepEqual(errors, []);
});
