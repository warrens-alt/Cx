import React, { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, Download, Filter, Search, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PAGE_TITLES } from '../../contracts/naming';
import type { ExceptionRuleResult, ExceptionStatus } from '../../contracts/operations';
import { exactNumber } from '../../contracts/format';
import { useClient } from '../lib/ClientContext';
import { reportingRequest, type ExceptionCatalogueResponse } from '../lib/reportingClient';
import EvidenceScopeBar from '../components/operations/EvidenceScopeBar';
import WorkspaceState from '../components/operations/WorkspaceState';
import MetricRail from '../components/operations/MetricRail';
import { VisualTable } from '../components/visuals/DataVisual';

const statusLabel:Record<ExceptionStatus,string>={AVAILABLE:'Evidence checked',CONFIGURATION_REQUIRED:'Configuration required',SOURCE_UNAVAILABLE:'Source unavailable',RULE_NOT_SUPPORTED:'Not supported'};
const exportJson=(data:unknown,name:string)=>{const href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};

export default function Exceptions() {
  const {selectedClient}=useClient();
  const query=useQuery<ExceptionCatalogueResponse>({queryKey:['exceptions-catalogue',selectedClient],queryFn:({signal})=>reportingRequest('/exceptions?'+new URLSearchParams({tenantId:selectedClient}),signal),retry:false,staleTime:60000});
  const rules=query.data?.rules??[];
  const [search,setSearch]=useState(''), deferredSearch=useDeferredValue(search.trim().toLowerCase());
  const [status,setStatus]=useState<'ALL'|ExceptionStatus>('ALL'), [severity,setSeverity]=useState('ALL'), [selected,setSelected]=useState<string|null>(null), [page,setPage]=useState(0);
  const filtered=useMemo(()=>rules.filter(rule=>(status==='ALL'||rule.status===status)&&(severity==='ALL'||rule.severity===severity)&&(!deferredSearch||`${rule.label} ${rule.population} ${rule.vendor??''}`.toLowerCase().includes(deferredSearch))),[rules,status,severity,deferredSearch]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/8)), pageRows=filtered.slice(page*8,page*8+8), selectedRule=rules.find(rule=>rule.id===selected)??filtered[0]??null;
  const checkedCount=rules.filter(rule=>rule.status==='AVAILABLE').reduce((sum,rule)=>sum+BigInt(rule.count??'0'),0n).toString();
  const configCount=String(rules.filter(rule=>rule.status==='CONFIGURATION_REQUIRED').length), sourceCount=String(rules.filter(rule=>rule.status==='SOURCE_UNAVAILABLE').length);
  const openStatus=(next:'ALL'|ExceptionStatus)=>{setStatus(next);setPage(0);};
  return <div className="cx-page cx-ops-page cx-exceptions-page">
    <header className="cx-page-header"><div><p className="cx-ops-eyebrow">Operational action centre</p><h1 className="text-page-title">{PAGE_TITLES['/exceptions']}</h1><p>Turn operational evidence into an inspectable rule queue while keeping missing thresholds, mappings and sources visibly unavailable.</p></div><button type="button" className="cx-button-secondary" onClick={()=>exportJson(filtered,'cx-exception-rules.json')}><Download size={15}/>Export matching rules</button></header>
    <EvidenceScopeBar releaseId={query.data?.releaseId} cutoff={query.data?.cutoff} busy={query.isFetching}/>
    <WorkspaceState loading={query.isLoading} error={query.error} missingRelease={query.data&&!query.data.available?query.data.reason:null} retry={()=>query.refetch()}/>
    {query.data?.available&&<>
      <MetricRail items={[{id:'checked',label:'Evidence-backed exception count',value:exactNumber(checkedCount),note:'Counts only rules supported by published release validation; unavailable rules are excluded.'},{id:'config',label:'Rules needing configuration',value:exactNumber(configCount),note:'SLA, freshness, eligibility or threshold approval is required.'},{id:'source',label:'Rules missing source evidence',value:exactNumber(sourceCount),note:'Missing facts remain unavailable rather than becoming zero.'},{id:'rules',label:'Rules in catalogue',value:exactNumber(String(rules.length)),note:`Release ${query.data.releaseId} · cutoff ${query.data.cutoff?.slice(0,10)}`}]}/>
      <section className="enterprise-card cx-exception-queue"><header><div><p className="cx-ops-eyebrow">Workflow queue</p><h2>Operational exception rules</h2><p>Counts are published only when the rule has evidence. Configuration-required rows do not imply zero affected records.</p></div><span className="cx-status">{filtered.length} matching rules</span></header>
        <div className="cx-exception-tabs" role="tablist" aria-label="Exception status"><button role="tab" aria-selected={status==='ALL'} onClick={()=>openStatus('ALL')}>All <span>{rules.length}</span></button>{(['AVAILABLE','CONFIGURATION_REQUIRED','SOURCE_UNAVAILABLE'] as ExceptionStatus[]).map(item=><button key={item} role="tab" aria-selected={status===item} onClick={()=>openStatus(item)}>{item==='AVAILABLE'?'Evidence checked':item==='CONFIGURATION_REQUIRED'?'Needs configuration':'Source unavailable'} <span>{rules.filter(rule=>rule.status===item).length}</span></button>)}</div>
        <div className="cx-ops-table-tools"><label><Search size={15}/><span className="sr-only">Search exception rules</span><input value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}} placeholder="Search rule or population"/></label><label><Filter size={15}/><span className="sr-only">Filter by severity</span><select aria-label="Filter by severity" value={severity} onChange={event=>{setSeverity(event.target.value);setPage(0);}}><option value="ALL">All severities</option>{['critical','high','medium','low','information'].map(item=><option key={item} value={item}>{item}</option>)}</select></label></div>
        <div className="cx-exception-layout"><div className="cx-ops-table-scroll"><VisualTable initialView="table" visual={{id:'operations.exceptions',data:pageRows}} className="enterprise-table" aria-label="Operational exception rules"><thead><tr><th scope="col">Rule</th><th scope="col">Population</th><th scope="col">Count</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Owner</th></tr></thead><tbody>{pageRows.map(rule=><tr key={rule.id} data-selected={selectedRule?.id===rule.id}><th scope="row"><button type="button" className="cx-link-button" onClick={()=>setSelected(rule.id)}>{rule.label}</button></th><td>{rule.population}</td><td>{rule.count===null?<span title="No evidence-backed count is available">Unavailable</span>:exactNumber(rule.count)}</td><td><span className="cx-severity" data-severity={rule.severity}>{rule.severity}</span></td><td><span className="cx-rule-status" data-status={rule.status}>{statusLabel[rule.status]}</span></td><td>{rule.owner??'Not configured'}</td></tr>)}</tbody></VisualTable></div>
          {selectedRule&&<RuleDetail rule={selectedRule}/>}</div>
        {!filtered.length&&<p className="cx-ops-empty" role="status">No exception rules match these local controls.</p>}
        <footer><span>Showing {filtered.length?page*8+1:0}–{Math.min((page+1)*8,filtered.length)} of {filtered.length} matching rules</span><div><button className="cx-button-secondary" disabled={page===0} onClick={()=>setPage(old=>old-1)}>Previous</button><button className="cx-button-secondary" disabled={page+1>=pageCount} onClick={()=>setPage(old=>old+1)}>Next</button></div></footer>
      </section>
      <section className="cx-exception-principles"><article><ShieldCheck size={20}/><div><h2>Observed evidence stays separate</h2><p>Sales never create a call or RPC. Release validation never substitutes for a period-specific operational query.</p></div></article><article><AlertTriangle size={20}/><div><h2>Thresholds require approval</h2><p>Operating hours, SLAs, freshness limits, retry limits and activation eligibility are configuration—not presentation defaults.</p></div></article></section>
    </>}
  </div>;
}

function RuleDetail({rule}:{rule:ExceptionRuleResult}) {
  return <aside className="cx-exception-detail" aria-label={`Rule detail: ${rule.label}`}><span className="cx-severity" data-severity={rule.severity}>{rule.severity}</span><h3>{rule.label}</h3><p>{rule.description}</p><dl><div><dt>Evidence status</dt><dd>{statusLabel[rule.status]}</dd></div><div><dt>Population</dt><dd>{rule.population}</dd></div><div><dt>Scope basis</dt><dd>{rule.scopeBasis==='release_validation'?'Release-wide validation':'Selected period'}</dd></div><div><dt>Source facts</dt><dd>{rule.sourceEvidence.join(', ')||'Not mapped'}</dd></div><div><dt>Age</dt><dd>{rule.age??'Unavailable'}</dd></div><div><dt>Owner</dt><dd>{rule.owner??'Not configured'}</dd></div></dl>{rule.reason&&<p className="cx-ops-unavailable"><AlertTriangle size={16}/>{rule.reason}</p>}{rule.recordsPath?<a className="cx-button-primary" href={rule.recordsPath}>Open affected records</a>:<button className="cx-button-secondary" disabled>Records unavailable until rule executes</button>}</aside>;
}
