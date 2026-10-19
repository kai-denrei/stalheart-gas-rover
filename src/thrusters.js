import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
// New asset gimbal pivots relative to the lab COM (root + 0.44 m).
// Exit sockets lie on the same force line, so pivot × force gives the same moment.
export const SOCKETS=[[-.48,.38,.68],[.48,.38,.68],[-.48,.38,-.78],[.48,.38,-.78],[-.80,.46,.64],[.80,.46,.64],[-.80,.46,.18],[.80,.46,.18]].map(p=>new Vector3(p[0],p[1]-.44,p[2]));
export const INERTIA=new Vector3(1.9,2.4,.85);
const rad=Math.PI/180,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const NOZZLES=SOCKETS.map((pivot,i)=>({pivot,cant:(i%2===0?-1:1)*(i<4?.08:.42),pitch:(i<4?28:35)*rad,roll:(i<4?[-25,25]:i%2===0?[-42,18]:[-18,42]).map(n=>n*rad)}));
// Asset hierarchy is gimbal XYZ(pitch,0,roll), then the nozzle's fixed Z cant.
export function gimbalAngles(force,i,range=1){const n=NOZZLES[i];if(force.lengthSq()<1e-12)return {pitch:0,roll:0};return {pitch:clamp(Math.atan2(force.z,Math.max(0,force.y)),-n.pitch*range,n.pitch*range),roll:clamp(Math.atan2(-force.x,Math.hypot(force.y,force.z))-n.cant,n.roll[0]*range,n.roll[1]*range)};}
function constrain(force,i,limit,range=1){const {pitch,roll}=gimbalAngles(force,i,range),r=roll+NOZZLES[i].cant,x=-Math.sin(r),y=Math.cos(pitch)*Math.cos(r),z=Math.sin(pitch)*Math.cos(r),m=clamp(force.x*x+force.y*y+force.z*z,0,limit);force.set(x*m,y*m,z*m);}
export function allocate(force,torque,limit,capabilities=null){
 const forces=SOCKETS.map(()=>new Vector3());const total=new Vector3(),moment=new Vector3(),cross=new Vector3();
 for(let pass=0;pass<32;pass++){
  total.set(0,0,0);moment.set(0,0,0);
  for(let i=0;i<8;i++){total.add(forces[i]);moment.add(cross.crossVectors(SOCKETS[i],forces[i]));}
  const df=force.clone().sub(total),dt=torque.clone().sub(moment);
  for(let i=0;i<8;i++){
   const f=forces[i];f.addScaledVector(df,.075).addScaledVector(cross.crossVectors(dt,SOCKETS[i]),.075);
   constrain(f,i,limit*(capabilities?.thrust[i]??1),capabilities?.gimbal[i]??1);
  }
 }
 total.set(0,0,0);moment.set(0,0,0);let effort=0;
 for(let i=0;i<8;i++){total.add(forces[i]);moment.add(cross.crossVectors(SOCKETS[i],forces[i]));effort+=forces[i].length();}
 return {forces,force:total,torque:moment,effort};
}
