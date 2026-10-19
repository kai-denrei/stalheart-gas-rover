import {launchChrome} from './chrome-proc.mjs';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
export async function browser(url){const profile=await mkdtemp(join(tmpdir(),'rover-lab-chrome-'));const c=launchChrome(['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1440,1000','--no-first-run'],{watchdogMs:120000});let ws;
try{const port=await c.port;const targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push({console:m.params.args.map(a=>a.value??a.description).join(' ')});if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params.entry);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout '+method));},25000);pending.set(n,m=>{clearTimeout(timer);if(m.error)reject(Error(JSON.stringify(m.error)));else resolve(m.result);});ws.send(JSON.stringify({id:n,method,params}));});
await call('Runtime.enable');await call('Log.enable');await call('Page.enable');await call('Page.navigate',{url});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const screenshot=async path=>{const r=await call('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(r.data,'base64'));};
const close=async()=>{ws.close();c.kill();await rm(profile,{recursive:true,force:true});};
return {call,evaluate,screenshot,errors,close};
}catch(e){ws?.close();c.kill();await rm(profile,{recursive:true,force:true});throw e;}}
