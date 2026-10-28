
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-dividas',firestore:{host:'127.0.0.1',port:8089,rules:readFileSync('../app-cartoes/firestore.rules','utf8')}});
try{
 const claims={firebase:{sign_in_provider:'google.com'}},alice=env.authenticatedContext('alice',claims).firestore(),bob=env.authenticatedContext('bob',claims).firestore(),guest=env.unauthenticatedContext().firestore(),password=env.authenticatedContext('alice',{firebase:{sign_in_provider:'password'}}).firestore();
 const ref=db=>sdk.doc(db,'users','alice','state','ledger');
 globalThis.window={};const c={window:globalThis.window};vm.runInThisContext(readFileSync('../app-cartoes/dist/finance.js','utf8'));vm.runInThisContext(readFileSync('../app-cartoes/dist/account-core.js','utf8'));
 const make=(uid,db)=>{const auth={currentUser:{uid}},repo=c.window.createAccountRepository({sdk,auth,db,validate:c.window.Ledger.validRecords});repo.reset(auth.currentUser);return {repo,auth};};
 const {repo:a}=make('alice',alice),{repo:a2}=make('alice',alice),{repo:b}=make('bob',bob);
 await assert.rejects(a.save([]),/not-loaded/);assert.equal((await a.load()).length,0);assert.equal((await a2.load()).length,0);
 const records=[{id:'test-card',kind:'card',description:'Test',person:'Owner',bank:'Nubank',cents:10000,parts:1,month:'2026-10'}];
 await a.save(records);await a.verify(records);
 await assertFails(sdk.getDocFromServer(ref(bob)));await assertFails(sdk.getDocFromServer(ref(guest)));await assertFails(sdk.getDocFromServer(ref(password)));
 await assertFails(sdk.getDocs(sdk.collection(alice,'users','alice','state')));await assertFails(sdk.deleteDoc(ref(alice)));
 await assertFails(sdk.setDoc(ref(bob),{schema:1,revision:2,payload:'[]',mutation:'attack',updatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.updateDoc(ref(alice),{revision:1,updatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.updateDoc(ref(alice),{revision:2,unexpected:true,updatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.setDoc(sdk.doc(alice,'outside','x'),{value:1}));
 await assert.rejects(a2.save([]),/cloud-conflict/);assert.equal(JSON.stringify(await a2.load()),JSON.stringify(records));await a2.save([...records,{...records[0],id:'second'}]);await assert.rejects(a.save([]),/cloud-conflict/);
 assert.equal((await b.load()).length,0);await b.save([]);await b.verify([]);assert.equal((await a.load()).length,2);
 const stale=make('alice',alice);await stale.repo.load();stale.auth.currentUser={uid:'bob'};await assert.rejects(stale.repo.save([]),/account-changed/);
 console.log('PASS: actual Firestore rules deny anonymous, other users, password provider, listing, deletion, unknown paths, invalid revisions/fields. Owner save/recovery, separate account data, transactions and conflict protection passed.');
}finally{await env.cleanup();}
