import { useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import MenuItem from "./MenuItem";
import "./Menu.css";

const normalizeCategory = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (["all", "все"].includes(v)) return "все";
  if (["drink", "drinks", "напитки"].includes(v)) return "напитки";
  if (["food", "еда"].includes(v)) return "еда";
  if (["alcohol", "alcoholic", "алкоголь"].includes(v)) return "алкоголь";
  if (["other", "misc", "остальное", "другое"].includes(v)) return "остальное";
  return "остальное";
};

function Menu({
  menuItems,
  activeOrder,
  searchQuery,
  activeCategory = "",
  cartItems = [],
  onAddItem,
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const itemCounts = useMemo(() => {
    const counts = new Map();
    cartItems.forEach((cartItem) => counts.set(cartItem.id, (counts.get(cartItem.id) || 0) + 1));
    return counts;
  }, [cartItems]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const itemsById = new Map(menuItems.map((item) => [item.id, item]));
    const seen = new Set();
    const orderedVisibleItems = [];

    activeOrder.forEach((id) => {
      const item = itemsById.get(id);
      if (item && item.show && !seen.has(id)) {
        orderedVisibleItems.push(item);
        seen.add(id);
      }
    });

    menuItems.forEach((item) => {
      if (item.show && !seen.has(item.id)) {
        orderedVisibleItems.push(item);
        seen.add(item.id);
      }
    });

    return orderedVisibleItems.filter((item) => {
      const itemCategory = normalizeCategory(item.category);
      const matchesCategory = !activeCategory || itemCategory === activeCategory;
      const matchesSearch = query === "" || item.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeOrder, searchQuery, activeCategory]);

  if (filteredItems.length === 0) {
    return (
      <div className="menu">
        <div className="menu-placeholder">
          {searchQuery
            ? isEn
              ? "No items found"
              : "Товары не найдены"
            : isEn
              ? "No available items."
              : "Нет доступных товаров."}
        </div>
      </div>
    );
  }

  return (
    <div className="menu">
      {filteredItems.map((item) => (
        <MenuItem key={item.id} item={item} quantity={itemCounts.get(item.id) || 0} onAdd={onAddItem} />
      ))}
    </div>
  );
}

export default Menu;

