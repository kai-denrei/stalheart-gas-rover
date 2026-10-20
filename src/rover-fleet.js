import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {NOZZLE_IDS} from '../assets/recon-rover/damage/thruster-fx.js';
import {ROVER_FAMILIES} from './rover-families.js';

const path=(family,d)=>family==='r47xs'?`./assets/recon-rover-s/lod1/r47xs_recon_rover_d${d}_lod1.glb`:family==='xb12'?`./assets/xb12/xb12_d${d}_lod1.glb`:`./assets/recon-rover/damage/r47x_recon_rover_d${d}_lod1.glb`;
export async function loadRoverFleet(types){
 const banks={};
 await Promise.all([...new Set(types)].map(async family=>{
  banks[family]=await Promise.all([0,1,2,3].map(async d=>(await new GLTFLoader().loadAsync(path(family,d))).scene));
 }));
 // XB-12 ships without propulsion or displays. Fit the lab's proven cold-gas
 // kit to it, using actual R-47X nozzles/sockets rather than invisible emitters.
 const kit=types.includes('xb12')?(banks.r47x?.[0]||(await new GLTFLoader().loadAsync(path('r47x',0))).scene):null;
 return {types,banks,create(index=0,color){
  const family=types[index%types.length],bank=banks[family],model=bank[0].clone(true);
  model.userData.roverFamily=family;model.name=ROVER_FAMILIES[family].label;model.scale.setScalar(ROVER_FAMILIES[family].scale);model.position.y=-.44*ROVER_FAMILIES[family].scale;
  if(family==='xb12'){
   const chassis=model.getObjectByName('XB12_CHASSIS');
   for(const id of NOZZLE_IDS){const g=kit.getObjectByName('GIMBAL_'+id).clone(true);g.position.y+=.84;if(id.startsWith('L_'))g.position.x*=1.22;chassis.add(g);}
   for(const name of ['NEG_X','POS_X','REAR']){const socket=kit.getObjectByName('SOCKET_GAS_LEAK_'+name).clone();socket.position.y+=.8;chassis.add(socket);}
  }
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.material=o.material.clone();o.material.roughness=.68;o.material.metalness=.15;
   if(color&&['CHASSIS_ARMOR_BODY','XB12_HULL'].includes(o.name))o.material.color.set(color);
  });
  const oldPlumes=model.getObjectByName('COLD_GAS_PLUMES');if(oldPlumes)oldPlumes.visible=false;
  return {family,model,bank};
 }};
}
