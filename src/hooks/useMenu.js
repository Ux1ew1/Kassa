import { useState, useEffect } from 'react'
import { fetchMenu } from '../utils/api'

/**
 * Хук для работы с меню
 */
export function useMenu() {
  const [menuItems, setMenuItems] = useState([])
  const [activeOrder, setActiveOrder] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMenu()
  }, [])

  const loadMenu = async () => {
    setLoading(true)
    setError(null)
    try {
      const { items, activeOrder: order } = await fetchMenu()
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

