$ErrorActionPreference = 'Stop'
$taskPackage = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$taskEntry = Join-Path $taskPackage '美丽武器V7.1.1.exe'
$taskBackup = Join-Path $PSScriptRoot ('启动器备份\' + (Get-Date -Format 'yyyyMMdd_HHmmss_fff'))
if (Test-Path -LiteralPath $taskEntry) {
    New-Item -ItemType Directory -Path $taskBackup -Force | Out-Null
    Copy-Item -LiteralPath $taskEntry -Destination $taskBackup
}
$taskCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$taskIcon = Join-Path $taskPackage 'components\runtime\v7_source\app.ico'
& $taskCompiler /nologo /target:winexe /optimize+ "/win32icon:$taskIcon" "/out:$taskEntry" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll (Join-Path $PSScriptRoot 'LauncherV711.cs') (Join-Path $PSScriptRoot 'AssistantBridge.cs') (Join-Path $PSScriptRoot 'UpdateManager.cs')
if ($LASTEXITCODE -ne 0) { throw '启动器编译失败；已有备份保留。请先关闭美丽武器。' }
Write-Host 'V7.1.1 启动器已重建；原启动器备份保留。'
