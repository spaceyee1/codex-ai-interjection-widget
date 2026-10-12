$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
# OCR text stays inside this process. Return only the credential-risk flag.
function Test-WhaleSensitiveText([string]$Text) {
 $Text=$Text.Normalize([Text.NormalizationForm]::FormKC)
 $patterns=@(
  '\b(?:sk|sess)\s*[-−–—]\s*[A-Za-z0-9_-]{8,}',
  '\bBearer\s+[A-Za-z0-9._~+/-]{8,}={0,2}',
  '-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----',
  '(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|passwd|密码)\s*[:=]\s*["'']?[^\s"''<>]{6,}',
  '\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
  '\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})',
  '\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'
 )
 foreach($pattern in $patterns){if([regex]::IsMatch($Text,$pattern,[Text.RegularExpressions.RegexOptions]::IgnoreCase)){return $true}}
 return $false
}
# END credential-risk check
try {
 Add-Type -AssemblyName System.Runtime.WindowsRuntime
 [void][Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
 [void][Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
 [void][Windows.Graphics.Imaging.SoftwareBitmap,Windows.Foundation,ContentType=WindowsRuntime]
 [void][Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Foundation,ContentType=WindowsRuntime]
 [void][Windows.Storage.Streams.DataWriter,Windows.Foundation,ContentType=WindowsRuntime]
 [void][Windows.Globalization.Language,Windows.Foundation,ContentType=WindowsRuntime]
 $ocrTaskMethod=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'} | Select-Object -First 1
 function Wait-Ocr($Operation,[Type]$ResultType){
  $ocrTask=$ocrTaskMethod.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
  if(!$ocrTask.Wait(7000)){throw 'OCR operation timeout'}
  return $ocrTask.Result
 }
 $ocrInput=[Console]::In.ReadToEnd()
 if($ocrInput.Length -gt 6MB){throw 'Input too large'}
 $ocrBytes=[Convert]::FromBase64String($ocrInput)
 $ocrStream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
 $ocrWriter=[Windows.Storage.Streams.DataWriter]::new($ocrStream)
 $ocrWriter.WriteBytes($ocrBytes)
 [void](Wait-Ocr ($ocrWriter.StoreAsync()) ([uint32]))
 [void]$ocrWriter.DetachStream();$ocrWriter.Dispose();$ocrStream.Seek(0)
 $ocrDecoder=Wait-Ocr ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ocrStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $ocrBitmap=Wait-Ocr ($ocrDecoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $ocrLanguage=[Windows.Globalization.Language]::new('zh-Hans-CN')
 $ocrEngine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($ocrLanguage)
 if(!$ocrEngine){$ocrEngine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()}
 if(!$ocrEngine){throw 'OCR language unavailable'}
 $ocrResult=Wait-Ocr ($ocrEngine.RecognizeAsync($ocrBitmap)) ([Windows.Media.Ocr.OcrResult])
 $ocrText=([string]$ocrResult.Text).Normalize([Text.NormalizationForm]::FormKC)
 $ocrText=[regex]::Replace($ocrText,'[\u200B-\u200D\uFEFF]','')
 $ocrText=[regex]::Replace($ocrText,'\s+',' ').Trim()
 $ocrText=[regex]::Replace($ocrText,'(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])','')
 $ocrHash=[Security.Cryptography.SHA256]::Create()
 $ocrDigest=[BitConverter]::ToString($ocrHash.ComputeHash([Text.Encoding]::UTF8.GetBytes($ocrText))).Replace('-','').ToLowerInvariant()
 $ocrHash.Dispose();$ocrBitmap.Dispose();$ocrStream.Dispose()
 # Return only a digest and length: no screenshot or recognized text on disk/stdout.
 @{ok=$true;hash=$ocrDigest;length=$ocrText.Length;sensitive=(Test-WhaleSensitiveText $ocrText)}|ConvertTo-Json -Compress
}catch{
 @{ok=$false}|ConvertTo-Json -Compress
 exit 1
}
