import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminMenu } from "../hooks/useAdminMenu";
import { useLanguage } from "../contexts/LanguageContext";
import AdminMenuList from "../components/AdminMenuList";
import ItemModal from "../components/ItemModal";
import "./Admin.css";

function Admin({ user, activeRoom }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { menu, loading, addItem, updateItem, deleteItem, toggleItem } =
    useAdminMenu(activeRoom?.id, user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingItem, setEditingItem] = useState(null);

  if (!activeRoom?.id) {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <h1 className="admin-header__title">
            {isEn ? "Admin panel" : "Админ-панель"}
          </h1>
          <div className="admin-header__actions">
            <Link to="/" className="admin-link">
              {isEn ? "← Back to cashier" : "← К кассе"}
            </Link>
          </div>
        </header>
        <main>
          <div className="admin-placeholder">
            {isEn
              ? "Choose a room on the main screen."
              : "Выберите комнату на главном экране."}
          </div>
        </main>
      </div>
    );
  }

  const filteredMenu = menu.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

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
      alert(error.message || (isEn ? "Failed to save item" : "Не удалось сохранить позицию"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(isEn ? "Delete this item?" : "Удалить позицию?")) return;
    try {
      await deleteItem(id);
    } catch (error) {
      alert(error.message || (isEn ? "Failed to delete item" : "Не удалось удалить позицию"));
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleItem(id);
    } catch (error) {
      alert(error.message || (isEn ? "Failed to update item" : "Не удалось обновить позицию"));
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1 className="admin-header__title">
          {isEn ? "Admin panel" : "Админ-панель"}
        </h1>
        <div className="admin-header__actions">
          <Link to="/" className="admin-link">
            {isEn ? "← Back to cashier" : "← К кассе"}
          </Link>
        </div>
      </header>

      <main>
        <div className="admin-controls">
          <div className="admin-search">
            <input
              type="text"
              className="admin-search-input"
              placeholder={isEn ? "Search by name..." : "Поиск по названию..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label={isEn ? "Clear search" : "Очистить поиск"}
              >
                ✕
              </button>
            )}
          </div>
          <button className="admin-add-button" onClick={handleAdd}>
            {isEn ? "Add item" : "Добавить позицию"}
          </button>
        </div>

        {loading ? (
          <div className="admin-menu">
            <div className="admin-placeholder">
              {isEn ? "Loading menu..." : "Загрузка меню..."}
            </div>
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

      <ItemModal
        isOpen={modalOpen}
        mode={modalMode}
        item={editingItem}
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

