import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Grouping, ReportRequest, ReportResult } from '../../contracts/reporting';
import { useClient } from './ClientContext';
import { useFilters } from './FilterContext';
import { createEvidenceReport, reportingCatalogue, type ReportingCatalogue } from './reportingClient';
import { previousComparablePeriod, previousMatchedDays } from './evidenceWorkspace';

interface Options { metrics: string[]; grouping: Grouping; comparisons?: boolean; }

export function useEvidenceWorkspace({ metrics, grouping, comparisons = false }: Options) {
  const { selectedClient, clientConfig } = useClient();
  const { startDate, endDate, source, vendor, medium } = useFilters();
  const catalogue = useQuery<ReportingCatalogue>({
    queryKey: ['reporting-catalogue', selectedClient],
    queryFn: ({ signal }) => reportingCatalogue(selectedClient, signal),
    enabled: !!selectedClient,
    retry: false,
    staleTime: 60000,
  });
  const release = catalogue.data?.available ? catalogue.data.release : null;
  const base = useMemo<Omit<ReportRequest, 'startDate' | 'endDate'>>(() => ({
    tenantId: selectedClient,
    observationCutoff: release?.cutoff ?? '1970-01-01T00:00:00.000Z',
    dateBasis: 'capture_cohort',
    grouping,
    currency: clientConfig?.currency ?? 'ZAR',
    metrics,
    filters: {
      ...(vendor ? { vendor: vendor.split(',').map(value => value.trim()).filter(Boolean) } : {}),
      ...(source ? { source: source.split(',').map(value => value.trim()).filter(Boolean) } : {}),
      ...(medium ? { medium: medium.split(',').map(value => value.trim()).filter(Boolean) } : {}),
    },
  }), [selectedClient, release?.cutoff, grouping, clientConfig?.currency, metrics, vendor, source, medium]);
  const request = useMemo<ReportRequest>(() => ({ ...base, startDate, endDate }), [base, startDate, endDate]);
  const scopeAllowed = !!release && release.cutoff.slice(0, 10) >= endDate;
  const current = useQuery<ReportResult>({
    queryKey: ['evidence-workspace', release?.releaseId, request],
    queryFn: ({ signal }) => createEvidenceReport(request, release!.releaseId, signal),
    enabled: scopeAllowed,
    retry: false,
    staleTime: Infinity,
  });
  const previousPeriod = useMemo(() => previousComparablePeriod(startDate, endDate), [startDate, endDate]);
  const matchedPeriod = useMemo(() => previousMatchedDays(startDate, endDate), [startDate, endDate]);
  const previousRequest = useMemo<ReportRequest>(() => ({ ...base, ...previousPeriod }), [base, previousPeriod]);
  const matchedRequest = useMemo<ReportRequest>(() => ({ ...base, ...matchedPeriod }), [base, matchedPeriod]);
  const previous = useQuery<ReportResult>({
    queryKey: ['evidence-workspace', release?.releaseId, previousRequest],
    queryFn: ({ signal }) => createEvidenceReport(previousRequest, release!.releaseId, signal),
    enabled: scopeAllowed && comparisons,
    retry: false,
    staleTime: Infinity,
  });
  const matched = useQuery<ReportResult>({
    queryKey: ['evidence-workspace', release?.releaseId, matchedRequest],
    queryFn: ({ signal }) => createEvidenceReport(matchedRequest, release!.releaseId, signal),
    enabled: scopeAllowed && comparisons && (matchedPeriod.startDate !== previousPeriod.startDate || matchedPeriod.endDate !== previousPeriod.endDate),
    retry: false,
    staleTime: Infinity,
  });
  const matchedData = matchedPeriod.startDate === previousPeriod.startDate && matchedPeriod.endDate === previousPeriod.endDate ? previous.data : matched.data;
  const scopeError = release && !scopeAllowed ? `The selected end date (${endDate}) exceeds the approved release cutoff (${release.cutoff.slice(0, 10)}).` : null;
  return { catalogue, release, request, current, previous, matched: { ...matched, data: matchedData }, previousPeriod, matchedPeriod, scopeError };
}
