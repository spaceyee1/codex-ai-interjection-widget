import fs from 'node:fs'
import path from 'node:path'
import {execFile} from 'node:child_process'

const POWERSHELL='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
// Public installation metadata only. No PATH lookup, config/auth file, or CLI
// invocation occurs here. The fixed script verifies OpenAI's Authenticode signer.
const DISCOVERY_SCRIPT=String.raw`$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
function SafePath([string]$name) {
  if($name -notmatch '^[A-Za-z]:\\' -or $name.StartsWith('\\')){return $false}
  try {
    $full=[IO.Path]::GetFullPath($name)
    if($full -cne $name){return $false}
    $item=Get-Item -LiteralPath $name -Force
    if($item.PSIsContainer){return $false}
    $current=$name
    while($current){
      $part=Get-Item -LiteralPath $current -Force
      if(($part.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){return $false}
      $parent=[IO.Path]::GetDirectoryName($current)
      if(!$parent -or $parent -eq $current){break};$current=$parent
    }
    return $true
  }catch{return $false}
}
function Candidate([string]$file,[string]$root,[string]$source,[bool]$running) {
  if(!(SafePath $file)){return}
  $relative=$file.Substring($root.Length).TrimStart('\')
  if($source -eq 'local-bin' -and $relative -notmatch '^(?:[a-fA-F0-9]{8,64}\\)?codex\.exe$'){return}
  if($source -eq 'appx' -and $relative -notmatch '^(?:app\\)?resources\\(?:bin\\)?codex\.exe$'){return}
  [PSCustomObject]@{executable=$file;root=$root;source=$source;running=$running;modified=(Get-Item -LiteralPath $file).LastWriteTimeUtc}
}
try {
  $local=[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
  $localRoots=@();if($local){$localRoots=@((Join-Path $local 'OpenAI\Codex\bin'),(Join-Path $local 'Programs\OpenAI\Codex\bin'))}
  $packages=@();try{$packages=@(Get-AppxPackage -Name 'OpenAI.Codex*' -ErrorAction SilentlyContinue | Where-Object {$_.Name -match '^OpenAI\.Codex$' -and $_.InstallLocation})}catch{}
  $running=@();try{$running=@(Get-Process -Name codex -ErrorAction SilentlyContinue | ForEach-Object {$_.Path} | Where-Object {$_})}catch{}
  $candidates=@()
  foreach($localRoot in $localRoots){if(!(Test-Path -LiteralPath $localRoot -PathType Container)){continue}
    foreach($file in $running){if($file.StartsWith($localRoot+'\',[StringComparison]::OrdinalIgnoreCase)){$candidates+=@(Candidate $file $localRoot 'local-bin' $true)}}
    $candidates+=@(Candidate (Join-Path $localRoot 'codex.exe') $localRoot 'local-bin' $false)
    foreach($dir in @(Get-ChildItem -LiteralPath $localRoot -Directory -ErrorAction SilentlyContinue | Where-Object {$_.Name -match '^[a-fA-F0-9]{8,64}$'})){
      $candidates+=@(Candidate (Join-Path $dir.FullName 'codex.exe') $localRoot 'local-bin' $false)
    }
  }
  foreach($package in $packages){
    $root=$package.InstallLocation.TrimEnd('\')
    if($root -notmatch '^[A-Za-z]:\\Program Files\\WindowsApps\\OpenAI\.Codex_[A-Za-z0-9._~-]+$'){continue}
    foreach($suffix in @('app\resources\codex.exe','resources\codex.exe','app\resources\bin\codex.exe','resources\bin\codex.exe')){
      $file=Join-Path $root $suffix;$candidates+=@(Candidate $file $root 'appx' ($running -contains $file))
    }
  }
  $seen=@{}
  foreach($candidate in @($candidates | Where-Object {$_} | Sort-Object @{Expression='running';Descending=$true},@{Expression='modified';Descending=$true})){
    $file=$candidate.executable;$id=$file.ToLowerInvariant();if($seen.ContainsKey($id)){continue};$seen[$id]=$true
    try {
      $signature=Get-AuthenticodeSignature -LiteralPath $file
      if($signature.Status -ne 'Valid' -or !$signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch '(?:^|,\s*)O="?OpenAI OpCo, LLC"?(?:,|$)'){continue}
      if(!(SafePath $file)){continue}
      [Console]::Out.Write((@{executable=$file;root=$candidate.root;source=$candidate.source;signatureValid=$true;publisher='OpenAI OpCo, LLC'} | ConvertTo-Json -Compress));exit 0
    }catch{}
  }
  [Console]::Out.Write('null')
}catch{[Console]::Out.Write('null')}`

const cacheByRunner=new WeakMap()
function absoluteWindows(value){
  return typeof value==='string'&&value.length<=1024&&/^[A-Za-z]:\\/.test(value)&&!/[\x00-\x1f]/.test(value)&&!value.slice(2).includes(':')&&path.win32.normalize(value)===value
}
function acceptedResult(value){
  if(!value||value.signatureValid!==true||value.publisher!=='OpenAI OpCo, LLC'||!absoluteWindows(value.executable)||!absoluteWindows(value.root))return null
  const relative=path.win32.relative(value.root,value.executable)
  if(value.source==='local-bin'){
    if(!/\\OpenAI\\Codex\\bin$/i.test(value.root)||!/^(?:[a-f0-9]{8,64}\\)?codex\.exe$/i.test(relative))return null
  }else if(value.source==='appx'){
    if(!/^[A-Za-z]:\\Program Files\\WindowsApps\\OpenAI\.Codex_[A-Za-z0-9._~-]+$/i.test(value.root)||!/^(?:app\\)?resources\\(?:bin\\)?codex\.exe$/i.test(relative))return null
  }else return null
  return value.executable
}
function metadata(executable,fsImpl){
  try{
    let current=executable
    while(true){const part=fsImpl.lstatSync(current,{bigint:true});if(part.isSymbolicLink()||current===executable&&!part.isFile()||current!==executable&&!part.isDirectory())return null;const parent=path.win32.dirname(current);if(parent===current)break;current=parent}
    if(path.win32.resolve(fsImpl.realpathSync(executable)).toLowerCase()!==executable.toLowerCase())return null
    const stat=fsImpl.lstatSync(executable,{bigint:true})
    return [stat.dev,stat.ino,stat.size,stat.mtimeNs,stat.ctimeNs].join(':')
  }catch{return null}
}

/** Returns an authenticated official Windows CLI path, or null. No raw errors. */
export async function discoverCodexExecutable({execFileImpl=execFile,fsImpl=fs,platform=process.platform,clock=Date.now,cacheTtlMs=300000,timeoutMs=5000,signal}={}){
  if(platform!=='win32'||typeof execFileImpl!=='function'||typeof clock!=='function'||!Number.isInteger(cacheTtlMs)||cacheTtlMs<0||cacheTtlMs>300000||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)return null
  if(signal&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean'))return null
  if(signal?.aborted)return null
  let cache=cacheByRunner.get(execFileImpl)
  const now=clock()
  if(cache?.pending&&!signal)return cache.pending
  if(cache&&!cache.pending&&now>=cache.at&&now-cache.at<(cache.executable?cacheTtlMs:Math.min(cacheTtlMs,30000))&&cache.fsImpl===fsImpl){
    if(!cache.executable)return null
    if(metadata(cache.executable,fsImpl)===cache.signature)return cache.executable
  }
  const priorCache=cache
  cache={at:now,fsImpl,executable:null,signature:null,pending:null}
  // Cancellable calls own their helper. Aborting one query cannot kill another
  // caller's discovery or replace a newer verified cache entry with null.
  if(!signal)cacheByRunner.set(execFileImpl,cache)
  cache.pending=new Promise(resolve=>{
    let settled=false,timer,child,killed=false,aborted=false
    const kill=()=>{if(!child||killed)return;killed=true;try{child.kill()}catch{}}
    const finish=value=>{
      if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',onAbort)
      const signature=value?metadata(value,fsImpl):null;cache.executable=signature?value:null;cache.signature=signature;cache.at=clock()
      if(signal&&!aborted&&cacheByRunner.get(execFileImpl)===priorCache)cacheByRunner.set(execFileImpl,cache)
      resolve(cache.executable)
    }
    const onAbort=()=>{aborted=true;kill();finish(null)}
    timer=setTimeout(()=>{kill();finish(null)},timeoutMs)
    signal?.addEventListener('abort',onAbort,{once:true})
    if(signal?.aborted){onAbort();return}
    try{
      child=execFileImpl(POWERSHELL,['-NoLogo','-NoProfile','-NonInteractive','-Command',DISCOVERY_SCRIPT],{windowsHide:true,timeout:timeoutMs,maxBuffer:16384,encoding:'utf8',cwd:'C:\\Windows\\System32',env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows'}},(error,stdout,stderr)=>{
        if(error||typeof stdout!=='string'||stdout.length>16384||String(stderr||'').trim()){finish(null);return}
        try{const executable=acceptedResult(JSON.parse(stdout));finish(executable&&metadata(executable,fsImpl)?executable:null)}catch{finish(null)}
      })
      if(aborted)kill()
    }catch{finish(null)}
  })
  try{return await cache.pending}finally{cache.pending=null}
}
