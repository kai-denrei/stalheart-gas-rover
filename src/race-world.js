import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,frameAt} from './world.js';
import {fixtureColliders,boxCollider,cylinderCollider} from './collisions.js';
export const ROUTE=[[0,-40],[0,-5],[0,35],[65,35],[85,48],[65,61],[35,61],[35,108],[35,158],[100,158],[100,108],[118,92],[136,108],[136,158],[136,210]];
export const RACE_RULES=Object.freeze({halfWidth:9,penalty:3,outsideGrace:.7,claimTime:1.25,stopSpeed:.12,stopSpin:.12,podiumRadius:5,spotRadius:4.8,bubbleRadius:5.8});
export function createRaceWorld(){
 const holes=[[0,12,5.5],[35,132,6.5],[100,130,5.5],[136,183,6]].map(([x,z,r],i)=>({name:`JUMP ${i+1}`,x,z,r,baseRadius:r,dormant:i===1||i===3,phase:i===1||i===3?'dormant':'open',age:i===1||i===3?0:100,radius:i===1||i===3?0:r,frame:frameAt(point(x,z)),origin:point(x,z)}));
 const pads=[{name:'START GRID',x:0,z:-40,origin:point(0,-40),frame:frameAt(point(0,-40))}];
 const rocks=[[-6,-20,3,3,1.6],[25,30,4,4,1.8],[30,83,4,3,1.8],[40,98,4,3,1.4],[70,163,4,4,1.8],[105,149,3,3,1.4],[131,202,3,3,1.3]].map(([x,z,w,d,h])=>({x,z,w,d,h,origin:point(x,z),frame:frameAt(point(x,z))}));
 const deck={x:136,z:264,w:64,d:68,h:6.5,origin:point(136,264),frame:frameAt(point(136,264))};
 const spots=[0,-11,11].map((x,i)=>({number:i+1,height:[2.4,1.6,.8][i],local:new Vector3(x,deck.h+[2.4,1.6,.8][i],i===0?-25:-16),origin:new Vector3(x,deck.h+[2.4,1.6,.8][i],i===0?-25:-16).applyQuaternion(deck.frame.q).add(deck.origin),owner:null,reserved:null,hold:0}));
 const gates=ROUTE.slice(1).map(([x,z],i)=>{const from=ROUTE[i],dx=x-from[0],dz=z-from[1],len=Math.hypot(dx,dz);return {x,z,index:i,origin:point(x,z),frame:frameAt(point(x,z)),dx:dx/len,dz:dz/len};});
 const colliders=fixtureColliders(rocks,[]);colliders.push(boxCollider(deck,'finish-platform'));
 for(const s of spots)colliders.push(cylinderCollider({radius:RACE_RULES.podiumRadius,h:s.height,origin:s.origin.clone().addScaledVector(deck.frame.up,-s.height),frame:deck.frame},'podium-'+s.number));
 for(const x of [-19,19]){colliders.push(boxCollider({w:2,d:51,h:.6,origin:new Vector3(x,deck.h,2).applyQuaternion(deck.frame.q).add(deck.origin),frame:deck.frame},'gantry-rail-'+x));colliders.push(boxCollider({w:2,d:3,h:30,origin:new Vector3(x,deck.h,2).applyQuaternion(deck.frame.q).add(deck.origin),frame:deck.frame},'gantry-column-'+x));}
 return {holes,pads,rocks,colliders,holeScale:1,race:{route:ROUTE,gates,deck,spots,rules:RACE_RULES}};
}
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function onCourse(world,x,z){const {route,deck,rules}=world.race;if(Math.abs(x-deck.x)<=deck.w/2+2&&z>=deck.z-deck.d/2-10&&z<=deck.z+deck.d/2+3)return true;return route.concat([[deck.x,deck.z]]).slice(1).some((b,i)=>segmentDistance(x,z,route[i]||route.at(-1),b)<=rules.halfWidth);}
