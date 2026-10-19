import {browser} from './browser-session.mjs';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const b=await browser('http://localhost:8166/?mode=expedition',{watchdogMs:180000}),report={};const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await b.evaluate(`new Promise((r,j)=>{const end=Date.now()+24000;const f=()=>window.roverLab?.ready()?r(true):Date.now()>end?j(Error(document.getElementById('loadText').textContent)):setTimeout(f,100);f()})`);
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause();roverLab.race.phase='racing';roverLab.race.racers.forEach(r=>r.penalty=9999);roverLab.view.raceView.defense.defense.setLoad(640,false)",userGesture:true});
 for(let i=0;i<8;i++)await b.evaluate('roverLab.step({},4)');
 for(const [name,x,z,yaw] of [['canyon',160,-185,.8],['base2',510,-200,0]]){
 await b.evaluate(`(async()=>{const l=roverLab,{point}=await import('./src/world.js'),f=l.view.isao;l.race.racers[0].place=1;l.race.racers[0].finishTime=l.race.time;f.unlock();f.enter();l.view.mode='isao';f.position.copy(point(${x},${z},55));f.velocity.set(0,0,0);f.yaw=${yaw};f.pitch=.75;f.cameraYaw=0;f.distance=14;f.capture();f.cameraInitialized=false;l.pause(false);})()`);await wait(6000);report[name]=await b.evaluate('({performance:roverLab.performance(),battle:roverLab.view.raceView.defense.snapshot(),camera:roverLab.view.isao.active})');await b.screenshot('artifacts/expedition-'+name+'-performance.png');console.log(name,report[name].performance,report[name].battle.alive);
 }
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));report.errors=b.errors;await writeFile('artifacts/expedition-performance.json',JSON.stringify(report,null,2));
}finally{await b.close();}
