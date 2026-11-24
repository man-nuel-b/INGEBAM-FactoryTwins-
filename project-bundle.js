// Factory Twins: backward-compatible data envelope.
// Keep geometry.js pure. This adapter never treats imported readings as live devices.
import {parseProject} from './geometry.js';

export const BUNDLE_SCHEMA='ingebam.factorytwins.bundle';
const PROJECT_SCHEMA='ingebam.factorytwins.project';
const ID=/^[A-Za-z0-9_-]{3,64}$/;
const bounded=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function id(value,fallback,label){
 const v=value===undefined?fallback:value;
 if(typeof v!=='string'||!ID.test(v))throw Error(label+' inválido');
 return v;
}
function safeLabel(value,max,label){
 if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' inválido');
 return value.replace(/[<>]/g,'').trim();
}
function iso(value,label){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error(label+' inválido');
 return value;
}
function source(value){
 if(value!=='simulated'&&value!=='live')throw Error('Fuente de telemetría inválida');
 return value;
}
function thresholds(v){
 if(v===undefined)return undefined;
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Umbrales inválidos');
 const out={};
 for(const [key,min,max] of [['tempMax',-100,200],['vibMax',0,100],['healthMin',0,100]]){
  if(own(v,key)){if(!bounded(v[key],min,max))throw Error('Umbral '+key+' inválido');out[key]=v[key];}
 }
 return out;
}
function reading(v,equipmentIds){
 if(!v||typeof v!=='object'||!equipmentIds.has(v.equipmentId))throw Error('Lectura con equipo inexistente');
 const out={equipmentId:v.equipmentId,timestamp:iso(v.timestamp,'Fecha de lectura'),source:source(v.source)};
 for(const [key,min,max] of [['temp',-100,200],['vib',0,100],['power',0,100000],['health',0,100]]){
  if(own(v,key)){if(!bounded(v[key],min,max))throw Error('Lectura '+key+' inválida');out[key]=v[key];}
 }
 if(own(v,'running')){if(typeof v.running!=='boolean')throw Error('Estado running inválido');out.running=v.running;}
 return out;
}
function records(values,kind,ids,limit){
 if(values===undefined)return [];
 if(!Array.isArray(values)||values.length>limit)throw Error('Demasiados registros de '+kind);
 const seen=new Set();
 return values.map(v=>{
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Registro '+kind+' inválido');
  const recordId=id(v.id,undefined,'ID de '+kind);
  if(seen.has(recordId))throw Error('ID de '+kind+' duplicado');
  seen.add(recordId);
  if(!ids.has(v.equipmentId))throw Error('Registro de '+kind+' con equipo inexistente');
  const out={id:recordId,equipmentId:v.equipmentId,timestamp:iso(v.timestamp,'Fecha de '+kind)};
  if(kind==='eventos'){
   if(!['status_change','alert','note','maintenance'].includes(v.type))throw Error('Tipo de evento inválido');
   if(!['info','warn','critical'].includes(v.severity))throw Error('Severidad inválida');
   out.type=v.type;out.severity=v.severity;out.message=safeLabel(v.message,400,'Mensaje');
  }else{
   out.summary=safeLabel(v.summary,400,'Resumen de mantenimiento');
   if(own(v,'vibDeltaFactor')){if(!bounded(v.vibDeltaFactor,0,5))throw Error('Factor inválido');out.vibDeltaFactor=v.vibDeltaFactor;}
   if(own(v,'healthDelta')){if(!bounded(v.healthDelta,-100,100))throw Error('Cambio de salud inválido');out.healthDelta=v.healthDelta;}
  }
  return out;
 });
}
export function importProjectBundle(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Proyecto inválido');
 const isBundle=input.schema===BUNDLE_SCHEMA&&input.version===1;
 const embedded=isBundle?input.layout:input;
 const layout=parseProject(embedded); // strict, unchanged v1 geometry contract
 const org=id(input.organizationId,'org-demo-01','Organización');
 const siteId=id(input.siteId,'site-demo-01','Planta');
 const ids=new Set(layout.equipment.map(e=>e.id));
 const telemetry=[];
 const incoming=isBundle?input.telemetryReadings:input.telemetryReadings;
 if(incoming!==undefined){
  if(!Array.isArray(incoming)||incoming.length>20000)throw Error('Demasiadas lecturas');
  for(const r of incoming)telemetry.push(reading(r,ids));
 }
 const initialAssetState={};
 if(!isBundle)for(const e of embedded.equipment){
  if(e.telemetry===undefined)continue;
  const t=e.telemetry;
  if(!t||typeof t!=='object'||Array.isArray(t))throw Error('Telemetría inicial inválida');
  const mode=source(t.mode);
  const one={equipmentId:e.id,source:mode};
  for(const [key,min,max] of [['temp',-100,200],['vib',0,100],['power',0,100000],['health',0,100]]){
   if(own(t,key)){if(!bounded(t[key],min,max))throw Error('Telemetría '+key+' inválida');one[key]=t[key];}
  }
  if(own(t,'running')){if(typeof t.running!=='boolean')throw Error('Estado inválido');one.running=t.running;}
  initialAssetState[e.id]=one;
 }
 const configs={};
 if(isBundle&&input.initialAssetState!==undefined){
  if(!input.initialAssetState||typeof input.initialAssetState!=='object'||Array.isArray(input.initialAssetState))throw Error('Estados iniciales inválidos');
  for(const [key,v] of Object.entries(input.initialAssetState)){
   if(!ids.has(key)||!v||v.equipmentId!==key)throw Error('Estado inicial con equipo inexistente');
   const row={equipmentId:key,source:source(v.source)};
   for(const [field,min,max] of [['temp',-100,200],['vib',0,100],['power',0,100000],['health',0,100]])if(own(v,field)){
    if(!bounded(v[field],min,max))throw Error('Estado inicial inválido');row[field]=v[field];
   }
   if(own(v,'running')){if(typeof v.running!=='boolean')throw Error('running inválido');row.running=v.running;}
   initialAssetState[key]=row;
  }
 }

 if(isBundle){
  if(input.thresholds!==undefined){
   if(!input.thresholds||typeof input.thresholds!=='object'||Array.isArray(input.thresholds))throw Error('Umbrales inválidos');
   for(const [key,v] of Object.entries(input.thresholds)){
    if(!ids.has(key))throw Error('Umbrales referencian un equipo inexistente');
    configs[key]=thresholds(v);
   }
  }
 }else for(const e of embedded.equipment){
  if(e.telemetry?.thresholds!==undefined)configs[e.id]=thresholds(e.telemetry.thresholds);
 }
 return {schema:BUNDLE_SCHEMA,version:1,organizationId:org,siteId,layout,thresholds:configs,initialAssetState,telemetryReadings:telemetry,events:records(input.events,'eventos',ids,1000),maintenanceLogs:records(input.maintenanceLogs,'mantenimiento',ids,1000)};
}
export function exportProjectBundle(value){return importProjectBundle(value)}
export function serializeProjectBundle(value){return JSON.stringify(exportProjectBundle(value),null,2)}
export function geometryOnly(value){return importProjectBundle(value).layout}
