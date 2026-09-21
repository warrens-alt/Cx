import type { FilterCondition } from '../../server/bigquery/filters';

/** Presentation labels only: the API keys and predicate values are unchanged. */
const labels: Record<string, string> = {
  vendor: 'Vendor', source: 'Lead source', medium: 'Traffic medium', grade: 'Recorded lead grade',
  vetting: 'Vetting classification', calls: 'Call attempts', sale: 'Sale recorded', sales: 'Sale recorded',
  activated: 'Activation recorded', rpc: 'Right-party contact recorded', valid_lead: 'Lead validity',
  valid_idno: 'National ID validity', phone_valid: 'Phone validity', lead_id: 'Lead record', consumer_id: 'Consumer record',
};
export const privateScopeKeys = new Set(['lead_id','consumer_id']);
export function filterLabel(key: string) { return labels[key] || key.replaceAll('_', ' '); }
export function filterDescription(key: string, condition: FilterCondition) {
  if (privateScopeKeys.has(key)) return 'Private selection · this session only';
  if (condition.operator === 'in') return condition.values?.join(', ') || 'No values';
  if (condition.operator === 'between') return `${condition.min}–${condition.max}`;
  if (condition.operator === 'equals') return typeof condition.value === 'boolean' ? (condition.value ? 'Recorded yes' : 'Recorded no') : String(condition.value);
  return `${condition.operator}: ${condition.value ?? ''}`;
}
