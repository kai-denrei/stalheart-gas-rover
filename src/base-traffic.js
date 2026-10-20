import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {mergeGeometries} from '../upstream/stalheart/vendor/BufferGeometryUtils.js';
import {makeLandingSequence} from '../upstream/stalheart/src/domain/landing-sequence.js';
import {STORY_ARRIVAL,STORY_SCALE,PLUME_CLUSTER,SH02_WELL} from '../upstream/stalheart/src/content/story-defaults.js';
import {createLaunchPlume} from '../upstream/stalheart/src/fx/launch-plume.js';
import {makeScorch,makeEmbers,IMPACT_TUNE} from '../upstream/stalheart/src/impactfx.js';
import {point,frameAt,coords} from './world.js';
import {boxCollider,cylinderCollider} from './collisions.js';
const sequence=makeLandingSequence(STORY_ARRIVAL.landing);
export const TRAFFIC={x:40,z:235,delay:12,period:70,docked:14,close:1.8,ignition:1,ascent:7};
const celebrationSequence=makeLandingSequence({...STORY_ARRIVAL.landing,orbit:2,descent:12,startAltitude:320});
export function celebrationArrivalState(time,active=true){
 if(!active)return {phase:'away',visible:false,cycle:0,altitude:320,approach:360,plume:0,clips:{}};
 const t=Math.max(0,time),s=celebrationSequence.stateAt(t),burn=Math.max(0,Math.min(1,(t-1.4)/.8));
 return {...s,visible:true,cycle:0,local:t,phase:t<celebrationSequence.touchdown?'landing':'docked',approach:360*(s.altitude/320),plume:s.plume*burn};
}
export function trafficState(time){
 const t=time-TRAFFIC.delay,cycle=Math.floor(Math.max(0,t)/TRAFFIC.period),local=t<0?-1:t%TRAFFIC.period,endDock=sequence.touchdown+TRAFFIC.docked,launch=endDock+TRAFFIC.close+TRAFFIC.ignition;
 if(local<0||local>=launch+TRAFFIC.ascent)return {phase:'away',visible:false,cycle,altitude:210,plume:0,clips:{}};
 if(local<endDock){const s=sequence.stateAt(local);return {...s,phase:local<sequence.touchdown?'landing':'docked',visible:true,cycle,local};}
 const elapsed=local-launch,up=Math.max(0,elapsed)/TRAFFIC.ascent;
 return {phase:elapsed<0?'departing':'ascending',visible:true,cycle,local,altitude:210*up*up,plume:local>=launch-TRAFFIC.ignition?Math.min(1,(local-launch+TRAFFIC.ignition)/TRAFFIC.ignition):0,dust:elapsed>=0&&elapsed<1.2,scorch:true,clips:{Top_Door_Close:Math.min(TRAFFIC.close,local-endDock),Legs_Retract:elapsed>.6?Math.min(2.4,elapsed-.6):null,Landing_Shock:elapsed>.6?null:2}};
}
// Consolidate static geometry within each animated joint. Imported keyframes and
// named pivots remain intact; dozens of decorative pieces share a draw call.
export function batchRig(root,animations=[]){
 const joints=new Set(animations.flatMap(a=>a.tracks.map(t=>t.name.slice(0,t.name.lastIndexOf('.'))))),batches=new Map(),meshes=[];root.updateWorldMatrix(true,true);
 root.traverseVisible(o=>{if(!o.isMesh||o.isSkinnedMesh)return;let joint=o;while(joint!==root&&!joints.has(joint.name))joint=joint.parent;if(joint===o)return;const material=o.material;if(Array.isArray(material))return;
  const key=joint.uuid+material.uuid,g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(joint.matrixWorld.clone().invert().multiply(o.matrixWorld));for(const k of Object.keys(g.attributes))if(!['position','normal','color'].includes(k))g.deleteAttribute(k);
  if(!batches.has(key))batches.set(key,{joint,material,geos:[]});batches.get(key).geos.push(g);meshes.push(o);
 });
 for(const {joint,material,geos} of batches.values()){joint.add(new T.Mesh(mergeGeometries(geos),material));geos.forEach(g=>g.dispose());}meshes.forEach(o=>o.removeFromParent());
}
export async function createBaseTraffic(view,race,{celebration=false}={}){
 const [pad,rocket]=await Promise.all(['hugin_launchpad','sh_rocket'].map(n=>new GLTFLoader().loadAsync('./assets/base-traffic/'+n+'.glb'))),root=new T.Group(),deck=view.world.race.deck,site=celebration?deck.origin.clone().addScaledVector(deck.frame.north,deck.d/2+34):point(TRAFFIC.x,TRAFFIC.z),frame=frameAt(site);if(celebration){const c=coords(site);site.copy(point(c.x,c.z));}
 root.name=celebration?'DISCO_SH02_ARRIVAL':'HUGIN_SH02_TRAFFIC';root.position.copy(site);root.quaternion.copy(frame.q);view.scene.add(root);
 for(const name of ['REUSABLE_BOOSTER','CARGO_CAPSULE']){const o=pad.scene.getObjectByName(name);if(o)o.visible=false;}batchRig(pad.scene);root.add(pad.scene);
 const ship=new T.Group();ship.position.set(-3,2.5,0);ship.scale.setScalar(STORY_SCALE.rocket);root.add(ship);batchRig(rocket.scene,rocket.animations);ship.add(rocket.scene);
 const mixer=new T.AnimationMixer(rocket.scene),clips=Object.fromEntries(rocket.animations.map(c=>{const a=mixer.clipAction(c);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;a.enabled=false;return [c.name,a];}));
 const plumes=PLUME_CLUSTER.map(e=>{const p=createLaunchPlume({width:e.width,height:e.height});p.position.set(Math.cos(e.angle*Math.PI/180)*e.radius,SH02_WELL.bell-e.height/2+1,Math.sin(e.angle*Math.PI/180)*e.radius);p.userData.engine=e;ship.add(p);p.userData.setIntensity(0);return p;});
 const scorch=makeScorch({...IMPACT_TUNE,scorchSize:9,scorchLife:1e9},0x0a0806);scorch.rotation.x=-Math.PI/2;scorch.position.set(-3,2.52,0);root.add(scorch);scorch.visible=false;
 view.world.colliders.push(cylinderCollider({radius:9,h:2.5,origin:new T.Vector3(-3,0,0).applyQuaternion(frame.q).add(site),frame},celebration?'disco-hugin-pad':'hugin-pad'),boxCollider({w:8,d:10,h:30,origin:new T.Vector3(9,0,-3).applyQuaternion(frame.q).add(site),frame},celebration?'disco-hugin-tower':'hugin-tower'));
 const stateAt=()=>celebration?celebrationArrivalState(race.celebrationTime,race.phase==='finished'):trafficState(time);
 let time=0,state=celebration?celebrationArrivalState(0,false):trafficState(0),last=state,generation=view.world.race.hazardGeneration,dust=null,dustKey='',landings=0,takeoffs=0;
 const dropDust=()=>{if(dust){dust.removeFromParent();dust.geometry.dispose();dust.material.dispose();dust=null;}};
 function apply(dt){state=stateAt();ship.visible=state.visible;ship.position.y=2.5+state.altitude;ship.position.z=state.approach||0;
  for(const [name,act] of Object.entries(clips)){let value=state.clips[name]??null;if(name==='Legs_Deploy'&&state.phase==='landing')value=state.clips.Legs_Deploy??0;if(name==='Legs_Deploy'&&state.clips.Landing_Shock!==null&&state.clips.Landing_Shock!==undefined)value=null;act.enabled=value!==null;if(act.enabled)act.time=value;}
  mixer.update(0);scorch.visible=state.scorch||landings>0;
  if(last.phase==='landing'&&state.phase==='docked'){landings++;view.onWeaponSound?.('tank_spool_down',site,.4);}if(last.phase==='departing'&&state.phase==='ascending')takeoffs++;
  if(state.clips.Legs_Deploy!==null&&state.clips.Legs_Deploy!==undefined&&(last.clips.Legs_Deploy===null||last.clips.Legs_Deploy===undefined))view.onWeaponSound?.('tank_spool_up',site,.3);
  if(state.clips.Top_Door_Open!==null&&state.clips.Top_Door_Open!==undefined&&(last.clips.Top_Door_Open===null||last.clips.Top_Door_Open===undefined))view.onWeaponSound?.('tank_spool_up',site,.25);
  const key=state.cycle+':'+state.phase;if(state.dust&&dustKey!==key){dropDust();dust=makeEmbers({...IMPACT_TUNE,emberCount:420,emberLife:2.6,emberDrag:.985,emberRise:.9},0x9a8f7a,11+state.cycle);dust.scale.setScalar(6);dust.position.set(-3,2.9,0);root.add(dust);dustKey=key;}
  if(dust&&dt>0&&!dust.userData.tick(dt))dropDust();
  view.onAmbientLoop?.('rocket_thrust',ship.getWorldPosition(new T.Vector3()),state.plume*.65,root.name);last=state;
 }
 function update(){const eye=ship.worldToLocal(view.camera.position.clone());for(const p of plumes){const e=p.userData.engine;p.userData.setIntensity(state.plume*(1-e.depth+e.depth*Math.sin(time*e.cadence+e.phase))*.55);p.userData.tick(time+e.phase);p.rotation.set(0,Math.atan2(eye.x-p.position.x,eye.z-p.position.z),0);}}
 apply(0);
 return {root,ship,model:rocket.scene,pad:pad.scene,clips,plumes,step(dt){if(generation!==view.world.race.hazardGeneration){generation=view.world.race.hazardGeneration;time=landings=takeoffs=0;last=celebration?celebrationArrivalState(0,false):trafficState(0);dustKey='';dropDust();apply(0);}if(!['racing','finished'].includes(race.phase))return;time+=dt;apply(dt);},update,snapshot(){return {celebration,time,phase:state.phase,altitude:state.altitude,cycle:state.cycle,landings,takeoffs,plume:state.plume,dust:!!dust,visible:ship.visible,clips:Object.fromEntries(Object.entries(clips).filter(([,a])=>a.enabled).map(([n,a])=>[n,a.time]))};}};
}
