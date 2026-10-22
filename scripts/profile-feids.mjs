import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {browser} from './browser-session.mjs';
const b=await browser('http://localhost:8166/?mode=expedition',{watchdogMs:240000});
try{
 for(let i=0;i<480;i++){if(await b.evaluate('!!window.roverLab?.ready()'))break;await new Promise(r=>setTimeout(r,150));}
 await b.call('Runtime.evaluate',{expression:"document.getElementById('start').click();roverLab.pause()",userGesture:true});
 await b.evaluate(`(()=>{const l=roverLab,v=l.view,f=v.raceView.defense.feids;l.step({},.1);v.isao.active=true;v.isao.present=()=>{const s=f.controller.site;v.rover.visible=false;v.camera.position.copy(s.origin).addScaledVector(s.frame.east,25).addScaledVector(s.frame.up,22+(v.feidsReviewHeight||0)).addScaledVector(s.frame.north,32);v.camera.up.copy(s.frame.up);v.camera.lookAt(s.origin.clone().addScaledVector(s.frame.up,2+(v.feidsReviewHeight||0)));v.camera.updateMatrixWorld();};const style=document.createElement('style');style.textContent='header,.title-block,.top-actions,.hud,#raceHud,#performance,.toast{visibility:hidden!important}';document.head.append(style);})()`);
 await b.evaluate('roverLab.step({},5.9);roverLab.view.feidsReviewHeight=320;roverLab.view.render(.016)');await b.screenshot('artifacts/feids-entry.png');
 await b.evaluate('roverLab.step({},.35);roverLab.view.feidsReviewHeight=300;roverLab.view.render(.016)');await b.screenshot('artifacts/feids-split.png');
 await b.evaluate('roverLab.step({},6.7);roverLab.view.feidsReviewHeight=0;roverLab.view.render(.016)');await b.screenshot('artifacts/feids-first-impact.png');
 await b.evaluate('roverLab.step({},6.35)');await b.screenshot('artifacts/feids-laggard.png');
 await b.evaluate('roverLab.step({},9);roverLab.step({},35);roverLab.pause(false)');
 await new Promise(r=>setTimeout(r,7000));
 const performance=await b.evaluate('({performance:roverLab.performance(),battle:roverLab.view.raceView.defense.snapshot()})');
 await b.evaluate('roverLab.pause()');await b.screenshot('artifacts/feids-patrol.png');assert.deepEqual(b.errors,[]);
 await writeFile('artifacts/feids-performance.json',JSON.stringify(performance,null,2));console.log(JSON.stringify({performance:performance.performance,alive:performance.battle.alive,mechs:performance.battle.feids.mechs,errors:b.errors},null,2));
}finally{await b.close();}
