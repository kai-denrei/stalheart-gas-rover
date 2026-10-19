import test from 'node:test';import assert from 'node:assert/strict';
import {createRaceWorld} from '../src/race-world.js';import {point,frameAt} from '../src/world.js';import {boxCollider} from '../src/collisions.js';import {CityDefense,segmentBlocked} from '../src/city-defense.js';
test('sentry line of fire is blocked by a building, but open above it',()=>{const w=createRaceWorld();w.colliders=[boxCollider({origin:point(0,0),frame:frameAt(point(0,0)),w:5,d:5,h:10},'test-wall')];assert.ok(segmentBlocked(w,point(-10,0,5),point(10,0,5)));assert.equal(segmentBlocked(w,point(-10,0,20),point(10,0,20)),false);});
test('sentry shots damage and kill real targets, with bounded waves and a clean restart',()=>{const w=createRaceWorld();w.colliders=[];w.holes=[];const guns=[{id:0,type:'lancer',x:200,z:44,origin:point(200,44,35),range:150,cooldown:.1,damage:2}],def=new CityDefense(w,guns),race={phase:'racing',racers:[]};for(let i=0;i<2400;i++)def.step(.05,race);assert.ok(def.stats.spawned>20);assert.ok(def.stats.fired>2);assert.ok(def.stats.killed>0);assert.ok(def.stats.peak<=def.budget.cap);assert.ok(def.stats.peak>=200);race.phase='finished';const time=def.time;def.step(1,race);assert.ok(def.time>time,'combat continues after the finish for exploration');w.race.hazardGeneration=(w.race.hazardGeneration||0)+1;def.step(.05,race);assert.equal(def.enemies.length,0);assert.equal(def.stats.fired,0);});
test('Needle switches from an obstructed hard target and fires a discrete hitscan at a clear target',()=>{
 const w=createRaceWorld();w.holes=[];w.colliders=[boxCollider({origin:point(200,20),frame:frameAt(point(200,20)),w:8,d:4,h:12},'needle-wall')];
 const gun={id:0,type:'needle',x:200,z:0,origin:point(200,0,3),range:100,cooldown:2,damage:8},def=new CityDefense(w,[gun]),race={phase:'racing',racers:[]};def.nextWave=9999;
 const enemy=(id,x,z,kind)=>({id,x,z,px:x,pz:z,position:point(x,z,.8),velocity:point(0,0,0).set(0,0,0),kind,hp:20,dead:0,age:0,speed:0,direction:1,goal:1000});
 const hard=enemy(10,200,40,'gorogoro'),clear=enemy(11,230,0,'reed');def.enemies=[hard,clear];
 for(let i=0;i<20;i++)def.step(.025,race);assert.equal(hard.hp,20);assert.equal(clear.hp,12);assert.equal(gun.beam,null);assert.equal(def.projectiles.length,0);assert.equal(def.stats.fired,1);assert.ok(def.stats.blocked>0);
});
test('Needle waits a full reload after acquiring a late target instead of firing catch-up rounds',()=>{
 const w=createRaceWorld();w.colliders=[];w.holes=[];const origin=point(200,0,3),gun={id:0,type:'needle',x:200,z:0,origin,range:100,cooldown:2,damage:8},def=new CityDefense(w,[gun]),race={phase:'racing',racers:[]};def.nextWave=9999;gun.aim=()=>def.time<3?null:origin;
 def.enemies=[{id:10,x:230,z:0,px:230,pz:0,position:point(230,0,.8),velocity:origin.clone().set(0,0,0),kind:'gorogoro',hp:1000,dead:0,age:0,speed:0,direction:1,goal:1000}];
 for(let i=0;i<124;i++)def.step(.025,race);assert.equal(def.stats.fired,1);for(let i=0;i<72;i++)def.step(.025,race);assert.equal(def.stats.fired,1);for(let i=0;i<12;i++)def.step(.025,race);assert.equal(def.stats.fired,2);
});
