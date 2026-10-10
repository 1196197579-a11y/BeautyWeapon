using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Diagnostics;
internal sealed class ProcessJob:IDisposable {
 [StructLayout(LayoutKind.Sequential)] struct Basic {public long PerProcess,PerJob;public uint Flags;public UIntPtr Min,Max;public uint Active;public UIntPtr Affinity;public uint Priority,Scheduling;}
 [StructLayout(LayoutKind.Sequential)] struct Io {public ulong Read,Write,Other,ReadBytes,WriteBytes,OtherBytes;}
 [StructLayout(LayoutKind.Sequential)] struct Limits {public Basic Basic;public Io Io;public UIntPtr ProcessMemory,JobMemory,PeakProcess,PeakJob;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CreateJobObject(IntPtr security,string name);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool SetInformationJobObject(IntPtr job,int cls,ref Limits limits,int size);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr handle);
 IntPtr handle;
 internal ProcessJob(){handle=CreateJobObject(IntPtr.Zero,null);var limits=new Limits();limits.Basic.Flags=0x2000|0x200;limits.JobMemory=new UIntPtr(768U*1024*1024); if(handle==IntPtr.Zero||!SetInformationJobObject(handle,9,ref limits,Marshal.SizeOf(limits)))throw new Win32Exception(Marshal.GetLastWin32Error());}
 internal void Attach(Process p){if(!AssignProcessToJobObject(handle,p.Handle))throw new Win32Exception(Marshal.GetLastWin32Error());}
 public void Dispose(){if(handle!=IntPtr.Zero){CloseHandle(handle);handle=IntPtr.Zero;}}
}
