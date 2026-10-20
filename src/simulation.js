import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {DEFAULTS,RADIUS,CENTER,point,frameAt,upAt,terrainSample,localOnSphere} from './world.js';
import {allocate,INERTIA} from './thrusters.js';
import {nearColliders,sphereContact,ROVER_SOLIDS} from './collisions.js';
import {RoverMotion} from './motion.js';
import {reactionBurn} from './reaction-thrusters.js';
import {ROVER_FAMILIES} from './rover-families.js';
import {RoverDamage} from './damage.js';
export const STEP=1/120;
export const OVERTURN_RECOVERY_DELAY=5;
const CONTROL_FIELDS=['drive','steer','boost','lift','pitch','yaw','roll','kick','brake','down','airBrake','stabilize'];
const V=()=>new Vector3();
export const WHEELS=[-.98,.98].flatMap(x=>[-1.44,-.42,1.44].map(z=>new Vector3(x,-.44,z)));
const HULL=[-1,1].flatMap(x=>[-1.9,1.9].flatMap(z=>[.2,.96].map(y=>new Vector3(x,y,z))));
export function commands(){return {drive:0,steer:0,boost:0,lift:0,pitch:0,yaw:0,roll:0,kick:0,brake:0,down:0,airBrake:0,stabilize:0,acro:false,controlActive:false};}
export class Simulation {
 constructor(world){this.setFamily('r47x');this.damage=new RoverDamage();this.damageEnabled=true;this.world=world;this.tune={...DEFAULTS};this.pos=V();this.vel=V();this.q=new Quaternion();this.omega=V();this.time=0;this.checkpoint=0;this.events=[];this.motion=new RoverMotion(this);this.reset();}
 setFamily(family){
  this.family=Object.hasOwn(ROVER_FAMILIES,family)?family:'r47x';this.vehicle=ROVER_FAMILIES[this.family];const v=this.vehicle;
  this.wheels=WHEELS.map(p=>new Vector3(Math.sign(p.x)*v.track,p.y,p.z===-.42?p.z:Math.sign(p.z)*v.axle));
  this.solids=ROVER_SOLIDS.filter(s=>s.wheel===undefined||v.wheels.includes(s.wheel)).map(s=>{const center=s.center.clone();if(s.wheel!==undefined){center.add(this.wheels[s.wheel].clone().sub(WHEELS[s.wheel]));center.y+=v.radius-.48;}else if(this.family==='xb12'&&s.zone==='sensor')center.set(0,1.4,-1.15);return {...s,center};});
  if(this.damage){this.damage.family=this.family;this.damage.refresh();this.contactCount=v.wheels.length;this.wheelContact=Array.from({length:6},(_,i)=>v.wheels.includes(i));this.motion.capture();}
 }
 event(type,detail={}){this.events.push({type,time:this.time,...detail});if(this.events.length>40)this.events.shift();}
 reset(reason='READY'){if(reason!=='READY'&&this.catastrophic&&this.wreckTime<this.wreckDelay)return;if(this.onReset&&reason!=='READY')return this.onReset(reason);this.damage.reset();this.wreckTime=0;this.wreckDelay=3;this.catastrophic=null;this.flightTurns=0;const pad=this.world.pads[this.checkpoint];this.pos.copy(pad.origin).addScaledVector(pad.frame.up,.46);this.q.copy(pad.frame.q);
  // A new opening can scatter solid debris over a pad. Pick a clear point inside
  // the checkpoint ring instead of resetting the rover inside a boulder.
  for(const radius of [0,2,3.5]){let found=false;for(let i=0;i<(radius?12:1);i++){const angle=i*Math.PI/6,p=pad.origin.clone().addScaledVector(pad.frame.up,.46).addScaledVector(pad.frame.east,Math.cos(angle)*radius).addScaledVector(pad.frame.north,Math.sin(angle)*radius),near=nearColliders(this.world,p,3.5);if(!this.solids.some(shape=>{const c=shape.center.clone().applyQuaternion(pad.frame.q).add(p);return near.some(solid=>sphereContact(solid,c,shape.radius));})){this.pos.copy(p);found=true;break;}}if(found)break;}
  this.vel.set(0,0,0);this.omega.set(0,0,0);this.spent=0;this.exhausted=null;this.grounded=true;this.supportTime=.1;this.contactCount=this.vehicle.wheels.length;this.bodyContacts=0;this.inverted=0;this.invertedSupport=0;this.rightingBoost=false;this.tilt=0;this.age=0;this.padTime=0;this.refilled=true;this.burn=allocate(V(),V(),this.tune.lift/8);this.airtime=0;this.peak=0;this.impact=0;this.steering=0;this.drift=0;this.oversteer=0;this.wheelContact=Array.from({length:6},(_,i)=>this.vehicle.wheels.includes(i));this.traction=1;this.trickAxes=[false,false,false];this.figureAngles=[0,0];this.figureTurns=[0,0];this.figureLabels=[null,null];this.rcs=reactionBurn(V(),V());this.parked=false;this.wheelSpin=Array(6).fill(0);this.lastCollision=null;this.collisionCooldown=0;this.kickFlight=false;this.kickAngle=0;this.kickTurns=0;this.kickInput=0;this.kickTotal??=0;this.figureTotal??=0;this.enemyPrevious=null;this.lastReason=reason;this.event('reset',{reason});this.motion.capture();}
 receiveImpact(hit){
  if(!this.damageEnabled)return null;
  const wasWreck=this.damage.wreck;
  const local=hit.local||(hit.point?new Vector3().fromArray(hit.point).sub(this.pos).applyQuaternion(this.q.clone().invert()).toArray():[0,0,0]);
  let result;
  if(!this.damage.wreck&&this.flightTurns>=2&&hit.speed>=16){
   this.catastrophic={time:this.time,speed:hit.speed,turns:this.flightTurns,position:this.pos.toArray()};this.wreckDelay=8;
   result=this.damage.destroy({...hit,local,source:hit.collider||hit.source||'environment',time:this.time});this.event('total-wreck',this.catastrophic);
  }else result=this.damage.impact({...hit,local,source:hit.collider||hit.source||'environment',time:this.time});
  if(!wasWreck&&this.damage.wreck){
   // Crushing the chassis absorbs momentum; it cannot spring back into flight.
   const up=upAt(this.pos);this.vel.multiplyScalar(.2);this.vel.addScaledVector(up,-Math.max(0,this.vel.dot(up)));this.omega.multiplyScalar(.1);this.drift=0;
  }
  if(result&&(result.changed.length||result.coreChanged))this.event('damage',{...result,wreck:this.damage.wreck});
  return result;
 }
 get reserve(){return Math.max(0,this.tune.capacity-this.spent);}
 inertiaInv(worldVector){return worldVector.clone().applyQuaternion(this.q.clone().invert()).divide(INERTIA).applyQuaternion(this.q);}
 impulse(j,r){this.vel.add(j);this.omega.add(this.inertiaInv(new Vector3().crossVectors(r,j)));}
 contact(p,n,penetration,grip=0,fixture=false){const r=p.clone().sub(this.pos).multiplyScalar(fixture?.5:1),velocity=this.vel.clone().add(new Vector3().crossVectors(this.omega,r));const vn=velocity.dot(n);const cross=new Vector3().crossVectors(r,n);const denom=1+n.dot(new Vector3().crossVectors(this.inertiaInv(cross),r));const bias=fixture?0:Math.min(.35,Math.max(0,penetration-.008)*.12/STEP);const impulse=Math.max(0,(-vn+bias)/denom);if(impulse>0){this.impulse(n.clone().multiplyScalar(Math.min(impulse,20)),r);
  if(grip){const tangent=this.vel.clone().add(new Vector3().crossVectors(this.omega,r)).projectOnPlane(n),speed=tangent.length();if(speed>1e-6){tangent.divideScalar(speed);const denomT=1+tangent.dot(new Vector3().crossVectors(this.inertiaInv(new Vector3().crossVectors(r,tangent)),r));this.impulse(tangent.multiplyScalar(-Math.min(speed/denomT,impulse*grip)),r);}}
 }return -vn;}
 step(input,dt=STEP){
  this.motion.capture();
  const health=this.damage.effects;if(this.damage.wreck){input=commands();const supported=this.contactCount+this.bodyContacts>0;this.vel.multiplyScalar(Math.exp(-dt*(supported?3:.8)));this.omega.multiplyScalar(Math.exp(-dt*(supported?1.5:2)));}
  const kick=Math.sign(input.kick||0);this.kickInput=kick;
  if(kick&&this.contactCount===0&&this.bodyContacts===0&&!this.kickFlight){this.kickFlight=true;this.kickAngle=0;this.kickTurns=0;this.event('kick-start');}
  const firingKick=this.kickFlight?kick:0,previousQ=this.q.clone();
  this.steering+=(-input.steer*.52*health.steer-this.steering)*Math.min(1,dt*10*Math.max(.2,health.steer));
  this.time+=dt;this.age+=dt;this.impact*=Math.exp(-dt*9);
  const up=upAt(this.pos),bodyUp=new Vector3(0,1,0).applyQuaternion(this.q),bodyForward=new Vector3(0,0,1).applyQuaternion(this.q),right=new Vector3(1,0,0).applyQuaternion(this.q);
  const inv=this.q.clone().invert(),wasGround=this.grounded,onSurface=this.contactCount+this.bodyContacts>0,righting=onSurface&&bodyUp.dot(up)<.35,groundMode=this.contactCount>0&&bodyUp.dot(up)>.35&&input.lift===0&&!(input.stabilize&&bodyUp.dot(up)<.94);
  this.rightingBoost=!!(input.lift&&(righting||this.rightingBoost&&bodyUp.dot(up)<.7));
  const force=new Vector3(0,this.rightingBoost?0:input.lift*this.tune.lift,0),angular=this.omega.clone().applyQuaternion(inv);
  const clearAir=this.contactCount===0&&this.bodyContacts===0;
  if(clearAir){if(firingKick)this.trickAxes[2]=true;if(input.acro&&input.pitch)this.trickAxes[0]=true;if(input.acro&&input.yaw){this.trickAxes[1]=true;this.figureLabels[1]='Transverse Flip';}}
  if(input.stabilize){this.trickAxes.fill(false);this.kickFlight=false;this.kickAngle=0;this.kickTurns=0;this.figureAngles=[0,0];this.figureTurns=[0,0];this.figureLabels=[null,null];}
  const targetAccel=input.stabilize?V():new Vector3(input.pitch*5.4,input.yaw*5.4,(firingKick||righting&&kick)?kick*5.4:input.roll*2.1);
  if(!groundMode&&(this.tune.assistance!=='manual'||input.stabilize)){
   const damping=angular.clone().multiplyScalar(input.stabilize?-5:-3.4);
   for(let i=0;i<3;i++)if(this.trickAxes[i]||!input.stabilize&&righting&&(i===2&&kick||i===0&&input.pitch))damping.setComponent(i,0);
   targetAccel.add(damping);
   if(this.tune.assistance==='stabilized'||input.stabilize){const level=new Vector3().crossVectors(bodyUp,up);if(input.stabilize){const correction=new Quaternion().setFromUnitVectors(bodyUp,up);level.set(correction.x,correction.y,correction.z);const length=level.length();if(length>1e-8)level.multiplyScalar(2*Math.atan2(length,correction.w)/length);}level.applyQuaternion(inv).multiplyScalar(5.5);
    if((input.stabilize||!input.pitch)&&!this.trickAxes[0])targetAccel.x+=level.x;if((input.stabilize||!input.roll&&!kick)&&!this.trickAxes[2])targetAccel.z+=level.z;
   }
  }
  targetAccel.clampLength(0,9);
  // Existing eight gimbals provide lift. Balanced RCS couples can rotate without
  // secretly lifting, and opposed jets can brake or push down in any attitude.
  let burn=allocate(force,V(),this.tune.lift/8,health);
  const correction=groundMode?V():new Vector3(-input.steer*7,0,input.drive*7);
  correction.addScaledVector(up.clone().applyQuaternion(inv),(this.rightingBoost?8:0)-(input.down||0)*8);
  // Opposed longitudinal jets act through the COM, on the road or in flight.
  // They share the lift/rotation fuel budget and remain body-forward when tilted.
  correction.z+=(input.boost||0)*8;
  if(!groundMode&&input.airBrake)correction.add(this.vel.clone().multiplyScalar(-2.8).clampLength(0,8).applyQuaternion(inv));
  this.rcs=reactionBurn(correction,groundMode?V():targetAccel.multiply(INERTIA),health);
  if(groundMode)burn=allocate(V(),V(),this.tune.lift/8);
  burn.force.add(this.rcs.force);burn.torque.add(this.rcs.torque);burn.effort+=this.rcs.effort;
  // A tiny emergency accumulator is isolated from damaged tank plumbing.
  // Leaks still drain the main tank; the last 5 units can rebuild for recovery.
  if(!this.damage.wreck){if(!this.tune.unlimited)this.spent=Math.min(this.spent,this.tune.capacity);this.spent=Math.max(0,this.spent-(this.tune.gasRegen||0)*dt);}
  this.spent+=Math.min(Math.max(0,this.reserve-5),health.leakRate*dt);
  const wanted=burn.effort/this.tune.lift*this.tune.gasRate*dt;
  const fraction=this.tune.unlimited||wanted===0?1:Math.min(1,this.reserve/wanted);
  for(const f of burn.forces)f.multiplyScalar(fraction);burn.force.multiplyScalar(fraction);burn.torque.multiplyScalar(fraction);burn.effort*=fraction;for(const f of this.rcs.forces)f.multiplyScalar(fraction);this.rcs.force.multiplyScalar(fraction);this.rcs.torque.multiplyScalar(fraction);this.rcs.effort*=fraction;
  this.spent+=wanted*fraction;
  if(this.spent>=this.tune.capacity-1e-8&&!this.exhausted){this.exhausted={time:this.time,position:this.pos.toArray()};this.event('empty');}
  this.burn=burn;
  const resting=this.parked&&groundMode&&!input.drive&&!input.steer&&!input.boost&&!input.down&&this.vel.lengthSq()===0&&this.omega.lengthSq()===0;
  this.vel.addScaledVector(up,resting?0:-this.tune.gravity*dt).addScaledVector(burn.force.clone().applyQuaternion(this.q),dt);
  this.omega.addScaledVector(burn.torque.clone().divide(INERTIA).applyQuaternion(this.q),dt);
  if(groundMode&&!this.damage.wreck){
   const f=bodyForward.clone().projectOnPlane(up).normalize(),r=right.clone().projectOnPlane(up).normalize(),speed=this.vel.dot(f);
   const traction=this.wheelContact.filter(Boolean).length/this.vehicle.wheels.length;this.traction=traction;
   const desired=input.drive>0?(this.tune.driveSpeed||18)*input.drive:input.drive<0?7*input.drive:0;
   let accel=input.drive?Math.max(-8,Math.min(9,(desired-speed)*2)):-speed*.45;
   // Above motor cruise speed, coast the drivetrain instead of fighting the jets.
   if(input.boost&&this.rcs.force.z*input.boost>0&&Math.sign(speed)===Math.sign(input.boost)&&Math.abs(speed)>Math.abs(desired))accel=-speed*.12;
   // Lift-off transfers grip forward: the rear steps out while the front tightens the turn.
   const liftOff=!input.drive&&!input.boost?Math.min(1,Math.max(0,(speed-4)/5))*Math.min(1,Math.abs(input.steer)*2):0;
   this.oversteer+=(liftOff-this.oversteer)*Math.min(1,dt*6);
   const handbrake=Math.max(0,Math.min(1,input.brake||0)),powerDrift=Math.max(0,input.drive)*Math.min(1,Math.abs(input.steer)*2.1)*Math.min(1,Math.max(0,(speed-4.5)/5.5))*.995,wantDrift=Math.max(powerDrift,this.oversteer*.99,handbrake*Math.min(1,Math.max(0,(Math.abs(speed)-2)/4)));
   this.drift+=(wantDrift-this.drift)*Math.min(1,dt*(wantDrift>this.drift?14:2.8));
   if(handbrake)accel=input.drive?accel-Math.sign(speed)*2:-Math.max(-12,Math.min(12,speed/dt));
   this.vel.addScaledVector(f,accel*health.drive*traction*dt).addScaledVector(r,-this.vel.dot(r)*Math.min(1,dt*7*health.grip*traction*(1-this.drift)));
   // Axle forces: front tyres retain bite while the accelerating or braked rear axle loses lateral grip.
   for(const [z,grip] of [[1.15,4.5],[-1.15,.08]]){const lever=f.clone().multiplyScalar(z),slip=this.vel.clone().add(new Vector3().crossVectors(this.omega,lever)).dot(r),force=Math.max(-grip,Math.min(grip,-slip*grip))*this.drift*health.grip*traction;this.impulse(r.clone().multiplyScalar(force*dt),lever);}
   const targetYaw=-input.steer*(.55+Math.min(Math.abs(speed)/10,1)*.65)*(1+this.drift*.18)*(1+this.oversteer*.45)*(speed<-.5?-1:1)*health.steer+health.pull*Math.max(-1.5,Math.min(1.5,speed/10));
   this.omega.addScaledVector(up,(targetYaw-this.omega.dot(up))*Math.min(1,dt*(9-5.5*this.drift+3*this.oversteer)*health.grip*traction));
   // Speed and lateral acceleration unload the inside tyres physically. There
   // is no random grip switch: contact returns when the chassis levels again.
   const roll=Math.atan2(bodyUp.dot(r.clone().negate()),bodyUp.dot(up)),lean=Math.max(0,Math.min(1,(Math.abs(speed)-11)/11))*Math.max(-1,Math.min(1,this.omega.dot(up)))*.22;
   this.omega.addScaledVector(f,((lean-roll)*40-this.omega.dot(f)*5)*dt);
  }
  if(!groundMode){this.drift*=Math.exp(-dt*8);this.oversteer*=Math.exp(-dt*8);}
  this.pos.addScaledVector(this.vel,dt);
  const angle=this.omega.length()*dt;if(angle>1e-10)this.q.premultiply(new Quaternion().setFromAxisAngle(this.omega.clone().normalize(),angle)).normalize();
  let wheelContacts=0,bodyContacts=0,maxImpact=0,collision=null;const supported=new Set(),solids=nearColliders(this.world,this.pos,3.5);
  const incomingVel=this.vel.clone(),incomingOmega=this.omega.clone(),terrainHits=new Map();let softContact=false;
  // Iterated chassis + wheel constraints; sample positions are recomputed after each impulse pass.
  for(let pass=0;pass<4;pass++){
   for(let i=0;i<WHEELS.length+HULL.length;i++){
    if(i<6&&!this.vehicle.wheels.includes(i))continue;
    const local=i<WHEELS.length?this.wheels[i]:HULL[i-WHEELS.length];const p=local.clone().applyQuaternion(this.q).add(this.pos),s=terrainSample(this.world,p);
    if(s.signed<.025&&!s.throat){const hit=this.contact(p,s.normal,Math.max(0,-s.signed));if(pass===0){maxImpact=Math.max(maxImpact,hit);if(i<6)supported.add(i);else bodyContacts++;
     const closing=-incomingVel.clone().add(new Vector3().crossVectors(incomingOmega,p.clone().sub(this.pos))).dot(s.normal);
     const zone=i<6?'wheel_'+['RL','ML','FL','RR','MR','FR'][i]:'chassis';
     if(closing>(terrainHits.get(zone)?.speed||4))terrainHits.set(zone,{speed:closing,zone,point:p.toArray(),collider:'terrain',landing:i<6});
    }}
   }
   // Rounded compound rover against solid convex environment geometry. Wheel
   // sidewalls, bumpers and sensor are covered even when old point probes miss.
   let deepest=0,correction=null;
   for(const shape of this.solids){const center=shape.center.clone().applyQuaternion(this.q).add(this.pos);
    for(const solid of solids){const hit=sphereContact(solid,center,shape.radius);if(!hit)continue;
     const closing=this.contact(hit.point,hit.normal,hit.depth,.08,true);
     if(solid.softImpact)softContact=true;
     maxImpact=Math.max(maxImpact,closing*(solid.softImpact?.35:1));
     if(pass===0){if(shape.wheel!==undefined&&hit.normal.dot(up)>.45)supported.add(shape.wheel);else bodyContacts++;}
     const impactSpeed=Math.max(0,-incomingVel.clone().add(new Vector3().crossVectors(incomingOmega,hit.point.clone().sub(this.pos))).dot(hit.normal))*(solid.softImpact?.35:1);
     if(impactSpeed>(collision?.speed||0))collision={speed:impactSpeed,point:hit.point.toArray(),normal:hit.normal.toArray(),collider:solid.id,zone:shape.zone};
     if(hit.depth>deepest){deepest=hit.depth;correction=hit.normal;}
    }
   }
   if(deepest>.008)this.pos.addScaledVector(correction,Math.min(.045,(deepest-.008)*.3));
  }
  if(softContact){
   // Resolve the full contact manifold before dissipating prop-induced spin.
   // Clamping each individual impulse makes later probes repeatedly brake the
   // same glancing contact and can pin the rover against tiny rubble.
   this.omega.clampLength(0,Math.max(2,incomingOmega.length()));
   const rise=this.vel.dot(up)-Math.max(1,incomingVel.dot(up));if(rise>0)this.vel.addScaledVector(up,-rise);
  }
  if(this.age>.3){for(const hit of terrainHits.values())this.receiveImpact(hit);if(collision)this.receiveImpact(collision);}
  wheelContacts=supported.size;this.wheelContact=Array.from({length:6},(_,i)=>supported.has(i));this.traction=wheelContacts/this.vehicle.wheels.length;
  if(wheelContacts||bodyContacts){this.flightTurns=0;this.trickAxes.fill(false);this.figureAngles=[0,0];this.figureTurns=[0,0];this.figureLabels=[null,null];}
  else {const delta=previousQ.clone().invert().multiply(this.q);if(delta.w<0){delta.x*=-1;delta.y*=-1;delta.z*=-1;delta.w*=-1;}
   const length=Math.hypot(delta.x,delta.y,delta.z),scale=length>1e-9?2*Math.atan2(length,delta.w)/length:2;
   for(let axis=0;axis<2;axis++)if(this.trickAxes[axis]){this.figureAngles[axis]+=(axis===0?delta.x:delta.y)*scale;const turns=Math.floor(Math.abs(this.figureAngles[axis])/(2*Math.PI));if(turns>this.figureTurns[axis]){this.flightTurns+=turns-this.figureTurns[axis];this.figureTotal+=turns-this.figureTurns[axis];this.figureTurns[axis]=turns;const label=axis===0?'Sagittal Flip':'Transverse Flip';this.event('figure',{axis,label,turns,total:this.kickTotal+this.figureTotal});}}
  }
  if(this.kickFlight){
   if(wheelContacts||bodyContacts){this.kickFlight=false;this.kickInput=0;}
   else{
    // Quaternion increments preserve winding through 360° without Euler wrapping.
    const delta=previousQ.clone().invert().multiply(this.q);if(delta.w<0){delta.x*=-1;delta.y*=-1;delta.z*=-1;delta.w*=-1;}
    this.kickAngle+=2*Math.atan2(delta.z,delta.w);const turns=Math.floor(Math.abs(this.kickAngle)/(Math.PI*2));
    if(turns>this.kickTurns){const gained=turns-this.kickTurns;this.kickTurns=turns;this.kickTotal+=gained;this.flightTurns+=gained;this.event('kick-flip',{label:'Coronal Flip',turns,total:this.kickTotal,direction:Math.sign(this.kickAngle)});}
   }
  }
  this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);
  if(collision&&collision.speed>1.5&&this.collisionCooldown===0){this.lastCollision={...collision,time:this.time,severity:collision.speed>=12?'heavy':collision.speed>=6?'moderate':'light'};this.event('collision',this.lastCollision);this.impact=Math.max(this.impact,Math.min(1,collision.speed/15));this.collisionCooldown=.3;}

  // Integrate wheel roll from actual hub velocity, in simulation time (pause-safe).
  for(const i of this.vehicle.wheels){const p=this.wheels[i],v=this.vel.clone().add(new Vector3().crossVectors(this.omega,p.clone().applyQuaternion(this.q))).applyQuaternion(this.q.clone().invert());const angle=p.z>1?this.steering:0;if(this.wheelContact[i]&&(this.family==='xb12'?this.damage.assetLevel<3:this.damage.states['WHEEL_'+['RL','ML','FL','RR','MR','FR'][i]]<3))this.wheelSpin[i]+=(v.z*Math.cos(angle)+v.x*Math.sin(angle))*dt/this.vehicle.radius*(p.z<0?(input.brake?1-this.drift:1+this.drift*.12*Math.max(0,input.drive)):1);}
  this.contactCount=wheelContacts;this.bodyContacts=bodyContacts;this.supportTime=wheelContacts>=2?.10:Math.max(0,this.supportTime-dt);this.grounded=this.supportTime>0&&this.vel.dot(up)<1.1;
  // Static tyre friction catches the last tiny roll instead of leaving a perpetual crawl on a tilted deck.
  this.parked=this.grounded&&wheelContacts>=4&&!input.drive&&!input.steer&&!input.boost&&!input.down&&!input.lift&&this.vel.clone().projectOnPlane(up).length()<.12&&Math.abs(this.vel.dot(up))<.3&&this.omega.length()<.12;
  if(this.parked){this.vel.set(0,0,0);this.omega.set(0,0,0);}
  this.tilt=Math.acos(Math.max(-1,Math.min(1,bodyUp.dot(up))))*180/Math.PI;
  if(!this.grounded){this.airtime+=dt;this.refilled=false;}else if(!wasGround&&this.airtime>.25){this.event('landing',{airtime:this.airtime,speed:maxImpact});this.impact=Math.min(1,maxImpact/8);this.airtime=0;}
  this.wreckTime=this.damage.wreck?this.wreckTime+dt:0;
  if(this.wreckTime>=this.wreckDelay){this.reset(this.catastrophic?'TOTAL DESTRUCTION · RECOVERY / REPAIRED':'WRECKED · RECOVERY / REPAIRED');return;}
  if(!this.damageEnabled&&maxImpact>20&&this.age>1){this.reset('HARD IMPACT · TRY AGAIN');return;}
  const terrain=terrainSample(this.world,this.pos,false);this.altitude=terrain.altitude-.46;
  if(terrain.altitude<-32||!this.world.race&&this.pos.distanceTo(CENTER)>RADIUS+220){this.reset(terrain.altitude<0?'LOST IN THE THROAT':'OUT OF TEST RANGE');return;}
  const pad=this.world.pads.findIndex(p=>{const c=localOnSphere(this.pos,p.frame);return Math.hypot(c.x,c.z)<5;});
  if(pad>=0&&this.grounded&&this.vel.length()<1&&this.tilt<18&&!input.lift){this.padTime+=dt;if(this.padTime>1.2&&!this.refilled){this.checkpoint=pad;this.spent=0;this.exhausted=null;this.refilled=true;this.event('refill',{pad:this.world.pads[pad].name});}}
  else {this.padTime=0;this.refilled=false;}
  // A roof/side can have just one support point and keep sliding or jittering.
  // Brief contact gaps must not prevent recovery, but long airborne tricks do.
  this.invertedSupport=this.contactCount+this.bodyContacts>0?.5:Math.max(0,(this.invertedSupport||0)-dt);
  const controlling=input.controlActive||CONTROL_FIELDS.some(key=>Math.abs(input[key]||0)>0);
  if(!this.damage.wreck&&this.invertedSupport>0&&this.tilt>100&&!controlling){
   this.inverted+=dt;
   if(this.inverted>=OVERTURN_RECOVERY_DELAY-1e-8){this.inverted=0;this.reset('OVERTURNED');}
  }else this.inverted=0;
 }
 snapshot(){return {family:this.family,wheelCount:this.vehicle.wheels.length,overturnedIdle:this.inverted,flightTurns:this.flightTurns,catastrophic:this.catastrophic,wreckDelay:this.wreckDelay,wreckTime:this.wreckTime,oversteer:this.oversteer,drift:this.drift,traction:this.traction,wheelContact:[...this.wheelContact],figures:{angles:[...this.figureAngles],turns:[...this.figureTurns]},damage:{enabled:this.damageEnabled,...this.damage.snapshot()},kick:{active:this.kickFlight,angle:this.kickAngle,turns:this.kickTurns,total:this.kickTotal},time:this.time,position:this.pos.toArray(),velocity:this.vel.toArray(),quaternion:this.q.toArray(),angularVelocity:this.omega.toArray(),grounded:this.grounded,contacts:this.contactCount,gas:this.reserve,spent:this.spent,exhausted:this.exhausted,altitude:this.altitude,tilt:this.tilt,checkpoint:this.checkpoint,collision:this.lastCollision,burn:this.burn.effort,events:this.events.slice(-8)};}
}
