import {resolveRoverPair} from './rover-contacts.js';
import {StuntScore} from './stunt-scoring.js';
import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {Simulation,commands,STEP} from './simulation.js';
import {point,coords,frameAt,upAt} from './world.js';
import {onCourse} from './race-world.js';
import {nearColliders,sphereContact,ROVER_SOLIDS} from './collisions.js';
import {resetRaceHazards,stepRaceHazards} from './race-hazards.js';
import {pilot} from './race-ai.js';
const UP=new Vector3(0,1,0),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const styles=[['YOU',0xaff3ce,0,18,13],['EMBER',0xff8b4f,-5,18.6,12.7],['COBALT',0x559fff,5,17.6,13.6],['ORCHID',0xc18bff,-2.4,18.2,13.3],['SOLAR',0xffd351,2.4,17.9,13.8]];
const feet=[-.98,.98].flatMap(x=>[-1.44,-.42,1.44].map(z=>new Vector3(x,-.44,z)));
export class Race {
 constructor(world,player){this.world=world;this.phase='waiting';this.time=0;this.countdown=5;this.events=[];this.racers=styles.map(([name,color,lane,speed,lift],id)=>{const sim=id?new Simulation(world):player;Object.assign(sim.tune,{driveSpeed:speed,lift,capacity:160,assistance:'stabilized',unlimited:false});const r={stunts:new StuntScore(),id,name,color,lane,cruise:speed*.83,sim,gate:0,penalty:0,penalties:0,outside:0,place:null,hop:0,stuck:0,progress:0};sim.onReset=reason=>this.recover(r,reason);return r;});this.reset();}
 emit(type,data={}){this.serial=(this.serial||0)+1;this.events.push({type,time:this.time,serial:this.serial,...data});if(this.events.length>40)this.events.shift();}
 placeRover(r,x,z,heading=0){const s=r.sim;r.stunts.clearFlight();r.stuntPlan=null;s.reset('READY');s.pos.copy(point(x,z,.46));s.q.copy(frameAt(s.pos).q).multiply(new Quaternion().setFromAxisAngle(UP,heading));s.vel.set(0,0,0);s.omega.set(0,0,0);s.motion.capture();r.lastPosition=s.pos.clone();}
 reset(){resetRaceHazards(this.world);this.celebrationTime=0;this.phase='waiting';this.time=0;this.countdown=5;this.events=[];for(const spot of this.world.race.spots){spot.owner=null;spot.reserved=null;spot.hold=0;}for(const r of this.racers){r.stunts.reset();Object.assign(r,{gate:0,penalty:0,penalties:0,outside:0,place:null,hop:0,stuck:0,lastPenaltyReason:null,stuntAttempted:false});this.placeRover(r,r.lane,-40-(r.id>=3?7:0));}}
 start(){this.reset();this.phase='countdown';this.emit('countdown');this.emit('start-light',{light:1});}
 recover(r,reason='RECOVERY'){if(r.place||this.phase==='finished')return;const route=this.world.race.route,a=route[r.gate],b=route[r.gate+1]||[this.world.race.deck.x,this.world.race.deck.z],heading=Math.atan2(b[0]-a[0],b[1]-a[1]);let spawn=[a[0]+Math.cos(heading)*r.lane*.4,a[1]-Math.sin(heading)*r.lane*.4];
  search:for(const back of [0,3,6])for(const side of [r.lane*.4,0,-3,3,-6,6]){const x=a[0]+Math.cos(heading)*side-Math.sin(heading)*back,z=a[1]-Math.sin(heading)*side-Math.cos(heading)*back,p=point(x,z,.46),q=frameAt(p).q.multiply(new Quaternion().setFromAxisAngle(UP,heading)),near=nearColliders(this.world,p,3.5);if(onCourse(this.world,x,z)&&!ROVER_SOLIDS.some(shape=>near.some(c=>sphereContact(c,shape.center.clone().applyQuaternion(q).add(p),shape.radius)))){spawn=[x,z];break search;}}
  this.placeRover(r,...spawn,heading);r.lastPenaltyReason=reason;r.penalty=this.world.race.rules.penalty;r.penalties++;r.outside=0;r.stuck=0;r.hop=0;for(const spot of this.world.race.spots)if(spot.reserved===r.id){spot.reserved=null;spot.hold=0;}this.emit('penalty',{id:r.id,reason});}
 touchGate(r){const g=this.world.race.gates[r.gate];if(!g||!r.sim.grounded||r.sim.damage.wreck)return false;const s=r.sim;return feet.some(f=>{const p=f.clone().applyQuaternion(s.q).add(s.pos).sub(g.origin),x=p.dot(g.frame.east),z=p.dot(g.frame.north),height=p.dot(g.frame.up);return Math.abs(x*g.dx+z*g.dz)<1.4&&Math.abs(x*g.dz-z*g.dx)<8.5&&height>-.3&&height<.45;});}
 insideSpot(r,spot){const s=r.sim,d=this.world.race.deck,inv=d.frame.q.clone().invert();if(s.damage.wreck||!s.grounded||s.vel.length()>this.world.race.rules.stopSpeed||s.omega.length()>this.world.race.rules.stopSpin)return false;const local=s.pos.clone().sub(d.origin).applyQuaternion(inv);if(Math.abs(local.y-(spot.local.y+.44))>.25)return false;
  for(const x of [-1.23,1.23])for(const z of [-2.4,2.4]){const p=new Vector3(x,-.44,z).applyQuaternion(s.q).add(s.pos).sub(spot.origin).applyQuaternion(inv);if(Math.hypot(p.x,p.z)>this.world.race.rules.spotRadius)return false;}return true;
 }
 claimStatus(r){const open=this.world.race.spots.find(s=>s.owner===null);if(r.place)return `P${r.place} SECURED`;if(!open)return 'RACE COMPLETE';if(r.gate<this.world.race.gates.length)return `GATE ${r.gate+1} MISSED · RETURN TO THE CYAN STRIP`;if(r.sim.damage.wreck)return 'WRECKED · R TO RECOVER';
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
 collideRovers(){const protectedIds=new Set(this.world.race.spots.filter(s=>s.reserved!==null).map(s=>s.reserved));for(let a=0;a<this.racers.length;a++)for(let b=a+1;b<this.racers.length;b++){const ra=this.racers[a],rb=this.racers[b];if(ra.place||rb.place||ra.penalty||rb.penalty||protectedIds.has(a)||protectedIds.has(b))continue;resolveRoverPair(ra,rb);}}

 step(input,dt=STEP){if(this.phase==='finished'){this.celebrationTime+=dt;return;}if(this.phase==='waiting')return;if(this.phase==='countdown'){const before=Math.min(5,1+Math.floor(5-this.countdown+1e-8));this.countdown=Math.max(0,this.countdown-dt);const after=Math.min(5,1+Math.floor(5-this.countdown+1e-8));for(let light=before+1;light<=after;light++)this.emit('start-light',{light});if(this.countdown<1e-8){this.countdown=0;this.phase='racing';this.emit('go');}return;}this.time+=dt;stepRaceHazards(this,dt);
  for(const r of this.racers){if(r.place)continue;if(r.penalty>0){r.penalty=Math.max(0,r.penalty-dt);continue;}const c=r.id?pilot(r,this,dt):input;if(r.penalty)continue;r.sim.step(c,dt);if(r.penalty||r.sim.damage.wreck)continue;r.stunts.step(r,this,dt);const p=coords(r.sim.pos);r.outside=onCourse(this.world,p.x,p.z)?0:r.outside+dt;if(r.outside>this.world.race.rules.outsideGrace){this.recover(r,'OUT OF BOUNDS');continue;}if(this.touchGate(r)){r.gate++;r.stuck=0;this.emit('gate',{id:r.id,gate:r.gate});}
   if(r.id&&r.gate<this.world.race.gates.length){if(r.sim.pos.distanceTo(r.lastPosition)>1){r.lastPosition.copy(r.sim.pos);r.stuck=0;}else r.stuck+=dt;if(r.stuck>7)this.recover(r,'STUCK');}
  }
  this.claims(dt);this.collideRovers();
 }
 scoreStandings(){return [...this.racers].sort((a,b)=>b.stunts.score-a.stunts.score||b.stunts.flips-a.stunts.flips||a.id-b.id);}
 standings(){return [...this.racers].sort((a,b)=>(a.place||99)-(b.place||99)||b.gate-a.gate||this.distanceToGate(a)-this.distanceToGate(b));}
 distanceToGate(r){return r.sim.pos.distanceTo(this.world.race.gates[r.gate]?.origin||this.world.race.spots.find(s=>s.owner===null)?.origin||this.world.race.deck.origin);}
 snapshot(){return {phase:this.phase,time:this.time,celebrationTime:this.celebrationTime,holes:this.world.holes.map(h=>({name:h.name,phase:h.phase,radius:h.radius,triggeredBy:h.triggeredBy})),countdown:this.countdown,racers:this.racers.map(r=>({id:r.id,name:r.name,stunts:r.stunts.snapshot(),gate:r.gate,penalty:r.penalty,penalties:r.penalties,lastPenaltyReason:r.lastPenaltyReason,place:r.place,position:r.sim.pos.toArray(),gas:r.sim.reserve,damage:r.sim.damage.snapshot()})),spots:this.world.race.spots.map(s=>({number:s.number,owner:s.owner,reserved:s.reserved,hold:s.hold}))};}
}
