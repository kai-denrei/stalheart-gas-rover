import {Vector3,Quaternion,MathUtils} from '../upstream/stalheart/vendor/three.module.js';
import {frameAt,upAt} from './world.js';

// Track heading through rotations instead of projecting the nose through its
// vertical singularity. Pitch/roll leave the chase heading alone; yaw turns it.
export class RoverCameraHeading {
 constructor(){this.forward=new Vector3();this.previousQ=new Quaternion();this.previousUp=new Vector3();this.age=null;}
 update(s,dt,reset=false){
  const up=upAt(s.pos),bodyForward=new Vector3(0,0,1).applyQuaternion(s.q).projectOnPlane(up);
  if(reset||this.age===null||s.age<this.age){
   if(bodyForward.lengthSq()>.04)this.forward.copy(bodyForward).normalize();
   else this.forward.crossVectors(new Vector3(1,0,0).applyQuaternion(s.q),up).normalize();
   if(this.forward.lengthSq()<.1)this.forward.copy(frameAt(s.pos).north);
  }else{
   this.forward.applyQuaternion(new Quaternion().setFromUnitVectors(this.previousUp,up)).projectOnPlane(up).normalize();
   const delta=this.previousQ.clone().invert().multiply(s.q);
   if(delta.w<0){delta.x*=-1;delta.y*=-1;delta.z*=-1;delta.w*=-1;}
   this.forward.applyAxisAngle(up,2*Math.atan2(delta.y,delta.w));
   // Landing sideways can change the physical heading; ease toward it once the
   // wheels are supporting an upright chassis instead of snapping on contact.
   if(s.contactCount>0&&new Vector3(0,1,0).applyQuaternion(s.q).dot(up)>.4&&bodyForward.lengthSq()>.04){
    bodyForward.normalize();const angle=Math.atan2(up.dot(new Vector3().crossVectors(this.forward,bodyForward)),MathUtils.clamp(this.forward.dot(bodyForward),-1,1));
    this.forward.applyAxisAngle(up,angle*(1-Math.exp(-dt*5)));
   }
  }
  this.previousQ.copy(s.q);this.previousUp.copy(up);this.age=s.age;
  return this.forward;
 }
}
