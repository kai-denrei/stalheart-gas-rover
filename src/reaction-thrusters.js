import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
const V=(...p)=>new Vector3(...p),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Lab RCS ports: three opposed translation pairs and three balanced torque
// couples. Their individual force/moment sums drive both physics and exhaust.
export const RCS_PORTS=[
 {p:V(-1.06,0,0),d:V(1,0,0)},{p:V(1.06,0,0),d:V(-1,0,0)},
 {p:V(0,-.2,0),d:V(0,1,0)},{p:V(0,.86,0),d:V(0,-1,0)},
 {p:V(0,0,-2.15),d:V(0,0,1)},{p:V(0,0,2.15),d:V(0,0,-1)},
 ...[-1,1].flatMap(sign=>[
 {p:V(0,0,1.7),d:V(0,-sign,0),axis:0,sign},{p:V(0,0,-1.7),d:V(0,sign,0),axis:0,sign},
 {p:V(.98,0,0),d:V(0,0,-sign),axis:1,sign},{p:V(-.98,0,0),d:V(0,0,sign),axis:1,sign},
 {p:V(.98,0,0),d:V(0,sign,0),axis:2,sign},{p:V(-.98,0,0),d:V(0,-sign,0),axis:2,sign}])
];
export function reactionBurn(force,torque,health){const power=health?health.thrust.reduce((a,n)=>a+n,0)/8:1,forces=RCS_PORTS.map(()=>V()),total=V(),moment=V();let effort=0;
 for(let i=0;i<RCS_PORTS.length;i++){const p=RCS_PORTS[i];let amount;
  if(p.axis===undefined)amount=clamp(force.dot(p.d),0,8)*power;
  else {const arm=p.axis===0?1.7:.98;amount=clamp(torque.getComponent(p.axis)*p.sign/(2*arm),0,p.axis===2?2.4:p.axis===1?5.2:3.2)*power;}
  forces[i].copy(p.d).multiplyScalar(amount);total.add(forces[i]);moment.add(V().crossVectors(p.p,forces[i]));effort+=amount;
 }
 return {forces,force:total,torque:moment,effort};
}
