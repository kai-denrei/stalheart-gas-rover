import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {sphereContact,nearColliders} from './collisions.js';
import {commands} from './simulation.js';
import {coords,upAt} from './world.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function pilot(racer,race,dt){
 const s=racer.sim,c=commands(),p=coords(s.pos),up=upAt(s.pos),fwd=new Vector3(0,0,1).applyQuaternion(s.q).projectOnPlane(up).normalize(),right=new Vector3().crossVectors(up,fwd),v=s.vel.clone().projectOnPlane(up);
 const final=racer.gate===race.world.race.gates.length,spot=race.world.race.spots.find(x=>x.owner===null),deck=race.world.race.deck;
 if(!spot||s.damage.wreck)return c;
 // Service pads use the same stop-and-refill rule as the human rover.
 if(s.grounded&&s.reserve<s.tune.capacity*.7&&race.world.pads.some(p=>p.service&&s.pos.distanceTo(p.origin)<4.5)){c.brake=1;return c;}
 let target,desiredHeight=.38*s.vehicle.scale,air=false;
 if(final){
  const local=s.pos.clone().sub(deck.origin).applyQuaternion(deck.frame.q.clone().invert());
  // Avoid endlessly ramming a rover that is already settling into the circle.
  // Yield at a real holding point on the deck; no gate or claim is granted here.
  const arrivals=race.racers.filter(r=>!r.place&&!r.penalty&&r.gate===race.world.race.gates.length).sort((a,b)=>a.sim.pos.distanceToSquared(spot.origin)-b.sim.pos.distanceToSquared(spot.origin)||a.id-b.id);
  const lead=arrivals[0],yielding=lead&&lead.id!==racer.id&&lead.sim.pos.distanceTo(spot.origin)<8;
  const landing=yielding?new Vector3((racer.id-2)*7,deck.h,-27).applyQuaternion(deck.frame.q).add(deck.origin):spot.origin.clone();
  // Fly to the near lip before fanning out to the currently open podium spot.
  target=local.z< -deck.d/2-4?new Vector3(spot.number>1?spot.local.x:0,deck.h,-deck.d/2+2).applyQuaternion(deck.frame.q).add(deck.origin):landing;
  if(!yielding&&spot.number>1&&local.z< -22&&Math.abs(local.x-spot.local.x)>2)target=new Vector3(spot.local.x,deck.h,-deck.d/2+1).applyQuaternion(deck.frame.q).add(deck.origin);
  desiredHeight=(yielding?deck.h:spot.local.y)+.36*s.vehicle.scale+(s.pos.distanceTo(landing)>8?1.8:0);air=true;
  if(local.z< -deck.d/2-17&&s.grounded){air=false;target=new Vector3(0,0,-deck.d/2-12).applyQuaternion(deck.frame.q).add(deck.origin);}
  if(s.grounded&&local.y>deck.h&&s.pos.distanceTo(landing)<1.1&&v.length()<.3)return c;
 }else{
  const g=race.world.race.gates[racer.gate];target=g.origin.clone().addScaledVector(g.frame.east,g.dz*racer.lane*.3).addScaledVector(g.frame.north,-g.dx*racer.lane*.3);
  // At a right-angle exit, the line to the next gate can cross the previous
  // gate's pole. Go around that hardware; a short hop cannot clear its cap.
  // Never detour around an uncleared gate or grant progress for this maneuver.
  const nearby=nearColliders(race.world,s.pos,18),pole=nearby.find(c=>{
   const match=/^flag-(\d+)-.*Pole_shaft/.exec(c.id);if(!match||Number(match[1])>=racer.gate)return false;
   const delta=c.center.clone().sub(s.pos),above=delta.dot(up);delta.projectOnPlane(up);
   return above>-4&&delta.dot(fwd)>-.5&&delta.dot(fwd)<7&&Math.abs(delta.dot(right))<3.2;
  });
  if(pole){const side=pole.center.clone().sub(s.pos).dot(right),away=-Math.sign(side||racer.lane||1);target=s.pos.clone().addScaledVector(fwd,4).addScaledVector(right,away*(4-Math.abs(side)));}
  // Keep every jump inside the corridor and aim through the next gate.
  const nextHole=race.world.holes.find(h=>{if(h.phase==='dormant')return false;const d=h.origin.clone().sub(s.pos).projectOnPlane(up);return d.dot(fwd)>0&&d.length()<h.r+10&&Math.abs(d.dot(right))<h.r+2;});
  const obstacle=nearby.some(rock=>{if(rock.id==='finish-platform'||rock.id.startsWith('podium-')||rock.id.startsWith('gantry-'))return false;if(rock.owner==='city')return [2,4,6,8].some(t=>sphereContact(rock,s.pos.clone().addScaledVector(fwd,t),1.3));const d=rock.center.clone().sub(s.pos),height=d.dot(up);d.projectOnPlane(up);return height+rock.radius>.15&&d.dot(fwd)>1&&d.dot(fwd)<8+rock.radius&&Math.abs(d.dot(right))<rock.radius+1.4;});
  if((nextHole||obstacle)&&s.grounded&&!(racer.hop>0)){racer.hop=.42;}
  racer.hop=Math.max(0,(racer.hop||0)-dt);
  air=!s.grounded||racer.hop>0;
  if(racer.hop>0)desiredHeight=nextHole?.r>20?14:4;
  const over=race.world.holes.find(h=>h.phase!=='dormant'&&Math.hypot(p.x-h.x,p.z-h.z)<h.r+6);if(over)desiredHeight=Math.max(desiredHeight,over.r>20?14:3);
 }
 const diff=target.clone().sub(s.pos).projectOnPlane(up),distance=diff.length(),heading=Math.atan2(diff.dot(right),diff.dot(fwd));
 if(air){
  const crossing=race.world.holes.some(h=>h.r>20&&Math.hypot(p.x-h.x,p.z-h.z)<h.r+18);const max=final?7:crossing?16:8,desired=diff.clone().multiplyScalar(final?1.1:.55).clampLength(0,max),acc=desired.sub(v).multiplyScalar(.85);
  c.drive=clamp(acc.dot(fwd)/6,-1,1);c.steer=clamp(-acc.dot(right)/6,-1,1);
  const height=final?s.pos.clone().sub(deck.origin).dot(deck.frame.up):p.h,vy=s.vel.dot(up);
  c.lift=clamp((s.tune.gravity+(desiredHeight-height)*2.2-vy*2.8)/s.tune.lift,0,1);
  if(racer.hop>0)c.lift=1;
  c.yaw=clamp(heading*.65,-.6,.6);
 }else{
  const route=race.world.race.route,next=route[racer.gate+2];let turn=0;
  if(next&&!final){const g=race.world.race.gates[racer.gate],a=new Vector3(g.dx,0,g.dz),b=new Vector3(next[0]-g.x,0,next[1]-g.z).normalize();turn=Math.acos(clamp(a.dot(b),-1,1));}
  const corner=turn>.55?4:12,desiredSpeed=Math.min(racer.cruise*(.45+.55*s.damage.effects.steer),corner+Math.max(0,distance-19)*.55)*Math.max(.12,Math.cos(Math.min(Math.abs(heading),1.45)));
  const forwardSpeed=v.dot(fwd);c.steer=clamp(-heading*2.4,-1,1);
  c.drive=forwardSpeed>desiredSpeed+1?-Math.min(.35,(forwardSpeed-desiredSpeed)*.15):clamp(desiredSpeed/s.tune.driveSpeed,0,1);
 }
 // Cobalt attempts one physical stunt over the first jump; the other pilots
 // favor finishing. No animation shortcut or synthetic score is awarded.
 if(racer.id===2&&racer.gate===1&&racer.hop>0&&!racer.stuntAttempted){racer.stuntAttempted=true;racer.stuntPlan={age:0};}
 if(racer.stuntPlan){const plan=racer.stuntPlan;plan.age+=dt;
  if(plan.age<1.5){c.lift=1;}
  else if(!s.grounded){const rate=s.omega.clone().applyQuaternion(s.q.clone().invert()).z,remaining=2*Math.PI+.12-s.kickAngle;
   c.drive=0;c.steer=0;c.yaw=0;c.pitch=0;c.lift=0;
   c.kick=remaining>Math.max(0,rate)**2/7+.08?1:rate>.06?-1:0;
   if(s.kickTurns&&Math.abs(rate)<.15)racer.stuntPlan=null;
  }else racer.stuntPlan=null;
  if(plan.age>7)racer.stuntPlan=null;
 }
 if(s.reserve<1)race.recover(racer,'GAS EMPTY');
 return c;
}
