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
 * @returns {JSX.Element|null} Secret menu overlay or null.
 */
function SecretMenu({
  open,
  onClose,
  showGestures,
  gesturesEnabled,
  onToggleGestures,
}) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { currency, currencies, setCurrencyCode } = useCurrency();
  const isEn = language === "en";
  const isDarkTheme = theme === "dark";

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
            <div className="secret-menu-title">
              {isEn ? "Settings" : "Настройки"}
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
          <label className="secret-menu-switch">
            <span className="secret-menu-switch__label">
              {isDarkTheme
                ? isEn
                  ? "Dark mode"
                  : "Тёмная тема"
                : isEn
                  ? "Light mode"
                  : "Светлая тема"}
            </span>
            <input
              type="checkbox"
              checked={isDarkTheme}
              onChange={toggleTheme}
              aria-label={isEn ? "Switch theme" : "Сменить тему"}
            />
            <span className="secret-menu-switch__ui" aria-hidden="true" />
          </label>
        </div>

        <div className="secret-menu-section">
          <div className="secret-menu-section-title">
            {isEn ? "Language" : "Язык"}
          </div>
          <div
            className="secret-menu-lang-buttons"
            role="group"
            aria-label={isEn ? "Language" : "Язык"}
          >
            <button
              type="button"
              className={`secret-menu-lang-button${language === "ru" ? " secret-menu-lang-button--active" : ""}`}
              onClick={() => setLanguage("ru")}
              aria-pressed={language === "ru"}
            >
              RU
            </button>
            <button
              type="button"
              className={`secret-menu-lang-button${language === "en" ? " secret-menu-lang-button--active" : ""}`}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
          </div>
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
      </div>
    </div>
  );
}

export default SecretMenu;
