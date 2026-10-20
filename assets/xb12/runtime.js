// Engine-owned transforms: metres, +Y up, +Z forward. Positive compression raises the hub.
export const WHEELS=['FL','FR','RL','RR'];
export const LIMITS={compression:[-.12,.14],steerDeg:30,armLength:.70,wheelRadius:.5};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function damagePolicy(damage,id){
 const d=Math.max(0,Math.min(3,Number(damage)||0)),hit=d===3||(d===2&&['FL','RR'].includes(id));
 return {travel:d===3?0:hit?.4:1,drive:d===3?0:hit?.4:1,steer:d===3?0:hit?.5:1,locked:d===3};
}
export function applyXB12(root,{compression={},steerDeg=0,spinRad=0,sensorYaw=0,sensorPitch=0}={}){
 if(root.userData.static)return;
 const damage=Number(root.getObjectByName('XB12_ROOT')?.userData.damage_level||0);
 for(const id of WHEELS){
  const side=id.endsWith('L')?-1:1;
  const policy=damagePolicy(damage,id);
  const travel=policy.locked?-.08:clamp(Number(compression[id])||0,-.12,.14)*policy.travel;
  const angle=side*Math.asin(travel/.70);
  root.getObjectByName(`SUSP_PIVOT_${id}`).rotation.z=angle;
  // The simple swing-arm wheel carries the arm's camber; steering and spin remain independent.
  root.getObjectByName(`WHEEL_STEER_${id}`).rotation.y=id.startsWith('F')?clamp(steerDeg,-30*policy.steer,30*policy.steer)*Math.PI/180:0;
  root.getObjectByName(`WHEEL_SPIN_${id}`).rotation.x=spinRad*policy.drive;
 }
 root.getObjectByName('SENSOR_YAW').rotation.y=damage===3?0:damage===2?clamp(sensorYaw,-Math.PI/3,Math.PI/3):sensorYaw;
 root.getObjectByName('SENSOR_PITCH').rotation.x=damage===3?.65:clamp(sensorPitch,-.25,.25)+(damage===2?.12:0);
 root.updateMatrixWorld(true);
 for(const id of WHEELS){
  const top=root.getObjectByName(`SOCKET_DAMPER_UPPER_${id}`),bottom=root.getObjectByName(`SOCKET_DAMPER_LOWER_${id}`),aim=root.getObjectByName(`DAMPER_AIM_${id}`),rod=root.getObjectByName(`DAMPER_ROD_${id}`);
  const a=top.position.clone().setFromMatrixPosition(top.matrixWorld),b=bottom.position.clone().setFromMatrixPosition(bottom.matrixWorld);
  aim.parent.worldToLocal(a);aim.parent.worldToLocal(b);const d=b.sub(a),len=d.length();
  aim.position.copy(a);aim.quaternion.setFromUnitVectors(aim.up,d.normalize());rod.position.y=len;aim.userData.length_m=len;
 }
 root.updateMatrixWorld(true);
}
export function demoPose(time,mode='articulation',bias=0){
 const compression={};for(const [i,id] of WHEELS.entries())compression[id]=Math.max(-.12,Math.min(.14,bias+(mode==='articulation'?.10*Math.sin(time*Math.PI/2+i*Math.PI/2):mode==='landing'?(time%4<1?-.12:.14*Math.exp(-2*((time%4)-1))*Math.cos(9*((time%4)-1))):0)));
 return {compression,spinRad:mode==='articulation'?time*1.6:0,sensorYaw:time*.2};
}
