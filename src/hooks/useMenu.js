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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMenu()
  }, [])

  /**
   * Fetches menu data from the API and updates local state.
   * @returns {Promise<void>}
   */
  const loadMenu = async () => {
    setLoading(true)
    setError(null)
    try {
      const { items, activeOrder: order } = await fetchMenu()
      setMenuItems(items)
      setActiveOrder(order)
    } catch (err) {
      console.error('?????? ???????? ????:', err)
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
