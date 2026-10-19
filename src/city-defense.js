import {avoidHoles,clearOfHoles,escapingHoles,enemyBody,holeClearance} from './enemy-navigation.js';
import {resolveEnemyContact} from './enemy-contacts.js';
import {reedAdvance} from './reed-gait.js';
import {BOSS,crowdTraits,crowdMotion} from './crowd-variation.js';
import {MISSILE_DEFAULTS} from '../upstream/stalheart/src/content/missile-defaults.js';
import {TOWER_BY_KEY} from '../upstream/stalheart/src/towers.js';
import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,terrainSample,upAt,coords,frameAt} from './world.js';
import {sphereContact} from './collisions.js';
import {segmentDistance} from './race-world.js';
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
 reset(){this.time=0;this.accumulator=0;this.nextWave=2;this.nextBoss=BOSS.first;this.bossSpawns=0;this.wave=0;this.serial=0;this.enemies=[];this.shots=[];this.projectiles=[];this.pending=[];this.stats={spawned:0,killed:0,escaped:0,nearTrack:0,fired:0,blocked:0,runOver:0,peak:0,missilePhases:{},impacts:0};for(const g of this.guns){g.next=g.id*.05;g.target=null;g.beam=null;g.lock=makeLock();g.heat=0;g.overheated=false;g.engaged=false;g.engagedAt=null;g.rejected=new Map();}this.generation=this.world.race.hazardGeneration;}
 spawn(){
  // Four broad incoming lanes, alternating sides, queued rather than discarded
  // when the measured crowd cap is full.
  for(let i=0;i<BATTLE.waveSize;i++){if(this.pending.length>=BATTLE.capacity*2)break;const side=(i%2)?-1:1,lane=(Math.floor(i/2)+this.wave)%4,z=[12,85,168,244][lane]+((Math.floor(i/8)%6)-2.5)*4.5,x=(side<0?-100:250)+side*(Math.floor(i/48)*8+(this.wave%3)*3);let sx=x,sz=z,goal=side<0?180:-20;
   if(this.world.race.course.id==='expedition'){const sector=(Math.floor(i/8)+this.wave)%3;if(sector===1){sx+=420;sz-=270;goal+=420;}if(sector===2){sx=side<0?70:350;sz=-210+(i%6)*11;goal=side<0?335:65;}}
   this.pending.push({x:sx,z:sz,side,goal,phase:i*.71+this.wave});}this.wave++;this.release();
 }
 release(){let n=0;while(this.pending.length&&this.enemies.length<this.budget.cap&&n++<BATTLE.release){const s=this.pending.shift(),ordinal=this.stats.spawned,kind=ordinal%19===18&&this.enemies.filter(e=>e.kind==='gorogoro').length<8?'gorogoro':ordinal%5<2?'cutis':'reed';this.addEnemy(s,kind);}this.stats.peak=Math.max(this.stats.peak,this.enemies.length);}
 addEnemy(s,kind){const traits=crowdTraits(++this.serial),boss=kind==='nih-daira',e={...traits,id:this.serial,x:s.x,z:s.z,px:s.x,pz:s.z,goal:s.goal??(s.side<0?180:-20),direction:-s.side,speed:(boss?1.7:kind==='gorogoro'?3:kind==='cutis'?2.8:3.8)*traits.pace,hp:boss?BOSS.hp:kind==='gorogoro'?14:kind==='cutis'?1.5:3,kind,dead:0,age:0,near:false,position:point(s.x,s.z,boss?2:.8),velocity:new Vector3()};for(const h of this.world.holes){if(!(h.radius>0||h.phase==='trembling'))continue;const r=holeClearance(h,e),dx=e.x-h.x,dz=e.z-h.z,d=Math.hypot(dx,dz);if(d<r){e.x=h.x+(d?dx/d:e.direction)*(r+.2);e.z=h.z+(d?dz/d:0)*(r+.2);}}e.px=e.x;e.pz=e.z;e.position.copy(point(e.x,e.z,enemyBody(e).height));this.enemies.push(e);this.stats.spawned++;return e;}
 spawnBoss(){if(this.time<this.nextBoss||this.enemies.some(e=>e.kind==='nih-daira')||this.enemies.length>=this.budget.cap)return;const side=this.bossSpawns%2?-1:1;const front=this.world.race.course.id==='expedition'?this.bossSpawns%3:0;this.addEnemy({x:(side<0?-90:240)+(front===1?420:front===2?160:0),z:front===1?-125:front===2?-200:145,side,goal:(side<0?180:-20)+(front===1?420:front===2?160:0)},'nih-daira');this.bossSpawns++;this.nextBoss=this.time+BOSS.cooldown;}

 kill(e,reason='shot'){if(e.dead)return;e.previousGait=e.gaitTime??e.phase??0;e.hp=0;e.dead=Math.max(.0001,this.time);this.stats.killed++;if(e.kind==='nih-daira')this.nextBoss=this.time+BOSS.cooldown;if(reason==='rover')this.stats.runOver++;}
 blast(position,radius,damage,kind='bofors'){this.onRemainsHit?.(position,radius,kind);let hit=0;for(const e of this.enemies){if(e.dead)continue;const d=e.position.distanceTo(position);if(d>radius)continue;e.hp-=damage*(1-(d/radius)**2);e.hit=this.time;if(e.hp<=0)this.kill(e);hit++;}return hit;}
 solarStrike(position,radius,bossDamage=.5){this.onRemainsHit?.(position,radius,'bofors');let hits=0;for(const e of this.enemies){if(e.dead)continue;const d=e.position.distanceTo(position);if(d>radius)continue;if(e.kind!=='nih-daira')this.kill(e,'sol');else {e.hp-=bossDamage*(1-(d/radius)**2);e.hit=this.time;if(e.hp<=0)this.kill(e,'sol');}hits++;}return hits;}
 step(dt,race){if(this.generation!==this.world.race.hazardGeneration)this.reset();if(!['racing','finished'].includes(race.phase))return;this.accumulator+=dt;while(this.accumulator>=BATTLE.step){this.accumulator-=BATTLE.step;this.tick(BATTLE.step,race);}}
 tick(dt,race){
  this.time+=dt;this.spatial.rebuild();this.spawnBoss();if(this.time>=this.nextWave){this.spawn();this.nextWave=this.time+BATTLE.interval;}this.release();this.shots=this.shots.filter(s=>this.time-s.time<.3);
  for(const e of this.enemies){e.px=e.x;e.pz=e.z;e.age+=dt;if(e.dead){
    // Preserve the contact impulse briefly on a rammed corpse. Boss remains
    // retain their separate articulated destruction simulation.
    if(e.kind!=='nih-daira'&&e.knock&&this.time-e.dead<.45){const mapped=coords(e.position.clone().addScaledVector(e.knock,dt)),next=avoidHoles(this.world,e,mapped.x-e.x,mapped.z-e.z);e.x=next.x;e.z=next.z;e.position.copy(point(e.x,e.z,enemyBody(e).height));e.knock.multiplyScalar(Math.exp(-dt*7));}continue;
   }
   e.previousGait=e.gaitTime??e.phase??0;
   const slow=(e.slowUntil||0)>this.time?TOWER_BY_KEY.relay.slowFactor:1;const moved=this.moveEnemy?.(e,dt*slow),motion=crowdMotion(e,this.time),reed=e.kind==='reed'?reedAdvance(e,dt*slow):null;let dx=moved?moved.x-e.x:e.direction*(reed??motion.speed*dt*slow),dz=moved?moved.z-e.z:motion.side*dt*slow;if(e.knock){const c=point(e.x,e.z).addScaledVector(e.knock,dt),mapped=coords(c);dx+=mapped.x-e.x;dz+=mapped.z-e.z;e.knock.multiplyScalar(Math.exp(-dt*7));}const next=avoidHoles(this.world,e,dx,dz);let nx=next.x,nz=next.z;
   if(!e.solids||e.solidsRevision!==this.spatial.revision||Math.hypot(e.x-e.solidsX,e.z-e.solidsZ)>5){e.solids=this.spatial.region(e.x,e.z,8);e.solidsX=e.x;e.solidsZ=e.z;e.solidsRevision=this.spatial.revision;}
   const blockedAt=(x,z)=>{const p=point(x,z,.7);for(const c of e.solids)if(sphereContact(c,p,.7))return true;return !clearOfHoles(this.world,e,x,z)&&!escapingHoles(this.world,e,x,z);};
   if(blockedAt(nx,nz)){nx=e.x;nz=e.z+((e.id%2)*2-1)*e.speed*dt*slow;}
   if(!blockedAt(nx,nz)){e.x=nx;e.z=nz;}else if(e.kind==='reed')e.gaitTime=e.previousGait;
   const old=e.position.clone();e.position.copy(point(e.x,e.z,enemyBody(e).height));e.velocity.copy(e.position).sub(old).divideScalar(dt);if(e.velocity.lengthSq()>.01){const f=frameAt(e.position),heading=Math.atan2(e.velocity.dot(f.east),e.velocity.dot(f.north));e.heading??=e.direction*Math.PI/2;e.heading+=Math.atan2(Math.sin(heading-e.heading),Math.cos(heading-e.heading))*Math.min(1,dt*8);}
   // Only probe terrain near an active sinkhole, not hundreds of times across
   // empty spherical ground. All deaths and targeting remain actual bodies.
   if(this.world.holes.some(h=>h.radius>0&&Math.hypot(e.x-h.x,e.z-h.z)<h.radius*1.6+3)&&terrainSample(this.world,e.position,false).height<-.15){this.kill(e);continue;}
   if(!e.near&&this.world.race.route.slice(1).some((b,i)=>segmentDistance(e.x,e.z,this.world.race.route[i],b)<12)){e.near=true;this.stats.nearTrack++;}
   for(const r of race.racers)resolveEnemyContact(r,e,this);
   if(e.direction*(e.goal-e.x)<0||e.age>(e.kind==='nih-daira'?125:80)){e.gone=true;if(e.kind==='nih-daira')this.nextBoss=this.time+BOSS.cooldown;this.stats.escaped++;}
  }
  for(const r of race.racers){r.sim.enemyPrevious??=r.sim.pos.clone();r.sim.enemyPrevious.copy(r.sim.pos);}
  this.enemies=this.enemies.filter(e=>!e.gone&&(!e.dead||this.time-e.dead<(e.kind==='nih-daira'?BOSS.corpse:1.6)));
  this.byId=new Map(this.enemies.map(e=>[e.id,e]));
  for(const p of this.projectiles){const e=this.byId.get(p.target);p.previous.copy(p.position);p.age+=dt;let arrived=false;
   if(p.flight){const pose=advanceQuiver(p.flight,dt,e&&!e.dead?e.position:undefined);Object.assign(p,{ignition:pose.ignition,phase:pose.phase});p.direction.copy(pose.direction);p.position.copy(pose.position);arrived=pose.done;this.stats.missilePhases[p.phase]=(this.stats.missilePhases[p.phase]||0)+1;if(p.ignition&&!p.ignited){p.ignited=true;this.onIgnition?.(p.position);}}
   else if(p.arc){const t=Math.min(1,p.age/p.duration);p.position.copy(p.from).lerp(p.to,t).addScaledVector(p.up,4*p.arc*t*(1-t));arrived=t===1;}
   else {const delta=p.to.clone().sub(p.position),distance=delta.length(),travel=p.speed*dt;p.position.addScaledVector(delta,Math.min(1,travel/Math.max(distance,.0001)));arrived=distance<=travel;}
   const obstructed=segmentBlocked(this.world,p.previous,p.position,this.spatial),friendly=race.racers.some(r=>segmentNear(p.previous,p.position,r.sim.pos,2));
   if(arrived||obstructed||friendly||p.age>12){p.done=true;this.onImpact?.(p.type,p.position);this.stats.impacts++;if(!obstructed&&!friendly)this.blast(p.position,['quiver','heptapod','mortar'].includes(p.type)?12:2,p.damage,['quiver','mortar'].includes(p.type)?'bofors':'rotary');}
  }this.projectiles=this.projectiles.filter(p=>!p.done);
  for(const g of this.guns){
   for(const [id,until] of g.rejected)if(until<=this.time)g.rejected.delete(id);
   if(g.type==='relay'){g.engaged=false;for(const e of this.enemies)if(!e.dead&&e.position.distanceToSquared(g.origin)<g.range*g.range){e.slowUntil=this.time+TOWER_BY_KEY.relay.slowDur;g.engaged=true;}continue;}
   const missile=g.type==='quiver'||g.type==='heptapod',missileTune=g.type==='heptapod'?MISSILE_DEFAULTS.heptapod:QUIVER;
   g.heat=coolHeat(g.heat,dt,SENTRY_HEAT.rotor);if(g.overheated&&g.heat<SENTRY_HEAT.rotor.resume)g.overheated=false;
   let e=this.byId.get(g.target);if(!e||e.dead||e.position.distanceToSquared(g.origin)>g.range*g.range){e=null;let best=g.range*g.range;for(const v of this.enemies){if(v.dead||(g.rejected.get(v.id)||0)>this.time)continue;const d=v.position.distanceToSquared(g.origin);if(d<best){best=d;e=v;}if(g.type==='needle'&&['gorogoro','nih-daira'].includes(v.kind)&&d<g.range*g.range){e=v;break;}}g.target=e?.id??null;g.lock=makeLock();}
   if(!e){g.beam=null;g.engaged=false;g.engagedAt=null;continue;}if(!g.engaged)g.engagedAt=this.time;g.engaged=true;
   const target=g.type==='rotor'?new Vector3().fromArray(leadPoint(e.position.toArray(),e.velocity.toArray(),g.origin.toArray(),150)):e.position.clone(),from=g.aim?g.aim(target):g.origin;
   if(missile)stepMissileLock(g.lock,dt,e,Math.hypot(e.x-g.x,e.z-g.z),from?0:99999,{...missileTune,maxRange:g.range});
   if(!from)continue;
   if(g.beam&&this.time<g.beam.until){
    if(segmentBlocked(this.world,from,target,this.spatial)||race.racers.some(r=>segmentNear(from,target,r.sim.pos,2))){g.beam=null;continue;}
    g.beam.from.copy(from);g.beam.to.copy(target);for(const victim of this.enemies)if(!victim.dead&&segmentNear(from,target,victim.position,1.25)){victim.hp-=g.damage*dt;victim.hit=this.time;if(victim.hp<=0)this.kill(victim);}continue;
   }g.beam=null;
   if(this.time<g.next||g.overheated||(g.type==='rotor'&&this.time-g.engagedAt<FIRING.rotor.spinUp))continue;
   if(missile&&(!missileCanFire(g.lock,e,Math.hypot(e.x-g.x,e.z-g.z),0,{...missileTune,maxRange:g.range})||this.projectiles.some(p=>p.gun===g.id)))continue;
   if(!missile&&g.type!=='mortar'&&segmentBlocked(this.world,from,target,this.spatial)){this.stats.blocked++;g.rejected.set(e.id,this.time+1.5);g.target=null;g.next=this.time+.15;continue;}
   if(!missile&&g.type!=='mortar'&&race.racers.some(r=>segmentNear(from,target,r.sim.pos,2))){g.rejected.set(e.id,this.time+.5);g.target=null;continue;}
   if(this.projectiles.length>=128&&g.type!=='lancer')continue;
   const gap=g.cooldown??.5;g.next=Math.max(this.time-gap,g.next)+gap;this.stats.fired++;const id=++this.serial;
   this.shots.push({id,time:this.time,from:from.clone(),to:target,gun:g.id,type:g.type});
   if(g.type==='needle'){g.next=this.time+gap;e.hp-=g.damage;e.hit=this.time;if(e.hp<=0)this.kill(e);this.onImpact?.('needle',target);}
   else if(['lancer','plasma'].includes(g.type)){g.beam={from:from.clone(),to:target.clone(),until:this.time+(FIRING[g.type]?.beamHold??.1)};g.next=g.beam.until+gap;}
   else {const direction=g.direction?.()??target.clone().sub(from).projectOnPlane(upAt(from)).normalize().multiplyScalar(.56).addScaledVector(upAt(from),.83).normalize(),flight=missile?launchQuiver(from,target,direction,g.type):null;
    this.projectiles.push({id,gun:g.id,type:g.type,from:from.clone(),to:target,position:from.clone(),previous:from.clone(),direction:direction.clone(),flight,ignition:false,phase:flight?'Eject':g.type==='mortar'?'Arc':'Round',arc:g.type==='mortar'?from.distanceTo(target)*.62:0,duration:Math.max(1,from.distanceTo(target)/35),up:upAt(from),age:0,speed:150,target:e.id,damage:g.damage});
    if(g.type==='rotor'){g.heat+=SENTRY_HEAT.rotor.perShot;if(g.heat>=1)g.overheated=true;}
   }
   g.fire?.();this.onShot?.(g.type,from);if(missile){g.lock=makeLock();g.target=null;}
  }
 }
 snapshot(){return {bossSpawns:this.bossSpawns,kinds:Object.fromEntries(['reed','cutis','gorogoro','nih-daira'].map(k=>[k,this.enemies.filter(e=>e.kind===k&&!e.dead).length])),time:this.time,capacity:BATTLE.capacity,cap:this.budget.cap,adaptive:this.budget.adaptive,queued:this.pending.length,waves:this.wave,projectiles:this.projectiles.length,gorogoro:this.enemies.filter(e=>e.kind==='gorogoro'&&!e.dead).length,alive:this.enemies.filter(e=>!e.dead).length,bodies:this.enemies.length,guns:this.guns.length,...this.stats,missiles:this.projectiles.filter(p=>p.flight).map(p=>({id:p.id,phase:p.phase,ignition:p.ignition,age:p.age,position:p.position.toArray()}))};}
}
