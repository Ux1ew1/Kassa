/**
 * Secret settings menu overlay.
 */
import "./SecretMenu.css";
import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";

/**
 * Renders the secret settings panel.
 * @param {Object} props - Component props.
 * @param {boolean} props.open - Whether the menu is open.
 * @param {Function} props.onClose - Close handler.
 * @param {boolean} props.gesturesEnabled - Gestures enabled flag.
 * @param {Function} props.onToggleGestures - Toggle gestures handler.
 * @param {boolean} props.showGestures - Show gestures section flag.
 * @param {boolean} props.lowPerformanceMode - Low performance mode flag.
 * @param {Function} props.onToggleLowPerformanceMode - Toggle low performance handler.
 * @returns {JSX.Element|null} Secret menu overlay or null.
 */
function SecretMenu({
  open,
  onClose,
  showGestures,
  gesturesEnabled,
  onToggleGestures,
  lowPerformanceMode,
  onToggleLowPerformanceMode,
}) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { currency, currencies, setCurrencyCode } = useCurrency();
  const isEn = language === "en";

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
            <div className="secret-menu-title">{isEn ? "Settings" : "Настройки"}</div>
            <div className="secret-menu-caption">
              {isEn ? "Barista settings" : "Настройки для бариста"}
            </div>
          </div>
          <button
            type="button"
            className="secret-menu-close"
            onClick={onClose}
            aria-label={isEn ? "Close" : "Закрыть"}
          >
            ✕
          </button>
        </div>

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">
            {isEn ? "App theme" : "Тема приложения"}
          </div>
          <button
            type="button"
            className="secret-menu-theme-toggle"
            onClick={toggleTheme}
            aria-label={isEn ? "Switch theme" : "Сменить тему"}
            title={isEn ? "Switch theme" : "Сменить тему"}
          >
            {theme === "dark"
              ? isEn
                ? "☀️ Light theme"
                : "☀️ Светлая тема"
              : isEn
                ? "🌙 Dark theme"
                : "🌙 Тёмная тема"}
          </button>
        </div>

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">
            {isEn ? "Language" : "Язык"}
          </div>
          <button
            type="button"
            className="secret-menu-theme-toggle"
            onClick={toggleLanguage}
            aria-label={isEn ? "Switch language" : "Сменить язык"}
            title={isEn ? "Switch language" : "Сменить язык"}
          >
            {isEn ? "Русский" : "English"}
          </button>
        </div>

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">
            {isEn ? "Currency" : "Валюта"}
          </div>
          <select
            className="secret-menu-currency-select"
            value={currency.code}
            onChange={(event) => setCurrencyCode(event.target.value)}
            aria-label={isEn ? "Choose currency" : "Выберите валюту"}
          >
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {isEn ? item.labelEn : item.labelRu}
              </option>
            ))}
          </select>
        </div>

        {showGestures ? (
          <div className="secret-menu-section">
            <div className="secret-menu-section-title">
              {isEn ? "Gestures" : "Жесты"}
            </div>
            <label className="secret-menu-toggle">
              <span>{isEn ? "Enable gestures" : "Включить жесты"}</span>
              <input
                type="checkbox"
                checked={gesturesEnabled}
                onChange={onToggleGestures}
                aria-label={isEn ? "Enable gestures" : "Включить жесты"}
              />
              <span className="secret-menu-toggle-ui" aria-hidden="true" />
            </label>
          </div>
        ) : null}

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">
            {isEn ? "Interface" : "Интерфейс"}
          </div>
          <label className="secret-menu-toggle">
            <span>
              {isEn ? "Simplified interface mode" : "Упрощённый вид интерфейса"}
            </span>
            <input
              type="checkbox"
              checked={lowPerformanceMode}
              onChange={onToggleLowPerformanceMode}
              aria-label={
                isEn ? "Simplified interface mode" : "Упрощённый вид интерфейса"
              }
            />
            <span className="secret-menu-toggle-ui" aria-hidden="true" />
          </label>
        </div>

        <div className="secret-menu-actions">
          <a href="/admin" className="secret-menu-link">
            {isEn ? "Open admin panel" : "Перейти в админ-панель"}
          </a>
        </div>
      </div>
    </div>
  );
}

export default SecretMenu;
