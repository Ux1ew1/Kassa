import { useLanguage } from "../contexts/LanguageContext";
import "./SearchBar.css";

function SearchBar({ value = "", onSearch }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const hasValue = value.trim().length > 0;

  const handleChange = (e) => onSearch?.(e.target.value);
  const handleClear = () => onSearch?.("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div className={`search-container${hasValue ? " search-container--active" : ""}`}>
      <input
        type="text"
        className={`search-input${hasValue ? " search-input--active" : ""}`}
        placeholder={isEn ? "Search items..." : "Поиск товаров..."}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          className="search-clear-button"
          onClick={handleClear}
          aria-label={isEn ? "Clear search" : "Очистить поиск"}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchBar;

