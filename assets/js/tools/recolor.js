/* =============================================================================
 * 图片颜色替换
 * -----------------------------------------------------------------------------
 * 在浏览器里把图片中与目标颜色相近的像素替换成新颜色，支持吸管取色与容差。
 * 输出保持原图透明度；大图最长边限制到 2400px，避免占用过多内存。
 * ========================================================================== */

(function () {
  'use strict';

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (n) {
      return ('0' + Math.round(n).toString(16)).slice(-2);
    }).join('').toUpperCase();
  }

  async function fileToCanvas(file, maxSide) {
    var r = await TB.readImage(file);
    var img = r.img, w = img.naturalWidth, h = img.naturalHeight;
    var scale = Math.min(1, maxSide / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(r.url);
    return c;
  }

  TB.def({
    slug: 'img-recolor', cat: 'image', name: '图片颜色替换', desc: '按颜色吸管 · 容差替换', icon: '🖌️',
    kw: '颜色替换 换色 吸管 容差 图片 改色 抠色 色彩',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b><span style="color:var(--ink-3)">支持 JPG / PNG / WebP</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>要替换的颜色</b><span style="color:var(--ink-3)">可直接点图取色</span></div>' +
              '<div style="display:flex;align-items:center;gap:8px;height:36px">' +
                '<label class="color-pick"><input type="color" id="srcColor" value="#ffffff"></label>' +
                '<span id="srcHex" style="font:12px ui-monospace,monospace;color:var(--ink-2)">#FFFFFF</span>' +
              '</div></div>' +
            '<div class="field"><div class="label"><b>替换成</b></div>' +
              '<label class="color-pick"><input type="color" id="dstColor" value="#ff6b35"></label></div>' +
            '<div class="field"><div class="label"><b>容差</b><span style="color:var(--ink-3)" id="tolVal">30</span></div>' +
              '<input class="input" id="tol" type="range" min="0" max="150" value="30" style="padding:0"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>替换颜色</button>' +
            '<button class="btn" id="reset" disabled>恢复原图</button>' +
            '<button class="btn" id="dl" disabled>下载 PNG</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="originalBox" hidden style="margin-top:14px;min-height:0;padding:8px">' +
            '<canvas id="cv" tabindex="0" role="img" aria-label="点击图片取色"></canvas>' +
          '</div>' +
          '<div class="preview" id="outBox" hidden style="margin-top:14px;min-height:0;padding:8px">' +
            '<canvas id="pv"></canvas>' +
          '</div>' +
          '<div id="meta" hidden style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">按 RGB 距离做全局替换，适合纯色背景、图标、插画；照片里的渐变和抗锯齿边缘可能残留一点原色，可调整容差多试几次。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', hint: '上传一张图片' });
      var cv = TB.$('#cv', root), pv = TB.$('#pv', root);
      var srcColor = TB.$('#srcColor', root), dstColor = TB.$('#dstColor', root), srcHex = TB.$('#srcHex', root);
      var tol = TB.$('#tol', root), tolVal = TB.$('#tolVal', root), msg = TB.$('#msg', root);
      var originalBox = TB.$('#originalBox', root), outBox = TB.$('#outBox', root), meta = TB.$('#meta', root);
      var run = TB.$('#run', root), reset = TB.$('#reset', root), dl = TB.$('#dl', root);
      var pixels = null, out = null;

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function setSource(r, g, b) {
        var hex = rgbToHex(r, g, b);
        srcColor.value = hex;
        srcHex.textContent = hex;
      }

      function pick(e) {
        if (!pixels) return;
        var rect = cv.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width * cv.width;
        var y = (e.clientY - rect.top) / rect.height * cv.height;
        if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;
        var i = (Math.floor(y) * cv.width + Math.floor(x)) * 4;
        setSource(pixels[i], pixels[i + 1], pixels[i + 2]);
      }

      async function load(file) {
        showMsg('');
        try {
          var c = await fileToCanvas(file, 2400);
          cv.width = c.width; cv.height = c.height;
          cv.getContext('2d').drawImage(c, 0, 0);
          pixels = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
          originalBox.hidden = false;
          outBox.hidden = true;
          meta.hidden = true;
          dl.disabled = true;
          out = null;
          run.disabled = false;
          reset.disabled = false;
          var mid = (Math.floor(cv.height / 2) * cv.width + Math.floor(cv.width / 2)) * 4;
          setSource(pixels[mid], pixels[mid + 1], pixels[mid + 2]);
          tolVal.textContent = tol.value;
        } catch (e) {
          showMsg('图片读取失败：' + e.message);
        }
      }

      picker.onChange = function () {
        if (picker.files.length) load(picker.files[0].file);
      };
      cv.addEventListener('pointerdown', function (e) { pick(e); e.preventDefault(); });

      function replace() {
        if (!pixels) return;
        var a = hexToRgb(srcColor.value), b = hexToRgb(dstColor.value);
        var t = parseInt(tol.value, 10) || 0;
        var c = document.createElement('canvas');
        c.width = cv.width; c.height = cv.height;
        var data = new Uint8ClampedArray(pixels);
        var changed = 0;
        for (var i = 0; i < data.length; i += 4) {
          var dr = data[i] - a.r, dg = data[i + 1] - a.g, db = data[i + 2] - a.b;
          if (Math.sqrt(dr * dr + dg * dg + db * db) <= t) {
            data[i] = b.r; data[i + 1] = b.g; data[i + 2] = b.b;
            changed++;
          }
        }
        c.getContext('2d').putImageData(new ImageData(data, c.width, c.height), 0, 0);
        out = c;

        var scale = Math.min(1, 360 / Math.max(c.width, c.height));
        pv.width = Math.round(c.width * scale); pv.height = Math.round(c.height * scale);
        pv.getContext('2d').drawImage(c, 0, 0, pv.width, pv.height);
        outBox.hidden = false;
        dl.disabled = false;
        meta.hidden = false;
        meta.innerHTML = '<div class="kv">' +
          '<div class="kv-item"><div class="kv-k">替换像素</div><div class="kv-v">' + changed.toLocaleString() + ' 个</div></div>' +
          '<div class="kv-item"><div class="kv-k">输出尺寸</div><div class="kv-v">' + c.width + ' × ' + c.height + ' px</div></div>' +
          '</div>';
        showMsg('');
      }

      run.addEventListener('click', replace);
      tol.addEventListener('input', function () { tolVal.textContent = tol.value; });
      reset.addEventListener('click', function () {
        out = null;
        outBox.hidden = true;
        meta.hidden = true;
        dl.disabled = true;
        var mid = (Math.floor(cv.height / 2) * cv.width + Math.floor(cv.width / 2)) * 4;
        setSource(pixels[mid], pixels[mid + 1], pixels[mid + 2]);
      });
      dl.addEventListener('click', function () { if (out) TB.downloadCanvas(out, '颜色替换.png'); });
    }
  });
})();
