import {MISSILE_DEFAULTS} from '../upstream/stalheart/src/content/missile-defaults.js';
import {launchDart,advanceDart} from '../upstream/stalheart/src/missiles.js';
import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {CENTER,RADIUS} from './world.js';
import {QUIVER} from './battle-rules.js';
// Stalheart's sphere adapter expects a unit-radius planet centred at zero.
// Keep simulation independent of the render pool; the same pose drives both.
const pool={acquire:()=>({}),pose:()=>{}},unit=p=>p.clone().sub(CENTER).divideScalar(RADIUS).toArray();
export function launchQuiver(from,target,direction,type='quiver'){return launchDart(pool,{config:type==='heptapod'?MISSILE_DEFAULTS.heptapod:QUIVER,from:unit(from),target:unit(target),direction:direction.toArray(),sphere:true,metre:1/RADIUS});}
export function advanceQuiver(flight,dt,target){const done=advanceDart(pool,flight,dt,target?unit(target):flight.target);return {done,position:new Vector3().fromArray(flight.pose.position).multiplyScalar(RADIUS).add(CENTER),direction:new Vector3().fromArray(flight.pose.direction),ignition:flight.pose.ignition,phase:flight.pose.phase};}
