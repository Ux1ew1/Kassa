import { useState, useEffect } from "react";
import "./ItemModal.css";

const CATEGORY_OPTIONS = ["напитки", "еда", "алкоголь", "остальное"];

const normalizeCategory = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (["all", "все"].includes(v)) return "все";
  if (["drink", "drinks", "напитки"].includes(v)) return "напитки";
  if (["food", "еда"].includes(v)) return "еда";
  if (["alcohol", "alcoholic", "алкоголь"].includes(v)) return "алкоголь";
  if (["other", "misc", "остальное", "другое"].includes(v)) return "остальное";
  return "остальное";
};

function ItemModal({ isOpen, mode, item, onSave, onClose }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("остальное");
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && item) {
        setName(item.name || "");
        setPrice(item.price?.toString() || "");
        setCategory(normalizeCategory(item.category));
        setShow(item.show !== undefined ? item.show : true);
      } else {
        setName("");
        setPrice("");
        setCategory("остальное");
        setShow(true);
      }
    }
  }, [isOpen, mode, item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const normalizedCategory = normalizeCategory(category);

    if (!name.trim() || isNaN(priceNum) || priceNum < 0) {
      alert("Введите корректные данные");
      return;
    }
    onSave({
      name: name.trim(),
      price: priceNum,
      show,
      category: normalizedCategory,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === "edit" ? "Редактирование позиции" : "Новая позиция"}</h3>
        <form onSubmit={handleSubmit}>
          <span className="modal-label">Название </span>
          <input
            type="text"
            className="modal-input"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
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
          <label className="modal-label" htmlFor="category">
            Категория
          </label>
          <select
            id="category"
            className="modal-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />
            Активна
          </label>
          <div className="modal-actions">
            <button type="submit" className="modal-button">
              Сохранить
            </button>
            <button
              type="button"
              className="modal-button modal-button--secondary"
              onClick={onClose}
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
