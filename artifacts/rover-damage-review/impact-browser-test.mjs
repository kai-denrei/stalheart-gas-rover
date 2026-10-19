import {browser} from '../../scripts/browser-session.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await browser('http://localhost:8166/artifacts/rover-damage-review/index.html');
try {
 await b.evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.damageReview?.ready){clearInterval(t);resolve(true)}else if(++n>200){clearInterval(t);reject(Error(document.getElementById('loading').textContent))}},50)})`);
 const checks=await b.evaluate(`(()=>{
  const r=damageReview,results=[];
  for(const c of r.cases){r.start(c.id);const contact=r.current.contact;r.seek(contact-.001);const intact=Object.values(r.states).every(d=>d===0);r.seek(contact);const damaged=Object.entries(r.states).filter(([,d])=>d>0);r.seek(r.current.end);const settled=JSON.stringify(r.states);r.seek(0);const reset=Object.values(r.states).every(d=>d===0);r.seek(contact);results.push({id:c.id,intact,damaged,reset,deterministic:settled===JSON.stringify(r.states)});}
  r.start('wheel');r.seek(r.current.end);
  const coreIntact=r.root.getObjectByName('CHASSIS_ARMOR_BODY').geometry===r.bank[0].getObjectByName('CHASSIS_ARMOR_BODY').geometry;
  const wheelDamaged=r.root.getObjectByName('WHEEL_FL').geometry===r.bank[2].getObjectByName('WHEEL_FL').geometry;
  document.getElementById('global').click();const coreEscalated=r.core===2;
  document.getElementById('before').click();const beforeIntact=r.root.getObjectByName('WHEEL_FL').geometry===r.bank[0].getObjectByName('WHEEL_FL').geometry&&r.core===0;
  document.getElementById('before').click();document.getElementById('global').click();
  r.start('bump');r.seek(r.current.end);r.setProfile('sensitive');const sensitiveWorks=r.states.FRONT_BUMPER===1;r.setSpeed(7);r.seek(r.current.end);const sensitiveD2=r.states.FRONT_BUMPER===2;r.setProfile('forgiving');const forgivingD1=r.states.FRONT_BUMPER===1;
  return {results,coreIntact,wheelDamaged,coreEscalated,beforeIntact,sensitiveWorks,sensitiveD2,forgivingD1};
 })()`);
 for(const r of checks.results){assert.ok(r.intact&&r.reset&&r.deterministic,r.id);}
 for(const [key,value] of Object.entries(checks)){if(key!=='results')assert.equal(value,true,key);}
 for(const id of ['bump','wheel','side','hard-landing','crash']){
  await b.evaluate(`damageReview.start('${id}');damageReview.seek(damageReview.current.end)`);
  await new Promise(resolve=>setTimeout(resolve,150));await b.screenshot(`artifacts/rover-damage-review/impact-${id}.png`);
 }
 const paused=await b.evaluate('damageReview.time');await new Promise(resolve=>setTimeout(resolve,300));assert.equal(await b.evaluate('damageReview.time'),paused);
 // Run the actual animation loop through the entire automatic series.
 await b.evaluate(`document.getElementById('rate').value='1';document.getElementById('series').click();window.visitedTrials=[];window.trialObserver=setInterval(()=>{if(!visitedTrials.includes(damageReview.scenario))visitedTrials.push(damageReview.scenario)},50)`);
 await new Promise(resolve=>setTimeout(resolve,36000));
 checks.autoplay=await b.evaluate(`(()=>{clearInterval(trialObserver);return {visited:visitedTrials,series:damageReview.series,playing:damageReview.playing,final:damageReview.scenario}})()`);
 assert.equal(checks.autoplay.visited.length,8);assert.equal(checks.autoplay.series,false);assert.equal(checks.autoplay.playing,false);assert.equal(checks.autoplay.final,'crash');
 checks.errors=b.errors;assert.deepEqual(checks.errors,[]);
 await writeFile('artifacts/rover-damage-review/impact-browser-report.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
}finally{await b.close()}
