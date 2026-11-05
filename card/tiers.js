// رفد: محرك فئات العملاء (منطق خالص بدون Firebase). يعمل في المتصفح وفي Node.
(function (root) {
  var DAY = 86400000;
  var WINDOWS = { month: 'calendar', rolling30: 30, rolling90: 90, rolling365: 365 };

  // قوالب جاهزة يعدّلها صاحب المحل
  var TEMPLATE = {
    window: 'month',
    tiers: [
      { key: 'silver', name: 'فضية', min: 5, perks: ['مشروب مجاني كل شهر'] },
      { key: 'gold', name: 'ذهبية', min: 10, perks: ['خصم 10%', 'مشروب مجاني كل شهر'] },
      { key: 'diamond', name: 'ماسية', min: 20, perks: ['خصم 15%', 'أولوية في التجهيز', 'هدية عيد الميلاد'] }
    ]
  };

  // بداية نافذة الحساب كـ ms. tzOffsetMin = إزاحة المنطقة الزمنية بالدقائق عن UTC (السعودية 180، مصر 120 أو 180).
  function windowStart(win, now, tzOffsetMin) {
    var w = WINDOWS[win];
    if (!w) throw new Error('نافذة غير معروفة: ' + win);
    if (w === 'calendar') {
      var d = new Date(now + (tzOffsetMin || 0) * 60000);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - (tzOffsetMin || 0) * 60000;
    }
    return now - w * DAY;
  }

  function validate(cfg) {
    if (!cfg || !WINDOWS[cfg.window]) return 'نافذة الحساب غير صحيحة';
    if (!Array.isArray(cfg.tiers) || !cfg.tiers.length) return 'لا توجد فئات';
    var prev = 0;
    for (var i = 0; i < cfg.tiers.length; i++) {
      var t = cfg.tiers[i];
      if (!t.key || !t.name) return 'كل فئة تحتاج اسماً';
      if (!(t.min > prev)) return 'حد الزيارات لكل فئة يجب أن يكون أكبر من التي قبلها';
      prev = t.min;
    }
    return null;
  }

  function countVisits(visits, from, to) {
    var n = 0;
    for (var i = 0; i < visits.length; i++) if (visits[i] >= from && visits[i] <= to) n++;
    return n;
  }

  // visits: مصفوفة أوقات الزيارات بالـ ms
  function evaluate(visits, cfg, now, tzOffsetMin) {
    var err = validate(cfg);
    if (err) throw new Error(err);
    var from = windowStart(cfg.window, now, tzOffsetMin);
    var count = countVisits(visits, from, now);
    var tiers = cfg.tiers, cur = null, next = null;
    for (var i = 0; i < tiers.length; i++) {
      if (count >= tiers[i].min) cur = tiers[i]; else { next = tiers[i]; break; }
    }
    var res = {
      count: count, tier: cur, next: next,
      remaining: next ? next.min - count : 0,
      progress: next ? (count - (cur ? cur.min : 0)) / (next.min - (cur ? cur.min : 0)) : 1,
      atRisk: false, windowStart: from
    };
    // خطر النزول: في النوافذ المتحركة، هل ستسقط زيارات خلال 7 أيام فينزل العميل؟
    if (cur && WINDOWS[cfg.window] !== 'calendar') {
      var later = now + 7 * DAY, from2 = windowStart(cfg.window, later, tzOffsetMin);
      res.atRisk = countVisits(visits, from2, now) < cur.min;
    }
    return res;
  }

  // رسالة ترقية مقترحة
  function nudge(r) {
    if (!r.next) return 'وصلت لأعلى فئة. شكراً لولائك!';
    if (r.remaining === 1) return 'باقي لك زيارة واحدة وتصل إلى الفئة ' + r.next.name;
    return 'باقي لك ' + r.remaining + ' زيارات وتصل إلى الفئة ' + r.next.name;
  }

  var api = { TEMPLATE: TEMPLATE, WINDOWS: WINDOWS, windowStart: windowStart, validate: validate, evaluate: evaluate, nudge: nudge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RafdTiers = api;
})(typeof window !== 'undefined' ? window : globalThis);
