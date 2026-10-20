import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {IsaoController} from '../src/isao-controller.js';
import {createRaceWorld,onCourse} from '../src/race-world.js';
import {point,coords,frameAt} from '../src/world.js';
import {boxCollider} from '../src/collisions.js';
import {trackSegments,sampleTrack} from '../src/race-track.js';
const actor=()=>{const world=createRaceWorld();world.holes=[];world.colliders=[];const view={world,scene:new T.Scene(),camera:new T.PerspectiveCamera(),sim:{pos:point(0,0,.46)}};return new IsaoController(view);};
const advance=(f,seconds)=>{for(let t=0;t<seconds;t+=1/120)f.step(1/120);};
test('ISAO is locked until race handoff, moves independently, brakes to hover, and reset revokes control',()=>{
 const f=actor(),rover=f.view.sim.pos.clone();assert.equal(f.enter(),false);f.unlock();assert.equal(f.enter(),true);const start=f.position.clone();f.keys.add('KeyW');advance(f,1);assert.ok(start.distanceTo(f.position)>9);assert.ok(f.view.sim.pos.equals(rover));f.keys.clear();advance(f,2);assert.ok(f.velocity.length()<.001);f.present(.016,.5);assert.ok(f.root.position.distanceTo(f.view.camera.position)>2);f.reset();assert.equal(f.root.visible,false);assert.equal(f.enter(),false);assert.equal(f.spawned,false);
});
test('ISAO cannot fly through a wall or descend through the ground, and frozen input does not move him',()=>{
 const f=actor();f.unlock();f.enter();f.yaw=0;f.position.copy(point(0,0,3));f.capture();f.view.world.colliders.push(boxCollider({w:20,d:1,h:10,origin:point(0,6),frame:frameAt(point(0,6))},'wall'));
 f.keys.add('KeyW');advance(f,2);assert.ok(coords(f.position).z<5);assert.ok(f.contacts>0);f.keys.clear();f.keys.add('ShiftLeft');f.keys.add('Space');advance(f,2);assert.ok(coords(f.position).h>=f.radius-.01);
 f.keys.clear();advance(f,2);const p=f.position.clone();f.keys.add('KeyW');for(let i=0;i<120;i++)f.step(1/120,false);assert.ok(f.position.distanceTo(p)<.001);
});
test('painted track boundary matches race penalty boundary, with kerbs at corners and no seams at joins',()=>{
 const world=createRaceWorld(),segments=trackSegments(world);
 for(let x=-12;x<150;x+=2.7)for(let z=-50;z<220;z+=3.1)assert.equal(sampleTrack(segments,x,z).distance<=world.race.rules.halfWidth,onCourse(world,x,z));
 assert.ok(sampleTrack(segments,7.9,30).kerb);assert.equal(sampleTrack(segments,7.9,-20).kerb,false);
 for(const [x,z] of world.race.route)assert.equal(sampleTrack(segments,x,z).distance,0);
});
test('ISAO turns without strafing, flies forward/back along his heading, and separates orbit from yaw',()=>{
 const f=actor();f.unlock();f.enter();f.position.copy(point(0,0,20));f.capture();f.present(.016,1);f.view.camera.updateMatrixWorld(true);const screenRight=new T.Vector3().setFromMatrixColumn(f.view.camera.matrixWorld,0),start=f.position.clone();f.keys.add('KeyA');advance(f,1);assert.ok(f.position.distanceTo(start)<.001);assert.ok(new T.Vector3(0,0,1).applyQuaternion(f.rotation).dot(screenRight)< -.9);const heading=f.yaw;f.look(150,0);assert.equal(f.yaw,heading);f.keys.clear();f.keys.add('KeyW');advance(f,1);assert.ok(f.position.clone().sub(start).dot(screenRight)< -9);assert.ok(Math.abs(coords(f.position).z)<2);f.keys.clear();f.keys.add('KeyS');advance(f,2);assert.ok(f.position.clone().sub(start).dot(screenRight)>7);assert.equal(f.yaw,heading);
 f.keys.clear();advance(f,2);const h=coords(f.position).h;f.keys.add('ShiftLeft');f.keys.add('Space');advance(f,1);assert.ok(coords(f.position).h<h-6);f.keys.clear();f.keys.add('Space');advance(f,2);assert.ok(coords(f.position).h>h+4);
});

test('ISAO Shift alone holds altitude and Shift Space descends instead of cancelling lift',()=>{const f=actor();f.unlock();f.enter();f.position.copy(point(0,0,20));f.capture();f.keys.add('ShiftRight');advance(f,1);assert.ok(Math.abs(coords(f.position).h-20)<.01);f.keys.add('Space');advance(f,1);assert.ok(coords(f.position).h<14);});
test('ISAO sustained W ramps smoothly to triple cruise speed and release, reverse and blocked input reset the ramp',()=>{
 const f=actor();f.unlock();f.enter();f.position.copy(point(0,0,40));f.capture();f.keys.add('KeyW');
 const speeds=[];for(let i=0;i<5;i++){advance(f,1);speeds.push(f.velocity.length());}
 assert.ok(speeds[0]>12&&speeds[0]<16);assert.ok(speeds[1]>speeds[0]+5);assert.ok(speeds[3]>35);assert.ok(speeds.every(v=>v<36.01));
 f.keys.clear();advance(f,.5);assert.equal(f.forwardHeld,0);assert.ok(f.velocity.length()<1.2);
 f.keys.add('KeyS');advance(f,1);assert.ok(f.velocity.length()<12.01);assert.equal(f.forwardHeld,0);
 f.keys.clear();f.keys.add('KeyW');advance(f,2);f.step(1/120,false);assert.equal(f.forwardHeld,0);f.reset();assert.equal(f.forwardHeld,0);
});
