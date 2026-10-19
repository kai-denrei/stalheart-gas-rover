import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..'),port=Number(process.env.PORT||8166);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.bin':'application/octet-stream','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const p=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!p.startsWith(root+sep))throw Error('Invalid path');const s=await stat(p);if(!s.isFile())throw Error('Not found');res.writeHead(200,{'Content-Type':mime[extname(p)]||'text/plain','Cache-Control':'no-cache'});res.end(await readFile(p));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Rover lab: http://localhost:${port}`));
