import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { testServer } from './test-server.js';

test('management controls are usable in both themes, dialogs trap focus and deletion can be cancelled', {
  timeout: 60000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base, api } = await testServer(t);
  await api('/supplies', 'POST', { id: 'interface_beans_001', name: 'Кофейное зерно', unit: 'g', quantity: 3000, packageSize: 1000 });
  await api('/supply-movements', 'POST', { id: 'interface_issue_001', supplyId: 'interface_beans_001', type: 'issue', quantity: 1000 });
  await api('/sales', 'POST', { id: 'interface_sale_001', items: [{ menuId: 'main', itemId: 1, name: 'Американо', price: 100, quantity: 2 }] });
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await fs.mkdir('.hallmark/screenshots', { recursive: true });
  for (const theme of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    for (const route of ['admin', 'ai-menu', 'reports', 'supplies']) {
      for (const [width, height] of [[375, 812], [844, 390], [1440, 900]]) {
        await page.setViewport({ width, height });
        await page.goto(`${base}/${route}`, { waitUntil: 'networkidle0' });
        assert.equal(await page.$eval('html', element => element.dataset.theme), theme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} ${theme} ${width}: overflow`);
        assert.ok(await page.$eval('.management-header nav', element => getComputedStyle(element).backdropFilter.includes('blur')));
        assert.equal(await page.$$eval('.admin-container input,.admin-container select', elements => elements.some(element => getComputedStyle(element).backdropFilter !== 'none')), false);
        await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
        await page.screenshot({ path: `.hallmark/screenshots/polish-${route}-${theme}-${width}.png`, fullPage: true });
      }
    }
  }
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle0' });
  await page.click('.admin-add-button');
  await page.waitForSelector('[role="dialog"]');
  assert.equal(await page.evaluate(() => document.activeElement.placeholder), 'Название');
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Отмена');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.placeholder), 'Название');
  await page.keyboard.press('Escape');
  assert.equal(await page.$('[role="dialog"]'), null);
  assert.equal(await page.evaluate(() => document.activeElement.className), 'admin-add-button');
  await page.click('.admin-item__button--danger');
  await page.waitForSelector('[role="dialog"]');
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Отмена');
  await page.keyboard.press('Escape');
  assert.equal(await page.$$('.admin-item').then(items => items.length), 2);
  await page.goto(`${base}/reports`, { waitUntil: 'networkidle0' });
  await page.click('.management-danger-zone summary');
  await page.click('.management-danger-zone button');
  await page.waitForSelector('[role="dialog"]');
  await page.keyboard.press('Escape');
  assert.equal((await api()).body.current.receiptCount, 1);
  // Exercise the preview controls without calling an external recognition service.
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().endsWith('/api/menus/import-photo')) {
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ preview: { menuName: 'Проверка', items: [
        { name: 'Капучино', price: 150, category: 'напитки', importKey: 'new' },
        { name: 'Чай', price: 50, category: 'напитки', importKey: 'duplicate', match: { type: 'duplicate', name: 'Чай' } },
        { name: 'Американо большой', price: 200, category: 'напитки', importKey: 'similar', match: { type: 'similar', name: 'Американо' } },
      ] } }) });
    }
    return request.continue();
  });
  await page.goto(`${base}/ai-menu`, { waitUntil: 'networkidle0' });
  const file = await page.$('input[type="file"]');
  await file.uploadFile('.hallmark/screenshots/polish-admin-light-375.png');
  await page.waitForSelector('.ai-modal__image');
  await page.click('.ai-modal__submit--inline');
  await page.waitForSelector('.ai-modal__preview');
  assert.equal(await page.$$eval('.ai-modal__item input:checked', inputs => inputs.length), 1);
  await page.click('.ai-selection-actions button:last-child');
  assert.equal(await page.$eval('.ai-modal__preview > .ai-modal__submit', button => button.disabled), true);
  await page.click('.ai-selection-actions button:first-child');
  assert.equal(await page.$$eval('.ai-modal__item input:checked', inputs => inputs.length), 1);
  assert.equal(await page.$$eval('.ai-modal__item input:disabled', inputs => inputs.length), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: '.hallmark/screenshots/polish-ai-preview-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
});
