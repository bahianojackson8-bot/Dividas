from pathlib import Path
import urllib.request,hashlib,zipfile,time
root=Path('\\\\?\\'+str(Path(r'C:\Users\user\.codex\visualizations\2026\10\22\01a164ab-13a7-77c1-8cfc-f542e6c61b7d\dividas-android').resolve()))
archive=root/'.tools/legacy-cli.zip';expected='54a582f3bf73e04253602f2d1c80bd5868aac115';h=hashlib.sha1();last=time.time();done=0
with urllib.request.urlopen('https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip',timeout=40) as src,archive.open('wb') as out:
 for chunk in iter(lambda:src.read(1024*1024),b''):
  out.write(chunk);h.update(chunk);done+=len(chunk)
  if time.time()-last>15:print(str(done//1048576)+' MB baixados',flush=True);last=time.time()
if h.hexdigest()!=expected:raise RuntimeError('Checksum inválido.')
dest=root/'.tools/android-sdk/cmdline-tools/legacy';dest.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive) as z:
 for info in z.infolist():
  name=info.filename.removeprefix('cmdline-tools/')
  if not name:continue
  target=dest/name
  if '..' in Path(name).parts:raise RuntimeError('Caminho inválido.')
  if info.is_dir():target.mkdir(parents=True,exist_ok=True)
  else:
   target.parent.mkdir(parents=True,exist_ok=True)
   with z.open(info) as src,target.open('wb') as out:
    for chunk in iter(lambda:src.read(1024*1024),b''):out.write(chunk)
print('Ferramentas Android compatíveis preparadas e verificadas.',flush=True)
