'use strict';
// Cofre local. A abertura automática é uma escolha explícita por aparelho.
window.CardVault = (() => {
  const STORAGE_KEY = 'meus-cartoes-cofre-v2';
  const LEGACY_KEY = 'meus-cartoes-v1';
  const PREFERENCE_KEY = 'meus-cartoes-pin-preference-v1';
  let remembered=false;
  const iterations = 600000;
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const aad = encoder.encode('meus-cartoes-cofre-v2');
  let activeKey = null, activeSalt = null, snapshot = null, generation = 0;
  function bytesToBase64(bytes) { let s=''; for (const b of bytes) s+=String.fromCharCode(b); return btoa(s); }
  function fromBase64(s) { if(typeof s!=='string'||s.length>14000000)throw Error('invalid');return Uint8Array.from(atob(s), c=>c.charCodeAt(0)); }
  function validateEnvelope(e) {
    if(!e||e.version!==2||e.algorithm!=='AES-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==iterations) throw Error('invalid');
    if(fromBase64(e.salt).length!==16||fromBase64(e.iv).length!==12||fromBase64(e.data).length<16)throw Error('invalid');
    return e;
  }
  function requireCrypto(){if(!globalThis.crypto?.subtle)throw Error('unsupported');}
  async function derive(pin,salt) {
    requireCrypto();
    const material=await crypto.subtle.importKey('raw',encoder.encode(pin),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function seal(records,key,salt) {
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,encoder.encode(JSON.stringify(records)));
    return {version:2,algorithm:'AES-GCM',kdf:'PBKDF2-SHA256',iterations,salt:bytesToBase64(salt),iv:bytesToBase64(iv),data:bytesToBase64(new Uint8Array(data))};
  }
  async function decrypt(pin,envelope) {
    validateEnvelope(envelope);
    const salt=fromBase64(envelope.salt),key=await derive(pin,salt);
    const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(envelope.iv),additionalData:aad},key,fromBase64(envelope.data));
    return {records:JSON.parse(decoder.decode(data)),key,salt};
  }

  function canRemember(){return !!globalThis.indexedDB;}
  function deviceKey(operation,value){
    return new Promise((resolve,reject)=>{
      if(!canRemember()){reject(Error('storage-unavailable'));return;}
      const request=indexedDB.open('meus-cartoes-device-access-v1',1);let settled=false;
      const fail=()=>{if(!settled){settled=true;reject(Error('device-storage-failed'));}};
      request.onerror=fail;request.onblocked=fail;
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('access'))request.result.createObjectStore('access');};
      request.onsuccess=()=>{
        const db=request.result;if(settled){db.close();return;}db.onversionchange=()=>db.close();
        try{const tx=db.transaction('access',operation==='get'?'readonly':'readwrite'),store=tx.objectStore('access');let result;
          const action=operation==='get'?store.get('current'):operation==='put'?store.put(value,'current'):store.delete('current');
          action.onsuccess=()=>{result=action.result;};tx.onerror=()=>{db.close();fail();};tx.onabort=()=>{db.close();fail();};
          tx.oncomplete=()=>{db.close();if(!settled){settled=true;resolve(result);}};
        }catch{db.close();fail();}
      };
    });
  }
  function broadcastPreference(){try{localStorage.setItem(PREFERENCE_KEY,JSON.stringify({enabled:remembered,changedAt:Date.now()}));}catch{}}
  async function remember(){
    if(!activeKey||!snapshot)throw Error('locked');const ticket=generation,expected=snapshot;
    if(localStorage.getItem(STORAGE_KEY)!==expected)throw Error('changed');
    await deviceKey('put',{version:1,key:activeKey,salt:bytesToBase64(activeSalt)});
    if(ticket!==generation||localStorage.getItem(STORAGE_KEY)!==expected){await deviceKey('delete');remembered=false;throw Error('changed');}
    remembered=true;broadcastPreference();
  }
  async function forget(){if(canRemember())await deviceKey('delete');remembered=false;broadcastPreference();}
  async function autoUnlock(validate){
    const ticket=++generation;remembered=false;
    if(!canRemember())return null;
    let record;try{record=await deviceKey('get');}catch{return null;}
    if(!record)return null;
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    try{
      const envelope=validateEnvelope(JSON.parse(raw));if(record.version!==1||record.salt!==envelope.salt||!record.key)throw Error('invalid-key');
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(envelope.iv),additionalData:aad},record.key,fromBase64(envelope.data));
      const records=JSON.parse(decoder.decode(clear));if(!validate(records))throw Error('invalid-data');
      if(ticket!==generation||localStorage.getItem(STORAGE_KEY)!==raw)throw Error('changed');
      activeKey=record.key;activeSalt=fromBase64(envelope.salt);snapshot=raw;remembered=true;return records;
    }catch{if(ticket===generation){try{await deviceKey('delete');}catch{}remembered=false;}return null;}
  }

  function mode(){requireCrypto();const raw=localStorage.getItem(STORAGE_KEY);if(raw){validateEnvelope(JSON.parse(raw));return 'unlock';}return 'setup';}
  function legacy(){const raw=localStorage.getItem(LEGACY_KEY);return raw===null?[]:JSON.parse(raw);}
  function lock(){generation++;activeKey=null;activeSalt=null;snapshot=null;}
  async function setup(pin,records){
    const ticket=++generation;
    if(!/^\d{6,12}$/.test(pin))throw Error('invalid-pin');
    if(localStorage.getItem(STORAGE_KEY)!==null)throw Error('changed');
    const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(pin,salt),envelope=await seal(records,key,salt);
    if(ticket!==generation)throw Error('locked');
    if(localStorage.getItem(STORAGE_KEY)!==null)throw Error('changed');
    const raw=JSON.stringify(envelope);localStorage.setItem(STORAGE_KEY,raw);
    localStorage.removeItem(LEGACY_KEY);
    activeKey=key;activeSalt=salt;snapshot=raw;
  }
  async function unlock(pin,validate){
    const ticket=++generation,raw=localStorage.getItem(STORAGE_KEY);
    if(raw===null)throw Error('changed');
    const result=await decrypt(pin,JSON.parse(raw));
    if(ticket!==generation)throw Error('locked');
    if(localStorage.getItem(STORAGE_KEY)!==raw)throw Error('changed');
    if(!validate(result.records))throw Error('invalid-data');
    localStorage.removeItem(LEGACY_KEY);
    activeKey=result.key;activeSalt=result.salt;snapshot=raw;
    return result.records;
  }
  async function save(records){
    if(!activeKey)throw Error('locked');
    const ticket=generation,expected=snapshot;
    const envelope=await seal(records,activeKey,activeSalt);
    if(ticket!==generation||!activeKey)throw Error('locked');
    if(localStorage.getItem(STORAGE_KEY)!==expected)throw Error('changed');
    const raw=JSON.stringify(envelope);localStorage.setItem(STORAGE_KEY,raw);snapshot=raw;
  }
  function backup(){if(!activeKey)throw Error('locked');if(localStorage.getItem(STORAGE_KEY)!==snapshot)throw Error('changed');return {app:'meus-cartoes',version:2,vault:validateEnvelope(JSON.parse(snapshot))};}
  return {mode,legacy,setup,unlock,save,lock,backup,remember,forget,autoUnlock,canRemember,isRemembered:()=>remembered,PREFERENCE_KEY,decryptBackup:async(pin,e)=>(await decrypt(pin,e)).records,validateEnvelope,STORAGE_KEY,LEGACY_KEY};
})();
