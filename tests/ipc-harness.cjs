const vm=require('node:vm');
function makeHarness(source,{nativeWindow,nativeIpc}={}){
 const state={destroyed:false,contentsDestroyed:false,frameGone:false,saved:0,focus:0,ready:0,interactive:0};
 const frame={},contents={isDestroyed:()=>state.contentsDestroyed};
 Object.defineProperty(contents,'mainFrame',{get(){if(state.frameGone)throw TypeError('Object has been destroyed');return frame}});
 const fakeWindow={isDestroyed:()=>state.destroyed,setIgnoreMouseEvents(){state.interactive++}};
 Object.defineProperty(fakeWindow,'webContents',{get(){if(state.destroyed)throw TypeError('Object has been destroyed');return contents}});
 const window=nativeWindow||fakeWindow,events=new Map(),handlers=new Map();
 const ipcMain={on(name,fn){events.set(name,fn);nativeIpc?.on(name,fn)},handle(name,fn){handlers.set(name,fn);nativeIpc?.handle(name,fn)}};
 const ctx={window,ipcMain,quitting:false,trustedGestureAt:0,inputEnabled:false,rendererReady:false,fixture:true,
  values:()=>({fixture:'state'}),storeValues(){state.saved++},setKeyboardFocus(){state.focus++},markStartup(){state.ready++},
  visibility(){},flushCommands(){},invalidate(){},sendCursor(){},setTimeout(){},Date,fs:{rmSync(){}},path:require('node:path'),dataDir:'fixture-only',
  chatController:{open:async()=>{},status:()=>({}),testBubble:async()=>({})},sendCommand:()=>true,showStatusDialog:async()=>{},pauseAndQuit(){},openWebLink:()=>true,
 };
 vm.createContext(ctx);
 const start=source.indexOf('function isMainFrame('),end=source.indexOf('\nasync function openWebLink',start);
 if(start<0||end<0)throw Error('IPC main-frame guard not found');
 vm.runInContext(source.slice(start,end),ctx);
 const registrationStart=source.indexOf("    ipcMain.on('whale-storage'"),registrationEnd=source.indexOf('\n    const cursorPoll',registrationStart);
 if(registrationStart<0||registrationEnd<0)throw Error('Actual IPC registration block not found');
 vm.runInContext(source.slice(registrationStart,registrationEnd),ctx);
 const web=nativeWindow?nativeWindow.webContents:contents;
 const event=()=>({sender:web,senderFrame:nativeWindow?web.mainFrame:frame,returnValue:undefined});
 return{ctx,state,events,handlers,event,contents,frame};
}
module.exports={makeHarness};
