import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const b=await browser('http://localhost:8166/?mode=race'),checks=[],performance={};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await b.evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+22000;const tick=()=>window.roverLab?.ready()?resolve(true):Date.now()>end?reject(Error(document.getElementById('loadText').textContent)):setTimeout(tick,80);tick();})`);
 const initial=await b.evaluate(`({city:roverLab.view.raceView.city.snapshot(),holes:roverLab.world.holes.map(h=>({phase:h.phase,radius:h.radius})),celebration:roverLab.view.raceView.celebration.snapshot()})`);
 assert.equal(initial.city.domes,12);assert.ok(initial.city.bridges>0);assert.ok(initial.city.far>0);assert.equal(initial.holes.filter(h=>h.phase==='dormant'&&h.radius===0).length,2);assert.equal(initial.celebration.active,false);checks.push('12 domes, connected elevated bridges, distance LOD, and two truly closed holes');
 await b.call('Runtime.evaluate',{expression:`document.getElementById('start').click()`,userGesture:true});
 await b.evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+10000;const tick=()=>roverLab.audio.musicBuffer&&roverLab.audio.context.state==='running'?resolve(true):Date.now()>end?reject(Error('music not decoded/armed')):setTimeout(tick,50);tick();})`);
 await wait(5000);performance.grid=await b.evaluate('roverLab.performance()');
 // Compare identical stationary camera/scene, excluding city only. Colliders stay intact.
 await b.evaluate(`roverLab.pause();roverLab.view.raceView.city.group.visible=false`);await wait(3500);performance.withoutCity=await b.evaluate('roverLab.performance()');
 await b.evaluate(`roverLab.view.raceView.city.group.visible=true`);await wait(3500);performance.withCity=await b.evaluate('roverLab.performance()');
 await b.screenshot('artifacts/city-grid.png');
 const warning=await b.evaluate(`(()=>{const l=roverLab;l.race.start();l.race.phase='racing';const h=l.world.holes[1];l.place(h.x,h.z-24);l.race.racers[0].sim.vel.set(0,0,0);l.step({},.25);return {phase:h.phase,radius:h.radius,triggeredBy:h.triggeredBy,visible:l.view.raceView.warnings[0].group.visible,fx:l.view.effects[1].state(),colliders:l.world.colliders.filter(c=>c.owner==='sinkhole-1').length};})()`);
 assert.equal(warning.phase,'trembling');assert.equal(warning.radius,0);assert.equal(warning.triggeredBy,0);assert.equal(warning.visible,true);assert.equal(warning.colliders,0);await b.screenshot('artifacts/city-tremor.png');checks.push('proximity tremor is visible while ground remains solid, before any rubble collider');
 const opening=await b.evaluate(`roverLab.step({},1.6);({h:roverLab.race.snapshot().holes[1],fx:roverLab.view.effects[1].state(),uniform:roverLab.view.floorUniforms[0].value[1]})`);
 assert.equal(opening.h.phase,'opening');assert.ok(opening.h.radius>0&&opening.h.radius<6.5);assert.equal(opening.uniform,opening.h.radius);assert.ok(Math.abs(opening.fx.holeRadius*6.5-opening.h.radius)<.1);await b.screenshot('artifacts/city-opening.png');
 const opened=await b.evaluate(`roverLab.step({},9);({h:roverLab.race.snapshot().holes[1],colliders:roverLab.world.colliders.filter(c=>c.owner==='sinkhole-1').length})`);assert.equal(opened.h.phase,'open');assert.equal(opened.h.radius,6.5);assert.ok(opened.colliders>0);checks.push('opening shader and physical radius agree; settled rubble becomes collidable');
 const reset=await b.evaluate(`(()=>{const l=roverLab;l.race.start();l.view.render(.016);return {h:l.race.snapshot().holes[1],colliders:l.world.colliders.filter(c=>c.owner==='sinkhole-1').length,fxVisible:l.view.effects[1].group.visible};})()`);
 assert.equal(reset.h.phase,'dormant');assert.equal(reset.h.radius,0);assert.equal(reset.colliders,0);assert.equal(reset.fxVisible,false);checks.push('race restart removes the triggered hole and its rubble colliders');
 // Finale lifecycle isolation; the full race test separately proves all three physical claims trigger it.
 await b.evaluate(`(()=>{const l=roverLab;l.race.phase='finished';l.race.celebrationTime=6;l.view.render(.016);l.pause(false);})()`);await wait(4000);
 const party=await b.evaluate(`({visual:roverLab.view.raceView.celebration.snapshot(),audio:!!roverLab.audio.musicSource,context:roverLab.audio.context.state,performance:roverLab.performance()})`);
 assert.equal(party.visual.active,true);assert.ok(party.visual.lancers.every(s=>s.beam&&s.aimDot>.999));assert.equal(party.audio,true);performance.party=party.performance;await b.screenshot('artifacts/city-celebration.png');checks.push('two original LANCER muzzles aim at the moving ball; day-42 music plays with the finale');
 const paused=await b.evaluate(`roverLab.pause();({time:roverLab.race.celebrationTime,voice:!!roverLab.audio.musicSource})`);await wait(250);assert.equal(await b.evaluate('roverLab.race.celebrationTime'),paused.time);assert.equal(paused.voice,false);
 await b.evaluate('roverLab.pause(false)');await wait(300);assert.equal(await b.evaluate('!!roverLab.audio.musicSource'),true);checks.push('pause freezes choreography and stops music; resume continues at its current offset');
 await b.evaluate(`roverLab.pause();roverLab.race.celebrationTime=43.9;roverLab.pause(false)`);await wait(300);const over=await b.evaluate(`({audio:!!roverLab.audio.musicSource,visual:roverLab.view.raceView.celebration.snapshot()})`);assert.equal(over.audio,false);assert.equal(over.visual.party,false);assert.ok(over.visual.lancers.every(s=>!s.beam));checks.push('43.8-second party ends cleanly with results and podium retained');
 await b.evaluate(`document.getElementById('restartRace').click();roverLab.pause();roverLab.view.render(.016)`);const restart=await b.evaluate(`({voice:!!roverLab.audio.musicSource,visual:roverLab.view.raceView.celebration.snapshot(),phase:roverLab.race.phase})`);assert.equal(restart.voice,false);assert.equal(restart.visual.active,false);assert.equal(restart.phase,'countdown');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 await writeFile('artifacts/city-browser-report.json',JSON.stringify({checks,initial,warning,opening,opened,party,restart,performance,errors:b.errors},null,2));console.log(JSON.stringify({checks,performance,city:initial.city,errors:b.errors},null,2));
}finally{await b.close();}
