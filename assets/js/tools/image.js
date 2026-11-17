/* =============================================================================
 * 图片处理类工具
 * -----------------------------------------------------------------------------
 * 全部基于 Canvas 2D，不上传、不联网。输出统一走 canvas.toBlob，
 * 多文件结果用 JSZip 打包下载。
 * ========================================================================== */

(function () {

  /* 把 File 转成 canvas；可选最大边长限制 */
  async function fileToCanvas(file, maxSide) {
    var r = await TB.readImage(file);
    var img = r.img;
    var w = img.naturalWidth, h = img.naturalHeight;
    var scale = 1;
    if (maxSide && Math.max(w, h) > maxSide) scale = maxSide / Math.max(w, h);
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(r.url);
    return c;
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px"><span class="' +
      (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  /* ------------------------------------------------------------------ 1. 图片转换 / 压缩 */
  TB.def({
    slug: 'img-convert', cat: 'image', name: '图片转换 / 压缩', desc: '格式互转、批量压缩', icon: '🔄',
    kw: 'jpg png webp 压缩 转换 批量 体积',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b><span style="color:var(--ink-3)">支持批量，可拖拽</span></div><div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">输出格式</div><select class="select" id="fmt">' +
              '<option value="image/jpeg">JPEG（体积小，照片首选）</option>' +
              '<option value="image/webp">WebP（更小，现代浏览器支持）</option>' +
              '<option value="image/png">PNG（无损，保留透明）</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">质量<span style="color:var(--ink-3)">JPEG/WebP 生效</span></div>' +
              '<input class="input" id="q" type="number" min="1" max="100" value="82"></div>' +
            '<div class="field"><div class="label">最长边（px，0=原尺寸）</div><input class="input" id="max" type="number" min="0" value="0"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>开始处理</button>' +
            '<button class="btn" id="clear">清空</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">压缩原理：重新编码 + 可选缩放。边长限制到 1600px 通常能把手机照片压到 300KB 以内，网页用足够。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', multiple: true, hint: '支持 JPG / PNG / WebP / GIF' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };
      TB.$('#clear', root).addEventListener('click', function () { picker.clear(); status(msg, ''); });

      run.addEventListener('click', async function () {
        run.disabled = true;
        var type = TB.$('#fmt', root).value;
        var quality = Math.min(1, Math.max(0.01, (parseInt(TB.$('#q', root).value, 10) || 82) / 100));
        var maxSide = parseInt(TB.$('#max', root).value, 10) || 0;
        var ext = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
        var entries = [], log = [];

        try {
          for (var i = 0; i < picker.files.length; i++) {
            var f = picker.files[i].file;
            var c = await fileToCanvas(f, maxSide);
            var blob = await TB.canvasBlob(c, type, quality);
            if (!blob) throw new Error('当前浏览器不支持导出该格式，换成 JPEG/PNG 再试');
            entries.push({ name: f.name.replace(/\.[^.]+$/, '') + '.' + ext, blob: blob });
            log.push(f.name + '：' + TB.fmtBytes(f.size) + ' → ' + TB.fmtBytes(blob.size) +
              '（' + (blob.size < f.size ? '减少 ' + Math.round((1 - blob.size / f.size) * 100) + '%' : '增大') + '）');
            status(msg, '已处理 ' + (i + 1) + '/' + picker.files.length + '…');
          }
          if (entries.length === 1) {
            TB.download(entries[0].blob, entries[0].name);
          } else {
            await TB.zipDownload(entries, '图片转换结果.zip');
          }
          status(msg, '完成 ' + entries.length + ' 张：\n' + log.join('\n'));
        } catch (e) {
          status(msg, '处理失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------------ 2. 图片拼接 */
  TB.def({
    slug: 'img-stitch', cat: 'image', name: '图片拼接', desc: '拼长图 / 横向拼接', icon: '🧵',
    kw: '拼接 长图 截图 拼图 合图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b><span style="color:var(--ink-3)">按列表顺序拼接</span></div><div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">拼接方向</div><select class="select" id="dir">' +
              '<option value="v">纵向（拼长图）</option><option value="h">横向</option></select></div>' +
            '<div class="field"><div class="label">间距（px）</div><input class="input" id="gap" type="number" min="0" value="0"></div>' +
            '<div class="field"><div class="label">背景色</div><input class="input" id="bg" type="color" value="#ffffff" style="padding:2px"></div>' +
          '</div>' +
          '<div class="field"><label class="checks"><label><input type="checkbox" id="equal" checked> 统一宽度/高度（按首图）</label></label></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>拼接并预览</button>' +
            '<button class="btn" id="dl" disabled>下载图片</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="preview" style="margin-top:14px;min-height:0" hidden></div>' +
        '</div>' +
        '<div class="note">拼接长图时建议勾选「统一宽度」，否则不同尺寸的截图会错位。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', multiple: true, sortable: true, hint: '拖拽可调整顺序' });
      var run = TB.$('#run', root), dl = TB.$('#dl', root), msg = TB.$('#msg', root), preview = TB.$('#preview', root);
      var resultCanvas = null;

      picker.onChange = function () { run.disabled = !picker.files.length; dl.disabled = true; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        status(msg, '正在拼接…');
        try {
          var dir = TB.$('#dir', root).value;
          var gap = Math.max(0, parseInt(TB.$('#gap', root).value, 10) || 0);
          var bg = TB.$('#bg', root).value || '#ffffff';
          var equal = TB.$('#equal', root).checked;
          var imgs = [];

          for (var i = 0; i < picker.files.length; i++) {
            var r = await TB.readImage(picker.files[i].file);
            imgs.push(r);
          }

          var W = 0, H = 0;
          var base = equal ? (dir === 'v' ? imgs[0].img.naturalWidth : imgs[0].img.naturalHeight) : 0;
          imgs.forEach(function (r) {
            var w = r.img.naturalWidth, h = r.img.naturalHeight;
            if (equal) {
              if (dir === 'v') { var s = base / w; w = base; h = Math.round(h * s); }
              else { var s2 = base / h; h = base; w = Math.round(w * s2); }
            }
            r.tw = w; r.th = h;
            if (dir === 'v') { W = Math.max(W, w); H += h; } else { H = Math.max(H, h); W += w; }
          });
          if (dir === 'v') H += gap * (imgs.length - 1); else W += gap * (imgs.length - 1);

          var c = document.createElement('canvas');
          c.width = W; c.height = H;
          var g = c.getContext('2d');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          var x = 0, y = 0;
          imgs.forEach(function (r) {
            if (dir === 'v') { g.drawImage(r.img, (W - r.tw) / 2, y, r.tw, r.th); y += r.th + gap; }
            else { g.drawImage(r.img, x, (H - r.th) / 2, r.tw, r.th); x += r.tw + gap; }
            URL.revokeObjectURL(r.url);
          });

          resultCanvas = c;
          preview.hidden = false;
          preview.innerHTML = '';
          /* 预览用缩小图，避免上百兆像素的原图撑爆内存 */
          var pc = document.createElement('canvas');
          var ps = Math.min(1, 1200 / Math.max(W, H));
          pc.width = Math.round(W * ps); pc.height = Math.round(H * ps);
          pc.getContext('2d').drawImage(c, 0, 0, pc.width, pc.height);
          preview.appendChild(pc);
          dl.disabled = false;
          status(msg, '拼接完成：' + W + ' × ' + H + ' 像素，' + imgs.length + ' 张。');
        } catch (e) {
          status(msg, '拼接失败：' + e.message, true);
        }
        run.disabled = false;
      });

      dl.addEventListener('click', function () {
        if (resultCanvas) TB.downloadCanvas(resultCanvas, '拼接图片.png', 'image/png');
      });
    }
  });

  /* ------------------------------------------------------------------ 3. 图片九宫格切图 */
  TB.def({
    slug: 'img-grid', cat: 'image', name: '图片九宫格', desc: '切图 / 网格拼贴', icon: '🔲',
    kw: '九宫格 切图 朋友圈 网格 分图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择一张图片</b></div><div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">行列数</div><select class="select" id="n">' +
              '<option value="3">3 × 3（九宫格）</option><option value="2">2 × 2</option>' +
              '<option value="4">4 × 4</option><option value="6">6 × 6</option></select></div>' +
            '<div class="field"><div class="label">格子间距（px）</div><input class="input" id="gap" type="number" min="0" value="8"></div>' +
            '<div class="field"><div class="label">背景色</div><input class="input" id="bg" type="color" value="#ffffff" style="padding:2px"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>切图并下载</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="preview" style="margin-top:14px;min-height:0" hidden></div>' +
        '</div>' +
        '<div class="note">先按正方形居中裁剪，再均分切块，每块单独成图并打包成 zip。朋友圈九宫格直接用。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', hint: '一张正方形效果最好' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root), preview = TB.$('#preview', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        status(msg, '正在切图…');
        try {
          var n = parseInt(TB.$('#n', root).value, 10) || 3;
          var gap = Math.max(0, parseInt(TB.$('#gap', root).value, 10) || 0);
          var bg = TB.$('#bg', root).value || '#ffffff';
          var r = await TB.readImage(picker.files[0].file);
          var img = r.img;

          /* 居中裁成正方形 */
          var size = Math.min(img.naturalWidth, img.naturalHeight);
          var sx = (img.naturalWidth - size) / 2, sy = (img.naturalHeight - size) / 2;
          var cell = Math.floor(size / n);

          var entries = [], thumbs = [];
          for (var row = 0; row < n; row++) {
            for (var col = 0; col < n; col++) {
              var c = document.createElement('canvas');
              c.width = cell; c.height = cell;
              var g = c.getContext('2d');
              g.fillStyle = bg;
              g.fillRect(0, 0, cell, cell);
              g.drawImage(img, sx + col * cell, sy + row * cell, cell, cell, 0, 0, cell, cell);
              var blob = await TB.canvasBlob(c, 'image/png');
              entries.push({ name: '块_' + (row + 1) + '-' + (col + 1) + '.png', blob: blob });
              thumbs.push(c);
            }
          }
          URL.revokeObjectURL(r.url);

          preview.hidden = false;
          preview.innerHTML = '';
          var board = document.createElement('div');
          board.style.display = 'grid';
          board.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
          board.style.gap = gap + 'px';
          board.style.width = 'min(100%, 380px)';
          thumbs.forEach(function (t) {
            var img2 = new Image();
            img2.src = t.toDataURL('image/png');
            img2.style.width = '100%';
            img2.style.display = 'block';
            board.appendChild(img2);
          });
          preview.appendChild(board);

          await TB.zipDownload(entries, '九宫格切图.zip');
          status(msg, '完成：' + entries.length + ' 张，每张 ' + cell + ' × ' + cell + ' 像素。');
        } catch (e) {
          status(msg, '切图失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------------ 4. 图片水印 */
  TB.def({
    slug: 'img-watermark', cat: 'image', name: '图片添加水印', desc: '文字 / 平铺水印', icon: '🏷️',
    kw: '水印 版权 文字 平铺 防盗图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label">水印文字</div><input class="input" id="text" type="text" value="仅供内部使用" placeholder="例如：仅供内部使用"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">字号</div><input class="input" id="size" type="number" value="28" min="10" max="200"></div>' +
            '<div class="field"><div class="label">透明度（%）</div><input class="input" id="alpha" type="number" value="22" min="3" max="100"></div>' +
            '<div class="field"><div class="label">旋转角度</div><input class="input" id="angle" type="number" value="-28" min="-90" max="90"></div>' +
          '</div>' +
          '<div class="field"><div class="label">排布</div><select class="select" id="mode">' +
            '<option value="tile">平铺全图（防截图盗用）</option>' +
            '<option value="br">右下角单个</option><option value="c">居中单个</option>' +
            '<option value="tl">左上角单个</option></select></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">文字颜色</div><input class="input" id="color" type="color" value="#8b9cb3" style="padding:2px"></div>' +
            '<div class="field"><div class="label">输出</div><select class="select" id="fmt"><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>加水印并预览</button>' +
            '<button class="btn" id="dl" disabled>下载</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="preview" style="margin-top:14px;min-height:0" hidden></div>' +
        '</div>' +
        '<div class="note">水印画在原图分辨率上，缩放后依然清晰。平铺模式会自动计算间距，不至于密到看不清图。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', hint: '支持一张，也可批量（取第一张预览）' });
      var run = TB.$('#run', root), dl = TB.$('#dl', root), msg = TB.$('#msg', root), preview = TB.$('#preview', root);
      var out = null;
      picker.onChange = function () { run.disabled = !picker.files.length; dl.disabled = true; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        status(msg, '正在绘制…');
        try {
          var text = TB.$('#text', root).value || '';
          var size = parseInt(TB.$('#size', root).value, 10) || 28;
          var alpha = Math.min(1, Math.max(0.03, (parseInt(TB.$('#alpha', root).value, 10) || 22) / 100));
          var angle = (parseInt(TB.$('#angle', root).value, 10) || 0) * Math.PI / 180;
          var mode = TB.$('#mode', root).value;
          var color = TB.$('#color', root).value || '#8b9cb3';
          var fmt = TB.$('#fmt', root).value;

          var r = await TB.readImage(picker.files[0].file);
          var img = r.img;
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          var g = c.getContext('2d');
          g.drawImage(img, 0, 0);

          g.save();
          g.globalAlpha = alpha;
          g.fillStyle = color;
          g.font = '600 ' + size + 'px -apple-system, "Microsoft YaHei", sans-serif';
          g.textBaseline = 'middle';
          var tw = g.measureText(text).width;

          if (mode === 'tile') {
            g.translate(c.width / 2, c.height / 2);
            g.rotate(angle);
            var stepX = tw + size * 2.2;
            var stepY = size * 3.6;
            var span = Math.ceil(Math.hypot(c.width, c.height) / 2) + Math.max(stepX, stepY);
            for (var y = -span; y <= span; y += stepY) {
              for (var x = -span; x <= span; x += stepX) {
                g.fillText(text, x, y);
              }
            }
          } else {
            var pad = Math.round(size * 1.1);
            var cx = mode === 'br' ? c.width - pad - tw : mode === 'tl' ? pad : (c.width - tw) / 2;
            var cy = mode === 'br' ? c.height - pad : mode === 'tl' ? pad : c.height / 2;
            g.fillText(text, cx, cy);
          }
          g.restore();
          URL.revokeObjectURL(r.url);

          out = { canvas: c, fmt: fmt };
          preview.hidden = false;
          preview.innerHTML = '';
          var pc = document.createElement('canvas');
          var ps = Math.min(1, 900 / Math.max(c.width, c.height));
          pc.width = Math.round(c.width * ps); pc.height = Math.round(c.height * ps);
          pc.getContext('2d').drawImage(c, 0, 0, pc.width, pc.height);
          preview.appendChild(pc);
          dl.disabled = false;
          status(msg, '预览已生成（' + c.width + ' × ' + c.height + '），确认后点下载。');
        } catch (e) {
          status(msg, '失败：' + e.message, true);
        }
        run.disabled = false;
      });

      dl.addEventListener('click', function () {
        if (!out) return;
        var ext = out.fmt === 'image/png' ? 'png' : 'jpg';
        TB.downloadCanvas(out.canvas, '加水印.' + ext, out.fmt, 0.92);
      });
    }
  });

  /* ------------------------------------------------------------------ 5. 图片转 Base64 */
  TB.def({
    slug: 'img-base64', cat: 'image', name: '图片转 Base64', desc: 'Data URI 互转', icon: '🔗',
    kw: 'base64 datauri 内联 编码 图片',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="tabs"><button class="tab on" data-t="enc">图片 → Base64</button>' +
            '<button class="tab" data-t="dec">Base64 → 图片</button></div>' +
          '<div id="pane"></div>' +
        '</div>';

      var pane = TB.$('#pane', root);
      var tabs = TB.$('#tabs', root);

      function encPane() {
        pane.innerHTML = '<div class="field"><div class="label"><b>选择图片</b></div><div id="drop"></div></div>' +
          '<div class="btns"><button class="btn" id="copy" disabled>复制全部</button>' +
          '<button class="btn" id="copyuri" disabled>仅复制 data URI 前缀</button></div>' +
          '<div class="out" hidden id="outBox"><div class="out-h"><span class="grow">Base64</span>' +
            '<button class="btn sm" id="copy2">复制</button></div><div class="out-b" id="outTxt"></div></div>';
        var picker = TB.filePicker(TB.$('#drop', pane), { accept: 'image/*', hint: '建议用于小图标，大图会让 HTML 很臃肿' });
        picker.onChange = async function () {
          if (!picker.files.length) return;
          var uri = await TB.readDataURL(picker.files[0].file);
          var b64 = uri.split(',')[1] || '';
          TB.$('#outBox', pane).hidden = false;
          TB.$('#outTxt', pane).textContent = b64;
          ['#copy', '#copyuri', '#copy2'].forEach(function (id) { TB.$(id, pane).disabled = false; });
          TB.$('#copy', pane).onclick = function () { TB.copy(b64); };
          TB.$('#copyuri', pane).onclick = function () { TB.copy(uri.slice(0, uri.indexOf(',') + 1) + '...'); };
          TB.$('#copy2', pane).onclick = function () { TB.copy(b64); };
        };
      }

      function decPane() {
        pane.innerHTML = '<div class="field"><div class="label"><b>粘贴 Base64 或 data URI</b></div>' +
          '<textarea class="textarea" id="src" placeholder="iVBORw0KGgo... 或 data:image/png;base64,...."></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="prev">预览</button>' +
          '<button class="btn" id="save" disabled>下载图片</button></div>' +
          '<div class="preview" id="pv" style="margin-top:14px" hidden></div><div id="msg"></div>';

        var ext = 'png';
        TB.$('#prev', pane).addEventListener('click', function () {
          var s = TB.$('#src', pane).value.trim();
          if (!s) return;
          var mime = 'image/png';
          var mm = s.match(/^data:([^;]+);base64,/);
          if (mm) { mime = mm[1]; ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg'); }
          else s = 'data:' + mime + ';base64,' + s.replace(/\s/g, '');
          var pv = TB.$('#pv', pane);
          pv.hidden = false;
          pv.innerHTML = '<img alt="预览" src="' + s.replace(/"/g, '') + '">';
          TB.$('#save', pane).disabled = false;
          TB.$('#save', pane).onclick = function () {
            var b = s.split(',')[1] || '';
            try {
              var bin = atob(b);
              var arr = new Uint8Array(bin.length);
              for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
              TB.download(new Blob([arr], { type: mime }), 'base64图片.' + ext);
            } catch (e) { TB.toast('不是合法的 Base64'); }
          };
        });
      }

      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.tab');
        if (!b) return;
        TB.$$('.tab', tabs).forEach(function (x) { x.classList.toggle('on', x === b); });
        b.getAttribute('data-t') === 'enc' ? encPane() : decPane();
      });

      encPane();
    }
  });

  /* ------------------------------------------------------------------ 6. SVG 转 PNG */
  TB.def({
    slug: 'svg-to-png', cat: 'image', name: 'SVG 转 PNG', desc: '矢量转位图', icon: '🎨',
    kw: 'svg png 矢量 位图 导出 缩放',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>SVG 源码</b><span style="color:var(--ink-3)">或选择 .svg 文件</span></div>' +
            '<textarea class="textarea" id="src" placeholder="&lt;svg ...&gt;...&lt;/svg&gt;"></textarea>' +
            '<div id="drop" style="margin-top:10px"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">输出宽度（px）</div><input class="input" id="w" type="number" value="800" min="16"></div>' +
            '<div class="field"><div class="label">缩放倍数</div><select class="select" id="scale">' +
              '<option value="1">1x</option><option value="2">2x（高清）</option><option value="3">3x</option></select></div>' +
            '<div class="field"><div class="label">背景</div><select class="select" id="bg">' +
              '<option value="transparent">透明</option><option value="#ffffff">白色</option><option value="#000000">黑色</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>转换</button>' +
            '<button class="btn" id="dl" disabled>下载 PNG</button></div>' +
          '<div id="msg"></div><div class="preview" id="pv" style="margin-top:14px" hidden></div>' +
        '</div>' +
        '<div class="note">如果 SVG 里引用了外部图片或字体，Canvas 会因为跨域限制画不出来——先内联成 data URI。</div>';

      var src = TB.$('#src', root), run = TB.$('#run', root), msg = TB.$('#msg', root);
      var pv = TB.$('#pv', root), dl = TB.$('#dl', root);
      var resultCanvas = null;

      /* 手打或粘贴源码时也要放开「转换」按钮 */
      src.addEventListener('input', function () { run.disabled = !src.value.trim(); });

      /* 选择 .svg 文件后把源码填进文本框 */
      var fp = TB.filePicker(TB.$('#drop', root), { accept: '.svg,image/svg+xml', hint: '选择 .svg 文件自动填入源码' });
      fp.onChange = async function () {
        if (!fp.files.length) return;
        src.value = await TB.readText(fp.files[0].file);
        TB.toast('已载入 SVG 源码');
      };

      run.addEventListener('click', async function () {
        var code = src.value.trim();
        if (!code) { status(msg, '请先粘贴 SVG 源码或选择文件', true); return; }
        status(msg, '正在渲染…');
        try {
          var outW = Math.max(16, parseInt(TB.$('#w', root).value, 10) || 800);
          var scale = parseFloat(TB.$('#scale', root).value) || 1;
          var bgSel = TB.$('#bg', root).value;

          /* 用 Blob URL 加载 SVG，避免 data URI 编码问题 */
          var blob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var img = await new Promise(function (res, rej) {
            var im = new Image();
            im.onload = function () { res(im); };
            im.onerror = function () { rej(new Error('SVG 解析失败，检查标签是否闭合')); };
            im.src = url;
          });

          var ratio = img.naturalHeight / img.naturalWidth || 1;
          var W = Math.round(outW * scale);
          var H = Math.round(W * ratio);
          var c = document.createElement('canvas');
          c.width = W; c.height = H;
          var g = c.getContext('2d');
          if (bgSel !== 'transparent') { g.fillStyle = bgSel; g.fillRect(0, 0, W, H); }
          g.drawImage(img, 0, 0, W, H);
          URL.revokeObjectURL(url);

          resultCanvas = c;
          pv.hidden = false;
          pv.innerHTML = '';
          pv.appendChild(c);
          dl.disabled = false;
          status(msg, '转换完成：' + W + ' × ' + H + ' 像素。');
        } catch (e) {
          status(msg, '转换失败：' + e.message, true);
        }
      });

      dl.addEventListener('click', function () {
        if (resultCanvas) TB.downloadCanvas(resultCanvas, 'svg转png.png', 'image/png');
      });
    }
  });

  /* ------------------------------------------------------------------ 7. 占位图生成 */
  TB.def({
    slug: 'placeholder', cat: 'image', name: '占位图生成', desc: '尺寸占位图 / 设计稿占位', icon: '⬜',
    kw: 'placeholder 占位 设计 尺寸 假图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label">宽（px）</div><input class="input" id="w" type="number" value="800" min="1"></div>' +
            '<div class="field"><div class="label">高（px）</div><input class="input" id="h" type="number" value="450" min="1"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">背景色</div><input class="input" id="bg" type="color" value="#2b7fff" style="padding:2px"></div>' +
            '<div class="field"><div class="label">文字色</div><input class="input" id="fg" type="color" value="#ffffff" style="padding:2px"></div>' +
            '<div class="field"><div class="label">文字（留空自动写尺寸）</div><input class="input" id="txt" type="text" placeholder="800 × 450"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成预览</button>' +
            '<button class="btn" id="dlpng" disabled>下载 PNG</button>' +
            '<button class="btn" id="dlsvg">下载 SVG</button></div>' +
          '<div class="preview" id="pv" style="margin-top:14px"></div>' +
        '</div>';

      var pv = TB.$('#pv', root), msg = TB.$('#msg', root);
      var canvas = null;

      function draw() {
        var w = Math.max(1, parseInt(TB.$('#w', root).value, 10) || 1);
        var h = Math.max(1, parseInt(TB.$('#h', root).value, 10) || 1);
        var bg = TB.$('#bg', root).value;
        var fg = TB.$('#fg', root).value;
        var txt = TB.$('#txt', root).value || (w + ' × ' + h);

        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var g = c.getContext('2d');
        g.fillStyle = bg; g.fillRect(0, 0, w, h);

        /* 画两条对角线，看起来更像设计稿占位 */
        g.strokeStyle = fg; g.globalAlpha = .25; g.lineWidth = Math.max(1, Math.round(Math.min(w, h) / 200));
        g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
        g.globalAlpha = 1;

        var size = Math.max(12, Math.min(w, h) / 8);
        g.fillStyle = fg;
        g.font = '600 ' + size + 'px -apple-system, "Microsoft YaHei", sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(txt, w / 2, h / 2);
        canvas = c;
        pv.innerHTML = '';
        pv.appendChild(c);
        TB.$('#dlpng', root).disabled = false;
      }

      TB.$('#run', root).addEventListener('click', draw);
      TB.$('#dlpng', root).addEventListener('click', function () {
        if (canvas) TB.downloadCanvas(canvas, 'placeholder.png', 'image/png');
      });
      TB.$('#dlsvg', root).addEventListener('click', function () {
        var w = parseInt(TB.$('#w', root).value, 10) || 1;
        var h = parseInt(TB.$('#h', root).value, 10) || 1;
        var bg = TB.$('#bg', root).value;
        var fg = TB.$('#fg', root).value;
        var txt = TB.$('#txt', root).value || (w + ' × ' + h);
        var size = Math.max(12, Math.min(w, h) / 8);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
          '<rect width="100%" height="100%" fill="' + bg + '"/>' +
          '<path d="M0 0 L' + w + ' ' + h + ' M' + w + ' 0 L0 ' + h + '" stroke="' + fg + '" stroke-opacity="0.25" stroke-width="' + Math.max(1, Math.min(w, h) / 200) + '"/>' +
          '<text x="50%" y="50%" fill="' + fg + '" font-family="sans-serif" font-weight="600" font-size="' + size + '" text-anchor="middle" dominant-baseline="middle">' + TB.esc(txt) + '</text></svg>';
        TB.downloadText(svg, 'placeholder.svg', 'image/svg+xml');
      });

      draw();
    }
  });

  /* ------------------------------------------------------------------ 8. 印章生成 */
  TB.def({
    slug: 'stamp', cat: 'image', name: '印章生成', desc: '电子公章 / 签名章', icon: '🔴',
    kw: '印章 公章 圆形章 电子章 盖章',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label">印章文字<span style="color:var(--ink-3)">环绕在圆环上的单位名，建议 12-18 字</span></div>' +
            '<input class="input" id="name" type="text" value="简单网络科技有限公司"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">中心文字</div><input class="input" id="center" type="text" value="公章"></div>' +
            '<div class="field"><div class="label">中心下方小字（可空）</div><input class="input" id="sub" type="text" placeholder="例如 合同专用"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">印章颜色</div><input class="input" id="color" type="color" value="#d33" style="padding:2px"></div>' +
            '<div class="field"><div class="label">尺寸（px）</div><input class="input" id="size" type="number" value="480" min="120" max="1200"></div>' +
            '<div class="field"><div class="label">中心大字</div><input class="input" id="star" type="text" value="★"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="dl" disabled>下载 PNG（透明底）</button></div>' +
          '<div class="preview" id="pv" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">仅供设计稿、样张、个人练习使用；正式文件上的印章具有法律效力，伪造公章属违法行为。</div>';

      var pv = TB.$('#pv', root);
      var canvas = null;

      function draw() {
        var size = Math.max(120, parseInt(TB.$('#size', root).value, 10) || 480);
        var name = TB.$('#name', root).value || '';
        var center = TB.$('#center', root).value || '';
        var sub = TB.$('#sub', root).value || '';
        var color = TB.$('#color', root).value;
        var star = TB.$('#star', root).value || '★';

        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var g = c.getContext('2d');
        var R = size / 2;
        g.translate(R, R);

        /* 外圈 + 内圈 */
        g.strokeStyle = color;
        g.lineWidth = size * 0.035;
        g.beginPath(); g.arc(0, 0, R - g.lineWidth / 2 - size * 0.01, 0, Math.PI * 2); g.stroke();
        g.lineWidth = size * 0.012;
        g.beginPath(); g.arc(0, 0, R * 0.80, 0, Math.PI * 2); g.stroke();

        /* 环形文字：从顶部左右各占一半 */
        var textR = R * 0.885;
        var fontSize = size * 0.115;
        var chars = name.split('');
        /* 字数多时自动缩小 */
        var maxArc = Math.PI * 1.62;
        var need = chars.length * fontSize * 1.05;
        if (need > textR * maxArc) fontSize = Math.max(size * 0.045, textR * maxArc / (chars.length * 1.05));

        g.fillStyle = color;
        g.font = '600 ' + fontSize + 'px "Songti SC", "SimSun", serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';

        var total = chars.length * fontSize * 1.05;
        var start = -total / 2;   /* 以正上方为 0，向前后展开 */
        chars.forEach(function (ch, i) {
          var ang = start + fontSize * 1.05 * (i + 0.5) - Math.PI / 2;
          g.save();
          g.rotate(ang + Math.PI / 2);
          g.fillText(ch, 0, -textR);
          g.restore();
        });

        /* 中心五角星 */
        if (star) {
          g.font = '600 ' + (size * 0.2) + 'px "Apple Symbols", serif';
          g.fillText(star, 0, size * 0.02);
        }

        /* 中心文字 */
        if (center) {
          var cs = size * 0.17;
          g.font = '700 ' + cs + 'px "Songti SC", "SimSun", serif';
          g.fillText(center, 0, size * 0.24);
        }
        if (sub) {
          var ss = size * 0.062;
          g.font = '500 ' + ss + 'px "Songti SC", "SimSun", serif';
          g.fillText(sub, 0, size * 0.36);
        }

        canvas = c;
        pv.innerHTML = '';
        pv.appendChild(c);
        TB.$('#dl', root).disabled = false;
      }

      TB.$('#run', root).addEventListener('click', draw);
      TB.$('#dl', root).addEventListener('click', function () {
        if (canvas) TB.downloadCanvas(canvas, '印章.png', 'image/png');
      });
      draw();
    }
  });

})();
