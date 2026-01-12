import "./SecretMenu.css";

function SecretMenu({ open, onClose, viewMode, onChangeViewMode }) {
  if (!open) {
    return null;
  }

  const handleModeChange = (event) => {
    onChangeViewMode?.(event.target.value);
  };

  return (
    <div className="secret-menu-overlay" onClick={onClose}>
      <div
        className="secret-menu-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="secret-menu-header">
          <div>
            <div className="secret-menu-title">Секретное меню</div>
            <div className="secret-menu-caption">Настройки для бариста</div>
          </div>
          <button
            type="button"
            className="secret-menu-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">Вид отображения кофе</div>
          <label className="secret-menu-radio">
            <input
              type="radio"
              name="secret-view-mode"
              value="list"
              checked={viewMode === "list"}
              onChange={handleModeChange}
            />
            <span>Список</span>
          </label>
          <label className="secret-menu-radio">
            <input
              type="radio"
              name="secret-view-mode"
              value="cards"
              checked={viewMode === "cards"}
              onChange={handleModeChange}
            />
            <span>Карточки</span>
          </label>
        </div>

        <div className="secret-menu-actions">
          <a href="/admin" className="secret-menu-link">
            Перейти в админ-панель
          </a>
        </div>
      </div>
    </div>
  );
}

export default SecretMenu;
