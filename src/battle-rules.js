import {STORY_QUIVER} from '../upstream/stalheart/src/content/story-defaults.js';
import {MISSILE_DEFAULTS} from '../upstream/stalheart/src/content/missile-defaults.js';
import {makeCrowdCap,stepCrowdCap} from '../upstream/stalheart/src/domain/crowd-cap.js';
export const QUIVER={...MISSILE_DEFAULTS.quiver,...STORY_QUIVER.missile};
export const BATTLE={capacity:640,start:360,min:160,waveSize:96,interval:2.5,step:.025,release:6};
export function crowdBudget(limit=360,adaptive=true){return {...makeCrowdCap({start:limit,min:adaptive?BATTLE.min:limit,max:adaptive?BATTLE.capacity:limit,slowMs:23,fastMs:18,down:.85,up:1.08,every:1.5}),adaptive};}
export function crowdFrame(c,ms,alive){if(c.adaptive)stepCrowdCap(c,ms,alive);return c.cap;}
// Two staggered salvos, with a seven-second gap after the first three releases.
// The final blast is three times the linear size, farther into the hinterland.
export const DISCO_SALVO=Object.freeze({release:[0,.8,1.6,8.6,9.4,10.2],targets:[[65,370],[136,390],[207,370],[15,490],[257,510],[136,670]],sizes:[1,1,1,1,1,3]});
export function discoReleases(clock,already){return DISCO_SALVO.release.map((at,i)=>({at,i,target:DISCO_SALVO.targets[i],size:DISCO_SALVO.sizes[i]})).filter(x=>clock>=x.at&&!already.has(x.i));}
