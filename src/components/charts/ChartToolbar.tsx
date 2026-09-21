import DataVisual from '../visuals/DataVisual';
import Modal from '../Modal';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Maximize2, Table as TableIcon } from 'lucide-react';
const DataAuditDrawer=React.lazy(()=>import('../DataAuditDrawer'));
export function ChartToolbar({title,subtitle,children,auditTitle,auditContext,auditGrain,visualData}:{title:string;subtitle?:string;children?:React.ReactNode;auditTitle?:string;auditContext?:any;auditGrain?:string;visualData?:unknown}){
  const [visualOpen,setVisualOpen]=useState(false);
  const [open,setOpen]=useState(false),[error,setError]=useState<string|null>(null);
  const root=useRef<HTMLDivElement>(null),[expanded,setExpanded]=useState(false);
  useEffect(()=>{const change=()=>setExpanded(document.fullscreenElement===root.current?.closest('.enterprise-card'));document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
  const fullscreen=async()=>{setError(null);const card=root.current?.closest('.enterprise-card');try{
    if(document.fullscreenElement===card)await document.exitFullscreen();else if(card?.requestFullscreen)await card.requestFullscreen();else setError('Full-screen mode is not supported in this browser.');
  }catch{setError('Full-screen mode could not be opened.');}};
  return <div ref={root} className="cx-chart-toolbar"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}{error&&<p role="status">{error}</p>}</div>
    <div className="cx-inline-actions">{children}{visualData!==undefined&&<button type="button" className="cx-button-secondary" onClick={()=>setVisualOpen(true)}>Adjust visual</button>}{auditTitle&&<button type="button" className="cx-button-secondary" onClick={()=>setOpen(true)}><TableIcon size={14}/>View Data</button>}
      <button type="button" className="cx-icon-button" aria-label={`${expanded?'Exit full screen':'Expand chart'}: ${title}`} title={expanded?'Exit full screen':'Full screen'} onClick={fullscreen}><Maximize2 size={16}/></button>
    </div>{visualOpen&&<Modal open label={`Adjust visual: ${title}`} onClose={()=>setVisualOpen(false)} className="cx-chart-adjust-modal"><div className="p-4"><button type="button" className="cx-button-secondary mb-3" onClick={()=>setVisualOpen(false)}>Close visual controls</button><DataVisual id={'chart.'+title} data={visualData} context={{title,note:subtitle||'Returned chart input rows. No recalculation or source completeness is inferred.'}}/></div></Modal>}{open&&auditTitle&&<Suspense fallback={<p role="status">Loading records…</p>}><DataAuditDrawer isOpen onClose={()=>setOpen(false)} title={auditTitle} contextFilters={auditContext||{}} defaultGrain={auditGrain||'lead'}/></Suspense>}
  </div>;
}
