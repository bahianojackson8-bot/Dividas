'use strict';
(() => {
const banks=window.Ledger.banks;
const $=id=>document.getElementById(id),vault=window.CardVault;
let purchases=[],unlocked=false,busy=false,authBusy=false,idleTimer=null,session=0,failures=0,retryAt=0,pendingBackup=null;
let autoOpening=false;
const accountMode=!!window.AccountMode;
let cloudSession=false,accountGeneration=0,migration=false,cloudUser=null;
function hasLocalData(){try{return !!localStorage.getItem(vault.STORAGE_KEY)||!!localStorage.getItem(vault.LEGACY_KEY);}catch{return false;}}
function accountView(){
 $('local-to-account').hidden=!accountMode;$('account-panel').hidden=!cloudSession;$('local-security').hidden=cloudSession;$('local-data').hidden=cloudSession;$('lock').hidden=cloudSession;
 if(cloudSession){$('account-name').textContent=cloudUser?.email||'Conta Google';$('migration-panel').hidden=!hasLocalData();}
}
function accountMessage(error){
 const code=error?.code||error?.message||'';
 if(code.includes('permission-denied'))return 'Falta publicar as regras de acesso no Firebase. Seus lançamentos antigos foram preservados.';
 if(code.includes('unauthorized-domain'))return 'Autorize o domínio do app nas configurações do Firebase.';
 if(code.includes('popup-blocked'))return 'Permita a janela de entrada do Google e tente novamente.';
 if(code.includes('popup-closed'))return 'Entrada cancelada. Você pode tentar novamente.';
 if(code==='cloud-conflict')return 'Houve uma alteração em outro aparelho. Recarregue para ver a versão atual antes de editar novamente.';
 return 'Não foi possível conectar ou salvar na conta. Confira sua conexão e tente novamente. Nenhuma confirmação de salvamento foi recebida.';
}
function accountGate(message='Entre com Google para abrir seus lançamentos.'){
 cloudSession=false;migration=false;lockApp('',true);$('gate').hidden=true;$('account-gate').hidden=false;$('account-error').textContent=message;$('account-retry').hidden=!cloudUser;$('google-login').hidden=!!cloudUser;accountView();
}
async function loadAccount(user){
 const ticket=++accountGeneration;cloudUser=user;window.AccountStore.reset(user);
 accountGate(user?'Abrindo sua conta…':undefined);
 if(!user)return;
 try{
  let records=await window.AccountStore.load();if(ticket!==accountGeneration)return;
  // Creating an empty account also verifies write permission before showing success.
  if(!records.length){await window.AccountStore.save(records);if(ticket!==accountGeneration)return;}
  await window.AccountStore.verify(records);if(ticket!==accountGeneration)return;
  cloudSession=true;$('account-gate').hidden=true;openSession(records);$('account-status').textContent='Lançamentos recuperados da sua conta.';
 }catch(error){if(ticket===accountGeneration)accountGate(accountMessage(error));}
}
async function migrateRecords(local){
 if(!cloudUser||!window.AccountStore?.user()||window.AccountStore.user().uid!==cloudUser.uid)throw Error('account-changed');
 const remote=await window.AccountStore.load(),byId=new Map(remote.map(p=>[p.id,p]));
 for(const p of local){const previous=byId.get(p.id);if(previous&&JSON.stringify(previous)!==JSON.stringify(p))throw Error('cloud-conflict');byId.set(p.id,p);}
 const next=[...byId.values()];if(!validRecords(next))throw Error('invalid-data');await window.AccountStore.save(next);await window.AccountStore.verify(next);
 migration=false;cloudSession=true;$('account-gate').hidden=true;openSession(next);$('account-status').textContent='Transferência confirmada na sua conta. Use esta mesma conta em outro celular.';
 // Keep the old encrypted vault intact as a recovery copy, never overwrite it with another account.
}
if(accountMode){
 window.addEventListener('account-ready',()=>{const store=window.AccountStore;$('google-login').disabled=false;store.onAuth(user=>loadAccount(user));});
 window.addEventListener('account-unavailable',()=>{$('account-error').textContent='Não foi possível carregar a conexão com Google. Confira a internet e recarregue.';$('account-retry').hidden=false;});
 $('google-login').onclick=async()=>{if(!window.AccountStore)return;$('google-login').disabled=true;try{await window.AccountStore.login();}catch(error){$('account-error').textContent=accountMessage(error);}finally{$('google-login').disabled=false;}};
 $('account-retry').onclick=()=>window.AccountStore?loadAccount(window.AccountStore.user()):location.reload();
 $('local-to-account').onclick=()=>window.AccountStore?loadAccount(window.AccountStore.user()):accountGate('A conexão com Google ainda não carregou.');
 $('local-access').onclick=()=>{cloudSession=false;migration=false;lockApp('',true);$('account-gate').hidden=true;$('gate').hidden=false;configureGate();syncPinPreference();tryAutoOpen();};
 $('migrate-local').onclick=()=>{if(busy)return;migration=true;cloudSession=false;lockApp('',true);$('account-gate').hidden=true;$('gate').hidden=false;configureGate();$('pin-error').textContent='Digite o PIN antigo uma vez para transferir os lançamentos para '+cloudUser.email+'.';};
 $('account-logout').onclick=async()=>{if(busy)return;const store=window.AccountStore;++accountGeneration;cloudUser=null;store.reset(null);accountGate('Saindo…');try{await store.logout();accountGate();}catch{$('account-error').textContent='Não foi possível sair. Tente novamente.';$('account-retry').hidden=false;}};
}
const viewerBase='https://meus-cartoes-familia-221026.sunset-spark-8281.chatgpt.site/';
let sharing=false;
const currency=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const monthIndex=s=>{const [y,m]=s.split('-').map(Number);return y*12+m-1;};
function valid(p){return window.Ledger.valid(p);}
function validRecords(data){return window.Ledger.validRecords(data);}
function create(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}

function refreshBankOptions(){
 const available=[...new Set([...banks,...purchases.map(p=>p.bank)])];
 for(const id of ['bank','purchase-bank','loan-bank','due-bank']){
  const selected=$(id).value;$(id).replaceChildren();const values=[];
  if(id==='bank'){const o=create('option','Todos os lançamentos');o.value='all';$(id).append(o);values.push('all');}
  for(const bank of available.filter(b=>id==='purchase-bank'?b!=='Empréstimos':['loan-bank','due-bank'].includes(id)?b!=='PIX':true)){const o=create('option',bank);o.value=bank;$(id).append(o);values.push(bank);}
  if(id==='purchase-bank'){const o=create('option','Outro cartão (digitar nome)');o.value='__custom__';$(id).append(o);values.push('__custom__');}
  $(id).value=values.includes(selected)?selected:values[0];
 }
}
function purchaseBank(){
 if($('purchase-bank').value!=='__custom__')return $('purchase-bank').value;
 const name=$('custom-bank').value.trim().replace(/\s+/g,' ');
 if(!name||name.length>60||['all','__custom__','pix','empréstimos'].includes(name.toLocaleLowerCase('pt-BR')))throw Error('bank');
 return [...banks,...purchases.map(p=>p.bank)].find(b=>b.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))||name;
}
refreshBankOptions();
const now=new Date();$('month').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
function resetIdle(){clearTimeout(idleTimer);if(unlocked&&!cloudSession&&!vault.isRemembered())idleTimer=setTimeout(()=>lockApp('Bloqueado após 5 minutos sem uso.'),5*60*1000);}
function configureGate(){
  try{const setup=vault.mode()==='setup';$('pin-title').textContent=setup?'Crie seu PIN':'Digite seu PIN';$('pin-description').textContent=setup?'Escolha de 6 a 12 números para proteger os dados neste navegador.':'Desbloqueie para ver suas faturas e valores.';$('pin-confirm-label').hidden=!setup;$('pin-confirm').required=setup;$('pin-submit').textContent=setup?'Criar PIN e entrar':'Entrar';$('pin-code').autocomplete=setup?'new-password':'current-password';$('pin-help').textContent=setup?'Guarde seu PIN: ele também será necessário para abrir seus backups. Não há recuperação do código.':'Seu PIN é o escolhido neste navegador. Os backups também precisam do PIN usado ao serem criados.';$('pin-submit').disabled=false;return setup;}
  catch{$('pin-error').textContent='Não foi possível abrir o armazenamento seguro. Use um navegador atualizado e mantenha os dados deste site.';$('pin-submit').disabled=true;return null;}
}
function clearPrivateView(){
  $('app').hidden=true;$('gate').hidden=false;
  for(const id of ['people','card-totals','transactions','known-people'])$(id).replaceChildren();
  for(const id of ['invoice-name','total','counts','message','form-error','backup-error','paid-total','unpaid-total','no-pin-message'])$(id).textContent='';
  $('form').reset();$('edit-id').value='';$('backup-form').reset();$('pin-form').reset();$('import').value='';
  $('editor').close();$('loan-dialog').close();$('loan-form').reset();$('due-dialog').close();$('due-form').reset();$('due-error').textContent='';$('loan-error').textContent='';$('loan-preview').textContent='';$('loan-calculation').textContent='';loanTotalManual=false;$('loan-people').replaceChildren();loanParticipants=[];$('backup-dialog').close();pendingBackup=null;$('share-dialog').close();clearShare();refreshBankOptions();
}
function lockApp(message='App bloqueado.',force=false){
  if(!force&&(cloudSession||autoOpening||vault.isRemembered()))return;
  session++;unlocked=false;busy=false;authBusy=false;clearTimeout(idleTimer);vault.lock();purchases=[];clearPrivateView();
  configureGate();if(!$('pin-submit').disabled)$('pin-error').textContent=message;
}
$('pin-form').onsubmit=async e=>{
  e.preventDefault();if(authBusy||unlocked)return;
  if(Date.now()<retryAt){$('pin-error').textContent='Aguarde '+Math.ceil((retryAt-Date.now())/1000)+' segundos para tentar novamente.';return;}
  const setup=configureGate();if(setup===null)return;
  const pin=$('pin-code').value,confirmPin=$('pin-confirm').value;
  if(!/^\d{6,12}$/.test(pin)){$('pin-error').textContent='Use de 6 a 12 números.';return;}
  if(setup&&pin!==confirmPin){$('pin-error').textContent='Os códigos não são iguais.';return;}
  const ticket=++session;authBusy=true;$('pin-submit').disabled=true;$('pin-error').textContent='Abrindo…';$('pin-code').value='';$('pin-confirm').value='';
  try{
    let data;
    if(setup){data=vault.legacy();if(!validRecords(data))throw Error('invalid-data');await vault.setup(pin,data);}
    else data=await vault.unlock(pin,validRecords);
    if(ticket!==session)return;
    if(migration)await migrateRecords(data);else openSession(data);
  }catch(error){
    if(ticket!==session)return;vault.lock();
    if(!setup&&error.name==='OperationError'){failures++;if(failures>=5)retryAt=Date.now()+30000;$('pin-error').textContent=failures>=5?'PIN incorreto. Aguarde 30 segundos para tentar novamente.':'PIN incorreto. Tente novamente.';}
    else if(migration)$('pin-error').textContent=accountMessage(error);
    else $('pin-error').textContent=error.message==='invalid-data'?'Os dados salvos não puderam ser lidos. Eles foram preservados.':'Não foi possível abrir ou salvar os dados. Recarregue a página e tente novamente.';
  }finally{if(ticket===session){authBusy=false;$('pin-submit').disabled=false;}}
};

function syncPinPreference(){
 $('no-pin').checked=vault.isRemembered();$('no-pin').disabled=!vault.canRemember();
 $('lock').textContent=vault.isRemembered()?'Bloquear e pedir PIN':'Bloquear';
}
function openSession(data){
 purchases=data;unlocked=true;failures=0;retryAt=0;$('pin-form').reset();$('pin-error').textContent='';$('gate').hidden=true;$('app').hidden=false;render();resetIdle();syncPinPreference();accountView();$('lock').focus();if(window.AndroidHost?.postMessage)window.AndroidHost.postMessage(JSON.stringify({type:'get-import'}));
}
async function tryAutoOpen(){
 if(autoOpening||unlocked||!vault.canRemember())return;
 try{if(vault.mode()!=='unlock')return;}catch{return;}
 autoOpening=true;authBusy=true;const ticket=++session;$('pin-submit').disabled=true;$('pin-error').textContent='Abrindo…';
 try{const data=await vault.autoUnlock(validRecords);if(ticket===session&&data)openSession(data);}
 finally{if(ticket===session){authBusy=false;$('pin-submit').disabled=false;if(!unlocked)$('pin-error').textContent='';}autoOpening=false;}
}
async function refreshAfterChange(){lockApp('Os dados ou a proteção mudaram em outra aba. Digite seu PIN se solicitado.',true);await tryAutoOpen();}
$('no-pin').addEventListener('change',async()=>{
 if(!unlocked||busy){syncPinPreference();return;}
 const desired=$('no-pin').checked;busy=true;$('no-pin').disabled=true;const ticket=session;
 try{if(desired)await vault.remember();else await vault.forget();if(ticket===session){$('no-pin-message').textContent=desired?'O app abrirá direto neste aparelho. Guarde o PIN para os backups.':'O app voltará a pedir seu PIN ao abrir.';resetIdle();}}
 catch{if(ticket===session)$('no-pin-message').textContent='Não foi possível salvar essa opção. O PIN continua ativo.';}
 finally{if(ticket===session){busy=false;syncPinPreference();}}
});

async function persist(next){
  if(!unlocked||busy)return false;if(!validRecords(next)){$('message').textContent='Confira os dados antes de salvar.';return false;}busy=true;const ticket=session;
  try{if(cloudSession){$('account-status').textContent='Salvando na sua conta…';await window.AccountStore.save(next);}else await vault.save(next);if(ticket!==session||!unlocked)return false;purchases=next;render();resetIdle();if(cloudSession)$('account-status').textContent='Salvo na sua conta.';return true;}
  catch(error){if(ticket!==session)return false;if(cloudSession){$('account-status').textContent=accountMessage(error);$('message').textContent=accountMessage(error);}else if(error.message==='changed'){await refreshAfterChange();}else $('message').textContent='Não foi possível salvar. Seus dados anteriores foram preservados.';return false;}
  finally{if(ticket===session)busy=false;}
}
function invoiceItems(){return window.Ledger.items(purchases,$('month').value,$('bank').value);}
function render(){
  if(!unlocked)return;refreshBankOptions();window.CardColors.apply($('invoice-hero'),$('bank').value);
  const items=invoiceItems();$('invoice-name').textContent=($('bank').value==='all'?'Todos os lançamentos':$('bank').value)+' · Resumo '+($('month').value.split('-').reverse().join('/'));const monthTotal=items.reduce((sum,x)=>sum+x.cents,0),paidTotal=items.filter(x=>x.paid).reduce((sum,x)=>sum+x.cents,0),remaining=monthTotal-paidTotal;$('total').textContent=currency(remaining);$('counts').textContent='Total original do mês: '+currency(monthTotal)+' · '+items.length+' lançamento(s)';$('paid-total').textContent=currency(paidTotal);$('unpaid-total').textContent=currency(remaining);
  const people=new Map();for(const x of items){const name=x.p.person.trim().replace(/\s+/g,' '),k=name.toLocaleLowerCase('pt-BR');const entry=people.get(k)||{name,cents:0,paid:0};entry.cents+=x.cents;if(x.paid)entry.paid+=x.cents;people.set(k,entry);}
  $('people').replaceChildren();for(const entry of people.values()){const tile=create('div',undefined,'person');tile.append(create('span',entry.name),create('strong',currency(entry.cents-entry.paid)));const shareButton=create('button','Gerar link','secondary');shareButton.setAttribute('aria-label','Gerar link de '+entry.name);shareButton.onclick=()=>openShare(entry.name);tile.append(shareButton,create('small','Total do mês: '+currency(entry.cents)+' · Pago: '+currency(entry.paid)+' · Falta: '+currency(entry.cents-entry.paid)));$('people').append(tile);}if(!people.size)$('people').append(create('div','Nenhum valor neste mês.','empty'));
  const cardsBox=$('card-totals');cardsBox.replaceChildren();const byBank=new Map();for(const x of items){const value=byBank.get(x.p.bank)||{total:0,paid:0};value.total+=x.cents;if(x.paid)value.paid+=x.cents;byBank.set(x.p.bank,value);}for(const [name,value] of byBank){const tile=create('div',undefined,'person bank-tile');window.CardColors.apply(tile,name);tile.append(create('span',name),create('strong',currency(value.total-value.paid)),create('small','Falta pagar · Total do mês: '+currency(value.total)+' · Pago: '+currency(value.paid)));const due=window.Ledger.dueDate(purchases,{bank:name},$('month').value);tile.append(create('small',due?'Vence em '+due.split('-').reverse().join('/'):'Vencimento não informado'));cardsBox.append(tile);}if(!byBank.size)cardsBox.append(create('div','Nenhuma compra neste mês.','empty'));
  $('transactions').replaceChildren();const shown=items.filter(x=>($('filter').value!=='parts'||x.p.parts>1)&&($('payment-filter').value==='all'||($('payment-filter').value==='paid'?x.paid:!x.paid)));
  for(const x of shown){const row=create('div',undefined,'transaction bank-row');window.CardColors.mark(row,x.p.bank);const detail=create('div');detail.append(create('strong',x.p.description),create('small',(x.p.kind==='loan'?'Empréstimo · ':'')+x.p.bank+' · '+x.p.person+' · '+(x.p.recurring?'Todo mês':x.p.parts===1?'À vista':'Parcela '+(x.index+1)+' de '+x.p.parts)),create('small',(x.p.kind==='loan'?'Parte total desta pessoa: ':(x.p.recurring?'Valor mensal: ':'Total do lançamento: '))+currency(x.p.cents)),...(x.dueDate?[create('small','Vencimento: '+x.dueDate.split('-').reverse().join('/'))]:[]));const right=create('div',undefined,'actions');right.append(create('span',currency(x.cents),'amount'));const edit=create('button','Editar','secondary');edit.onclick=()=>openEditor(x.p);const remove=create('button','Excluir','danger');remove.onclick=async()=>{if(!unlocked||busy)return;if(confirm(x.p.kind==='loan'?'Excluir este empréstimo, todas as parcelas e as partes de todas as pessoas?':x.p.recurring?'Excluir este gasto mensal de todos os meses? Para parar só os próximos meses, edite o último mês da repetição.':'Excluir o lançamento e todas as suas parcelas?'))await persist(purchases.filter(p=>x.p.kind==='loan'?p.loanId!==x.p.loanId:p.id!==x.p.id));};const payment=create('div',undefined,'payment-controls');payment.setAttribute('role','group');payment.setAttribute('aria-label','Pagamento de '+x.p.description+' · '+x.p.person);for(const value of [false,true]){const button=create('button',value?'Paguei':'Não paguei','secondary');button.type='button';button.setAttribute('aria-pressed',String(x.paid===value));button.onclick=async()=>{if(!unlocked||busy)return;try{await persist(window.Ledger.markPaid(purchases,x.p.id,$('month').value,value));}catch{$('message').textContent='Não foi possível atualizar o pagamento. Tente novamente.';}};payment.append(button);}detail.append(create('span',x.paid?'Paguei':'Não paguei','payment-status '+(x.paid?'is-paid':'is-unpaid')));right.append(edit,remove,payment);row.append(detail,right);$('transactions').append(row);}
  if(!shown.length)$('transactions').append(create('div','Nenhum lançamento para os filtros selecionados.','empty'));
  $('known-people').replaceChildren();for(const name of new Set(purchases.filter(p=>p.kind!=='settings').map(p=>p.person))){const o=create('option');o.value=name;$('known-people').append(o);}
}
function openEditor(p){if(!unlocked||busy)return;if(p?.kind==='loan'){openLoan(p);return;}$('form').reset();$('form-error').textContent='';$('edit-id').value=p?.id||'';$('form-title').textContent=p?'Editar compra':'Nova compra';$('description').value=p?.description||'';$('purchase-bank').value=p?.bank||(['all','Empréstimos'].includes($('bank').value)?banks[0]:$('bank').value);$('person').value=p?.person||'';$('value').value=p?(p.cents/100).toFixed(2).replace('.',','):'';$('parts').value=p?.parts||1;$('first-month').value=p?.month||$('month').value;$('repeat-monthly').checked=!!p?.recurring;$('repeat-until').value=p?.endMonth||'';$('custom-bank').value='';updatePixFields();$('editor').showModal();}

function paymentHistory(old,next){
 if(!old?.paidMonths?.length)return{record:next,cleared:false};
 const changed=['bank','cents','parts','month','recurring','offset'].some(k=>(old[k]??null)!==(next[k]??null))||window.Ledger.personKey(old.person)!==window.Ledger.personKey(next.person);
 const retained=changed?[]:old.paidMonths.filter(month=>window.Ledger.active(next,month));
 return{record:{...next,paidMonths:retained},cleared:changed||retained.length!==old.paidMonths.length};
}

function parseCents(raw){let value=raw.trim().replace(/R\$/g,'').replace(/\s/g,'');if(value.includes(','))value=value.replace(/\./g,'').replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(value))return NaN;return Math.round(Number(value)*100);}
$('form').onsubmit=async e=>{e.preventDefault();if(!unlocked||busy)return;let selectedBank;try{selectedBank=purchaseBank();}catch{$('form-error').textContent='Digite um nome válido para o cartão, com até 60 caracteres.';return;}const p={kind:$('purchase-bank').value==='PIX'?'pix':'card',id:$('edit-id').value||crypto.randomUUID(),description:$('description').value.trim(),bank:selectedBank,person:$('person').value.trim(),cents:parseCents($('value').value),parts:$('purchase-bank').value==='PIX'||$('repeat-monthly').checked?1:Number($('parts').value),month:$('first-month').value,...($('repeat-monthly').checked?{recurring:true,...($('repeat-until').value?{endMonth:$('repeat-until').value}:{})}:{})};if(!valid(p)){$('form-error').textContent='Confira o valor, as parcelas e os meses. O último mês não pode ser anterior ao primeiro.';return;}const history=paymentHistory(purchases.find(x=>x.id===p.id),p);if(history.cleared&&!confirm('Esta alteração afeta pagamentos já marcados. As marcações afetadas serão removidas. Continuar?'))return;const next=purchases.filter(x=>x.id!==p.id);next.push(history.record);if(await persist(next)){$('bank').value=p.bank;$('month').value=p.month;render();$('editor').close();}else if(unlocked)$('form-error').textContent='Não foi possível salvar. Tente novamente.';};
$('add').onclick=()=>openEditor();$('cancel').onclick=()=>$('editor').close();$('lock').onclick=async()=>{if(busy)return;try{await vault.forget();lockApp('App bloqueado.',true);syncPinPreference();}catch{$('message').textContent='Não foi possível reativar o bloqueio. Tente novamente.';}};for(const id of ['bank','month','filter','payment-filter'])$(id).addEventListener('change',render);
$('export').onclick=()=>{if(!unlocked||busy)return;try{if(window.AndroidHost?.postMessage){window.AndroidHost.postMessage(JSON.stringify({type:'export-backup',data:vault.backup()}));$('message').textContent='Escolha onde salvar seu backup protegido.';return;}const blob=new Blob([JSON.stringify(vault.backup(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=create('a');a.href=url;a.download='meus-cartoes-backup-protegido-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('message').textContent='Backup protegido baixado. Para restaurar, use o PIN atual.';}catch{lockApp('Digite seu PIN novamente para baixar o backup.');}};
async function restore(data){if(!validRecords(data))throw Error('invalid-data');if(!unlocked||busy)return false;if(!confirm('Restaurar este backup? Ele substituirá os dados atuais deste navegador.'))return false;if(await persist(data)){$('message').textContent='Backup restaurado e protegido com o PIN deste navegador.';return true;}return false;}
$('import').onchange=async()=>{const file=$('import').files[0],ticket=session;if(!file||!unlocked||busy)return;try{if(file.size>12000000)throw Error();const data=JSON.parse(await file.text());if(!unlocked||ticket!==session)return;if(data.version===2&&data.app==='meus-cartoes'){vault.validateEnvelope(data.vault);pendingBackup=data.vault;$('backup-form').reset();$('backup-error').textContent='';$('backup-dialog').showModal();}else if(data.version===1)await restore(data.purchases);else throw Error();}catch{if(unlocked&&ticket===session)$('message').textContent='Arquivo inválido. Escolha um backup deste aplicativo.';}finally{$('import').value='';}};
$('backup-form').onsubmit=async e=>{e.preventDefault();if(!unlocked||busy||!pendingBackup||$('backup-submit').disabled)return;const ticket=session,pin=$('backup-pin').value,envelope=pendingBackup;$('backup-pin').value='';$('backup-submit').disabled=true;$('backup-error').textContent='Abrindo backup…';try{const data=await vault.decryptBackup(pin,envelope);if(ticket!==session||!unlocked)return;const ok=await restore(data);if(ticket!==session)return;if(ok){pendingBackup=null;$('backup-dialog').close();}else $('backup-error').textContent='A restauração não foi concluída.';}catch{if(ticket===session&&unlocked)$('backup-error').textContent='Não foi possível abrir. Confira o PIN usado ao criar esse backup.';}finally{$('backup-submit').disabled=false;}};
$('backup-cancel').onclick=()=>{pendingBackup=null;$('backup-form').reset();$('backup-dialog').close();};
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,resetIdle,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)lockApp('Digite seu PIN para continuar.');});
window.addEventListener('pagehide',()=>lockApp());window.addEventListener('pageshow',event=>{if(event.persisted)lockApp();});
window.addEventListener('storage',event=>{if(cloudSession)return;if(event.key===null||[vault.STORAGE_KEY,vault.LEGACY_KEY,vault.PREFERENCE_KEY].includes(event.key))refreshAfterChange();});
function clearShare(){sharing=false;$('share-link').value='';$('share-summary').textContent='';$('share-message').textContent='';$('share-open').href='#';}
async function openShare(name){
 if(!unlocked||busy||sharing)return;sharing=true;const ticket=session;
 try{const data=window.InvoiceShare.build(purchases,name,$('month').value,$('bank').value);const url=await window.InvoiceShare.makeLink(data,viewerBase);if(ticket!==session||!unlocked)return;
 $('share-summary').textContent=data.name+' · '+data.month.split('-').reverse().join('/')+' · '+data.scope+' · Falta pagar: '+currency(data.items.filter(item=>!item.paid).reduce((sum,item)=>sum+item.cents,0));$('share-link').value=url;$('share-open').href=url;$('share-message').textContent='Copie e envie o link para esta pessoa.';$('share-dialog').showModal();resetIdle();
 }catch(error){if(ticket===session&&unlocked)$('message').textContent=error.message==='too-long'?'Há muitas compras para um único link. Selecione um cartão e gere o link novamente.':'Não foi possível gerar o link. Confira as compras e tente novamente.';}
 finally{if(ticket===session)sharing=false;}
}
$('share-close').onclick=()=>$('share-dialog').close();$('share-dialog').addEventListener('close',clearShare);
$('share-copy').onclick=async()=>{if(!unlocked||!$('share-link').value)return;const ticket=session,url=$('share-link').value;try{await navigator.clipboard.writeText(url);if(ticket===session&&unlocked)$('share-message').textContent='Link copiado. Agora cole na conversa da pessoa.';}catch{if(ticket===session&&unlocked){$('share-link').focus();$('share-link').select();$('share-message').textContent='Selecione e copie o link acima para enviar à pessoa.';}}};

let loanParticipants=[],loanTotalManual=false;
function updatePixFields(){const pix=$('purchase-bank').value==='PIX',repeat=$('repeat-monthly').checked,custom=$('purchase-bank').value==='__custom__';$('parts').disabled=pix||repeat;if(pix||repeat)$('parts').value='1';$('pix-help').hidden=!pix;$('custom-bank-label').hidden=!custom;$('custom-bank').required=custom;$('repeat-until-label').hidden=!repeat;$('repeat-help').hidden=!repeat;$('form-title').textContent=($('edit-id').value?'Editar ':'Novo ')+(pix?'PIX':'lançamento');}
$('purchase-bank').addEventListener('change',updatePixFields);$('repeat-monthly').addEventListener('change',updatePixFields);
$('add-pix').onclick=()=>{if(!unlocked||busy)return;openEditor();$('purchase-bank').value='PIX';updatePixFields();};
function loanValues(){const names=loanParticipants.map(row=>row.name.value.trim());const amounts=loanParticipants.map(row=>parseCents(row.amount.value));return{names,amounts};}
function updateLoanPreview(){
 let total=parseCents($('loan-value').value);const parts=Number($('loan-parts').value),equal=$('loan-mode').value==='equal',n=loanParticipants.length;const monthly=$('loan-mode').value==='monthly';$('loan-value').readOnly=false;$('loan-use-calculated').hidden=!monthly;$('loan-amounts-help').textContent=monthly?'Digite o total a pagar e quanto cada pessoa paga por parcela. Você também pode usar o total calculado abaixo.':'Informe a parte de cada pessoa no valor total do empréstimo.';
 let calculated=NaN;if(monthly){const values=loanParticipants.map(row=>parseCents(row.amount.value));calculated=values.every(v=>Number.isSafeInteger(v)&&v>0)&&Number.isInteger(parts)&&parts>0&&parts<=120?values.reduce((sum,v)=>sum+v,0)*parts:NaN;if(!loanTotalManual){total=calculated;$('loan-value').value=Number.isSafeInteger(total)?(total/100).toFixed(2).replace('.',','):'';}}$('loan-calculation').textContent=monthly?(Number.isSafeInteger(calculated)?'Total calculado pelas parcelas: '+currency(calculated)+(Number.isSafeInteger(total)&&total!==calculated?' · Diferença para o digitado: '+currency(Math.abs(total-calculated)):''):'Você pode digitar o total agora ou preencher as parcelas para calcular.'):'Digite o total a pagar, incluindo os juros informados pelo banco.';
 loanParticipants.forEach((row,i)=>{row.amount.readOnly=equal;row.amount.required=!equal;if(equal)row.amount.value=Number.isSafeInteger(total)&&total>0?((Math.floor(total/n)+(i<total%n?1:0))/100).toFixed(2).replace('.',','):'';});
 if(!Number.isSafeInteger(total)||total<=0||!Number.isInteger(parts)||parts<1||parts>120){$('loan-preview').textContent=monthly?'Informe o valor mensal de cada pessoa e o número de parcelas.':'Informe o total a pagar e o número de parcelas.';return;}
 try{const {names,amounts}=loanValues();const rows=window.Ledger.splitLoan({loanId:'preview',description:'Prévia',bank:$('loan-bank').value,loanTotal:total,parts,month:$('loan-month').value,splitMode:$('loan-mode').value,...($('loan-principal').value?{principalCents:parseCents($('loan-principal').value)}:{}),...($('loan-due-day').value?{dueDay:Number($('loan-due-day').value)}:{})},names,amounts);$('loan-preview').textContent=rows.map(p=>p.person+': '+currency(p.cents)+' no total · primeira parcela '+currency(window.Ledger.installment(p,0))).join(' | ');}
 catch{$('loan-preview').textContent=monthly&&Number.isSafeInteger(calculated)&&Number.isSafeInteger(total)&&total!==calculated?'O total digitado não confere com as parcelas. Confira os valores antes de salvar.':equal?'Preencha o nome de cada pessoa.':'A soma das partes precisa ser igual ao total do empréstimo.';}
}
function addLoanPerson(name='',amount=''){
 if(loanParticipants.length>=10)return;const row=create('div',undefined,'loan-person'),nameLabel=create('label','Nome da pessoa'),nameInput=create('input'),amountLabel=create('label','Valor desta pessoa (R$)'),amountInput=create('input'),remove=create('button','Remover','secondary');
 nameInput.type='text';nameInput.required=true;nameInput.maxLength=60;nameInput.placeholder='Digite o nome';nameInput.setAttribute('list','known-people');nameInput.value=name;amountInput.type='text';amountInput.inputMode='decimal';amountInput.value=amount;remove.type='button';nameLabel.append(nameInput);amountLabel.append(amountInput);row.append(nameLabel,amountLabel,remove);
 const entry={name:nameInput,amount:amountInput,element:row};loanParticipants.push(entry);$('loan-people').append(row);
 remove.onclick=()=>{if(loanParticipants.length<=2){$('loan-error').textContent='Mantenha pelo menos duas pessoas.';return;}loanParticipants=loanParticipants.filter(x=>x!==entry);row.remove();updateLoanPreview();};
 nameInput.addEventListener('input',updateLoanPreview);amountInput.addEventListener('input',updateLoanPreview);updateLoanPreview();
}
function openLoan(p){
 if(!unlocked||busy)return;$('loan-form').reset();$('due-dialog').close();$('due-form').reset();$('due-error').textContent='';$('loan-error').textContent='';$('loan-people').replaceChildren();loanParticipants=[];loanTotalManual=!!p;
 const group=p?purchases.filter(x=>x.loanId===p.loanId):[];$('loan-id').value=p?.loanId||'';$('loan-description').value=p?.description||'';$('loan-bank').value=p?.bank||(!['all','PIX'].includes($('bank').value)?$('bank').value:'Empréstimos');$('loan-value').value=p?(p.loanTotal/100).toFixed(2).replace('.',','):'';$('loan-principal').value=p?.principalCents?(p.principalCents/100).toFixed(2).replace('.',','):'';$('loan-due-day').value=p?.dueDay||'';$('loan-parts').value=p?.parts||1;$('loan-month').value=p?.month||$('month').value;$('loan-mode').value=p?.splitMode||'monthly';$('loan-title').textContent=p?'Editar empréstimo dividido':'Novo empréstimo dividido';
 if(group.length)group.forEach(x=>addLoanPerson(x.person,(x.cents/(p.splitMode==='monthly'?p.parts:1)/100).toFixed(2).replace('.',',')));else{addLoanPerson();addLoanPerson();}updateLoanPreview();$('loan-dialog').showModal();
}
$('add-loan').onclick=()=>openLoan();$('loan-add-person').onclick=()=>addLoanPerson();$('loan-cancel').onclick=()=>$('loan-dialog').close();
for(const id of ['loan-parts','loan-month','loan-mode','loan-bank','loan-principal','loan-due-day'])$(id).addEventListener('input',updateLoanPreview);
$('loan-value').addEventListener('input',()=>{loanTotalManual=true;updateLoanPreview();});
$('loan-use-calculated').onclick=()=>{loanTotalManual=false;updateLoanPreview();};
$('loan-form').onsubmit=async event=>{
 event.preventDefault();if(!unlocked||busy)return;updateLoanPreview();const {names,amounts}=loanValues();
 try{const loanId=$('loan-id').value||crypto.randomUUID(),rows=window.Ledger.splitLoan({loanId,description:$('loan-description').value.trim(),bank:$('loan-bank').value,loanTotal:parseCents($('loan-value').value),parts:Number($('loan-parts').value),month:$('loan-month').value,splitMode:$('loan-mode').value,...($('loan-principal').value?{principalCents:parseCents($('loan-principal').value)}:{}),...($('loan-due-day').value?{dueDay:Number($('loan-due-day').value)}:{})},names,amounts);const oldGroup=purchases.filter(x=>x.loanId===loanId);const histories=rows.map(row=>paymentHistory(oldGroup.find(old=>window.Ledger.personKey(old.person)===window.Ledger.personKey(row.person)),row));const removedPaid=oldGroup.some(old=>old.paidMonths?.length&&!rows.some(row=>window.Ledger.personKey(old.person)===window.Ledger.personKey(row.person)));if((histories.some(h=>h.cleared)||removedPaid)&&!confirm('A alteração do empréstimo afeta pagamentos já marcados. As marcações afetadas serão removidas. Continuar?'))return;const next=purchases.filter(x=>x.loanId!==loanId).concat(histories.map(h=>h.record));if(await persist(next)){$('bank').value='all';$('month').value=rows[0].month;render();$('loan-dialog').close();}else if(unlocked)$('loan-error').textContent='Não foi possível salvar. Tente novamente.';}
 catch(error){$('loan-error').textContent=error.message==='names'?'Informe de 2 a 10 nomes diferentes.':error.message==='amounts'?$('loan-mode').value==='monthly'?'O total digitado deve ser igual à soma dos valores por parcela multiplicada pelo número de parcelas. Confira o total ou use o botão de calcular.':'A soma das partes deve ser igual ao total. Cada pessoa precisa ter um valor positivo.':'Confira o total, as parcelas, os nomes e o mês.';}
};

function updateDueForm(){const setting=purchases.find(p=>p.kind==='settings'&&p.bank===$('due-bank').value);$('due-day').value=setting?.dueDay||'';}
$('due-open').onclick=()=>{if(!unlocked||busy)return;refreshBankOptions();if(!['all','PIX'].includes($('bank').value))$('due-bank').value=$('bank').value;updateDueForm();$('due-error').textContent='';$('due-dialog').showModal();};
$('due-bank').addEventListener('change',updateDueForm);$('due-cancel').onclick=()=>$('due-dialog').close();
$('due-form').onsubmit=async event=>{event.preventDefault();if(!unlocked||busy)return;const bank=$('due-bank').value,day=$('due-day').value,existing=purchases.find(p=>p.kind==='settings'&&p.bank===bank);const next=purchases.filter(p=>!(p.kind==='settings'&&p.bank===bank));if(day){const setting={id:existing?.id||crypto.randomUUID(),kind:'settings',bank,dueDay:Number(day)};if(!valid(setting)){$('due-error').textContent='Informe um dia de 1 a 31.';return;}next.push(setting);}if(await persist(next))$('due-dialog').close();else if(unlocked)$('due-error').textContent='Não foi possível salvar o vencimento.';};


window.addEventListener('android:resume',()=>{if(unlocked&&window.AndroidHost?.postMessage)window.AndroidHost.postMessage(JSON.stringify({type:'get-import'}));});
window.AndroidReceiveBackup=async text=>{
 if(!unlocked||busy)return;try{const data=JSON.parse(text);if(data.version===2&&data.app==='meus-cartoes'){vault.validateEnvelope(data.vault);pendingBackup=data.vault;$('backup-form').reset();$('backup-error').textContent='';$('backup-dialog').showModal();}else if(data.version===1)await restore(data.purchases);else throw Error();}catch{$('message').textContent='Arquivo inválido. Escolha um backup deste aplicativo.';}
};
$('android-import').onclick=()=>{if(!unlocked||busy)return;window.AndroidHost?.postMessage(JSON.stringify({type:'import-backup'}));};
$('share-open').addEventListener('click',event=>{if(!window.AndroidHost?.postMessage)return;event.preventDefault();if(unlocked&&$('share-link').value)window.AndroidHost.postMessage(JSON.stringify({type:'open-url',url:$('share-link').value}));});
$('share-copy').onclick=()=>{if(!unlocked||!$('share-link').value)return;window.AndroidHost?.postMessage(JSON.stringify({type:'copy-text',text:$('share-link').value}));$('share-message').textContent='Link enviado para a área de transferência.';};

// ANDROID_EXTENSION_POINT
if(accountMode){accountGate('Conectando com Google…');$('local-access').hidden=!hasLocalData();}else{configureGate();syncPinPreference();tryAutoOpen();}
})();


