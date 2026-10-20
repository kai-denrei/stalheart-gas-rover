import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const b=await browser(process.env.LAB_URL||'http://localhost:8166/?mode=expedition',{watchdogMs:180000}),report={};
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const tick=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(tick,100);tick()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 report.pads=await b.evaluate(`roverLab.view.padGroups.map(g=>({visible:g.visible,posts:g.children.filter(m=>m.geometry?.parameters?.height===1.2||m.geometry?.type==='SphereGeometry').length,children:g.children.length}))`);
 assert.ok(report.pads.some(p=>p.visible),'refill areas retained');assert.ok(report.pads.every(p=>p.posts===0));
 await b.evaluate(`(()=>{const l=roverLab;l.race.phase='racing';l.race.racers.slice(1).forEach(r=>r.penalty=999);l.place(0,-40,65);l.sim.tune.unlimited=true;const d=l.view.raceView.defense.defense;d.nextWave=d.nextBoss=99999;d.enemies=[];d.pending=[];l.view.render(.016);window.polishCamera={heading:l.view.cameraHeading.forward.clone(),previous:l.view.camera.quaternion.clone(),maxCut:0,minHeading:1};})()`);
 for(let batch=0;batch<4;batch++)await b.evaluate(`(()=>{const l=roverLab,m=window.polishCamera;for(let i=0;i<60;i++){l.step({pitch:1,acro:true},1/60);m.maxCut=Math.max(m.maxCut,m.previous.angleTo(l.view.camera.quaternion));m.minHeading=Math.min(m.minHeading,m.heading.dot(l.view.cameraHeading.forward));m.previous.copy(l.view.camera.quaternion);}})()`);
 report.camera=await b.evaluate(`({maxCut:polishCamera.maxCut,minHeading:polishCamera.minHeading,turns:roverLab.sim.figureTurns[0]})`);
 assert.ok(report.camera.turns>=3);assert.ok(report.camera.maxCut<.08,JSON.stringify(report.camera));assert.ok(report.camera.minHeading>.999);
 await b.screenshot('artifacts/rover-polish-pitch.png');
 report.wreck=await b.evaluate(`(async()=>{const l=roverLab,{point,frameAt,upAt}=await import('./src/world.js'),{Vector3,Quaternion}=await import('./upstream/stalheart/vendor/three.module.js');l.place(0,-40,5);const s=l.sim,f=frameAt(s.pos);s.q.copy(f.q).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI));s.vel.copy(f.north).multiplyScalar(25).addScaledVector(f.up,-35);s.omega.set(18,4,6);s.flightTurns=3;s.age=1;const m={maxSpeed:0,maxRise:0,maxSpin:0};for(let i=0;i<300;i++){l.step({},1/60);if(s.damage.wreck){m.maxSpeed=Math.max(m.maxSpeed,s.vel.length());m.maxRise=Math.max(m.maxRise,s.vel.dot(upAt(s.pos)));m.maxSpin=Math.max(m.maxSpin,s.omega.length());}}return {...m,wreck:s.damage.wreck,catastrophic:!!s.catastrophic,speed:s.vel.length(),contacts:s.contactCount+s.bodyContacts,fx:l.view.rig.wreckFX.snapshot()};})()`);
 assert.ok(report.wreck.wreck&&report.wreck.catastrophic);assert.ok(report.wreck.maxSpeed<7);assert.ok(report.wreck.maxRise<.8);assert.ok(report.wreck.speed<.3);assert.ok(report.wreck.contacts>0);assert.equal(report.wreck.fx.pieces,6);
 await b.screenshot('artifacts/rover-polish-settled-wreck.png');
 report.isao=await b.evaluate(`(async()=>{const l=roverLab,{point}=await import('./src/world.js');l.race.phase='finished';l.step({},.01);const f=l.view.isao;f.position.copy(point(0,-150,60));f.velocity.set(0,0,0);f.yaw=0;f.keys.clear();f.keys.add('KeyW');const speeds=[];for(let n=0;n<5;n++){for(let i=0;i<120;i++)f.step(1/120);speeds.push(f.velocity.length());}f.keys.clear();for(let i=0;i<120;i++)f.step(1/120);return {speeds,released:f.velocity.length(),held:f.forwardHeld};})()`);
 assert.ok(report.isao.speeds[0]>12&&report.isao.speeds[0]<16);assert.ok(report.isao.speeds.at(-1)>35.5);assert.ok(report.isao.speeds.every(v=>v<36.01));assert.ok(report.isao.released<.1);assert.equal(report.isao.held,0);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));report.errors=b.errors;
 await writeFile('artifacts/rover-polish-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await b.close();}
