import * as T from 'three';
// Deterministic, bounded pools: seeking backwards restores all effects without simulation history.
export function effects(scene,index,options={}){
 const group=new T.Group();scene.add(group);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.3,'rgba(255,255,255,.55)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const texture=new T.CanvasTexture(canvas);
 const fire=new T.Group();group.add(fire);const sparks=[];
 for(let i=0;i<45;i++){const m=new T.Sprite(new T.SpriteMaterial({map:texture,color:i%4?0xff6a16:0xffdca0,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));fire.add(m);sparks.push(m);}
 // Adapted from the existing Ridgeback ventral jet: additive blue envelope and white core.
 const jet=new T.Group();group.add(jet);for(const [radius,length,color] of [[.45,3,0x62aaff],[.18,2.1,0xffe9c3]]){const m=new T.Mesh(new T.ConeGeometry(radius,length,12,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));m.position.y=-length/2;jet.add(m);}
 const smoke=[];for(let i=0;i<42;i++){const m=new T.Sprite(new T.SpriteMaterial({map:texture,color:i%2?0x71695c:0x55585a,transparent:true,depthWrite:false}));group.add(m);smoke.push(m);}
 const verts=[];for(let k=0;k<18;k++){let x=Math.cos(k*2.4)*1.3,z=Math.sin(k*2.4)*1.3;for(let j=0;j<4;j++){const a=k*2.4+Math.sin(k*19+j*5)*.28,nx=x+Math.cos(a)*(.3+j*.14),nz=z+Math.sin(a)*(.3+j*.14);verts.push(x,.025,z,nx,.025,nz);if(j===2)verts.push(nx,.026,nz,nx+Math.cos(a+.8)*.6,.026,nz+Math.sin(a+.8)*.6);x=nx;z=nz;}}
 const cracks=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(verts,3)),new T.LineBasicMaterial({color:0x151515}));group.add(cracks);
 return {update(s,t,root){
 fire.position.set(s.x,s.height+.7,s.z);fire.visible=s.heat>.001;
 sparks.forEach((m,i)=>{const q=((t*(.7+i%3*.12)+i*.618)%1),a=i*2.399+index;m.position.set(Math.cos(a)*(1.15+q*.5),q*(5+s.heat*8),Math.sin(a)*(1.1+q*.5));m.scale.set((.5+q)*s.heat,(1+q*4)*s.heat,1);m.material.opacity=s.heat*(1-q)*.6;});
 jet.position.copy(root.getObjectByName('SOCKET_BRAKE_JET').getWorldPosition(new T.Vector3()));jet.visible=s.jet>0;jet.scale.setScalar(s.jet);
 cracks.position.set(s.x,0,s.z);cracks.rotation.y=s.yaw;cracks.visible=s.hit>=0;cracks.scale.setScalar(Math.min(1,Math.max(0,s.hit)*7));
 smoke.forEach((m,i)=>{const a=i*2.399,age=s.hit-i%5*.035,spread=1+Math.max(0,age)*(.9+i%4*.35);m.visible=age>=0&&age<5;m.position.set(s.x+Math.cos(a)*spread,.2+Math.max(0,age)*(.3+i%3*.13),s.z+Math.sin(a)*spread);m.scale.setScalar(.7+Math.max(0,age)*1.3);m.material.opacity=Math.max(0,.5-age*.1)*(options.smokeOpacity??1);});
 }};
}
