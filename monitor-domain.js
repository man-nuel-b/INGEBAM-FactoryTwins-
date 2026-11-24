// Factory Twins: unified local layout + simulation contract.
// A demo is never connected to a sensor, and operational state is keyed by layout equipment ID.
import {parseProject,validateLayout} from './geometry.js';
const types={conveyor:[38,1.8,7],mixer:[63,3.4,18],coldroom:[4.2,1.2,12],packager:[41,2.5,11],compressor:[65,4.1,24],tank:[25,1,3],rack:[20,.2,.5]};
export function buildMonitor(project){
 const layout=parseProject(project);
 const assets=layout.equipment.map(e=>{
  const [temp,vib,power]=types[e.kind];
  return {id:e.id,name:e.label,kind:e.kind,temp,vib,power,health:90,running:true};
 });
 return {mode:'SIMULATED',layout,selected:assets[0]?.id||null,assets,events:[],tick:0,paused:false};
}
export function assetStatus(asset){
 if(!asset.running)return 'OFF';
 return asset.vib>5||(asset.kind==='coldroom'?asset.temp>6:asset.temp>76)||asset.health<70?'WARN':'NORMAL';
}
export function simulateNext(state,noise=()=>.5){
 const next=structuredClone(state);
 if(next.mode!=='SIMULATED')throw Error('La simulación solo opera en modo SIMULATED');
 if(next.paused)return next;
 next.tick++;
 for(const a of next.assets){
  if(!a.running)continue;
  const prev=assetStatus(a),n=Number(noise());
  if(!Number.isFinite(n)||n<0||n>1)throw Error('Ruido fuera de rango');
  const variance=a.kind==='coldroom'?.35:1;
  a.temp=Number(Math.max(-30,Math.min(120,a.temp+(n-.5)*variance)).toFixed(2));
  a.vib=Number(Math.max(.1,Math.min(10,a.vib+(n-.5)*.15)).toFixed(2));
  a.health=Number(Math.max(45,a.health-.02).toFixed(2));
  if(assetStatus(a)!==prev)next.events.unshift({tick:next.tick,assetId:a.id,type:'STATE_CHANGE',message:a.name+': '+assetStatus(a)});
 }
 return next;
}
export function chooseAsset(state,id){
 if(!state.assets.some(a=>a.id===id))throw Error('El equipo seleccionado no existe');
 return {...state,selected:id};
}
export function maintainAsset(state,id){
 const next=structuredClone(state),a=next.assets.find(x=>x.id===id);
 if(!a)throw Error('Equipo inexistente');
 a.vib=Math.min(a.vib,1.5);a.health=Math.min(100,a.health+10);
 next.events.unshift({tick:next.tick,assetId:id,type:'MAINTENANCE',message:'Intervención simulada en '+a.name});
 return next;
}
export function monitorSummary(state){
 return {count:state.assets.length,active:state.assets.filter(x=>x.running).length,alerts:state.assets.filter(x=>assetStatus(x)==='WARN').length,power:state.assets.filter(x=>x.running).reduce((s,x)=>s+x.power,0),layoutIssues:validateLayout(state.layout).errors};
}
export function demoLayout(){
 return parseProject({schema:'ingebam.factorytwins.project',version:1,name:'Planta piloto 3D · INGEBAM',site:{width:27,depth:19},equipment:[
 {id:'M01',kind:'conveyor',label:'Cinta transportadora',x:-7,z:-5,w:5,d:2.2,h:1.8,rotation:0},
 {id:'M02',kind:'mixer',label:'Mezcladora industrial',x:-7,z:0,w:3.8,d:3.4,h:3.5,rotation:0},
 {id:'M03',kind:'coldroom',label:'Cámara frigorífica A',x:7,z:-5,w:5,d:3.5,h:3.2,rotation:0},
 {id:'M04',kind:'coldroom',label:'Cámara frigorífica B',x:7,z:0,w:5,d:3.5,h:3.2,rotation:0},
 {id:'M05',kind:'packager',label:'Envasadora',x:-7,z:6,w:5,d:2.4,h:2,rotation:0},
 {id:'M06',kind:'compressor',label:'Compresor central',x:7,z:6,w:4.5,d:3,h:2.6,rotation:0}]});
}
