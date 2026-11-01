import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { createAccounting } from './store.js';
import { csv, xlsx, filename } from './export.js';
import { testServer } from './test-server.js';

const beans = { id: 'beans_00000000001', name: 'Зерно; «Кофе»', unit: 'g', quantity: 1000, packageSize: 1000 };
const sale = id => ({ id: `receipt_${id.padEnd(16, '0')}`, items: [{ menuId: 'a', itemId: '1', name: 'Кофе', price: 100, quantity: 1 }] });
const movement = (id, type, quantity, reason = '') => ({ id: id.padEnd(16, '0'), supplyId: beans.id, type, quantity, reason });
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kassa-supplies-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const options = { file: path.join(directory, 'accounting.json'), catalog: async () => ({ menus: [{ id: 'a', name: 'Кофе', items: [{ id: 1, name: 'Кофе', price: 100 }] }] }), timeZone: 'Europe/Moscow' };
  return { accounting: createAccounting(options), options };
}

test('manual warehouse operations carry into first shift and exports, independently of coffee sales', async t => {
  const { accounting } = await fixture(t);
  await accounting.createSupply(beans);
  await accounting.moveSupply(movement('receipt', 'receipt', 500));
  await accounting.moveSupply(movement('issue', 'issue', 1000));
  await accounting.moveSupply(movement('return', 'return', 100));
  await accounting.moveSupply(movement('waste', 'waste', 50, 'Порча; "пакет"'));
  assert.equal((await accounting.state()).current, null);
  await accounting.sell(sale('first'));
  let state = await accounting.state();
  const row = state.current.supplies[0];
  assert.deepEqual([row.opening, row.received, row.issued, row.returned, row.writtenOff, row.remaining], [1000, 500, 1000, 100, 50, 550]);
  assert.equal(state.supplies[0].quantity, 550);
  assert.equal(state.current.supplyMovements.length, 4);
  const text = csv(state.current);
  assert.ok(text.startsWith('\uFEFF'));
  assert.ok(text.includes('"Зерно; «Кофе»"'));
  assert.ok(text.includes('"Порча; ""пакет"""'));
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await xlsx(state.current));
  assert.equal(book.getWorksheet('Расходники').getCell('H2').value, 550);
  assert.equal(book.getWorksheet('Операции с расходниками').rowCount, 5);
  assert.match(filename(state.current, 'xlsx'), /^\d{2}\.\d{2}\.\d{4}\.xlsx$/);
  await accounting.close(state.current.id);
  await accounting.sell(sale('next'));
  state = await accounting.state();
  assert.equal(state.current.supplies[0].opening, 550);
  assert.equal(state.current.supplies[0].issued, 0);
  await accounting.createSupply({ id: 'milk_000000000001', name: 'Молоко', unit: 'ml', quantity: 2000 });
  const milk = (await accounting.state()).current.supplies.find(item => item.unit === 'ml');
  assert.equal(milk.opening, 0); assert.equal(milk.received, 2000);
});

test('concurrent issues cannot overdraw; retries survive restart and report clearing', async t => {
  const { accounting, options } = await fixture(t);
  await accounting.createSupply(beans);
  const first = movement('first', 'issue', 1000);
  const results = await Promise.allSettled([accounting.moveSupply(first), accounting.moveSupply(movement('second', 'issue', 1000))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.status, 409);
  const restarted = createAccounting(options);
  assert.equal((await restarted.moveSupply(first)).duplicate, true);
  await restarted.clear();
  assert.equal((await restarted.moveSupply(first)).duplicate, true);
  assert.equal((await restarted.createSupply(beans)).duplicate, true);
  const state = await restarted.state();
  assert.equal(state.supplies[0].quantity, 0);
  assert.equal(state.pendingSupplyMovements, 0);
  assert.equal(state.supplyMovements.length, 0);
  await assert.rejects(restarted.moveSupply({ ...first, quantity: 1 }), { status: 409 });
});

test('validates units, integer quantities, package sizes and warehouse loss reasons', async t => {
  const { accounting } = await fixture(t);
  for (const change of [{ unit: 'kg' }, { quantity: -1 }, { quantity: 0.5 }, { packageSize: 0 }]) {
    await assert.rejects(accounting.createSupply({ ...beans, ...change }), { status: 400 });
  }
  await accounting.createSupply({ ...beans, quantity: 0 });
  await assert.rejects(accounting.moveSupply(movement('waste', 'waste', 1)), { status: 400 });
  await assert.rejects(accounting.moveSupply(movement('fraction', 'receipt', 0.5)), { status: 400 });
  await accounting.moveSupply(movement('receipt', 'receipt', 10));
  assert.equal((await accounting.state()).supplies[0].quantity, 10);
});

test('HTTP supplies endpoints share persisted stock and reject duplicate changed operations', async t => {
  const { api } = await testServer(t);
  assert.equal((await api('/supplies', 'POST', beans)).status, 200);
  const request = movement('http_issue', 'issue', 500);
  assert.equal((await api('/supply-movements', 'POST', request)).status, 200);
  assert.equal((await api('/supply-movements', 'POST', request)).body.duplicate, true);
  assert.equal((await api('/supply-movements', 'POST', { ...request, quantity: 100 })).status, 409);
  assert.equal((await api()).body.supplies[0].quantity, 500);
});
