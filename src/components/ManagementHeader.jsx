import { NavLink } from 'react-router-dom';
import './ManagementHeader.css';

export default function ManagementHeader({ title }) {
  return <header className="management-header">
    <h1 className="admin-header__title">{title}</h1>
    <nav aria-label="Разделы управления">
      <NavLink to="/" className="admin-link">К кассе</NavLink>
      <NavLink to="/admin" end className="admin-link">Админ-панель</NavLink>
      <NavLink to="/ai-menu" className="admin-link">ИИ меню</NavLink>
      <NavLink to="/reports" className="admin-link">Отчёты</NavLink>
    </nav>
  </header>;
}
