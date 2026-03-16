/**
 * Main cashier page with menu, cart, and check management.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMenu } from "../hooks/useMenu";
import { useChecks } from "../hooks/useChecks";
import SearchBar from "../components/SearchBar";
import Menu from "../components/Menu";
import Cart from "../components/Cart";
import ChecksList from "../components/ChecksList";
import CoffeeMenuDrawer from "../components/CoffeeMenuDrawer";
import SecretMenu from "../components/SecretMenu";
import BottomBar from "../components/BottomBar";
import ChangeModal from "../components/ChangeModal";
import "./Kassa.css";

/**
 * Base set of categories displayed on the page.
 * @type {string[]}
 */

const BASE_CATEGORIES = ["напитки", "еда", "алкоголь", "остальное"];

/**
 * Normalizes a category label to a supported slug.
 * @param {string} value - Raw category value.
 * @returns {string} Normalized category slug.
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
 * Returns a display label for a category slug.
 * @param {string} slug - Category slug.
 * @returns {string} Display label.
 */
const categoryLabel = (slug) => {
  const map = {
    напитки: "Напитки",
    еда: "Еда",
    алкоголь: "Алкоголь",
    остальное: "Остальное",
  };
  return map[slug] || slug;
};

/**
 * Cashier page component.
 * @returns {JSX.Element} Kassa page layout.
 */
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
  const [isChangeModalOpen, setChangeModalOpen] = useState(false);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [lowPerformanceMode, setLowPerformanceMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isCompactDesktop, setIsCompactDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(width: 1280px) and (height: 960px)").matches;
  });
  const [isDesktop1100To1366, setIsDesktop1100To1366] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(
      "(min-width: 1100px) and (max-width: 1366px)",
    ).matches;
  });
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia(
      "(min-width: 1100px) and (max-width: 1366px)",
    );
    const handleChange = (event) => {
      setIsDesktop1100To1366(event.matches);
    };

    setIsDesktop1100To1366(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(width: 1280px) and (height: 960px)");
    const handleChange = (event) => {
      setIsCompactDesktop(event.matches);
    };

    setIsCompactDesktop(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    setCartDrawerOpen(false);
  }, [isDesktop]);

  const isCoffeeOverlayMode =
    !isDesktop || isCompactDesktop || isDesktop1100To1366;
  const isAnyOverlayOpen =
    isSecretMenuOpen ||
    isChangeModalOpen ||
    (isCoffeeOverlayMode && isCoffeeMenuOpen) ||
    (!isDesktop && isCartDrawerOpen);

  useEffect(() => {
    if (!isAnyOverlayOpen) {
      return undefined;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isAnyOverlayOpen]);

  useEffect(() => {
    if (!gesturesEnabled || isDesktop) {
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
        } else if (state.startInZone && !isAnyOverlayOpen) {
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
  }, [gesturesEnabled, isAnyOverlayOpen, isCartDrawerOpen, isCoffeeMenuOpen, isDesktop]);

  /**
   * Opens change modal.
   * @returns {void}
   */
  const handleAmount = () => {
    setChangeModalOpen(true);
  };

  /**
   * Saves amount given and updates change.
   * @param {number} given - Amount given by the customer.
   * @returns {void}
   */
  const handleConfirmChange = (given) => {
    updateCheckChange(given);
    setChangeModalOpen(false);
  };

  /**
   * Updates search query state.
   * @param {string} value - Search value.
   * @returns {void}
   */
  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  /**
   * Creates a new check and resets search.
   * @returns {void}
   */
  const handleCreateNewCheck = () => {
    createNewCheck();
    setSearchQuery("");
  };

  /**
   * Opens the coffee drawer when possible.
   * @returns {void}
   */
  const handleOpenCoffeeMenu = () => {
    if (isDesktop) {
      setCoffeeMenuOpen((prev) => !prev);
      return;
    }

    if (isCartDrawerOpen || isSecretMenuOpen) return;
    setCoffeeMenuOpen(true);
  };

  /**
   * Closes the coffee drawer.
   * @returns {void}
   */
  const handleCloseCoffeeMenu = () => {
    setCoffeeMenuOpen(false);
  };

  /**
   * Toggles the cart drawer visibility.
   * @returns {void}
   */
  const handleToggleCartDrawer = () => {
    if (isDesktop) return;

    if (!isCartDrawerOpen && (isCoffeeMenuOpen || isSecretMenuOpen)) {
      return;
    }
    setCartDrawerOpen((prev) => !prev);
  };

  /**
   * Toggles the secret menu visibility.
   * @returns {void}
   */
  const handleToggleSecretMenu = () => {
    if (isDesktop) {
      setSecretMenuOpen((prev) => !prev);
      return;
    }

    if (!isSecretMenuOpen && (isCoffeeMenuOpen || isCartDrawerOpen)) {
      return;
    }
    setSecretMenuOpen((prev) => !prev);
  };

  return (
    <div
      className={`container${lowPerformanceMode ? " container--lite" : ""}${
        isDesktop ? " container--desktop kassa-desktop" : ""
      }`}
    >
      <h1 onDoubleClick={handleToggleSecretMenu} role="button" title=" ">
        ~\(≧▽≦)/~
      </h1>
      <div className={`flex${isDesktop ? " flex--desktop" : ""}`}>
        {isDesktop ? (
          <>
            <aside className="desktop-column desktop-column--left">
              <div className="desktop-panel desktop-panel--cart">
                <div className="desktop-panel__title">Корзина</div>
                <Cart
                  items={activeCheck?.items || []}
                  onRemove={removeItemFromCheck}
                  onToggleFulfilled={toggleItemsFulfilled}
                />
              </div>
              <BottomBar
                activeCheck={activeCheck}
                onComplete={completeCheck}
                onAmount={handleAmount}
                isDesktop
              />
            </aside>

            <main className="desktop-column desktop-column--center">
              <div className="top top--desktop-main">
                <ChecksList
                  checks={checks}
                  activeCheckId={activeCheckId}
                  onCheckChange={setActiveCheckId}
                />
                <div className="top-actions">
                  <button
                    className="newCheck"
                    type="button"
                    onClick={handleCreateNewCheck}
                    aria-label="Новый чек"
                  >
                    +
                  </button>
                  <button
                    className="coffee-menu-button"
                    type="button"
                    onClick={handleOpenCoffeeMenu}
                    aria-label="Открыть кофейное меню"
                  >
                    ☕
                  </button>
                  <button
                    className="desktop-secret-button"
                    type="button"
                    onClick={handleToggleSecretMenu}
                    aria-label="Открыть секретное меню"
                  >
                    ⚙
                  </button>
                </div>
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
                  cartItems={activeCheck?.items || []}
                  onAddItem={addItemToCheck}
                />
              )}
            </main>

            <aside className="desktop-column desktop-column--right">
              {!isCompactDesktop && !isDesktop1100To1366 && (
                <CoffeeMenuDrawer
                  open={isCoffeeMenuOpen}
                  onClose={handleCloseCoffeeMenu}
                  checks={checks}
                  activeCheckId={activeCheckId}
                  onToggleFulfilled={toggleItemsFulfilled}
                  variant="panel"
                />
              )}
            </aside>

            {(isCompactDesktop || isDesktop1100To1366) && (
              <CoffeeMenuDrawer
                open={isCoffeeMenuOpen}
                onClose={handleCloseCoffeeMenu}
                checks={checks}
                activeCheckId={activeCheckId}
                onToggleFulfilled={toggleItemsFulfilled}
                variant="overlay"
              />
            )}
          </>
        ) : (
          <>
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
              />
              <div className="top-actions">
                <button
                  className="newCheck"
                  type="button"
                  onClick={handleCreateNewCheck}
                  aria-label="Новый чек"
                >
                  +
                </button>
                <button
                  className="coffee-menu-button"
                  type="button"
                  onClick={handleOpenCoffeeMenu}
                  aria-label="Открыть кофейное меню"
                >
                  ☕
                </button>
              </div>
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
                cartItems={activeCheck?.items || []}
                onAddItem={addItemToCheck}
              />
            )}

            <BottomBar
              activeCheck={activeCheck}
              onComplete={completeCheck}
              onAmount={handleAmount}
            />

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
          </>
        )}
      </div>
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
      <ChangeModal
        isOpen={isChangeModalOpen}
        price={activeCheck?.price || 0}
        currentChange={activeCheck?.change || 0}
        onClose={() => setChangeModalOpen(false)}
        onConfirm={handleConfirmChange}
      />
    </div>
  );
}

export default Kassa;
