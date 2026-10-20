import {ARRIVAL_APRON} from './podium-layout.js';
import {COURSES,BASE1_ROUTE} from './race-courses.js';
import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,frameAt} from './world.js';
import {fixtureColliders,boxCollider,cylinderCollider} from './collisions.js';
export const ROUTE=BASE1_ROUTE;
export const RACE_RULES=Object.freeze({halfWidth:9,penalty:3,outsideGrace:5,boundsMargin:4,claimTime:1.25,stopSpeed:.12,stopSpin:.12,podiumRadius:5,spotRadius:4.8,bubbleRadius:5.8});
export function createRaceWorld(id='race'){
 const course=COURSES[id]||COURSES.race,route=course.route,extended=course.id==='expedition';
 const holes=[[0,12,5.5],[35,132,6.5],[100,130,5.5],[136,183,6]].map(([x,z,r],i)=>({name:`JUMP ${i+1}`,x,z,r,baseRadius:r,dormant:i===1||i===3,phase:i===1||i===3?'dormant':'open',age:i===1||i===3?0:100,radius:i===1||i===3?0:r,frame:frameAt(point(x,z)),origin:point(x,z)}));
 if(extended)for(const [x,z,r,dormant,name] of [[215,-140,42,false,'THE GREAT DIVIDE'],[430,-137,7,true,'AMBER TREMOR'],[548,-83,7,false,'FINAL BREACH']])holes.push({x,z,r,baseRadius:r,dormant,name,phase:dormant?'dormant':'open',age:dormant?0:100,radius:dormant?0:r,frame:frameAt(point(x,z)),origin:point(x,z)});
 const pads=[{name:'START GRID',x:0,z:-40,origin:point(0,-40),frame:frameAt(point(0,-40))}];
 const rocks=[[-6,-20,3,3,1.6],[25,30,4,4,1.8],[30,83,4,3,1.8],[40,98,4,3,1.4],[70,163,4,4,1.8],[105,149,3,3,1.4],[131,202,3,3,1.3]].map(([x,z,w,d,h])=>({x,z,w,d,h,origin:point(x,z),frame:frameAt(point(x,z))}));
 if(extended){pads[0]={name:'BASE 1 / REVERSE GRID',x:136,z:210,origin:point(136,210),frame:frameAt(point(136,210))};for(const [x,z] of course.service)pads.push({name:'GAS SERVICE',x,z,service:true,origin:point(x,z),frame:frameAt(point(x,z))});for(const [x,z,w,d,h] of [[54,-120,3,4,2],[320,-136,4,4,1.8],[425,-235,3,3,1.5],[434,-187,3,3,1.4],[485,-115,3,3,1.5],[543,-47,3,3,1.3]])rocks.push({x,z,w,d,h,origin:point(x,z),frame:frameAt(point(x,z))});}
 const [deckX,deckZ]=course.deck,deck={x:deckX,z:deckZ,w:64,d:68,h:6.5,origin:point(deckX,deckZ),frame:frameAt(point(deckX,deckZ))};
 const spots=[0,-11,11].map((x,i)=>({number:i+1,height:[2.4,1.6,.8][i],local:new Vector3(x,deck.h+[2.4,1.6,.8][i],i===0?-25:-16),origin:new Vector3(x,deck.h+[2.4,1.6,.8][i],i===0?-25:-16).applyQuaternion(deck.frame.q).add(deck.origin),owner:null,reserved:null,hold:0}));
 const gates=route.slice(1).map(([x,z],i)=>{const from=route[i],dx=x-from[0],dz=z-from[1],len=Math.hypot(dx,dz);return {x,z,index:i,height:[3.3,3.175,3.4][i%3]*1.45,origin:point(x,z),frame:frameAt(point(x,z)),dx:dx/len,dz:dz/len};});
 const colliders=fixtureColliders(rocks,[]);colliders.push(boxCollider(deck,'finish-platform'));
 for(const s of spots)colliders.push(cylinderCollider({radius:RACE_RULES.podiumRadius,h:s.height,origin:s.origin.clone().addScaledVector(deck.frame.up,-s.height),frame:deck.frame},'podium-'+s.number));
 return {holes,pads,rocks,colliders,holeScale:1,race:{course,route,gates,deck,spots,rules:RACE_RULES}};
}
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function onCourse(world,x,z,margin=0){const {route,deck,rules}=world.race;if(Math.abs(x-deck.x)<110&&Math.abs(z-deck.z)<80){const p=point(x,z).sub(deck.origin),a=ARRIVAL_APRON;if(Math.abs(p.dot(deck.frame.east)-a.x)<=a.w/2+margin&&Math.abs(p.dot(deck.frame.north)-a.z)<=a.d/2+margin)return true;}if(Math.abs(x-deck.x)<=deck.w/2+2+margin&&z>=deck.z-deck.d/2-10-margin&&z<=deck.z+deck.d/2+3+margin)return true;return route.concat([[deck.x,deck.z]]).slice(1).some((b,i)=>segmentDistance(x,z,route[i]||route.at(-1),b)<=rules.halfWidth+margin);}
