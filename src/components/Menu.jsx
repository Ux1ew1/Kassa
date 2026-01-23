import { useMemo } from 'react'
import MenuItem from './MenuItem'
import './Menu.css'

function Menu({ menuItems, activeOrder, searchQuery, cartItems = [], onAddItem }) {
  // Подсчитываем количество каждого товара в активном чеке
  const itemCounts = useMemo(() => {
    const counts = new Map()
    cartItems.forEach((cartItem) => {
      counts.set(cartItem.id, (counts.get(cartItem.id) || 0) + 1)
    })
    return counts
  }, [cartItems])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const itemsById = new Map(menuItems.map((item) => [item.id, item]))
    const seen = new Set()
    const orderedVisibleItems = []

    // Добавляем элементы в порядке activeOrder
    activeOrder.forEach((id) => {
      const item = itemsById.get(id)
      if (item && item.show && !seen.has(id)) {
        orderedVisibleItems.push(item)
        seen.add(id)
      }
    })

    // Добавляем остальные видимые элементы
    menuItems.forEach((item) => {
      if (item.show && !seen.has(item.id)) {
        orderedVisibleItems.push(item)
        seen.add(item.id)
      }
    })

    // Фильтруем по поисковому запросу
    return orderedVisibleItems.filter(
      (item) => query === '' || item.name.toLowerCase().includes(query)
    )
  }, [menuItems, activeOrder, searchQuery])

  if (filteredItems.length === 0) {
    return (
      <div className="menu">
        <div className="menu-placeholder">
          {searchQuery ? 'Товары не найдены' : 'Нет доступных товаров.'}
        </div>
      </div>
    )
  }

  return (
    <div className="menu">
      {filteredItems.map((item) => (
        <MenuItem
          key={item.id}
          item={item}
          quantity={itemCounts.get(item.id) || 0}
          onAdd={onAddItem}
        />
      ))}
    </div>
  )
}

export default Menu
