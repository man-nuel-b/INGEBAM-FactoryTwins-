import {createPilot,stepPilot,summarize,status,acknowledgeIncident,registerMaintenance,exportPilot} from './pilot-engine.js';
const $=id=>document.getElementById(id);
let pilot=createPilot(),selected='CF-02';
const statusText=msg=>{$('status').textContent=msg;};
function chart(){
 const canvas=$('chart'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 const width=canvas.width,height=canvas.height;
 ctx.clearRect(0,0,width,height);
 const points=pilot.readings.filter(r=>r.assetId===selected),asset=pilot.assets.find(a=>a.id===selected);
 const values=points.map(p=>p.temp);
 const ymin=Math.min(asset.temp,asset.limit,...values)-3,ymax=Math.max(asset.temp,asset.limit,...values)+3;
 const margin={l:65,r:25,t:30,b:40},W=width-margin.l-margin.r,H=height-margin.t-margin.b;
 const x=i=>margin.l+(points.length<=1?0:i/(points.length-1)*W),y=v=>margin.t+(ymax-v)/(ymax-ymin)*H;
 ctx.strokeStyle='#355266';ctx.lineWidth=1;ctx.font='15px system-ui';ctx.fillStyle='#a8bdc7';
 for(let i=0;i<=4;i++){
  const v=ymin+(ymax-ymin)*i/4,yy=y(v);
  ctx.beginPath();ctx.moveTo(margin.l,yy);ctx.lineTo(width-margin.r,yy);ctx.stroke();ctx.fillText(v.toFixed(1)+' °C',7,yy+5);
 }
 ctx.strokeStyle='#e9b46d';ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(margin.l,y(asset.limit));ctx.lineTo(width-margin.r,y(asset.limit));ctx.stroke();ctx.setLineDash([]);
 if(points.length){
  ctx.strokeStyle='#5ce1cc';ctx.lineWidth=3;ctx.beginPath();
  points.forEach((p,i)=>{if(i===0)ctx.moveTo(x(i),y(p.temp));else ctx.lineTo(x(i),y(p.temp));});
  ctx.stroke();
  ctx.fillStyle='#5ce1cc';ctx.beginPath();ctx.arc(x(points.length-1),y(points.at(-1).temp),5,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle='#b2c8d0';ctx.fillText('Intervalos de 5 minutos · '+points.length+' lecturas',margin.l,height-12);
}
function render(){
 const summary=summarize(pilot);
 $('clock').textContent='Intervalo '+pilot.tick+' · '+pilot.tick*5+' min simulados';
 $('assetCount').textContent=summary.assets;
 $('alertCount').textContent=summary.alerts;
 $('incidentCount').textContent=summary.openIncidents;
 $('power').textContent=summary.kw.toFixed(2);
 $('kwh').textContent=summary.kwh.toFixed(2);
 $('assets').replaceChildren();
 const select=$('asset');const prior=select.value;select.replaceChildren();
 for(const a of pilot.assets){
  const button=document.createElement('button');
  button.type='button';button.className='machine';
  button.classList.toggle('selected',a.id===selected);
  button.classList.toggle('alert',status(a)==='ALERT');
  const title=document.createElement('strong');title.textContent=a.name;
  const info=document.createElement('small');info.textContent=a.id+' · '+a.temp.toFixed(1)+' °C · '+status(a);
  const extra=document.createElement('small');extra.textContent=a.power.toFixed(1)+' kW · '+a.vib.toFixed(2)+' mm/s';
  button.append(title,info,extra);button.onclick=()=>{selected=a.id;render();};$('assets').append(button);
  const option=document.createElement('option');option.value=a.id;option.textContent=a.name;select.append(option);
 }
 select.value=pilot.assets.some(a=>a.id===prior)?prior:selected;
 const incidents=$('incidents');incidents.replaceChildren();
 if(!pilot.incidents.length){const p=document.createElement('p');p.className='hint';p.textContent='Sin incidencias registradas.';incidents.append(p)}
 for(const item of [...pilot.incidents].reverse()){
  const row=document.createElement('div');row.className='record';
  const title=document.createElement('strong');title.textContent=item.id+' · '+item.assetId+' · '+item.state;
  const desc=document.createElement('small');desc.textContent=item.message+' · intervalo '+item.tick;
  row.append(title,desc);
  if(item.state==='OPEN'){const ack=document.createElement('button');ack.textContent='Reconocer alerta';ack.onclick=()=>{pilot=acknowledgeIncident(pilot,item.id,{at:new Date().toISOString()});render();statusText('Incidencia reconocida (simulación)')};row.append(ack)}
  incidents.append(row);
 }
 const maintenance=$('maintenanceLog');maintenance.replaceChildren();
 for(const item of [...pilot.maintenance].reverse()){
  const p=document.createElement('div');p.className='record';
  p.textContent=item.id+' · '+item.assetId+' · '+item.note;
  maintenance.append(p);
 }
 chart();
}
$('step').onclick=()=>{pilot=stepPilot(pilot);render();statusText('Se añadió un intervalo de telemetría ficticia.')};
$('advance').onclick=()=>{for(let n=0;n<12;n++)pilot=stepPilot(pilot);render();statusText('Se simularon 60 minutos de lecturas ficticias.')};
$('reset').onclick=()=>{if(!confirm('¿Restaurar el piloto? Se perderá el historial de esta sesión.'))return;pilot=createPilot();selected='CF-02';render();statusText('Piloto reiniciado')};
$('maintenance').onclick=()=>{try{pilot=registerMaintenance(pilot,$('asset').value,{note:$('note').value,at:new Date().toISOString()});render();statusText('Mantenimiento ficticio registrado.')}catch(e){statusText(e.message)}};
$('export').onclick=()=>{
 const payload=exportPilot(pilot);const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='factory-twins-piloto-frio-simulado.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);statusText('Reporte de simulación descargado');
};
render();
