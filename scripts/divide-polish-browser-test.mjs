import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const b=await browser(process.env.LAB_URL||'http://localhost:8166/?mode=expedition',{watchdogMs:180000}),report={};
try{
 await b.evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+24000;const tick=()=>window.roverLab?.ready()?resolve(true):Date.now()>end?reject(Error(document.getElementById('loadText').textContent)):setTimeout(tick,100);tick()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 report.start=await b.evaluate(`roverLab.step({},2.1);({diegetic:roverLab.view.raceView.startLights.snapshot(),overlay:!!document.getElementById('raceStartLights'),phase:document.getElementById('racePhase').textContent,arrows:!!roverLab.view.scene.getObjectByName('Circuit / direction chevrons')})`);
 assert.equal(report.start.diegetic.lit,3);assert.equal(report.start.overlay,false);assert.equal(report.start.arrows,false);assert.equal(report.start.phase,'THE GREAT DIVIDE');
 await b.screenshot('artifacts/divide-start.png');
 report.penalty=await b.evaluate(`(()=>{const l=roverLab,r=l.race.racers[0];l.race.phase='racing';l.race.racers.slice(1).forEach(r=>r.penalty=999);l.race.recover(r,'OUT OF BOUNDS');const values=[];for(let i=0;i<3;i++){l.step({},i?1:.01);const el=document.getElementById('racePenalty');values.push({shown:!el.hidden,number:el.querySelector('strong').textContent,label:el.querySelector('span').textContent});}return values;})()`);
 assert.deepEqual(report.penalty.map(p=>p.number),['3','2','1']);assert.ok(report.penalty.every(p=>p.shown&&p.label==='PENALTY'));
 await b.screenshot('artifacts/divide-penalty.png');
 report.gate=await b.evaluate(`(()=>{const l=roverLab,r=l.race.racers[0],g=l.world.race.gates[0];r.penalty=0;r.pendingRespawn=false;l.sim.recovering=false;r.gate=0;l.place(g.x,g.z,3);l.step({},.025);return {gate:r.gate,grounded:l.sim.grounded,penaltyHidden:document.getElementById('racePenalty').hidden};})()`);
 assert.equal(report.gate.gate,1);assert.equal(report.gate.grounded,false);assert.equal(report.gate.penaltyHidden,true);
 report.impact=await b.evaluate(`(async()=>{const l=roverLab,d=l.view.raceView.defense.defense,r=l.race.racers[0];const {resolveEnemyContact}=await import('./src/enemy-contacts.js');const {frameAt}=await import('./src/world.js');l.place(490,-110,.46);l.sim.vel.copy(frameAt(l.sim.pos).north).multiplyScalar(14);l.sim.enemyPrevious=l.sim.pos.clone();d.enemies=[];d.time=1;d.nextWave=d.nextBoss=9999;const e=d.addEnemy({x:490,z:-107.5,side:1},'cutis');const before=l.sim.vel.length();resolveEnemyContact(r,e,d);l.sim.motion.capture();l.view.stepEffects(.025);l.view.render(.016);return {before,after:l.sim.vel.length(),knock:e.knock?.length(),dead:e.dead,fx:l.view.raceView.defense.impacts.snapshot()};})()`);
 assert.ok(report.impact.after<report.impact.before);assert.ok(report.impact.knock>0);assert.equal(report.impact.fx.active,1);
 await b.screenshot('artifacts/divide-ram-impact.png');
 await b.evaluate(`roverLab.view.raceView.defense.impacts.step(.6);roverLab.view.raceView.defense.impacts.update()`);
 assert.equal(await b.evaluate('roverLab.view.raceView.defense.impacts.snapshot().active'),0);
 report.finish=await b.evaluate(`(()=>{const l=roverLab,d=l.world.race.deck;l.race.phase='finished';l.race.celebrationTime=20;l.place(d.x,d.z-25,d.h+3);l.view.isao.unlocked=true;l.view.isao.active=false;l.view.render(.016);const hole=l.view.scene.getObjectByName('sky-hole'),p=hole.getWorldPosition(l.sim.pos.clone()),direction=p.clone().sub(d.origin).normalize(),clip=p.clone().project(l.view.camera);return {elevation:Math.asin(direction.dot(d.frame.up)),screen:clip.toArray()};})()`);
 assert.ok(report.finish.elevation>.08);assert.ok(Math.abs(report.finish.screen[0])<1);assert.ok(Math.abs(report.finish.screen[1])<1);
 await b.screenshot('artifacts/divide-finish-sky.png');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));report.errors=b.errors;await writeFile('artifacts/divide-polish-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await b.close();}
