import ManagementHeader from '../components/ManagementHeader';
import AccountingPanel from '../components/AccountingPanel';
import './Admin.css';

export default function Reports() {
  return <div className="admin-container"><ManagementHeader title="Отчёты и учёт товаров" /><main><AccountingPanel /></main></div>;
}
