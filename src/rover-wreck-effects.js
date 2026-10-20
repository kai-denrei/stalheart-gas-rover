import * as T from '../upstream/stalheart/vendor/three.module.js';
import {DEBRIS_MAP} from '../assets/recon-rover/damage/runtime.js';
import {createExplosion} from '../upstream/stalheart/src/fx/explosions/bofors-burst.js';
import {RADIUS,upAt,terrainSample} from './world.js';

// Reuse the authored D3 fragments. At most six pieces and one burst per rover;
// shared asset geometry/materials are retained when the wreck is recovered.
export function createRoverWreckEffects(model,scene,world){
 const root=new T.Group();root.name='Rover total destruction';scene.add(root);const pieces=[];let crash=null,burst=null;
 function clear(){for(const p of pieces)p.mesh.removeFromParent();pieces.length=0;burst?.dispose();burst=null;crash=null;}
 return {root,update(sim,dt){
  if(!sim.catastrophic){if(crash)clear();return;}
  if(crash!==sim.catastrophic){clear();crash=sim.catastrophic;model.updateWorldMatrix(true,true);
   const up=upAt(sim.pos);burst=createExplosion({scale:.55,seed:Math.floor(sim.time*120)+1,planetRadius:RADIUS});burst.object.position.copy(sim.pos);burst.object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),up);root.add(burst.object);
   for(const [i,part] of DEBRIS_MAP.entries()){const donor=model.getObjectByName(part.id);if(!donor?.isMesh)continue;const mesh=donor.clone();mesh.visible=true;donor.matrixWorld.decompose(mesh.position,mesh.quaternion,mesh.scale);root.add(mesh);const away=new T.Vector3(Math.cos(i*2.4),.7,Math.sin(i*2.4)).applyQuaternion(sim.q).normalize();pieces.push({mesh,velocity:sim.vel.clone().multiplyScalar(.18).addScaledVector(away,3+i*.4).addScaledVector(up,3),axis:away});}
  }
  if(burst){burst.tick(dt);if(!burst.alive()){burst.dispose();burst=null;}}
  for(const p of pieces){const up=upAt(p.mesh.position);p.velocity.addScaledVector(up,-sim.tune.gravity*dt);p.mesh.position.addScaledVector(p.velocity,dt);const ground=terrainSample(world,p.mesh.position,false);if(Number.isFinite(ground.signed)&&ground.signed<.12){p.mesh.position.addScaledVector(ground.normal,.12-ground.signed);const vn=p.velocity.dot(ground.normal);if(vn<0)p.velocity.addScaledVector(ground.normal,-vn*1.2);p.velocity.multiplyScalar(Math.exp(-dt*8));}if(p.velocity.lengthSq()>.05)p.mesh.rotateOnWorldAxis(p.axis,dt*3);}
 },snapshot:()=>({active:!!crash,pieces:pieces.length,burst:!!burst})};
}
