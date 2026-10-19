import {readFile,writeFile} from 'node:fs/promises';
import {DataUtils} from '../upstream/stalheart/vendor/three.module.js';
import {createReedActor} from '../upstream/stalheart/below/src/reed.js';
const bin=await readFile('assets/city-combat/reed.bin'),meta=JSON.parse(await readFile('assets/city-combat/reed.json'));
const actor=createReedActor(bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength),meta),fps=20,frames=120,scale=24;
const pose=()=>{actor.motion.target.set(0,.012,actor.motion.torsoCenter.z+.35);actor.motion.stimulus=1;for(let i=0;i<12;i++){actor.motion.step(1/240);actor.body.step(1/240);}actor.body.updateSurface();};
for(let i=0;i<40;i++)pose();
const geometry=actor.body.surface.geometry,count=geometry.attributes.position.count,width=1024,height=Math.ceil(count/width),data=new Uint16Array(width*height*4*frames*2);
let movement=0,previous;
for(let f=0;f<frames;f++){
 pose();const p=geometry.attributes.position,n=geometry.attributes.normal,c=actor.body.center;
 for(let i=0;i<count;i++){
  const pos=[(p.getX(i)-c.x)*scale,p.getY(i)*scale,(p.getZ(i)-c.z)*scale],normal=[n.getX(i),n.getY(i),n.getZ(i)];
  for(let k=0;k<3;k++){data[(f*width*height+i)*4+k]=DataUtils.toHalfFloat(pos[k]);data[((frames+f)*width*height+i)*4+k]=DataUtils.toHalfFloat(normal[k]);}
  if(i===Math.floor(count/3)){if(previous)movement+=Math.abs(pos[1]-previous);previous=pos[1];}
 }
}
await writeFile('assets/city-combat/reed-motion.bin',Buffer.from(data.buffer));await writeFile('assets/city-combat/reed-motion.json',JSON.stringify({width,height,frames,fps,vertices:count,scale,normalOffset:frames*height,format:'RGBA16F',source:'Stalheart Below Creature Lab soft-body solver; centered locomotion, 0.35 s loop blend',movement},null,2)+'\n');console.log({frames,count,bytes:data.byteLength,movement});
