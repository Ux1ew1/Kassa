import { useState, useEffect, useCallback } from 'react'
import { fetchMenu, saveMenu, validateMenuItem } from '../utils/api'

/**
 * Хук для управления меню в админ-панели
 */
export function useAdminMenu() {
  const [menu, setMenu] = useState([])
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
      setMenu(items)
      setActiveOrder(order)
    } catch (err) {
      console.error('Ошибка загрузки меню:', err)
      setError(err.message)
      setMenu([])
      setActiveOrder([])
    } finally {
      setLoading(false)
    }
  }

  const ensureActiveOrderConsistency = useCallback((items, order) => {
    const validIds = new Set(items.map((item) => item.id))
    const seen = new Set()
    const ordered = []

    order.forEach((id) => {
      if (validIds.has(id) && !seen.has(id)) {
        ordered.push(id)
        seen.add(id)
      }
    })

    items.forEach((item) => {
      if (item.show && !seen.has(item.id)) {
        ordered.push(item.id)
        seen.add(item.id)
      }
    })

    return ordered
  }, [])

  const persistChanges = async (newMenu, newOrder) => {
    const consistentOrder = ensureActiveOrderConsistency(newMenu, newOrder)
    try {
      await saveMenu(newMenu, consistentOrder)
      setMenu(newMenu)
      setActiveOrder(consistentOrder)
    } catch (err) {
      console.error('Ошибка сохранения меню:', err)
      throw err
    }
  }

  const addItem = async (itemData) => {
    const newId = menu.length > 0 ? Math.max(...menu.map((item) => item.id)) + 1 : 1
    const newItem = { id: newId, ...itemData }

    if (!validateMenuItem(newItem)) {
      throw new Error('Некорректные данные позиции')
    }

    const newMenu = [...menu, newItem]
    const newOrder = itemData.show
      ? [...activeOrder.filter((id) => id !== newId), newId]
      : activeOrder

    await persistChanges(newMenu, newOrder)
  }

  const updateItem = async (id, itemData) => {
    const itemIndex = menu.findIndex((item) => item.id === id)
    if (itemIndex === -1) {
      throw new Error('Позиция не найдена')
    }

    const updatedItem = { ...menu[itemIndex], ...itemData }

    if (!validateMenuItem(updatedItem)) {
      throw new Error('Некорректные данные позиции')
    }

    const newMenu = [...menu]
    newMenu[itemIndex] = updatedItem

    let newOrder = [...activeOrder]
    if (updatedItem.show) {
      newOrder = [...newOrder.filter((itemId) => itemId !== id), id]
    } else {
      newOrder = newOrder.filter((itemId) => itemId !== id)
    }

    await persistChanges(newMenu, newOrder)
  }

  const deleteItem = async (id) => {
    const newMenu = menu.filter((item) => item.id !== id)
    const newOrder = activeOrder.filter((itemId) => itemId !== id)

    await persistChanges(newMenu, newOrder)
  }

  const toggleItem = async (id) => {
    const item = menu.find((item) => item.id === id)
    if (!item) return

    await updateItem(id, { show: !item.show })
  }

  return {
    menu,
    activeOrder,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    reloadMenu: loadMenu,
  }
}

