/**
 * Menu data hook for loading and exposing menu items and ordering.
 */
import { useState } from 'react'
import { useEffect } from 'react'
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
export function useMenu(roomId, userId) {
  const [menuItems, setMenuItems] = useState([])
  const [activeOrder, setActiveOrder] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!roomId || !userId) {
      setMenuItems([])
      setActiveOrder([])
      setLoading(false)
      return
    }

    loadMenu()
  }, [roomId, userId])

  /**
   * Fetches menu data from the API and updates local state.
   * @returns {Promise<void>}
   */
  const loadMenu = async () => {
    if (!roomId || !userId) {
      setMenuItems([])
      setActiveOrder([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { items, activeOrder: order } = await fetchMenu(roomId, userId)
      setMenuItems(items)
      setActiveOrder(order)
    } catch (err) {
      console.error('Ошибка загрузки меню:', err)
      setError(err.message)
      setMenuItems([])
      setActiveOrder([])
    } finally {
      setLoading(false)
    }
  }

  return {
    menuItems,
    activeOrder,
    loading,
    error,
    reloadMenu: loadMenu,
  }
}
