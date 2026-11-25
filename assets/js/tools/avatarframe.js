/* =============================================================================
 * 头像挂件生成器
 * -----------------------------------------------------------------------------
 * 纯 Canvas 本地合成：
 *   - 上传头像后圆形裁剪，可缩放、平移
 *   - 国庆、春节、中秋、毕业、生日五种挂件主题
 *   - 圆环粗细、挂件文字、导出尺寸可调，直接下载 PNG
 *
 * 图片只在当前页面内存中处理，不上传服务器。
 * ========================================================================== */

(function () {
  'use strict';

  var BASE = 720;

  var THEMES = {
    guoqing: { name: '国庆', c1: '#b71c1c', c2: '#e53935', accent: '#ffd54f', text: '国庆', deco: 'stars' },
    chunjie: { name: '春节', c1: '#9f1239', c2: '#dc2626', accent: '#fbbf24', text: '春节', deco: 'coins' },
    zhongqiu: { name: '中秋', c1: '#1e3a5f', c2: '#0f766e', accent: '#fde68a', text: '中秋', deco: 'moon' },
    biye:    { name: '毕业', c1: '#1e3a8a', c2: '#2563eb', accent: '#fbbf24', text: '毕业', deco: 'tassel' },
    shengri: { name: '生日', c1: '#9d174d', c2: '#db2777', accent: '#fde68a', text: '生日', deco: 'confetti' }
  };

  function font(size) {
    return '700 ' + size + 'px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  }

  function drawStar(ctx, x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      var b = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(b) * r * 0.42, y + Math.sin(b) * r * 0.42);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPlaceholder(ctx, cx, cy, r) {
    var g = ctx.createRadialGradient(cx - r * .25, cy - r * .3, r * .1, cx, cy, r * 1.1);
    g.addColorStop(0, '#dbeafe');
    g.addColorStop(1, '#93c5fd');
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.beginPath();
    ctx.arc(cx, cy - r * .2, r * .2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * .5, r * .44, r * .34, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(30,64,175,.55)';
    ctx.font = font(r * .12);
    ctx.textAlign = 'center';
    ctx.fillText('上传头像', cx, cy + r * .86);
    ctx.restore();
  }

  function drawInto(canvas, size, img, opt) {
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var S = size, cx = S / 2, cy = S / 2;
    var R = S * .455;
    var ringW = Math.max(0, opt.ring) * (S / BASE);
    var theme = THEMES[opt.theme] || THEMES.guoqing;
    var text = String(opt.text || theme.text).slice(0, 4) || theme.text;

    ctx.clearRect(0, 0, S, S);
    ctx.save();

    /* 头像：cover 裁切 + 圆形裁剪 */
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    if (img && img.width && img.height) {
      var base = Math.max(S / img.width, S / img.height);
      var scale = base * (opt.zoom / 100);
      var w = img.width * scale;
      var h = img.height * scale;
      var dx = (opt.x / 100) * S * .32;
      var dy = (opt.y / 100) * S * .32;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cx - w / 2 + dx, cy - h / 2 + dy, w, h);
    } else {
      drawPlaceholder(ctx, cx, cy, R);
    }
    ctx.restore();

    /* 圆环 */
    if (ringW > 0) {
      var rg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      rg.addColorStop(0, theme.c1);
      rg.addColorStop(.55, theme.c2);
      rg.addColorStop(1, theme.accent);
      ctx.save();
      ctx.lineWidth = ringW;
      ctx.strokeStyle = rg;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* 主题小装饰 */
    if (theme.deco === 'stars') {
      drawStar(ctx, cx, cy - R + ringW * .6, S * .026, theme.accent);
      drawStar(ctx, cx - R * .62, cy - R * .62, S * .018, theme.accent);
      drawStar(ctx, cx + R * .62, cy - R * .62, S * .018, theme.accent);
    } else if (theme.deco === 'coins') {
      ctx.save();
      ctx.fillStyle = theme.accent;
      [cx - R * .64, cx, cx + R * .64].forEach(function (x) {
        ctx.beginPath();
        ctx.arc(x, cy - R * .72, S * .015, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    } else if (theme.deco === 'moon') {
      ctx.save();
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(cx, cy - R * .82, S * .045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30,58,95,.55)';
      ctx.beginPath();
      ctx.arc(cx + S * .018, cy - R * .84, S * .018, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (theme.deco === 'tassel') {
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = S * .006;
      ctx.beginPath();
      ctx.moveTo(cx - S * .07, cy - R * .82);
      ctx.lineTo(cx + S * .07, cy - R * .82);
      ctx.stroke();
      ctx.restore();
    } else if (theme.deco === 'confetti') {
      ctx.save();
      var colors = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399'];
      for (var i = 0; i < 12; i++) {
        var a = i * Math.PI * 2 / 12;
        var rr = R - ringW * .5;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * .008, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* 右下角挂件 */
    var bx = cx + R * .72, by = cy + R * .72;
    var br = S * .105;
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.28)';
    ctx.shadowBlur = S * .03;
    ctx.shadowOffsetY = S * .012;
    var bg = ctx.createLinearGradient(bx - br, by - br, bx + br, by + br);
    bg.addColorStop(0, theme.c2);
    bg.addColorStop(1, theme.c1);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = S * .012;
    ctx.strokeStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(bx, by, br - S * .006, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var fs = text.length <= 2 ? S * .068 : text.length === 3 ? S * .055 : S * .047;
    ctx.font = font(fs);
    ctx.fillText(text, bx, by + S * .004);
    ctx.restore();
  }

  TB.def({
    slug: 'avatar-frame', cat: 'image', name: '头像挂件生成器', icon: '🎗️',
    desc: '圆形裁剪、节日挂件、导出 PNG',
    kw: '头像 挂件 边框 国庆 春节 中秋 毕业 生日 圆形 裁剪 加框 图片',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field" style="flex:2 1 240px"><div class="label"><b>头像图片</b><span class="hint">JPG / PNG / WebP，本地处理</span></div>' +
              '<input class="input" type="file" id="afFile" accept="image/*"></div>' +
            '<div class="field"><div class="label"><b>主题</b></div>' +
              '<select class="select" id="afTheme">' +
                '<option value="guoqing">国庆 · 红金</option>' +
                '<option value="chunjie">春节 · 红金</option>' +
                '<option value="zhongqiu">中秋 · 月夜</option>' +
                '<option value="biye">毕业 · 蓝金</option>' +
                '<option value="shengri">生日 · 粉金</option>' +
              '</select></div>' +
          '</div>' +
          '<div id="afMsg"></div>' +
          '<div class="af-stage"><canvas id="afCanvas" width="720" height="720"></canvas></div>' +
          '<div class="row" style="margin-top:14px">' +
            '<div class="field"><div class="label"><b>缩放</b><b id="afZoomVal">100%</b></div>' +
              '<input type="range" id="afZoom" min="100" max="200" value="100"></div>' +
            '<div class="field"><div class="label"><b>左右</b><b id="afXVal">0</b></div>' +
              '<input type="range" id="afX" min="-50" max="50" value="0"></div>' +
            '<div class="field"><div class="label"><b>上下</b><b id="afYVal">0</b></div>' +
              '<input type="range" id="afY" min="-50" max="50" value="0"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>圆环粗细</b><b id="afRingVal">12</b></div>' +
              '<input type="range" id="afRing" min="0" max="28" value="12"></div>' +
            '<div class="field"><div class="label"><b>挂件文字</b><span class="hint">最多 4 字</span></div>' +
              '<input class="input" id="afText" maxlength="4" value="国庆"></div>' +
            '<div class="field"><div class="label"><b>导出尺寸</b></div>' +
              '<select class="select" id="afSize">' +
                '<option value="512">512 × 512</option>' +
                '<option value="800" selected>800 × 800</option>' +
                '<option value="1024">1024 × 1024</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" type="button" id="afDownload">下载 PNG</button>' +
            '<button class="btn" type="button" id="afReset">重置</button>' +
          '</div>' +
          '<div class="note">导出为透明背景的圆形头像，可直接用于社交平台。图片只在浏览器内绘制，不会上传；如果原图很大，建议先压缩到 2000px 以内再上传。</div>' +
        '</div>';

      var canvas = TB.$('#afCanvas', root);
      var fileEl = TB.$('#afFile', root);
      var themeEl = TB.$('#afTheme', root);
      var sizeEl = TB.$('#afSize', root);
      var textEl = TB.$('#afText', root);
      var zoomEl = TB.$('#afZoom', root);
      var xEl = TB.$('#afX', root);
      var yEl = TB.$('#afY', root);
      var ringEl = TB.$('#afRing', root);
      var msgEl = TB.$('#afMsg', root);
      var img = null;
      var objectUrl = null;
      var textTouched = false;

      function refresh() {
        var opt = {
          theme: themeEl.value,
          text: textEl.value,
          zoom: Number(zoomEl.value),
          x: Number(xEl.value),
          y: Number(yEl.value),
          ring: Number(ringEl.value)
        };
        TB.$('#afZoomVal', root).textContent = opt.zoom + '%';
        TB.$('#afXVal', root).textContent = opt.x;
        TB.$('#afYVal', root).textContent = opt.y;
        TB.$('#afRingVal', root).textContent = opt.ring;
        drawInto(canvas, BASE, img, opt);
      }

      function msg(text, isErr) {
        msgEl.innerHTML = text
          ? '<div class="note" style="margin-top:10px"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>'
          : '';
      }

      themeEl.addEventListener('change', function () {
        if (!textTouched) textEl.value = THEMES[themeEl.value].text;
        refresh();
      });

      textEl.addEventListener('input', function () {
        textTouched = true;
        refresh();
      });

      [zoomEl, xEl, yEl, ringEl].forEach(function (el) {
        el.addEventListener('input', refresh);
      });

      fileEl.addEventListener('change', function () {
        var file = fileEl.files && fileEl.files[0];
        if (!file) return;
        if (!/^image\//.test(file.type)) { msg('请选择图片文件。', true); return; }
        msg('正在读取图片…');
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
        objectUrl = URL.createObjectURL(file);
        var next = new Image();
        next.onload = function () {
          img = next;
          zoomEl.value = 100;
          xEl.value = 0;
          yEl.value = 0;
          msg('已载入：' + file.name + '（' + next.width + ' × ' + next.height + '）');
          refresh();
        };
        next.onerror = function () {
          img = null;
          msg('图片读取失败，请换一张图片重试。', true);
          refresh();
        };
        next.src = objectUrl;
      });

      TB.$('#afDownload', root).addEventListener('click', function () {
        try {
          var temp = document.createElement('canvas');
          drawInto(temp, Number(sizeEl.value), img, {
            theme: themeEl.value,
            text: textEl.value,
            zoom: Number(zoomEl.value),
            x: Number(xEl.value),
            y: Number(yEl.value),
            ring: Number(ringEl.value)
          });
          TB.downloadCanvas(temp, 'avatar-frame-' + sizeEl.value + '.png', 'image/png');
          msg('已生成 ' + sizeEl.value + ' × ' + sizeEl.value + ' PNG。');
        } catch (err) {
          msg(err.message || '导出失败', true);
        }
      });

      TB.$('#afReset', root).addEventListener('click', function () {
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
        img = null;
        fileEl.value = '';
        themeEl.value = 'guoqing';
        textEl.value = THEMES.guoqing.text;
        textTouched = false;
        zoomEl.value = 100;
        xEl.value = 0;
        yEl.value = 0;
        ringEl.value = 12;
        msg('');
        refresh();
      });

      refresh();
    }
  });
})();
