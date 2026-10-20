import {createRaceWorld} from './race-world.js';
import {gridPose} from './race-courses.js';
import {CITY_SITES} from './race-city.js';
import {podiumDefenseSites} from './podium-defense.js';
export const STAGE_VERSION=1;
export const PREFABS={rock:'Rock',barrier:'Barrier',gate:'Mandatory gate',hole:'Sinkhole / tremor',pad:'Gas service pad',city:'City dome',sentry:'Sentry',spawn:'Rover start',finish:'Finish + gantry'};
export const CITY_ROLES=['habitat','research','logistics','biosphere','power','fabrication'];
export const SENTRY_TYPES=['rotor','quiver','needle','lancer','plasma','mortar','relay'];
export const clone=value=>JSON.parse(JSON.stringify(value));
export const newId=()=>globalThis.crypto.randomUUID();
export function newObject(type,x=0,z=0){return {id:newId(),type,name:PREFABS[type],x,z,altitude:0,yaw:0,...({rock:{w:3,d:3,h:1.5,color:'#425053'},barrier:{w:8,d:1,h:2,color:'#b77849'},gate:{order:1,height:4.7},hole:{radius:7,dormant:false},pad:{},city:{role:'habitat',glazing:'clear',base:1,row:0,col:0,links:false},sentry:{kind:'quiver'},spawn:{slot:0},finish:{w:64,d:68,h:6.5}}[type])};}
export function stageFromCourse(course='race'){
 const w=createRaceWorld(course),objects=[],push=(type,props)=>{const o={...newObject(type),...props};objects.push(o);return o;};
 w.rocks.forEach((r,i)=>push('rock',{name:`Rock ${i+1}`,x:r.x,z:r.z,w:r.w,d:r.d,h:r.h}));
 w.holes.forEach(h=>push('hole',{name:h.name,x:h.x,z:h.z,radius:h.r,dormant:h.dormant}));
 w.race.gates.forEach((g,i)=>push('gate',{name:`Gate ${i+1}`,x:g.x,z:g.z,order:i+1,yaw:Math.atan2(g.dx,g.dz)*180/Math.PI,height:g.height}));
 w.pads.filter(p=>p.service).forEach((p,i)=>push('pad',{name:`Gas service ${i+1}`,x:p.x,z:p.z}));
 [0,-5,5,-2.4,2.4].forEach((lane,id)=>{const p=gridPose(w,{id,lane});push('spawn',{name:id===0?'YOU · start':`Rival ${id} · start`,x:p.x,z:p.z,slot:id,yaw:p.heading*180/Math.PI});});
 push('finish',{name:'Finish gantry + podiums',x:w.race.deck.x,z:w.race.deck.z});
 const sites=CITY_SITES.map(s=>({...s,base:1}));if(course==='expedition')for(const [row,z] of [-285,-185,-75,55].entries())for(const [col,x] of [385,470,600].entries())sites.push({x,z,role:CITY_ROLES[(row*2+col+3)%6],row,col,base:2});
 sites.forEach((s,i)=>{push('city',{...s,name:`Base ${s.base} · ${s.role}`,glazing:(i+Math.floor(i/6))%2===0?'clear':'opaque',links:true});push('sentry',{name:`Dome sentry ${i+1}`,x:s.x,z:s.z,altitude:35.6,kind:['quiver','rotor','quiver','lancer'][i%4]});});
 podiumDefenseSites(w).forEach((s,i)=>push('sentry',{name:`Podium guard ${i+1}`,x:s.x,z:s.z,kind:s.type}));
 return {version:STAGE_VERSION,id:newId(),name:w.race.course.name+' · EDIT',base:course,capacity:w.race.course.capacity,settings:{battle:true,wilderness:course==='expedition'},objects};
}
export function blankStage(){const s={version:STAGE_VERSION,id:newId(),name:'Untitled stage',base:'race',capacity:160,settings:{battle:false,wilderness:false},objects:[]};
 [0,-5,5,-2.4,2.4].forEach((x,slot)=>s.objects.push({...newObject('spawn',x,slot>=3?-7:0),slot,name:slot?'Rival '+slot:'YOU · start'}));
 for(const [i,z] of [35,75].entries())s.objects.push({...newObject('gate',0,z),order:i+1,name:`Gate ${i+1}`});s.objects.push(newObject('finish',0,130));return s;}
export function validateStage(stage,{play=false}={}){
 const errors=[],warnings=[],err=s=>errors.push(s),finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 if(!stage||stage.version!==1||!Array.isArray(stage.objects))return {errors:['Unsupported or missing stage schema (version 1 required).'],warnings};
 if(typeof stage.id!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(stage.id))err('Invalid stage ID.');
 if(typeof stage.name!=='string'||stage.name.length<1||stage.name.length>100)err('Name must be 1–100 characters.');
 if(!['race','expedition'].includes(stage.base))err('Unknown base course.');if(!finite(stage.capacity,15,1000))err('Gas capacity must be 15–1,000.');
 if(!stage.settings||typeof stage.settings.battle!=='boolean'||typeof stage.settings.wilderness!=='boolean')err('Missing battle/scenery settings.');
 if(stage.objects.length>400)err('Keep stages below 400 authored objects.');const ids=new Set();
 for(const o of stage.objects){if(!o||!Object.hasOwn(PREFABS,o.type)){err('Unknown prefab.');continue;}if(typeof o.id!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(o.id)||ids.has(o.id))err('Object IDs must be valid and unique.');ids.add(o.id);
  if(typeof o.name!=='string'||o.name.length>100)err('Invalid object name.');
  if(!finite(o.x,-1000,1000)||!finite(o.z,-1000,1000)||!finite(o.altitude,0,150)||!finite(o.yaw,-3600,3600))err(`${o.name}: invalid transform.`);
  if(['rock','barrier','finish'].includes(o.type)&&!['w','d','h'].every(k=>finite(o[k],.1,150)))err(`${o.name}: dimensions must be 0.1–150 m.`);
  if(['rock','barrier'].includes(o.type)&&!/^#[a-fA-F0-9]{6}$/.test(o.color))err(`${o.name}: invalid color.`);
  if(o.type==='hole'&&(!finite(o.radius,2,60)||typeof o.dormant!=='boolean'||o.altitude!==0))err(`${o.name}: sinkholes need a 2–60 m radius on the surface.`);
  if(o.type==='gate'&&(!Number.isInteger(o.order)||o.order<1||!finite(o.height,2,15)))err(`${o.name}: invalid gate order/height.`);
  if(o.type==='spawn'&&(!Number.isInteger(o.slot)||o.slot<0||o.slot>4||o.altitude!==0))err(`${o.name}: choose a ground start slot 0–4.`);
  if(o.type==='pad'&&o.altitude!==0)err(`${o.name}: service pads must be on the surface.`);
  if(o.type==='city'&&(!CITY_ROLES.includes(o.role)||!['clear','opaque'].includes(o.glazing)||![1,2].includes(o.base)||!finite(o.row,0,100)||!finite(o.col,0,100)||typeof o.links!=='boolean'))err(`${o.name}: invalid dome settings.`);
  if(o.type==='sentry'&&!SENTRY_TYPES.includes(o.kind))err(`${o.name}: unknown sentry.`);
  if(o.type==='finish'&&(o.w<64||o.d<68||o.h<2||o.yaw!==0))err('Finish assembly needs at least 64 × 68 m, height 2 m, and north-facing orientation.');
 }
 for(const [type,max] of [['hole',16],['gate',64],['city',32],['sentry',64]])if(stage.objects.filter(o=>o?.type===type).length>max)err(`Limit: ${max} ${type} objects.`);
 if(errors.length||!play)return {errors:[...new Set(errors)],warnings};
 const starts=stage.objects.filter(o=>o.type==='spawn'),gates=stage.objects.filter(o=>o.type==='gate').sort((a,b)=>a.order-b.order),finish=stage.objects.filter(o=>o.type==='finish'),holes=stage.objects.filter(o=>o.type==='hole'),solids=stage.objects.filter(o=>['rock','barrier','city'].includes(o.type));
 if(starts.length!==5||new Set(starts.map(o=>o.slot)).size!==5)err('Place exactly five starts, one for each slot 0–4.');
 if(finish.length!==1)err('Place exactly one finish assembly.');if(!gates.length)err('Place at least one mandatory gate.');if(new Set(gates.map(o=>o.order)).size!==gates.length)err('Gate order numbers must be unique.');
 const start=starts.find(o=>o.slot===0),route=[...(start?[start]:[]),...gates,...finish];for(let i=1;i<route.length;i++)if(Math.hypot(route[i].x-route[i-1].x,route[i].z-route[i-1].z)<1)err('Consecutive route points must be at least 1 m apart.');
 for(let i=0;i<starts.length;i++)for(let j=i+1;j<starts.length;j++)if(Math.hypot(starts[i].x-starts[j].x,starts[i].z-starts[j].z)<4.8)err(`Starts ${starts[i].slot} and ${starts[j].slot} overlap.`);
 const overlaps=(p,o,pad)=>{const a=o.yaw*Math.PI/180,dx=p.x-o.x,dz=p.z-o.z,x=dx*Math.cos(a)-dz*Math.sin(a),z=dx*Math.sin(a)+dz*Math.cos(a),w=o.type==='city'?29.2:o.w,d=o.type==='city'?29.2:o.d;return Math.abs(x)<w/2+pad&&Math.abs(z)<d/2+pad&&o.altitude<(p.altitude||0)+3;};
 for(const p of [...starts,...gates]){if(solids.some(o=>overlaps(p,o,p.type==='spawn'?2:0)))err(`${p.name} is inside a solid obstacle.`);if(p.type==='spawn'&&holes.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<o.radius+3))err(`${p.name} overlaps a sinkhole.`);}
 for(const f of finish){if(holes.some(h=>Math.hypot(h.x-f.x,h.z-f.z)<h.radius+Math.hypot(f.w,f.d)/2))warnings.push('A sinkhole overlaps or approaches the finish platform.');if(solids.some(o=>overlaps(f,o,34)))err('Finish assembly overlaps a rock or city structure.');const last=gates.at(-1);if(last&&(last.z>f.z-f.d/2||Math.abs(last.x-f.x)>30))warnings.push('Final gate should approach the south edge of the finish for AI podium landings.');}
 for(const h of holes)if(h.radius>20)warnings.push(`${h.name}: ${Math.round(h.radius*2)} m gap; test with a full tank.`);
 if(stage.settings.battle)warnings.push('Battle enabled: enemies, sentries and orbital effects add load.');if(stage.settings.wilderness)warnings.push('Procedural wilderness is scenery; turn it off to place every obstacle yourself.');
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
export class StageHistory{
 constructor(stage){this.stage=clone(stage);this.undoStack=[];this.redoStack=[];}
 commit(next){if(JSON.stringify(next)===JSON.stringify(this.stage))return false;this.undoStack.push(clone(this.stage));if(this.undoStack.length>60)this.undoStack.shift();this.redoStack=[];this.stage=clone(next);return true;}
 undo(){if(!this.undoStack.length)return false;this.redoStack.push(this.stage);this.stage=this.undoStack.pop();return true;}
 redo(){if(!this.redoStack.length)return false;this.undoStack.push(this.stage);this.stage=this.redoStack.pop();return true;}
}
