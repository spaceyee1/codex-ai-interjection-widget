'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
exports.createLocalTextReader=function(){
  const children=new Set();
  async function fingerprint(bytes){
    if(process.platform!=='win32'||!Buffer.isBuffer(bytes)||bytes.length>4*1024*1024)return {ok:false};
    return new Promise(resolve=>{
      let child,timer,output='',done=false;
      const finish=result=>{if(done)return;done=true;clearTimeout(timer);if(child){children.delete(child);child.kill();}resolve(result);};
      try{
        child=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'local-text.ps1')],{windowsHide:true,stdio:['pipe','pipe','ignore']});
        children.add(child);timer=setTimeout(()=>finish({ok:false}),10000);timer.unref?.();
        child.on('error',()=>finish({ok:false}));child.stdin.on('error',()=>finish({ok:false}));
        child.stdout.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>4096)finish({ok:false});});
        child.on('close',()=>{try{const result=JSON.parse(output.replace(/^\uFEFF/,''));finish(result.ok===true&&/^[a-f0-9]{64}$/.test(result.hash)&&Number.isSafeInteger(result.length)&&result.length>=0&&typeof result.sensitive==='boolean'?{ok:true,hash:result.hash,length:result.length,sensitive:result.sensitive}:{ok:false});}catch{finish({ok:false});}});
        child.stdin.end(bytes.toString('base64'));
      }catch{finish({ok:false});}
    });
  }
  return {fingerprint,close(){for(const child of children)child.kill();children.clear();}};
};
