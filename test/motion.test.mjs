import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {RoverCameraHeading} from '../src/rover-camera-heading.js';
import {Simulation,STEP,commands} from '../src/simulation.js';
import {createWorld,point,frameAt} from '../src/world.js';
function cruise(){const s=new Simulation(createWorld());s.pos.copy(point(0,-180,20));s.q.copy(frameAt(s.pos).q);s.vel.set(0,0,18);s.grounded=false;s.supportTime=0;s.contactCount=0;s.wheelContact.fill(false);s.tune.gravity=0;s.tune.assistance='manual';s.omega.set(0,.3,0);s.motion.capture();return s;}
for(const hz of [50,60,75,144,240])test(`smooth constant-speed presentation at ${hz} FPS with 120 Hz physics`,()=>{
 const s=cruise();let accumulator=0,previous=null,previousQ=null;
 for(let frame=0;frame<hz*2;frame++){
  accumulator+=1/hz;while(accumulator+1e-12>=STEP){s.step(commands());accumulator-=STEP;}
  const p=s.motion.sample(accumulator/STEP);
  if(frame>3){assert.ok(Math.abs(p.pos.distanceTo(previous)-18/hz)<1e-8);assert.ok(Math.abs(p.q.angleTo(previousQ)-.3/hz)<1e-7);}
  previous=p.pos.clone();previousQ=p.q.clone();
 }
});
test('render sampling leaves authoritative simulation unchanged',()=>{
 const s=cruise();for(let i=0;i<30;i++)s.step({...commands(),drive:1,lift:1});const before=JSON.stringify(s.snapshot()),spin=s.wheelSpin.slice(),forces=s.burn.forces.map(v=>v.toArray());
 for(let i=0;i<100;i++)s.motion.sample((i%10)/10);
 assert.equal(JSON.stringify(s.snapshot()),before);assert.deepEqual(s.wheelSpin,spin);assert.deepEqual(s.burn.forces.map(v=>v.toArray()),forces);
});
test('reset snaps every render phase to the checkpoint without a return sweep',()=>{
 const s=cruise();for(let i=0;i<100;i++)s.step(commands());s.reset();
 for(const a of [0,.25,.75,1]){const p=s.motion.sample(a);assert.ok(p.pos.distanceTo(s.pos)<1e-10);assert.ok(p.q.angleTo(s.q)<1e-7);assert.deepEqual(p.wheelSpin,s.wheelSpin);assert.equal(p.steering,0);}
});
test('chase heading stays continuous through repeated sagittal and coronal flips, including vertical poses',()=>{
 for(const axis of [new Vector3(1,0,0),new Vector3(0,0,1)]){
  const s=cruise(),frame=frameAt(s.pos),heading=new RoverCameraHeading();s.q.copy(frame.q);
  const start=heading.update(s,1/60,true).clone();
  for(let i=1;i<=720;i++){s.age+=1/60;s.q.copy(frame.q).multiply(new Quaternion().setFromAxisAngle(axis,i*Math.PI/90));assert.ok(heading.update(s,1/60).dot(start)>.999999);}
 }
});
test('chase heading follows transverse yaw and eases to a sideways landing without a cut',()=>{
 const s=cruise(),frame=frameAt(s.pos),heading=new RoverCameraHeading();s.q.copy(frame.q);heading.update(s,1/60,true);
 for(let i=1;i<=360;i++){s.age+=1/60;s.q.copy(frame.q).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),i*Math.PI/90));const previous=heading.forward.clone(),f=heading.update(s,1/60);assert.ok(f.dot(previous)>.999);assert.ok(f.dot(new Vector3(0,0,1).applyQuaternion(s.q))>.999999);}
 for(const axis of [new Vector3(1,0,0),new Vector3(0,0,1)])for(let i=0;i<90;i++){s.age+=1/60;s.q.multiply(new Quaternion().setFromAxisAngle(axis,Math.PI/90));heading.update(s,1/60);}
 // Pitch then roll by 180° leaves the chassis upright facing the other way.
 s.contactCount=6;const before=heading.forward.clone();s.age+=1/60;heading.update(s,1/60);assert.ok(heading.forward.dot(before)>.96);assert.ok(heading.forward.dot(before)<.999);
 s.age=0;s.q.copy(frame.q);assert.ok(heading.update(s,1/60).dot(frame.north)>.999999);
});
