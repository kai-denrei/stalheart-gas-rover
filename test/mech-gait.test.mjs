import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Object3D,Group,Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {MechGait} from '../src/mech-gait.js';
import {point,frameAt,coords} from '../src/world.js';
// Test forward kinematics against the shipped rig hierarchy, not just IK targets.
const bytes=readFileSync(new URL('../assets/ridgeback-mech/mx06_d0_lod1.glb',import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
export function rig(){const nodes=gltf.nodes.map(n=>{const o=new Object3D();o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});gltf.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));const model=new Group(),group=new Group();model.add(nodes[0]);group.scale.setScalar(.75);group.add(model);return {model,group};}
for(const [name,v,turn] of [['forward',[0,2],0],['sideways',[2,0],0],['reverse',[0,-2],0],['turn in place',[0,0],1.5],['turn and walk',[1.5,1.2],1.5]])test(name+': planted claws stay fixed while the chassis moves and all feet remain reachable',()=>{
 const {model,group}=rig(),g=new MechGait({holes:[]}),dt=.025;let x=300,z=150,yaw=0,old=new Map(),maxError=0,maxSlip=0,travel=0;
 for(let i=0;i<500;i++){
  const before=point(x,z),q=frameAt(point(x+v[0]*dt,z+v[1]*dt)).q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw+turn*dt));g.update(point(x+v[0]*dt,z+v[1]*dt),q,i*dt);group.position.copy(g.position);group.quaternion.copy(g.rotation);g.apply(model);
  travel+=before.distanceTo(g.position);const c=coords(g.position);x=c.x;z=c.z;const forward=new Vector3(0,0,1).applyQuaternion(g.rotation),frame=frameAt(g.position);yaw=Math.atan2(forward.dot(frame.east),forward.dot(frame.north));
  assert.ok(g.feet.filter(f=>f.planted).length>=3);
  for(const f of g.feet){const actual=model.getObjectByName('SOCKET_FOOT_'+f.leg.id).getWorldPosition(new Vector3());maxError=Math.max(maxError,actual.distanceTo(f.position));
   const tips=[1,2,3].map(n=>model.getObjectByName('SOCKET_CLAW_'+f.leg.id+'_'+n).getWorldPosition(new Vector3())),prior=old.get(f.leg.id);
   if(f.planted&&prior?.planted)for(let j=0;j<3;j++)maxSlip=Math.max(maxSlip,tips[j].distanceTo(prior.tips[j]));old.set(f.leg.id,{planted:f.planted,tips});
  }
 }
 assert.ok(maxError<.001,`FK foot error ${maxError}`);assert.ok(maxSlip<.00001,`planted tip drift ${maxSlip}`);assert.ok(g.steps>10,`steps ${g.steps}`);if(v.some(n=>n))assert.ok(travel>5,`mech stalled: ${travel} m`);else assert.ok(Math.abs(yaw)>.5);
});
test('stopping completes lifted legs and leaves all six feet anchored; reset discards old anchors',()=>{
 const {model,group}=rig(),g=new MechGait({holes:[]});for(let i=0;i<80;i++)g.update(point(0,i*.03),frameAt(point(0,i*.03)).q,i*.025);
 const p=g.position.clone(),q=g.rotation.clone();for(let i=80;i<120;i++)g.update(p,q,i*.025);assert.equal(g.feet.filter(f=>f.planted).length,6);group.position.copy(g.position);group.quaternion.copy(g.rotation);g.apply(model);const feet=g.feet.map(f=>f.position.toArray());g.update(p,q,4);assert.deepEqual(g.feet.map(f=>f.position.toArray()),feet);g.reset();g.update(point(200,0),frameAt(point(200,0)).q,0);assert.equal(g.steps,0);assert.ok(g.feet.every(f=>f.position.distanceTo(point(200,0))<4));
});
test('rapid hunting direction changes keep real claws anchored without stretching legs',()=>{
 const {model,group}=rig(),g=new MechGait({holes:[]});let p=point(105,210),q=frameAt(p).q,drift=0,error=0;const previous=new Map();
 for(let i=0;i<1800;i++){
  const frame=frameAt(p),sign=(Math.floor(i/17)%2?1:-1),travel=frame.east.clone().multiplyScalar(Math.sin(Math.floor(i/13)*1.7)*.05).addScaledVector(frame.north,Math.cos(Math.floor(i/13)*1.7)*.05);const c=coords(p.clone().add(travel));
  g.update(point(c.x,c.z),q.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),sign*.0375)),i*.025);p=g.position.clone();q=g.rotation.clone();group.position.copy(p);group.quaternion.copy(q);g.apply(model);
  for(const f of g.feet){const actual=model.getObjectByName('SOCKET_FOOT_'+f.leg.id).getWorldPosition(new Vector3());error=Math.max(error,actual.distanceTo(f.position));const tip=model.getObjectByName('SOCKET_CLAW_'+f.leg.id+'_1').getWorldPosition(new Vector3()),old=previous.get(f.leg.id);if(f.planted&&old?.planted)drift=Math.max(drift,tip.distanceTo(old.tip));previous.set(f.leg.id,{tip,planted:f.planted});}
 }assert.ok(error<.001,`unreachable foot: ${error}`);assert.ok(drift<.00001,`claw drift: ${drift}`);
});
