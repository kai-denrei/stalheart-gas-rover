import {WHEELS} from './simulation.js';
import {coords} from './world.js';
import {onCourse} from './race-world.js';

export function wheelsOffCourse(world,sim){
 if(!sim.contactCount)return false;
 let touching=0;
 for(let i=0;i<WHEELS.length;i++)if(sim.wheelContact[i]){
  touching++;const p=coords(WHEELS[i].clone().applyQuaternion(sim.q).add(sim.pos));
  if(onCourse(world,p.x,p.z,world.race.rules.boundsMargin))return false;
 }
 return touching>0;
}
