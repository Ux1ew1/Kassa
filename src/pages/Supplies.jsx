import { useRef, useState } from 'react';
import ManagementHeader from '../components/ManagementHeader';
import { useAccounting } from '../hooks/useAccounting';
import { createSupply, moveSupply } from '../utils/api';
import { supplyUnits, supplyOperations } from '../../shared/supplies';
import '../components/AccountingPanel.css';
import './Admin.css';
import './Supplies.css';

const storageKey = 'kassa-pending-supply-action';
const operationId = () => globalThis.crypto?.randomUUID?.() || `supply_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const readPending = () => { try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { return null; } };

function CreateSupplyForm({ disabled, onSave }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [quantity, setQuantity] = useState('0');
  const [pack, setPack] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [packageSize, setPackageSize] = useState('1000');
  return <form className="accounting-form" onSubmit={async event => {
    event.preventDefault();
    const ok = await onSave('create', { name, unit, quantity: Number(quantity), packageSize: pack ? Number(packageSize) : null, packageName: pack ? packageName : '' });
    if (ok) { setName(''); setQuantity('0'); }
  }}>
    <fieldset disabled={disabled}>
      <legend>Новый расходник</legend>
      <div className="supplies-fields">
        <label>Название<input name="supply-name" required maxLength="200" value={name} onChange={event => setName(event.target.value)} placeholder="Например, кофейное зерно" /></label>
        <label>Единица<select name="supply-unit" value={unit} onChange={event => setUnit(event.target.value)}><option value="g">Граммы (г)</option><option value="ml">Миллилитры (мл)</option><option value="pcs">Штуки (шт.)</option></select></label>
        <label>Начальное количество на складе, {supplyUnits[unit]}<input name="supply-initial" type="number" min="0" max="1000000000" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
      </div>
      <label className="accounting-check"><input name="supply-pack-enabled" type="checkbox" checked={pack} onChange={event => setPack(event.target.checked)} /> Указать упаковку для быстрого ввода</label>
      {pack && <div className="supplies-fields">
        <label>Название упаковки<input name="supply-pack-name" maxLength="80" value={packageName} onChange={event => setPackageName(event.target.value)} placeholder="Например, пачка или пакет" /></label>
        <label>Количество в одной упаковке, {supplyUnits[unit]}<input name="supply-pack-size" type="number" min="1" max="1000000000" step="1" required value={packageSize} onChange={event => setPackageSize(event.target.value)} /></label>
      </div>}
      <button type="submit">Добавить расходник</button>
    </fieldset>
  </form>;
}

function SupplyMovementForm({ supplies, disabled, onSave }) {
  const [selected, setSelected] = useState('');
  const [type, setType] = useState('issue');
  const [quantity, setQuantity] = useState('');
  const [measure, setMeasure] = useState('unit');
  const [reason, setReason] = useState('');
  const supply = supplies.find(item => item.id === selected) || supplies[0];
  const packages = measure === 'package' && !!supply.packageSize;
  const converted = Number(quantity) * (packages ? supply.packageSize : 1);
  return <form className="accounting-form" onSubmit={async event => {
    event.preventDefault();
    if (await onSave('move', { supplyId: supply.id, type, quantity: converted, reason })) { setQuantity(''); setReason(''); }
  }}>
    <fieldset disabled={disabled}>
      <legend>Операция со складом</legend>
      <div className="supplies-fields">
        <label>Расходник<select name="movement-supply" value={supply.id} onChange={event => { setSelected(event.target.value); setMeasure('unit'); setQuantity(''); }}>{supplies.map(item => <option key={item.id} value={item.id}>{item.name} — {item.quantity} {supplyUnits[item.unit]}</option>)}</select></label>
        <label>Операция<select name="supply-operation" value={type} onChange={event => setType(event.target.value)}>{Object.entries(supplyOperations).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        {!!supply.packageSize && <label>Ввод количества<select name="supply-measure" value={packages ? 'package' : 'unit'} onChange={event => setMeasure(event.target.value)}><option value="unit">В {supplyUnits[supply.unit]}</option><option value="package">Упаковками ({supply.packageSize} {supplyUnits[supply.unit]})</option></select></label>}
        <label>{packages ? 'Число упаковок' : `Количество, ${supplyUnits[supply.unit]}`}<input name="supply-amount" type="number" min="1" max={Math.floor(1000000000 / (packages ? supply.packageSize : 1))} step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
      </div>
      {packages && quantity && <p>Будет проведено: {converted} {supplyUnits[supply.unit]}.</p>}
      {type === 'waste'
        ? <label>Причина списания<input name="supply-reason" maxLength="500" required value={reason} onChange={event => setReason(event.target.value)} placeholder="Например, порча на складе" /></label>
        : <details className="supplies-optional"><summary>Комментарий</summary><label>Комментарий<input name="supply-reason" maxLength="500" value={reason} onChange={event => setReason(event.target.value)} /></label></details>}
      <div className="accounting-actions">
        <button type="submit">Провести операцию</button>
        {supply.packageSize && type === 'issue' && <button type="button" onClick={async () => {
          if (await onSave('move', { supplyId: supply.id, type: 'issue', quantity: supply.packageSize, reason: 'Выдача одной упаковки' })) { setQuantity(''); setReason(''); }
        }}>Взять упаковку ({supply.packageSize} {supplyUnits[supply.unit]})</button>}
      </div>
    </fieldset>
  </form>;
}

export default function Supplies() {
  const { state, error, reload } = useAccounting();
  const [pending, setPending] = useState(readPending);
  const pendingRef = useRef(pending);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const execute = async action => {
    if (sending.current) return false;
    sending.current = true; setBusy(true); setMessage('');
    try {
      localStorage.setItem(storageKey, JSON.stringify(action));
      pendingRef.current = action; setPending(action);
      if (action.kind === 'create') await createSupply(action.payload); else await moveSupply(action.payload);
      localStorage.removeItem(storageKey);
      pendingRef.current = null; setPending(null);
      await reload(); window.dispatchEvent(new Event('accounting-changed'));
      setMessage(action.kind === 'create' ? 'Расходник добавлен.' : 'Операция сохранена. Остаток обновлён.');
      return true;
    } catch (error) {
      if ([400, 404, 409, 413].includes(error.status)) {
        try { localStorage.removeItem(storageKey); pendingRef.current = null; setPending(null); } catch { /* Safe retry remains available. */ }
      }
      setMessage(error.status ? `Ошибка: ${error.message}` : 'Нет подтверждения операции. Проверьте связь с сервером и свободное место на устройстве, затем повторите операцию.');
      return false;
    } finally { sending.current = false; setBusy(false); }
  };
  const save = (kind, payload) => pendingRef.current ? Promise.resolve(false) : execute({ kind, payload: { ...payload, id: operationId() } });
  const supplies = state?.supplies || [];
  return <div className="admin-container"><ManagementHeader title="Расходники" />
    <main className="accounting-panel supplies-page">
      {error && <p role="alert">{error}</p>}
      {message && <p role="status" className="accounting-message">{message}</p>}
      {pending && <div className="accounting-message" role="alert"><p>Результат операции ещё не подтверждён. Повтор безопасен: расходник или списание не будут учтены дважды.</p><button type="button" disabled={busy} onClick={() => execute(pendingRef.current)}>Повторить операцию</button></div>}
      {!state && !error && <p role="status">Загружаем расходники…</p>}
      {!!state?.pendingSupplyMovements && <p>Операции попадут в отчёт следующей смены.</p>}
      <section className="management-card"><h2>Остатки на складе</h2>
      {state && !supplies.length && <p>Расходников пока нет. Добавьте зерно, молоко, стаканы или другую позицию ниже.</p>}
      {!!supplies.length && <>
        <div className="accounting-scroll" tabIndex={0} aria-label="Остатки расходников"><table className="supplies-stock-table"><thead><tr><th>Расходник</th><th>Осталось</th><th>Упаковка</th></tr></thead><tbody>{supplies.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.quantity} {supplyUnits[item.unit]}</td><td>{item.packageSize ? `${item.packageName}: ${item.packageSize} ${supplyUnits[item.unit]}` : '—'}</td></tr>)}</tbody></table></div>
      </>}
      </section>
      {!!supplies.length && <section className="management-card supplies-operation"><h2>Провести операцию</h2><SupplyMovementForm supplies={supplies} disabled={busy || !!pending} onSave={save} /></section>}
      <details className="management-card" open={!supplies.length}><summary>Добавить расходник</summary><CreateSupplyForm disabled={busy || !!pending || !state} onSave={save} /></details>
      <details className="management-card supplies-history"><summary>Последние операции</summary>
      {state && !state.supplyMovements?.length && <p>Операций пока нет.</p>}
      {!!state?.supplyMovements?.length && <div className="accounting-scroll" tabIndex={0} aria-label="Журнал расходников"><table className="supplies-log-table"><thead><tr><th>Дата</th><th>Расходник</th><th>Операция</th><th>Количество</th><th>Причина</th></tr></thead><tbody>{state.supplyMovements.map((move, index) => <tr key={index}><td>{new Date(move.at).toLocaleString('ru-RU')}</td><td>{move.name}</td><td>{supplyOperations[move.type]}</td><td>{move.type === 'issue' || move.type === 'waste' ? '−' : '+'}{move.quantity} {supplyUnits[move.unit]}</td><td>{move.reason || '—'}</td></tr>)}</tbody></table></div>}
      </details>
    </main>
  </div>;
}
