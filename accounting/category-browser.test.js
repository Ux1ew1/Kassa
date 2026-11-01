import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { testServer } from './test-server.js';

test('default drink category persists without selecting it; editing preserves other categories', {
  timeout: 30000, skip: !process.env.KASSA_PUPPETEER || !process.env.KASSA_BROWSER,
}, async t => {
  const puppeteer = createRequire(import.meta.url)(process.env.KASSA_PUPPETEER);
  const { base } = await testServer(t);
  const browser = await puppeteer.launch({ executablePath: process.env.KASSA_BROWSER, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const clickText = text => page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text).click(), text);
  await page.goto(base + '/admin', { waitUntil: 'networkidle0' });
  await clickText('Добавить позицию');
  await page.waitForSelector('#category');
  assert.equal(await page.$eval('#category', element => element.value), 'напитки');
  await page.type('input[placeholder="Название"]', 'Новый латте');
  await page.type('input[placeholder="Цена"]', '150');
  await page.click('.modal-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.modal'));
  await page.reload({ waitUntil: 'networkidle0' });
  const category = () => page.$$eval('.admin-item', items => items.find(item => item.textContent.includes('Новый латте')).querySelector('.admin-item__category').textContent);
  assert.ok((await category()).includes('Напитки'));
  const edit = () => page.$$eval('.admin-item', items => [...items.find(item => item.textContent.includes('Новый латте')).querySelectorAll('button')].find(button => button.textContent.trim() === 'Изменить').click());
  await edit();
  await page.select('#category', 'еда');
  await page.click('.modal-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.modal'));
  await edit();
  assert.equal(await page.$eval('#category', element => element.value), 'еда');
  await page.click('.modal-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.modal'));
  assert.ok((await category()).includes('Еда'));
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.evaluate(() => [...document.querySelectorAll('.category-button')].find(button => button.textContent.trim() === 'Напитки').click());
  assert.ok(!(await page.$eval('.menu', element => element.textContent)).includes('Новый латте'));
});
