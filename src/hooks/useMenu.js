/**
 * Menu data hook for loading and exposing menu items and ordering.
 */
import { useState, useEffect } from 'react'
import { fetchMenu } from '../utils/api'

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
export function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [activeOrder, setActiveOrder] = useState([])
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMenu()
    const refresh = () => { if (!document.hidden) loadMenu(false) }
    const timer = setInterval(refresh, 3000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])

  /**
   * Fetches menu data from the API and updates local state.
   * @returns {Promise<void>}
   */
  const loadMenu = async (initial = true) => {
    if (initial) setLoading(true)
    setError(null)
    try {
      const { items, activeOrder: order, activeMenuId: menuId } = await fetchMenu()
      setMenuItems(items.map(item => ({ ...item, menuId: String(menuId) })))
      setActiveOrder(order)
      setActiveMenuId(menuId)
    } catch (err) {
      console.error('?????? ???????? ????:', err)
      setError(err.message)
      if (initial) { setMenuItems([]); setActiveOrder([]) }
    } finally {
      setLoading(false)
    }
  }

  return {
    menuItems,
    activeMenuId,
    activeOrder,
    loading,
    error,
    reloadMenu: loadMenu,
  }
}
