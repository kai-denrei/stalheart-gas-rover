// Preview sequence only: each simulated hit advances one group by one asset stage.
// This is an art comparison, not a proposed gameplay damage formula.
export const GROUPS = [
 {id:'front',label:'Front assembly',zones:['FRONT_BUMPER','WHEEL_FL','WHEEL_FR','NOZZLE_V_FL','NOZZLE_V_FR','SENSOR_MAST']},
 {id:'left',label:'Left flank',zones:['FLANK_NEG_X','WHEEL_ML','NOZZLE_L_FL','NOZZLE_L_RL']},
 {id:'right',label:'Right flank',zones:['FLANK_POS_X','WHEEL_MR','NOZZLE_L_FR','NOZZLE_L_RR']},
 {id:'rear',label:'Rear assembly',zones:['REAR_PANEL','WHEEL_RL','WHEEL_RR','NOZZLE_V_RL','NOZZLE_V_RR']}
];
export const HIT_COUNT=GROUPS.length*3;
export function accumulatedDamage(hits){
 hits=Math.max(0,Math.min(HIT_COUNT,Math.floor(Number(hits)||0)));
 const groups=GROUPS.map((group,i)=>({...group,level:Math.max(0,Math.min(3,Math.floor((hits+GROUPS.length-1-i)/GROUPS.length)))}));
 const states=Object.fromEntries(groups.flatMap(g=>g.zones.map(zone=>[zone,g.level])));
 // Core advances only after a complete round, never from one damaged component.
 const core=Math.floor(hits/GROUPS.length),last=hits?groups[(hits-1)%GROUPS.length]:null;
 return {hits,groups,states,core,last,wreck:hits===HIT_COUNT};
}
