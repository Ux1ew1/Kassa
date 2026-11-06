import ExcelJS from 'exceljs';
import { supplyHeaders, supplyValues, supplyUnits, supplyOperations } from '../shared/supplies.js';

export const headers = ['Меню', 'Название', 'Цена продажи', 'Было на начало', 'Поступило', 'Корректировка', 'Продано', 'Осталось', 'Выручка'];
export const values = row => [row.menu, row.name, row.price, row.opening, row.received, row.adjustment, row.sold, row.remaining, row.revenue];
export function filename(report, extension) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: report.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(report.startedAt)).map(part => [part.type, part.value]));
  return `${parts.day}.${parts.month}.${parts.year}.${extension}`;
}
const stamp = (value, zone) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: zone }) : '';
const metadata = report => [
  ['Начало смены', stamp(report.startedAt, report.timeZone)],
  ...(report.closedAt ? [['Конец смены', stamp(report.closedAt, report.timeZone)]] : []),
  ['Завершённых чеков', report.receiptCount],
];
const safeText = value => /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
export function csv(report) {
  const cell = value => {
    const text = value == null ? '—' : typeof value === 'number' ? String(value) : safeText(String(value));
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [...metadata(report), [], headers, ...report.rows.map(values), [],
    ['Изменения количества'], ['Дата', 'Меню', 'Товар', 'Операция', 'Количество', 'Причина'],
    ...report.movements.map(move => [stamp(move.at, report.timeZone), move.menu, move.name, move.type === 'receipt' ? 'Поступление' : 'Корректировка', move.quantity, move.reason]),
    ...(report.supplies?.length ? [[], ['Расходники'], supplyHeaders, ...report.supplies.map(supplyValues), [],
      ['Операции с расходниками'], ['Дата', 'Расходник', 'Операция', 'Количество', 'Единица', 'Причина'],
      ...(report.supplyMovements || []).map(move => [stamp(move.at, report.timeZone), move.name, supplyOperations[move.type], move.quantity, supplyUnits[move.unit], move.reason])] : [])];
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
export async function xlsx(report) {
  const book = new ExcelJS.Workbook();
  book.creator = 'Касса';
  const sheet = book.addWorksheet('Смена');
  const metadataRows = metadata(report);
  metadataRows.forEach(row => sheet.addRow(row));
  sheet.addRow([]);
  const headerRow = sheet.addRow(headers);
  const start = headerRow.number;
  for (const row of report.rows) {
    const added = sheet.addRow(values(row).map(value => value ?? '—'));
    if (row.kind === 'summary') added.font = { bold: true };
    for (const column of [3, 9]) added.getCell(column).numFmt = '#,##0.00';
  }
  sheet.columns.forEach((column, index) => { column.width = [24, 45, 18, 18, 16, 18, 14, 14, 20][index] || 18; });
  headerRow.font = { bold: true, color: { argb: 'FFF6FAFD' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3D63' } };
  sheet.views = [{ state: 'frozen', ySplit: start }];
  sheet.autoFilter = { from: { row: start, column: 1 }, to: { row: start + report.rows.length, column: 9 } };
  const changes = book.addWorksheet('Изменения количества');
  changes.addRow(['Дата', 'Меню', 'Товар', 'Операция', 'Количество', 'Причина']).font = { bold: true };
  report.movements.forEach(move => changes.addRow([stamp(move.at, report.timeZone), move.menu, move.name, move.type === 'receipt' ? 'Поступление' : 'Корректировка', move.quantity, move.reason]));
  changes.columns.forEach((column, i) => { column.width = i === 5 ? 50 : 24; });
  if (report.supplies?.length) {
    const supplies = book.addWorksheet('Расходники');
    supplies.addRow(supplyHeaders).font = { bold: true };
    report.supplies.forEach(row => supplies.addRow(supplyValues(row)));
    supplies.columns.forEach((column, index) => { column.width = index === 0 ? 32 : 20; });
    supplies.views = [{ state: 'frozen', ySplit: 1 }];
    const log = book.addWorksheet('Операции с расходниками');
    log.addRow(['Дата', 'Расходник', 'Операция', 'Количество', 'Единица', 'Причина']).font = { bold: true };
    (report.supplyMovements || []).forEach(move => log.addRow([stamp(move.at, report.timeZone), move.name, supplyOperations[move.type], move.quantity, supplyUnits[move.unit], move.reason]));
    log.columns.forEach((column, index) => { column.width = index === 5 ? 48 : 24; });
  }
  return book.xlsx.writeBuffer();
}
