using System;
using System.IO;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Web.Script.Serialization;

// Public DOM facts only. Never serialize arbitrary request bodies, leases or browser state.
internal static class FailureLogs {
 static readonly object gate=new object();
 internal static readonly string Folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"美丽武器_读取失败日志");
 internal static string LastPath="",LastError="";
 static readonly HashSet<string> Keys=new HashSet<string>(new[]{"version","readerVersion","protocol","phase","reason","elapsedMs","attempt","polls","samples","atMs","repeats","messageError","tabStatus","tabActive","tabDiscarded","tabFrozen","tabId","anchorTabId","createdTabId","currentId","canonicalId","expectedId","hashMatches","canonicalPresent","metadataIds","headingCount","visibleHeadingCount","headingNames","nickname","headerFound","avatar","candidateCount","groupCount","scopedCount","explicitCount","candidates","src","alt","complete","naturalWidth","naturalHeight","width","height","inNavigation","ownerId","scope","depth","tag","className","headingConflict","images","readyState","visibility","title","sourceUrl","imageUrl","error","cleanup","stage","receivedProfile","stableMs","extensionId","userAgent","pendingReports","historical","detail"});
 static object Safe(object value,int depth){
  if(depth>8||value==null)return null;
  var d=value as Dictionary<string,object>;if(d!=null){var result=new Dictionary<string,object>();foreach(var kv in d.Take(80))if(Keys.Contains(kv.Key))result[kv.Key]=Safe(kv.Value,depth+1);return result;}
  string s=value as string;if(s!=null){if(s.StartsWith("data:",StringComparison.OrdinalIgnoreCase))return "[未记录图像内容]";Uri u;if(Uri.TryCreate(s,UriKind.Absolute,out u)&&(u.Scheme=="https"||u.Scheme=="http"))s=u.GetLeftPart(UriPartial.Path);return s.Substring(0,Math.Min(512,s.Length));}
  if(value is bool||value is int||value is long||value is double||value is decimal)return value;
  var list=value as IEnumerable;if(list!=null){var result=new List<object>();foreach(var item in list){if(result.Count>=64)break;result.Add(Safe(item,depth+1));}return result;}
  return null;
 }
 internal static string Write(GiftTask t,string phase,string error,object diagnostic,bool historical=false){lock(gate){try{
  Directory.CreateDirectory(Folder);
  var files=new DirectoryInfo(Folder).GetFiles("失败_*.txt");
  if(files.Length>=1000||files.Sum(f=>f.Length)>=64L*1024*1024)throw new IOException("日志达到 1000 份或 64 MB 上限；已保留全部旧日志，请另行收纳后继续记录");
  var data=new {version="8.1.4",recordedAt=DateTimeOffset.Now.ToString("o"),taskId=t.id,taskStatus=t.status,phase=phase,error=Safe(error,0),attempt=t.attempts,created=t.created,updated=t.updated,deadline=t.deadline,expectedId=t.expectedId,sourceUrl=Safe(t.sourceUrl,0),identityMethod=t.identityMethod,giftNickname=Safe(QueueStore.S(t.raw,"nickname"),0),gift=Safe(QueueStore.S(t.raw,"gift"),0),captureError=Safe(QueueStore.S(t.raw,"captureError"),0),historical=historical,diagnostic=Safe(diagnostic,0)};
  string text="美丽武器读取/制片失败诊断（不包含登录凭证、Cookie、网页全文或图像内容）\r\n"+
   "任务编号："+t.id+"\r\n失败阶段："+phase+"\r\n错误："+Safe(error,0)+"\r\n"+
   (historical?"这是旧任务记录，当时尚未采集 DOM 诊断，不能补推缺失原因。\r\n":"")+
   "JSON 详细记录：\r\n"+new JavaScriptSerializer{MaxJsonLength=262144}.Serialize(data)+"\r\n";
  byte[] bytes=new UTF8Encoding(true).GetPreamble().Concat(new UTF8Encoding(false).GetBytes(text)).ToArray();
  if(bytes.Length>131072)throw new IOException("诊断超过 128 KB 上限，未写入不受控数据");
  string path=Path.Combine(Folder,"失败_"+DateTime.Now.ToString("yyyyMMdd_HHmmss_fff")+"_"+Guid.NewGuid().ToString("N")+".txt");
  using(var f=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.Read)){f.Write(bytes,0,bytes.Length);f.Flush(true);}
  LastPath=path;LastError="";return path;
 }catch(Exception e){LastError=e.Message;return "";}}}
 internal static object State(){lock(gate)return new{folder=Folder,lastPath=LastPath,error=LastError};}
}
