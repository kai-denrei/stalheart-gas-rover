import {wheelsOffCourse} from './race-bounds.js';
import {gridPose} from './race-courses.js';
import {resolveRoverPair} from './rover-contacts.js';
import {StuntScore} from './stunt-scoring.js';
import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {Simulation,commands,STEP} from './simulation.js';
import {point,coords,frameAt,upAt} from './world.js';
import {findRespawn,respawnClear} from './race-respawn.js';
import {resetRaceHazards,stepRaceHazards} from './race-hazards.js';
import {pilot} from './race-ai.js';
const UP=new Vector3(0,1,0),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const styles=[['YOU',0xaff3ce,0,18,13],['EMBER',0xff8b4f,-5,18.6,12.7],['COBALT',0x559fff,5,17.6,13.6],['ORCHID',0xc18bff,-2.4,18.2,13.3],['SOLAR',0xffd351,2.4,17.9,13.8]];
export class Race {
 constructor(world,player){this.world=world;this.phase='waiting';this.time=0;this.countdown=5;this.events=[];this.racers=styles.map(([name,color,lane,speed,lift],id)=>{const sim=id?new Simulation(world):player;Object.assign(sim.tune,{driveSpeed:speed,lift,capacity:world.race.course.capacity,assistance:'stabilized',unlimited:false});const r={stunts:new StuntScore(),id,name,color,lane,cruise:speed*.83,sim,gate:0,penalty:0,penalties:0,outside:0,place:null,hop:0,stuck:0,progress:0};sim.onReset=reason=>this.recover(r,reason);return r;});this.reset();}
 emit(type,data={}){this.serial=(this.serial||0)+1;this.events.push({type,time:this.time,serial:this.serial,...data});if(this.events.length>40)this.events.shift();}
 placeRover(r,x,z,heading=0){const s=r.sim;r.pendingRespawn=false;s.recovering=false;r.stunts.clearFlight();r.stuntPlan=null;s.reset('READY');s.pos.copy(point(x,z,.46));s.q.copy(frameAt(s.pos).q).multiply(new Quaternion().setFromAxisAngle(UP,heading));s.vel.set(0,0,0);s.omega.set(0,0,0);s.motion.capture();r.lastPosition=s.pos.clone();}
 reset(){resetRaceHazards(this.world);this.celebrationTime=0;this.phase='waiting';this.time=0;this.countdown=5;this.events=[];for(const spot of this.world.race.spots){spot.owner=null;spot.reserved=null;spot.hold=0;}for(const r of this.racers){r.stunts.reset();Object.assign(r,{gate:0,penalty:0,penalties:0,outside:0,place:null,hop:0,stuck:0,lastPenaltyReason:null,stuntAttempted:false});const grid=gridPose(this.world,r);this.placeRover(r,grid.x,grid.z,grid.heading);}}
 start(){this.reset();this.phase='countdown';this.emit('countdown');this.emit('start-light',{light:1});}
 tryRespawn(r){const spawn=findRespawn(this,r);if(!spawn){r.pendingRespawn=true;r.sim.recovering=true;r.sim.vel.set(0,0,0);r.sim.omega.set(0,0,0);return false;}this.placeRover(r,spawn.x,spawn.z,spawn.heading);return true;}
 recover(r,reason='RECOVERY'){if(r.sim.catastrophic&&r.sim.wreckTime<r.sim.wreckDelay)return;if(r.place||this.phase==='finished')return;r.stunts.clearFlight();r.stuntPlan=null;this.tryRespawn(r);r.lastPenaltyReason=reason;r.penalty=this.world.race.rules.penalty;r.penalties++;r.outside=0;r.stuck=0;r.hop=0;r.respawnRetry=0;for(const spot of this.world.race.spots)if(spot.reserved===r.id){spot.reserved=null;spot.hold=0;}this.emit('penalty',{id:r.id,reason});}
 touchGate(r,previous=r.sim.pos){
  const g=this.world.race.gates[r.gate];if(!g||r.sim.damage.wreck||r.penalty||r.pendingRespawn)return false;
  // Sweep the rover centre through the passage up to the authored flag top.
  const local=p=>{const d=p.clone().sub(g.origin),x=d.dot(g.frame.east),z=d.dot(g.frame.north);return [x*g.dx+z*g.dz,x*g.dz-z*g.dx,d.dot(g.frame.up)];};
  const a=local(previous),b=local(r.sim.pos),bounds=[[-1.4,1.4],[-8.5,8.5],[-.3,g.height]];let enter=0,exit=1;
  for(let i=0;i<3;i++){const delta=b[i]-a[i],[lo,hi]=bounds[i];if(Math.abs(delta)<1e-9){if(a[i]<lo||a[i]>hi)return false;continue;}const t0=(lo-a[i])/delta,t1=(hi-a[i])/delta;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));if(enter>exit)return false;}
  return true;
 }
 insideSpot(r,spot){if(r.pendingRespawn)return false;const s=r.sim,d=this.world.race.deck,inv=d.frame.q.clone().invert();if(s.damage.wreck||!s.grounded||s.vel.length()>this.world.race.rules.stopSpeed||s.omega.length()>this.world.race.rules.stopSpin)return false;const local=s.pos.clone().sub(d.origin).applyQuaternion(inv);if(Math.abs(local.y-(spot.local.y+.44))>.25)return false;
  for(const x of [-1.23,1.23])for(const z of [-2.4,2.4]){const p=new Vector3(x,-.44,z).applyQuaternion(s.q).add(s.pos).sub(spot.origin).applyQuaternion(inv);if(Math.hypot(p.x,p.z)>this.world.race.rules.spotRadius)return false;}return true;
 }
 claimStatus(r){const open=this.world.race.spots.find(s=>s.owner===null);if(r.place)return `P${r.place} SECURED`;if(!open)return 'RACE COMPLETE';if(r.gate<this.world.race.gates.length)return `GATE ${r.gate+1} MISSED · PASS BETWEEN THE FLAGS`;if(r.sim.damage.wreck)return 'WRECKED · R TO RECOVER';
  if(r.sim.pos.distanceTo(open.origin)>8)return `LAND ON #${open.number} · OTHER SPOTS LOCKED`;
  if(!r.sim.grounded)return 'LAND ALL WHEELS ON THE PODIUM';if(r.sim.pos.clone().sub(open.origin).dot(this.world.race.deck.frame.up)<.2)return `BOOST UP ONTO #${open.number}`;
  if(r.sim.vel.length()>this.world.race.rules.stopSpeed||r.sim.omega.length()>this.world.race.rules.stopSpin)return 'HOLD SHIFT TO BRAKE · RELEASE STEERING';
  if(!this.insideSpot(r,open))return `CENTER THE WHOLE ROVER IN #${open.number}`;
  return `CLAIMING #${open.number} · HOLD STILL`;
 }
 repel(spot,owner){const up=this.world.race.deck.frame.up,min=this.world.race.rules.bubbleRadius+2.7;for(const r of this.racers){if(r.id===owner||r.place)continue;const d=r.sim.pos.clone().sub(spot.origin),height=d.dot(up);d.projectOnPlane(up);const dist=d.length();if(dist>=min||height< -1||height>8)continue;if(dist<.001)d.copy(this.world.race.deck.frame.east).multiplyScalar(r.id%2?1:-1);else d.divideScalar(dist);r.sim.pos.addScaledVector(d,Math.min(.45,min-dist));r.sim.vel.addScaledVector(d,Math.max(0,6-r.sim.vel.dot(d)));}}
 claims(dt){const spots=this.world.race.spots,open=spots.find(s=>s.owner===null);
  for(const s of spots)if(s.owner!==null)this.repel(s,s.owner);
  if(!open)return;
  if(open.reserved!==null){const r=this.racers[open.reserved];if(!this.insideSpot(r,open)){open.reserved=null;open.hold=0;}}
  if(open.reserved===null){const eligible=this.racers.filter(r=>!r.place&&!r.penalty&&r.gate===this.world.race.gates.length&&this.insideSpot(r,open));if(eligible.length){open.reserved=eligible[0].id;open.hold=0;this.emit('claiming',{id:open.reserved,spot:open.number});}}
  if(open.reserved!==null){this.repel(open,open.reserved);open.hold+=dt;if(open.hold>=this.world.race.rules.claimTime){const r=this.racers[open.reserved];open.owner=r.id;r.place=open.number;r.finishTime=this.time;r.sim.vel.set(0,0,0);r.sim.omega.set(0,0,0);r.sim.motion.capture();this.emit('claimed',{id:r.id,spot:open.number});if(spots.every(s=>s.owner!==null)){this.phase='finished';for(const v of this.racers)v.sim.motion.capture();this.emit('finished');}}}
 }
 collideRovers(){const protectedIds=new Set(this.world.race.spots.filter(s=>s.reserved!==null).map(s=>s.reserved));for(let a=0;a<this.racers.length;a++)for(let b=a+1;b<this.racers.length;b++){const ra=this.racers[a],rb=this.racers[b];if(ra.place||rb.place||ra.penalty||rb.penalty||ra.pendingRespawn||rb.pendingRespawn||protectedIds.has(a)||protectedIds.has(b))continue;resolveRoverPair(ra,rb);}}

 step(input,dt=STEP){if(this.phase==='finished'){this.celebrationTime+=dt;return;}if(this.phase==='waiting')return;if(this.phase==='countdown'){const before=Math.min(5,1+Math.floor(5-this.countdown+1e-8));this.countdown=Math.max(0,this.countdown-dt);const after=Math.min(5,1+Math.floor(5-this.countdown+1e-8));for(let light=before+1;light<=after;light++)this.emit('start-light',{light});if(this.countdown<1e-8){this.countdown=0;this.phase='racing';this.emit('go');}return;}this.time+=dt;stepRaceHazards(this,dt);
  for(const r of this.racers){if(r.place)continue;if(r.penalty>0||r.pendingRespawn){r.penalty=Math.max(0,r.penalty-dt);if(r.penalty===0){r.respawnRetry=Math.max(0,(r.respawnRetry||0)-dt);if(r.respawnRetry===0){if(r.pendingRespawn||!respawnClear(this,r,r.sim.pos,r.sim.q))this.tryRespawn(r);r.respawnRetry=.25;}}continue;}const c=r.id?pilot(r,this,dt):input;if(r.penalty)continue;const gatePrevious=r.sim.pos.clone();r.sim.step(c,dt);if(r.penalty||r.sim.damage.wreck)continue;r.stunts.step(r,this,dt);r.outside=wheelsOffCourse(this.world,r.sim)?r.outside+dt:0;if(r.outside>=this.world.race.rules.outsideGrace){this.recover(r,'OUT OF BOUNDS');continue;}if(this.touchGate(r,gatePrevious)){r.stunts.passGate(r,this);r.gate++;r.stuck=0;this.emit('gate',{id:r.id,gate:r.gate});}
   if(r.id&&r.gate<this.world.race.gates.length){if(r.sim.pos.distanceTo(r.lastPosition)>1){r.lastPosition.copy(r.sim.pos);r.stuck=0;}else r.stuck+=dt;if(r.stuck>7)this.recover(r,'STUCK');}
  }
  this.claims(dt);this.collideRovers();
 }
 scoreStandings(){return [...this.racers].sort((a,b)=>b.stunts.score-a.stunts.score||b.stunts.flips-a.stunts.flips||a.id-b.id);}
 standings(){return [...this.racers].sort((a,b)=>(a.place||99)-(b.place||99)||b.gate-a.gate||this.distanceToGate(a)-this.distanceToGate(b));}
 distanceToGate(r){return r.sim.pos.distanceTo(this.world.race.gates[r.gate]?.origin||this.world.race.spots.find(s=>s.owner===null)?.origin||this.world.race.deck.origin);}
 snapshot(){return {phase:this.phase,time:this.time,celebrationTime:this.celebrationTime,holes:this.world.holes.map(h=>({name:h.name,phase:h.phase,radius:h.radius,triggeredBy:h.triggeredBy})),countdown:this.countdown,racers:this.racers.map(r=>({id:r.id,name:r.name,stunts:r.stunts.snapshot(),gate:r.gate,outside:r.outside,penalty:r.penalty,pendingRespawn:!!r.pendingRespawn,penalties:r.penalties,lastPenaltyReason:r.lastPenaltyReason,place:r.place,position:r.sim.pos.toArray(),gas:r.sim.reserve,damage:r.sim.damage.snapshot()})),spots:this.world.race.spots.map(s=>({number:s.number,owner:s.owner,reserved:s.reserved,hold:s.hold}))};}
}
