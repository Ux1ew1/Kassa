/**
 * Menu data hook for loading and exposing menu items and ordering.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMenu } from "../utils/api";

/**
 * React hook for loading and exposing menu data.
 * @returns {{
 *  menuItems: Array,
 *  activeOrder: Array,
 *  loading: boolean,
 *  error: string | null,
 *  reloadMenu: Function
 * }}
 */
export function useMenu(roomId, userId) {
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrder, setActiveOrder] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  /**
   * Fetches menu data from the API and updates local state.
   * Includes retries because right after joining a room,
   * backend permissions can become available with a short delay.
   * @returns {Promise<void>}
   */
  const loadMenu = useCallback(
    async (targetRoomId = roomId, targetUserId = userId) => {
      const requestId = ++requestIdRef.current;

      if (!targetRoomId || !targetUserId) {
        setMenuItems([]);
        setActiveOrder([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      let lastError = null;
      const retryDelaysMs = [0, 350, 900];

      for (const delay of retryDelaysMs) {
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        try {
          const { items, activeOrder: order } = await fetchMenu(
            targetRoomId,
            targetUserId,
          );

          if (requestId !== requestIdRef.current) {
            return;
          }

          setMenuItems(items);
          setActiveOrder(order);
          setLoading(false);
          setError(null);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error("Ошибка загрузки меню:", lastError);
      setError(lastError?.message || "Failed to load menu");
      setMenuItems([]);
      setActiveOrder([]);
      setLoading(false);
    },
    [roomId, userId],
  );

  useEffect(() => {
    if (!roomId || !userId) {
      requestIdRef.current += 1;
      setMenuItems([]);
      setActiveOrder([]);
      setLoading(false);
      setError(null);
      return;
    }

    loadMenu(roomId, userId);
  }, [roomId, userId, loadMenu]);

  return {
    menuItems,
    activeOrder,
    loading,
    error,
    reloadMenu: loadMenu,
  };
}
