// Pure geometry/validation functions for Factory Twins Studio.
// No Three.js dependency: can be tested without WebGL.
export const EQUIPMENT_TYPES=Object.freeze({conveyor:'Cinta transportadora',mixer:'Mezcladora industrial',coldroom:'Cámara frigorífica',packager:'Envasadora',compressor:'Compresor',tank:'Estanque industrial',rack:'Rack de almacenamiento'});
const plain=s=>String(s).replace(/[<>]/g,'').trim();
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function parseProject(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||v.schema!=='ingebam.factorytwins.project'||v.version!==1)throw Error('Formato de proyecto incompatible.');
 if(typeof v.name!=='string'||v.name.length>80||!v.name.trim())throw Error('Nombre de proyecto inválido.');
 if(!v.site||!finite(v.site.width,12,120)||!finite(v.site.depth,12,120))throw Error('Dimensiones de planta inválidas.');
 if(!Array.isArray(v.equipment)||v.equipment.length>150)throw Error('Número de equipos no permitido (máximo 150).');
 const ids=new Set();
 for(const e of v.equipment){
  if(!e||typeof e!=='object'||typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{1,36}$/.test(e.id)||ids.has(e.id))throw Error('Identificador duplicado o inválido.');
  ids.add(e.id);
  if(!Object.prototype.hasOwnProperty.call(EQUIPMENT_TYPES,e.kind)||typeof e.label!=='string'||!e.label.trim()||e.label.length>65)throw Error('Tipo o nombre de equipo inválido.');
  if(!finite(e.x,-120,120)||!finite(e.z,-120,120)||!finite(e.w,.5,30)||!finite(e.d,.5,30)||!finite(e.h,.5,20)||!finite(e.rotation,-360000,360000))throw Error('Coordenadas o dimensiones inválidas.');
 }
 return {schema:v.schema,version:1,name:plain(v.name),site:{width:v.site.width,depth:v.site.depth},equipment:v.equipment.map(e=>({id:e.id,kind:e.kind,label:plain(e.label),x:e.x,z:e.z,w:e.w,d:e.d,h:e.h,rotation:e.rotation}))};
}
export function orientedCorners(e){const a=e.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),hx=e.w/2,hz=e.d/2;return [[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]].map(([x,z])=>[e.x+x*c-z*s,e.z+x*s+z*c]);}
export function intersectsSAT(a,b){for(const shape of [a,b])for(let i=0;i<4;i++){const p=shape[i],q=shape[(i+1)%4],ax=-(q[1]-p[1]),az=q[0]-p[0];const proj=pts=>pts.map(p=>p[0]*ax+p[1]*az);const av=proj(a),bv=proj(b);if(Math.max(...av)<=Math.min(...bv)+.001||Math.max(...bv)<=Math.min(...av)+.001)return false;}return true;}
export function validateLayout(p){const errors=[],perId={};for(const e of p.equipment){const pts=orientedCorners(e),within=pts.every(([x,z])=>Math.abs(x)<=p.site.width/2-.1&&Math.abs(z)<=p.site.depth/2-.1);if(!within){errors.push(e.label+': fuera del perímetro (margen de 10 cm).');perId[e.id]=true;}}
 const corners=p.equipment.map(orientedCorners);
 for(let i=0;i<p.equipment.length;i++)for(let j=i+1;j<p.equipment.length;j++){const a=p.equipment[i],b=p.equipment[j];if(intersectsSAT(corners[i],corners[j])){errors.push('Colisión: '+a.label+' / '+b.label);perId[a.id]=true;perId[b.id]=true;}}
 return {errors,perId};}
