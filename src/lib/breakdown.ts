import { METRIC_BY_ID, type MetricResult } from '../../contracts/reporting';
export type BreakdownOrder = 'group_asc' | 'group_desc' | 'value_desc' | 'value_asc';
const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

/** Exact, finite decimal comparison. No Number conversion of warehouse amounts or counts. */
export function compareExactDecimal(left: string, right: string): number {
  const parse = (value: string) => {
    if (value.length > 512 || !/^[+-]?\d+(?:\.\d+)?$/.test(value)) throw new Error('Expected a plain finite decimal value.');
    const [integer, fraction = ''] = value.replace(/^[+-]/, '').split('.');
    const whole = integer.replace(/^0+(?=\d)/, ''), fractional = fraction.replace(/0+$/, '');
    return { whole, fractional, sign: /^-/.test(value) && (whole !== '0' || fractional !== '') ? -1 : 1 };
  };
  const a = parse(left), b = parse(right);
  if (a.sign !== b.sign) return a.sign < b.sign ? -1 : 1;
  const compare = (x: string, y: string) => x < y ? -1 : x > y ? 1 : 0;
  const magnitude = a.whole.length === b.whole.length ? compare(a.whole, b.whole) : a.whole.length < b.whole.length ? -1 : 1;
  const digits = Math.max(a.fractional.length, b.fractional.length);
  return (magnitude || compare(a.fractional.padEnd(digits, '0'), b.fractional.padEnd(digits, '0'))) * a.sign;
}
export interface IndexedBreakdown { row: MetricResult; index: number; search: string; }
export function indexBreakdown(rows: readonly MetricResult[]): IndexedBreakdown[] {
  return rows.map((row, index) => ({ row, index, search: `${row.group ?? 'Unspecified'} ${METRIC_BY_ID[row.metricId]?.label ?? row.metricId}`.toLocaleLowerCase('en-GB') }));
}
export function selectBreakdown(index: readonly IndexedBreakdown[], search: string, metricId: string, order: BreakdownOrder) {
  const term = search.trim().toLocaleLowerCase('en-GB').replace(/\s+/g, ' ');
  const selected = index.filter(item => (!metricId || item.row.metricId === metricId) && (!term || item.search.includes(term)));
  return selected.sort((a, b) => {
    if (metricId && order.startsWith('value')) {
      // Missing values stay last in either direction. Never compare different units across metrics.
      if (a.row.value === null || b.row.value === null) {
        if (a.row.value !== b.row.value) return a.row.value === null ? 1 : -1;
      } else {
        const valueOrder = compareExactDecimal(a.row.value, b.row.value);
        if (valueOrder) return order === 'value_desc' ? -valueOrder : valueOrder;
      }
    }
    const groupOrder = collator.compare(a.row.group ?? '', b.row.group ?? '');
    return (order === 'group_desc' ? -groupOrder : groupOrder) || collator.compare(a.row.metricId, b.row.metricId) || a.index - b.index;
  });
}
export function pageBreakdown<T>(rows: readonly T[], requestedPage: number, requestedSize: number) {
  const size = [25, 50, 100].includes(requestedSize) ? requestedSize : 25;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(1, Math.min(pages, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const start = (page - 1) * size;
  return { rows: rows.slice(start, start + size), page, pages, size, first: rows.length ? start + 1 : 0, last: Math.min(start + size, rows.length), total: rows.length };
}
