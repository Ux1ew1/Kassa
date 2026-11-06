import { useEffect, useState } from "react";
import { useAdminMenu } from "../hooks/useAdminMenu";
import AdminMenuList from "../components/AdminMenuList";
import ItemModal from "../components/ItemModal";
import ManagementHeader from "../components/ManagementHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import '../components/AccountingPanel.css';
import { searchMenu } from "../utils/search";
import { useSearchPrediction } from '../hooks/useSearchPrediction';
import "./Admin.css";

function Admin() {
  const {
    menus,
    activeMenuId,
    selectedMenuId,
    selectedMenu,
    menu,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    addMenu,
    removeSelectedMenu,
    renameSelectedMenu,
    selectMenu,
  } = useAdminMenu();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuName, setMenuName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingItem, setEditingItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    setMenuName(selectedMenu?.name || "");
  }, [selectedMenu?.name]);

  const [searchPrediction] = useSearchPrediction();
  const filteredMenu = searchMenu(menu, searchQuery, { predictive: searchPrediction });

  const handleAdd = () => {
    setMessage('');
    setModalMode("add");
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setMessage('');
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (itemData) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (modalMode === "add") {
        await addItem(itemData);
      } else if (editingItem) {
        await updateItem(editingItem.id, itemData);
      }
      setModalOpen(false);
      setEditingItem(null);
      setMessage('Позиция сохранена.');
    } catch (error) {
      setMessage(`Ошибка: ${error.message || 'Не удалось сохранить позицию'}`);
    } finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    setMessage('');
    const item = menu.find(item => item.id === id);
    setConfirmation({ title: 'Удалить позицию?', text: `«${item?.name || 'Товар'}» будет удалён из меню. Сохранённые отчёты останутся без изменений.`, run: () => deleteItem(id) });
  };

  const handleToggle = async (id) => {
    setBusy(true); setMessage('');
    try {
      await toggleItem(id);
    } catch (error) {
      setMessage(`Ошибка: ${error.message || 'Не удалось обновить позицию'}`);
    } finally { setBusy(false); }
  };

  const handleCreateMenu = async () => {
    setBusy(true); setMessage('');
    try {
      await addMenu();
      setSearchQuery("");
    } catch (error) {
      setMessage(`Ошибка: ${error.message || 'Не удалось создать меню'}`);
    } finally { setBusy(false); }
  };

  const handleDeleteMenu = async () => {
    if (!selectedMenuId) return;
    setMessage('');
    setConfirmation({ title: 'Удалить меню?', text: `Меню «${selectedMenu?.name}» и его товары будут удалены. Сохранённые отчёты останутся без изменений.`, run: async () => { await removeSelectedMenu(); setSearchQuery(''); } });
  };

  const handleRenameMenu = async () => {
    setBusy(true); setMessage('');
    try {
      await renameSelectedMenu(menuName);
      setMessage('Название меню сохранено.');
    } catch (error) {
      setMessage(`Ошибка: ${error.message || 'Не удалось переименовать меню'}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="admin-container">
      <ManagementHeader title="Админ-панель" />

      <main>
        {error && <p role="alert" className="management-notice">{error}</p>}
        {message && !modalOpen && <p role={message.startsWith('Ошибка:') ? 'alert' : 'status'} className="management-notice">{message}</p>}
        <fieldset className="management-workspace" disabled={busy || loading}>
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

          </div>
          <details className="admin-menu-settings"><summary>Название и управление меню</summary>
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
          </div>
          </details>
        </section>

        <div className="management-section-heading"><div><h2>Позиции меню</h2><p>{searchQuery ? `Найдено: ${filteredMenu.length} из ${menu.length}` : `Всего: ${menu.length} · В продаже: ${menu.filter(item => item.show).length}`}</p></div></div>
        <div className="admin-controls">
          <div className="admin-search">
            <input
              type="text"
              className="admin-input admin-search-input"
              placeholder="Поиск по названию..."
              autoCapitalize="sentences"
              aria-label="Поиск товаров в меню"
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
            emptyMessage={searchQuery ? 'Ничего не найдено. Попробуйте другое название или очистите поиск.' : undefined}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        </fieldset>
      </main>

      <ItemModal
        isOpen={modalOpen}
        mode={modalMode}
        item={editingItem}
        saving={busy}
        saveError={message.startsWith('Ошибка:') ? message : ''}
        onSave={handleSave}
        onClose={() => {
          if (busy) return;
          setModalOpen(false);
          setEditingItem(null);
        }}
      />
      {confirmation && <ConfirmDialog title={confirmation.title} confirmText="Удалить" busy={busy} error={message.startsWith('Ошибка:') ? message : ''} onCancel={() => setConfirmation(null)} onConfirm={async () => {
        if (busy) return;
        setBusy(true); setMessage('');
        try { await confirmation.run(); setConfirmation(null); setMessage('Удалено.'); }
        catch (error) { setMessage(`Ошибка: ${error.message}`); }
        finally { setBusy(false); }
      }}>{confirmation.text}</ConfirmDialog>}

    </div>
  );
}

export default Admin;
