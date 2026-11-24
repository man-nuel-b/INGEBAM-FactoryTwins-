// Factory Twins Photo Mapper: experimental local image-region proposals.
// This is a deterministic edge-density heuristic, NOT semantic AI recognition.
// Input: ImageData, output: normalized bounding boxes in original image coordinates.
export function suggestRegions(imageData,options={}){
 const {width,height,data}=imageData;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||!data||data.length<width*height*4)throw Error('Imagen no válida.');
 const cell=Math.max(8,Math.round(Math.min(width,height)/28));
 const nx=Math.ceil(width/cell),ny=Math.ceil(height/cell);
 const luma=new Float32Array(width*height);
 for(let i=0,j=0;i<luma.length;i++,j+=4)luma[i]=.2126*data[j]+.7152*data[j+1]+.0722*data[j+2];
 const densities=new Float32Array(nx*ny),count=new Uint32Array(nx*ny);
 let sum=0,sumSq=0,nonzero=0;
 for(let y=1;y<height-1;y+=2)for(let x=1;x<width-1;x+=2){
  const i=y*width+x;
  const gx=(luma[i+1-width]+2*luma[i+1]+luma[i+1+width])-(luma[i-1-width]+2*luma[i-1]+luma[i-1+width]);
  const gy=(luma[i-1+width]+2*luma[i+width]+luma[i+1+width])-(luma[i-1-width]+2*luma[i-width]+luma[i+1-width]);
  const magnitude=Math.min(255,Math.hypot(gx,gy)/4);
  const c=Math.floor(y/cell)*nx+Math.floor(x/cell);
  densities[c]+=magnitude;count[c]++;
 }
 for(let i=0;i<densities.length;i++){densities[i]/=Math.max(1,count[i]);sum+=densities[i];sumSq+=densities[i]**2;nonzero++}
 const mean=sum/nonzero,sd=Math.sqrt(Math.max(0,sumSq/nonzero-mean*mean));
 const threshold=Math.max(9,mean+sd*.42);
 const mask=new Uint8Array(densities.length),seen=new Uint8Array(densities.length);
 for(let i=0;i<mask.length;i++)mask[i]=densities[i]>=threshold?1:0;
 const boxes=[];
 for(let i=0;i<mask.length;i++){
  if(!mask[i]||seen[i])continue;
  const stack=[i];seen[i]=1;let minX=nx,minY=ny,maxX=-1,maxY=-1,total=0,strength=0;
  while(stack.length){
   const k=stack.pop(),x=k%nx,y=Math.floor(k/nx);total++;strength+=densities[k];
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const xx=x+dx,yy=y+dy;
    if(xx<0||yy<0||xx>=nx||yy>=ny)continue;
    const kk=yy*nx+xx;
    if(mask[kk]&&!seen[kk]){seen[kk]=1;stack.push(kk)}
   }
  }
  const bw=(maxX-minX+1)*cell,bh=(maxY-minY+1)*cell;
  if(total<2||bw<width*.035||bh<height*.035||bw>width*.83||bh>height*.83)continue;
  const x1=Math.max(0,minX*cell-cell*.3),y1=Math.max(0,minY*cell-cell*.3);
  const x2=Math.min(width,(maxX+1)*cell+cell*.3),y2=Math.min(height,(maxY+1)*cell+cell*.3);
  boxes.push({x:x1/width,y:y1/height,w:(x2-x1)/width,h:(y2-y1)/height,score:Math.round(strength/total)});
 }
 boxes.sort((a,b)=>b.score-a.score);
 const kept=[];
 const iou=(a,b)=>{const l=Math.max(a.x,b.x),t=Math.max(a.y,b.y),r=Math.min(a.x+a.w,b.x+b.w),bt=Math.min(a.y+a.h,b.y+b.h),inter=Math.max(0,r-l)*Math.max(0,bt-t);return inter/(a.w*a.h+b.w*b.h-inter||1)};
 for(const box of boxes){if(kept.every(k=>iou(k,box)<.35)){kept.push(box);if(kept.length>Math.min(15,options.maxResults||8))break}}
 return kept;
}
