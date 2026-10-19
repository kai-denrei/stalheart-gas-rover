import * as T from '../../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../../upstream/stalheart/vendor/GLTFLoader.js';
import {applyLocalizedDamage,buildPresetZoneStates,roverState,createColdGasSystem,createOnboardDisplays} from './runtime.js';
import {GROUPS,HIT_COUNT,accumulatedDamage} from './accumulation-model.js';
const $=id=>document.getElementById(id);
const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0x101d28);scene.add(new T.HemisphereLight(0xd7ecff,0x426052,2.5));
for(const [color,intensity,position] of [[0xffe6c7,3.5,[-5,10,5]],[0x94c7e5,1.5,[4,4,-5]]]){const light=new T.DirectionalLight(color,intensity);light.position.fromArray(position);scene.add(light);}
const grid=new T.GridHelper(60,60,0x426962,0x233b3e);grid.position.y=-.025;scene.add(grid);
const floor=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:0x142930,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;scene.add(floor);
const camera=new T.PerspectiveCamera(43,1,.1,120);
let yaw=-2.35,pitch=.38,distance=9.4,drag=null,last=performance.now();
let damage=accumulatedDamage(0),playing=true,elapsed=0,clock=0,displayClock=0;
for(const g of GROUPS){const card=document.createElement('div');card.className='stage-card';card.id='group-'+g.id;card.append(document.createTextNode(g.label));const level=document.createElement('strong');level.textContent='D0';card.append(level);$('groups').append(card);}
try{
 const loaded=await Promise.all([0,1,2,3].map(d=>new GLTFLoader().loadAsync(`./r47x_recon_rover_d${d}_lod1.glb`)));
 const bank=Object.fromEntries(loaded.map((a,d)=>[d,a.scene])),root=bank[0].clone(true);scene.add(root);root.getObjectByName('COLD_GAS_PLUMES').visible=false;
 const displays=createOnboardDisplays(T,root),texture=await new T.TextureLoader().loadAsync('../../assets/recon-rover/cold-gas-puff.png');
 const fx=createColdGasSystem(T,root,{texture,dust:false,maxPlumeParticles:160,groundY:0});scene.add(fx.group);fx.setEnabled(false);fx.setLeakEnabled(true);
 let shown=damage.states,shownCore=0;
 function setPlaying(value){playing=Boolean(value)&&!damage.wreck;$('play').textContent=playing?'Pause':damage.wreck?'Complete':'Resume';$('play').disabled=damage.wreck;}
 function telemetry(){return roverState(clock,{zoneStates:shown,thrusters:false,speedMps:0,steerDeg:0,mastYawDeg:0,mastPitchDeg:0});}
 function updateDisplay(state){displays.update({...state.telemetry,damageLevel:shownCore,gasReserve:shownCore===3?0:1,speedMps:0,heightM:0,pitchDeg:0,rollDeg:0,yawRateDeg:0,pitchRateDeg:0,rollRateDeg:0});}
 function apply(){
  shown=$('before').checked?buildPresetZoneStates('d0'):damage.states;shownCore=$('before').checked?0:damage.core;
  applyLocalizedDamage(root,bank,shown,{showDebris:false});
  for(const name of ['CHASSIS_ARMOR_BODY','DISPLAY_CRACK_OVERLAY']){const mesh=root.getObjectByName(name);mesh.geometry=bank[shownCore].getObjectByName(name).geometry;if(name==='DISPLAY_CRACK_OVERLAY')mesh.visible=shownCore>0;}
  root.updateWorldMatrix(true,true);fx.clear();const state=telemetry();
  // Seed a short leak snapshot so paused and scrubbed D2 stages remain inspectable.
  for(let i=0;i<12;i++)fx.step(1/60,state.nozzleIntensities,root,state.leakIntensities);
  updateDisplay(state);
  $('step').value=damage.hits;$('hit-value').value=`${damage.hits} / ${HIT_COUNT}`;
  $('phase').textContent=damage.wreck?'SEQUENCE COMPLETE':`ACCUMULATED DAMAGE · HIT ${damage.hits} / ${HIT_COUNT}`;
  const names=['Intact','Battered','Heavily damaged','Complete wreck'];
  $('result').textContent=$('before').checked?'Intact comparison':damage.hits%4?`D${damage.core} → D${damage.core+1} · Damage building`:`D${damage.core} · ${names[damage.core]}`;
  $('metrics').textContent=damage.last?`Last hit: ${damage.last.label} → D${damage.last.level}\n${Object.values(damage.states).filter(d=>d>0).length} / 19 zones damaged · chassis D${damage.core}`:'All 19 zones intact. First hit targets the front assembly.';
  $('comparison').textContent=$('before').checked?'Damage is hidden. Uncheck to return to the accumulated state.':damage.wreck?'All assemblies and chassis at D3. Restart or step backward to compare.':'Damage carries forward. Earlier damage is never reset between hits.';
  $('hit-progress').firstElementChild.style.width=`${damage.hits/HIT_COUNT*100}%`;
  for(const g of damage.groups){const card=$('group-'+g.id);card.querySelector('strong').textContent='D'+g.level;card.classList.toggle('active',g.id===damage.last?.id);}
  for(const el of document.querySelectorAll('[data-milestone]'))el.classList.toggle('done',damage.hits>=Number(el.dataset.milestone));
  $('history').replaceChildren();
  for(let hit=damage.hits;hit>Math.max(0,damage.hits-4);hit--){const row=document.createElement('li'),s=accumulatedDamage(hit);row.textContent=`${String(hit).padStart(2,'0')} · ${s.last.label} → D${s.last.level}`;$('history').append(row);}
  if(!damage.hits){const row=document.createElement('li');row.textContent='No hits yet.';$('history').append(row);}
  $('previous').disabled=damage.hits===0;$('next').disabled=damage.wreck;
 }
 function seek(hits,{pause=true}={}){damage=accumulatedDamage(hits);elapsed=0;if(pause||damage.wreck)setPlaying(false);else setPlaying(playing);apply();}
 $('play').onclick=()=>setPlaying(!playing);
 $('restart').onclick=()=>{$('before').checked=false;seek(0);clock=0;setPlaying(true);};
 $('next').onclick=()=>seek(damage.hits+1);$('previous').onclick=()=>seek(damage.hits-1);
 $('step').oninput=()=>seek(Number($('step').value));$('interval').onchange=()=>{elapsed=0;};
 $('before').onchange=()=>{if($('before').checked)setPlaying(false);apply();};
 $('front').onclick=()=>yaw=-2.35;$('rear').onclick=()=>yaw=-.55;$('side').onclick=()=>yaw=-Math.PI/2;
 $('scene').onpointerdown=e=>{drag=[e.clientX,e.clientY];$('scene').setPointerCapture(e.pointerId);};
 $('scene').onpointermove=e=>{if(!drag)return;$('orbit').checked=false;yaw-=(e.clientX-drag[0])*.008;pitch=Math.max(.05,Math.min(1.3,pitch+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY];};
 $('scene').onpointerup=$('scene').onpointercancel=()=>drag=null;
 $('scene').addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(5,Math.min(24,distance+e.deltaY*.008));},{passive:false});
 function render(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(playing){elapsed+=dt;clock+=dt;if(elapsed>=Number($('interval').value))seek(damage.hits+1,{pause:false});}
  if($('orbit').checked)yaw+=dt*.14;
  if(playing){const state=telemetry();fx.step(dt,state.nozzleIntensities,root,state.leakIntensities);displayClock+=dt;if(displayClock>=.1){displayClock=0;updateDisplay(state);}}
  const w=innerWidth,h=innerHeight;
  if(renderer.domElement.width!==Math.floor(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance+1,-Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,1,0);camera.setViewOffset(w,h,w>500?-(w>750?175:130):0,w<=500?h*.13:0,w,h);
  renderer.render(scene,camera);requestAnimationFrame(render);
 }
 apply();$('loading').hidden=true;last=performance.now();requestAnimationFrame(render);
 window.accumulationReview={ready:true,root,bank,renderer,seek,get damage(){return structuredClone(damage)},get playing(){return playing},get elapsed(){return elapsed}};
}catch(error){$('loading').textContent=`Could not load the preview: ${error.message}`;console.error(error);}
