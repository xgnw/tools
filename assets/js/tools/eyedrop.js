/* =============================================================================
 * 图片取色器
 * -----------------------------------------------------------------------------
 * 本地读取图片，Canvas 取像素，支持点击 / 触摸取色、HEX/RGB/HSL 复制，
 * 并自动提取一组主色。图片不会离开浏览器。
 * ========================================================================== */

(function () {
  'use strict';

  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (n) {
      return ('0' + Math.round(n).toString(16)).slice(-2);
    }).join('').toUpperCase();
  }

  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return 'hsl(' + Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)';
  }

  /* 提取主色：按 4 bit/通道量化后统计，颜色取桶内平均值 */
  function paletteOf(data, width, height) {
    var step = Math.max(1, Math.floor(Math.sqrt(width * height / 60000)));
    var buckets = {};
    for (var y = 0; y < height; y += step) {
      for (var x = 0; x < width; x += step) {
        var i = (y * width + x) * 4;
        if (data[i + 3] < 32) continue;
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
        var item = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
        item.n++; item.r += r; item.g += g; item.b += b;
      }
    }
    return Object.keys(buckets).map(function (k) {
      var v = buckets[k];
      return { r: Math.round(v.r / v.n), g: Math.round(v.g / v.n), b: Math.round(v.b / v.n), n: v.n };
    }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
  }

  TB.def({
    slug: 'img-picker', cat: 'image', name: '图片取色器', desc: '点图取色 · HEX / RGB / HSL', icon: '🎨',
    kw: '取色 吸管 颜色 hex rgb hsl 图片 主色 调色板 色值',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b><span style="color:var(--ink-3)">支持 JPG / PNG / WebP</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="preview" id="preview" hidden style="margin-top:14px;min-height:0;padding:8px">' +
            '<canvas id="cv" tabindex="0" role="img" aria-label="图片取色画布"></canvas>' +
          '</div>' +
          '<div class="kv" id="readout" hidden style="margin-top:14px">' +
            '<div class="kv-item"><div class="kv-k">HEX</div><div class="kv-v" id="hex">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">RGB</div><div class="kv-v" id="rgb">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">HSL</div><div class="kv-v" id="hsl">—</div></div>' +
          '</div>' +
          '<div class="btns" id="actions" hidden>' +
            '<button class="btn primary" id="copyHex">复制 HEX</button>' +
            '<button class="btn" id="copyRgb">复制 RGB</button>' +
            '<button class="btn" id="copyHsl">复制 HSL</button>' +
          '</div>' +
          '<div class="field" id="paletteBox" hidden style="margin-top:14px">' +
            '<div class="label">图片主色<span style="color:var(--ink-3)">点击色块即可复制</span></div>' +
            '<div class="swatches" id="palette"></div>' +
          '</div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">点击或触摸图片取色；大图会先缩放到 1600px 内再取样，颜色可能有轻微偏差。图片只在当前页面解码。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', hint: '上传一张图片，或直接拖进来' });
      var cv = TB.$('#cv', root), c2d = cv.getContext('2d', { willReadFrequently: true });
      var preview = TB.$('#preview', root), readout = TB.$('#readout', root);
      var actions = TB.$('#actions', root), paletteBox = TB.$('#paletteBox', root);
      var msg = TB.$('#msg', root), paletteEl = TB.$('#palette', root);
      var pixels = null, selected = null;

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function setSelected(r, g, b) {
        selected = { r: r, g: g, b: b, hex: toHex(r, g, b), rgb: 'rgb(' + r + ', ' + g + ', ' + b + ')', hsl: toHsl(r, g, b) };
        TB.$('#hex', root).textContent = selected.hex;
        TB.$('#rgb', root).textContent = selected.rgb;
        TB.$('#hsl', root).textContent = selected.hsl;
      }

      function pixelAt(clientX, clientY) {
        if (!pixels) return null;
        var rect = cv.getBoundingClientRect();
        var x = (clientX - rect.left) / rect.width * cv.width;
        var y = (clientY - rect.top) / rect.height * cv.height;
        if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
        var i = (Math.floor(y) * cv.width + Math.floor(x)) * 4;
        return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
      }

      function renderPalette() {
        if (!pixels) return;
        var colors = paletteOf(pixels, cv.width, cv.height);
        paletteEl.innerHTML = '';
        colors.forEach(function (c) {
          var hex = toHex(c.r, c.g, c.b);
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'swatch';
          btn.style.background = hex;
          btn.title = hex + ' · 点击复制';
          btn.setAttribute('aria-label', '复制颜色 ' + hex);
          btn.addEventListener('click', function () { TB.copy(hex); setSelected(c.r, c.g, c.b); });
          paletteEl.appendChild(btn);
        });
        paletteBox.hidden = false;
      }

      async function load(file) {
        showMsg('');
        try {
          var r = await TB.readImage(file);
          var img = r.img;
          var scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          cv.width = Math.max(1, Math.round(img.naturalWidth * scale));
          cv.height = Math.max(1, Math.round(img.naturalHeight * scale));
          c2d.clearRect(0, 0, cv.width, cv.height);
          c2d.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(r.url);
          pixels = c2d.getImageData(0, 0, cv.width, cv.height).data;
          preview.hidden = false;
          readout.hidden = false;
          actions.hidden = false;
          var mid = (Math.floor(cv.height / 2) * cv.width + Math.floor(cv.width / 2)) * 4;
          setSelected(pixels[mid], pixels[mid + 1], pixels[mid + 2]);
          renderPalette();
        } catch (e) {
          showMsg('图片读取失败：' + e.message);
        }
      }

      picker.onChange = function () {
        if (picker.files.length) load(picker.files[0].file);
      };

      function onPick(e) {
        var p = pixelAt(e.clientX, e.clientY);
        if (!p) return;
        setSelected(p.r, p.g, p.b);
        if (e.type === 'pointerdown') e.preventDefault();
      }
      cv.addEventListener('pointermove', onPick);
      cv.addEventListener('pointerdown', onPick);
      cv.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && selected) TB.copy(selected.hex);
      });

      TB.$('#copyHex', root).addEventListener('click', function () { if (selected) TB.copy(selected.hex); });
      TB.$('#copyRgb', root).addEventListener('click', function () { if (selected) TB.copy(selected.rgb); });
      TB.$('#copyHsl', root).addEventListener('click', function () { if (selected) TB.copy(selected.hsl); });
    }
  });
})();
