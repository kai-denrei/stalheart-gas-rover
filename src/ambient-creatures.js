import {createRemains} from '../upstream/stalheart/src/labs/boss/remains.js';
import {BOSS_FIGHT} from '../upstream/stalheart/src/content/boss-fight.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {createCutisFamily} from '../upstream/stalheart/src/fx/creature-cutis.js';
import {DEFAULT_CONFIG} from '../upstream/stalheart/src/fx/cutis-maku/config.js';
import {createNihDairia} from '../upstream/stalheart/src/fx/nih-dairia/creature.js';
import {NIH_DAIRIA_PREDATOR} from '../upstream/stalheart/src/content/nih-dairia.js';
import {point,frameAt,coords,RADIUS} from './world.js';
import {BOSS} from './crowd-variation.js';
export async function createAmbientCreatures(view,root,defense){
 const cutis=createCutisFamily({parent:root,tiers:{small:{capacity:640,r0:1.1,multicolored:true,config:{...DEFAULT_CONFIG,r0:1.1,reach:5,cycleDuration:3,frameStep:true}}},follow:{leashRadii:3,leashMin:8,grace:1.5,catchRadii:1.5,fastest:.55},death:{deflate:.5,fade:1,sink:.25}});cutis.setPlanet(RADIUS);
 const handles=new Map(),boss=await createNihDairia({...NIH_DAIRIA_PREDATOR,speed:.6,stretch:3,spread:3}),group=new T.Group();group.name='NIH_DAIRA_BOSS';root.add(group);group.add(boss.mesh);group.visible=false;
 boss.mesh.geometry.computeBoundingBox();const box=boss.mesh.geometry.boundingBox,scale=BOSS.width/Math.max(box.max.x-box.min.x,box.max.z-box.min.z);boss.mesh.scale.setScalar(scale);const gravity=boss.phys.gravity;let bossId=null,deadId=null;
 const remains=createRemains({group:root,tune:()=>BOSS_FIGHT,now:()=>defense.time,ground:(x,z)=>point(x,z).toArray(),local:a=>{const c=coords(new T.Vector3().fromArray(a));return [c.x,c.z];}});
 const pose=e=>{const p=point(e.x,e.z,.03);group.position.copy(p);group.quaternion.copy(frameAt(p).q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),e.direction*Math.PI/2));group.scale.setScalar(1);boss.mesh.position.set(-boss.body.center.x*scale,0,-boss.body.center.z*scale);group.updateWorldMatrix(true,true);};
 defense.onRemainsHit=(position,radius,kind)=>{const c=coords(position);return remains.blast({kind,at:[c.x,c.z],radius});};
 function reset(){for(const h of handles.values())cutis.free(h);handles.clear();bossId=deadId=null;group.visible=false;remains.clear();boss.reset();boss.phys.gravity=gravity;boss.motion.active=true;boss.motion.feeding.enabled=true;}
 function step(dt){const ids=new Set(defense.enemies.map(e=>e.id));for(const [id,h] of handles)if(!ids.has(id)){cutis.free(h);handles.delete(id);}
  for(const e of defense.enemies){if(e.kind!=='cutis')continue;let h=handles.get(e.id);if(!h&&!e.dead){h=cutis.add('small',{x:e.x,z:e.z,angle:e.direction*Math.PI/2});if(h){h.t.swarm.scale[h.i]=e.size;handles.set(e.id,h);}}if(!h)continue;if(e.dead)cutis.kill(h);else cutis.track(h,{x:e.x,z:e.z,ax:e.x+e.direction*5,az:e.z,dt});}cutis.step(dt,null,view.height);
  const e=defense.enemies.find(e=>e.kind==='nih-daira');if(!e){if(remains.present())remains.clear();return;}if(bossId!==e.id){remains.clear();boss.reset();boss.phys.gravity=gravity;boss.motion.active=true;boss.motion.feeding.enabled=true;deadId=null;bossId=e.id;}if(!e.dead){const c=boss.body.center;boss.setTarget(new T.Vector3(c.x,.012,c.z+.6));boss.update(dt);boss.mesh.geometry.computeBoundingSphere();}
  else {if(deadId!==e.id){deadId=e.id;boss.motion.active=false;boss.motion.feeding.enabled=false;boss.phys.gravity=BOSS_FIGHT.deathGravity;}
   if(!remains.present()){boss.update(dt);pose(e);if(defense.time-e.dead>=BOSS_FIGHT.bossCarcass.settle){const rig=new T.Object3D();boss.mesh.matrixWorld.decompose(rig.position,rig.quaternion,rig.scale);remains.lay(boss,rig,scale,e.id,e.dead);}}remains.step();if(defense.time-e.dead>BOSS.corpse-5)remains.frame().outer.children[0].material.opacity=Math.max(0,(BOSS.corpse-(defense.time-e.dead))/5);}
 }
 function update(){cutis.step(0,view.camera,view.height||900);const e=defense.enemies.find(e=>e.kind==='nih-daira');group.visible=!!e;if(!e)return;const alpha=defense.accumulator/.025,p=point(T.MathUtils.lerp(e.px,e.x,alpha),T.MathUtils.lerp(e.pz,e.z,alpha),.03);const material=boss.mesh.material,distance=p.distanceTo(view.camera.position),transmission=distance<(material.transmission?70:55)?.65:0;if(material.transmission!==transmission){material.transmission=transmission;material.needsUpdate=true;}group.position.copy(p);group.quaternion.copy(frameAt(p).q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),e.direction*Math.PI/2));group.scale.setScalar(1);boss.mesh.position.set(-boss.body.center.x*scale,0,-boss.body.center.z*scale);}
 return {cutis,boss,group,remains,step,update,reset,snapshot(){return {visible:[...new Set([...handles.values()].map(h=>h.t))].reduce((n,t)=>n+t.geo.lodCounts.slice(0,3).reduce((a,b)=>a+b,0),0)+(group.visible?1:0),cutis:cutis.stats(),remains:remains.stats(),boss:{active:group.visible,id:bossId,width:BOSS.width,scale,timings:boss.timings}};}};
}
