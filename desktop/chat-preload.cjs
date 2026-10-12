const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('companion',{
  call:(action,input={})=>ipcRenderer.invoke('whale-chat-call',action,input),
  onState:callback=>ipcRenderer.on('whale-chat-state',(_event,state)=>callback(state))
});
