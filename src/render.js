import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {LOOKS} from '../upstream/stalheart/src/looks.js';
import {createSinkhole} from '../upstream/stalheart/src/sinkhole.js';
import {SINKHOLE_BOUNDARY_GLSL} from '../upstream/stalheart/src/core/sinkhole-shape.js';
import {RADIUS,CENTER,point,frameAt,upAt,terrainSample,localOnSphere} from './world.js';
import {bakeSinkholeColliders,sinkholeStamp,blocked} from './collisions.js';
import {TREMOR} from './race-hazards.js';
import {createDriftTrails} from './drift-trails.js';
import {RoverRig} from './rover-rig.js';
import {createRoverInstruments} from './rover-instruments.js';
import {loadRoverFleet} from './rover-fleet.js';
import {createStalheartSky} from './sky.js';
import {PerformanceMonitor} from './performance.js';
import {RoverCameraHeading} from './rover-camera-heading.js';
const green=0xaff3ce,amber=0xffbf7b;
LOOKS.roverLab={...LOOKS.tronColors,floors:{...LOOKS.tronColors.floors,room:[.12,.18,.17]},walls:{top:[.14,.18,.17],side:[.09,.13,.13]},edges:{color:0xa9d4b4,opacity:.5,additive:false}};
export class Presentation {
 constructor(canvas,world,sim){
  this.world=world;this.sim=sim;this.scene=new T.Scene();this.scene.background=new T.Color(0x101d28);this.scene.fog=new T.FogExp2(0x172b35,.0018);
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.performance=new PerformanceMonitor(this.renderer);this.camera=new T.PerspectiveCamera(56,1,.12,RADIUS*80);this.camera.position.set(15,12,-22);this.scene.add(new T.HemisphereLight(0xc4e8ff,0x263b35,2.2));
  const sun=new T.DirectionalLight(0xffe3bc,3.5);sun.position.set(-100,200,-80);this.scene.add(sun);this.sun=sun;
  this.mode='chase';this.distance=13;this.orbit=0;this.pitch=.40;this.look=new T.Vector3();this.cameraInitialized=false;this.effects=[];this.shadow=new T.Mesh(new T.CircleGeometry(2.6,32),new T.MeshBasicMaterial({color:0x02090c,transparent:true,opacity:.26,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.scene.add(this.shadow);
  this.exhaustionMarker=new T.Mesh(new T.OctahedronGeometry(.5),new T.MeshBasicMaterial({color:0xffb575,wireframe:true}));this.exhaustionMarker.visible=false;this.scene.add(this.exhaustionMarker);
  this.cameraHeading=new RoverCameraHeading();this.drawFixtures();
 }
 async load(){this.sky=createStalheartSky(this.renderer,this.scene,this.world);await Promise.all([this.loadGround(),this.loadRover()]);await this.loadSinkholes();this.renderer.compile(this.scene,this.camera);}
 async loadGround(){
  const data=await fetch('./assets/planet-grid.bin').then(r=>r.arrayBuffer()),header=new Uint32Array(data,0,2),verts=new Float32Array(data,8,header[0]),quads=new Uint32Array(data,8+header[0]*4,header[1]);
  const positions=new Float32Array(verts.length);for(let i=0;i<verts.length;i+=3){positions[i]=verts[i]*RADIUS;positions[i+1]=verts[i+1]*RADIUS-RADIUS;positions[i+2]=verts[i+2]*RADIUS;}
  const index=new Uint32Array(quads.length/4*6),lines=[];const seen=new Set();let j=0;
  for(let i=0;i<quads.length;i+=4){const [a,b,c,d]=quads.subarray(i,i+4);index.set([a,b,c,a,c,d],j);j+=6;for(const [u,v] of [[a,b],[b,c],[c,d],[d,a]]){const key=Math.min(u,v)*header[0]+Math.max(u,v);if(seen.has(key))continue;seen.add(key);lines.push(u,v);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(new T.BufferAttribute(index,1));g.computeVertexNormals();
  const floorMat=new T.MeshStandardMaterial({color:0x233c40,roughness:.95,metalness:.15});this.patchFloor(floorMat);this.ground=new T.Mesh(g,floorMat);this.ground.receiveShadow=true;this.scene.add(this.ground);
  const lineGeo=new T.BufferGeometry();lineGeo.setAttribute('position',new T.BufferAttribute(positions,3));lineGeo.setIndex(lines);const mat=new T.LineBasicMaterial({color:0x7ac5ac,transparent:true,opacity:.18,depthWrite:false});this.patchFloor(mat);const grid=new T.LineSegments(lineGeo,mat);grid.scale.setScalar(1.00004);grid.position.y=RADIUS*.00004;this.scene.add(grid);
 }
 patchFloor(material){this.floorUniforms??=[];const holes=this.world.holes;if(!holes.length)return;const frames=holes.map(h=>new T.Matrix4().compose(h.origin,h.frame.q,new T.Vector3(1,1,1)).invert());const radii={value:holes.map(h=>h.radius)};this.floorUniforms.push(radii);
  material.onBeforeCompile=shader=>{
   shader.uniforms.uHoleCenters={value:holes.map(h=>h.origin)};shader.uniforms.uHoleFrames={value:frames};shader.uniforms.uHoleRadii=radii;
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLabWorld;').replace('#include <project_vertex>','#include <project_vertex>\nvLabWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vLabWorld;uniform vec3 uHoleCenters[${holes.length}];uniform mat4 uHoleFrames[${holes.length}];uniform float uHoleRadii[${holes.length}];\n${SINKHOLE_BOUNDARY_GLSL}`)
    .replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nfor(int i=0;i<${holes.length};i++){vec3 hd=vLabWorld-uHoleCenters[i];float reach=uHoleRadii[i]*1.4+3.0;if(dot(hd,hd)>reach*reach)continue;vec3 p=(uHoleFrames[i]*vec4(vLabWorld,1.0)).xyz;p.y+=${RADIUS.toFixed(8)};float d=length(p.xz);float arc=atan(d,p.y)*${RADIUS.toFixed(8)};if(arc<uHoleRadii[i]*sinkholeRim(atan(p.z,p.x)))discard;}`);
  };material.customProgramCacheKey=()=> 'rover-independent-sinkholes-v3-'+holes.length;
 }
 drawFixtures(){
  this.padGroups=[];
  for(const [i,p] of this.world.pads.entries()){
   const group=new T.Group();group.position.copy(p.origin);group.quaternion.copy(p.frame.q);this.scene.add(group);this.padGroups.push(group);
   const disk=new T.Mesh(new T.CylinderGeometry(6,6,.08,64),new T.MeshStandardMaterial({color:0x344b4a,roughness:.75,metalness:.4}));disk.position.y=.03;group.add(disk);
   const ring=new T.Mesh(new T.RingGeometry(5.7,5.82,64),new T.MeshBasicMaterial({color:green,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.085;group.add(ring);
   const crossMat=new T.MeshBasicMaterial({color:0x9cd7c0});for(const a of [0,Math.PI/2]){const m=new T.Mesh(new T.PlaneGeometry(2.4,.1),crossMat);m.rotation.set(-Math.PI/2,0,a);m.position.y=.09;group.add(m);}
   if(!this.world.race)for(const x of [-6,6]){const post=new T.Mesh(new T.CylinderGeometry(.08,.12,1.2,6),new T.MeshStandardMaterial({color:0x80918b}));post.position.set(x,.6,0);group.add(post);const cap=new T.Mesh(new T.SphereGeometry(.12,8,8),new T.MeshBasicMaterial({color:green}));cap.position.set(x,1.25,0);group.add(cap);}
  }
  for(const r of this.world.rocks){const m=new T.Mesh(new T.BoxGeometry(r.w,r.h,r.d),new T.MeshStandardMaterial({color:r.color||0x425053,roughness:1}));m.position.copy(r.origin).addScaledVector(r.frame.up,r.h/2);m.quaternion.copy(r.frame.q);this.scene.add(m);const edges=new T.LineSegments(new T.EdgesGeometry(m.geometry),new T.LineBasicMaterial({color:0x70918a,transparent:true,opacity:.3}));m.add(edges);}
  // Approach strip gives the first jump a readable runway without constraining the vehicle.
  if(!this.world.race)for(let z=8;z<24;z+=3){for(const x of [-4.5,4.5]){const g=new T.Mesh(new T.BoxGeometry(.12,.035,.9),new T.MeshBasicMaterial({color:0xd3e2b6}));g.position.copy(point(x,z,.05));g.quaternion.copy(frameAt(g.position).q);this.scene.add(g);}}
 }
 async loadRover(){
  this.fleet=await loadRoverFleet(this.fleetTypes||['r47x']);const entry=this.fleet.create(0);this.damageBank=entry.bank;this.model=entry.model;this.rover=new T.Group();this.rover.add(this.model);this.scene.add(this.rover);
  this.instruments=createRoverInstruments(this.model);
  const texture=await new T.TextureLoader().loadAsync('./assets/recon-rover/cold-gas-puff.png');
  this.driftTrails=createDriftTrails(this.scene);this.puffTexture=texture;this.rig=new RoverRig(this.model,this.scene,this.world,texture,this.damageBank);
 }
 async loadSinkholes(){
  const silent={whenReady:fn=>fn(),play(){},voices:0,contextState:'running'};
  for(const h of this.world.holes){const fx=createSinkhole(this.scene,this.camera,{game:true,sounds:silent});fx.group.position.copy(h.origin);fx.group.quaternion.copy(h.frame.q);fx.group.scale.setScalar(h.r);fx.group.visible=true;Object.assign(fx.tune,{look:'roverLab',planetRadius:RADIUS/h.r,craterRadius:1,preRoll:0,duration:2,plateGrowth:2/3,crackLength:.65,fissureWidth:.12,fissureArms:7,shrapnelCount:8});this.effects.push(fx);}
  await new Promise((resolve,reject)=>{let timer;const started=performance.now();const tick=()=>{if(this.effects.every(f=>f.ready()))resolve();else if(performance.now()-started>20000)reject(Error('Sinkhole textures failed to load'));else timer=setTimeout(tick,40);};tick();});
  for(const fx of this.effects){fx.trigger();for(let i=0;i<600;i++)fx.update(.025,i*.025);}
  this.effects.forEach((fx,i)=>{this.world.colliders.push(...bakeSinkholeColliders(fx,'sinkhole-'+i));fx.collisionStamp=sinkholeStamp(fx);fx.collisionReady=true;});
  if(this.world.race)this.syncRaceHazards();
 }
 syncRaceHazards(){
  if(this.hazardGeneration===this.world.race.hazardGeneration)return;this.hazardGeneration=this.world.race.hazardGeneration;this.driftTrails?.reset();
  this.effects.forEach((fx,i)=>{const h=this.world.holes[i];if(!h.dormant)return;h.rendered=true;
   this.world.colliders=this.world.colliders.filter(c=>c.owner!=='sinkhole-'+i);fx.reset();fx.group.visible=false;fx.raceTriggered=false;fx.collisionReady=false;fx.collisionStamp=null;fx.collisionCheck=0;Object.assign(fx.tune,{preRoll:TREMOR.warning,duration:TREMOR.warning+TREMOR.opening});
  });
  for(const u of this.floorUniforms)u.value=this.world.holes.map(h=>h.radius);
 }
 reopen(){this.world.colliders=this.world.colliders.filter(c=>!c.owner.startsWith('sinkhole-'));for(const fx of this.effects){fx.collisionReady=false;fx.collisionStamp=null;fx.collisionCheck=0;}for(let i=0;i<this.effects.length;i++){const fx=this.effects[i],h=this.world.holes[i];Object.assign(fx.tune,{preRoll:1.2,duration:5.5,planetRadius:RADIUS/h.r});fx.group.scale.setScalar(h.r);fx.trigger();h.age=0;h.radius=0;}}
 resize(){const c=this.renderer.domElement,w=c.clientWidth,h=c.clientHeight,dpr=this.renderer.getPixelRatio();
  // Cache logical dimensions. Three floors physical pixels; round() caused a resize
  // on every frame at fractional Retina dimensions (e.g. 1439 × 901 at 1.75×).
  if(this.width!==w||this.height!==h||this.lastDpr!==dpr){this.width=w;this.height=h;this.lastDpr=dpr;this.renderer.setSize(w,h,false);this.performance.resizeCalls++;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 }
 stepEffects(dt){
  this.raceView?.traffic?.step(dt);this.raceView?.arrival?.step(dt);this.raceView?.defense?.step(dt);this.isao?.step(dt,this.isao.inputEnabled!==false);
  if(this.world.race)this.syncRaceHazards();
  for(let i=0;i<this.effects.length;i++){const fx=this.effects[i],h=this.world.holes[i];
   if(this.world.race&&h.dormant){
    if(h.phase==='dormant')continue;
    if(!fx.raceTriggered){fx.group.visible=true;fx.trigger();fx.raceTriggered=true;this.onTremor?.();}
    if(h.age<60)fx.update(dt,h.age);h.radius=fx.hole.value*h.r;
   }else {if(h.age<60){h.age+=dt;fx.update(dt,h.age);}h.radius=fx.hole.value*h.r;}
   if(!fx.collisionReady&&h.age>(fx.collisionCheck||0)+.5){fx.collisionCheck=h.age;const stamp=sinkholeStamp(fx);if(h.age>3&&stamp===fx.collisionStamp){this.world.colliders.push(...bakeSinkholeColliders(fx,'sinkhole-'+i));fx.collisionReady=true;}fx.collisionStamp=stamp;}
  }for(const u of this.floorUniforms)u.value=this.world.holes.map(h=>h.radius);
 }
 render(dt,alpha=1){
  this.resize();if(this.world.race)this.syncRaceHazards();this.raceView?.update(alpha);const s=this.sim.motion.sample(alpha),up=upAt(s.pos),fwd=this.cameraHeading.update(s,dt,!this.cameraInitialized).clone();
  this.driftTrails?.update(s);
  this.instruments?.update(s,s.vel.clone().projectOnPlane(up).length());
  if(this.rover){this.rover.visible=!this.sim.recovering;this.rover.position.copy(s.pos);this.rover.quaternion.copy(s.q);this.rig.update(s,s.vel.clone().projectOnPlane(up).length());}

  const ground=terrainSample(this.world,s.pos,false),alt=Number.isFinite(ground.height)?Math.max(0,ground.altitude-ground.height):100;
  this.shadow.visible=Number.isFinite(ground.height)&&alt<30;if(this.shadow.visible){this.shadow.position.copy(s.pos.clone().sub(CENTER).normalize().multiplyScalar(RADIUS+ground.height+.06).add(CENTER));this.shadow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),up);this.shadow.material.opacity=.24*Math.max(0,1-alt/30);this.shadow.scale.setScalar(1+alt*.03);}
  this.exhaustionMarker.visible=!!s.exhausted;if(s.exhausted){this.exhaustionMarker.position.fromArray(s.exhausted.position);this.exhaustionMarker.rotation.y=s.time;}
  if(!this.isao?.active){
  const orbitF=fwd.clone().applyAxisAngle(up,this.orbit);let wanted,target=s.pos.clone().addScaledVector(up,.4);
  if(this.mode==='overhead'){wanted=s.pos.clone().addScaledVector(up,65).addScaledVector(fwd,-.1);}
  else if(this.mode==='mast'){wanted=s.pos.clone().addScaledVector(up,1.3).addScaledVector(fwd,1.1);target=wanted.clone().addScaledVector(fwd,25);}
  else {const dist=this.mode==='orbit'?this.distance*1.4:this.distance;wanted=s.pos.clone().addScaledVector(orbitF,-dist*Math.cos(this.pitch)).addScaledVector(up,dist*Math.sin(this.pitch)+1.8);target.addScaledVector(fwd,3+Math.min(4,s.vel.length()*.15));}
  // Keep the camera above both terrain and rock boxes without coupling it to vehicle roll.
  const floor=terrainSample(this.world,wanted,false);if(Number.isFinite(floor.height)&&floor.signed<1.1)wanted.addScaledVector(upAt(wanted),1.1-floor.signed);
  for(const rock of this.world.rocks){const v=wanted.clone().sub(rock.origin).applyQuaternion(rock.frame.q.clone().invert());if(Math.abs(v.x)<rock.w/2+1&&Math.abs(v.z)<rock.d/2+1&&v.y<rock.h+1)wanted.addScaledVector(rock.frame.up,rock.h+1-v.y);}
  if(this.mode!=='overhead'&&this.mode!=='mast'){
   const start=s.pos.clone().addScaledVector(up,.7),ray=wanted.clone().sub(start);
   for(let i=1;i<=14;i++){
    const probe=start.clone().addScaledVector(ray,i/14),sample=terrainSample(this.world,probe,false);
    const rockHit=blocked(this.world,probe,.35);
    if(rockHit||Number.isFinite(sample.height)&&sample.signed<.35){wanted.copy(start).addScaledVector(ray,Math.max(.10,(i-1)/14));break;}
   }
  }
  if(!this.cameraInitialized||this.mode==='mast'){this.camera.position.copy(wanted);this.look.copy(target);this.cameraInitialized=true;}else{this.camera.position.lerp(wanted,1-Math.exp(-dt*6));this.look.lerp(target,1-Math.exp(-dt*10));}
  this.camera.up.copy(this.mode==='overhead'?fwd:up);this.camera.lookAt(this.look);this.raceView?.celebration?.camera(this.camera);
  }
  this.isao?.present(dt,alpha);
  this.raceView?.city?.update(this.camera.position);this.performance.beginGpu();this.renderer.render(this.scene,this.camera);this.performance.endGpu();
 }
}
