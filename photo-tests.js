import {solveHomography,transformPoint,floorCorners,validateCorners} from './photo-geometry.js';
const tests=[
['Rectángulo frontal',()=>{const s=[[0,0],[1,0],[1,1],[0,1]],h=solveHomography(s,floorCorners(20,10));const [x,z]=transformPoint(h,.5,.5);return Math.abs(x)<1e-7&&Math.abs(z)<1e-7}],
['Perspectiva deformada',()=>{const src=[[.2,.1],[.8,.12],[.98,.9],[.1,.85]],dst=floorCorners(27,19),h=solveHomography(src,dst);return src.every((p,i)=>{const v=transformPoint(h,...p);return Math.hypot(v[0]-dst[i][0],v[1]-dst[i][1])<1e-6})}],
['Cuatro puntos idénticos rechazados',()=>{try{validateCorners([[.5,.5],[.5,.5],[.5,.5],[.5,.5]]);return false}catch{return true}}],
['Cuadrilátero cruzado rechazado',()=>{try{validateCorners([[0,0],[1,1],[1,0],[0,1]]);return false}catch{return true}}],
['Cuadrilátero convexo aceptado',()=>{validateCorners([[.1,.1],[.9,.2],[.8,.9],[.2,.8]]);return true}],
['Transformación singular rechazada',()=>{try{solveHomography([[0,0],[1,0],[2,0],[3,0]],floorCorners(20,20));return false}catch{return true}}],
['Dimensión real no inferible desde imagen',()=>{const h1=solveHomography([[0,0],[1,0],[1,1],[0,1]],floorCorners(20,10)),h2=solveHomography([[0,0],[1,0],[1,1],[0,1]],floorCorners(40,20));return Math.abs(transformPoint(h2,.75,.5)[0]-2*transformPoint(h1,.75,.5)[0])<1e-7}]
];
let passed=0;const out=document.getElementById('results');for(const [title,fn] of tests){let ok=false;try{ok=!!fn()}catch(e){console.error(e)}const li=document.createElement('li');li.textContent=(ok?'✓ ':'✗ ')+title;li.style.color=ok?'#65e9bc':'#ffae89';out.append(li);if(ok)passed++}document.getElementById('summary').textContent=passed+' / '+tests.length+' pruebas correctas';document.title=passed===tests.length?'PASS · Photo Mapper':'FAIL · Photo Mapper';
