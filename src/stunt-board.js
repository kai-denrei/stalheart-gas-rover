import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {attachRivalryDisplay} from '../assets/scoreboard-rivalry/runtime.js';
import {convexCollider} from './collisions.js';
// The exporter merges disconnected boxes into one draw call. Recover those
// components for collision so the gap beneath the sign stays traversable.
export function housingColliders(mesh){
 const a=mesh.geometry.attributes.position,index=mesh.geometry.index,points=[],ids=[],byPosition=new Map(),parent=[];
 for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i),key=p.toArray().map(v=>v.toFixed(5)).join(',');if(!byPosition.has(key)){byPosition.set(key,points.length);parent.push(points.length);points.push(p);}ids.push(byPosition.get(key));}
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const count=index?index.count:a.count;for(let i=0;i<count;i+=3){const first=ids[index?index.getX(i):i];for(let j=1;j<3;j++)parent[find(ids[index?index.getX(i+j):i+j])]=find(first);}
 const groups=new Map();points.forEach((p,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(p.applyMatrix4(mesh.matrixWorld));});
 return [...groups.values()].map((ps,i)=>convexCollider(ps,`stunt-scoreboard-${mesh.id}-${i}`,'scoreboard')).filter(Boolean);
}
// Original A6 Beacon housing and instanced seven-segment display; three rows
// repurposed as racers, with no per-frame text textures or unbounded meshes.
export async function createStuntBoard(view,race){
 const [asset,entry]=await Promise.all([new GLTFLoader().loadAsync('./assets/scoreboard-rivalry/beacon_rivalry_d0_lod1.glb'),fetch('./assets/scoreboard-rivalry/entry.json').then(r=>{if(!r.ok)throw Error('Scoreboard manifest missing');return r.json();})]);
 const root=asset.scene,deck=race.world.race.deck;
 root.position.copy(new T.Vector3(0,deck.h,19).applyQuaternion(deck.frame.q).add(deck.origin));root.quaternion.copy(deck.frame.q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));root.scale.setScalar(2);root.name='Stunt rivalry / live top three';view.scene.add(root);
 // Bake the actual housing rather than a solid box across its open supports.
 root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh)view.world.colliders.push(...housingColliders(o));});
 const display=attachRivalryDisplay(T,root,entry,[0,0,0],{label:'STUNT TOP THREE',rowLabels:['1 YOU','2 EMBER','3 COBALT'],color:'#aff3ce'});
 let signature='';
 const dimInactive=()=>{const color=new T.Color(),matrix=new T.Matrix4(),zero=new T.Vector3(),mesh=display.digitMesh;for(let i=0;i<mesh.count;i++){mesh.getColorAt(i,color);if(Math.max(color.r,color.g,color.b)<.1){mesh.setColorAt(i,color.multiplyScalar(.08));mesh.getMatrixAt(i,matrix);matrix.scale(zero);mesh.setMatrixAt(i,matrix);}}mesh.instanceColor.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;};
 return {root,display,update(){const top=race.scoreStandings().slice(0,3),key=top.map(r=>r.id+':'+r.stunts.score).join('|');if(key===signature)return;signature=key;display.setRowLabels(top.map((r,i)=>`${i+1} ${r.name}`));display.setScores(top.map(r=>r.stunts.score),{duration:0});dimInactive();}};
}
