import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {Vector3,Group} from '../upstream/stalheart/vendor/three.module.js';
import {createGantryCollisions} from '../src/gantry-collisions.js';import {blocked} from '../src/collisions.js';
import {createRaceWorld} from '../src/race-world.js';import {Simulation,commands,STEP} from '../src/simulation.js';
import {celebrationPose} from '../upstream/stalheart/src/domain/disco-celebration.js';
const bytes=readFileSync(new URL('../assets/celebration/terraformer_3000_d0_lod1.glb',import.meta.url));
async function fixture(course){const world=createRaceWorld(course),deck=world.race.deck,a=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),housing=new Group();housing.position.copy(deck.origin);housing.quaternion.copy(deck.frame.q);const g=a.scene;g.position.set(0,deck.h,2);housing.add(g);
 const p=celebrationPose(0);for(const [node,tr,axis,key] of [['GANTRY_TRAVEL_Y','position','z','gantryZ'],['CARRIAGE_TRAVEL_X','position','x','carriageX'],['TOOL_LIFT_Z','position','y','liftY'],['J1_BASE_YAW','rotation','y','j1Yaw'],['J2_SHOULDER','rotation','z','j2Shoulder'],['J3_ELBOW','rotation','z','j3Elbow'],['J5_WRIST_PITCH','rotation','z','j5Wrist']])g.getObjectByName(node)[tr][axis]=p[key];
 const rig=createGantryCollisions(g,world),at=(x,y,z)=>new Vector3(x,y,z).applyMatrix4(g.matrixWorld);return {world,deck,g,rig,at};}
for(const course of ['race','expedition'])test(`${course}: model-derived gantry collides with feet, pillars, rails and overhead beams while preserving underpass`,async()=>{
 const {world,deck,g,rig,at}=await fixture(course);assert.ok(rig.colliders.length>20&&rig.colliders.length<400);assert.ok(rig.colliders.every(c=>c.planes.every(p=>Number.isFinite(p.constant))));
 for(const x of [-16,16]){assert.ok(blocked(world,at(x,1,0),.4),'foot');assert.ok(blocked(world,at(x,12,0),.4),'pillar');assert.ok(blocked(world,at(x,.8,-18),.15),'rail');}
 assert.ok(blocked(world,at(8,25,1.4),.3),'cross beam');
 for(let z=-10;z<=15;z++)assert.equal(blocked(world,at(7,1,z),.35),false,`open underpass ${z}`);
 const s=new Simulation(world);s.pos.copy(at(7,.46,-10));s.q.copy(deck.frame.q);s.vel.copy(deck.frame.north).multiplyScalar(8);s.contactCount=6;s.age=2;for(let i=0;i<300;i++)s.step({...commands(),drive:.45});assert.ok(g.worldToLocal(s.pos.clone()).z>7);assert.ok(!s.lastCollision?.collider.startsWith('gantry-'));
 // Move the visible carriage: the proxies follow, while their broad-phase
 // envelopes remain valid without rebuilding the battle grid every frame.
 const c=rig.colliders.find(c=>c.id.includes('GANTRY_TRAVEL_Y')),before=c.center.clone();g.getObjectByName('GANTRY_TRAVEL_Y').position.z=3.2;g.updateWorldMatrix(true,true);rig.update();assert.ok(Math.abs(c.center.distanceTo(before)-3.2)<1e-6);assert.ok(c.center.distanceTo(c.spatialCenter)+c.radius<=c.spatialRadius);
});
