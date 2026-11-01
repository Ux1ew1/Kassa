/**
 * Modal for creating or editing a menu item.
 */
import { useState, useEffect, useRef } from "react";
import "./ItemModal.css";

/**
 * Allowed menu categories.
 * @type {string[]}
 */
const CATEGORY_OPTIONS = ["Напитки", "Еда", "Алкоголь", "Остальное"];

/**
 * Normalizes a category label to a supported slug.
 * @param {string} value - Raw category value.
 * @returns {string} Normalized slug.
 */
const normalizeCategory = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (["all", "все"].includes(v)) return "все";
  if (["drink", "drinks", "напитки"].includes(v)) return "напитки";
  if (["food", "еда"].includes(v)) return "еда";
  if (["alcohol", "alcoholic", "алкоголь"].includes(v)) return "алкоголь";
  if (["other", "misc", "остальное", "другое"].includes(v)) return "остальное";
  return "остальное";
};

/**
 * Renders a modal form for a menu item.
 * @param {Object} props - Component props.
 * @param {boolean} props.isOpen - Whether modal is open.
 * @param {'add'|'edit'} props.mode - Modal mode.
 * @param {Object|null} props.item - Item to edit.
 * @param {Function} props.onSave - Save handler.
 * @param {Function} props.onClose - Close handler.
 * @returns {JSX.Element|null} Modal or null.
 */
function ItemModal({ isOpen, mode, item, onSave, onClose, withQuantity = false, saving = false, saveError = '' }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("напитки");
  const [show, setShow] = useState(true);
  const [initialQuantity, setInitialQuantity] = useState('0');
  const dialogRef = useRef(null);
  const callbacks = useRef({ onClose, saving });
  callbacks.current = { onClose, saving };
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('input')?.focus();
    const keyboard = event => {
      if (event.key === 'Escape' && !callbacks.current.saving) callbacks.current.onClose();
      if (event.key !== 'Tab') return;
      const controls = [...dialogRef.current.querySelectorAll('input:not(:disabled),select:not(:disabled),button:not(:disabled)')];
      if (!controls.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setInitialQuantity('0');
      if (mode === "edit" && item) {
        setName(item.name || "");
        setPrice(item.price?.toString() || "");
        setCategory(normalizeCategory(item.category));
        setShow(item.show !== undefined ? item.show : true);
      } else {
        setName("");
        setPrice("");
        setCategory("напитки");
        setShow(true);
      }
    }
  }, [isOpen, mode, item]);

  /**
   * Validates and submits form data.
   * @param {Event} e - Form submit event.
   * @returns {void}
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const normalizedCategory = normalizeCategory(category);
    if (saving) return;
    if (withQuantity && (!Number.isSafeInteger(Number(initialQuantity)) || Number(initialQuantity) < 0 || initialQuantity.trim() === '')) {
      alert('Введите целое неотрицательное количество'); return;
    }

    if (!name.trim() || isNaN(priceNum) || priceNum < 0) {
      alert("Введите корректные данные");
      return;
    }
    onSave({
      name: name.trim(),
      price: priceNum,
      show,
      category: normalizedCategory,
      ...(withQuantity ? { initialQuantity: Number(initialQuantity) } : {}),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={() => !saving && onClose()}>
      <div ref={dialogRef} className="modal-content" role="dialog" aria-modal="true" aria-labelledby="item-modal-title" aria-busy={saving} onClick={(e) => e.stopPropagation()}>
        <h3 id="item-modal-title">{mode === "edit" ? "Редактирование позиции" : "Новая позиция"}</h3>
        {saveError && <p role="alert">{saveError}</p>}
        <form className="modal-form" onSubmit={handleSubmit}>
          <fieldset className="management-workspace modal-fields" disabled={saving}>
          <label className="modal-field">
            <span className="modal-label">Название</span>
          <input
            type="text"
            className="modal-input"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          </label>
          <label className="modal-field">
            <span className="modal-label">Стоимость</span>
          <input
            type="number"
            className="modal-input"
            placeholder="Цена"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            min="0"
            step="0.01"
            required
          />
          </label>
          <label className="modal-field" htmlFor="category">
            <span className="modal-label">Категория</span>
          <select
            id="category"
            className="modal-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={normalizeCategory(option)}>
                {option}
              </option>
            ))}
          </select>
          </label>
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />
            Активна
          </label>
          {withQuantity && <label className="modal-field"><span className="modal-label">Количество до продажи</span><input type="number" className="modal-input" required min="0" max="1000000000" step="1" value={initialQuantity} disabled={saving} onChange={event => setInitialQuantity(event.target.value)} /></label>}
          </fieldset>
          <div className="modal-actions">
            <button type="submit" className="modal-button" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button
              type="button"
              className="modal-button modal-button--secondary"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ItemModal;
