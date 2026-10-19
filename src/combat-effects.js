import {createScorchTrail} from '../upstream/stalheart/src/fx/scorch-trail.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import * as rotary from '../upstream/stalheart/src/fx/explosions/rotary-pop.js';
import * as bofors from '../upstream/stalheart/src/fx/explosions/bofors-burst.js';
import * as heavy from '../upstream/stalheart/src/fx/explosions/howitzer-blast.js';
import * as nuclear from '../upstream/stalheart/src/fx/explosions/orbital-strike.js';
import {RADIUS,upAt} from './world.js';
const modules={rotary,bofors,heavy,nuclear},caps={rotary:12,bofors:10,heavy:4,nuclear:4};
export function createCombatEffects(view){
 const scorch=createScorchTrail(view.scene,{cap:64,life:65,hot:4,size:8,lift:.08,name:'Orbital impact embers'}),live=[],counts={rotary:0,bofors:0,heavy:0,nuclear:0};let seed=1;
 return {live,prewarm(){rotary.prewarm({compile:(scene,camera)=>view.renderer.compile(scene,camera,view.scene)},view.camera);},spawn(type,position,scale=1,pace=1){const same=live.filter(x=>x.type===type);if(same.length>=caps[type]){const old=same[0];old.fx.dispose();live.splice(live.indexOf(old),1);}const fx=modules[type].createExplosion({scale,seed:seed++,planetRadius:RADIUS});fx.object.position.copy(position);fx.object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),upAt(position));view.scene.add(fx.object);live.push({fx,type,pace,age:0});counts[type]++;if(type==='heavy'||type==='nuclear')scorch.stamp(position,upAt(position),type==='nuclear'?7:3);view.onCombatImpact?.(type,position);return fx;},step(dt){scorch.tick(dt);for(let i=live.length-1;i>=0;i--){const x=live[i];x.age+=dt;x.fx.tick(dt*x.pace);if(!x.fx.alive()){x.fx.dispose();live.splice(i,1);}}},reset(){scorch.clear();for(const x of live)x.fx.dispose();live.length=0;seed=1;for(const k of Object.keys(counts))counts[k]=0;},snapshot(){return {live:live.length,counts:{...counts},effects:live.map(x=>({type:x.type,age:x.age}))};}};
}
