import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { categoryLabel, normalizeCategory } from "../utils/categories";
import "./CoffeeMenuDrawer.css";

const COFFEE_KEYWORDS = [
  "коф",
  "капуч",
  "америк",
  "эспресс",
  "латт",
  "раф",
  "макиато",
  "coffee",
  "capp",
  "americano",
  "espresso",
  "latte",
  "raf",
  "macchiato",
];

function isCoffeeItem(name = "") {
  const normalized = name.toLowerCase();
  return COFFEE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getItemLetter(name = "") {
  const firstLetter = name.trim().charAt(0);
  return firstLetter ? firstLetter.toUpperCase() : "C";
}

function CoffeeMenuDrawer({
  open,
  onClose,
  checks = [],
  activeCheckId,
  onToggleFulfilled,
  availableCategories = [],
  selectedCategory = "",
  onCategoryChange,
  showSwipeHint = false,
  variant = "overlay",
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [isCategorySelectOpen, setCategorySelectOpen] = useState(false);
  const normalizedSelectedCategory = normalizeCategory(selectedCategory);

  const categoryOptions = useMemo(() => {
    const unique = new Set();
    availableCategories.forEach((category) => {
      const normalized = normalizeCategory(category);
      if (normalized) unique.add(normalized);
    });
    return Array.from(unique);
  }, [availableCategories]);

  useEffect(() => {
    if (!open) {
      setCategorySelectOpen(false);
    }
  }, [open]);

  const preparedChecks = useMemo(() => {
    const selectedDrinksCategory = normalizeCategory("drinks");

    const isItemFromSelectedCategory = (item) => {
      if (!normalizedSelectedCategory) {
        return isCoffeeItem(item?.name || "");
      }

      const itemCategory = normalizeCategory(item?.category);
      if (itemCategory) {
        return itemCategory === normalizedSelectedCategory;
      }

      return (
        normalizedSelectedCategory === selectedDrinksCategory &&
        isCoffeeItem(item?.name || "")
      );
    };

    return checks
      .map((check) => {
        const withIndex = (check.items || []).map((item, index) => ({
          ...item,
          index,
        }));
        const matchingItems = withIndex.filter((item) =>
          isItemFromSelectedCategory(item),
        );

        return {
          id: check.id,
          hasItems: matchingItems.length > 0,
          squareItems: matchingItems.map((item) => ({
            key: `${check.id}-${item.index}`,
            name: item.name,
            letter: getItemLetter(item.name),
            fulfilled: Boolean(item.fulfilled),
            index: item.index,
          })),
        };
      })
      .filter((check) => check.hasItems);
  }, [checks, normalizedSelectedCategory]);

  if (!open) return null;

  const handleSquareToggle = (checkId, itemIndex, fulfilled) => {
    onToggleFulfilled?.([itemIndex], fulfilled, checkId);
  };

  const content = (
    <div
      className={`coffee-menu-panel${variant === "panel" ? " coffee-menu-panel--static" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="coffee-menu-header">
        <div className="coffee-menu-header__title-wrap">
          <div className="coffee-menu-title">
            {isEn ? "Coffee items" : "Кофейные позиции"}
          </div>
          <div className="coffee-menu-subtitle">
            {isEn ? "Category:" : "Категория:"}{" "}
            {categoryLabel(normalizedSelectedCategory, isEn)}
          </div>
        </div>

        <div className="coffee-menu-header__actions">
          <button
            className="coffee-menu-category-toggle"
            type="button"
            onClick={() => setCategorySelectOpen((prev) => !prev)}
            aria-expanded={isCategorySelectOpen}
            disabled={categoryOptions.length === 0}
            aria-label={
              isEn ? "Change category" : "Изменить выбранную категорию"
            }
          >
            ✏️
          </button>
          <button
            className="coffee-menu-close"
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close menu" : "Закрыть меню"}
          >
            ×
          </button>
        </div>
      </div>

      {isCategorySelectOpen && (
        <div className="coffee-menu-category-picker">
          <select
            className="coffee-menu-category-select"
            value={normalizedSelectedCategory || categoryOptions[0] || ""}
            onChange={(event) => {
              onCategoryChange?.(event.target.value);
              setCategorySelectOpen(false);
            }}
            aria-label={isEn ? "Category selector" : "Выбор категории"}
          >
            {categoryOptions.map((normalizedCategory) => (
              <option key={normalizedCategory} value={normalizedCategory}>
                {categoryLabel(normalizedCategory, isEn)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="coffee-menu-list">
        {preparedChecks.length === 0 && (
          <div className="coffee-menu-empty">
            {isEn
              ? "Items from the selected category will be displayed here"
              : "Здесь будут отображаться товары из выбранной категории"}
            {showSwipeHint && (
              <div className="coffee-menu-swipe-hint">
                {isEn
                  ? "This menu can be opened with a swipe left"
                  : "Это меню можно открыть свайпом влево"}
              </div>
            )}
          </div>
        )}

        {preparedChecks.map((check) => (
          <div
            key={check.id}
            className={`coffee-menu-row${check.id === activeCheckId ? " coffee-menu-row--active" : ""}`}
          >
            <div className="coffee-menu-check">
              <span className="coffee-menu-check-label">
                {isEn ? "Check" : "Чек"}
              </span>
              <span className="coffee-menu-check-number">№{check.id}</span>
            </div>

            <div className="coffee-menu-squares">
              {check.squareItems.length === 0 ? (
                <span className="coffee-menu-empty-inline">
                  {isEn ? "No items" : "Товаров нет"}
                </span>
              ) : (
                check.squareItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`coffee-square${item.fulfilled ? " coffee-square--fulfilled" : ""}`}
                    onClick={() =>
                      handleSquareToggle(check.id, item.index, !item.fulfilled)
                    }
                    title={item.name}
                    aria-label={item.name}
                  >
                    <span className="coffee-square-letter">{item.letter}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (variant === "panel") return content;
  return (
    <div className="coffee-menu-overlay" onClick={onClose}>
      {content}
    </div>
  );
}

export default CoffeeMenuDrawer;
