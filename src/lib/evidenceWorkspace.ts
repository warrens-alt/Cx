import type { MetricResult, ReportResult } from '../../contracts/reporting';
import { compareExactDecimal, divideExactDecimal, subtractExactDecimals } from '../../contracts/exactDecimal';

export interface ReportPeriod { startDate: string; endDate: string; }
export interface VendorMetricRow { key: string; group: string; rawGroup: string | null; metrics: Record<string, MetricResult>; }

const DAY = 86400000;
const day = (value: string) => Date.parse(`${value}T00:00:00.000Z`);
const iso = (value: number) => new Date(value).toISOString().slice(0, 10);

export function previousComparablePeriod(startDate: string, endDate: string): ReportPeriod {
  const start = day(startDate), end = day(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) throw new Error('Invalid report period.');
  const duration = end - start + DAY;
  return { startDate: iso(start - duration), endDate: iso(start - DAY) };
}
/** Previous calendar month, capped to the same count of calendar days for matched-day comparison. */
export function previousMatchedDays(startDate: string, endDate: string): ReportPeriod {
  const start = new Date(`${startDate}T00:00:00.000Z`), end = new Date(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new Error('Invalid report period.');
  const days = Math.floor((end.getTime() - start.getTime()) / DAY) + 1;
  const previousStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  const previousLast = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0));
  const previousEnd = new Date(Math.min(previousStart.getTime() + (days - 1) * DAY, previousLast.getTime()));
  return { startDate: iso(previousStart.getTime()), endDate: iso(previousEnd.getTime()) };
}

export function pivotReportGroups(report: ReportResult | null | undefined): VendorMetricRow[] {
  if (!report) return [];
  const map = new Map<string | null, Record<string, MetricResult>>();
  for (const metric of report.groups) {
    const group = metric.group;
    const row = map.get(group) ?? {};
    row[metric.metricId] = metric;
    map.set(group, row);
  }
  return [...map].map(([rawGroup, metrics]) => ({ key: JSON.stringify(rawGroup), group: rawGroup ?? 'Unspecified (missing value)', rawGroup, metrics }));
}

export function metricValue(report: ReportResult | null | undefined, metricId: string, group?: string): MetricResult | null {
  const rows = group === undefined ? report?.totals : report?.groups.filter(row => row.group === group);
  return rows?.find(row => row.metricId === metricId) ?? null;
}

export function exactMovement(current: string | null | undefined, previous: string | null | undefined, places = 1): string | null {
  if (current === null || current === undefined || previous === null || previous === undefined || compareExactDecimal(previous, '0') === 0) return null;
  const delta = subtractExactDecimals(current, previous);
  const ratio = divideExactDecimal(delta, previous.startsWith('-') ? previous.slice(1) : previous, places + 2);
  return ratio === null ? null : divideExactDecimal(ratio, '0.01', places);
}

/** Number conversion is intentionally isolated to chart coordinates. Exact strings remain in labels/tables. */
export function chartCoordinate(value: string | null | undefined): number | null {
  if (value === null || value === undefined || !/^-?\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
