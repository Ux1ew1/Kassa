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
            <div className="secret-menu-title">РЎРµРєСЂРµС‚РЅРѕРµ РјРµРЅСЋ</div>
            <div className="secret-menu-caption">РќР°СЃС‚СЂРѕР№РєРё РґР»СЏ Р±Р°СЂРёСЃС‚Р°</div>
          </div>
          <button
            type="button"
            className="secret-menu-close"
            onClick={onClose}
            aria-label="Р—Р°РєСЂС‹С‚СЊ"
          >
            вњ•
          </button>
        </div>

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">Р’РёРґ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ РєРѕС„Рµ</div>
          <div className="secret-menu-note">Р’СЃРµРіРґР° РєР°СЂС‚РѕС‡РєРё</div>
        </div>

        <div className="secret-menu-actions">
          <a href="/admin" className="secret-menu-link">
            РџРµСЂРµР№С‚Рё РІ Р°РґРјРёРЅ-РїР°РЅРµР»СЊ
          </a>
        </div>
      </div>
    </div>
  );
}

export default SecretMenu;
