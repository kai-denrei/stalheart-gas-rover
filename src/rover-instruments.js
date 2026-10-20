import * as T from '../upstream/stalheart/vendor/three.module.js';

// Real chassis-mounted surfaces, read from behind (+Z forward). x<0 is screen-right.
// The plates match the authored rear wheel-cover slope rather than facing the camera.
export function createRoverInstruments(model) {
 const family=model.userData.roverFamily||'r47x',xb=family==='xb12';
 const root=new T.Group();root.name='Rover diegetic instruments';(model.getObjectByName(xb?'XB12_CHASSIS':'ROVER_CHASSIS_JUMP')).add(root);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.font='bold 88px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 for(let i=0;i<10;i++)ctx.fillText(String(i),(i+.5)*102.4,64);
 const digits=new T.CanvasTexture(canvas);digits.minFilter=T.LinearFilter;digits.generateMipmaps=false;
 const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
 const fragmentShader=`
 precision highp float;
 varying vec2 vUv;
 uniform vec3 uColor;
 uniform float uKind,uNumber,uUnlimited;
 uniform float uLevels[8];
 uniform sampler2D uLabel,uDigits;
 float box(vec2 p,vec2 a,vec2 b){return step(a.x,p.x)*step(a.y,p.y)*(1.0-step(b.x,p.x))*(1.0-step(b.y,p.y));}
 float digit(vec2 p,float n){if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0)return 0.0;return texture2D(uDigits,vec2((floor(n)+p.x)/10.0,p.y)).a;}
 void main(){
  vec2 p=vUv;vec3 c=vec3(.012,.025,.032);
  float border=1.0-box(p,vec2(.025,.012),vec2(.975,.988));c=mix(c,uColor*.3,border);
  if(uKind<1.5){
   float columns=uKind<.5?8.0:1.0;float x=(p.x-.10)/.8;float y=(p.y-.12)/.65;
   int index=int(clamp(floor(x*columns),0.0,7.0));float value=uLevels[0];
   for(int i=0;i<8;i++){if(i==index&&uKind<.5)value=uLevels[i];}
   float areaMask=box(p,vec2(.10,.12),vec2(.9,.77));float segment=step(.17,fract(y*18.0));float gap=step(.12,fract(x*columns));
   c=mix(c,uColor*mix(.10,1.0,step(y,value)),areaMask*segment*gap);
   vec2 text=(p-vec2(.06,.81))/vec2(.88,.15);if(text.x>=0.0&&text.x<=1.0&&text.y>=0.0&&text.y<=1.0)c=mix(c,uColor,texture2D(uLabel,text).a);
   float n=min(99.0,floor(uNumber));float ink=digit((p-vec2(.22,.025))/vec2(.24,.07),floor(n/10.0))+digit((p-vec2(.50,.025))/vec2(.24,.07),mod(n,10.0));c=mix(c,uColor,clamp(ink,0.0,1.0));
  }else{
   float areaMask=box(p,vec2(.055,.12),vec2(.945,.42));float x=(p.x-.055)/.89;
   c=mix(c,uColor*mix(.10,1.0,step(x,uLevels[0])),areaMask*step(.13,fract(x*20.0)));
   vec2 text=(p-vec2(.055,.54))/vec2(.49,.33);if(text.x>=0.0&&text.x<=1.0&&text.y>=0.0&&text.y<=1.0)c=mix(c,uColor,texture2D(uLabel,text).a);
   float n=floor(uNumber);float ink=digit((p-vec2(.64,.53))/vec2(.085,.35),floor(n/100.0))+digit((p-vec2(.73,.53))/vec2(.085,.35),mod(floor(n/10.0),10.0))+digit((p-vec2(.82,.53))/vec2(.085,.35),mod(n,10.0));
   c=mix(c,uColor,clamp(ink,0.0,1.0));c=mix(c,vec3(.15,.9,1.0),box(p,vec2(.94,.66),vec2(.98,.83))*uUnlimited);
  }
  gl_FragColor=vec4(c,1.0);
  #include <colorspace_fragment>
 }`;
 function plate(name,kind,color,width,height,position,normal){
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;
  const cx=labelCanvas.getContext('2d');cx.font='bold 86px monospace';cx.fillStyle='white';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(name,256,64);
  const label=new T.CanvasTexture(labelCanvas);label.generateMipmaps=false;label.minFilter=T.LinearFilter;
  const material=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms:{uColor:{value:new T.Color(color)},uKind:{value:kind},uNumber:{value:0},uUnlimited:{value:0},uLevels:{value:new Float32Array(8)},uLabel:{value:label},uDigits:{value:digits}},toneMapped:false});
  // Reuse delivered UV meshes. Move the tiny end-cap screens onto the long cover
  // strips agreed for this lab; delivered LEFT/RIGHT names are reversed in chase view.
  const source=['DISPLAY_SPEED_LEFT','DISPLAY_THRUST_RIGHT','DISPLAY_GAS_RESERVE_REAR'][kind];
  const mesh=model.getObjectByName(source)||new T.Mesh(new T.PlaneGeometry(1,1),material),size=mesh.userData.size_m||[1,1];
  mesh.name=source;mesh.material=material;mesh.scale.set(width/size[0],height/size[1],1);mesh.position.set(...position);mesh.position.y-=xb?0:.56;mesh.quaternion.identity();
  if(kind<2){const n=new T.Vector3(...normal).normalize(),up=new T.Vector3(0,0,1).projectOnPlane(n).normalize(),right=new T.Vector3().crossVectors(up,n);mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,n));}
  else mesh.rotation.y=Math.PI;
  root.add(mesh);return material.uniforms;
 }
 const swing=family==='r47xs',x=xb?.76:swing?.55:.85,y=xb?1.30:swing?1.01:1.0205,z=xb?-.8:swing?-.75:-1.12;
 const thrust=plate('THRUST',0,0x25ddff,.265,xb?.82:swing?1.1:1.46,[-x,y,z],xb?[0,.974,-.228]:swing?[0,1,0]:[-.119712,.992809,0]);
 const speed=plate('M/S',1,0xff962f,.265,xb?.82:swing?1.1:1.46,[x,y,z],xb?[0,.974,-.228]:swing?[0,1,0]:[.119712,.992809,0]);
 const gas=plate('GAS',2,0xaff3ce,.90,.19,[0,xb?.85:.71,xb?-2.03:-2.393],[0,0,-1]);
 return {root,update(sim,speedMetres){for(let i=0;i<8;i++)thrust.uLevels.value[i]=Math.min(1,sim.burn.forces[i].length()/(sim.tune.lift/8));thrust.uNumber.value=sim.burn.effort/sim.tune.lift*100;speed.uLevels.value[0]=Math.min(1,speedMetres/18);speed.uNumber.value=speedMetres;gas.uLevels.value[0]=sim.reserve/sim.tune.capacity;gas.uNumber.value=Math.ceil(100*sim.reserve/sim.tune.capacity);gas.uUnlimited.value=sim.tune.unlimited?1:0;gas.uColor.value.set(sim.reserve/sim.tune.capacity<.2?0xff962f:0xaff3ce);},dispose(){root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.uniforms.uLabel.value.dispose();o.material.dispose();}});digits.dispose();root.removeFromParent();}};
}
