// Adaptador del monitor original de seis máquinas al contrato unificado.
// No utiliza coordenadas SVG (píxeles) como medidas geométricas (metros).
import {demoLayout} from './monitor-domain.js';
import {importProjectBundle} from './project-bundle.js';
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const machineToKind=Object.freeze({M01:'conveyor',M02:'mixer',M03:'coldroom',M04:'coldroom',M05:'packager',M06:'compressor'});
export function legacySimulationBundle({items,events=[],maintenanceLogs=[],readings=[]}){
 if(!Array.isArray(items)||items.length!==6||!Array.isArray(events)||!Array.isArray(maintenanceLogs)||!Array.isArray(readings))throw Error('Estado de simulación inválido');
 const layout=demoLayout();
 const byId=new Map(items.map(m=>[m.id,m]));
 if(byId.size!==6||layout.equipment.some(e=>!byId.has(e.id)))throw Error('Falta equipamiento original');
 const initialAssetState={};const thresholds={};
 for(const e of layout.equipment){
  const m=byId.get(e.id);
  if(m.kind!==machineToKind[m.id])throw Error('Tipo de equipo no coincide');
  for(const key of ['temp','vib','power','health'])if(!finite(m[key],key==='temp'?-100:0,key==='power'?100000:key==='temp'?200:100))throw Error('Lectura inválida: '+key);
  if(typeof m.running!=='boolean')throw Error('Estado de marcha inválido');
  initialAssetState[e.id]={equipmentId:e.id,source:'simulated',temp:m.temp,vib:m.vib,power:m.power,health:m.health,running:m.running};
  thresholds[e.id]=m.thresholds||{tempMax:m.cold?6:72,vibMax:5,healthMin:70};
 }
 return importProjectBundle({
  schema:'ingebam.factorytwins.bundle',version:1,
  organizationId:'org-demo-01',siteId:'site-demo-01',layout,
  thresholds,initialAssetState,telemetryReadings:readings,
  events:events.filter(e=>e.equipmentId),
  maintenanceLogs
 });
}
