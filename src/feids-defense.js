import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,coords,frameAt,terrainSample} from './world.js';
import {sphereContact} from './collisions.js';
import {segmentDistance} from './race-world.js';
import {LANDINGS,TOUCHDOWNS,SCALE} from '../upstream/a6/feids26/timeline.js';
export {TOUCHDOWNS,SCALE};
export const MECH_RADIUS=2.6,MECH_IMPACT_AUDIO=4,SETTLE_SECONDS=2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export function clearMechSite(world,x,z,radius=MECH_RADIUS){
 const p=point(x,z,1.5),ground=terrainSample(world,point(x,z),false);
 if(ground.throat||Math.abs(ground.height||0)>.18)return false;
 if(world.holes.some(h=>Math.hypot(x-h.x,z-h.z)<(h.r||h.radius||0)*1.65+radius+2))return false;
 const route=world.race.route.concat([[world.race.deck.x,world.race.deck.z]]);
 if(route.slice(1).some((b,i)=>segmentDistance(x,z,route[i],b)<13+radius))return false;
 return !world.colliders.some(c=>p.distanceToSquared(c.center)<(c.radius+radius)**2&&sphereContact(c,p,radius));
}
// Reserve the entire descent corridor, including bridge decks above clear ground.
export function clearDropColumn(world,x,z,radius=MECH_RADIUS){
 const origin=point(x,z),up=frameAt(origin).up,a=origin.clone().addScaledVector(up,.1),delta=up.clone().multiplyScalar(520);
 return !world.colliders.some(c=>{if(c.center.clone().sub(a).projectOnPlane(up).length()>c.radius+radius)return false;let lo=0,hi=1;for(const plane of c.planes){const d=plane.constant+radius-plane.normal.dot(a),v=plane.normal.dot(delta);if(Math.abs(v)<1e-9){if(d<0)return false;}else if(v<0)lo=Math.max(lo,d/v);else hi=Math.min(hi,d/v);if(lo>hi)return false;}return true;});
}
export function deploymentSite(world){
 const d=world.race.deck;
 for(const radius of [62,78,95,115,140])for(const bearing of [1.05,-1.05,1.55,-1.55,2,-2,.5,-.5,0,Math.PI]){
  const x=d.x+Math.sin(bearing)*radius,z=d.z-Math.cos(bearing)*radius,origin=point(x,z),frame=frameAt(origin);
  const landings=LANDINGS.map(([dx,dz])=>{const p=coords(new Vector3(dx,0,dz).applyQuaternion(frame.q).add(origin));return {x:p.x,z:p.z};});
  if(landings.every(p=>clearMechSite(world,p.x,p.z)&&clearDropColumn(world,p.x,p.z)))return {x,z,origin,frame,landings};
 }
 // Authored stages can fill every apron. Keep deployment disabled instead of
 // dropping into a building, track or sinkhole.
 return null;
}
export function deploymentCues(){
 const cues=[];
 for(let i=0;i<2;i++){const split=6.2+i*.45;cues.push({id:'capsule-'+i,name:'feids_reentry',at:split-5.544,gain:.7,capsule:i},{id:'split-'+i,name:'blast_fire',at:split,gain:.35,capsule:i});}
 TOUCHDOWNS.forEach((at,i)=>cues.push({id:'mech-'+i,name:'mech_reentry',at:at-MECH_IMPACT_AUDIO,gain:.65,mech:i},{id:'rubble-'+i,name:'mech_rubble',at:at+.06,gain:.65,mech:i}));
 return cues.sort((a,b)=>a.at-b.at);
}
export class FeidsDefense {
 constructor(world){this.world=world;this.site=deploymentSite(world);this.reset();}
 reset(){this.startedAt=null;this.time=-1;this.generation=this.world.race.hazardGeneration;this.events=[];this.mechs=(this.site?.landings||[]).map((p,i)=>({id:i,...p,home:{...p},heading:i%2?.22:-.22,walk:0,speed:0,active:false,target:null,nextScan:0,position:point(p.x,p.z),distance:0,landed:false}));}
 step(dt,race,defense){
  if(this.generation!==this.world.race.hazardGeneration)this.reset();if(!this.site)return;
  if(this.startedAt===null){if(!['racing','finished'].includes(race.phase)||!race.racers.some(r=>r.gate>=Math.ceil(this.world.race.gates.length*.65)))return;this.startedAt=defense.time;}
  const previous=this.time;this.time=Math.max(0,defense.time-this.startedAt);
  for(const m of this.mechs){
   if(!m.landed&&this.time>=TOUCHDOWNS[m.id]){m.landed=true;this.events.push({type:'impact',mech:m.id,at:TOUCHDOWNS[m.id]});}
   m.active=this.time>=TOUCHDOWNS[m.id]+SETTLE_SECONDS;if(!m.active)continue;
   if(defense.time>=m.nextScan){m.nextScan=defense.time+.35;let best=145**2,target=null;for(const e of defense.enemies){if(e.dead)continue;const d=m.position.distanceToSquared(e.position);if(d<best){best=d;target=e;}}m.target=target?.id??null;}
   const target=defense.enemies.find(e=>e.id===m.target&&!e.dead);m.speed=0;
   if(target){const frame=frameAt(m.position),delta=target.position.clone().sub(m.position),wanted=Math.atan2(delta.dot(frame.east),delta.dot(frame.north)),turn=angle(wanted-m.heading);m.heading+=clamp(turn,-1.25*dt,1.25*dt);
    const distance=Math.hypot(target.x-m.x,target.z-m.z);
    if(distance>19&&Math.abs(turn)<.65){
     for(const offset of [0,.7,-.7,1.25,-1.25]){const heading=m.heading+offset,travel=1.65*dt,next=coords(m.position.clone().addScaledVector(frame.east,Math.sin(heading)*travel).addScaledVector(frame.north,Math.cos(heading)*travel)),x=next.x,z=next.z,dx=x-m.x,dz=z-m.z;
      if(Math.hypot(x-m.home.x,z-m.home.z)>95||!clearMechSite(this.world,x,z))continue;
      if(this.mechs.some(other=>other!==m&&Math.hypot(x-other.x,z-other.z)<MECH_RADIUS*2+.2)||race.racers.some(r=>!r.pendingRespawn&&point(x,z,1).distanceTo(r.sim.pos)<5.8))continue;
      m.x=x;m.z=z;m.speed=1.65;m.distance+=Math.hypot(dx,dz);m.walk+=Math.hypot(dx,dz)/(.8*SCALE/2.4);break;
     }
    }
   }m.position.copy(point(m.x,m.z));
  }
  for(let i=0;i<2;i++){const at=6.2+i*.45;if(previous<at&&this.time>=at)this.events.push({type:'split',capsule:i,at});}
 }
 snapshot(){return {time:this.time,startedAt:this.startedAt,site:this.site?{x:this.site.x,z:this.site.z}:null,events:[...this.events],mechs:this.mechs.map(m=>({id:m.id,x:m.x,z:m.z,heading:m.heading,active:m.active,landed:m.landed,target:m.target,distance:m.distance}))};}
}
