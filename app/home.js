/* رفد - الشاشة الرئيسية للمالك: "ابدأ من هنا" بخطوة واحدة في كل مرة، وأرقام النهارده، وتشغيل الميزات تدريجياً. */
(function(){
'use strict';
const T=()=>window.__T;
const H={unsub:null,tid:null,dev:0,devOk:false};
const nf=x=>Number(x).toLocaleString('ar-EG-u-nu-latn');

function sub(){
  const t=T(),S=t.S;if(!S.db||!S.tid||!S.isAdmin)return;
  if(window.ThrillsLoy&&t.modOn('loyalty'))window.ThrillsLoy.sub();
  if(H.tid===S.tid&&H.unsub)return;
  clear();H.tid=S.tid;
  H.unsub=S.db.collection('devices').onSnapshot(q=>{H.dev=q.docs.length;H.devOk=true;refresh()},()=>{H.devOk=true;refresh()});
  if(window.ThrillsLoy)window.ThrillsLoy.onChange(refresh);
}
function clear(){if(H.unsub){try{H.unsub()}catch(e){}}H.unsub=null;H.tid=null;H.dev=0;H.devOk=false}
function refresh(){
  const t=T();if(!t)return;const {S,$}=t;
  if(S.view!=='admin'||S.tab!=='home'||!$('#abody'))return;
  const a=document.activeElement;if(a&&a.closest&&a.closest('#abody')&&/INPUT|SELECT|TEXTAREA/.test(a.tagName))return;
  $('#abody').innerHTML=html();
}
function tab(){sub();return html()}

function steps(){
  const t=T(),{S,modOn}=t;const out=[];
  const L=modOn('loyalty')&&window.ThrillsLoy?window.ThrillsLoy.stats():null;
  if(modOn('loyalty')){
    out.push({t:'سجّل أول عميل',d:'اكتب رقم تليفونه واسمه. هتتسجل له أول زيارة ويتعمل له كرت تبعتله رابطه.',done:!!(L&&L.customers>0),btn:'سجّل عميل',attr:'data-la="kopen"',wait:!(L&&L.ready)});
    out.push({t:'راجع فئات العملاء',d:'الفئات الجاهزة: فضية بعد ٥ زيارات، ذهبية ١٠، ماسية ٢٠ في الشهر. عدّل الأرقام والمزايا على مزاجك.',done:!!(L&&L.hasCfg),btn:'راجع الفئات',attr:'data-act="tab" data-t="lset"',wait:!(L&&L.ready)});
  }
  if(modOn('attendance')){
    out.push({t:'ضيف موظفينك',d:'الاسم والفرع والشيفت والرقم السري. الموظف بيسجل حضوره من التابلت بالرقم ده.',done:S.staff.filter(s=>s.active!==false).length>0,btn:'ضيف موظف',attr:'data-act="tab" data-t="staff"'});
  }
  if(modOn('loyalty')||modOn('attendance')){
    out.push({t:'اربط تابلت أو موبايل الكاشير',d:'اختياري لو هتشتغل من موبايلك بس. التابلت بيتربط بكود لمرة واحدة.',done:H.dev>0,btn:'طلّع كود ربط',attr:'data-act="tab" data-t="settings"',wait:!H.devOk,optional:true});
  }
  return out;
}

function html(){
  const t=T(),{S,esc,MODS,modOn,feat}=t;
  const st=steps(),req=st.filter(x=>!x.optional),doneN=st.filter(x=>x.done).length;
  const nextI=st.findIndex(x=>!x.done&&!x.wait);
  const all=st.length>0&&st.every(x=>x.done||x.optional&&nextI<0);
  const pct=st.length?Math.round(doneN/st.length*100):100;
  let h='<section class="hm-hero"><h2>أهلاً بيك في '+esc((S.tenant&&S.tenant.name)||'رفد')+'</h2>'+
    '<p class="muted">'+(all?'كل حاجة جاهزة. دي أرقام النهارده.':'خطوة واحدة في المرة. اللي بعد كده بتظهر لما تخلّص الحالية.')+'</p>'+
    (st.length&&!all?'<div class="hm-prog"><div class="lbar" role="progressbar" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+pct+'%"></i></div><span class="muted">خلّصت '+nf(doneN)+' من '+nf(st.length)+'</span></div>':'')+'</section>';
  if(nextI>=0){
    const x=st[nextI];
    h+='<section class="hm-next"><span class="hm-tag">الخطوة الجاية</span><h3>'+esc(x.t)+'</h3><p>'+esc(x.d)+'</p><div class="actions"><button class="btn pri lg" '+x.attr+'>'+esc(x.btn)+'</button></div></section>';
  }
  const rest=st.map((x,i)=>({x,i})).filter(o=>o.i!==nextI);
  if(rest.length){
    h+='<section class="hm-list"><h3>كل الخطوات</h3>'+rest.map(o=>{const x=o.x;
      return '<div class="hm-row'+(x.done?' done':'')+'"><span class="hm-ck" aria-hidden="true">'+(x.done?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':nf(o.i+1))+'</span>'+
        '<span class="hm-t"><b>'+esc(x.t)+'</b>'+(x.optional&&!x.done?'<small class="muted"> (اختياري)</small>':'')+'</span>'+
        (x.done?'<span class="pill ok">تمّت</span>':'<button class="btn sm" '+x.attr+'>'+esc(x.btn)+'</button>')+'</div>'}).join('')+'</section>';
  }
  // أرقام النهارده
  const tiles=[];
  if(modOn('loyalty')&&window.ThrillsLoy){const L=window.ThrillsLoy.stats();if(L.ready){tiles.push(['عميل',L.customers],['زيارة النهارده',L.visitsToday])}}
  if(modOn('attendance')){const now=Date.now();const n=new Set(S.att.filter(r=>!r.outAt&&now-r.inAt<t.OPEN_MAX).map(r=>r.staffId)).size;tiles.push(['حاضرين دلوقتي',n])}
  if(tiles.length)h+='<section><h3 class="hm-h">النهارده</h3><div class="tiles">'+tiles.map(x=>'<div class="stat"><b>'+nf(x[1])+'</b><span>'+esc(x[0])+'</span></div>').join('')+'</div></section>';
  // ميزات تانية
  const off=MODS.filter(m=>feat(m[0])&&!modOn(m[0])&&(m[0]!=='payroll'||modOn('attendance')));
  if(off.length)h+='<section class="hm-more"><h3 class="hm-h">ميزات تانية تقدر تشغّلها</h3><p class="muted" style="margin:0">مش لازم دلوقتي. شغّل اللي محتاجه بس عشان الشاشة تفضل بسيطة.</p>'+
    off.map(m=>'<div class="hm-row"><span class="hm-t"><b>'+esc(m[1])+'</b><small class="muted" style="display:block">'+esc(m[2])+'</small></span><button class="btn sm" data-ha="enable" data-m="'+m[0]+'">شغّلها</button></div>').join('')+'</section>';
  return h;
}

async function enable(m){
  const t=T(),{S,wr,toast,MODS}=t;
  if(!S.cfg||!MODS.some(x=>x[0]===m))return;
  const modules=Object.assign({},S.cfg.modules||{});modules[m]=true;
  if(await wr(()=>S.db.doc('config/main').set({modules},{merge:true}))){
    S.cfg=Object.assign({},S.cfg,{modules});toast('اتشغّلت');t.render();
  }
}
async function disable(m){
  const t=T(),{S,wr,toast,MODS}=t;
  if(!S.cfg||!MODS.some(x=>x[0]===m))return;
  const modules=Object.assign({},S.cfg.modules||{});
  if(!S.cfg.modules)MODS.forEach(x=>{if(t.feat(x[0]))modules[x[0]]=true});
  modules[m]=false;
  if(await wr(()=>S.db.doc('config/main').set({modules},{merge:true}))){
    S.cfg=Object.assign({},S.cfg,{modules});toast('اتقفلت. بياناتها محفوظة وترجع لما تشغّلها');t.render();
  }
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-ha]');if(!el)return;
  const a=el.dataset.ha;
  if(a==='enable')enable(el.dataset.m);
  if(a==='disable')disable(el.dataset.m);
});
window.RafdHome={tab,clear,sub,_t:{steps}};
})();
