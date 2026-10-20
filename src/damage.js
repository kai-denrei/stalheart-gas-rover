// Accumulated gameplay damage. D1 is cosmetic; D2/D3 change available controls.
export const WHEEL_IDS=['FL','FR','ML','MR','RL','RR'];
export const JET_IDS=['V_FL','V_FR','V_RL','V_RR','L_FL','L_FR','L_RL','L_RR'];
export const ZONES=['FRONT_BUMPER','REAR_PANEL','FLANK_NEG_X','FLANK_POS_X','SENSOR_MAST',...WHEEL_IDS.map(id=>'WHEEL_'+id),...JET_IDS.map(id=>'NOZZLE_'+id)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const damageLevel=points=>points>=6?3:points>=3?2:points>=1?1:0;
export function impactZone(zone,local){
 const [x=0,y=0,z=0]=local||[];
 if(ZONES.includes(zone))return zone;
 if(zone?.startsWith('wheel_'))return 'WHEEL_'+zone.slice(6);
 if(zone==='sensor')return 'SENSOR_MAST';
 if(zone==='front')return 'FRONT_BUMPER';if(zone==='rear')return 'REAR_PANEL';
 if(zone==='flank_negative_x')return 'FLANK_NEG_X';if(zone==='flank_positive_x')return 'FLANK_POS_X';
 if(y>.7)return 'SENSOR_MAST';
 return Math.abs(z)>1.35?(z>0?'FRONT_BUMPER':'REAR_PANEL'):x<0?'FLANK_NEG_X':'FLANK_POS_X';
}
export class RoverDamage {
 constructor(){this.revision=0;this.reset();}
 reset(){this.points=Object.fromEntries(ZONES.map(z=>[z,0]));this.corePoints=0;this.hits=0;this.lastHit=null;this.cooldowns=new Map();this.refresh();}
 refresh(){
  this.core=damageLevel(this.corePoints);this.wreck=this.core===3;
  this.states=Object.fromEntries(ZONES.map(z=>[z,this.wreck?3:damageLevel(this.points[z])]));
  const wheel=WHEEL_IDS.map(id=>this.states['WHEEL_'+id]),avg=a=>a.reduce((s,n)=>s+n,0)/a.length;
  const drive=wheel.map(d=>[1,1,.6,0][d]),grip=wheel.map(d=>[1,1,.5,.18][d]),steering=wheel.slice(0,2).map(d=>[1,1,.5,0][d]);
  this.effects={drive:this.wreck?0:avg(drive)*(this.core===2?.8:1),grip:avg(grip),steer:avg(steering),wheelSteer:steering,pull:(avg([drive[0],drive[2],drive[4]])-avg([drive[1],drive[3],drive[5]]))*.32,thrust:JET_IDS.map(id=>[1,1,.5,0][this.states['NOZZLE_'+id]]),gimbal:JET_IDS.map(id=>[1,1,.45,0][this.states['NOZZLE_'+id]])};
  const leak=(...ids)=>Math.max(...ids.map(id=>[0,0,.6,1][this.states[id]]));
  this.leaks={NEG_X:leak('FLANK_NEG_X','NOZZLE_L_FL','NOZZLE_L_RL'),POS_X:leak('FLANK_POS_X','NOZZLE_L_FR','NOZZLE_L_RR'),REAR:leak('REAR_PANEL','NOZZLE_V_RL','NOZZLE_V_RR')};
  this.effects.leakRate=this.wreck?0:Object.values(this.leaks).reduce((s,n)=>s+n,0)*.8;
  this.revision++;
 }
 destroy({speed,source='environment',time=0,zone,local}){
  if(this.wreck)return null;const primary=impactZone(zone,local),before={...this.states};this.corePoints=6;for(const id of ZONES)this.points[id]=6;this.hits++;this.refresh();
  this.lastHit={zone:primary,speed,source,time,level:3,changed:ZONES.filter(id=>before[id]!==3),coreChanged:true,hits:this.hits};return this.lastHit;
 }
 impact({speed,zone,local=[0,0,0],source='environment',time=0,landing=false}){
  // Contact solvers revisit a manifold many times. Count its strongest event once,
  // then suppress sustained scraping/settling for 0.65 s per object and assembly.
  const v=Math.max(0,Number(speed)||0)*(landing?.8:1),primary=impactZone(zone,local);
  if(v<4||!ZONES.includes(primary)||this.wreck)return null;
  const key=source+':'+primary;if(time<(this.cooldowns.get(key)??-Infinity))return null;
  this.cooldowns.set(key,time+.65);
  // Bound cooldown history when driving past many static fixture pieces.
  for(const [id,until] of this.cooldowns)if(until<time-2)this.cooldowns.delete(id);
  const dose=Math.min(6,((v-3)/6)**1.4),before={...this.states},oldCore=this.core;
  const add=(id,amount)=>{this.points[id]=clamp(this.points[id]+amount,0,6);};
  add(primary,dose);
  const side=local[0]<0?'L':'R',end=local[2]>=0?'F':'R';
  if(primary==='FRONT_BUMPER'||primary==='REAR_PANEL'){
   const e=primary==='FRONT_BUMPER'?'F':'R';add('WHEEL_'+e+side,dose*.3);add('NOZZLE_V_'+e+side,dose*.25);
  }else if(primary.startsWith('FLANK_')){
   const s=primary==='FLANK_NEG_X'?'L':'R';add('NOZZLE_L_'+end+s,dose*.4);add('WHEEL_M'+s,dose*.3);
  }else if(primary.startsWith('WHEEL_')){
   const id=primary.slice(6),e=id[0]==='M'?'F':id[0];add('NOZZLE_V_'+e+id[1],dose*.2);
  }
  this.corePoints=clamp(this.corePoints+dose*(primary.startsWith('WHEEL_')?.08:primary==='SENSOR_MAST'?.04:.35),0,6);
  this.hits++;this.refresh();
  const changed=ZONES.filter(id=>before[id]!==this.states[id]);
  this.lastHit={zone:primary,speed,source,time,level:this.states[primary],changed,coreChanged:oldCore!==this.core,hits:this.hits};return this.lastHit;
 }
 snapshot(){return {states:{...this.states},core:this.core,hits:this.hits,wreck:this.wreck,effects:{...this.effects,thrust:[...this.effects.thrust],gimbal:[...this.effects.gimbal],wheelSteer:[...this.effects.wheelSteer]},lastHit:this.lastHit};}
}
