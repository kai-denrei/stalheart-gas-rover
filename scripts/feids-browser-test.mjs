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
  await b.evaluate(`(()=>{const l=roverLab,f=l.view.raceView.defense.feids;l.race.racers[0].gate=Math.ceil(l.world.race.gates.length*.65);l.race.phase='racing';l.step({},.1);return f.snapshot();})()`);
  const snaps=[];
  for(const seconds of [6.25,6.8,6.3,10]){await b.evaluate(`roverLab.step({},${seconds})`);snaps.push(await b.evaluate('roverLab.view.raceView.defense.feids.snapshot()'));}
  assert.ok(snaps[0].events.some(e=>e.type==='split'));assert.equal(snaps.at(-1).mechs.filter(m=>m.active).length,4);assert.equal(snaps.at(-1).events.filter(e=>e.type==='impact').length,4);
  await b.evaluate(`(()=>{const l=roverLab,v=l.view,f=v.raceView.defense.feids,s=f.controller.site;l.place(s.x,s.z,1);v.mode='orbit';v.distance=32;v.pitch=.55;v.orbit=.8;v.cameraInitialized=false;v.render(.016);})()`);
  await b.screenshot('artifacts/feids-'+mode+'.png');
  // Isolate live targets so existing orbitals cannot erase the firing fixture.
  const combat=await b.evaluate(`(()=>{const l=roverLab,d=l.view.raceView.defense,f=d.feids,s=f.controller.site;for(const g of d.defense.guns)if(g.mech===undefined)g.enabled=false;d.orbital.step=()=>{};d.defense.nextWave=1e9;d.defense.pending=[];d.defense.enemies=[];for(let i=0;i<4;i++){const m=f.controller.mechs[i];d.defense.addEnemy({x:m.x+22,z:m.z+25,side:-1,goal:m.x+100},'gorogoro').hp=10000;}l.step({},16);return {feids:f.snapshot(),battle:d.defense.snapshot()};})()`);
  assert.ok(combat.feids.mechs.some(m=>m.distance>1));assert.ok(combat.feids.weapons.flat().some(g=>g.type==='quiver'&&g.fired>0));assert.ok(combat.feids.weapons.flat().some(g=>g.type==='rotor'&&g.fired>0));assert.ok(combat.feids.weapons.flat().some(g=>g.type==='lancer'&&g.fired>0));
  // Pause/resume audio seeks each full recording, preserving its 4-second hit.
  const audio=await b.evaluate(`(async()=>{const l=roverLab,a=l.audio;await a.arm();const cues=l.view.raceView.defense.feids.audio().cues;a.syncFeids({key:'test',time:8,cues},false);const first=a.feidsScheduled.map(c=>({...c})),epoch=a.feidsEpoch;a.syncFeids({key:'test',time:8,cues},true);const stopped=a.feidsVoices===null;a.syncFeids({key:'test',time:10,cues},false);const resumed=a.feidsScheduled.map(c=>({...c}));a.stopFeids();return {first,epoch,stopped,resumed,durations:Object.fromEntries(['feids_reentry','mech_reentry','mech_rubble'].map(n=>[n,a.combatBuffers[n].duration]))};})()`);
  assert.ok(audio.stopped);for(const c of audio.first.filter(c=>c.impact!==null))assert.ok(Math.abs(c.impact-audio.epoch-(c.at+4-8))<1e-6);assert.ok(audio.resumed.find(c=>c.id==='mech-0').offset>0);
  const reset=await b.evaluate(`(()=>{const l=roverLab,d=l.view.raceView.defense;const before=l.view.renderer.info.memory.geometries;l.race.start();d.update();return {snapshot:d.feids.snapshot(),visible:d.feids.root.visible,before,after:l.view.renderer.info.memory.geometries};})()`);
  assert.equal(reset.visible,false);assert.equal(reset.snapshot.time,-1);assert.equal(reset.snapshot.events.length,0);assert.ok(reset.after<=reset.before);assert.deepEqual(b.errors,[]);
  report[mode]={snaps,combat,audio,reset,errors:b.errors};console.log(mode,'FEIDS passed');
 }finally{await b.close();await writeFile('artifacts/feids-browser-report.json',JSON.stringify(report,null,2));}
}
