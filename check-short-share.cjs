const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const folder=process.argv[2],c={window:{},crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,btoa,atob,URL};vm.createContext(c);
for(const file of ['finance.js','share.js'])vm.runInContext(fs.readFileSync(folder+'/'+file,'utf8'),c);
const share=c.window.InvoiceShare,records=[{id:'a',description:'Only friend',person:'Friend',bank:'Nubank',cents:12345,parts:1,month:'2026-10'},{id:'b',description:'Private owner',person:'Owner',bank:'Nubank',cents:99999,parts:1,month:'2026-10'}];
(async()=>{
 const snapshot=share.build(records,'Friend','2026-10','all'),saved=new Map(),save=async(id,value)=>saved.set(id,JSON.parse(JSON.stringify(value)));
 const old=await share.makeLink(snapshot,'https://example.test/');assert.equal((await share.readLink(new URL(old).hash)).items.length,1);
 const link=await share.makeLink(snapshot,'https://meus-cartoes-familia-221026.sunset-spark-8281.chatgpt.site/',save),url=new URL(link),[version,id,key]=url.hash.slice(1).split('.');assert.equal(version,'s1');assert.equal(id.length,22);assert.equal(key.length,43);assert(link.length<160);assert(!url.search);assert.equal(saved.size,1);
 const encrypted=saved.get(id);assert.deepEqual(Object.keys(encrypted).sort(),['ciphertext','iv','version']);for(const secret of ['Only friend','Friend','Private owner','12345',key])assert(!JSON.stringify(encrypted).includes(secret));
 const recovered=await share.readLink(url.hash,async i=>saved.get(i));assert.equal(recovered.items.length,1);assert.equal(recovered.items[0].description,'Only friend');assert(!JSON.stringify(recovered).includes('Private owner'));
 await assert.rejects(share.makeLink(snapshot,url.origin,async()=>{throw Error('denied');}),/denied/);
 await assert.rejects(share.readLink(url.hash,async()=>({...encrypted,iv:'bad'})));
 await assert.rejects(share.readLink(url.hash.slice(0,-1)+(url.hash.endsWith('A')?'B':'A'),async()=>encrypted));
 await assert.rejects(share.readLink('#s1.bad.'+key,async()=>{throw Error('should not fetch');}),/invalid/);
 let request;c.fetch=async(endpoint,options)=>{request={endpoint,options};return {ok:true,json:async()=>({fields:{version:{integerValue:'1'},iv:{stringValue:encrypted.iv},ciphertext:{stringValue:encrypted.ciphertext}}})};};await share.readLink(url.hash);assert(request.endpoint.endsWith('/shortShares/'+id));assert(!request.endpoint.includes(key));assert.equal(request.options.credentials,'omit');assert.equal(request.options.referrerPolicy,'no-referrer');
 const many={...snapshot,items:Array.from({length:200},(_,i)=>({...snapshot.items[0],description:'Purchase '+i+' '+('a'.repeat(80))}))};const bigger=await share.makeLink(many,url.origin,save);assert.equal(bigger.length,link.length);assert.equal((await share.readLink(new URL(bigger).hash,async i=>saved.get(i))).items.length,200);
 console.log('PASS: short URL '+link.length+' characters, 200 purchases same length, encrypted storage with no key, no third-party shortening, old links compatible, recipient isolation, failed save, tampering and REST privacy.');
})().catch(error=>{console.error(error);process.exitCode=1;});
