using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal sealed class UpdateManager {
    internal const string Version="8.1.1";
    internal const string DefaultSource="https://raw.githubusercontent.com/1196197579-a11y/BeautyWeapon/main/latest.json";
    internal static readonly string DataRoot=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"BeautyWeapon");
    readonly string root;
    readonly object gate=new object();
    Dictionary<string,object> settings;
    Dictionary<string,object> state=new Dictionary<string,object>{{"ok",true},{"phase","idle"},{"message","尚未检查更新"},{"progress",0}};
    Dictionary<string,object> manifest;
    CancellationTokenSource cancel;
    string currentJob;
    bool busy;
    static JavaScriptSerializer Json(){return new JavaScriptSerializer{MaxJsonLength=2*1024*1024};}
    static string S(Dictionary<string,object> d,string k){object v;return d!=null&&d.TryGetValue(k,out v)&&v!=null?Convert.ToString(v):"";}
    static long N(Dictionary<string,object> d,string k){long n;return Int64.TryParse(S(d,k),out n)?n:0;}
    static Dictionary<string,object> Read(string file){return Json().Deserialize<Dictionary<string,object>>(File.ReadAllText(file,Encoding.UTF8));}
    static void WritePreserving(string path,object data){
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        if(File.Exists(path))File.Copy(path,path+".backup-"+DateTime.UtcNow.ToString("yyyyMMddHHmmssfff")+"-"+Guid.NewGuid().ToString("N").Substring(0,6),false);
        File.WriteAllText(path,Json().Serialize(data),new UTF8Encoding(false));
    }
    internal UpdateManager(string rootPath){
        root=Path.GetFullPath(rootPath);string downloadFolder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"Downloads");
        try{using(var key=Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\NeatDM")){string configured=key==null?"":Convert.ToString(key.GetValue("DownloadDirectory"));if(Directory.Exists(configured))downloadFolder=configured;}}catch{}
        settings=new Dictionary<string,object>{{"source",DefaultSource},{"downloader","builtin"},{"ndmPath",""},{"ndmFolder",downloadFolder},{"version",Version}};
        try{var saved=Read(Path.Combine(DataRoot,"settings.json"));foreach(string k in new[]{"source","downloader","ndmPath","ndmFolder"})if(saved.ContainsKey(k))settings[k]=saved[k];}catch{}
        settings["ndmPath"]=FindNdm(S(settings,"ndmPath"));
    }
    internal object Settings(){lock(gate)return new Dictionary<string,object>(settings);}
    internal object State(){lock(gate){var copy=new Dictionary<string,object>(state);copy["busy"]=busy;return copy;}}
    void Set(string phase,string message,int progress){lock(gate){state["phase"]=phase;state["message"]=message;state["progress"]=progress;}}
    internal void SaveSettings(Dictionary<string,object> d){
        string source=S(d,"source");Trusted(source,true);
        string downloader=S(d,"downloader");if(downloader!="builtin"&&downloader!="ndm")throw new IOException("下载方式无效");
        string exe=S(d,"ndmPath"),folder=S(d,"ndmFolder");
        if(exe!=""&&(!Path.IsPathRooted(exe)||!File.Exists(exe)||!String.Equals(Path.GetFileName(exe),"NDM.exe",StringComparison.OrdinalIgnoreCase)))throw new IOException("请选择本机 NDM.exe");
        if(!Path.IsPathRooted(folder)||!Directory.Exists(folder))throw new IOException("NDM 下载目录不存在，请选择 NDM 实际使用的目录");
        lock(gate){if(busy)throw new IOException("更新进行中，请完成或取消后再改设置");settings["source"]=source;settings["downloader"]=downloader;settings["ndmPath"]=exe;settings["ndmFolder"]=folder;WritePreserving(Path.Combine(DataRoot,"settings.json"),settings);}
    }
    static string FindNdm(string preferred){
        if(File.Exists(preferred))return preferred;
        foreach(var p in Process.GetProcessesByName("NDM"))using(p)try{if(File.Exists(p.MainModule.FileName))return p.MainModule.FileName;}catch{}
        foreach(string dir in new[]{Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86)}){
            string file=Path.Combine(dir,"Neat Download Manager","NDM.exe");if(File.Exists(file))return file;
        }
        return "";
    }
    internal string ChoosePath(string kind){
        string selected="";Exception failure=null;
        var thread=new Thread(()=>{try{
            if(kind=="folder"){using(var d=new FolderBrowserDialog()){d.Description="选择 NDM 实际下载目录";d.SelectedPath=S(settings,"ndmFolder");if(d.ShowDialog()==DialogResult.OK)selected=d.SelectedPath;}}
            else if(kind=="exe"){using(var d=new OpenFileDialog()){d.Title="选择 NDM.exe";d.Filter="NDM|NDM.exe";if(d.ShowDialog()==DialogResult.OK)selected=d.FileName;}}
            else throw new IOException("选择类型无效");
        }catch(Exception e){failure=e;}});thread.SetApartmentState(ApartmentState.STA);thread.Start();thread.Join();if(failure!=null)throw failure;return selected;
    }
    static ClientWebSocket NdmConnect(){
        var ws=new ClientWebSocket();ws.Options.AddSubProtocol("neatextension.v1");
        try{using(var timeout=new CancellationTokenSource(4000))ws.ConnectAsync(new Uri("ws://127.0.0.1:10007/download"),timeout.Token).GetAwaiter().GetResult();return ws;}
        catch{ws.Dispose();throw;}
    }
    void EnsureNdm(){
        try{using(var ws=NdmConnect())return;}catch{}
        string exe=FindNdm(S(settings,"ndmPath"));if(exe=="")throw new IOException("未找到 NDM，请在设置中选择本机 NDM.exe");
        Process.Start(new ProcessStartInfo(exe){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Path.GetDirectoryName(exe)});
        for(int i=0;i<12;i++){Thread.Sleep(500);try{using(var ws=NdmConnect())return;}catch{}}
        throw new IOException("NDM 接收服务未连接；请打开 NDM 后测试");
    }
    internal object TestNdm(){try{EnsureNdm();return new{ok=true,message="NDM 已连接；每次下载会建立新连接",path=FindNdm(S(settings,"ndmPath"))};}catch(Exception e){return new{ok=false,message=e.Message};}}
    static Uri Trusted(string value,bool source){
        Uri u;if(!Uri.TryCreate(value,UriKind.Absolute,out u)||u.Scheme!="https"||!String.IsNullOrEmpty(u.UserInfo)||u.Port!=443)throw new IOException("更新地址必须使用 HTTPS");
        bool allowed=source?(u.Host=="raw.githubusercontent.com"||u.Host=="api.github.com"):(u.Host=="github.com"||u.Host=="release-assets.githubusercontent.com"||u.Host=="objects.githubusercontent.com");
        if(!allowed)throw new IOException("更新源只支持 GitHub 官方地址");return u;
    }
    static HttpWebResponse Open(string value,bool source){
        string url=value;ServicePointManager.SecurityProtocol|=SecurityProtocolType.Tls12;
        for(int n=0;n<8;n++){
            Uri uri=Trusted(url,source);var req=(HttpWebRequest)WebRequest.Create(uri);req.UserAgent="BeautyWeapon/"+Version;req.Timeout=30000;req.ReadWriteTimeout=30000;req.AllowAutoRedirect=false;
            var response=(HttpWebResponse)req.GetResponse();int code=(int)response.StatusCode;
            if(code>=300&&code<400){string next=response.Headers["Location"];response.Close();url=new Uri(uri,next).AbsoluteUri;continue;}return response;
        }
        throw new IOException("更新地址跳转次数过多");
    }
    static string Hash(string file){using(var h=SHA256.Create())using(var f=File.OpenRead(file))return BitConverter.ToString(h.ComputeHash(f)).Replace("-","").ToLowerInvariant();}
    static System.Version ParseVersion(string version){System.Version v;if(!System.Version.TryParse(version,out v)||v.Major<1||v.Build<0)throw new IOException("更新版本格式无效");return v;}
    static void ValidateManifest(Dictionary<string,object> d){
        if(S(d,"app")!="BeautyWeapon")throw new IOException("更新清单属于其他程序");ParseVersion(S(d,"version"));Trusted(S(d,"url"),false);
        if(!System.Text.RegularExpressions.Regex.IsMatch(S(d,"sha256"),"^[a-fA-F0-9]{64}$")||N(d,"bytes")<1000||N(d,"bytes")>2L*1024*1024*1024)throw new IOException("更新包校验信息缺失");
        string packageRoot=S(d,"root"),exe=S(d,"launcher");
        if(!System.Text.RegularExpressions.Regex.IsMatch(packageRoot,@"^美丽武器V[0-9.]+_完整包$")||!System.Text.RegularExpressions.Regex.IsMatch(exe,@"^美丽武器V[0-9.]+\.exe$"))throw new IOException("更新包目录或入口无效");
    }
    void Run(Action work){lock(gate){if(busy)throw new IOException("已有更新任务正在进行");busy=true;cancel=new CancellationTokenSource();state["ok"]=true;}ThreadPool.QueueUserWorkItem(_=>{try{work();}catch(OperationCanceledException){Set("cancelled","已取消；已下载文件和旧版均保留",0);}catch(Exception e){Set("error",e.Message,0);}finally{lock(gate)busy=false;}});}
    internal void Check(){Run(()=>{
        Set("checking","正在检查 GitHub 更新…",0);string text;
        using(var response=Open(S(settings,"source"),true))using(var r=new StreamReader(response.GetResponseStream(),Encoding.UTF8)){var sb=new StringBuilder();char[] b=new char[4096];int count;while((count=r.Read(b,0,b.Length))>0){cancel.Token.ThrowIfCancellationRequested();sb.Append(b,0,count);if(sb.Length>65536)throw new IOException("更新清单过大");}text=sb.ToString();}
        var next=Json().Deserialize<Dictionary<string,object>>(text);ValidateManifest(next);manifest=next;
        lock(gate){state["version"]=S(next,"version");state["notes"]=S(next,"notes");state["bytes"]=N(next,"bytes");}
        if(ParseVersion(S(next,"version"))>ParseVersion(Version))Set("available","发现 V"+S(next,"version")+"，正在准备下载",0);else Set("latest","当前已是最新版本 V"+Version,100);
    });}
    internal void Download(){if(manifest==null||ParseVersion(S(manifest,"version"))<=ParseVersion(Version))throw new IOException("请先检查更新");Run(()=>{
        var next=new Dictionary<string,object>(manifest);currentJob=Path.Combine(DataRoot,"updates",DateTime.UtcNow.ToString("yyyyMMddHHmmssfff")+"-"+Guid.NewGuid().ToString("N").Substring(0,6));Directory.CreateDirectory(currentJob);
        string zip=Path.Combine(currentJob,"BeautyWeapon-v"+S(next,"version")+".zip");string mode=S(settings,"downloader");
        if(mode=="ndm")try{NdmDownload(next,zip);}catch(OperationCanceledException){throw;}catch(Exception e){Set("downloading","NDM 未完成，转用内置下载器；原任务与文件保留。"+e.Message,0);Builtin(next,zip+".builtin");zip+=".builtin";}
        else Builtin(next,zip);
        cancel.Token.ThrowIfCancellationRequested();Set("verifying","正在校验更新包…",90);
        if(new FileInfo(zip).Length!=N(next,"bytes")||!String.Equals(Hash(zip),S(next,"sha256"),StringComparison.OrdinalIgnoreCase))throw new IOException("更新包大小或 SHA-256 不一致，已保留文件供排查");
        Set("installing","正在新目录安装，保留旧版…",95);
        string installed=Extract(zip,next,Directory.GetParent(root).FullName,cancel.Token);
        string entry=Path.Combine(installed,S(next,"launcher"));
        var job=new Dictionary<string,object>{{"root",installed},{"entry",entry},{"entrySha256",Hash(entry)},{"version",S(next,"version")},{"oldRoot",root},{"oldEntry",Path.Combine(root,"美丽武器V8.1.1.exe")},{"phase","ready"}};
        WritePreserving(Path.Combine(currentJob,"activation.json"),job);
        lock(gate){state["job"]=currentJob;state["installed"]=installed;state["extensionVersion"]=S(next,"extensionVersion");}
        Set("ready","更新已校验并安装；空闲时自动切换，旧版与下载包保留",100);
    });}
    void Builtin(Dictionary<string,object> next,string dest){
        Set("downloading","内置下载器正在下载…",0);
        using(var response=Open(S(next,"url"),false))using(var input=response.GetResponseStream())using(var output=new FileStream(dest,FileMode.CreateNew,FileAccess.Write,FileShare.Read)){
            byte[] buffer=new byte[131072];long total=0;int n;long limit=N(next,"bytes");while((n=input.Read(buffer,0,buffer.Length))>0){cancel.Token.ThrowIfCancellationRequested();total+=n;if(total>limit)throw new IOException("下载内容超过清单大小");output.Write(buffer,0,n);Set("downloading","内置下载器："+(total/1048576)+" / "+(limit/1048576)+" MB",(int)(total*85/limit));}
        }
    }
    IEnumerable<string> Candidates(string directory,int depth){
        string[] files;try{files=Directory.GetFiles(directory,"*.zip");}catch{yield break;}
        foreach(string file in files)yield return file;
        if(depth<=0)yield break;string[] dirs;try{dirs=Directory.GetDirectories(directory);}catch{yield break;}
        foreach(string dir in dirs){FileAttributes attributes;try{attributes=File.GetAttributes(dir);}catch{continue;}if((attributes&FileAttributes.ReparsePoint)!=0)continue;foreach(string file in Candidates(dir,depth-1))yield return file;}
    }
    void NdmDownload(Dictionary<string,object> next,string dest){
        string folder=S(settings,"ndmFolder");if(!Directory.Exists(folder))throw new IOException("NDM 下载目录不存在");EnsureNdm();cancel.Token.ThrowIfCancellationRequested();
        using(var ws=NdmConnect()){
            string url=S(next,"url"),name="BeautyWeapon-v"+S(next,"version")+".zip";
            byte[] payload=Encoding.UTF8.GetBytes("1:GET\r\n2:"+url+"\r\n6:normal\r\n4:"+name+"\r\nOrigin: https://github.com\r\n8:application/zip\r\n");
            using(var timeout=CancellationTokenSource.CreateLinkedTokenSource(cancel.Token)){timeout.CancelAfter(4000);ws.SendAsync(new ArraySegment<byte>(payload),WebSocketMessageType.Text,true,timeout.Token).GetAwaiter().GetResult();}
            Thread.Sleep(250);
        }
        Set("ndm","已发送 NDM；请允许开始下载，正在等待并校验文件…",0);
        var started=DateTime.UtcNow;var lastActivity=started;var seen=new Dictionary<string,long>();var rejected=new Dictionary<string,string>();
        while(DateTime.UtcNow-started<TimeSpan.FromHours(2)){
            cancel.Token.ThrowIfCancellationRequested();int scanned=0;
            foreach(string file in Candidates(folder,2)){
                if(++scanned>3000)break;FileInfo info;try{info=new FileInfo(file);}catch{continue;}
                long size;try{size=info.Length;}catch{continue;}
                if(info.LastWriteTimeUtc<started.AddMinutes(-1)&&size!=N(next,"bytes"))continue;
                long previous;if(!seen.TryGetValue(file,out previous)||previous!=size){seen[file]=size;if(info.LastWriteTimeUtc>started.AddSeconds(-15))lastActivity=DateTime.UtcNow;}
                if(size!=N(next,"bytes"))continue;
                string marker=size+":"+info.LastWriteTimeUtc.Ticks;string old;if(rejected.TryGetValue(file,out old)&&old==marker)continue;
                try{
                    string hash=Hash(file);if(!String.Equals(hash,S(next,"sha256"),StringComparison.OrdinalIgnoreCase)){rejected[file]=marker;continue;}
                    File.Copy(file,dest,false);if(Hash(dest)!=hash)throw new IOException("NDM 文件复制后校验失败");return;
                }catch(IOException){}
            }
            if(DateTime.UtcNow-lastActivity>TimeSpan.FromSeconds(90))throw new IOException("NDM 90 秒没有产生可用下载进度");
            cancel.Token.WaitHandle.WaitOne(1000);
        }
        throw new IOException("NDM 下载超时");
    }
    internal static string Extract(string zip,Dictionary<string,object> next,string parent,CancellationToken token){
        string folder=Path.Combine(Path.GetFullPath(parent),S(next,"root")+"_更新_"+DateTime.UtcNow.ToString("yyyyMMddHHmmssfff")+"_"+Guid.NewGuid().ToString("N").Substring(0,6));
        var plans=new List<KeyValuePair<ZipArchiveEntry,string>>();var names=new HashSet<string>(StringComparer.OrdinalIgnoreCase);long expanded=0;
        using(var archive=ZipFile.OpenRead(zip)){
            if(archive.Entries.Count>4096)throw new IOException("更新包文件数量过多");
            foreach(var item in archive.Entries){
                token.ThrowIfCancellationRequested();string name=item.FullName.Replace('\\','/');string prefix=S(next,"root")+"/";
                if(!name.StartsWith(prefix,StringComparison.Ordinal)||name.Contains(":")||name.Contains("\0")||(item.ExternalAttributes>>16&0xf000)==0xa000)throw new IOException("更新包路径不安全");
                string relative=name.Substring(prefix.Length);if(relative=="")continue;
                foreach(string segment in relative.TrimEnd('/').Split('/'))if(segment==""||segment=="."||segment==".."||segment.EndsWith(".")||segment.EndsWith(" ")||System.Text.RegularExpressions.Regex.IsMatch(segment,@"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)",System.Text.RegularExpressions.RegexOptions.IgnoreCase))throw new IOException("更新包包含无效 Windows 文件名");
                string target=Path.GetFullPath(Path.Combine(folder,relative.Replace('/',Path.DirectorySeparatorChar)));
                if(!target.StartsWith(folder+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||!names.Add(target))throw new IOException("更新包含越界或重复路径");
                expanded+=item.Length;if(expanded>2L*1024*1024*1024)throw new IOException("更新包解压体积过大");plans.Add(new KeyValuePair<ZipArchiveEntry,string>(item,target));
            }
            if(!names.Contains(Path.Combine(folder,S(next,"launcher")))||!names.Contains(Path.Combine(folder,"components","美丽武器V6.8.2_核心.exe"))||!names.Contains(Path.Combine(folder,"components","美丽武器V6.8.2_后台服务.exe")))throw new IOException("更新包关键组件缺失");
            Directory.CreateDirectory(folder);
            foreach(var pair in plans){token.ThrowIfCancellationRequested();if(pair.Key.FullName.EndsWith("/")){Directory.CreateDirectory(pair.Value);continue;}Directory.CreateDirectory(Path.GetDirectoryName(pair.Value));using(var input=pair.Key.Open())using(var output=new FileStream(pair.Value,FileMode.CreateNew,FileAccess.Write)){input.CopyTo(output);}}
        }
        string checksum=Path.Combine(folder,"资料","SHA256.txt");if(!File.Exists(checksum))throw new IOException("更新包缺少逐文件校验清单");
        var verified=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(string row in File.ReadAllLines(checksum,Encoding.UTF8)){
            token.ThrowIfCancellationRequested();if(row.Length<67||row.Substring(64,2)!="  ")throw new IOException("文件校验清单格式错误");
            string path=Path.GetFullPath(Path.Combine(folder,row.Substring(66).Replace('/',Path.DirectorySeparatorChar)));
            if(!path.StartsWith(folder+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)||!verified.Add(path)||!File.Exists(path)||Hash(path)!=row.Substring(0,64).ToLowerInvariant())throw new IOException("更新包内文件校验失败");
        }
        foreach(string file in Directory.GetFiles(folder,"*",SearchOption.AllDirectories))if(!String.Equals(file,checksum,StringComparison.OrdinalIgnoreCase)&&!verified.Contains(file))throw new IOException("更新包包含未校验文件");
        return folder;
    }
    internal void Cancel(){lock(gate)if(cancel!=null)cancel.Cancel();}
    internal void Restart(){
        lock(gate){if(S(state,"phase")!="ready"||currentJob==null)throw new IOException("更新尚未准备完成");Set("restarting","正在切换新版本…",100);}
        string exe=Path.Combine(root,"美丽武器V8.1.1.exe");
        Process.Start(new ProcessStartInfo(exe,"--activate-update \""+currentJob+"\""){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=root});
        ThreadPool.QueueUserWorkItem(_=>{Thread.Sleep(800);try{var r=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:38559/ui-exit");r.Proxy=null;r.Method="POST";r.Timeout=3000;r.ContentLength=0;using(var response=r.GetResponse()){} }catch{}});
    }
    internal static bool ForwardToActive(string root){
        try{var d=Read(Path.Combine(DataRoot,"active.json"));string exe=S(d,"entry");if(ParseVersion(S(d,"version"))<=ParseVersion(Version)||!File.Exists(exe)||Hash(exe)!=S(d,"entrySha256")||Path.GetFullPath(exe)==Path.Combine(root,"美丽武器V8.1.1.exe"))return false;
            Process.Start(new ProcessStartInfo(exe){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Path.GetDirectoryName(exe)});return true;
        }catch{return false;}
    }
    static bool PortOpen(int port){try{using(var c=new System.Net.Sockets.TcpClient()){var result=c.BeginConnect("127.0.0.1",port,null,null);if(!result.AsyncWaitHandle.WaitOne(250))return false;c.EndConnect(result);return true;}}catch{return false;}}
    internal static void Activate(string directory){
        string job=Path.GetFullPath(directory),allowed=Path.GetFullPath(Path.Combine(DataRoot,"updates"))+Path.DirectorySeparatorChar;
        if(!job.StartsWith(allowed,StringComparison.OrdinalIgnoreCase))return;
        Dictionary<string,object> d=null;
        try{
            d=Read(Path.Combine(job,"activation.json"));string entry=S(d,"entry");if(!File.Exists(entry)||Hash(entry)!=S(d,"entrySha256"))throw new IOException("新版本入口校验失败");
            bool closed=false;for(int i=0;i<80;i++){if(!PortOpen(38555)&&!PortOpen(38557)&&!PortOpen(38559)&&!PortOpen(38560)){closed=true;break;}Thread.Sleep(500);}if(!closed)throw new IOException("旧服务尚未退出，未启动新版本");
            Process.Start(new ProcessStartInfo(entry){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Path.GetDirectoryName(entry)});
            bool ready=false;for(int i=0;i<80;i++){Thread.Sleep(500);try{var r=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:38560/api/app/settings");r.Proxy=null;r.Timeout=2500;using(var response=r.GetResponse())using(var reader=new StreamReader(response.GetResponseStream())){var result=Json().Deserialize<Dictionary<string,object>>(reader.ReadToEnd());var config=result["settings"] as Dictionary<string,object>;object healthy;if(config!=null&&S(config,"version")==S(d,"version")&&result.TryGetValue("ready",out healthy)&&healthy is bool&&(bool)healthy){ready=true;break;}}}catch{}}
            if(!ready)throw new IOException("新版本未通过启动检查，旧版仍保留");
            WritePreserving(Path.Combine(DataRoot,"active.json"),d);d["phase"]="complete";WritePreserving(Path.Combine(job,"activation.json"),d);
        }catch(Exception e){if(d!=null){d["phase"]="error";d["error"]=e.Message;try{WritePreserving(Path.Combine(job,"activation.json"),d);}catch{}}MessageBox.Show(e.Message+"\n可从旧目录启动原版。","美丽武器更新提示",MessageBoxButtons.OK,MessageBoxIcon.Warning);}
    }
}
