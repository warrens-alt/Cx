import React, { useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ReportResult } from '../../../contracts/reporting';
import { reportingRequest } from '../../lib/reportingClient';
import { VisualTable } from '../visuals/DataVisual';

export interface EvidenceSelection { metricId: string; group: string | null; groupIsNull?: boolean; label: string; }
export default function EvidenceInspector({ report, selection, onClose }: { report: ReportResult; selection: EvidenceSelection | null; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const query = useQuery<any>({
    queryKey: ['report-evidence', report.executionId, selection?.metricId, selection?.group, selection?.groupIsNull === true],
    queryFn: ({signal}) => reportingRequest('/evidence', signal, { token: report.token, metricId: selection!.metricId, group: selection!.group, groupIsNull: selection!.groupIsNull === true }),
    enabled: !!selection,
    retry: false,
    staleTime: Infinity,
  });
  if (!selection) return null;
  const rows = Array.isArray(query.data?.rows) ? query.data.rows : [];
  const matching = search ? rows.filter((row:any)=>JSON.stringify(row).toLowerCase().includes(search.toLowerCase())) : rows;
  const keys: string[] = [...new Set<string>(matching.slice(0,20).flatMap((row:Record<string,unknown>)=>Object.keys(row)))].slice(0,10);
  const download = () => { if(!query.data)return;const href=URL.createObjectURL(new Blob([JSON.stringify(query.data,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=href;anchor.download=`cx-evidence-${selection.metricId}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),1000); };
  return <aside className="enterprise-card cx-ops-inspector" aria-label={`Evidence for ${selection.label}`}><header><div><span>Supporting evidence</span><h2>{selection.label}{selection.groupIsNull?' · Unspecified (missing value)':selection.group!==null?` · ${selection.group}`:''}</h2><p>Execution {report.executionId.slice(0,12)} · release {report.releaseId}</p></div><button type="button" className="cx-icon-button" onClick={onClose} aria-label="Close evidence inspector"><X size={18}/></button></header>
    {query.isLoading&&<p role="status">Reading records from the same immutable snapshots…</p>}
    {query.error&&<p role="alert">{query.error.message}</p>}
    {query.data&&<><div className="cx-ops-inspector-actions"><label><Search size={15}/><span className="sr-only">Search loaded evidence</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search loaded evidence"/></label><button type="button" className="cx-button-secondary" onClick={download}><Download size={15}/>Export all {query.data.rowCount} scoped records</button></div>
      <p>{matching.length} matching of {query.data.rowCount} loaded records. Preview shows at most 20; the export contains the complete untruncated response.</p>
      <div className="cx-ops-table-scroll"><VisualTable initialView="table" visual={{id:'evidence.records',data:matching.slice(0,20),context:{metricId:selection.metricId}}} className="enterprise-table"><thead><tr>{keys.map(key=><th key={key} scope="col">{key.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{matching.slice(0,20).map((row:any,index:number)=><tr key={row.entity_key??index}>{keys.map(key=><td key={key}>{row[key]===null?'Unavailable':String(row[key])}</td>)}</tr>)}</tbody></VisualTable></div></>}
  </aside>;
}
