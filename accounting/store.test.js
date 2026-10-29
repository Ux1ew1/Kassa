import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createAccounting } from './store.js';
import { csv, xlsx, filename } from './export.js';
import ExcelJS from 'exceljs';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kassa-accounting-'));
  t.after(async () => {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const file = path.join(directory, 'accounting.json');
  const catalog = { menus: [{ id: 'a', name: 'Кофе', items: [{ id: 1, name: 'Американо', price: 100 }, { id: 2, name: 'Чай', price: 50 }] },
    { id: 'b', name: 'Еда', items: [{ id: 1, name: 'Пирог', price: 200 }] }] };
  let time = new Date('2026-10-29T20:59:00Z');
  const options = { file, catalog: async () => structuredClone(catalog), now: () => time, timeZone: 'Europe/Moscow' };
  return { accounting: createAccounting(options), file, options, catalog,
    setTime: value => { time = new Date(value); } };
}
const configure = (accounting, mode = 'stop', count = 2) => accounting.configure('a', { enabled: true, mode, quantities: { 1: count, 2: 5 } });
const sale = (id, quantity = 1, extra = {}) => ({ id: `receipt_${id.padEnd(16, '0')}`, items: [{ menuId: 'a', itemId: '1', name: 'Американо', price: 100, quantity, ...extra }] });
const quantity = state => state.menus[0].items[0].quantity;

test('simultaneous cashiers cannot sell the same last unit; no partial debit', async t => {
  const { accounting } = await fixture(t);
  await configure(accounting, 'stop', 1);
  const results = await Promise.allSettled([accounting.sell(sale('one')), accounting.sell(sale('two'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
  const before = await accounting.state();
  assert.equal(quantity(before), 0); assert.equal(before.current.receiptCount, 1);
  const mixed = sale('mixed'); mixed.items.push({ menuId: 'a', itemId: '2', name: 'Чай', price: 50, quantity: 1 });
  await assert.rejects(accounting.sell(mixed), { status: 409 });
  assert.equal((await accounting.state()).menus[0].items[1].quantity, 5);
});

test('negative stock, receipt, correction reason and stop-list recovery', async t => {
  const { accounting } = await fixture(t);
  await configure(accounting, 'negative', 0);
  await accounting.sell(sale('negative', 2));
  assert.equal(quantity(await accounting.state()), -2);
  await accounting.move({ menuId: 'a', itemId: 1, type: 'receipt', quantity: 4, reason: 'Поставка' });
  await accounting.move({ menuId: 'a', itemId: 1, type: 'correction', quantity: -1, reason: 'Пересчёт' });
  const state = await accounting.state();
  const row = state.current.rows[0];
  assert.equal(row.opening, 0); assert.equal(row.received, 4); assert.equal(row.adjustment, -1);
  assert.equal(row.sold, 2); assert.equal(row.remaining, 1); assert.equal(quantity(state), 1);
  await assert.rejects(accounting.move({ menuId: 'a', itemId: 1, type: 'receipt', quantity: 1, reason: '' }));
  await accounting.close(state.current.id);
  await configure(accounting, 'stop', 0);
  assert.equal((await accounting.state()).menus[0].items[0].stopped, true);
  await accounting.move({ menuId: 'a', itemId: 1, type: 'receipt', quantity: 1, reason: 'Поставка' });
  assert.equal((await accounting.state()).menus[0].items[0].stopped, false);
});

test('lost response retry remains idempotent after restart, close and erase', async t => {
  const { accounting, options } = await fixture(t);
  await configure(accounting);
  const receipt = sale('retry');
  await accounting.sell(receipt);
  const restarted = createAccounting(options);
  assert.equal((await restarted.sell(receipt)).duplicate, true);
  const current = (await restarted.state()).current;
  assert.equal(current.receiptCount, 1); assert.equal(quantity(await restarted.state()), 1);
  await restarted.close(current.id); await restarted.clear();
  assert.equal((await restarted.sell(receipt)).duplicate, true);
  const state = await restarted.state();
  assert.equal(state.current, null); assert.equal(state.archive.length, 0); assert.equal(quantity(state), 1);
  const changed = sale('retry', 2);
  await assert.rejects(restarted.sell(changed), { status: 409 });
});

test('first sale starts a shift; midnight does not split it; next sale opens a new one', async t => {
  const { accounting, setTime } = await fixture(t);
  assert.equal((await accounting.state()).current, null);
  await accounting.sell(sale('before-midnight'));
  const first = (await accounting.state()).current;
  setTime('2026-10-29T21:05:00Z');
  await accounting.sell(sale('after-midnight'));
  assert.equal((await accounting.state()).current.id, first.id);
  assert.match(filename(first, 'xlsx'), /^Смена_2026-10-29_23-59-00_/);
  await accounting.close(first.id);
  await assert.rejects(accounting.close(first.id), { status: 409 });
  await accounting.sell(sale('new-shift'));
  assert.notEqual((await accounting.state()).current.id, first.id);
  assert.equal((await accounting.state()).archive.length, 1);
});

test('all menus share one shift and stock identities do not collide', async t => {
  const { accounting } = await fixture(t);
  await configure(accounting);
  await accounting.configure('b', { enabled: true, mode: 'stop', quantities: { 1: 1 } });
  const mixed = sale('all-menus'); mixed.items.push({ menuId: 'b', itemId: 1, name: 'Пирог', price: 200, quantity: 1 });
  await accounting.sell(mixed);
  const state = await accounting.state();
  assert.equal(quantity(state), 1); assert.equal(state.menus[1].items[0].quantity, 0);
  assert.equal(state.current.revenue, 300); assert.equal(state.current.receiptCount, 1);
});

test('price and name snapshots survive editing and deletion; stock is printed once', async t => {
  const { accounting, catalog } = await fixture(t);
  await configure(accounting, 'stop', 5);
  await accounting.sell(sale('old-price'));
  catalog.menus[0].items[0].name = 'Новый американо'; catalog.menus[0].items[0].price = 150;
  await accounting.sell(sale('new-price', 1, { name: 'Новый американо', price: 150 }));
  catalog.menus[0].items.shift();
  const report = (await accounting.state()).current;
  const prices = report.rows.filter(row => row.kind === 'price');
  assert.deepEqual(prices.map(row => [row.name, row.price, row.revenue]), [['Американо', 100, 100], ['Новый американо', 150, 150]]);
  assert.ok(prices.every(row => row.opening === null && row.remaining === null));
  assert.equal(report.rows.find(row => row.kind === 'summary').remaining, 3);
  assert.equal(report.revenue, 250);
});

test('configuration is opt-in, requires every quantity, and is locked during an open shift', async t => {
  const { accounting } = await fixture(t);
  await assert.rejects(accounting.configure('a', { enabled: true, mode: 'stop', quantities: { 1: 1 } }));
  await assert.rejects(configure(accounting, 'stop', 1.5));
  await accounting.sell(sale('untracked', 3));
  const row = (await accounting.state()).current.rows[0];
  assert.equal(row.opening, null); assert.equal(row.remaining, null); assert.equal(row.sold, 3);
  await assert.rejects(configure(accounting), { status: 409 });
  await assert.rejects(accounting.sell({ id: 'empty_receipt_000000', items: [] }));
  assert.equal((await accounting.state()).current.receiptCount, 1);
});

test('clearing a live shift preserves balances and erases history across restart', async t => {
  const { accounting, options } = await fixture(t);
  await configure(accounting, 'stop', 5);
  await accounting.sell(sale('archive')); await accounting.close((await accounting.state()).current.id);
  await accounting.sell(sale('live'));
  await accounting.clear();
  const restored = createAccounting(options);
  const state = await restored.state();
  assert.equal(state.current, null); assert.deepEqual(state.archive, []); assert.equal(quantity(state), 3);
  await restored.sell(sale('after-clear'));
  assert.equal((await restored.state()).current.rows[0].opening, 3);
});

test('XLSX and CSV preserve Russian text, escaping, numeric values and totals', async t => {
  const { accounting } = await fixture(t);
  await configure(accounting);
  await accounting.sell(sale('exports', 1, { name: '=Чай; "сладкий"\nновый', price: 10.25 }));
  const report = (await accounting.state()).current;
  const text = csv(report);
  assert.ok(text.startsWith('\uFEFF'));
  assert.ok(text.includes('"\'=Чай; ""сладкий""\nновый"'));
  assert.ok(text.includes('"Общая выручка";"10.25"'));
  const book = new ExcelJS.Workbook(); await book.xlsx.load(await xlsx(report));
  const sheet = book.getWorksheet('Смена');
  assert.equal(sheet.getCell('B9').value, '=Чай; "сладкий"\nновый');
  assert.equal(sheet.getCell('C9').value, 10.25); assert.equal(sheet.getCell('I9').value, 10.25);
  assert.equal(sheet.getCell('D9').value, 2); assert.equal(sheet.getCell('H9').value, 1);
  assert.equal(book.worksheets.length, 2);
});

test('damaged accounting file is rejected instead of resetting stock or reports', async t => {
  const { accounting, file } = await fixture(t);
  await configure(accounting); await fs.writeFile(file, '{damaged');
  await assert.rejects(accounting.sell(sale('damage')), { status: 503 });
  assert.equal(await fs.readFile(file, 'utf8'), '{damaged');
});

test('report composition persists and filters preview, archive, CSV and XLSX without erasing source rows', async t => {
  const { accounting, options } = await fixture(t);
  await configure(accounting);
  await accounting.sell(sale('filter'));
  await accounting.move({ menuId: 'a', itemId: 2, type: 'receipt', quantity: 2, reason: 'Поставка непроданного чая' });
  const id = (await accounting.state()).current.id;
  assert.equal((await accounting.report(id)).rows.length, 3);
  await accounting.settings({ products: 'sold' });
  assert.equal((await accounting.state()).current.rows.length, 1);
  await accounting.close(id);
  const restarted = createAccounting(options);
  assert.equal((await restarted.state()).reportSettings.products, 'sold');
  const report = await restarted.report(id);
  assert.equal(report.rows.length, 1); assert.equal(report.rows[0].sold, 1);
  assert.equal(report.movements.length, 0);
  assert.ok(!csv(report).includes('Пирог')); assert.ok(!csv(report).includes('"Чай"'));
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await xlsx(report));
  assert.equal(workbook.getWorksheet('Смена').getCell('B9').value, 'Американо');
  assert.equal(workbook.getWorksheet('Смена').getCell('B10').value, null);
  await restarted.settings({ products: 'all' });
  assert.equal((await restarted.report(id)).rows.length, 3);
  assert.equal((await restarted.report(id)).movements.length, 1);
  await assert.rejects(restarted.settings({ products: 'invalid' }), { status: 400 });
});
