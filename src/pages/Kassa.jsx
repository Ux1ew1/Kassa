/**
 * Main cashier page with menu, cart, and check management.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMenu } from "../hooks/useMenu";
import {
  createRoom,
  fetchMyRooms,
  fetchRoomMembers,
  inviteToRoom,
  joinRoomByCode,
  leaveRoom,
  renameRoom,
  updateRoomMemberRole,
  kickRoomMember,
} from "../utils/api";
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

const BASE_CATEGORIES = [];
const roleLabel = (role) => {
  if (role === "owner") return "👑 owner";
  if (role === "admin") return "🛠 admin";
  return "user";
};

const userBadge = (role) => {
  if (role === "owner") return "👑 ";
  if (role === "admin") return "🛠 ";
  return "";
};

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
function Kassa({ user, onLogout, activeRoom, onRoomChange }) {
  const { menuItems, activeOrder, loading } = useMenu(activeRoom?.id, user?.id);
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
  const [isRoomModalOpen, setRoomModalOpen] = useState(false);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [roomDraft, setRoomDraft] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteLogin, setInviteLogin] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviteError, setInviteError] = useState("");
  const [roomRequestPending, setRoomRequestPending] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
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
    const loadRooms = async () => {
      if (!user?.id) {
        setRooms([]);
        return;
      }
      setRoomsLoading(true);
      setRoomError("");
      try {
        const loadedRooms = await fetchMyRooms(user.id);
        setRooms(loadedRooms);
        if (!activeRoom?.id && loadedRooms.length > 0) {
          onRoomChange(loadedRooms[0]);
        }
      } catch (error) {
        setRoomError(error.message || "Не удалось загрузить комнаты");
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();
  }, [user?.id]);

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
    isRoomModalOpen ||
    isInviteModalOpen ||
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

  const handleOpenRoomModal = () => {
    if (roomRequestPending) return;
    setRoomDraft(activeRoom?.name || "");
    setInviteError("");
    setRoomError("");
    setRoomModalOpen(true);
  };

  const handleOpenInviteModal = () => {
    if (roomRequestPending) return;
    setInviteError("");
    setJoinCode("");
    setInviteModalOpen(true);
  };

  const loadRoomMembers = async (roomId) => {
    if (!roomId || !user?.id) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    setMembersError("");
    try {
      const loadedMembers = await fetchRoomMembers(roomId, user.id);
      setMembers(loadedMembers);
    } catch (error) {
      setMembersError(error.message || "Не удалось загрузить участников");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCloseRoomModal = () => {
    if (roomRequestPending) return;
    setRoomModalOpen(false);
  };

  const handleCloseInviteModal = () => {
    if (roomRequestPending) return;
    setInviteModalOpen(false);
  };

  const handleSaveRoom = async () => {
    if (roomRequestPending) return;
    const nextName = roomDraft.trim();
    if (!nextName) return;

    try {
      setRoomRequestPending(true);
      const payload = await createRoom(nextName, user.id);
      const createdRoom = payload?.room;
      if (!createdRoom) {
        throw new Error("Не удалось создать комнату");
      }
      const nextRooms = [createdRoom, ...rooms.filter((room) => room.id !== createdRoom.id)];
      setRooms(nextRooms);
      onRoomChange(createdRoom);
      setRoomDraft(createdRoom.name);
      setRoomError("");
    } catch (error) {
      setRoomError(error.message || "Не удалось создать комнату");
      return;
    } finally {
      setRoomRequestPending(false);
    }
  };

  const handleRenameRoom = async () => {
    if (!activeRoom?.id || roomRequestPending) return;
    const nextName = roomDraft.trim();
    if (!nextName) return;

    try {
      setRoomRequestPending(true);
      setRoomError("");
      const payload = await renameRoom(activeRoom.id, user.id, nextName);
      const updatedRoom = payload?.room;
      if (!updatedRoom) throw new Error("Не удалось изменить комнату");

      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      const active = loadedRooms.find((room) => room.id === updatedRoom.id) || updatedRoom;
      onRoomChange(active);
      setRoomDraft(active.name);
    } catch (error) {
      setRoomError(error.message || "Не удалось изменить название комнаты");
    } finally {
      setRoomRequestPending(false);
    }
  };

  const handleSelectRoom = async (room) => {
    if (roomRequestPending) return;
    onRoomChange(room);
    setRoomDraft(room.name);
    await loadRoomMembers(room.id);
  };

  const handleInviteToRoom = async () => {
    if (!activeRoom?.id) return;
    const login = inviteLogin.trim();
    if (!login) return;

    try {
      setInviteError("");
      await inviteToRoom(activeRoom.id, user.id, login, inviteRole);
      setInviteLogin("");
      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      await loadRoomMembers(activeRoom.id);
    } catch (error) {
      setInviteError(error.message || "Не удалось пригласить пользователя");
    }
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || roomRequestPending) return;

    try {
      setRoomRequestPending(true);
      setInviteError("");
      const payload = await joinRoomByCode(user.id, code);
      const joinedRoom = payload?.room;
      if (!joinedRoom) throw new Error("Не удалось присоединиться к комнате");

      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      const active = loadedRooms.find((room) => room.id === joinedRoom.id) || joinedRoom;
      onRoomChange(active);
      setInviteModalOpen(false);
    } catch (error) {
      setInviteError(error.message || "Не удалось войти в комнату");
    } finally {
      setRoomRequestPending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom?.id || !user?.id || roomRequestPending) return;
    try {
      setRoomRequestPending(true);
      setRoomError("");
      await leaveRoom(activeRoom.id, user.id);
      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      onRoomChange(loadedRooms[0] || null);
      await loadRoomMembers(loadedRooms[0]?.id);
    } catch (error) {
      setRoomError(error.message || "Не удалось выйти из комнаты");
    } finally {
      setRoomRequestPending(false);
    }
  };

  const canManageCurrentRoom =
    activeRoom?.id && (activeRoom?.role === "owner" || activeRoom?.role === "admin");

  const handleUpdateMemberRole = async (memberUserId, role) => {
    if (!activeRoom?.id || !user?.id || roomRequestPending) return;
    try {
      setRoomRequestPending(true);
      await updateRoomMemberRole(activeRoom.id, user.id, memberUserId, role);
      await loadRoomMembers(activeRoom.id);
      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      const updatedActive = loadedRooms.find((room) => room.id === activeRoom.id);
      if (updatedActive) {
        onRoomChange(updatedActive);
      }
    } catch (error) {
      setMembersError(error.message || "Не удалось обновить роль");
    } finally {
      setRoomRequestPending(false);
    }
  };

  const handleKickMember = async (memberUserId) => {
    if (!activeRoom?.id || !user?.id || roomRequestPending) return;
    try {
      setRoomRequestPending(true);
      await kickRoomMember(activeRoom.id, user.id, memberUserId);
      await loadRoomMembers(activeRoom.id);
    } catch (error) {
      setMembersError(error.message || "Не удалось исключить пользователя");
    } finally {
      setRoomRequestPending(false);
    }
  };

  useEffect(() => {
    if (!isRoomModalOpen || !activeRoom?.id) return;
    loadRoomMembers(activeRoom.id);
  }, [isRoomModalOpen, activeRoom?.id, user?.id]);

  return (
    <div
      className={`container${lowPerformanceMode ? " container--lite" : ""}${
        isDesktop ? " container--desktop kassa-desktop" : ""
      }`}
    >
      <div className="app-header">
        <h1 onDoubleClick={handleToggleSecretMenu} role="button" title=" ">
          ~\(≧▽≦)/~
        </h1>
        <div className="app-header__right">
          <div className="app-header__meta">
            <span className="app-header__user">
              {`${userBadge(activeRoom?.role)}${user?.login || "Гость"}`}
            </span>
            <span className="app-header__room">
              {activeRoom?.name ? activeRoom.name : "Комната не выбрана"}
            </span>
          </div>
          <button
            className="app-header__logout"
            type="button"
            onClick={onLogout}
            aria-label="Выйти"
          >
            Выйти
          </button>
        </div>
      </div>
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
                    className="room-button"
                    type="button"
                    onClick={handleOpenInviteModal}
                    aria-label="Приглашение"
                    disabled={roomRequestPending}
                  >
                    Пригласить
                  </button>
                  <button
                    className="room-button"
                    type="button"
                    onClick={handleOpenRoomModal}
                    aria-label="Комната"
                    disabled={roomRequestPending}
                  >
                    {activeRoom?.name ? activeRoom.name : "Комната"}
                  </button>
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
              {!activeRoom?.id ? (
                <div className="menu room-empty">
                  <div className="menu-placeholder room-empty__text">
                    Меню пустое. Создайте комнату, чтобы продолжить.
                  </div>
                  <button
                    className="room-empty__button"
                    type="button"
                    onClick={handleOpenRoomModal}
                    disabled={roomRequestPending}
                  >
                    Задать комнату
                  </button>
                </div>
              ) : (
                <>
                  <SearchBar value={searchQuery} onSearch={handleSearch} />
                  {categories.length > 0 && (
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
                  )}
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
                </>
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
                  className="room-button"
                  type="button"
                  onClick={handleOpenInviteModal}
                  aria-label="Приглашение"
                  disabled={roomRequestPending}
                >
                  Пригласить
                </button>
                <button
                  className="room-button"
                  type="button"
                  onClick={handleOpenRoomModal}
                  aria-label="Комната"
                  disabled={roomRequestPending}
                >
                  {activeRoom?.name ? activeRoom.name : "Комната"}
                </button>
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

            {!activeRoom?.id ? (
              <div className="menu room-empty">
                <div className="menu-placeholder room-empty__text">
                  Меню пустое. Создайте комнату, чтобы продолжить.
                </div>
                <button
                  className="room-empty__button"
                  type="button"
                  onClick={handleOpenRoomModal}
                  disabled={roomRequestPending}
                >
                  Задать комнату
                </button>
              </div>
            ) : (
              <>
                <SearchBar value={searchQuery} onSearch={handleSearch} />
                {categories.length > 0 && (
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
                )}

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
              </>
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
      {isRoomModalOpen && (
        <div
          className="room-modal-backdrop"
          onClick={() => {
            if (!roomRequestPending) handleCloseRoomModal();
          }}
        >
          <div className="room-modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="room-modal__title">Комнаты</h2>
            {roomsLoading ? (
              <div className="room-modal__note">Загрузка комнат...</div>
            ) : (
              <div className="room-list">
                {rooms.length === 0 ? (
                  <div className="room-modal__note">Вы пока не состоите ни в одной комнате.</div>
                ) : (
                  rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`room-list__item${
                        activeRoom?.id === room.id ? " room-list__item--active" : ""
                      }`}
                      onClick={() => handleSelectRoom(room)}
                      disabled={roomRequestPending}
                    >
                      {room.name} · {roleLabel(room.role)}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="room-modal__divider" />
            <div className="room-modal__subtitle">Участники комнаты</div>
            {membersLoading ? (
              <div className="room-modal__note">Загрузка участников...</div>
            ) : members.length === 0 ? (
              <div className="room-modal__note">Список участников пуст.</div>
            ) : (
              <div className="member-list">
                {members.map((member) => {
                  const isOwner = member.role === "owner";
                  const isSelf = member.userId === user?.id;
                  return (
                    <div key={member.userId} className="member-list__item">
                      <div className="member-list__meta">
                        <span className="member-list__name">{member.login}</span>
                        <span className="member-list__role">{roleLabel(member.role)}</span>
                      </div>
                      {canManageCurrentRoom ? (
                        <div className="member-list__actions">
                          <select
                            className="member-list__select"
                            value={member.role}
                            onChange={(event) =>
                              handleUpdateMemberRole(member.userId, event.target.value)
                            }
                            disabled={roomRequestPending || isOwner}
                          >
                            <option value="owner">owner</option>
                            <option value="admin">admin</option>
                            <option value="user">user</option>
                          </select>
                          <button
                            type="button"
                            className="member-list__kick"
                            onClick={() => handleKickMember(member.userId)}
                            disabled={roomRequestPending || isOwner || isSelf}
                          >
                            Кик
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {membersError ? <div className="room-modal__error">{membersError}</div> : null}

            {activeRoom?.id ? (
              <>
                <div className="room-modal__divider" />
                <div className="room-modal__subtitle">
                  Короткий ID комнаты: <strong>{activeRoom?.code || "—"}</strong>
                </div>
                <div className="room-modal__subtitle">Название комнаты</div>
                <input
                  className="room-modal__input"
                  type="text"
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  placeholder="Например: VIP 1"
                  autoFocus
                  disabled={roomRequestPending}
                />
                {roomError ? <div className="room-modal__error">{roomError}</div> : null}
                {canManageCurrentRoom ? (
                  <div className="room-modal__actions">
                    <button
                      type="button"
                      onClick={handleRenameRoom}
                      disabled={roomRequestPending}
                    >
                      Сохранить название
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="room-modal__divider" />
                <div className="room-modal__subtitle">Создать новую комнату</div>
                <input
                  className="room-modal__input"
                  type="text"
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  placeholder="Например: VIP 1"
                  autoFocus
                  disabled={roomRequestPending}
                />
                {roomError ? <div className="room-modal__error">{roomError}</div> : null}
              </>
            )}

            <div className="room-modal__actions">
              <button type="button" onClick={handleCloseRoomModal} disabled={roomRequestPending}>
                Отмена
              </button>
              {activeRoom?.id ? (
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  disabled={roomRequestPending}
                >
                  Выйти из комнаты
                </button>
              ) : null}
              <button type="button" onClick={handleSaveRoom} disabled={roomRequestPending}>
                {roomRequestPending ? (
                  <>
                    <span className="room-spinner" aria-hidden="true" />
                    {activeRoom?.id ? "Сохранение..." : "Создание..."}
                  </>
                ) : (
                  activeRoom?.id ? "Создать новую" : "Создать"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {isInviteModalOpen && (
        <div
          className="room-modal-backdrop"
          onClick={() => {
            if (!roomRequestPending) handleCloseInviteModal();
          }}
        >
          <div className="room-modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="room-modal__title">Приглашение / Вход</h2>
            {activeRoom?.id ? (
              <div className="room-modal__subtitle">
                ID текущей комнаты: <strong>{activeRoom?.code || "—"}</strong>
              </div>
            ) : (
              <div className="room-modal__note">Текущая комната не выбрана.</div>
            )}

            <div className="room-modal__divider" />
            <div className="room-modal__subtitle">Войти в комнату по ID</div>
            <input
              className="room-modal__input"
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Например: A7K9Q2"
              disabled={roomRequestPending}
            />
            <div className="room-modal__actions">
              <button type="button" onClick={handleJoinByCode} disabled={roomRequestPending}>
                Войти
              </button>
            </div>

            {canManageCurrentRoom ? (
              <>
                <div className="room-modal__divider" />
                <div className="room-modal__subtitle">Пригласить по логину</div>
                <input
                  className="room-modal__input"
                  type="text"
                  value={inviteLogin}
                  onChange={(event) => setInviteLogin(event.target.value)}
                  placeholder="Логин пользователя"
                  disabled={roomRequestPending}
                />
                <select
                  className="room-modal__input"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  disabled={roomRequestPending}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <div className="room-modal__actions">
                  <button type="button" onClick={handleInviteToRoom} disabled={roomRequestPending}>
                    Пригласить
                  </button>
                </div>
              </>
            ) : null}

            {inviteError ? <div className="room-modal__error">{inviteError}</div> : null}

            <div className="room-modal__actions">
              <button type="button" onClick={handleCloseInviteModal} disabled={roomRequestPending}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Kassa;
