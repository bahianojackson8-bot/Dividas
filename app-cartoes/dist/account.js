// Public Firebase app identifiers, not administrator credentials. No Analytics is loaded.
const config={apiKey:'AIzaSyBZqqXnOSgRoLFMBrM4XhiGai4uMvxR7Dc',authDomain:'dividas-6adfd.firebaseapp.com',projectId:'dividas-6adfd',storageBucket:'dividas-6adfd.firebasestorage.app',messagingSenderId:'576814898161',appId:'1:576814898161:web:5ad92d3c2f923fef18c250'};
if(window.AccountMode){
 try{
  const [appSDK,authSDK,storeSDK]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
  ]);
  const app=appSDK.initializeApp(config),auth=authSDK.getAuth(app),db=storeSDK.initializeFirestore(app,{localCache:storeSDK.memoryLocalCache()});
  await authSDK.setPersistence(auth,authSDK.browserLocalPersistence);
  const repository=window.createAccountRepository({sdk:storeSDK,auth,db,validate:window.Ledger.validRecords});
  async function saveShare(id,encrypted){
   const user=auth.currentUser;
   if(!user||!/^[A-Za-z0-9_-]{22}$/.test(id)||encrypted?.version!==1||typeof encrypted.iv!=='string'||encrypted.iv.length!==16||typeof encrypted.ciphertext!=='string'||encrypted.ciphertext.length>200000)throw Error('invalid-share');
   await storeSDK.runTransaction(db,async tx=>{
    if(auth.currentUser?.uid!==user.uid)throw Error('account-changed');
    const ref=storeSDK.doc(db,'shortShares',id),existing=await tx.get(ref);
    if(existing.exists())throw Error('share-collision');
    tx.set(ref,{version:1,owner:user.uid,iv:encrypted.iv,ciphertext:encrypted.ciphertext,createdAt:storeSDK.serverTimestamp()});
   });
   if(auth.currentUser?.uid!==user.uid)throw Error('account-changed');
  }
  window.AccountStore={...repository,saveShare,login:()=>authSDK.signInWithPopup(auth,new authSDK.GoogleAuthProvider()),logout:()=>authSDK.signOut(auth),onAuth:fn=>authSDK.onAuthStateChanged(auth,fn),user:()=>auth.currentUser};
  window.dispatchEvent(new Event('account-ready'));
 }catch{window.dispatchEvent(new Event('account-unavailable'));}
}
