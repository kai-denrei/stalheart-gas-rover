import {coords} from './world.js';
// Broad phase for the local battle's fixed city/flag/rubble convex hulls.
// Rebuilt only when the dynamic sinkhole solids change, never per creature.
export class CombatSpatial {
 constructor(world){this.world=world;this.cells=new Map();this.count=-1;this.revision=0;this.rebuild();}
 rebuild(){if(this.count===this.world.colliders.length)return;this.count=this.world.colliders.length;this.revision++;this.cells.clear();for(const c of this.world.colliders){const p=coords(c.center),r=c.radius*1.15+2;for(let x=Math.floor((p.x-r)/24);x<=Math.floor((p.x+r)/24);x++)for(let z=Math.floor((p.z-r)/24);z<=Math.floor((p.z+r)/24);z++){const key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(c);}}}
 region(x,z,r=2){return this.rect(x-r,z-r,x+r,z+r);}
 rect(x0,z0,x1,z1){const found=new Set();for(let x=Math.floor(x0/24);x<=Math.floor(x1/24);x++)for(let z=Math.floor(z0/24);z<=Math.floor(z1/24);z++)for(const c of this.cells.get(x+','+z)||[])found.add(c);return found;}
 segment(a,b){const p=coords(a),q=coords(b);return this.rect(Math.min(p.x,q.x)-3,Math.min(p.z,q.z)-3,Math.max(p.x,q.x)+3,Math.max(p.z,q.z)+3);}
}
