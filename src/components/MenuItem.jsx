import "./MenuItem.css";

function MenuItem({ item, quantity = 0, onAdd }) {
  const handleClick = () => {
    onAdd(item);
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  return (
    <div
      className="item"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <span className="item-name">{item.name}</span>
      <div className="item-footer">
        <span className="item-price">{item.price} руб.</span>
        {quantity > 0 && <span className="item-quantity">x{quantity}</span>}
      </div>
    </div>
  );
}

export default MenuItem;
