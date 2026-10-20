import {Vector3,Quaternion} from '../upstream/stalheart/vendor/three.module.js';
import {createRaceWorld,RACE_RULES} from './race-world.js';import {point,frameAt} from './world.js';import {fixtureColliders,boxCollider,cylinderCollider} from './collisions.js';import {validateStage,clone} from './stage-definition.js';
export function stageTransform(o){const origin=point(o.x,o.z,o.altitude||0),frame=frameAt(origin);frame.q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),(o.yaw||0)*Math.PI/180));frame.east.set(1,0,0).applyQuaternion(frame.q);frame.north.set(0,0,1).applyQuaternion(frame.q);return {origin,frame};}
export function createStageWorld(definition){const validation=validateStage(definition,{play:true});if(validation.errors.length)throw Error(validation.errors.join(' '));const stage=clone(definition),w=createRaceWorld(stage.base),objects=stage.objects,of=type=>objects.filter(o=>o.type===type),start=of('spawn').find(o=>o.slot===0),gates=of('gate').sort((a,b)=>a.order-b.order),finish=of('finish')[0],route=[[start.x,start.z],...gates.map(g=>[g.x,g.z])];
 w.stage=stage;w.rocks=objects.filter(o=>['rock','barrier'].includes(o.type)).map(o=>({...o,...stageTransform(o)}));
 w.holes=of('hole').map(o=>({...o,...stageTransform(o),r:o.radius,baseRadius:o.radius,phase:o.dormant?'dormant':'open',age:o.dormant?0:100,radius:o.dormant?0:o.radius}));
 w.pads=[{...start,name:'START GRID',...stageTransform(start)},...of('pad').map(o=>({...o,service:true,...stageTransform(o)}))];
 const d={...finish,...stageTransform(finish)};w.race.deck=d;w.race.route=route;w.race.course={...w.race.course,name:stage.name,route,deck:[d.x,d.z],capacity:stage.capacity,sectors:undefined};w.race.rules={...RACE_RULES};
 w.race.gates=gates.map((o,index)=>{const {origin,frame}=stageTransform({...o,yaw:0}),a=o.yaw*Math.PI/180;return {...o,index,origin,frame,dx:Math.sin(a),dz:Math.cos(a),authoredHeight:true};});
 w.race.spots=[0,-11,11].map((x,i)=>{const height=[2.4,1.6,.8][i],local=new Vector3(x,d.h+height,i===0?-25:-16);return {number:i+1,height,local,origin:local.clone().applyQuaternion(d.frame.q).add(d.origin),owner:null,reserved:null,hold:0};});
 w.colliders=fixtureColliders(w.rocks,[]);w.colliders.push(boxCollider(d,'finish-platform'));for(const spot of w.race.spots)w.colliders.push(cylinderCollider({radius:RACE_RULES.podiumRadius,h:spot.height,origin:spot.origin.clone().addScaledVector(d.frame.up,-spot.height),frame:d.frame},'podium-'+spot.number));
 return w;
}
