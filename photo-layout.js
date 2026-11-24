// Pure photo -> meter -> layout placement logic, shared by manual, edge and AI suggestions.
import {parseProject,validateLayout} from './geometry.js';
import {transformPoint} from './photo-geometry.js';
export function proposeEquipment({project,homography,imageX,imageY,dimensions,kind,label,id}){
 if(!project||!Array.isArray(project.equipment))throw Error('Proyecto inválido');
 if(!Array.isArray(homography)||homography.length!==9)throw Error('Calibración incompleta');
 if(!Number.isFinite(imageX)||!Number.isFinite(imageY)||imageX<0||imageX>1||imageY<0||imageY>1)throw Error('Punto fuera de la fotografía');
 const [x,z]=transformPoint(homography,imageX,imageY);
 if(Math.abs(x)>project.site.width/2||Math.abs(z)>project.site.depth/2)throw Error('Punto proyectado fuera de planta');
 const e={id,kind,label,x:Number(x.toFixed(3)),z:Number(z.toFixed(3)),...dimensions};
 const candidate=parseProject({...project,equipment:[...project.equipment,e]});
 const validation=validateLayout(candidate);
 if(validation.perId[id])throw Error('Equipo rechazado: colisión o margen perimetral de 10 cm. Ajusta sus dimensiones o ubicación.');
 return {equipment:candidate.equipment.at(-1),project:candidate};
}
