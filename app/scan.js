/* رفد - مسح QR بالكاميرا (تابلت الكاشير أو موبايل موظف).
   الكود على كرت المحفظة: RAFD:<tid>:<cardId>. بنستخدم BarcodeDetector لو موجود، وإلا jsQR (آيفون). */
(function(){
'use strict';
const T=()=>window.__T;
const S_={stream:null,timer:null,det:null,busy:false};
const PAYLOAD=/^RAFD:([A-Za-z0-9_-]{1,40}):([A-Za-z0-9]{20,32})$/;
function parse(text){const m=PAYLOAD.exec(String(text||'').trim());return m?{tid:m[1],cardId:m[2]}:null}
function make(tid,cardId){return 'RAFD:'+tid+':'+cardId}
// كود قصير للإدخال اليدوي لو المسح فشل (6 حروف/أرقام من أول الكود، مش حساس لحالة الحروف)
function shortCode(cardId){return String(cardId||'').slice(0,6).toUpperCase()}
let jsqrP=null;
function loadJsQR(){
  if(window.jsQR)return Promise.resolve(window.jsQR);
  if(jsqrP)return jsqrP;
  jsqrP=new Promise((res,rej)=>{const s=document.createElement('script');s.src='jsqr.js';s.onload=()=>window.jsQR?res(window.jsQR):rej(new Error('jsQR'));s.onerror=()=>rej(new Error('jsQR'));document.head.appendChild(s)});
  jsqrP.catch(()=>{jsqrP=null});
  return jsqrP;
}
function stop(){
  if(S_.timer){clearInterval(S_.timer);S_.timer=null}
  if(S_.stream){try{S_.stream.getTracks().forEach(t=>t.stop())}catch(e){}S_.stream=null}
  S_.busy=false;
}
function msg(t,bad){const m=document.getElementById('sc-msg');if(m){m.textContent=t;m.className=bad?'err':'muted'}}
async function open(onText){
  const t=T();stop();
  t.openModal('<div class="pf"><h2>امسح كرت العميل</h2><div class="scan"><video id="sc-v" playsinline muted autoplay></video><i class="scan-f" aria-hidden="true"></i></div>'+
    '<p id="sc-msg" class="muted" role="status" style="margin:0">بنفتح الكاميرا...</p><div class="actions"><button class="btn" data-sc="cancel">إلغاء</button></div></div>');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){msg('المتصفح ده مش بيفتح الكاميرا. افتح التطبيق من Chrome أو Safari على رابط https.',true);return}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})}
  catch(e){msg(e&&e.name==='NotAllowedError'?'الكاميرا مش مسموحة. اسمح بيها من إعدادات المتصفح وجرب تاني.':'مقدرتش أفتح الكاميرا. تأكد إن مفيش تطبيق تاني شغّال بيها.',true);return}
  const v=document.getElementById('sc-v');
  if(!v){try{stream.getTracks().forEach(x=>x.stop())}catch(e){}return}
  S_.stream=stream;v.srcObject=stream;try{await v.play()}catch(e){}
  let det=null,jq=null;
  if('BarcodeDetector' in window){try{det=new BarcodeDetector({formats:['qr_code']})}catch(e){det=null}}
  if(!det){try{jq=await loadJsQR()}catch(e){stop();msg('مقدرتش أحمّل قارئ الكود. اتأكد من النت وجرب تاني.',true);return}}
  msg('وجّه الكاميرا ناحية الكود اللي على كرت العميل');
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
  S_.timer=setInterval(async()=>{
    const el=document.getElementById('sc-v');
    if(!el||!el.isConnected){stop();return}
    if(S_.busy||el.readyState<2||!el.videoWidth)return;
    S_.busy=true;
    try{
      let text='';
      if(det){const r=await det.detect(el);if(r&&r[0])text=r[0].rawValue||''}
      else{
        const k=Math.min(1,640/el.videoWidth);cv.width=Math.round(el.videoWidth*k);cv.height=Math.round(el.videoHeight*k);
        cx.drawImage(el,0,0,cv.width,cv.height);
        const id=cx.getImageData(0,0,cv.width,cv.height),r=jq(id.data,id.width,id.height,{inversionAttempts:'dontInvert'});
        if(r&&r.data)text=r.data;
      }
      if(text){stop();t.closeModal();onText(text);return}
    }catch(e){}
    S_.busy=false;
  },200);
}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-sc=cancel]')){stop();const t=T();if(t)t.closeModal()}});
window.RafdScan={open,stop,parse,make,shortCode,_t:{loadJsQR}};
})();
