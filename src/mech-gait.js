import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {LEGS,UPPER,LOWER,poseLeg,solveHydraulics} from '../upstream/a6/assets/ridgeback-mech/runtime.js';
import {point,coords,frameAt,upAt,terrainSample} from './world.js';
const Y=new Vector3(0,1,0),SCALE=.75,BODY_Y=1.9,ANKLE=.18*SCALE;
const smooth=t=>t*t*(3-2*t);
// Feet live in planet/world space, never in the translating chassis frame.
export class MechGait {
 constructor(world){this.world=world;this.reset();}
 reset(){this.position=null;this.rotation=null;this.time=null;this.feet=[];this.nextTripod=0;this.steps=0;this.limited=false;}
 ground(p){const c=coords(p),s=terrainSample(this.world,p,false);return point(c.x,c.z,Number.isFinite(s.height)?s.height:0);}
 home(leg,p,q){return this.ground(new Vector3(leg.fx*SCALE,0,leg.fz*SCALE).applyQuaternion(q).add(p));}
 footRotation(p,q){const f=frameAt(p),forward=new Vector3(0,0,1).applyQuaternion(q);return f.q.multiply(new Quaternion().setFromAxisAngle(Y,Math.atan2(forward.dot(f.east),forward.dot(f.north))));}
 update(wantedPosition,wantedRotation,time){
  if(!this.position){this.position=wantedPosition.clone();this.rotation=wantedRotation.clone();this.time=time;this.feet=LEGS.map(leg=>{const p=this.home(leg,this.position,this.rotation);return {leg,position:p,rotation:this.footRotation(p,this.rotation),anchor:p.clone(),planted:true,swing:null};});return this;}
  const dt=Math.max(0,time-this.time);this.time=time;if(!dt)return this;
  const delta=wantedPosition.clone().sub(this.position),angle=this.rotation.angleTo(wantedRotation),moving=delta.lengthSq()>1e-10||angle>1e-5;
  // Finish a lifted foot at its reserved landing point; never drag that point
  // along with the body. Stopping finishes the step instead of snapping to park.
  for(const f of this.feet)if(f.swing){const s=f.swing,u=Math.min(1,(time-s.start)/s.duration);f.position.copy(s.from).lerp(s.to,smooth(u)).addScaledVector(upAt(s.to),.27*Math.sin(Math.PI*u)**2);f.rotation.copy(s.fromQ).slerp(s.toQ,smooth(u));if(u===1){f.position.copy(s.to);f.anchor.copy(s.to);f.rotation.copy(s.toQ);f.planted=true;f.swing=null;}}
  if(moving&&!this.feet.some(f=>f.swing)){
   const error=this.feet.map(f=>f.position.distanceTo(this.home(f.leg,wantedPosition,wantedRotation))),max=Math.max(...error);
   if(max>.12){
    const tripod=this.nextTripod;this.nextTripod=1-tripod;
    const lead=.11,predict=delta.clone().multiplyScalar(lead/Math.max(dt,.001)).clampLength(0,.25),futureP=wantedPosition.clone().add(predict),futureQ=this.rotation.clone().slerp(wantedRotation,1+Math.min(5,lead/Math.max(dt,.001)));
    for(const f of this.feet)if((f.leg.phase===0?0:1)===tripod){let to=this.home(f.leg,futureP,futureQ);
     // Side-steps have less reach than fore/aft steps on this wide six-leg rig.
     // Reserve a landing the leg can reach before the body pulls forward.
     const base=this.home(f.leg,this.position,this.rotation),inv=this.rotation.clone().invert();
     const fits=p=>p.clone().addScaledVector(upAt(p),ANKLE).sub(this.position).applyQuaternion(inv).divideScalar(SCALE).sub(new Vector3(f.leg.side*.98,BODY_Y,f.leg.z)).length()<UPPER+LOWER-.07;
     if(!fits(to)){let lo=0,hi=1;for(let k=0;k<12;k++){const u=(lo+hi)/2,p=this.ground(base.clone().lerp(to,u));if(fits(p))lo=u;else hi=u;}to=this.ground(base.clone().lerp(to,lo));}
     f.swing={from:f.position.clone(),to,fromQ:f.rotation.clone(),toQ:this.footRotation(to,futureQ),start:time,duration:.22};f.planted=false;}this.steps++;
   }
  }
  // The chassis pulls against its supporting legs. If it would overextend one,
  // shorten the chassis move instead of sliding the foot or stretching the IK.
  const reachable=(p,q)=>{const inv=q.clone().invert();return this.feet.every(f=>{
   // A reversal must also preserve reach to the landing already in progress.
   const targets=f.swing?[[f.position,f.rotation],[f.swing.to,f.swing.toQ]]:[[f.position,f.rotation]];
   return targets.every(([foot,rotation])=>{const ankle=foot.clone().addScaledVector(Y.clone().applyQuaternion(rotation),ANKLE).sub(p).applyQuaternion(inv).divideScalar(SCALE),d=ankle.sub(new Vector3(f.leg.side*.98,BODY_Y,f.leg.z)).length();return d<UPPER+LOWER-.012&&d>Math.abs(UPPER-LOWER)+.02;});
  });};
  this.limited=!reachable(wantedPosition,wantedRotation);
  if(this.limited){let lo=0,hi=1;for(let i=0;i<12;i++){const t=(lo+hi)/2,p=this.position.clone().lerp(wantedPosition,t),q=this.rotation.clone().slerp(wantedRotation,t);if(reachable(p,q))lo=t;else hi=t;}this.position.lerp(wantedPosition,lo);this.rotation.slerp(wantedRotation,lo);}
  else {this.position.copy(wantedPosition);this.rotation.copy(wantedRotation);}
  return this;
 }
 apply(model,barrelAngle=0){
  const drop=model.getObjectByName('DROP_ROOT'),body=model.getObjectByName('MECH_BODY');drop.position.set(0,0,0);drop.rotation.set(0,0,0);body.position.y=BODY_Y;model.updateWorldMatrix(true,true);
  for(const f of this.feet){const ankleWorld=f.position.clone().addScaledVector(Y.clone().applyQuaternion(f.rotation),ANKLE),local=model.worldToLocal(ankleWorld);poseLeg(model,f.leg,local.toArray());const ankle=model.getObjectByName('ANKLE_'+f.leg.id);ankle.parent.updateWorldMatrix(true,false);ankle.quaternion.copy(ankle.parent.getWorldQuaternion(new Quaternion()).invert().multiply(f.rotation));}
  solveHydraulics(model);
  for(const name of ['MINIGUN','LASER']){model.getObjectByName(name+'_YAW').rotation.y=0;model.getObjectByName(name+'_PITCH').rotation.x=0;}
  model.getObjectByName('MINIGUN_SPIN').rotation.z=barrelAngle;model.getObjectByName('MISSILE_ELEVATION').rotation.x=-.58;model.getObjectByName('SENSOR_YAW').rotation.y=0;model.updateWorldMatrix(true,true);
 }
 snapshot(){return {steps:this.steps,limited:this.limited,contacts:this.feet.filter(f=>f.planted).length,feet:this.feet.map(f=>({id:f.leg.id,planted:f.planted,position:f.position.toArray(),anchor:f.anchor.toArray()}))};}
}
