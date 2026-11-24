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

test('legacy geometry v1 imports without modification and receives demo identity',async()=>{
 const {importProjectBundle}=await import('./project-bundle.js');
 const old=base();old.equipment=[equip('M04',0,0)];
 const b=importProjectBundle(old);
 assert.equal(b.schema,'ingebam.factorytwins.bundle');
 assert.equal(b.organizationId,'org-demo-01');assert.equal(b.layout.equipment[0].id,'M04');
 assert.deepEqual(b.telemetryReadings,[]);
});
test('enriched project retains tenant IDs, thresholds and undated initial state',async()=>{
 const {importProjectBundle}=await import('./project-bundle.js');
 const p=base();p.organizationId='org-demo-01';p.siteId='site-temuco-01';p.site.unit='m';
 p.equipment=[{...equip('M04',0,0),kind:'coldroom',telemetry:{mode:'simulated',temp:6.7,vib:2.9,power:14.8,health:76,running:true,thresholds:{tempMax:6,vibMax:5,healthMin:70}}}];
 p.events=[{id:'evt-001',timestamp:'2026-11-24T04:17:00.000Z',equipmentId:'M04',type:'status_change',severity:'warn',message:'Alerta ficticia'}];
 p.maintenanceLogs=[{id:'mnt-001',timestamp:'2026-11-24T04:18:00.000Z',equipmentId:'M04',summary:'Revisión simulada'}];
 const b=importProjectBundle(p);
 assert.equal(b.initialAssetState.M04.temp,6.7);
 assert.equal(b.initialAssetState.M04.timestamp,undefined);
 assert.equal(b.events[0].equipmentId,'M04');
 assert.equal(b.maintenanceLogs[0].id,'mnt-001');
 assert.equal(b.thresholds.M04.tempMax,6);
});
test('bundles round-trip with real and simulated sources separately',async()=>{
 const {importProjectBundle,serializeProjectBundle}=await import('./project-bundle.js');
 const layout=base();layout.equipment=[equip('M04',0,0)];
 const data={schema:'ingebam.factorytwins.bundle',version:1,organizationId:'org_demo',siteId:'site_demo',layout,
  telemetryReadings:[
   {equipmentId:'M04',timestamp:'2026-11-24T04:17:00.000Z',source:'live',temp:3.1},
   {equipmentId:'M04',timestamp:'2026-11-24T04:18:00.000Z',source:'simulated',temp:4.1}
  ],events:[],maintenanceLogs:[]};
 const once=importProjectBundle(data),twice=importProjectBundle(JSON.parse(serializeProjectBundle(once)));
 assert.deepEqual(twice,once);
 assert.deepEqual(twice.telemetryReadings.map(x=>x.source),['live','simulated']);
});
test('reject references to nonexistent equipment and invalid source',async()=>{
 const {importProjectBundle}=await import('./project-bundle.js');
 const layout=base();layout.equipment=[equip('M04',0,0)];
 const sample={schema:'ingebam.factorytwins.bundle',version:1,layout,telemetryReadings:[]};
 assert.throws(()=>importProjectBundle({...sample,events:[{id:'evt-001',equipmentId:'M99',timestamp:'2026-11-24T04:17:00.000Z',type:'alert',severity:'warn',message:'Bad'}]}));
 assert.throws(()=>importProjectBundle({...sample,telemetryReadings:[{equipmentId:'M04',timestamp:'2026-11-24T04:17:00.000Z',source:'unknown',temp:2}]}));
});
test('geometry parser remains pure and strips operational fields',async()=>{
 const p=base();p.organizationId='org-demo-01';p.equipment=[{...equip('M04',0,0),telemetry:{temp:4}}];
 const out=parseProject(p);assert.equal(out.organizationId,undefined);assert.equal(out.equipment[0].telemetry,undefined);
});

test('original six-machine dashboard exports valid geometry and separate telemetry',async()=>{
 const {legacySimulationBundle}=await import('./legacy-demo-adapter.js');
 const {demoLayout}=await import('./monitor-domain.js');
 const equipment=demoLayout().equipment.map(e=>({id:e.id,temp:4.5,vib:2,power:10,health:90,running:true,cold:e.kind==='coldroom'}));
 const bundle=legacySimulationBundle({items:equipment});
 assert.equal(bundle.layout.equipment.length,6);
 assert.equal(bundle.initialAssetState.M04.source,'simulated');
 assert.equal(bundle.layout.equipment[0].x,-7);
 assert.equal(bundle.telemetryReadings.length,0);
});
test('dashboard event, maintenance and readings survive export with IDs',async()=>{
 const {legacySimulationBundle}=await import('./legacy-demo-adapter.js');
 const {demoLayout}=await import('./monitor-domain.js');
 const items=demoLayout().equipment.map(e=>({id:e.id,temp:4.5,vib:2,power:10,health:90,running:true,cold:e.kind==='coldroom'}));
 const when='2026-11-24T04:17:00.000Z';
 const event={id:'evt-00001',equipmentId:'M04',timestamp:when,type:'status_change',severity:'warn',message:'Alerta simulada'};
 const maintenance={id:'mnt-00001',equipmentId:'M04',timestamp:when,summary:'Prueba',vibDeltaFactor:.55,healthDelta:14};
 const reading={equipmentId:'M04',timestamp:when,source:'simulated',temp:4.5,vib:2,power:10};
 const b=legacySimulationBundle({items,events:[event,{...event,id:'evt-00002',equipmentId:null}],maintenanceLogs:[maintenance],readings:[reading]});
 assert.equal(b.events.length,1);
 assert.equal(b.events[0].equipmentId,'M04');
 assert.equal(b.maintenanceLogs[0].equipmentId,'M04');
 assert.equal(b.telemetryReadings[0].source,'simulated');
});
test('legacy dashboard adapter rejects unknown machine and nonfinite data',async()=>{
 const {legacySimulationBundle}=await import('./legacy-demo-adapter.js');
 const {demoLayout}=await import('./monitor-domain.js');
 const items=demoLayout().equipment.map(e=>({id:e.id,temp:4.5,vib:2,power:10,health:90,running:true,cold:e.kind==='coldroom'}));
 assert.throws(()=>legacySimulationBundle({items:items.map((x,i)=>i===0?{...x,id:'X01'}:x)}));
 assert.throws(()=>legacySimulationBundle({items:items.map((x,i)=>i===0?{...x,power:Infinity}:x)}));
});

test('photo placement produces valid (x,z) from homography and preserves units',async()=>{
 const {proposeEquipment}=await import('./photo-layout.js');
 const layout=base(),h=solveHomography([[0,0],[1,0],[1,1],[0,1]],floorCorners(27,19));
 const result=proposeEquipment({project:layout,homography:h,imageX:.5,imageY:.5,id:'PHOTO_01',kind:'coldroom',label:'Cámara',dimensions:{w:3,d:2,h:2,rotation:0}});
 assert.equal(result.equipment.x,0);assert.equal(result.equipment.z,0);
 assert.equal(validateLayout(result.project).errors.length,0);
 assert.equal(layout.equipment.length,0);
});
test('photo placement refuses overlap and perimetral intrusion',async()=>{
 const {proposeEquipment}=await import('./photo-layout.js');
 const p=base(),h=solveHomography([[0,0],[1,0],[1,1],[0,1]],floorCorners(27,19));
 const d={w:3,d:2,h:2,rotation:0};
 const a=proposeEquipment({project:p,homography:h,imageX:.5,imageY:.5,id:'PHOTO_01',kind:'coldroom',label:'A',dimensions:d});
 assert.throws(()=>proposeEquipment({project:a.project,homography:h,imageX:.5,imageY:.5,id:'PHOTO_02',kind:'coldroom',label:'B',dimensions:d}),/colisión/);
 assert.throws(()=>proposeEquipment({project:p,homography:h,imageX:.99,imageY:.5,id:'PHOTO_03',kind:'coldroom',label:'C',dimensions:d}),/perimetral/);
});
test('photo placement rejects invalid or off-image coordinates',async()=>{
 const {proposeEquipment}=await import('./photo-layout.js');
 const p=base(),h=solveHomography([[0,0],[1,0],[1,1],[0,1]],floorCorners(27,19));
 const d={w:2,d:2,h:2,rotation:0};
 assert.throws(()=>proposeEquipment({project:p,homography:h,imageX:NaN,imageY:.5,id:'Q01',kind:'rack',label:'Rack',dimensions:d}));
 assert.throws(()=>proposeEquipment({project:p,homography:h,imageX:1.1,imageY:.5,id:'Q01',kind:'rack',label:'Rack',dimensions:d}));
});
test('region suggestions use normalized image coordinates',()=>{
 const width=128,height=128,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=4*(y*width+x);const v=(x>30&&x<100&&y>32&&y<100)?220:20;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255}
 const r=suggestRegions({width,height,data});
 assert.ok(r.length<=8);
 for(const b of r){assert.ok(b.x>=0&&b.y>=0&&b.w>0&&b.h>0&&b.x+b.w<=1.0001&&b.y+b.h<=1.0001)}
});

test('HTML interfaces expose every photo workflow control required by the JS module',async()=>{
 const {readFileSync}=await import('node:fs');
 const html=readFileSync(new URL('./photo-mapper.html',import.meta.url),'utf8');
 for(const id of ['photo','photoImage','imageShell','overlay','width','depth','kind','machineW','machineD','machineH','rotation','markMode','suggestRegions','detectAI','download','openStudio','feedback']){
  assert.match(html,new RegExp('id="'+id+'"'),'Missing photo interface control: '+id);
 }
});
test('Studio and monitor preserve explicit handoff controls',async()=>{
 const {readFileSync}=await import('node:fs');
 const studio=readFileSync(new URL('./studio.html',import.meta.url),'utf8');
 const monitor=readFileSync(new URL('./operations.html',import.meta.url),'utf8');
 assert.match(studio,/id="monitor"/);
 assert.match(monitor,/id="view2"/);assert.match(monitor,/id="view3"/);
 assert.match(monitor,/id="load"/);assert.match(monitor,/id="ambient"/);
});
