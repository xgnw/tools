/* =============================================================================
 * 图片像素化 / 马赛克
 * -----------------------------------------------------------------------------
 * 全部在 Canvas 本地处理：
 * 1) 全图块状像素化；2) 画笔局部马赛克。
 * 超过 3000px 的图片等比缩小后再处理，避免移动端爆内存。
 * ========================================================================== */

(function () {
  'use strict';

  var MAX_SIDE = 3000;

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note ms-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  TB.def({
    slug: 'mosaic', cat: 'image', name: '图片像素化 / 马赛克', desc: '全图像素化或画笔局部打码',
    icon: '🫥', kw: '马赛克 像素化 打码 图片 隐私 涂抹 pixel mosaic',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">选择图片<span class="hint">JPG / PNG / WebP，不上传</span></div>' +
          '<div id="msPick"></div>' +
          '<div id="msInfo" class="ms-info"></div>' +
        '</div>' +
        '<div class="panel" id="msPanel" hidden>' +
          '<div class="seg ms-mode" id="msMode"><button type="button" class="on" data-mode="full">全图像素化</button>' +
            '<button type="button" data-mode="brush">局部马赛克</button></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>像素块大小</b> <span id="msBlockVal">16</span> px</div>' +
              '<input class="range" id="msBlock" type="range" min="4" max="80" step="1" value="16"></div>' +
            '<div class="field" id="msBrushWrap" hidden><div class="label"><b>笔刷直径</b> <span id="msBrushVal">80</span> 预览 px</div>' +
              '<input class="range" id="msBrush" type="range" min="16" max="240" step="4" value="80"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="msDl" type="button">下载 PNG</button>' +
            '<button class="btn" id="msReset" type="button">恢复原图</button></div>' +
          '<div id="msMsg" class="ms-msg"></div>' +
          '<div class="ms-preview"><canvas id="msCanvas" class="ms-canvas"></canvas></div>' +
          '<div class="note">局部马赛克只改变笔刷刷过的圆点区域，适合遮住人脸、证件号等；马赛克是像素级覆盖，不能还原被遮挡的内容。导出尺寸与原图一致（超过 3000px 时已等比缩小）。</div>' +
        '</div>';

      var pick = TB.filePicker(TB.$('#msPick', root), { accept: 'image/*', hint: '一张图片' });
      var info = TB.$('#msInfo', root);
      var panel = TB.$('#msPanel', root);
      var msg = TB.$('#msMsg', root);
      var canvas = TB.$('#msCanvas', root);
      var ctx2d = canvas.getContext('2d');
      var block = TB.$('#msBlock', root);
      var blockVal = TB.$('#msBlockVal', root);
      var brush = TB.$('#msBrush', root);
      var brushVal = TB.$('#msBrushVal', root);
      var brushWrap = TB.$('#msBrushWrap', root);
      var modeEl = TB.$('#msMode', root);
      var mode = 'full';
      var orig = document.createElement('canvas');
      var pixel = document.createElement('canvas');
      var result = document.createElement('canvas');
      var w = 0, h = 0;
      var loaded = false;
      var loadSeq = 0;
      var drawing = false;
      var last = null;

      function fitPreview() {
        var maxW = 900;
        var pw = Math.min(w, maxW);
        var ph = Math.round(h * pw / w);
        canvas.width = pw;
        canvas.height = ph;
      }

      function drawPreview() {
        ctx2d.imageSmoothingEnabled = true;
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.drawImage(result, 0, 0, canvas.width, canvas.height);
      }

      function buildPixel() {
        var size = Number(block.value) || 16;
        var sw = Math.max(1, Math.round(w / size));
        var sh = Math.max(1, Math.round(h / size));
        var tmp = document.createElement('canvas');
        tmp.width = sw;
        tmp.height = sh;
        var t = tmp.getContext('2d');
        t.imageSmoothingEnabled = true;
        t.drawImage(orig, 0, 0, sw, sh);
        pixel.width = w;
        pixel.height = h;
        var p = pixel.getContext('2d');
        p.imageSmoothingEnabled = false;
        p.clearRect(0, 0, w, h);
        p.drawImage(tmp, 0, 0, sw, sh, 0, 0, w, h);
      }

      function fullImage() {
        result.width = w;
        result.height = h;
        var r = result.getContext('2d');
        r.clearRect(0, 0, w, h);
        r.drawImage(pixel, 0, 0);
        drawPreview();
      }

      function originalImage() {
        result.width = w;
        result.height = h;
        var r = result.getContext('2d');
        r.clearRect(0, 0, w, h);
        r.drawImage(orig, 0, 0);
        drawPreview();
      }

      function setMode(next) {
        mode = next;
        modeEl.querySelectorAll('button').forEach(function (b) {
          b.classList.toggle('on', b.getAttribute('data-mode') === mode);
        });
        brushWrap.hidden = mode !== 'brush';
        if (!loaded) return;
        if (mode === 'full') fullImage();
        else originalImage();
        status(msg, mode === 'full' ? '全图像素化已应用；拖动滑块可改变块大小' : '用鼠标或手指在图上涂抹需要遮挡的位置', false);
      }

      function stampPreview(x, y, radius) {
        var r = result.getContext('2d');
        r.save();
        r.beginPath();
        r.arc(x, y, radius, 0, Math.PI * 2);
        r.clip();
        r.drawImage(pixel, 0, 0);
        r.restore();
        drawPreview();
      }

      function mapPoint(e) {
        var rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (w / rect.width),
          y: (e.clientY - rect.top) * (h / rect.height)
        };
      }

      function brushRadius() {
        var rect = canvas.getBoundingClientRect();
        return Math.max(1, (Number(brush.value) / 2) * (w / Math.max(1, rect.width)));
      }

      function paint(e) {
        if (mode !== 'brush' || !loaded) return;
        var p = mapPoint(e);
        var radius = brushRadius();
        if (last) {
          var dx = p.x - last.x, dy = p.y - last.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var steps = Math.max(1, Math.ceil(dist / Math.max(1, radius / 2)));
          for (var i = 1; i <= steps; i++) {
            stampPreview(last.x + dx * i / steps, last.y + dy * i / steps, radius);
          }
        } else {
          stampPreview(p.x, p.y, radius);
        }
        last = p;
      }

      async function load() {
        var item = pick.files[0];
        if (!item) return;
        var my = ++loadSeq;
        loaded = false;
        info.textContent = '正在解码…';
        status(msg, '');
        try {
          var res = await TB.readImage(item.file);
          if (my !== loadSeq) { if (res && res.url) URL.revokeObjectURL(res.url); return; }
          var img = res.img;
          if (res.url) URL.revokeObjectURL(res.url);
          var ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
          w = Math.max(1, Math.round(img.width * ratio));
          h = Math.max(1, Math.round(img.height * ratio));
          orig.width = w;
          orig.height = h;
          var o = orig.getContext('2d');
          o.clearRect(0, 0, w, h);
          o.drawImage(img, 0, 0, w, h);
          result.width = w;
          result.height = h;
          fitPreview();
          buildPixel();
          loaded = true;
          panel.hidden = false;
          info.innerHTML = '<b>' + TB.esc(item.file.name) + '</b> · ' + TB.fmtBytes(item.file.size) +
            ' · 输出 ' + w + '×' + h + (ratio < 1 ? '（原图已等比缩小）' : '');
          setMode('full');
        } catch (e) {
          if (my !== loadSeq) return;
          info.textContent = '读取失败';
          panel.hidden = true;
          status(msg, '图片读取失败：' + (e && e.message ? e.message : '不是支持的图片格式'), true);
        }
      }

      pick.onChange = function () {
        if (pick.files[0]) load();
        else { loadSeq++; loaded = false; info.textContent = ''; panel.hidden = true; status(msg, ''); }
      };

      modeEl.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-mode]');
        if (b) setMode(b.getAttribute('data-mode'));
      });

      block.addEventListener('input', function () {
        blockVal.textContent = block.value;
        if (!loaded) return;
        buildPixel();
        if (mode === 'full') fullImage();
      });

      brush.addEventListener('input', function () {
        brushVal.textContent = brush.value;
      });

      canvas.addEventListener('pointerdown', function (e) {
        if (mode !== 'brush' || !loaded) return;
        e.preventDefault();
        drawing = true;
        last = null;
        canvas.setPointerCapture(e.pointerId);
        paint(e);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drawing || mode !== 'brush') return;
        e.preventDefault();
        paint(e);
      });
      function endPaint(e) {
        if (!drawing) return;
        drawing = false;
        last = null;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      canvas.addEventListener('pointerup', endPaint);
      canvas.addEventListener('pointercancel', endPaint);

      TB.$('#msDl', root).addEventListener('click', function () {
        if (!loaded) { status(msg, '请先选择图片', true); return; }
        result.toBlob(function (b) {
          if (b) TB.download(b, 'mosaic.png');
          else TB.toast('PNG 编码失败');
        }, 'image/png');
      });
      TB.$('#msReset', root).addEventListener('click', function () {
        if (!loaded) return;
        originalImage();
        status(msg, '已恢复为原图', false);
      });
      block.addEventListener('change', function () {
        if (loaded && mode === 'full') fullImage();
      });
    }
  });
})();
