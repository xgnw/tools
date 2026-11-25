/* =============================================================================
 * 屏幕参数计算器
 * -----------------------------------------------------------------------------
 * 输入对角线尺寸与分辨率，计算 PPI、点距、物理宽高、宽高比和观看距离。
 * 观看距离使用几何视角公式，并在页面注明口径，不输出护眼或医学结论。
 * ========================================================================== */

(function () {
  'use strict';

  var PRESETS = [
    { v: '24|1920|1080', t: '24 英寸 · 1920×1080' },
    { v: '27|2560|1440', t: '27 英寸 · 2560×1440' },
    { v: '27|3840|2160', t: '27 英寸 · 3840×2160' },
    { v: '32|3840|2160', t: '32 英寸 · 3840×2160' },
    { v: '34|3440|1440', t: '34 英寸 · 3440×1440 带鱼屏' },
    { v: '14|2880|1800', t: '14 英寸笔记本 · 2880×1800' },
    { v: '6.1|2532|1170', t: '6.1 英寸手机 · 2532×1170' }
  ];

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function fmt(n, d) {
    if (!isFinite(n)) return '—';
    return String(Number(n.toFixed(d == null ? 2 : d)));
  }

  TB.def({
    slug: 'screencalc', cat: 'data', name: '屏幕参数计算', desc: 'PPI、宽高比与观看距离', icon: '🖥️',
    kw: '屏幕 ppi 像素密度 点距 分辨率 宽高比 尺寸 观看距离 显示器 电视 笔记本 手机',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>快速预设</b></div>' +
            '<select class="select" id="scPreset">' +
              '<option value="">自定义</option>' +
              PRESETS.map(function (p) { return '<option value="' + p.v + '">' + TB.esc(p.t) + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>对角线尺寸（英寸）</b></div>' +
              '<input class="input" id="scDiag" type="number" min="0.1" max="300" step="0.1" value="27" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>水平像素</b></div>' +
              '<input class="input" id="scW" type="number" min="1" max="30000" step="1" value="2560" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>垂直像素</b></div>' +
              '<input class="input" id="scH" type="number" min="1" max="30000" step="1" value="1440" autocomplete="off"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="scRun" type="button">计算</button>' +
            '<button class="btn" id="scCopy" type="button">复制结果</button>' +
          '</div>' +
          '<div id="scMsg" class="sc-msg"></div>' +
          '<div class="sc-preview"><div class="sc-screen" id="scScreen"><span id="scRatio">16:9</span></div></div>' +
          '<div class="kv" id="scOut" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">PPI = √(水平像素² + 垂直像素²) / 对角线英寸；THX 40° 与 SMPTE 30° 观看距离按“屏宽的一半 / tan(视角的一半)”估算，日常办公参考按 1.5—2 倍屏高给出。结果仅为几何估算，不构成护眼、医疗或购买建议。</div>';

      var diag = TB.$('#scDiag', root), w = TB.$('#scW', root), h = TB.$('#scH', root);
      var msg = TB.$('#scMsg', root), out = TB.$('#scOut', root);
      var screen = TB.$('#scScreen', root), ratioEl = TB.$('#scRatio', root);
      var lastRows = [];

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note sc-note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function calculate() {
        var d = num(diag.value), ww = num(w.value), hh = num(h.value);
        if (!(d > 0) || !(ww > 0) || !(hh > 0)) { showMsg('三项都必须是大于 0 的数字'); out.innerHTML = ''; return; }
        if (d > 300 || ww > 30000 || hh > 30000 || Math.floor(ww) !== ww || Math.floor(hh) !== hh) {
          showMsg('请检查尺寸与分辨率，像素应为整数');
          out.innerHTML = '';
          return;
        }
        showMsg('');

        var diagPx = Math.sqrt(ww * ww + hh * hh);
        var ppi = diagPx / d;
        var pitch = 25.4 / ppi;
        var widthIn = d * ww / diagPx;
        var heightIn = d * hh / diagPx;
        var widthCm = widthIn * 2.54;
        var heightCm = heightIn * 2.54;
        var area = widthCm * heightCm;
        var g = gcd(ww, hh);
        var ratio = (ww / g) + ':' + (hh / g);

        function distance(angle) {
          return (widthCm / 2) / Math.tan((angle * Math.PI / 180) / 2);
        }

        var thx = distance(40);
        var smpte = distance(30);
        var dailyMin = heightCm * 1.5;
        var dailyMax = heightCm * 2;

        lastRows = [
          ['对角线', fmt(d, 2) + ' 英寸'],
          ['分辨率', ww + ' × ' + hh],
          ['宽高比', ratio],
          ['PPI（像素密度）', fmt(ppi, 1) + ' ppi'],
          ['点距', fmt(pitch, 3) + ' mm'],
          ['物理宽度', fmt(widthCm, 2) + ' cm'],
          ['物理高度', fmt(heightCm, 2) + ' cm'],
          ['屏幕面积', fmt(area, 0) + ' cm²'],
          ['THX 40° 参考距离', fmt(thx, 1) + ' cm（约 ' + fmt(thx / 100, 2) + ' m）'],
          ['SMPTE 30° 参考距离', fmt(smpte, 1) + ' cm（约 ' + fmt(smpte / 100, 2) + ' m）'],
          ['日常 1.5—2 倍屏高', fmt(dailyMin, 1) + '—' + fmt(dailyMax, 1) + ' cm']
        ];

        out.innerHTML = lastRows.map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');

        screen.style.aspectRatio = ww + ' / ' + hh;
        ratioEl.textContent = ratio + ' · ' + fmt(d, 1) + '″';
      }

      TB.$('#scRun', root).addEventListener('click', calculate);
      [diag, w, h].forEach(function (el) {
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') calculate(); });
      });

      TB.$('#scPreset', root).addEventListener('change', function () {
        var v = this.value;
        if (!v) return;
        var p = v.split('|');
        diag.value = p[0]; w.value = p[1]; h.value = p[2];
        calculate();
      });

      TB.$('#scCopy', root).addEventListener('click', function () {
        if (!lastRows.length) { showMsg('请先计算'); return; }
        TB.copy(lastRows.map(function (r) { return r[0] + '：' + r[1]; }).join('\n'));
      });

      calculate();
    }
  });
})();
