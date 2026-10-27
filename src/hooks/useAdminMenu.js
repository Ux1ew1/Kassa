/**
 * Admin menu management hook.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateMenu,
  createImportedMenu,
  createMenu,
  deleteMenu as deleteMenuRequest,
  fetchMenus,
  importMenuPhoto,
  updateMenu,
  validateMenuItem,
} from "../utils/api";

export function useAdminMenu() {
  const [menus, setMenus] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [menu, setMenu] = useState([]);
  const [activeOrder, setActiveOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedMenu = useMemo(
    () => menus.find((item) => item.id === selectedMenuId) || null,
    [menus, selectedMenuId],
  );

  const applyPayload = useCallback((payload, preferredMenuId = null) => {
    setMenus(payload.menus || []);
    setActiveMenuId(payload.activeMenuId || null);

    const nextSelectedId =
      preferredMenuId ||
      payload.activeMenu?.id ||
      payload.activeMenuId ||
      payload.menus?.[0]?.id ||
      null;

    setSelectedMenuId(nextSelectedId);
    setMenu(payload.items || []);
    setActiveOrder(payload.activeOrder || []);
  }, []);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchMenus();
      applyPayload(payload);
    } catch (err) {
      console.error("Menu load error:", err);
      setError(err.message);
      setMenus([]);
      setActiveMenuId(null);
      setSelectedMenuId(null);
      setMenu([]);
      setActiveOrder([]);
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const ensureActiveOrderConsistency = useCallback((items, order) => {
    const validIds = new Set(items.map((item) => item.id));
    const seen = new Set();
    const ordered = [];

    order.forEach((id) => {
      if (validIds.has(id) && !seen.has(id)) {
        ordered.push(id);
        seen.add(id);
      }
    });

    items.forEach((item) => {
      if (item.show && !seen.has(item.id)) {
        ordered.push(item.id);
        seen.add(item.id);
      }
    });

    return ordered;
  }, []);

  const persistChanges = async (newMenu, newOrder, extra = {}) => {
    if (!selectedMenuId) {
      throw new Error("Меню не выбрано");
    }

    const consistentOrder = ensureActiveOrderConsistency(newMenu, newOrder);
    const payload = await updateMenu(selectedMenuId, {
      ...extra,
      items: newMenu,
      activeOrder: consistentOrder,
    });

    setMenus(payload.menus || []);
    setActiveMenuId(payload.activeMenuId || null);
    setSelectedMenuId(selectedMenuId);
    setMenu(newMenu);
    setActiveOrder(consistentOrder);
  };

  const addItem = async (itemData) => {
    const numericIds = menu
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id));
    const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    const newItem = { id: newId, ...itemData };

    if (!validateMenuItem(newItem)) {
      throw new Error("Некорректные данные позиции");
    }

    const newMenu = [...menu, newItem];
    const newOrder = itemData.show
      ? [...activeOrder.filter((id) => id !== newId), newId]
      : activeOrder;

    await persistChanges(newMenu, newOrder);
  };

  const updateItem = async (id, itemData) => {
    const itemIndex = menu.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      throw new Error("Позиция не найдена");
    }

    const updatedItem = { ...menu[itemIndex], ...itemData };
    if (!validateMenuItem(updatedItem)) {
      throw new Error("Некорректные данные позиции");
    }

    const newMenu = [...menu];
    newMenu[itemIndex] = updatedItem;

    let newOrder = [...activeOrder];
    if (updatedItem.show) {
      newOrder = [...newOrder.filter((itemId) => itemId !== id), id];
    } else {
      newOrder = newOrder.filter((itemId) => itemId !== id);
    }

    await persistChanges(newMenu, newOrder);
  };

  const deleteItem = async (id) => {
    const newMenu = menu.filter((item) => item.id !== id);
    const newOrder = activeOrder.filter((itemId) => itemId !== id);
    await persistChanges(newMenu, newOrder);
  };

  const toggleItem = async (id) => {
    const item = menu.find((item) => item.id === id);
    if (!item) return;
    await updateItem(id, { show: !item.show });
  };

  const addMenu = async () => {
    const payload = await createMenu(`Меню ${menus.length + 1}`);
    applyPayload(payload);
  };

  const removeSelectedMenu = async () => {
    if (!selectedMenuId) return;
    const payload = await deleteMenuRequest(selectedMenuId);
    applyPayload(payload);
  };

  const activateSelectedMenu = async (menuId = selectedMenuId) => {
    if (!menuId) return;
    const payload = await activateMenu(menuId);
    applyPayload(payload, menuId);
  };

  const renameSelectedMenu = async (name) => {
    if (!selectedMenuId) return;
    await persistChanges(menu, activeOrder, { name });
  };

  const importPhotoAsMenu = async (imageData, options = {}) => {
    return importMenuPhoto(imageData, options.targetMenuId || null);
  };

  const createMenuFromImportPreview = async (preview, options = {}) => {
    const payload = await createImportedMenu(preview, options);
    applyPayload(payload, options.targetMenuId || null);
    return {
      menu: payload.activeMenu,
      mergeResult: payload.mergeResult,
    };
  };

  const selectMenu = async (menuId) => {
    const payload = await fetchMenus();
    const activeMenu = payload.activeMenu;

    if (activeMenu?.id === menuId) {
      applyPayload(payload, menuId);
      return;
    }

    const summary = payload.menus.find((item) => item.id === menuId);
    if (!summary) return;

    const response = await activateMenu(menuId);
    applyPayload(response, menuId);
  };

  return {
    menus,
    activeMenuId,
    selectedMenuId,
    selectedMenu,
    menu,
    activeOrder,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    addMenu,
    removeSelectedMenu,
    activateSelectedMenu,
    renameSelectedMenu,
    importPhotoAsMenu,
    createMenuFromImportPreview,
    selectMenu,
    reloadMenu: loadMenus,
  };
}
