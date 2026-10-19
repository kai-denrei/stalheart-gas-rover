import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const main='/Users/minikai/Dev/stalheart',revision=execFileSync('git',['rev-parse','HEAD'],{cwd:main,encoding:'utf8'}).trim(),lock=JSON.parse(await readFile('docs/assets.lock.json','utf8')),seen=new Set();
async function put(source,path,data){await mkdir(dirname(path),{recursive:true});await writeFile(path,data);lock.files=lock.files.filter(x=>x.path!==path);lock.files.push({source,path,sha256:createHash('sha256').update(data).digest('hex'),bytes:Buffer.byteLength(data),kind:'copy',revision});}
async function copyModule(file){if(seen.has(file))return;seen.add(file);const rel=relative(main,file),dest='upstream/stalheart/'+rel;try{await access(dest);return;}catch{}const data=await readFile(file,'utf8');for(const m of data.matchAll(/(?:^|[;\n])\s*(?:import|export)\s+(?:[^'";]*?\bfrom\s*)?['"]([^'"]+)['"]/g))if(m[1].startsWith('.'))await copyModule(resolve(dirname(file),m[1]));await put(rel,dest,data);}
for(const path of ['src/fx/creature-cutis.js','src/fx/nih-dairia/creature.js','src/labs/boss/remains.js','src/content/boss-fight.js'])await copyModule(main+'/'+path);
for(const name of ['nih-dairia.bin','nih-dairia.json'])await put('assets/creatures/nih-dairia/'+name,'assets/creatures/nih-dairia/'+name,await readFile(main+'/assets/creatures/nih-dairia/'+name));
for(const dir of ['nih-dairia','cutis-maku'])await put('src/fx/'+dir+'/LICENSE','upstream/stalheart/src/fx/'+dir+'/LICENSE',await readFile(main+'/src/fx/'+dir+'/LICENSE'));
lock.creatureCrowdsRevision=revision;await writeFile('docs/assets.lock.json',JSON.stringify(lock,null,2)+'\n');console.log('Pinned creature kits',revision);
