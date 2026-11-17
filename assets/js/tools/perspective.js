/* =============================================================================
 * 四点透视矫正
 * -----------------------------------------------------------------------------
 * 手动拖动图片四角，按四点单应变换把倾斜拍摄的文档 / 白板拉正。
 * 采用“目标矩形 → 源四边形”的逆映射逐像素重采样，纯 Canvas 2D。
 * ========================================================================== */

(function () {
  'use strict';

  var COLOR = '#2f7cf6';

  /* 列主元高斯消元，解 8 元线性方程组 */
  function solve8(A, b) {
    var n = 8, i, j, k;
    for (i = 0; i < n; i++) {
      var pivot = i;
      for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) pivot = j;
      if (Math.abs(A[pivot][i]) < 1e-10) throw new Error('四点位置过于接近，无法计算透视');
      if (pivot !== i) {
        var t = A[i]; A[i] = A[pivot]; A[pivot] = t;
        var tb = b[i]; b[i] = b[pivot]; b[pivot] = tb;
      }
      var div = A[i][i];
      for (j = i; j < n; j++) A[i][j] /= div;
      b[i] /= div;
      for (j = 0; j < n; j++) {
        if (j === i) continue;
        var f = A[j][i];
        if (!f) continue;
        for (k = i; k < n; k++) A[j][k] -= f * A[i][k];
        b[j] -= f * b[i];
      }
    }
    return b;
  }

  /* 目标矩形四角 → 源四边形四角的单应矩阵 */
  function homography(src, w, h) {
    var dst = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
    var A = [], b = [];
    dst.forEach(function (d, i) {
      var u = src[i].x, v = src[i].y;
      A.push([d.x, d.y, 1, 0, 0, 0, -d.x * u, -d.y * u]);
      b.push(u);
      A.push([0, 0, 0, d.x, d.y, 1, -d.x * v, -d.y * v]);
      b.push(v);
    });
    return solve8(A, b);
  }

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  /* 双线性采样，源坐标越界时返回白色 */
  function sample(data, sw, sh, x, y, out, oi) {
    if (x < 0 || y < 0 || x > sw - 1 || y > sh - 1) {
      out[oi] = 255; out[oi + 1] = 255; out[oi + 2] = 255; out[oi + 3] = 255;
      return;
    }
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
    var fx = x - x0, fy = y - y0;
    var i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4;
    var i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
    var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy);
    var w01 = (1 - fx) * fy, w11 = fx * fy;
    out[oi] = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11;
    out[oi + 1] = data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11;
    out[oi + 2] = data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11;
    out[oi + 3] = data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11;
  }

  TB.def({
    slug: 'perspective-fix', cat: 'image', name: '四点透视矫正', desc: '拍歪文档 · 拖四点拉正', icon: '📐',
    kw: '透视 矫正 拉正 文档 扫描 四点 梯形 倾斜 白板 名片',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b><span style="color:var(--ink-3)">适合拍歪的纸张、白板、名片</span></div>' +
            '<div id="drop"></div></div>' +
          '<div id="editor" hidden style="margin-top:14px">' +
            '<div class="label">拖动四个蓝点，对准文档四角<span style="color:var(--ink-3)">左上 → 右上 → 右下 → 左下</span></div>' +
            '<div class="preview" style="min-height:0;padding:8px;overflow:auto">' +
              '<canvas id="cv" aria-label="四点透视矫正画布"></canvas>' +
            '</div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="run" disabled>生成矫正图</button>' +
            '<button class="btn" id="reset" disabled>重置四点</button>' +
            '<button class="btn" id="full" disabled>取整张图</button>' +
            '<button class="btn" id="dl" disabled>下载 PNG</button>' +
          '</div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="outBox" hidden style="margin-top:14px;min-height:0;padding:10px">' +
            '<canvas id="pv"></canvas>' +
          '</div>' +
          '<div id="meta" hidden style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">四点顺序固定为左上、右上、右下、左下。输出会保留文档比例，最长边限制在 2400px；四点拉得越准，边缘越直。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', hint: '上传一张拍歪的文档照片' });
      var editor = TB.$('#editor', root), cv = TB.$('#cv', root), c2d = cv.getContext('2d');
      var run = TB.$('#run', root), reset = TB.$('#reset', root), full = TB.$('#full', root);
      var dl = TB.$('#dl', root), outBox = TB.$('#outBox', root), pv = TB.$('#pv', root);
      var msg = TB.$('#msg', root), meta = TB.$('#meta', root);

      var img = null, srcCanvas = null, srcData = null;
      var points = [], active = -1, outCanvas = null;

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function draw() {
        if (!img) return;
        c2d.clearRect(0, 0, cv.width, cv.height);
        c2d.drawImage(img, 0, 0, cv.width, cv.height);

        c2d.save();
        c2d.strokeStyle = 'rgba(47, 124, 246, .9)';
        c2d.lineWidth = 2;
        c2d.beginPath();
        c2d.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < 4; i++) c2d.lineTo(points[i].x, points[i].y);
        c2d.closePath();
        c2d.stroke();

        c2d.fillStyle = 'rgba(47, 124, 246, .10)';
        c2d.fill();
        points.forEach(function (p, i) {
          c2d.beginPath();
          c2d.arc(p.x, p.y, 8, 0, Math.PI * 2);
          c2d.fillStyle = i === active ? '#ff9f1a' : COLOR;
          c2d.fill();
          c2d.lineWidth = 2;
          c2d.strokeStyle = '#fff';
          c2d.stroke();
          c2d.fillStyle = '#fff';
          c2d.font = '600 10px sans-serif';
          c2d.textAlign = 'center';
          c2d.textBaseline = 'middle';
          c2d.fillText(String(i + 1), p.x, p.y);
        });
        c2d.restore();
      }

      function setCorners(inset) {
        var w = cv.width, h = cv.height;
        points = [
          { x: inset, y: inset },
          { x: w - inset, y: inset },
          { x: w - inset, y: h - inset },
          { x: inset, y: h - inset }
        ];
        draw();
      }

      function fitDisplay() {
        var maxW = 820, maxH = 560;
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var scale = Math.min(maxW / iw, maxH / ih, 1);
        cv.width = Math.max(1, Math.round(iw * scale));
        cv.height = Math.max(1, Math.round(ih * scale));
        cv.style.cursor = 'grab';
        setCorners(8);
      }

      function pointerPos(e) {
        var r = cv.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) / r.width * cv.width,
          y: (e.clientY - r.top) / r.height * cv.height
        };
      }

      function nearest(p) {
        var best = -1, bestD = 18;
        points.forEach(function (q, i) {
          var d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < bestD) { bestD = d; best = i; }
        });
        return best;
      }

      cv.addEventListener('pointerdown', function (e) {
        if (!img) return;
        active = nearest(pointerPos(e));
        if (active < 0) return;
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        cv.style.cursor = 'grabbing';
        draw();
      });
      cv.addEventListener('pointermove', function (e) {
        if (active < 0) return;
        var p = pointerPos(e);
        points[active].x = Math.max(0, Math.min(cv.width, p.x));
        points[active].y = Math.max(0, Math.min(cv.height, p.y));
        draw();
      });
      function release(e) {
        if (active >= 0) {
          active = -1;
          cv.style.cursor = 'grab';
          draw();
        }
      }
      cv.addEventListener('pointerup', release);
      cv.addEventListener('pointercancel', release);
      cv.addEventListener('pointerleave', function () { if (active < 0) cv.style.cursor = 'grab'; });

      async function load(file) {
        showMsg('');
        try {
          var r = await TB.readImage(file);
          img = r.img;
          /* 源图缩到最长边 2400，兼顾质量与内存 */
          var scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
          srcCanvas = document.createElement('canvas');
          srcCanvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          srcCanvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          var sg = srcCanvas.getContext('2d', { willReadFrequently: true });
          sg.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);
          srcData = sg.getImageData(0, 0, srcCanvas.width, srcCanvas.height).data;
          URL.revokeObjectURL(r.url);

          editor.hidden = false;
          reset.disabled = false;
          full.disabled = false;
          run.disabled = false;
          outBox.hidden = true;
          meta.hidden = true;
          dl.disabled = true;
          outCanvas = null;
          fitDisplay();
        } catch (e) {
          showMsg('图片读取失败：' + e.message);
        }
      }

      picker.onChange = function () {
        if (picker.files.length) load(picker.files[0].file);
      };

      reset.addEventListener('click', function () { setCorners(8); });
      full.addEventListener('click', function () { setCorners(0); });

      run.addEventListener('click', function () {
        if (!srcData) return;
        var sx = srcCanvas.width / cv.width, sy = srcCanvas.height / cv.height;
        var src = points.map(function (p) { return { x: p.x * sx, y: p.y * sy }; });

        /* 四点必须构成凸四边形 */
        var signs = [cross(src[0], src[1], src[2]), cross(src[1], src[2], src[3]),
          cross(src[2], src[3], src[0]), cross(src[3], src[0], src[1])];
        var pos = signs.filter(function (v) { return v > 0; }).length;
        var neg = signs.filter(function (v) { return v < 0; }).length;
        if (pos && neg) { showMsg('四个点交叉了，请按左上、右上、右下、左下顺序调整'); return; }
        if (Math.abs(cross(src[0], src[1], src[2])) < 50) { showMsg('四点太扁，请重新对准文档边缘'); return; }

        var top = dist(src[0], src[1]), bottom = dist(src[3], src[2]);
        var left = dist(src[0], src[3]), right = dist(src[1], src[2]);
        var ow = Math.round(Math.max(top, bottom));
        var oh = Math.round(Math.max(left, right));
        if (!ow || !oh) { showMsg('四点位置无效'); return; }
        var cap = 2400 / Math.max(ow, oh);
        if (cap < 1) { ow = Math.round(ow * cap); oh = Math.round(oh * cap); }
        ow = Math.max(2, ow); oh = Math.max(2, oh);

        var H;
        try { H = homography(src, ow, oh); } catch (e) { showMsg(e.message); return; }

        run.disabled = true;
        showMsg('正在矫正，请稍候…');
        setTimeout(function () {
          try {
            var out = document.createElement('canvas');
            out.width = ow; out.height = oh;
            var og = out.getContext('2d');
            var outData = og.createImageData(ow, oh);
            var od = outData.data;
            var sd = srcData, sw = srcCanvas.width, sh = srcCanvas.height;
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            var oi = 0;
            for (var y = 0; y < oh; y++) {
              for (var x = 0; x < ow; x++) {
                var den = g * x + h * y + 1;
                var u = (a * x + b * y + c) / den;
                var v = (d * x + e * y + f) / den;
                sample(sd, sw, sh, u, v, od, oi);
                oi += 4;
              }
            }
            og.putImageData(outData, 0, 0);
            outCanvas = out;

            var scale = Math.min(1, 380 / Math.max(out.width, out.height));
            pv.width = Math.round(out.width * scale);
            pv.height = Math.round(out.height * scale);
            pv.getContext('2d').drawImage(out, 0, 0, pv.width, pv.height);
            outBox.hidden = false;
            dl.disabled = false;
            meta.hidden = false;
            meta.innerHTML = '<div class="kv">' +
              '<div class="kv-item"><div class="kv-k">输出尺寸</div><div class="kv-v">' + ow + ' × ' + oh + ' px</div></div>' +
              '<div class="kv-item"><div class="kv-k">源图处理尺寸</div><div class="kv-v">' + sw + ' × ' + sh + ' px</div></div>' +
              '</div>';
            showMsg('');
          } catch (e2) {
            showMsg('矫正失败：' + e2.message);
          }
          run.disabled = false;
        }, 30);
      });

      dl.addEventListener('click', function () {
        if (outCanvas) TB.downloadCanvas(outCanvas, '透视矫正.png');
      });
    }
  });
})();
