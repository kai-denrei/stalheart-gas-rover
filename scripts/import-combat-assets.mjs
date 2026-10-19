import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const main='/Users/minikai/Dev/stalheart',revision=execFileSync('git',['rev-parse','HEAD'],{cwd:main,encoding:'utf8'}).trim(),lock=JSON.parse(await readFile('docs/assets.lock.json','utf8'));
async function put(source,path,data,kind='copy'){await mkdir(dirname(path),{recursive:true});await writeFile(path,data);const entry={source,path,sha256:createHash('sha256').update(data).digest('hex'),bytes:Buffer.byteLength(data),kind,revision};lock.files=lock.files.filter(x=>x.path!==path);lock.files.push(entry);}
const visited=new Set();
async function module(src){if(visited.has(src))return;visited.add(src);const rel=relative(main,src),dest='upstream/stalheart/'+rel;
 // Existing pinned modules retain their adaptations and canonical Three version.
 try{await access(dest);return;}catch{}
 let data=await readFile(src,'utf8');if(rel==='src/beamfx.js')data=data.replace("from './beam-2026-09-01.beam.js'","from the generated beam module");const imports=[...data.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
 for(const dep of imports)if(dep.startsWith('.')){let target=resolve(dirname(src),dep);if(target.includes('/below/vendor/')){const canonical=target.replace('/below/vendor/','/vendor/'),replacement=relative(dirname(src),canonical);data=data.replaceAll("'"+dep+"'","'"+replacement+"'");target=canonical;}await module(target);}
 await put(rel,dest,data,data===await readFile(src,'utf8')?'copy':'canonical-three-import');
}
for(const name of ['src/missiles.js','src/content/gunship.js','src/missile-presentation.js','src/fx/orbital-laser.js','src/sentry.js','src/fx/explosions/rotary-pop.js','src/fx/explosions/bofors-burst.js','src/fx/explosions/howitzer-blast.js','src/fx/explosions/orbital-strike.js','below/src/reed.js','below/src/fx/gorogoro/geometry.js','below/src/fx/gorogoro/controller.js','below/src/fx/gorogoro/tiers.js'])await module(main+'/'+name);
for(const name of ['below/src/fx/gorogoro/LICENSE','below/src/fx/reed/LICENSE'])await put(name,'upstream/stalheart/'+name,await readFile(main+'/'+name));
for(const [src,dest] of [
 ['assets/models/sentries/quiver_t1.glb','quiver_t1.glb'],['assets/models/missile-kit/talon.glb','talon.glb'],['assets/models/korp/korp_d0_lod1.glb','gunship.glb'],['assets/models/sol82/sol82_platform_detailed.glb','sol82.glb']
])await put(src,'assets/city-combat/'+dest,await readFile(main+'/'+src));
await put('assets/models/missile-kit/talon.glb','assets/models/missile-kit/talon.glb',await readFile(main+'/assets/models/missile-kit/talon.glb'));
for(const name of ['minigun_fire','plasma_fire','seeker_fire','blast_fire','gunship_bofors_fire'])await put('assets/audio/'+name+'.mp3','assets/audio/'+name+'.mp3',await readFile(main+'/assets/audio/'+name+'.mp3'));
lock.combatExpansionRevision=revision;await writeFile('docs/assets.lock.json',JSON.stringify(lock,null,2)+'\n');console.log('Imported',visited.size,'modules; pinned revision',revision);
