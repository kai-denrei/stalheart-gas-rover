import * as T from '../upstream/stalheart/vendor/three.module.js';
import {STEP} from './simulation.js';

export const GATE_FLASH_SECONDS=1.35;
export function gateFlash(age){
 if(age<0||age>=GATE_FLASH_SECONDS)return {strength:0,white:0};
 const strength=age<.12?1:Math.pow(1-(age-.12)/(GATE_FLASH_SECONDS-.12),1.35);
 return {strength,white:1-T.MathUtils.smoothstep(age,.08,.3)};
}

// Bezel, inset LED segments and soft spill in one draw per gate. No lights,
// bloom pass, extra colliders or per-frame geometry allocations.
export function createGateLights(gates,race){
 const geometry=new T.PlaneGeometry(19,1.8),cleared=new T.Color(0x45996d),active=new T.Color(0x39e6ff),idle=new T.Color(0x375f60);
 for(const g of gates){
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
   uniforms:{uColor:{value:idle.clone()},uFlash:{value:0},uWhite:{value:0},uAge:{value:0}},
   vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uFlash,uWhite,uAge;
    float rect(vec2 p,vec2 halfSize,float feather){return 1.0-smoothstep(-feather,feather,max(abs(p.x)-halfSize.x,abs(p.y)-halfSize.y));}
    void main(){
     vec2 p=(vUv-.5)*vec2(19.0,1.8);
     float bezel=rect(p,vec2(8.88,.245),.012),inner=rect(p,vec2(8.76,.145),.009);
     float lip=bezel-rect(p,vec2(8.84,.209),.009);
     float segments=mix(.36,1.0,smoothstep(.06,.14,fract((p.x+8.76)*3.4)));
     vec3 flashColor=mix(vec3(.12,1.0,.39),vec3(1.0),uWhite);
     vec3 light=mix(uColor,flashColor,uFlash);
     float sweep=exp(-pow((abs(p.x)-uAge*17.0)*1.7,2.0))*uFlash;
     vec3 core=light*segments*(.8+uFlash*1.7)+vec3(sweep*.65);
     vec3 frame=mix(vec3(.055,.075,.08),vec3(.24,.32,.34),step(0.0,p.y));
     frame+=lip*(vec3(.16)+light*.26);
     float spill=exp(-abs(p.y)*7.0)*(1.0-smoothstep(8.7,9.45,abs(p.x)))*(.12+.7*uFlash);
     vec3 c=mix(light*(.7+uFlash),frame,bezel);c=mix(c,core,inner);
     float fastener=1.0-smoothstep(.025,.045,length(vec2(abs(p.x)-8.82,p.y)));
     c=mix(c,vec3(.025),fastener);
     gl_FragColor=vec4(c,max(bezel,spill));
     #include <colorspace_fragment>
    }`
  });
  const strip=new T.Mesh(geometry,material);strip.name='Inset gate LEDs and bezel';strip.rotation.x=-Math.PI/2;strip.position.y=.17;g.group.add(strip);
  g.led=strip;g.flashAt=-Infinity;
 }
 let serial=0,generation=-1;
 return {update(alpha=1){
  if(generation!==race.world.race.hazardGeneration){generation=race.world.race.hazardGeneration;for(const g of gates)g.flashAt=-Infinity;serial=0;}
  for(const e of race.events){if(e.serial<=serial)continue;serial=e.serial;if(e.type==='gate'&&e.id===0&&gates[e.gate-1])gates[e.gate-1].flashAt=e.time;}
  const now=race.time+(race.celebrationTime||0)-(race.phase==='racing'?(1-alpha)*STEP:0),next=race.racers[0].gate;
  for(const [i,g] of gates.entries()){
   const age=Math.max(0,now-g.flashAt),pulse=gateFlash(age),u=g.led.material.uniforms;
   u.uColor.value.copy(i<next?cleared:i===next?active:idle);u.uFlash.value=pulse.strength;u.uWhite.value=pulse.white;u.uAge.value=Number.isFinite(age)?age:10;
   g.flash=pulse;
  }
 }};
}
