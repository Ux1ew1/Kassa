import { useRef, useState } from 'react';
import { loadChecks } from '../utils/storage';
import { submitSale } from '../utils/api';

const createSaleId = () => globalThis.crypto?.randomUUID?.() || `sale_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
const emptyCheck = id => ({ id, saleId: createSaleId(), items: [], price: 0, change: 0 });

export function useChecks({ activeMenuId, menuItems = [] } = {}) {
  const [initial] = useState(() => {
    const loaded = loadChecks();
    const checks = loaded.checks?.length ? loaded.checks : [emptyCheck(1)];
    return { checks: checks.map(check => ({ ...check, saleId: check.saleId || createSaleId() })), activeCheckId: checks.some(check => check.id === loaded.activeCheckId) ? loaded.activeCheckId : checks[0].id };
  });
  const [data, setData] = useState(initial);
  const live = useRef(initial);
  const sending = useRef(false);
  const [completing, setCompleting] = useState(false);
  const [saleError, setSaleError] = useState('');
  // Persist before sending a sale. A browser storage failure must never leave an unrepeatable sale.
  const apply = transform => {
    const next = transform(live.current);
    localStorage.setItem('checks', JSON.stringify(next.checks));
    localStorage.setItem('activeCheckId', String(next.activeCheckId));
    live.current = next; setData(next);
    return next;
  };
  const edit = transform => {
    try { apply(transform); setSaleError(''); }
    catch { setSaleError('Не удалось сохранить чек на устройстве. Освободите место и повторите действие.'); }
  };
  const updateCheck = transform => edit(state => ({ ...state, checks: state.checks.map(check =>
    check.id === state.activeCheckId && !check.pendingSale ? transform(check) : check) }));
  const setActiveCheckId = id => edit(state => ({ ...state, activeCheckId: id }));
  const createNewCheck = () => edit(state => {
    const id = Math.max(0, ...state.checks.map(check => check.id)) + 1;
    return { checks: [...state.checks, emptyCheck(id)], activeCheckId: id };
  });
  const addItemToCheck = item => {
    if (!activeMenuId || item.stopped) return;
    updateCheck(check => ({ ...check, items: [...check.items, { id: item.id, menuId: String(activeMenuId), name: item.name, price: item.price, fulfilled: false }], price: Math.round((check.price + item.price) * 100) / 100 }));
  };
  const removeItemFromCheck = index => updateCheck(check => ({ ...check,
    items: check.items.filter((_, i) => i !== index), price: Math.round((check.price - (check.items[index]?.price || 0)) * 100) / 100 }));
  const updateCheckChange = given => updateCheck(check => ({ ...check, change: Math.max(0, Math.round((given - check.price) * 100) / 100) }));
  const toggleItemsFulfilled = (indices = [], fulfilled, targetId = live.current.activeCheckId) => edit(state => ({ ...state,
    checks: state.checks.map(check => check.id === targetId && !check.pendingSale ? { ...check,
      items: check.items.map((item, index) => indices.includes(index) ? { ...item, fulfilled } : item) } : check) }));
  const removeCompleted = id => apply(state => {
    let checks = state.checks.filter(check => check.saleId !== id);
    if (!checks.length) checks = [emptyCheck(1)];
    return { checks, activeCheckId: checks.some(check => check.id === state.activeCheckId) ? state.activeCheckId : checks.at(-1).id };
  });
  const completeCheck = async () => {
    if (sending.current) return;
    const check = live.current.checks.find(check => check.id === live.current.activeCheckId);
    if (!check) return;
    if (!check.items.length) { try { removeCompleted(check.saleId); } catch { setSaleError('Не удалось сохранить чеки на устройстве.'); } return; }
    sending.current = true; setCompleting(true); setSaleError('');
    try {
      let payload = check.pendingSale;
      if (!payload) {
        const lines = check.items.map(item => {
          const menuId = item.menuId || (menuItems.some(current => String(current.id) === String(item.id) && current.name === item.name) ? activeMenuId : null);
          if (!menuId) throw new Error('В старом чеке есть товар из неизвестного меню. Выберите исходное меню или удалите позицию и добавьте её заново.');
          return { menuId: String(menuId), itemId: String(item.id), name: item.name, price: item.price, quantity: 1 };
        });
        payload = { id: check.saleId, items: lines };
        apply(state => ({ ...state, checks: state.checks.map(item => item.saleId === check.saleId ? { ...item, pendingSale: payload } : item) }));
      }
      await submitSale(payload);
      removeCompleted(check.saleId);
      window.dispatchEvent(new Event('accounting-changed'));
    } catch (error) {
      // A definitive validation response means nothing was committed. Other errors remain locked for safe retry.
      if ([400, 404, 409, 413].includes(error.status)) {
        try { apply(state => ({ ...state, checks: state.checks.map(item => item.saleId === check.saleId ? { ...item, pendingSale: null } : item) })); } catch { /* Retry stays safe. */ }
      }
      setSaleError(error.status ? error.message : 'Не удалось подтвердить продажу. Проверьте связь с сервером и свободное место на устройстве, затем повторите завершение. Состав чека сохранён.');
    } finally { sending.current = false; setCompleting(false); }
  };
  return { checks: data.checks, activeCheckId: data.activeCheckId, setActiveCheckId,
    getActiveCheck: () => data.checks.find(check => check.id === data.activeCheckId), addItemToCheck,
    removeItemFromCheck, updateCheckChange, createNewCheck, completeCheck, toggleItemsFulfilled,
    completing, saleError };
}
