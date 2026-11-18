/* =============================================================================
 * 截图美化
 * -----------------------------------------------------------------------------
 * 给截图加渐变背景、留白、圆角、阴影，可选浏览器窗口顶栏，导出 PNG。
 * 全部在 Canvas 本地完成，不上传图片。
 * ========================================================================== */
(function () {
  'use strict';

  var GRADIENTS = {
    sunset: ['#ff9a9e', '#fad0c4'],
    ocean: ['#667eea', '#64b6ff'],
    forest: ['#11998e', '#38ef7d'],
    purple: ['#8e2de2', '#4a00e0'],
    mono: ['#f2f3f5', '#d9dde3']
  };

  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  TB.def({
    slug: 'screenshot',
    cat: 'image',
    name: '截图美化',
    desc: '给截图加渐变背景、圆角、阴影和浏览器顶栏，导出适合分享的图片。',
    icon: '🖼️',
    kw: '截图 美化 背景 圆角 阴影 浏览器 分享 小红书',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择截图 <span class="hint">支持 PNG / JPG / WebP</span></div>' +
          '<div id="shotDrop"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">美化参数</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">留白 <b id="shotPadVal">48</b> px</div><input type="range" id="shotPad" min="16" max="120" value="48"></div>' +
            '<div class="field"><div class="label">圆角 <b id="shotRadiusVal">14</b> px</div><input type="range" id="shotRadius" min="0" max="40" value="14"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">背景</div><select class="select" id="shotBg">' +
              '<option value="sunset">日落粉橙</option><option value="ocean">海洋蓝紫</option>' +
              '<option value="forest">森林青绿</option><option value="purple">深紫渐变</option>' +
              '<option value="mono">浅灰极简</option></select></div>' +
            '<div class="field"><div class="label">窗口样式</div><select class="select" id="shotChrome">' +
              '<option value="browser">浏览器顶栏</option><option value="none">无顶栏</option></select></div>' +
          '</div>' +
          '<div class="checks"><label><input type="checkbox" id="shotShadow" checked> 加阴影</label></div>' +
          '<div class="btns"><button class="btn primary" id="shotRun" type="button" disabled>生成预览</button>' +
            '<button class="btn" id="shotDl" type="button" disabled>下载 PNG</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览</div><div class="preview" id="shotPreview" style="min-height:220px;background:var(--surface-2)"><div style="color:var(--ink-3);font-size:12.5px">选择截图后生成预览</div></div></div>' +
        '<p class="note">背景和阴影都由 Canvas 绘制，导出的是普通 PNG，不会包含原始截图的文件名或 EXIF 信息。</p>';

      var picker = TB.filePicker(TB.$('#shotDrop', root), { accept: 'image/*', hint: '一张截图效果最好' });
      var preview = TB.$('#shotPreview', root);
      var runBtn = TB.$('#shotRun', root);
      var dlBtn = TB.$('#shotDl', root);
      var image = null;
      var result = null;

      function current() {
        return {
          pad: parseInt(TB.$('#shotPad', root).value, 10),
          radius: parseInt(TB.$('#shotRadius', root).value, 10),
          bg: TB.$('#shotBg', root).value,
          chrome: TB.$('#shotChrome', root).value,
          shadow: TB.$('#shotShadow', root).checked
        };
      }

      function render() {
        if (!image) return;
        var opt = current();
        var scale = Math.min(1, 1400 / image.naturalWidth);
        var iw = Math.max(1, Math.round(image.naturalWidth * scale));
        var ih = Math.max(1, Math.round(image.naturalHeight * scale));
        var chromeH = opt.chrome === 'browser' ? 34 : 0;
        var cardW = iw + opt.pad * 2;
        var cardH = ih + opt.pad * 2 + chromeH;
        var c = document.createElement('canvas');
        c.width = cardW;
        c.height = cardH;
        var g = c.getContext('2d');
        var colors = GRADIENTS[opt.bg] || GRADIENTS.sunset;
        var grad = g.createLinearGradient(0, 0, cardW, cardH);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        g.fillStyle = grad;
        g.fillRect(0, 0, cardW, cardH);

        if (opt.shadow) {
          g.save();
          g.shadowColor = 'rgba(15, 23, 42, .32)';
          g.shadowBlur = 34;
          g.shadowOffsetY = 14;
          g.fillStyle = '#ffffff';
          roundRect(g, opt.pad, opt.pad, iw, ih + chromeH, opt.radius);
          g.fill();
          g.restore();
        }

        g.save();
        roundRect(g, opt.pad, opt.pad, iw, ih + chromeH, opt.radius);
        g.clip();
        g.fillStyle = '#ffffff';
        g.fillRect(opt.pad, opt.pad, iw, ih + chromeH);
        if (chromeH) {
          g.fillStyle = '#eef1f5';
          g.fillRect(opt.pad, opt.pad, iw, chromeH);
          ['#ff5f57', '#febc2e', '#28c840'].forEach(function (color, i) {
            g.beginPath();
            g.fillStyle = color;
            g.arc(opt.pad + 14 + i * 17, opt.pad + chromeH / 2, 4.5, 0, Math.PI * 2);
            g.fill();
          });
        }
        g.drawImage(image, opt.pad, opt.pad + chromeH, iw, ih);
        g.restore();

        result = c;
        preview.innerHTML = '';
        var pc = document.createElement('canvas');
        var ps = Math.min(1, 980 / Math.max(c.width, c.height));
        pc.width = Math.max(1, Math.round(c.width * ps));
        pc.height = Math.max(1, Math.round(c.height * ps));
        pc.getContext('2d').drawImage(c, 0, 0, pc.width, pc.height);
        pc.style.maxWidth = '100%';
        pc.style.height = 'auto';
        pc.style.display = 'block';
        preview.appendChild(pc);
        dlBtn.disabled = false;
      }

      picker.onChange = function () {
        var f = picker.files[0];
        if (!f) { image = null; runBtn.disabled = true; dlBtn.disabled = true; return; }
        TB.readImage(f.file).then(function (r) {
          image = r.img;
          runBtn.disabled = false;
          render();
          URL.revokeObjectURL(r.url);
        }).catch(function () { TB.toast('读取图片失败，请换一张试试'); });
      };

      runBtn.addEventListener('click', render);
      dlBtn.addEventListener('click', function () {
        if (result) TB.downloadCanvas(result, '截图美化.png', 'image/png');
      });

      ['shotPad', 'shotRadius'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', function () {
          TB.$('#' + id + 'Val', root).textContent = TB.$('#' + id, root).value;
          if (image) render();
        });
      });
      ['shotBg', 'shotChrome', 'shotShadow'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('change', function () { if (image) render(); });
      });
    }
  });
})();
