import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {Simulation,commands,STEP} from '../src/simulation.js';
import {Race} from '../src/race.js';
import {createRaceWorld} from '../src/race-world.js';
import {roverInput} from '../src/rover-input.js';
import {point,frameAt} from '../src/world.js';

const run=(race,input,seconds)=>{for(let i=0;i<Math.round(seconds/STEP);i++)race.step({...commands(),...input});};
function stranded(course='race'){
 const world=createRaceWorld(course),race=new Race(world,new Simulation(world)),r=race.racers[0],s=r.sim,d=world.race.deck;
 race.phase='racing';race.racers.slice(1).forEach(r=>r.penalty=999);r.gate=world.race.gates.length;r.stunts.score=777;
 s.pos.copy(d.origin).addScaledVector(d.frame.east,-8).addScaledVector(d.frame.north,-28).addScaledVector(d.frame.up,d.h+1.1);
 s.q.copy(d.frame.q).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI));s.vel.set(0,0,0);s.omega.set(0,0,0);
 s.tune.gasRegen=0;s.spent=s.tune.capacity;s.contactCount=0;s.bodyContacts=0;s.wheelContact.fill(false);s.grounded=false;s.supportTime=0;
 run(race,{controlActive:true},.6);
 return {world,race,r,s};
}
for(const course of ['race','expedition'])test(`${course}: empty, inverted rover after all flags recovers upright with gas and one penalty, preserving gates and points`,()=>{
 const {world,race,r,s}=stranded(course);assert.ok(s.tilt>170);assert.ok(s.bodyContacts>0);assert.equal(s.reserve,0);
 run(race,{},4.9);assert.equal(r.penalty,0);assert.ok(s.inverted>4.8);
 run(race,{},.2);assert.equal(r.penalties,1);assert.ok(r.penalty>2.8);assert.equal(r.lastPenaltyReason,'OVERTURNED');
 assert.equal(r.gate,world.race.gates.length);assert.equal(r.stunts.score,777);assert.equal(s.reserve,s.tune.capacity);assert.equal(s.inverted,0);assert.ok(s.tilt<1);
});
test('driving input cancels and restarts the full idle interval, even with an empty tank and cancelling keys',()=>{
 const {race,r,s}=stranded();run(race,{},3);assert.ok(s.inverted>2.9);
 const opposing=roverInput(new Set(['KeyW','KeyS']),false);assert.equal(opposing.pitch,0);assert.equal(opposing.controlActive,true);
 run(race,opposing,6);assert.equal(s.inverted,0);assert.equal(r.penalties,0);
 run(race,{},4.9);assert.equal(r.penalties,0);run(race,{},.2);assert.equal(r.penalties,1);
});
test('sliding on the roof above the old speed cutoff no longer prevents rescue',()=>{
 const {race,r,s,world}=stranded();world.colliders=[];world.holes=[];s.pos.copy(point(0,-30,1));s.q.copy(frameAt(s.pos).q).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI));run(race,{controlActive:true},.5);s.vel.copy(frameAt(s.pos).north).multiplyScalar(1);
 run(race,{},4.9);assert.equal(r.penalties,0);assert.ok(s.vel.length()>.5);run(race,{},.2);assert.equal(r.penalties,1);
});
test('upright idle and unsupported airborne inverted coasting never start the recovery timer',()=>{
 const {race,r,s}=stranded();s.pos.copy(point(0,-40,50));s.q.copy(frameAt(s.pos).q).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI));s.contactCount=0;s.bodyContacts=0;s.invertedSupport=0;s.tune.gravity=0;
 run(race,{},6);assert.equal(s.inverted,0);assert.equal(r.penalties,0);
 race.placeRover(r,0,-30);s.tune.gravity=2.8;run(race,{},6);assert.equal(s.inverted,0);assert.equal(r.penalties,0);
});
