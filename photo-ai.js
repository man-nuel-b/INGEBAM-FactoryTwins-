// Factory Twins V0.6 - optional browser-only generic object detection.
// COCO-SSD is NOT trained to recognise most types of industrial machinery.
// No image is uploaded by our application. Model weights are fetched from external CDNs.
const TF_URL='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const MODEL_URL='https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
let modelPromise=null;
function loadScript(url,ready){
 return new Promise((resolve,reject)=>{
  if(ready()){resolve();return}
  const existing=[...document.scripts].find(s=>s.src===url);
  if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('No fue posible descargar una dependencia.')),{once:true});return}
  const script=document.createElement('script');script.src=url;script.async=true;script.crossOrigin='anonymous';
  script.onload=()=>ready()?resolve():reject(new Error('La dependencia no quedó disponible.'));
  script.onerror=()=>reject(new Error('Falló la descarga de '+url));
  document.head.append(script);
 });
}
async function load(){
 await loadScript(TF_URL,()=>!!window.tf);
 await loadScript(MODEL_URL,()=>!!window.cocoSsd);
 if(!window.tf||!window.cocoSsd)throw Error('Motor de detección no disponible.');
 return window.cocoSsd.load({base:'lite_mobilenet_v2'});
}
export async function detectGenericObjects(image,options={}){
 if(!image||!image.naturalWidth||!image.naturalHeight)throw Error('Carga una imagen válida primero.');
 if(!modelPromise)modelPromise=load().catch(e=>{modelPromise=null;throw e});
 const model=await modelPromise;
 const threshold=Math.max(.2,Math.min(.95,Number(options.threshold)||.55));
 const predictions=await model.detect(image,Math.min(20,Number(options.maxBoxes)||12),threshold);
 return predictions.map(p=>({x:p.bbox[0]/image.naturalWidth,y:p.bbox[1]/image.naturalHeight,w:p.bbox[2]/image.naturalWidth,h:p.bbox[3]/image.naturalHeight,label:String(p.class),confidence:Number(p.score),source:'coco-ssd'})).filter(p=>p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=1.01&&p.y+p.h<=1.01);
}
export function isPotentiallyRelevant(label){return ['refrigerator','truck','car','bus','oven','microwave','bottle','chair','dining table','tv','clock'].includes(label)}
