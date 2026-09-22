export type SectionStatus = 'AVAILABLE' | 'QUERY_FAILED' | 'SOURCE_UNAVAILABLE' | 'CONFIGURATION_REQUIRED';

export interface SectionResult<T> {
  status: SectionStatus;
  data: T | null;
  reason: string | null;
}

export async function querySection<T>(task: () => Promise<T>, sourceAvailable = true): Promise<SectionResult<T>> {
  if (!sourceAvailable) return { status: 'SOURCE_UNAVAILABLE', data: null, reason: 'The required source is not configured for this workspace.' };
  try {
    return { status: 'AVAILABLE', data: await task(), reason: null };
  } catch {
    return { status: 'QUERY_FAILED', data: null, reason: 'Unavailable — this section could not be calculated.' };
  }
}

export function configurationRequired<T>(reason: string): SectionResult<T> {
  return { status: 'CONFIGURATION_REQUIRED', data: null, reason };
}
