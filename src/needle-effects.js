import * as T from '../upstream/stalheart/vendor/three.module.js';
import {SENTRY_FX} from '../upstream/stalheart/src/content/weapon-defaults.js';
import {makeTracerMesh} from '../upstream/stalheart/src/shotfx.js';
import {makeImpactBurst,IMPACT_TUNE,orientImpact} from '../upstream/stalheart/src/impactfx.js';
import {upAt} from './world.js';

export function createNeedleEffects(root){
 const spec=SENTRY_FX.needle,trail=spec.shot.trail+1,mesh=makeTracerMesh(0xc7ecff,spec.shot.projPx,16*trail-1),live=[];
 mesh.frustumCulled=false;mesh.geometry.setDrawRange(0,0);root.add(mesh);let seed=1,shots=0;
 const dispose=o=>{o.removeFromParent();o.traverse(p=>{p.geometry?.dispose();p.material?.dispose();});};
 function burst(kind,p,direction){const fx=spec[kind],o=makeImpactBurst(fx.recipe,{...IMPACT_TUNE,...fx.tune},fx.colors,seed++,fx.size);orientImpact(o,p.toArray(),direction.toArray(),upAt(p).toArray());root.add(o);live.push(o);while(live.length>24)dispose(live.shift());}
 return {mesh,shot(from,to){shots++;burst('muzzle',from,to.clone().sub(from).normalize());burst('impact',to,from.clone().sub(to).normalize());},step(dt){for(let i=live.length-1;i>=0;i--)if(!live[i].userData.tick(dt)){dispose(live[i]);live.splice(i,1);}},update(shots,time){
  let n=0;const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
  for(const shot of shots){if(shot.type!=='needle'||n>=16)continue;const age=time-shot.time,length=shot.from.distanceTo(shot.to),duration=Math.max(.06,length/(spec.shot.projSpeed*10));if(age>duration+.035)continue;
   const head=Math.min(length,age/duration*length),dir=shot.to.clone().sub(shot.from).normalize();
   for(let j=0;j<trail;j++){const at=shot.from.clone().addScaledVector(dir,Math.max(0,head-j*1.5)),fade=(1-j/trail)*Math.max(0,1-Math.max(0,age-duration)/.035);p.setXYZ(n*trail+j,at.x,at.y,at.z);c.setXYZ(n*trail+j,.6*fade,.85*fade,fade);}n++;
  }mesh.geometry.setDrawRange(0,n*trail);p.needsUpdate=c.needsUpdate=true;
 },reset(){live.splice(0).forEach(dispose);mesh.geometry.setDrawRange(0,0);shots=0;},snapshot(){return {shots,bursts:live.length,points:mesh.geometry.drawRange.count};}};
}
