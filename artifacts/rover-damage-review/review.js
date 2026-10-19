import * as T from '../../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../../upstream/stalheart/vendor/GLTFLoader.js';
import {ZONE_DEFS,buildPresetZoneStates,applyLocalizedDamage,roverState,createColdGasSystem,createOnboardDisplays} from './runtime.js';
import {CASES,THRESHOLDS,damageFor,timing,sample,GRAVITY} from './impact-model.js';

const $=id=>document.getElementById(id);
const label=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color(0x101d28);
scene.add(new T.HemisphereLight(0xd7ecff,0x426052,2.5));
const sun=new T.DirectionalLight(0xffe6c7,3.5);sun.position.set(-5,10,5);scene.add(sun);
const fill=new T.DirectionalLight(0x94c7e5,1.5);fill.position.set(4,4,-5);scene.add(fill);
const grid=new T.GridHelper(60,60,0x426962,0x233b3e);grid.position.y=-.025;scene.add(grid);
const ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:0x142930,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.03;scene.add(ground);
const camera=new T.PerspectiveCamera(43,1,.1,120);
let yaw=-2.5,pitch=.38,distance=10.8,drag=null,last=performance.now();
let test=CASES[0],speed=test.speed,time=0,playing=true,series=false,manual=false,stageKey='',displayClock=0,seedLeaks=false;
let states=buildPresetZoneStates('d0'),core=0,currentSample=sample(test,speed,time),appliedCore=0;
const obstacle=new T.Group();scene.add(obstacle);
const block=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x5d6d69,roughness:.85}));obstacle.add(block);
const edges=new T.LineSegments(new T.EdgesGeometry(block.geometry),new T.LineBasicMaterial({color:0xb5c8b2}));block.add(edges);
const contactMarker=new T.Mesh(new T.SphereGeometry(.095,12,8),new T.MeshBasicMaterial({color:0xffcf85,depthTest:false,transparent:true}));contactMarker.renderOrder=10;scene.add(contactMarker);
const contactPoint=new T.Vector3();

try {
 const assets=await Promise.all([0,1,2,3].map(d=>new GLTFLoader().loadAsync(`./r47x_recon_rover_d${d}_lod1.glb`)));
 const bank=Object.fromEntries(assets.map((a,d)=>[d,a.scene])),root=bank[0].clone(true);scene.add(root);
 root.getObjectByName('COLD_GAS_PLUMES').visible=false;
 const chassis=root.getObjectByName('ROVER_CHASSIS_JUMP'),chassisRest=chassis.position.clone();
 const displays=createOnboardDisplays(T,root),texture=await new T.TextureLoader().loadAsync('../../assets/recon-rover/cold-gas-puff.png');
 const fx=createColdGasSystem(T,root,{texture,dust:false,maxPlumeParticles:160,groundY:0});scene.add(fx.group);fx.setEnabled(false);fx.setLeakEnabled(true);
 root.updateWorldMatrix(true,true);
 // Measure collision surfaces from the intact asset, rather than guessing the art scale.
 const boxFor=name=>new T.Box3().setFromObject(root.getObjectByName(name));
 const noseBox=boxFor('ZONE_FRONT_BUMPER'),wheelBox=boxFor('WHEEL_FL'),sideBox=boxFor('ZONE_FLANK_NEG_X');
 for(const c of CASES)$('scenario').add(new Option(c.name,c.id));
 $('zone').add(new Option('Whole rover — all zones','ALL'));
 for(const z of ZONE_DEFS)$('zone').add(new Option(z.label,z.id));

 function setupObstacle(){
  obstacle.visible=!manual&&test.kind!=='landing';
  if(test.kind==='front'){
   block.scale.set(3.5,1.25,.45);block.position.set(0,.625,noseBox.max.z+.225);
   contactPoint.set(0,(noseBox.min.y+noseBox.max.y)/2,noseBox.max.z);
  }else if(test.kind==='wheel'){
   block.scale.set(.62,.40,.6);block.position.set((wheelBox.min.x+wheelBox.max.x)/2,.20,wheelBox.max.z+.30);
   contactPoint.set(block.position.x,.28,wheelBox.max.z);
  }else if(test.kind==='side'){
   // Narrow upright between the front and middle tyres isolates the flank hit.
   block.scale.set(.5,1.65,.3);block.position.set(sideBox.min.x-.25,.825,.55);
   contactPoint.set(sideBox.min.x,Math.min(1,sideBox.max.y),.55);
  }else contactPoint.set(-.98,.05,1.44);
 }
 function setDamage(force=false){
  const outcome=damageFor(test,speed,$('profile').value);
  if(!manual){states={...buildPresetZoneStates('d0'),...(currentSample.hit?outcome.zones:{})};core=currentSample.hit?outcome.core:0;}
  const shown=$('before').checked?buildPresetZoneStates('d0'):states;
  const shownCore=$('before').checked?0:core;
  const key=JSON.stringify([shown,shownCore,$('global').checked]);
  if(force||stageKey!==key){
   stageKey=key;fx.clear();seedLeaks=true;
   // Hide the authored floating debris display; this test isolates damage silhouettes.
   applyLocalizedDamage(root,bank,shown,{showDebris:false});
   appliedCore=$('global').checked?Math.max(shownCore,...Object.values(shown)):shownCore;
   for(const name of ['CHASSIS_ARMOR_BODY','DISPLAY_CRACK_OVERLAY']){
    const target=root.getObjectByName(name);target.geometry=bank[appliedCore].getObjectByName(name).geometry;
    if(name==='DISPLAY_CRACK_OVERLAY')target.visible=appliedCore>0;
   }
   displayClock=1;
  }
  const damaged=Object.entries(states).filter(([,d])=>d>0);
  const max=Math.max(core,...Object.values(states));
  label('phase',manual?'MANUAL ASSET INSPECTION':`${CASES.indexOf(test)+1} / ${CASES.length} · ${time<1?'READY':!currentSample.hit?'APPROACH':currentSample.age<.35?'CONTACT':'RESULT'}${series?' · AUTO SERIES':''}`);
  label('result',$('before').checked?'Intact comparison':max?`D${max} · ${['','Battered','Component damage','Component destroyed'][max]}`:currentSample.hit?'No visible damage':'Fresh rover');
  label('metrics',manual?`${damaged.length} damaged zone(s) · chassis D${appliedCore}`:`Normal impact: ${speed.toFixed(1)} m/s · ${(speed*3.6).toFixed(0)} km/h\n${test.kind==='landing'?'20% suspension allowance · ':''}${damaged.length} damaged zone(s) · chassis D${appliedCore}\n${damaged.map(([id,d])=>`${id.replaceAll('_',' ')} D${d}`).join(' · ')||'All components intact'}`);
  label('comparison',$('before').checked?'Same pose and camera; damage hidden for comparison.':$('global').checked?'Supplied behavior: worst component stage also affects the whole chassis.':'Localized damage · loose debris hidden for silhouette comparison');
  $('timeline').value=time;$('time-value').value=`${time.toFixed(2)} s`;
  return shown;
 }
 function update(dt=0){
  currentSample=sample(test,speed,time);
  const shown=setDamage();
  root.position.set(0,0,0);root.rotation.set(0,0,0);chassis.position.copy(chassisRest);
  const s=manual?{...currentSample,offset:0,velocity:0,age:2,hit:true}:currentSample;
  if(!manual){
   if(test.kind==='landing')root.position.y=s.offset;
   else if(test.kind==='side')root.position.x=s.offset;
   else root.position.z=-s.offset;
   // One short suspension compression at contact, no continual vibration.
   if(s.hit)chassis.position.y-=Math.min(.065,speed*.004)*Math.sin(Math.min(1,s.age/.3)*Math.PI);
  }
  for(const id of ['FL','FR','ML','MR','RL','RR']){
   const spin=root.getObjectByName('WHEEL_SPIN_'+id);
   spin.rotation.x=!manual&&(test.kind==='front'||test.kind==='wheel')?(4-s.offset)/.48:0;
  }
  contactMarker.visible=!manual&&s.hit&&s.age<.8;contactMarker.position.copy(contactPoint);contactMarker.material.opacity=Math.max(0,1-s.age/.8);
  const state=roverState(time,{zoneStates:shown,thrusters:false,speedMps:Math.abs(s.velocity),steerDeg:0,mastYawDeg:0,mastPitchDeg:0});
  root.updateWorldMatrix(true,true);
  if(seedLeaks){seedLeaks=false;for(let i=0;i<12;i++)fx.step(1/60,state.nozzleIntensities,root,state.leakIntensities);}
  if(dt>0)fx.step(dt,state.nozzleIntensities,root,state.leakIntensities);
  displayClock+=dt;
  if(displayClock>=.1){displayClock=0;displays.update({...state.telemetry,damageLevel:appliedCore,gasReserve:1,speedMps:Math.abs(s.velocity),heightM:root.position.y,pitchDeg:0,rollDeg:0,yawRateDeg:0,pitchRateDeg:0,rollRateDeg:0});}
 }
 function setPlaying(value){playing=value;$('play').textContent=playing?'Pause':'Play';}
 function setSeries(value){series=value;$('series').textContent=series?'Stop series':'Run all 8';}
 function start(id,keepSeries=false){
  test=CASES.find(c=>c.id===id)||CASES[0];speed=test.speed;$('scenario').value=test.id;$('speed').value=speed;time=0;manual=false;
  $('before').checked=false;if(!keepSeries)setSeries(false);
  $('description').textContent=test.note;configure();setPlaying(true);
  yaw=test.kind==='side'?-.95:-2.35;pitch=.38;distance=10.8;
 }
 function configure(){
  $('speed-value').value=`${speed.toFixed(1)} m/s`;
  $('thresholds').textContent=`D1 ≥ ${THRESHOLDS[$('profile').value][0]} · D2 ≥ ${THRESHOLDS[$('profile').value][1]} · D3 ≥ ${THRESHOLDS[$('profile').value][2]} m/s${test.kind==='landing'?' after suspension allowance':''}`;
  $('timeline').max=timing(test,speed).end;setupObstacle();stageKey='';update();
 }
 function seek(t){manual=false;setupObstacle();setSeries(false);setPlaying(false);time=Math.max(0,Math.min(timing(test,speed).end,t));fx.clear();update();}
 $('scenario').onchange=()=>start($('scenario').value);
 $('speed').oninput=()=>{speed=Number($('speed').value);time=0;manual=false;setSeries(false);configure();setPlaying(false);};
 $('profile').onchange=()=>{configure();};
 $('replay').onclick=()=>{time=0;manual=false;setSeries(false);$('before').checked=false;configure();setPlaying(true);};
 $('series').onclick=()=>{if(series)setSeries(false);else{setSeries(true);start(CASES[0].id,true);}};
 $('play').onclick=()=>{if(time>=timing(test,speed).end&&!manual)time=0;setPlaying(!playing);};
 $('timeline').oninput=()=>seek(Number($('timeline').value));
 $('contact').onclick=()=>seek(timing(test,speed).contact);
 $('after').onclick=()=>seek(timing(test,speed).end);
 $('before').onchange=()=>update();$('global').onchange=()=>update();
 $('manual').onclick=()=>{manual=true;setSeries(false);setPlaying(false);const level=Number($('level').value);states=$('zone').value==='ALL'?buildPresetZoneStates('d'+level):{...buildPresetZoneStates('d0'),[$('zone').value]:level};core=$('zone').value==='ALL'?level:0;setupObstacle();update();};
 $('front').onclick=()=>yaw=-2.5;$('rear').onclick=()=>yaw=-.55;$('side').onclick=()=>yaw=-Math.PI/2;
 $('scene').onpointerdown=e=>{drag=[e.clientX,e.clientY];$('scene').setPointerCapture(e.pointerId);};
 $('scene').onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.008;pitch=Math.max(.05,Math.min(1.3,pitch+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY];};
 $('scene').onpointerup=$('scene').onpointercancel=()=>drag=null;
 $('scene').addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(5,Math.min(24,distance+e.deltaY*.008));},{passive:false});
 function render(now){
  const dt=playing?Math.min(.05,(now-last)/1000)*Number($('rate').value):0;last=now;
  if(playing&&!manual){time=Math.min(timing(test,speed).end,time+dt);if(time>=timing(test,speed).end){if(series){const next=CASES.indexOf(test)+1;if(next<CASES.length)start(CASES[next].id,true);else{setSeries(false);setPlaying(false);}}else setPlaying(false);}}
  update(dt);
  const w=innerWidth,h=innerHeight;
  if(renderer.domElement.width!==Math.floor(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const target=new T.Vector3(root.position.x*.45,1+root.position.y*.35,root.position.z*.45);
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,-Math.cos(yaw)*Math.cos(pitch)*distance).add(target);
  camera.lookAt(target);
  // Keep the inspection bay centered in the space beside the controls, independent of orbit.
  camera.setViewOffset(w,h,w>500?-(w>750?175:130):0,w<=500?h*.13:0,w,h);
  renderer.render(scene,camera);requestAnimationFrame(render);
 }
 start(CASES[0].id);$('loading').hidden=true;requestAnimationFrame(render);
 window.damageReview={ready:true,root,bank,renderer,fx,cases:CASES,start,seek,get time(){return time},get states(){return {...states}},get core(){return appliedCore},get current(){return {...currentSample}},get playing(){return playing},get series(){return series},get scenario(){return test.id},setSpeed(v){$('speed').value=v;$('speed').dispatchEvent(new Event('input'));},setProfile(v){$('profile').value=v;$('profile').dispatchEvent(new Event('change'));}};
}catch(error){$('loading').textContent=`Could not load the preview: ${error.message}`;console.error(error);}
