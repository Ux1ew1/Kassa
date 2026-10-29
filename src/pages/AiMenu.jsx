import { useNavigate } from 'react-router-dom';
import { useAdminMenu } from '../hooks/useAdminMenu';
import ManagementHeader from '../components/ManagementHeader';
import AiImportModal from '../components/AiImportModal';
import './Admin.css';

export default function AiMenu() {
  const { menus, selectedMenuId, loading, error, importPhotoAsMenu, createMenuFromImportPreview } = useAdminMenu();
  const navigate = useNavigate();
  return <div className="admin-container">
    <ManagementHeader title="ИИ меню" />
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Загружаем меню…</p> : <AiImportModal inline isOpen menus={menus} selectedMenuId={selectedMenuId}
      onClose={() => navigate('/admin')} onRecognize={importPhotoAsMenu} onCreate={createMenuFromImportPreview} />}
  </div>;
}
