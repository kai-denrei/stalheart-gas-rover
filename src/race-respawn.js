import {Quaternion,Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,coords,frameAt,terrainSample} from './world.js';
import {onCourse} from './race-world.js';
import {nearColliders,sphereContact,ROVER_SOLIDS} from './collisions.js';

// Includes bumpers and a buffer for a rover driving through during the penalty.
export function respawnClear(race,r,pos,q){
 const {x,z}=coords(pos),near=nearColliders(race.world,pos,4);
 if(!onCourse(race.world,x,z))return false;
 for(const x of [-1.4,1.4])for(const z of [-2.6,2.6]){
  const p=new Vector3(x,-.44,z).multiplyScalar(r.sim.vehicle?.scale||1).applyQuaternion(q).add(pos),c=coords(p),ground=terrainSample(race.world,p,false);
  if(!onCourse(race.world,c.x,c.z)||ground.throat||ground.signed<-.12||ground.signed>.3)return false;
 }
 if((r.sim.solids||ROVER_SOLIDS).some(s=>near.some(c=>sphereContact(c,s.center.clone().applyQuaternion(q).add(pos),s.radius))))return false;
 return race.racers.every(other=>other===r||other.pendingRespawn||
  (pos.distanceToSquared(other.sim.pos)>6.5**2&&pos.distanceToSquared(other.sim.pos.clone().addScaledVector(other.sim.vel,.25))>6.5**2));
}

export function findRespawn(race,r){
 const route=race.world.race.route;
 // Stay at or behind the last validated gate. Never teleport past the next gate.
 for(let gate=r.gate;gate>=0;gate--){
  const a=route[gate],b=route[gate+1]||[race.world.race.deck.x,race.world.race.deck.z],heading=Math.atan2(b[0]-a[0],b[1]-a[1]);
  for(const back of [0,3,6,9,12,18,24])for(const side of [...new Set([r.lane*.4,0,-3.5,3.5,-6,6])]){
   const x=a[0]+Math.cos(heading)*side-Math.sin(heading)*back,z=a[1]-Math.sin(heading)*side-Math.cos(heading)*back;
   const pos=point(x,z,r.sim.spawnHeight??.46),q=frameAt(pos).q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),heading));
   if(respawnClear(race,r,pos,q))return {x,z,heading};
  }
 }
 return null;
}
