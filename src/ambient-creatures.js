import * as T from '../upstream/stalheart/vendor/three.module.js';
import {createCutisFamily} from '../upstream/stalheart/src/fx/creature-cutis.js';
import {DEFAULT_CONFIG} from '../upstream/stalheart/src/fx/cutis-maku/config.js';
import {createNihDairia} from '../upstream/stalheart/src/fx/nih-dairia/creature.js';
import {NIH_DAIRIA_PREDATOR} from '../upstream/stalheart/src/content/nih-dairia.js';
import {point,frameAt,RADIUS} from './world.js';
import {BOSS} from './crowd-variation.js';
export async function createAmbientCreatures(view,root,defense){
 const cutis=createCutisFamily({parent:root,tiers:{small:{capacity:640,r0:1.1,multicolored:true,config:{...DEFAULT_CONFIG,r0:1.1,reach:5,cycleDuration:3,frameStep:true}}},follow:{leashRadii:3,leashMin:8,grace:1.5,catchRadii:1.5,fastest:.55},death:{deflate:.5,fade:1,sink:.25}});cutis.setPlanet(RADIUS);
 const handles=new Map(),boss=await createNihDairia({...NIH_DAIRIA_PREDATOR,speed:.6,stretch:3,spread:3}),group=new T.Group();group.name='NIH_DAIRA_BOSS';root.add(group);group.add(boss.mesh);group.visible=false;
 boss.mesh.geometry.computeBoundingBox();const box=boss.mesh.geometry.boundingBox,scale=BOSS.width/Math.max(box.max.x-box.min.x,box.max.z-box.min.z);boss.mesh.scale.setScalar(scale);let bossId=null;
 function reset(){for(const h of handles.values())cutis.free(h);handles.clear();bossId=null;group.visible=false;boss.reset();}
 function step(dt){const ids=new Set(defense.enemies.map(e=>e.id));for(const [id,h] of handles)if(!ids.has(id)){cutis.free(h);handles.delete(id);}
  for(const e of defense.enemies){if(e.kind!=='cutis')continue;let h=handles.get(e.id);if(!h&&!e.dead){h=cutis.add('small',{x:e.x,z:e.z,angle:e.direction*Math.PI/2});if(h){h.t.swarm.scale[h.i]=e.size;handles.set(e.id,h);}}if(!h)continue;if(e.dead)cutis.kill(h);else cutis.track(h,{x:e.x,z:e.z,ax:e.x+e.direction*5,az:e.z,dt});}cutis.step(dt,null,view.height);
  const e=defense.enemies.find(e=>e.kind==='nih-daira');if(!e)return;if(bossId!==e.id){boss.reset();bossId=e.id;}if(!e.dead){const c=boss.body.center;boss.setTarget(new T.Vector3(c.x,.012,c.z+.6));boss.update(dt);boss.mesh.geometry.computeBoundingSphere();}
 }
 function update(){cutis.step(0,view.camera,view.height||900);const e=defense.enemies.find(e=>e.kind==='nih-daira');group.visible=!!e;if(!e)return;const alpha=defense.accumulator/.025,p=point(T.MathUtils.lerp(e.px,e.x,alpha),T.MathUtils.lerp(e.pz,e.z,alpha),.03),death=e.dead?Math.min(1,(defense.time-e.dead)/1.6):0;const material=boss.mesh.material,distance=p.distanceTo(view.camera.position),transmission=distance<(material.transmission?70:55)?.65:0;if(material.transmission!==transmission){material.transmission=transmission;material.needsUpdate=true;}group.position.copy(p);group.quaternion.copy(frameAt(p).q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),e.direction*Math.PI/2));group.scale.set(1,1-death*.95,1);boss.mesh.position.set(-boss.body.center.x*scale,-death,-boss.body.center.z*scale);}
 return {cutis,boss,group,step,update,reset,snapshot(){return {visible:[...new Set([...handles.values()].map(h=>h.t))].reduce((n,t)=>n+t.geo.lodCounts.slice(0,3).reduce((a,b)=>a+b,0),0)+(group.visible?1:0),cutis:cutis.stats(),boss:{active:group.visible,id:bossId,width:BOSS.width,scale,timings:boss.timings}};}};
}
