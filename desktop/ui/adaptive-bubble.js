(() => {
  'use strict';
  let active=null, pending=0;
  const set=(el,key,value)=>{if(/^-?[\d.]+px$/.test(value))value=Math.round(parseFloat(value)*100)/100+'px';if(el.style[key]!==value)el.style[key]=value;};
  function fit(frame){
    if(!frame?.isConnected)return;
    active=frame;
    const text=frame.parentElement,pop=text.closest('.dshwv-pop'),root=pop?.closest('.dshwv-root');
    if(!root)return;
    const base=root.offsetWidth, baseHeight=base*700/1026;
    const viewportW=innerWidth,viewportH=innerHeight;
    const length=frame.textContent.length;
    const width=Math.min(Math.max(base,length>60?Math.min(500,base*1.45):base),Math.max(100,viewportW-24));
    set(pop,'width',width+'px');
    const children=[...frame.children].filter(el=>getComputedStyle(el).display!=='none');
    const expanded=length>35||children.length>3;
    set(text,'width',expanded?(width-36)+'px':'66%');
    for(const el of children){
      if(el.tagName==='IMG')continue;
      set(el,'maxWidth','100%');set(el,'whiteSpace','pre-wrap');set(el,'overflowWrap','anywhere');
    }
    // Measure natural children, never scrollHeight of the already stretched frame.
    const natural=children.reduce((height,el)=>{const css=getComputedStyle(el);return height+el.getBoundingClientRect().height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);},0);
    const height=Math.min(Math.max(baseHeight,expanded?natural+80:(natural+24)/0.64),Math.max(90,viewportH-24));
    set(pop,'height',height+'px');set(pop,'aspectRatio','auto');
    const svg=pop.querySelector('svg'),shape=svg.querySelector('path'),dots=svg.querySelectorAll('ellipse');
    if(!svg.originalBubble)svg.originalBubble={path:shape.getAttribute('d'),dots:[...dots].map(el=>['cx','cy','rx','ry'].map(k=>el.getAttribute(k)))};
    const attr=(el,key,value)=>{value=String(value);if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
    if(expanded){
      attr(svg,'viewBox',`0 0 ${width} ${height}`);attr(svg,'preserveAspectRatio','none');
      const right=width-4,bottom=height-46,radius=18;
      attr(shape,'d',`M 22 4 H ${right-radius} Q ${right} 4 ${right} 22 V ${bottom-radius} Q ${right} ${bottom} ${right-radius} ${bottom} H 22 Q 4 ${bottom} 4 ${bottom-radius} V 22 Q 4 4 22 4 Z`);
      attr(shape,'stroke-width',2.5);
      dots.forEach((el,i)=>{attr(el,'cx',width*(i?.58:.52));attr(el,'cy',height-(i?8:28));attr(el,'rx',i?4:6);attr(el,'ry',i?3:4.5);attr(el,'stroke-width',2);});
      set(text,'left','50%');set(text,'top',(height-46)/2+'px');set(text,'height',(height-74)+'px');
    }else{
      attr(svg,'viewBox','0 0 1026 700');attr(svg,'preserveAspectRatio','none');attr(shape,'d',svg.originalBubble.path);attr(shape,'stroke-width',18);
      dots.forEach((el,i)=>{['cx','cy','rx','ry'].forEach((k,j)=>attr(el,k,svg.originalBubble.dots[i][j]));attr(el,'stroke-width',18);});
      set(text,'left','');set(text,'top','');set(text,'height','64%');
    }
    const contentHeight=expanded?height-74:height*.64;
    set(frame,'justifyContent',natural>contentHeight-8?'flex-start':'center');
    set(frame,'overflowY',natural>contentHeight-8?'auto':'visible');
    set(frame,'overflowX','hidden');set(frame,'pointerEvents','auto');
    // Keep the tail near the character, then clamp to the visible viewport.
    const box=pop.getBoundingClientRect();
    const scaleX=Math.max(.01,box.width/width),scaleY=Math.max(.01,box.height/height);
    const mirror=window.WhaleRendering.mirrorScale(root),mirrored=mirror<0?-1:1;
    if(Math.abs(mirror)<.1)return;
    const desiredLeft=(base-width)*.5,desiredTop=baseHeight-height;
    const left=box.left+(desiredLeft-(parseFloat(pop.style.left)||0))*scaleX*mirrored;
    const top=box.top+(desiredTop-(parseFloat(pop.style.top)||0))*scaleY;
    const dx=left<12?12-left:left+box.width>viewportW-12?viewportW-12-left-box.width:0;
    const dy=top<12?12-top:top+box.height>viewportH-12?viewportH-12-top-box.height:0;
    const px=n=>Math.round(n*100)/100+'px';
    set(pop,'left',px(desiredLeft+dx/scaleX*mirrored));
    set(pop,'top',px(desiredTop+dy/scaleY));
  }
  function request(){if(!active||pending)return;pending=requestAnimationFrame(()=>{pending=0;fit(active);});}
  window.WhaleBubbleLayout=Object.freeze({fit,request});
  window.WhaleRendering.onFrame(()=>{if(active)fit(active);});
  window.addEventListener('resize',request);
  document.addEventListener('whale-bubble-ready',request);
  document.addEventListener('load',event=>{if(event.target.closest?.('.dshwv-frame'))request();},true);
  window.addEventListener('DOMContentLoaded',()=>{
    const root=document.querySelector('.dshwv-root'),position=document.querySelector('.dshwv-position');
    if(root)new ResizeObserver(request).observe(root);
    if(position)new MutationObserver(request).observe(position,{attributes:true,attributeFilter:['style']});
    const text=document.querySelector('.dshwv-text');
    if(text)new MutationObserver(request).observe(text,{childList:true,characterData:true,subtree:true});
  });
})();
