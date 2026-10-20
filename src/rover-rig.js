import {createRoverWreckEffects} from './rover-wreck-effects.js';
import {createReactionEffects} from './reaction-effects.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {solidSupport} from './collisions.js';
import {gimbalAngles} from './thrusters.js';
import {terrainSample,frameAt,upAt} from './world.js';
import {createOnboardDisplays} from './rover-fx.js';
import {createColdGasSystem,NOZZLE_IDS} from '../assets/recon-rover/damage/thruster-fx.js';
import {applyLocalizedDamage} from '../assets/recon-rover/damage/runtime.js';
import {applyLocalizedDamage as applySwingArmDamage} from '../assets/recon-rover-s/runtime.js';
import {damagePolicy} from '../assets/xb12/runtime.js';
import {ROVER_FAMILIES,PHYSICS_WHEEL_IDS} from './rover-families.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rad=Math.PI/180;

export class RoverRig {
 constructor(model,scene,world,texture,damageBank){
  this.family=model.userData.roverFamily||'r47x';this.vehicle=ROVER_FAMILIES[this.family];
  this.wreckFX=createRoverWreckEffects(model,scene,world);this.damageBank=damageBank;this.damageRevision=-1;
  this.model=model;this.world=world;this.lastTime=0;this.lastAge=Infinity;this.fxClock=0;this.displayClock=1;
  this.wheels=this.vehicle.wheels.map(index=>{const id=PHYSICS_WHEEL_IDS[index];return {id,index,side:id.endsWith('L')?-1:1,z:id.startsWith('F')?this.vehicle.axle:id.startsWith('M')?-.42:-this.vehicle.axle,susp:model.getObjectByName('SUSP_PIVOT_'+id),steer:model.getObjectByName('WHEEL_STEER_'+id),spin:model.getObjectByName('WHEEL_SPIN_'+id),upper:model.getObjectByName('SOCKET_DAMPER_UPPER_'+id),lower:model.getObjectByName('SOCKET_DAMPER_LOWER_'+id),aim:model.getObjectByName('DAMPER_AIM_'+id),rod:model.getObjectByName((this.family==='xb12'?'DAMPER_ROD_':'DAMPER_ROD_SLIDE_')+id)};});
  this.damperTop=new T.Vector3();this.damperBottom=new T.Vector3();
  this.gimbals=NOZZLE_IDS.map(id=>model.getObjectByName('GIMBAL_'+id));this.intensities=Object.fromEntries(NOZZLE_IDS.map(id=>[id,0]));
  this.mast=model.getObjectByName(this.family==='xb12'?'SENSOR_YAW':'SENSOR_MAST_YAW');this.optics=model.getObjectByName(this.family==='xb12'?'SENSOR_PITCH':'OPTICS_HEAD_PITCH');
  // Source dust assumes an infinite flat floor. Disable it on our spherical terrain.
  this.fx=createColdGasSystem(T,model,{texture,dust:false,groundY:-Infinity,maxPlumeParticles:320});scene.add(this.fx.group);this.fx.clear();
  const enable=this.fx.setEnabled.bind(this.fx);this.fx.setEnabled=value=>{enable(value);this.fx.setLeakEnabled(value);this.fx.group.visible=Boolean(value);if(!value)this.fx.clear();};this.fx.setEnabled(true);
  this.leaks={NEG_X:0,POS_X:0,REAR:0};
  this.reactions=createReactionEffects(model);this.displays=createOnboardDisplays(T,model);this.stats={activePlumeCount:0,activeDustCount:0};
 }
 update(sim,speed){
  const damage=sim.damage,health=damage.effects;this.reactions.update(sim,this.fx.group.visible);
  if(this.damageRevision!==damage.revision){
   this.damageRevision=damage.revision;
   if(this.family==='xb12'){
    const level=damage.assetLevel;this.model.getObjectByName('XB12_ROOT').userData.damage_level=level;
    this.damageBank[level].traverse(donor=>{if(!donor.isMesh)return;const target=this.model.getObjectByName(donor.name);if(target?.isMesh)target.geometry=donor.geometry;});
   }else{
   (this.family==='r47xs'?applySwingArmDamage:applyLocalizedDamage)(this.model,this.damageBank,damage.states,{showDebris:false});
   // Keep core damage independent of the worst component; preserve per-racer paint.
   this.model.getObjectByName('CHASSIS_ARMOR_BODY').geometry=this.damageBank[damage.core].getObjectByName('CHASSIS_ARMOR_BODY').geometry;
   // Authored cracks target the original screen positions; our relocated displays stay readable.
   this.model.getObjectByName('DISPLAY_CRACK_OVERLAY').visible=false;
   }this.displayClock=1;
  }
  const reset=sim.age<this.lastAge,dt=reset?0:clamp(sim.time-this.lastTime,0,.08);this.lastTime=sim.time;this.lastAge=sim.age;this.wreckFX.update(sim,dt);
  if(reset){this.fx.clear();this.fxClock=0;this.displayClock=1;}
  for(const w of this.wheels){
   const p=new T.Vector3(w.side*this.vehicle.track,-.44,w.z).applyQuaternion(sim.q).add(sim.pos),ground=terrainSample(this.world,p,false);
   const travel=sim.grounded&&Number.isFinite(ground.signed)?clamp(-Math.min(ground.signed,solidSupport(this.world,p,upAt(p))),-.12,.14):-.12;
   const level=damage.states['WHEEL_'+w.id],policy=this.family==='xb12'?damagePolicy(damage.assetLevel,w.id):null,flex=policy?policy.travel:(this.family==='r47xs'?[1,1,.4,0]:[1,1,.65,.2])[level];
   const compression=policy?.locked?-.08:this.family==='r47xs'&&level===3?-.11:travel*flex;
   w.susp.rotation.z=clamp(w.side*Math.asin(compression/this.vehicle.arm),-16*rad,14*rad);
   const steerRatio=w.z>1&&health.steer>0?health.wheelSteer[w.id==='FL'?0:1]/health.steer:0;
   const a=sim.steering*steerRatio,r=Math.abs(a)>1e-5?2.88/Math.tan(a):Infinity;
   w.steer.rotation.y=w.z>1?(policy?clamp(sim.steering,-30*rad*policy.steer,30*rad*policy.steer):clamp(Math.atan(2.88/(r-w.side*.98)),-34*rad,34*rad)):0;
   w.spin.rotation.x=policy?.locked?0:sim.wheelSpin[w.index]*(policy?.drive??1);
  }
  const sensor=damage.states.SENSOR_MAST;this.mast.rotation.y=sensor===3?0:sensor===2?Math.sin(sim.time*.16)*1.3:(sim.time*.16)%(2*Math.PI);this.optics.rotation.x=sensor===3?-.38:-.08+Math.sin(sim.time*.27)*.14;
  if(this.family==='xb12'){const level=damage.assetLevel;this.mast.rotation.y=level===3?0:level===2?Math.sin(sim.time*.16)*Math.PI/3:(sim.time*.16)%(2*Math.PI);this.optics.rotation.x=level===3?.65:-.08+Math.sin(sim.time*.27)*.14+(level===2?.12:0);}
  for(let i=0;i<8;i++){const f=sim.burn.forces[i],a=gimbalAngles(f,i,health.gimbal[i]);this.gimbals[i].rotation.set(a.pitch,0,a.roll);this.intensities[NOZZLE_IDS[i]]=clamp(f.length()/(sim.tune.lift/8),0,1);}
  // The supplied helper emits per step. Fixed 60 Hz makes density independent of FPS.
  this.model.updateWorldMatrix(true,true);this.fxClock+=dt;
  // Supplied endpoint solver, with cached joints/scratch vectors. The rod
  // translates along the barrel instead of stretching its diameter.
  for(const w of this.wheels){if(!w.aim)continue;const top=w.aim.parent.worldToLocal(w.upper.getWorldPosition(this.damperTop)),bottom=w.aim.parent.worldToLocal(w.lower.getWorldPosition(this.damperBottom)),delta=bottom.sub(top),length=delta.length();w.aim.position.copy(top);w.aim.quaternion.setFromUnitVectors(w.aim.up,delta.normalize());w.rod.position.y=length;}
  if(this.family!=='r47x')this.model.updateWorldMatrix(false,true);
  for(const key of Object.keys(this.leaks))this.leaks[key]=health.leakRate>0&&(sim.reserve>0||sim.tune.unlimited)?damage.leaks[key]:0;
  while(this.fxClock>=1/60){this.stats=this.fx.step(1/60,this.intensities,this.model,this.leaks);this.fxClock-=1/60;}
  this.displayClock+=dt;
  if(this.displayClock>=.1){
   this.displayClock=0;const inv=sim.q.clone().invert(),rates=sim.omega.clone().applyQuaternion(inv).multiplyScalar(180/Math.PI);
   const attitude=new T.Euler().setFromQuaternion(frameAt(sim.pos).q.clone().invert().multiply(sim.q),'YXZ');
   const ground=terrainSample(this.world,sim.pos,false),height=Number.isFinite(ground.height)?Math.max(0,ground.signed-.44):Math.max(0,sim.altitude||0);
   this.displays.update({damageLevel:damage.core,speedMps:speed,verticalThrust:sim.burn.effort/sim.tune.lift,gasReserve:sim.reserve/sim.tune.capacity,heightM:height,yawRateDeg:rates.y,pitchRateDeg:rates.x,rollRateDeg:rates.z,pitchDeg:-attitude.x/rad,rollDeg:attitude.z/rad,mastYawDeg:Math.atan2(Math.sin(this.mast.rotation.y),Math.cos(this.mast.rotation.y))/rad,mastPitchDeg:-this.optics.rotation.x/rad});
  }
 }
}
