import {START_STEPS,startLightCount} from './race-countdown.js';
import {gridPose} from './race-courses.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {point,frameAt} from './world.js';
import {housingColliders} from './stunt-board.js';
export function startSignal(race){const green=race.phase==='racing'&&race.time<2;return {green,lit:green?START_STEPS:startLightCount(race),visible:race.phase==='waiting'||race.phase==='countdown'||green};}
export async function createRaceStart(view,race){
 const asset=await new GLTFLoader().loadAsync('./assets/scoreboard-rivalry/beacon_rivalry_d0_lod1.glb'),root=new T.Group();root.name='Vertical A6 race start lights';const grid=gridPose(view.world,{id:0,lane:12}),x=grid.x+Math.sin(grid.heading)*16,z=grid.z+Math.cos(grid.heading)*16;root.position.copy(point(x,z));root.quaternion.copy(frameAt(root.position).q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),grid.heading+Math.PI));view.scene.add(root);
 const housing=asset.scene;housing.scale.set(.55,2.1,.9);root.add(housing);housing.updateWorldMatrix(true,true);housing.traverse(o=>{if(o.isMesh)view.world.colliders.push(...housingColliders(o));});
 const face=new T.Mesh(new T.PlaneGeometry(3.55,6.05),new T.MeshBasicMaterial({color:0x071015}));face.position.set(0,5.4,.64);root.add(face);
 const bezel=new T.InstancedMesh(new T.TorusGeometry(.48,.055,8,24),new T.MeshStandardMaterial({color:0x718b91,metalness:.6,roughness:.45}),START_STEPS),lamps=new T.InstancedMesh(new T.CircleGeometry(.43,32),new T.MeshBasicMaterial({toneMapped:false}),START_STEPS),dummy=new T.Object3D();root.add(bezel,lamps);
 for(let i=0;i<START_STEPS;i++){dummy.position.set(0,7.1-i*1.7,.69);dummy.updateMatrix();bezel.setMatrixAt(i,dummy.matrix);lamps.setMatrixAt(i,dummy.matrix);lamps.setColorAt(i,new T.Color(0x271415));}bezel.computeBoundingSphere();lamps.computeBoundingSphere();
 let previous='';return {root,lamps,update(){const s=startSignal(race),key=s.green+':'+s.lit;if(key===previous)return;previous=key;for(let i=0;i<START_STEPS;i++)lamps.setColorAt(i,new T.Color(i<s.lit?s.green?0x37ff83:0xff201d:0x271415));lamps.instanceColor.needsUpdate=true;},snapshot:()=>startSignal(race)};
}
