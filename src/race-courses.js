export const BASE1_ROUTE=[[0,-40],[0,-5],[0,35],[65,35],[85,48],[65,61],[35,61],[35,108],[35,158],[100,158],[100,108],[118,92],[136,108],[136,158],[136,210]];
const REVERSE=[...BASE1_ROUTE].reverse().map(p=>[...p]);
const WILD=[[0,-85],[55,-115],[115,-140],[150,-140],[280,-140],[330,-140],[350,-200],[390,-240]];
const BASE2=[[420,-240],[465,-240],[490,-225],[465,-210],[430,-210],[430,-165],[430,-110],[490,-110],[490,-165],[520,-180],[548,-165],[548,-110],[548,-55]];
export const COURSES={
 race:{id:'race',number:1,name:'THE LAST LEAP',route:BASE1_ROUTE,deck:[136,264],capacity:160},
 expedition:{id:'expedition',number:2,name:'THE GREAT DIVIDE',route:[...REVERSE,...WILD,...BASE2],deck:[548,-1],capacity:260,
  sectors:[{start:0,name:'BASE 1 · REVERSE'},{start:14,name:'THE WILDS'},{start:23,name:'BASE 2 · AMBER'}],
  canyon:{x:215,z:-140,r:42},base2:{x:475,z:-140},service:[[115,-140],[420,-240]]}
};
export function gridPose(world,racer){if(world.stage&&racer.lane!==12){const o=world.stage.objects.find(o=>o.type==='spawn'&&o.slot===racer.id);if(o)return {x:o.x,z:o.z,heading:o.yaw*Math.PI/180};}const [a,b]=world.race.route,heading=Math.atan2(b[0]-a[0],b[1]-a[1]),back=racer.id>=3?7:0;return {x:a[0]+Math.cos(heading)*racer.lane-Math.sin(heading)*back,z:a[1]-Math.sin(heading)*racer.lane-Math.cos(heading)*back,heading};}
export function courseSector(world,gate){return [...(world.race.course.sectors||[{start:0,name:world.race.course.name}])].reverse().find(s=>gate>=s.start)?.name;}
