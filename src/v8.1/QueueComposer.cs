using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Diagnostics;
using System.Globalization;
using System.Collections.Generic;
using System.Web.Script.Serialization;

internal static class QueueComposer {
 static readonly object processGate=new object();
 internal static volatile bool Busy;
 internal static bool InFlight(string root){foreach(string name in new[]{"ffmpeg","ffmpeg.original"})foreach(var p in Process.GetProcessesByName(name))using(p)try{if(p.MainModule.FileName.StartsWith(Path.Combine(root,"components")+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))return true;}catch{}return false;}
 static string Q(string value){return "\""+value.Replace("\"","\\\"")+"\"";}
 static string F(double n){return n.ToString("0.0000",CultureInfo.InvariantCulture);}
 static double N(Dictionary<string,object> d,string k){object v;double n;if(!d.TryGetValue(k,out v)||!double.TryParse(Convert.ToString(v,CultureInfo.InvariantCulture),NumberStyles.Float,CultureInfo.InvariantCulture,out n)||double.IsNaN(n)||double.IsInfinity(n))throw new IOException("合成参数无效："+k);return n;}
 static string Run(string exe,string args,int timeout){
  using(var job=new ProcessJob())using(var p=new Process()){p.StartInfo=new ProcessStartInfo(exe,args){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8};var stdout=new StringBuilder();var stderr=new StringBuilder();p.OutputDataReceived+=(s,e)=>{if(e.Data!=null&&stdout.Length<1048576)stdout.AppendLine(e.Data);};p.ErrorDataReceived+=(s,e)=>{if(e.Data!=null&&stderr.Length<32768)stderr.AppendLine(e.Data);};p.Start();try{job.Attach(p);}catch{try{p.Kill();}catch{}throw;}p.BeginOutputReadLine();p.BeginErrorReadLine();if(!p.WaitForExit(timeout)){try{p.Kill();p.WaitForExit(5000);}catch{}throw new IOException("FFmpeg 超时，任务未进入待播队列");}p.WaitForExit();if(p.ExitCode!=0)throw new IOException("离线合成未通过："+stderr.ToString().Substring(0,Math.Min(500,stderr.Length)));return stdout.ToString();}
 }
 static Dictionary<string,object> Probe(string root,string path,bool count){string exe=Path.Combine(root,"components","runtime","ffwrap","ffprobe.exe");if(!File.Exists(exe))exe=Path.Combine(root,"components","tools_real","ffprobe.exe");return new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(Run(exe,"-v error "+(count?"-count_frames ":"")+"-show_streams -show_format -of json "+Q(path),20000));}
 internal static void Render(string root,QueueStore store,GiftTask task,Dictionary<string,object> meta){lock(processGate){Busy=true;try{
  if(QueueStore.S(meta,"identityId")!=task.expectedId||task.profile==null||QueueStore.S(task.profile,"identityId")!=task.expectedId||QueueStore.S(meta,"templateId")!=task.templateId||String.IsNullOrEmpty(task.templateId))throw new IOException("制片任务身份或模板绑定失效");
  string video=store.SlotPath(task.slot,"video"),output=store.SlotPath(task.slot,"result");var source=Probe(root,video,false);var format=(Dictionary<string,object>)source["format"];double duration=N(format,"duration"),appear=N(meta,"appearTime");string effect=QueueStore.S(meta,"entryEffect");var effects=new Dictionary<string,double>{{"none",0},{"fade",.55},{"pop",.5},{"sweep",.7},{"revealLeft",1},{"revealRight",1}};if(!effects.ContainsKey(effect)||duration<=0||duration>180||appear<0||appear+effects[effect]+.05>=duration)throw new IOException("模板时间无效或视频超过 180 秒");
  var args=new StringBuilder("-y -hide_banner -loglevel error -threads 2 -i "+Q(video));var graph=new StringBuilder("[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=60,setsar=1[b0];");int index=0;
  foreach(string kind in new[]{"profile","deco"}){object value;var box=meta.TryGetValue(kind,out value)?value as Dictionary<string,object>:null;if(box==null){if(kind=="profile")throw new IOException("未生成已确认用户的头像昵称图层");continue;}int w=(int)Math.Round(N(box,"w")),h=(int)Math.Round(N(box,"h"));double cx=N(box,"cx"),cy=N(box,"cy");if(w<2||w>4096||h<2||h>2160||Math.Abs(cx)>3840||Math.Abs(cy)>2160)throw new IOException("叠加图层尺寸无效");string input=store.SlotPath(task.slot,kind);if(!File.Exists(input))throw new IOException("任务图层缺失");args.Append(" -loop 1 -framerate 60 -i "+Q(input));index++;string fx="",dx="";
   if(effect=="fade")fx="fade=t=in:st=0:d=0.55:alpha=1,";
   if(effect=="pop")fx="scale=w='max(1,iw*(0.72+0.28*(1-pow(1-min(t/0.5,1),3))))':h='max(1,ih*(0.72+0.28*(1-pow(1-min(t/0.5,1),3))))':eval=frame,fade=t=in:st=0:d=0.5:alpha=1,";
   if(effect=="sweep"){fx="fade=t=in:st=0:d=0.39:alpha=1,";dx="-16*(1-min(max((t-"+F(appear)+")/0.7,0),1))";}
   graph.Append("["+index+":v]scale="+w+":"+h+",format=rgba,"+fx+"setpts=PTS+"+F(appear)+"/TB[p"+index+"];[b"+(index-1)+"][p"+index+"]overlay=x='"+F(cx)+"-overlay_w/2"+dx+"':y='"+F(cy)+"-overlay_h/2':enable='gte(t,"+F(appear)+")':eof_action=pass[b"+index+"];");
  }
  args.Append(" -filter_complex_threads 1 -filter_complex "+Q(graph.ToString().TrimEnd(';'))+" -map [b"+index+"] -map 0:a? -t "+F(duration)+" -c:v libx264 -threads 2 -preset veryfast -crf 18 -pix_fmt yuv420p -r 60 -fps_mode cfr -c:a aac -b:a 192k -movflags +faststart -fs "+QueueStore.VideoLimit+" "+Q(output));
  string ff=Path.Combine(root,"components","runtime","ffwrap","ffmpeg.exe");Run(ff,args.ToString(),150000);if(!File.Exists(output)||new FileInfo(output).Length<1024||new FileInfo(output).Length>=QueueStore.VideoLimit)throw new IOException("成片超过缓存限制或为空");var result=Probe(root,output,true);var streams=(System.Collections.IEnumerable)result["streams"];var stream=streams.Cast<Dictionary<string,object>>().FirstOrDefault(x=>QueueStore.S(x,"codec_type")=="video");if(stream==null||N(stream,"width")!=1920||N(stream,"height")!=1080||Math.Abs(N(stream,"nb_read_frames")-Math.Round(duration*60))>1||QueueStore.S(stream,"r_frame_rate")!="60/1")throw new IOException("成片帧数、尺寸或帧率质检失败");
 }finally{Busy=false;}}}
}
