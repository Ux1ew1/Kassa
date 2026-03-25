import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminMenu } from "../hooks/useAdminMenu";
import { useLanguage } from "../contexts/LanguageContext";
import AdminMenuList from "../components/AdminMenuList";
import ItemModal from "../components/ItemModal";
import {
  categoryLabel,
  collectCategories,
  normalizeCategory,
} from "../utils/categories";
import "./Admin.css";

const ALL_FILTER = "__all__";

function Admin({ user, activeRoom }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const {
    menu,
    loading,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    removeCategory,
  } = useAdminMenu(activeRoom?.id, user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingItem, setEditingItem] = useState(null);

  const tr = (ru, en) => (isEn ? en : ru);
  const existingCategories = useMemo(() => collectCategories(menu), [menu]);

  const filteredMenu = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return menu.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(normalizedQuery);
      if (!matchesQuery) return false;

      const matchesCategory =
        categoryFilter === ALL_FILTER ||
        normalizeCategory(item.category) === categoryFilter;
      if (!matchesCategory) return false;

      if (statusFilter === "active") return Boolean(item.show);
      if (statusFilter === "hidden") return !item.show;
      return true;
    });
  }, [menu, searchQuery, categoryFilter, statusFilter]);

  const handleAdd = () => {
    setModalMode("add");
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (itemData) => {
    try {
      if (modalMode === "add") {
        await addItem(itemData);
      } else if (editingItem) {
        await updateItem(editingItem.id, itemData);
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      alert(error.message || tr("Не удалось сохранить позицию", "Failed to save item"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(tr("Удалить позицию?", "Delete this item?"))) return;
    try {
      await deleteItem(id);
    } catch (error) {
      alert(error.message || tr("Не удалось удалить позицию", "Failed to delete item"));
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleItem(id);
    } catch (error) {
      alert(error.message || tr("Не удалось обновить позицию", "Failed to update item"));
    }
  };

  const handleDeleteCategory = async (category) => {
    await removeCategory(category, "остальное");
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header__main">
          <h1 className="admin-header__title">{tr("Админ-панель", "Admin panel")}</h1>
          <p className="admin-header__subtitle">
            {tr("Управление меню и видимостью позиций", "Menu and visibility management")}
          </p>
        </div>
        <div className="admin-header__actions">
          <Link to="/" className="admin-link">
            {tr("Назад к кассе", "Back to cashier")}
          </Link>
        </div>
      </header>

      {!activeRoom?.id ? (
        <main>
          <div className="admin-placeholder">
            {tr("Выберите комнату на главном экране.", "Choose a room on the main screen.")}
          </div>
        </main>
      ) : (
        <>
          <section className="admin-toolbar" aria-label={tr("Панель управления", "Control toolbar")}> 
            <div className="admin-toolbar__row admin-toolbar__row--search">
              <div className="admin-search">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder={tr("Поиск по названию...", "Search by name...")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="admin-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label={tr("Очистить поиск", "Clear search")}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="admin-toolbar__row admin-toolbar__row--categories" role="tablist" aria-label={tr("Категории", "Categories")}>
              <button
                type="button"
                className={`admin-pill${categoryFilter === ALL_FILTER ? " admin-pill--active" : ""}`}
                onClick={() => setCategoryFilter(ALL_FILTER)}
              >
                {tr("Все", "All")}
              </button>
              {existingCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`admin-pill${categoryFilter === category ? " admin-pill--active" : ""}`}
                  onClick={() => setCategoryFilter(category)}
                >
                  {categoryLabel(category, isEn)}
                </button>
              ))}
            </div>

            <div className="admin-toolbar__row admin-toolbar__row--status" role="tablist" aria-label={tr("Статус", "Status")}>
              <button
                type="button"
                className={`admin-status-tab${statusFilter === "all" ? " admin-status-tab--active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                {tr("Все", "All")}
              </button>
              <button
                type="button"
                className={`admin-status-tab${statusFilter === "active" ? " admin-status-tab--active" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                {tr("Активные", "Active")}
              </button>
              <button
                type="button"
                className={`admin-status-tab${statusFilter === "hidden" ? " admin-status-tab--active" : ""}`}
                onClick={() => setStatusFilter("hidden")}
              >
                {tr("Скрытые", "Hidden")}
              </button>
            </div>

            <div className="admin-toolbar__row admin-toolbar__row--actions">
              <button
                className="admin-add-button"
                onClick={handleAdd}
                aria-label={tr("Добавить позицию", "Add item")}
              >
                {tr("Добавить позицию", "Add item")}
              </button>
            </div>
          </section>

          <main>
            {loading ? (
              <div className="admin-menu">
                <div className="admin-placeholder">{tr("Загрузка меню...", "Loading menu...")}</div>
              </div>
            ) : (
              <AdminMenuList
                items={filteredMenu}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </main>
        </>
      )}

      <ItemModal
        isOpen={modalOpen}
        mode={modalMode}
        item={editingItem}
        existingCategories={existingCategories}
        onDeleteCategory={handleDeleteCategory}
        onSave={handleSave}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
      />
    </div>
  );
}

export default Admin;
