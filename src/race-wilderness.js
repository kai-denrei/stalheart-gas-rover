import * as T from '../upstream/stalheart/vendor/three.module.js';
import {point,frameAt} from './world.js';
import {segmentDistance} from './race-world.js';
import {boxCollider} from './collisions.js';
// Bounded instanced scenery. Clear the actual course, launch and landing areas.
export function createWilderness(view){
 if(view.world.race.course.id!=='expedition')return null;
 const root=new T.Group();root.name='WILDS / basalt badlands';view.scene.add(root);
 const geometry=new T.DodecahedronGeometry(1,0),material=new T.MeshStandardMaterial({color:0x765449,roughness:1,flatShading:true}),placements=[];
 for(let i=0;i<260;i++){const x=35+(i*67.13%330),z=-245+(i*43.71%170),r=1.5+(i%7)*.65;
  if(view.world.holes.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+r+9)||view.world.race.route.slice(1).some((b,j)=>segmentDistance(x,z,view.world.race.route[j],b)<13+r))continue;
  const h=(i%9===0?12:2.2)+(i%5),p=point(x,z),f=frameAt(p),q=f.q.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),i*2.4));placements.push({p:p.clone().addScaledVector(f.up,h*.4),q,scale:new T.Vector3(r,h*.6,r*.8)});
  view.world.colliders.push(boxCollider({w:r*1.6,d:r*1.3,h:h*.9,origin:p,frame:{q}},'wild-rock-'+i));
 }
 const rocks=new T.InstancedMesh(geometry,material,placements.length);placements.forEach((p,i)=>{rocks.setMatrixAt(i,new T.Matrix4().compose(p.p,p.q,p.scale));rocks.setColorAt(i,new T.Color().setHSL(.035+(i%5)*.008,.16+(i%3)*.06,.5+(i%4)*.1));});rocks.computeBoundingSphere();root.add(rocks);
 // Solid rim beacons outside the driving corridor, readable without floating text.
 const markerGeo=new T.BoxGeometry(.6,1.4,.6),markerMat=new T.MeshStandardMaterial({color:0xffa34d,emissive:0x7c320a,emissiveIntensity:.4});
 for(const x of [164,266])for(const z of [-152,-128]){const p=point(x,z),f=frameAt(p),m=new T.Mesh(markerGeo,markerMat);m.position.copy(p).addScaledVector(f.up,.7);m.quaternion.copy(f.q);root.add(m);view.world.colliders.push(boxCollider({w:.6,d:.6,h:1.4,origin:p,frame:f},'canyon-beacon'));}
 return {root,rocks,count:placements.length};
}
