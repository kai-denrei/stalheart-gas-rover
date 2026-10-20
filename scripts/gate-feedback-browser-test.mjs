import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const base=process.env.LAB_URL||'http://localhost:8166/',report={};
for(const mode of ['race','expedition']){
 const b=await browser(new URL('?mode='+mode,base).href,{watchdogMs:180000});
 try{
  for(let i=0;i<600;i++){if(await b.evaluate('!!window.roverLab?.ready()'))break;await new Promise(r=>setTimeout(r,150));}
  assert.equal(await b.evaluate('roverLab.ready()'),true);
  await b.evaluate(`document.getElementById('start').click();roverLab.pause();roverLab.race.phase='racing';roverLab.race.racers.slice(1).forEach(r=>r.penalty=999);roverLab.race.emit('gate',{id:1,gate:1});roverLab.view.render(.016);`);
  assert.equal(await b.evaluate('roverLab.view.raceView.gates[0].flash.strength'),0);
  await b.evaluate(`(async()=>{const l=roverLab,T=await import('./upstream/stalheart/vendor/three.module.js'),g=l.world.race.gates[0],f=g.frame.east.clone().multiplyScalar(g.dx).addScaledVector(g.frame.north,g.dz),s=l.sim;s.pos.copy(g.origin).addScaledVector(g.frame.up,2).addScaledVector(f,-3);s.q.copy(g.frame.q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(g.dx,g.dz)));s.vel.copy(f).multiplyScalar(8);s.omega.set(0,0,0);s.grounded=false;s.contactCount=0;s.supportTime=0;s.wheelContact.fill(false);s.motion.capture();l.view.distance=18;l.view.pitch=.35;l.view.orbit=0;l.view.cameraInitialized=false;l.step({},.25);})()`);
  const snapshot=`(()=>{const l=roverLab,v=l.view.raceView;return {gate:l.race.racers[0].gate,flash:v.gates[0].flash,nextFlash:v.gates[1].flash,paint:[...v.flags.paint.get(0).values()].map(p=>({color:p.material.color.toArray(),original:p.color.toArray(),emissive:p.material.emissive?.toArray()})),unrelated:[...v.flags.paint.get(6).values()].every(p=>p.material.color.equals(p.color)),pair:v.flags.flags.filter(f=>f.gate===0).map(f=>{const a=[];f.root.traverse(o=>{if(o.isSkinnedMesh)a.push(o.material.color.toArray());});return a;}),ledGeometry:v.gates[0].led.geometry.uuid,ledMaterial:v.gates[0].led.material.uuid};})()`;
  const white=await b.evaluate(snapshot);assert.equal(white.gate,1);assert.ok(white.flash.strength>.9&&white.flash.white>.9);assert.equal(white.nextFlash.strength,0);assert.ok(white.unrelated);assert.deepEqual(white.pair[0],white.pair[1]);await b.screenshot('artifacts/gate-white-'+mode+'.png');
  await b.evaluate('roverLab.step({},.35)');const green=await b.evaluate(snapshot);assert.ok(green.flash.strength>.45);assert.equal(green.flash.white,0);assert.ok(green.paint.every(p=>p.emissive[1]>p.emissive[0]));await b.screenshot('artifacts/gate-green-'+mode+'.png');
  // Pausing neither consumes nor retriggers the flash.
  await new Promise(r=>setTimeout(r,350));assert.deepEqual((await b.evaluate(snapshot)).flash,green.flash);
  await b.evaluate('roverLab.step({},1.5)');const faded=await b.evaluate(snapshot);assert.equal(faded.flash.strength,0);assert.ok(faded.paint.every(p=>p.color.every((v,i)=>v===p.original[i])));assert.ok(faded.unrelated);
  await b.evaluate(`document.getElementById('restartRace').click();roverLab.pause();roverLab.view.render(.016)`);const reset=await b.evaluate(snapshot);assert.equal(reset.gate,0);assert.equal(reset.flash.strength,0);assert.equal(reset.ledGeometry,faded.ledGeometry);assert.equal(reset.ledMaterial,faded.ledMaterial);
  assert.deepEqual(b.errors,[]);report[mode]={white,green,faded,reset,errors:b.errors};console.log(mode,'gate feedback passed');
 }finally{await b.close();}
}
await writeFile('artifacts/gate-feedback-report.json',JSON.stringify(report,null,2));
