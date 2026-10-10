using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Collections.Generic;

[assembly: System.Reflection.AssemblyTitle("美丽武器 V8.1.3")]
[assembly: System.Reflection.AssemblyVersion("8.1.3.0")]
internal static class Launcher {
    static AssistantBridge bridge;
    static void HoldBridge() { int misses=0; while(misses<6) { Thread.Sleep(500); if(IsOwn(PortOwner(38557)))misses=0;else misses++; } }
    static readonly string Root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
    static readonly string EngineRoot = Path.Combine(Root,"components");
    static readonly string Original = Path.Combine(EngineRoot, "美丽武器V6.8.2_原始启动器.exe");
    static readonly string LogFile = Path.Combine(EngineRoot, "logs", "启动修复.log");
    const string Url = "http://127.0.0.1:38555/";
    const string Profile = @"C:\Users\Public\BeautyWeaponUI";
    delegate bool EnumCallback(IntPtr hwnd, IntPtr unused);
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumCallback callback, IntPtr unused);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr hwnd, int command);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("iphlpapi.dll")] static extern uint GetExtendedTcpTable(IntPtr table, ref int size, bool sort, int family, int tableClass, uint reserved);

    static void Log(string text) { try { Directory.CreateDirectory(Path.GetDirectoryName(LogFile)); File.AppendAllText(LogFile, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff ") + text + Environment.NewLine, Encoding.UTF8); } catch {} }
    static string ReadUrl(string url) {
        try { var r=(HttpWebRequest)WebRequest.Create(url); r.Proxy=null; r.Timeout=900; r.ReadWriteTimeout=900;
            using(var response=r.GetResponse()) using(var reader=new StreamReader(response.GetResponseStream())) return reader.ReadToEnd();
        } catch { return ""; }
    }
    static int PortOwner(int port) {
        int size=0; GetExtendedTcpTable(IntPtr.Zero, ref size, false, 2, 3, 0);
        IntPtr buffer=Marshal.AllocHGlobal(size);
        try {
            if(GetExtendedTcpTable(buffer, ref size, false, 2, 3, 0)!=0) throw new IOException("无法检查本地端口占用。");
            int count=Marshal.ReadInt32(buffer);
            for(int i=0;i<count;i++) { int offset=4+i*24; int p=Marshal.ReadByte(buffer,offset+8)*256+Marshal.ReadByte(buffer,offset+9);
                if(p==port) return Marshal.ReadInt32(buffer,offset+20); }
            return 0;
        } finally { Marshal.FreeHGlobal(buffer); }
    }
    static bool IsOwn(int pid) {
        if(pid==0) return false;
        try { using(var p=Process.GetProcessById(pid)) {
            string path=p.MainModule.FileName;
            string name=Path.GetFileName(path);
            return string.Equals(Path.GetDirectoryName(path),EngineRoot,StringComparison.OrdinalIgnoreCase) &&
              (name=="美丽武器V6.8.2_原始启动器.exe" || name=="美丽武器V6.8.2_核心.exe" || name=="美丽武器V6.8.2_后台服务.exe");
        }} catch { return false; }
    }
    static bool Ready() {
        if(!IsOwn(PortOwner(38555)) || !IsOwn(PortOwner(38557))) return false;
        return ReadUrl(Url).Contains("美丽武器 V7.1") && ReadUrl("http://127.0.0.1:38557/v680.js").Contains("v680Compose");
    }
    static List<IntPtr> FindWindows() {
        var found=new List<IntPtr>();
        EnumWindows(delegate(IntPtr h,IntPtr unused) {
            var title=new StringBuilder(1024); GetWindowText(h,title,title.Capacity);
            if(!title.ToString().StartsWith("美丽武器 V8.1.3",StringComparison.Ordinal)) return true;
            uint pid; GetWindowThreadProcessId(h,out pid);
            try { using(var p=Process.GetProcessById((int)pid)) {
                if(!string.Equals(p.ProcessName,"msedge",StringComparison.OrdinalIgnoreCase)) return true;
                if(!ReadCommandLine(p).Contains("--app="+Url))return true;
                Rect r; GetWindowRect(h,out r);
                Log("WINDOW hwnd="+h+" pid="+pid+" visible="+IsWindowVisible(h)+" minimized="+IsIconic(h)+" rect="+r.Left+","+r.Top+","+r.Right+","+r.Bottom);
                found.Add(h);return false;
            }} catch {} return true;
        },IntPtr.Zero);
        return found;
    }
    static Rectangle SafeBounds() {
        Rectangle area=Screen.PrimaryScreen.WorkingArea;
        int w=Math.Min(1500,area.Width-32),h=Math.Min(940,area.Height-32);
        return new Rectangle(area.Left+(area.Width-w)/2,area.Top+(area.Height-h)/2,w,h);
    }
    static bool RecoverWindow() {
        var windows=FindWindows(); if(windows.Count==0) return false;
        IntPtr h=windows[0]; AppWindow=h;
        if(IsIconic(h)) ShowWindowAsync(h,9); else if(!IsWindowVisible(h)) ShowWindowAsync(h,5);
        Thread.Sleep(150);
        Rect r; GetWindowRect(h,out r); var bounds=Rectangle.FromLTRB(r.Left,r.Top,r.Right,r.Bottom);
        bool accessible=false;
        foreach(var screen in Screen.AllScreens) { var overlap=Rectangle.Intersect(bounds,screen.WorkingArea); if(overlap.Width>=320 && overlap.Height>=200) accessible=true; }
        if(!accessible) { var b=SafeBounds(); SetWindowPos(h,IntPtr.Zero,b.X,b.Y,b.Width,b.Height,0x0040); Log("WINDOW repositioned into primary display"); }
        // Briefly raise and immediately clear topmost; leave ordinary stacking behavior intact.
        SetWindowPos(h,new IntPtr(-1),0,0,0,0,0x0043);
        SetWindowPos(h,new IntPtr(-2),0,0,0,0,0x0043);
        SetForegroundWindow(h);
        bool visible=IsWindowVisible(h); Log("WINDOW restored visible="+visible); return visible;
    }
    static void RecoverEdge() {
        string edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),@"Microsoft\Edge\Application\msedge.exe");
        if(!File.Exists(edge)) edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),@"Microsoft\Edge\Application\msedge.exe");
        if(!File.Exists(edge)) throw new FileNotFoundException("未找到 Microsoft Edge，无法显示主界面。");
        var b=SafeBounds();
        var start=new ProcessStartInfo(edge,"--user-data-dir=\""+Profile+"\" --app="+Url+" --no-first-run --window-position="+b.X+","+b.Y+" --window-size="+b.Width+","+b.Height);
        start.UseShellExecute=false; start.WorkingDirectory=Root; start.WindowStyle=ProcessWindowStyle.Hidden;
        using(var p=Process.Start(start)) { Log("EDGE recovery requested pid="+p.Id); }
    }
    static void ClearStaleServices() {
        // Only processes from this exact installation may be stopped, and only while its services are unhealthy.
        foreach(int port in new[]{38555,38556,38557,38559}) { int owner=PortOwner(port); if(owner!=0&&!IsOwn(owner)) throw new IOException("端口 "+port+" 被其他程序或另一份美丽武器占用。请关闭该程序后重试；本次没有结束其他程序。"); }
        foreach(string name in new[]{"美丽武器V6.8.2_原始启动器","美丽武器V6.8.2_后台服务","美丽武器V6.8.2_核心"}) {
            foreach(var p in Process.GetProcessesByName(name)) using(p) { if(IsOwn(p.Id)) { Log("STALE stop pid="+p.Id+" name="+name); try { p.Kill(); p.WaitForExit(4000); } catch(Exception e) { Log(e.Message); } } }
        }
        Thread.Sleep(300);
        foreach(int port in new[]{38555,38556,38557,38559}) if(PortOwner(port)!=0) throw new IOException("旧服务未能退出，请查看 logs\\启动修复.log。");
    }

    static readonly object WindowGate=new object();
    static IntPtr AppWindow;
    static bool AppReady(){return AppWindow!=IntPtr.Zero&&IsWindowVisible(AppWindow)&&Ready();}
    static Rect normalBounds;
    static bool savedNormal=false,normalMaximized=false,liveWindow=false;
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr hwnd);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hwnd);
    [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr process,int info,IntPtr buffer,int length,out int needed);
    [StructLayout(LayoutKind.Sequential)] struct UnicodeString {public ushort Length,MaximumLength;public IntPtr Buffer;}
    static string ReadCommandLine(Process process){
        int needed;NtQueryInformationProcess(process.Handle,60,IntPtr.Zero,0,out needed);if(needed<16||needed>65536)return "";
        IntPtr memory=Marshal.AllocHGlobal(needed);try{if(NtQueryInformationProcess(process.Handle,60,memory,needed,out needed)!=0)return "";var text=(UnicodeString)Marshal.PtrToStructure(memory,typeof(UnicodeString));return Marshal.PtrToStringUni(text.Buffer,text.Length/2)??"";}finally{Marshal.FreeHGlobal(memory);}
    }
    [StructLayout(LayoutKind.Sequential)] struct MonitorInfo {public int Size;public Rect Monitor,Work;public int Flags;}
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd,uint flags);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern bool GetMonitorInfo(IntPtr monitor,ref MonitorInfo info);
    internal static object ResizeAppWindow(string mode) {
        Log("RESIZE request="+mode);
        lock(WindowGate) {
            IntPtr hwnd=AppWindow;if(hwnd==IntPtr.Zero)throw new IOException("主窗口尚未就绪，请稍后重试");
            Rect current;GetWindowRect(hwnd,out current);
            if(mode=="live" && !liveWindow) {
                normalBounds=current;normalMaximized=IsZoomed(hwnd);savedNormal=true;
                var info=new MonitorInfo();info.Size=Marshal.SizeOf(typeof(MonitorInfo));if(!GetMonitorInfo(MonitorFromWindow(hwnd,2),ref info))throw new IOException("无法读取屏幕工作区");var area=info.Work;
                double scale=1;try{scale=GetDpiForWindow(hwnd)/96.0;}catch{}
                int width=Math.Min((int)Math.Round(720*scale),area.Right-area.Left-16),height=Math.Min((int)Math.Round(760*scale),area.Bottom-area.Top-16);
                int x=Math.Max(area.Left,Math.Min(current.Left,area.Right-width)),y=Math.Max(area.Top,Math.Min(current.Top,area.Bottom-height));
                if(normalMaximized)ShowWindowAsync(hwnd,9);
                SetWindowPos(hwnd,IntPtr.Zero,x,y,width,height,0x4044);liveWindow=true;
                for(int attempt=0;attempt<20;attempt++){Thread.Sleep(30);GetWindowRect(hwnd,out current);if(current.Right-current.Left==width&&current.Bottom-current.Top==height)break;}
            } else if(mode=="normal" && liveWindow) {
                if(savedNormal){SetWindowPos(hwnd,IntPtr.Zero,normalBounds.Left,normalBounds.Top,normalBounds.Right-normalBounds.Left,normalBounds.Bottom-normalBounds.Top,0x4044);if(normalMaximized)ShowWindowAsync(hwnd,3);Thread.Sleep(100);}
                liveWindow=false;
            }
            GetWindowRect(hwnd,out current);Log("RESIZE done="+mode+" size="+(current.Right-current.Left)+","+(current.Bottom-current.Top));return new{ok=true,mode=liveWindow?"live":"normal",width=current.Right-current.Left,height=current.Bottom-current.Top,maximized=IsZoomed(hwnd)};
        }
    }
    [STAThread] static void Main(string[] args) {
        if(args.Length>0 && args[0]=="--bridge-only") { using(var b=new AssistantBridge(Root, ResizeAppWindow, AppReady)){b.Start();while(true)Thread.Sleep(1000);} }
        if(args.Length>1 && args[0]=="--activate-update") { UpdateManager.Activate(args[1]); return; }
        if((args.Length==0 || args[0]!="--skip-active") && UpdateManager.ForwardToActive(Root))return;
        Application.EnableVisualStyles();
        bool owns=false;
        string identity;
        using(var hash=SHA256.Create()) identity=BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(Root.ToLowerInvariant()))).Replace("-","").Substring(0,24);
        using(var gate=new Mutex(false,@"Local\BeautyWeapon711Repair_"+identity)) {
            try {
                try { owns=gate.WaitOne(0); } catch(AbandonedMutexException) { owns=true; }
                if(!owns) { if(Ready())RecoverWindow(); Log("LAUNCH existing V7 session reused"); return; }
                Log("LAUNCH repair=8.1.3.0 root="+Root);
                if(!File.Exists(Original)) throw new FileNotFoundException("缺少原始启动器，请保留完整文件夹。",Original);
                if(!Ready()) {
                    bool occupied=false; foreach(int port in new[]{38555,38556,38557,38559}) if(PortOwner(port)!=0) occupied=true;
                    if(occupied) { for(int i=0;i<15 && !Ready();i++) Thread.Sleep(400); }
                    if(!Ready()) {
                        ClearStaleServices();
                        bridge=new AssistantBridge(Root, ResizeAppWindow, AppReady); bridge.Start();
                        var start=new ProcessStartInfo(Original) { WorkingDirectory=EngineRoot,UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden };
                        start.EnvironmentVariables["PATH"]=Path.Combine(EngineRoot,"runtime","ffwrap")+";"+Path.Combine(EngineRoot,"tools_real","bin")+";"+Environment.GetEnvironmentVariable("PATH");
                        using(var p=Process.Start(start)) Log("SERVICE original launcher started pid="+p.Id);
                        var deadline=DateTime.UtcNow.AddSeconds(30);
                        while(DateTime.UtcNow<deadline && !Ready()) Thread.Sleep(300);
                        if(!Ready()) throw new IOException("后台服务未能正常启动，请查看 logs 文件夹内最新日志。");
                    }
                } else Log("SERVICE existing healthy instance reused");
                for(int i=0;i<20;i++) { if(RecoverWindow()) { Log("SUCCESS existing window"); if(bridge!=null)HoldBridge(); return; } Thread.Sleep(250); }
                RecoverEdge();
                for(int i=0;i<60;i++) { if(RecoverWindow()) { Log("SUCCESS recovered app window"); if(bridge!=null)HoldBridge(); return; } Thread.Sleep(250); }
                throw new IOException("服务已启动，但独立窗口没有出现。可临时访问 "+Url+"；请查看 logs\\启动修复.log。");
            } catch(Exception e) { Log("ERROR "+e); MessageBox.Show(e.Message,"美丽武器 V8.1.3 启动提示",MessageBoxButtons.OK,MessageBoxIcon.Warning); }
            finally { if(bridge!=null)bridge.Dispose(); if(owns) gate.ReleaseMutex(); }
        }
    }
}
