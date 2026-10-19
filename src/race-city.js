import {separateDomeShell} from './dome-glazing.js';
import {openDomePort,subtractBox,unionWalkingFloor} from './dome-ports.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {GLTFLoader} from '../upstream/stalheart/vendor/GLTFLoader.js';
import {point,frameAt} from './world.js';
import {segmentDistance} from './race-world.js';
import {convexCollider} from './collisions.js';
const ROLES=['habitat','research','logistics','biosphere','power','fabrication'];
// Spaced around the existing circuit. The course remains its own mandatory route.
export const CITY_SITES=[-10,90,190,285].flatMap((z,row)=>[-28,68,170].map((x,col)=>({x:row===3&&col===2?204:x,z,role:ROLES[(row*3+col)%6],row,col})));
export async function createRaceCity(view){
 const {route,deck,course}=view.world.race,fullRoute=route.concat([[deck.x,deck.z]]),clear=(x,z)=>!(Math.abs(x-deck.x)<deck.w/2+12&&Math.abs(z-deck.z)<deck.d/2+12)&&fullRoute.slice(1).every((b,i)=>segmentDistance(x,z,fullRoute[i],b)>12);
 const sites=CITY_SITES.map(s=>({...s,base:1}));if(course.id==='expedition')for(const [row,z] of [-285,-185,-75,55].entries())for(const [col,x] of [385,470,600].entries())sites.push({x,z,role:ROLES[(row*2+col+3)%ROLES.length],row,col,base:2});
 const bank=new Map(),loader=new GLTFLoader(),items=[],group=new T.Group();group.name='DOME_RACE_CITY';view.scene.add(group);
 await Promise.all([...ROLES,'bridge_long'].flatMap(role=>[1,2].map(async tier=>{
  const gltf=await loader.loadAsync(`./assets/dome-city/${role}_d0_lod${tier}.glb`);
  if(role!=='bridge_long')separateDomeShell(gltf.scene);
  gltf.scene.traverse(o=>{if(o.isMesh){if(role!=='bridge_long'&&o.name==='BODY'){const old=o.geometry;o.geometry=unionWalkingFloor(old);old.dispose();}o.castShadow=false;o.receiveShadow=false;}});bank.set(role+tier,gltf.scene);
 })));
 function solid(matrix,min,max,id){const pts=[];for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])pts.push(new T.Vector3(x,y,z).applyMatrix4(matrix));const c=convexCollider(pts,id,'city');view.world.colliders.push(c);}
 function add(role,matrix){const root=new T.Group();root.matrix.copy(matrix);root.matrix.decompose(root.position,root.quaternion,root.scale);const levels=[1,2].map(t=>bank.get(role+t).clone(true));levels.forEach(m=>root.add(m));levels[1].visible=false;group.add(root);const item={root,levels,near:true};items.push(item);return item;}
 const domes=sites.map((site,i)=>{
  const origin=point(site.x,site.z),frame=frameAt(origin),matrix=new T.Matrix4().compose(origin,frame.q,new T.Vector3(1,1,1)),item=add(site.role,matrix);
  // Keep glazing consistent across both LODs; never mutate the shared asset bank.
  const glazing=(i+Math.floor(i/6))%2===0?'clear':'opaque';const amber=site.base===2;item.glazing=glazing;
  for(const level of item.levels)level.traverse(o=>{if(!o.isMesh||o.name!=='SHELL')return;o.material=new T.MeshStandardMaterial(glazing==='clear'?{color:amber?0xf7bf62:0x79cbd2,transparent:true,opacity:.22,roughness:.2,metalness:.18,depthWrite:false,side:T.DoubleSide}:{color:amber?0xae6243:0xb3beb0,roughness:.7,metalness:.12});o.material.forceSinglePass=true;});
  // Low envelope + upper mast proxies, independent of visible LOD.
  solid(matrix,[-14.6,0,-14.6],[14.6,13.2,14.6],'city-dome-'+i);solid(matrix,[-2,13.2,-2],[2,36,2],'city-mast-'+i);
  return {...site,...item,matrix,frame};
 });
 const thresholdGeo=new T.BoxGeometry(4.5,.08,1.7),thresholdMat=new T.MeshStandardMaterial({color:0x8babae,roughness:.7,metalness:.25});
 let bridges=0;
 for(const a of domes)for(const b of domes){
  if(a.base!==b.base)continue;
  const horizontal=a.row===b.row&&b.col===a.col+1,vertical=a.col===b.col&&b.row===a.row+1;if(!horizontal&&!vertical)continue;
  const distance=Math.hypot(b.x-a.x,b.z-a.z),span=distance-28;
  // Authored columns at +/-10 and +/-26. Omit connections whose feet obstruct the circuit.
  if(![-26,-10,10,26].every(t=>{const k=(14+(t+26)/52*span)/distance;return clear(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k);}))continue;
  const portA=horizontal?'E':'N',portB=horizontal?'W':'S';
  for(const [d,p] of [[a,portA],[b,portB]]){for(const level of d.levels)openDomePort(level,p);(d.openPorts??=[]).push(p);const threshold=new T.Mesh(thresholdGeo,thresholdMat);threshold.name='PORT_THRESHOLD_'+p;const axis=p==='E'||p==='W'?'x':'z',sign=p==='W'||p==='S'?-1:1;threshold.position[axis]=sign*14.2;threshold.position.y=7.95;if(axis==='x')threshold.rotation.y=Math.PI/2;d.root.add(threshold);}
  const p1=new T.Vector3(horizontal?14:0,9.7,vertical?14:0).applyMatrix4(a.matrix),p2=new T.Vector3(horizontal?-14:0,9.7,vertical?-14:0).applyMatrix4(b.matrix);
  const x=p2.clone().sub(p1).normalize(),up=a.frame.up.clone().add(b.frame.up).normalize(),z=new T.Vector3().crossVectors(x,up).normalize(),y=new T.Vector3().crossVectors(z,x).normalize(),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  const origin=p1.clone().add(p2).multiplyScalar(.5).addScaledVector(y,-9.7),matrix=new T.Matrix4().compose(origin,q,new T.Vector3(p1.distanceTo(p2)/52,1,1));const bridge=add('bridge_long',matrix);for(const level of bridge.levels)level.traverse(o=>{if(o.isMesh){let geometry=subtractBox(o.geometry,{min:[26,7.48,-20],max:[40,20,20]});const trimmed=subtractBox(geometry,{min:[-40,7.48,-20],max:[-26,20,20]});geometry.dispose();o.geometry=trimmed;}});
  // Keep the underpass open: roof/floor and four individual supports, never one solid hull.
  solid(matrix,[-27,7.5,-2.2],[27,10.9,2.2],'city-bridge-'+bridges);
  for(const t of [-26,-10,10,26])solid(matrix,[t-1,0,-1],[t+1,7.5,1],`city-pillar-${bridges}-${t}`);bridges++;
 }
 return {group,domes:domes.length,sites:domes,bridges,items,update(position){for(const item of items){const d=item.root.position.distanceToSquared(position);item.root.visible=d<470**2;const near=item.near?d<110**2:d<90**2;if(near!==item.near){item.near=near;item.levels[0].visible=near;item.levels[1].visible=!near;}}},snapshot(){return {domes:domes.length,bases:course.id==='expedition'?2:1,clear:domes.filter(d=>d.glazing==='clear').length,opaque:domes.filter(d=>d.glazing==='opaque').length,bridges,near:items.filter(i=>i.near).length,far:items.filter(i=>!i.near).length};}};
}
