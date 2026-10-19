import {orbitalSafe,SOL_ALTITUDE} from './orbital-safety.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {makeLaser,stepLaser,aimLaser,burnLaser,burnContacts,inFootprint} from '../upstream/stalheart/src/domain/orbital-laser.js';
import {densestTarget} from '../upstream/stalheart/src/domain/laser-auto.js';
import {LASER_AUTO,LASER_BEAM,LASER_GAME,LASER_BURN,LASER_PRESET} from '../upstream/stalheart/src/content/orbital-laser.js';
import {createOrbitalLaser} from '../upstream/stalheart/src/fx/orbital-laser.js';
import {CENTER,point,coords,frameAt,upAt} from './world.js';
const orbit={period:55,overhead:LASER_GAME.pass.overhead},beam={...LASER_BEAM,...LASER_GAME.pass};
export function sol88Safe(world,race,p,isao,source=null,guns=[],traffic=null,aircraft=[]){return orbitalSafe(world,race,p,{source,isao,guns,traffic,aircraft,radius:beam.radius,margin:LASER_AUTO.safeMetres});}
export async function createAutoSol88(view,race,defense,effects,aircraft=[]){
 const gltf=await new GLTFLoader().loadAsync('./assets/city-combat/sol88.glb'),group=new T.Group();group.name='SOL88_AUTOMATED';group.add(gltf.scene);view.scene.add(group);
 const mixer=new T.AnimationMixer(gltf.scene),clips=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
 const laser=createOrbitalLaser(view.scene);laser.tune({...LASER_PRESET,radius:beam.radius});let state,time=0,target=null,retarget=0,countdown=0,plume=0,wasBurning=false,passes=0,kills=0,burnSeconds=0,generation;
 function play(name){const action=clips[name];if(action){action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();}}
 function reset(){state=makeLaser(orbit,beam);state.left=7;time=retarget=countdown=plume=passes=kills=burnSeconds=0;target=null;wasBurning=false;laser.clear();mixer.stopAllAction();clips.Idle_Cycle?.reset().play();generation=view.world.race.hazardGeneration;}
 reset();
 return {group,model:gltf.scene,laser,get state(){return state;},step(dt){
  if(generation!==view.world.race.hazardGeneration)reset();if(!['racing','finished'].includes(race.phase))return;
  time+=dt;mixer.update(dt);const a=time*.019+1.1,focus=view.world.race.course.id==='expedition'?coords(race.racers[0].sim.pos):{x:80,z:140};group.position.copy(point(focus.x+Math.cos(a)*45,focus.z+Math.sin(a)*45,SOL_ALTITUDE));group.quaternion.copy(frameAt(group.position).q);group.updateWorldMatrix(true,true);
  const source=group.position.clone(),safe=p=>sol88Safe(view.world,race,p,view.isao,source,defense.guns,view.raceView?.traffic,aircraft);let restart=false;
  const event=stepLaser(state,dt,orbit,beam);if(event==='arrive'){passes++;countdown=LASER_AUTO.countdown;target=null;retarget=0;play('Convergence');play('Aperture_Open');}if(event==='close'){target=null;play('Recovery');play('Aperture_Close');}
  countdown=Math.max(0,countdown-dt);retarget-=dt;
  if(state.phase==='overhead'&&retarget<=0){retarget=LASER_AUTO.retarget;const candidates=defense.enemies.filter(e=>!e.dead&&safe(e.position)).map(e=>({pos:e.position.toArray()})),next=densestTarget(candidates,{radius:beam.radius,metres:1,sample:48});
   if(next){const p=new T.Vector3().fromArray(next),c=coords(p);p.copy(point(c.x,c.z,.05));if(target&&target.distanceTo(p)>beam.radius*LASER_AUTO.strikeOver){state.fresh=true;restart=true;}target=p;}else target=null;
  }
  if(restart&&wasBurning){laser.lift();wasBurning=false;}
  if(target)aimLaser(state,target.clone().sub(CENTER).toArray(),dt,beam);
  const contact=state.contact?new T.Vector3().fromArray(state.contact).add(CENTER):null;
  const burning=burnLaser(state,!!target&&countdown===0&&!!contact&&safe(contact),dt);
  if(burning){
   const yaw=gltf.scene.getObjectByName('OPTICS_YAW'),pitch=gltf.scene.getObjectByName('OPTICS_PITCH');
   if(yaw){const p=yaw.parent.worldToLocal(contact.clone()).sub(yaw.position);yaw.rotation.y=Math.atan2(p.x,p.z);yaw.updateWorldMatrix(true,true);}if(pitch){const p=pitch.parent.worldToLocal(contact.clone()).sub(pitch.position);pitch.rotation.x=-Math.atan2(p.y,Math.hypot(p.x,p.z));}group.updateWorldMatrix(true,true);
   const aperture=gltf.scene.getObjectByName('APERTURE').getWorldPosition(new T.Vector3());if(!sol88Safe(view.world,race,contact,view.isao,aperture,defense.guns,view.raceView?.traffic,aircraft)){laser.lift();wasBurning=false;state.burning=false;state.contacts.clear();laser.tick(dt);return;}laser.setSource(aperture.toArray());if(!wasBurning){laser.lay(contact,upAt(contact));play('Firing_Cycle');}else laser.aim(contact,upAt(contact));
   const things=defense.enemies.filter(e=>!e.dead).map(e=>({id:e.id,kind:['gorogoro','nih-daira'].includes(e.kind)?'hard':'soft',pos:e.position.toArray(),enemy:e}));
   const footprint=inFootprint(contact.toArray(),beam.radius,things);for(const hit of footprint)if(hit.enemy.kind!=='nih-daira'){defense.kill(hit.enemy,'sol');kills++;}
   for(const hit of burnContacts(state,footprint.filter(hit=>hit.enemy.kind==='nih-daira'),dt,LASER_BURN)){defense.kill(hit.thing.enemy);kills++;}burnSeconds+=dt;
   plume+=dt;if(plume>=1/LASER_AUTO.plumeRate){plume=0;effects.spawn('rotary',contact.clone().addScaledVector(upAt(contact),LASER_AUTO.plumeLift),.8);}
  }else {state.contacts.clear();if(wasBurning)laser.lift();}
  wasBurning=burning;laser.tick(dt);
 },snapshot(){return {platform:'SOL-88',phase:state.phase,countdown,energy:state.energy,burning:state.burning,passes,kills,burnSeconds,target:target?.toArray()??null,scorch:laser.state()};},reset};
}
