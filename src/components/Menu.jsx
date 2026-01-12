import { useMemo } from 'react'
import MenuItem from './MenuItem'
import './Menu.css'

function Menu({ menuItems, activeOrder, searchQuery, onAddItem }) {
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
        <MenuItem key={item.id} item={item} onAdd={onAddItem} />
      ))}
    </div>
  )
}

export default Menu

