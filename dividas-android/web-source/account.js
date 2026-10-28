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
  window.AccountStore={...repository,login:()=>authSDK.signInWithPopup(auth,new authSDK.GoogleAuthProvider()),logout:()=>authSDK.signOut(auth),onAuth:fn=>authSDK.onAuthStateChanged(auth,fn),user:()=>auth.currentUser};
  window.dispatchEvent(new Event('account-ready'));
 }catch{window.dispatchEvent(new Event('account-unavailable'));}
}
