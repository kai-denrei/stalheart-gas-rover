import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const base=process.env.LAB_URL||'http://localhost:8166/',report={};
for(const family of ['r47x','r47xs','xb12']){
 const b=await browser(new URL('?rover='+family,base).href,{watchdogMs:180000});
 try{
  for(let i=0;i<480;i++){if(await b.evaluate('!!window.roverLab?.ready()'))break;await new Promise(r=>setTimeout(r,150));}
  assert.equal(await b.evaluate('roverLab.ready()'),true);
  await b.evaluate(`document.getElementById('start').click();roverLab.pause();roverLab.place(0,-170);roverLab.step({drive:1,steer:.4},.5)`);
  const driven=await b.evaluate(`(()=>{const {sim:s,view:v}=roverLab;return {family:s.family,contacts:s.contactCount,traction:s.traction,speed:s.vel.length(),steer:v.rig.wheels.filter(w=>w.z>1).map(w=>w.steer.rotation.y),spin:v.rig.wheels.map(w=>w.spin.rotation.x),middle:[s.wheelContact[1],s.wheelContact[4]]};})()`);
  assert.equal(driven.family,family);assert.equal(driven.contacts,family==='xb12'?4:6);assert.equal(driven.traction,1);assert.ok(driven.speed>3);assert.ok(driven.steer.every(a=>Math.abs(a)>.1));assert.ok(driven.spin.some(a=>Math.abs(a)>1));
  if(family==='xb12')assert.deepEqual(driven.middle,[false,false]);
  const articulation=await b.evaluate(`(()=>{const l=roverLab,s=l.sim,r=l.view.rig,results=[];for(const height of [.32,.58]){l.place(0,-170,height);s.grounded=true;s.time+=.1;r.update(s,3);r.model.updateWorldMatrix(true,true);results.push(r.wheels.map(w=>({angle:w.susp.rotation.z,error:w.rod?w.rod.getWorldPosition(s.pos.clone()).distanceTo(w.lower.getWorldPosition(s.pos.clone())):0,rod:w.rod?.position.y})));}return results;})()`);
  assert.ok(Math.abs(articulation[0][0].angle-articulation[1][0].angle)>.15);
  assert.ok(articulation.flat().every(w=>w.error<1e-6));
  await b.evaluate(`roverLab.place(0,-170,5);roverLab.step({lift:1},.4)`);
  const boosted=await b.evaluate('({gas:roverLab.sim.reserve,particles:roverLab.view.rig.stats.activePlumeCount})');
  assert.ok(boosted.gas<100);assert.ok(boosted.particles>0);
  const damage=await b.evaluate(`(()=>{const l=roverLab,r=l.view.rig,s=l.sim,name=s.family==='xb12'?'XB12_HULL':'CHASSIS_ARMOR_BODY',mesh=r.model.getObjectByName(name),out=[];for(const level of [0,1,2,3,0]){s.damage.corePoints=[0,1,3,6][level];for(const z of Object.keys(s.damage.points))s.damage.points[z]=[0,1,3,6][level];s.damage.refresh();r.update(s,0);out.push({level,geometry:mesh.geometry.uuid,donor:mesh.geometry===r.damageBank[level].getObjectByName(name).geometry,drive:s.damage.effects.drive,sensor:r.optics.rotation.x});}l.reset();l.view.render(.016);return out;})()`);
  assert.ok(damage.every(d=>d.donor));assert.equal(new Set(damage.map(d=>d.geometry)).size,4);assert.equal(damage[3].drive,0);assert.equal(damage[4].drive,1);
  await b.evaluate(`roverLab.view.distance=9;roverLab.view.orbit=.55;roverLab.view.pitch=.45;roverLab.view.cameraInitialized=false;roverLab.view.render(.016)`);
  await b.screenshot('artifacts/fleet-'+family+'.png');assert.deepEqual(b.errors,[]);
  report[family]={driven,articulation,boosted,damage,errors:b.errors};console.log(family,'passed');
 }finally{await b.close();}
}
await writeFile('artifacts/fleet-browser-report.json',JSON.stringify(report,null,2));
