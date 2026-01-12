import "./MenuItem.css";

function MenuItem({ item, onAdd }) {
  const handleClick = () => {
    onAdd(item);
    // Вибрация на поддерживаемых устройствах
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  return (
    <div className="item" onClick={handleClick}>
      <span className="item-name">{item.name}</span>
      <span className="item-price">{item.price} руб.</span>
    </div>
  );
}

export default MenuItem;
