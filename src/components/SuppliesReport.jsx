import { supplyHeaders, supplyValues } from '../../shared/supplies';

export default function SuppliesReport({ report }) {
  if (!report.supplies?.length) return null;
  return <section aria-label="Расходники за смену">
    <h3>Расходники за смену</h3>
    <p>Остаток на складе: было + поступило + вернули − взяли в работу − списали. Расходники учитываются вручную и не зависят от фильтра проданных товаров.</p>
    <div className="accounting-scroll" tabIndex={0} aria-label="Таблица расходников"><table className="supplies-report-table"><thead><tr>{supplyHeaders.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>
      {report.supplies.map(row => <tr key={row.id}>{supplyValues(row).map((value, index) => <td key={index}>{value}</td>)}</tr>)}
    </tbody></table></div>
  </section>;
}
