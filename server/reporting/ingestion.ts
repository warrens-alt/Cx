import { createHash } from 'node:crypto';
import { FACTS, type Fact } from '../../contracts/reporting';
import { canonical } from './execution';
import { isoTimestamp } from './scope';
import { RequestError } from '../bigquery/filters';
export interface SourceContract { tenant_id: string; source_id: string; entity_kind: Fact; contract_version: string; status: 'APPROVED' | 'DRAFT'; owner: string; approval_reference: string; record_semantics: 'immutable_event' | 'versioned_entity'; }
export interface InputRecord { source_record_id: string; revision: number; source_updated_at: string; payload: Record<string, unknown>; }
export const entityKey = (tenant: string, kind: Fact, source: string, id: string) => createHash('sha256').update(JSON.stringify([tenant,kind,source,id])).digest('hex').toUpperCase();
const required: Record<Fact,string[]> = {leads:['captured_at','source'],deliveries:['lead_key','vendor','attempted_at'],calls:['delivery_key','event_at'],sales:['delivery_key','event_at'],activations:['sale_key','event_at'],commercial:['sale_key','event_at','stage','amount_delta','currency','agreement_version']};
export function normalizeBatch(contract: SourceContract, batchId: string, records: InputRecord[], recordedAt: string) {
  if (!contract || contract.status !== 'APPROVED' || !contract.owner?.trim() || !contract.approval_reference?.trim() || !contract.contract_version || !FACTS.includes(contract.entity_kind)) throw new RequestError('An approved source contract with an owner and evidence reference is required');
  if (!['immutable_event','versioned_entity'].includes(contract.record_semantics) || !/^[A-Za-z0-9_-]{1,80}$/.test(contract.tenant_id) || !/^[A-Za-z0-9_-]{1,80}$/.test(contract.source_id) || !/^[A-Za-z0-9_-]{1,100}$/.test(batchId)) throw new RequestError('Invalid ingestion identity or record semantics');
  if (['calls','commercial'].includes(contract.entity_kind) && contract.record_semantics !== 'immutable_event') throw new RequestError('Call attempts and commercial deltas require immutable event IDs, not cumulative counters');
  const recorded_at = isoTimestamp(recordedAt,'recorded_at');
  const seen=new Map<string,string>();
  return records.map((r,index)=>{
    if (!r || typeof r.source_record_id!=='string' || !r.source_record_id.trim() || r.source_record_id.length>200 || !Number.isSafeInteger(r.revision) || r.revision<0 || !r.payload || typeof r.payload!=='object' || Array.isArray(r.payload)) throw new RequestError(`Invalid input record ${index}`);
    if(contract.record_semantics==='immutable_event' && r.revision!==0) throw new RequestError('Immutable events use revision zero; corrections require a separate linked event');
    const source_updated_at=isoTimestamp(r.source_updated_at,'source_updated_at');
    if(Date.parse(source_updated_at)>Date.parse(recorded_at)) throw new RequestError('Source update cannot be after ingestion time');
    for(const key of required[contract.entity_kind]) if(typeof r.payload[key]!=='string'||!String(r.payload[key]).trim()) throw new RequestError(`Record ${index}: ${key} is required`);
    for(const key of ['captured_at','attempted_at','delivered_at','event_at']) if(r.payload[key]!=null) { const t=isoTimestamp(r.payload[key],key); if(Date.parse(t)>Date.parse(recorded_at)) throw new RequestError(`${key} cannot be an observed event in the future`); }
    for(const key of ['lead_key','delivery_key','sale_key']) if(r.payload[key]!=null && !/^[A-F0-9]{64}$/.test(String(r.payload[key]))) throw new RequestError(`Record ${index}: ${key} requires a resolved namespaced entity key`);
    if(contract.entity_kind==='commercial') {
      if(!/^-?\d{1,29}(\.\d{1,9})?$/.test(String(r.payload.amount_delta)) || !/^[A-Z]{3}$/.test(String(r.payload.currency)) || !['expected','approved','invoiced','collected'].includes(String(r.payload.stage))) throw new RequestError('Commercial stage, decimal precision or currency is invalid');
    }
    const payload_hash=createHash('sha256').update(canonical(r.payload)).digest('hex');
    const entity_key=entityKey(contract.tenant_id,contract.entity_kind,contract.source_id,r.source_record_id), version=`${entity_key}:${r.revision}`;
    if(seen.has(version)) throw new RequestError(seen.get(version)===payload_hash?'Duplicate version within batch; replay the original batch instead':'Conflicting payloads for the same source version');
    seen.set(version,payload_hash);
    return {tenant_id:contract.tenant_id,source_id:contract.source_id,entity_kind:contract.entity_kind,entity_key,source_record_id:r.source_record_id,revision:r.revision,
      recorded_at,source_updated_at,batch_id:batchId,contract_version:contract.contract_version,payload:r.payload,payload_hash};
  });
}
