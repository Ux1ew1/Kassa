import { useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
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

function getCoffeeLetter(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("капуч") || normalized.includes("capp")) return "C";
  if (normalized.includes("амер") || normalized.includes("americano"))
    return "A";
  if (normalized.includes("эспресс") || normalized.includes("espresso"))
    return "E";
  if (normalized.includes("латт") || normalized.includes("latte")) return "L";
  if (normalized.includes("раф")) return "R";
  if (normalized.includes("макиато") || normalized.includes("macchiato"))
    return "M";
  const firstLetter = normalized.trim().charAt(0);
  return firstLetter ? firstLetter.toUpperCase() : "C";
}

function CoffeeMenuDrawer({
  open,
  onClose,
  checks = [],
  activeCheckId,
  onToggleFulfilled,
  variant = "overlay",
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const preparedChecks = useMemo(
    () =>
      checks
        .map((check) => {
          const withIndex = (check.items || []).map((item, index) => ({
            ...item,
            index,
          }));
          const coffeeItems = withIndex.filter((item) =>
            isCoffeeItem(item?.name || ""),
          );
          return {
            id: check.id,
            hasCoffee: coffeeItems.length > 0,
            squareItems: coffeeItems.map((item) => ({
              key: `${check.id}-${item.index}`,
              name: item.name,
              letter: getCoffeeLetter(item.name),
              fulfilled: Boolean(item.fulfilled),
              index: item.index,
            })),
          };
        })
        .filter((check) => check.hasCoffee),
    [checks],
  );

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
        <div>
          <div className="coffee-menu-title">
            {isEn ? "Coffee items" : "Кофейные позиции"}
          </div>
          <div className="coffee-menu-subtitle">
            {preparedChecks.length > 0
              ? isEn
                ? "Coffee grouped by checks"
                : "Дублируем кофе по каждому чеку"
              : isEn
                ? "No checks yet"
                : "Чеки отсутствуют"}
          </div>
        </div>
        <button
          className="coffee-menu-close"
          type="button"
          onClick={onClose}
          aria-label={isEn ? "Close menu" : "Закрыть меню"}
        >
          ✕
        </button>
      </div>

      <div className="coffee-menu-list">
        {preparedChecks.length === 0 && (
          <div className="coffee-menu-empty">
            {isEn
              ? "All drinks from the coffee category will be displayed here"
              : `Здесь будут отображаться все напитки из категории "кофе"`}
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
                  {isEn ? "No coffee" : "Кофе нет"}
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
