/**
 * Main cashier page with menu, cart, and check management.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useLanguage } from "../contexts/LanguageContext";
import {
  categoryLabel,
  collectCategories,
  normalizeCategory,
} from "../utils/categories";
import "./Kassa.css";
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
 * Cashier page component.
 * @returns {JSX.Element} Kassa page layout.
 */
function Kassa({ user, onLogout, activeRoom, onRoomChange }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === "en";
  const tr = (ru, en) => (isEn ? en : ru);
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
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isCartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [isChangeModalOpen, setChangeModalOpen] = useState(false);
  const [isRoomModalOpen, setRoomModalOpen] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState("manage");
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalMode, setInviteModalMode] = useState("invite");
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [roomDraft, setRoomDraft] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteLogin, setInviteLogin] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviteError, setInviteError] = useState("");
  const [inviteActionType, setInviteActionType] = useState("");
  const [roomRequestPending, setRoomRequestPending] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [coffeeDrawerCategory, setCoffeeDrawerCategory] = useState(() =>
    normalizeCategory("drinks"),
  );
  const [isMobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
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
    return window.matchMedia("(min-width: 1100px) and (max-width: 1366px)")
      .matches;
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
  const userMenuRef = useRef(null);

  const categories = useMemo(() => collectCategories(menuItems), [menuItems]);

  useEffect(() => {
    if (activeCategory && !categories.includes(activeCategory)) {
      setActiveCategory("");
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    const defaultCoffeeCategory = normalizeCategory("drinks");
    if (categories.length === 0) {
      setCoffeeDrawerCategory(defaultCoffeeCategory);
      return;
    }

    if (coffeeDrawerCategory && categories.includes(coffeeDrawerCategory)) {
      return;
    }

    const fallbackCategory = categories.includes(defaultCoffeeCategory)
      ? defaultCoffeeCategory
      : categories[0];
    setCoffeeDrawerCategory(fallbackCategory);
  }, [categories, coffeeDrawerCategory]);

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
        setRoomError(
          error.message ||
            (isEn ? "Failed to load rooms" : "Не удалось загрузить комнаты"),
        );
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();
  }, [user?.id, isEn]);

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
    setMobileHeaderMenuOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!isUserMenuOpen && !isMobileHeaderMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Node)) return;
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
        setMobileHeaderMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setMobileHeaderMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen, isMobileHeaderMenuOpen]);

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
  }, [
    gesturesEnabled,
    isAnyOverlayOpen,
    isCartDrawerOpen,
    isCoffeeMenuOpen,
    isDesktop,
  ]);

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
    setRoomModalMode("manage");
    setIsEditingRoomName(false);
    setRoomDraft(activeRoom?.name || "");
    setInviteError("");
    setRoomError("");
    setUserMenuOpen(false);
    setMobileHeaderMenuOpen(false);
    setRoomModalOpen(true);
  };

  const handleOpenCreateRoomModal = () => {
    if (roomRequestPending) return;
    setRoomModalMode("create");
    setIsEditingRoomName(false);
    setRoomDraft("");
    setRoomError("");
    setInviteError("");
    setUserMenuOpen(false);
    setMobileHeaderMenuOpen(false);
    setRoomModalOpen(true);
  };

  const handleOpenInviteModal = (mode = "invite") => {
    if (roomRequestPending) return;
    if (
      mode === "invite" &&
      !(
        activeRoom?.id &&
        (activeRoom?.role === "owner" || activeRoom?.role === "admin")
      )
    ) {
      return;
    }
    setInviteModalMode(mode);
    setInviteActionType("");
    setInviteError("");
    setJoinCode("");
    setUserMenuOpen(false);
    setMobileHeaderMenuOpen(false);
    setInviteModalOpen(true);
  };

  const handleToggleUserMenu = () => {
    setUserMenuOpen((prev) => !prev);
  };

  const handleOpenSettings = () => {
    setSecretMenuOpen(true);
    setUserMenuOpen(false);
    setMobileHeaderMenuOpen(false);
  };

  const handleLogoutFromMenu = () => {
    setUserMenuOpen(false);
    setMobileHeaderMenuOpen(false);
    onLogout();
  };

  const handleToggleMobileHeaderMenu = () => {
    setUserMenuOpen(false);
    setMobileHeaderMenuOpen((prev) => !prev);
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
      setMembersError(
        error.message ||
          tr("Не удалось загрузить участников", "Failed to load members"),
      );
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCloseRoomModal = () => {
    if (roomRequestPending) return;
    setRoomModalMode("manage");
    setIsEditingRoomName(false);
    setRoomModalOpen(false);
  };

  const handleCloseInviteModal = () => {
    if (roomRequestPending) return;
    setInviteActionType("");
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
        throw new Error(
          tr("Не удалось создать комнату", "Failed to create room"),
        );
      }
      const nextRooms = [
        createdRoom,
        ...rooms.filter((room) => room.id !== createdRoom.id),
      ];
      setRooms(nextRooms);
      onRoomChange(createdRoom);
      setRoomDraft(createdRoom.name);
      setRoomError("");
      setRoomModalMode("manage");
      setRoomModalOpen(false);
    } catch (error) {
      setRoomError(
        error.message ||
          tr("Не удалось создать комнату", "Failed to create room"),
      );
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
      if (!updatedRoom)
        throw new Error(
          tr("Не удалось изменить комнату", "Failed to update room"),
        );

      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      const active =
        loadedRooms.find((room) => room.id === updatedRoom.id) || updatedRoom;
      onRoomChange(active);
      setRoomDraft(active.name);
      setIsEditingRoomName(false);
    } catch (error) {
      setRoomError(
        error.message ||
          tr("Не удалось изменить название комнаты", "Failed to rename room"),
      );
    } finally {
      setRoomRequestPending(false);
    }
  };

  const handleSelectRoom = async (room) => {
    if (roomRequestPending) return;
    setRoomModalMode("manage");
    setIsEditingRoomName(false);
    onRoomChange(room);
    setRoomDraft(room.name);
    await loadRoomMembers(room.id);
  };

  const handleInviteToRoom = async () => {
    if (!activeRoom?.id || roomRequestPending) return;
    const canInvite =
      activeRoom?.role === "owner" || activeRoom?.role === "admin";
    if (!canInvite) {
      setInviteError(
        tr(
          "Недостаточно прав для приглашения",
          "Insufficient permissions to invite",
        ),
      );
      return;
    }
    const login = inviteLogin.trim();
    if (!login) return;

    try {
      setRoomRequestPending(true);
      setInviteActionType("invite");
      setInviteError("");
      await inviteToRoom(activeRoom.id, user.id, login, inviteRole);
      setInviteLogin("");
      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      await loadRoomMembers(activeRoom.id);
    } catch (error) {
      setInviteError(
        error.message ||
          tr("Не удалось пригласить пользователя", "Failed to invite user"),
      );
    } finally {
      setInviteActionType("");
      setRoomRequestPending(false);
    }
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || roomRequestPending) return;

    try {
      setRoomRequestPending(true);
      setInviteActionType("join");
      setInviteError("");
      const payload = await joinRoomByCode(user.id, code);
      const joinedRoom = payload?.room;
      if (!joinedRoom)
        throw new Error(
          tr("Не удалось присоединиться к комнате", "Failed to join room"),
        );

      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      const active =
        loadedRooms.find((room) => room.id === joinedRoom.id) || joinedRoom;
      onRoomChange(active);
      setInviteModalOpen(false);
    } catch (error) {
      setInviteError(
        error.message ||
          tr("Не удалось войти в комнату", "Failed to join room"),
      );
    } finally {
      setInviteActionType("");
      setRoomRequestPending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom?.id || !user?.id || roomRequestPending) return;
    const confirmed = window.confirm(
      tr("Выйти из текущей комнаты?", "Leave current room?"),
    );
    if (!confirmed) return;
    try {
      setUserMenuOpen(false);
      setMobileHeaderMenuOpen(false);
      setRoomRequestPending(true);
      setRoomError("");
      await leaveRoom(activeRoom.id, user.id);
      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      onRoomChange(loadedRooms[0] || null);
      await loadRoomMembers(loadedRooms[0]?.id);
    } catch (error) {
      const message =
        error.message ||
        tr("Не удалось выйти из комнаты", "Failed to leave room");
      setRoomError(message);
      window.alert(message);
    } finally {
      setRoomRequestPending(false);
    }
  };

  const canManageCurrentRoom =
    activeRoom?.id &&
    (activeRoom?.role === "owner" || activeRoom?.role === "admin");
  const canOpenRoomSettings = canManageCurrentRoom;

  const handleOpenRoomSettings = () => {
    if (!canOpenRoomSettings) return;
    navigate("/admin");
  };

  const handleUpdateMemberRole = async (memberUserId, role) => {
    if (!activeRoom?.id || !user?.id || roomRequestPending) return;
    try {
      setRoomRequestPending(true);
      await updateRoomMemberRole(activeRoom.id, user.id, memberUserId, role);
      await loadRoomMembers(activeRoom.id);
      const loadedRooms = await fetchMyRooms(user.id);
      setRooms(loadedRooms);
      const updatedActive = loadedRooms.find(
        (room) => room.id === activeRoom.id,
      );
      if (updatedActive) {
        onRoomChange(updatedActive);
      }
    } catch (error) {
      setMembersError(
        error.message ||
          tr("Не удалось обновить роль", "Failed to update role"),
      );
    } finally {
      setRoomRequestPending(false);
    }
  };

  const handleKickMember = async (memberUserId, memberLogin = "") => {
    if (!activeRoom?.id || !user?.id || roomRequestPending) return;
    const confirmed = window.confirm(
      memberLogin
        ? tr(
            `Исключить пользователя ${memberLogin} из комнаты?`,
            `Kick ${memberLogin} from room?`,
          )
        : tr("Исключить пользователя из комнаты?", "Kick user from room?"),
    );
    if (!confirmed) return;
    try {
      setRoomRequestPending(true);
      await kickRoomMember(activeRoom.id, user.id, memberUserId);
      await loadRoomMembers(activeRoom.id);
    } catch (error) {
      setMembersError(
        error.message ||
          tr("Не удалось исключить пользователя", "Failed to kick user"),
      );
    } finally {
      setRoomRequestPending(false);
    }
  };

  useEffect(() => {
    if (!isRoomModalOpen || roomModalMode !== "manage" || !activeRoom?.id)
      return;
    loadRoomMembers(activeRoom.id);
  }, [isRoomModalOpen, roomModalMode, activeRoom?.id, user?.id]);

  const shouldLowerHeaderZIndex =
    isSecretMenuOpen || isCoffeeMenuOpen || (!isDesktop && isCartDrawerOpen);

  return (
    <div
      className={`container${
        isDesktop ? " container--desktop kassa-desktop" : ""
      }`}
    >
      <div
        className={`app-header${shouldLowerHeaderZIndex ? " app-header--z0" : ""}`}
      >
        <h1 className="app-header__logo">Kassa</h1>
        <div className="app-header__right">
          {isDesktop ? (
            <>
              <div className="app-header__meta" ref={userMenuRef}>
                <button
                  className="app-header__user app-header__user-trigger"
                  type="button"
                  onClick={handleToggleUserMenu}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  aria-label={tr("Меню пользователя", "User menu")}
                >
                  <span className="app-header__user-texts">
                    <span className="app-header__user-name">
                      {`${userBadge(activeRoom?.role)}${user?.login || (isEn ? "Guest" : "Гость")}`}
                    </span>
                    <span className="app-header__room app-header__room--in-trigger">
                      {activeRoom?.name
                        ? activeRoom.name
                        : tr("Комната не выбрана", "No room selected")}
                    </span>
                  </span>
                  <span className="app-header__user-caret" aria-hidden="true">
                    ▾
                  </span>
                </button>
                {isUserMenuOpen ? (
                  <div
                    className="app-header__user-menu"
                    role="menu"
                    aria-label={tr("Меню пользователя", "User menu")}
                  >
                    <button
                      type="button"
                      className="app-header__user-menu-item"
                      onClick={() => handleOpenInviteModal("join")}
                      role="menuitem"
                      disabled={roomRequestPending}
                    >
                      {tr("Присоединиться к комнате", "Join room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__user-menu-item"
                      onClick={handleOpenCreateRoomModal}
                      role="menuitem"
                      disabled={roomRequestPending}
                    >
                      {tr("Создать комнату", "Create room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__user-menu-item"
                      onClick={handleOpenSettings}
                      role="menuitem"
                    >
                      {tr("Настройки", "Settings")}
                    </button>
                    <button
                      type="button"
                      className="app-header__user-menu-item app-header__user-menu-item--leave-room"
                      onClick={handleLeaveRoom}
                      role="menuitem"
                      disabled={roomRequestPending || !activeRoom?.id}
                    >
                      {tr("Выйти из комнаты", "Leave room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__user-menu-item app-header__user-menu-item--danger"
                      onClick={handleLogoutFromMenu}
                      role="menuitem"
                    >
                      {tr("Выйти", "Sign out")}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="app-header__room-actions">
                <button
                  className="app-header__room-button app-header__room-button--invite"
                  type="button"
                  onClick={() => handleOpenInviteModal("invite")}
                  aria-label={tr("Пригласить", "Invite")}
                  disabled={roomRequestPending || !canManageCurrentRoom}
                >
                  {tr("Пригласить", "Invite")}
                </button>
                <button
                  className="app-header__room-button"
                  type="button"
                  onClick={handleOpenRoomModal}
                  aria-label={tr("Комната", "Room")}
                  disabled={roomRequestPending}
                >
                  {tr("Комната", "Room")}
                </button>
                {canOpenRoomSettings ? (
                  <button
                    className="app-header__room-button"
                    type="button"
                    onClick={handleOpenRoomSettings}
                    aria-label={tr("настройка комнаты", "Room settings")}
                    disabled={roomRequestPending}
                  >
                    {tr("настройка комнаты", "Room settings")}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="app-header__mobile-menu-wrap" ref={userMenuRef}>
              <button
                className="app-header__burger"
                type="button"
                onClick={handleToggleMobileHeaderMenu}
                aria-haspopup="menu"
                aria-expanded={isMobileHeaderMenuOpen}
                aria-label={tr("Меню", "Menu")}
              >
                ☰
              </button>
              {isMobileHeaderMenuOpen ? (
                <div
                  className="app-header__mobile-menu"
                  role="menu"
                  aria-label={tr("Меню приложения", "App menu")}
                >
                  <div className="app-header__mobile-user">
                    {`${userBadge(activeRoom?.role)}${user?.login || (isEn ? "Guest" : "Гость")}`}
                  </div>
                  <div className="app-header__mobile-room">
                    {activeRoom?.name
                      ? activeRoom.name
                      : tr("Комната не выбрана", "No room selected")}
                  </div>
                  <div className="app-header__mobile-actions">
                    <button
                      type="button"
                      className="app-header__mobile-item"
                      onClick={handleOpenRoomModal}
                      disabled={roomRequestPending}
                    >
                      {tr("Комната", "Room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__mobile-item"
                      onClick={handleOpenCreateRoomModal}
                      disabled={roomRequestPending}
                    >
                      {tr("Создать комнату", "Create room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__mobile-item app-header__mobile-item--invite"
                      onClick={() => handleOpenInviteModal("invite")}
                      disabled={roomRequestPending || !canManageCurrentRoom}
                    >
                      {tr("Пригласить", "Invite")}
                    </button>
                    {canOpenRoomSettings ? (
                      <button
                        type="button"
                        className="app-header__mobile-item"
                        onClick={handleOpenRoomSettings}
                        disabled={roomRequestPending}
                      >
                        {tr("настройка комнаты", "Room settings")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="app-header__mobile-item"
                      onClick={() => handleOpenInviteModal("join")}
                      disabled={roomRequestPending}
                    >
                      {tr("Присоединиться к комнате", "Join room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__mobile-item"
                      onClick={handleOpenSettings}
                    >
                      {tr("Настройки", "Settings")}
                    </button>
                    <button
                      type="button"
                      className="app-header__mobile-item app-header__mobile-item--leave-room"
                      onClick={handleLeaveRoom}
                      disabled={roomRequestPending || !activeRoom?.id}
                    >
                      {tr("Выйти из комнаты", "Leave room")}
                    </button>
                    <button
                      type="button"
                      className="app-header__mobile-item app-header__mobile-item--danger"
                      onClick={handleLogoutFromMenu}
                    >
                      {tr("Выйти", "Sign out")}
                    </button>
                  </div>
                  <div className="app-header__mobile-version">
                    {tr("Версия 3", "Version 3")}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div className={`flex${isDesktop ? " flex--desktop" : ""}`}>
        {isDesktop ? (
          <>
            <aside className="desktop-column desktop-column--left">
              <div className="desktop-panel desktop-panel--cart">
                <div className="desktop-panel__title">
                  {tr("Корзина", "Cart")}
                </div>
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
                    aria-label={tr("Новый чек", "New check")}
                  >
                    +
                  </button>
                  <button
                    className="coffee-menu-button"
                    type="button"
                    onClick={handleOpenCoffeeMenu}
                    aria-label={tr("Открыть кофейное меню", "Open coffee menu")}
                  >
                    ☕
                  </button>
                </div>
              </div>
              {!activeRoom?.id ? (
                <div className="menu room-empty">
                  <div className="menu-placeholder room-empty__text">
                    {tr(
                      "Меню пустое. Создайте комнату, чтобы продолжить.",
                      "Menu is empty. Create or join a room to continue.",
                    )}
                  </div>
                  <button
                    className="room-empty__button"
                    type="button"
                    onClick={handleOpenRoomModal}
                    disabled={roomRequestPending}
                  >
                    {tr("Задать комнату", "Set room")}
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
                            activeCategory === category
                              ? " category-button--active"
                              : ""
                          }`}
                          onClick={() =>
                            setActiveCategory((prev) =>
                              prev === category ? "" : category,
                            )
                          }
                        >
                          {categoryLabel(category, isEn)}
                        </button>
                      ))}
                    </div>
                  )}
                  {loading ? (
                    <div className="menu">
                      <div className="menu-placeholder">
                        {tr("Загрузка меню...", "Loading menu...")}
                      </div>
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
                  availableCategories={categories}
                  selectedCategory={coffeeDrawerCategory}
                  onCategoryChange={setCoffeeDrawerCategory}
                  showSwipeHint={!isDesktop}
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
                availableCategories={categories}
                selectedCategory={coffeeDrawerCategory}
                onCategoryChange={setCoffeeDrawerCategory}
                showSwipeHint={!isDesktop}
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
                aria-label={tr("Корзина", "Cart")}
              >
                🛒
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
                  aria-label={tr("Новый чек", "New check")}
                >
                  +
                </button>
                <button
                  className="coffee-menu-button"
                  type="button"
                  onClick={handleOpenCoffeeMenu}
                  aria-label={tr("Открыть кофейное меню", "Open coffee menu")}
                >
                  ☕
                </button>
              </div>
            </div>

            {!activeRoom?.id ? (
              <div className="menu room-empty">
                <div className="menu-placeholder room-empty__text">
                  {tr(
                    "Меню пустое. Создайте комнату, чтобы продолжить.",
                    "Menu is empty. Create or join a room to continue.",
                  )}
                </div>
                <button
                  className="room-empty__button"
                  type="button"
                  onClick={handleOpenRoomModal}
                  disabled={roomRequestPending}
                >
                  {tr("Задать комнату", "Set room")}
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
                          activeCategory === category
                            ? " category-button--active"
                            : ""
                        }`}
                        onClick={() =>
                          setActiveCategory((prev) =>
                            prev === category ? "" : category,
                          )
                        }
                      >
                        {categoryLabel(category, isEn)}
                      </button>
                    ))}
                  </div>
                )}

                {loading ? (
                  <div className="menu">
                    <div className="menu-placeholder">
                      {tr("Загрузка меню...", "Loading menu...")}
                    </div>
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
                <div className="cart-drawer__head-text">
                  <span className="cart-drawer__title">
                    {tr("Корзина товаров", "Cart items")}
                  </span>
                </div>
                <button
                  className="cart-drawer__close"
                  type="button"
                  onClick={handleToggleCartDrawer}
                  aria-label={tr("Корзина товаров", "Cart items")}
                >
                  ×
                </button>
              </div>
              <Cart
                items={activeCheck?.items || []}
                onRemove={removeItemFromCheck}
                onToggleFulfilled={toggleItemsFulfilled}
                showEmptyHint={!isDesktop}
                emptyHintText={tr(
                  "Это меню можно открыть свайпом вправо",
                  "This menu can be opened with a swipe right",
                )}
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
              availableCategories={categories}
              selectedCategory={coffeeDrawerCategory}
              onCategoryChange={setCoffeeDrawerCategory}
              showSwipeHint={!isDesktop}
            />
          </>
        )}
      </div>
      <SecretMenu
        open={isSecretMenuOpen}
        onClose={handleToggleSecretMenu}
        showGestures={!isDesktop}
        gesturesEnabled={gesturesEnabled}
        onToggleGestures={() => setGesturesEnabled((prev) => !prev)}
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
          <div
            className="room-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="room-modal__header">
              <h2 className="room-modal__title">
                {roomModalMode === "create"
                  ? tr("Создать комнату", "Create room")
                  : tr("Комнаты", "Rooms")}
              </h2>
              <button
                type="button"
                className="room-modal__close"
                onClick={handleCloseRoomModal}
                disabled={roomRequestPending}
                aria-label={tr("Закрыть", "Close")}
              >
                ×
              </button>
            </div>

            {roomModalMode === "create" ? (
              <>
                <div className="room-modal__subtitle">
                  {tr("Название новой комнаты", "New room name")}
                </div>
                <input
                  className="room-modal__input"
                  type="text"
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  placeholder={tr(
                    "Например: Кофейня",
                    "For example: Coffee house",
                  )}
                  autoFocus
                  disabled={roomRequestPending}
                />
                {roomError ? (
                  <div className="room-modal__error">{roomError}</div>
                ) : null}
                <div className="room-modal__actions">
                  <button
                    type="button"
                    onClick={handleSaveRoom}
                    disabled={roomRequestPending}
                  >
                    {roomRequestPending ? (
                      <>
                        <span className="room-spinner" aria-hidden="true" />
                        {tr("Создание...", "Creating...")}
                      </>
                    ) : (
                      tr("Создать", "Create")
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {roomsLoading ? (
                  <div className="room-modal__note">
                    {tr("Загрузка комнат...", "Loading rooms...")}
                  </div>
                ) : (
                  <div className="room-list">
                    {rooms.length === 0 ? (
                      <div className="room-modal__note">
                        {tr(
                          "Вы пока не состоите ни в одной комнате.",
                          "You are not a member of any rooms yet.",
                        )}
                      </div>
                    ) : (
                      rooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          className={`room-list__item${
                            activeRoom?.id === room.id
                              ? " room-list__item--active"
                              : ""
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
                <div className="room-modal__subtitle">
                  {tr("Участники комнаты", "Room members")}
                </div>
                {members.length === 0 && membersLoading ? (
                  <div
                    className="member-list member-list--skeleton"
                    aria-hidden="true"
                  >
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`member-skeleton-${index}`}
                        className="member-list__item member-list__item--skeleton"
                      >
                        <span className="member-list__skeleton-line member-list__skeleton-line--name" />
                        <span className="member-list__skeleton-line member-list__skeleton-line--action" />
                      </div>
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="room-modal__note">
                    {tr("Список участников пуст.", "Members list is empty.")}
                  </div>
                ) : (
                  <div className="member-list-wrap">
                    <div className="member-list">
                      {members.map((member) => {
                        const isOwner = member.role === "owner";
                        const isSelf = member.userId === user?.id;
                        return (
                          <div
                            key={member.userId}
                            className="member-list__item"
                          >
                            <span className="member-list__name">
                              {member.login}
                            </span>
                            {canManageCurrentRoom ? (
                              <div className="member-list__actions">
                                <select
                                  className="member-list__select"
                                  value={member.role}
                                  onChange={(event) =>
                                    handleUpdateMemberRole(
                                      member.userId,
                                      event.target.value,
                                    )
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
                                  onClick={() =>
                                    handleKickMember(
                                      member.userId,
                                      member.login,
                                    )
                                  }
                                  disabled={
                                    roomRequestPending || isOwner || isSelf
                                  }
                                  title={
                                    isSelf
                                      ? tr(
                                          "Нельзя исключить самого себя",
                                          "You cannot kick yourself",
                                        )
                                      : ""
                                  }
                                >
                                  {tr("Кик", "Kick")}
                                </button>
                              </div>
                            ) : (
                              <span className="member-list__role-badge">
                                {roleLabel(member.role)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {membersLoading ? (
                      <div className="member-list__loading">
                        <span
                          className="member-list__loading-dot"
                          aria-hidden="true"
                        />
                      </div>
                    ) : null}
                  </div>
                )}
                {membersError ? (
                  <div className="room-modal__error">{membersError}</div>
                ) : null}

                {activeRoom?.id ? (
                  <>
                    <div className="room-modal__divider" />
                    <div className="room-modal__subtitle">
                      {tr("ID комнаты:", "Room ID:")}{" "}
                      <strong>{activeRoom?.code || "—"}</strong>
                    </div>
                    <div className="room-modal__room-name-row">
                      <span className="room-modal__room-name">
                        {`${tr("Название комнаты", "Room name")}: ${
                          activeRoom?.name || "—"
                        }`}
                      </span>
                      {canManageCurrentRoom ? (
                        <button
                          type="button"
                          className="room-modal__edit-name"
                          onClick={() => {
                            setRoomDraft(activeRoom?.name || "");
                            setIsEditingRoomName((prev) => !prev);
                          }}
                          disabled={roomRequestPending}
                        >
                          {isEditingRoomName ? tr("x", "x") : tr("✏️", "✏️")}
                        </button>
                      ) : null}
                    </div>

                    {isEditingRoomName && canManageCurrentRoom ? (
                      <>
                        <input
                          className="room-modal__input"
                          type="text"
                          value={roomDraft}
                          onChange={(event) => setRoomDraft(event.target.value)}
                          placeholder={tr(
                            "Например: Кофейня",
                            "For example: Coffee house",
                          )}
                          autoFocus
                          disabled={roomRequestPending}
                        />
                        <div className="room-modal__actions">
                          <button
                            type="button"
                            onClick={handleRenameRoom}
                            disabled={roomRequestPending}
                          >
                            {tr("Сохранить название", "Save name")}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {roomError ? (
                      <div className="room-modal__error">{roomError}</div>
                    ) : null}
                  </>
                ) : (
                  <div className="room-modal__note">
                    {tr(
                      "Активная комната не выбрана.",
                      "No active room selected.",
                    )}
                  </div>
                )}
              </>
            )}
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
          <div
            className="room-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="room-modal__header">
              <h2 className="room-modal__title">
                {inviteModalMode === "invite"
                  ? tr("Пригласить в комнату", "Invite to room")
                  : tr("Присоединиться к комнате", "Join room")}
              </h2>
              <button
                type="button"
                className="room-modal__close"
                onClick={handleCloseInviteModal}
                disabled={roomRequestPending}
                aria-label={tr("Закрыть", "Close")}
              >
                ×
              </button>
            </div>
            {inviteModalMode === "invite" ? (
              <>
                {activeRoom?.id ? (
                  <div className="room-modal__subtitle">
                    {tr("ID текущей комнаты:", "Current room ID:")}{" "}
                    <strong>{activeRoom?.code || "—"}</strong>
                  </div>
                ) : (
                  <div className="room-modal__note">
                    {tr(
                      "Текущая комната не выбрана.",
                      "No current room selected.",
                    )}
                  </div>
                )}
                {canManageCurrentRoom ? (
                  <>
                    <div className="room-modal__divider" />
                    <div className="room-modal__subtitle">
                      {tr("Пригласить по логину", "Invite by login")}
                    </div>
                    <input
                      className="room-modal__input"
                      type="text"
                      value={inviteLogin}
                      onChange={(event) => setInviteLogin(event.target.value)}
                      placeholder={tr("Логин пользователя", "User login")}
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
                      <button
                        type="button"
                        onClick={handleInviteToRoom}
                        disabled={roomRequestPending}
                      >
                        {roomRequestPending && inviteActionType === "invite" ? (
                          <>
                            <span className="room-spinner" aria-hidden="true" />
                            {tr("Приглашение...", "Inviting...")}
                          </>
                        ) : (
                          tr("Пригласить", "Invite")
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="room-modal__note">
                    {tr(
                      "Для приглашения нужны права admin или owner.",
                      "Admin or owner role is required to invite.",
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="room-modal__subtitle">
                  {tr("Войти в комнату по ID", "Join room by ID")}
                </div>
                <input
                  className="room-modal__input"
                  type="text"
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(event.target.value.toUpperCase())
                  }
                  placeholder={tr("Например: A7K9Q2", "For example: A7K9Q2")}
                  disabled={roomRequestPending}
                />
                <div className="room-modal__actions">
                  <button
                    type="button"
                    onClick={handleJoinByCode}
                    disabled={roomRequestPending}
                  >
                    {roomRequestPending && inviteActionType === "join" ? (
                      <>
                        <span className="room-spinner" aria-hidden="true" />
                        {tr("Подключение...", "Connecting...")}
                      </>
                    ) : (
                      tr("Войти", "Join")
                    )}
                  </button>
                </div>
              </>
            )}

            {inviteError ? (
              <div className="room-modal__error">{inviteError}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default Kassa;
