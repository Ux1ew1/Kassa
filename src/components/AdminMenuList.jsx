import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { categoryLabel } from "../utils/categories";
import AdminActionButton from "./AdminActionButton";
import "./AdminMenuList.css";

function AdminMenuList({ items, onToggle, onEdit, onDelete }) {
  const { language } = useLanguage();
  const { formatCurrency } = useCurrency();
  const isEn = language === "en";

  if (items.length === 0) {
    return (
      <div className="admin-menu">
        <div className="admin-placeholder">
          {isEn
            ? "Menu is empty. Add your first item."
            : "Меню пока пустое. Добавьте первую позицию."}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-menu" role="list">
      {items.map((item) => (
        <article
          key={item.id}
          role="listitem"
          className={`admin-item${item.show ? "" : " admin-item--inactive"}`}
        >
          <div className="admin-item__left">
            <div className="admin-item__info">
              <span className="admin-item__name">{item.name}</span>
              <span className="admin-item__price">{formatCurrency(item.price)}</span>
            </div>
            <div className="admin-item__meta">
              <span className="admin-item__category">{categoryLabel(item.category, isEn)}</span>
              {!item.show && (
                <span className="admin-item__status">{isEn ? "Hidden" : "Скрыто"}</span>
              )}
            </div>
          </div>

          <div className="admin-item__actions">
            <AdminActionButton
              icon={item.show ? "eye" : "eye-off"}
              onClick={() => onToggle(item.id)}
              label={
                item.show
                  ? isEn
                    ? "Hide item"
                    : "Скрыть позицию"
                  : isEn
                    ? "Show item"
                    : "Показать позицию"
              }
              title={item.show ? (isEn ? "Hide" : "Скрыть") : isEn ? "Show" : "Показать"}
            />
            <AdminActionButton
              icon="edit"
              onClick={() => onEdit(item)}
              label={isEn ? "Edit item" : "Редактировать позицию"}
              title={isEn ? "Edit" : "Редактировать"}
            />
            <AdminActionButton
              icon="trash"
              onClick={() => onDelete(item.id)}
              label={isEn ? "Delete item" : "Удалить позицию"}
              title={isEn ? "Delete" : "Удалить"}
              danger
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export default AdminMenuList;
