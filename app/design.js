/* رفد - مصمم كرت الولاء: لوجو، ألوان، عدد الزيارات للهدية، نص الهدية، مع معاينة حية.
   بيتحفظ في tenants/{tid}/config/loyalty.card ونسخة عامة في pub/{tid} (للصفحة اللي بتضيف الكرت للمحفظة). */
(function(){
'use strict';
const T=()=>window.__T;
const PV=()=>window.RafdPass;
const D={draft:null,busy:false,logoErr:''};
const PRESETS=[['زيتي وعنبري','#0B3B3A','#F3F5F2','#F2A93B'],['كريمي وبني','#F5EBDD','#3B2416','#B5651D'],['أسود وذهبي','#16130F','#F4EBD9','#D4A63C'],['أبيض وأخضر','#FFFFFF','#14342B','#1F8A5B'],['وردي','#FCE8EC','#4A1426','#D6336C']];
const nfa=x=>Number(x).toLocaleString('ar-EG-u-nu-latn');
function cur(){const L=window.ThrillsLoy;const c=L&&L.cardCfg?L.cardCfg():null;const t=T().S.tenant;return PV().norm(Object.assign({title:(t&&t.name)||''},c||{}))}
function start(){D.draft=cur();D.logoErr=''}
function hasSaved(){const L=window.ThrillsLoy;return !!(L&&L.cardCfg&&L.cardCfg())}
function warns(d){
  const out=[];
  if(PV().contrast(d.fg,d.bg)<4.5)out.push('لون الكتابة قريب من لون الخلفية وهيصعب قراءته. اختار لون أغمق أو أفتح.');
  if(PV().contrast(d.accent,d.bg)<3)out.push('لون الأختام قريب من لون الخلفية وهتبان بصعوبة.');
  return out;
}
function preview(){const d=D.draft;return PV().html(d,{filled:Math.min(3,d.n-1),name:'اسم العميل'})}
function joinUrl(){return new URL('../join/?t='+encodeURIComponent(T().S.tid),location.href).href}
function stickerSvg(){return window.RafdQR?window.RafdQR(joinUrl(),{label:'كود إضافة الكرت'}):''}
function stickerBlock(){
  const t=T(),{esc}=t;if(!hasSaved()||!window.RafdQR)return '';
  const name=esc((t.S.tenant&&t.S.tenant.name)||'');
  return '<div class="dz-st"><h3 style="margin:0">ملصق الكاشير</h3><p class="muted" style="margin:0">اطبعه وحطه عند الكاشير. العميل يعمل سكان (أو يقرّب موبايله لو لزقت NFC) وتفتحله صفحة إضافة الكرت للمحفظة.</p>'+
    '<div class="dz-stq">'+stickerSvg()+'</div><div class="ctrl"><button class="btn sm" data-dz-act="print">طباعة الملصق</button><button class="btn sm" data-dz-act="copyjoin">نسخ الرابط</button></div>'+
    '<small class="muted">لو عايز ملصق NFC: اكتب الرابط ده على الاستيكر بأي تطبيق NFC Tools.</small><input class="inp" readonly dir="ltr" id="dz-join" value="'+esc(joinUrl())+'"></div>';
}
function printSticker(){
  const t=T(),{esc}=t;const old=document.getElementById('dz-print');if(old)old.remove();
  const d=document.createElement('div');d.id='dz-print';
  d.innerHTML='<div class="dz-pr"><h1>'+esc((t.S.tenant&&t.S.tenant.name)||'')+'</h1><p>امسح الكود وضيف كرت الولاء لمحفظتك</p><div class="dz-prq">'+stickerSvg()+'</div><p class="dz-prs">كل زيارة = ختم. '+esc(PV().norm(cur()).n)+' زيارات وهديتك: '+esc(PV().norm(cur()).reward)+'</p></div>';
  document.body.appendChild(d);
  const done=()=>{const x=document.getElementById('dz-print');if(x)x.remove();window.removeEventListener('afterprint',done)};
  window.addEventListener('afterprint',done);
  try{window.print()}catch(e){done()}
}
function tab(){
  const t=T(),{esc}=t;if(!D.draft)start();const d=D.draft;
  return '<h2 style="font-size:1.3rem">تصميم الكرت</h2><p class="muted" style="margin:0">ده شكل الكرت اللي هيظهر في محفظة العميل. غيّر وشوف النتيجة على طول.</p>'+
    '<div class="dz"><div class="dz-pv" id="dz-pv">'+preview()+'</div><div class="dz-f">'+
    '<label class="f"><span>اسم الكرت</span><input class="inp" data-dz="title" maxlength="40" value="'+esc(d.title)+'" placeholder="اسم مطعمك"></label>'+
    '<div class="f"><span>اللوجو</span><div class="ctrl"><label class="btn sm" for="dz-logo">'+(d.logo?'غيّر اللوجو':'ارفع لوجو')+'</label><input id="dz-logo" type="file" accept="image/png,image/jpeg,image/webp" hidden>'+(d.logo?'<button class="btn sm bad" data-dz-act="nologo">شيل اللوجو</button>':'')+'</div><small class="muted">صورة مربعة أو مستطيلة بخلفية شفافة تظهر أحسن. بنصغّرها تلقائياً.</small><div class="err" id="dz-logoerr" role="alert">'+esc(D.logoErr)+'</div></div>'+
    '<div class="f"><span>ألوان جاهزة</span><div class="dz-sw">'+PRESETS.map((p,i)=>'<button type="button" class="dz-p" data-dz-act="preset" data-i="'+i+'" style="background:'+p[1]+';color:'+p[2]+';border-color:'+p[3]+'" aria-label="'+esc(p[0])+'"><i style="background:'+p[3]+'"></i></button>').join('')+'</div></div>'+
    '<div class="ctrl dz-c"><label class="f"><span>الخلفية</span><input type="color" class="dz-col" data-dz="bg" value="'+d.bg+'"></label><label class="f"><span>الكتابة</span><input type="color" class="dz-col" data-dz="fg" value="'+d.fg+'"></label><label class="f"><span>الأختام</span><input type="color" class="dz-col" data-dz="accent" value="'+d.accent+'"></label></div>'+
    '<div class="err" id="dz-warn" role="status">'+warns(d).map(esc).join(' ')+'</div>'+
    '<div class="ctrl"><label class="f" style="flex:0 1 150px"><span>عدد الزيارات للهدية</span><input class="inp" data-dz="n" inputmode="numeric" maxlength="2" value="'+esc(d.n)+'"></label>'+
    '<label class="f" style="flex:1 1 200px"><span>الهدية</span><input class="inp" data-dz="reward" maxlength="60" value="'+esc(d.reward)+'" placeholder="مثلاً: قهوة مجانية"></label></div>'+
    '<div class="err" id="dz-err" role="alert"></div>'+
    '<div class="actions"><button class="btn pri" data-dz-act="save">'+(hasSaved()?'حفظ التعديلات':'حفظ الكرت')+'</button><button class="btn" data-dz-act="reset">رجوع لآخر نسخة محفوظة</button></div>'+
    '</div></div>'+stickerBlock();
}
function repaint(){
  const t=T();const pv=t.$('#dz-pv');if(pv&&D.draft)pv.innerHTML=preview();
  const w=t.$('#dz-warn');if(w)w.textContent=warns(D.draft).join(' ');
}
function fullRender(){const el=T().$('#abody');if(el&&T().S.tab==='lcard')el.innerHTML=tab()}
// تصغير اللوجو لأقصى ضلع 320 ويفضل PNG، وبنحاول نخليه أقل من ~60 كيلو
function shrink(file){
  return new Promise((res,rej)=>{
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))return rej(new Error('الصيغة لازم تكون PNG أو JPG أو WebP'));
    if(file.size>6*1024*1024)return rej(new Error('الصورة كبيرة قوي. اختار صورة أصغر من ٦ ميجا'));
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      try{
        let side=320,out='';
        for(let tries=0;tries<5;tries++){
          const k=Math.min(1,side/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*k)),h=Math.max(1,Math.round(img.height*k));
          const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);
          out=cv.toDataURL('image/png');
          if(out.length>60000)out=cv.toDataURL('image/webp',0.85);
          if(out.length<=60000)break;
          side=Math.round(side*0.7);
        }
        URL.revokeObjectURL(url);
        if(!/^data:image\/(png|webp)/.test(out)||out.length>90000)return rej(new Error('مقدرتش أصغّر الصورة كفاية. جرب صورة أبسط'));
        res(out);
      }catch(e){rej(new Error('الصورة دي مش مقروءة'))}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('الصورة دي مش مقروءة'))};
    img.src=url;
  });
}
async function save(){
  const t=T(),{S,$,wr,toast}=t;if(D.busy||!D.draft)return;
  const d=PV().norm(D.draft),err=m=>{const e=$('#dz-err');if(e)e.textContent=m};
  if(!d.title){err('اكتب اسم الكرت');return}
  if(!(Number(D.draft.n)>=2&&Number(D.draft.n)<=30))return err('عدد الزيارات للهدية بين ٢ و ٣٠');
  if(!String(D.draft.reward||'').trim())return err('اكتب الهدية');
  err('');D.busy=true;
  const card={title:d.title,bg:d.bg,fg:d.fg,accent:d.accent,logo:d.logo,n:d.n,reward:d.reward};
  const ok=await wr(()=>S.db.doc('config/loyalty').set({card},{merge:true}));
  D.busy=false;
  if(!ok)return;
  // نسخة عامة للقراءة بدون تسجيل دخول (صفحة إضافة الكرت للمحفظة). فشلها مش بيمنع الحفظ.
  try{const rr=S.isAdmin&&S.rawA?S.rawA:S.rawD;await rr.doc('pub/'+S.tid).set(Object.assign({},card,{tid:S.tid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}))}catch(e){}
  toast('اتحفظ تصميم الكرت');
  D.draft=null;fullRender();
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-dz-act]');if(!el||!D)return;const t=T();if(!t)return;
  const a=el.dataset.dzAct;
  if(a==='save')save();
  else if(a==='print')printSticker();
  else if(a==='copyjoin'){const i=t.$('#dz-join');if(i){(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>t.toast('اتنسخ الرابط')).catch(()=>{i.focus();i.select();t.toast('اضغط نسخ من القايمة')})}}
  else if(a==='reset'){start();fullRender()}
  else if(a==='nologo'&&D.draft){D.draft.logo='';fullRender()}
  else if(a==='preset'&&D.draft){const p=PRESETS[Number(el.dataset.i)];if(p){D.draft.bg=p[1];D.draft.fg=p[2];D.draft.accent=p[3];fullRender()}}
});
document.addEventListener('input',e=>{
  const x=e.target;if(!x||!x.dataset||!x.dataset.dz||!D.draft)return;
  const k=x.dataset.dz;
  if(k==='n'){D.draft.n=String(x.value).replace(/[^0-9]/g,'').slice(0,2)}
  else D.draft[k]=x.value;
  repaint();
});
document.addEventListener('change',async e=>{
  const x=e.target;if(!x||x.id!=='dz-logo'||!D.draft)return;
  const f=x.files&&x.files[0];if(!f)return;
  try{D.draft.logo=await shrink(f);D.logoErr=''}catch(er){D.logoErr=er.message}
  fullRender();
});
function clear(){D.draft=null;D.busy=false;D.logoErr=''}
window.RafdDesign={tab,clear,_t:{shrink,warns,cur,joinUrl}};
})();
