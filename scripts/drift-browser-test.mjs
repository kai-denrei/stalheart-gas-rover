import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {browser} from './browser-session.mjs';
const b=await browser('http://localhost:8166/'),wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await b.evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+22000;const f=()=>window.roverLab?.ready()?resolve(true):Date.now()>end?reject(Error('load timeout')):setTimeout(f,80);f();})`);
 await b.call('Runtime.evaluate',{expression:`document.getElementById('start').click();roverLab.pause();roverLab.place(0,-100);roverLab.step({drive:1},3)`,userGesture:true});
 const key=(type,code,key,windowsVirtualKeyCode)=>b.call('Input.dispatchKeyEvent',{type,code,key,windowsVirtualKeyCode});
 await key('keyDown','KeyW','w',87);await key('keyDown','KeyX','x',88);await key('keyDown','KeyD','d',68);await b.evaluate('roverLab.pause(false)');
 // pause(false) clears held keys by design, so press again after resuming.
 await key('keyDown','KeyW','w',87);await key('keyDown','KeyX','x',88);await key('keyDown','KeyD','d',68);await wait(900);
 const drift=await b.evaluate(`({drift:roverLab.sim.drift,slip:Math.abs(roverLab.sim.vel.clone().applyQuaternion(roverLab.sim.q.clone().invert()).x),marks:roverLab.view.driftTrails.mesh.count,gas:roverLab.sim.spent,state:document.getElementById('state').textContent})`);
 assert.ok(drift.drift>.8);assert.ok(drift.slip>3);assert.ok(drift.marks>4);await b.screenshot('artifacts/rear-wheel-drift.png');
 await key('keyUp','KeyX','x',88);await key('keyUp','KeyD','d',68);await wait(1600);const released=await b.evaluate(`({drift:roverLab.sim.drift,slip:Math.abs(roverLab.sim.vel.clone().applyQuaternion(roverLab.sim.q.clone().invert()).x)})`);assert.ok(released.drift<.03);assert.ok(released.slip<.1);await key('keyUp','KeyW','w',87);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));await writeFile('artifacts/drift-browser-report.json',JSON.stringify({drift,released,errors:b.errors},null,2));console.log({drift,released,errors:b.errors});
}finally{await b.close();}
