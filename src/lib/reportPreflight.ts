import { METRIC_BY_ID, type MetricResult, type ReportRequest } from '../../contracts/reporting';
import { reportRequest } from '../../server/reporting/scope';
import { exactNumber } from '../../contracts/format';

/** Reuse server request validation; this is feedback, never a replacement for server checks. */
export function validateReportDraft(scope: ReportRequest, releaseCutoff?: string): string | null {
  try {
    const checked = reportRequest(scope);
    if (releaseCutoff && Date.parse(checked.observationCutoff) > Date.parse(releaseCutoff)) {
      return 'Observation cutoff is later than the available release. Choose a time within the published evidence window.';
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review the report scope.';
    return message.replaceAll('startDate', 'From date').replaceAll('endDate', 'Through date').replaceAll('observationCutoff', 'Observation cutoff');
  }
}
export function unavailableDateMetrics(scope: ReportRequest): string[] {
  return scope.metrics.filter(id => METRIC_BY_ID[id] && !METRIC_BY_ID[id].dateBases.includes(scope.dateBasis)).map(id => METRIC_BY_ID[id].label);
}
export function formatReportValue(metric: MetricResult, currency: string): string {
  return metric.value === null ? 'Unavailable' : `${metric.unit === 'currency' ? currency + ' ' : ''}${exactNumber(metric.value, metric.unit === 'currency' ? 2 : 0)}${metric.unit === 'percent' ? '%' : ''}`;
}
