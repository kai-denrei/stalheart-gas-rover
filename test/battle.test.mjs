import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {point,coords,frameAt} from '../src/world.js';
import {launchQuiver,advanceQuiver} from '../src/quiver-flight.js';
import {CityDefense,segmentBlocked} from '../src/city-defense.js';
import {CombatSpatial} from '../src/combat-spatial.js';
import {boxCollider} from '../src/collisions.js';
import {createRaceWorld} from '../src/race-world.js';
import {discoReleases,crowdBudget,crowdFrame} from '../src/battle-rules.js';

test('Quiver follows the original unlit ejection/fall, ignition, climb and faster dive on the lab sphere',()=>{
 const from=point(0,0,36),to=point(120,80,.8),f=launchQuiver(from,to,new Vector3(.56,.83,0).normalize()),phases=new Set();let p,previous=from,fall=false,ignited=false,lastHeight=36,climbSpeed=0,diveSpeed=0;
 for(let i=0;i<900;i++){p=advanceQuiver(f,1/120,to);phases.add(p.phase);const h=coords(p.position).h,speed=p.position.distanceTo(previous)*120;if(p.phase==='Fall'){assert.equal(p.ignition,false);if(h<lastHeight)fall=true;}if(p.ignition)ignited=true;else if(!ignited)assert.ok(h<44.1,'opening height stays capped in metres');if(p.phase==='Climb')climbSpeed=Math.max(climbSpeed,speed);if(p.phase==='Dive')diveSpeed=Math.max(diveSpeed,speed);lastHeight=h;previous=p.position;if(p.done)break;}
 for(const phase of ['Eject','Coast','Fall','Ignite','Climb','Crest','Dive'])assert.ok(phases.has(phase),phase);assert.ok(fall);assert.ok(diveSpeed>climbSpeed);assert.ok(p.done);assert.ok(p.position.distanceTo(to)<.001);
});
test('a Quiver snapshots its climb and only starts tracking a moved target beyond the apex',()=>{
 const a=point(0,0,35),b=point(140,0,.8),dir=new Vector3(.56,.83,0).normalize(),f=launchQuiver(a,b,dir),g=launchQuiver(a,b,dir),moved=point(140,30,.8);let diverged=false;
 for(let i=0;i<600;i++){const p=advanceQuiver(f,1/120,b),q=advanceQuiver(g,1/120,moved);if(!f.crestT)assert.ok(p.position.distanceTo(q.position)<1e-8);else if(p.position.distanceTo(q.position)>1)diverged=true;if(p.done)break;}assert.ok(diverged);
});
test('crowd queue holds overflow without deleting living enemies and resumes as room opens',()=>{
 const w=createRaceWorld();w.colliders=[];w.holes=[];const d=new CityDefense(w,[]),race={phase:'racing',racers:[]};d.setLoad(40,false);d.spawn();d.nextWave=999;for(let i=0;i<40;i++)d.step(.025,race);assert.equal(d.enemies.length,40);assert.equal(d.pending.length,56);for(const e of d.enemies.slice(0,10))d.kill(e);for(let i=0;i<80;i++)d.step(.025,race);assert.equal(d.enemies.length,40);assert.equal(d.pending.length,46);assert.equal(d.stats.spawned,50);
});
test('shared adaptive crowd policy backs off on slow frames, and only grows on a populated fast field',()=>{
 const c=crowdBudget();for(let i=0;i<50;i++)crowdFrame(c,40,360);assert.ok(c.cap<360);const cap=c.cap;for(let i=0;i<500;i++)crowdFrame(c,16,0);assert.equal(c.cap,cap);for(let i=0;i<120;i++)crowdFrame(c,16,c.cap);assert.ok(c.cap>cap);
});
test('the disco clock releases two staggered salvos with a seven-second gap and one distant triple-size blast',()=>{
 const done=new Set(),all=[];for(const t of [0,.2,1.1,2.4,8,43])for(const s of discoReleases(t,done)){all.push(s);done.add(s.i);}assert.deepEqual(all.map(s=>s.at),[0,.8,1.6,8.6,9.4,10.2]);assert.equal(all[3].at-all[2].at,7);assert.deepEqual(all.map(s=>s.size),[1,1,1,1,1,3]);assert.ok(all[5].target[1]>all[4].target[1]);assert.equal(discoReleases(8,done).length,0);done.clear();assert.equal(discoReleases(2,done).length,3);
});
test('spatial shot query retains the same blocked/open decisions as the full convex scene',()=>{
 const w=createRaceWorld(),index=new CombatSpatial(w);for(let x=-20;x<160;x+=17)for(const h of [1,12,45]){const a=point(x,0,h),b=point(x+20,180,h);assert.equal(segmentBlocked(w,a,b,index),segmentBlocked(w,a,b));}
 w.colliders.push(boxCollider({w:8,d:8,h:12,origin:point(-30,40),frame:frameAt(point(-30,40))},'new-wall'));index.rebuild();assert.ok(segmentBlocked(w,point(-30,30,3),point(-30,50,3),index));
});
