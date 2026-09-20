import { AsyncLocalStorage } from 'node:async_hooks';
import { conditionSql, validateScope, type QueryScope, type Scalar } from './bigquery/filters';
const storage = new AsyncLocalStorage<QueryScope>();
/** Isolated per asynchronous request. No mutable process-global tenant/filter state. */
export function withAnalyticsScope<T>(scope: QueryScope, work: () => T): T { return storage.run(validateScope(scope), work); }
export function currentAnalyticsScope(): QueryScope | undefined { return storage.getStore(); }
export function vendorScope(alias = 'vendor'): { sql: string; params: Record<string, Scalar> } {
  const filter = storage.getStore()?.filters?.vendor;
  const params: Record<string, Scalar> = {};
  return { sql: filter ? conditionSql(alias, filter, 'scope_vendor', params) : '', params };
}
