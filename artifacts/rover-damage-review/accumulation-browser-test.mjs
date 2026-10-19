import {browser} from '../../scripts/browser-session.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const b=await browser('http://localhost:8166/artifacts/rover-damage-review/accumulation.html');
try{
 await b.evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.accumulationReview?.ready){clearInterval(t);resolve(true)}else if(++n>200){clearInterval(t);reject(Error(document.getElementById('loading').textContent))}},50)})`);
 const checks=await b.evaluate(`(()=>{const r=accumulationReview;let prior=Object.fromEntries(Object.keys(r.damage.states).map(z=>[z,0]));const stages=[];for(let n=0;n<=12;n++){r.seek(n);const d=r.damage;stages.push({hits:n,monotonic:Object.entries(d.states).every(([z,v])=>v>=prior[z]),coreMatches:r.root.getObjectByName('CHASSIS_ARMOR_BODY').geometry===r.bank[d.core].getObjectByName('CHASSIS_ARMOR_BODY').geometry,stationary:r.root.position.length()===0&&r.root.rotation.x===0&&r.root.rotation.z===0});prior=d.states;}const stopped=!r.playing;document.getElementById('before').click();const comparison=r.root.getObjectByName('CHASSIS_ARMOR_BODY').geometry===r.bank[0].getObjectByName('CHASSIS_ARMOR_BODY').geometry&&r.root.getObjectByName('WHEEL_FL').geometry===r.bank[0].getObjectByName('WHEEL_FL').geometry;document.getElementById('before').click();const restored=r.damage.wreck&&r.root.getObjectByName('WHEEL_FL').geometry===r.bank[3].getObjectByName('WHEEL_FL').geometry;document.getElementById('previous').click();const backward=r.damage.hits===11&&!r.playing;document.getElementById('next').click();const forward=r.damage.hits===12;return {stages,stopped,comparison,restored,backward,forward}})()`);
 for(const s of checks.stages)assert.ok(s.monotonic&&s.coreMatches&&s.stationary);
 for(const key of ['stopped','comparison','restored','backward','forward'])assert.ok(checks[key],key);
 for(const stage of [0,1,2,3]){await b.evaluate(`accumulationReview.seek(${stage*4})`);await new Promise(r=>setTimeout(r,100));await b.screenshot(`artifacts/rover-damage-review/accumulated-d${stage}.png`);}
 await b.evaluate(`document.getElementById('interval').value='1';document.getElementById('restart').click();window.observedHits=[0];window.observer=setInterval(()=>{const n=accumulationReview.damage.hits;if(!observedHits.includes(n))observedHits.push(n)},25)`);
 await new Promise(r=>setTimeout(r,14500));
 checks.autoplay=await b.evaluate(`(()=>{clearInterval(observer);return {hits:observedHits,wreck:accumulationReview.damage.wreck,playing:accumulationReview.playing}})()`);
 assert.deepEqual(checks.autoplay.hits,Array.from({length:13},(_,i)=>i));assert.equal(checks.autoplay.wreck,true);assert.equal(checks.autoplay.playing,false);
 checks.errors=b.errors;assert.deepEqual(checks.errors,[]);
 await writeFile('artifacts/rover-damage-review/accumulation-browser-report.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
}finally{await b.close()}
