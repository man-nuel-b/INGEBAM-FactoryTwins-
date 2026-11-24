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

test('pilot has explicit simulated tenant and plant identifiers',async()=>{
 const {createPilot}=await import('./pilot-engine.js');
 const p=createPilot();assert.equal(p.mode,'SIMULATED');assert.equal(p.tenantId,'demo-ingebam');assert.equal(p.assets.length,3);
});
test('cold room anomaly eventually generates one threshold incident',async()=>{
 const {createPilot,stepPilot}=await import('./pilot-engine.js');
 let p=createPilot();for(let i=0;i<35;i++)p=stepPilot(p);
 assert.ok(p.incidents.some(e=>e.assetId==='CF-02'&&e.type==='THRESHOLD'));
 assert.ok(p.readings.length===105);
});
test('pilot deterministic readings for same seed and tick times',async()=>{
 const {createPilot,stepPilot}=await import('./pilot-engine.js');
 let a=createPilot({seed:22}),b=createPilot({seed:22});
 for(let i=0;i<8;i++){const options={tickTime:new Date(2026,0,1,0,5*i).toISOString()};a=stepPilot(a,options);b=stepPilot(b,options)}
 assert.deepEqual(a,b);
});
test('pilot incident can only be acknowledged once',async()=>{
 const {createPilot,stepPilot,acknowledgeIncident}=await import('./pilot-engine.js');
 let p=createPilot();for(let i=0;i<35;i++)p=stepPilot(p);
 const id=p.incidents[0].id;p=acknowledgeIncident(p,id,{at:'2026-01-01T00:00:00Z'});
 assert.equal(p.incidents[0].state,'ACKNOWLEDGED');
 assert.throws(()=>acknowledgeIncident(p,id));
});
test('maintenance only accepts a known asset',async()=>{
 const {createPilot,registerMaintenance}=await import('./pilot-engine.js');
 assert.throws(()=>registerMaintenance(createPilot(),'UNKNOWN'));
 const p=registerMaintenance(createPilot(),'CF-02',{note:'Inspección de prueba',at:'2026-01-01T00:00:00Z'});
 assert.equal(p.maintenance.length,1);
});
test('pilot summary calculates energy as kWh rather than kW',async()=>{
 const {createPilot,stepPilot,summarize}=await import('./pilot-engine.js');
 const p=stepPilot(createPilot()),s=summarize(p);
 assert.ok(s.kwh>0&&s.kwh<s.kw);
});

test('unified monitor maps every layout equipment to an asset with the same ID',async()=>{
 const {buildMonitor,demoLayout}=await import('./monitor-domain.js');
 const layout=demoLayout(),monitor=buildMonitor(layout);
 assert.deepEqual(monitor.assets.map(a=>a.id),layout.equipment.map(e=>e.id));
 assert.equal(monitor.mode,'SIMULATED');
});
test('unified monitor handles an empty valid layout',async()=>{
 const {buildMonitor,monitorSummary}=await import('./monitor-domain.js');
 const m=buildMonitor(base());
 assert.equal(m.selected,null);assert.equal(m.assets.length,0);
 assert.equal(monitorSummary(m).power,0);
});
test('monitor selection and maintenance use persistent equipment IDs',async()=>{
 const {buildMonitor,demoLayout,chooseAsset,maintainAsset}=await import('./monitor-domain.js');
 let m=buildMonitor(demoLayout());m=chooseAsset(m,'M04');assert.equal(m.selected,'M04');
 m=maintainAsset(m,'M04');assert.equal(m.events[0].assetId,'M04');
 assert.throws(()=>chooseAsset(m,'DOES-NOT-EXIST'));
});
test('monitor simulation is purely simulated and reproducible with injected noise',async()=>{
 const {buildMonitor,demoLayout,simulateNext}=await import('./monitor-domain.js');
 const a=buildMonitor(demoLayout()),b=simulateNext(a,()=>.75),c=simulateNext(a,()=>.75);
 assert.deepEqual(b,c);assert.equal(a.tick,0);assert.equal(b.tick,1);
 assert.deepEqual(b.layout,a.layout);
});
test('monitor rejects unexpected layout equipment',async()=>{
 const {buildMonitor}=await import('./monitor-domain.js');
 const p=base();p.equipment=[{...equip('M01',0,0),kind:'unrecognized'}];
 assert.throws(()=>buildMonitor(p));
});
