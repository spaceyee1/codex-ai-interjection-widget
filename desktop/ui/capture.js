(()=>{'use strict';
  const video=document.querySelector('video'),canvas=document.querySelector('canvas');
  let stream=null,source='',lastFrame=0,frameCallback=null;
  function reset(){
    if(frameCallback!=null)video.cancelVideoFrameCallback(frameCallback);
    frameCallback=null;stream?.getTracks().forEach(track=>track.stop());stream=null;source='';lastFrame=0;video.srcObject=null;
  }
  function onFrame(){lastFrame=performance.now();frameCallback=video.requestVideoFrameCallback(onFrame);}
  window.whaleCaptureFrame=async id=>{
    if(!/^window:\d+:\d+$/.test(id))return {};
    if(source!==id||!stream||stream.getVideoTracks()[0]?.readyState!=='live'){
      reset();
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{chromeMediaSource:'desktop',chromeMediaSourceId:id,maxWidth:1600,maxHeight:1200,maxFrameRate:2}}});
        source=id;video.srcObject=stream;frameCallback=video.requestVideoFrameCallback(onFrame);
        await video.play();
      }catch{reset();return {};}
    }
    const deadline=performance.now()+2500;
    while(!lastFrame&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
    // A minimized/protected window may stop producing frames. Never upload the
    // cached frame as if it were a new observation, and never capture the screen.
    if(!lastFrame||performance.now()-lastFrame>10000||video.videoWidth<2||video.videoHeight<2)return {};
    const scale=Math.min(1,1600/video.videoWidth,1200/video.videoHeight);
    canvas.width=Math.max(1,Math.floor(video.videoWidth*scale));canvas.height=Math.max(1,Math.floor(video.videoHeight*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,canvas.width,canvas.height);
    // Reject all-black unavailable/protected frames before they reach the API.
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let bright=false;
    for(let i=0;i<pixels.length;i+=4){if(pixels[i]>12||pixels[i+1]>12||pixels[i+2]>12){bright=true;break;}}
    return bright?{data:canvas.toDataURL('image/jpeg',.8)}:{};
  };
  window.addEventListener('pagehide',reset);
})();
