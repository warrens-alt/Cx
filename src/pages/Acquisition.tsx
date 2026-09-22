import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleSlash2, Database, FileSearch } from 'lucide-react';
import { VisualTable } from '../components/visuals/DataVisual';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { DataState } from '../components/DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { compareExactDecimals, exactRatioPercent } from '../lib/acquisition';
import { exactNumber } from '../../contracts/format';
import '../styles/acquisition.css';

type AcquisitionView = 'performance' | 'readiness' | 'evidence';
interface Metric {
  id: string;
  label: string;
  value: string | null;
  status: string;
  validRows?: string | null;
  missingRows?: string | null;
  invalidRows?: string | null;
  reason?: string | null;
  sourceField?: string | null;
}
interface ChannelGroup { group: string | null; metrics: Metric[]; }
interface AcquisitionData {
  metrics: Metric[];
  groups: ChannelGroup[];
  scope: { startDate: string; endDate: string };
  dateBasis: string;
  timezone?: string;
  timezoneVerified?: boolean;
  table: string;
  queryJobId?: string | null;
  generatedAt?: string;
  validationStatus: string;
  warning: string;
  populationNote?: string;
  rowGrain?: string;
  financialReason: string;
}

const FINANCIAL_FIELDS = ['Budget', 'Incurred spend', 'CPL', 'ROAS'];

function metricById(metrics: Metric[], id: string): Metric {
  return metrics.find(metric => metric.id === id) ?? { id, label: id, value: null, status: 'UNAVAILABLE', reason: 'Metric was not returned.' };
}

function displayValue(value: string | null): string {
  return value === null ? 'Unavailable' : exactNumber(value);
}

function friendlyStatus(status: string): string {
  return status === 'MEASURED' ? 'Measured' : status === 'DERIVED' ? 'Derived' : status === 'PARTIAL' ? 'Partial' : 'Unavailable';
}

function statusIcon(status: string) {
  return status === 'MEASURED' || status === 'DERIVED' ? <CheckCircle2 size={13} aria-hidden="true"/> : <AlertTriangle size={13} aria-hidden="true"/>;
}

function metricRatio(numerator: Metric, denominator: Metric): string | null {
  if (numerator.status !== 'MEASURED' || denominator.status !== 'MEASURED') return null;
  return exactRatioPercent(numerator.value, denominator.value);
}

function MetricSummary({ label, value, status }: { label: string; value: string; status: string }) {
  return <article><h2>{label}</h2><strong>{value}</strong><span className="cx-status" data-status={status}>{statusIcon(status)}{friendlyStatus(status)}</span></article>;
}

function FinancialReadiness({ compact = false, reason }: { compact?: boolean; reason: string }) {
  return <section className="acquisition-readiness" role="note">
    <div className="acquisition-readiness-header"><AlertTriangle size={22} aria-hidden="true"/><div><h2>Spend-based metrics unavailable</h2><p>{compact ? reason : 'Budget, incurred spend, CPL, and ROAS are withheld until spend and attribution mappings are verified.'}</p></div></div>
    <div className="acquisition-readiness-grid">{FINANCIAL_FIELDS.map(label => <div key={label}><span>{label}</span><strong><CircleSlash2 size={14} aria-hidden="true"/>Unavailable</strong></div>)}</div>
  </section>;
}

function EvidenceDetails({ data, open = false }: { data: AcquisitionData; open?: boolean }) {
  return <details className="enterprise-card acquisition-evidence" open={open}><summary><FileSearch size={17} aria-hidden="true"/>Scope &amp; evidence</summary>
    <dl className="acquisition-evidence-grid">
      <div><dt>Selected media period</dt><dd>{data.scope.startDate} to {data.scope.endDate}</dd></div>
      <div><dt>Date basis</dt><dd>{data.dateBasis}</dd></div>
      <div><dt>Source relation</dt><dd>{data.table}</dd></div>
      <div><dt>Query job</dt><dd>{data.queryJobId ?? 'Unavailable'}</dd></div>
      <div><dt>Timezone</dt><dd>{data.timezone ?? 'Unavailable'} · {data.timezoneVerified ? 'verified' : 'not independently verified'}</dd></div>
      <div><dt>Validation status</dt><dd>{data.validationStatus}</dd></div>
      <div><dt>Row grain</dt><dd>{data.rowGrain ?? 'physical_source_row'}</dd></div>
      <div><dt>Population boundary</dt><dd>{data.populationNote ?? data.warning}</dd></div>
    </dl>
  </details>;
}

function aggregateStatus(metrics: Metric[]): string {
  if (metrics.some(metric => metric.status === 'UNAVAILABLE')) return 'UNAVAILABLE';
  if (metrics.some(metric => metric.status === 'PARTIAL')) return 'PARTIAL';
  return metrics.every(metric => metric.status === 'MEASURED') ? 'MEASURED' : 'UNAVAILABLE';
}

export default function Acquisition() {
  const { data, loading, error, refetch } = useAnalyticsData<AcquisitionData>('acquisition');
  const [view, setView] = useState<AcquisitionView>('performance');
  if (loading || error || !data) return <PageShell><PageHeader title="Acquisition & Media" description="API-sourced media records. Platform lead actions are separate from ledger leads."/><DataState loading={loading} error={error} empty={!data && !loading && !error} retry={refetch}/></PageShell>;

  const rows = data.metrics;
  const sourceRows = metricById(rows, 'source_rows');
  const impressions = metricById(rows, 'impressions');
  const clicks = metricById(rows, 'clicks');
  const platformLeads = metricById(rows, 'platform_leads');
  const ctr = metricRatio(clicks, impressions);
  const leadActionRate = metricRatio(platformLeads, clicks);
  const largestChannelImpressions = data.groups.reduce<string | null>((largest, group) => {
    const value = metricById(group.metrics, 'impressions').value;
    return compareExactDecimals(value, largest) > 0 ? value : largest;
  }, null);

  return <PageShell className="acquisition-page">
    <PageHeader title="Acquisition & Media" description="API-sourced media records. Platform lead actions are separate from ledger leads."/>
    <nav className="acquisition-tabs" aria-label="Acquisition report views">
      <button type="button" aria-pressed={view === 'performance'} onClick={() => setView('performance')}>Performance</button>
      <button type="button" aria-pressed={view === 'readiness'} onClick={() => setView('readiness')}>Data readiness</button>
      <button type="button" aria-pressed={view === 'evidence'} onClick={() => setView('evidence')}>Source evidence</button>
    </nav>

    {view === 'performance' && <div className="acquisition-panel">
      <section className="enterprise-card acquisition-summary" aria-label="Media performance summary">
        <MetricSummary label="Reported Impressions" value={displayValue(impressions.value)} status={impressions.status}/>
        <MetricSummary label="Reported Clicks" value={displayValue(clicks.value)} status={clicks.status}/>
        <MetricSummary label="Platform Lead Actions" value={displayValue(platformLeads.value)} status={platformLeads.status}/>
        <MetricSummary label="Media Source Rows" value={displayValue(sourceRows.value)} status={sourceRows.status}/>
        <MetricSummary label="Click-through rate" value={ctr === null ? 'Unavailable' : `${ctr}%`} status={ctr === null ? 'UNAVAILABLE' : 'DERIVED'}/>
        <MetricSummary label="Lead action rate" value={leadActionRate === null ? 'Unavailable' : `${leadActionRate}%`} status={leadActionRate === null ? 'UNAVAILABLE' : 'DERIVED'}/>
      </section>

      <FinancialReadiness reason={data.financialReason}/>

      <section className="enterprise-card acquisition-section" aria-labelledby="acquisition-journey-title">
        <header className="acquisition-section-header"><h2 id="acquisition-journey-title">Acquisition journey</h2><p>Source-platform stages only. Platform lead actions are not joined to ledger lead IDs on this page.</p></header>
        <div className="acquisition-journey">
          <div className="acquisition-step"><span>Impressions</span><strong>{displayValue(impressions.value)}</strong><small>{friendlyStatus(impressions.status)} source total</small></div>
          <div className="acquisition-connector"><div><ArrowRight size={17} aria-hidden="true"/></div><strong>{ctr === null ? 'Unavailable' : `${ctr}%`}</strong><span>Click-through rate</span></div>
          <div className="acquisition-step"><span>Clicks</span><strong>{displayValue(clicks.value)}</strong><small>{friendlyStatus(clicks.status)} source total</small></div>
          <div className="acquisition-connector"><div><ArrowRight size={17} aria-hidden="true"/></div><strong>{leadActionRate === null ? 'Unavailable' : `${leadActionRate}%`}</strong><span>Lead action rate</span></div>
          <div className="acquisition-step"><span>Platform lead actions</span><strong>{displayValue(platformLeads.value)}</strong><small>{friendlyStatus(platformLeads.status)} source total</small></div>
        </div>
      </section>

      <section className="enterprise-card acquisition-section" aria-labelledby="channel-performance-title">
        <header className="acquisition-section-header"><h2 id="channel-performance-title">Channel performance</h2><p>Like-for-like media-source measures by recorded channel. Bars compare reported impression volume within this result.</p></header>
        <div className="acquisition-table-wrap"><VisualTable visual={{id:'media.groups', data:data.groups}} initialView="table" className="enterprise-table acquisition-channel-table" aria-label="Media channel performance">
          <thead><tr><th scope="col">Channel</th><th scope="col" className="acquisition-number">Impressions</th><th scope="col" className="acquisition-number">Clicks</th><th scope="col" className="acquisition-number">Platform lead actions</th><th scope="col">Status</th></tr></thead>
          <tbody>{data.groups.map((group, index) => {
            const groupImpressions = metricById(group.metrics, 'impressions');
            const groupClicks = metricById(group.metrics, 'clicks');
            const groupLeads = metricById(group.metrics, 'platform_leads');
            const channelMetrics = [groupImpressions, groupClicks, groupLeads];
            const ratio = exactRatioPercent(groupImpressions.value, largestChannelImpressions, 1);
            const width = ratio === null ? 0 : Math.min(100, Math.max(4, Number(ratio)));
            const status = aggregateStatus(channelMetrics);
            return <tr key={`${group.group ?? 'unspecified'}-${index}`}><th scope="row"><div className="acquisition-channel-name"><strong>{group.group ?? 'Unspecified'}</strong><div className="acquisition-channel-bar" aria-hidden="true"><i style={{width:`${width}%`}}/></div></div></th><td className="acquisition-number">{displayValue(groupImpressions.value)}</td><td className="acquisition-number">{displayValue(groupClicks.value)}</td><td className="acquisition-number">{displayValue(groupLeads.value)}</td><td><span className="cx-status" data-status={status}>{friendlyStatus(status)}</span></td></tr>;
          })}
          {!data.groups.length && <tr><td colSpan={5} className="cx-empty-table">No media channel rows were returned for this period.</td></tr>}
          </tbody>
        </VisualTable></div>
      </section>
      <EvidenceDetails data={data}/>
    </div>}

    {view === 'readiness' && <div className="acquisition-readiness-page">
      <FinancialReadiness compact reason={data.financialReason}/>
      <section className="enterprise-card acquisition-coverage" aria-labelledby="metric-coverage-title"><header className="acquisition-section-header"><h2 id="metric-coverage-title">Media field coverage</h2><p>Missing or invalid source values prevent complete totals and derived rates.</p></header><ul>{rows.map(metric => <li key={metric.id}><div><strong>{metric.label}</strong><small>{metric.sourceField ? `Source field: ${metric.sourceField}` : 'Physical source row count'}</small></div><span className="cx-status" data-status={metric.status}>{friendlyStatus(metric.status)}</span></li>)}</ul></section>
    </div>}

    {view === 'evidence' && <div className="acquisition-panel">
      <section className="enterprise-card acquisition-source-note"><Database size={22} aria-hidden="true"/><p className="mt-3"><strong>Source interpretation.</strong> {data.warning}</p><p className="mt-2">Financial acquisition outputs stay withheld because a media budget is not incurred spend, and campaign-to-vendor commercial attribution has not been verified.</p></section>
      <EvidenceDetails data={data} open/>
    </div>}
  </PageShell>;
}
