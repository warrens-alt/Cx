import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { compareExactDecimal } from '../../../contracts/exactDecimal';

export interface MetricRailItem { id: string; label: string; value: string; change?: string | null; comparison?: string; note?: string; status?: string; }

export default function MetricRail({ items }: { items: MetricRailItem[] }) {
  return <section className="cx-ops-metric-rail" aria-label="Key performance indicators">{items.map(item=>{
    const comparison = item.change === null || item.change === undefined ? null : compareExactDecimal(item.change, '0');
    const direction = comparison === null || comparison === 0 ? 'flat' : comparison < 0 ? 'down' : 'up';
    return <article key={item.id} data-status={item.status}><span>{item.label}</span><strong>{item.value}</strong>
      <div className="cx-ops-metric-context">{direction==='up'?<ArrowUpRight size={14}/>:direction==='down'?<ArrowDownRight size={14}/>:<Minus size={14}/>}<b>{item.change ? `${item.change}%` : 'No comparable value'}</b>{item.comparison&&<small>{item.comparison}</small>}</div>
      {item.note&&<p>{item.note}</p>}
    </article>;
  })}</section>;
}
