import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {upAt} from './world.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z),HALF=[1.23,.84,2.4],CENTER=V(0,.4,0);
function hull(s,p=s.pos,q=s.q){return {center:CENTER.clone().applyQuaternion(q).add(p),axes:[V(1),V(0,1),V(0,0,1)].map(v=>v.applyQuaternion(q)),half:s.family==='xb12'?[1.47,1.1,2.4]:HALF};}
const extent=(b,n)=>b.axes.reduce((v,a,i)=>v+Math.abs(a.dot(n))*b.half[i],0);
export function roverOverlap(a,b){
 const delta=a.center.clone().sub(b.center);let best=null;
 const axes=[...a.axes.map((n,i)=>({n,ref:a,index:i})),...b.axes.map((n,i)=>({n,ref:b,index:i}))];for(const x of a.axes)for(const y of b.axes)axes.push({n:V().crossVectors(x,y)});
 for(const axis of axes){if(axis.n.lengthSq()<1e-8)continue;const n=axis.n.clone().normalize(),depth=extent(a,n)+extent(b,n)-Math.abs(delta.dot(n));if(depth<0)return null;if(!best||depth<best.depth-1e-5){if(n.dot(delta)<0)n.negate();best={...axis,n,depth};}}
 return best;
}
function clip(poly,center,axis,limit){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.clone().sub(center).dot(axis)-limit,db=b.clone().sub(center).dot(axis)-limit;if(da<=0)out.push(a);if((da<=0)!==(db<=0))out.push(a.clone().lerp(b,da/(da-db)));}return out;}
function support(b,n){const p=b.center.clone();b.axes.forEach((a,i)=>{const d=a.dot(n);if(Math.abs(d)>1e-5)p.addScaledVector(a,Math.sign(d)*b.half[i]);});return p;}
function contacts(a,b,hit){
 if(!hit.ref)return [support(a,hit.n.clone().negate()).add(support(b,hit.n)).multiplyScalar(.5)];
 const ref=hit.ref,inc=ref===a?b:a,outward=hit.n.clone().multiplyScalar(ref===a?-1:1),center=ref.center.clone().addScaledVector(outward,ref.half[hit.index]);
 let index=0;for(let i=1;i<3;i++)if(Math.abs(inc.axes[i].dot(outward))>Math.abs(inc.axes[index].dot(outward)))index=i;
 const c=inc.center.clone().addScaledVector(inc.axes[index],-Math.sign(inc.axes[index].dot(outward))*inc.half[index]),side=[0,1,2].filter(i=>i!==index);let poly=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>c.clone().addScaledVector(inc.axes[side[0]],x*inc.half[side[0]]).addScaledVector(inc.axes[side[1]],y*inc.half[side[1]]));
 for(const i of [0,1,2].filter(i=>i!==hit.index))for(const sign of [-1,1])poly=clip(poly,center,ref.axes[i].clone().multiplyScalar(sign),ref.half[i]);
 return poly.filter(p=>p.clone().sub(center).dot(outward)<=.015).map(p=>p.clone().addScaledVector(outward,-p.clone().sub(center).dot(outward)*.5));
}
const velocity=(s,r)=>s.vel.clone().add(V().crossVectors(s.omega,r));
const denominator=(a,b,ar,br,n)=>2+n.dot(V().crossVectors(a.inertiaInv(V().crossVectors(ar,n)),ar))+n.dot(V().crossVectors(b.inertiaInv(V().crossVectors(br,n)),br));
function apply(a,b,ar,br,impulse){a.impulse(impulse,ar);b.impulse(impulse.clone().negate(),br);a.parked=b.parked=false;}
// Equal-mass hulls, clipped face contacts, accumulated normal impulses and
// Coulomb friction. Positional correction is separate and adds no kinetic energy.
export function resolveRoverPair(ra,rb){
 const a=ra.sim,b=rb.sim,previousA=a.motion.previous,previousB=b.motion.previous;
 const travel=a.pos.clone().sub(previousA.pos).sub(b.pos.clone().sub(previousB.pos)).length();
 if(a.pos.distanceToSquared(b.pos)>(6+travel)**2)return false;
 let ha=hull(a),hb=hull(b),hit=roverOverlap(ha,hb);
 // Catch fast pass-through at the 120 Hz boundary; ordinary driving takes no
 // sweep samples. Interpolate orientation as well for airborne impacts.
 if(!hit&&travel>.7&&travel<30){const count=Math.min(48,Math.ceil(travel/.35));for(let i=1;i<count;i++){const t=i/count,pa=previousA.pos.clone().lerp(a.pos,t),pb=previousB.pos.clone().lerp(b.pos,t),qa=previousA.q.clone().slerp(a.q,t),qb=previousB.q.clone().slerp(b.q,t);ha=hull(a,pa,qa);hb=hull(b,pb,qb);hit=roverOverlap(ha,hb);if(hit){a.pos.copy(pa);b.pos.copy(pb);a.q.copy(qa);b.q.copy(qb);break;}}}
 if(!hit)return false;
 ra.stunts?.clearFlight();rb.stunts?.clearFlight();
 let points=contacts(ha,hb,hit);if(!points.length)points=[ha.center.clone().add(hb.center).multiplyScalar(.5)];const n=hit.n;
 const manifold=points.map(p=>{const ar=p.clone().sub(a.pos).multiplyScalar(.55),br=p.clone().sub(b.pos).multiplyScalar(.55),closing=-velocity(a,ar).sub(velocity(b,br)).dot(n);return {p,ar,br,closing,bounce:closing>2?closing*.02:0,normal:0,tangent:V()};});
 for(let iteration=0;iteration<10;iteration++)for(const c of manifold){const rel=velocity(a,c.ar).sub(velocity(b,c.br)),vn=rel.dot(n),old=c.normal;c.normal=Math.max(0,old+(c.bounce-vn)/denominator(a,b,c.ar,c.br,n));apply(a,b,c.ar,c.br,n.clone().multiplyScalar(c.normal-old));
  const tangent=velocity(a,c.ar).sub(velocity(b,c.br)).projectOnPlane(n),speed=tangent.length();if(speed<1e-7)continue;tangent.divideScalar(speed);const next=c.tangent.clone().addScaledVector(tangent,-speed/denominator(a,b,c.ar,c.br,tangent)).clampLength(0,c.normal*.16);apply(a,b,c.ar,c.br,next.clone().sub(c.tangent));c.tangent.copy(next);
 }
 const correction=Math.min(.2,Math.max(0,hit.depth-.003)*.4);a.pos.addScaledVector(n,correction);b.pos.addScaledVector(n,-correction);
 for(const [s,normal] of [[a,n],[b,n.clone().negate()]]){s.kickFlight=false;s.kickInput=0;s.trickAxes?.fill(false);s.bodyContacts++;if(normal.dot(upAt(s.pos))>.65&&V(0,1).applyQuaternion(s.q).dot(normal)>.7){s.supportTime=.1;s.grounded=true;}}
 const impact=manifold.reduce((best,c)=>c.closing>best.closing?c:best,manifold[0]);
 if(impact.closing>1.5)for(const [s,id,normal] of [[a,rb.id,n],[b,ra.id,n.clone().negate()]]){const detail={speed:impact.closing,point:impact.p.toArray(),normal:normal.toArray(),collider:'rover-'+id};s.receiveImpact(detail);if(!s.collisionCooldown){s.lastCollision={...detail,time:s.time,severity:impact.closing>=12?'heavy':impact.closing>=6?'moderate':'light'};s.event('collision',s.lastCollision);s.collisionCooldown=.3;s.impact=Math.min(1,impact.closing/15);}}
 return true;
}
