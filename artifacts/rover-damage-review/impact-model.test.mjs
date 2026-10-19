import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES,THRESHOLDS,damageFor,timing,sample,GRAVITY} from './impact-model.js';
test('forgiving default series leaves routine bumps and controlled landings intact',()=>{
 assert.deepEqual(CASES.map(c=>damageFor(c,c.speed).level),[0,1,1,2,2,0,1,3]);
});
test('wheel destruction stays local and never escalates the chassis',()=>{
 const d=damageFor(CASES.find(c=>c.id==='wheel'),24);
 assert.deepEqual(d.zones,{WHEEL_FL:3});assert.equal(d.core,0);
});
test('damage is monotonic with speed for both sensitivity profiles',()=>{
 for(const profile of Object.keys(THRESHOLDS))for(const c of CASES){let prior=0;for(let speed=0;speed<=24;speed+=.1){const d=damageFor(c,speed,profile);assert.ok(d.level>=prior);prior=d.level;}}
});
test('every trial reaches contact continuously at the configured normal speed',()=>{
 for(const c of CASES){const tm=timing(c,c.speed),before=sample(c,c.speed,tm.contact-1e-6),hit=sample(c,c.speed,tm.contact);
 assert.equal(before.hit,false);assert.equal(hit.hit,true);assert.ok(Math.abs(before.velocity+c.speed)<1e-5);assert.ok(before.offset<3e-5);assert.ok(Math.abs(hit.offset)<1e-12);
 }
});
test('landing approach obeys lab gravity and ends on the floor',()=>{
 for(const c of CASES.filter(c=>c.kind==='landing')){const tm=timing(c,c.speed),a=sample(c,c.speed,1.02),b=sample(c,c.speed,1.04);assert.ok(Math.abs((b.velocity-a.velocity)/.02+GRAVITY)<1e-9);assert.equal(sample(c,c.speed,tm.end).offset,0);}
});
test('scrubbing in either direction gives the same trajectory',()=>{
 const c=CASES[3],t=timing(c,c.speed),at=sample(c,c.speed,t.contact+.1);sample(c,c.speed,t.end);sample(c,c.speed,0);assert.deepEqual(sample(c,c.speed,t.contact+.1),at);
});
