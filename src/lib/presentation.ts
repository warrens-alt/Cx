export type TableDensity = 'comfortable' | 'compact';
export const DENSITY_KEY = 'cx.presentation.density.v1';
export function safeDensity(value: unknown): TableDensity { return value === 'compact' ? 'compact' : 'comfortable'; }
export function isCurrentPage(pathname: string, path: string): boolean { return pathname === path || pathname.startsWith(path + '/'); }
/** Preserve legacy report filters when moving between legacy pages; evidence scope remains separate. */
export function navigationTarget(path: string, currentPath: string, search: string) {
  if (path !== '/reports' && currentPath !== '/reports') return { pathname: path, search };
  const workspace = new URLSearchParams();
  // Preserve repeated invalid values so navigation does not silently broaden their scope.
  for (const id of new URLSearchParams(search).getAll('workspace')) workspace.append('workspace', id);
  return { pathname: path, search: workspace.size ? '?' + workspace.toString() : '' };
}
export function utcDatePresets(now = new Date()) {
  const end = now.toISOString().slice(0,10);
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return [
    { id:'last7', label:'Last 7 days (UTC)', start:new Date(Date.parse(end)-6*86400000).toISOString().slice(0,10), end },
    { id:'last30', label:'Last 30 days (UTC)', start:new Date(Date.parse(end)-29*86400000).toISOString().slice(0,10), end },
    { id:'month', label:'This month to date (UTC)', start:end.slice(0,7)+'-01', end },
    { id:'previous', label:'Previous calendar month (UTC)', start:previousMonthEnd.toISOString().slice(0,7)+'-01', end:previousMonthEnd.toISOString().slice(0,10) },
  ];
}
