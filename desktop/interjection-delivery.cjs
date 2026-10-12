'use strict';
exports.createInterjectionDelivery=function({ipcMain,getWindow}){
 let sequence=0,last=null;const pending=new Map();
 const receive=(event,result)=>{
  const w=getWindow();if(!w||w.isDestroyed()||event.sender!==w.webContents||event.senderFrame!==w.webContents.mainFrame)return;
  if(!result||typeof result.id!=='string'||!['queued','shown','rejected'].includes(result.state))return;
  const item=pending.get(result.id);
  if(!item&&last?.id!==result.id)return;
  if(last?.id===result.id&&last.state==='shown'&&result.state==='queued')return;
  last={id:result.id,state:result.state,at:new Date().toISOString()};
  if(result.state==='queued')return;
  if(item){clearTimeout(item.timer);pending.delete(result.id);result.state==='rejected'?item.reject(new Error('气泡未接收：请检查小鲸鱼的气泡开关或已有常驻气泡')):item.resolve();}
 };
 ipcMain.on('whale-interjection-result',receive);
 return {
  status:()=>last?{...last}:null,
  send(text,options={}){
   const w=getWindow();if(!w||w.isDestroyed()||w.webContents.isDestroyed())return Promise.reject(new Error('小鲸鱼窗口尚未就绪'));
   const id=String(++sequence);last={id,state:'sending',at:new Date().toISOString()};
   return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);last={id,state:'timeout',at:new Date().toISOString()};reject(new Error('插话气泡排队后未能显示，请检查气泡开关或重启小鲸鱼'));},45000);timer.unref?.();
    pending.set(id,{resolve,reject,timer});
    try{w.webContents.send('whale-interject',{id,text,test:options.test===true,at:Date.now()});}catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
   });
  },
  close(){ipcMain.removeListener('whale-interjection-result',receive);for(const {timer,reject} of pending.values()){clearTimeout(timer);reject(new Error('小鲸鱼正在关闭'));}pending.clear();}
 };
};
