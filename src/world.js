import {Vector3,Quaternion,Matrix4} from '../upstream/stalheart/vendor/three.module.js';
import {fixtureColliders} from './collisions.js';
import {rimRadius,bowlHeight,SINKHOLE_INNER} from '../upstream/stalheart/src/core/sinkhole-shape.js';
export const RADIUS=753.3251493098921;
export const CENTER=new Vector3(0,-RADIUS,0);
export const DEFAULTS=Object.freeze({gravity:2.8,lift:13,capacity:100,gasRate:8.5,assistance:'stabilized',unlimited:false,holeScale:1,volume:.32});
export const PAD_DEFS=[{name:'BASE',x:0,z:0},{name:'CROSSING',x:0,z:68},{name:'OFFSET',x:35,z:127},{name:'RECOVERY',x:-66,z:51}];
export const HOLE_DEFS=[{name:'01 / FIRST CROSSING',x:0,z:35,r:10},{name:'02 / OFFSET',x:21,z:98,r:14},{name:'03 / RECOVERY BOWL',x:-65,z:83,r:19},{name:'04 / LONG CROSSING',x:112,z:130,r:23}];
export function point(x,z,h=0){const d=Math.hypot(x,z),a=d/RADIUS,s=d>1e-8?Math.sin(a)/d:1/RADIUS;return new Vector3(x*s*(RADIUS+h),Math.cos(a)*(RADIUS+h)-RADIUS,z*s*(RADIUS+h));}
export function upAt(p){return p.clone().sub(CENTER).normalize();}
export function frameAt(p){const up=upAt(p),east=new Vector3(1,0,0).projectOnPlane(up).normalize(),north=new Vector3().crossVectors(east,up).normalize();return {up,east,north,q:new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(east,up,north))};}
export function coords(p){const v=p.clone().sub(CENTER),len=v.length(),d=Math.hypot(v.x,v.z),arc=Math.atan2(d,v.y)*RADIUS;return {x:d>1e-9?v.x*arc/d:0,z:d>1e-9?v.z*arc/d:0,h:len-RADIUS};}
export function localOnSphere(p,f){const v=p.clone().sub(CENTER),len=v.length(),x=v.dot(f.east),z=v.dot(f.north),y=v.dot(f.up),d=Math.hypot(x,z),arc=Math.atan2(d,y)*RADIUS;return {x:d>1e-9?x*arc/d:0,z:d>1e-9?z*arc/d:0,h:len-RADIUS};}
export function createWorld(){
 const holes=HOLE_DEFS.map(d=>({...d,baseRadius:d.r,age:100,radius:d.r,frame:frameAt(point(d.x,d.z)),origin:point(d.x,d.z)}));
 const pads=PAD_DEFS.map(d=>({...d,origin:point(d.x,d.z),frame:frameAt(point(d.x,d.z))}));
 const rocks=[];
 for(let i=0;i<44;i++){
  const a=i*2.39996323,r=48+(i%9)*22,x=Math.cos(a)*r,z=Math.sin(a)*r+80;
  if(holes.some(h=>Math.hypot(h.x-x,h.z-z)<h.r+12)||pads.some(p=>Math.hypot(p.x-x,p.z-z)<16)||Math.abs(x)<9&&z<70)continue;
  rocks.push({x,z,w:3+(i%4)*1.4,d:3+(i%3)*2,h:1.5+(i%4)*.85,origin:point(x,z),frame:frameAt(point(x,z))});
 }
 // Low barriers beside the first approach invite a small optional hop.
 rocks.push(...[{x:15,z:17,w:7,d:2,h:1.25},{x:-18,z:24,w:4,d:3,h:2.2}].map(r=>({...r,origin:point(r.x,r.z),frame:frameAt(point(r.x,r.z))})));
 return {holes,pads,rocks,colliders:fixtureColliders(rocks,pads),holeScale:1};
}
export function groundHeight(world,p){
 let height=0,inside=null,throat=false;
 for(const hole of world.holes){if(hole.radius<=0)continue;if(p.distanceToSquared(hole.origin)>(hole.radius*1.5+50)**2)continue;const c=localOnSphere(p,hole.frame),a=Math.atan2(c.z,c.x),r=Math.hypot(c.x,c.z)/(Math.max(.001,hole.radius)*rimRadius(a));if(r<1){inside=hole;if(r<SINKHOLE_INNER){height=-Infinity;throat=true;break;}height=Math.min(height,hole.radius*bowlHeight(a,r));}}
 return {height,hole:inside,throat};
}
export function terrainSample(world,p,normal=true){const c=coords(p),s=groundHeight(world,p),up=upAt(p);let n=up;
 if(normal&&s.hole&&!s.throat){const f=frameAt(p),eps=.08,hx=groundHeight(world,p.clone().addScaledVector(f.east,eps)).height,hz=groundHeight(world,p.clone().addScaledVector(f.north,eps)).height;
 if(Number.isFinite(hx)&&Number.isFinite(hz))n=up.clone().addScaledVector(f.east,-(hx-s.height)/eps).addScaledVector(f.north,-(hz-s.height)/eps).normalize();}
 return {...s,altitude:c.h,signed:c.h-s.height,normal:n};
}
export function setHoleScale(world,scale){world.holeScale=scale;for(const h of world.holes){h.r=h.baseRadius*scale;h.radius=h.r;h.age=100;}}
export function beginOpening(world){for(const h of world.holes){h.age=0;h.radius=0;}}
