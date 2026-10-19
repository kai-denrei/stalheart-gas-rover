import * as T from '../upstream/stalheart/vendor/three.module.js';
import {CutisSwarm} from '../upstream/stalheart/below/src/fx/gorogoro/controller.js';
import {createSwarmGeometry} from '../upstream/stalheart/below/src/fx/gorogoro/geometry.js';
import {GOROGORO_DEFAULT_CONFIG} from '../upstream/stalheart/below/src/fx/gorogoro/tiers.js';
import {point,frameAt} from './world.js';
export async function reedMotionMaterial(geometry,phase,clock){
 const [meta,bin]=await Promise.all([fetch('./assets/city-combat/reed-motion.json').then(r=>r.json()),fetch('./assets/city-combat/reed-motion.bin').then(r=>r.arrayBuffer())]);
 const texture=new T.DataTexture(new Uint16Array(bin),meta.width,meta.height*meta.frames*2,T.RGBAFormat,T.HalfFloatType);texture.needsUpdate=true;texture.magFilter=texture.minFilter=T.NearestFilter;
 geometry.setAttribute('reedPhase',phase);geometry.setAttribute('reedVertex',new T.Float32BufferAttribute(Array.from({length:meta.vertices},(_,i)=>i),1));geometry.boundingSphere=new T.Sphere(new T.Vector3(),7);
 const material=new T.MeshStandardMaterial({color:0xb8b99a,roughness:.5,side:T.DoubleSide});
 material.onBeforeCompile=s=>{s.uniforms.reedTime=clock;s.uniforms.reedMotion={value:texture};
 const code=`uniform float reedTime;uniform sampler2D reedMotion;attribute float reedPhase;attribute float reedVertex;
 vec3 reedFetch(float frame,float normals){float x=mod(reedVertex,${meta.width}.0),y=floor(reedVertex/${meta.width}.0)+(frame+normals*${meta.frames}.0)*${meta.height}.0;return texture2D(reedMotion,(vec2(x,y)+.5)/vec2(${meta.width}.0,${meta.height*meta.frames*2}.0)).xyz;}
 vec3 reedPose(float normals){float f=mod(reedTime+reedPhase,${(meta.frames/meta.fps-.35).toFixed(4)})*${meta.fps}.0;float a=floor(f),b=min(a+1.,${meta.frames-1}.);vec3 p=mix(reedFetch(a,normals),reedFetch(b,normals),fract(f));float blend=smoothstep(${meta.frames-14}.,${meta.frames-7}.,f);return mix(p,reedFetch(0.,normals),blend);}`;
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\n'+code).replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(reedPose(1.));').replace('#include <begin_vertex>','vec3 transformed=reedPose(0.);');};material.customProgramCacheKey=()=> 'reed-solver-motion-v1';return {material,meta};
}
export function createGorogoroPool(view,root,defense){
 const config={...GOROGORO_DEFAULT_CONFIG,r0:1.6,reach:5,cycleDuration:5,rollDuration:1.8,landingPause:.6,skinTint:0x6d7868,coreTint:0xff182c,membraneOpacity:.3},actors=Array.from({length:4},()=>{
  const swarm=new CutisSwarm({...config}),geo=createSwarmGeometry(swarm),group=new T.Group();group.name='CUTIS_GOROGORO';group.add(geo.group);root.add(group);group.visible=false;
  const core=new T.Mesh(new T.SphereGeometry(config.r0*config.coreSize,20,12),new T.MeshStandardMaterial({color:config.coreTint,emissive:0xc50920,emissiveIntensity:.8,roughness:.27}));group.add(core);return {swarm,geo,group,core,id:null};
 });
 defense.moveEnemy=(e,dt)=>{if(e.kind!=='gorogoro')return null;let a=actors.find(a=>a.id===e.id);if(!a){a=actors.find(a=>a.id===null||!defense.enemies.some(e=>e.id===a.id));if(!a)return null;a.id=e.id;a.swarm.reset(1);a.swarm.seed[0]+=e.id;a.swarm.plan(0,e.direction*100,0);a.swarm.phase[0]=0;}
  a.previousPhase=a.swarm.phase[0];const before=a.swarm.position(0);a.swarm.step(dt,{x:before[0]+e.direction*100,z:before[2]});const after=a.swarm.position(0);return {x:e.x+after[0]-before[0],z:e.z+after[2]-before[2]};};
 const localCamera=new T.PerspectiveCamera();
 return {actors,reset(){for(const a of actors){a.id=null;a.group.visible=false;a.swarm.reset(1);}},update(){for(const a of actors){const e=defense.enemies.find(e=>e.id===a.id);a.group.visible=!!e;if(!e)continue;const alpha=defense.accumulator/.025,actual=a.swarm.phase[0];if(actual>=(a.previousPhase??actual))a.swarm.phase[0]=T.MathUtils.lerp(a.previousPhase??actual,actual,alpha);const p=point(T.MathUtils.lerp(e.px,e.x,alpha),T.MathUtils.lerp(e.pz,e.z,alpha),.05),frame=frameAt(p),center=a.swarm.position(0),death=e.dead?Math.min(1,(defense.time-e.dead)/1.8):0;a.group.position.copy(p);a.group.quaternion.copy(frame.q);a.group.scale.set(1,1-death*.92,1);a.geo.group.position.set(-center[0],-death*.3,-center[2]);a.core.position.copy(a.swarm.getCoreContact(0).center).sub(new T.Vector3(center[0],0,center[2]));a.group.updateWorldMatrix(true,true);localCamera.fov=view.camera.fov;localCamera.position.copy(a.geo.group.worldToLocal(view.camera.position.clone()));a.geo.update(localCamera,view.height||900);a.swarm.phase[0]=actual;}},snapshot(){return actors.filter(a=>a.group.visible).map(a=>({id:a.id,phase:a.swarm.phase[0],cycles:a.swarm.cycles[0],core:a.core.position.toArray()}));}};
}
