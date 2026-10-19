import * as T from '../upstream/stalheart/vendor/three.module.js';
// Subtract a rectangular passage, splitting triangles at its boundary instead of
// deleting whole shell triangles. Also opens the merged distance-tier cap.
export function passageBox(port){const axis=port==='E'||port==='W'?0:2,sign=port==='W'||port==='S'?-1:1,min=[-2.3,7.95,-2.3],max=[2.3,11.85,2.3];min[axis]=sign>0?7:-16;max[axis]=sign>0?16:-7;return {min,max};}
export function subtractBox(geometry,box){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone(),attributes=Object.entries(g.attributes),out=Object.fromEntries(attributes.map(([name])=>[name,[]]));
 const planes=[];for(let axis=0;axis<3;axis++){planes.push(v=>v.position[axis]-box.min[axis]);planes.push(v=>box.max[axis]-v.position[axis]);}
 function split(poly,dist,positive){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=dist(a)*(positive?1:-1),db=dist(b)*(positive?1:-1);if(da>=-1e-7)result.push(a);if((da>1e-7&&db< -1e-7)||(da< -1e-7&&db>1e-7)){const t=da/(da-db),v={};for(const [name,attr] of attributes)v[name]=a[name].map((x,k)=>x+(b[name][k]-x)*t);result.push(v);}}return result;}
 function emit(poly){for(let i=1;i+1<poly.length;i++)for(const v of [poly[0],poly[i],poly[i+1]])for(const [name] of attributes)out[name].push(...v[name]);}
 for(let i=0;i<g.attributes.position.count;i+=3){let polygon=[0,1,2].map(k=>Object.fromEntries(attributes.map(([name,a])=>[name,Array.from({length:a.itemSize},(_,j)=>a.array[(i+k)*a.itemSize+j])])));
  // Most triangles are completely outside: preserve without splitting.
  if(planes.some(p=>polygon.every(v=>p(v)<-1e-7))){emit(polygon);continue;}
  for(const p of planes){emit(split(polygon,p,false));polygon=split(polygon,p,true);if(polygon.length<3)break;}
 }
 const result=new T.BufferGeometry();for(const [name,a] of attributes)result.setAttribute(name,new T.Float32BufferAttribute(out[name],a.itemSize));result.normalizeNormals();result.computeBoundingBox();result.computeBoundingSphere();g.dispose();return result;
}
export function openDomePort(level,port){const cap=level.getObjectByName('PORT_CAP_'+port);if(cap)cap.visible=false;const box=passageBox(port);level.traverse(o=>{if(o.isMesh&&['SHELL','BODY'].includes(o.name)){const old=o.geometry;o.geometry=subtractBox(old,box);if(o.userData.privatePortGeometry)old.dispose();o.userData.privatePortGeometry=true;}});}

// The authored radial walkway and inner floor overlap at y=7.9. Keep their
// planar union, with one surface per point, instead of hiding the z-fight.
export function unionWalkingFloor(geometry,height=7.9){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone(),attributes=Object.entries(g.attributes),out=Object.fromEntries(attributes.map(([name])=>[name,[]])),covered=[];
 const vertex=i=>Object.fromEntries(attributes.map(([name,a])=>[name,Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k])]));
 const area=p=>p.reduce((a,v,i)=>{const n=p[(i+1)%p.length].position;return a+v.position[0]*n[2]-n[0]*v.position[2];},0);
 function emit(poly){for(let i=1;i+1<poly.length;i++){const tri=[poly[0],poly[i],poly[i+1]];for(const v of tri)for(const [name] of attributes)out[name].push(...v[name]);}}
 function clip(poly,dist,sign){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=dist(a)*sign,db=dist(b)*sign;if(da>=0)result.push(a);if(da*db<0){const t=da/(da-db),v={};for(const [name] of attributes)v[name]=a[name].map((x,k)=>x+(b[name][k]-x)*t);result.push(v);}}return result;}
 for(let i=0;i<g.attributes.position.count;i+=3){const tri=[vertex(i),vertex(i+1),vertex(i+2)];if(!tri.every(v=>Math.abs(v.position[1]-height)<1e-5)||Math.abs(area(tri))<1e-8){emit(tri);continue;}
  let pieces=[tri];for(const old of covered){const sign=Math.sign(area(old)),next=[];for(let polygon of pieces){for(let edge=0;edge<3;edge++){const a=old[edge].position,b=old[(edge+1)%3].position,dist=v=>sign*((b[0]-a[0])*(v.position[2]-a[2])-(b[2]-a[2])*(v.position[0]-a[0]));const outside=clip(polygon,dist,-1);if(outside.length>=3&&Math.abs(area(outside))>1e-8)next.push(outside);polygon=clip(polygon,dist,1);if(polygon.length<3)break;}}pieces=next;if(!pieces.length)break;}
  pieces.forEach(emit);covered.push(tri);
 }
 const result=new T.BufferGeometry();for(const [name,a] of attributes)result.setAttribute(name,new T.Float32BufferAttribute(out[name],a.itemSize));result.computeBoundingBox();result.computeBoundingSphere();g.dispose();return result;
}
