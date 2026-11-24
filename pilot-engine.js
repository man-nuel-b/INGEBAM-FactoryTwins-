// INGEBAM Factory Twins — domain-only cold-room pilot (simulation).
// Pure deterministic functions: no network, storage, DOM, devices or wall clock.
export const PILOT_SCHEMA='ingebam.factorytwins.pilot.v1';
export function createPilot({tenantId='demo-ingebam',plantId='demo-coldchain',seed=42}={}){
 if(!/^[a-z0-9_-]{3,48}$/i.test(tenantId)||!/^[a-z0-9_-]{3,48}$/i.test(plantId))throw Error('Identificador de organización o planta inválido');
 if(!Number.isSafeInteger(seed))throw Error('Semilla inválida');
 return {schema:PILOT_SCHEMA,mode:'SIMULATED',tenantId,plantId,seed,tick:0,assets:[
  {id:'CF-01',kind:'coldroom',name:'Cámara de congelados A',temp:-17.7,vib:1.3,power:11.8,health:91,limit:-15,active:true},
  {id:'CF-02',kind:'coldroom',name:'Cámara de refrigeración B',temp:3.4,vib:1.7,power:9.2,health:88,limit:6,active:true},
  {id:'CP-01',kind:'compressor',name:'Compresor principal',temp:53,vib:3.1,power:25.4,health:80,limit:76,active:true}
 ],readings:[],incidents:[],maintenance:[],revision:0};
}
function random(state){let x=state.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;state.seed=x>>>0;return state.seed/4294967296}
export function status(asset){return !asset.active?'OFF':asset.temp>asset.limit||asset.vib>5||asset.health<65?'ALERT':'NORMAL'}
export function stepPilot(previous,{tickTime}={}){
 const state=structuredClone(previous);
 if(state.schema!==PILOT_SCHEMA||state.mode!=='SIMULATED')throw Error('Solo se aceptan proyectos piloto simulados');
 const at=tickTime??new Date(2026,0,1,0,0,state.tick*5).toISOString();
 const oldStatuses=Object.fromEntries(state.assets.map(a=>[a.id,status(a)]));
 state.tick++;
 for(const a of state.assets){
  if(!a.active)continue;
  const r=random(state)-.5;
  // Deliberately inject a progressive fault in CF-02 after tick 9.
  if(a.id==='CF-02'&&state.tick>=9){
   a.temp=Math.min(12,a.temp+.52+r*.1);
   a.vib=Math.min(7.5,a.vib+.06);
   a.health=Math.max(45,a.health-.25);
  }else{
   a.temp+=r*(a.kind==='compressor'?1.2:.24);
   a.vib=Math.max(.25,Math.min(8,a.vib+(random(state)-.5)*.07));
   a.health=Math.max(45,a.health-.025);
  }
  a.power=Math.max(0,a.power+(random(state)-.5)*.18);
  for(const key of ['temp','vib','power','health'])a[key]=Number(a[key].toFixed(3));
  state.readings.push({tenantId:state.tenantId,plantId:state.plantId,assetId:a.id,at,tick:state.tick,temp:a.temp,vib:a.vib,power:a.power,health:a.health,status:status(a),source:'SIMULATED'});
  if(status(a)==='ALERT'&&oldStatuses[a.id]!=='ALERT'){
   state.incidents.push({id:'INC-'+String(state.incidents.length+1).padStart(4,'0'),assetId:a.id,createdAt:at,tick:state.tick,type:'THRESHOLD',state:'OPEN',message:'Umbral simulado superado para '+a.name});
  }
 }
 state.revision++;
 return state;
}
export function acknowledgeIncident(previous,id,{at}={}){
 const state=structuredClone(previous),incident=state.incidents.find(x=>x.id===id);
 if(!incident)throw Error('Incidencia inexistente');
 if(incident.state!=='OPEN')throw Error('La incidencia ya fue reconocida');
 incident.state='ACKNOWLEDGED';incident.acknowledgedAt=at||new Date().toISOString();state.revision++;return state;
}
export function registerMaintenance(previous,assetId,{at,note='Revisión demostrativa'}={}){
 const state=structuredClone(previous),a=state.assets.find(x=>x.id===assetId);
 if(!a)throw Error('Equipo inexistente');
 a.temp=a.kind==='coldroom'?Math.min(a.temp,a.limit-2):Math.min(a.temp,a.limit-10);
 a.vib=Math.max(.5,Math.min(a.vib,2));a.health=Math.min(100,a.health+12);
 state.maintenance.push({id:'MT-'+String(state.maintenance.length+1).padStart(4,'0'),assetId,at:at||new Date().toISOString(),note:String(note).slice(0,160),source:'SIMULATED'});
 state.revision++;return state;
}
export function summarize(state){
 const alerts=state.assets.filter(a=>status(a)==='ALERT').length;
 const kw=state.assets.reduce((s,a)=>s+(a.active?a.power:0),0);
 const readingsByAsset=Object.fromEntries(state.assets.map(a=>[a.id,state.readings.filter(r=>r.assetId===a.id)]));
 // Approximate kWh assuming each simulated tick is 5 minutes.
 const kwh=state.readings.reduce((sum,r)=>sum+r.power*5/60,0);
 return {assets:state.assets.length,alerts,openIncidents:state.incidents.filter(x=>x.state==='OPEN').length,kw:Number(kw.toFixed(2)),kwh:Number(kwh.toFixed(2)),readingsByAsset};
}
export function exportPilot(state){
 return {schema:state.schema,mode:state.mode,tenantId:state.tenantId,plantId:state.plantId,generatedAt:new Date().toISOString(),metricsDescription:'Simulated readings, 5-minute artificial intervals, energy calculated as kW × 5/60',assets:state.assets,readings:state.readings,incidents:state.incidents,maintenance:state.maintenance};
}
