import { Router, type Request, type Response, type NextFunction } from 'express';
import { RequestError, validateScope } from '../bigquery/filters';
import { getClientConfig } from '../bigquery/config';
import { requireTenant } from '../securityPolicy';
import { sourceAccess, type SourceAccess } from '../bigquery/sourceAccess';
import { getVettingReport } from './service';
/** Testable read-only boundary. Mounted after the application's signed-identity middleware. */
export function createVettingRouter(factory:(tenant:string)=>SourceAccess=sourceAccess){
  const router=Router();
  router.get('/vetting',(req:Request,res:Response,next:NextFunction)=>{void (async()=>{
    if(!res.locals.principal)throw new RequestError('Authentication required',401);
    for(const [key,value] of Object.entries(req.query)){
      if(!['clientId','startDate','endDate','filters','source','vendor','medium','interval','classValue','colourValue'].includes(key))throw new RequestError(`Unsupported vetting parameter: ${key}`);
      if(typeof value!=='string')throw new RequestError(`Repeated or non-scalar vetting parameter: ${key}`);
    }
    const scope=validateScope(res.locals.scope??req.query),client=getClientConfig(scope.clientId);requireTenant(res.locals.principal,client.id);
    const data=await getVettingReport({...scope,clientId:client.id,interval:req.query.interval,classValue:req.query.classValue,colourValue:req.query.colourValue},factory(client.id));
    res.json({success:true,data,metadata:{...data.evidence,appliedFilters:data.scope}});
  })().catch(next);});
  return router;
}
