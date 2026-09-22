import { Router, type Request, type Response, type NextFunction } from 'express';
import { METRICS, METRIC_VERSION, MODEL_VERSION } from '../../contracts/reporting';
import { RequestError, scalarString } from '../bigquery/filters';
import { requireTenant } from '../securityPolicy';
import { ExecutionSigner } from './execution';
import { ReportService } from './service';
import { BigQueryReportRepository, type ReportRepository } from './repository';
import { exceptionCatalogue } from '../../contracts/operations';
const wrap=(f:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{void Promise.resolve().then(()=>f(req,res)).catch(next);};
export function createReportingRouter(repository: ReportRepository = new BigQueryReportRepository()) {
  const router=Router();
  router.use((_req,res,next)=>res.locals.principal?next():next(new RequestError('Authentication required',401)));
  const service=()=>new ReportService(repository,new ExecutionSigner(process.env.CX_REPORT_SIGNING_KEY||''));
  const catalogueTenant=(req:Request)=>{
    if(Object.keys(req.query).some(key=>key!=='tenantId'))throw new RequestError('Unsupported reporting catalogue parameter');
    const tenant=scalarString(req.query.tenantId,'tenantId',80);
    if(!tenant||!/^[a-zA-Z0-9_-]{1,80}$/.test(tenant))throw new RequestError('Invalid tenant');
    return tenant;
  };
  router.get('/catalogue',wrap(async(req,res)=>{
    const tenant=catalogueTenant(req);
    requireTenant(res.locals.principal,tenant);
    const release=repository.configured?await repository.release(tenant):null;
    return res.json({success:true,data:{metrics:METRICS.map(m=>({...m,api:'/api/reporting/reports',sourceTables:m.requires.map(f=>({fact:f,table:release?.snapshots[f]?.table??null,sourceStatus:release?.sources.find(s=>s.fact===f)?.status??'UNAVAILABLE'}))})),metricVersion:METRIC_VERSION,modelVersion:MODEL_VERSION,available:!!release,
      reason:!repository.configured?'The versioned reporting dataset has not been configured.':!release?'No approved snapshot release has been published.':null,
      release:release?{releaseId:release.releaseId,cutoff:release.cutoff,sourceBatchIds:release.sourceBatchIds,sources:release.sources,checks:release.checks}:null}});
  }));
  router.get('/exceptions',wrap(async(req,res)=>{
    const tenant=catalogueTenant(req);
    requireTenant(res.locals.principal,tenant);
    const release=repository.configured?await repository.release(tenant):null;
    return res.json({success:true,data:{available:!!release,releaseId:release?.releaseId??null,cutoff:release?.cutoff??null,
      reason:!repository.configured?'The versioned reporting dataset has not been configured.':!release?'No approved snapshot release has been published.':null,
      rules:release?exceptionCatalogue(release.sources,release.checks):[]}});
  }));
  const body=(req:Request,allowed:string[])=>{if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).some(k=>!allowed.includes(k)))throw new RequestError('Invalid report operation');};
  router.post('/reports',wrap(async(req,res)=>{body(req,['request','releaseId']);return res.json({success:true,data:await service().create(req.body.request,res.locals.principal,req.body.releaseId)});}));
  router.post('/replay',wrap(async(req,res)=>{body(req,['token']);return res.json({success:true,data:await service().run(req.body.token,res.locals.principal)});}));
  router.post('/evidence',wrap(async(req,res)=>{body(req,['token','metricId','group','groupIsNull']);return res.json({success:true,data:await service().evidence(req.body.token,res.locals.principal,req.body.metricId,req.body.group??null,req.body.groupIsNull)});}));
  return router;
}
