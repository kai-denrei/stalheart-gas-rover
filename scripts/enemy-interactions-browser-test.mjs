import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {browser} from './browser-session.mjs';
const b=await browser(process.env.LAB_URL||'http://localhost:8166/?mode=race',{watchdogMs:180000}),report={};
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const f=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(f,100);f()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause();roverLab.race.phase='racing';roverLab.race.racers.forEach(r=>r.penalty=9999)",userGesture:true});
 for(let i=0;i<6;i++)await b.evaluate('roverLab.step({},4)');
 report.battle=await b.evaluate('roverLab.view.raceView.defense.snapshot()');assert.ok(report.battle.orbital.rotary>10);assert.ok(report.battle.orbital.bofors>0);assert.ok(report.battle.orbital.sol88.kills>0);assert.ok(report.battle.orbital.withheld>0);
 report.contacts=await b.evaluate(`(async()=>{const l=roverLab,d=l.view.raceView.defense.defense,{point,frameAt}=await import('./src/world.js'),r=l.race.racers[0],s=r.sim,result=[];d.nextWave=d.nextBoss=99999;d.pending=[];d.guns.forEach(g=>g.next=99999);for(const kind of ['reed','cutis','gorogoro','nih-daira']){d.enemies=[];s.reset('READY');s.pos.copy(point(0,-50,.46));s.q.copy(frameAt(s.pos).q);s.vel.copy(frameAt(s.pos).north).multiplyScalar(14);s.enemyPrevious=s.pos.clone();r.penalty=0;const e=d.addEnemy({x:0,z:kind==='nih-daira'?-45.6:-47.5,side:1,goal:-200},kind);e.speed=0;e.hp=1000;d.tick(.025,l.race);result.push({kind,hp:e.hp,damage:s.damage.hits,speed:s.vel.length(),collision:s.lastCollision});}r.penalty=9999;return result;})()`);
 for(const c of report.contacts){assert.ok(c.hp<1000,c.kind);assert.ok(c.damage>0,c.kind);assert.ok(c.speed<14,c.kind);}
 // Restart resets the combat pool and pose clocks before testing the celebration.
 await b.evaluate("document.getElementById('restartRace').click();roverLab.pause();roverLab.race.phase='finished';roverLab.race.celebrationTime=0;roverLab.race.racers.forEach(r=>r.penalty=9999)");
 for(let i=0;i<5;i++)await b.evaluate('roverLab.step({},4)');
 report.finale=await b.evaluate('roverLab.view.raceView.defense.orbital.snapshot()');
 console.log('finale',JSON.stringify(report.finale.salvo));
 assert.equal(report.finale.salvo.length,3,'safe paths still allow the three celebration nukes');assert.ok(report.finale.salvo.every(s=>s.impact!==null));
 report.errors=b.errors;await writeFile('artifacts/enemy-interactions-browser.json',JSON.stringify(report,null,2));assert.equal(b.errors.length,0,JSON.stringify(b.errors));console.log(JSON.stringify({contacts:report.contacts,orbital:report.battle.orbital,finale:report.finale.salvo,errors:b.errors},null,2));
}finally{await b.close();}
