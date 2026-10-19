import {createBaseTraffic} from './base-traffic.js';
import {createRaceStart} from './race-start.js';
import * as T from '../upstream/stalheart/vendor/three.module.js';
import {point,frameAt,upAt} from './world.js';
import {createStuntBoard} from './stunt-board.js';
import {createRaceTrack} from './race-track.js';
import {createRaceFlags} from './race-flags.js';
import {createCityDefense} from './city-defense-render.js';
import {createRaceCity} from './race-city.js';
import {createRaceCelebration} from './race-celebration.js';
import {RoverRig} from './rover-rig.js';
import {createRoverInstruments} from './rover-instruments.js';
function label(text,color='#aff3ce',width=9){const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');x.font='bold 44px monospace';x.textAlign='center';x.fillStyle=color;x.fillText(text,256,64);const map=new T.CanvasTexture(c);const m=new T.Sprite(new T.SpriteMaterial({map,depthWrite:false}));m.scale.set(width,width*96/512,1);return m;}
function mesh(g,color){return new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.7,metalness:.25}));}
export class RacePresentation {
 constructor(view,race){this.view=view;this.race=race;this.rivals=[];this.gates=[];this.spots=[];this.warnings=[];const scene=view.scene,w=race.world;
  for(const h of w.holes){if(!h.dormant)continue;const points=[];for(let i=0;i<12;i++){const a=i*Math.PI/6;for(let k=0;k<4;k++){const r=h.r*(.25+k*.3),r2=r+h.r*.25,b=a+(k%2?.08:-.08);points.push(Math.cos(a)*r,0,Math.sin(a)*r,Math.cos(b)*r2,0,Math.sin(b)*r2);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));const cracks=new T.LineSegments(geo,new T.LineBasicMaterial({color:0xffbb65,transparent:true,opacity:1}));const group=new T.Group();group.position.copy(h.origin).addScaledVector(h.frame.up,.13);group.quaternion.copy(h.frame.q);group.add(cracks);scene.add(group);group.visible=false;this.warnings.push({h,group,cracks});}
  for(const g of view.padGroups)g.visible=false;
  this.track=createRaceTrack(view);
  for(const gate of w.race.gates){const group=new T.Group();group.position.copy(gate.origin);group.quaternion.copy(gate.frame.q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(gate.dx,gate.dz)));scene.add(group);const mat=new T.MeshBasicMaterial({color:0x4b7270});const strip=new T.Mesh(new T.BoxGeometry(15,.035,.22),mat);strip.position.y=.16;group.add(strip);
   const number=label(String(gate.index+1).padStart(2,'0'),'#9ee7d3',3);number.position.set(0,3.5,0);group.add(number);this.gates.push({group,mat,number});
  }
  const deck=w.race.deck,dg=new T.Group();dg.position.copy(deck.origin);dg.quaternion.copy(deck.frame.q);scene.add(dg);
  const platform=mesh(new T.BoxGeometry(deck.w,deck.h,deck.d),0x29454d);platform.position.y=deck.h/2;dg.add(platform);platform.add(new T.LineSegments(new T.EdgesGeometry(platform.geometry),new T.LineBasicMaterial({color:0x82c9c0})));
  const banner=label('BOOST / LAND / STOP','#e9d7af',26);banner.position.set(0,deck.h+12,-10);dg.add(banner);this.finishBanner=banner;const partyBanner=label('PODIUM DISCO','#aff3ce',19);partyBanner.position.copy(banner.position);dg.add(partyBanner);this.partyBanner=partyBanner;
  for(const spot of w.race.spots){const plinth=mesh(new T.CylinderGeometry(w.race.rules.podiumRadius,w.race.rules.podiumRadius,spot.height,64),spot.number===1?0x9e7946:spot.number===2?0x6f8592:0x886957);plinth.position.copy(spot.local).add(new T.Vector3(0,-spot.height/2,0));dg.add(plinth);const ring=new T.Mesh(new T.RingGeometry(w.race.rules.spotRadius-.18,w.race.rules.spotRadius,64),new T.MeshBasicMaterial({color:0xf7c77d,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(spot.local);ring.position.y+=.025;dg.add(ring);
   const tag=label('#'+spot.number,'#fff1d3',4);tag.position.copy(spot.local).add(new T.Vector3(0,.5,-6.3));dg.add(tag);
   const bubble=new T.Mesh(new T.SphereGeometry(w.race.rules.bubbleRadius,32,16),new T.MeshBasicMaterial({color:0xaff3ce,transparent:true,opacity:.13,depthWrite:false}));bubble.position.copy(spot.local);dg.add(bubble);bubble.visible=false;
   const wire=new T.LineSegments(new T.WireframeGeometry(new T.SphereGeometry(w.race.rules.bubbleRadius,16,8)),new T.LineBasicMaterial({color:0xaff3ce,transparent:true,opacity:.12}));bubble.add(wire);this.spots.push({ring,tag,bubble,wire});
  }
  for(const r of race.racers){const grid=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(3.3,.015,5.6)),new T.LineBasicMaterial({color:r.color}));grid.position.copy(point(r.lane,-40-(r.id>=3?7:0),.16));grid.quaternion.copy(frameAt(grid.position).q);scene.add(grid);if(!r.id)continue;
   const model=view.roverTemplate.clone(true);model.position.y=-.44;model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.name==='CHASSIS_ARMOR_BODY'){o.material.color.set(r.color);o.material.roughness=.55;}}});model.getObjectByName('COLD_GAS_PLUMES').visible=false;
   const group=new T.Group();group.add(model);scene.add(group);const instruments=createRoverInstruments(model),rig=new RoverRig(model,scene,w,view.puffTexture,view.damageBank),name=label(r.name,'#'+r.color.toString(16).padStart(6,'0'),4);name.position.y=3.4;group.add(name);this.rivals.push({r,group,rig,instruments});
  }
 }
 async loadEnvironment(){[this.city,this.celebration,this.traffic]=await Promise.all([createRaceCity(this.view),createRaceCelebration(this.view,this.race),createBaseTraffic(this.view,this.race)]);this.defense=await createCityDefense(this.view,this.race,this.city);this.race.stuntEnemies=()=>this.defense.defense.enemies;[this.scoreboard,this.startLights]=await Promise.all([createStuntBoard(this.view,this.race),createRaceStart(this.view,this.race)]);}
 async loadFlags(){this.flags=await createRaceFlags(this.view,this.gates);}
 update(alpha){this.traffic?.update();this.startLights?.update();this.scoreboard?.update();this.defense?.update();const finished=this.race.phase==='finished';this.finishBanner.visible=!finished;this.partyBanner.visible=finished;this.celebration?.update();for(const {h,group,cracks} of this.warnings){group.visible=h.phase==='trembling';cracks.position.y=.02+Math.abs(Math.sin(h.age*42))*.12;cracks.rotation.y=Math.sin(h.age*31)*.012;cracks.material.opacity=.45+.55*Math.abs(Math.sin(h.age*14));}this.flags?.update(alpha);for(const {r,group,rig,instruments} of this.rivals){group.visible=!r.pendingRespawn;const s=r.sim.motion.sample(r.penalty||r.place?1:alpha),speed=s.vel.clone().projectOnPlane(upAt(s.pos)).length();group.position.copy(s.pos);group.quaternion.copy(s.q);rig.update(s,speed);instruments.update(s,speed);}
  const next=this.race.racers[0].gate;this.gates.forEach((g,i)=>{g.mat.color.set(i<next?0x45996d:i===next?0x39e6ff:0x375f60);g.number.material.opacity=i===next?1:.55;});
  this.race.world.race.spots.forEach((s,i)=>{const v=this.spots[i],id=s.owner??s.reserved,open=this.race.world.race.spots.find(x=>x.owner===null)===s;v.ring.material.color.set(id!==null?this.race.racers[id].color:open?0xffd080:0x637985);v.tag.visible=true;v.bubble.visible=id!==null;if(id!==null){v.bubble.material.color.set(this.race.racers[id].color);v.wire.material.color.copy(v.bubble.material.color);v.bubble.material.opacity=s.owner!==null?.13:.06+.14*s.hold/this.race.world.race.rules.claimTime;}});
 }
 setMist(enabled){for(const v of this.rivals)v.rig.fx.setEnabled(enabled);}
}
