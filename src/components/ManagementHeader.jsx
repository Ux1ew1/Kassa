import { NavLink } from 'react-router-dom';
import './ManagementHeader.css';

const descriptions = {
  'Админ-панель': 'Товары, цены и рабочие меню.',
  'ИИ меню': 'Загрузите фото, проверьте позиции и сохраните меню.',
  'Отчёты и учёт товаров': 'Продажи всех сотрудников, отчёты смен и подготовка остатков.',
  'Расходники': 'Общий склад зерна, молока и других материалов.',
};

export default function ManagementHeader({ title }) {
  return <header className="management-header">
    <div className="management-heading"><div><p className="management-eyebrow">Управление кассой</p><h1 className="admin-header__title">{title}</h1><p className="management-description">{descriptions[title]}</p></div>
      <NavLink to="/" className="management-back"><span aria-hidden="true">←</span> К кассе</NavLink>
    </div>
    <nav aria-label="Разделы управления">
      <NavLink to="/admin" end className="admin-link">Админ-панель</NavLink>
      <NavLink to="/ai-menu" className="admin-link">ИИ меню</NavLink>
      <NavLink to="/reports" className="admin-link">Отчёты</NavLink>
      <NavLink to="/supplies" className="admin-link">Расходники</NavLink>
    </nav>
  </header>;
}
