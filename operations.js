import {parseProject,validateLayout} from './geometry.js';
import {buildMonitor,demoLayout,chooseAsset,simulateNext,maintainAsset,assetStatus,monitorSummary} from './monitor-domain.js';
const $=id=>document.getElementById(id);
const STORAGE='ingebam.factorytwins.studio.v03',TRANSFER='ingebam.factorytwins.monitor.transfer.v1';
let state=buildMonitor(demoLayout()),view='2d',three=null;
const fmt=(value,d=1)=>Number(value).toLocaleString('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d});
const notice=msg=>{$('message').textContent=msg};
function loadProject(p){
 state=buildMonitor(parseProject(p));
 if(state.assets.length===0)notice('Planta sin equipos: agrega maquinaria desde Studio.');
 $('load').value='100';$('ambient').value='22';
 draw();if(three)three.setLayout(state.layout);
}
function select(id){
 state=chooseAsset(state,id);
 $('load').value='100';$('ambient').value='22';
 draw();
}
function draw2d(){
 const svg=$('floor'),ns='http://www.w3.org/2000/svg',add=(tag,props,parent=svg)=>{
  const n=document.createElementNS(ns,tag);
  for(const [key,val] of Object.entries(props))n.setAttribute(key,String(val));
  parent.append(n);return n;
 };
 svg.replaceChildren();add('rect',{width:800,height:560,fill:'#102338'});
 const {width,depth}=state.layout.site,scale=Math.min(720/width,480/depth);
 const gx=x=>400+x*scale,gz=z=>280+z*scale;
 add('rect',{x:gx(-width/2),y:gz(-depth/2),width:width*scale,height:depth*scale,fill:'#1d3647',stroke:'#91acb8','stroke-width':3});
 for(const e of state.layout.equipment){
  const a=state.assets.find(x=>x.id===e.id),chosen=e.id===state.selected;
  const g=add('g',{transform:`translate(${gx(e.x)},${gz(e.z)}) rotate(${e.rotation})`,tabindex:0,role:'button','aria-label':e.label+', seleccionar'});
  const st=assetStatus(a);
  add('rect',{x:-e.w*scale/2,y:-e.d*scale/2,width:e.w*scale,height:e.d*scale,rx:4,fill:st==='WARN'?'#705036':'#26525c',stroke:chosen?'#50f9dc':'#a3cad1','stroke-width':chosen?4:2},g);
  const title=add('text',{x:0,y:4,'text-anchor':'middle',fill:'#f1f8fa','font-size':Math.min(14,Math.max(9,e.w*scale/5)),'font-weight':700},g);
  title.textContent=e.id;
  g.addEventListener('click',()=>select(e.id));
  g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(e.id)}});
 }
}
function drawDetails(){
 const summary=monitorSummary(state),asset=state.assets.find(x=>x.id===state.selected);
 $('title').textContent=state.layout.name;$('machines').textContent=summary.count;$('active').textContent=summary.active;$('alerts').textContent=summary.alerts;$('power').textContent=fmt(summary.power)+' kW';
 $('assetName').textContent=asset?.name||'Sin equipo';$('assetId').textContent=asset?(asset.id+' · '+assetStatus(asset)):'—';
 for(const [id,value] of Object.entries({temp:asset?fmt(asset.temp)+' °C':'—',vib:asset?fmt(asset.vib,2)+' mm/s':'—',kw:asset?fmt(asset.power)+' kW':'—',health:asset?fmt(asset.health)+' %':'—'}))$(id).textContent=value;
 $('maintenance').disabled=!asset;
 const load=Number($('load').value)/100,ambient=Number($('ambient').value);
 $('loadLabel').textContent=Math.round(load*100)+'%';$('ambientLabel').textContent=ambient+' °C';
 $('scenario').textContent=asset?'Escenario hipotético: '+fmt(asset.temp+(ambient-22)*(asset.kind==='coldroom'?.1:.4)+(load-1)*(asset.kind==='coldroom'?1.5:14))+' °C · '+fmt(asset.power*load)+' kW. No es pronóstico industrial.':'Selecciona un equipo para estimar un escenario.';
 const issues=$('issues');issues.replaceChildren();
 const problems=summary.layoutIssues;
 const p=document.createElement('p');p.className=problems.length?'error':'good';p.textContent=problems.length?problems.length+' observaciones geométricas':'Distribución sin conflictos geométricos detectados';issues.append(p);
 for(const issue of problems.slice(0,6)){const div=document.createElement('div');div.className='record error';div.textContent=issue;issues.append(div)}
 const events=$('events');events.replaceChildren();
 for(const item of state.events.slice(0,15)){const div=document.createElement('div');div.className='record';div.textContent='Intervalo '+item.tick+': '+item.message;events.append(div)}
}
function draw(){draw2d();drawDetails();three?.updateState(state);}
function download(data,filename){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function initialise3D(){
 if(three)return three;
 const host=$('threeD'),loading=$('loading3d');
 try{
  const THREE=await import('three');
  const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#11283b');
  scene.add(new THREE.HemisphereLight(0xb3e5fc,0x294052,2.7));
  const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-14,24,17);scene.add(sun);
  const camera=new THREE.PerspectiveCamera(45,1,.1,300);camera.position.set(22,24,30);
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.replaceChildren(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2.04;
  const roots=new THREE.Group();scene.add(roots);
  const ids=new Map(),ray=new THREE.Raycaster(),point=new THREE.Vector2();
  const materials={floor:new THREE.MeshStandardMaterial({color:0x344f60,roughness:.9}),machine:new THREE.MeshStandardMaterial({color:0x829faa,metalness:.5,roughness:.48}),selected:new THREE.MeshStandardMaterial({color:0x39ddc1}),alert:new THREE.MeshStandardMaterial({color:0xe6a55c})};
  let geometries=[],current=state;
  const clear=()=>{for(const g of geometries)g.dispose();geometries=[];roots.clear();ids.clear()};
  const box=(w,h,d,mat,x,y,z,parent,id)=>{
   const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);
   const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);parent.add(o);if(id)ids.set(o,id);return o;
  };
  const rebuild=()=>{
   clear();const {width,depth}=current.layout.site;
   box(width,.25,depth,materials.floor,0,-.2,0,roots,null);
   for(const e of current.layout.equipment){
    const a=current.assets.find(x=>x.id===e.id),g=new THREE.Group();
    g.position.set(e.x,0,e.z);g.rotation.y=-e.rotation*Math.PI/180;roots.add(g);
    const mat=assetStatus(a)==='WARN'?materials.alert:e.id===current.selected?materials.selected:materials.machine;
    box(e.w,e.h*.76,e.d,mat,0,e.h*.45,0,g,e.id);
   }
  };
  const resize=()=>{
   if(host.hidden)return;
   const w=host.clientWidth,h=Math.max(400,host.clientHeight||480);
   if(!w)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  renderer.domElement.addEventListener('click',e=>{
   const r=renderer.domElement.getBoundingClientRect();if(!r.width||!r.height)return;
   point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(point,camera);
   const picked=ray.intersectObjects([...ids.keys()],false)[0];if(picked)select(ids.get(picked.object));
  });
  let frameId=0,disposed=false;
  const frame=()=>{if(disposed)return;frameId=requestAnimationFrame(frame);if(host.hidden||document.hidden)return;controls.update();renderer.render(scene,camera)};
  frameId=requestAnimationFrame(frame);
  const dispose=()=>{
   disposed=true;cancelAnimationFrame(frameId);observer.disconnect();controls.dispose();clear();
   Object.values(materials).forEach(m=>m.dispose());renderer.dispose();
  };
  window.addEventListener('pagehide',dispose,{once:true});
  three={setLayout(layout){current={...current,layout};rebuild();resize()},updateState(next){current=next;rebuild();resize()},resize,dispose};
  rebuild();resize();return three;
 }catch(e){
  console.error('Vista 3D no disponible',e);if(loading)loading.textContent='No se pudo inicializar WebGL o descargar Three.js. Usa el plano 2D.';
  notice('Vista 3D no disponible. Mantengo el plano 2D.');
  throw e;
 }
}
$('view2').onclick=()=>{view='2d';$('twoD').hidden=false;$('threeD').hidden=true;$('view2').classList.add('active');$('view3').classList.remove('active');$('view2').setAttribute('aria-pressed','true');$('view3').setAttribute('aria-pressed','false')};
$('view3').onclick=async()=>{
 $('twoD').hidden=true;$('threeD').hidden=false;
 try{await initialise3D();$('view3').classList.add('active');$('view2').classList.remove('active');$('view3').setAttribute('aria-pressed','true');$('view2').setAttribute('aria-pressed','false');three.resize()}
 catch{$('view2').click()}
};
$('demo').onclick=()=>{loadProject(demoLayout());notice('Planta de demostración cargada.')};
$('local').onclick=()=>{
 try{const raw=localStorage.getItem(STORAGE);if(!raw)throw Error('No hay un proyecto guardado desde Studio en este navegador.');loadProject(JSON.parse(raw));notice('Proyecto de Studio cargado. Datos operacionales simulados.')}catch(e){notice(e.message)}
};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{
 const file=$('file').files?.[0];$('file').value='';if(!file)return;
 if(file.size>1024*1024){notice('Archivo mayor a 1 MB; importación rechazada.');return}
 try{const p=parseProject(JSON.parse(await file.text()));loadProject(p);notice('Planta importada: equipos compartidos entre 2D, 3D y simulación.')}catch(e){notice('Proyecto inválido: '+e.message)}
};
$('pause').onclick=()=>{state={...state,paused:!state.paused};$('pause').textContent=state.paused?'Reanudar':'Pausar';draw()};
$('next').onclick=()=>{state=simulateNext({...state,paused:false});draw();notice('Intervalo simulado '+state.tick+' actualizado')};
$('maintenance').onclick=()=>{try{state=maintainAsset(state,state.selected);draw();notice('Mantenimiento ficticio registrado.')}catch(e){notice(e.message)}};
for(const id of ['load','ambient'])$(id).oninput=drawDetails;
$('export').onclick=()=>download({...state,exportedAt:new Date().toISOString(),source:'SIMULATED_ONLY'},'factory-twins-monitor-simulado.json');
try{const transferred=sessionStorage.getItem(TRANSFER);if(transferred){loadProject(JSON.parse(transferred));sessionStorage.removeItem(TRANSFER);notice('Layout transferido desde Studio. Selecciona una máquina para supervisarla de forma simulada.')}}catch(e){notice('Transferencia no válida: '+e.message)}
draw();
