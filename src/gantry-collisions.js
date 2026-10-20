import {Box3,Vector3,Matrix4,Matrix3,Plane} from '../upstream/stalheart/vendor/three.module.js';
import {convexCollider} from './collisions.js';
// The GLB merges disconnected beams, feet, rails and trim into two large meshes.
// Weld seam vertices, then split by triangle connectivity: never hull the whole
// gate, which would fill the drive-through opening with an invisible wall.
export function meshIslands(geometry){
 const a=geometry.attributes.position,index=geometry.index,ids=[],points=[],parents=[],weld=new Map();
 for(let i=0;i<a.count;i++){const p=new Vector3().fromBufferAttribute(a,i),key=p.toArray().map(v=>v.toFixed(4)).join(',');if(!weld.has(key)){weld.set(key,points.length);parents.push(points.length);points.push(p);}ids.push(weld.get(key));}
 const root=i=>parents[i]===i?i:parents[i]=root(parents[i]);
 for(let i=0;i<(index?.count??a.count);i+=3){const tri=[0,1,2].map(j=>ids[index?index.getX(i+j):i+j]);parents[root(tri[1])]=root(tri[0]);parents[root(tri[2])]=root(tri[0]);}
 const groups=new Map();points.forEach((p,i)=>{const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(p);});
 return [...groups.values()].filter(ps=>{const size=new Box3().setFromPoints(ps).getSize(new Vector3());return ps.length>=4&&Math.min(size.x,size.y,size.z)>.09&&size.x*size.y*size.z>.04;});
}
export function createGantryCollisions(gantry,world){
 const entries=[],normalMatrix=new Matrix3(),plane=new Plane();
 gantry.updateWorldMatrix(true,true);
 gantry.traverse(mesh=>{if(!mesh.isMesh)return;const parts=meshIslands(mesh.geometry);for(const [i,points] of parts.entries()){
  const local=convexCollider(points,`gantry-${mesh.parent.name}-${i}`,'gantry');if(!local?.planes.length)continue;
  const collider={...local,center:local.center.clone(),planes:local.planes.map(p=>({normal:p.normal.clone(),constant:p.constant})),spatialCenter:new Vector3(),spatialRadius:0};
  entries.push({mesh,local,collider,matrix:new Matrix4().makeScale(0,0,0)});world.colliders.push(collider);
 }});
 function update(){for(const e of entries){const m=e.mesh.matrixWorld;if(e.matrix.equals(m))continue;e.matrix.copy(m);e.collider.center.copy(e.local.center).applyMatrix4(m);e.collider.radius=e.local.radius*m.getMaxScaleOnAxis();normalMatrix.getNormalMatrix(m);for(let i=0;i<e.local.planes.length;i++){const source=e.local.planes[i],dest=e.collider.planes[i];plane.set(source.normal,-source.constant).applyMatrix4(m,normalMatrix);dest.normal.copy(plane.normal);dest.constant=-plane.constant;}}}
 // Conservative travel envelope covers rail motion, carriage travel and arm
 // yaw. The battle grid can keep references to these moving world-space planes.
 update();for(const {collider} of entries){collider.spatialCenter.copy(collider.center);collider.spatialRadius=collider.radius+16;}
 return {update,colliders:entries.map(e=>e.collider)};
}
