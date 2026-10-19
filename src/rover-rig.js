import * as T from '../upstream/stalheart/vendor/three.module.js';
import {solidSupport} from './collisions.js';
import {gimbalAngles} from './thrusters.js';
import {terrainSample,frameAt,upAt} from './world.js';
import {createOnboardDisplays} from './rover-fx.js';
import {createColdGasSystem,NOZZLE_IDS} from '../assets/recon-rover/damage/thruster-fx.js';
import {applyLocalizedDamage} from '../assets/recon-rover/damage/runtime.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rad=Math.PI/180;

export class RoverRig {
 constructor(model,scene,world,texture,damageBank){
  this.damageBank=damageBank;this.damageRevision=-1;
  this.model=model;this.world=world;this.lastTime=0;this.lastAge=Infinity;this.fxClock=0;this.displayClock=1;
  this.wheels=['FL','FR','ML','MR','RL','RR'].map((id,i)=>({id,index:[2,5,1,4,0,3][i],side:id.endsWith('L')?-1:1,z:id.startsWith('F')?1.44:id.startsWith('M')?-.42:-1.44,susp:model.getObjectByName('SUSP_PIVOT_'+id),steer:model.getObjectByName('WHEEL_STEER_'+id),spin:model.getObjectByName('WHEEL_SPIN_'+id)}));
  this.gimbals=NOZZLE_IDS.map(id=>model.getObjectByName('GIMBAL_'+id));this.intensities=Object.fromEntries(NOZZLE_IDS.map(id=>[id,0]));
  this.mast=model.getObjectByName('SENSOR_MAST_YAW');this.optics=model.getObjectByName('OPTICS_HEAD_PITCH');
  // Source dust assumes an infinite flat floor. Disable it on our spherical terrain.
  this.fx=createColdGasSystem(T,model,{texture,dust:false,groundY:-Infinity,maxPlumeParticles:320});scene.add(this.fx.group);this.fx.clear();
  const enable=this.fx.setEnabled.bind(this.fx);this.fx.setEnabled=value=>{enable(value);this.fx.setLeakEnabled(value);this.fx.group.visible=Boolean(value);if(!value)this.fx.clear();};this.fx.setEnabled(true);
  this.leaks={NEG_X:0,POS_X:0,REAR:0};
  this.displays=createOnboardDisplays(T,model);this.stats={activePlumeCount:0,activeDustCount:0};
 }
 update(sim,speed){
  const damage=sim.damage,health=damage.effects;
  if(this.damageRevision!==damage.revision){
   this.damageRevision=damage.revision;applyLocalizedDamage(this.model,this.damageBank,damage.states,{showDebris:false});
   // Keep core damage independent of the worst component; preserve per-racer paint.
   this.model.getObjectByName('CHASSIS_ARMOR_BODY').geometry=this.damageBank[damage.core].getObjectByName('CHASSIS_ARMOR_BODY').geometry;
   // Authored cracks target the original screen positions; our relocated displays stay readable.
   this.model.getObjectByName('DISPLAY_CRACK_OVERLAY').visible=false;this.displayClock=1;
  }
  const reset=sim.age<this.lastAge,dt=reset?0:clamp(sim.time-this.lastTime,0,.08);this.lastTime=sim.time;this.lastAge=sim.age;
  if(reset){this.fx.clear();this.fxClock=0;this.displayClock=1;}
  for(const w of this.wheels){
   const p=new T.Vector3(w.side*.98,-.44,w.z).applyQuaternion(sim.q).add(sim.pos),ground=terrainSample(this.world,p,false);
   const travel=sim.grounded&&Number.isFinite(ground.signed)?clamp(-Math.min(ground.signed,solidSupport(this.world,p,upAt(p))),-.12,.14):-.12;
   const level=damage.states['WHEEL_'+w.id],flex=[1,1,.65,.2][level];
   w.susp.rotation.z=clamp(w.side*Math.asin(travel*flex/.5),-16*rad,14*rad);
   const steerRatio=w.z>1&&health.steer>0?health.wheelSteer[w.id==='FL'?0:1]/health.steer:0;
   const a=sim.steering*steerRatio,r=Math.abs(a)>1e-5?2.88/Math.tan(a):Infinity;
   w.steer.rotation.y=w.z>1?clamp(Math.atan(2.88/(r-w.side*.98)),-34*rad,34*rad):0;
   w.spin.rotation.x=sim.wheelSpin[w.index];
  }
  const sensor=damage.states.SENSOR_MAST;this.mast.rotation.y=sensor===3?0:sensor===2?Math.sin(sim.time*.16)*1.3:(sim.time*.16)%(2*Math.PI);this.optics.rotation.x=sensor===3?-.38:-.08+Math.sin(sim.time*.27)*.14;
  for(let i=0;i<8;i++){const f=sim.burn.forces[i],a=gimbalAngles(f,i,health.gimbal[i]);this.gimbals[i].rotation.set(a.pitch,0,a.roll);this.intensities[NOZZLE_IDS[i]]=clamp(f.length()/(sim.tune.lift/8),0,1);}
  // The supplied helper emits per step. Fixed 60 Hz makes density independent of FPS.
  this.model.updateWorldMatrix(true,true);this.fxClock+=dt;
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
