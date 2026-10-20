import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,commands} from '../src/simulation.js';
import {createWorld,point,frameAt} from '../src/world.js';
import {fleetSelection} from '../src/rover-families.js';
import {createRaceWorld} from '../src/race-world.js';
import {Race} from '../src/race.js';
import {boxCollider} from '../src/collisions.js';
import {pilot} from '../src/race-ai.js';

test('fleet selection excludes omitted types and preserves the proving-ground default',()=>{
 assert.deepEqual(fleetSelection(new URLSearchParams()).types,['r47xs','xb12','r47x','xb12','r47xs']);
 assert.ok(!fleetSelection(new URLSearchParams('fleet=new&rover=r47x')).types.includes('r47x'));
 assert.deepEqual(new Set(fleetSelection(new URLSearchParams('fleet=r47xs')).types),new Set(['r47xs']));
 assert.equal(fleetSelection(new URLSearchParams(),false).types[0],'r47x');
 assert.equal(fleetSelection(new URLSearchParams('rover=xb12'),false).types[0],'xb12');
 assert.equal(fleetSelection(new URLSearchParams('fleet=__proto__&rover=constructor')).fleet,'mixed');
});
test('XB-12 drives on four real wheel stations with full traction and no phantom middle axle',()=>{
 const s=new Simulation(createWorld());s.setFamily('xb12');s.pos.copy(point(0,-170,.46));s.q.copy(frameAt(s.pos).q);s.motion.capture();
 for(let i=0;i<180;i++)s.step({...commands(),drive:1});
 assert.equal(s.contactCount,4);assert.equal(s.traction,1);assert.deepEqual(s.wheelContact,[true,false,true,true,false,true]);
 assert.ok(s.vel.length()>9);assert.equal(s.wheelSpin[1],0);assert.equal(s.wheelSpin[4],0);
 assert.ok(s.wheelSpin[2]>2);assert.ok(s.solids.every(shape=>![1,4].includes(shape.wheel)));
 assert.equal(s.wheels[0].x,-1.2);assert.equal(s.wheels[0].z,-1.475);
 s.reset();assert.equal(s.family,'xb12');assert.equal(s.contactCount,4);assert.equal(s.damage.family,'xb12');
});
test('XB-12 whole-rover damage degrades steering and disables a wreck, then repairs cleanly',()=>{
 const s=new Simulation(createWorld());s.setFamily('xb12');
 s.damage.points.WHEEL_FL=6;s.damage.refresh();
 assert.equal(s.damage.assetLevel,2);assert.equal(s.damage.wreck,false);assert.deepEqual(s.damage.effects.wheelSteer,[.5,1]);
 assert.equal(s.damage.effects.drive,.7);
 s.damage.destroy({speed:25});assert.equal(s.damage.assetLevel,3);assert.equal(s.damage.effects.drive,0);assert.equal(s.damage.effects.steer,0);
 s.reset();assert.equal(s.damage.assetLevel,0);assert.equal(s.damage.effects.drive,1);
});
test('AI escapes a cleared corner pole without bypassing an uncleared gate',()=>{
 const w=createRaceWorld('expedition'),race=new Race(w,new Simulation(w)),r=race.racers[3];r.sim.setFamily('xb12');r.gate=8;
 race.placeRover(r,42,62,Math.PI/2);r.sim.pos.copy(point(42,62,3));r.sim.grounded=false;r.sim.contactCount=0;r.sim.supportTime=0;
 const p=point(44,61),pole=boxCollider({origin:p,frame:frameAt(p),w:.2,d:.2,h:4.6},'flag-7--1-Pole_shaft');w.colliders=[pole];
 const escaping=pilot(r,race,1/120);assert.ok(escaping.steer>.2);assert.ok(escaping.yaw<-.3);assert.equal(r.gate,8);
 pole.id='flag-8--1-Pole_shaft';
 const approaching=pilot(r,race,1/120);assert.ok(Math.abs(approaching.yaw)<.02);assert.equal(r.gate,8);
});
test('podium claims include the XB-12 outer wheel width',()=>{
 const w=createRaceWorld(),race=new Race(w,new Simulation(w)),r=race.racers[0],spot=w.race.spots[0],d=w.race.deck;
 r.sim.pos.copy(spot.origin).addScaledVector(d.frame.up,.44).addScaledVector(d.frame.east,2.8);r.sim.q.copy(d.frame.q);
 r.sim.grounded=true;r.sim.vel.set(0,0,0);r.sim.omega.set(0,0,0);
 assert.equal(race.insideSpot(r,spot),true);r.sim.setFamily('xb12');assert.equal(race.insideSpot(r,spot),false);
 r.sim.pos.copy(spot.origin).addScaledVector(d.frame.up,.44);assert.equal(race.insideSpot(r,spot),true);
});
