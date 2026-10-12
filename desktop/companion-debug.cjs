'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const MAX_BYTES=64*1024,MAX_ROWS=200;
const PAUSES=new Set(['none','manual','lock_screen','suspend','error','credential_missing','start_error','renderer_failure']);
const OUTCOMES=new Set(['shown','quiet','filtered','waiting','cancelled','error']);
const REASONS=new Set(['model_quiet','work_filter','duplicate','cooldown','already_greeted','context_not_ready','not_novel','unchanged','unchanged_text','text_unavailable','settling','waiting','cancelled','invalid_response','display_error','request_error','accepted','privacy_unavailable','sensitive_content']);
function project(input){
  const n=value=>Number.isSafeInteger(value)&&value>=0?Math.min(value,1000000000):0;
  return {active:input.active===true,busy:input.busy===true,autoStart:input.autoStart===true,paused:input.paused===true,pauseReason:PAUSES.has(input.pauseReason)?input.pauseReason:'none',locked:input.locked===true,suspended:input.suspended===true,hasKey:input.hasKey===true,hasSource:input.hasSource===true,credentialBlocked:input.credentialBlocked===true,mode:input.mode==='work'?'work':'companion',waitingForFrame:input.waitingForFrame===true,startPending:input.startPending===true,requests:n(input.requests),checkId:n(input.lastOutcome?.id),outcome:OUTCOMES.has(input.lastOutcome?.outcome)?input.lastOutcome.outcome:null,reason:REASONS.has(input.lastOutcome?.reason)?input.lastOutcome.reason:null,requested:input.lastOutcome?.requested===true};
}
// Only local booleans, counters and fixed enums are written. Never retain the
// caller's strings, window identity, model content, screenshots or credentials.
exports.createCompanionDebug=function(dataDir){
  const target=path.join(dataDir,'companion-debug.jsonl');let rows=[],previous='';
  const regular=file=>{try{return fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink();}catch{return false;}};
  try{
    if(regular(target)&&fs.statSync(target).size<=MAX_BYTES){
      rows=fs.readFileSync(target,'utf8').split('\n').filter(Boolean).slice(-MAX_ROWS).flatMap(line=>{
        try{const row=JSON.parse(line);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.at||''))return [];return [{at:row.at,...project({...row,lastOutcome:{id:row.checkId,outcome:row.outcome,reason:row.reason,requested:row.requested}})}];}catch{return [];}
      });
    }
  }catch{}
  return {record(input){
    const safe=project(input),identity=JSON.stringify(safe);if(identity===previous)return;previous=identity;
    rows.push({at:new Date().toISOString(),...safe});rows=rows.slice(-MAX_ROWS);
    let encoded=rows.map(row=>JSON.stringify(row)).join('\n')+'\n';
    while(Buffer.byteLength(encoded)>MAX_BYTES&&rows.length>1){rows.shift();encoded=rows.map(row=>JSON.stringify(row)).join('\n')+'\n';}
    let temporary,fd;
    try{
      fs.mkdirSync(dataDir,{recursive:true});if(fs.lstatSync(dataDir).isSymbolicLink()||(fs.existsSync(target)&&!regular(target)))return;
      temporary=target+'.'+process.pid+'.'+randomBytes(6).toString('hex')+'.tmp';fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,encoded);fs.closeSync(fd);fd=undefined;fs.renameSync(temporary,target);
    }catch{if(fd!==undefined)try{fs.closeSync(fd);}catch{}if(temporary)try{fs.unlinkSync(temporary);}catch{}}
  }};
};
exports.projectDiagnostic=project;
