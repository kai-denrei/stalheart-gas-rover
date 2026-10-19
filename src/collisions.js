import {Vector3,Matrix4,Box3} from '../upstream/stalheart/vendor/three.module.js';
import {ConvexHull} from '../upstream/stalheart/vendor/ConvexHull.js';
import {breachPoint} from '../upstream/stalheart/src/core/breach-surface.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
// Convex proxies are baked from visible vertices, including the GPU's sphere wrap.
export function convexCollider(points,id,owner='fixtures'){
 const bounds=new Box3().setFromPoints(points),center=bounds.getCenter(V()),radius=bounds.getSize(V()).length()/2;
 if(radius<.03)return null;
 const hull=new ConvexHull().setFromPoints(points),planes=[];
 for(const face of hull.faces){if(!planes.some(p=>p.normal.dot(face.normal)>.999999&&Math.abs(p.constant-face.constant)<1e-5))planes.push({normal:face.normal.clone(),constant:face.constant});}
 return {id,owner,center,radius,planes};
}
export function boxCollider(rock,id){const points=[];for(const x of [-rock.w/2,rock.w/2])for(const y of [0,rock.h])for(const z of [-rock.d/2,rock.d/2])points.push(V(x,y,z).applyQuaternion(rock.frame.q).add(rock.origin));return convexCollider(points,id);}
export function cylinderCollider({radius,h,origin,frame},id){
 const points=[];for(const y of [0,h])for(let i=0;i<64;i++){const a=i*Math.PI/32;points.push(V(Math.sin(a)*radius,y,Math.cos(a)*radius).applyQuaternion(frame.q).add(origin));}return convexCollider(points,id);
}
export function fixtureColliders(rocks,pads){const out=rocks.map((r,i)=>boxCollider(r,'barrier-'+i));
 for(const [i,pad] of pads.entries())for(const side of [-1,1]){const pts=[];for(const y of [0,1.37])for(let j=0;j<12;j++){const a=j*Math.PI/6;pts.push(V(side*6+Math.cos(a)*.12,y,Math.sin(a)*.12).applyQuaternion(pad.frame.q).add(pad.origin));}out.push(convexCollider(pts,`pad-${i}-beacon-${side}`));}
 return out;
}
export function nearColliders(world,center,radius){return world.colliders.filter(c=>center.distanceToSquared(c.center)<(c.radius+radius)**2);}
// Sphere vs expanded convex planes; conservative at sharp corners, bounded by radius.
export function sphereContact(c,p,r){if(p.distanceToSquared(c.center)>(c.radius+r)**2)return null;let distance=-Infinity,normal=null;
 for(const plane of c.planes){const d=plane.normal.dot(p)-plane.constant;if(d>r)return null;if(d>distance){distance=d;normal=plane.normal;}}
 return normal?{normal,depth:r-distance,point:p.clone().addScaledVector(normal,-r)}:null;
}
export function blocked(world,p,r=.35){return nearColliders(world,p,r).some(c=>sphereContact(c,p,r));}
// Signed distance to a solid top along radial up, for visual wheel suspension.
export function solidSupport(world,p,up){let best=Infinity;
 for(const c of nearColliders(world,p,.8)){const start=p.clone().addScaledVector(up,.35),dir=up.clone().negate();let enter=0,exit=.85,normal=null,miss=false;
  for(const plane of c.planes){const den=plane.normal.dot(dir),d=plane.constant-plane.normal.dot(start);if(Math.abs(den)<1e-9){if(d<0){miss=true;break;}continue;}const t=d/den;if(den<0){if(t>enter){enter=t;normal=plane.normal;}}else exit=Math.min(exit,t);}
  if(!miss&&enter<=exit&&normal?.dot(up)>.4)best=Math.min(best,enter-.35);
 }return best;
}
export const ROVER_SOLIDS=[];
for(const [i,x] of [-.98,.98].entries())for(const [j,z] of [-1.44,-.42,1.44].entries()){
 const wheel=i*3+j,id=['RL','ML','FL','RR','MR','FR'][wheel];
 for(const [dy,dz] of [[0,0],[-.24,0],[.24,0],[0,-.24],[0,.24]])ROVER_SOLIDS.push({center:V(x,.04+dy,z+dz),radius:.24,zone:'wheel_'+id,wheel});
}
for(const x of [-.65,0,.65])for(const z of [-2.05,-1.35,-.65,.05,.75,1.45,2.05])ROVER_SOLIDS.push({center:V(x,.25,z),radius:.32,zone:z>1?'front':z<-1?'rear':x<0?'flank_negative_x':x>0?'flank_positive_x':'chassis'});
ROVER_SOLIDS.push({center:V(0,.96,.26),radius:.26,zone:'sensor'});

function instances(fx){const out=[];fx.group.updateWorldMatrix(true,true);fx.group.traverseVisible(o=>{if(o.isInstancedMesh&&o.count>0)out.push(o);});return out;}
export function sinkholeStamp(fx){let stamp='';for(const mesh of instances(fx))stamp+=mesh.uuid+':'+mesh.count+':'+Array.from(mesh.matrixWorld.elements).join(',')+':'+Array.from(mesh.instanceMatrix.array.subarray(0,mesh.count*16)).join(',')+';';return stamp;}
export function bakeSinkholeColliders(fx,owner){fx.group.updateWorldMatrix(true,true);const out=[],inv=fx.group.matrixWorld.clone().invert(),m=new Matrix4(),instance=new Matrix4();
 for(const mesh of instances(fx))for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,instance);m.multiplyMatrices(inv,mesh.matrixWorld).multiply(instance);const a=mesh.geometry.attributes.position,points=[];
  for(let j=0;j<a.count;j++){const p=V().fromBufferAttribute(a,j).applyMatrix4(m);p.fromArray(breachPoint(p.toArray(),fx.tune.planetRadius)).applyMatrix4(fx.group.matrixWorld);points.push(p);}
  const bounds=new Box3().setFromPoints(points);if(bounds.getSize(V()).length()<.12)continue;
  const c=convexCollider(points,`${owner}-rock-${out.length}`,owner);if(c)out.push(c);
 }return out;
}
