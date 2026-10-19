// Stable traits survive LOD changes, death and render interpolation.
const noise=(id,salt)=>{const n=Math.sin(id*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};
export const BOSS={first:32,cooldown:70,width:16,hp:90,corpse:60};
export function crowdTraits(id){const size=.83+noise(id,1)*.34,pace=.8+noise(id,2)*.4;return {size,pace,walkRate:pace/size,phase:noise(id,3)*6,hue:.12+noise(id,4)*.09,saturation:.12+noise(id,5)*.22,lightness:.68+noise(id,6)*.24,wander:.3+noise(id,7)*.6,frequency:.35+noise(id,8)*.55};}
export function crowdMotion(e,time){const cycle=time*(e.frequency??.5)+(e.phase??0);return {speed:e.speed*(.86+.14*Math.sin(cycle*.71)),side:(e.wander??0)*Math.sin(cycle)};}
