// Calibración de plano horizontal por homografía proyectiva.
// Entradas de imagen normalizadas a [0,1]. Puntos de destino en metros.
export function solveHomography(source,target){
 if(source.length!==4||target.length!==4)throw Error('Se requieren cuatro puntos de calibración.');
 const a=[],b=[];
 for(let i=0;i<4;i++){
  const [x,y]=source[i],[X,Y]=target[i];
  if(![x,y,X,Y].every(Number.isFinite))throw Error('Coordenadas no válidas.');
  a.push([x,y,1,0,0,0,-X*x,-X*y]);b.push(X);
  a.push([0,0,0,x,y,1,-Y*x,-Y*y]);b.push(Y);
 }
 for(let i=0;i<8;i++){
  let pivot=i;
  for(let r=i+1;r<8;r++)if(Math.abs(a[r][i])>Math.abs(a[pivot][i]))pivot=r;
  if(Math.abs(a[pivot][i])<1e-10)throw Error('Las esquinas no definen una perspectiva válida. Repite la calibración.');
  [a[i],a[pivot]]=[a[pivot],a[i]];[b[i],b[pivot]]=[b[pivot],b[i]];
  const value=a[i][i];
  for(let c=i;c<8;c++)a[i][c]/=value;b[i]/=value;
  for(let r=0;r<8;r++){if(r===i)continue;const factor=a[r][i];for(let c=i;c<8;c++)a[r][c]-=factor*a[i][c];b[r]-=factor*b[i];}
 }
 return [...b,1];
}
export function transformPoint(h,x,y){
 const d=h[6]*x+h[7]*y+h[8];
 if(!Number.isFinite(d)||Math.abs(d)<1e-9)throw Error('El punto está fuera de la proyección utilizable.');
 const X=(h[0]*x+h[1]*y+h[2])/d,Y=(h[3]*x+h[4]*y+h[5])/d;
 if(!Number.isFinite(X)||!Number.isFinite(Y))throw Error('Punto no válido.');
 return [X,Y];
}
export function floorCorners(width,depth){return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];}
export function quadrilateralArea(pts){let sum=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];sum+=a[0]*b[1]-b[0]*a[1];}return Math.abs(sum)/2;}
export function validateCorners(pts){
 if(pts.length!==4)throw Error('Marca las cuatro esquinas del piso.');
 if(quadrilateralArea(pts)<.004)throw Error('Las esquinas están demasiado juntas o alineadas.');
 let sign=0;
 for(let i=0;i<4;i++){
  const a=pts[i],b=pts[(i+1)%4],c=pts[(i+2)%4],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
  if(Math.abs(cross)<1e-6)throw Error('Las esquinas deben formar un cuadrilátero convexo.');
  const next=Math.sign(cross);if(sign&&sign!==next)throw Error('Las esquinas están cruzadas o fuera de orden.');sign=next;
 }
}
