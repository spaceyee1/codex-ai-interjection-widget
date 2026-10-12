'use strict';
const {BrowserWindow,ipcMain,desktopCapturer,safeStorage,net,powerMonitor}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createWindowCapture}=require('./window-capture.cjs');
const {createCompanionDebug}=require('./companion-debug.cjs');

module.exports.createChatController=async function({dataDir,root,test=null,onInterject=()=>{}}){
  const {chooseObservationWindow}=await import(pathToFileURL(path.join(root,'runtime','companion-presets.mjs')));
  const {VisionChat,validateChatSettings}=await import(pathToFileURL(path.join(root,'runtime','vision-chat.mjs')));
  const {readJson,writeJson}=await import(pathToFileURL(path.join(root,'runtime','paths.mjs')));
  const configFile=path.join(dataDir,'companion-settings.json'),secretFile=path.join(dataDir,'companion-secret.json');
  let chatWindow=null,settings,sourceMap=new Map(),loadError='',keyNotice='',autoStartTimer=null,paused=false,pauseReason='none',startPending=false,systemLocked=false,systemSuspended=false,credentialBlocked=false,closed=false;
  const debug=createCompanionDebug(dataDir);
  try { settings=validateChatSettings(readJson(configFile,{})); } catch { settings=validateChatSettings();loadError='聊天设置无效，已使用默认值；请重新保存设置'; }
  const windowCapture=createWindowCapture();
  const entry=pathToFileURL(path.join(__dirname,'ui','chat.html')).href;
  let secret='';
  if((!test||test.loadSavedKey)&&fs.existsSync(secretFile)){
    try{if(!safeStorage.isEncryptionAvailable())throw new Error();secret=safeStorage.decryptString(Buffer.from(readJson(secretFile,{}).encrypted,'base64'));if(typeof secret!=='string'||secret.length<8||secret.length>1024||/\s/.test(secret))throw new Error();}
    catch{credentialBlocked=true;loadError='本机保存的 Key 无法解密，外发已关闭；请重新保存或删除密文';}
  }
  const getKey=()=>credentialBlocked?'':test?test.key:secret||process.env.DEEPSEEK_API_KEY||'';
  const state=()=>{const stored=fs.existsSync(secretFile);return {...service.status(),hasKey:!!getKey(),keySource:credentialBlocked?'本机密文不可读，外发已关闭':secret?'本机加密保存':getKey()?'DEEPSEEK_API_KEY 环境变量':'未设置',credentialError:loadError,keyNotice,credentialBlocked,hasSavedKey:stored,hasStoredKey:stored,canDeleteKey:stored||credentialBlocked};};
  const publish=()=>{
    if(!service.active&&!service.busy)windowCapture.close();
    if(service.error&&!service.active&&!startPending&&!paused){paused=true;pauseReason='error';}
    const s=service.status();debug.record({active:s.active,busy:s.busy,hasKey:!!getKey(),hasSource:!!s.source,mode:s.settings.mode,requests:s.requests,lastOutcome:s.lastOutcome,waitingForFrame:s.waitingForFrame,autoStart:settings.autoStart,paused,pauseReason,locked:systemLocked,suspended:systemSuspended,startPending,credentialBlocked});
    if(chatWindow&&!chatWindow.isDestroyed())chatWindow.webContents.send('whale-chat-state',state());
  };
  async function listWindows(){
    const sources=test?await test.sources():await desktopCapturer.getSources({types:['window'],thumbnailSize:{width:0,height:0},fetchWindowIcons:false});
    const own=new Set(BrowserWindow.getAllWindows().map(w=>w.getMediaSourceId()));
    sourceMap=new Map(sources.filter(s=>s.id.startsWith('window:')&&!own.has(s.id)).map(s=>[s.id,{id:s.id,name:String(s.name).slice(0,250)}]));
    // A minimized window may disappear from enumeration. Keep the explicit selection.
    if(service.source&&!sourceMap.has(service.source.id))sourceMap.set(service.source.id,service.source);
    return [...sourceMap.values()];
  }
  async function autoSelectGpt(){
    const sources=await listWindows();
    const candidate=chooseObservationWindow(sources);
    if(!candidate)return false;
    windowCapture.close();service.select(candidate);return true;
  }
  async function capture(id,options){
    if(test)return test.capture(id,options);
    if(!sourceMap.has(id))throw new Error('所选窗口已失效，请重新选择');
    return await windowCapture.capture(id,options);
  }
  const service=new VisionChat({getKey,settings,capture,fetchImpl:test?.fetchImpl||((url,options)=>net.fetch(url,options)),onChange:publish,onInterject});
  function scheduleAutoStart(){
    if(autoStartTimer){clearInterval(autoStartTimer);autoStartTimer=null;}
    if(settings.autoStart===false||(test&&!test.enableAutoStart))return;
    const attempt=async()=>{
      try{
        if(closed)return;
        if(service.status().source&&service.status().active)return;
        await autoStart();
      }catch{}
    };
    autoStartTimer=setInterval(attempt,10000);
    autoStartTimer.unref?.();
    queueMicrotask(attempt);
  }
  async function autoStart({manual=false}={}){
    if(closed||systemLocked||systemSuspended)return state();
    if(!manual&&(paused||settings.autoStart===false||service.active))return state();
    if(startPending)return state();
    if(service.busy){if(manual)throw new Error('请等待当前回复完成');return state();}
    if(manual){paused=false;pauseReason='none';}
    startPending=true;
    try{
      if(!service.source&&settings.autoSelect!==false)await autoSelectGpt();
      if(closed||paused||systemLocked||systemSuspended||(!manual&&settings.autoStart===false))return state();
      if(!service.source){loadError='未找到唯一的 Codex / ChatGPT 窗口，请在面板中选择要观察的窗口';if(manual)throw new Error(loadError);return state();}
      if(!service.active){windowCapture.close();service.start();}loadError='';
    }catch(error){paused=true;pauseReason=!getKey()?'credential_missing':'start_error';loadError=credentialBlocked?'本机保存的 Key 无法解密，外发已关闭；请重新保存或删除密文':String(error.message).slice(0,200);if(manual)throw error;}
    finally{startPending=false;publish();}
    return state();
  }
  async function setAuto(enabled){
    const next=validateChatSettings({...settings,autoStart:enabled!==false});
    writeJson(configFile,next);settings=next;service.configure(next);windowCapture.close();
    scheduleAutoStart();
    if(next.autoStart){paused=false;pauseReason='none';await resumeAfterChange();}
    return state();
  }
  async function updatePreferences(patch){
    const wasActive=service.active,next=validateChatSettings({...settings,...patch});
    writeJson(configFile,next);settings=next;service.configure(next);windowCapture.close();scheduleAutoStart();
    if(wasActive)await resumeAfterChange();
    return state();
  }
  async function resumeAfterChange({manual=true}={}){
    // Abort completion is asynchronous; do not restart while the cancelled send still owns busy.
    for(let i=0;service.busy&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,20));
    return autoStart({manual});
  }
  async function testBubble(){await onInterject('测试成功：小鲸鱼可以显示插话气泡。此消息不调用 AI。',{test:true});return state();}
  async function observeOnce({resume=false}={}){
    const wasActive=service.active;
    pause();
    for(let i=0;service.busy&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,20));
    if(service.busy)throw new Error('请等待当前请求停止');
    if(!service.source&&!await autoSelectGpt())throw new Error('请先选择要观察的窗口');
    service.resetContext();
    try{
      // Local stability checks may repeat; at most one model request is issued.
      for(let i=0;i<6;i++){
        const result=await service.send(service.observerPrompt(),{vision:true,automatic:true});
        if(!result.settling)return state();
        await new Promise(resolve=>setTimeout(resolve,2000));
      }
      throw new Error('画面持续变化，未发送到模型；请待回复结束后重试');
    }finally{pause();if(resume&&wasActive&&!service.error)await autoStart({manual:true});}
  }
  function diagnostics(){const s=state();return {active:s.active,busy:s.busy,hasKey:s.hasKey,hasSource:!!s.source,source:s.source,autoStart:s.settings.autoStart,paused,pauseReason,startPending,systemLocked,systemSuspended,credentialBlocked,hasSavedKey:s.hasSavedKey,waitingForFrame:s.waitingForFrame,mode:s.settings.mode,promptMode:s.settings.promptMode,error:s.error,credentialError:s.credentialError,lastDecision:s.lastDecision,modelExplanation:s.modelExplanation,lastModelDecision:s.lastModelDecision,intervalSeconds:s.settings.intervalSeconds,minSpeakSeconds:s.settings.minSpeakSeconds,lastOutcome:s.lastOutcome,requests:s.requests,checks:s.checks.slice(-8)};}
  async function setSpeed(seconds){
    const n=Math.round(Number(seconds));
    if(!Number.isFinite(n))throw new Error('插嘴速度无效');
    return updatePreferences({intervalSeconds:n});
  }
  scheduleAutoStart();
  const valid=event=>chatWindow&&!chatWindow.isDestroyed()&&event.sender===chatWindow.webContents&&event.senderFrame===chatWindow.webContents.mainFrame&&event.senderFrame.url===entry;
  async function invoke(action,input={}){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('操作参数无效');
    if(action==='set-mode')return updatePreferences({mode:input.mode});
    if(action==='set-prompt-mode')return updatePreferences({promptMode:input.promptMode});
    if(action==='test-bubble')return testBubble();
    if(action==='observe-once')return observeOnce({resume:input.resume===true});
    if(action==='state')return state();
    if(action==='sources')return await listWindows();
    if(action==='auto-select'){if(!await autoSelectGpt())throw new Error('没有找到类似 GPT / ChatGPT 的窗口，请确认它已打开且未被最小化');return state();}
    if(action==='auto-start')return await autoStart();
    if(action==='set-speed')return await setSpeed(input?.seconds);
    if(action==='select'){pause();if(!input.id){service.select(null);return state();}if(!sourceMap.has(input.id))throw new Error('请刷新并选择窗口');service.select(sourceMap.get(input.id));return state();}
    if(action==='configure'){
      const wasActive=service.active,next=validateChatSettings({...settings,...input.settings});pause();
      if(input.key!==undefined&&typeof input.key!=='string')throw new Error('API Key 格式无效');
      const key=(input.key||'').trim();
      if(key){
        if(key.length<8||key.length>1024||/[\s]/.test(key))throw new Error('API Key 格式无效');
        if(!safeStorage.isEncryptionAvailable())throw new Error('Windows 本机加密不可用，未保存 Key');
        writeJson(secretFile,{encrypted:safeStorage.encryptString(key).toString('base64')});secret=key;credentialBlocked=false;loadError='';keyNotice='';
      }
      writeJson(configFile,next);settings=next;service.configure(next);windowCapture.close();scheduleAutoStart();if(wasActive||next.autoStart){paused=false;pauseReason='none';await resumeAfterChange();}return state();
    }
    if(action==='forget-key'){pause();const existed=fs.existsSync(secretFile);if(existed)try{fs.unlinkSync(secretFile);}catch{throw new Error('本机 Key 文件清除失败；当前外发状态保持关闭，请检查文件权限');}secret='';credentialBlocked=false;loadError='';keyNotice=(existed?'已删除本机保存的 Key 文件':'未找到本机保存的 Key 文件')+(getKey()?'；环境变量 Key 仍已配置':'；当前没有可用 Key，外发保持关闭');if(settings.autoStart&&getKey()){paused=false;pauseReason='none';await resumeAfterChange();}publish();return state();}
    if(action==='send'){await service.send(input.text,{vision:input.vision===true});return state();}
    if(action==='start')return await autoStart({manual:true});
    if(action==='stop'){pause();return state();}
    if(action==='clear'){pause();service.clear();return state();}
    if(action==='pin'){chatWindow.setAlwaysOnTop(input.enabled===true);return state();}
    throw new Error('不支持的聊天操作');
  }
  ipcMain.handle('whale-chat-call',async(event,action,input)=>{
    if(!valid(event))return {ok:false,error:'无权访问聊天面板'};
    try{return {ok:true,value:await invoke(action,input)};}catch(error){return {ok:false,error:String(error.message).slice(0,250)};}
  });
  const pause=(reason='manual')=>{paused=true;pauseReason=reason;service.stop();windowCapture.close();};
  const systemPause=reason=>{if(reason==='lock_screen')systemLocked=true;else systemSuspended=true;if(!paused||['lock_screen','suspend'].includes(pauseReason)){paused=true;pauseReason=reason;}service.stop();windowCapture.close();};
  const onLock=()=>systemPause('lock_screen'),onSuspend=()=>systemPause('suspend');
  const systemResume=async reason=>{
    if(closed)return;
    if(reason==='lock_screen')systemLocked=false;else systemSuspended=false;
    if(systemLocked||systemSuspended){publish();return;}
    if(['lock_screen','suspend'].includes(pauseReason)){paused=false;pauseReason='none';if(settings.autoStart)try{await resumeAfterChange({manual:false});}catch{}}
    publish();
  };
  const onUnlock=()=>void systemResume('lock_screen'),onResume=()=>void systemResume('suspend');
  powerMonitor.on('lock-screen',onLock);powerMonitor.on('suspend',onSuspend);powerMonitor.on('unlock-screen',onUnlock);powerMonitor.on('resume',onResume);
  publish();
  async function open(){
    if(chatWindow&&!chatWindow.isDestroyed()){chatWindow.show();chatWindow.focus();return chatWindow;}
    chatWindow=new BrowserWindow({width:460,height:760,minWidth:380,minHeight:550,show:false,title:'小鲸鱼 · GPT 自动陪伴',backgroundColor:'#f5f8f7',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'chat-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'whale-chat-memory',backgroundThrottling:false}});
    chatWindow.webContents.session.setPermissionRequestHandler((_w,_p,callback)=>callback(false));
    chatWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    chatWindow.webContents.on('will-navigate',(event,url)=>{if(url!==entry)event.preventDefault();});
    // Closing the panel must not stop an explicitly enabled background observer.
    chatWindow.on('closed',()=>{chatWindow=null;});
    chatWindow.webContents.on('render-process-gone',()=>pause('renderer_failure'));
    await chatWindow.loadURL(entry);chatWindow.show();return chatWindow;
  }
  return {open,autoStart,setAuto,setSpeed,updatePreferences,testBubble,observeOnce,diagnostics,stop:()=>pause(),status:state,async close(){closed=true;if(autoStartTimer)clearInterval(autoStartTimer);autoStartTimer=null;service.stop();windowCapture.close();powerMonitor.removeListener('lock-screen',onLock);powerMonitor.removeListener('suspend',onSuspend);powerMonitor.removeListener('unlock-screen',onUnlock);powerMonitor.removeListener('resume',onResume);ipcMain.removeHandler('whale-chat-call');if(chatWindow&&!chatWindow.isDestroyed())chatWindow.destroy();},...(test?{invoke,service}: {})};
};
