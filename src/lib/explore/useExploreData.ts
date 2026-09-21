import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { normalizeResponse, type ExploreView } from './model';
import type { Filters } from '../../../server/bigquery/filters';
export interface ExploreScope {clientId:string; startDate:string; endDate:string; filters:Filters;}
export function useExploreData(view:ExploreView,scope:ExploreScope,selectionError:string|null){
  const client=useQueryClient(),[cancelled,setCancelled]=useState<string|null>(null);
  const request={...scope,metric:view.metric,dimension:view.dimension,secondaryDimension:view.secondary||undefined};
  const identity=JSON.stringify(request),key=['analytics','explore',request];
  const query=useQuery({queryKey:key,enabled:!selectionError&&cancelled!==identity,
    queryFn:async({signal})=>{
      const params=new URLSearchParams({clientId:scope.clientId,startDate:scope.startDate,endDate:scope.endDate,filters:JSON.stringify(scope.filters),metric:view.metric,dimension:view.dimension});
      if(view.secondary)params.set('secondaryDimension',view.secondary);
      const response=await fetch('/api/analytics/explore?'+params,{signal,credentials:'same-origin'});
      const body=await response.json().catch(()=>null);
      if(!response.ok||body?.success!==true)throw Object.assign(new Error(typeof body?.error==='string'?body.error:`Explore request failed (${response.status}).`),{status:response.status});
      return normalizeResponse(body,{metric:view.metric,dimension:view.dimension,secondary:view.secondary,clientId:scope.clientId});
    },staleTime:120000,gcTime:600000,refetchOnWindowFocus:false,retry:false});
  const isCancelled=cancelled===identity;
  return {data:selectionError||query.error||query.isFetching||isCancelled?null:query.data??null,
    error:selectionError||(query.error instanceof Error?query.error.message:null),loading:!selectionError&&!isCancelled&&(query.isLoading||query.isFetching),cancelled:isCancelled,
    cancel:()=>{setCancelled(identity);void client.cancelQueries({queryKey:key,exact:true});},
    reload:()=>{setCancelled(null);void query.refetch();}};
}
