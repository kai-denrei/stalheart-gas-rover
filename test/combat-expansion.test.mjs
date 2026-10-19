import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {subtractBox,passageBox} from '../src/dome-ports.js';
import {CityDefense} from '../src/city-defense.js';
import {createRaceWorld} from '../src/race-world.js';
import {point} from '../src/world.js';
test('passage subtraction makes a real hole, retaining adjacent wall and finite normals',()=>{
 const wall=new T.PlaneGeometry(12,12);wall.rotateY(Math.PI/2);wall.translate(13,9.9,0);const g=subtractBox(wall,passageBox('E')),mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();
 const ray=z=>new T.Raycaster(new T.Vector3(18,9.9,z),new T.Vector3(-1,0,0)).intersectObject(mesh);
 assert.equal(ray(0).length,0);assert.equal(ray(2).length,0);assert.ok(ray(3).length>0);assert.ok([...g.attributes.normal.array].every(Number.isFinite));
});
test('Quiver damage waits for missile arrival and reset retires flights',()=>{
 const w=createRaceWorld();w.colliders=[];w.holes=[];const gun={id:0,type:'quiver',x:200,z:44,origin:point(200,44,35),range:150,cooldown:100,damage:4};const d=new CityDefense(w,[gun]),race={phase:'racing',racers:[]};d.spawn();d.nextWave=1e9;const e=d.enemies[0],hp=e.hp;d.step(.1,race);assert.equal(e.hp,hp);assert.equal(d.projectiles.length,0,'launcher must acquire its lock');d.step(.6,race);assert.equal(d.projectiles.length,1);assert.equal(d.projectiles[0].ignition,false);for(let i=0;i<160;i++)d.step(.05,race);assert.ok(d.stats.killed>0);w.race.hazardGeneration++;d.step(.05,race);assert.equal(d.projectiles.length,0);assert.equal(d.stats.fired,0);
});
test('Reed animation contains measured limb motion from the source solver',async()=>{
 const {readFile}=await import('node:fs/promises'),meta=JSON.parse(await readFile('assets/city-combat/reed-motion.json')),bin=await readFile('assets/city-combat/reed-motion.bin'),data=new Uint16Array(bin.buffer,bin.byteOffset,bin.byteLength/2);let max=0,total=0;
 for(let v=0;v<meta.vertices;v++){let d=0;for(let k=0;k<3;k++){const a=T.DataUtils.fromHalfFloat(data[v*4+k]),b=T.DataUtils.fromHalfFloat(data[(60*meta.width*meta.height+v)*4+k]);assert.ok(Number.isFinite(a)&&Number.isFinite(b));d+=(a-b)**2;}d=Math.sqrt(d);max=Math.max(max,d);total+=d;}
 assert.ok(max>.3,'probing and planted limb poses must visibly differ');assert.ok(total/meta.vertices>.05,'a stationary body must not be mistaken for a walking capture');
});
test('overlapping coplanar walking floors become one surface',async()=>{
 const {unionWalkingFloor}=await import('../src/dome-ports.js'),positions=[-3,7.9,-2,3,7.9,2,3,7.9,-2,-3,7.9,-2,-3,7.9,2,3,7.9,2,-2,7.9,-3,2,7.9,3,2,7.9,-3,-2,7.9,-3,-2,7.9,3,2,7.9,3],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const result=unionWalkingFloor(g),mesh=new T.Mesh(result,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();const hits=new T.Raycaster(new T.Vector3(.23,10,.17),new T.Vector3(0,-1,0)).intersectObject(mesh);assert.equal(hits.length,1);
});
