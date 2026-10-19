import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {browser} from './browser-session.mjs';
const b=await browser('http://localhost:8166/?mode=expedition',{watchdogMs:600000}),report={};
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const f=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(f,100);f()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 report.world=await b.evaluate(`({gates:roverLab.world.race.gates.length,city:roverLab.view.raceView.city.snapshot(),holes:roverLab.world.holes.map(h=>h.r),capacity:roverLab.sim.tune.capacity,rocks:roverLab.view.raceView.wilderness.count})`);assert.equal(report.world.gates,35);assert.equal(report.world.city.bases,2);assert.equal(report.world.city.domes,24);assert.ok(report.world.holes.includes(42));
 // Keep the battle running: real city, flags, debris and roaming combat.
 report.snapshots=[];
 for(let i=0;i<90;i++){const s=await b.evaluate('roverLab.step({},10);roverLab.race.snapshot()');report.snapshots.push(s);console.log(JSON.stringify({time:s.time,phase:s.phase,r:s.racers.map(r=>[r.name,r.gate,r.place,r.penalties,r.lastPenaltyReason,Math.round(r.gas)])}));if(s.phase==='finished')break;}
 const last=report.snapshots.at(-1);await writeFile('artifacts/expedition-browser-report.json',JSON.stringify(report,null,2));assert.equal(last.phase,'finished');assert.equal(last.spots.filter(s=>s.owner!==null).length,3);assert.ok(last.racers.filter(r=>r.place).every(r=>r.gate===35));assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 console.log('PASS',last.time);
}finally{await b.close();}
