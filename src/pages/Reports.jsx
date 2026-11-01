import ManagementHeader from '../components/ManagementHeader';
import AccountingPanel from '../components/AccountingPanel';
import './Admin.css';

export default function Reports() {
  return <div className="admin-container"><ManagementHeader title="Отчёты и учёт товаров" /><main><nav className="management-section-nav" aria-label="На этой странице"><a href="#shift-reports">Смены и отчёты ↓</a><a href="#product-preparation">Подготовка товаров ↓</a></nav><AccountingPanel /></main></div>;
}
