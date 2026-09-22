import { configuredRelation } from './sourceSql';
import type { TenantConfiguration } from './config';
import { getBaseSemanticLayer as buildSemanticLayer } from './views.base';
import { vendorScope } from '../analyticsContext';

/**
 * Build the legacy semantic layer from explicit source and scope inputs.
 * Correctness-sensitive expressions live in the builder itself; runtime code never
 * rewrites generated SQL with string replacement.
 */
export function getBaseSemanticLayer(client: TenantConfiguration): string {
  if (client.dataSourceMode === 'shared') throw new Error('Shared-table tenant isolation has not been verified');
  const transactionVendor = vendorScope('t.hlc_vendor');
  const callVendor = vendorScope('vendor');
  return buildSemanticLayer(client, {
    callsRelation: configuredRelation(client, 'calls'),
    activationsRelation: configuredRelation(client, 'activations'),
    transactionVendorPredicate: transactionVendor.sql,
    callVendorPredicate: callVendor.sql,
  });
}
