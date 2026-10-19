import * as T from '../upstream/stalheart/vendor/three.module.js';
import {point,frameAt} from './world.js';

// The same polyline/capsule union as the penalty boundary, rendered analytically
// instead of coloring one-metre cells. Intersections cannot double their paint.
export function trackSegments(world){
 const route=world.race.route.concat([[world.race.deck.x,world.race.deck.z]]),segments=[];let progress=0;
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const corner=j=>{if(j<=0||j>=route.length-1)return false;const p=route[j-1],q=route[j],r=route[j+1],ax=q[0]-p[0],az=q[1]-p[1],bx=r[0]-q[0],bz=r[1]-q[1];return (ax*bx+az*bz)/(Math.hypot(ax,az)*Math.hypot(bx,bz))<.94;};
  segments.push({a,b,length,progress,startCorner:corner(i-1),endCorner:corner(i)});progress+=length;
 }return segments;
}
export function sampleTrack(segments,x,z){let nearest={distance:Infinity};for(const s of segments){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],t=T.MathUtils.clamp(((x-s.a[0])*dx+(z-s.a[1])*dz)/(s.length*s.length),0,1),distance=Math.hypot(x-s.a[0]-t*dx,z-s.a[1]-t*dz);if(distance<nearest.distance)nearest={distance,progress:s.progress+t*s.length,kerb:(s.startCorner&&t*s.length<15)||(s.endCorner&&(1-t)*s.length<15)};}return nearest;}

export function createRaceTrack(view){
 const world=view.world,segments=trackSegments(world),width=world.race.rules.halfWidth,positions=[],uv=[];
 // Two-metre tessellation only follows planet curvature; all paint edges are
 // fragment-shader distances, antialiased in screen pixels with derivatives.
 for(let x=-12;x<164;x+=2)for(let z=-52;z<234;z+=2){
  if(sampleTrack(segments,x+1,z+1).distance>width+2)continue;
  for(const [dx,dz] of [[0,0],[0,2],[2,2],[0,0],[2,2],[2,0]]){positions.push(...point(x+dx,z+dz,.12).toArray());uv.push(x+dx,z+dz);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('trackCoord',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.96,metalness:0,side:T.DoubleSide});view.patchFloor(material);const floorCompile=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  floorCompile(shader);
  shader.uniforms.uTrackSegments={value:segments.map(s=>new T.Vector4(...s.a,...s.b))};
  shader.uniforms.uTrackInfo={value:segments.map(s=>new T.Vector4(s.progress,s.length,Number(s.startCorner),Number(s.endCorner)))};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 trackCoord; varying vec2 vTrack;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTrack=trackCoord;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 vTrack; uniform vec4 uTrackSegments[${segments.length}]; uniform vec4 uTrackInfo[${segments.length}];
   float trackNoise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float roadDist=10000.0,along=0.0,kerb=0.0;
   for(int i=0;i<${segments.length};i++){
    vec4 s=uTrackSegments[i],info=uTrackInfo[i];vec2 ab=s.zw-s.xy;
    float t=clamp(dot(vTrack-s.xy,ab)/dot(ab,ab),0.0,1.0),d=length(vTrack-s.xy-t*ab);
    if(d<roadDist){roadDist=d;along=info.x+t*info.y;kerb=max(info.z*(1.0-step(15.0,t*info.y)),info.w*(1.0-step(15.0,(1.0-t)*info.y)));}
   }
   if(roadDist>${width.toFixed(2)})discard;
   float aa=max(fwidth(roadDist),.018);
   // Graphite asphalt, two faint rubbered-in wheel paths, painted shoulders.
   float grain=trackNoise(floor(vTrack*45.0));
   vec3 asphalt=vec3(.045,.061,.068)*(0.94+.12*grain);
   float rubber=exp(-pow((roadDist-1.15)*1.6,2.0))*.12;
   vec3 paint=asphalt*(1.0-rubber);
   float edge=smoothstep(${(width-1.18).toFixed(2)}-aa,${(width-1.18).toFixed(2)}+aa,roadDist);
   float stripe=smoothstep(.48,.52,fract(along/5.2));
   vec3 curb=mix(vec3(.68,.025,.018),vec3(.84,.86,.81),stripe);
   paint=mix(paint,mix(vec3(.025,.13,.11),curb,kerb),edge);
   float line=1.0-smoothstep(.085,.085+aa,abs(roadDist-${(width-1.4).toFixed(2)}));
   paint=mix(paint,vec3(.82,.86,.83),line);
   float startBand=(1.0-smoothstep(.9,.9+fwidth(vTrack.y),abs(vTrack.y+29.0)))*(1.0-step(7.45,abs(vTrack.x)));
   float check=mod(floor((vTrack.x+8.0)/.9)+floor((vTrack.y+29.9)/.9),2.0);
   paint=mix(paint,mix(vec3(.015),vec3(.9),check),startBand);
   diffuseColor.rgb*=paint;
  `);
 };
 material.customProgramCacheKey=()=> 'race-asphalt-kerbs-v1-'+segments.length;
 const road=new T.Mesh(geometry,material);road.name='Circuit / continuous asphalt + kerbs';view.scene.add(road);
 // A single batch of restrained directional chevrons, lifted above the asphalt.
 const arrow=new T.BufferGeometry();arrow.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,0,0,.65,.5,0,-.5],3));
 const matrices=[];
 for(const s of segments)for(let distance=10;distance<s.length-4;distance+=14){const t=distance/s.length,x=T.MathUtils.lerp(s.a[0],s.b[0],t),z=T.MathUtils.lerp(s.a[1],s.b[1],t);if(z>226||world.holes.some(h=>Math.hypot(x-h.x,z-h.z)<h.r+3))continue;const p=point(x,z,.145),q=frameAt(p).q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1])));matrices.push(new T.Matrix4().compose(p,q,new T.Vector3(1,1,1)));}
 const arrows=new T.InstancedMesh(arrow,new T.MeshBasicMaterial({color:0x70837f,side:T.DoubleSide}),matrices.length);matrices.forEach((m,i)=>arrows.setMatrixAt(i,m));arrows.computeBoundingSphere();arrows.name='Circuit / direction chevrons';view.scene.add(arrows);
 return {road,arrows,segments};
}
