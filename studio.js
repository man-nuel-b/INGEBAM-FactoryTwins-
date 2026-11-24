import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EQUIPMENT_TYPES,parseProject,validateLayout} from './geometry.js';
const $=id=>document.getElementById(id), STORAGE='ingebam.factorytwins.studio.v03';
const types=EQUIPMENT_TYPES;
const clone=x=>JSON.parse(JSON.stringify(x));
const demo=()=>({schema:'ingebam.factorytwins.project',version:1,name:'Planta piloto INGEBAM',site:{width:27,depth:19},equipment:[
{id:'M01',kind:'conveyor',label:'Cinta transportadora',x:-7,z:-5,w:5,d:2.2,h:1.8,rotation:0},
{id:'M02',kind:'mixer',label:'Mezcladora industrial',x:-7,z:0,w:3.8,d:3.4,h:3.5,rotation:0},
{id:'M03',kind:'coldroom',label:'Cámara frigorífica A',x:7,z:-5,w:5,d:3.5,h:3.2,rotation:0},
{id:'M04',kind:'coldroom',label:'Cámara frigorífica B',x:7,z:0,w:5,d:3.5,h:3.2,rotation:0},
{id:'M05',kind:'packager',label:'Envasadora',x:-7,z:6,w:5,d:2.4,h:2,rotation:0},
{id:'M06',kind:'compressor',label:'Compresor central',x:7,z:6,w:4.5,d:3,h:2.6,rotation:0}
]});
let project=demo(),selected='M04',history=[],future=[],dirty=false,revision=0;
const validate=validateLayout;
const container=$('viewport'),scene=new THREE.Scene();scene.background=new THREE.Color(0x132838);
const camera=new THREE.PerspectiveCamera(44,1,.1,300);camera.position.set(23,24,31);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
container.replaceChildren(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=180;controls.maxPolarAngle=Math.PI/2.04;controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight(0xc2e2ff,0x2b4250,2.25));
const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-15,25,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;scene.add(sun);
const material=(c,metal=.3,rough=.5)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});
const concrete=material(0x45596b,.12,.85),steel=material(0x99afba,.65,.38),dark=material(0x2a4252,.55,.49),glass=material(0x6ba6b3,.24,.2),yellow=material(0xf3c46e,.25,.56),red=material(0xcc655a,.25,.6),selectedMat=material(0x2ae1c4,.45,.33);
let siteRoot=null,machineRoot=null,pickables=[];const machineGroups=new Map();
function block(parent,w,h,d,x,y,z,mat){const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
function cyl(parent,rt,rb,h,x,y,z,mat){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20),mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
function disposeGroup(g){g.traverse(o=>{if(o.isMesh)o.geometry.dispose()});if(g.parent)g.parent.remove(g)}
function drawSite(){if(siteRoot)disposeGroup(siteRoot);siteRoot=new THREE.Group();scene.add(siteRoot);
 const {width:w,depth:d}=project.site;block(siteRoot,w,.3,d,0,-.2,0,concrete);
 const line=material(0xf4c05b,.1,.8);for(let x=-w/2+1;x<w/2;x+=4)block(siteRoot,.06,.02,d,x,-.025,0,dark);
 for(let z=-d/2+1;z<d/2;z+=4)block(siteRoot,w,.02,.06,0,-.025,z,dark);
 for(const x of [-w/2+.4,w/2-.4])for(const z of [-d/2+.4,d/2-.4])block(siteRoot,.23,4.4,.23,x,2.2,z,steel);
 for(const x of [-w/2+.4,w/2-.4])block(siteRoot,.14,.14,d,x,4.42,0,steel);
 for(const z of [-d/2+.4,d/2-.4])block(siteRoot,w,.14,.14,0,4.42,z,steel);
 for(const x of [-1.3,1.3])block(siteRoot,.07,.024,d,x,-.025,0,line);
}
function drawMachines(){if(machineRoot)disposeGroup(machineRoot);machineRoot=new THREE.Group();scene.add(machineRoot);pickables=[];machineGroups.clear();
 const invalid=validate(project).perId;
 for(const m of project.equipment){
  const g=new THREE.Group();g.position.set(m.x,0,m.z);g.rotation.y=-m.rotation*Math.PI/180;g.userData.id=m.id;machineRoot.add(g);machineGroups.set(m.id,g);
  const body=invalid[m.id]?red:m.id===selected?selectedMat:steel;
  const baseY=.12,hh=m.h*.55;
  block(g,m.w,.15,m.d,0,.08,0,dark);
  if(m.kind==='coldroom'){block(g,m.w*.94,m.h*.88,m.d*.9,0,m.h*.48,0,body);block(g,m.w*.31,m.h*.7,.06,-m.w*.2,m.h*.48,m.d*.46,dark);block(g,m.w*.31,m.h*.7,.06,m.w*.2,m.h*.48,m.d*.46,dark);}
  else if(m.kind==='tank'||m.kind==='mixer'){
   const c=cyl(g,Math.min(m.w,m.d)*.32,Math.min(m.w,m.d)*.32,m.h*.73,0,m.h*.53,0,body);if(m.kind==='mixer')cyl(g,.15,.15,m.h*.18,0,m.h*.94,0,dark);
  }else if(m.kind==='compressor'){const c=cyl(g,m.d*.28,m.d*.28,m.w*.78,0,m.h*.47,0,body);c.rotation.z=Math.PI/2;block(g,m.w*.4,m.h*.25,m.d*.6,0,m.h*.82,0,dark);}
  else if(m.kind==='rack'){for(const x of [-m.w*.45,m.w*.45])for(const z of [-m.d*.45,m.d*.45])block(g,.12,m.h,.12,x,m.h/2,z,steel);for(const y of [.3,.6,.9])block(g,m.w*.95,.1,m.d*.95,0,m.h*y,0,body);}
  else{for(const x of [-m.w*.42,m.w*.42])for(const z of [-m.d*.42,m.d*.42])block(g,.14,m.h*.45,.14,x,m.h*.25,z,dark);block(g,m.w*.9,m.h*.2,m.d*.85,0,m.h*.6,0,body);if(m.kind==='packager')block(g,m.w*.36,m.h*.22,m.d*.48,0,m.h*.8,0,glass);}
  if(m.id===selected){const geo=new THREE.EdgesGeometry(new THREE.BoxGeometry(m.w+.15,m.h+.2,m.d+.15));const wire=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x3cffe3,transparent:true,opacity:.8}));wire.position.y=m.h/2;g.add(wire);}
  g.traverse(obj=>{if(obj.isMesh){obj.userData.machineId=m.id;pickables.push(obj)}});
 }
}
function status(t){$('status').textContent=t;}
function inventory(){const el=$('inventory');el.replaceChildren();for(const e of project.equipment){const b=document.createElement('button');b.type='button';b.classList.toggle('selected',e.id===selected);b.textContent=e.label;const sm=document.createElement('small');sm.textContent=types[e.kind]+' · '+e.id;b.append(sm);b.onclick=()=>select(e.id);el.append(b)}$('counter').textContent=project.equipment.length+' activos';}
function properties(){const e=project.equipment.find(m=>m.id===selected);$('empty').hidden=!!e;$('properties').hidden=!e;$('duplicate').disabled=$('remove').disabled=!e;if(!e)return;for(const key of ['label','kind','x','z','w','d','h','rotation'])$(key).value=e[key];}
function audit(){const v=validate(project),el=$('validation');el.replaceChildren();if(!v.errors.length){const p=document.createElement('p');p.className='good';p.textContent='✓ Sin colisiones ni equipos fuera de la nave';el.append(p)}else{for(const err of v.errors.slice(0,12)){const p=document.createElement('p');p.className='bad';p.textContent='⚠ '+err;el.append(p)}if(v.errors.length>12){const p=document.createElement('p');p.textContent='Y '+(v.errors.length-12)+' observaciones adicionales.';el.append(p)}}return v}
function renderAll(){drawSite();drawMachines();inventory();properties();audit();$('name').value=project.name;$('projectName').textContent=project.name;$('width').value=project.site.width;$('depth').value=project.site.depth;$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function mutation(fn){const prev=clone(project);fn();try{project=parseProject(project)}catch(err){project=prev;throw err}history.push(prev);if(history.length>70)history.shift();future=[];revision++;dirty=true;renderAll();status('Cambios sin guardar');}
function select(id){selected=id;drawMachines();inventory();properties();}
function nextId(){let i=1;const ids=new Set(project.equipment.map(e=>e.id));while(ids.has('E'+String(i).padStart(3,'0')))i++;return 'E'+String(i).padStart(3,'0')}
function append(kind){if(project.equipment.length>=150)throw Error('El prototipo admite hasta 150 equipos.');const id=nextId();mutation(()=>project.equipment.push({id,kind,label:types[kind]+' '+id,x:0,z:0,w:kind==='coldroom'?4:3,d:kind==='coldroom'?3:2,h:kind==='coldroom'?3:2,rotation:0}));select(id);status('Equipo agregado; revisa su ubicación y colisiones');}
$('add').onclick=()=>{const choices=Object.keys(types);const message=choices.map((v,i)=>(i+1)+'. '+types[v]).join('\n');const pick=prompt('Selecciona un equipo (1-'+choices.length+'):\n'+message,'1');if(pick===null)return;const idx=Number(pick)-1;if(!Number.isInteger(idx)||idx<0||idx>=choices.length){alert('Selecciona un número del catálogo.');return}try{append(choices[idx])}catch(e){alert(e.message)}};
$('duplicate').onclick=()=>{const e=project.equipment.find(x=>x.id===selected);if(!e)return;try{const id=nextId();mutation(()=>project.equipment.push({...e,id,label:e.label+' copia',x:e.x+e.w+0.5}));select(id)}catch(err){alert(err.message)}};
$('remove').onclick=()=>{if(!selected)return;mutation(()=>{project.equipment=project.equipment.filter(e=>e.id!==selected)});selected=project.equipment[0]?.id||null;renderAll();};
$('apply').onclick=()=>{
 const e=project.equipment.find(e=>e.id===selected);if(!e)return;
 try{
  const candidate=clone(project),edited=candidate.equipment.find(x=>x.id===selected);
  for(const k of ['label','kind'])edited[k]=$(k).value;
  for(const k of ['x','z','w','d','h','rotation'])edited[k]=Number($(k).value);
  const parsed=parseProject(candidate);
  if(validate(parsed).perId[selected])throw Error('Colisión o equipo fuera del perímetro. Revisa dimensiones y posición.');
  mutation(()=>{Object.assign(project.equipment.find(x=>x.id===selected),parsed.equipment.find(x=>x.id===selected))});
  status('Propiedades actualizadas');
 }catch(err){alert(err.message);properties()}
};
$('applySite').onclick=()=>{
 try{
  const candidate=clone(project);
  candidate.name=$('name').value;
  candidate.site.width=Number($('width').value);
  candidate.site.depth=Number($('depth').value);
  const parsed=parseProject(candidate),oldIssues=new Set(validate(project).errors);
  const issues=validate(parsed).errors.filter(x=>!oldIssues.has(x));
  if(issues.length)throw Error('La nueva nave deja equipos fuera del perímetro o introduce conflictos: '+issues.slice(0,2).join(' / '));
  mutation(()=>{project.name=parsed.name;project.site=parsed.site});
  status('Dimensiones de planta actualizadas');
 }catch(e){alert(e.message);renderAll()}
};
$('undo').onclick=()=>{if(!history.length)return;future.push(clone(project));project=history.pop();selected=project.equipment.some(e=>e.id===selected)?selected:project.equipment[0]?.id;renderAll();status('Acción deshecha')};
$('redo').onclick=()=>{if(!future.length)return;history.push(clone(project));project=future.pop();selected=project.equipment.some(e=>e.id===selected)?selected:project.equipment[0]?.id;renderAll();status('Acción rehecha')};
$('home').onclick=()=>{camera.position.set(23,24,31);controls.target.set(0,0,0);controls.update()};
$('check').onclick=()=>{const n=audit().errors.length;status(n?n+' observaciones detectadas':'Distribución validada geométricamente')};
$('save').onclick=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(project));dirty=false;status('Proyecto guardado en este navegador')}catch(e){alert('No se pudo guardar localmente: '+e.message)}};
$('export').onclick=()=>{const data=JSON.stringify({...project,exportedAt:new Date().toISOString(),simulated:true},null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='factory-twins-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('JSON descargado')};
$('monitor').onclick=()=>{
 try{
  const p=parseProject(project),errors=validate(p).errors;
  if(errors.length&&!confirm('El diseño tiene '+errors.length+' observaciones geométricas. ¿Abrir igualmente la simulación?'))return;
  sessionStorage.setItem('ingebam.factorytwins.monitor.transfer.v1',JSON.stringify(p));
  // Intentional navigation: the image reference is never transferred, only validated geometry.
  location.href='./operations.html';
 }catch(err){status('No se pudo abrir el monitor: '+err.message)}
};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const file=$('file').files?.[0];$('file').value='';if(!file)return;if(file.size>1024*1024){alert('El archivo supera 1 MB');return}try{const p=parseProject(JSON.parse(await file.text()));if(!confirm('¿Reemplazar el proyecto actual con '+p.name+'?'))return;history.push(clone(project));future=[];project=p;selected=project.equipment[0]?.id||null;renderAll();status('Proyecto JSON importado')}catch(e){alert('Importación rechazada: '+e.message)}};
$('reset').onclick=()=>{if(!confirm('¿Restaurar la demostración? Se perderán los cambios sin guardar.'))return;history.push(clone(project));future=[];project=demo();selected='M04';renderAll();status('Planta demostrativa restaurada')};
$('help').onclick=()=>$('guide').showModal();

// Local, session-only reference photograph; it is NOT a 3D reconstruction.
let photoUrl=null;
$('photo').addEventListener('change',()=>{
 const file=$('photo').files?.[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){
  alert('Selecciona JPG, PNG o WebP de hasta 8 MB.');$('photo').value='';return;
 }
 if(photoUrl)URL.revokeObjectURL(photoUrl);
 photoUrl=URL.createObjectURL(file);
 $('preview').src=photoUrl;$('photobox').hidden=false;
 status('Referencia cargada localmente: '+file.name);
});
$('clearPhoto').addEventListener('click',()=>{
 if(photoUrl)URL.revokeObjectURL(photoUrl);
 photoUrl=null;$('preview').removeAttribute('src');$('photo').value='';$('photobox').hidden=true;
 status('Imagen de referencia retirada');
});
window.addEventListener('pagehide',()=>{if(photoUrl)URL.revokeObjectURL(photoUrl)});

// Direct manipulation: dragging machinery on a horizontal ground plane.
// Commit is atomic, and illegal moves are discarded.
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const worldPoint=new THREE.Vector3();
let drag=null;
function pointerRay(e){
 const b=renderer.domElement.getBoundingClientRect();
 if(!b.width||!b.height)return false;
 pointer.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);
 ray.setFromCamera(pointer,camera);return true;
}
function pick(e){
 if(!pointerRay(e))return null;
 return ray.intersectObjects(pickables,false)[0]?.object?.userData?.machineId||null;
}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const id=pick(e);
 if(!id)return;
 if(id!==selected)select(id);
 const g=machineGroups.get(id);
 if(!g||!pointerRay(e)||!ray.ray.intersectPlane(ground,worldPoint))return;
 drag={id,startX:e.clientX,startY:e.clientY,initialX:g.position.x,initialZ:g.position.z,offsetX:g.position.x-worldPoint.x,offsetZ:g.position.z-worldPoint.z,moved:false};
 controls.enabled=false;
 renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!drag||!machineGroups.has(drag.id))return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5)return;
 drag.moved=true;
 if(!pointerRay(e)||!ray.ray.intersectPlane(ground,worldPoint))return;
 const g=machineGroups.get(drag.id),step=$('snap').checked?.25:0;
 const x=worldPoint.x+drag.offsetX,z=worldPoint.z+drag.offsetZ;
 g.position.x=step?Math.round(x/step)*step:x;
 g.position.z=step?Math.round(z/step)*step:z;
 status('Moviendo equipo · suelta para validar');
});
function finishDrag(e,cancel=false){
 if(!drag)return;
 const d=drag;drag=null;controls.enabled=true;
 const g=machineGroups.get(d.id);
 if(!g)return;
 if(cancel||!d.moved){g.position.set(d.initialX,0,d.initialZ);return}
 const x=Number(g.position.x.toFixed(3)),z=Number(g.position.z.toFixed(3));
 g.position.set(d.initialX,0,d.initialZ);
 if(x===d.initialX&&z===d.initialZ)return;
 const candidate=clone(project),eq=candidate.equipment.find(m=>m.id===d.id);
 if(!eq)return;
 eq.x=x;eq.z=z;
 if(validate(candidate).perId[d.id]){status('Movimiento rechazado: colisión o fuera de la nave');drawMachines();return}
 try{
  mutation(()=>{const target=project.equipment.find(m=>m.id===d.id);target.x=x;target.z=z;});
  status('Equipo movido a X '+x.toFixed(2)+' m, Z '+z.toFixed(2)+' m');
 }catch(err){status('Movimiento rechazado: '+err.message)}
}
renderer.domElement.addEventListener('pointerup',e=>finishDrag(e));
renderer.domElement.addEventListener('pointercancel',e=>finishDrag(e,true));
renderer.domElement.addEventListener('lostpointercapture',()=>finishDrag(null,true));
function rotateSelected(delta){
 const e=project.equipment.find(e=>e.id===selected);if(!e)return;
 const next=((e.rotation+delta)%360+360)%360;
 const candidate=clone(project),item=candidate.equipment.find(x=>x.id===selected);item.rotation=next;
 if(validate(candidate).perId[selected]){status('Giro rechazado por colisión o límite de planta');return}
 mutation(()=>{const target=project.equipment.find(x=>x.id===selected);target.rotation=next});
 status('Equipo girado a '+next+'°');
}
$('rotateLeft').onclick=()=>rotateSelected(-15);
$('rotateRight').onclick=()=>rotateSelected(15);
const ro=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)});ro.observe(container);
let last=0;function frame(t){requestAnimationFrame(frame);if(document.hidden)return;last=t;controls.update();renderer.render(scene,camera)}requestAnimationFrame(frame);
try{
 const transfer=sessionStorage.getItem('ingebam.factorytwins.photomapper.transfer.v1');
 if(transfer){
  const incoming=parseProject(JSON.parse(transfer));
  project=incoming;
  sessionStorage.removeItem('ingebam.factorytwins.photomapper.transfer.v1');
  dirty=true;
  status('Modelo fotográfico transferido. Revisa su geometría y guarda el proyecto.');
 }else{
  const saved=localStorage.getItem(STORAGE);
  if(saved)project=parseProject(JSON.parse(saved));
 }
}catch(e){status('No se pudo recuperar el proyecto: '+e.message)}
selected=project.equipment[0]?.id||null;renderAll();if(!dirty)status('Editor listo · datos locales');
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
