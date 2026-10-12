(()=>{'use strict';const $=id=>document.getElementById(id);let current=null,messageSignature='',pinned=false,settingsSignature='';
  const error=text=>{$('error').textContent=text||'';$('error').hidden=!text;};
  async function call(action,input){const response=await window.companion.call(action,input);if(!response.ok)throw new Error(response.error);return response.value;}
  function render(state){
    current=state;$('key-state').textContent=state.credentialError||state.keyNotice||('凭据：'+state.keySource);
    $('api-key-row').style.display=state.hasKey?'none':'';
    $('forget').style.display='';
    const canClearKey=state.canDeleteKey===true||state.hasStoredKey===true;
    $('forget').disabled=!canClearKey;
    $('forget').textContent=state.hasStoredKey?'删除本机 Key':canClearKey?'清除 Key 错误状态':'本机没有 Key 文件';
    $('forget').title=canClearKey?'可删除保存或损坏的密文文件，或清除密文缺失后的阻断状态':'未发现本机密文文件；环境变量中的 Key 需由用户自行移除';
    $('save').textContent=state.hasKey?'保存其他设置':'保存设置';
    const nextSettings=JSON.stringify(state.settings);
    if(nextSettings!==settingsSignature){settingsSignature=nextSettings;
    $('interjection-mode').value=state.settings.mode||'companion';$('prompt-mode').value=state.settings.promptMode||'default';
    updatePromptView();
    $('interval').value=state.settings.intervalSeconds;$('max-tokens').value=state.settings.maxTokens;$('speak-interval').value=state.settings.minSpeakSeconds;$('persona').value=state.settings.persona;
    $('auto-select').checked=state.settings.autoSelect!==false;$('auto-start').checked=state.settings.autoStart!==false;$('auto-interject').checked=state.settings.autoInterject!==false;$('auto-prompt').value=state.settings.autoPrompt||'';
    }
    if(!state.source)$('windows').value='';else if([...$('windows').options].some(o=>o.value===state.source.id))$('windows').value=state.source.id;
    $('observe-once').disabled=state.busy||!state.hasKey;
    $('timing-help').textContent='每 '+state.settings.intervalSeconds+' 秒检查一次；两次发言至少间隔 '+state.settings.minSpeakSeconds+' 秒。';
    $('model-reason').textContent=state.lastModelDecision?.action==='quiet'?'最近未插话：'+state.modelExplanation:'';
    $('message').disabled=state.busy;$('send').disabled=state.busy;$('send').textContent=state.busy?'回复中…':'发送';
    $('observe').disabled=state.active||state.busy||!state.source||!state.hasKey;$('stop').disabled=!state.active&&!state.busy;
    $('windows').disabled=state.active;$('refresh').disabled=state.active;
    $('watch-status').textContent=state.active?'● 正在观察：'+state.source.name+' · 每 '+state.settings.intervalSeconds+' 秒检查':(!state.hasKey?'请先在设置中保存 DeepSeek API Key，才能开始观察':'观察已关闭');
    if(state.active&&state.waitingForFrame)$('watch-status').textContent='● 等待窗口画面恢复，将自动继续：'+state.source.name;
    $('watch-status').classList.toggle('active',state.active);
    if(state.active&&state.lastDecision)$('watch-status').textContent+=' · '+state.lastDecision;
    if(state.filteredChecks)$('watch-status').textContent+=' · 本地过滤 '+state.filteredChecks+' 次';
    if(state.lastSent)$('watch-status').textContent+=' · 最近发送 '+new Date(state.lastSent).toLocaleTimeString();
    $('usage').textContent=state.usage?.total_tokens!=null?'本次运行 '+state.requests+' 次请求 · 最近 '+state.usage.total_tokens+' token':'聊天和截图不保存到磁盘';
    error(state.error||state.credentialError||'');
    const checks=state.checks||[],shown=checks.filter(c=>c.outcome==='shown').length,failed=checks.filter(c=>c.outcome==='error').length;
    $('decision-summary').textContent='最近 '+checks.length+' 次检查 · 回应 '+shown+' 次 · 异常 '+failed+' 次';
    $('decision-log').replaceChildren();
    const labels={shown:'已回应',quiet:'保持沉默',filtered:'本地跳过',error:'异常',waiting:'等待画面',cancelled:'已取消'};
    const reasons={accepted:'通过检查',model_quiet:'模型主动沉默',context_not_ready:'对话未就绪',not_novel:'没有新内容',work_filter:'工作模式筛选',already_greeted:'已问候',duplicate:'相似发言',cooldown:'发言间隔',unchanged:'画面未变',unchanged_text:'文字未变',settling:'等待文字稳定',text_unavailable:'无可识别文字',waiting:'画面不可用',request_error:'请求失败',invalid_response:'回复格式异常',cancelled:'停止或设置变更',display_error:'显示失败',privacy_unavailable:'本地隐私检查不可用，未发送截图',sensitive_content:'识别到敏感凭据，未发送截图'};
    for(const row of checks.slice(-20).reverse()){const li=document.createElement('li');li.textContent=new Date(row.at).toLocaleTimeString()+' · '+(labels[row.outcome]||row.outcome)+' · '+(reasons[row.reason]||row.reason)+(row.requested?' · 已请求模型':' · 未请求模型');$('decision-log').append(li);}
    const visibleMessages=state.messages.filter(function(m){return !m.automatic||m.role==='assistant';});const signature=JSON.stringify(visibleMessages);if(signature!==messageSignature){messageSignature=signature;$('messages').replaceChildren();
      if(!visibleMessages.length){const empty=document.createElement('div');empty.id='empty';const title=document.createElement('h2');title.textContent='我在这里陪你。';const p=document.createElement('p');p.textContent='选择 GPT 窗口并开启自动陪伴，不用向我输入文字。';empty.append(title,p);$('messages').append(empty);}
      for(const m of visibleMessages){const box=document.createElement('div');box.className='message '+m.role;const meta=document.createElement('div');meta.className='meta';meta.textContent=(m.role==='user'?'你':'小鲸鱼')+(m.vision?' · 附有窗口截图':'');const text=document.createElement('div');text.textContent=m.text;box.append(meta,text);$('messages').append(box);}$('messages').scrollTop=$('messages').scrollHeight;}
  }
  async function sources(){const list=await call('sources');$('windows').replaceChildren(new Option('选择一个窗口',''));for(const s of list)$('windows').add(new Option(s.name,s.id));if(current?.source){if(list.some(s=>s.id===current.source.id))$('windows').value=current.source.id;else render(await call('select',{id:null}));}}

  const guard=fn=>async event=>{try{error('');await fn(event);}catch(e){error(e.message);}};
  function updatePromptView(){
    const mode=$('interjection-mode').value,custom=$('prompt-mode').value==='custom';
    $('custom-prompt-field').hidden=!custom;$('edit-prompt').hidden=!custom;$('prompt-preview-box').hidden=custom;
    $('prompt-preview').textContent=current?.promptPresets?.[mode]||'';
    $('mode-help').textContent=mode==='work'?'工作：有具体依据或有价值的补充才发言；不是事实正确性保证。':'普通陪聊：自然接话与陪伴，仍过滤重复并遵守发言间隔。';
  }
  $('interjection-mode').onchange=guard(async()=>{render(await call('set-mode',{mode:$('interjection-mode').value}));$('quick-feedback').textContent='模式已保存';});
  $('prompt-mode').onchange=guard(async()=>{render(await call('set-prompt-mode',{promptMode:$('prompt-mode').value}));$('quick-feedback').textContent='提示词选项已保存';if($('prompt-mode').value==='custom')$('settings').hidden=false;});
  $('edit-prompt').onclick=()=>{$('settings').hidden=false;$('auto-prompt').focus();};
  $('observe-once').onclick=guard(async()=>{$('quick-feedback').textContent='正在检查所选窗口…';await call('observe-once',{resume:true});const state=await call('state');render(state);$('quick-feedback').textContent=state.active?'本次检查结束，继续自动观察。':'本次检查结束；需要持续陪聊请点击开始插话。';});
  $('test-bubble').onclick=guard(async()=>{await call('test-bubble');$('quick-feedback').textContent='测试消息已送到气泡队列；若有常驻气泡，请先关闭它。';});
  $('settings-toggle').onclick=()=>{$('settings').hidden=!$('settings').hidden;};
  $('chat-toggle').onclick=()=>{const dock=$('chat-dock');dock.hidden=!dock.hidden;if(!dock.hidden)$('message').focus();};
  $('save').onclick=guard(async()=>{const key=$('api-key').value;$('api-key').value='';const state=await call('configure',{key,settings:{promptMode:$('prompt-mode').value,mode:$('interjection-mode').value,model:'deepseek-flash',intervalSeconds:Number($('interval').value),maxTokens:Number($('max-tokens').value),minSpeakSeconds:Number($('speak-interval').value),autoSelect:$('auto-select').checked,autoStart:$('auto-start').checked,autoInterject:$('auto-interject').checked,autoPrompt:$('auto-prompt').value,persona:$('persona').value}});render(state);$('settings').hidden=true;});
  $('forget').onclick=guard(async()=>{if(!confirm('确定删除本机保存的 DeepSeek API Key 吗？'))return;render(await call('forget-key'));});
  $('refresh').onclick=guard(sources);
  $('auto-find').onclick=guard(async()=>{const state=await call('auto-select');render(state);await sources();$('watch-status').textContent=state.source?'已自动选择：'+state.source.name+(state.hasKey?'':' · 请保存 DeepSeek Key 后开始观察'):'没有找到类似 GPT 的窗口';});
  $('windows').onchange=guard(async()=>{render(await call('select',{id:$('windows').value}));});
  $('observe').onclick=guard(async()=>render(await call('start')));
  $('stop').onclick=guard(async()=>render(await call('stop')));
  $('clear').onclick=guard(async()=>render(await call('clear')));
  $('pin').onclick=guard(async()=>{pinned=!pinned;await call('pin',{enabled:pinned});$('pin').textContent=pinned?'取消置顶':'置顶';});
  $('composer').onsubmit=guard(async event=>{event.preventDefault();const text=$('message').value.trim();if(!text)return;const state=await call('send',{text,vision:$('with-image').checked});$('message').value='';render(state);});
  $('message').onkeydown=event=>{if(event.ctrlKey&&event.key==='Enter'){event.preventDefault();$('composer').requestSubmit();}};
  window.companion.onState(render);
  void guard(async()=>{const state=await call('state');render(state);$('interval').value=state.settings.intervalSeconds;$('max-tokens').value=state.settings.maxTokens;$('auto-prompt').value=state.settings.autoPrompt||'';$('persona').value=state.settings.persona;$('speak-interval').value=state.settings.minSpeakSeconds;if(!state.hasKey)$('settings').hidden=false;await sources();})();
})();
