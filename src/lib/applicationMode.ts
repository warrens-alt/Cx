export type ApplicationMode = 'live' | 'demo';

export const DEMO_ENTRY_URL = '/overview?mode=demo';
export const LIVE_ENTRY_URL = '/reports?mode=live';

/** Demo is an explicit client-only presentation choice, never an authentication fallback. */
export function applicationMode(search: string): ApplicationMode {
  const modes = new URLSearchParams(search).getAll('mode');
  return modes.length === 1 && modes[0] === 'demo' ? 'demo' : 'live';
}
