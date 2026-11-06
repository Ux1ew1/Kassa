import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { testServer } from './test-server.js';

test('shared glass dialogs keep settings usable and calculate change without extra summary rows', {
  timeout: 45000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base } = await testServer(t);
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { localStorage.removeItem('checks'); localStorage.removeItem('kassa-theme'); });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await fs.mkdir('.hallmark/screenshots', { recursive: true });
  for (const theme of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(base, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('html', element => element.dataset.theme), theme);
    await page.$eval('.container > h1', element => element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    await page.waitForSelector('.secret-menu-panel', { timeout: 3000 }).catch(async error => { throw new Error(`${error.message}: ${JSON.stringify(errors)}; ${await page.$eval('body', element => element.innerText)}`); });
    await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
    const glass = await page.$eval('.secret-menu-panel', element => ({ background: getComputedStyle(element).backgroundColor, blur: getComputedStyle(element).backdropFilter }));
    assert.ok(glass.blur.includes('blur'));
    assert.equal(await page.$eval('.glass-dialog__close', element => getComputedStyle(element).borderRadius), '8px');
    const switches = await page.$$('.secret-menu-toggle');
    await switches[1].click();
    assert.equal(await page.$eval('.secret-menu-panel', element => getComputedStyle(element).backdropFilter), 'none');
    await switches[1].click();
    assert.ok(await page.$eval('.secret-menu-panel', element => getComputedStyle(element).backdropFilter.includes('blur')));
    await page.screenshot({ path: `.hallmark/screenshots/secret-menu-${theme}.png` });
    await page.click('.glass-dialog__close');
    await page.waitForSelector('.menu .item');
    await page.click('.menu .item');
    await page.click('.amountButton');
    await page.waitForSelector('.change-modal__content');
    const amount = await page.$('.change-modal__input');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'given-amount');
    await amount.type('50');
    assert.equal(await page.$eval('.change-modal__button', button => button.disabled), true);
    await amount.evaluate(element => { element.focus(); element.select(); }); await page.keyboard.type('200');
    assert.deepEqual(await page.$$eval('.change-modal__summary p', rows => rows.map(row => row.textContent)), ['К оплате100 ₽', 'Сдача100 ₽']);
    assert.deepEqual(await page.$eval('.change-modal__content', element => ({ background: getComputedStyle(element).backgroundColor, blur: getComputedStyle(element).backdropFilter })), glass);
    for (const [width, height] of [[280, 653], [375, 812], [844, 390], [375, 360], [1440, 900]]) {
      await page.setViewport({ width, height });
      const rect = await page.$eval('.change-modal__content', element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
      assert.ok(rect.top >= 0 && rect.bottom <= height + 1 && rect.left >= 0 && rect.right <= width + 1, JSON.stringify(rect));
      if (height > 500) assert.ok((rect.top + rect.bottom) / 2 < height / 2, 'change dialog is raised');
    }
    await page.setViewport({ width: 375, height: 812 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `.hallmark/screenshots/change-dialog-${theme}.png` });
    await page.click('.change-modal__button');
    await page.waitForFunction(() => !document.querySelector('.change-modal'));
    assert.ok((await page.$eval('.amount', element => element.textContent)).includes('100'));
    await page.click('.amountButton');
    assert.equal(await page.$eval('.change-modal__input', element => element.value), '');
    await page.keyboard.press('Escape');
    assert.equal(await page.$('.change-modal'), null);
  }
  assert.deepEqual(errors, []);
});
