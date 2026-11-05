/* رفد: شكل كرت الولاء (معاينة تحاكي كرت المحفظة). بيستخدمه مصمم الكرت وصفحة الانضمام. */
(function(root){
  var DEF={title:'',bg:'#0B3B3A',fg:'#F3F5F2',accent:'#F2A93B',logo:'',n:8,reward:'مشروب مجاني'};
  var HEX=/^#[0-9a-fA-F]{6}$/;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function color(x,d){return HEX.test(x||'')?x:d}
  // تنظيف إعداد الكرت من أي مصدر (بما فيه اللي جاي من قاعدة البيانات)
  function norm(c){
    c=c||{};var n=Math.round(Number(c.n));
    return {title:String(c.title==null?DEF.title:c.title).trim().slice(0,40),bg:color(c.bg,DEF.bg),fg:color(c.fg,DEF.fg),accent:color(c.accent,DEF.accent),
      logo:/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(c.logo||'')&&String(c.logo).length<=90000?c.logo:'',
      n:isFinite(n)?Math.min(30,Math.max(2,n)):DEF.n,reward:String(c.reward==null?DEF.reward:c.reward).trim().slice(0,60)||DEF.reward};
  }
  function lum(h){
    var v=[1,3,5].map(function(i){var c=parseInt(h.substr(i,2),16)/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)});
    return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
  }
  // نسبة التباين بين لونين (WCAG)
  function contrast(a,b){var x=lum(color(a,'#000000')),y=lum(color(b,'#ffffff'));var hi=Math.max(x,y),lo=Math.min(x,y);return (hi+0.05)/(lo+0.05)}
  // opts: filled = عدد الأختام الممتلئة، name = اسم العميل، qr = HTML اختياري للكود، sample = تلميح "مثال"
  function html(card,opts){
    var c=norm(card);opts=opts||{};var f=Math.max(0,Math.min(c.n,opts.filled||0));
    var stamps='';
    for(var i=0;i<c.n;i++){
      stamps+='<span class="pv-s'+(i<f?' on':'')+'" style="'+(i<f?'background:'+c.accent+';border-color:'+c.accent+';color:'+c.bg:'border-color:'+c.fg)+'">'+(i<f?'<svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':'')+'</span>';
    }
    return '<div class="pv" style="background:'+c.bg+';color:'+c.fg+'" role="img" aria-label="معاينة كرت الولاء">'+
      '<div class="pv-h">'+(c.logo?'<img class="pv-l" alt="" src="'+c.logo+'">':'<span class="pv-l pv-ph" style="background:'+c.accent+'"></span>')+'<span class="pv-t">'+esc(c.title||'اسم مطعمك')+'</span></div>'+
      '<div class="pv-g">'+stamps+'</div>'+
      '<div class="pv-r"><span class="pv-k">الهدية بعد '+c.n+' زيارة</span><b>'+esc(c.reward)+'</b></div>'+
      '<div class="pv-q">'+(opts.qr||'<span class="pv-qp" aria-hidden="true">QR</span>')+'</div>'+
      (opts.name?'<div class="pv-n">'+esc(opts.name)+'</div>':'')+'</div>';
  }
  var api={DEF:DEF,norm:norm,contrast:contrast,html:html,esc:esc};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RafdPass=api;
})(typeof window!=='undefined'?window:this);
