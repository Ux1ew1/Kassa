export const supplyUnits = { g: 'г', ml: 'мл', pcs: 'шт.' };
export const supplyOperations = { receipt: 'Поступление', issue: 'Взяли в работу', return: 'Возврат', waste: 'Списание со склада' };
export const supplyHeaders = ['Расходник', 'Единица', 'Было', 'Поступило', 'Взяли в работу', 'Вернули', 'Списали', 'Осталось'];
export const supplyValues = row => [row.name, supplyUnits[row.unit], row.opening, row.received, row.issued, row.returned, row.writtenOff, row.remaining];
