import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {makeBeamShot} from '../upstream/stalheart/src/shotfx.js';
import {makeLock} from '../upstream/stalheart/src/domain/lockon.js';
import {TOWER_BY_KEY} from '../upstream/stalheart/src/towers.js';
import {FIRING} from '../upstream/stalheart/src/content/firing-defaults.js';
import {point,coords,frameAt} from './world.js';
import {FeidsDefense,TOUCHDOWNS,SCALE,deploymentCues} from './feids-defense.js';
import {capsuleState,cargoState,packMech} from '../upstream/a6/feids26/timeline.js';
import {applyShell} from '../upstream/a6/assets/feids26/runtime.js';
import {applyMech} from '../upstream/a6/assets/ridgeback-mech/runtime.js';
import {thermalMaterial} from '../upstream/a6/feids26/shield-heat.js';
import {createFeidsEffects} from './feids-effects.js';
const Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
export async function createFeidsDefense(view,race,defense,effects){
 const controller=new FeidsDefense(view.world),root=new T.Group();root.name='FEIDS26_MOBILE_DEFENSE';root.visible=false;view.scene.add(root);
 if(!controller.site)return {controller,root,step(){},update(){},reset(){},audio:()=>null,snapshot:()=>controller.snapshot()};
 root.position.copy(controller.site.origin);root.quaternion.copy(controller.site.frame.q);root.updateWorldMatrix(true,false);
 const loader=new GLTFLoader(),[shell,mech,distant]=await Promise.all(['./assets/feids26/feids26_d0_lod1.glb','./assets/ridgeback-mech/mx06_d0_lod1.glb','./assets/ridgeback-mech/mx06_d0_lod2.glb'].map(p=>loader.loadAsync(p))),capsules=[],models=[],rigs=[],fx=createFeidsEffects(root),cues=deploymentCues();
 for(let i=0;i<2;i++){const group=shell.scene.clone(true);root.add(group);const heats=new Map();group.traverse(o=>{if(o.isMesh){if(!heats.has(o.material))heats.set(o.material,thermalMaterial(o.material));o.material=heats.get(o.material).material;}});capsules.push({group,heats:[...heats.values()],state:capsuleState(0,i)});}
 for(let i=0;i<4;i++){
  const group=new T.Group(),model=mech.scene.clone(true),far=distant.scene.clone(true);group.scale.setScalar(SCALE);group.add(model,far);far.visible=false;root.add(group);models.push(group);
  // Cache named nodes: six-leg IK repeatedly asks for the same rig joints.
  const nodes=new Map();model.traverse(o=>nodes.set(o.name,o));const original=model.getObjectByName.bind(model);model.getObjectByName=name=>nodes.get(name)||original(name);
  const muzzleNames={rotor:Array.from({length:6},(_,i)=>'SOCKET_MINIGUN_MUZZLE_'+(i+1)),lancer:['SOCKET_LASER_MUZZLE'],left:[],right:[]};
  model.traverse(o=>{if(/^SOCKET_MISSILE_/.test(o.name)){if(/_L_/.test(o.name))muzzleNames.left.push(o.name);else if(/_R_/.test(o.name))muzzleNames.right.push(o.name);}});
  const rig={group,model,far,nodes,spin:0,lastRotor:-10,guns:[],ground:0};rigs.push(rig);
  const local=root.worldToLocal(point(controller.site.landings[i].x,controller.site.landings[i].z));rig.ground=local.y;
  rig.laser=makeBeamShot(new T.Vector3(),new T.Vector3(0,1,0),0x59ddff,'lance',{glowWidth:.7});view.scene.add(rig.laser);rig.laser.visible=false;
  rig.flash=new T.Mesh(new T.SphereGeometry(.2,8,6),new T.MeshBasicMaterial({color:0xffd78a,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));view.scene.add(rig.flash);rig.flash.visible=false;
  for(const slot of ['left','right','rotor','lancer']){
   const type=slot==='left'||slot==='right'?'quiver':slot,names=muzzleNames[slot].sort(),sockets=names.map(n=>model.getObjectByName(n));if(!sockets.length||sockets.some(s=>!s))throw Error('Missing Ridgeback weapon sockets: '+slot+' '+names.join(','));let socket=0;
   const gun={id:defense.guns.length,mech:i,type,straight:type==='rotor',enabled:false,x:0,z:0,origin:new T.Vector3(),range:type==='quiver'?145:type==='rotor'?90:120,cooldown:1/(TOWER_BY_KEY[type].rate*(type==='rotor'?FIRING.rotor.rounds:1)),damage:type==='quiver'?8:type==='rotor'?.4:2,next:0,target:null,beam:null,lock:makeLock(),heat:0,overheated:false,engaged:false,engagedAt:null,rejected:new Map(),
    aim(target){const m=controller.mechs[i];if(!m.active)return null;const f=frameAt(m.position),delta=target.clone().sub(gun.origin),heading=Math.atan2(delta.dot(f.east),delta.dot(f.north)),error=Math.atan2(Math.sin(heading-m.heading),Math.cos(heading-m.heading));
     if(Math.abs(error)>(type==='quiver'?.7:type==='rotor'?.025:.6))return null;
     if(type==='rotor'||type==='lancer'){const yaw=type==='rotor'?0:error,pitch=Math.atan2(delta.dot(f.up),Math.hypot(delta.dot(f.east),delta.dot(f.north)));if(pitch<-.55||pitch>.65)return null;nodes.get(type==='rotor'?'MINIGUN_YAW':'LASER_YAW').rotation.y=yaw;nodes.get(type==='rotor'?'MINIGUN_PITCH':'LASER_PITCH').rotation.x=-pitch;model.updateWorldMatrix(true,true);}
     return sockets[socket].getWorldPosition(new T.Vector3());
    },direction(){return Z.clone().applyQuaternion(sockets[socket].getWorldQuaternion(new T.Quaternion()));},fire(){if(type==='rotor')rig.lastRotor=defense.time;socket=(socket+1)%sockets.length;gun.fired=(gun.fired||0)+1;}
   };rig.guns.push(gun);defense.guns.push(gun);
  }
 }
 let generation=controller.generation,eventCursor=0,states=[];
 function pose(){const t=controller.time;root.visible=t>=0;if(t<0)return;
  for(let i=0;i<2;i++){const c=capsules[i],s=c.state=capsuleState(t,i);c.group.position.set(s.x,s.y,0);c.group.rotation.set(s.pitch,0,0);applyShell(c.group,s.opening,26+i*101);c.group.visible=s.split<3.5;c.heats.forEach(h=>h.update(s.split<0?s.heat:Math.exp(-s.split*1.8),t));c.group.updateWorldMatrix(true,true);}
  states=rigs.map((r,i)=>{const m=controller.mechs[i],s=cargoState(t,Math.floor(i/2),i%2),held=s.age<0;
   if(!m.active){packMech(r.model,held?1:s.fold,held?0:s.compression);if(held){const c=capsules[Math.floor(i/2)].group,socket=c.getObjectByName('SOCKET_CARGO_'+(i%2+1));r.group.position.copy(root.worldToLocal(socket.getWorldPosition(new T.Vector3())));r.group.quaternion.copy(c.quaternion);}else {r.group.position.set(s.x,s.height+r.ground,s.z);r.group.rotation.set(s.pitch,s.yaw,0);}}
   else {r.group.position.copy(root.worldToLocal(m.position.clone()));r.group.quaternion.copy(root.quaternion.clone().invert().multiply(frameAt(m.position).q)).multiply(new T.Quaternion().setFromAxisAngle(Y,m.heading));r.spin+=r.guns[2].engaged?1:0;applyMech(r.model,m.walk,{mode:m.speed>0?'walk':'park',barrelAngle:r.spin});}
   r.group.updateWorldMatrix(true,true);for(const g of r.guns){g.enabled=m.active;g.x=m.x;g.z=m.z;g.origin.copy(r.group.localToWorld(new T.Vector3(0,2,0)));}
   return {...s,height:s.height+r.ground,ground:r.ground};
  });
 }
 function reset(){controller.reset();generation=controller.generation;eventCursor=0;root.visible=false;states=[];fx.reset();rigs.forEach(r=>{r.laser.visible=r.flash.visible=false;r.lastRotor=-10;r.spin=0;r.model.visible=true;r.far.visible=false;for(const g of r.guns){g.enabled=false;g.fired=0;g.beam=null;}});}
 reset();
 return {controller,root,rigs,capsules,step(dt){if(generation!==view.world.race.hazardGeneration)reset();controller.step(dt,race,defense);pose();while(eventCursor<controller.events.length){const e=controller.events[eventCursor++];if(e.type==='split'){const p=capsules[e.capsule].group.getWorldPosition(new T.Vector3());effects.spawn('bofors',p,.25,1,{silent:true});}else {const m=controller.mechs[e.mech];effects.spawn('rotary',m.position,.45);}}},reset,
  update(){if(generation!==view.world.race.hazardGeneration)reset();if(controller.time<0)return;root.updateWorldMatrix(true,true);fx.update(controller.time,states,models,capsules,view.camera);
   for(const r of rigs){const m=controller.mechs[rigs.indexOf(r)],distance=r.group.getWorldPosition(new T.Vector3()).distanceTo(view.camera.position),staticFar=m.active&&!m.speed&&!r.guns.some(g=>g.engaged)&&distance>150;r.model.visible=!staticFar;r.far.visible=staticFar;
    const beam=r.guns[3].beam;r.laser.visible=!!beam&&beam.until>defense.time;if(r.laser.visible){r.laser.userData.setEndpoints(beam.from,beam.to);r.laser.userData.update(defense.time);r.laser.userData.setFade(Math.min(1,(beam.until-defense.time)*5));}
    r.flash.visible=defense.time-r.lastRotor<.065;if(r.flash.visible){r.flash.position.copy(r.nodes.get('SOCKET_MINIGUN_MUZZLE_1').getWorldPosition(new T.Vector3()));r.flash.material.opacity=1-(defense.time-r.lastRotor)/.065;}
   }
  },audio(){return {key:generation,time:controller.time,cues:cues.map(c=>({...c,distance:(c.mech!==undefined?models[c.mech]:capsules[c.capsule].group).getWorldPosition(new T.Vector3()).distanceTo(view.camera.position)}))};},snapshot(){return {...controller.snapshot(),weapons:rigs.map(r=>r.guns.map(g=>({type:g.type,fired:g.fired||0,enabled:g.enabled}))),particles:fx.snapshot()};}
 };
}
