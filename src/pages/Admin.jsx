import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminMenu } from "../hooks/useAdminMenu";
import AdminMenuList from "../components/AdminMenuList";
import AiImportModal from "../components/AiImportModal";
import ItemModal from "../components/ItemModal";
import AccountingPanel from "../components/AccountingPanel";
import { searchMenu } from "../utils/search";
import "./Admin.css";

function Admin() {
  const {
    menus,
    activeMenuId,
    selectedMenuId,
    selectedMenu,
    menu,
    loading,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    addMenu,
    removeSelectedMenu,
    renameSelectedMenu,
    importPhotoAsMenu,
    createMenuFromImportPreview,
    selectMenu,
  } = useAdminMenu();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuName, setMenuName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    setMenuName(selectedMenu?.name || "");
  }, [selectedMenu?.name]);

  const filteredMenu = searchMenu(menu, searchQuery);

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
      alert(error.message || "Не удалось сохранить позицию");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Удалить позицию?")) {
      try {
        await deleteItem(id);
      } catch (error) {
        alert(error.message || "Не удалось удалить позицию");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleItem(id);
    } catch (error) {
      alert(error.message || "Не удалось обновить позицию");
    }
  };

  const handleCreateMenu = async () => {
    try {
      await addMenu();
      setSearchQuery("");
    } catch (error) {
      alert(error.message || "Не удалось создать меню");
    }
  };

  const handleDeleteMenu = async () => {
    if (!selectedMenuId) return;
    if (confirm("Удалить выбранное меню?")) {
      try {
        await removeSelectedMenu();
        setSearchQuery("");
      } catch (error) {
        alert(error.message || "Не удалось удалить меню");
      }
    }
  };

  const handleRenameMenu = async () => {
    try {
      await renameSelectedMenu(menuName);
    } catch (error) {
      alert(error.message || "Не удалось переименовать меню");
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1 className="admin-header__title">Админ-панель</h1>
        <div className="admin-header__actions">
          <Link to="/" className="admin-link">
            К кассе
          </Link>
        </div>
      </header>

      <main>
        <section className="admin-menu-switcher" aria-label="Рабочие меню">
          <div className="admin-menu-switcher__grid">
            <label className="admin-field" htmlFor="menu-select">
              <span className="admin-field__label">Рабочее меню</span>
              <select
                id="menu-select"
                className="admin-input admin-menu-select"
                value={selectedMenuId || ""}
                onChange={(event) => selectMenu(event.target.value)}
                disabled={loading || menus.length === 0}
              >
                {menus.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.id === activeMenuId ? " (активное)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field" htmlFor="menu-name">
              <span className="admin-field__label">Название меню</span>
              <input
                id="menu-name"
                type="text"
                className="admin-input admin-menu-name"
                value={menuName}
                onChange={(event) => setMenuName(event.target.value)}
                placeholder="Название меню"
              />
            </label>
          </div>

          <div className="admin-menu-switcher__actions">
            <button type="button" className="admin-action-button" onClick={handleRenameMenu}>
              Переименовать
            </button>
            <button type="button" className="admin-action-button" onClick={handleCreateMenu}>
              Создать меню
            </button>
            <button
              type="button"
              className="admin-action-button admin-action-button--danger"
              onClick={handleDeleteMenu}
              disabled={menus.length <= 1}
            >
              Удалить меню
            </button>
            <button
              type="button"
              className="admin-action-button admin-action-button--accent"
              onClick={() => setImportModalOpen(true)}
            >
              Меню через ИИ
            </button>
          </div>
        </section>

        <AccountingPanel selectedMenuId={selectedMenuId} />
        <div className="admin-controls">
          <div className="admin-search">
            <input
              type="text"
              className="admin-input admin-search-input"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Очистить поиск"
              >
                ×
              </button>
            )}
          </div>
          <button className="admin-add-button" onClick={handleAdd}>
            Добавить позицию
          </button>
        </div>

        {loading ? (
          <div className="admin-menu">
            <div className="admin-placeholder">Загрузка меню...</div>
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

      <AiImportModal
        isOpen={importModalOpen}
        menus={menus}
        selectedMenuId={selectedMenuId}
        onClose={() => setImportModalOpen(false)}
        onRecognize={importPhotoAsMenu}
        onCreate={createMenuFromImportPreview}
      />
    </div>
  );
}

export default Admin;
