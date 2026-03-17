import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import "./AdminMenuList.css";

const normalizeCategory = (value, isEn) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (["all", "все"].includes(v)) return isEn ? "All" : "Все";
  if (["drink", "drinks", "напитки"].includes(v)) return isEn ? "Drinks" : "Напитки";
  if (["food", "еда"].includes(v)) return isEn ? "Food" : "Еда";
  if (["alcohol", "alcoholic", "алкоголь"].includes(v)) return isEn ? "Alcohol" : "Алкоголь";
  if (["other", "misc", "остальное", "другое"].includes(v)) return isEn ? "Other" : "Остальное";
  return isEn ? "Other" : "Остальное";
};

function AdminMenuList({ items, onToggle, onEdit, onDelete }) {
  const { language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const isEn = language === "en";

  if (items.length === 0) {
    return (
      <div className="admin-menu">
        <div className="admin-placeholder">
          {isEn ? "Menu is empty. Add your first item." : "Меню пока пустое. Добавьте первую позицию."}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-menu">
      {items.map((item) => (
        <div key={item.id} className={`admin-item${item.show ? "" : " admin-item--inactive"}`}>
          <div className="admin-item__info">
            <span className="admin-item__name">{item.name}</span>
            <span className="admin-item__price">{formatCurrency(item.price)}</span>
            <span className="admin-item__category">
              {isEn ? "Category" : "Категория"}: {normalizeCategory(item.category, isEn)}
            </span>
            <span className="admin-item__status">
              {item.show ? (isEn ? "Visible" : "Активно") : isEn ? "Hidden" : "Скрыто"}
            </span>
          </div>
          <div className="admin-item__actions">
            <button className="admin-item__button" onClick={() => onToggle(item.id)} type="button">
              {item.show ? (isEn ? "Hide" : "Скрыть") : isEn ? "Show" : "Показать"}
            </button>
            <button className="admin-item__button" onClick={() => onEdit(item)} type="button">
              {isEn ? "Edit" : "Изменить"}
            </button>
            <button
              className="admin-item__button admin-item__button--danger"
              onClick={() => onDelete(item.id)}
              type="button"
            >
              {isEn ? "Delete" : "Удалить"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminMenuList;
