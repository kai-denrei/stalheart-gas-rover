import * as T from '../upstream/stalheart/vendor/three.module.js';

// LOD2 merges the shell into BODY and leaves an empty SHELL socket. Recover
// its authored ellipsoid triangles so far-tier glazing matches the near tier.
export function separateDomeShell(level){
 const shell=level.getObjectByName('SHELL'),body=level.getObjectByName('BODY');
 if(shell?.isMesh||!body?.isMesh)return;
 const geometry=body.geometry.index?body.geometry.toNonIndexed():body.geometry.clone(),p=geometry.attributes.position,roof=[],solid=[];
 const onShell=i=>Math.abs((p.getX(i)/14)**2+((p.getY(i)-1.4)/12)**2+(p.getZ(i)/14)**2-1)<.00001&&p.getY(i)>=1.39;
 for(let i=0;i<p.count;i+=3)([i,i+1,i+2].every(onShell)?roof:solid).push(i,i+1,i+2);
 if(!roof.length){geometry.dispose();throw Error('Dome distance tier has no separable shell');}
 const glass=geometry.clone();glass.setIndex(roof);glass.computeBoundingBox();glass.computeBoundingSphere();geometry.setIndex(solid);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 body.geometry=geometry;const mesh=new T.Mesh(glass,body.material);mesh.name='SHELL';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);shell?.removeFromParent();body.parent.add(mesh);
}
