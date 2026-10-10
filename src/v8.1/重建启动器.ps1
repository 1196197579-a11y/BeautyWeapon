$ErrorActionPreference = 'Stop'
$taskPackage = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$taskEntry = Join-Path $taskPackage '美丽武器V8.1.exe'
$taskBackup = Join-Path $PSScriptRoot ('启动器备份\' + (Get-Date -Format 'yyyyMMdd_HHmmss_fff'))
if (Test-Path -LiteralPath $taskEntry) {
    New-Item -ItemType Directory -Path $taskBackup -Force | Out-Null
    Copy-Item -LiteralPath $taskEntry -Destination $taskBackup
}
$taskRuntime = Join-Path $taskPackage 'components\runtime'
$taskUi = Join-Path $taskRuntime 'v680.js'
if (Test-Path -LiteralPath $taskUi) {
    New-Item -ItemType Directory -Path $taskBackup -Force | Out-Null
    Copy-Item -LiteralPath $taskUi -Destination $taskBackup
}
$taskParts = @('legacy-prefix.js','v8-base.js','v8-settings.js','layout.js','queue.js') | ForEach-Object { [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot $_),[System.Text.Encoding]::UTF8) }
[System.IO.File]::WriteAllText($taskUi,($taskParts -join "`n"),(New-Object System.Text.UTF8Encoding($false)))
$taskCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$taskIcon = Join-Path $PSScriptRoot 'app.ico'
$taskSources = @('LauncherV711.cs','AssistantBridge.cs','UpdateManager.cs','QueueStore.cs','QueueComposer.cs','ProcessJob.cs') | ForEach-Object { Join-Path $PSScriptRoot $_ }
& $taskCompiler /nologo /target:winexe /optimize+ "/win32icon:$taskIcon" "/out:$taskEntry" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll @taskSources
if ($LASTEXITCODE -ne 0) { throw '启动器编译失败；已有备份保留。请先关闭美丽武器。' }
Write-Host 'V8.1 启动器及前端已重建；原文件备份保留。原有 Go 核心组件保持原样。'
