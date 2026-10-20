import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const b=await browser(process.env.LAB_URL||'http://localhost:8166/?mode=expedition'),report={},wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const tick=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(tick,100);tick()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 await b.evaluate(`(async()=>{const l=roverLab,{Vector3,Quaternion}=await import('./upstream/stalheart/vendor/three.module.js'),d=l.world.race.deck,r=l.race.racers[0],s=l.sim;l.race.phase='racing';l.race.racers.slice(1).forEach(r=>r.penalty=999);r.gate=l.world.race.gates.length;r.stunts.score=777;s.pos.copy(d.origin).addScaledVector(d.frame.east,-8).addScaledVector(d.frame.north,-28).addScaledVector(d.frame.up,d.h+1.1);s.q.copy(d.frame.q).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI));s.vel.set(0,0,0);s.omega.set(0,0,0);s.spent=s.tune.capacity;s.contactCount=0;s.bodyContacts=0;s.wheelContact.fill(false);s.grounded=false;s.supportTime=0;s.motion.capture();l.view.cameraInitialized=false;l.step({controlActive:true},.6);l.step({},3);})()`);
 report.warning=await b.evaluate(`({idle:roverLab.sim.inverted,gas:roverLab.sim.reserve,text:document.getElementById('raceInstruction').textContent})`);
 assert.ok(report.warning.idle>2.9);assert.equal(report.warning.gas,0);assert.match(report.warning.text,/OVERTURNED · RECOVERY IN/);
 await wait(200);assert.equal(await b.evaluate('roverLab.sim.inverted'),report.warning.idle,'pause freezes timer');
 await b.evaluate('roverLab.pause(false)');
 await b.call('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyQ',key:'q'});await wait(250);
 report.cancelled=await b.evaluate('roverLab.pause();({idle:roverLab.sim.inverted,penalties:roverLab.race.racers[0].penalties})');
 await b.call('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyQ',key:'q'});
 assert.equal(report.cancelled.idle,0);assert.equal(report.cancelled.penalties,0);
 await b.evaluate('roverLab.step({},4.9)');assert.equal(await b.evaluate('roverLab.race.racers[0].penalties'),0);
 await b.screenshot('artifacts/overturned-recovery-warning.png');
 report.recovered=await b.evaluate(`roverLab.step({},.2);({race:roverLab.race.snapshot(),sim:roverLab.state(),capacity:roverLab.sim.tune.capacity,label:document.querySelector('#racePenalty span').textContent})`);
 const r=report.recovered.race.racers[0];assert.equal(r.penalties,1);assert.ok(r.penalty>2.8);assert.equal(r.lastPenaltyReason,'OVERTURNED');assert.equal(r.gate,35);assert.equal(r.stunts.score,777);assert.equal(report.recovered.sim.gas,report.recovered.capacity);assert.ok(report.recovered.sim.tilt<1);assert.equal(report.recovered.label,'PENALTY');
 await b.screenshot('artifacts/overturned-recovery-penalty.png');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));report.errors=b.errors;
 await writeFile('artifacts/overturned-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify({warning:report.warning,cancelled:report.cancelled,recovered:{gate:r.gate,gas:report.recovered.sim.gas,penalty:r.penalty,score:r.stunts.score},errors:b.errors},null,2));
}finally{await b.close();}
