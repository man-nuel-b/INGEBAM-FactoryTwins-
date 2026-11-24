import {parseProject,validateLayout,EQUIPMENT_TYPES} from './geometry.js';
import {solveHomography,transformPoint,floorCorners,validateCorners} from './photo-geometry.js';
import {suggestRegions} from './photo-regions.js';
const $=id=>document.getElementById(id);
const KEY='ingebam.factorytwins.photomapper.transfer.v1';
let photoURL=null, corners=[],machines=[],homography=null, mode='corners',nextNumber=1, suggestions=[];
const svg=$('overlay'),ns='http://www.w3.org/2000/svg';
function feedback(t){$('feedback').textContent=t;}
function numeric(id,min,max){const n=Number($(id).value);if(!Number.isFinite(n)||n<min||n>max)throw Error('Valor fuera de rango: '+id);return n;}
function site(){return {width:numeric('width',12,120),depth:numeric('depth',12,120)}}
function imageRect(){
 const parent=$('imageShell').getBoundingClientRect(),img=$('photoImage').getBoundingClientRect();
 return {left:img.left-parent.left,top:img.top-parent.top,width:img.width,height:img.height,shellW:parent.width,shellH:parent.height};
}
function onImagePoint(e){
 if(!photoURL)return;
 const b=$('photoImage').getBoundingClientRect();
 if(!b.width||!b.height)return;
 const x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;
 if(x<0||x>1||y<0||y>1)return;
 if(mode==='corners'){
  if(corners.length>=4)return;
  corners.push([x,y]);
  if(corners.length===4){try{recalibrate();mode='machines';feedback('Perspectiva calibrada. Marca los centros de los equipos.')}catch(err){corners.pop();feedback(err.message)}}
  else feedback('Esquina '+corners.length+'/4 marcada.');
 }else{
  if(!homography){feedback('Completa la calibración antes de marcar maquinaria.');return}
  try{
   addAtPoint(x,y);
  }catch(err){feedback(err.message)}
 }
 render();
}
function addAtPoint(x,y){
 if(!homography)throw Error('Calibra cuatro esquinas antes de colocar equipos.');
 const [px,pz]=transformPoint(homography,x,y);
 if(Math.abs(px)>site().width/2+.01||Math.abs(pz)>site().depth/2+.01)throw Error('El centro elegido está fuera de la planta calibrada.');
 const width=numeric('machineW',.5,30),depth=numeric('machineD',.5,30),height=numeric('machineH',.5,20),rotation=numeric('rotation',-360000,360000);
 const kind=$('kind').value,custom=$('label').value.trim();
 if(!Object.prototype.hasOwnProperty.call(EQUIPMENT_TYPES,kind))throw Error('Selecciona una máquina del catálogo.');
 const id='P'+String(nextNumber).padStart(3,'0');
 const e={id,kind,label:custom||EQUIPMENT_TYPES[kind]+' '+id,x:Number(px.toFixed(3)),z:Number(pz.toFixed(3)),w:width,d:depth,h:height,rotation};
 const p=buildProject([...machines,{...e,imageX:x,imageY:y}]);
 const issue=validateLayout(p).perId[id];nextNumber++;
 machines.push({...e,imageX:x,imageY:y});
 feedback(issue?'Equipo añadido con observación geométrica: corrige en Studio.':'Equipo '+e.label+' ubicado en el plano.');
}
function recalibrate(){
 validateCorners(corners);
 homography=solveHomography(corners,floorCorners(site().width,site().depth));
 $('markMode').disabled=false;
}
function buildProject(source=machines){
 const dimensions=site();
 return parseProject({schema:'ingebam.factorytwins.project',version:1,name:$('project').value,site:dimensions,equipment:source.map(({imageX,imageY,...e})=>e)});
}
function drawSvg(type,attrs){const o=document.createElementNS(ns,type);for(const [k,v] of Object.entries(attrs))o.setAttribute(k,String(v));svg.append(o);return o}
function render(){
 const rect=imageRect();svg.setAttribute('viewBox','0 0 '+rect.shellW+' '+rect.shellH);svg.replaceChildren();
 const pos=p=>[rect.left+p[0]*rect.width,rect.top+p[1]*rect.height];
 if(corners.length>1){const path=corners.map(pos).map(p=>p.join(',')).join(' ');drawSvg('polyline',{points:path,fill:'none',stroke:'#ffd078','stroke-width':3,'stroke-dasharray':'8 5'});}
 if(corners.length===4){drawSvg('polygon',{points:corners.map(pos).map(p=>p.join(',')).join(' '),fill:'#30d6a1','fill-opacity':'.08',stroke:'#ffcb75','stroke-width':2});}
 for(let i=0;i<corners.length;i++){
  const [cx,cy]=pos(corners[i]);drawSvg('circle',{cx,cy,r:11,fill:'#f6c875',stroke:'#1e2635','stroke-width':2});
  const t=drawSvg('text',{x:cx,y:cy+4,'text-anchor':'middle',fill:'#182630','font-size':12,'font-weight':800});t.textContent=String(i+1);
 }
 for(let i=0;i<suggestions.length;i++){
  const box=suggestions[i];const [x,y]=pos([box.x,box.y]);
  drawSvg('rect',{x,y,width:box.w*rect.width,height:box.h*rect.height,fill:'#ffcf74','fill-opacity':'.05',stroke:'#ffcf74','stroke-width':2,'stroke-dasharray':'6 5',rx:4});
  const label=drawSvg('text',{x:x+5,y:y+16,fill:'#ffeab6','font-size':12,'font-weight':800,stroke:'#152636','stroke-width':3,'paint-order':'stroke'});label.textContent='S'+(i+1);
 }
 for(let i=0;i<machines.length;i++){
  const m=machines[i],[cx,cy]=pos([m.imageX,m.imageY]);
  drawSvg('circle',{cx,cy,r:12,fill:'#40e4bd',stroke:'#0f2933','stroke-width':3});
  const label=drawSvg('text',{x:cx+15,y:cy-8,fill:'#e9fff8','font-weight':700,'font-size':12,stroke:'#071824','stroke-width':3,'paint-order':'stroke'});label.textContent=m.id;
 }
 for(let i=0;i<4;i++)$('corner'+i).className=i<corners.length?'done':i===corners.length?'next':'';
 $('stepText').textContent=!photoURL?'1 · Cargar imagen':corners.length<4?'2 · Marcar esquina '+(corners.length+1)+'/4':'3 · Identificar máquinas';
 $('markMode').disabled=corners.length!==4;refreshSuggestions();
 $('count').textContent=machines.length;
 let issues=[];
 try{issues=validateLayout(buildProject()).errors}catch(err){issues=[err.message]}
 $('issues').textContent=issues.length;
 $('issues').style.color=issues.length?'#ffc085':'#75ebc4';
 const ul=$('items');ul.replaceChildren();
 for(const m of machines){
  const li=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');
  name.textContent=m.id+' · '+m.label+' ('+m.x+', '+m.z+' m)';
  remove.textContent='Quitar';remove.onclick=()=>{machines=machines.filter(x=>x.id!==m.id);render();};
  li.append(name,remove);ul.append(li);
 }
}
function setPhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Utiliza JPG, PNG o WebP de hasta 10 MB.');
 if(photoURL)URL.revokeObjectURL(photoURL);
 photoURL=URL.createObjectURL(file);
 corners=[];machines=[];suggestions=[];homography=null;mode='corners';nextNumber=1;
 const img=$('photoImage');img.onload=()=>{img.hidden=false;$('placeholder').hidden=true;render();feedback('Imagen preparada. Marca la esquina superior izquierda del piso.');};
 img.onerror=()=>{feedback('La imagen no pudo cargarse.');};
 img.src=photoURL;
}
function refreshSuggestions(){
 const root=$('suggestedList');root.replaceChildren();
 if(!suggestions.length){const p=document.createElement('p');p.className='hint';p.textContent='Sin regiones sugeridas.';root.append(p);return;}
 suggestions.forEach((r,i)=>{
  const row=document.createElement('div');row.className='suggestion';
  const span=document.createElement('span');span.textContent='Región S'+(i+1)+' · contraste '+r.score.toFixed(0)+' (no es confianza IA)';
  const accept=document.createElement('button');accept.textContent='Usar centro';
  accept.disabled=!homography;
  accept.onclick=()=>{try{addAtPoint(r.x+r.w/2,r.y+r.h/2);suggestions.splice(i,1);render()}catch(err){feedback(err.message)}};
  const discard=document.createElement('button');discard.textContent='×';discard.setAttribute('aria-label','Descartar sugerencia S'+(i+1));discard.onclick=()=>{suggestions.splice(i,1);render()};
  row.append(span,accept,discard);root.append(row);
 });
}
$('suggestRegions').onclick=()=>{
 try{
  const img=$('photoImage');
  if(img.hidden||!img.naturalWidth)throw Error('Carga una fotografía primero.');
  const scale=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(32,Math.round(img.naturalWidth*scale)),h=Math.max(32,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('No hay soporte de análisis Canvas.');
  ctx.drawImage(img,0,0,w,h);
  suggestions=suggestRegions(ctx.getImageData(0,0,w,h),{maxResults:8});
  feedback(suggestions.length?suggestions.length+' regiones sugeridas. Revísalas antes de usarlas.':'No se detectaron regiones de contraste suficientemente definidas.');
  render();
 }catch(err){feedback('Análisis no disponible: '+err.message)}
};
$('clearSuggestions').onclick=()=>{suggestions=[];render();feedback('Sugerencias eliminadas.')};

$('photo').onchange=()=>{const file=$('photo').files?.[0];if(!file)return;try{setPhoto(file)}catch(e){feedback(e.message);$('photo').value=''}};
$('imageShell').addEventListener('click',e=>{if(e.target.closest('button'))return;onImagePoint(e)});
$('undoPoint').onclick=()=>{
 if(mode==='machines'&&machines.length){machines.pop();feedback('Se quitó el último equipo.');}
 else if(corners.length){corners.pop();homography=null;mode='corners';feedback('Se quitó la última esquina.')}
 else feedback('No hay puntos que deshacer.');
 render();
};
$('resetCorners').onclick=()=>{corners=[];homography=null;mode='corners';machines=[];suggestions=[];$('markMode').disabled=true;feedback('Calibración reiniciada.');render();};
$('markMode').onclick=()=>{if(corners.length===4){mode='machines';feedback('Haz clic sobre los centros de los equipos.')}};
$('clearItems').onclick=()=>{if(machines.length&&confirm('¿Eliminar los equipos identificados?')){machines=[];render();}};
for(const id of ['width','depth'])$(id).addEventListener('change',()=>{if(corners.length===4){try{recalibrate();feedback('Escala actualizada: verifica posiciones de los equipos.');for(const m of machines){[m.x,m.z]=transformPoint(homography,m.imageX,m.imageY).map(n=>Number(n.toFixed(3)));}}catch(e){feedback(e.message)}}render()});
function download(name,content){
 const u=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1300);
}
$('download').onclick=()=>{try{download('factory-twins-photo-layout.json',{...buildProject(),source:'manual-photo-calibration',estimated:true});feedback('Proyecto exportado para respaldo.');}catch(e){feedback(e.message)}};
$('openStudio').onclick=()=>{
 try{
  const p=buildProject();
  if(!corners.length||!machines.length)throw Error('Marca las cuatro esquinas y al menos un equipo.');
  const n=validateLayout(p).errors.length;
  const note=n?' Se detectaron '+n+' observaciones geométricas que deben corregirse.':'';
  if(!confirm('¿Abrir el modelo en Factory Twins Studio?'+note+' Reemplazará el proyecto actualmente abierto en esta pestaña.'))return;
  sessionStorage.setItem(KEY,JSON.stringify(p));
  location.href='./studio.html';
 }catch(e){feedback(e.message)}
};
const ro=new ResizeObserver(()=>{if(photoURL)render()});ro.observe($('imageShell'));
window.addEventListener('pagehide',()=>{if(photoURL)URL.revokeObjectURL(photoURL)});
render();
