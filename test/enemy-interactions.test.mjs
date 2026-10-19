import test from 'node:test';import assert from 'node:assert/strict';
import {CityDefense} from '../src/city-defense.js';
import {createRaceWorld} from '../src/race-world.js';
import {point,frameAt,terrainSample} from '../src/world.js';
import {Simulation} from '../src/simulation.js';
import {resolveEnemyContact} from '../src/enemy-contacts.js';
import {holeClearance} from '../src/enemy-navigation.js';
import {gunshipSafe} from '../src/orbital-safety.js';
import {boxCollider} from '../src/collisions.js';
import {reedAdvance,reedRoot} from '../src/reed-gait.js';
import {REED_GAIT} from '../src/reed-gait-data.js';
const setup=()=>{const world=createRaceWorld();world.colliders=[];world.holes=[];const d=new CityDefense(world,[]);d.nextWave=d.nextBoss=9999;return {world,d};};
test('all enemy families route around a bowl, including the wide canyon, without walking over its surface',()=>{
 for(const radius of [12,42])for(const kind of ['reed','cutis','gorogoro','nih-daira']){const {world,d}=setup();world.holes=[{x:0,z:0,r:radius,radius,phase:'open',origin:point(0,0),frame:frameAt(point(0,0))}];const e=d.addEnemy({x:-radius*1.7-12,z:0,side:-1,goal:500},kind);e.age=-100;e.speed=5;const race={phase:'racing',racers:[]};let distance=Infinity;
  for(let i=0;i<6000&&e.x<radius*1.7+5;i++){d.tick(.025,race);distance=Math.min(distance,Math.hypot(e.x,e.z));assert.equal(e.dead,0,`${kind} died at ${radius}m hole`);assert.equal(terrainSample(world,e.position,false).hole,null);}
  assert.ok(distance>=holeClearance(world.holes[0],e)-.001);assert.ok(e.x>radius*1.7,`${kind} did not pass: ${e.x},${e.z}`);
 }
});
test('enemies reserve the full rim while a Tremor is warning and spawn outside open holes',()=>{const {world,d}=setup();const h={x:0,z:0,r:12,radius:0,phase:'trembling',origin:point(0,0),frame:frameAt(point(0,0))};world.holes=[h];const e=d.addEnemy({x:0,z:0,side:-1,goal:200},'reed');assert.ok(Math.hypot(e.x,e.z)>holeClearance(h,e));});
test('every living enemy type physically pushes back and takes damage from a rover impact',()=>{
 for(const kind of ['reed','cutis','gorogoro','nih-daira']){const {world,d}=setup(),sim=new Simulation(world),r={id:0,sim};sim.pos.copy(point(0,0,.46));sim.q.copy(frameAt(sim.pos).q);sim.vel.copy(frameAt(sim.pos).north).multiplyScalar(14);sim.enemyPrevious=sim.pos.clone();const e=d.addEnemy({x:0,z:kind==='nih-daira'?4.4:2.5,side:1,goal:-200},kind);e.velocity.set(0,0,0);const hp=e.hp;assert.ok(resolveEnemyContact(r,e,d),kind);assert.ok(e.hp<hp,kind);assert.ok(sim.damage.hits>0,kind);assert.ok(sim.vel.length()<14,kind);assert.ok(sim.pos.toArray().every(Number.isFinite));const hits=sim.damage.hits;resolveEnemyContact(r,e,d);assert.equal(sim.damage.hits,hits);}
});
test('an airborne rover clears enemies and protected or recovering racers are ignored',()=>{const {world,d}=setup(),sim=new Simulation(world),r={id:0,sim};sim.pos.copy(point(0,0,12));sim.vel.set(0,0,15);const e=d.addEnemy({x:0,z:0,side:1},'reed');assert.equal(resolveEnemyContact(r,e,d),false);sim.pos.copy(point(0,0,.46));r.place=1;assert.equal(resolveEnemyContact(r,e,d),false);r.place=null;r.pendingRespawn=true;assert.equal(resolveEnemyContact(r,e,d),false);assert.equal(sim.damage.hits,0);});
test('SOL kills all non-boss targets on the first contact, leaving the boss damage budget intact',()=>{const {d}=setup();const enemies=['reed','cutis','gorogoro','nih-daira'].map(kind=>d.addEnemy({x:0,z:0,side:1},kind));const hp=enemies.at(-1).hp;assert.equal(d.solarStrike(point(0,0),8),4);assert.ok(enemies.slice(0,3).every(e=>e.dead));assert.equal(enemies.at(-1).dead,0);assert.ok(enemies.at(-1).hp<hp&&enemies.at(-1).hp>hp-1);});
test('Gunship waits for a clear path past a friendly structure, then can fire from a clear angle',()=>{const world={colliders:[boxCollider({w:14,d:14,h:45,origin:point(0,0),frame:frameAt(point(0,0))},'gantry-column')]},race={racers:[]},target=point(45,0,.8);assert.equal(gunshipSafe(world,race,target,{source:point(-45,0,75),radius:4.5}),false);assert.equal(gunshipSafe(world,race,target,{source:point(45,-60,100),radius:4.5}),true);race.racers=[{sim:{pos:target.clone()}}];assert.equal(gunshipSafe(world,race,target,{source:point(45,-60,100)}),false);});
test('Reed root travel matches its pose clock, stops at zero speed, and has uneven pull/rest motion',()=>{const e={size:1.1,speed:3.8,phase:.4};let travel=0;for(let i=0;i<240;i++)travel+=reedAdvance(e,.025);assert.ok(Math.abs(travel-(reedRoot(e.gaitTime)-reedRoot(.4))*e.size)<1e-8);const old=e.gaitTime;e.speed=0;assert.equal(reedAdvance(e,.5),0);assert.equal(e.gaitTime,old);const speeds=REED_GAIT.root.slice(1).map((x,i)=>(x-REED_GAIT.root[i])*REED_GAIT.fps);assert.ok(Math.max(...speeds)>Math.min(...speeds)*3);});

test('a newly warning Tremor makes walkers already near its rim retreat instead of freezing',()=>{const {world,d}=setup();const e=d.addEnemy({x:14,z:0,side:1,goal:-200},'cutis');world.holes=[{x:0,z:0,r:12,radius:0,phase:'trembling',origin:point(0,0),frame:frameAt(point(0,0))}];for(let i=0;i<40;i++)d.tick(.025,{phase:'racing',racers:[]});assert.ok(e.x>15);assert.equal(e.dead,0);});

test('a fast rover sweep cannot tunnel through a small enemy between combat ticks',()=>{const {world,d}=setup(),sim=new Simulation(world),r={id:0,sim};sim.pos.copy(point(0,5,.46));sim.enemyPrevious=point(0,-5,.46);sim.q.copy(frameAt(sim.pos).q);sim.vel.copy(frameAt(sim.pos).north).multiplyScalar(30);const e=d.addEnemy({x:0,z:0,side:1},'reed');assert.ok(resolveEnemyContact(r,e,d));assert.ok(e.dead);assert.equal(sim.damage.hits,1);assert.ok(sim.vel.toArray().every(Number.isFinite));});
