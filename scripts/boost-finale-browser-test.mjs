import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const url=process.env.LAB_URL||'http://localhost:8166/?mode=race';
const b=await browser(url,{watchdogMs:240000}),report={url},wait=ms=>new Promise(r=>setTimeout(r,ms));
const key=(type,code)=>b.call('Input.dispatchKeyEvent',{type,code,key:code==='ShiftLeft'?'Shift':code.slice(3).toLowerCase()});
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const tick=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(tick,100);tick()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 await b.evaluate(`(()=>{const l=roverLab;l.race.phase='racing';l.race.racers.slice(1).forEach(r=>r.penalty=999);l.place(0,-30,70);l.sim.tune.assistance='manual';l.pause(false);})()`);
 await key('keyDown','ShiftLeft');await key('keyDown','KeyW');await wait(600);
 await key('keyUp','KeyW');await key('keyUp','ShiftLeft');
 report.boost=await b.evaluate('roverLab.pause();roverLab.state()');
 assert.ok(report.boost.velocity[2]>3);assert.ok(report.boost.spent>1);
 assert.ok(Math.hypot(...report.boost.angularVelocity)<.05,'boost must not pitch');
 assert.ok(report.boost.velocity[1]>-3,'boost must not add Shift down-thrust');
 // Place the racers at the finish, as in a completed race, for both city layouts.
 await b.evaluate(`(async()=>{const l=roverLab,{point}=await import('./src/world.js'),deck=l.world.race.deck;l.race.reset();l.view.stepEffects(0);l.race.racers.forEach((r,i)=>{if(!(${process.env.FAR_PLAYER==='1'}&&i===0))r.sim.pos.copy(point(deck.x+(i-2)*9,deck.z-10,deck.h+.46));r.sim.vel.set(0,0,0);r.sim.omega.set(0,0,0);r.sim.motion.capture();});l.race.phase='finished';l.race.celebrationTime=0;l.step({},.01);const f=l.view.isao;f.position.copy(point(deck.x,deck.z-55,38));f.velocity.set(0,0,0);f.capture();f.yaw=0;f.pitch=.12;f.distance=18;f.cameraInitialized=false;})()`);
 report.timeline=[];
 for(let i=0;i<24;i++){
  const snap=await b.evaluate('roverLab.step({},1);roverLab.view.raceView.defense.snapshot()');
  report.timeline.push({time:i+1,orbital:snap.orbital,effects:snap.effects});
  if(snap.orbital.salvo.length===6&&snap.orbital.salvo.every(s=>s.impact!==null))break;
 }
 const end=report.timeline.at(-1),salvo=end.orbital.salvo;
 console.log(JSON.stringify({salvo,effects:end.effects},null,2));
 assert.equal(salvo.length,6);assert.ok(salvo.every(s=>s.impact!==null));
 assert.deepEqual(salvo.map(s=>s.size),[1,1,1,1,1,3]);
 for(let i=1;i<6;i++)assert.ok(salvo[i].released-salvo[i-1].released>=(i===3?7:.8)-1e-5);
 assert.equal(salvo[5].blastRadius,165);
 assert.ok(end.effects.effects.some(e=>e.type==='nuclear'&&Math.abs(e.scale-2.16)<1e-6));
 await b.evaluate('roverLab.pause(false)');await wait(5000);
 report.performance=await b.evaluate('roverLab.performance()');
 const course=new URL(url).searchParams.get('mode')||'race';
 await b.screenshot(`artifacts/boost-finale-${course}.png`);
 await b.evaluate('roverLab.pause()');
 const frozen=await b.evaluate('roverLab.view.raceView.defense.orbital.snapshot()');await wait(100);
 assert.deepEqual(await b.evaluate('roverLab.view.raceView.defense.orbital.snapshot()'),frozen);
 report.reset=await b.evaluate('roverLab.race.reset();roverLab.view.stepEffects(0);roverLab.view.raceView.defense.orbital.snapshot()');
 assert.equal(report.reset.salvo.length,0);assert.equal(report.reset.nukes,0);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));report.errors=b.errors;
 await writeFile(`artifacts/boost-finale-${course}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({performance:report.performance,errors:report.errors},null,2));
}finally{await b.close();}
