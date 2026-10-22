import {PROFILE} from '../assets/feids26/runtime.js';
// Viewer-only thermal shading; cold GLB palette remains the game source material.
export function thermalMaterial(source){
 const material=source.clone(),uniforms={shieldHeat:{value:0},shieldTime:{value:0}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 shieldLocal; varying vec3 shieldNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nshieldLocal=position; shieldNormal=normal;');
  shader.fragmentShader='uniform float shieldHeat; uniform float shieldTime; varying vec3 shieldLocal; varying vec3 shieldNormal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float tip=clamp(shieldLocal.z/${PROFILE.at(-1)[0].toFixed(4)},0.0,1.0);
   float outside=smoothstep(0.0,0.4,dot(shieldNormal.xy,normalize(shieldLocal.xy+vec2(.0001))));
   float band=.7+.3*sin(shieldLocal.z*8.0-shieldTime*17.0+sin(shieldLocal.x*11.0));
   float mask=smoothstep(0.0,1.1,shieldLocal.z)*outside;
   vec3 hot=mix(vec3(1.0,.13,.025),vec3(.3,.65,1.0),smoothstep(.65,1.0,tip));
   totalEmissiveRadiance+=hot*shieldHeat*mask*(.3+pow(tip,1.7)*2.8)*band;
  `);
 };
 material.customProgramCacheKey=()=> 'feids-shield-heat-v1';
 return {material,update(heat,time){uniforms.shieldHeat.value=heat;uniforms.shieldTime.value=time;}};
}
