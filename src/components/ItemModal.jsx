import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { categoryLabel, normalizeCategory } from "../utils/categories";
import "./ItemModal.css";

const CUSTOM_CATEGORY_VALUE = "__custom__";
const FALLBACK_CATEGORY = "остальное";
const DEFAULT_CATEGORIES = ["напитки", "еда", "алкоголь", FALLBACK_CATEGORY];

function ItemModal({
  isOpen,
  mode,
  item,
  onSave,
  onClose,
  onDeleteCategory,
  existingCategories = [],
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(FALLBACK_CATEGORY);
  const [customCategory, setCustomCategory] = useState("");
  const [show, setShow] = useState(true);
  const [isDeletingCategory, setDeletingCategory] = useState(false);

  const categoryOptions = useMemo(() => {
    const uniqueExisting = Array.from(new Set(existingCategories)).filter(
      (value) => value && !DEFAULT_CATEGORIES.includes(value),
    );

    return [
      ...DEFAULT_CATEGORIES.map((value) => ({
        value,
        label: categoryLabel(value, isEn),
      })),
      ...uniqueExisting.map((value) => ({
        value,
        label: value,
      })),
    ];
  }, [existingCategories, isEn]);

  const isRemovableCategory = useMemo(
    () =>
      category &&
      category !== CUSTOM_CATEGORY_VALUE &&
      !DEFAULT_CATEGORIES.includes(category),
    [category],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.classList.add("drawer-open");
    window.addEventListener("keydown", handleEsc);

    if (mode === "edit" && item) {
      const normalizedCategory = normalizeCategory(item.category) || FALLBACK_CATEGORY;
      const hasOption = categoryOptions.some(
        (option) => option.value === normalizedCategory,
      );

      setName(item.name || "");
      setPrice(item.price?.toString() || "");
      setCategory(hasOption ? normalizedCategory : CUSTOM_CATEGORY_VALUE);
      setCustomCategory(hasOption ? "" : normalizedCategory);
      setShow(item.show !== undefined ? item.show : true);
      setDeletingCategory(false);
    } else {
      setName("");
      setPrice("");
      setCategory(FALLBACK_CATEGORY);
      setCustomCategory("");
      setShow(true);
      setDeletingCategory(false);
    }

    return () => {
      document.body.classList.remove("drawer-open");
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, mode, item, categoryOptions, onClose]);

  const handleDeleteCategory = async () => {
    if (!isRemovableCategory || !onDeleteCategory || isDeletingCategory) return;
    const confirmed = confirm(
      isEn
        ? `Delete category "${category}"? All items in this category will be moved to "Other".`
        : `Удалить категорию "${category}"? Все позиции будут перенесены в "Остальное".`,
    );
    if (!confirmed) return;

    try {
      setDeletingCategory(true);
      await onDeleteCategory(category);
      setCategory(FALLBACK_CATEGORY);
      setCustomCategory("");
    } catch (error) {
      alert(error?.message || (isEn ? "Failed to delete category" : "Не удалось удалить категорию"));
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const priceNum = parseFloat(price);
    const nextCategory =
      category === CUSTOM_CATEGORY_VALUE
        ? normalizeCategory(customCategory)
        : normalizeCategory(category);

    if (!name.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      alert(isEn ? "Please enter valid values" : "Введите корректные данные");
      return;
    }

    if (!nextCategory) {
      alert(isEn ? "Enter a category name" : "Введите название категории");
      return;
    }

    onSave({
      name: name.trim(),
      price: priceNum,
      show,
      category: nextCategory,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="item-drawer-overlay" onClick={onClose}>
      <aside
        className="item-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-drawer-title"
      >
        <div className="item-drawer__header">
          <h3 id="item-drawer-title">
            {mode === "edit"
              ? isEn
                ? "Edit item"
                : "Редактирование"
              : isEn
                ? "New item"
                : "Новая позиция"}
          </h3>
          <button
            type="button"
            className="item-drawer__close"
            onClick={onClose}
            aria-label={isEn ? "Close" : "Закрыть"}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="item-drawer__form">
          <div className="item-drawer__scroll">
            <label className="item-drawer__label" htmlFor="item-name">
              {isEn ? "Name" : "Название"}
            </label>
            <input
              id="item-name"
              type="text"
              className="item-drawer__input"
              placeholder={isEn ? "Name" : "Название"}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />

            <label className="item-drawer__label" htmlFor="item-price">
              {isEn ? "Price" : "Цена"}
            </label>
            <input
              id="item-price"
              type="number"
              className="item-drawer__input"
              placeholder={isEn ? "Price" : "Цена"}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              min="0"
              step="0.01"
              required
            />

            <span className="item-drawer__label">{isEn ? "Category" : "Категория"}</span>
            <div
              className="item-drawer__category-grid"
              role="radiogroup"
              aria-label={isEn ? "Category" : "Категория"}
            >
              {categoryOptions.map((option) => {
                const selected = category === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`item-drawer__chip${selected ? " item-drawer__chip--active" : ""}`}
                    onClick={() => setCategory(option.value)}
                    role="radio"
                    aria-checked={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                className={`item-drawer__chip${
                  category === CUSTOM_CATEGORY_VALUE ? " item-drawer__chip--active" : ""
                }`}
                onClick={() => setCategory(CUSTOM_CATEGORY_VALUE)}
                role="radio"
                aria-checked={category === CUSTOM_CATEGORY_VALUE}
              >
                {isEn ? "+ new category" : "+ новая категория"}
              </button>
            </div>

            {category === CUSTOM_CATEGORY_VALUE && (
              <input
                type="text"
                className="item-drawer__input"
                placeholder={isEn ? "Category name" : "Название категории"}
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
                maxLength={40}
              />
            )}

            {isRemovableCategory && (
              <button
                type="button"
                className="item-drawer__delete-category"
                onClick={handleDeleteCategory}
                disabled={isDeletingCategory}
              >
                {isDeletingCategory
                  ? isEn
                    ? "Deleting category..."
                    : "Удаление категории..."
                  : isEn
                    ? "Delete selected category"
                    : "Удалить выбранную категорию"}
              </button>
            )}

            <label className="item-drawer__checkbox">
              <input
                type="checkbox"
                checked={show}
                onChange={(event) => setShow(event.target.checked)}
              />
              {isEn ? "Visible" : "Показывать в меню"}
            </label>
          </div>

          <div className="item-drawer__footer">
            <button type="submit" className="item-drawer__button item-drawer__button--primary">
              {isEn ? "Save" : "Сохранить"}
            </button>
            <button
              type="button"
              className="item-drawer__button item-drawer__button--secondary"
              onClick={onClose}
            >
              {isEn ? "Cancel" : "Отмена"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default ItemModal;
