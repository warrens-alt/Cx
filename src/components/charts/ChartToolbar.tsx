import DataVisual from '../visuals/DataVisual';
import Modal from '../Modal';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Maximize2, Table as TableIcon } from 'lucide-react';
import { useFilters } from '../../lib/FilterContext';
import { useClient } from '../../lib/ClientContext';
import { filterDescription, filterLabel } from '../../lib/scopePresentation';
const DataAuditDrawer=React.lazy(()=>import('../DataAuditDrawer'));
const ExactValues=React.lazy(()=>import('../visuals/ExactValues'));
export function ChartToolbar({title,subtitle,children,auditTitle,auditContext,auditGrain,visualData}:{title:string;subtitle?:string;children?:React.ReactNode;auditTitle?:string;auditContext?:any;auditGrain?:string;visualData?:unknown}){
  const {startDate,endDate,filters}=useFilters();
  const {clientConfig}=useClient();
  const scopeNote=`${subtitle||'Returned chart input rows. No recalculation or source completeness is inferred.'} Workspace: ${clientConfig?.name||'Unavailable'}. Capture dates: ${startDate} to ${endDate}. ${Object.entries(filters).map(([key,condition])=>`${filterLabel(key)}: ${filterDescription(key,condition)}`).join('; ')||'No additional report filters.'}`;
  const [visualOpen,setVisualOpen]=useState(false);
  const [exactOpen,setExactOpen]=useState(false);
  const [open,setOpen]=useState(false),[error,setError]=useState<string|null>(null);
  const root=useRef<HTMLDivElement>(null),[expanded,setExpanded]=useState(false);
  useEffect(()=>{const change=()=>setExpanded(document.fullscreenElement===root.current?.closest('.enterprise-card'));document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
  const fullscreen=async()=>{setError(null);const card=root.current?.closest('.enterprise-card');try{
    if(document.fullscreenElement===card)await document.exitFullscreen();else if(card?.requestFullscreen)await card.requestFullscreen();else setError('Full-screen mode is not supported in this browser.');
  }catch{setError('Full-screen mode could not be opened.');}};
  return <div ref={root} className="cx-chart-toolbar"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}{error&&<p role="status">{error}</p>}</div>
    <div className="cx-inline-actions">{children}{visualData!==undefined&&<><button type="button" className="cx-button-secondary" onClick={()=>setExactOpen(true)}>Exact values</button><button type="button" className="cx-button-secondary" onClick={()=>setVisualOpen(true)}>Adjust visual</button></>}{auditTitle&&<button type="button" className="cx-button-secondary" onClick={()=>setOpen(true)}><TableIcon size={14}/>Supporting records</button>}
      <button type="button" className="cx-icon-button" aria-label={`${expanded?'Exit full screen':'Expand chart'}: ${title}`} title={expanded?'Exit full screen':'Full screen'} onClick={fullscreen}><Maximize2 size={16}/></button>
    </div>{exactOpen&&<Modal open label={`Exact values: ${title}`} onClose={()=>setExactOpen(false)} className="cx-chart-adjust-modal"><div className="p-4"><div className="cx-chart-modal-actions"><strong>{title}</strong><button type="button" className="cx-button-secondary" onClick={()=>setExactOpen(false)}>Close exact values</button></div><Suspense fallback={<p role="status">Loading exact values…</p>}><ExactValues data={visualData} title={title} note={scopeNote}/></Suspense></div></Modal>}{visualOpen&&<Modal open label={`Adjust visual: ${title}`} onClose={()=>setVisualOpen(false)} className="cx-chart-adjust-modal"><div className="p-4"><div className="cx-chart-modal-actions"><strong>{title}</strong><button type="button" className="cx-button-secondary" onClick={()=>setVisualOpen(false)}>Close visual controls</button></div><DataVisual id={'chart.'+title} data={visualData} context={{title,note:scopeNote}}/></div></Modal>}{open&&auditTitle&&<Suspense fallback={<p role="status">Loading records…</p>}><DataAuditDrawer isOpen onClose={()=>setOpen(false)} title={auditTitle} contextFilters={auditContext||{}} defaultGrain={auditGrain||'lead'}/></Suspense>}
  </div>;
}
