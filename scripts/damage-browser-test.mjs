import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const reports=[];
for(const mode of ['lab','race']){
 const b=await browser('http://localhost:8166/'+(mode==='race'?'?mode=race':''));
 try{
  await b.evaluate(`new Promise((resolve,reject)=>{const end=Date.now()+25000;const tick=()=>window.roverLab?.ready()?resolve(true):Date.now()>end?reject(Error(document.getElementById('loadText').textContent)):setTimeout(tick,80);tick();})`);
  await b.evaluate(`document.getElementById('start').click();roverLab.pause();if(roverLab.race)roverLab.race.phase='racing';`);
  if(mode==='lab'){
   const real=await b.evaluate(`(()=>{const l=roverLab,s=l.sim,r=l.world.rocks.find(r=>r.x===15&&r.z===17),stages=[];l.reset();for(let i=0;i<4;i++){l.place(15,8,.46);s.q.copy(r.frame.q);s.vel.copy(r.frame.north).multiplyScalar(18);s.age=2;s.time+=1;s.tune.assistance='manual';s.motion.capture();l.step({},.7);stages.push({hits:s.damage.hits,damage:Math.max(...Object.values(s.damage.states)),core:s.damage.core,collision:s.lastCollision?.collider});}return stages})()`);
   assert.ok(real[0].hits>0);assert.ok(real.at(-1).hits>real[0].hits);assert.ok(real.at(-1).damage>=2);reports.push({mode,physicalImpacts:real});
  }
  const result=await b.evaluate(`(()=>{
   const l=roverLab,s=l.sim,view=l.view;l.reset();if(l.race)l.race.racers[0].penalty=0;l.place(0,-30,10);s.age=1;
   const damage=(sim,zone,n=2)=>{for(let i=0;i<n;i++){sim.time+=.7;sim.receiveImpact({zone,speed:12,local:[-.98,0,1.44],collider:'browser-test'});}};
   damage(s,'WHEEL_FL');damage(s,'FLANK_NEG_X');damage(s,'NOZZLE_V_FL',4);damage(s,'NOZZLE_V_FR');
   for(let i=0;i<12;i++){s.step({drive:0,steer:0,lift:1,pitch:0,yaw:0,roll:0,kick:0});view.render(.016);}
   l.step({},0);
   const damagedWheel=view.model.getObjectByName('WHEEL_FL').geometry===view.damageBank[2].getObjectByName('WHEEL_FL').geometry;
   const coreMatches=view.model.getObjectByName('CHASSIS_ARMOR_BODY').geometry===view.damageBank[s.damage.core].getObjectByName('CHASSIS_ARMOR_BODY').geometry;
   const effects={steer:s.damage.effects.steer,disabledForce:s.burn.forces[0].length(),limitedForce:s.burn.forces[1].length(),leakRate:s.damage.effects.leakRate};
   const particles=view.rig.stats.activePlumeCount,leakSocket=view.rig.leaks.NEG_X;
   const instruments=['DISPLAY_SPEED_LEFT','DISPLAY_THRUST_RIGHT','DISPLAY_GAS_RESERVE_REAR'].every(name=>view.model.getObjectByName(name).material.isShaderMaterial)&&!!view.model.getObjectByName('DISPLAY_FDAI_TELEMETRY_PANEL').material.map?.isCanvasTexture;
   let rival=null;
   if(l.race){const other=l.race.racers[1],visual=view.raceView.rivals[0],paint=visual.group.getObjectByName('CHASSIS_ARMOR_BODY').material.color.getHex();damage(other.sim,'WHEEL_FR',4);damage(other.sim,'FRONT_BUMPER',4);view.render(.016);rival={shared:visual.rig.damageBank===view.damageBank,paint:paint===visual.group.getObjectByName('CHASSIS_ARMOR_BODY').material.color.getHex(),damaged:visual.group.getObjectByName('WHEEL_FR').geometry===view.damageBank[3].getObjectByName('WHEEL_FR').geometry};}
   view.distance=7;view.pitch=.3;view.orbit=.6;view.cameraInitialized=false;view.render(.016);
   return {damagedWheel,coreMatches,effects,particles,leakSocket,instruments,rival,hud:document.getElementById('damageSummary').textContent};
  })()`);
  assert.ok(result.damagedWheel&&result.coreMatches&&result.instruments);assert.ok(result.effects.steer<1);assert.equal(result.effects.disabledForce,0);assert.ok(result.effects.limitedForce<=13/8*.5+1e-6);assert.ok(result.effects.leakRate>0&&result.leakSocket>0&&result.particles>0);assert.ok(result.hud.includes('75%'));
  if(result.rival)assert.ok(result.rival.shared&&result.rival.paint&&result.rival.damaged);
  await b.screenshot(`artifacts/damage-${mode}.png`);
  const repair=await b.evaluate(`(()=>{const l=roverLab;l.reset();l.view.render(.016);const zero=Object.values(l.sim.damage.states).every(v=>v===0),repaired=l.view.model.getObjectByName('WHEEL_FL').geometry===l.view.damageBank[0].getObjectByName('WHEEL_FL').geometry;return {zero,repaired,penalty:l.race?.racers[0].penalty??null}})()`);
  assert.ok(repair.zero&&repair.repaired);if(mode==='race')assert.equal(repair.penalty,3);
  const memory=await b.evaluate(`(()=>{const l=roverLab,s=l.sim,v=l.view;function cycle(){for(let n=0;n<10;n++){s.time+=.7;s.receiveImpact({zone:'FRONT_BUMPER',speed:18,local:[0,0,2],collider:'memory-test'});v.render(.016);}l.reset();v.render(.016);}cycle();const before=v.renderer.info.memory.geometries;for(let n=0;n<5;n++)cycle();return {before,after:v.renderer.info.memory.geometries}})()`);
  assert.equal(memory.before,memory.after);assert.deepEqual(b.errors,[]);reports.push({mode,result,repair,memory,errors:b.errors});
 }finally{await b.close();}
}
await writeFile('artifacts/damage-browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
