import { useMemo } from "react";
import "./CoffeeMenuDrawer.css";

const VIEW_MODES = {
  LIST: "list",
  CARDS: "cards",
};

const COFFEE_KEYWORDS = [
  "коф",
  "капуч",
  "америк",
  "эспресс",
  "латт",
  "раф",
  "макиато",
];

function isCoffeeItem(name = "") {
  const normalized = name.toLowerCase();
  return COFFEE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getCoffeeLetter(name = "") {
  const normalized = name.toLowerCase();

  if (normalized.includes("капуч")) return "К";
  if (normalized.includes("амер")) return "А";
  if (normalized.includes("эспресс")) return "Э";
  if (normalized.includes("латт")) return "Л";
  if (normalized.includes("раф")) return "Р";
  if (normalized.includes("макиато")) return "М";

  const firstLetter = normalized.trim().charAt(0);
  return firstLetter ? firstLetter.toUpperCase() : "К";
}

function groupItems(items = []) {
  const map = new Map();

  items.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, {
        id: item.id,
        name: item.name,
        quantity: 0,
      });
    }
    const group = map.get(item.id);
    group.quantity += 1;
  });

  return Array.from(map.values());
}

function CoffeeMenuDrawer({
  open,
  onClose,
  checks = [],
  activeCheckId,
  viewMode = VIEW_MODES.LIST,
  onToggleFulfilled,
}) {
  const preparedChecks = useMemo(
    () =>
      checks.map((check) => {
        const withIndex = (check.items || []).map((item, index) => ({
          ...item,
          index,
        }));

        const coffeeItems = withIndex.filter((item) =>
          isCoffeeItem(item?.name || "")
        );

        return {
          id: check.id,
          groupedItems: groupItems(coffeeItems),
          squareItems: coffeeItems.map((item) => ({
            key: `${check.id}-${item.index}`,
            name: item.name,
            letter: getCoffeeLetter(item.name),
            fulfilled: Boolean(item.fulfilled),
            index: item.index,
          })),
        };
      }),
    [checks]
  );

  if (!open) {
    return null;
  }

  const handleSquareToggle = (checkId, itemIndex, fulfilled) => {
    onToggleFulfilled?.([itemIndex], fulfilled, checkId);
  };

  return (
    <div className="coffee-menu-overlay" onClick={onClose}>
      <div
        className="coffee-menu-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="coffee-menu-header">
          <div>
            <div className="coffee-menu-title">Кофейные позиции</div>
            <div className="coffee-menu-subtitle">
              {preparedChecks.length > 0
                ? "Дублируем кофе по каждому чеку"
                : "Чеки отсутствуют"}
            </div>
          </div>
          <button
            className="coffee-menu-close"
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
          >
            ✕
          </button>
        </div>

        <div className="coffee-menu-mode-tag">
          Режим: {viewMode === VIEW_MODES.LIST ? "Список" : "Карточки"}
        </div>

        <div className="coffee-menu-list">
          {preparedChecks.length === 0 && (
            <div className="coffee-menu-empty">
              Создайте чек, чтобы увидеть его содержимое
            </div>
          )}

          {preparedChecks.map((check) => (
            <div
              key={check.id}
              className={`coffee-menu-row${
                check.id === activeCheckId ? " coffee-menu-row--active" : ""
              }`}
            >
              <div className="coffee-menu-check">
                <span className="coffee-menu-check-label">Чек</span>
                <span className="coffee-menu-check-number">№{check.id}</span>
              </div>

              {viewMode === VIEW_MODES.LIST ? (
                <div className="coffee-menu-coffee">
                  {check.groupedItems.length === 0 ? (
                    <span className="coffee-menu-empty-inline">Кофе нет</span>
                  ) : (
                    check.groupedItems.map((item) => (
                      <span
                        key={`${check.id}-${item.id}`}
                        className="coffee-menu-chip"
                      >
                        {item.name}
                        <span className="coffee-menu-chip-qty">
                          x{item.quantity}
                        </span>
                      </span>
                    ))
                  )}
                </div>
              ) : (
                <div className="coffee-menu-squares">
                  {check.squareItems.length === 0 ? (
                    <span className="coffee-menu-empty-inline">Кофе нет</span>
                  ) : (
                    check.squareItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`coffee-square${
                          item.fulfilled ? " coffee-square--fulfilled" : ""
                        }`}
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
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoffeeMenuDrawer;
