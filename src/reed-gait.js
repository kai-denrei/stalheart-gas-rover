import {REED_GAIT as G} from './reed-gait-data.js';
export function reedRoot(time){const cycles=Math.floor(time/G.duration),f=(time-cycles*G.duration)*G.fps,i=Math.min(G.frames-1,Math.floor(f));return cycles*G.distance+G.root[i]+(G.root[i+1]-G.root[i])*(f-i);}
export function reedAdvance(e,dt){
 const before=e.gaitTime??e.phase??0,size=e.size||1;
 // The body travels the same distance as the captured soft-body solver. Relay
 // slowdown and blocked movement stop the pose clock too, preventing skating.
 const rate=(e.speed??3.8)/(size*(G.distance/G.duration));e.gaitTime=before+dt*rate;
 return (reedRoot(e.gaitTime)-reedRoot(before))*size;
}
