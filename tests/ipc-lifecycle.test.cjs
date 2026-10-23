const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {makeHarness}=require('./ipc-harness.cjs');
const source=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8');
function deliverAll(h){
 for(const [name,arg] of [['whale-storage'],['whale-save-storage',{fixture:'new'}],['whale-user-gesture'],['whale-ready'],['whale-interactive',true],['whale-keyboard-focus',true]]){
  const event=h.event();assert.doesNotThrow(()=>h.events.get(name)(event,arg),name);
  if(name==='whale-storage')assert.equal(JSON.stringify(event.returnValue),'{}');
 }
 assert.equal(h.state.saved,0);assert.equal(h.state.ready,0);assert.equal(h.state.interactive,0);assert.equal(h.state.focus,0);assert.equal(h.ctx.trustedGestureAt,0);
}
test('authorized live main-frame IPC still reads, saves, and updates the widget',()=>{
 const h=makeHarness(source),event=h.event();
 assert.equal(h.ctx.isMainFrame(event),true);h.events.get('whale-storage')(event);assert.equal(event.returnValue.fixture,'state');
 h.events.get('whale-save-storage')(h.event(),{});h.events.get('whale-interactive')(h.event(),true);h.events.get('whale-ready')(h.event());h.events.get('whale-keyboard-focus')(h.event(),true);
 assert.equal(h.state.saved,1);assert.equal(h.state.interactive,1);assert.equal(h.state.ready,1);assert.equal(h.state.focus,1);
});
for(const phase of ['quitting','window-destroyed','contents-destroyed','window-missing','frame-destroyed']){
 test('late IPC is safely ignored during '+phase,async()=>{
  const h=makeHarness(source);
  if(phase==='quitting')h.ctx.quitting=true;
  if(phase==='window-destroyed')h.state.destroyed=true;
  if(phase==='contents-destroyed')h.state.contentsDestroyed=true;
  if(phase==='window-missing')h.ctx.window=null;
  if(phase==='frame-destroyed')h.state.frameGone=true;
  deliverAll(h);
  for(const [name,args] of [['whale-open-chat',[]],['whale-open-external',['https://example.com']],['whale-command',['status']]])assert.equal(await h.handlers.get(name)(h.event(),...args),false,name);
 });
}
test('foreign senders and subframes cannot gain access through the lifecycle fix',()=>{
 const h=makeHarness(source);
 for(const event of [{sender:{},senderFrame:h.frame},{sender:h.contents,senderFrame:{}}]){
  assert.equal(h.ctx.isMainFrame(event),false);h.events.get('whale-save-storage')(event,{});h.events.get('whale-interactive')(event,true);
 }
 assert.equal(h.state.saved,0);assert.equal(h.state.interactive,0);
});
