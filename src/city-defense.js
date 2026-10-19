import {MISSILE_DEFAULTS} from '../upstream/stalheart/src/content/missile-defaults.js';
import {TOWER_BY_KEY} from '../upstream/stalheart/src/towers.js';
import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,terrainSample,upAt} from './world.js';
import {sphereContact} from './collisions.js';
import {ROUTE,segmentDistance} from './race-world.js';
import {BATTLE,QUIVER,crowdBudget,crowdFrame} from './battle-rules.js';
import {CombatSpatial} from './combat-spatial.js';
import {launchQuiver,advanceQuiver} from './quiver-flight.js';
import {makeLock} from '../upstream/stalheart/src/domain/lockon.js';
import {stepMissileLock,missileCanFire} from '../upstream/stalheart/src/domain/missile-targeting.js';
import {leadPoint} from '../upstream/stalheart/src/sentry.js';
import {FIRING} from '../upstream/stalheart/src/content/firing-defaults.js';
import {SENTRY_HEAT} from '../upstream/stalheart/src/content/sentry-heat.js';
import {coolHeat} from '../upstream/stalheart/src/core/heat.js';
export const DEFENSE=BATTLE;
export function segmentBlocked(world,a,b,index=null){
 const delta=b.clone().sub(a),den=delta.lengthSq();
 for(const c of index?index.segment(a,b):world.colliders){let lo=0,hi=1,miss=false;
  const t=Math.max(0,Math.min(1,c.center.clone().sub(a).dot(delta)/Math.max(.001,den)));if(a.clone().addScaledVector(delta,t).distanceToSquared(c.center)>c.radius*c.radius)continue;
  for(const p of c.planes){const d=p.constant-p.normal.dot(a),v=p.normal.dot(delta);if(Math.abs(v)<1e-9){if(d<0){miss=true;break;}}else if(v<0)lo=Math.max(lo,d/v);else hi=Math.min(hi,d/v);if(lo>hi){miss=true;break;}}
  if(!miss&&lo<.995&&hi>.005)return true;
 }
 for(let i=1;i<12;i++)if(terrainSample(world,a.clone().addScaledVector(delta,i/12),false).signed<.1)return true;
 return false;
}
const segmentNear=(a,b,p,r)=>{const d=b.clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/Math.max(.001,d.lengthSq())));return a.clone().addScaledVector(d,t).distanceToSquared(p)<r*r;};
export class CityDefense {
 constructor(world,guns){this.world=world;this.guns=guns;this.budget=crowdBudget();this.spatial=new CombatSpatial(world);this.reset();}
 setLoad(limit=360,adaptive=true){this.budget=crowdBudget(Math.max(40,Math.min(BATTLE.capacity,limit)),adaptive);}
 frame(ms){crowdFrame(this.budget,ms,this.enemies.filter(e=>!e.dead).length);}
 reset(){this.time=0;this.accumulator=0;this.nextWave=2;this.wave=0;this.serial=0;this.enemies=[];this.shots=[];this.projectiles=[];this.pending=[];this.stats={spawned:0,killed:0,escaped:0,nearTrack:0,fired:0,blocked:0,runOver:0,peak:0,missilePhases:{},impacts:0};for(const g of this.guns){g.next=g.id*.05;g.target=null;g.beam=null;g.lock=makeLock();g.heat=0;g.overheated=false;g.engaged=false;g.engagedAt=null;}this.generation=this.world.race.hazardGeneration;}
 spawn(){
  // Four broad incoming lanes, alternating sides, queued rather than discarded
  // when the measured crowd cap is full.
  for(let i=0;i<BATTLE.waveSize;i++){if(this.pending.length>=BATTLE.capacity*2)break;const side=(i%2)?-1:1,lane=(Math.floor(i/2)+this.wave)%4,z=[12,85,168,244][lane]+((Math.floor(i/8)%6)-2.5)*4.5,x=(side<0?-100:250)+side*(Math.floor(i/48)*8+(this.wave%3)*3);this.pending.push({x,z,side,phase:i*.71+this.wave});}this.wave++;this.release();
 }
 release(){let n=0;while(this.pending.length&&this.enemies.length<this.budget.cap&&n++<BATTLE.release){const s=this.pending.shift(),kind=this.serial%83===82&&this.enemies.filter(e=>e.kind==='gorogoro').length<4?'gorogoro':'reed',e={id:++this.serial,x:s.x,z:s.z,px:s.x,pz:s.z,goal:s.side<0?160:0,direction:-s.side,speed:kind==='gorogoro'?3:3.3+(this.serial%5)*.23,hp:kind==='gorogoro'?14:3,kind,dead:0,age:0,near:false,phase:s.phase,position:point(s.x,s.z,.8),velocity:new Vector3()};this.enemies.push(e);this.stats.spawned++;}this.stats.peak=Math.max(this.stats.peak,this.enemies.length);}
 kill(e,reason='shot'){if(e.dead)return;e.hp=0;e.dead=Math.max(.0001,this.time);this.stats.killed++;if(reason==='rover')this.stats.runOver++;}
 blast(position,radius,damage){let hit=0;for(const e of this.enemies){if(e.dead)continue;const d=e.position.distanceTo(position);if(d>radius)continue;e.hp-=damage*(1-(d/radius)**2);e.hit=this.time;if(e.hp<=0)this.kill(e);hit++;}return hit;}
 step(dt,race){if(this.generation!==this.world.race.hazardGeneration)this.reset();if(!['racing','finished'].includes(race.phase))return;this.accumulator+=dt;while(this.accumulator>=BATTLE.step){this.accumulator-=BATTLE.step;this.tick(BATTLE.step,race);}}
 tick(dt,race){
  this.time+=dt;this.spatial.rebuild();if(this.time>=this.nextWave){this.spawn();this.nextWave=this.time+BATTLE.interval;}this.release();this.shots=this.shots.filter(s=>this.time-s.time<.18);
  for(const e of this.enemies){e.px=e.x;e.pz=e.z;e.age+=dt;if(e.dead)continue;
   const slow=(e.slowUntil||0)>this.time?TOWER_BY_KEY.relay.slowFactor:1;const moved=this.moveEnemy?.(e,dt*slow);let nx=moved?.x??e.x+e.direction*e.speed*dt*slow,nz=moved?.z??e.z;
   if(!e.solids||e.solidsRevision!==this.spatial.revision||Math.hypot(e.x-e.solidsX,e.z-e.solidsZ)>5){e.solids=this.spatial.region(e.x,e.z,8);e.solidsX=e.x;e.solidsZ=e.z;e.solidsRevision=this.spatial.revision;}
   const blockedAt=(x,z)=>{const p=point(x,z,.7);for(const c of e.solids)if(sphereContact(c,p,.7))return true;return false;};
   if(blockedAt(nx,nz)){nx=e.x;nz=e.z+((e.id%2)*2-1)*e.speed*dt*slow;}
   if(!blockedAt(nx,nz)){e.x=nx;e.z=nz;}
   const old=e.position.clone();e.position.copy(point(e.x,e.z,.8));e.velocity.copy(e.position).sub(old).divideScalar(dt);
   // Only probe terrain near an active sinkhole, not hundreds of times across
   // empty spherical ground. All deaths and targeting remain actual bodies.
   if(this.world.holes.some(h=>h.radius>0&&Math.hypot(e.x-h.x,e.z-h.z)<h.r+3)&&terrainSample(this.world,e.position,false).throat){this.kill(e);continue;}
   if(!e.near&&ROUTE.slice(1).some((b,i)=>segmentDistance(e.x,e.z,ROUTE[i],b)<12)){e.near=true;this.stats.nearTrack++;}
   for(const r of race.racers){if(r.place||r.penalty||r.sim.vel.lengthSq()<9)continue;if(r.sim.pos.distanceToSquared(e.position)<5){this.kill(e,'rover');break;}}
   if(e.direction*(e.goal-e.x)<0||e.age>80){e.gone=true;this.stats.escaped++;}
  }
  this.enemies=this.enemies.filter(e=>!e.gone&&(!e.dead||this.time-e.dead<1.6));
  this.byId=new Map(this.enemies.map(e=>[e.id,e]));
  for(const p of this.projectiles){const e=this.byId.get(p.target);p.previous.copy(p.position);p.age+=dt;let arrived=false;
   if(p.flight){const pose=advanceQuiver(p.flight,dt,e&&!e.dead?e.position:undefined);Object.assign(p,{ignition:pose.ignition,phase:pose.phase});p.direction.copy(pose.direction);p.position.copy(pose.position);arrived=pose.done;this.stats.missilePhases[p.phase]=(this.stats.missilePhases[p.phase]||0)+1;if(p.ignition&&!p.ignited){p.ignited=true;this.onIgnition?.(p.position);}}
   else if(p.arc){const t=Math.min(1,p.age/p.duration);p.position.copy(p.from).lerp(p.to,t).addScaledVector(p.up,4*p.arc*t*(1-t));arrived=t===1;}
   else {const delta=p.to.clone().sub(p.position),distance=delta.length(),travel=p.speed*dt;p.position.addScaledVector(delta,Math.min(1,travel/Math.max(distance,.0001)));arrived=distance<=travel;}
   const obstructed=segmentBlocked(this.world,p.previous,p.position,this.spatial),friendly=race.racers.some(r=>segmentNear(p.previous,p.position,r.sim.pos,2));
   if(arrived||obstructed||friendly||p.age>12){p.done=true;this.onImpact?.(p.type,p.position);this.stats.impacts++;if(!obstructed&&!friendly)this.blast(p.position,['quiver','heptapod','mortar'].includes(p.type)?12:2,p.damage);}
  }this.projectiles=this.projectiles.filter(p=>!p.done);
  for(const g of this.guns){
   if(g.type==='relay'){g.engaged=false;for(const e of this.enemies)if(!e.dead&&e.position.distanceToSquared(g.origin)<g.range*g.range){e.slowUntil=this.time+TOWER_BY_KEY.relay.slowDur;g.engaged=true;}continue;}
   const missile=g.type==='quiver'||g.type==='heptapod',missileTune=g.type==='heptapod'?MISSILE_DEFAULTS.heptapod:QUIVER;
   g.heat=coolHeat(g.heat,dt,SENTRY_HEAT.rotor);if(g.overheated&&g.heat<SENTRY_HEAT.rotor.resume)g.overheated=false;
   let e=this.byId.get(g.target);if(!e||e.dead||e.position.distanceToSquared(g.origin)>g.range*g.range){e=null;let best=g.range*g.range;for(const v of this.enemies){if(v.dead)continue;const d=v.position.distanceToSquared(g.origin);if(d<best){best=d;e=v;}if(g.type==='needle'&&v.kind==='gorogoro'&&d<g.range*g.range){e=v;break;}}g.target=e?.id??null;g.lock=makeLock();}
   if(!e){g.beam=null;g.engaged=false;g.engagedAt=null;continue;}if(!g.engaged)g.engagedAt=this.time;g.engaged=true;
   const target=g.type==='rotor'?new Vector3().fromArray(leadPoint(e.position.toArray(),e.velocity.toArray(),g.origin.toArray(),150)):e.position.clone(),from=g.aim?g.aim(target):g.origin;
   if(missile)stepMissileLock(g.lock,dt,e,Math.hypot(e.x-g.x,e.z-g.z),from?0:99999,{...missileTune,maxRange:g.range});
   if(!from)continue;
   if(g.beam&&this.time<g.beam.until){
    if(segmentBlocked(this.world,from,target,this.spatial)||race.racers.some(r=>segmentNear(from,target,r.sim.pos,2))){g.beam=null;continue;}
    g.beam.from.copy(from);g.beam.to.copy(target);if(g.type==='needle')continue;for(const victim of this.enemies)if(!victim.dead&&segmentNear(from,target,victim.position,1.25)){victim.hp-=g.damage*dt;victim.hit=this.time;if(victim.hp<=0)this.kill(victim);}continue;
   }g.beam=null;
   if(this.time<g.next||g.overheated||(g.type==='rotor'&&this.time-g.engagedAt<FIRING.rotor.spinUp))continue;
   if(missile&&(!missileCanFire(g.lock,e,Math.hypot(e.x-g.x,e.z-g.z),0,{...missileTune,maxRange:g.range})||this.projectiles.some(p=>p.gun===g.id)))continue;
   if(!missile&&g.type!=='mortar'&&segmentBlocked(this.world,from,target,this.spatial)){this.stats.blocked++;g.target=null;g.next=this.time+.15;continue;}
   if(!missile&&g.type!=='mortar'&&race.racers.some(r=>segmentNear(from,target,r.sim.pos,2)))continue;
   if(this.projectiles.length>=128&&g.type!=='lancer')continue;
   const gap=g.cooldown??.5;g.next=Math.max(this.time-gap,g.next)+gap;this.stats.fired++;const id=++this.serial;
   this.shots.push({id,time:this.time,from:from.clone(),to:target,gun:g.id,type:g.type});
   if(['lancer','plasma','needle'].includes(g.type)){if(g.type==='needle'){e.hp-=g.damage;e.hit=this.time;if(e.hp<=0)this.kill(e);this.onImpact?.('needle',target);}g.beam={from:from.clone(),to:target.clone(),until:this.time+(FIRING[g.type]?.beamHold??.1)};g.next=g.beam.until+gap;}
   else {const direction=g.direction?.()??target.clone().sub(from).projectOnPlane(upAt(from)).normalize().multiplyScalar(.56).addScaledVector(upAt(from),.83).normalize(),flight=missile?launchQuiver(from,target,direction,g.type):null;
    this.projectiles.push({id,gun:g.id,type:g.type,from:from.clone(),to:target,position:from.clone(),previous:from.clone(),direction:direction.clone(),flight,ignition:false,phase:flight?'Eject':g.type==='mortar'?'Arc':'Round',arc:g.type==='mortar'?from.distanceTo(target)*.62:0,duration:Math.max(1,from.distanceTo(target)/35),up:upAt(from),age:0,speed:150,target:e.id,damage:g.damage});
    if(g.type==='rotor'){g.heat+=SENTRY_HEAT.rotor.perShot;if(g.heat>=1)g.overheated=true;}
   }
   g.fire?.();this.onShot?.(g.type,from);if(missile){g.lock=makeLock();g.target=null;}
  }
 }
 snapshot(){return {time:this.time,capacity:BATTLE.capacity,cap:this.budget.cap,adaptive:this.budget.adaptive,queued:this.pending.length,waves:this.wave,projectiles:this.projectiles.length,gorogoro:this.enemies.filter(e=>e.kind==='gorogoro'&&!e.dead).length,alive:this.enemies.filter(e=>!e.dead).length,bodies:this.enemies.length,guns:this.guns.length,...this.stats,missiles:this.projectiles.filter(p=>p.flight).map(p=>({id:p.id,phase:p.phase,ignition:p.ignition,age:p.age,position:p.position.toArray()}))};}
}
