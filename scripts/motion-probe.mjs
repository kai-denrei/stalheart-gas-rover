import {browser} from './browser-session.mjs';import {writeFile} from 'node:fs/promises';
const b=await browser(process.env.LAB_URL||'http://127.0.0.1:8166');
try{
 for(let i=0;i<100;i++){if(await b.evaluate('Boolean(window.roverLab?.ready())'))break;await new Promise(r=>setTimeout(r,150));}
 const result=await b.evaluate(`(async()=>{
 const T=await import('./upstream/stalheart/vendor/three.module.js');const W=await import('./src/world.js');const {commands,STEP}=await import('./src/simulation.js');
 roverLab.pause();const s=roverLab.sim,v=roverLab.view;const results=[];
 const range=a=>Math.max(...a)-Math.min(...a),mean=a=>a.reduce((x,y)=>x+y,0)/a.length,sd=a=>Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
 for(const [name,drive] of [['parked',0],['driving',1]]){
  roverLab.reset();roverLab.place(0,-180,.46);let accumulator=0;const frames=[];let prev=s.pos.clone(),q=s.q.clone();
  for(let frame=0;frame<300;frame++){
   accumulator+=1/50;let steps=0;while(accumulator+1e-10>=STEP){s.step({...commands(),drive},STEP);accumulator-=STEP;steps++;}
   v.render(1/50,accumulator/STEP);
   const pixel=v.rover.position.clone().project(v.camera),p=W.coords(s.pos);
   if(frame>=180)frames.push({steps,travel:s.pos.distanceTo(prev),height:p.h,angle:q.angleTo(s.q),screenY:pixel.y*v.height/2,susp:v.rig.wheels.map(w=>w.susp.rotation.z),grounded:s.grounded,contacts:s.contactCount});
   prev.copy(s.pos);q.copy(s.q);
  }
  const dy=frames.slice(1).map((x,i)=>x.screenY-frames[i].screenY);
  results.push({name,travelValues:[...new Set(frames.map(f=>+f.travel.toFixed(4)))],screenStepStdPx:sd(dy),screenStepRangePx:range(dy),heightRangeM:range(frames.map(f=>f.height)),angleMaxDeg:Math.max(...frames.map(f=>f.angle))*180/Math.PI,suspRangeDeg:range(frames.map(f=>f.susp[0]))*180/Math.PI,groundSwitches:frames.slice(1).filter((f,i)=>f.grounded!==frames[i].grounded).length,contactCounts:[...new Set(frames.map(f=>f.contacts))],frames});
 }
 return results;
})()`);
 await writeFile(process.env.MOTION_OUTPUT||'artifacts/motion-after.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.map(({frames,...rest})=>rest),null,2));console.log('errors',b.errors);
}finally{await b.close();}
