import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./ItemModal.css";

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
  const { language } = useLanguage();
  const isEn = language === "en";
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("остальное");
  const [show, setShow] = useState(true);

  const categoryOptions = useMemo(
    () => [
      { value: "напитки", label: isEn ? "Drinks" : "Напитки" },
      { value: "еда", label: isEn ? "Food" : "Еда" },
      { value: "алкоголь", label: isEn ? "Alcohol" : "Алкоголь" },
      { value: "остальное", label: isEn ? "Other" : "Остальное" },
    ],
    [isEn],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && item) {
      setName(item.name || "");
      setPrice(item.price?.toString() || "");
      setCategory(normalizeCategory(item.category));
      setShow(item.show !== undefined ? item.show : true);
      return;
    }
    setName("");
    setPrice("");
    setCategory("остальное");
    setShow(true);
  }, [isOpen, mode, item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    if (!name.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      alert(isEn ? "Please enter valid values" : "Введите корректные данные");
      return;
    }
    onSave({ name: name.trim(), price: priceNum, show, category: normalizeCategory(category) });
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === "edit" ? (isEn ? "Edit item" : "Редактирование позиции") : isEn ? "New item" : "Новая позиция"}</h3>
        <form onSubmit={handleSubmit}>
          <span className="modal-label">{isEn ? "Name" : "Название"}</span>
          <input
            type="text"
            className="modal-input"
            placeholder={isEn ? "Name" : "Название"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <span className="modal-label">{isEn ? "Price" : "Стоимость"}</span>
          <input
            type="number"
            className="modal-input"
            placeholder={isEn ? "Price" : "Цена"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            min="0"
            step="0.01"
            required
          />
          <label className="modal-label" htmlFor="category">
            {isEn ? "Category" : "Категория"}
          </label>
          <select
            id="category"
            className="modal-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
            />
            {isEn ? "Visible" : "Активна"}
          </label>
          <div className="modal-actions">
            <button type="submit" className="modal-button">
              {isEn ? "Save" : "Сохранить"}
            </button>
            <button type="button" className="modal-button modal-button--secondary" onClick={onClose}>
              {isEn ? "Cancel" : "Отмена"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ItemModal;

