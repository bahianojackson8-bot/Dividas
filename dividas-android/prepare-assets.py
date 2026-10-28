from pathlib import Path
import shutil,hashlib,json,re
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'app-cartoes'/'dist'
if not SOURCE.is_dir():SOURCE=ROOT/'web-source'
TARGET=ROOT/'app'/'src'/'main'/'assets'
FILES=['index.html','app.js','finance.js','vault.js','share.js','consulta.html','consulta.js','colors.js','theme.js','theme.css','account-core.js','account.js','privacidade.html']

def main():
 TARGET.mkdir(parents=True,exist_ok=True)
 hashes={}
 for name in FILES:
  source=SOURCE/name
  if not source.is_file():raise SystemExit('Arquivo da base não encontrado: '+name)
  text=source.read_text(encoding='utf-8-sig')
  hashes[name]=hashlib.sha256(source.read_bytes()).hexdigest()
  if name=='index.html':
   text=text.replace('<title>Meus cartões</title>','<title>Dívidas</title>').replace('<h1>Meus cartões</h1>','<h1>Dívidas</h1>').replace('neste navegador','neste aparelho')
   old='<label class="file">Restaurar backup<input id="import" type="file" accept="application/json,.json"></label>'
   if old not in text:raise SystemExit('Revisar integração de importação: HTML de origem mudou.')
   text=text.replace(old,'<button type="button" id="android-import" class="secondary">Restaurar backup</button><input id="import" type="file" hidden>')
  if name=='app.js':
   old="$('export').onclick=()=>{if(!unlocked||busy)return;try{const blob="
   new="$('export').onclick=()=>{if(!unlocked||busy)return;try{if(window.AndroidHost?.postMessage){window.AndroidHost.postMessage(JSON.stringify({type:'export-backup',data:vault.backup()}));$('message').textContent='Escolha onde salvar seu backup protegido.';return;}const blob="
   if old not in text:raise SystemExit('Revisar integração de exportação: código de origem mudou.')
   text=text.replace(old,new,1)
   anchor="$('lock').focus();"
   if anchor not in text:raise SystemExit('Revisar integração de desbloqueio.')
   text=text.replace(anchor,anchor+"if(window.AndroidHost?.postMessage)window.AndroidHost.postMessage(JSON.stringify({type:'get-import'}));",1)
   extension=r'''
window.addEventListener('android:resume',()=>{if(unlocked&&window.AndroidHost?.postMessage)window.AndroidHost.postMessage(JSON.stringify({type:'get-import'}));});
window.AndroidReceiveBackup=async text=>{
 if(!unlocked||busy)return;try{const data=JSON.parse(text);if(data.version===2&&data.app==='meus-cartoes'){vault.validateEnvelope(data.vault);pendingBackup=data.vault;$('backup-form').reset();$('backup-error').textContent='';$('backup-dialog').showModal();}else if(data.version===1)await restore(data.purchases);else throw Error();}catch{$('message').textContent='Arquivo inválido. Escolha um backup deste aplicativo.';}
};
$('android-import').onclick=()=>{if(!unlocked||busy)return;window.AndroidHost?.postMessage(JSON.stringify({type:'import-backup'}));};
$('share-open').addEventListener('click',event=>{if(!window.AndroidHost?.postMessage)return;event.preventDefault();if(unlocked&&$('share-link').value)window.AndroidHost.postMessage(JSON.stringify({type:'open-url',url:$('share-link').value}));});
$('share-copy').onclick=()=>{if(!unlocked||!$('share-link').value)return;window.AndroidHost?.postMessage(JSON.stringify({type:'copy-text',text:$('share-link').value}));$('share-message').textContent='Link enviado para a área de transferência.';};
'''
   anchor='// ANDROID_EXTENSION_POINT'
   if anchor not in text:raise SystemExit('Revisar integração Android: inicialização mudou.')
   text=text.replace(anchor,extension+'\n'+anchor,1)
  if name=='vault.js':text=text.replace('// Browser-local encryption; the account\'s private Site access remains required.','// Cofre local do aparelho. Nenhum dado pessoal é incluído no pacote do app.')
  (TARGET/name).write_text(text,encoding='utf-8')
 (ROOT/'source-manifest.json').write_text(json.dumps({'source':'../app-cartoes/dist','files':hashes,'personal_data_included':False},indent=2),encoding='utf-8')
 print('Recursos do Dívidas preparados sem copiar dados do navegador ou backups pessoais.')
if __name__=='__main__':main()
