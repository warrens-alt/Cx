export interface ConnectionHealth { status: 'Connected'; latestData: string | null; freshnessVerified: false; }

/** Accept the current scalar contract and older BigQuery timestamp wrappers during a rolling app update. */
export function connectionHealth(input: unknown): ConnectionHealth {
  if (!input || typeof input !== 'object' || Array.isArray(input) || (input as Record<string, unknown>).status !== 'Connected') {
    throw new Error('The connection API returned an invalid health result. No connection success was assumed.');
  }
  const value = (input as Record<string, unknown>).latestData;
  if (value && typeof value === 'object' && (Array.isArray(value) || !Object.hasOwn(value, 'value'))) {
    throw new Error('The connection API returned an invalid source timestamp. Source freshness remains unverified.');
  }
  const timestamp = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>).value : value;
  if (timestamp !== null && timestamp !== undefined && (typeof timestamp !== 'string' || !timestamp.trim() || !Number.isFinite(Date.parse(timestamp)))) {
    throw new Error('The connection API returned an invalid source timestamp. Source freshness remains unverified.');
  }
  return { status: 'Connected', latestData: timestamp == null ? null : new Date(timestamp as string).toISOString(), freshnessVerified: false };
}
