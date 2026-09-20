/** Runtime legacy descriptions share one source with the server; journey taxonomy is reference-only. */
export { LEGACY_METRICS as METRICS } from '../../contracts/legacyMetrics';
export type { LegacyMetricDefinition as MetricDefinition } from '../../contracts/legacyMetrics';
export { MASTER_TAXONOMY, TAXONOMY_BY_ITEM_NO, getTaxonomyItem } from './taxonomy';
export type { MetricTaxonomyItem } from './taxonomy';
