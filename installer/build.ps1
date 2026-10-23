param(
  [Parameter(Mandatory=$true)][string]$PackageRoot,
  [string]$OutputPath=(Join-Path $PSScriptRoot 'CodexWhale-v1.0.1-Setup-x64.exe')
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression,System.IO.Compression.FileSystem
$PackageRoot=[IO.Path]::GetFullPath($PackageRoot)
$OutputPath=[IO.Path]::GetFullPath($OutputPath)
foreach($required in @('app\desktop\main.cjs','app\用户使用方式.md','runtime\electron.exe','third-party-sources\SOURCE-MATERIALS-README.txt','setup.ps1')){
  if(!(Test-Path -LiteralPath (Join-Path $PackageRoot $required))){throw ('Missing complete package component: '+$required)}
}
if(!(Test-Path -LiteralPath (Split-Path -Parent $OutputPath))){throw 'Output parent must exist'}
if(Test-Path -LiteralPath $OutputPath){throw 'Use a new output filename'}
$zipPath=$OutputPath+'.payload.zip'
if(Test-Path -LiteralPath $zipPath){throw 'Payload output already exists'}
$archive=[IO.Compression.ZipFile]::Open($zipPath,[IO.Compression.ZipArchiveMode]::Create)
try{
  foreach($tree in @('app','runtime','third-party-sources')){
    $treeRoot=Join-Path $PackageRoot $tree
    foreach($file in Get-ChildItem -LiteralPath $treeRoot -File -Recurse -Force){
      if($file.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Package input must contain regular files'}
      $relative=$file.FullName.Substring($treeRoot.Length+1).Replace('\','/')
      if($tree -eq 'runtime' -and $relative.StartsWith('electron/dist/')){continue}
      if($relative -match '(?i)(^|/)(tests|auth\.json|config\.toml|\.env(\..*)?|companion-secret\.json|companion-settings\.json|runtime\.json|ui-state\.json|desktop-profile|.*\.log|.*\.sqlite|.*\.db)(/|$)'){throw ('Private or non-distribution input: '+$relative)}
      [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.FullName,($tree+'/'+$relative),[IO.Compression.CompressionLevel]::Optimal)
    }
  }
  foreach($file in @(@{path=(Join-Path $PackageRoot 'setup.ps1');name='setup.ps1'},@{path=(Join-Path $PackageRoot 'app\用户使用方式.md');name='用户使用方式.md'})){
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$file.path,$file.name,[IO.Compression.CompressionLevel]::Optimal)
  }
}finally{$archive.Dispose()}
$payloadHash=(Get-FileHash -LiteralPath $zipPath).Hash.ToLowerInvariant()
$infoPath=$OutputPath+'.BuildInfo.cs'
$info='using System.Reflection;[assembly:AssemblyTitle("Codex Whale Membership Installer")][assembly:AssemblyVersion("0.2.4.6")]internal static class BuildInfo{public const string Version="0.2.4+membership.6";public const string PayloadHash="'+$payloadHash+'";}'
[IO.File]::WriteAllText($infoPath,$info,[Text.UTF8Encoding]::new($false))
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler '/nologo' '/target:winexe' '/platform:x64' '/optimize+' '/reference:System.Windows.Forms.dll' '/reference:System.Drawing.dll' '/reference:System.Web.Extensions.dll' '/reference:System.IO.Compression.dll' '/reference:System.IO.Compression.FileSystem.dll' ('/win32manifest:'+(Join-Path $PSScriptRoot 'app.manifest')) ('/resource:'+$zipPath+',Whale.Payload.zip') ('/resource:'+(Join-Path $PackageRoot 'app\用户使用方式.md')+',Whale.UserGuide.md') ('/out:'+$OutputPath) $infoPath (Join-Path $PSScriptRoot 'Installer.cs')
if($LASTEXITCODE -ne 0){throw 'Installer compilation failed'}
$digest=(Get-FileHash -LiteralPath $OutputPath).Hash.ToLowerInvariant()
[IO.File]::WriteAllText(($OutputPath+'.sha256'),($digest+'  '+[IO.Path]::GetFileName($OutputPath)+[Environment]::NewLine),[Text.UTF8Encoding]::new($false))
@{file=$OutputPath;bytes=(Get-Item -LiteralPath $OutputPath).Length;sha256=$digest;payloadSha256=$payloadHash}|ConvertTo-Json
