import './SearchBar.css'

function SearchBar({ value = '', onSearch }) {
  const handleChange = (e) => {
    const nextValue = e.target.value
    if (typeof onSearch === 'function') {
      onSearch(nextValue)
    }
  }

  const handleClear = () => {
    if (typeof onSearch === 'function') {
      onSearch('')
    }
  }

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="Поиск товаров..."
        value={value}
        onChange={handleChange}
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
  )
}

export default SearchBar

