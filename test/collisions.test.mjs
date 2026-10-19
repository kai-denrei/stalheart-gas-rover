import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3,Group,InstancedMesh,DodecahedronGeometry,MeshBasicMaterial,Matrix4} from '../upstream/stalheart/vendor/three.module.js';
import {boxCollider,sphereContact,bakeSinkholeColliders} from '../src/collisions.js';
import {createWorld,point,frameAt,localOnSphere,RADIUS} from '../src/world.js';
import {Simulation,commands,STEP} from '../src/simulation.js';
const run=(s,t)=>{for(let i=0;i<Math.round(t/STEP);i++)s.step(commands());};
function fixture(w,h,d,start=-7,height=.46,speed=18){const world=createWorld(),origin=point(0,-120),frame=frameAt(origin);world.colliders=[boxCollider({w,h,d,origin,frame},'test-solid')];const s=new Simulation(world);s.pos.copy(origin).addScaledVector(frame.up,height).addScaledVector(frame.north,start);s.q.copy(frame.q);s.vel.copy(frame.north).multiplyScalar(speed);s.grounded=false;s.supportTime=0;s.age=2;s.tune.assistance='manual';s.motion.capture();return {s,frame};}
test('full-speed bumper stops on a 12 cm post between old corner probes',()=>{const {s,frame}=fixture(.12,1.37,.12);run(s,.65);assert.ok(localOnSphere(s.pos,frame).z<-2);assert.ok(s.vel.length()<4);assert.equal(s.lastCollision.collider,'test-solid');assert.equal(s.lastCollision.zone,'front');assert.equal(s.lastCollision.severity,'heavy');});
test('thin-wall collision records a world-space point and outward normal',()=>{const {s,frame}=fixture(7,3,.12);run(s,.65);assert.ok(localOnSphere(s.pos,frame).z<-2);assert.ok(new Vector3(...s.lastCollision.normal).dot(frame.north)<-.99);assert.ok(s.lastCollision.point.every(Number.isFinite));});
test('extreme-speed post impact stops the rover and leaves visible damage until recovery',()=>{const {s,frame}=fixture(.12,1.37,.12,-7,.46,60);run(s,.4);assert.ok(s.events.some(e=>e.type==='collision'&&e.speed>40));assert.ok(Object.values(s.damage.states).some(d=>d===3));assert.ok(localOnSphere(s.pos,frame).z<0);assert.ok(s.vel.length()<3);assert.equal(s.events.filter(e=>e.type==='reset').length,1);s.reset();assert.ok(Object.values(s.damage.states).every(d=>d===0));});
test('wheel contacts support a rover landing on a raised solid',()=>{const {s,frame}=fixture(10,1.2,10,0,4,0);run(s,6);assert.ok(s.grounded);assert.ok(s.contactCount>=2);assert.ok(Math.abs(localOnSphere(s.pos,frame).h-1.64)<.04);assert.ok(s.vel.length()<.05);const count=s.events.filter(e=>e.type==='collision').length;run(s,1);assert.equal(s.events.filter(e=>e.type==='collision').length,count);});
test('an airborne rover can clear a low barrier without an invisible tall wall',()=>{const {s,frame}=fixture(7,1.2,.12,-7,5,18);run(s,.65);assert.ok(localOnSphere(s.pos,frame).z>3);assert.equal(s.lastCollision,null);});
test('settled instanced rock collider follows mesh and spherical shader transforms',()=>{
 const group=new Group();group.position.copy(point(70,90));group.quaternion.copy(frameAt(group.position).q);group.scale.setScalar(10);
 const mesh=new InstancedMesh(new DodecahedronGeometry(.1,0),new MeshBasicMaterial(),1);mesh.setMatrixAt(0,new Matrix4().makeTranslation(.6,.1,.8));group.add(mesh);
 const fx={group,tune:{planetRadius:RADIUS/10}},colliders=bakeSinkholeColliders(fx,'sinkhole-test');assert.equal(colliders.length,1);assert.ok(sphereContact(colliders[0],colliders[0].center,.1));assert.equal(sphereContact(colliders[0],colliders[0].center.clone().add(new Vector3(10,0,0)),.1),null);
 // Original instance center mapped onto the planet must lie inside the convex rock.
 const local=new Vector3(.6,.1,.8),d=Math.hypot(local.x,local.z),r=RADIUS/10,a=d/r;local.set(local.x*Math.sin(a)/d*(r+.1),Math.cos(a)*(r+.1)-r,local.z*Math.sin(a)/d*(r+.1));local.applyMatrix4(group.matrixWorld);assert.ok(sphereContact(colliders[0],local,0));mesh.geometry.dispose();mesh.material.dispose();
});
test('checkpoint reset chooses a clear spot when debris covers the pad center',()=>{
 const w=createWorld(),pad=w.pads[0];w.colliders=[boxCollider({w:.5,h:2,d:.5,origin:pad.origin,frame:pad.frame},'pad-debris')];const s=new Simulation(w);assert.ok(s.pos.distanceTo(pad.origin)>1.5);assert.ok(s.pos.distanceTo(pad.origin)<4);assert.equal(s.lastReason,'READY');
});
