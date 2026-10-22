import {applyMech,poseLeg,solveHydraulics,LEGS,dropState} from '../assets/ridgeback-mech/runtime.js';
import {smooth} from '../assets/feids26/runtime.js';
export const DURATION=28,SCALE=.75,RELEASE=6.2;
export const LANDINGS=[[-6,-4],[-3,4],[4,-3],[7,5]];
export const FALL_TIMES=[6,6.25,6.55,11.6];
export const GROUND_CAMERA_START=16.5,GROUND_CAMERA_END=18;
export const TOUCHDOWNS=FALL_TIMES.map((fall,i)=>RELEASE+Math.floor(i/2)*.45+(i%2)*.18+fall+.8);
export function capsuleState(t,index=0){const a=Math.max(0,t-index*.45),split=a-RELEASE;return {age:a,x:index===0?-6:6,y:split<0?480-180*(a/RELEASE)**2:300-4*split,pitch:Math.PI/2,opening:Math.max(0,split),heat:smooth(a/.6)*(1-smooth(split/.22)),flash:split>=0&&split<.3?Math.exp(-split*17):0,split};}
export function cargoState(t,capsule,slot){const index=capsule*2+slot,delay=slot*.18,age=t-capsule*.45-RELEASE-delay,fall=FALL_TIMES[index],hit=age-fall-.8,initial=300-4*delay+(slot===0?2.2:-2.2),landing=LANDINGS[index];let height=initial;
 if(age>=0&&age<fall)height=initial-(initial-12)*(age/fall)**2;else if(age>=fall&&age<fall+.8){const u=(age-fall)/.8;height=12*(1-u)**3+1.6*u*(1-u);}else if(age>=fall+.8)height=0;
 const burst=age-fall,spread=smooth(age/(fall*.85));return {age,hit,height,x:(capsule===0?-6:6)*(1-spread)+landing[0]*spread,z:2.05*(1-spread)+landing[1]*spread,yaw:(slot===0?-.22:.22)*spread,pitch:Math.PI/2*(1-smooth(age/1.5)),jet:burst>=0&&burst<.8?.25+.75*Math.max(0,Math.sin(burst/.8*Math.PI*5)):0,heat:smooth(age/.8)*(1-smooth((age-fall+.6)/.65)),compression:hit>=0?dropState(2.6+hit).compression:0,fold:1-smooth(age/2)};}
export function packMech(root,fold=1,compression=0){applyMech(root,0,{mode:'park',damage:0});root.getObjectByName('MECH_BODY').position.y=1.9-compression;for(const l of LEGS)poseLeg(root,l,[l.fx*(1-.24*fold),.18+.65*fold,l.fz]);solveHydraulics(root);}
