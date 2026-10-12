'use strict';
const {BrowserWindow}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createLocalTextReader}=require('./local-text.cjs');

// Keep a stream of the selected window, not an all-window thumbnail sweep.
// The renderer is local, hidden, ephemeral, and has no network or Node access.
exports.createWindowCapture=function(){
  const localText=createLocalTextReader();
  let worker=null,ready=null,generation=0,inflight=null;
  const entry=pathToFileURL(path.join(__dirname,'ui','capture.html')).href;
  function close(){
    generation++;localText.close();
    const previous=worker;worker=null;ready=null;inflight=null;
    if(previous&&!previous.isDestroyed())previous.destroy();
  }
  async function capture(id,{textGate=false}={}){
    if(!/^window:\d+:\d+$/.test(id))throw new Error('只能观察选定的应用窗口');
    if(inflight)return {unavailable:true};
    const epoch=generation;
    const job=(async()=>{
      if(!worker||worker.isDestroyed()){
        const win=new BrowserWindow({width:320,height:240,show:false,skipTaskbar:true,focusable:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,partition:'whale-capture-memory',autoplayPolicy:'no-user-gesture-required'}});
        worker=win;
        const trusted=wc=>!win.isDestroyed()&&wc===win.webContents&&wc.getURL()===entry;
        win.webContents.session.setPermissionCheckHandler((wc,permission)=>trusted(wc)&&permission==='media');
        win.webContents.session.setPermissionRequestHandler((wc,permission,callback)=>callback(trusted(wc)&&permission==='media'));
        win.webContents.session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(pathToFileURL(path.join(__dirname,'ui')+path.sep).href)}));
        win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
        win.webContents.on('will-navigate',event=>event.preventDefault());
        ready=win.loadURL(entry);
      }
      const win=worker;
      await ready;
      if(epoch!==generation||win.isDestroyed())return {unavailable:true};
      let timer;
      try{
        const result=await Promise.race([
          win.webContents.executeJavaScript('window.whaleCaptureFrame('+JSON.stringify(id)+')'),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('capture timeout')),10000);timer.unref?.();}),
        ]);
        if(epoch!==generation)return {unavailable:true};
        if(!result?.data)return {unavailable:true};
        if(!result.data.startsWith('data:image/jpeg;base64,')||result.data.length>6*1024*1024)throw new Error('invalid capture');
        const bytes=Buffer.from(result.data.slice(23),'base64');
        // Both automatic and manual screenshots must pass local credential checks.
        const text=await localText.fingerprint(bytes);
        if(epoch!==generation)return {unavailable:true};
        const checked=text?.ok===true&&text.length>0;
        return {mime:'image/jpeg',bytes,privacyChecked:checked,sensitive:checked?text.sensitive:null,...(textGate?{textGate:true,textFingerprint:checked?text.hash:null}:{})};
      }finally{clearTimeout(timer);}
    })();
    inflight=job;
    try{return await job;}
    catch{if(epoch===generation)close();return {unavailable:true};}
    finally{if(inflight===job)inflight=null;}
  }
  return {capture,close};
};
