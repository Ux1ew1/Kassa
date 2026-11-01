import { useEffect, useRef, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { configureAccounting, recordMovement, closeShift, clearReports, fetchReport, downloadReport, saveReportSettings, addPreparedProduct } from '../utils/api';
import ItemModal from './ItemModal';
import SuppliesReport from './SuppliesReport';
import ConfirmDialog from './ConfirmDialog';
import './AccountingPanel.css';

const date = (value, timeZone) => value ? new Date(value).toLocaleString('ru-RU', { timeZone }) : '—';
const display = value => value == null ? '—' : value;
const money = value => `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} руб.`;

function Confirmation({ action, busy, error, onCancel, onConfirm }) {
  const clear = action.type === 'clear';
  return <ConfirmDialog title={clear ? 'Очистить все отчёты?' : 'Закрыть смену?'} confirmText={clear ? 'Удалить все отчёты' : 'Закрыть смену'} danger={clear} busy={busy} error={error} onCancel={onCancel} onConfirm={onConfirm}>
    {clear
      ? 'Будут необратимо удалены все отчёты, история текущей смены и операции расходников для всех сотрудников. Остатки товаров и расходников сохранятся. Следующая продажа начнёт новую смену.'
      : 'Отчёт смены будет зафиксирован для всех сотрудников. Незавершённые чеки в него не входят. Следующая продажа начнёт новую смену, остатки сохранятся.'}
  </ConfirmDialog>;
}

function InventorySettings({ inventory, shiftOpen, busy, onSave }) {
  const [enabled, setEnabled] = useState(inventory.enabled);
  const [mode, setMode] = useState(inventory.mode);
  const [quantities, setQuantities] = useState(() => Object.fromEntries(inventory.items.map(item => [item.id, item.quantity ?? ''])));
  const submit = event => {
    event.preventDefault();
    onSave({ enabled, mode, quantities: Object.fromEntries(inventory.items.map(item => [item.id, quantities[item.id] === '' || quantities[item.id] == null ? null : Number(quantities[item.id])])) });
  };
  return <form onSubmit={submit} className="accounting-form">
    <fieldset disabled={busy || shiftOpen}>
      <label className="accounting-check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Количественный учёт</label>
      <label>Если товар закончился<select value={mode} onChange={event => setMode(event.target.value)}>
        <option value="stop">Автоматически в стоп-лист</option><option value="negative">Разрешать остаток в минус</option>
      </select></label>
      {enabled && <>
        <p>Задайте начальное количество всех товаров. Ноль допустим. При сохранении эти значения станут текущими остатками.</p>
        <div className="accounting-scroll"><table><thead><tr><th>Товар</th><th>Начальное количество</th></tr></thead><tbody>
          {inventory.items.map(item => <tr key={item.id}><td>{item.name}</td><td><input aria-label={`Начальное количество: ${item.name}`} type="number" min="0" max="1000000000" step="1" required value={quantities[item.id] ?? ''} onChange={event => setQuantities(previous => ({ ...previous, [item.id]: event.target.value }))} /></td></tr>)}
        </tbody></table></div>
      </>}
      <button type="submit">Сохранить настройки учёта</button>
    </fieldset>
    {shiftOpen && <p>Настройки доступны между сменами. Сейчас можно проводить поступления и корректировки.</p>}
  </form>;
}

function MovementForm({ inventory, busy, onSave }) {
  const [itemId, setItemId] = useState('');
  const [type, setType] = useState('receipt');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  return <form className="accounting-form" onSubmit={async event => {
    event.preventDefault();
    if (await onSave({ menuId: inventory.id, itemId, type, quantity: Number(quantity), reason })) { setQuantity(''); setReason(''); }
  }}>
    <fieldset disabled={busy}>
      <legend>Поступление и корректировка</legend>
      <label>Товар<select value={itemId} required onChange={event => setItemId(event.target.value)}><option value="">Выберите товар</option>{inventory.items.map(item => <option key={item.id} value={item.id}>{item.name} — остаток {item.quantity}</option>)}</select></label>
      <label>Операция<select value={type} onChange={event => setType(event.target.value)}><option value="receipt">Поступление</option><option value="correction">Корректировка (+ или −)</option></select></label>
      <label>Изменение количества<input type="number" step="1" min={type === 'receipt' ? 1 : -1000000000} max="1000000000" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
      <label>Причина<input required maxLength="500" value={reason} onChange={event => setReason(event.target.value)} placeholder="Например, новая поставка или пересчёт" /></label>
      <button type="submit">Провести изменение</button>
    </fieldset>
  </form>;
}

function ReportTable({ report }) {
  return <>
    <dl className="accounting-totals"><div><dt>Начало</dt><dd>{date(report.startedAt, report.timeZone)}</dd></div>{report.closedAt && <div><dt>Конец</dt><dd>{date(report.closedAt, report.timeZone)}</dd></div>}<div><dt>Чеков</dt><dd>{report.receiptCount}</dd></div><div><dt>Выручка</dt><dd>{money(report.revenue)}</dd></div></dl>
    <details className="report-help"><summary>Как читать отчёт</summary><p>Прочерк — количественный учёт выключен или остаток указан в итоговой строке. Итоги по товару не прибавляются повторно к строкам продаж по ценам.</p></details>
    <p className="report-scroll-hint">Прокрутите таблицу вправо, чтобы увидеть остатки и выручку →</p>
    <div className="accounting-scroll" tabIndex={0} aria-label="Таблица отчёта"><table className="accounting-report-table"><thead><tr>{['Меню', 'Название', 'Цена продажи', 'Было на начало', 'Поступило', 'Корректировка', 'Продано', 'Осталось', 'Выручка'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>
      {report.rows.map((row, index) => <tr key={index} className={row.kind === 'summary' ? 'accounting-summary' : ''}>
        <td>{row.menu}</td><td>{row.name}</td><td>{row.price == null ? '—' : money(row.price)}</td><td>{display(row.opening)}</td><td>{display(row.received)}</td><td>{display(row.adjustment)}</td><td>{row.sold}</td><td>{display(row.remaining)}</td><td>{money(row.revenue)}</td>
      </tr>)}
    </tbody></table></div>
    {!!report.movements.length && <details><summary>Поступления и корректировки ({report.movements.length})</summary><ul>{report.movements.map((move, index) => <li key={index}>{date(move.at, report.timeZone)}: {move.menu}, {move.name}, {move.type === 'receipt' ? 'поступление' : 'корректировка'} {move.quantity > 0 ? '+' : ''}{move.quantity}. {move.reason}</li>)}</ul></details>}
  </>;
}

export default function AccountingPanel() {
  const { state, error, reload } = useAccounting();
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [action, setAction] = useState(null);
  const [selectedReport, setSelectedReport] = useState('');
  const [archivedReport, setArchivedReport] = useState(null);
  const [reportError, setReportError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const activeOperation = useRef(false);
  const inventory = state?.menus.find(menu => menu.id === String(selectedMenuId)) || state?.menus[0];
  const report = selectedReport ? archivedReport : state?.current;
  useEffect(() => {
    let alive = true;
    setArchivedReport(null); setReportError('');
    if (!selectedReport) { setReportLoading(false); return; }
    setReportLoading(true);
    fetchReport(selectedReport).then(report => { if (alive) setArchivedReport(report); })
      .catch(error => { if (alive) setReportError(error.message); }).finally(() => { if (alive) setReportLoading(false); });
    return () => { alive = false; };
  }, [selectedReport, state?.reportSettings?.products]);
  useEffect(() => {
    if (state && selectedReport && !state.archive.some(shift => shift.id === selectedReport)) setSelectedReport('');
  }, [state, selectedReport]);
  const perform = async (operation, success) => {
    if (activeOperation.current) return false;
    activeOperation.current = true; setBusy(true); setMessage('');
    try {
      await operation();
      await reload(); window.dispatchEvent(new Event('accounting-changed'));
      setMessage(success); return true;
    } catch (error) { setMessage(`Ошибка: ${error.message}`); return false; }
    finally { activeOperation.current = false; setBusy(false); }
  };
  return <section className="accounting-panel" aria-label="Учёт товаров и смены">
    {error && <p role="alert">{error}</p>}
    {!state && !error && <p role="status">Загружаем учёт…</p>}
    {message && <p role="status" className="accounting-message">{message}</p>}
    <section className="management-card" id="shift-reports" aria-label="Смены и отчёты">
    <h2>Смены и отчёты</h2>
    <p>Общие для всех сотрудников. Хранятся на устройстве, где запущена касса, до ручной очистки.</p>
    <label>Состав отчёта<select aria-label="Состав отчёта" value={state?.reportSettings?.products || 'all'} disabled={busy || !state} onChange={event => perform(() => saveReportSettings({ products: event.target.value }), 'Настройка отчёта сохранена. Она применяется к таблице и скачиваемым файлам.')}>
      <option value="all">Все товары из меню</option><option value="sold">Только проданные товары</option>
    </select></label>
    <p>Применяется к таблице и скачиваемым файлам всех смен. История сохраняется полностью.</p>
    <div className="accounting-actions">
      <button type="button" className="management-primary" disabled={busy || !state?.current} onClick={() => { setMessage(''); setAction({ type: 'close', shiftId: state.current.id }); }}>Закрыть смену</button>
    </div>
    {!state?.current && <p>Открытой смены нет. Первая завершённая продажа начнёт новую.</p>}
    <label className="accounting-report-select">Отчёт<select value={selectedReport} onChange={event => setSelectedReport(event.target.value)}>
      <option value="">Текущая смена</option>{state?.archive.map(shift => <option key={shift.id} value={shift.id}>{date(shift.startedAt, shift.timeZone)} — {shift.receiptCount} чеков</option>)}
    </select></label>
    {reportError && <p role="alert">{reportError}</p>}
    {reportLoading && <p role="status">Загружаем отчёт…</p>}
    {report && <>
      <div className="accounting-actions">{['xlsx', 'csv'].map(format => <button key={format} type="button" disabled={busy} onClick={() => perform(() => downloadReport(report.id, format), 'Отчёт подготовлен для скачивания.')}>Скачать {format.toUpperCase()}</button>)}</div>
      <ReportTable report={report} />
      <SuppliesReport report={report} />
    </>}
    </section>
    <section className="management-card" id="product-preparation" aria-label="Подготовка товаров">
    <h2>Подготовка товаров до продажи</h2>
    {inventory && <>
      <label>Меню для подготовки товаров<select value={inventory.id} disabled={busy || !!productId} onChange={event => setSelectedMenuId(event.target.value)}>{state.menus.map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></label>
      <p>Здесь можно добавить товары, задать начальное количество и провести поступление до первой продажи. Выбор меню на этой странице не переключает меню сотрудников.</p>
      <button type="button" disabled={busy} onClick={() => { setMessage(''); setProductId(globalThis.crypto?.randomUUID?.() || `product_${Date.now()}_${Math.random().toString(36).slice(2)}`); }}>Добавить товар до продажи</button>
      {!inventory.enabled && <p>Чтобы указать количество, сначала включите количественный учёт и сохраните начальные остатки. Новые товары затем можно добавлять сразу с количеством.</p>}
      <details open={!state.current}><summary>Начальные остатки и настройки учёта — {inventory.enabled ? 'включён' : 'выключен'}</summary>
        <InventorySettings key={`${inventory.id}:${inventory.enabled}:${inventory.mode}:${!!state.current}:${inventory.items.map(item => `${item.id}=${item.quantity}`).join(',')}`} inventory={inventory} shiftOpen={!!state.current} busy={busy} onSave={payload => perform(() => configureAccounting(inventory.id, payload), 'Настройки учёта сохранены.')} />
      </details>
      {inventory.enabled && <>
        <div className="accounting-scroll"><table><thead><tr><th>Товар</th><th>Остаток</th><th>Состояние</th></tr></thead><tbody>{inventory.items.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>{item.stopped ? 'Стоп-лист' : 'В продаже'}</td></tr>)}</tbody></table></div>
        <details><summary>Поступление или корректировка</summary><MovementForm key={inventory.id} inventory={inventory} busy={busy} onSave={payload => perform(() => recordMovement(payload), 'Количество обновлено.')} /></details>
      </>}
    </>}
    </section>
    <details className="management-danger-zone"><summary>Удаление истории</summary><p>Очистка удаляет историю для всех сотрудников. Текущие остатки сохраняются.</p>
      <button type="button" className="management-danger" disabled={busy || !state || (!state.current && !state.archive.length && !state.pendingSupplyMovements)} onClick={() => { setMessage(''); setAction({ type: 'clear' }); }}>Очистить отчёты</button>
    </details>
    {productId && inventory && <ItemModal isOpen mode="add" withQuantity={inventory.enabled} saving={busy} saveError={message.startsWith('Ошибка:') ? message : ''} onClose={() => !busy && setProductId('')} onSave={async data => {
      const ok = await perform(() => addPreparedProduct(inventory.id, { ...data, id: productId, initialQuantity: data.initialQuantity ?? 0 }), 'Товар добавлен в меню. Начальное количество сохранено; продажа не создавалась.');
      if (ok) setProductId('');
    }} />}
    {action && <Confirmation action={action} busy={busy} error={message.startsWith('Ошибка:') ? message : ''} onCancel={() => setAction(null)} onConfirm={async () => {
      const ok = await perform(() => action.type === 'clear' ? clearReports() : closeShift(action.shiftId), action.type === 'clear' ? 'Все отчёты удалены. Остатки сохранены.' : 'Смена закрыта. Следующая продажа начнёт новую.');
      if (ok) { setAction(null); setSelectedReport(''); setArchivedReport(null); }
    }} />}
  </section>;
}
