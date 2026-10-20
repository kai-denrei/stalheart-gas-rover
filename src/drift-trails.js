import * as T from '../upstream/stalheart/vendor/three.module.js';
export function createDriftTrails(scene){
 const count=320,mesh=new T.InstancedMesh(new T.PlaneGeometry(.15,1),new T.MeshBasicMaterial({color:0x061316,transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide}),count);mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);
 let cursor=0,last=null,lastWheels=null,lastTime=0,lastAge=0;const object=new T.Object3D(),basis=new T.Matrix4();
 function reset(){cursor=0;mesh.count=0;last=null;lastWheels=null;}
 return {mesh,reset,update(s){if(s.time<lastTime||s.age<lastAge)reset();lastTime=s.time;lastAge=s.age;if(!s.grounded||s.drift<.25||s.vel.length()<2){last=null;lastWheels=null;return;}if(last&&last.distanceToSquared(s.pos)<.0625)return;last=s.pos.clone();
  const wheels=[-1,1].map(side=>new T.Vector3(side*(s.vehicle?.track||.98),-.415,-(s.vehicle?.axle||1.44)).applyQuaternion(s.q).add(s.pos));
  if(lastWheels)for(let i=0;i<2;i++){const from=lastWheels[i],to=wheels[i],normal=new T.Vector3(0,1,0).applyQuaternion(s.q),along=to.clone().sub(from).projectOnPlane(normal).normalize(),across=new T.Vector3().crossVectors(along,normal).normalize();object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromRotationMatrix(basis.makeBasis(across,along,normal));object.scale.set(1,from.distanceTo(to)+.04,1);object.updateMatrix();mesh.setMatrixAt(cursor,object.matrix);cursor=(cursor+1)%count;mesh.count=Math.min(count,mesh.count+1);}lastWheels=wheels;mesh.instanceMatrix.needsUpdate=true;
 }};
}
