import * as T from '../upstream/stalheart/vendor/three.module.js';
import {bakeGalaxyCube} from '../upstream/stalheart/src/galaxybake.js';
import {SKY_PRESET,SKY_HOLE,SKY_VEIL,SKY_BLOOM} from '../upstream/stalheart/src/galaxyseed.js';
import {renderAccretion,accretionSkyPlanes,skyGlowPlane,turnSkyDirection} from '../upstream/stalheart/src/fx/accretion.js';
import {renderNebula} from '../upstream/stalheart/src/fx/nebulae.js';
import {RADIUS,CENTER} from './world.js';

export function createStalheartSky(renderer,scene,world){
 // Same seed generators, shader stills and presets as Stalheart. Expensive ray marches
 // run only during load, never in the driving loop. Adapt unit-sphere distances to metres.
 const cube=bakeGalaxyCube(renderer,{seed:7,...SKY_PRESET,face:1024});scene.background=cube.texture;scene.backgroundIntensity=SKY_PRESET.intensity;
 const group=new T.Group();group.name='Stalheart sky';group.position.copy(CENTER);scene.add(group);
 // Keep the owner's low-horizon elevation, aimed beside the lab's first crossing.
 const direction=turnSkyDirection([0,1,0],[-.38,0,.92],0,SKY_HOLE.elevation);
 // Preserve the same compass bearing, but lift the Great Divide formation
 // above Base 2's local horizon so it frames the finish gantry.
 const holeDirection=world?.race?.course.id==='expedition'?turnSkyDirection(world.race.deck.frame.up.toArray(),direction,0,.12):direction;
 const scale=k=>({...k,dist:k.dist*RADIUS,across:k.across*RADIUS});
 const hole=renderAccretion();if(!hole)throw Error('Could not render Stalheart black-hole sky');
 const blackHole=accretionSkyPlanes(hole.texture,hole.shadow,{...scale(SKY_HOLE),dir:holeDirection});blackHole.name='sky-hole';if(world?.race?.course.id==='expedition'){blackHole.up.copy(world.race.deck.frame.up);blackHole.lookAt(0,0,0);}group.add(blackHole);
 for(const [name,config] of [['sky-veil',SKY_VEIL],['sky-bloom',SKY_BLOOM]]){
  const texture=renderNebula(config.kind);if(!texture)throw Error('Could not render Stalheart '+config.kind);
  const plane=skyGlowPlane(texture,{...scale(config),dir:turnSkyDirection([0,1,0],direction,config.turn,config.elevation)});plane.name=name;group.add(plane);
 }
 group.traverse(o=>{if(o.material){o.material.depthTest=true;o.material.fog=false;o.frustumCulled=false;}});
 return {group,cube,dispose(){group.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});cube.dispose();group.removeFromParent();}};
}
