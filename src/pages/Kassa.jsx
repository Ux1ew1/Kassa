import { useState } from "react";
import { useMenu } from "../hooks/useMenu";
import { useChecks } from "../hooks/useChecks";
import SearchBar from "../components/SearchBar";
import Menu from "../components/Menu";
import Cart from "../components/Cart";
import ChecksList from "../components/ChecksList";
import CoffeeMenuDrawer from "../components/CoffeeMenuDrawer";
import SecretMenu from "../components/SecretMenu";
import "./Kassa.css";

function Kassa() {
  const { menuItems, activeOrder, loading } = useMenu();
  const {
    checks,
    activeCheckId,
    setActiveCheckId,
    getActiveCheck,
    addItemToCheck,
    removeItemFromCheck,
    updateCheckChange,
    createNewCheck,
    completeCheck,
    toggleItemsFulfilled,
  } = useChecks();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCoffeeMenuOpen, setCoffeeMenuOpen] = useState(false);
  const [coffeeViewMode, setCoffeeViewMode] = useState("list");
  const [isSecretMenuOpen, setSecretMenuOpen] = useState(false);
  const activeCheck = getActiveCheck();

  const handleAmount = () => {
    const input = prompt("Введите сумму клиента:");
    if (input === null) return;

    const given = parseFloat(input);
    if (!isNaN(given) && given >= 0) {
      updateCheckChange(given);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  const handleCreateNewCheck = () => {
    createNewCheck();
    setSearchQuery("");
  };

  const handleOpenCoffeeMenu = () => {
    setCoffeeMenuOpen(true);
  };

  const handleCloseCoffeeMenu = () => {
    setCoffeeMenuOpen(false);
  };

  const handleToggleSecretMenu = () => {
    setSecretMenuOpen((prev) => !prev);
  };

  return (
    <div className="container">
      <h1 onDoubleClick={handleToggleSecretMenu} role="button" title=" ">
        ~\(≧▽≦)/~
      </h1>
      <div className="flex">
        <div className="top">
          <ChecksList
            checks={checks}
            activeCheckId={activeCheckId}
            onCheckChange={setActiveCheckId}
            onCreateNew={handleCreateNewCheck}
          />
          <button
            className="coffee-menu-button"
            type="button"
            onClick={handleOpenCoffeeMenu}
            aria-label="Открыть кофейное меню"
          >
            ☕
          </button>
        </div>

        <SearchBar value={searchQuery} onSearch={handleSearch} />

        {loading ? (
          <div className="menu">
            <div className="menu-placeholder">Загрузка меню...</div>
          </div>
        ) : (
          <Menu
            menuItems={menuItems}
            activeOrder={activeOrder}
            searchQuery={searchQuery}
            // Передаем текущие позиции чека, чтобы считать количество на карточках
            cartItems={activeCheck?.items || []}
            onAddItem={addItemToCheck}
          />
        )}

        <div className="bottom">
          <button
            className="done-button"
            onClick={completeCheck}
            aria-label="Завершить чек"
          >
            ✓
          </button>
          <span className="price">Цена: {activeCheck?.price || 0} руб.</span>
          <span className="amount">Сдача: {activeCheck?.change || 0} руб.</span>
          <button
            className="amountButton"
            onClick={handleAmount}
            aria-label="Ввести сумму"
          >
            <svg
              fill="#000000"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 21h2v-3h6v-2h-6v-2h4.5c2.757 0 5-2.243 5-5s-2.243-5-5-5H9a1 1 0 0 0-1 1v7H5v2h3v2H5v2h3v3zm2-15h4.5c1.654 0 3 1.346 3 3s-1.346 3-3 3H10V6z" />
            </svg>
          </button>
        </div>

        <Cart
          items={activeCheck?.items || []}
          onRemove={removeItemFromCheck}
          onToggleFulfilled={toggleItemsFulfilled}
        />
        <CoffeeMenuDrawer
          open={isCoffeeMenuOpen}
          onClose={handleCloseCoffeeMenu}
          checks={checks}
          activeCheckId={activeCheckId}
          viewMode={coffeeViewMode}
          onToggleFulfilled={toggleItemsFulfilled}
        />
        <SecretMenu
          open={isSecretMenuOpen}
          onClose={handleToggleSecretMenu}
          viewMode={coffeeViewMode}
          onChangeViewMode={setCoffeeViewMode}
        />
      </div>
    </div>
  );
}

export default Kassa;
