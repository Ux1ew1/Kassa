import './MenuItem.css'

function MenuItem({ item, quantity = 0, onAdd }) {
  const handleClick = () => {
    onAdd(item)
    // Короткая вибрация для отклика на тап
    if (navigator.vibrate) {
      navigator.vibrate(15)
    }
  }

  return (
    <div className="item" onClick={handleClick}>
      <span className="item-name">{item.name}</span>
      <div className="item-footer">
        <span className="item-price">{item.price} руб.</span>
        {/* Показываем сколько единиц товара уже в корзине */}
        {quantity > 0 && <span className="item-quantity">x{quantity}</span>}
      </div>
    </div>
  )
}

export default MenuItem
