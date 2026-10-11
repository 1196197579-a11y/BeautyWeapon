"""Build public V8.1.7 only from the verified public base and tested patch."""
from pathlib import Path
import hashlib,zipfile,json,base64,sys,shutil
base=Path(sys.argv[1]);patch=Path(sys.argv[2]);out=Path(sys.argv[3]);root=out/'美丽武器V8.1.7_完整包'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
assert sha(base)=='2fae8b3a06d16863f2a8cc0138d3c77b2db212a28877ed80e58a2cb10547ad28'
assert not root.exists();root.mkdir(parents=True)
with zipfile.ZipFile(base) as z:
 for item in z.infolist():
  rel='/'.join(item.filename.split('/')[1:]);parts=Path(rel).parts
  assert rel and not any(p in ('..','.') for p in parts) and ':' not in rel
  if item.is_dir():continue
  # These are generated state, diagnostics, and superseded user-facing entries.
  if any(p in ('testData','cache','test-profiles','logs') for p in parts):continue
  if rel=='资料/SHA256.txt' or rel=='美丽武器V8.1.6.exe' or rel.startswith('美丽武器V8.1.6_抖音网页助手/'):continue
  dest=root/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(item))
with zipfile.ZipFile(patch) as z:
 manifest=json.loads(z.read('patch-manifest.json'))
 for rel,value in manifest.items():
  assert rel and ':' not in rel and '..' not in Path(rel).parts and not any(p in ('testData','test-profiles','test_assets','logs') for p in Path(rel).parts)
  content=z.read(rel);assert hashlib.sha256(content).hexdigest()==value
  dest=root/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(content)
# Baselines are copied from public files with verified identities, never private data.
with zipfile.ZipFile(base) as z:
 prefix='美丽武器V8.1.6_完整包/'
 for rel,dest in [('components/美丽武器V6.8.2_核心.exe','components/baseline/美丽武器V6.8.2_核心.exe'),('美丽武器V8.1.6.exe','components/baseline/美丽武器V8.1.6.exe'),('components/runtime/ffwrap/ffprobe.exe','components/runtime/ffwrap/ffprobe.original.exe')]:
  target=root/dest;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(prefix+rel))
(root/'components/baseline/core.sha256').write_text(sha(root/'components/baseline/美丽武器V6.8.2_核心.exe'),encoding='utf-8')
files=sorted(p for p in root.rglob('*') if p.is_file());checksum=root/'资料/SHA256.txt';checksum.parent.mkdir(exist_ok=True)
checksum.write_text(''.join(sha(p)+'  '+p.relative_to(root).as_posix()+'\n' for p in files),encoding='utf-8')
archive=out/'BeautyWeapon-v8.1.7-windows-x64.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(p for p in root.rglob('*') if p.is_file()):
  info=zipfile.ZipInfo(root.name+'/'+p.relative_to(root).as_posix(),(2026,10,12,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes(),compresslevel=6)
manifest={'app':'BeautyWeapon','version':'8.1.7','url':'https://github.com/1196197579-a11y/BeautyWeapon/releases/download/v8.1.7/BeautyWeapon-v8.1.7-windows-x64.zip','bytes':archive.stat().st_size,'sha256':sha(archive),'root':root.name,'launcher':'美丽武器V8.1.7.exe','extensionVersion':'8.1.7','notes':'V8.1.7：手动打开透明输出、桌面拖动虚线框、新输出图标；保留并恢复旧模板及效果；主页备用自动合成；隐藏合成黑框；合成中短文字与绿色播放按钮；退出主软件清理所属输出和后台。首次启动会恢复旧配置，请等待模板检查完成。'}
(out/'release-info-v8.1.7.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(files)+1,'bytes':manifest['bytes'],'sha256':manifest['sha256']}))
