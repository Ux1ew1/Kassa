import { createHash } from 'node:crypto';
import { AccountingError } from './store.js';
import { supplyUnits, supplyOperations } from '../shared/supplies.js';

const reject = (message, status = 400) => { throw new AccountingError(message, status); };
const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(value);
const rowKey = id => JSON.stringify([id]);
const openingRow = supply => ({ id: supply.id, name: supply.name, unit: supply.unit, opening: supply.quantity,
  received: 0, issued: 0, returned: 0, writtenOff: 0 });
const remaining = row => row.opening + row.received + row.returned - row.issued - row.writtenOff;
const field = { receipt: 'received', issue: 'issued', return: 'returned', waste: 'writtenOff' };

function initialize(state) {
  state.supplies ||= [];
  state.pendingSupplies ||= { rows: {}, movements: [] };
}
function processed(state, id, operation, data) {
  if (!validId(id)) reject('Некорректный идентификатор операции расходников');
  const key = `supplies_${operation}_${id}`;
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const previous = state.processed[key];
  if (previous) {
    if (previous.hash !== hash) reject('Эта операция уже сохранена с другими значениями. Обновите страницу.', 409);
    return { duplicate: true, key, hash, supplyId: previous.supplyId };
  }
  return { key, hash };
}
function ledger(state) {
  if (!state.current) return state.pendingSupplies;
  state.current.supplies ||= {};
  state.current.supplyMovements ||= [];
  return { rows: state.current.supplies, movements: state.current.supplyMovements };
}
function append(state, supply, type, quantity, reason, at) {
  const period = ledger(state);
  const row = period.rows[rowKey(supply.id)] ||= openingRow(supply);
  row[field[type]] += quantity;
  period.movements.push({ supplyId: supply.id, name: supply.name, unit: supply.unit, type, quantity, reason, at });
}

export function createSupply(state, payload, now) {
  initialize(state);
  if (!payload || typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 200
    || !Object.hasOwn(supplyUnits, payload.unit) || !integer(payload.quantity)) reject('Введите название, единицу и целое неотрицательное начальное количество');
  const packageSize = payload.packageSize == null ? null : payload.packageSize;
  if (packageSize !== null && (!integer(packageSize) || packageSize === 0)) reject('Размер упаковки должен быть положительным целым количеством в выбранной единице');
  if (payload.packageName != null && (typeof payload.packageName !== 'string' || payload.packageName.length > 80)) reject('Название упаковки слишком длинное');
  const data = { name: payload.name.trim(), unit: payload.unit, quantity: payload.quantity, packageSize,
    packageName: packageSize ? payload.packageName?.trim() || 'упаковка' : '' };
  const operation = processed(state, payload.id, 'create', data);
  if (operation.duplicate) return { ok: true, duplicate: true, supplyId: operation.supplyId };
  const supply = { id: payload.id, ...data, createdAt: now().toISOString() };
  if (state.current) {
    // A supply introduced mid-shift arrives as a receipt, not as stock that existed at opening.
    supply.quantity = 0;
    const period = ledger(state);
    period.rows[rowKey(supply.id)] = openingRow(supply);
    if (data.quantity) append(state, supply, 'receipt', data.quantity, 'Начальный остаток нового расходника', now().toISOString());
    supply.quantity = data.quantity;
  }
  state.supplies.push(supply);
  state.processed[operation.key] = { hash: operation.hash, supplyId: supply.id };
  return { ok: true, supplyId: supply.id };
}

export function moveSupply(state, payload, now) {
  initialize(state);
  if (!payload || !validId(payload.supplyId) || !Object.hasOwn(supplyOperations, payload.type)
    || !integer(payload.quantity) || !payload.quantity) reject('Выберите расходник, операцию и целое положительное количество');
  const reason = payload.reason == null ? '' : payload.reason;
  if (typeof reason !== 'string' || reason.length > 500 || (payload.type === 'waste' && !reason.trim())) reject('Для списания укажите причину (до 500 символов)');
  const data = { supplyId: payload.supplyId, type: payload.type, quantity: payload.quantity, reason: reason.trim() };
  const operation = processed(state, payload.id, 'move', data);
  if (operation.duplicate) return { ok: true, duplicate: true, supplyId: data.supplyId };
  const supply = state.supplies.find(item => item.id === data.supplyId);
  if (!supply) reject('Расходник не найден', 404);
  const delta = data.type === 'issue' || data.type === 'waste' ? -data.quantity : data.quantity;
  const next = supply.quantity + delta;
  if (next < 0) reject(`Недостаточно «${supply.name}»: на складе ${supply.quantity} ${supplyUnits[supply.unit]}`, 409);
  if (!integer(next)) reject('Слишком большое количество');
  append(state, supply, data.type, data.quantity, data.reason, now().toISOString());
  supply.quantity = next;
  state.processed[operation.key] = { hash: operation.hash, supplyId: supply.id };
  return { ok: true, supplyId: supply.id };
}

export function openSuppliesShift(state, shift) {
  initialize(state);
  shift.supplies = { ...state.pendingSupplies.rows };
  for (const supply of state.supplies) shift.supplies[rowKey(supply.id)] ||= openingRow(supply);
  shift.supplyMovements = state.pendingSupplies.movements;
  state.pendingSupplies = { rows: {}, movements: [] };
}
export function suppliesReport(shift) {
  return { supplies: Object.values(shift.supplies || {}).map(row => ({ ...row, remaining: remaining(row) })),
    supplyMovements: shift.supplyMovements || [] };
}
export function suppliesView(state) {
  const pending = state.pendingSupplies || { rows: {}, movements: [] };
  const movements = [...pending.movements, ...(state.current?.supplyMovements || []),
    ...state.archive.flatMap(shift => shift.supplyMovements || [])];
  movements.sort((a, b) => b.at.localeCompare(a.at));
  return { supplies: state.supplies || [], supplyMovements: movements.slice(0, 100), pendingSupplyMovements: pending.movements.length };
}
