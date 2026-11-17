/* =============================================================================
   tool.mkblog.cn 工具精选（第二批：设计 / 开发者）
   -----------------------------------------------------------------------------
   接入：新拟态生成、毛玻璃生成、SVG 海浪、SVG 压缩
   ============================================================================= */
(function () {
  'use strict';

  function hexToRgb(hex) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    return {
      r: parseInt(h.slice(0, 2), 16) || 0,
      g: parseInt(h.slice(2, 4), 16) || 0,
      b: parseInt(h.slice(4, 6), 16) || 0
    };
  }

  function shade(hex, p) {
    var c = hexToRgb(hex);
    var target = p < 0 ? 0 : 255;
    var f = Math.abs(p);
    function mix(v) { return Math.round(v + (target - v) * f); }
    return '#' + [mix(c.r), mix(c.g), mix(c.b)].map(function (v) {
      var s = Math.max(0, Math.min(255, v)).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }

  function luminance(hex) {
    var c = hexToRgb(hex);
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }

  /* ------------------------------------------------------------ 新拟态生成 */
  TB.def({
    slug: 'neumorphism', cat: 'web', name: '新拟态生成', icon: '🫧',
    desc: 'Neumorphism CSS 可视化',
    kw: '新拟态 neumorphism css 阴影 立体 生成器 设计',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="seg" id="neuSeg">' +
            '<button class="on" data-neu="raise">凸起</button><button data-neu="press">凹陷</button>' +
          '</div>' +
          '<div class="neu-stage" id="neuStage">' +
            '<div class="neu-card" id="neuCard"><span>简单</span><small>Neumorphism</small></div>' +
          '</div>' +
          '<div class="row3" style="margin-top:14px">' +
            '<div class="field"><div class="label">尺寸 <b id="neuSzV">260</b>px</div><input class="range" type="range" id="neuSz" min="180" max="360" value="260"></div>' +
            '<div class="field"><div class="label">圆角 <b id="neuRdV">44</b>px</div><input class="range" type="range" id="neuRd" min="0" max="120" value="44"></div>' +
            '<div class="field"><div class="label">距离 <b id="neuDdV">18</b>px</div><input class="range" type="range" id="neuDd" min="4" max="40" value="18"></div>' +
          '</div>' +
          '<div class="row3" style="margin-top:10px">' +
            '<div class="field"><div class="label">模糊 <b id="neuBlV">34</b>px</div><input class="range" type="range" id="neuBl" min="8" max="80" value="34"></div>' +
            '<div class="field"><div class="label">底色</div><input class="input color" type="color" id="neuBg" value="#e6e9ef"></div>' +
            '<div class="field"><div class="label">光源角度 <b id="neuAgV">225</b>°</div><input class="range" type="range" id="neuAg" min="0" max="360" value="225"></div>' +
          '</div>' +
          '<div class="field" style="margin-top:12px"><div class="label"><b>CSS</b></div><pre class="codeBox" id="neuCode"></pre></div>' +
          '<div class="btns"><button class="btn primary" id="neuCopy">复制 CSS</button>' +
            '<button class="btn" id="neuReset">恢复默认</button></div>' +
        '</div>' +
        '<div class="note">光影方向由“光源角度”决定：默认 225° 从左上方打光。底色改深色也能用，亮部与暗部会按底色自动调深/提亮。</div>';

      var seg = TB.$('#neuSeg', root);
      var card = TB.$('#neuCard', root), stage = TB.$('#neuStage', root), code = TB.$('#neuCode', root);
      var mode = 'raise';

      function val(id) { return TB.$('#' + id, root).value; }
      function draw() {
        var size = +val('neuSz'), radius = +val('neuRd'), dist = +val('neuDd'), blur = +val('neuBl');
        var bg = val('neuBg'), angle = +val('neuAg');
        TB.$('#neuSzV', root).textContent = size;
        TB.$('#neuRdV', root).textContent = radius;
        TB.$('#neuDdV', root).textContent = dist;
        TB.$('#neuBlV', root).textContent = blur;
        TB.$('#neuAgV', root).textContent = angle;

        var rad = angle * Math.PI / 180;
        var lx = Math.round(Math.cos(rad) * dist);
        var ly = Math.round(Math.sin(rad) * dist);
        var light = shade(bg, 0.22), dark = shade(bg, -0.18);
        var shadow = mode === 'raise'
          ? lx + 'px ' + ly + 'px ' + blur + 'px ' + light + ', ' + (-lx) + 'px ' + (-ly) + 'px ' + blur + 'px ' + dark
          : 'inset ' + (-lx) + 'px ' + (-ly) + 'px ' + blur + 'px ' + light + ', inset ' + lx + 'px ' + ly + 'px ' + blur + 'px ' + dark;

        card.style.width = size + 'px';
        card.style.height = Math.round(size * 0.62) + 'px';
        card.style.borderRadius = radius + 'px';
        card.style.background = bg;
        card.style.boxShadow = shadow;
        card.style.color = luminance(bg) < 0.45 ? '#f4f7ff' : '#1f2937';
        stage.style.background = bg;

        code.textContent =
          '.neu-card {\n' +
          '  width: ' + size + 'px;\n' +
          '  height: ' + Math.round(size * 0.62) + 'px;\n' +
          '  border-radius: ' + radius + 'px;\n' +
          '  background: ' + bg + ';\n' +
          '  box-shadow: ' + shadow + ';\n' +
          '}';
      }

      seg.addEventListener('click', function (e) {
        var b = e.target.closest('[data-neu]');
        if (!b) return;
        mode = b.getAttribute('data-neu');
        Array.prototype.forEach.call(seg.children, function (x) { x.classList.toggle('on', x === b); });
        draw();
      });
      ['neuSz', 'neuRd', 'neuDd', 'neuBl', 'neuAg', 'neuBg'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', draw);
      });
      TB.$('#neuCopy', root).addEventListener('click', function () { TB.copy(code.textContent); });
      TB.$('#neuReset', root).addEventListener('click', function () {
        TB.$('#neuSz', root).value = 260;
        TB.$('#neuRd', root).value = 44;
        TB.$('#neuDd', root).value = 18;
        TB.$('#neuBl', root).value = 34;
        TB.$('#neuBg', root).value = '#e6e9ef';
        TB.$('#neuAg', root).value = 225;
        mode = 'raise';
        Array.prototype.forEach.call(seg.children, function (x, i) { x.classList.toggle('on', i === 0); });
        draw();
      });
      draw();
    }
  });

  /* ------------------------------------------------------------ 毛玻璃生成 */
  TB.def({
    slug: 'glassmorphism', cat: 'web', name: '毛玻璃生成', icon: '🧊',
    desc: 'Glassmorphism CSS 可视化',
    kw: '毛玻璃 glassmorphism 玻璃 模糊 css 生成器 设计',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="gm-stage" id="gmStage">' +
            '<div class="gm-orb a"></div><div class="gm-orb b"></div>' +
            '<div class="gm-card" id="gmCard"><b>简单工具箱</b><span>glassmorphism</span></div>' +
          '</div>' +
          '<div class="row3" style="margin-top:14px">' +
            '<div class="field"><div class="label">模糊 <b id="gmBlV">14</b>px</div><input class="range" type="range" id="gmBl" min="0" max="40" value="14"></div>' +
            '<div class="field"><div class="label">透明度 <b id="gmAlV">18</b>%</div><input class="range" type="range" id="gmAl" min="0" max="60" value="18"></div>' +
            '<div class="field"><div class="label">圆角 <b id="gmRdV">22</b>px</div><input class="range" type="range" id="gmRd" min="0" max="60" value="22"></div>' +
          '</div>' +
          '<div class="row3" style="margin-top:10px">' +
            '<div class="field"><div class="label">边框透明度 <b id="gmBoV">30</b>%</div><input class="range" type="range" id="gmBo" min="0" max="100" value="30"></div>' +
            '<div class="field"><div class="label">玻璃色调</div><input class="input color" type="color" id="gmTint" value="#ffffff"></div>' +
            '<div class="field"><div class="label">渐变角度 <b id="gmAgV">135</b>°</div><input class="range" type="range" id="gmAg" min="0" max="360" value="135"></div>' +
          '</div>' +
          '<div class="row2" style="margin-top:10px">' +
            '<div class="field"><div class="label">背景起点</div><input class="input color" type="color" id="gmC1" value="#4f7cff"></div>' +
            '<div class="field"><div class="label">背景终点</div><input class="input color" type="color" id="gmC2" value="#8b5cf6"></div>' +
          '</div>' +
          '<div class="field" style="margin-top:12px"><div class="label"><b>CSS</b></div><pre class="codeBox" id="gmCode"></pre></div>' +
          '<div class="btns"><button class="btn primary" id="gmCopy">复制 CSS</button>' +
            '<button class="btn" id="gmReset">恢复默认</button></div>' +
        '</div>' +
        '<div class="note">毛玻璃依赖 <b>backdrop-filter</b>，主流桌面浏览器都支持；预览背景自带彩色光斑，方便看出模糊和透明度变化。</div>';

      var card = TB.$('#gmCard', root), stage = TB.$('#gmStage', root), code = TB.$('#gmCode', root);

      function val(id) { return TB.$('#' + id, root).value; }
      function draw() {
        var blur = +val('gmBl'), alpha = +val('gmAl'), radius = +val('gmRd');
        var borderA = +val('gmBo'), angle = +val('gmAg');
        var tint = hexToRgb(val('gmTint'));
        var c1 = val('gmC1'), c2 = val('gmC2');
        TB.$('#gmBlV', root).textContent = blur;
        TB.$('#gmAlV', root).textContent = alpha;
        TB.$('#gmRdV', root).textContent = radius;
        TB.$('#gmBoV', root).textContent = borderA;
        TB.$('#gmAgV', root).textContent = angle;

        var bg = 'rgba(' + tint.r + ', ' + tint.g + ', ' + tint.b + ', ' + (alpha / 100).toFixed(2) + ')';
        var border = 'rgba(255, 255, 255, ' + (borderA / 100).toFixed(2) + ')';
        stage.style.background = 'linear-gradient(' + angle + 'deg, ' + c1 + ', ' + c2 + ')';
        card.style.background = bg;
        card.style.borderRadius = radius + 'px';
        card.style.border = '1px solid ' + border;
        card.style.backdropFilter = 'blur(' + blur + 'px)';
        card.style.webkitBackdropFilter = 'blur(' + blur + 'px)';
        card.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.2)';

        code.textContent =
          '.glass-card {\n' +
          '  width: 320px;\n' +
          '  height: 190px;\n' +
          '  border-radius: ' + radius + 'px;\n' +
          '  background: ' + bg + ';\n' +
          '  border: 1px solid ' + border + ';\n' +
          '  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2);\n' +
          '  backdrop-filter: blur(' + blur + 'px);\n' +
          '  -webkit-backdrop-filter: blur(' + blur + 'px);\n' +
          '}';
      }

      ['gmBl', 'gmAl', 'gmRd', 'gmBo', 'gmAg', 'gmTint', 'gmC1', 'gmC2'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', draw);
      });
      TB.$('#gmCopy', root).addEventListener('click', function () { TB.copy(code.textContent); });
      TB.$('#gmReset', root).addEventListener('click', function () {
        TB.$('#gmBl', root).value = 14;
        TB.$('#gmAl', root).value = 18;
        TB.$('#gmRd', root).value = 22;
        TB.$('#gmBo', root).value = 30;
        TB.$('#gmAg', root).value = 135;
        TB.$('#gmTint', root).value = '#ffffff';
        TB.$('#gmC1', root).value = '#4f7cff';
        TB.$('#gmC2', root).value = '#8b5cf6';
        draw();
      });
      draw();
    }
  });

  /* ------------------------------------------------------------ SVG 海浪 */
  var WAVE_PAL = {
    ocean: ['#071f33', '#0b3954', '#087e8b', '#0abdc6', '#7ce8e6'],
    sunset: ['#2b0a3d', '#6a1b9a', '#b02a8f', '#ff6b6b', '#ffd166'],
    forest: ['#06281f', '#0b3d2e', '#146b4a', '#40b37a', '#b7f0c6'],
    night: ['#05060f', '#0f1b3d', '#1f3b73', '#3f6fb5', '#9ec5ff']
  };

  TB.def({
    slug: 'svg-wave', cat: 'web', name: 'SVG 海浪', icon: '🌊',
    desc: '分层波浪 / 导出 SVG PNG',
    kw: 'svg 海浪 波浪 wave 背景 生成器 渐变 设计',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="wv-prev" id="wvPrev"></div>' +
          '<div class="row3" style="margin-top:14px">' +
            '<div class="field"><div class="label">层数 <b id="wvLnV">4</b></div><input class="range" type="range" id="wvLn" min="2" max="6" value="4"></div>' +
            '<div class="field"><div class="label">振幅 <b id="wvAmV">38</b></div><input class="range" type="range" id="wvAm" min="8" max="80" value="38"></div>' +
            '<div class="field"><div class="label">波长 <b id="wvFrV">1.6</b></div><input class="range" type="range" id="wvFr" min="0.6" max="3" step="0.2" value="1.6"></div>' +
          '</div>' +
          '<div class="row3" style="margin-top:10px">' +
            '<div class="field"><div class="label">相位 <b id="wvPhV">0</b>°</div><input class="range" type="range" id="wvPh" min="0" max="360" value="0"></div>' +
            '<div class="field"><div class="label">配色</div><select class="input" id="wvPal">' +
              '<option value="ocean">深海</option><option value="sunset">日落</option>' +
              '<option value="forest">森林</option><option value="night">夜色</option></select></div>' +
            '<div class="field"><div class="label">预览高度 <b id="wvHtV">220</b>px</div><input class="range" type="range" id="wvHt" min="120" max="320" value="220"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="wvSvg">下载 SVG</button>' +
            '<button class="btn" id="wvPng">下载 PNG</button>' +
            '<button class="btn" id="wvCopy">复制 SVG</button></div>' +
          '<div class="note">波浪是纯 SVG 路径，导出的文件可以继续用编辑器改颜色和层数；下载 PNG 会按 1200 × 400 渲染。</div>' +
        '</div>';

      var prev = TB.$('#wvPrev', root), current = '';

      function val(id) { return TB.$('#' + id, root).value; }
      function build() {
        var w = 1200, h = 400, n = +val('wvLn'), amp = +val('wvAm');
        var freq = +val('wvFr'), phase = (+val('wvPh')) * Math.PI / 180;
        var pal = WAVE_PAL[val('wvPal')] || WAVE_PAL.ocean;
        TB.$('#wvLnV', root).textContent = n;
        TB.$('#wvAmV', root).textContent = amp;
        TB.$('#wvFrV', root).textContent = freq;
        TB.$('#wvPhV', root).textContent = val('wvPh');
        TB.$('#wvHtV', root).textContent = val('wvHt');

        var parts = ['<rect width="' + w + '" height="' + h + '" fill="' + pal[0] + '"/>'];
        for (var i = 0; i < n; i++) {
          var color = pal[(i + 1) % pal.length];
          var baseY = h * 0.3 + (h * 0.44) * (i / (n - 1 || 1));
          var a = amp * (1 - i * 0.08);
          var pts = [];
          for (var x = 0; x <= w; x += 40) {
            var y = baseY + Math.sin((x / w) * Math.PI * 2 * freq + phase + i * 0.75) * a;
            pts.push(x + ',' + y.toFixed(1));
          }
          var d = 'M0,' + h + ' L0,' + (baseY + Math.sin(phase + i * 0.75) * a).toFixed(1) +
            ' L' + pts.join(' L') + ' L' + w + ',' + h + ' Z';
          parts.push('<path d="' + d + '" fill="' + color + '" opacity="0.94"/>');
        }
        current = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
          '" width="' + w + '" height="' + h + '" preserveAspectRatio="none">' + parts.join('') + '</svg>';
        prev.innerHTML = current;
        prev.style.height = val('wvHt') + 'px';
      }

      ['wvLn', 'wvAm', 'wvFr', 'wvPh', 'wvPal', 'wvHt'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', build);
      });
      TB.$('#wvSvg', root).addEventListener('click', function () {
        TB.downloadText('<?xml version="1.0" encoding="UTF-8"?>\n' + current, 'wave.svg', 'image/svg+xml');
      });
      TB.$('#wvCopy', root).addEventListener('click', function () { TB.copy(current); });
      TB.$('#wvPng', root).addEventListener('click', function () {
        var blob = new Blob([current], { type: 'image/svg+xml' });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement('canvas');
          cv.width = 1200;
          cv.height = 400;
          cv.getContext('2d').drawImage(img, 0, 0, 1200, 400);
          URL.revokeObjectURL(url);
          TB.downloadCanvas(cv, 'wave.png', 'image/png');
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          TB.toast('PNG 渲染失败，请改用 SVG');
        };
        img.src = url;
      });
      build();
    }
  });

  /* ------------------------------------------------------------ SVG 压缩 */
  TB.def({
    slug: 'svg-minify', cat: 'web', name: 'SVG 压缩', icon: '🗜️',
    desc: '去注释 / 空白 / 元数据',
    kw: 'svg 压缩 minify 精简 优化 代码 体积',
    render: function (ctx) {
      var sample =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!-- 示例：一个渐变圆角方块 -->\n' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">\n' +
        '  <metadata>由简单工具箱生成的示例</metadata>\n' +
        '  <defs>\n' +
        '    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n' +
        '      <stop offset="0" stop-color="#4f7cff"/>\n' +
        '      <stop offset="1" stop-color="#8b5cf6"/>\n' +
        '    </linearGradient>\n' +
        '  </defs>\n' +
        '  <rect x="20" y="20" width="280" height="160" rx="24" fill="url(#g)"/>\n' +
        '  <text x="160" y="112" text-anchor="middle" fill="#ffffff" font-size="22" font-family="sans-serif">简单工具箱</text>\n' +
        '</svg>';

      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">原始 SVG<span class="hint">也可以选文件</span></div>' +
          '<div id="smPick"></div>' +
          '<div class="field" style="margin-top:10px"><textarea class="textarea mono" id="smSrc" style="min-height:210px" spellcheck="false"></textarea></div>' +
          '<div class="checks" style="margin-top:10px">' +
            '<label class="chk"><input type="checkbox" id="smComment" checked> 去注释</label>' +
            '<label class="chk"><input type="checkbox" id="smMeta" checked> 去 metadata</label>' +
            '<label class="chk"><input type="checkbox" id="smDecl" checked> 去 XML 声明</label>' +
            '<label class="chk"><input type="checkbox" id="smSpace" checked> 压缩标签间空白</label>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="smRun">压缩</button>' +
            '<button class="btn" id="smCopy" disabled>复制结果</button>' +
            '<button class="btn" id="smDl" disabled>下载 .svg</button></div>' +
          '<div class="kv" id="smStats" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">压缩结果</div>' +
          '<div class="sm-out mono" id="smOut">点“压缩”查看结果</div>' +
        '</div>' +
        '<div class="note">只做保守清理：注释、XML 声明、metadata、标签之间的缩进空白；不改写路径数据、不删 title/desc、不引入 SVGO。压缩前会用浏览器解析器检查 SVG 是否合法。</div>';

      var src = TB.$('#smSrc', root), out = TB.$('#smOut', root), stats = TB.$('#smStats', root);
      var copyBtn = TB.$('#smCopy', root), dlBtn = TB.$('#smDl', root);
      var result = '', originalSize = 0;
      src.value = sample;

      var pick = TB.filePicker(TB.$('#smPick', root), { accept: '.svg,image/svg+xml', hint: '选择 .svg 文件，或直接粘贴源码' });
      pick.onChange = function () {
        var item = pick.files[0];
        if (!item) return;
        TB.readText(item.file).then(function (t) {
          src.value = t;
          result = '';
          out.textContent = '点“压缩”查看结果';
          copyBtn.disabled = true;
          dlBtn.disabled = true;
          updateStats(0, 0);
        });
      };

      function bytes(s) { return new Blob([s]).size; }
      function fmt(n) {
        if (n < 1024) return n + ' B';
        return (n / 1024).toFixed(1) + ' KB';
      }
      function updateStats(before, after) {
        if (!before) { stats.innerHTML = ''; return; }
        var pct = before ? Math.max(0, (1 - after / before) * 100) : 0;
        stats.innerHTML = [
          ['原始', fmt(before)], ['压缩后', fmt(after)], ['减少', pct.toFixed(1) + '%']
        ].map(function (x) {
          return '<div class="kv-item"><div class="kv-k">' + x[0] + '</div><div class="kv-v">' + x[1] + '</div></div>';
        }).join('');
      }

      function compress() {
        var input = src.value.trim();
        if (!input) { TB.toast('先粘贴 SVG 源码'); return; }
        var doc = new DOMParser().parseFromString(input, 'image/svg+xml');
        if (doc.getElementsByTagName('parsererror').length ||
            !doc.documentElement || doc.documentElement.nodeName.toLowerCase() !== 'svg') {
          out.innerHTML = '<span class="result-err">不是合法的 SVG，请检查标签是否闭合。</span>';
          copyBtn.disabled = true;
          dlBtn.disabled = true;
          return;
        }
        var s = input;
        if (TB.$('#smComment', root).checked) s = s.replace(/<!--[\s\S]*?-->/g, '');
        if (TB.$('#smMeta', root).checked) {
          s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
            .replace(/<sodipodi[\s\S]*?<\/sodipodi>/gi, '');
        }
        if (TB.$('#smDecl', root).checked) s = s.replace(/<\?xml[\s\S]*?\?>/gi, '');
        if (TB.$('#smSpace', root).checked) {
          s = s.replace(/>\s+</g, '><').replace(/\s+\/>/g, '/>').trim();
        }
        originalSize = bytes(input);
        result = s;
        var after = bytes(result);
        out.textContent = result;
        updateStats(originalSize, after);
        copyBtn.disabled = false;
        dlBtn.disabled = false;
      }

      TB.$('#smRun', root).addEventListener('click', compress);
      copyBtn.addEventListener('click', function () { if (result) TB.copy(result); });
      dlBtn.addEventListener('click', function () { if (result) TB.downloadText(result, 'min.svg', 'image/svg+xml'); });
      updateStats(0, 0);
    }
  });
})();
