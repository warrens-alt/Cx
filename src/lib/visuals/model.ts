/** Presentation-only datasets. Never read formatted DOM cells or derive warehouse totals here. */
import { compareExactDecimal } from '../breakdown';
export type VisualKind = 'bar' | 'column' | 'line' | 'area' | 'scatter' | 'donut' | 'heatmap';
export interface Dimension { key: string; label: string; ordered?: boolean; }
export interface Measure { key: string; label: string; unit: string; }
export interface VisualDataset {
  id: string; title: string; rows: Record<string, unknown>[];
  dimensions: Dimension[]; measures: Measure[]; note: string;
  /** Only returned rows are visualised. No implicit sum/mean/distinct aggregation of measures. */
  source?: string; defaultDimension?: string; defaultMeasure?: string;
}
export interface VisualSettings { dimension: string; measure: string; compare: string; mode: 'values' | 'records'; search: string; sort: 'source' | 'label' | 'ascending' | 'descending'; offset: number; limit: number; separateAxes?: boolean; }
export interface VisualPoint { key: string; label: string; categoryKey?: string; exact: string | null; compareExact: string | null; value: number | null; comparison: number | null; rowIndex: number | null; }
const scalar = (v: unknown): unknown => v && typeof v === 'object' && 'value' in v ? (v as {value: unknown}).value : v;
export function field(row: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(row, key)) return scalar(row[key]);
  let value: any = row;
  for (const part of key.split('.')) { if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return null; value = value[part]; }
  return scalar(value);
}
export function decimal(value: unknown): string | null {
  value = scalar(value);
  if (typeof value === 'number') return Number.isFinite(value) ? expandNumber(value) : null;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s.length <= 512 && /^[+-]?\d+(?:\.\d+)?$/.test(s) ? s : null;
}
function expandNumber(value: number): string {
  const s = String(value);
  if (!/[eE]/.test(s)) return s;
  const [base, exp] = s.toLowerCase().split('e'), negative = base.startsWith('-'), digits = base.replace(/[-.]/g, '');
  const point = (base.replace('-', '').split('.')[0].length) + Number(exp);
  const plain = point <= 0 ? '0.' + '0'.repeat(-point) + digits : point >= digits.length ? digits + '0'.repeat(point - digits.length) : digits.slice(0, point) + '.' + digits.slice(point);
  return (negative ? '-' : '') + plain;
}
export function labelValue(v: unknown): string {
  v = scalar(v);
  if (v === null || v === undefined || v === '') return 'Unspecified';
  if (typeof v === 'boolean') return v ? 'Recorded yes' : 'Recorded no';
  return typeof v === 'object' ? 'Structured value' : String(v);
}
/** Display labels may coincide; typed source values must still remain distinct groups. */
export function categoryIdentity(value: unknown): string {
  value = scalar(value);
  if (value === null || value === undefined) return 'missing';
  if (typeof value === 'object') return `object:${JSON.stringify(value)}`;
  return `${typeof value}:${String(value)}`;
}
export function exactLabel(value: string | null): string {
  if (value === null) return 'Unavailable';
  const [whole, fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction !== undefined ? '.' + fraction : '');
}
/** Chart geometry uses finite doubles only; exact strings are retained in tooltips and exports. */
export function plotCoordinate(exact: string | null): number | null {
  if (exact === null) return null;
  const n = Number(exact); return Number.isFinite(n) ? n : null;
}
export function graphPoints(dataset: VisualDataset, input: VisualSettings) {
  const dimension = dataset.dimensions.find(d => d.key === input.dimension) || dataset.dimensions[0];
  const metric = dataset.measures.find(m => m.key === input.measure) || dataset.measures[0];
  const comparison = dataset.measures.find(m => m.key === input.compare && (input.separateAxes || m.unit === metric?.unit) && m.key !== metric?.key);
  const term = input.search.trim().toLocaleLowerCase('en-GB');
  let points: VisualPoint[] = [];
  let excluded = 0;
  if (input.mode === 'records' || !metric) {
    const counts = new Map<string, { label: string; count: number }>();
    for (const row of dataset.rows) {
      const value = dimension ? field(row, dimension.key) : 'Returned records';
      const label = labelValue(value), key = categoryIdentity(value);
      if (!term || label.toLocaleLowerCase('en-GB').includes(term)) {
        const group = counts.get(key);
        if (group) group.count++;
        else counts.set(key, { label, count: 1 });
      }
    }
    const labels = new Map<string, number>();
    for (const group of counts.values()) labels.set(group.label, (labels.get(group.label) || 0) + 1);
    points = [...counts].map(([key, {label, count}]) => ({ key, categoryKey: key,
      label: (labels.get(label) || 0) > 1 ? `${label} (${key === 'missing' ? 'missing' : key === 'string:' ? 'empty text' : key.startsWith('string:') ? 'text' : key.split(':')[0]})` : label,
      exact: String(count), compareExact: null, value: count, comparison: null, rowIndex: null }));
  } else {
    dataset.rows.forEach((row, index) => {
      const label = dimension ? labelValue(field(row, dimension.key)) : `Row ${index + 1}`;
      if (term && !label.toLocaleLowerCase('en-GB').includes(term)) return;
      const exact = decimal(field(row, metric.key)), compareExact = comparison ? decimal(field(row, comparison.key)) : null;
      const value = plotCoordinate(exact); if (value === null) excluded++;
      points.push({ key: String(index), categoryKey: dimension ? categoryIdentity(field(row, dimension.key)) : String(index), label, exact, compareExact, value, comparison: plotCoordinate(compareExact), rowIndex: index });
    });
  }
  const collator = new Intl.Collator('en-GB', { numeric: true });
  if (input.sort !== 'source') points.sort((a, b) => {
    if (input.sort === 'label') return collator.compare(a.label, b.label) || Number(a.key) - Number(b.key);
    if (a.exact === null || b.exact === null) return a.exact === b.exact ? 0 : a.exact === null ? 1 : -1;
    return compareExactDecimal(a.exact, b.exact) * (input.sort === 'descending' ? -1 : 1) || Number(a.key) - Number(b.key);
  });
  const limit = [10, 25, 50, 100, 250].includes(input.limit) ? input.limit : 25;
  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.min(Math.max(0, points.length - limit), Math.floor(input.offset))) : 0;
  return { points: points.slice(offset, offset + limit), all: points, total: points.length, offset, limit, excluded,
    metric: input.mode === 'records' || !metric ? { key: '__records', label: 'Returned Record Count', unit: 'returned records' } : metric,
    comparison: input.mode === 'records' ? undefined : comparison, dimension, mode: input.mode === 'records' || !metric ? 'records' : 'values',
    imprecise: points.some(p => p.exact !== null && (p.exact.replace(/[-+.]/g, '').length > 14 || Math.abs(Number(p.exact)) > Number.MAX_SAFE_INTEGER || p.value === null)),
  };
}
export function chartAllowed(kind: VisualKind, dimension: Dimension | undefined, mode: string, compared: boolean): boolean {
  if (kind === 'donut') return mode === 'records' && !compared;
  if (kind === 'scatter') return mode === 'values' && compared;
  if (kind === 'line' || kind === 'area') return !!dimension?.ordered;
  return true;
}
export function plotCsv(points: VisualPoint[], metric: Measure, comparison: Measure | undefined, dataset: VisualDataset): string {
  const escape = (v: unknown) => { const s = String(v ?? ''); const safe = decimal(s) === null && /^[\s\uFEFF]*[=+\-@]/.test(s) ? `'${s}` : s; return '"' + safe.replace(/"/g, '""') + '"'; };
  const headers = ['Label', metric.label, ...(comparison ? [comparison.label] : []), 'Dataset', 'Scope note'];
  return '\uFEFF' + [headers, ...points.map(p => [p.label, p.exact, ...(comparison ? [p.compareExact] : []), dataset.title, dataset.note])].map(row => row.map(escape).join(',')).join('\r\n');
}
