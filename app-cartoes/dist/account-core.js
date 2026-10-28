 'use strict';
window.createAccountRepository = ({sdk,auth,db,validate,newId=()=>crypto.randomUUID()}) => {
 let generation=0,owner=null,revision=null;
 const clone=value=>JSON.parse(JSON.stringify(value));
 function reset(user){generation++;owner=user?.uid||null;revision=null;}
 function context(){if(!owner||auth.currentUser?.uid!==owner)throw Error('account-changed');return {uid:owner,ticket:generation,ref:sdk.doc(db,'users',owner,'state','ledger')};}
 function current(c){if(c.ticket!==generation||c.uid!==owner||auth.currentUser?.uid!==c.uid)throw Error('account-changed');}
 function decode(snapshot){if(!snapshot.exists())return {records:[],revision:0};const d=snapshot.data();if(d.schema!==1||!Number.isSafeInteger(d.revision)||d.revision<1||typeof d.payload!=='string'||d.payload.length>200000)throw Error('invalid-cloud-data');const records=JSON.parse(d.payload);if(!validate(records))throw Error('invalid-cloud-data');return {records,revision:d.revision};}
 async function load(){const c=context(),result=decode(await sdk.getDocFromServer(c.ref));current(c);revision=result.revision;return clone(result.records);}
 async function save(records){
  const c=context(),expected=revision;if(expected===null)throw Error('not-loaded');if(!validate(records))throw Error('invalid-data');
  const payload=JSON.stringify(records);if(payload.length>200000)throw Error('too-large');const mutation=newId();
  const next=await sdk.runTransaction(db,async tx=>{current(c);const previous=decode(await tx.get(c.ref));current(c);if(previous.revision!==expected)throw Error('cloud-conflict');
   tx.set(c.ref,{schema:1,revision:expected+1,payload,mutation,updatedAt:sdk.serverTimestamp()});return expected+1;});
  current(c);revision=next;return clone(records);
 }
 async function verify(records){const c=context(),result=decode(await sdk.getDocFromServer(c.ref));current(c);if(JSON.stringify(result.records)!==JSON.stringify(records))throw Error('cloud-conflict');revision=result.revision;return true;}
 return {reset,load,save,verify};
};
