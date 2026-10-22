import {boxCollider} from '../src/collisions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRaceWorld} from '../src/race-world.js';
import {point,frameAt} from '../src/world.js';
import {CityDefense} from '../src/city-defense.js';
import {FeidsDefense,clearMechSite,clearDropColumn,deploymentCues,TOUCHDOWNS} from '../src/feids-defense.js';
for(const mode of ['race','expedition'])test(mode+': FEIDS lands beside the arrival, activates after settling, resets without duplication',()=>{
 const world=createRaceWorld(mode),f=new FeidsDefense(world),defense={time:0,enemies:[]},race={phase:'racing',racers:[{gate:0,sim:{pos:point(0,0)}}]};
 assert.ok(f.site);assert.ok(f.mechs.every(m=>clearMechSite(world,m.x,m.z)));assert.ok(Math.hypot(f.site.x-world.race.deck.x,f.site.z-world.race.deck.z)<150);
 f.step(.025,race,defense);assert.equal(f.startedAt,null);
 race.racers[0].gate=Math.ceil(world.race.gates.length*.65);f.step(.025,race,defense);assert.equal(f.time,0);assert.ok(f.mechs.every(m=>!m.active));
 for(const t of [6.3,6.7,13.1,14.1,16.2,19.3,22]){defense.time=t;f.step(.025,race,defense);}
 assert.equal(f.events.filter(e=>e.type==='split').length,2);assert.deepEqual(f.events.filter(e=>e.type==='impact').map(e=>e.at),TOUCHDOWNS);assert.ok(f.mechs.every(m=>m.active));
 const m=f.mechs[0],before={x:m.x,z:m.z};defense.enemies=[{id:99,dead:0,position:point(m.x+30,m.z+30),x:m.x+30,z:m.z+30}];for(let i=0;i<200;i++){defense.time+=.025;f.step(.025,race,defense);}
 assert.ok(m.distance>0);assert.ok(Math.hypot(m.x-before.x,m.z-before.z)>0);assert.ok(f.mechs.every(m=>clearMechSite(world,m.x,m.z)));
 f.reset();assert.equal(f.time,-1);assert.equal(f.events.length,0);assert.equal(f.mechs.length,4);assert.ok(f.mechs.every(m=>!m.active&&!m.landed));
});
test('each mech sound reaches its four-second hit at its own authored touchdown, followed by rubble',()=>{
 const cues=deploymentCues();for(let i=0;i<4;i++){assert.equal(cues.find(c=>c.id==='mech-'+i).at+4,TOUCHDOWNS[i]);assert.ok(cues.find(c=>c.id==='rubble-'+i).at>TOUCHDOWNS[i]);}assert.equal(cues.filter(c=>c.name==='feids_reentry').length,2);
});
test('disabled mobile weapons cannot acquire or fire while packed in the capsule',()=>{
 const world=createRaceWorld();world.colliders=[];world.holes=[];const g={id:0,type:'lancer',enabled:false,origin:point(0,0,3),range:100,cooldown:.1,damage:2},d=new CityDefense(world,[g]);d.nextWave=Infinity;d.addEnemy({x:10,z:0,side:-1},'gorogoro');for(let i=0;i<100;i++)d.step(.025,{phase:'racing',racers:[]});assert.equal(d.stats.fired,0);assert.equal(g.engaged,false);g.enabled=true;for(let i=0;i<100;i++)d.step(.025,{phase:'racing',racers:[]});assert.ok(d.stats.fired>0);
});

test('a bridge with clear ground beneath it still blocks the mech descent corridor',()=>{const world=createRaceWorld();world.colliders=[boxCollider({origin:point(0,0,8),frame:frameAt(point(0,0)),w:10,d:10,h:2},'overhead-bridge')];assert.equal(clearDropColumn(world,0,0),false);assert.equal(clearDropColumn(world,20,0),true);});
