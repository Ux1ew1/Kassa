import { useEffect, useMemo, useRef, useState } from "react";
import { useMenu } from "../hooks/useMenu";
import { useChecks } from "../hooks/useChecks";
import SearchBar from "../components/SearchBar";
import Menu from "../components/Menu";
import Cart from "../components/Cart";
import ChecksList from "../components/ChecksList";
import CoffeeMenuDrawer from "../components/CoffeeMenuDrawer";
import SecretMenu from "../components/SecretMenu";
import "./Kassa.css";

const BASE_CATEGORIES = ["напитки", "еда", "алкоголь", "остальное"];

const normalizeCategory = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (["all", "все"].includes(v)) return "все";
  if (["drink", "drinks", "напитки"].includes(v)) return "напитки";
  if (["food", "еда"].includes(v)) return "еда";
  if (["alcohol", "alcoholic", "алкоголь"].includes(v)) return "алкоголь";
  if (["other", "misc", "остальное", "другое"].includes(v)) return "остальное";
  return "остальное";
};

const categoryLabel = (slug) => {
  const map = {
    напитки: "Напитки",
    еда: "Еда",
    алкоголь: "Алкоголь",
    остальное: "Остальное",
  };
  return map[slug] || slug;
};

function Kassa() {
  const { menuItems, activeOrder, loading } = useMenu();
  const {
    checks,
    activeCheckId,
    setActiveCheckId,
    getActiveCheck,
    addItemToCheck,
    removeItemFromCheck,
    updateCheckChange,
    createNewCheck,
    completeCheck,
    toggleItemsFulfilled,
  } = useChecks();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCoffeeMenuOpen, setCoffeeMenuOpen] = useState(false);
  const [isSecretMenuOpen, setSecretMenuOpen] = useState(false);
  const [isCartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [lowPerformanceMode, setLowPerformanceMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const activeCheck = getActiveCheck();
  const swipeStateRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
    startInZone: false,
    startInTop: false,
    movedInTop: false,
  });

  const categories = useMemo(() => {
    const detected = Array.from(
      new Set(menuItems.map((item) => normalizeCategory(item.category))),
    );

    return [
      ...BASE_CATEGORIES,
      ...detected.filter(
        (cat) => cat && cat !== "все" && !BASE_CATEGORIES.includes(cat),
      ),
    ];
  }, [menuItems]);

  useEffect(() => {
    if (activeCategory && !categories.includes(activeCategory)) {
      setActiveCategory("");
    }
  }, [categories, activeCategory]);

  const isAnyMenuOpen = isCoffeeMenuOpen || isCartDrawerOpen || isSecretMenuOpen;

  useEffect(() => {
    if (!gesturesEnabled) {
      swipeStateRef.current.active = false;
      return;
    }

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const width = window.innerWidth || 0;
      const zoneLeft = width * 0.15;
      const zoneRight = width * 0.85;
      const target = event.target;
      const startInTop =
        target instanceof Element && Boolean(target.closest(".top"));
      swipeStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        startInZone: touch.clientX >= zoneLeft && touch.clientX <= zoneRight,
        startInTop,
        movedInTop: false,
      };
    };

    const handleTouchMove = (event) => {
      const state = swipeStateRef.current;
      if (!state.active || !state.startInTop) return;
      const touch = event.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        state.movedInTop = true;
      }
    };

    const handleTouchEnd = (event) => {
      const state = swipeStateRef.current;
      if (!state.active) return;

      if (state.startInTop && state.movedInTop) {
        swipeStateRef.current.active = false;
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const threshold = 60;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal && Math.abs(deltaX) >= threshold) {
        if (isCartDrawerOpen && deltaX < 0) {
          setCartDrawerOpen(false);
        } else if (isCoffeeMenuOpen && deltaX > 0) {
          setCoffeeMenuOpen(false);
        } else if (state.startInZone && !isAnyMenuOpen) {
          if (deltaX > 0) {
            setCartDrawerOpen(true);
          } else {
            setCoffeeMenuOpen(true);
          }
        }
      }

      swipeStateRef.current.active = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gesturesEnabled, isAnyMenuOpen, isCartDrawerOpen, isCoffeeMenuOpen]);

  const handleAmount = () => {
    const input = prompt("Введите сумму клиента: ");
    if (input === null) return;

    const given = parseFloat(input);
    if (!isNaN(given) && given >= 0) {
      updateCheckChange(given);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  const handleCreateNewCheck = () => {
    createNewCheck();
    setSearchQuery("");
  };

  const handleOpenCoffeeMenu = () => {
    if (isCartDrawerOpen || isSecretMenuOpen) return;
    setCoffeeMenuOpen(true);
  };

  const handleCloseCoffeeMenu = () => {
    setCoffeeMenuOpen(false);
  };

  const handleToggleCartDrawer = () => {
    if (!isCartDrawerOpen && (isCoffeeMenuOpen || isSecretMenuOpen)) {
      return;
    }
    setCartDrawerOpen((prev) => !prev);
  };

  const handleToggleSecretMenu = () => {
    if (!isSecretMenuOpen && (isCoffeeMenuOpen || isCartDrawerOpen)) {
      return;
    }
    setSecretMenuOpen((prev) => !prev);
  };

  return (
    <div className={`container${lowPerformanceMode ? " container--lite" : ""}`}>
      <h1 onDoubleClick={handleToggleSecretMenu} role="button" title=" ">
        ~\(≧▽≦)/~
      </h1>
      <div className="flex">
        <div className="top">
          <button
            className="cart-drawer-button"
            type="button"
            onClick={handleToggleCartDrawer}
            aria-label="Корзина"
          >
            К
          </button>
          <ChecksList
            checks={checks}
            activeCheckId={activeCheckId}
            onCheckChange={setActiveCheckId}
            onCreateNew={handleCreateNewCheck}
            onCompleteActiveCheck={completeCheck}
          />
          <button
            className="coffee-menu-button"
            type="button"
            onClick={handleOpenCoffeeMenu}
            aria-label="Открыть кофейное меню"
          >
            ☕
          </button>
        </div>

        <SearchBar value={searchQuery} onSearch={handleSearch} />
        <div className="categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-button${
                activeCategory === category ? " category-button--active" : ""
              }`}
              onClick={() =>
                setActiveCategory((prev) => (prev === category ? "" : category))
              }
            >
              {categoryLabel(category)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="menu">
            <div className="menu-placeholder">Загрузка меню...</div>
          </div>
        ) : (
          <Menu
            menuItems={menuItems}
            activeOrder={activeOrder}
            searchQuery={searchQuery}
            activeCategory={activeCategory}
            // Передаем текущие позиции чека, чтобы считать количество на карточках
            cartItems={activeCheck?.items || []}
            onAddItem={addItemToCheck}
          />
        )}

        <div className="bottom">
          <button
            className="done-button"
            onClick={completeCheck}
            aria-label="Завершить чек"
          >
            ✓
          </button>
          <span className="price">Цена: {activeCheck?.price || 0} руб.</span>
          <span className="amount">Сдача: {activeCheck?.change || 0} руб.</span>
          <button
            className="amountButton"
            onClick={handleAmount}
            aria-label="Ввести сумму"
          >
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 21h2v-3h6v-2h-6v-2h4.5c2.757 0 5-2.243 5-5s-2.243-5-5-5H9a1 1 0 0 0-1 1v7H5v2h3v2H5v2h3v3zm2-15h4.5c1.654 0 3 1.346 3 3s-1.346 3-3 3H10V6z" />
            </svg>
          </button>
        </div>

        <Cart
          items={activeCheck?.items || []}
          onRemove={removeItemFromCheck}
          onToggleFulfilled={toggleItemsFulfilled}
        />
        <div
          className={`cart-drawer${
            isCartDrawerOpen ? " cart-drawer--open" : ""
          }`}
        >
          <div className="cart-drawer__header">
            <span className="cart-drawer__title">Корзина товаров</span>
            <button
              className="cart-drawer__close"
              type="button"
              onClick={handleToggleCartDrawer}
              aria-label="Корзина товаров"
            >
              x
            </button>
          </div>
          <Cart
            items={activeCheck?.items || []}
            onRemove={removeItemFromCheck}
            onToggleFulfilled={toggleItemsFulfilled}
          />
        </div>
        {isCartDrawerOpen && (
          <div
            className="cart-drawer__backdrop"
            onClick={handleToggleCartDrawer}
          />
        )}
        <CoffeeMenuDrawer
          open={isCoffeeMenuOpen}
          onClose={handleCloseCoffeeMenu}
          checks={checks}
          activeCheckId={activeCheckId}
          onToggleFulfilled={toggleItemsFulfilled}
        />
        <SecretMenu
          open={isSecretMenuOpen}
          onClose={handleToggleSecretMenu}
          gesturesEnabled={gesturesEnabled}
          onToggleGestures={() => setGesturesEnabled((prev) => !prev)}
          lowPerformanceMode={lowPerformanceMode}
          onToggleLowPerformanceMode={() =>
            setLowPerformanceMode((prev) => !prev)
          }
        />
      </div>
    </div>
  );
}

export default Kassa;
