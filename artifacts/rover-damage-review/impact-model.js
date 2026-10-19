// Preview-only, simplified normal-impact response. No gameplay imports or mutations.
export const GRAVITY = 2.8; // The lab's default gravity, m/s².
export const CASES = [
  {id:'tap',name:'01 · Parking bump',kind:'front',speed:2,zone:'FRONT_BUMPER',note:'A small mistake should leave the rover intact.'},
  {id:'bump',name:'02 · Nose into barrier',kind:'front',speed:5,zone:'FRONT_BUMPER',note:'Judge the bumper damage on an otherwise intact rover.'},
  {id:'front',name:'03 · Fast barrier hit',kind:'front',speed:9,zone:'FRONT_BUMPER',note:'Compare with the slower nose impact. Should the damage still be just a dent?'},
  {id:'wheel',name:'04 · Front wheel into rock',kind:'wheel',speed:12,zone:'WHEEL_FL',note:'One damaged wheel. The chassis and other wheels should survive.'},
  {id:'side',name:'05 · Sideways slide into barrier',kind:'side',speed:12,zone:'FLANK_NEG_X',note:'A strong flank hit can trigger a gas leak. Compare the untouched opposite side.'},
  {id:'soft-landing',name:'06 · Controlled landing',kind:'landing',speed:3,zone:'WHEELS',note:'A routine boosted landing should not damage the rover.'},
  {id:'hard-landing',name:'07 · Hard landing',kind:'landing',speed:12,zone:'WHEELS',note:'Suspension absorbs part of the hit. Only the six wheel zones are evaluated.'},
  {id:'crash',name:'08 · Severe frontal crash',kind:'front',speed:22,zone:'FRONT_BUMPER',note:'Reserve D3 component destruction for a genuinely severe impact.'}
];
export const THRESHOLDS = {forgiving:[4,11,20],sensitive:[2,6,12]};
export function damageFor(test,speed,profile='forgiving') {
  const thresholds=THRESHOLDS[profile]||THRESHOLDS.forgiving;
  const effective=Math.max(0,speed)*(test.kind==='landing'?.8:1);
  const level=thresholds.filter(t=>effective>=t).length;
  const zones={};
  for(const id of test.zone==='WHEELS'?['FL','FR','ML','MR','RL','RR'].map(id=>'WHEEL_'+id):[test.zone])zones[id]=level;
  // A localized bumper or wheel swap must not automatically destroy the core.
  const core=test.kind==='front'&&speed>=20?Math.min(3,1+Math.floor((speed-20)/8)):0;
  return {zones,core,level,effective,normalSpeed:Math.max(0,speed)};
}
export function timing(test,speed) {
  speed=Math.max(.1,speed);
  const height=Math.min(2.4,speed*speed/(2*GRAVITY));
  const initialDown=Math.sqrt(Math.max(0,speed*speed-2*GRAVITY*height));
  const travel=test.kind==='landing'?(speed-initialDown)/GRAVITY:4/speed;
  return {height,initialDown,contact:1+travel,end:1+travel+2.3};
}
// Exact trajectories allow deterministic seeking and smooth display at any refresh rate.
// Horizontal tests use a fixed barrier and a damped rebound; landings use gravity.
// This is a controlled impact fixture, not the full six-wheel game solver.
export function sample(test,speed,time) {
  const tm=timing(test,speed),age=time-tm.contact,hit=age>=0;
  let offset=0,velocity=0;
  if(!hit){
    const t=Math.max(0,time-1);
    if(test.kind==='landing') {offset=tm.height-tm.initialDown*t-.5*GRAVITY*t*t;velocity=time<1?0:-(tm.initialDown+GRAVITY*t);}
    else {offset=Math.max(0,4-speed*t);velocity=time<1?0:-speed;}
  }else if(test.kind==='landing'){
    const rebound=Math.min(.8,speed*.06),flight=2*rebound/GRAVITY;
    if(age<flight){offset=rebound*age-.5*GRAVITY*age*age;velocity=rebound-GRAVITY*age;}
  }else{
    const rebound=Math.min(1.5,speed*.12);
    offset=rebound*(1-Math.exp(-4*age))/4;velocity=rebound*Math.exp(-4*age);
  }
  return {time,hit,age,offset,velocity,...tm};
}
