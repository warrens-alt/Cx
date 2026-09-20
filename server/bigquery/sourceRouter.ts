import { Router,type Request,type Response,type NextFunction } from 'express';
import { requireTenant } from '../securityPolicy';
import { requireAdmin } from '../security';
import { RequestError,validateScope } from './filters';
import { getClientConfig } from './config';
import { sourceAccess,type SourceAccess } from './sourceAccess';
import { sourceCatalogue,metricTableLineage } from './sourceCatalog';
import { getSourceMetrics } from './sourceMetrics';
const wrap=(f:(q:Request,r:Response)=>Promise<unknown>|unknown)=>(q:Request,r:Response,n:NextFunction)=>{void Promise.resolve().then(()=>f(q,r)).catch(n);};
/** Factory permits HTTP tests with fixture sources; production defaults to the real BigQuery SDK. */
export function createSourceRouter(factory:(id:string)=>SourceAccess=sourceAccess){
  const router=Router();
  router.use(['/source-coverage','/metric-lineage','/source-metrics','/acquisition'],(req,res,next)=>{try{
    if(!res.locals.principal)throw new RequestError('Authentication required',401);
    const scope=validateScope(res.locals.scope??req.query),c=getClientConfig(scope.clientId);requireTenant(res.locals.principal,c.id);scope.clientId=c.id;
    res.locals.sourceScope=scope;next();
  }catch(e){next(e);}});
  router.get('/source-coverage',requireAdmin,wrap(async(_q,r)=>r.json({success:true,data:await sourceCatalogue(r.locals.sourceScope.clientId,factory(r.locals.sourceScope.clientId))})));
  router.get('/metric-lineage',wrap((_q,r)=>r.json({success:true,data:metricTableLineage(r.locals.sourceScope.clientId)})));
  router.get('/source-metrics/:role',wrap(async(q,r)=>{
    const scope=r.locals.sourceScope;
    return r.json({success:true,data:await getSourceMetrics(String(q.params.role),scope,factory(scope.clientId))});
  }));
  router.get('/acquisition',wrap(async(_q,r)=>{
    const scope=r.locals.sourceScope,data=await getSourceMetrics('marketing',scope,factory(scope.clientId),'channel');
    return r.json({success:true,data:{...data,spend:null,roas:null,costPerLead:null,financialStatus:'SPEND_AND_ATTRIBUTION_MAPPING_REQUIRED',
      financialReason:'Impressions, clicks and platform lead actions are sourced from media records. Budget is not incurred spend; campaign/vendor attribution and commercial rates have not been supplied.'}});
  }));
  return router;
}
