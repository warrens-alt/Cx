import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { normalizeResponse, type ExploreView } from './model';
import type { Filters } from '../../../server/bigquery/filters';
import { analyticsUrl, fetchAnalyticsJson } from '../analyticsRequest';
import { useClient } from '../ClientContext';
export interface ExploreScope {clientId:string; startDate:string; endDate:string; filters:Filters;}
export function useExploreData(view:ExploreView,scope:ExploreScope,selectionError:string|null){
  const {ready, error:workspaceError, reportAuthenticationFailure}=useClient();
  const client=useQueryClient(),[cancelled,setCancelled]=useState<string|null>(null);
  const request={...scope,metric:view.metric,dimension:view.dimension,secondaryDimension:view.secondary||undefined};
  const identity=JSON.stringify(request),key=['analytics','explore',request];
  const available=ready&&!!scope.clientId&&!selectionError;
  const query=useQuery({queryKey:key,enabled:available&&cancelled!==identity,
    queryFn:async({signal})=>{
      if(!available)throw new Error(selectionError||workspaceError||'Select an authorised workspace before requesting data.');
      try{
        const body=await fetchAnalyticsJson(analyticsUrl('explore',scope,{metric:view.metric,dimension:view.dimension,secondaryDimension:view.secondary||undefined}),signal);
        return normalizeResponse(body,{metric:view.metric,dimension:view.dimension,secondary:view.secondary,clientId:scope.clientId});
      }catch(error){
        if((error as {status?:number}).status===401&&!signal.aborted)reportAuthenticationFailure((error as Error).message);
        throw error;
      }
    },staleTime:120000,gcTime:600000,refetchOnWindowFocus:false,retry:false});
  const isCancelled=cancelled===identity;
  return {data:!available||query.error||query.isFetching||isCancelled?null:query.data??null,
    error:selectionError||workspaceError||(query.error instanceof Error?query.error.message:null),loading:available&&!isCancelled&&(query.isLoading||query.isFetching),cancelled:isCancelled,
    cancel:()=>{setCancelled(identity);void client.cancelQueries({queryKey:key,exact:true});},
    reload:()=>{if(available){setCancelled(null);void query.refetch();}}};
}
