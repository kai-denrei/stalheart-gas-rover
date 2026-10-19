import {point,frameAt} from './world.js';
// Ground perimeter leaves the approach corridor, raised deck and gantry clear.
export const PODIUM_SENTRY_TYPES=['rotor','plasma','rotor','quiver','rotor','relay','rotor','mortar','rotor','lancer','rotor','needle','rotor','needle','rotor','plasma'];
export function podiumDefenseSites(world){const d=world.race.deck;return PODIUM_SENTRY_TYPES.map((type,i)=>{const side=i<8?-1:1,x=d.x+side*40,z=d.z-31+(i%8)*9,position=point(x,z);return {x,z,type,podium:true,side,root:{position,quaternion:frameAt(position).q}};});}
