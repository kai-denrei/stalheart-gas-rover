import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {
  applyRover,
  applyLocalizedDamage,
  buildPresetZoneStates,
  createColdGasSystem,
  createOnboardDisplays,
  ZONE_DEFS,
  DEBRIS_MAP,
  DURATION
} from '../assets/recon-rover/runtime.js';

const $=id=>document.getElementById(id),stage=$('stage'),base='../assets/recon-rover/';
const scene=new T.Scene();
scene.background=new T.Color(0x0a141c);

const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
stage.prepend(renderer.domElement);

const pm=new T.PMREMGenerator(renderer),env=new RoomEnvironment();
scene.environment=pm.fromScene(env).texture;
env.dispose();
pm.dispose();

const ambient=new T.HemisphereLight(0xcbe8ff,0x1a2832,1.35);
const sun=new T.DirectionalLight(0xfff0d8,1.85);
sun.position.set(6,10,7);
const thrusterGlow=new T.PointLight(0xbbeeff,0,6,1.6);
scene.add(ambient,sun,thrusterGlow);

const floor=new T.Mesh(
  new T.CircleGeometry(12,48),
  new T.MeshStandardMaterial({color:0x14232b,roughness:0.82,metalness:0.18})
);
floor.rotation.x=-Math.PI/2;
floor.position.y=-0.01;
scene.add(floor);

const grid=new T.GridHelper(20,20,0x3f6470,0x223942);
grid.position.y=-0.005;
scene.add(grid);

const camera=new T.PerspectiveCamera(40,1,0.05,120);
const controls=new OrbitControls(camera,renderer.domElement);
controls.maxPolarAngle=Math.PI*0.54;
controls.minDistance=1.4;
controls.maxDistance=28;

// Reusable cold-gas mist particle system + ground dust + D2 COPV leak mist
const coldGasFX=createColdGasSystem(T,null,{
  enabled:true,
  dust:true,
  leakEnabled:true,
  maxPlumeParticles:320,
  maxDustParticles:96,
  textureUrl:base+'cold-gas-puff.png'
});
scene.add(coldGasFX.group);

// Reusable convex collision proxy wireframe group (zero-allocation updates)
const proxyGroup=new T.Group();
proxyGroup.name='COLLISION_PROXY_OVERLAY';
proxyGroup.visible=false;
scene.add(proxyGroup);

const sharedBoxGeo=new T.BoxGeometry(1,1,1);
const sharedCylGeo=new T.CylinderGeometry(0.5,0.5,1,12);
sharedCylGeo.rotateZ(Math.PI/2);
const proxyMeshes=new Map();

function ensureProxyMesh(id,shape){
  let m=proxyMeshes.get(id);
  if(!m){
    const geo=shape==='convex_cylinder'?sharedCylGeo:sharedBoxGeo;
    const mat=new T.MeshBasicMaterial({color:0x46f09a,wireframe:true,transparent:true,opacity:0.78});
    m=new T.Mesh(geo,mat);
    m.name=id;
    proxyGroup.add(m);
    proxyMeshes.set(id,m);
  }
  return m;
}

// Populate 19 localized zone options
const zoneSelect=$('zoneSelect');
for(const z of ZONE_DEFS){
  const opt=document.createElement('option');
  opt.value=z.id;
  opt.textContent=z.label;
  zoneSelect.appendChild(opt);
}

let zoneStates=buildPresetZoneStates('d0');
let displays=null;
let root=null,variantBank=null,manifest=null,lod=1,time=5.2,playing=true,last=performance.now(),token=0,w=0,h=0;

function paint(){
  const a=stage.clientWidth,b=stage.clientHeight;
  if(!a||!b)return;
  if(a!==w||b!==h){
    w=a;h=b;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
}

function frame(kind){
  if(kind==='rear'){
    controls.target.set(0,0.78,-1.35);
    camera.position.set(0.0,1.65,-3.65);
  }else if(kind==='side'){
    controls.target.set(0,0.68,0);
    camera.position.set(-5.6,0.95,0.01);
  }else if(kind==='ventral'){
    controls.target.set(0,0.58,0.1);
    camera.position.set(2.6,0.22,2.8);
  }else if(kind==='top'){
    controls.target.set(0,0.6,0);
    camera.position.set(0,7.8,0.01);
  }else{
    controls.target.set(0,0.68,0.15);
    camera.position.set(3.9,1.85,4.2);
  }
  controls.update();
  paint();
}

function disposeBank(bank){
  if(!bank)return;
  const geos=new Set(),mats=new Set();
  for(const sc of Object.values(bank)){
    sc?.traverse(o=>{
      if(o.isMesh){
        if(o.geometry)geos.add(o.geometry);
        if(Array.isArray(o.material))o.material.forEach(m=>m&&mats.add(m));
        else if(o.material)mats.add(o.material);
      }
    });
  }
  geos.forEach(g=>g.dispose());
  mats.forEach(m=>m.dispose());
}

function buildNozzleOverrides(preset){
  if(preset==='single_v_fl'){
    return {V_FL:1,V_FR:0,V_RL:0,V_RR:0,L_FL:0,L_FR:0,L_RL:0,L_RR:0};
  }
  if(preset==='single_l_fl'){
    return {V_FL:0,V_FR:0,V_RL:0,V_RR:0,L_FL:1,L_FR:0,L_RL:0,L_RR:0};
  }
  return null;
}

function getMaxDamageLevel(){
  return Math.max(0,...ZONE_DEFS.map(z=>Number(zoneStates[z.id]??0)));
}

function updateProxyOverlay(){
  proxyGroup.visible=$('showProxies').checked;
  if(!manifest)return;
  const showDebris=$('showDebris').checked;
  const maxDmg=getMaxDamageLevel();
  const assetByDmg={};
  for(const d of [0,1,2,3]){
    assetByDmg[d]=manifest.assets.find(a=>a.lod===lod&&a.damage_level===d)||manifest.assets[0];
  }

  // Chassis core proxy
  const coreCollider=assetByDmg[maxDmg]?.colliders?.find(c=>c.zone==='CHASSIS_CORE');
  if(coreCollider){
    const m=ensureProxyMesh(coreCollider.id,coreCollider.shape);
    m.position.set(...coreCollider.center_m);
    m.scale.set(...coreCollider.size_m);
    m.rotation.set(...(coreCollider.rotation_rad||[0,0,0]));
    m.material.color.setHex(maxDmg===0?0x46f09a:maxDmg===1?0xffd24c:maxDmg===2?0xff8a24:0xff4238);
  }

  // 19 Zone proxies
  for(const z of ZONE_DEFS){
    const zd=Number(zoneStates[z.id]??0);
    const col=assetByDmg[zd]?.colliders?.find(c=>c.zone===z.id);
    if(!col)continue;
    const m=ensureProxyMesh(col.id,col.shape);
    m.position.set(...col.center_m);
    m.scale.set(...col.size_m);
    m.rotation.set(...(col.rotation_rad||[0,0,0]));
    m.material.color.setHex(zd===0?0x46f09a:zd===1?0xffd24c:zd===2?0xff8a24:0xff4238);
  }

  // 6 Detachable debris proxies
  for(const deb of DEBRIS_MAP){
    const zd=Number(zoneStates[deb.zone]??0);
    const detached=zd>=deb.minDamage;
    const dCol=assetByDmg[zd]?.debris_colliders?.find(c=>c.fragment_node===deb.id);
    if(!dCol)continue;
    const m=ensureProxyMesh(dCol.id,dCol.shape);
    m.visible=detached?showDebris:true;
    m.position.set(...dCol.center_m);
    m.scale.set(...dCol.size_m);
    m.rotation.set(...(dCol.rotation_rad||[0,0,0]));
    m.material.color.setHex(detached?0xb678ff:0x3894b8);
  }
}

function syncDamageAndProxies(){
  if(!root||!variantBank)return;
  const showDebris=$('showDebris').checked;
  const maxDmg=getMaxDamageLevel();

  if(lod<2){
    applyLocalizedDamage(root,variantBank,zoneStates,{showDebris});
  }else{
    const targetStatic=root.getObjectByName('ROVER_STATIC_BODY');
    const donorStatic=variantBank[maxDmg]?.getObjectByName('ROVER_STATIC_BODY');
    if(targetStatic?.isMesh&&donorStatic?.isMesh&&targetStatic.geometry!==donorStatic.geometry){
      targetStatic.geometry=donorStatic.geometry;
    }
  }

  // Summarize active zone states
  const counts=[0,0,0,0];
  for(const z of ZONE_DEFS)counts[Number(zoneStates[z.id]??0)]++;
  const activeSel=zoneSelect.value;
  $('zoneLevel').value=String(zoneStates[activeSel]??0);
  $('zoneSummary').textContent=`D0:${counts[0]} D1:${counts[1]} D2:${counts[2]} D3:${counts[3]}`;

  // Update stats & download link for active dominant damage level
  if(manifest){
    const e=manifest.assets.find(a=>a.lod===lod&&a.damage_level===maxDmg)||manifest.assets.find(a=>a.lod===lod);
    if(e){
      const file=$('encoding').value==='plain'?e.file:e.meshopt_file;
      $('stats').textContent=`D${maxDmg} / LOD${lod} · ${e.triangles.toLocaleString()} triangles · ${e.draw_calls} draws · ${e.bytes.toLocaleString()} plain bytes · ${e.meshopt_bytes.toLocaleString()} Meshopt bytes`;
      $('download').href=base+file;
      $('status').textContent=`R-47X D${maxDmg} / LOD${lod} · ${lod===2?'Static merged distance tier (1 draw)':'19-zone localized damage + 6 wheels + 8 nozzles + 4 UV displays'} · Game review pending`;
    }
  }

  updateProxyOverlay();
  update(0.016);
}

function update(dt=0.016){
  if(!root)return;
  const thrusters=$('thrusters').checked&&lod<2;
  const dust=$('dust').checked&&lod<2;
  const jump=$('jump').checked&&lod<2;
  const gasLeak=$('gasLeak').checked&&lod<2;
  const leakIntensity=Number($('leakIntensity').value)||0;
  const autoMode=$('autoSteer').checked;
  const speedMps=Number($('speed').value)||0;
  const steerDeg=autoMode?null:Number($('steer').value)||0;
  const suspBiasM=Number($('susp').value)||0;
  const gimbalDeg=Number($('gimbal').value)||0;
  const mastYawDeg=autoMode?null:Number($('mast').value)||0;
  const mastPitchDeg=autoMode?null:Number($('mastPitch').value)||0;
  const preset=$('nozzlePreset').value;
  const maxDmg=getMaxDamageLevel();

  $('speedVal').textContent=`${speedMps>=0?'+':''}${speedMps.toFixed(1)} m/s`;
  $('suspVal').textContent=`${suspBiasM>=0?'+':''}${suspBiasM.toFixed(2)} m`;
  $('gimbalVal').textContent=`${gimbalDeg}°`;
  $('leakVal').textContent=leakIntensity.toFixed(2);

  const s=applyRover(root,time,lod,{
    thrusters,
    jump,
    speedMps,
    steerDeg,
    suspBiasM,
    gimbalPitchDeg:gimbalDeg,
    gimbalRollDeg:gimbalDeg*0.75,
    nozzlePreset:preset,
    nozzleOverrides:buildNozzleOverrides(preset),
    mastYawDeg,
    mastPitchDeg,
    damageLevel:maxDmg,
    zoneStates,
    gasLeak,
    leakIntensity
  });

  if(autoMode){
    $('steer').value=Math.round(s.steerDeg);
    $('mast').value=Math.round(s.mastYawDeg);
    $('mastPitch').value=Math.round(s.mastPitchDeg);
  }
  $('steerVal').textContent=`${Math.round(s.steerDeg)}°`;
  $('mastVal').textContent=`${Math.round(s.mastYawDeg)}° / ${Math.round(s.mastPitchDeg)}°`;

  root.updateMatrixWorld(true);
  coldGasFX.setEnabled(thrusters);
  coldGasFX.setDustEnabled(dust);
  coldGasFX.setLeakEnabled(gasLeak);
  coldGasFX.step(dt,s.nozzleIntensities,root,s.leakIntensities);

  if(displays&&lod<2){
    displays.update(s.telemetry,root);
  }

  thrusterGlow.position.set(0,Math.max(0.22,s.chassisY-0.25),s.chassisZ);
  thrusterGlow.intensity=thrusters?s.plumeIntensity*2.2:0;
  $('phase').textContent=`${s.phase} · ${time.toFixed(1)} s`;
  $('time').value=time;
  paint();
}

async function load(){
  const my=++token,next=Number($('lod').value);
  $('status').textContent='Loading R-47X D0–D3 variant bank…';
  try{
    if(!manifest){
      const r=await fetch(base+'manifest.json');
      if(!r.ok)throw Error('Manifest HTTP '+r.status);
      manifest=await r.json();
    }
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const isPlain=$('encoding').value==='plain';
    const entries=[0,1,2,3].map(d=>manifest.assets.find(a=>a.lod===next&&a.damage_level===d));
    const gltfs=await Promise.all(
      entries.map(e=>loader.loadAsync(base+(isPlain?e.file:e.meshopt_file)))
    );
    const nextBank={0:gltfs[0].scene,1:gltfs[1].scene,2:gltfs[2].scene,3:gltfs[3].scene};
    // Clone D0 scene as the live editable root so variantBank[0] keeps pristine D0 geometry references
    const liveScene=gltfs[0].scene.clone(true);
    if(my!==token){
      disposeBank(nextBank);
      return;
    }
    if(root)scene.remove(root);
    if(variantBank)disposeBank(variantBank);

    variantBank=nextBank;
    root=liveScene;
    scene.add(root);
    lod=next;
    displays=lod<2?createOnboardDisplays(T,root):null;
    root.traverse(o=>{if(o.isMesh)o.material.wireframe=$('wire').checked;});

    for(const id of ['zoneSelect','zoneLevel','time','play','speed','autoSteer','steer','susp','nozzlePreset','gimbal','mast','mastPitch','thrusters','dust','jump','gasLeak','leakIntensity','showDebris']){
      $(id).disabled=lod===2;
    }
    if(lod===2){
      playing=false;
      $('play').textContent='Play';
      coldGasFX.setEnabled(false);
      coldGasFX.setLeakEnabled(false);
    }

    syncDamageAndProxies();
    window.reconRoverViewer={
      get root(){return root;},
      get variantBank(){return variantBank;},
      get zoneStates(){return zoneStates;},
      scene,
      renderer,
      camera,
      manifest,
      coldGasFX,
      displays,
      proxyGroup,
      syncDamageAndProxies
    };
  }catch(e){
    if(my===token)$('status').textContent='Load failed: '+e.message;
  }
}

$('lod').onchange=load;
$('encoding').onchange=load;

$('damagePreset').onchange=e=>{
  zoneStates=buildPresetZoneStates(e.target.value);
  syncDamageAndProxies();
};

$('zoneSelect').onchange=e=>{
  $('zoneLevel').value=String(zoneStates[e.target.value]??0);
};

$('zoneLevel').onchange=e=>{
  const zId=$('zoneSelect').value;
  zoneStates[zId]=Number(e.target.value)||0;
  syncDamageAndProxies();
};

for(const id of ['showDebris','showProxies']){
  $(id).onchange=()=>syncDamageAndProxies();
}

$('time').oninput=e=>{
  playing=false;
  $('play').textContent='Play';
  time=Number(e.target.value);
  update(0.016);
};
for(const id of ['steer','mast','mastPitch']){
  $(id).oninput=()=>{
    $('autoSteer').checked=false;
    update(0.016);
  };
}
for(const id of ['speed','autoSteer','susp','nozzlePreset','gimbal','thrusters','dust','jump','gasLeak','leakIntensity']){
  $(id).oninput=()=>update(0.016);
}
$('wire').onchange=e=>{
  root?.traverse(o=>{if(o.isMesh)o.material.wireframe=e.target.checked;});
  paint();
};
$('play').onclick=()=>{
  if(lod===2)return;
  playing=!playing;
  $('play').textContent=playing?'Pause':'Play';
  last=performance.now();
};
$('reset').onclick=()=>{
  playing=false;
  $('play').textContent='Play';
  time=0;
  $('damagePreset').value='d0';
  zoneStates=buildPresetZoneStates('d0');
  $('speed').value=4.2;
  $('autoSteer').checked=true;
  $('steer').value=0;
  $('susp').value=0;
  $('nozzlePreset').value='auto';
  $('gimbal').value=0;
  $('mast').value=0;
  $('mastPitch').value=-8;
  $('gasLeak').checked=true;
  $('leakIntensity').value=0.75;
  $('showDebris').checked=true;
  coldGasFX.clear();
  syncDamageAndProxies();
};
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>frame(b.dataset.camera);
addEventListener('resize',paint);
new ResizeObserver(paint).observe(stage);

frame('recon');
load();
requestAnimationFrame(function loop(now){
  const dt=Math.min(0.1,(now-last)/1000);
  last=now;
  if(playing&&lod<2){
    time=(time+dt)%DURATION;
  }
  if(lod<2)update(dt);
  requestAnimationFrame(loop);
});
