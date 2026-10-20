import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {point,coords,upAt,frameAt,terrainSample} from './world.js';
import {nearColliders,sphereContact,blocked} from './collisions.js';

// A physical, hover-stabilized actor. Simulation runs at 120 Hz; both his body
// and the trailing camera use the same interpolated pose as the racing rovers.
export class IsaoController {
 constructor(view){
  this.view=view;this.keys=new Set();this.active=false;this.unlocked=false;this.spawned=false;
  this.position=new T.Vector3();this.previous=new T.Vector3();this.velocity=new T.Vector3();
  this.rotation=new T.Quaternion();this.previousRotation=new T.Quaternion();
  this.yaw=0;this.cameraYaw=0;this.pitch=.32;this.distance=5;this.radius=.75;this.contacts=0;this.forwardHeld=0;
  this.root=new T.Group();this.root.name='ISAO / player-controlled builder drone';this.root.visible=false;view.scene.add(this.root);
 }
 async load(){
  const asset=await new GLTFLoader().loadAsync('./assets/isao/isao_birudoron_lod1.glb');
  this.model=asset.scene;this.mixer=new T.AnimationMixer(this.model);this.clips=new Map(asset.animations.map(c=>[c.name,c]));
  for(const name of ['Hover_Idle','Rotor_Cycle']){const action=this.mixer.clipAction(this.clips.get(name)).play();if(name==='Rotor_Cycle')this.rotor=action;}
  this.setFace('Happy');this.mixer.update(0);this.model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(this.model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const scale=1.4/Math.max(size.x,size.y,size.z),fit=new T.Group();fit.scale.setScalar(scale);fit.position.copy(center).multiplyScalar(-scale);fit.add(this.model);this.root.add(fit);
 }
 setFace(name){if(!this.mixer||this.face===name)return;const clip=this.clips.get('Emotion_'+name);if(!clip)return;const next=this.mixer.clipAction(clip).reset();next.setLoop(T.LoopOnce,1);next.clampWhenFinished=true;next.play();if(this.faceAction)next.crossFadeFrom(this.faceAction,.25,false);this.faceAction=next;this.face=name;}
 unlock(){this.unlocked=true;}
 enter(){
  if(!this.unlocked)return false;
  if(!this.spawned){
   const deck=this.view.world.race?.deck,rigs=this.view.raceView?.defense?.rigs||[],sites=this.view.raceView?.city?.sites||[];
   const mounts=rigs.filter(r=>!r.podium&&r.state.family==='quiver').map(r=>{const position=r.model.getWorldPosition(new T.Vector3()),site=sites.find(s=>s.root.position.clone().sub(position).projectOnPlane(upAt(position)).length()<3);return {position,amber:site?.base===2};});
   const nearby=deck?mounts.filter(m=>m.position.distanceTo(deck.origin)<180):[];nearby.sort((a,b)=>Number(b.amber)-Number(a.amber)||a.position.distanceToSquared(deck.origin)-b.position.distanceToSquared(deck.origin));
   if(nearby.length){this.position.copy(nearby[0].position).addScaledVector(upAt(nearby[0].position),12);this.overlook=coords(this.position);}
   else if(deck)this.position.copy(deck.origin).addScaledVector(deck.frame.north,-65).addScaledVector(deck.frame.up,48);
   else {const source=this.view.sim.pos,f=frameAt(source);this.position.copy(source).addScaledVector(f.up,4).addScaledVector(f.east,4);}
   const f=frameAt(this.position);if(deck){const target=deck.origin.clone().addScaledVector(deck.frame.north,-15).addScaledVector(deck.frame.up,deck.h+3),delta=target.sub(this.position);this.yaw=Math.atan2(delta.dot(f.east),delta.dot(f.north));this.cameraYaw=0;this.pitch=T.MathUtils.clamp(Math.atan2(-delta.dot(f.up),delta.clone().projectOnPlane(f.up).length()),.1,1.05);this.distance=10;}
   this.rotation.copy(f.q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),this.yaw));this.velocity.set(0,0,0);this.resolveContacts();this.capture();this.spawned=true;}
  this.active=true;this.forwardHeld=0;this.root.visible=true;this.cameraInitialized=false;return true;
 }
 capture(){this.previous.copy(this.position);this.previousRotation.copy(this.rotation);}
 reset(){this.active=false;this.unlocked=false;this.spawned=false;this.overlook=null;this.root.visible=false;this.keys.clear();this.velocity.set(0,0,0);this.yaw=0;this.cameraYaw=0;this.pitch=.32;this.distance=5;this.forwardHeld=0;this.setFace('Happy');}
 look(dx,dy){this.cameraYaw-=dx*.005;this.pitch=T.MathUtils.clamp(this.pitch+dy*.004,-.55,1.25);}
 resolveContacts(){
  this.contacts=0;
  for(let pass=0;pass<3;pass++)for(const collider of nearColliders(this.view.world,this.position,this.radius)){
   const hit=sphereContact(collider,this.position,this.radius);if(!hit||hit.depth<=0)continue;
   this.position.addScaledVector(hit.normal,hit.depth+.001);const into=this.velocity.dot(hit.normal);if(into<0)this.velocity.addScaledVector(hit.normal,-into);this.contacts++;
  }
  const floor=terrainSample(this.view.world,this.position,false),up=upAt(this.position);
  if(Number.isFinite(floor.height)&&floor.signed<this.radius){this.position.addScaledVector(up,this.radius-floor.signed);const down=this.velocity.dot(up);if(down<0)this.velocity.addScaledVector(up,-down);this.contacts++;}
  const c=coords(this.position);if(c.h>130){this.position.copy(point(c.x,c.z,130));const v=this.velocity.dot(up);if(v>0)this.velocity.addScaledVector(up,-v);}
 }
 step(dt,inputEnabled=true){
  if(!this.spawned)return;this.capture();
  const frame=frameAt(this.position),k=inputEnabled&&this.active?this.keys:new Set();
  // +Z is forward: positive yaw turns left in the trailing camera.
  this.yaw+=(Number(k.has('KeyA'))-Number(k.has('KeyD')))*1.6*dt;
  const forward=frame.north.clone().applyAxisAngle(frame.up,this.yaw);
  this.forwardHeld=k.has('KeyW')&&!k.has('KeyS')?Math.min(4,this.forwardHeld+dt):0;
  const forwardSpeed=12+24*T.MathUtils.smoothstep(this.forwardHeld,0,4);
  const desired=forward.multiplyScalar(k.has('KeyW')&&!k.has('KeyS')?forwardSpeed:k.has('KeyS')&&!k.has('KeyW')?-12:0);
  desired.addScaledVector(frame.up,8*Number(k.has('Space'))*(k.has('ShiftLeft')||k.has('ShiftRight')?-1:1));
  this.velocity.lerp(desired,1-Math.exp(-dt*7));this.position.addScaledVector(this.velocity,dt);this.resolveContacts();if(this.contacts)this.forwardHeld=0;
  const target=frameAt(this.position).q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),this.yaw));
  this.rotation.slerp(target,1-Math.exp(-dt*8));
  this.setFace(this.contacts?'Surprised':this.velocity.length()>1?'Determined':'Happy');if(this.rotor)this.rotor.timeScale=1+this.velocity.length()/16;this.mixer?.update(dt);
 }
 present(dt,alpha=1){
  if(!this.spawned)return;
  const p=this.previous.clone().lerp(this.position,alpha),f=frameAt(p);this.root.position.copy(p);this.root.quaternion.copy(this.previousRotation).slerp(this.rotation,alpha);
  if(!this.active)return;
  const forward=f.north.clone().applyAxisAngle(f.up,this.yaw+this.cameraYaw),target=p.clone().addScaledVector(f.up,.15),wanted=p.clone().addScaledVector(forward,-this.distance*Math.cos(this.pitch)).addScaledVector(f.up,this.distance*Math.sin(this.pitch)+.5),ray=wanted.clone().sub(target);
  for(let i=1;i<=24;i++){const probe=target.clone().addScaledVector(ray,i/24),floor=terrainSample(this.view.world,probe,false);if(blocked(this.view.world,probe,.2)||(Number.isFinite(floor.height)&&floor.signed<.25)){wanted.copy(target).addScaledVector(ray,Math.max(.12,(i-1)/24));break;}}
  const camera=this.view.camera;
  if(!this.cameraInitialized){camera.position.copy(wanted);this.cameraInitialized=true;}else camera.position.lerp(wanted,1-Math.exp(-dt*12));
  camera.up.copy(f.up);camera.lookAt(target);
 }
}
