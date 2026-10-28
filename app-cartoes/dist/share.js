'use strict';
window.InvoiceShare=(()=>{
 const encoder=new TextEncoder(),decoder=new TextDecoder(),aad=encoder.encode('meus-cartoes-consulta-v1');
 const normalize=s=>s.trim().replace(/\s+/g,' '),nameKey=s=>normalize(s).toLocaleLowerCase('pt-BR');
 const monthIndex=s=>{const[y,m]=s.split('-').map(Number);return y*12+m-1;};
 const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 function encode(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decode(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('invalid');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
 function validate(data){
  if(!data||data.version!==1||typeof data.name!=='string'||!data.name.trim()||data.name.length>60||!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month)||typeof data.scope!=='string'||data.scope.length>60||typeof data.createdAt!=='string'||!Number.isFinite(Date.parse(data.createdAt))||!Array.isArray(data.items)||!data.items.length||data.items.length>200)throw Error('invalid');
  for(const item of data.items)if(!item||(item.paid!==undefined&&typeof item.paid!=='boolean')||typeof item.description!=='string'||!item.description.trim()||item.description.length>100||typeof item.bank!=='string'||!item.bank.trim()||item.bank.length>60||!Number.isSafeInteger(item.cents)||item.cents<0||item.cents>9999999999||!Number.isInteger(item.parcel)||!Number.isInteger(item.parts)||item.parcel<1||item.parcel>item.parts||item.parts>120)throw Error('invalid');
  return data;
 }
 function build(records,name,month,bank='all'){
  const target=monthIndex(month),person=nameKey(name);
  const items=window.Ledger.items(records,month,bank).filter(x=>nameKey(x.p.person)===person).map(x=>({description:x.p.description,bank:x.p.bank,cents:x.cents,parcel:x.index+1,parts:x.p.parts,paid:x.paid,...(x.p.kind==='loan'?{kind:'loan'}:{}),...(x.p.recurring?{recurring:true}:{}),...(x.dueDate?{dueDate:x.dueDate}:{})}));
  return validate({version:1,name:normalize(name),month,scope:bank==='all'?'Todos os lançamentos':bank,createdAt:new Date().toISOString(),items});
 }
 async function makeLink(data,base,saveShort){
  validate(data);const keyBytes=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt']);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,encoder.encode(JSON.stringify(data)));
  const url=new URL('consulta.html',base);
  if(saveShort){
   const id=encode(crypto.getRandomValues(new Uint8Array(16)));
   await saveShort(id,{version:1,iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))});
   url.hash=['s1',id,encode(keyBytes)].join('.');return url.href;
  }
  url.hash=['v1',encode(keyBytes),encode(iv),encode(new Uint8Array(ciphertext))].join('.');
  if(url.href.length>24000)throw Error('too-long');return url.href;
 }
 async function readShort(id){
  if(!/^[A-Za-z0-9_-]{22}$/.test(id))throw Error('invalid');
  const endpoint='https://firestore.googleapis.com/v1/projects/dividas-6adfd/databases/(default)/documents/shortShares/'+id;
  let response;try{response=await fetch(endpoint,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});}catch{throw Error('network');}
  if(!response.ok)throw Error(response.status===404?'not-found':'unavailable');
  const fields=(await response.json()).fields;
  if(fields?.version?.integerValue!=='1')throw Error('invalid');
  return {iv:fields.iv?.stringValue,ciphertext:fields.ciphertext?.stringValue};
 }
 async function readLink(hash,loadShort=readShort){
  if(typeof hash!=='string'||hash.length>24000)throw Error('invalid');let chunks=hash.replace(/^#/,'').split('.');
  if(chunks[0]==='s1'){
   if(chunks.length!==3||!/^[A-Za-z0-9_-]{22}$/.test(chunks[1])||!/^[A-Za-z0-9_-]{43}$/.test(chunks[2]))throw Error('invalid');
   const stored=await loadShort(chunks[1]);
   if(typeof stored?.iv!=='string'||stored.iv.length!==16||typeof stored?.ciphertext!=='string'||stored.ciphertext.length<22||stored.ciphertext.length>200000)throw Error('invalid');
   chunks=['v1',chunks[2],stored.iv,stored.ciphertext];
  }
  if(chunks.length!==4||chunks[0]!=='v1')throw Error('invalid');
  const keyBytes=decode(chunks[1]),iv=decode(chunks[2]),data=decode(chunks[3]);if(keyBytes.length!==32||iv.length!==12||data.length<16)throw Error('invalid');
  const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['decrypt']);
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},key,data);return validate(JSON.parse(decoder.decode(clear)));
 }
 return{build,makeLink,readLink,money};
})();
