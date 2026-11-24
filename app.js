'use strict';
// Los datos y sus variaciones son exclusivamente simulados. No hay conexión industrial.
const base=[
{id:'M01',name:'Cinta transportadora',type:'Logística interna',x:60,y:100,w:310,h:100,temp:34,vib:1.8,power:8.4,health:94,running:true},
{id:'M02',name:'Mezcladora industrial',type:'Procesamiento',x:60,y:230,w:310,h:98,temp:63,vib:3.4,power:20.2,health:85,running:true},
{id:'M03',name:'Cámara frigorífica A',type:'Refrigeración',x:505,y:100,w:310,h:100,temp:3.8,vib:1.2,power:13.5,health:92,running:true,cold:true},
{id:'M04',name:'Cámara frigorífica B',type:'Refrigeración',x:505,y:230,w:310,h:98,temp:6.7,vib:2.9,power:14.8,health:76,running:true,cold:true},
{id:'M05',name:'Envasadora automática',type:'Envasado',x:60,y:430,w:310,h:85,temp:42,vib:2.6,power:11.6,health:88,running:true},
{id:'M06',name:'Compresor central',type:'Servicios industriales',x:505,y:430,w:310,h:85,temp:76,vib:5.6,power:25.1,health:66,running:true}];
const $=id=>document.getElementById(id),clone=()=>base.map(x=>({...x}));let items=clone(),selected='M04',paused=false,tick=0;const events=[];const maintenanceLogs=[];const readings=[];let eventSeq=0,maintenanceSeq=0;
function thresholds(m){const defaults={tempMax:m.cold?6:72,vibMax:5,healthMin:70};const t=m.thresholds||{};return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,Number.isFinite(t[k])?t[k]:v]))}
function status(m){if(!m.running)return 'off';const t=thresholds(m);return m.vib>t.vibMax||m.temp>t.tempMax||m.health<t.healthMin?'warn':'ok'}
function fmt(n,d=1){return Number(n).toLocaleString('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d})}
function log(message,{equipmentId=null,type='note',severity='info'}={}){
 const entry={id:'evt-'+String(++eventSeq).padStart(5,'0'),timestamp:new Date().toISOString(),equipmentId,type,severity,message};
 events.unshift(entry);if(events.length>200)events.length=200;
 const format=new Intl.DateTimeFormat('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 $('events').replaceChildren(...events.slice(0,12).map(e=>{const div=document.createElement('div');div.className='event';const b=document.createElement('b');b.textContent=format.format(new Date(e.timestamp))+' · ';div.append(b,document.createTextNode(e.message));return div}));
}
function snapshot(){
 const timestamp=new Date().toISOString();
 for(const m of items){
  readings.push({equipmentId:m.id,timestamp,source:'simulated',temp:Number(m.temp.toFixed(3)),vib:Number(m.vib.toFixed(3)),power:Number(m.power.toFixed(3)),health:Number(m.health.toFixed(2)),running:m.running});
 }
 if(readings.length>12000)readings.splice(0,readings.length-12000);
}
function draw(){const g=$('nodes');g.replaceChildren();const ns='http://www.w3.org/2000/svg';for(const m of items){const state=status(m),node=document.createElementNS(ns,'g');node.classList.add('node');if(m.id===selected)node.classList.add('selected');node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',m.name+', estado '+state);const rect=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:m.x,y:m.y,width:m.w,height:m.h,fill:state==='warn'?'#59452d':state==='off'?'#334052':'#1b4b4d',stroke:state==='warn'?'#ffc66b':state==='off'?'#8291a2':'#46d8b8'}))rect.setAttribute(k,v);node.append(rect);const addText=(txt,y,cls)=>{const el=document.createElementNS(ns,'text');el.setAttribute('x',m.x+17);el.setAttribute('y',y);if(cls)el.setAttribute('class',cls);el.textContent=txt;node.append(el)};addText(m.id+' · '+m.name,m.y+32);addText('Temp '+fmt(m.temp)+'°C   |   '+fmt(m.power)+' kW',m.y+61,'small');node.addEventListener('click',()=>choose(m.id));node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(m.id)}});g.append(node)}}
function choose(id){selected=id;$('load').value=100;$('ambient').value=22;render()}
function render(){draw();queueMicrotask(()=>window.dispatchEvent(new Event('factorytwins:update')));const m=items.find(x=>x.id===selected);$('total').textContent=items.length;$('active').textContent=items.filter(x=>status(x)!=='off').length;$('alerts').textContent=items.filter(x=>status(x)==='warn').length;$('energy').textContent=fmt(items.reduce((s,x)=>s+(x.running?x.power:0),0));$('machineTitle').textContent=m.name;$('machineType').textContent=m.id+' · '+m.type;const s=status(m);$('state').textContent={ok:'Normal',warn:'Alerta',off:'Detenido'}[s];$('state').style.color={ok:'#66ecc3',warn:'#ffd38a',off:'#c3ccd8'}[s];$('temp').textContent=fmt(m.temp)+' °C';$('vib').textContent=fmt(m.vib,2)+' mm/s';$('power').textContent=fmt(m.power)+' kW';$('health').textContent=Math.round(m.health)+' %';const load=+$('load').value/100,ambient=+$('ambient').value;$('loadVal').textContent=Math.round(load*100)+'%';$('ambientVal').textContent=ambient+' °C';const projectedTemp=m.temp+(ambient-22)*(m.cold?.1:.4)+(load-1)*(m.cold?1.5:14),projectedPower=m.power*load,projectedVib=m.vib*Math.sqrt(load);$('scenario').textContent='Proyección simulada: '+fmt(projectedTemp)+' °C · '+fmt(projectedPower)+' kW · '+fmt(projectedVib,2)+' mm/s de vibración. No es un pronóstico validado.'}
function simulate(){if(paused)return;tick++;for(const m of items){if(!m.running)continue;const prev=status(m);m.temp=Math.max(m.cold?-3:15,Math.min(m.cold?13:100,m.temp+(Math.random()-.5)*(m.cold?.45:1.5)));m.vib=Math.max(.3,Math.min(8,m.vib+(Math.random()-.5)*.23));m.power=Math.max(0,m.power+(Math.random()-.5)*.4);if(tick%8===0)m.health=Math.max(50,m.health-.1);if(prev!==status(m))log(m.name+': cambio de estado a '+({ok:'normal',warn:'alerta',off:'detenido'}[status(m)]),{equipmentId:m.id,type:'status_change',severity:status(m)==='warn'?'warn':'info'})}snapshot();render()}
$('play').addEventListener('click',()=>{paused=!paused;$('play').textContent=paused?'▶ Reanudar simulación':'❚❚ Pausar simulación';log(paused?'Simulación pausada':'Simulación reanudada')});$('reset').addEventListener('click',()=>{items=clone();tick=0;paused=false;events.length=0;readings.length=0;maintenanceLogs.length=0;eventSeq=0;maintenanceSeq=0;$('play').textContent='❚❚ Pausar simulación';$('load').value=100;$('ambient').value=22;log('Modelo reiniciado a valores de demostración');render()});$('load').addEventListener('input',render);$('ambient').addEventListener('input',render);$('maintenance').addEventListener('click',()=>{const m=items.find(x=>x.id===selected);m.vib=Math.max(.5,m.vib*.55);m.health=Math.min(100,m.health+14);
 maintenanceLogs.unshift({id:'mnt-'+String(++maintenanceSeq).padStart(5,'0'),timestamp:new Date().toISOString(),equipmentId:m.id,summary:'Revisión preventiva simulada',vibDeltaFactor:.55,healthDelta:14});
 log('Mantenimiento ficticio registrado para '+m.name,{equipmentId:m.id,type:'maintenance',severity:'info'});render()});$('export').addEventListener('click',async()=>{
 try{
  const {legacySimulationBundle}=await import('./legacy-demo-adapter.js');
  const out=legacySimulationBundle({items,events,maintenanceLogs,readings});
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='factory-twins-demo-unificado.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }catch(error){alert('No se pudo exportar el proyecto: '+error.message)}
});log('Sesión demostrativa iniciada con seis activos ficticios');render();setInterval(simulate,2500);

// Shared read-only snapshot and selection API for the Three.js view.
window.FactoryTwinsData=()=>({items,selected,paused,status});
window.FactoryTwinsSelect=choose;
