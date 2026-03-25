import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import "./ChangeModal.css";

function ChangeModal({ isOpen, price = 0, currentChange = 0, onClose, onConfirm }) {
  const { language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const isEn = language === "en";
  const [given, setGiven] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setGiven("");

    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  const parsedGiven = useMemo(() => parseFloat(given), [given]);
  const isValidGiven = Number.isFinite(parsedGiven) && parsedGiven >= 0;
  const safeGiven = isValidGiven ? parsedGiven : 0;
  const missingAmount = Math.max(0, price - safeGiven);
  const changeAmount = Math.max(0, safeGiven - price);
  const canConfirm = isValidGiven && safeGiven >= price;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canConfirm) return;
    onConfirm(safeGiven);
  };

  if (!isOpen) return null;

  return (
    <div className="change-modal" onClick={onClose}>
      <div
        className="change-modal__content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-modal-title"
      >
        <div className="change-modal__header">
          <h3 id="change-modal-title">{isEn ? "Change" : "Сдача"}</h3>
          <button
            type="button"
            className="change-modal__close"
            onClick={onClose}
            aria-label={isEn ? "Close" : "Закрыть"}
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="change-modal__form">
          <label htmlFor="given-amount" className="change-modal__label">
            {isEn ? "Amount received" : "Сумма сдачи"}
          </label>
          <input
            id="given-amount"
            ref={inputRef}
            type="number"
            className="change-modal__input"
            placeholder="0"
            value={given}
            onChange={(event) => setGiven(event.target.value)}
            inputMode="decimal"
            min="0"
            step="0.01"
            required
          />

          <div className="change-modal__summary">
            <p>{isEn ? "To pay" : "К оплате"}: {formatCurrency(price || 0)}</p>
            <p>{isEn ? "Received" : "Внесено"}: {formatCurrency(safeGiven)}</p>
            <p>{isEn ? "Change" : "Сдача"}: {formatCurrency(changeAmount)}</p>
            {missingAmount > 0 && (
              <p className="change-modal__warning">
                {isEn ? "Missing" : "Не хватает"}: {formatCurrency(missingAmount)}
              </p>
            )}
            {currentChange > 0 && (
              <p className="change-modal__muted">
                {isEn ? "Current check change" : "Текущая сдача в чеке"}: {formatCurrency(currentChange)}
              </p>
            )}
          </div>

          <div className="change-modal__actions">
            <button
              type="submit"
              className="change-modal__button change-modal__button--primary"
              disabled={!canConfirm}
            >
              {isEn ? "Confirm" : "Подтвердить"}
            </button>
            <button
              type="button"
              className="change-modal__button change-modal__button--secondary"
              onClick={onClose}
            >
              {isEn ? "Cancel" : "Отмена"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangeModal;
