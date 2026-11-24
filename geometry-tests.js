import {parseProject,orientedCorners,intersectsSAT,validateLayout} from './geometry.js';
const base=()=>({schema:'ingebam.factorytwins.project',version:1,name:'Test',site:{width:24,depth:20},equipment:[]});
const e=(id,x,z,rotation=0)=>({id,kind:'conveyor',label:id,x,z,w:3,d:2,h:2,rotation});
const cases=[
['Proyecto vacío válido',()=>{const p=parseProject(base());return p.equipment.length===0}],
['Colisión ortogonal',()=>{const p=base();p.equipment=[e('A',0,0),e('B',1,0)];return validateLayout(p).errors.some(v=>v.includes('Colisión'))}],
['Sin colisión con separación',()=>{const p=base();p.equipment=[e('A',-4,0),e('B',4,0)];return validateLayout(p).errors.length===0}],
['Giro 45 grados detectado',()=>{const p=base();p.equipment=[e('A',0,0,45),e('B',1,1,-30)];return validateLayout(p).errors.length>0}],
['Contacto borde no se considera intersección',()=>!intersectsSAT(orientedCorners(e('A',0,0)),orientedCorners(e('B',3,0)))],
['Fuera de nave',()=>{const p=base();p.equipment=[e('A',11,0)];return validateLayout(p).errors.some(v=>v.includes('fuera'))}],
['Nombres no ejecutables',()=>{const p=base();p.name='<b>Demo</b>';return parseProject(p).name==='bDemo/b'}],
['ID duplicado rechazado',()=>{const p=base();p.equipment=[e('A',0,0),e('A',5,0)];try{parseProject(p);return false}catch{return true}}],
['NaN rechazado',()=>{const p=base();p.equipment=[e('A',NaN,0)];try{parseProject(p);return false}catch{return true}}],
['Tipo inválido rechazado',()=>{const p=base();p.equipment=[{...e('A',0,0),kind:'__proto__'}];try{parseProject(p);return false}catch{return true}}],
['Máximo 150 equipos',()=>{const p=base();p.equipment=Array.from({length:151},(_,i)=>e('E'+i,0,0));try{parseProject(p);return false}catch{return true}}],
['Importación elimina metadatos no autorizados',()=>{const p=base();p.untrusted={secret:'x'};return !('untrusted' in parseProject(p))}],
['Validación unitaria no confunde altura y profundidad',()=>{const p=base();p.equipment=[{...e('A',0,0),h:25}];try{parseProject(p);return false}catch{return true}}],
,['Rotación de 90 grados preserva centro',()=>{const pts=orientedCorners(e('A',2,3,90));return Math.abs(pts.reduce((s,p)=>s+p[0],0)/4-2)<1e-9&&Math.abs(pts.reduce((s,p)=>s+p[1],0)/4-3)<1e-9}],
['Movimiento fuera del perímetro se detecta',()=>{const p=base();p.equipment=[e('A',0,0)];p.equipment[0].x=12;return !!validateLayout(p).perId.A}],
['Mover a posición libre no introduce colisiones',()=>{const p=base();p.equipment=[e('A',-4,0),e('B',4,0)];p.equipment[0].z=4;return !validateLayout(p).perId.A}],
['Rotación y traslape con objeto vecino',()=>{const p=base();p.equipment=[e('A',0,0,45),e('B',1.2,0,0)];return !!validateLayout(p).perId.A}],
];\nconst out=document.querySelector('#results');let passed=0;for(const [name,fn] of cases){let ok=false,detail='';try{ok=!!fn()}catch(e){detail=String(e)}if(ok)passed++;const item=document.createElement('li');item.textContent=(ok?'✓ ':'✗ ')+name+(detail?' — '+detail:'');item.style.color=ok?'#6cebc3':'#ffad87';out.append(item)}
document.querySelector('#summary').textContent=passed+' / '+cases.length+' pruebas correctas';
document.title=passed===cases.length?'PASS · Factory Twins tests':'FAIL · Factory Twins tests';
