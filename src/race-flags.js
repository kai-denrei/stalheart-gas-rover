import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {mergeGeometries} from '../upstream/stalheart/vendor/BufferGeometryUtils.js';
import {STEP} from './simulation.js';
import {convexCollider} from './collisions.js';
const FACTIONS=['ember','vanguard','eclipse','helix','horizon','void'];
const PLAIN=new Set(['ember','vanguard']);

// Each cloth needs its own bones; geometry, materials and clips can be shared.
function cloneRig(source){
 const root=source.clone(true),originals=new Map(),copies=new Map();
 function pair(a,b){originals.set(b,a);copies.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);}pair(source,root);
 root.traverse(o=>{if(!o.isSkinnedMesh)return;const original=originals.get(o);o.skeleton=original.skeleton.clone();o.skeleton.bones=original.skeleton.bones.map(b=>copies.get(b));o.bind(o.skeleton,original.bindMatrix);});
 return root;
}

export async function createRaceFlags(view,gates){
 const loader=new GLTFLoader(),assets=await Promise.all(FACTIONS.map(f=>loader.loadAsync(`./assets/ctf-flags/flag_${f}.glb`))),flags=[];
 for(let i=0;i<assets.length;i++){
  const asset=assets[i],faction=FACTIONS[i],plain=PLAIN.has(faction),statics=new Map(),remove=[],solids=[];
  asset.scene.updateMatrixWorld(true);
  asset.scene.traverse(o=>{
   if(!o.isMesh)return;
   // The glyph is separate sewn geometry, not a texture. Remove both sides of
   // that primitive so the red and blue cloth are genuinely plain-colored.
   if(plain&&o.material.name==='Ivory vector insignia'){remove.push(o);return;}
   if(o.isSkinnedMesh)return;
   // Separate hulls keep the passage between poles open. Use the authored
   // shaft, socket and beacon vertices, with the exact visible world scale.
   if(/^(Pole_shaft|Capture_socket_foot|Socket_locking_collar|Beacon_housing|Tactical_cap|Spire_finial)\d*$/.test(o.name)){
    const a=o.geometry.attributes.position,points=[];for(let n=0;n<a.count;n++)points.push(new T.Vector3().fromBufferAttribute(a,n).applyMatrix4(o.matrixWorld));solids.push({name:o.name,points});
   }
   const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);
   for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
   if(!geometry.attributes.normal)geometry.computeVertexNormals();
   if(!statics.has(o.material))statics.set(o.material,[]);statics.get(o.material).push(geometry);remove.push(o);
  });
  for(const o of remove)o.removeFromParent();
  const placements=[];
  gates.forEach((gate,index)=>{
   if(index%FACTIONS.length!==i)return;
   for(const side of [-1,1]){
    const root=cloneRig(asset.scene);root.name=`Gate ${index+1} / ${faction} / ${side<0?'left':'right'}`;root.position.set(side*9.1,0,0);root.rotation.y=side<0?0:Math.PI;root.scale.setScalar(1.45);gate.group.add(root);root.updateWorldMatrix(true,true);placements.push(root.matrixWorld.clone());
    for(const solid of solids){const collider=convexCollider(solid.points.map(p=>p.clone().applyMatrix4(root.matrixWorld)),`flag-${index}-${side}-${solid.name}`,'race-flags');if(collider)view.world.colliders.push(collider);}
    const mixer=new T.AnimationMixer(root),clip=asset.animations.find(c=>c.name==='Flutter');if(!clip)throw Error(`Missing flag Flutter clip: ${faction}`);mixer.clipAction(clip).play();const offset=index*.19+(side>0?.37:0);mixer.setTime(offset);
    // A bind-pose bound can reject these animated, reparented cloth meshes.
    // Keep the small cloth surfaces visible; the batched hardware still culls.
    root.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false;});
    flags.push({root,mixer,faction,plain,gate:index,side,offset});
   }
  });
  // Pole/base hardware is static in Flutter. Batch it across the course, by
  // material, instead of adding fourteen separate draw calls for every flag.
  for(const [material,parts] of statics){const geometry=mergeGeometries(parts),instances=new T.InstancedMesh(geometry,material,placements.length);instances.name=`Race flag hardware / ${faction} / ${material.name}`;placements.forEach((m,n)=>instances.setMatrixAt(n,m));instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();view.scene.add(instances);for(const part of parts)part.dispose();}
 }
 let lastTime=null;
 return {flags,update(alpha){const race=view.raceView.race,time=Math.max(0,race.time-(race.phase==='racing'?STEP*(1-alpha):0));if(time===lastTime)return;lastTime=time;for(const f of flags)f.mixer.setTime(time+f.offset);}};
}
