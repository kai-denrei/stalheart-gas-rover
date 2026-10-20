const db=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('stalheart-stage-maker',1);r.onupgradeneeded=()=>{r.result.createObjectStore('drafts',{keyPath:'id'});r.result.createObjectStore('plays',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function transaction(store,mode,work){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,mode),r=work(tx.objectStore(store));tx.oncomplete=()=>{resolve(r.result);d.close();};tx.onerror=()=>{reject(tx.error);d.close();};tx.onabort=()=>{reject(tx.error||Error('Storage transaction aborted'));d.close();};});}
export const loadDraft=id=>transaction('drafts','readonly',s=>s.get(id));
export const listDrafts=()=>transaction('drafts','readonly',s=>s.getAll());
export const saveDraft=stage=>transaction('drafts','readwrite',s=>s.put({id:stage.id,updated:Date.now(),stage:structuredClone(stage)}));
export const savePlay=stage=>{const id=crypto.randomUUID();return transaction('plays','readwrite',s=>s.put({id,stage:structuredClone(stage)})).then(()=>id);};
export const loadPlay=id=>transaction('plays','readonly',s=>s.get(id));
