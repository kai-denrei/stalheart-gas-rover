import test from 'node:test';import assert from 'node:assert/strict';
import {Race} from '../src/race.js';import {Simulation,commands,STEP} from '../src/simulation.js';
import {createRaceWorld} from '../src/race-world.js';import {point,frameAt} from '../src/world.js';
import {boxCollider} from '../src/collisions.js';import {respawnClear} from '../src/race-respawn.js';
import {trafficState,TRAFFIC} from '../src/base-traffic.js';
const setup=()=>{const w=createRaceWorld(),race=new Race(w,new Simulation(w));race.phase='racing';return {w,race};};
test('five simultaneous recoveries reserve distinct clear spots and do not add kinetic energy',()=>{
 const {race}=setup();for(const r of race.racers){r.gate=3;r.sim.pos.copy(point(400,400));}for(const r of race.racers)race.recover(r);
 for(const r of race.racers){assert.equal(r.pendingRespawn,false);assert.ok(respawnClear(race,r,r.sim.pos,r.sim.q));assert.equal(r.gate,3);assert.equal(r.penalties,1);}
 for(let i=0;i<360;i++)race.step(commands());for(const r of race.racers){assert.ok(r.sim.vel.length()<.1);assert.ok(r.sim.omega.length()<.1);}
});
test('occupied recovery space is checked again when its penalty expires',()=>{
 const {race}=setup(),r=race.racers[0],other=race.racers[1];r.gate=3;race.recover(r);other.sim.pos.copy(r.sim.pos);other.sim.q.copy(r.sim.q);other.penalty=20;r.penalty=STEP;race.step(commands());assert.ok(r.pendingRespawn||r.sim.pos.distanceTo(other.sim.pos)>6.5);assert.equal(r.penalties,1);
});
test('a blocked recovery queues without an unsafe fallback and retries when ground clears',()=>{
 const {w,race}=setup(),r=race.racers[0];r.gate=3;const blockers=w.colliders;w.colliders=[boxCollider({origin:point(60,120,-100),frame:frameAt(point(60,120)),w:1000,d:1000,h:300},'blocked-test')];race.recover(r);assert.ok(r.pendingRespawn);assert.ok(r.sim.recovering);
 race.step(commands(),3);assert.ok(r.pendingRespawn);w.colliders=blockers;for(let i=0;i<40;i++)race.step(commands());assert.equal(r.pendingRespawn,false);assert.equal(r.sim.recovering,false);assert.equal(r.penalties,1);assert.ok(r.sim.vel.length()<1);
});
test('SH02 uses the intro descent and authored landing/departure clips on a repeatable cycle',()=>{
 const t=TRAFFIC.delay;assert.equal(trafficState(t-1).visible,false);const high=trafficState(t),near=trafficState(t+2);assert.equal(high.altitude,150);assert.ok(near.altitude<high.altitude);assert.ok(near.clips.Legs_Deploy>0);
 const landed=trafficState(t+2.7);assert.equal(landed.phase,'docked');assert.equal(landed.altitude,0);assert.ok(landed.clips.Landing_Shock>0);assert.ok(landed.dust);assert.equal(landed.plume,0);
 const closing=trafficState(t+17),departed=trafficState(t+22);assert.equal(closing.phase,'departing');assert.ok(closing.clips.Top_Door_Close>0);assert.equal(departed.phase,'ascending');assert.ok(departed.clips.Legs_Retract>0);assert.ok(departed.altitude>0);assert.equal(departed.plume,1);
 assert.equal(trafficState(t+40).visible,false);assert.equal(trafficState(t+TRAFFIC.period).phase,'landing');assert.equal(trafficState(t+TRAFFIC.period).cycle,1);
});
test('SOL-88 automatic targeting keeps its footprint clear of rovers, ISAO and structures',async()=>{
 const {sol88Safe}=await import('../src/auto-sol88.js'),{w,race}=setup();w.colliders=[];
 assert.equal(sol88Safe(w,race,race.racers[0].sim.pos),false);assert.equal(sol88Safe(w,race,point(300,300)),true);
 assert.equal(sol88Safe(w,race,point(300,300),{spawned:true,position:point(305,300)}),false);
 w.colliders.push(boxCollider({origin:point(300,300),frame:frameAt(point(300,300)),w:20,d:20,h:25},'friendly-building'));
 assert.equal(sol88Safe(w,race,point(325,300)),false);
});
test('all six far dome assets separate glazing without deleting structural triangles',async()=>{
 const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('../upstream/stalheart/vendor/GLTFLoader.js'),{separateDomeShell}=await import('../src/dome-glazing.js');
 for(const role of ['habitat','research','logistics','biosphere','power','fabrication']){
  const b=await readFile(new URL(`../assets/dome-city/${role}_d0_lod2.glb`,import.meta.url)),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const body=g.scene.getObjectByName('BODY'),before=body.geometry.index.count;
  separateDomeShell(g.scene);const shell=g.scene.getObjectByName('SHELL');assert.ok(shell.isMesh);assert.equal(shell.geometry.index.count,144*3);assert.equal(body.geometry.index.count+shell.geometry.index.count,before);
  const geometry=shell.geometry;separateDomeShell(g.scene);assert.equal(shell.geometry,geometry,'idempotent after extraction');
 }
});
