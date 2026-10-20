import {createGantryCollisions} from './gantry-collisions.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {celebrationPose,PARTY_COLORS} from '../upstream/stalheart/src/domain/disco-celebration.js';
import {DAY_42} from '../upstream/stalheart/src/content/day-42.js';
const Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1),smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
function beam(color,radius){return new T.Mesh(new T.CylinderGeometry(radius,radius,1,6,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));}
function connect(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);const d=b.clone().sub(a);mesh.scale.y=d.length();mesh.quaternion.setFromUnitVectors(Y,d.normalize());}
export async function createRaceCelebration(view,race){
 const loader=new GLTFLoader(),[disco,lancer,gantryAsset]=await Promise.all(['disco_ball_d0_lod1.glb','lancer_t1.glb','terraformer_3000_d0_lod1.glb'].map(f=>loader.loadAsync('./assets/celebration/'+f)));
 const deck=race.world.race.deck,root=new T.Group();root.name='DAY_42_RACE_CELEBRATION';root.position.copy(deck.origin);root.quaternion.copy(deck.frame.q);view.scene.add(root);
 const ball=disco.scene;ball.scale.setScalar(1);root.add(ball);for(const name of ['STANDALONE_CRADLE','LASER_BEAM_PREVIEW']){const n=ball.getObjectByName(name);if(n)n.visible=false;}
 const nodes={};for(const name of ['DISCO_PENDULUM_PIVOT','DISCO_SPHERE_SPIN','LIGHT_HALO_YAW','LASER_RING_YAW','LASER_EMITTER_PITCH','SPOTLIGHT_POD_PITCH']){nodes[name]=ball.getObjectByName(name);if(!nodes[name])throw Error('Missing celebration pivot '+name);}
 const housing=new T.Group();housing.name='STALHEART_FINISH_GANTRY';housing.position.copy(deck.origin);housing.quaternion.copy(deck.frame.q);view.scene.add(housing);const gantry=gantryAsset.scene;gantry.position.set(0,deck.h,2);housing.add(gantry);
 const joints=[['GANTRY_TRAVEL_Y','position','z','gantryZ'],['CARRIAGE_TRAVEL_X','position','x','carriageX'],['TOOL_LIFT_Z','position','y','liftY'],['J1_BASE_YAW','rotation','y','j1Yaw'],['J2_SHOULDER','rotation','z','j2Shoulder'],['J3_ELBOW','rotation','z','j3Elbow'],['J4_FOREARM_ROLL','rotation','y','j4Roll'],['J5_WRIST_PITCH','rotation','z','j5Wrist'],['J6_TOOL_ROLL','rotation','y','j6Roll']].map(([name,tr,axis,key])=>({node:gantry.getObjectByName(name),tr,axis,key}));
 const hook=gantry.getObjectByName('EXTRUSION_TIP');if(!hook||joints.some(j=>!j.node))throw Error('Stalheart gantry articulation missing');
 let collisionRig;
 function poseGantry(t){const p={...celebrationPose(t),j4Roll:0,j6Roll:0};for(const j of joints)j.node[j.tr][j.axis]=p[j.key];housing.updateWorldMatrix(true,true);collisionRig?.update();}
 poseGantry(0);collisionRig=createGantryCollisions(gantry,race.world);
 const surface=(x,z)=>race.world.race.spots.find(s=>Math.hypot(x-s.local.x,z-s.local.z)<race.world.race.rules.podiumRadius)?.local.y??deck.h;
 // Sentries share the original geometry/materials and retain all authored aiming pivots.
 const sentries=[-1,1].map((side,i)=>{const model=lancer.scene.clone(true);model.position.set(side*27,deck.h,-8);model.scale.setScalar(2);root.add(model);const yaw=model.getObjectByName('YAW'),pitch=model.getObjectByName('PITCH'),muzzle=model.getObjectByName('MUZZLE_00');if(!yaw||!pitch||!muzzle)throw Error('Missing LANCER aiming nodes');
  const ray=beam(PARTY_COLORS[i],.07),glow=beam(PARTY_COLORS[i],.22);root.add(ray,glow);return {model,yaw,pitch,muzzle,ray,glow};});
 const rays=Array.from({length:8},(_,i)=>{const m=beam(PARTY_COLORS[i%4],.065);root.add(m);return m;});
 const dots=new T.InstancedMesh(new T.CircleGeometry(.42,10),new T.MeshBasicMaterial({transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}),48);dots.frustumCulled=false;root.add(dots);const dummy=new T.Object3D();for(let i=0;i<48;i++)dots.setColorAt(i,new T.Color(PARTY_COLORS[i%4]));
 root.visible=false;let active=false,startPosition=null,startLook=null;const center=new T.Vector3();
 function update(){
  active=race.phase==='finished';root.visible=active;
  if(!active){poseGantry(0);startPosition=null;startLook=null;return;}
  const elapsed=race.celebrationTime,t=Math.min(elapsed,DAY_42.seconds),party=elapsed<DAY_42.seconds,p=celebrationPose(t);
  // Attach to the original articulated extrusion tip, in the shared deck frame.
  poseGantry(t);const hookPosition=root.worldToLocal(hook.getWorldPosition(new T.Vector3()));ball.position.copy(hookPosition).add(new T.Vector3(0,-6.2,0));
  nodes.DISCO_PENDULUM_PIVOT.rotation.set(p.pendulumX,0,p.pendulumZ);nodes.DISCO_SPHERE_SPIN.rotation.y=p.sphereSpinY;nodes.LIGHT_HALO_YAW.rotation.y=p.haloYaw;nodes.LASER_RING_YAW.rotation.y=p.laserRingYaw;nodes.LASER_EMITTER_PITCH.rotation.x=p.laserPitch;nodes.SPOTLIGHT_POD_PITCH.rotation.x=p.spotPitch;
  root.updateWorldMatrix(true,true);nodes.DISCO_SPHERE_SPIN.getWorldPosition(center);const target=root.worldToLocal(center.clone());
  for(const s of sentries){
   const inModel=s.model.worldToLocal(center.clone()),yawOrigin=s.yaw.position,delta=inModel.clone().sub(yawOrigin);s.yaw.rotation.y=Math.atan2(delta.x,delta.z);s.yaw.updateWorldMatrix(true,true);
   const aim=s.yaw.worldToLocal(center.clone()).sub(s.pitch.position);s.pitch.rotation.x=-Math.atan2(aim.y,Math.hypot(aim.x,aim.z));s.model.updateWorldMatrix(true,true);
   const from=root.worldToLocal(s.muzzle.getWorldPosition(new T.Vector3()));for(const m of [s.ray,s.glow]){m.visible=party;connect(m,from,target);}s.ray.material.opacity=.65+.3*p.pulse;s.glow.material.opacity=.09+.09*p.pulse;
  }
  for(let i=0;i<rays.length;i++){const a=t*.45+i*Math.PI/4,end=new T.Vector3(Math.cos(a)*20,deck.h+.05,Math.sin(a)*11);rays[i].visible=party;connect(rays[i],target,end);rays[i].material.opacity=.13+.1*p.pulse;}
  dots.visible=party;for(let i=0;i<48;i++){const a=i*2.39996+t*.3,r=3+(i%8)*2.2;dummy.position.set(Math.cos(a)*r,surface(Math.cos(a)*r,Math.sin(a)*r*.62-14)+.06,Math.sin(a)*r*.62-14);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(.5+.6*p.pulse);dummy.updateMatrix();dots.setMatrixAt(i,dummy.matrix);}dots.instanceMatrix.needsUpdate=true;
 }
 function camera(camera){
  if(!active)return;
  if(!startPosition){startPosition=camera.position.clone();startLook=view.look.clone();}
  const t=race.celebrationTime,a=.52+Math.sin(Math.min(t,DAY_42.seconds)*.10)*.12+view.orbit,position=new T.Vector3(Math.sin(a)*87,deck.h+36,-Math.cos(a)*87).applyQuaternion(deck.frame.q).add(deck.origin),look=new T.Vector3(0,deck.h+15,0).applyQuaternion(deck.frame.q).add(deck.origin),k=smooth(t/2);
  camera.position.lerpVectors(startPosition,position,k);camera.up.copy(deck.frame.up);camera.lookAt(startLook.clone().lerp(look,k));
 }
 return {root,ball,gantry,hook,housing,sentries,collisionRig,update,camera,snapshot(){return {active,time:race.celebrationTime,party:active&&race.celebrationTime<DAY_42.seconds,seconds:DAY_42.seconds,lancers:sentries.map(s=>{const from=s.muzzle.getWorldPosition(new T.Vector3()),direction=Z.clone().applyQuaternion(s.muzzle.getWorldQuaternion(new T.Quaternion()));return {beam:s.ray.visible,aimDot:direction.dot(center.clone().sub(from).normalize())};})};}};
}
