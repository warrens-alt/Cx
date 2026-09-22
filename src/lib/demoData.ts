/** Local, deterministic fixtures only. This module does not read or write any external data. */
export const DEMO_SCENARIO = Object.freeze({
  name: 'July 2026 synthetic demo',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  description: 'Fictional leads for interface demonstration only. Not connected to Google Cloud and not verified business or financial data.',
} as const);

export type DemoLead = {
  id: string;
  vendor: string;
  source: string;
  capturedAt: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Sale' | 'Activated';
  callAttempts: number;
  firstDialMinutes: number | null;
  revenueCents: number;
};

export interface DemoFilters {
  vendor?: string;
  source?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface DemoSummary {
  leads: number;
  contacted: number;
  sales: number;
  activations: number;
  callAttempts: number;
  revenueCents: number;
  /** Sale and Activated leads / all selected leads, as a percentage rounded to two decimals. */
  conversionRate: number;
  /** Activated leads / all selected leads, as a percentage rounded to two decimals. */
  activationRate: number;
}

const VENDORS = ['Demo Cedar', 'Demo Atlas', 'Demo Willow', 'Demo Harbor'] as const;
const SOURCES = ['Demo Search', 'Demo Social', 'Demo Referral'] as const;
const STATUSES: readonly DemoLead['status'][] = ['New', 'Contacted', 'Qualified', 'Sale', 'Activated'];
const pad = (value: number) => String(value).padStart(2, '0');

export const DEMO_LEADS: readonly DemoLead[] = Object.freeze(Array.from({ length: 31 * 8 }, (_, index): DemoLead => {
  const day = Math.floor(index / 8) + 1;
  const slot = index % 8;
  const vendorIndex = index % VENDORS.length;
  const status = STATUSES[index % STATUSES.length];
  const callAttempts = status === 'New' ? 0
    : status === 'Contacted' ? 1 + index % 2
    : status === 'Qualified' ? 2 + index % 3
    : status === 'Sale' ? 3 + index % 4
    : 4 + index % 4;
  return Object.freeze({
    id: `DEMO-202607${pad(day)}-${pad(slot + 1)}`,
    vendor: VENDORS[vendorIndex],
    source: SOURCES[(day - 1 + slot) % SOURCES.length],
    capturedAt: `2026-07-${pad(day)}T${pad(8 + slot)}:${pad((day * 11 + slot * 7) % 60)}:00.000Z`,
    status,
    callAttempts,
    firstDialMinutes: status === 'New' ? null : 3 + index * 7 % 88,
    revenueCents: status === 'Activated' ? 35_000 + vendorIndex * 12_000 + (day - 1) % 7 * 750 + slot * 37 : 0,
  });
}));

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

/** Empty selections mean all fixture rows; invalid or reversed date ranges produce no matches. */
export function filterDemoLeads(filters: DemoFilters = {}): DemoLead[] {
  const start = filters.startDate?.trim() || '';
  const end = filters.endDate?.trim() || '';
  if (start && !validDate(start) || end && !validDate(end) || start && end && start > end) return [];
  const vendor = filters.vendor?.trim() || '';
  const source = filters.source?.trim() || '';
  const status = filters.status?.trim() || '';
  const search = filters.search?.trim().toLocaleLowerCase('en-GB') || '';
  return DEMO_LEADS.filter(row => {
    const date = row.capturedAt.slice(0, 10);
    return (!vendor || row.vendor === vendor)
      && (!source || row.source === source)
      && (!status || row.status === status)
      && (!start || date >= start)
      && (!end || date <= end)
      && (!search || [row.id, row.vendor, row.source, row.status, row.capturedAt].some(value => value.toLocaleLowerCase('en-GB').includes(search)));
  });
}

export function summariseDemoLeads(rows: readonly DemoLead[]): DemoSummary {
  const totals = { leads: rows.length, contacted: 0, sales: 0, activations: 0, callAttempts: 0, revenueCents: 0 };
  for (const row of rows) {
    if (row.status !== 'New') totals.contacted++;
    if (row.status === 'Sale' || row.status === 'Activated') totals.sales++;
    if (row.status === 'Activated') totals.activations++;
    totals.callAttempts += row.callAttempts;
    totals.revenueCents += row.revenueCents;
  }
  const percentage = (count: number) => totals.leads ? Math.round(count * 10_000 / totals.leads) / 100 : 0;
  return { ...totals, conversionRate: percentage(totals.sales), activationRate: percentage(totals.activations) };
}

/** Group totals reconcile to the selected rows; rates use each group's own lead denominator. */
export function groupDemoLeads(rows: readonly DemoLead[], key: 'vendor' | 'source'): Array<{ name: string } & DemoSummary> {
  const groups = new Map<string, DemoLead[]>();
  for (const row of rows) {
    const group = groups.get(row[key]);
    if (group) group.push(row);
    else groups.set(row[key], [row]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, 'en-GB'))
    .map(([name, group]) => ({ name, ...summariseDemoLeads(group) }));
}
