import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProject,validateLayout,intersectsSAT,orientedCorners} from './geometry.js';
import {floorCorners,solveHomography,transformPoint,validateCorners} from './photo-geometry.js';
import {suggestRegions} from './photo-regions.js';
const base=()=>({schema:'ingebam.factorytwins.project',version:1,name:'Test',site:{width:27,depth:19},equipment:[]});
const equip=(id,x,z,rotation=0)=>({id,kind:'conveyor',label:id,x,z,w:3,d:2,h:2,rotation});
test('schema parsing and empty plant',()=>assert.equal(parseProject(base()).equipment.length,0));
test('schema rejects __proto__ as equipment type',()=>assert.throws(()=>parseProject({...base(),equipment:[{...equip('A',0,0),kind:'__proto__'}]})));
test('invalid dimensions are rejected',()=>assert.throws(()=>parseProject({...base(),equipment:[{...equip('A',0,0),w:NaN}]})));
test('overlapping machines are flagged',()=>{const p=base();p.equipment=[equip('A',0,0),equip('B',1,0)];assert.equal(validateLayout(p).errors.length,1)});
test('separated machines are valid',()=>{const p=base();p.equipment=[equip('A',-5,0),equip('B',5,0)];assert.equal(validateLayout(p).errors.length,0)});
test('boundary breach is rejected',()=>{const p=base();p.equipment=[equip('A',13,0)];assert.ok(validateLayout(p).perId.A)});
test('SAT accepts edge contact',()=>assert.equal(intersectsSAT(orientedCorners(equip('A',0,0)),orientedCorners(equip('B',3,0))),false));
test('homography maps perspective rectangle into plant corners',()=>{
 const src=[[.1,.1],[.91,.15],[.82,.88],[.2,.8]],dst=floorCorners(27,19);
 validateCorners(src);const h=solveHomography(src,dst);
 src.forEach((p,i)=>{const xy=transformPoint(h,...p);assert.ok(Math.hypot(xy[0]-dst[i][0],xy[1]-dst[i][1])<1e-6)});
});
test('degenerate corners rejected',()=>assert.throws(()=>validateCorners([[.1,.1],[.5,.5],[.9,.9],[.1,.9]])));
test('blank image has no suggestions',()=>{
 const width=96,height=96,data=new Uint8ClampedArray(width*height*4);data.fill(127);
 const r=suggestRegions({width,height,data});assert.deepEqual(r,[]);
});
test('region proposals stay within image bounds',()=>{
 const width=128,height=128,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;const c=x>25&&x<100&&y>24&&y<100?240:12;data[i]=data[i+1]=data[i+2]=c;data[i+3]=255;}
 const r=suggestRegions({width,height,data});r.forEach(b=>{assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1.00001&&b.y+b.h<=1.00001)});
});

test('AI COCO label mapping remains conservative',async()=>{
 const {isPotentiallyRelevant}=await import('./photo-ai.js');
 assert.equal(isPotentiallyRelevant('refrigerator'),true);
 assert.equal(isPotentiallyRelevant('industrial centrifuge'),false);
 assert.equal(isPotentiallyRelevant('__proto__'),false);
});
test('AI detector requires a valid image before downloading models',async()=>{
 const {detectGenericObjects}=await import('./photo-ai.js');
 await assert.rejects(detectGenericObjects({naturalWidth:0,naturalHeight:0}),/Carga una imagen válida/);
});

test('plain strips angle brackets according to its documented rule',()=>{
  assert.equal(parseProject({...base(),name:'<b>Demo</b>'}).name,'bDemo/b');
});
test('homography maps unit-square centre to world centre',()=>{
  const src=[[0,0],[1,0],[1,1],[0,1]];
  const h=solveHomography(src,floorCorners(30,20));
  const [x,y]=transformPoint(h,.5,.5);
  assert.ok(Math.abs(x)<1e-9&&Math.abs(y)<1e-9);
});
test('homography rejects four collinear points',()=>{
  const points=[[0,0],[.25,.25],[.5,.5],[.75,.75]];
  assert.throws(()=>solveHomography(points,floorCorners(20,20)));
  assert.throws(()=>validateCorners(points));
});
test('homography rejects zero denominator at projective horizon',()=>{
  const h=[1,0,0,0,1,0,1,0,1];
  assert.throws(()=>transformPoint(h,-1,0));
});
test('homography rejects NaN calibration input',()=>{
  const corners=[[0,0],[1,0],[1,1],[0,NaN]];
  assert.throws(()=>solveHomography(corners,floorCorners(20,20)));
});
test('calibration rejects intersecting quadrilateral',()=>{
  assert.throws(()=>validateCorners([[0,0],[1,1],[1,0],[0,1]]));
});
test('calibration rejects very small area',()=>{
  assert.throws(()=>validateCorners([[0,0],[.01,0],[.01,.01],[0,.01]]));
});
