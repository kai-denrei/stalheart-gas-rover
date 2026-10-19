import {coords} from './world.js';
export const TREMOR = Object.freeze({warning:1.2,opening:2,proximity:34});
export function resetRaceHazards(world){
 world.race.hazardGeneration=(world.race.hazardGeneration||0)+1;
 for(const h of world.holes){h.phase=h.dormant?'dormant':'open';h.age=h.dormant?0:100;h.radius=h.dormant?0:h.r;h.triggeredBy=null;}
}
export function stepRaceHazards(race,dt){
 for(const h of race.world.holes){
  if(!h.dormant)continue;
  if(h.phase==='dormant'){
   const first=race.racers.find(r=>!r.place&&!r.penalty&&(()=>{const p=coords(r.sim.pos);return p.h<20&&Math.hypot(p.x-h.x,p.z-h.z)<TREMOR.proximity;})());
   if(!first)continue;h.phase='trembling';h.triggeredBy=first.id;race.emit('tremor',{hole:h.name,id:first.id});
  }
  h.age+=dt;
  // In the browser the reused breach effect supplies its exact radius, including its travel lead-in.
  // Headless rules use the nominal opening curve. Physics and cutout shaders consume the same value.
  if(!h.rendered)h.radius=h.r*Math.min(1,Math.max(0,(h.age-TREMOR.warning)/TREMOR.opening));
  h.phase=h.age<TREMOR.warning?'trembling':h.radius<h.r?'opening':'open';
 }
}
