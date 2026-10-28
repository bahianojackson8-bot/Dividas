from pathlib import Path
import urllib.request,hashlib,zipfile,json,time,concurrent.futures,xml.etree.ElementTree as ET
ROOT=Path('\\\\?\\' + str(Path(__file__).resolve().parent))
TOOLS=ROOT/'.tools';TOOLS.mkdir(exist_ok=True)
def get(url):return urllib.request.urlopen(url,timeout=40)
repo=ET.fromstring(get('https://dl.google.com/android/repository/repository2-3.xml').read())
cli=None
for p in repo.findall('remotePackage'):
 if p.get('path')=='cmdline-tools;19.0':
  for a in p.findall('./archives/archive'):
   if a.findtext('host-os')=='windows':
    e=a.find('complete');cli={'name':'android-cli','url':'https://dl.google.com/android/repository/'+e.findtext('url'),'hash':e.findtext('checksum'),'algorithm':'sha1','folder':TOOLS/'android-sdk'/'cmdline-tools'/'latest','strip':'cmdline-tools/'}
if cli is None:raise SystemExit('Ferramentas Windows não encontradas no catálogo oficial.')
jdkurl='https://aka.ms/download-jdk/microsoft-jdk-21.0.13.0.2-windows-x64.zip'
jdkhash=get(jdkurl+'.sha256sum.txt').read().decode().split()[0]
gradlehash=get('https://services.gradle.org/distributions/gradle-8.13-bin.zip.sha256').read().decode().strip()
items=[cli,{'name':'java','url':jdkurl,'hash':jdkhash,'algorithm':'sha256','folder':TOOLS/'java','strip':None},{'name':'gradle','url':'https://services.gradle.org/distributions/gradle-8.13-bin.zip','hash':gradlehash,'algorithm':'sha256','folder':TOOLS,'strip':None}]
def run(item):
 archive=TOOLS/(item['name']+'.zip');h=hashlib.new(item['algorithm'])
 if archive.exists():
  with archive.open('rb') as f:
   for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 if not archive.exists() or h.hexdigest().lower()!=item['hash'].lower():
  h=hashlib.new(item['algorithm']);done=0;last=time.time()
  with get(item['url']) as source,archive.open('wb') as out:
   for chunk in iter(lambda:source.read(1024*1024),b''):
    out.write(chunk);h.update(chunk);done+=len(chunk)
    if time.time()-last>12:print(item['name']+': '+str(done//1048576)+' MB baixados',flush=True);last=time.time()
  if h.hexdigest().lower()!=item['hash'].lower():raise RuntimeError('Checksum inválido para '+item['name'])
 dest=item['folder'];dest.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(archive) as z:
  for entry in z.infolist():
   name=entry.filename
   if item['strip']:
    if not name.startswith(item['strip']):continue
    name=name[len(item['strip']):]
   if not name:continue
   target=(dest/name).resolve()
   if not target.is_relative_to(dest.resolve()):raise RuntimeError('Caminho inválido no pacote.')
   if entry.is_dir():target.mkdir(parents=True,exist_ok=True)
   else:
    target.parent.mkdir(parents=True,exist_ok=True)
    with z.open(entry) as src,target.open('wb') as out:
     for chunk in iter(lambda:src.read(1024*1024),b''):out.write(chunk)
 print(item['name']+': pronto e verificado',flush=True)
 return {'name':item['name'],'url':item['url'],'hash':item['hash'],'algorithm':item['algorithm']}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 results=list(pool.map(run,items))
(ROOT/'toolchain-manifest.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print('Ferramentas locais preparadas.',flush=True)

