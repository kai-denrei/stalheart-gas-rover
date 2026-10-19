import {upAt} from './world.js';
// Include the luminous beam's width, not just the mathematical centre line.
export const SOL_ALTITUDE=1100;
export function segmentNear(a,b,p,r){const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y+(p.z-a.z)*z)/Math.max(1e-9,x*x+y*y+z*z)));return (a.x+x*t-p.x)**2+(a.y+y*t-p.y)**2+(a.z+z*t-p.z)**2<r*r;}

export function orbitalSafe(world,race,target,{source=null,isao=null,guns=[],traffic=null,aircraft=[],radius=8,margin=25}={}){
 const endpoint=radius+margin,path=radius+3;
 const friend=(p,r=0)=>target.distanceToSquared(p)<(endpoint+r)**2||(source&&segmentNear(source,target,p,path+r));
 if(race.racers.some(r=>!r.pendingRespawn&&friend(r.sim.pos,2)))return false;
 if(isao?.spawned&&friend(isao.position,2))return false;
 // The existing conservative sphere bounds include dome walls, corridors,
 // gantry, mast and finish platform; muzzle checks include the mounted gun.
 if(world.colliders.some(c=>friend(c.center,c.radius)))return false;
 if(guns.some(g=>friend(g.origin,4)))return false;
 if(traffic?.ship?.visible&&friend(traffic.ship.getWorldPosition(target.clone()),18))return false;
 if(aircraft.some(ship=>ship.visible&&friend(ship.getWorldPosition(target.clone()),15)))return false;
 // Avoid horizon-skimming strikes even if their endpoints are unobstructed.
 return !source||source.clone().sub(target).normalize().dot(upAt(target))>.82;
}

const friendlyCache=new WeakMap();
export function gunshipSafe(world,race,target,{source,isao=null,guns=[],traffic=null,aircraft=[],radius=4.5,minElevation=.12}={}){
 if(!source||source.clone().sub(target).normalize().dot(upAt(target))<minElevation)return false;
 let cached=friendlyCache.get(world);if(!cached||cached.count!==world.colliders.length){cached={count:world.colliders.length,solids:world.colliders.filter(c=>c.owner==='city'||c.owner==='race-flags'||/finish-platform|podium|gantry|pad-/.test(c.id))};friendlyCache.set(world,cached);}
 const friend=(p,r=0)=>target.distanceToSquared(p)<(radius+3+r)**2||segmentNear(source,target,p,1+r);
 if(cached.solids.some(c=>friend(c.center,c.radius)))return false;
 if(race.racers.some(r=>!r.pendingRespawn&&friend(r.sim.pos,2)))return false;
 if(isao?.spawned&&friend(isao.position,2))return false;
 if(guns.some(g=>friend(g.origin,3)))return false;
 if(traffic?.ship?.visible&&friend(traffic.ship.getWorldPosition(target.clone()),18))return false;
 return !aircraft.some(ship=>ship.visible&&friend(ship.getWorldPosition(target.clone()),15));
}
