import {Vector3} from '../upstream/stalheart/vendor/three.module.js';
import {capsuleState,cargoState,DURATION} from '../upstream/a6/feids26/timeline.js';
import {smooth} from '../upstream/a6/assets/feids26/runtime.js';
// A single camera move follows the original delivery, then frames the late arrival.
export function introCamera(time){
 const states=[0,1,2,3].map(i=>cargoState(time,i>>1,i%2)),mid=(capsuleState(time,0).y+capsuleState(time,1).y)/2;
 const focus=smooth((time-10.5)/1.8),fall=states.reduce((n,s)=>n+s.height,0)/4*(1-focus)+states.slice(0,3).reduce((n,s)=>n+s.height,0)/3*focus;
 const blend=smooth((time-5.8)/.8),alt=(mid+3)*(1-blend)+(fall+1)*blend,near=smooth((time-11)/3),late=smooth((time-16.5)/1.5),out=smooth((time-21.5)/5);
 const position=new Vector3(-30+near*4,alt+15-near*9,46-near*11).lerp(new Vector3(14,3.8,15),late).lerp(new Vector3(23,16,28),out);
 const target=new Vector3(0,alt,0).lerp(new Vector3(7,Math.max(1,states[3].height+1),5),late).lerp(new Vector3(0,1.5,0),out);
 return {position,target,fov:48+late*7-out*7};
}
export class FeidsIntro {
 constructor(view,race,audio,onFinish){this.view=view;this.race=race;this.audio=audio;this.onFinish=onFinish;this.active=false;this.time=0;
  this.controls=document.createElement('div');this.controls.id='introControls';this.controls.hidden=true;this.controls.innerHTML='<button id="introPause">Pause <kbd>P</kbd></button><button id="skipIntro">Skip intro <kbd>Esc</kbd></button>';document.body.append(this.controls);this.controls.querySelector('#skipIntro').onclick=()=>this.finish(true);
 }
 begin(){const d=this.view.raceView.defense;if(!d.feids.controller.site||this.view.world.stage&&!this.view.world.stage.settings.battle)return false;
  d.update();d.feids.beginIntro();this.time=0;this.active=true;this.generation=this.view.world.race.hazardGeneration;this.fov=this.view.camera.fov;this.controls.hidden=false;document.body.classList.add('intro-mode');return true;
 }
 step(dt){if(!this.active)return;if(this.generation!==this.view.world.race.hazardGeneration){this.close();return;}
  const d=this.view.raceView.defense;this.time=Math.min(DURATION,this.time+dt);d.feids.advanceIntro(this.time);d.effects.step(dt);if(this.time>=DURATION)this.finish(false);
 }
 camera(){if(!this.active)return;const {position,target,fov}=introCamera(this.time),root=this.view.raceView.defense.feids.root,camera=this.view.camera;camera.position.copy(root.localToWorld(position));camera.up.set(0,1,0).applyQuaternion(root.quaternion);camera.lookAt(root.localToWorld(target));camera.fov=fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 finish(skipped=true){if(!this.active)return;const d=this.view.raceView.defense;d.feids.finishIntro();if(skipped)d.effects.reset();this.close();this.onFinish?.();}
 close(){this.active=false;this.controls.hidden=true;document.body.classList.remove('intro-mode');this.audio.stopFeids();this.view.camera.fov=this.fov??this.view.camera.fov;this.view.camera.updateProjectionMatrix();this.view.cameraInitialized=false;}
}
