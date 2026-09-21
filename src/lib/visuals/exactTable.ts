import { compareExactDecimal } from '../breakdown';
import { decimal, field, labelValue, type VisualDataset } from './model';

export interface ExactColumn { key: string; label: string; numeric: boolean; }
export function exactColumns(dataset: VisualDataset): ExactColumn[] {
  return [...dataset.dimensions.map(column => ({...column, numeric: false})),
    ...dataset.measures.map(column => ({...column, numeric: true}))];
}

export function exactRows(dataset: VisualDataset, search: string, sort: string, direction: 'ascending' | 'descending') {
  const columns = exactColumns(dataset), term = search.trim().toLocaleLowerCase('en-GB');
  const column = columns.find(item => item.key === sort);
  const rows = dataset.rows.map((row, index) => ({row, index})).filter(({row}) => !term || columns.some(item =>
    String(field(row, item.key) ?? 'Unavailable').toLocaleLowerCase('en-GB').includes(term)));
  if (column) rows.sort((a, b) => {
    const left = field(a.row, column.key), right = field(b.row, column.key);
    const missingLeft = left === null || left === undefined, missingRight = right === null || right === undefined;
    if (missingLeft || missingRight) return missingLeft === missingRight ? a.index - b.index : missingLeft ? 1 : -1;
    const leftDecimal = decimal(left), rightDecimal = decimal(right);
    const comparison = column.numeric && leftDecimal !== null && rightDecimal !== null
      ? compareExactDecimal(leftDecimal, rightDecimal)
      : labelValue(left).localeCompare(labelValue(right), 'en-GB', {numeric: true});
    return comparison * (direction === 'descending' ? -1 : 1) || a.index - b.index;
  });
  return rows;
}

export function exactTableCsv(dataset: VisualDataset, rows: Record<string, unknown>[]) {
  const columns = exactColumns(dataset);
  const quote = (value: unknown) => {
    const text = String(value ?? '');
    const safe = decimal(text) === null && /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [[...columns.map(column => column.label), 'Dataset', 'Scope note'],
    ...rows.map(row => [...columns.map(column => field(row, column.key)), dataset.title, dataset.note])]
    .map(row => row.map(quote).join(',')).join('\r\n');
}
