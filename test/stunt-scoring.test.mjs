import test from 'node:test';import assert from 'node:assert/strict';
import {Race} from '../src/race.js';import {createRaceWorld} from '../src/race-world.js';import {Simulation,commands,STEP} from '../src/simulation.js';import {point,frameAt} from '../src/world.js';import {sphereContact} from '../src/collisions.js';
function setup(){const w=createRaceWorld(),race=new Race(w,new Simulation(w)),r=race.racers[0];race.phase='racing';race.racers.slice(1).forEach(r=>r.penalty=999);return {w,race,r,s:r.sim};}
function pose(race,r,x,z,h=12,turns=0){const s=r.sim;s.pos.copy(point(x,z,h));s.grounded=false;s.contactCount=0;s.bodyContacts=0;s.kickFlight=turns>0;s.kickTurns=turns;r.stunts.step(r,race,1/30);}
test('race scores real single and double rotations, retains points on recovery, clears on restart',()=>{
 const {race,r,s}=setup();s.pos.copy(point(0,-30,35));s.q.copy(frameAt(s.pos).q);s.grounded=false;s.contactCount=0;s.bodyContacts=0;s.supportTime=0;s.motion.capture();
 for(let t=0;t<.9;t+=STEP)race.step({...commands(),kick:1});
 for(let t=0;t<4&&r.stunts.flips<2;t+=STEP)race.step(commands());
 assert.equal(r.stunts.flips,2);assert.equal(r.stunts.score,300);assert.equal(r.stunts.achievements['Double Coronal Flip'],1);
 race.recover(r);assert.equal(r.stunts.score,300);assert.equal(r.stunts.flight,null);race.start();assert.equal(r.stunts.score,0);assert.deepEqual(r.stunts.achievements,{});
});
test('context requires a crossing and a completed turn; hovering and repeated samples do not farm points',()=>{
 const {race,r}=setup();pose(race,r,0,8);pose(race,r,0,12);pose(race,r,0,18);assert.equal(r.stunts.score,0);pose(race,r,0,19,12,1);assert.equal(r.stunts.score,600);for(let i=0;i<30;i++)pose(race,r,0,20,12,1);assert.equal(r.stunts.score,600);assert.equal(r.stunts.achievements['Sinkhole Flip'],1);
 r.stunts.reset();for(let i=0;i<30;i++)pose(race,r,0,12,12,1);assert.equal(r.stunts.score,100);
});
test('tremor bonus is earned before opening and cannot also become a sinkhole bonus later',()=>{
 const {race,r,w}=setup(),h=w.holes[1];h.phase='trembling';pose(race,r,35,127,12,1);pose(race,r,35,140,12,1);assert.equal(r.stunts.score,1100);h.phase='open';pose(race,r,35,141,12,1);assert.equal(r.stunts.score,1100);
 r.stunts.reset();h.phase='trembling';pose(race,r,35,127);pose(race,r,35,140);h.phase='open';pose(race,r,35,141,12,1);assert.equal(r.stunts.score,600);
});
test('live aliens and rivals qualify only when cleared above their bodies; dead aliens do not',()=>{
 const {race,r}=setup(),other=race.racers[1];other.penalty=0;other.sim.pos.copy(point(0,-20,.46));race.stuntEnemies=()=>[{id:1,x:0,z:-20,dead:0,kind:'reed'}];pose(race,r,0,-21,8,1);pose(race,r,0,-16,8,1);assert.equal(r.stunts.score,800);assert.equal(r.stunts.achievements['Rover Flip'],1);assert.equal(r.stunts.achievements['Alien Flip'],1);
 r.stunts.reset();race.stuntEnemies=()=>[{id:2,x:0,z:-20,dead:1}];pose(race,r,0,-21,1,1);pose(race,r,0,-16,1,1);assert.equal(r.stunts.score,100);
});
test('scores belong to each racer, ties are stable, and grounded key input awards nothing',()=>{
 const {race,r}=setup(),other=race.racers[3];pose(race,other,30,80,20,2);assert.equal(other.stunts.score,300);assert.equal(race.scoreStandings()[0].id,3);for(let i=0;i<240;i++)race.step({...commands(),kick:1});assert.equal(r.stunts.score,0);assert.equal(r.stunts.flips,0);
});
test('podium physical cylinders have a top but no old square corner collision',()=>{
 const {w}=setup(),s=w.race.spots[0],c=w.colliders.find(c=>c.id==='podium-1'),f=w.race.deck.frame;
 assert.ok(sphereContact(c,s.origin,.1));const corner=s.origin.clone().addScaledVector(f.east,4.5).addScaledVector(f.north,4.5).addScaledVector(f.up,-1);assert.equal(sphereContact(c,corner,.2),null);const side=s.origin.clone().addScaledVector(f.east,4.95).addScaledVector(f.up,-1);assert.ok(sphereContact(c,side,.2));
});
test('merged scoreboard hardware retains the open gap between its supports',async()=>{
 const T=await import('../upstream/stalheart/vendor/three.module.js'),{mergeGeometries}=await import('../upstream/stalheart/vendor/BufferGeometryUtils.js'),{housingColliders}=await import('../src/stunt-board.js');
 const a=new T.BoxGeometry(1,2,1).translate(-3,1,0),b=new T.BoxGeometry(1,2,1).translate(3,1,0),mesh=new T.Mesh(mergeGeometries([a,b]));mesh.updateMatrixWorld(true);const parts=housingColliders(mesh);assert.equal(parts.length,2);assert.ok(parts.some(c=>sphereContact(c,new T.Vector3(3,1,0),.2)));assert.ok(parts.every(c=>!sphereContact(c,new T.Vector3(0,1,0),.7)));a.dispose();b.dispose();mesh.geometry.dispose();mesh.material.dispose();
});
