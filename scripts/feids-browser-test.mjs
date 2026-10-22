import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const report={},base=process.env.LAB_URL||'http://localhost:8166/';
for(const mode of ['race','expedition']){
 const b=await browser(new URL('?mode='+mode,base).href,{watchdogMs:300000});
 try{
  for(let i=0;i<480;i++){if(await b.evaluate('!!window.roverLab?.ready()'))break;const error=await b.evaluate('document.getElementById("loadText")?.textContent');if(error?.startsWith('LOAD FAILED'))throw Error(error);await new Promise(r=>setTimeout(r,150));}
  assert.equal(await b.evaluate('roverLab.ready()'),true);
  await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
  const opening=await b.evaluate(`({active:roverLab.view.intro.active,hud:getComputedStyle(document.getElementById('raceHud')).visibility,countdown:roverLab.race.countdown,time:roverLab.race.time,tones:roverLab.audio.startToneHistory||[]})`);
  assert.equal(opening.active,true);assert.equal(opening.hud,'hidden');assert.equal(opening.time,0);assert.equal(opening.tones.length,0);
  const snaps=[];
  for(const seconds of [6.25,6.8,6.3,8.75]){await b.evaluate(`roverLab.step({},${seconds})`);snaps.push(await b.evaluate('roverLab.view.raceView.defense.feids.snapshot()'));}
  assert.ok(snaps[0].events.some(e=>e.type==='split'));assert.equal(snaps.at(-1).mechs.filter(m=>m.active).length,4);assert.equal(snaps.at(-1).events.filter(e=>e.type==='impact').length,4);
  const handoff=await b.evaluate(`({active:roverLab.view.intro.active,hud:getComputedStyle(document.getElementById('raceHud')).visibility,phase:roverLab.race.phase,time:roverLab.race.time})`);
  assert.equal(handoff.active,false);assert.equal(handoff.hud,'visible');assert.equal(handoff.phase,'countdown');assert.equal(handoff.time,0);
  await b.evaluate('roverLab.step({},3.2)');assert.equal(await b.evaluate('roverLab.race.phase'),'racing');
  await b.evaluate(`(()=>{const l=roverLab,v=l.view,f=v.raceView.defense.feids,s=f.controller.site;l.place(s.x,s.z,1);v.mode='orbit';v.distance=32;v.pitch=.55;v.orbit=.8;v.cameraInitialized=false;v.render(.016);})()`);
  await b.screenshot('artifacts/feids-'+mode+'.png');
  // Isolate live targets so existing orbitals cannot erase the firing fixture.
  const combat=await b.evaluate(`(async()=>{const {segmentBlocked}=await import('./src/city-defense.js'),{point}=await import('./src/world.js');const l=roverLab,d=l.view.raceView.defense,f=d.feids,s=f.controller.site;for(const g of d.defense.guns)if(g.mech===undefined)g.enabled=false;d.orbital.step=()=>{};d.defense.nextWave=1e9;d.defense.pending=[];d.defense.enemies=[];for(let i=0;i<4;i++){const m=f.controller.mechs[i];let x,z;for(let j=0;j<36;j++){const a=m.sector+j*.175;x=m.x+Math.sin(a)*24;z=m.z+Math.cos(a)*24;if(!segmentBlocked(l.world,point(m.x,m.z,2.2),point(x,z,1.5)))break;}const e=d.defense.addEnemy({x,z,side:-1,goal:x+100},'gorogoro');e.hp=10000;e.speed=0;}const launches=[];for(const g of d.defense.guns.filter(g=>g.mech!==undefined&&g.type==='quiver')){const fire=g.fire;g.fire=()=>{launches.push({mech:g.mech,id:g.id,time:d.defense.time});fire();};}l.step({},30);return {feids:f.snapshot(),battle:d.defense.snapshot(),launches};})()`);
  await writeFile('artifacts/feids-combat-'+mode+'.json',JSON.stringify(combat,null,2));
  assert.ok(combat.feids.mechs.every(m=>m.distance>1));assert.ok(new Set(combat.launches.map(s=>s.time)).size>3);assert.ok(combat.feids.weapons.flat().some(g=>g.type==='quiver'&&g.fired>0));assert.ok(combat.feids.weapons.flat().some(g=>g.type==='rotor'&&g.fired>0));assert.ok(combat.feids.weapons.flat().some(g=>g.type==='lancer'&&g.fired>0));
  for(let i=0;i<4;i++){const ids=[...new Set(combat.launches.filter(s=>s.mech===i).map(s=>s.id))];assert.equal(ids.length,2);const times=ids.map(id=>combat.launches.filter(s=>s.id===id).map(s=>s.time));assert.ok(Math.abs(times[0][1]-times[1][1])>.1,'paired Quivers must separate their repeat salvos');}
  // Pause/resume audio seeks each full recording, preserving its 4-second hit.
  const audio=await b.evaluate(`(async()=>{const l=roverLab,a=l.audio;await a.arm();const cues=l.view.raceView.defense.feids.audio().cues;a.syncFeids({key:'test',time:8,cues},false);const first=a.feidsScheduled.map(c=>({...c})),epoch=a.feidsEpoch;a.syncFeids({key:'test',time:8,cues},true);const stopped=a.feidsVoices===null;a.syncFeids({key:'test',time:10,cues},false);const resumed=a.feidsScheduled.map(c=>({...c}));a.stopFeids();return {first,epoch,stopped,resumed,durations:Object.fromEntries(['feids_reentry','mech_reentry','mech_rubble'].map(n=>[n,a.combatBuffers[n].duration]))};})()`);
  assert.ok(audio.stopped);for(const c of audio.first.filter(c=>c.impact!==null))assert.ok(Math.abs(c.impact-audio.epoch-(c.at+4-8))<1e-6);assert.ok(audio.resumed.find(c=>c.id==='mech-0').offset>0);
  const reset=await b.evaluate(`(()=>{const l=roverLab,d=l.view.raceView.defense;const before=l.view.renderer.info.memory.geometries;l.race.start();d.update();return {snapshot:d.feids.snapshot(),visible:d.feids.root.visible,before,after:l.view.renderer.info.memory.geometries};})()`);
  assert.equal(reset.visible,false);assert.equal(reset.snapshot.time,-1);assert.equal(reset.snapshot.events.length,0);assert.ok(reset.after<=reset.before);assert.deepEqual(b.errors,[]);
  // Restart/skip must deploy all four without replaying impacts or advancing the race.
  const skipped=await b.evaluate(`(()=>{const l=roverLab;document.getElementById('restartRace').click();l.pause();document.getElementById('skipIntro').click();l.pause();l.view.render(.016);return {active:l.view.intro.active,feids:l.view.raceView.defense.feids.snapshot(),phase:l.race.phase,time:l.race.time};})()`);
  assert.equal(skipped.active,false);assert.equal(skipped.phase,'countdown');assert.equal(skipped.time,0);assert.ok(skipped.feids.mechs.every(m=>m.active));assert.equal(skipped.feids.events.length,6);
  await b.evaluate("document.getElementById('restartRace').click();roverLab.pause();document.getElementById('introPause').click()");
  const t0=await b.evaluate('roverLab.view.intro.time');await new Promise(r=>setTimeout(r,250));assert.ok(await b.evaluate('roverLab.view.intro.time')>t0);
  await b.call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyP',key:'p'});const t1=await b.evaluate('roverLab.view.intro.time');await new Promise(r=>setTimeout(r,150));assert.equal(await b.evaluate('roverLab.view.intro.time'),t1);
  await b.call('Input.dispatchKeyEvent',{type:'keyDown',code:'Escape',key:'Escape'});await b.evaluate('roverLab.pause()');assert.equal(await b.evaluate('roverLab.view.intro.active'),false);assert.deepEqual(b.errors,[]);
  report[mode]={opening,handoff,snaps,combat,audio,reset,skipped,errors:b.errors};console.log(mode,'FEIDS passed');
 }finally{await b.close();await writeFile('artifacts/feids-browser-report.json',JSON.stringify(report,null,2));}
}
