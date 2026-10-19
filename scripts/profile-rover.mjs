import {browser} from './browser-session.mjs';import {writeFile} from 'node:fs/promises';
const b=await browser(process.env.LAB_URL||'http://127.0.0.1:8166'),results=[];
try{
 await b.call('Emulation.setDeviceMetricsOverride',{width:1439,height:901,deviceScaleFactor:2,mobile:false});await b.call('Page.reload');
 for(let i=0;i<100;i++){if(await b.evaluate('Boolean(window.roverLab?.ready())'))break;await new Promise(r=>setTimeout(r,150));}
 await b.evaluate('document.getElementById("start").click()');
 for(const [mode,boost,particles] of [['idle',false,true],['boost with mist',true,true],['boost without mist',true,false]]){
  await b.evaluate(`roverLab.reset();roverLab.place(0,-30,${boost?5:.46});roverLab.pause(false);roverLab.view.rig.fx.setEnabled(${particles});`);
  if(boost)await b.call('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' '});
  await new Promise(r=>setTimeout(r,3500));
  results.push({mode,...await b.evaluate('roverLab.performance()'),particles:await b.evaluate('roverLab.view.rig.stats')});
  await b.call('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' '});
 }
 await b.evaluate('roverLab.reset();roverLab.step({drive:1,steer:1},.5);roverLab.view.distance=7;roverLab.view.pitch=.18;roverLab.view.orbit=2.7;roverLab.view.cameraInitialized=false;roverLab.view.render(.016)');await b.screenshot('artifacts/new-rig-steering.png');
 console.log(JSON.stringify({results,errors:b.errors},null,2));await writeFile(process.env.PROFILE_OUTPUT||'artifacts/perf-new-rover.json',JSON.stringify({results,errors:b.errors},null,2));
}finally{await b.close();}
