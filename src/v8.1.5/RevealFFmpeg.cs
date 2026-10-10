using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
class RevealFFmpeg {
 static string Quote(string s) { return "\""+Regex.Replace(Regex.Replace(s,@"(\\*)""", "$1$1\\\""),@"(\\+)$","$1$1")+"\""; }
 static string Direction(string path) {
  if(!File.Exists(path)) return "";
  using(var f=File.OpenRead(path)) { var b=new byte[(int)Math.Min(64,f.Length)]; f.Seek(-b.Length,SeekOrigin.End); f.Read(b,0,b.Length); var s=Encoding.ASCII.GetString(b); if(s.Contains("BW_REVEAL_V1:left"))return "left"; if(s.Contains("BW_REVEAL_V1:right"))return "right"; }
  return "";
 }
 static int Main(string[] args) {
  try {
   var directions=new Dictionary<int,string>(); int input=0;
   for(int i=0;i<args.Length-1;i++) if(args[i]=="-i") { var d=Direction(args[i+1]); if(d!="") directions.Add(input,d); input++; }
   for(int i=0;i<args.Length-1;i++) if(args[i]=="-filter_complex" && directions.Count>0) {
    args[i+1]=Regex.Replace(args[i+1],@"\[(\d+):v\]scale=\d+:\d+,format=rgba,",m=>{
     string d; if(!directions.TryGetValue(int.Parse(m.Groups[1].Value),out d))return m.Value;
     string x=d=="right"?"X/W":"(W-1-X)/W";
     string n=m.Groups[1].Value;
     return m.Value+"split[bwrevColor"+n+"][bwrevAlpha"+n+"];[bwrevAlpha"+n+"]alphaextract,geq=lum='p(X,Y)*clip((T*1.12-"+x+")/0.12,0,1)':enable='lt(t,1)'[bwrevMask"+n+"];[bwrevColor"+n+"][bwrevMask"+n+"]alphamerge,";
    });
   }
   string original=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"ffmpeg.original.exe");
   var quoted=new string[args.Length]; for(int i=0;i<args.Length;i++)quoted[i]=Quote(args[i]);
   var start=new ProcessStartInfo(original,string.Join(" ",quoted));
   start.UseShellExecute=false; start.CreateNoWindow=true; start.RedirectStandardOutput=true; start.RedirectStandardError=true;
   using(var p=Process.Start(start)) {
    var output=p.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput());
    var error=p.StandardError.BaseStream.CopyToAsync(Console.OpenStandardError());
    p.WaitForExit(); Task.WaitAll(output,error); return p.ExitCode;
   }
  } catch(Exception e) { Console.Error.WriteLine("Directional reveal: "+e.Message); return 1; }
 }
}
