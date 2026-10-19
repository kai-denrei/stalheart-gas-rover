import * as T from '../upstream/stalheart/vendor/three.module.js';
import {enemyBody} from './enemy-navigation.js';

// One bounded batch for both bodies, one for expanding contact rings. These
// flashes are driven by damaging contacts, never by resting overlap.
export function createRamImpactEffects(scene){
 const capacity=16,duration=.48,active=[],root=new T.Group();root.name='ROVER / alien impact flashes';scene.add(root);
 function batch(geometry,count,shell){
  const alpha=new T.InstancedBufferAttribute(new Float32Array(count),1);geometry.setAttribute('impactAlpha',alpha);
  const material=new T.MeshBasicMaterial({color:0xff1208,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
  material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float impactAlpha;varying float vImpactAlpha;').replace('#include <begin_vertex>','#include <begin_vertex>\nvImpactAlpha=impactAlpha;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vImpactAlpha;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vImpactAlpha;');};
  material.customProgramCacheKey=()=> 'ram-flash-alpha';
  const mesh=new T.InstancedMesh(geometry,material,count);mesh.name=shell?'Red body envelopes':'Red contact shock rings';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);return {mesh,alpha};
 }
 const shells=batch(new T.SphereGeometry(1,16,10),capacity*2,true),rings=batch(new T.RingGeometry(.82,1,32),capacity,false),dummy=new T.Object3D();let now=0,total=0;
 function pose(batch,index,p,q,scale,alpha){dummy.position.copy(p);dummy.quaternion.copy(q);dummy.scale.copy(scale);dummy.updateMatrix();batch.mesh.setMatrixAt(index,dummy.matrix);batch.alpha.setX(index,alpha);}
 return {root,spawn(r,e,point,normal,speed){if(active.length===capacity)active.shift();active.push({r,e,point:point.clone(),q:new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal),age:0,power:T.MathUtils.clamp(speed/12,.45,1),radius:enemyBody(e).radius*(e.size||1)});total++;},step(dt){now+=dt;for(const hit of active)hit.age+=dt;while(active.length&&active[0].age>=duration)active.shift();},update(){let n=0;for(const h of active){const t=h.age/duration,fade=(1-t)**2*h.power,pulse=1+Math.sin(Math.min(1,t*3)*Math.PI)*.12,s=h.r.sim;
   const centre=s.pos.clone().addScaledVector(new T.Vector3(0,1,0).applyQuaternion(s.q),.3);
   pose(shells,n*2,centre,s.q,new T.Vector3(1.65,1.3,2.7).multiplyScalar(pulse),fade*.3);
   pose(shells,n*2+1,h.e.position,new T.Quaternion(),new T.Vector3(1,1,1).multiplyScalar((h.radius+.5)*pulse),fade*.38);
   pose(rings,n,h.point,h.q,new T.Vector3(1,1,1).multiplyScalar(.8+t*5),fade*.9);n++;
  }for(const [b,count] of [[shells,n*2],[rings,n]]){b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;b.alpha.needsUpdate=true;}},reset(){active.length=0;shells.mesh.count=rings.mesh.count=0;},snapshot:()=>({active:active.length,total,time:now})};
}
