import { useRef, useState } from 'react';
import GlassDialog from './GlassDialog';
import './ChangeModal.css';

const money = value => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;

function ChangeForm({ price, onConfirm, onClose }) {
  const [given, setGiven] = useState('');
  const inputRef = useRef(null);
  const amount = Number(given);
  const valid = given.trim() !== '' && Number.isFinite(amount) && amount >= price;
  const change = Math.max(0, Math.round((amount - price) * 100) / 100);
  return <GlassDialog title="Расчёт сдачи" className="change-modal" panelClassName="change-modal__content" raised onClose={onClose} initialFocusRef={inputRef}>
    <form className="change-modal__form" onSubmit={event => { event.preventDefault(); if (valid) onConfirm(amount); }}>
      <div className="change-modal__summary" aria-live="polite">
        <p><span>К оплате</span><strong>{money(price)}</strong></p>
        <p><span>Сдача</span><strong>{money(Number.isFinite(change) ? change : 0)}</strong></p>
      </div>
      <input id="given-amount" ref={inputRef} type="number" className="change-modal__input" aria-label="Сумма от гостя" placeholder="Сумма от гостя, ₽" value={given} onChange={event => setGiven(event.target.value)} inputMode="decimal" min={price} step="0.01" required />
      <button type="submit" className="change-modal__button change-modal__button--primary" disabled={!valid}>Подтвердить</button>
    </form>
  </GlassDialog>;
}

export default function ChangeModal({ isOpen, price = 0, onClose, onConfirm }) {
  return isOpen ? <ChangeForm price={price} onClose={onClose} onConfirm={onConfirm} /> : null;
}
