// Conservative outer rim includes the irregular breach silhouette and sphere-map
// distortion in Base 2. Trembling holes reserve their full future footprint.
export const enemyBody = e => ({reed:{radius:.85,height:.8,mass:.28},cutis:{radius:.65,height:.65,mass:.16},gorogoro:{radius:1.65,height:1.6,mass:1.2},'nih-daira':{radius:3.4,height:2.8,mass:8}}[e.kind]||{radius:.85,height:.8,mass:.28});
export function holeClearance(h,e){return (h.phase==='trembling'||h.phase==='opening'?h.r:h.radius)*1.55+enemyBody(e).radius+1.3;}
export function avoidHoles(world,e,dx,dz){
 const travel=Math.hypot(dx,dz);if(!travel)return {x:e.x,z:e.z};let vx=dx/travel,vz=dz/travel;
 for(const h of world.holes){if(!(h.radius>0||h.phase==='trembling'||h.phase==='opening'))continue;
  const r=holeClearance(h,e),ox=e.x-h.x,oz=e.z-h.z,d=Math.hypot(ox,oz),look=travel+6,t=Math.max(0,Math.min(look,-ox*vx-oz*vz));
  if(Math.hypot(ox+vx*t,oz+vz*t)>r+1)continue;
  const nx=d>1e-6?ox/d:-e.direction,nz=d>1e-6?oz/d:0;
  // Keep the chosen passing side until clear; no left/right indecision at a rim.
  if(e.avoidHole!==h){e.avoidHole=h;e.avoidSide=Math.sign(nx*vz-nz*vx)||(e.id%2?1:-1);}
  if(d<r+.05){vx=nx;vz=nz;continue;}
  const outward=Math.max(0,Math.min(2,(r+2-d)/2)),tx=-nz*e.avoidSide,tz=nx*e.avoidSide,len=Math.hypot(tx+nx*outward,tz+nz*outward);vx=(tx+nx*outward)/len;vz=(tz+nz*outward)/len;
 }
 return {x:e.x+vx*travel,z:e.z+vz*travel};
}
export function clearOfHoles(world,e,x,z){return world.holes.every(h=>!(h.radius>0||h.phase==='trembling'||h.phase==='opening')||Math.hypot(x-h.x,z-h.z)>=holeClearance(h,e));}

// A hole can start trembling underneath a walker. Allow steps out of that
// exclusion zone rather than trapping it until the ground opens.
export function escapingHoles(world,e,x,z){return world.holes.every(h=>!(h.radius>0||h.phase==='trembling'||h.phase==='opening')||Math.hypot(x-h.x,z-h.z)>=holeClearance(h,e)||Math.hypot(x-h.x,z-h.z)>Math.hypot(e.x-h.x,e.z-h.z)+1e-6);}
