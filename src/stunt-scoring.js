import {coords} from './world.js';
export const STUNT_POINTS=Object.freeze({'Kick-Flip':100,'Front Flip':150,'Back Flip':150,'Flat Spin':150,'Face-up Spin':250,'Sinkhole Flip':500,'Tremor-Kick-Flip!':1000,'Alien Flip':300,'Rover Flip':400});
// Credits come from the physics integrator's completed rotations, never key presses.
// Context bonuses require an airborne passage across a target, not hovering above it.
export class StuntScore {
 constructor(){this.reset();}
 reset(){this.score=0;this.flips=0;this.achievements={};this.clearFlight();}
 clearFlight(){this.flight=null;this.sampleClock=0;}
 award(label,points,race,racer,turns=0){this.score+=points;this.achievements[label]=(this.achievements[label]||0)+1;race.emit('stunt',{id:racer.id,label,points,score:this.score,turns});}
 step(racer,race,dt){
  const s=racer.sim;
  if(s.grounded||s.contactCount||s.bodyContacts||s.damage.wreck){this.clearFlight();return;}
  if(!this.flight)this.flight={turns:0,figureTurns:[0,0],seen:new Map(),contexts:new Map(),awarded:new Set()};
  const f=this.flight;if(!s.kickFlight&&s.kickTurns===0)f.turns=0;
  // kickTurns resets on contact. Recoveries explicitly discard this flight.
  while(s.kickFlight&&s.kickTurns>f.turns){f.turns++;this.flips++;const label=f.turns===1?'Kick-Flip':f.turns===2?'Double Kick-Flip':`${f.turns}× Kick-Flip`;this.award(label,STUNT_POINTS['Kick-Flip']*Math.min(f.turns,5),race,racer,f.turns);}
  for(let axis=0;axis<2;axis++){const turns=s.figureTurns?.[axis]||0;if(turns<f.figureTurns[axis])f.figureTurns[axis]=turns;while(turns>f.figureTurns[axis]){const n=++f.figureTurns[axis],label=axis===0?(s.figureAngles[0]>0?'Front Flip':'Back Flip'):s.figureLabels[1]||'Flat Spin';this.award(n===1?label:`${n}× ${label}`,STUNT_POINTS[label]*Math.min(n,5),race,racer,n);}}
  this.sampleClock-=dt;
  if(this.sampleClock<=0){this.sampleClock=1/30;const p=coords(s.pos);
   const sample=(key,x,z,radius,height,label,hole=null)=>{
    if(p.h<height+2)return;
    const dx=p.x-x,dz=p.z-z,d2=dx*dx+dz*dz;let visit=f.seen.get(key);
    if(d2<radius*radius){if(!visit)f.seen.set(key,{dx,dz,radius,label,hole});}
    else if(visit&&!visit.done&&dx*visit.dx+dz*visit.dz<0&&Math.hypot(dx-visit.dx,dz-visit.dz)>radius*1.2){visit.done=true;f.contexts.set(visit.label,visit);}
   };
   for(const h of race.world.holes)sample('hole-'+h.name,h.x,h.z,h.r,0,h.phase==='dormant'||h.phase==='trembling'?'Tremor-Kick-Flip!':'Sinkhole Flip',h);
   for(const other of race.racers){if(other===racer||other.penalty||other.place||other.sim.damage.wreck)continue;const q=coords(other.sim.pos);sample('rover-'+other.id,q.x,q.z,2.6,q.h+1.2,'Rover Flip');}
   for(const e of race.stuntEnemies?.()||[]){if(e.dead)continue;sample('alien-'+e.id,e.x,e.z,e.kind==='gorogoro'?2.5:1.5,3.2,'Alien Flip');}
  }
  if(f.turns)for(const [context,visit] of f.contexts){if(visit.credited)continue;let label=context;if(label==='Tremor-Kick-Flip!'&&!['dormant','trembling'].includes(visit.hole.phase))label='Sinkhole Flip';if(f.awarded.has(label))continue;visit.credited=true;f.awarded.add(label);this.award(label,STUNT_POINTS[label],race,racer,f.turns);}
 }
 snapshot(){return {score:this.score,flips:this.flips,achievements:{...this.achievements}};}
}
