import "./SearchBar.css";

function SearchBar({ value = "", onSearch }) {
  const hasValue = value.trim().length > 0;

  const handleChange = (e) => {
    const nextValue = e.target.value;
    if (typeof onSearch === "function") {
      onSearch(nextValue);
    }
  };

  const handleClear = () => {
    if (typeof onSearch === "function") {
      onSearch("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div
      className={`search-container${
        hasValue ? " search-container--active" : ""
      }`}
    >
      <input
        type="text"
        className={`search-input${hasValue ? " search-input--active" : ""}`}
        placeholder="Поиск товаров..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          className="search-clear-button"
          onClick={handleClear}
          aria-label="Очистить поиск"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchBar;
