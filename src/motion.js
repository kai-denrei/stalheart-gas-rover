import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
const scalars=['time','age','steering'];
const vectors=['pos','vel','omega'];
function pose(){return {pos:new Vector3(),vel:new Vector3(),omega:new Vector3(),q:new Quaternion(),wheelSpin:Array(6).fill(0),burn:{forces:Array.from({length:8},()=>new Vector3()),force:new Vector3(),torque:new Vector3(),effort:0}};}

// Render one fixed tick behind physics, interpolating at the accumulator's phase.
// This changes presentation only: contacts, input, gas and checkpoints stay at 120 Hz.
export class RoverMotion {
 constructor(sim){this.sim=sim;this.previous=pose();this.view=Object.assign(Object.create(sim),pose());}
 capture(){const s=this.sim,p=this.previous;for(const k of vectors)p[k].copy(s[k]);p.q.copy(s.q);for(const k of scalars)p[k]=s[k];for(let i=0;i<6;i++)p.wheelSpin[i]=s.wheelSpin[i];for(let i=0;i<8;i++)p.burn.forces[i].copy(s.burn.forces[i]);p.burn.force.copy(s.burn.force);p.burn.torque.copy(s.burn.torque);p.burn.effort=s.burn.effort;}
 sample(alpha=1){const s=this.sim;if(alpha>=1)return s;const a=Math.max(0,alpha),p=this.previous,v=this.view;
  for(const k of vectors)v[k].lerpVectors(p[k],s[k],a);v.q.slerpQuaternions(p.q,s.q,a);
  for(const k of scalars)v[k]=p[k]+(s[k]-p[k])*a;
  for(let i=0;i<6;i++)v.wheelSpin[i]=p.wheelSpin[i]+(s.wheelSpin[i]-p.wheelSpin[i])*a;
  for(let i=0;i<8;i++)v.burn.forces[i].lerpVectors(p.burn.forces[i],s.burn.forces[i],a);
  v.burn.force.lerpVectors(p.burn.force,s.burn.force,a);v.burn.torque.lerpVectors(p.burn.torque,s.burn.torque,a);v.burn.effort=p.burn.effort+(s.burn.effort-p.burn.effort)*a;
  return v;
 }
}
