import "./SecretMenu.css";

function SecretMenu({ open, onClose }) {
  if (!open) {
    return null;
  }

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
          <div className="secret-menu-note">Всегда карточки</div>
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
