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
export function quiverCadence(mech,pod,shot=0){
 // Stable variation per launcher and salvo; replay/reset stays reproducible.
 const seed=((mech+1)*73856093^(pod+1)*19349663^(shot+1)*83492791)>>>0;
 return {delay:.18+mech*.19+pod*.43,reload:3.1+mech*.16+pod*.29+(seed%997)/997*.65};
}
export class FeidsDefense {
 constructor(world){this.world=world;this.site=deploymentSite(world);this.reset();}
 reset(){this.startedAt=null;this.time=-1;this.generation=this.world.race.hazardGeneration;this.events=[];this.mechs=(this.site?.landings||[]).map((p,i)=>({id:i,...p,home:{...p},heading:i%2?.22:-.22,walk:0,speed:0,active:false,target:null,nextScan:0,position:point(p.x,p.z),distance:0,landed:false,sector:[-2.5,-.85,.8,2.35][i],patrol:null,patrolIndex:0,blocked:0,mode:'deploying'}));}
 step(dt,race,defense,{hunt=true}={}){
  if(this.generation!==this.world.race.hazardGeneration)this.reset();if(!this.site)return;
  if(this.startedAt===null){if(!['racing','finished'].includes(race.phase))return;this.startedAt=defense.time;}
  const previous=this.time;this.time=Math.max(0,defense.time-this.startedAt);
  for(const m of this.mechs){
   if(!m.landed&&this.time>=TOUCHDOWNS[m.id]){m.landed=true;this.events.push({type:'impact',mech:m.id,at:TOUCHDOWNS[m.id]});}
   m.active=this.time>=TOUCHDOWNS[m.id]+SETTLE_SECONDS;m.speed=0;if(!m.active||!hunt)continue;
   if(defense.time>=m.nextScan){m.nextScan=defense.time+.55+m.id*.035;let best=Infinity,target=null;
    for(const e of defense.enemies){if(e.dead||Math.hypot(e.x-m.home.x,e.z-m.home.z)>155)continue;const d=m.position.distanceToSquared(e.position);if(d>180**2)continue;
     const assigned=this.mechs.filter(other=>other!==m&&other.target===e.id).length,bearing=Math.atan2(e.x-m.home.x,e.z-m.home.z),score=d+assigned*12000+(1-Math.cos(bearing-m.sector))*1800-(e.id===m.target?350:0);
     if(score<best){best=score;target=e;}
    }m.target=target?.id??null;
   }
   const target=defense.enemies.find(e=>e.id===m.target&&!e.dead);let goal;
   if(target){m.mode='hunt';m.patrol=null;const dx=m.x-target.x,dz=m.z-target.z,d=Math.hypot(dx,dz);if(d<21){const a=Math.atan2(dx,dz)+(m.id%2?-.55:.55);goal={x:target.x+Math.sin(a)*20,z:target.z+Math.cos(a)*20};}else goal=target;}
   else {m.mode='patrol';if(!m.patrol||Math.hypot(m.x-m.patrol.x,m.z-m.patrol.z)<2||m.blocked>2.5){m.patrol=null;m.blocked=0;
     for(let k=0;k<24;k++){const a=m.sector+Math.sin(m.patrolIndex*.83)*.65+k*2.399,r=16+(m.patrolIndex%3)*9,x=m.home.x+Math.sin(a)*r,z=m.home.z+Math.cos(a)*r;
      if(clearMechSite(this.world,x,z)&&this.mechs.every(o=>o===m||!o.patrol||Math.hypot(x-o.patrol.x,z-o.patrol.z)>12)){m.patrol={x,z};break;}}
     m.patrolIndex++;
    }goal=m.patrol;
   }
   if(!goal)continue;const frame=frameAt(m.position),look=(target?.position||point(goal.x,goal.z)).clone().sub(m.position);if(target?.velocity)look.addScaledVector(target.velocity,look.length()/150);const wanted=Math.atan2(look.dot(frame.east),look.dot(frame.north)),turn=angle(wanted-m.heading);m.heading+=clamp(turn,-1.5*dt,1.5*dt);
   const towards=point(goal.x,goal.z).sub(m.position),travelHeading=Math.atan2(towards.dot(frame.east),towards.dot(frame.north));
   if(Math.abs(turn)<.9){
    for(const offset of [0,.55,-.55,1.1,-1.1,1.65,-1.65,2.2,-2.2]){const heading=travelHeading+offset,travel=(1.8+m.id*.08)*dt,next=coords(m.position.clone().addScaledVector(frame.east,Math.sin(heading)*travel).addScaledVector(frame.north,Math.cos(heading)*travel)),x=next.x,z=next.z,dx=x-m.x,dz=z-m.z;
     if(Math.hypot(x-m.home.x,z-m.home.z)>115||!clearMechSite(this.world,x,z))continue;
     if(this.mechs.some(other=>other!==m&&Math.hypot(x-other.x,z-other.z)<MECH_RADIUS*2+.2)||race.racers.some(r=>!r.pendingRespawn&&point(x,z,1).distanceTo(r.sim.pos)<5.8))continue;
     m.x=x;m.z=z;m.speed=travel/Math.max(dt,.001);m.distance+=Math.hypot(dx,dz);m.walk+=travel/(.8*SCALE/2.4);break;
    }
   }m.blocked=m.speed?0:m.blocked+dt;m.position.copy(point(m.x,m.z));
  }
  for(let i=0;i<2;i++){const at=6.2+i*.45;if(previous<at&&this.time>=at)this.events.push({type:'split',capsule:i,at});}
 }
 snapshot(){return {time:this.time,startedAt:this.startedAt,site:this.site?{x:this.site.x,z:this.site.z}:null,events:[...this.events],mechs:this.mechs.map(m=>({id:m.id,x:m.x,z:m.z,heading:m.heading,mode:m.mode,patrol:m.patrol,active:m.active,landed:m.landed,target:m.target,distance:m.distance}))};}
}
