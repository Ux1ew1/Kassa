import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export class AccountingError extends Error {
  constructor(message, status = 400, details = {}) { super(message); this.status = status; this.details = details; }
}
const fail = (message, status, details) => { throw new AccountingError(message, status, details); };
const key = (menuId, itemId) => JSON.stringify([String(menuId), String(itemId)]);
const menuKey = id => JSON.stringify([String(id)]);
const integer = value => Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000;
const cents = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) fail('Некорректная цена');
  return Math.round(value * 100);
};
const empty = () => ({ version: 1, revision: 0, reportSettings: { products: 'all' }, inventories: {}, current: null, archive: [], processed: {} });

export function createAccounting({ file, catalog, now = () => new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone }) {
  let tail = Promise.resolve();
  async function load() {
    try {
      const state = JSON.parse(await fs.readFile(file, 'utf8'));
      if (state.version !== 1 || !state.inventories || !state.processed || !Array.isArray(state.archive)) throw new Error('Invalid accounting data');
      return state;
    } catch (error) {
      if (error.code === 'ENOENT') return empty();
      throw new AccountingError('Не удалось прочитать учёт. Проверьте файл данных на сервере; продажи не записаны.', 503);
    }
  }
  async function persist(state) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await fs.open(temp, 'wx');
      await handle.writeFile(JSON.stringify(state), 'utf8');
      await handle.sync();
      await handle.close(); handle = null;
      await fs.rename(temp, file);
    } finally {
      await handle?.close();
      await fs.unlink(temp).catch(() => {});
    }
  }
  function run(change, write = false) {
    const task = tail.then(async () => {
      const state = await load();
      const menus = (await catalog()).menus;
      const result = await change(state, menus);
      if (write) { state.revision++; await persist(state); }
      return result;
    });
    tail = task.catch(() => {});
    return task;
  }
  const config = (state, id) => state.inventories[menuKey(id)] || { enabled: false, mode: 'stop', stocks: {} };
  const findMenu = (menus, id) => menus.find(menu => String(menu.id) === String(id)) || fail('Меню не найдено', 404);
  function findItem(menus, menuId, itemId) {
    const menu = findMenu(menus, menuId);
    const item = menu.items.find(item => String(item.id) === String(itemId));
    if (!item) fail('Товар удалён из меню. Удалите его из чека и добавьте актуальную позицию.', 409);
    return { menu, item };
  }
  function stockRow(state, menu, item) {
    const inventory = config(state, menu.id);
    const tracked = inventory.enabled;
    const opening = tracked ? inventory.stocks[key(menu.id, item.id)] ?? 0 : null;
    return { menuId: String(menu.id), itemId: String(item.id), menu: menu.name, name: item.name,
      price: item.price, tracked, opening, received: 0, adjustment: 0, sold: 0, revenueCents: 0, prices: [] };
  }
  function ensureProduct(state, menu, item) {
    const id = key(menu.id, item.id);
    return state.current.products[id] ||= stockRow(state, menu, item);
  }
  function newShift(state, menus) {
    const shift = { id: randomUUID(), startedAt: now().toISOString(), closedAt: null, timeZone,
      receiptCount: 0, revenueCents: 0, products: {}, movements: [], sales: [] };
    for (const menu of menus) for (const item of menu.items) shift.products[key(menu.id, item.id)] = stockRow(state, menu, item);
    return shift;
  }
  const closing = product => product.tracked ? product.opening + product.received + product.adjustment - product.sold : null;
  function report(shift, settings = { products: 'all' }) {
    const rows = [];
    const soldProducts = Object.values(shift.products).filter(product => product.sold > 0);
    for (const product of Object.values(shift.products)) {
      const base = { menu: product.menu, name: product.name, price: product.price, opening: product.opening,
        received: product.tracked ? product.received : null, adjustment: product.tracked ? product.adjustment : null,
        sold: product.sold, remaining: closing(product), revenue: product.revenueCents / 100, kind: 'product' };
      if (product.prices.length <= 1) {
        const soldPrice = product.prices[0];
        rows.push({ ...base, ...(soldPrice ? { price: soldPrice.price, name: soldPrice.name } : {}) });
      } else {
        for (const price of product.prices) rows.push({ ...base, name: price.name, price: price.price, opening: null,
          received: null, adjustment: null, sold: price.sold, remaining: null, revenue: price.revenueCents / 100, kind: 'price' });
        rows.push({ ...base, name: `${product.name} — итог по товару`, price: null, kind: 'summary' });
      }
    }
    return { id: shift.id, startedAt: shift.startedAt, closedAt: shift.closedAt, timeZone: shift.timeZone,
      receiptCount: shift.receiptCount, revenue: shift.revenueCents / 100,
      products: settings.products, rows: settings.products === 'sold' ? rows.filter(row => row.sold > 0) : rows,
      movements: settings.products === 'sold' ? shift.movements.filter(move => soldProducts.some(product =>
        move.menuId != null && move.itemId != null
          ? String(move.menuId) === product.menuId && String(move.itemId) === product.itemId
          : move.menu === product.menu && (move.name === product.name || product.prices.some(price => price.name === move.name)))) : shift.movements };
  }
  function view(state, menus) {
    return { revision: state.revision, reportSettings: state.reportSettings || { products: 'all' }, current: state.current ? report(state.current, state.reportSettings) : null,
      archive: state.archive.map(shift => ({ id: shift.id, startedAt: shift.startedAt, closedAt: shift.closedAt,
        timeZone: shift.timeZone, receiptCount: shift.receiptCount, revenue: shift.revenueCents / 100 })),
      menus: menus.map(menu => {
        const inventory = config(state, menu.id);
        return { id: String(menu.id), name: menu.name, enabled: inventory.enabled, mode: inventory.mode,
          items: menu.items.map(item => ({ id: String(item.id), name: item.name, price: item.price,
            quantity: inventory.enabled ? inventory.stocks[key(menu.id, item.id)] ?? 0 : null,
            stopped: inventory.enabled && inventory.mode === 'stop' && (inventory.stocks[key(menu.id, item.id)] ?? 0) <= 0 })) };
      }) };
  }
  return {
    state: () => run((state, menus) => view(state, menus)),
    settings: payload => run(state => {
      if (!['all', 'sold'].includes(payload?.products)) fail('Выберите состав отчёта: всё меню или только проданное');
      state.reportSettings = { products: payload.products };
      return state.reportSettings;
    }, true),
    report: id => run(state => {
      const shift = state.current?.id === id ? state.current : state.archive.find(shift => shift.id === id);
      return shift ? report(shift, state.reportSettings) : fail('Отчёт не найден', 404);
    }),
    configure: (menuId, payload) => run((state, menus) => {
      if (state.current) fail('Настройки учёта можно менять только между сменами', 409);
      const menu = findMenu(menus, menuId);
      if (typeof payload.enabled !== 'boolean' || !['stop', 'negative'].includes(payload.mode)) fail('Некорректные настройки учёта');
      const previous = config(state, menuId);
      const stocks = { ...previous.stocks };
      if (payload.enabled) {
        for (const item of menu.items) {
          const value = payload.quantities?.[String(item.id)];
          if (!integer(value) || value < 0) fail(`Введите целое начальное количество для «${item.name}»`);
          stocks[key(menuId, item.id)] = value;
        }
      }
      state.inventories[menuKey(menuId)] = { enabled: payload.enabled, mode: payload.mode, stocks };
      return { ok: true };
    }, true),
    move: payload => run((state, menus) => {
      let movementKey, movementHash;
      if (payload.id != null) {
        if (typeof payload.id !== 'string' || !/^[a-zA-Z0-9_-]{16,120}$/.test(payload.id)) fail('Некорректный идентификатор поступления');
        movementKey = `movement_${payload.id}`;
        movementHash = createHash('sha256').update(JSON.stringify([payload.menuId, String(payload.itemId), payload.type, payload.quantity, payload.reason])).digest('hex');
        if (Object.hasOwn(state.processed, movementKey)) {
          if (state.processed[movementKey].hash !== movementHash) fail('Это поступление уже проведено с другими значениями', 409);
          return { ok: true, duplicate: true };
        }
      }
      const { menu, item } = findItem(menus, payload.menuId, payload.itemId);
      const inventory = config(state, menu.id);
      if (!inventory.enabled) fail('Для этого меню количественный учёт выключен');
      if (!['receipt', 'correction'].includes(payload.type) || !integer(payload.quantity)
        || (payload.type === 'receipt' && payload.quantity <= 0) || !payload.quantity) fail('Введите целое ненулевое количество; поступление должно быть положительным');
      if (typeof payload.reason !== 'string' || !payload.reason.trim() || payload.reason.length > 500) fail('Укажите причину изменения (до 500 символов)');
      const id = key(menu.id, item.id);
      const next = (inventory.stocks[id] ?? 0) + payload.quantity;
      if (!integer(next) || (inventory.mode === 'stop' && next < 0)) fail('Корректировка не может сделать остаток отрицательным в режиме стоп-листа');
      if (state.current) {
        const product = ensureProduct(state, menu, item);
        product[payload.type === 'receipt' ? 'received' : 'adjustment'] += payload.quantity;
        state.current.movements.push({ menuId: String(menu.id), itemId: String(item.id), menu: menu.name, name: item.name, type: payload.type, quantity: payload.quantity,
          reason: payload.reason.trim(), at: now().toISOString() });
      }
      inventory.stocks[id] = next;
      if (movementKey) state.processed[movementKey] = { hash: movementHash };
      return { ok: true };
    }, true),
    sell: payload => run((state, menus) => {
      if (typeof payload.id !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(payload.id)) fail('Некорректный идентификатор продажи');
      if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 10000) fail('Пустой или слишком большой чек');
      const items = payload.items.map(line => {
        if (!line || typeof line.menuId !== 'string' || !['string', 'number'].includes(typeof line.itemId)
          || typeof line.name !== 'string' || !line.name.trim() || line.name.length > 500
          || !integer(line.quantity) || line.quantity <= 0) fail('Некорректная позиция чека');
        return { menuId: line.menuId, itemId: String(line.itemId), name: line.name.trim(), price: cents(line.price) / 100, quantity: line.quantity };
      });
      const hash = createHash('sha256').update(JSON.stringify(items)).digest('hex');
      if (Object.hasOwn(state.processed, payload.id)) {
        const saved = state.processed[payload.id];
        if (saved.hash !== hash) fail('Этот идентификатор уже использован другим чеком', 409);
        return { ok: true, duplicate: true, shiftId: saved.shiftId };
      }
      const quantities = new Map();
      for (const line of items) {
        const { menu, item } = findItem(menus, line.menuId, line.itemId);
        const id = key(menu.id, item.id);
        const group = quantities.get(id) || { menu, item, quantity: 0 };
        group.quantity += line.quantity;
        if (!integer(group.quantity)) fail('Слишком большое количество');
        quantities.set(id, group);
      }
      const shortages = [];
      for (const { menu, item, quantity } of quantities.values()) {
        const inventory = config(state, menu.id);
        const available = inventory.stocks[key(menu.id, item.id)] ?? 0;
        if (inventory.enabled && !integer(available - quantity)) fail('Слишком большое количество');
        if (inventory.enabled && inventory.mode === 'stop' && available < quantity) shortages.push({ menuId: menu.id, itemId: item.id, name: item.name, available, requested: quantity });
      }
      if (shortages.length) fail(`Не хватает товаров: ${shortages.map(item => `${item.name}: доступно ${item.available}, в чеке ${item.requested}`).join('; ')}`, 409, { shortages });
      const totalCents = items.reduce((total, line) => total + cents(line.price) * line.quantity, 0);
      if (!Number.isSafeInteger(totalCents) || totalCents > 1e14) fail('Слишком большая сумма чека');
      state.current ||= newShift(state, menus);
      for (const { menu, item } of quantities.values()) ensureProduct(state, menu, item);
      for (const line of items) {
        const { menu, item } = findItem(menus, line.menuId, line.itemId);
        const id = key(menu.id, item.id);
        const product = state.current.products[id];
        product.sold += line.quantity;
        product.revenueCents += cents(line.price) * line.quantity;
        let price = product.prices.find(price => price.price === line.price && price.name === line.name);
        if (!price) { price = { price: line.price, name: line.name, sold: 0, revenueCents: 0 }; product.prices.push(price); }
        price.sold += line.quantity; price.revenueCents += cents(line.price) * line.quantity;
        const inventory = config(state, menu.id);
        if (inventory.enabled) inventory.stocks[id] = (inventory.stocks[id] ?? 0) - line.quantity;
      }
      state.current.receiptCount++; state.current.revenueCents += totalCents;
      state.current.sales.push({ id: payload.id, at: now().toISOString(), items, totalCents });
      state.processed[payload.id] = { hash, shiftId: state.current.id };
      return { ok: true, shiftId: state.current.id };
    }, true),
    close: id => run(state => {
      if (!state.current || state.current.id !== id) fail('Смена уже закрыта или изменилась. Обновите страницу.', 409);
      state.current.closedAt = now().toISOString();
      const result = report(state.current, state.reportSettings);
      state.archive.unshift(state.current); state.current = null;
      return result;
    }, true),
    clear: () => run(state => {
      state.current = null; state.archive = [];
      // Opaque receipt hashes survive erasure so a lost response cannot debit stock twice.
      return { ok: true };
    }, true),
  };
}
