/* رفد: منطق كرت الأختام (خالص بدون Firebase). يعمل في المتصفح وفي Node.
   n = عدد زيارات العميل الكلي، rw = عدد الهدايا اللي اتسلّمت له. */
(function(root){
  var DEF={n:8,reward:'مشروب مجاني'};
  function clamp(x,a,b){x=Math.round(Number(x));return isFinite(x)?Math.min(b,Math.max(a,x)):a}
  // إعداد الكرت بعد التنظيف: عدد الزيارات للهدية (2 إلى 30) ونص الهدية
  function norm(c){
    c=c||{};
    var reward=String(c.reward==null?DEF.reward:c.reward).trim().slice(0,60)||DEF.reward;
    return {n:(c.n==null||!isFinite(Number(c.n)))?DEF.n:clamp(c.n,2,30),reward:reward};
  }
  function total(c){return typeof c.n==='number'&&c.n>=0?Math.floor(c.n):((c.visits&&c.visits.length)||0)}
  // حالة العميل: progress = الأختام الحالية، available = هدايا جاهزة للتسليم
  function state(c,cfg){
    var k=norm(cfg),n=total(c),rw=Math.max(0,Math.floor(Number(c.rw)||0));
    var earned=Math.floor(n/k.n),available=Math.max(0,earned-rw),progress=n%k.n;
    return {n:n,N:k.n,reward:k.reward,progress:progress,earned:earned,redeemed:rw,available:available,
      filled:available>0?k.n:progress,toNext:available>0?0:k.n-progress,ratio:available>0?1:progress/k.n};
  }
  function nudge(s){
    if(s.available>0)return s.available>1?('عنده '+s.available+' هدايا جاهزة: '+s.reward):('عنده هدية جاهزة: '+s.reward);
    if(s.toNext===1)return 'فاضل زيارة واحدة وياخد: '+s.reward;
    if(s.toNext===2)return 'فاضل زيارتين وياخد: '+s.reward;
    return 'فاضل '+s.toNext+' زيارات وياخد: '+s.reward;
  }
  // بعد إلغاء زيارة: لو الهدايا المسلّمة أكتر من المستحقة نعدّلها
  function afterUndo(c,cfg){
    var k=norm(cfg),n=Math.max(0,total(c)-1),rw=Math.min(Math.max(0,Math.floor(Number(c.rw)||0)),Math.floor(n/k.n));
    return {n:n,rw:rw};
  }
  var api={DEF:DEF,norm:norm,total:total,state:state,nudge:nudge,afterUndo:afterUndo};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RafdStamps=api;
})(typeof window!=='undefined'?window:this);
