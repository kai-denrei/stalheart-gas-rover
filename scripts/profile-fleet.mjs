import {browser} from './browser-session.mjs';
import {writeFile} from 'node:fs/promises';
const base=process.env.LAB_URL||'http://localhost:8166/',results=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
// Same fixed camera and five visible rovers, background geometry and resolution.
// Two orders reduce warm-up/thermal ordering bias. Do not run other GPU tests alongside.
for(const fleet of ['original','mixed','new','r47xs','r47xs','new','mixed','original']){
 const b=await browser(new URL('?mode=race&fleet='+fleet,base).href,{watchdogMs:180000});
 try{
  await b.call('Emulation.setDeviceMetricsOverride',{width:1439,height:901,deviceScaleFactor:1.75,mobile:false});
  for(let i=0;i<480;i++){if(await b.evaluate('!!window.roverLab?.ready()'))break;await wait(150);}
  await b.evaluate(`document.getElementById('start').click();roverLab.pause();roverLab.view.distance=23;roverLab.view.orbit=.6;roverLab.view.cameraInitialized=false;roverLab.step({},.1);`);
  await wait(6000);const samples=[];for(let i=0;i<5;i++){await wait(1000);samples.push(await b.evaluate('roverLab.performance()'));}
  const metrics=await b.evaluate(`(()=>{const v=roverLab.view,rigs=[v.rig,...v.raceView.rivals.map(x=>x.rig)];return rigs.map(r=>{let draws=0,triangles=0;r.model.traverseVisible(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {family:r.family,draws,triangles};});})()`);
  const avg=key=>samples.reduce((sum,p)=>sum+(p[key]||0),0)/samples.length;
  const result={fleet,fps:avg('fps'),frame:avg('frame'),p95:avg('p95'),render:avg('render'),gpu:samples.every(p=>p.gpu===null)?null:avg('gpu'),calls:samples.at(-1).calls,triangles:samples.at(-1).triangles,resolution:samples.at(-1).resolution,metrics,errors:b.errors};
  results.push(result);console.log(JSON.stringify(result));if(b.errors.length)throw Error('Browser errors');
 }finally{await b.close();}
}
await writeFile('artifacts/fleet-performance.json',JSON.stringify({scenario:'Five visible rovers, full Last Leap environment, paused simulation, animated rig update path, 1439×901 at 1.75 DPR; two rounds in reverse order.',results},null,2));
