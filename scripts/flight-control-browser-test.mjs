import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {browser} from './browser-session.mjs';
const b=await browser(process.env.LAB_URL||'http://localhost:8166/?mode=race',{watchdogMs:180000}),report={},wait=ms=>new Promise(r=>setTimeout(r,ms));
const key=(type,code,key)=>b.call('Input.dispatchKeyEvent',{type,code,key});
const setup=()=>b.evaluate(`(()=>{const l=roverLab;l.pause();l.race.phase='racing';l.race.racers.slice(1).forEach(r=>r.penalty=9999);l.race.racers[0].penalty=0;l.sim.reset('READY');l.place(0,-40,45);l.step({},.025);})()`);
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const f=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(f,100);f()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 await setup();await b.evaluate('roverLab.pause(false)');await key('keyDown','KeyW','w');await wait(450);await key('keyUp','KeyW','w');const forward=await b.evaluate('roverLab.sim.omega.length()');await key('keyDown','KeyS','s');await wait(450);await key('keyUp','KeyS','s');const reverse=await b.evaluate('roverLab.sim.omega.length()');assert.ok(forward>2);assert.ok(Math.abs(reverse)<Math.abs(forward)*.45);report.correction={forward,reverse};
 await setup();await b.evaluate('roverLab.pause(false)');await key('keyDown','ShiftLeft','Shift');await key('keyDown','Space',' ');await wait(450);await key('keyUp','Space',' ');await key('keyUp','ShiftLeft','Shift');report.down=await b.evaluate(`roverLab.pause();({vy:roverLab.sim.vel.y,kick:roverLab.sim.kickFlight,rcs:roverLab.sim.rcs.effort,gas:roverLab.sim.spent})`);assert.ok(report.down.vy<-3.5);assert.equal(report.down.kick,false);assert.ok(report.down.gas>1);
 await setup();await b.evaluate('roverLab.sim.vel.set(7,0,10);roverLab.pause(false)');await key('keyDown','KeyX','x');await wait(900);await key('keyUp','KeyX','x');report.brake=await b.evaluate('roverLab.pause();Math.hypot(roverLab.sim.vel.x,roverLab.sim.vel.z)');assert.ok(report.brake<7);

 // Hold the modifier across forward boost, coasting, reverse braking and down-thrust.
 await setup();await b.evaluate("roverLab.sim.tune.assistance='manual';roverLab.pause(false)");
 const motion=()=>b.evaluate('({time:roverLab.sim.time,v:roverLab.sim.vel.toArray(),gas:roverLab.sim.spent})');
 await key('keyDown','ShiftLeft','Shift');const start=await motion();await wait(250);const solo=await motion();assert.equal(solo.gas,start.gas);
 await key('keyDown','KeyW','w');await wait(500);await key('keyUp','KeyW','w');const boost=await motion();assert.ok(boost.v[2]-solo.v[2]>3);assert.ok(boost.gas>solo.gas+1);
 await wait(250);const coast=await motion();assert.equal(coast.gas,boost.gas);assert.ok(Math.abs((coast.v[1]-boost.v[1])/(coast.time-boost.time)+2.8)<.1,'held Shift must not add down-thrust');
 await key('keyDown','KeyS','s');await wait(500);await key('keyUp','KeyS','s');const brake=await motion();assert.ok(brake.v[2]<coast.v[2]-3);
 await key('keyDown','Space',' ');await wait(400);await key('keyUp','Space',' ');const down=await motion();assert.ok((down.v[1]-brake.v[1])/(down.time-brake.time)<-9);assert.ok(down.gas>brake.gas+1);
 await wait(200);const released=await motion();assert.equal(released.gas,down.gas);await key('keyUp','ShiftLeft','Shift');await b.evaluate('roverLab.pause();roverLab.sim.tune.assistance="stabilized"');report.modifier={start,solo,boost,coast,brake,down,released};
 report.figures=[];
 for(const figure of ['pitch','yaw','face-up']){await setup();const result=await b.evaluate(`(async()=>{const l=roverLab,r=l.race.racers[0];r.stunts.reset();if('${figure}'==='face-up'){const {Quaternion,Vector3}=await import('./upstream/stalheart/vendor/three.module.js');l.sim.q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2));}l.step({${figure==='pitch'?'pitch':'yaw'}:1,acro:true},.8);l.step({acro:true},2);return r.stunts.snapshot();})()`);assert.ok(result.score>=150,figure);report.figures.push({figure,...result});}
 assert.ok(report.figures[2].achievements['Transverse Flip']);
 // Actual Q/E keyboard mapping, not an injected simulation command.
 await setup();await b.evaluate('roverLab.pause(false)');await key('keyDown','KeyQ','q');await wait(600);await key('keyUp','KeyQ','q');report.roll=await b.evaluate('roverLab.pause();roverLab.state()');assert.ok(report.roll.kick.active);assert.ok(report.roll.kick.angle<0);await b.screenshot('artifacts/flight-reaction-jets.png');
 await b.evaluate('roverLab.step({stabilize:1},3)');assert.ok(await b.evaluate('roverLab.sim.omega.length()<.2'));
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));report.errors=b.errors;await writeFile('artifacts/flight-control-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await b.close();}
