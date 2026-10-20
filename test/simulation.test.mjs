import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3,Quaternion,Euler} from '../upstream/stalheart/vendor/three.module.js';
import {Simulation,commands,STEP} from '../src/simulation.js';
import {createWorld,point,coords,frameAt,terrainSample,setHoleScale,localOnSphere,upAt} from '../src/world.js';
import {allocate,gimbalAngles,NOZZLES,SOCKETS} from '../src/thrusters.js';
import {rimRadius,bowlHeight} from '../upstream/stalheart/src/core/sinkhole-shape.js';
const run=(s,c,seconds)=>{for(let i=0;i<Math.round(seconds/STEP);i++)s.step({...commands(),...c},STEP);return s;};
function airborne(){const s=new Simulation(createWorld());s.pos.copy(point(0,-30,18));s.q.copy(frameAt(s.pos).q);s.grounded=false;s.supportTime=0;s.contactCount=0;s.wheelContact.fill(false);return s;}
test('sphere frame and coordinates agree away from the pole',()=>{for(const [x,z]of [[0,0],[200,180],[-250,110]]){const p=point(x,z,7),c=coords(p);assert.ok(Math.abs(c.x-x)<1e-8);assert.ok(Math.abs(c.z-z)<1e-8);assert.ok(Math.abs(c.h-7)<1e-8);assert.ok(frameAt(p).up.dot(upAt(p))>.999999);}});
test('idle wheel support is stable and spends no gas',()=>{const s=run(new Simulation(createWorld()),{},4);assert.ok(s.grounded);assert.ok(s.vel.length()<.05);assert.ok(Math.abs(coords(s.pos).h-.44)<.04);assert.equal(s.spent,0);});
test('ground acceleration and braking are physical',()=>{const world=createWorld();world.holes=[];world.colliders=[];const s=new Simulation(world);run(s,{drive:1},2);assert.ok(coords(s.pos).z>11);assert.ok(s.vel.length()>10);const speed=s.vel.length();run(s,{drive:-1},1.4);assert.ok(s.vel.length()<speed-10);});
test('hop clears a real sinkhole and returns to ground',()=>{const s=new Simulation(createWorld());run(s,{},1);run(s,{drive:1},2.2);run(s,{drive:1,lift:1},.45);assert.equal(s.grounded,false);run(s,{},3);assert.ok(coords(s.pos).z>55);assert.ok(coords(s.pos).h>1);run(s,{drive:-1},3.4);assert.ok(s.events.some(e=>e.type==='landing'));assert.ok(s.spent>3);assert.equal(s.events.filter(e=>e.type==='reset').length,1);});
test('manual flight preserves angular momentum while assisted mode damps it with gas',()=>{const manual=airborne(),assist=airborne();manual.tune.assistance='manual';assist.tune.assistance='assisted';manual.omega.set(.2,.4,.1);assist.omega.copy(manual.omega);run(manual,{},1);run(assist,{},1);assert.ok(Math.abs(manual.omega.length()-Math.sqrt(.21))<.001);assert.ok(assist.omega.length()<manual.omega.length()*.45);assert.equal(manual.spent,0);assert.ok(assist.spent>0);});
test('lateral bursts change velocity and all three rotations have authority',()=>{const side=airborne();run(side,{steer:1},.3);assert.ok(side.vel.x<-.5);for(const axis of ['pitch','yaw','roll']){const s=airborne();s.tune.assistance='manual';run(s,{[axis]:1},.3);assert.ok(s.omega.length()>.1,axis);}});
test('allocator respects upward cone and nozzle budget',()=>{const a=allocate(new Vector3(6,12,4),new Vector3(1,-2,1),1.625);for(const f of a.forces){assert.ok(f.y>=0);assert.ok(f.length()<=1.62500001);assert.ok(Math.hypot(f.x,f.z)<=f.y*11.430001+1e-8);}assert.ok(a.force.y>5);});
test('finite gas stops every nozzle including assistance',()=>{const s=airborne();s.tune.capacity=.1;run(s,{lift:1,roll:1},.5);assert.equal(s.reserve,0);assert.ok(s.exhausted);run(s,{lift:1},.1);assert.equal(s.burn.effort,0);assert.equal(s.burn.force.length(),0);});
test('unlimited reserve tracks first exhaustion and toggling cannot refill it',()=>{const s=airborne();s.tune.capacity=.2;s.tune.unlimited=true;run(s,{lift:1},.2);const marker=structuredClone(s.exhausted);assert.ok(marker);run(s,{lift:1},.3);assert.ok(s.burn.effort>0);assert.deepEqual(s.exhausted,marker);s.tune.unlimited=false;run(s,{lift:1},.1);assert.equal(s.burn.effort,0);assert.deepEqual(s.exhausted,marker);s.reset();assert.equal(s.exhausted,null);assert.equal(s.spent,0);});
test('pad refill records checkpoint and clears expenditure',()=>{const s=new Simulation(createWorld()),p=s.world.pads[1];s.pos.copy(p.origin).addScaledVector(p.frame.up,.84);s.q.copy(p.frame.q);s.spent=70;s.refilled=false;run(s,{},3);assert.equal(s.checkpoint,1);assert.equal(s.spent,0);assert.ok(s.events.some(e=>e.type==='refill'));s.reset();assert.ok(s.pos.distanceTo(p.origin)<1);});
test('all independent sinkhole bowl samples match the reused shape',()=>{const w=createWorld();setHoleScale(w,1.2);for(const h of w.holes){for(const angle of [.1,1,2,4]){const r=.65,rr=h.r*rimRadius(angle)*r;const p=h.origin.clone().addScaledVector(h.frame.east,Math.cos(angle)*rr).addScaledVector(h.frame.north,Math.sin(angle)*rr);const local=localOnSphere(p,h.frame);const actualR=Math.hypot(local.x,local.z)/(h.r*rimRadius(Math.atan2(local.z,local.x)));assert.ok(Math.abs(terrainSample(w,p).height-h.r*bowlHeight(angle,actualR))<1e-7);}}});
test('large throat has no catch floor and falling resets',()=>{const w=createWorld(),h=w.holes[3],s=new Simulation(w);s.pos.copy(h.origin).addScaledVector(h.frame.up,-18);s.q.copy(h.frame.q);s.supportTime=0;s.grounded=false;assert.equal(terrainSample(w,h.origin).height,-Infinity);run(s,{},4);assert.ok(s.events.some(e=>e.reason==='LOST IN THE THROAT'));});
test('a bowl slip remains recoverable with lift',()=>{const s=new Simulation(createWorld());s.pos.copy(point(-65,69,1));s.q.copy(frameAt(s.pos).q);s.grounded=false;s.supportTime=0;s.contactCount=0;s.wheelContact.fill(false);run(s,{},3);assert.ok(coords(s.pos).h<0);run(s,{lift:1},1.65);assert.ok(coords(s.pos).h>0);assert.equal(s.events.filter(e=>e.type==='reset').length,1);});
test('identical fixed steps give equal states under different render cadences',()=>{function cadence(hz){const s=new Simulation(createWorld());let acc=0;for(let frame=0;frame<hz*3;frame++){acc+=1/hz;while(acc+1e-10>=STEP){s.step({...commands(),drive:1},STEP);acc-=STEP;}}return s;}const a=cadence(30),b=cadence(144);assert.ok(a.pos.distanceTo(b.pos)<1e-9);assert.ok(a.vel.distanceTo(b.vel)<1e-9);});
test('a full-speed approach collides with a low rock side instead of tunnelling',()=>{const s=new Simulation(createWorld());s.pos.copy(point(15,10,.46));s.q.copy(frameAt(s.pos).q);s.vel.set(0,0,18);run(s,{drive:1},.75);assert.ok(coords(s.pos).z<17);assert.ok(s.vel.z<5);});
test('an overturned chassis can rest on hull contacts and resets cleanly',()=>{const s=new Simulation(createWorld());s.tune.assistance='manual';s.pos.copy(point(0,-25,1.1));s.q.setFromAxisAngle(new Vector3(0,0,1),Math.PI);s.grounded=false;s.supportTime=0;s.contactCount=0;s.wheelContact.fill(false);run(s,{},9);assert.ok(s.events.some(e=>e.reason==='OVERTURNED'));assert.ok(s.grounded);assert.ok(s.vel.length()<.1);});

test('allocated forces match the new mechanical gimbals and their actual moments',()=>{
 for(const request of [[6,12,4],[-8,0,8],[0,13,0],[6,-4,-6]]){
  const a=allocate(new Vector3(...request),new Vector3(1,-2,1),1.625),sum=new Vector3(),moment=new Vector3();
  for(let i=0;i<8;i++){
   const f=a.forces[i],angles=gimbalAngles(f,i),n=NOZZLES[i];
   assert.ok(Math.abs(angles.pitch)<=n.pitch+1e-10);assert.ok(angles.roll>=n.roll[0]-1e-10&&angles.roll<=n.roll[1]+1e-10);
   const direction=new Vector3(0,1,0).applyAxisAngle(new Vector3(0,0,1),n.cant).applyQuaternion(new Quaternion().setFromEuler(new Euler(angles.pitch,0,angles.roll)));
   if(f.length()>1e-8)assert.ok(direction.dot(f.clone().normalize())>.999999);
   assert.ok(f.length()<=1.62500001&&f.y>=0);sum.add(f);moment.add(new Vector3().crossVectors(SOCKETS[i],f));
  }
  assert.ok(sum.distanceTo(a.force)<1e-8);assert.ok(moment.distanceTo(a.torque)<1e-8);
 }
});
test('steering and six wheel rolls advance with simulation time and reset cleanly',()=>{
 const s=run(new Simulation(createWorld()),{drive:1,steer:1},.5);
 assert.ok(s.steering<-.4);assert.equal(s.wheelSpin.length,6);assert.ok(s.wheelSpin.every(v=>v>0));
 s.reset();assert.equal(s.steering,0);assert.ok(s.wheelSpin.every(v=>v===0));
});
