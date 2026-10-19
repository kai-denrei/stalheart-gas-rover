import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {ROVER_SOLIDS} from './collisions.js';
import {enemyBody} from './enemy-navigation.js';
import {upAt,coords} from './world.js';
// Real compound wheel/chassis contacts; low-mass bodies yield, red cores and
// bosses push back. Separate positional correction never becomes impact energy.
export function resolveEnemyContact(r,e,defense){
 if(e.dead||r.place||r.penalty||r.pendingRespawn)return false;
 const s=r.sim,body=enemyBody(e),radius=body.radius*(e.size||1),old=s.enemyPrevious||s.pos,travel=s.pos.distanceTo(old);
 if(s.pos.distanceToSquared(e.position)>(radius+3+travel)**2)return false;
 let hit=null;const count=Math.min(20,Math.max(1,Math.ceil(travel/.45)));
 for(let sample=1;sample<=count&&!hit;sample++){const at=old.clone().lerp(s.pos,sample/count);
  for(const shape of ROVER_SOLIDS){const center=shape.center.clone().applyQuaternion(s.q).add(at),delta=center.clone().sub(e.position),distance=delta.length(),depth=shape.radius+radius-distance;
   if(depth<=0)continue;const normal=distance>1e-6?delta.divideScalar(distance):new Vector3(0,0,-1).applyQuaternion(s.q);if(!hit||depth>hit.depth)hit={normal,depth,point:center.addScaledVector(normal,-shape.radius),shape,at};}
 }
 if(!hit)return false;
 if(count>1)s.pos.copy(hit.at);
 const {normal:n,depth,point:p}=hit,lever=p.clone().sub(s.pos),enemyVelocity=e.velocity.clone(),relative=s.vel.clone().add(new Vector3().crossVectors(s.omega,lever)).sub(enemyVelocity),closing=Math.max(0,-relative.dot(n)),invMass=1/body.mass;
 const angular=n.dot(new Vector3().crossVectors(s.inertiaInv(new Vector3().crossVectors(lever,n)),lever));
 const impulse=Math.min(14,closing*1.08/(1+invMass+angular));s.impulse(n.clone().multiplyScalar(impulse),lever);s.parked=false;
 e.knock??=new Vector3();e.knock.addScaledVector(n,-impulse*invMass).projectOnPlane(upAt(e.position)).clampLength(0,22);
 const correction=Math.min(.3,Math.max(0,depth-.01)*.5);s.pos.addScaledVector(n,correction/(1+invMass));const away=n.clone().projectOnPlane(upAt(e.position)),mapped=coords(e.position.clone().addScaledVector(away,-correction*invMass/(1+invMass)));e.x=mapped.x;e.z=mapped.z;e.position.addScaledVector(away,-correction*invMass/(1+invMass));
 // An enemy cannot be repeatedly farmed for damage by resting against it.
 e.contacts??=new Map();if(closing>=3&&defense.time>=(e.contacts.get(r.id)??-Infinity)){
  e.contacts.set(r.id,defense.time+.65);e.hp-=closing*closing*.055;e.hit=defense.time;
  const detail={speed:closing*Math.min(1.3,.65+body.mass*.3),point:p.toArray(),normal:n.toArray(),collider:'enemy-'+e.id,zone:hit.shape.zone};s.receiveImpact(detail);
  s.lastCollision={...detail,time:s.time,severity:closing>=12?'heavy':closing>=6?'moderate':'light'};s.event('collision',s.lastCollision);s.impact=Math.min(1,closing/15);r.stunts?.clearFlight();defense.stats.enemyContacts=(defense.stats.enemyContacts||0)+1;
  if(e.hp<=0)defense.kill(e,'rover');
 }
 return true;
}
