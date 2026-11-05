/* رفد - الولاء: العملاء، تسجيل الزيارات، الفئات، وكرت العميل العام.
   المطعم (تحت tenants/{tid}): customers/{رقم التليفون}, config/loyalty. العام (على مستوى الجذر): cards/{cardId} = اللي صفحة الكرت بتقراه.
   الفئة بتتحسب من تواريخ الزيارات بمحرك RafdTiers (tiers.js). */
(function(){
'use strict';
const T=()=>window.__T;
const TI=()=>window.RafdTiers;
const AR='٠١٢٣٤٥٦٧٨٩';
const digits=s=>String(s==null?'':s).replace(/[٠-٩]/g,d=>AR.indexOf(d)).replace(/[^0-9]/g,'');
const nf=x=>Number(x).toLocaleString('ar-EG-u-nu-latn');
const DAY=86400000;
const WIN_LABEL={month:'الشهر الحالي (بيتصفّر أول كل شهر)',rolling30:'آخر ٣٠ يوم',rolling90:'آخر ٩٠ يوم',rolling365:'آخر سنة'};
const L={tid:null,cust:[],cfg:null,ok:{c:false,g:false},err:false,unsubs:[],q:'',kq:'',form:null,dup:null,del:null,draft:null,busy:false};

/* ---------- helpers ---------- */
const deviceTz=()=>-new Date().getTimezoneOffset();
function defaultCfg(){return {window:TI().TEMPLATE.window,tiers:JSON.parse(JSON.stringify(TI().TEMPLATE.tiers)),tz:deviceTz(),cc:'966'}}
function cfgNow(){
  const c=L.cfg;
  if(c&&TI().validate(c)===null)return {window:c.window,tiers:c.tiers,tz:typeof c.tz==='number'?c.tz:deviceTz(),cc:String(c.cc||'966')};
  return defaultCfg();
}
function rid(){const a=new Uint8Array(24);crypto.getRandomValues(a);const cs='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';return Array.from(a).map(x=>cs[x%cs.length]).join('')}
const raw=()=>{const S=T().S;return S.isAdmin&&S.rawA?S.rawA:S.rawD};
const cRef=id=>raw().doc('tenants/'+T().S.tid+'/customers/'+id);
const kRef=id=>raw().doc('cards/'+id);
const SV=()=>firebase.firestore.FieldValue.serverTimestamp();
const firstName=n=>(String(n||'').trim().split(/\s+/)[0]||'عميل').slice(0,40);
const cardUrl=id=>new URL('../card/?c='+encodeURIComponent(id),location.href).href;
function trimVisits(v,now){const from=now-400*DAY;return v.filter(x=>typeof x==='number'&&x>=from).slice(-800)}
function ago(ms){
  if(!ms)return 'لسه ما زارش';
  const m=Math.floor((Date.now()-ms)/60000);
  if(m<1)return 'دلوقتي';
  if(m<60)return 'من '+m+' د';
  const h=Math.floor(m/60);if(h<24)return 'من '+h+' س';
  const d=Math.floor(h/24);return d===1?'امبارح':'من '+d+' يوم';
}
function cardDoc(c,visits,cfg){
  const S=T().S;
  return {tid:S.tid,rname:String((S.tenant&&S.tenant.name)||'').slice(0,80),name:firstName(c.name),tz:cfg.tz,
    cfg:{window:cfg.window,tiers:cfg.tiers.map(x=>({key:x.key,name:x.name,min:x.min,perks:(x.perks||[]).slice(0,6)}))},
    visits:visits.slice(-800),updatedAt:SV()};
}
const evalC=(c,now)=>{const cfg=cfgNow();return TI().evaluate(c.visits||[],cfg,now||Date.now(),cfg.tz)};
/* وضعين: tiers (فئات + كرت ويب عام، للمطاعم القديمة والمتقدمة) أو stamps (كرت أختام للأساسية) */
const stampsMode=()=>!T().tiersOn();
const SK=()=>window.RafdStamps;
const stampCfg=()=>SK().norm(L.cfg&&L.cfg.card);
const stampSt=c=>SK().state(c,stampCfg());
/* عرض التقدّم حسب الوضع: pill، سطر العدد، الشريط، رسالة، ونص مختصر للقايمة */
function P(c,now){
  const t=T(),{esc}=t;
  if(stampsMode()){
    const s=stampSt(c);
    return {pill:s.available>0?'<span class="pill ok">هدية جاهزة</span>':'<span class="pill">'+nf(s.progress)+'/'+nf(s.N)+'</span>',
      big:nf(s.available>0?s.N:s.progress),unit:'ختم من '+nf(s.N),
      bar:'<div class="lbar" role="progressbar" aria-valuenow="'+Math.round(s.ratio*100)+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+Math.round(s.ratio*100)+'%"></i></div>',
      nudge:SK().nudge(s),short:nf(s.n)+' زيارة',st:s,up:false};
  }
  const r=evalC(c,now);
  return {pill:tierPill(r),big:nf(r.count),unit:'زيارة في '+(cfgNow().window==='month'?'الشهر ده':'الفترة'),bar:bar(r),nudge:TI().nudge(r),short:nf(r.count)+' زيارة',r,up:false};
}
const tierPill=r=>r.tier?'<span class="pill ok">'+T().esc(r.tier.name)+'</span>':'<span class="pill">بدون فئة</span>';
const bar=r=>'<div class="lbar" role="progressbar" aria-valuenow="'+Math.round(r.progress*100)+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+Math.round(r.progress*100)+'%"></i></div>';

/* ---------- data ---------- */
function clear(){
  L.unsubs.forEach(f=>{try{f()}catch(e){}});L.unsubs=[];L.tid=null;L.cust=[];L.cfg=null;L.ok={c:false,g:false};L.err=false;L.form=null;L.dup=null;L.del=null;L.draft=null;L.q='';L.kq='';
  if(window.RafdDesign)window.RafdDesign.clear();
}
function sub(){
  const t=T(),S=t.S;if(!S.db||!S.tid||!(S.isAdmin||S.deviceOk))return;
  if(L.tid===S.tid&&L.unsubs.length)return;
  clear();L.tid=S.tid;
  const fail=k=>()=>{L.ok[k]=true;L.err=true;L.tid=null;refresh()};
  L.unsubs.push(S.db.collection('customers').onSnapshot(q=>{L.cust=t.mapDocs(q);L.ok.c=true;L.err=false;refresh()},fail('c')));
  L.unsubs.push(S.db.doc('config/loyalty').onSnapshot(s=>{L.cfg=s.exists?s.data():null;L.ok.g=true;refresh()},fail('g')));
}
const ready=()=>L.ok.c&&L.ok.g;
const TABS=['customers','lcard','lset'];
function refresh(){
  const t=T();if(!t)return;const {S,$}=t;
  if(typeof L.onChange==='function'){try{L.onChange()}catch(e){}}
  if(S.view==='admin'&&TABS.indexOf(S.tab)>=0&&$('#abody')){
    const a=document.activeElement;
    if(S.tab==='customers'&&$('#lc-list')){$('#lc-list').innerHTML=custList(L.q);const st=$('#lc-stats');if(st)st.innerHTML=statsHTML();return}
    if(S.tab==='lcard'&&$('#dz-pv'))return;
    if(a&&a.closest&&a.closest('#abody')&&/INPUT|SELECT|TEXTAREA/.test(a.tagName))return;
    $('#abody').innerHTML=tabHTML(S.tab);
  }
  if($('#lk-list'))$('#lk-list').innerHTML=kList(L.kq);
}
function tab(name){sub();if(L.err)return '<div class="empty">مقدرتش أحمّل العملاء. اتأكد إن الباقة فيها الولاء، وإن فيه نت.</div>';return ready()?tabHTML(name):'<div class="empty">جاري التحميل...</div>'}
function tabHTML(name){return {customers:tabCust,lset:tabSet,lcard:()=>window.RafdDesign?window.RafdDesign.tab():''}[name]()}

/* ---------- قائمة العملاء (إدارة) ---------- */
function statsHTML(){
  if(stampsMode()){
    let rdy=0,act=0;const k=new Date();k.setHours(0,0,0,0);const from=k.getTime();
    L.cust.forEach(c=>{if(stampSt(c).available>0)rdy++;if((c.visits||[]).some(v=>v>=from))act++});
    const lim=T().limitOf('cards');
    return '<div class="stat"><b>'+nf(L.cust.length)+(isFinite(lim)?'<small class="muted"> / '+nf(lim)+'</small>':'')+'</b><span>كرت صادر</span></div><div class="stat ok"><b>'+nf(act)+'</b><span>زاروا النهارده</span></div><div class="stat"><b>'+nf(rdy)+'</b><span>هدايا جاهزة</span></div>';
  }
  const cfg=cfgNow(),now=Date.now();
  let withTier=0,active=0;
  L.cust.forEach(c=>{const r=TI().evaluate(c.visits||[],cfg,now,cfg.tz);if(r.tier)withTier++;if(r.count>0)active++});
  return '<div class="stat"><b>'+nf(L.cust.length)+'</b><span>عميل</span></div><div class="stat ok"><b>'+nf(active)+'</b><span>زاروا في الفترة الحالية</span></div><div class="stat"><b>'+nf(withTier)+'</b><span>وصلوا لفئة</span></div>';
}
function matches(c,q){
  const t=T();const s=t.norm(q);if(!s)return true;
  const d=digits(q);
  const code=String(q).trim().toLowerCase();
  return t.norm(c.name).indexOf(s)>=0||(d.length>=2&&c.id.indexOf(d)>=0)||(/^[a-z0-9]{5,}$/.test(code)&&String(c.cardId||'').toLowerCase().indexOf(code)===0);
}
function rowHTML(c,act){
  const t=T(),{esc}=t;const p=P(c);
  return '<button class="lrow" data-la="'+act+'" data-id="'+esc(c.id)+'"><span class="lw"><b>'+esc(c.name)+'</b><span class="muted" dir="ltr">'+esc(c.id)+'</span></span><span class="lm">'+p.pill+'<span class="muted">'+p.short+' · '+ago(c.last)+'</span></span></button>';
}
function custList(q){
  const arr=L.cust.filter(c=>matches(c,q)).sort((a,b)=>(b.last||0)-(a.last||0));
  if(!arr.length)return '<div class="empty">'+(L.cust.length?'مفيش نتيجة':'لسه مفيش عملاء. اضغط "عميل جديد / زيارة" وسجّل أول واحد.')+'</div>';
  return arr.slice(0,200).map(c=>rowHTML(c,'cust')).join('')+(arr.length>200?'<div class="muted" style="padding:10px">بيظهر أول ٢٠٠ بس. استخدم البحث.</div>':'');
}
function tabCust(){
  return '<div class="tiles" id="lc-stats">'+statsHTML()+'</div>'+
    '<div class="ctrl"><label class="search" style="flex:1 1 220px"><input id="lc-q" class="inp" type="search" placeholder="دوّر بالاسم أو رقم التليفون" autocomplete="off" value="'+T().esc(L.q)+'"></label><button class="btn pri" data-la="kopen">عميل جديد / زيارة</button></div>'+
    '<div class="list lrows" id="lc-list">'+custList(L.q)+'</div>';
}

/* ---------- شاشة الكاشير: بحث وتسجيل زيارة ---------- */
function kList(q){
  const t=T(),{esc}=t;const d=digits(q);
  let arr=q.trim()?L.cust.filter(c=>matches(c,q)):L.cust.slice().sort((a,b)=>(b.last||0)-(a.last||0)).slice(0,5);
  arr=arr.sort((a,b)=>(b.last||0)-(a.last||0)).slice(0,8);
  let h=arr.map(c=>rowHTML(c,'cust')).join('');
  if(!arr.length)h='<div class="empty">'+(q.trim()?'مفيش عميل بالاسم/الرقم ده':'اكتب آخر أرقام التليفون أو الاسم')+'</div>';
  const exact=d&&L.cust.some(c=>c.id===d);
  if(q.trim()&&!exact)h+='<button class="btn lg" data-la="new" data-d="'+esc(d.length>=6?d:'')+'" data-n="'+esc(d?'':q.trim())+'">+ عميل جديد'+(d.length>=6?' برقم '+esc(d):'')+'</button>';
  return h;
}
function openKiosk(){
  const t=T(),{S,openModal}=t;sub();
  if(!S.db||!(S.isAdmin||S.deviceOk))return;
  L.kq='';
  openModal('<div class="pf"><h2>زيارة عميل</h2><p class="muted" style="margin:0">دوّر بالتليفون أو الاسم، أو ضيف عميل جديد.</p>'+
    (window.RafdScan?'<button class="btn lg" data-la="scan">امسح كود الكرت بالكاميرا</button>':'')+
    '<input id="lk-q" class="inp" type="search" inputmode="search" placeholder="رقم التليفون أو الاسم أو كود الكرت" autocomplete="off" autofocus>'+
    '<div class="list lrows" id="lk-list">'+(ready()?kList(''):'<div class="empty">جاري التحميل...</div>')+'</div>'+
    '<div class="actions"><button class="btn" data-act="close">إغلاق</button></div></div>');
  setTimeout(()=>{const i=t.$('#lk-q');if(i)i.focus()},50);
}

/* ---------- مسح كود الكرت ---------- */
function scanOpen(){
  const t=T();if(!window.RafdScan)return;sub();
  window.RafdScan.open(text=>onScan(text));
}
function onScan(text){
  const t=T(),{S,toast}=t;const p=window.RafdScan.parse(text);
  if(!p){toast('الكود ده مش كرت ولاء من رفد');openKiosk();return}
  if(p.tid!==S.tid){toast('الكرت ده لمطعم تاني');openKiosk();return}
  const c=L.cust.find(x=>x.cardId===p.cardId);
  if(!c){toast('الكرت ده مش متسجل عندنا');openKiosk();return}
  visit(c.id);
}

/* ---------- عميل جديد ---------- */
function newForm(d,n){
  const t=T(),{esc,openModal}=t;
  openModal('<div class="pf"><h2>عميل جديد</h2>'+
    '<label class="f"><span>الاسم</span><input id="nf-name" class="inp" maxlength="60" autocomplete="off" value="'+esc(n||'')+'"></label>'+
    '<label class="f"><span>رقم التليفون</span><input id="nf-phone" class="inp" inputmode="tel" dir="ltr" maxlength="20" autocomplete="off" value="'+esc(d||'')+'"></label>'+
    '<p class="muted" style="margin:0;font-size:.9rem">اكتب الرقم زي ما هتبعت عليه واتساب (بكود الدولة لو عايز تبعت له الكرت).</p>'+
    '<div class="err" id="nf-err" role="alert"></div>'+
    '<div class="actions"><button class="btn pri" data-la="create">إضافة وتسجيل أول زيارة</button><button class="btn" data-la="kopen">رجوع</button></div></div>');
  setTimeout(()=>{const i=t.$(d?'#nf-name':'#nf-phone');if(i)i.focus()},50);
}
async function create(){
  const t=T(),{S,$,wr,toast}=t;if(L.busy)return;
  const name=($('#nf-name').value||'').trim().slice(0,60),ds=digits($('#nf-phone').value);
  const err=m=>{$('#nf-err').textContent=m};
  if(!name){err('اكتب الاسم');return}
  if(ds.length<6||ds.length>15){err('رقم التليفون مش مظبوط');return}
  if(L.cust.length>=t.limitOf('cards')){err('وصلت للحد الأقصى لباقتك ('+nf(t.limitOf('cards'))+' كرت). ترقّى لباقة أعلى لإصدار كروت جديدة.');return}
  const dup=L.cust.find(c=>c.id===ds||(ds.length>=9&&c.id.slice(-9)===ds.slice(-9)));
  if(dup){toast('العميل ده موجود');openCust(dup.id);return}
  L.busy=true;const btn=$('[data-la="create"]');if(btn)btn.disabled=true;
  const now=Date.now(),cfg=cfgNow(),cardId=rid(),visits=[now];
  const c={name,phone:ds,cardId};
  const b=raw().batch();
  const doc={name,phone:ds,cardId,createdAt:SV(),visits,last:now,note:''};
  if(stampsMode()){doc.n=1;doc.rw=0}
  b.set(cRef(ds),doc);
  if(!stampsMode())b.set(kRef(cardId),cardDoc(c,visits,cfg));
  const ok=await wr(()=>b.commit());
  L.busy=false;
  if(!ok){if(btn)btn.disabled=false;return}
  showDone(Object.assign({id:ds,name,phone:ds,cardId,visits,last:now},stampsMode()?{n:1,rw:0}:{}),null,true);
}

/* ---------- تفاصيل العميل + تسجيل زيارة ---------- */
function linkBlock(c){
  if(stampsMode())return '';
  const t=T(),{esc}=t;const url=cardUrl(c.cardId),cfg=cfgNow(),S=t.S;
  let wa=digits(c.phone);
  if(wa.indexOf('00')===0)wa=wa.slice(2);else if(wa.charAt(0)==='0')wa=cfg.cc+wa.slice(1);
  const msg='أهلاً '+firstName(c.name)+'، ده كرت ولائك في '+((S.tenant&&S.tenant.name)||'المطعم')+': '+url;
  return '<div class="lnk"><input class="inp" readonly dir="ltr" id="lnk-v" value="'+esc(url)+'"><div class="actions"><button class="btn sm" data-la="copy">نسخ الرابط</button><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/'+esc(wa)+'?text='+encodeURIComponent(msg)+'">إرسال واتساب</a></div></div>';
}
function openCust(id){
  const t=T(),{S,esc,openModal,fmtT,dkey,fromKey}=t;const c=L.cust.find(x=>x.id===id);if(!c){t.closeModal();return}
  const p=P(c);const vs=(c.visits||[]).slice().sort((a,b)=>b-a).slice(0,8);
  const dup=L.dup===id;
  openModal('<div class="pf lcd"><h2>'+esc(c.name)+'</h2><div class="muted" dir="ltr" style="text-align:start">'+esc(c.id)+'</div>'+
    '<div class="lcur">'+p.pill+'<b>'+p.big+'</b><span class="muted">'+p.unit+'</span></div>'+p.bar+
    '<p style="margin:0">'+esc(p.nudge)+'</p>'+
    (p.r&&p.r.atRisk?'<div class="bill warn" style="margin:0">قرّب ينزل من فئته لو ما زارش الأسبوع الجاي.</div>':'')+
    (p.st&&p.st.available>0?'<div class="actions"><button class="btn lg" data-la="redeem" data-id="'+esc(c.id)+'">تسليم الهدية: '+esc(p.st.reward)+'</button></div>':'')+
    (dup?'<div class="bill warn" style="margin:0">اتسجلت زيارة '+ago(c.last)+'. تسجّل واحدة تانية؟</div>':'')+
    '<div class="actions"><button class="btn pri lg" data-la="visit" data-id="'+esc(c.id)+'">'+(dup?'أيوه، سجّل زيارة تانية':'سجّل زيارة')+'</button></div>'+
    linkBlock(c)+
    (c.note?'<p class="muted" style="margin:0">ملاحظة: '+esc(c.note)+'</p>':'')+
    '<h3 style="margin:6px 0 0">آخر الزيارات</h3><div class="muted">'+(vs.length?vs.map(v=>esc(t.fmtDate(dkey(v)))+' '+fmtT(v)).join('<br>'):'مفيش')+'</div>'+
    '<div class="actions">'+(S.isAdmin?'<button class="btn sm" data-la="edit" data-id="'+esc(c.id)+'">تعديل</button><button class="btn sm" data-la="undo" data-id="'+esc(c.id)+'">إلغاء آخر زيارة</button><button class="btn sm bad" data-la="del" data-id="'+esc(c.id)+'">'+(L.del===c.id?'تأكيد الحذف':'حذف')+'</button>':'')+
    '<button class="btn sm" data-la="kopen">بحث تاني</button><button class="btn sm" data-act="close">إغلاق</button></div></div>');
}
async function visit(id,force){
  const t=T(),{wr}=t;const c=L.cust.find(x=>x.id===id);if(!c||L.busy)return;
  const now=Date.now();
  if(!force&&c.last&&now-c.last<30*60000&&L.dup!==id){L.dup=id;openCust(id);return}
  L.busy=true;L.dup=null;
  const stamps=stampsMode();
  const before=stamps?stampSt(c):evalC(c,now),visits=trimVisits((c.visits||[]).concat(now),now),cfg=cfgNow();
  const upd={visits,last:now};if(stamps)upd.n=SK().total(c)+1;
  const b=raw().batch();
  b.update(cRef(id),upd);
  if(!stamps)b.set(kRef(c.cardId),cardDoc(c,visits,cfg));
  const ok=await wr(()=>b.commit());
  L.busy=false;
  if(ok)showDone(Object.assign({},c,{visits,last:now},stamps?{n:upd.n}:{}),before,false);
}
function showDone(c,before,isNew){
  const t=T(),{esc,openModal}=t;const p=P(c),r=p.r||{};
  const stamps=stampsMode();
  const up=!stamps&&r.tier&&(!before||!before.tier||before.tier.key!==r.tier.key)&&!isNew;
  const got=stamps&&p.st.available>0&&(!before||before.available<p.st.available);
  openModal('<div class="pf lcd"><div class="lok" aria-hidden="true"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>'+
    '<h2 style="text-align:center">'+(isNew?'اتضاف '+esc(c.name)+' واتسجلت أول زيارة':'اتسجلت زيارة '+esc(c.name))+'</h2>'+
    '<div class="lcur" style="justify-content:center">'+p.pill+'<b>'+p.big+'</b><span class="muted">'+(stamps?p.unit:'زيارة')+'</span></div>'+p.bar+
    (got?'<div class="bill ok" style="margin:0">العميل كمّل كرته! سلّمه الهدية: '+esc(p.st.reward)+'</div>':'')+
    (got?'<div class="actions" style="justify-content:center"><button class="btn pri lg" data-la="redeem" data-id="'+esc(c.id)+'">تسليم الهدية دلوقتي</button></div>':'')+
    (up?'<div class="bill ok" style="margin:0">ترقّى للفئة '+esc(r.tier.name)+(r.tier.perks&&r.tier.perks.length?': '+esc(r.tier.perks.join('، ')):'')+'</div>':'')+
    '<p style="margin:0;text-align:center">'+esc(p.nudge)+'</p>'+
    (isNew?linkBlock(c):'')+
    '<div class="actions" style="justify-content:center"><button class="btn pri" data-la="kopen">عميل تاني</button><button class="btn" data-act="close">خلاص</button></div></div>');
}
async function undo(id){
  const t=T(),{wr,toast}=t;const c=L.cust.find(x=>x.id===id);if(!c||!(c.visits||[]).length||L.busy)return;
  L.busy=true;
  const visits=c.visits.slice().sort((a,b)=>a-b);visits.pop();
  const b=raw().batch();
  const upd={visits,last:visits.length?visits[visits.length-1]:0};
  if(stampsMode())Object.assign(upd,SK().afterUndo(c,stampCfg()));
  b.update(cRef(id),upd);
  if(!stampsMode())b.set(kRef(c.cardId),cardDoc(c,visits,cfgNow()));
  const ok=await wr(()=>b.commit());L.busy=false;
  if(ok){toast('اتلغت آخر زيارة');setTimeout(()=>openCust(id),150)}
}
async function redeem(id){
  const t=T(),{wr,toast}=t;const c=L.cust.find(x=>x.id===id);if(!c||L.busy||!stampsMode())return;
  const s=stampSt(c);if(s.available<1)return;
  L.busy=true;
  const ok=await wr(()=>cRef(id).update({rw:(Number(c.rw)||0)+1}));
  L.busy=false;
  if(ok){toast('اتسلّمت الهدية. الكرت بدأ من جديد');setTimeout(()=>openCust(id),150)}
}
function editForm(id){
  const t=T(),{esc,openModal}=t;const c=L.cust.find(x=>x.id===id);if(!c)return;
  openModal('<div class="pf"><h2>تعديل العميل</h2>'+
    '<label class="f"><span>الاسم</span><input id="ef-name" class="inp" maxlength="60" value="'+esc(c.name)+'"></label>'+
    '<label class="f"><span>ملاحظة (مثلاً: حساسية، مناسبة)</span><input id="ef-note" class="inp" maxlength="200" value="'+esc(c.note||'')+'"></label>'+
    '<div class="err" id="ef-err" role="alert"></div>'+
    '<div class="actions"><button class="btn pri" data-la="esave" data-id="'+esc(id)+'">حفظ</button><button class="btn" data-la="cust" data-id="'+esc(id)+'">رجوع</button></div></div>');
}
async function esave(id){
  const t=T(),{$,wr,toast}=t;const c=L.cust.find(x=>x.id===id);if(!c)return;
  const name=($('#ef-name').value||'').trim().slice(0,60),note=($('#ef-note').value||'').trim().slice(0,200);
  if(!name){$('#ef-err').textContent='اكتب الاسم';return}
  const b=raw().batch();
  b.update(cRef(id),{name,note});
  if(!stampsMode())b.set(kRef(c.cardId),cardDoc(Object.assign({},c,{name}),c.visits||[],cfgNow()));
  if(await wr(()=>b.commit())){toast('اتحفظ');setTimeout(()=>openCust(id),150)}
}
async function del(id){
  const t=T(),{wr,toast,closeModal}=t;const c=L.cust.find(x=>x.id===id);if(!c)return;
  if(L.del!==id){L.del=id;openCust(id);return}
  L.del=null;
  const b=raw().batch();b.delete(cRef(id));if(!stampsMode())b.delete(kRef(c.cardId));
  if(await wr(()=>b.commit())){closeModal();toast('اتحذف العميل وكرته')}
}

/* ---------- إعدادات الفئات ---------- */
function startDraft(){const c=cfgNow();L.draft={window:c.window,cc:c.cc,tiers:c.tiers.map(x=>({key:x.key,name:x.name,min:x.min,perks:(x.perks||[]).join('\n')}))}}
function tabSet(){
  const t=T(),{esc}=t;if(!L.draft)startDraft();const d=L.draft;
  return '<h2 style="font-size:1.3rem">فئات العملاء</h2>'+
    '<p class="muted" style="margin:0">العميل بياخد فئة حسب عدد زياراته. الحدود والمزايا من عندك، والقالب مجرد بداية.</p>'+
    '<div class="ctrl"><label class="f" style="flex:1 1 240px"><span>بنحسب الزيارات في</span><select class="inp" data-ls="window">'+Object.keys(WIN_LABEL).map(k=>'<option value="'+k+'"'+(d.window===k?' selected':'')+'>'+WIN_LABEL[k]+'</option>').join('')+'</select></label>'+
    '<label class="f" style="flex:0 1 150px"><span>كود الدولة للواتساب</span><input class="inp" data-ls="cc" dir="ltr" inputmode="numeric" maxlength="4" value="'+esc(d.cc)+'"></label></div>'+
    '<div class="tcfg">'+d.tiers.map((x,i)=>'<div class="trow"><div class="ctrl"><label class="f" style="flex:1 1 140px"><span>اسم الفئة</span><input class="inp" data-ls="tname" data-i="'+i+'" maxlength="30" value="'+esc(x.name)+'"></label>'+
      '<label class="f" style="flex:0 1 130px"><span>من كام زيارة</span><input class="inp" data-ls="tmin" data-i="'+i+'" inputmode="numeric" maxlength="4" value="'+esc(x.min)+'"></label>'+
      '<button class="btn sm bad" data-la="tdel" data-i="'+i+'"'+(d.tiers.length<=1?' disabled':'')+'>حذف</button></div>'+
      '<label class="f"><span>المزايا (سطر لكل ميزة)</span><textarea class="inp" rows="3" data-ls="tperks" data-i="'+i+'" maxlength="300">'+esc(x.perks)+'</textarea></label></div>').join('')+'</div>'+
    '<div class="actions"><button class="btn" data-la="tadd"'+(d.tiers.length>=6?' disabled':'')+'>+ فئة</button><button class="btn" data-la="treset">رجوع للقالب</button><button class="btn pri" data-la="tsave">حفظ وتحديث كل الكروت</button></div>'+
    '<div class="err" id="ls-err" role="alert"></div>';
}
function draftCfg(){
  const d=L.draft;
  return {window:d.window,cc:digits(d.cc)||'966',tz:deviceTz(),tiers:d.tiers.map((x,i)=>({key:'t'+(i+1),name:String(x.name||'').trim(),min:Math.round(Number(digits(x.min))),perks:String(x.perks||'').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,6)}))};
}
async function tsave(){
  const t=T(),{$,wr,toast}=t;if(!L.draft||L.busy)return;
  const cfg=draftCfg(),err=TI().validate(cfg);
  if(err){$('#ls-err').textContent=err;return}
  if(cfg.tiers.some(x=>!isFinite(x.min)||x.min<1)){$('#ls-err').textContent='حد الزيارات لازم يكون رقم ١ أو أكتر';return}
  L.busy=true;$('#ls-err').textContent='';
  const ok1=await wr(()=>t.S.db.doc('config/loyalty').set(cfg));
  if(!ok1){L.busy=false;return}
  L.cfg=cfg;
  // تحديث نسخة الفئات داخل كل كرت عام (دفعات ≤ 400)
  let okAll=true;
  for(let i=0;i<L.cust.length&&okAll;i+=400){
    const b=raw().batch();
    L.cust.slice(i,i+400).forEach(c=>b.set(kRef(c.cardId),cardDoc(c,c.visits||[],cfg)));
    okAll=await wr(()=>b.commit());
  }
  L.busy=false;L.draft=null;
  if(okAll){toast('اتحفظت الفئات وكروت العملاء اتحدّثت')}
  refresh();const el=t.$('#abody');if(el&&t.S.tab==='lset')el.innerHTML=tabSet();
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-la]');if(!el)return;const t=T();if(!t)return;const {S,$,toast}=t;const a=el.dataset.la;
  const rerenderSet=()=>{const b=$('#abody');if(b&&S.tab==='lset')b.innerHTML=tabSet()};
  switch(a){
    case 'kopen':openKiosk();break;
    case 'scan':scanOpen();break;
    case 'cust':L.del=null;openCust(el.dataset.id);break;
    case 'new':newForm(el.dataset.d,el.dataset.n);break;
    case 'create':create();break;
    case 'visit':visit(el.dataset.id);break;
    case 'undo':undo(el.dataset.id);break;
    case 'redeem':redeem(el.dataset.id);break;
    case 'edit':editForm(el.dataset.id);break;
    case 'esave':esave(el.dataset.id);break;
    case 'del':del(el.dataset.id);break;
    case 'copy':{
      const i=$('#lnk-v');if(!i)break;
      try{await navigator.clipboard.writeText(i.value);toast('اتنسخ الرابط')}catch(x){i.focus();i.select();toast('اضغط نسخ من القايمة')}
    }break;
    case 'tadd':if(L.draft&&L.draft.tiers.length<6){const last=L.draft.tiers[L.draft.tiers.length-1];L.draft.tiers.push({key:'',name:'',min:String((Number(last&&last.min)||0)+5),perks:''});rerenderSet()}break;
    case 'tdel':if(L.draft&&L.draft.tiers.length>1){L.draft.tiers.splice(Number(el.dataset.i),1);rerenderSet()}break;
    case 'treset':startDraft();L.draft.tiers=JSON.parse(JSON.stringify(TI().TEMPLATE.tiers)).map(x=>({key:x.key,name:x.name,min:x.min,perks:x.perks.join('\n')}));L.draft.window=TI().TEMPLATE.window;rerenderSet();break;
    case 'tsave':tsave();break;
  }
});
document.addEventListener('input',e=>{
  const x=e.target;if(!x)return;const t=T();if(!t)return;
  if(x.id==='lk-q'){L.kq=x.value;const l=t.$('#lk-list');if(l)l.innerHTML=kList(L.kq);return}
  if(x.id==='lc-q'){L.q=x.value;const l=t.$('#lc-list');if(l)l.innerHTML=custList(L.q);return}
  if(x.dataset&&x.dataset.ls&&L.draft){
    const k=x.dataset.ls,i=Number(x.dataset.i);
    if(k==='window')L.draft.window=x.value;
    else if(k==='cc')L.draft.cc=x.value;
    else if(k==='tname')L.draft.tiers[i].name=x.value;
    else if(k==='tmin')L.draft.tiers[i].min=x.value;
    else if(k==='tperks')L.draft.tiers[i].perks=x.value;
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&(e.target.id==='nf-name'||e.target.id==='nf-phone')){e.preventDefault();create()}
});

function stats(){
  const d=new Date();d.setHours(0,0,0,0);const from=d.getTime();
  let today=0;L.cust.forEach(c=>{(c.visits||[]).forEach(v=>{if(v>=from)today++})});
  return {ready:ready(),customers:L.cust.length,hasCfg:!!L.cfg,designed:!!(L.cfg&&L.cfg.card),stamps:stampsMode(),visitsToday:today};
}
window.ThrillsLoy={tab,clear,openKiosk,scanOpen,onScan,sub,stats,cardCfg:()=>L.cfg&&L.cfg.card||null,onChange:fn=>{L.onChange=fn},_t:{digits,cardDoc,cfgNow,defaultCfg,firstName,trimVisits}};
})();
