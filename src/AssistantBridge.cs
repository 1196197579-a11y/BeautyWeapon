using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Web.Script.Serialization;

internal sealed class AssistantBridge : IDisposable {
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 16 * 1024 * 1024 };
    readonly object gate = new object();
    readonly object pushGate = new object();
    HttpListener listener;
    readonly UpdateManager updates;
    readonly Func<string,object> resize;
    readonly Func<bool> appReady;
    readonly string session=Guid.NewGuid().ToString("N");
    public AssistantBridge(string root,Func<string,object> resizeAction,Func<bool> readyAction){updates=new UpdateManager(root);resize=resizeAction;appReady=readyAction;}
    Dictionary<string,object> status = new Dictionary<string,object>();
    object profile;
    long sequence;
    long acceptedAt;
    long lastPing;
    string acceptedSource = "";
    string signature = "";
    long selection;
    string selectedSource = "";
    static string Canonical(string value) { Uri u; return Uri.TryCreate(value,UriKind.Absolute,out u) ? u.GetLeftPart(UriPartial.Path).TrimEnd('/') : ""; }
    static long Selection(Dictionary<string,object> d) { object value;long number;return d.TryGetValue("selection",out value)&&Int64.TryParse(Convert.ToString(value),out number)?number:0; }
    static long Now() { return (long)(DateTime.UtcNow - new DateTime(1970,1,1)).TotalMilliseconds; }
    static string Text(Dictionary<string,object> d, string key) { object v; return d.TryGetValue(key,out v) && v != null ? Convert.ToString(v) : ""; }
    static bool IsProfile(string value) {
        Uri u;
        return Uri.TryCreate(value,UriKind.Absolute,out u) && u.Scheme == "https" &&
          (u.Host == "douyin.com" || u.Host.EndsWith(".douyin.com",StringComparison.OrdinalIgnoreCase)) &&
          System.Text.RegularExpressions.Regex.IsMatch(u.AbsolutePath,@"^/user/[^/]+/?$");
    }
    static string Relay(string path, string body, string method) {
        var r=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:38555"+path);
        r.Proxy=null; r.Method=method; r.Timeout=15000; r.ReadWriteTimeout=15000;
        if(body!=null) { byte[] b=Encoding.UTF8.GetBytes(body); r.ContentType="application/json"; r.ContentLength=b.Length; using(var s=r.GetRequestStream())s.Write(b,0,b.Length); }
        using(var response=r.GetResponse()) using(var reader=new StreamReader(response.GetResponseStream(),Encoding.UTF8))return reader.ReadToEnd();
    }
    public void Start() {
        listener=new HttpListener(); listener.Prefixes.Add("http://127.0.0.1:38560/"); listener.Start();
        var t=new Thread(()=>{ while(listener.IsListening)try{var c=listener.GetContext(); ThreadPool.QueueUserWorkItem(_=>Handle(c));}catch{break;} }); t.IsBackground=true;t.Start();
    }
    void Reply(HttpListenerContext c,int code,object value) {
        c.Response.StatusCode=code; c.Response.ContentType="application/json; charset=utf-8";
        byte[] b=Encoding.UTF8.GetBytes(json.Serialize(value));c.Response.OutputStream.Write(b,0,b.Length);c.Response.Close();
    }
    void Handle(HttpListenerContext c) {
        try {
            string origin=c.Request.Headers["Origin"];
            if(!String.IsNullOrEmpty(origin) && origin!="http://127.0.0.1:38555" && !System.Text.RegularExpressions.Regex.IsMatch(origin,@"^chrome-extension://[a-p]{32}$")){Reply(c,403,new{ok=false,error="来源不允许"});return;}
            c.Response.Headers["Access-Control-Allow-Origin"]=String.IsNullOrEmpty(origin)?"*":origin;
            c.Response.Headers["Access-Control-Allow-Methods"]="GET, POST, OPTIONS";
            c.Response.Headers["Access-Control-Allow-Headers"]="Content-Type, X-BW-Session";
            c.Response.Headers["Cache-Control"]="no-store";
            if(c.Request.HttpMethod=="OPTIONS") {Reply(c,200,new{ok=true});return;}
            string path=c.Request.Url.AbsolutePath;
            if(path.StartsWith("/api/app/",StringComparison.Ordinal) || path.StartsWith("/api/update/",StringComparison.Ordinal)) {
                if(origin!="http://127.0.0.1:38555" && !String.IsNullOrEmpty(origin)){Reply(c,403,new{ok=false,error="仅主界面可操作设置"});return;}
                if(c.Request.HttpMethod=="GET" && path=="/api/app/settings"){Reply(c,200,new{ok=true,session=session,ready=appReady(),settings=updates.Settings(),update=updates.State()});return;}
                if(c.Request.HttpMethod=="GET" && path=="/api/update/state"){Reply(c,200,updates.State());return;}
                if(c.Request.HttpMethod!="POST" || c.Request.Headers["X-BW-Session"]!=session){Reply(c,403,new{ok=false,error="请从美丽武器设置界面操作"});return;}
                if(c.Request.ContentLength64>65536){Reply(c,413,new{ok=false});return;}
                string appBody;using(var ar=new StreamReader(c.Request.InputStream,Encoding.UTF8))appBody=ar.ReadToEnd();
                if(appBody.Length>65536)throw new IOException("设置内容过大");
                var request=json.Deserialize<Dictionary<string,object>>(appBody)??new Dictionary<string,object>();
                if(path=="/api/app/window-mode"){string mode=Text(request,"mode");if(mode!="normal"&&mode!="live")throw new IOException("模式无效");Reply(c,200,resize(mode));return;}
                if(path=="/api/app/settings"){updates.SaveSettings(request);Reply(c,200,new{ok=true,settings=updates.Settings()});return;}
                if(path=="/api/app/choose-ndm"){Reply(c,200,new{ok=true,path=updates.ChoosePath(Text(request,"kind"))});return;}
                if(path=="/api/update/ndm-test"){Reply(c,200,updates.TestNdm());return;}
                if(path=="/api/update/check"){updates.Check();Reply(c,200,updates.State());return;}
                if(path=="/api/update/download"){updates.Download();Reply(c,200,updates.State());return;}
                if(path=="/api/update/cancel"){updates.Cancel();Reply(c,200,updates.State());return;}
                if(path=="/api/update/restart"){updates.Restart();Reply(c,200,new{ok=true});return;}
                Reply(c,404,new{ok=false});return;
            }
            if(c.Request.HttpMethod=="GET" && path=="/api/assistant-state") {
                lock(gate) Reply(c,200,new{ok=true,version="7.1.1",connected=Now()-lastPing<10000,status=status,profile=profile,profileSeq=sequence,selection=selection,acceptedAt=acceptedAt,acceptedSource=acceptedSource});return;
            }
            if(c.Request.HttpMethod=="GET" && path=="/api/state") { Reply(c,200,json.DeserializeObject(Relay("/api/state",null,"GET")));return; }
            if(c.Request.HttpMethod!="POST") {Reply(c,404,new{ok=false,error="接口不存在"});return;}
            if(c.Request.ContentLength64>65536) {Reply(c,413,new{ok=false,error="请求过大"});return;}
            string body; using(var r=new StreamReader(c.Request.InputStream,Encoding.UTF8))body=r.ReadToEnd();
            if(body.Length>65536){Reply(c,413,new{ok=false,error="请求过大"});return;}
            if(path=="/api/ping") { lock(gate)lastPing=Now();Relay("/api/ping","{}","POST");Reply(c,200,new{ok=true,version="7.1.1"});return;}
            var d=json.Deserialize<Dictionary<string,object>>(body);
            if(d==null)throw new ArgumentException("请求内容为空");
            if(path=="/api/read-status") {
                string kind=Text(d,"status"),source=Text(d,"sourceUrl");
                if(kind!="not-profile" && !IsProfile(source)) {Reply(c,400,new{ok=false,error="仅接收抖音用户主页"});return;}
                if(!new List<string>{"loading","incomplete","ready","error","not-profile"}.Contains(kind)){Reply(c,400,new{ok=false,error="状态无效"});return;}
                lock(gate){
                    long incoming=Selection(d);
                    if(incoming<selection){Reply(c,200,new{ok=true,ignored=true});return;}
                    if(incoming==selection && selectedSource!="" && kind!="not-profile" && Canonical(source)!=selectedSource){Reply(c,200,new{ok=true,ignored=true});return;}
                    selection=incoming;if(kind!="not-profile")selectedSource=Canonical(source);
                    lastPing=Now(); status=new Dictionary<string,object>{{"status",kind},{"sourceUrl",source},{"detail",Text(d,"detail")},{"updatedAt",Now()}};
                }
                Reply(c,200,new{ok=true});return;
            }
            if(path=="/api/douyin-profile") {
                string name=Text(d,"nickname").Trim(),source=Text(d,"sourceUrl"),avatar=Text(d,"avatarUrl");Uri av;
                if(name.Length<1 || name.Length>256 || !IsProfile(source) || !Uri.TryCreate(avatar,UriKind.Absolute,out av) || av.Scheme!="https" || avatar.Length>8192){Reply(c,400,new{ok=false,error="头像、昵称或主页地址不完整"});return;}
                string sig=name+"\n"+source.Split('?')[0]+"\n"+avatar;
                lock(pushGate) {
                    long requestSelection=Selection(d);
                    lock(gate){if(requestSelection<selection || selectedSource!=""&&Canonical(source)!=selectedSource){Reply(c,200,new{ok=true,ignored=true});return;}}
                    object forced;bool force=d.TryGetValue("force",out forced)&&forced is bool&&(bool)forced;
                    bool same;lock(gate)same=sig==signature && profile!=null && !force;
                    if(!same) {
                        var clean=new Dictionary<string,object>{{"nickname",name},{"sourceUrl",source},{"avatarUrl",avatar},{"title",Text(d,"title")}};
                        Relay("/api/ping","{}","POST");Relay("/api/douyin-profile",json.Serialize(clean),"POST");
                        var state=json.Deserialize<Dictionary<string,object>>(Relay("/api/state",null,"GET"));object p;
                        if(!state.TryGetValue("profile",out p) || p==null)throw new IOException("主程序尚未接收用户资料");
                        var native=p as Dictionary<string,object>;
                        if(native==null || Text(native,"nickname")!=name || Text(native,"sourceUrl").Split('?')[0]!=source.Split('?')[0] || String.IsNullOrWhiteSpace(Text(native,"avatarDataUrl")))throw new IOException("头像下载失败，请稍后重试；未沿用旧头像");
                        lock(gate){if(requestSelection<selection || selectedSource!=""&&Canonical(source)!=selectedSource){Reply(c,200,new{ok=true,ignored=true});return;}profile=p;signature=sig;sequence++;acceptedAt=Now();acceptedSource=source;}
                    }
                    lock(gate){if(requestSelection<selection){Reply(c,200,new{ok=true,ignored=true});return;}lastPing=Now();status=new Dictionary<string,object>{{"status","ready"},{"sourceUrl",source},{"detail","头像和昵称已读取"},{"updatedAt",Now()}};}
                    Reply(c,200,new{ok=true,version="7.1.1",duplicate=same});return;
                }
            }
            Reply(c,404,new{ok=false,error="接口不存在"});
        } catch(Exception e) {
            try{Reply(c,502,new{ok=false,error=e.Message});}catch{}
        }
    }
    public void Dispose(){try{listener.Stop();listener.Close();}catch{}}
}
