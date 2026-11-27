/* =============================================================================
 * 图片 CSS 裁剪 / clip-path 生成器
 * -----------------------------------------------------------------------------
 * 上传图片后用控制点绘制多边形，或切换圆形 / 椭圆 / 内缩形状，
 * 实时生成 clip-path CSS，并可把当前裁剪结果导出为透明 PNG。
 * 纯 Canvas + CSS，不做图片压缩，不修改原图。
 * ========================================================================== */

(function () {
  'use strict';

  var SAMPLE_W = 1000, SAMPLE_H = 700;

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note cp-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function defaultPoints() {
    return [{ x: .08, y: .08 }, { x: .92, y: .08 }, { x: .92, y: .92 }, { x: .08, y: .92 }];
  }

  function sampleCanvas() {
    var c = document.createElement('canvas');
    c.width = SAMPLE_W; c.height = SAMPLE_H;
    var g = c.getContext('2d');
    var lg = g.createLinearGradient(0, 0, SAMPLE_W, SAMPLE_H);
    lg.addColorStop(0, '#cfe2ff'); lg.addColorStop(.55, '#8ab7ff'); lg.addColorStop(1, '#5b8def');
    g.fillStyle = lg; g.fillRect(0, 0, SAMPLE_W, SAMPLE_H);
    g.fillStyle = 'rgba(255,255,255,.22)';
    g.beginPath(); g.arc(730, 190, 150, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#16325c';
    g.font = '700 54px "Microsoft YaHei", "PingFang SC", sans-serif';
    g.fillText('CSS clip-path', 64, 300);
    g.font = '500 26px "Microsoft YaHei", "PingFang SC", sans-serif';
    g.fillStyle = '#31547f';
    g.fillText('拖动控制点，裁剪网页里的图片', 66, 352);
    g.fillStyle = 'rgba(255,255,255,.86)';
    g.beginPath(); g.roundRect ? g.roundRect(64, 410, 310, 92, 22) : g.rect(64, 410, 310, 92); g.fill();
    g.fillStyle = '#2b6fe0'; g.font = '600 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    g.fillText('拖动圆点试试 →', 92, 465);
    return c;
  }

  TB.def({
    slug: 'clip-path', cat: 'image', name: '图片 CSS 裁剪', desc: '拖点生成 clip-path，导出透明 PNG',
    icon: '✂️', kw: 'css clip-path 裁剪 多边形 圆形 椭圆 图片 网页 生成器',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">选择图片<span class="hint">JPG / PNG / WebP，不上传</span></div>' +
          '<div id="cpPick"></div>' +
          '<div class="btns"><button class="btn" id="cpSample" type="button">使用示例图</button></div>' +
          '<div id="cpInfo" class="cp-info"></div>' +
          '<div id="cpMsg"></div>' +
        '</div>' +
        '<div class="panel" id="cpPanel" hidden>' +
          '<div class="seg cp-mode" id="cpMode"><button type="button" class="on" data-mode="polygon">多边形</button>' +
            '<button type="button" data-mode="circle">圆形</button><button type="button" data-mode="ellipse">椭圆</button>' +
            '<button type="button" data-mode="inset">内缩</button></div>' +
          '<div id="cpPolyTools" class="cp-tools"><button class="btn sm" id="cpAdd" type="button">增加顶点</button>' +
            '<button class="btn sm" id="cpDel" type="button">删除顶点</button>' +
            '<button class="btn sm" id="cpResetPoints" type="button">重置顶点</button>' +
            '<span class="cp-tip">拖动圆点调整；双击空白处也可加顶点</span></div>' +
          '<div id="cpCircleTools" class="cp-tools" hidden><div class="field cp-slider"><div class="label"><b>半径</b> <span id="cpRVal">50</span>%</div>' +
            '<input class="range" id="cpR" type="range" min="10" max="50" value="50" step="1"></div></div>' +
          '<div id="cpEllipseTools" class="cp-tools" hidden><div class="row2">' +
            '<div class="field cp-slider"><div class="label"><b>水平半径</b> <span id="cpRxVal">50</span>%</div><input class="range" id="cpRx" type="range" min="10" max="50" value="50" step="1"></div>' +
            '<div class="field cp-slider"><div class="label"><b>垂直半径</b> <span id="cpRyVal">35</span>%</div><input class="range" id="cpRy" type="range" min="10" max="50" value="35" step="1"></div>' +
          '</div></div>' +
          '<div id="cpInsetTools" class="cp-tools" hidden><div class="row2">' +
            '<div class="field cp-slider"><div class="label"><b>内缩</b> <span id="cpInsetVal">6</span>%</div><input class="range" id="cpInset" type="range" min="0" max="30" value="6" step="1"></div>' +
            '<div class="field cp-slider"><div class="label"><b>圆角</b> <span id="cpRoundVal">16</span> px</div><input class="range" id="cpRound" type="range" min="0" max="48" value="16" step="1"></div>' +
          '</div></div>' +
          '<div class="btns"><button class="btn primary" id="cpCopy" type="button">复制 CSS</button>' +
            '<button class="btn" id="cpDl" type="button">导出透明 PNG</button></div>' +
          '<div class="cp-stage"><canvas id="cpCanvas" class="cp-canvas"></canvas></div>' +
          '<div class="note">输出的 clip-path 只作用于网页显示，不会修改原图；导出的 PNG 会按当前形状裁切并保留透明背景。多边形最多 12 个顶点，形状超出图片边界时按 CSS 的裁切规则显示。</div>' +
        '</div>' +
        '<div class="panel" id="cpCssPanel" hidden>' +
          '<div class="panel-h">CSS<span class="hint">复制到你的样式表里</span></div>' +
          '<div class="out"><div class="out-h"><span class="grow">clip-path</span>' +
            '<button class="btn sm" id="cpCopy2" type="button">复制</button></div>' +
            '<pre class="out-b cp-css" id="cpCss"></pre></div>' +
        '</div>';

      var pick = TB.filePicker(TB.$('#cpPick', root), { accept: 'image/*', hint: '一张图片' });
      var info = TB.$('#cpInfo', root), msg = TB.$('#cpMsg', root);
      var panel = TB.$('#cpPanel', root), cssPanel = TB.$('#cpCssPanel', root);
      var canvas = TB.$('#cpCanvas', root), c2 = canvas.getContext('2d');
      var cssEl = TB.$('#cpCss', root);
      var modeEl = TB.$('#cpMode', root);
      var polyTools = TB.$('#cpPolyTools', root), circleTools = TB.$('#cpCircleTools', root);
      var ellipseTools = TB.$('#cpEllipseTools', root), insetTools = TB.$('#cpInsetTools', root);
      var rEl = TB.$('#cpR', root), rxEl = TB.$('#cpRx', root), ryEl = TB.$('#cpRy', root);
      var insetEl = TB.$('#cpInset', root), roundEl = TB.$('#cpRound', root);
      var rVal = TB.$('#cpRVal', root), rxVal = TB.$('#cpRxVal', root), ryVal = TB.$('#cpRyVal', root);
      var insetVal = TB.$('#cpInsetVal', root), roundVal = TB.$('#cpRoundVal', root);
      var state = { mode: 'polygon', points: defaultPoints(), r: 50, rx: 50, ry: 35, inset: 6, round: 16 };
      var source = null, sourceW = 0, sourceH = 0, previewW = 0, previewH = 0;
      var drag = -1, active = -1, loadSeq = 0;

      function fitPreview() {
        var maxW = 900, maxH = 620;
        var scale = Math.min(maxW / sourceW, maxH / sourceH, 1);
        previewW = Math.max(1, Math.round(sourceW * scale));
        previewH = Math.max(1, Math.round(sourceH * scale));
        canvas.width = previewW;
        canvas.height = previewH;
      }

      function shapePath(g, w, h, forExport) {
        g.beginPath();
        if (state.mode === 'polygon') {
          state.points.forEach(function (p, i) {
            var x = p.x * w, y = p.y * h;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          });
          g.closePath();
        } else if (state.mode === 'circle') {
          var r = (state.r / 100) * Math.min(w, h);
          g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        } else if (state.mode === 'ellipse') {
          g.ellipse(w / 2, h / 2, (state.rx / 100) * w, (state.ry / 100) * h, 0, 0, Math.PI * 2);
        } else {
          var mx = (state.inset / 100) * w;
          var my = (state.inset / 100) * h;
          var x0 = mx, y0 = my, x1 = w - mx, y1 = h - my;
          var rr = Math.min(state.round, Math.max(0, Math.min(x1 - x0, y1 - y0) / 2));
          if (rr > 0) {
            g.moveTo(x0 + rr, y0); g.lineTo(x1 - rr, y0); g.arcTo(x1, y0, x1, y0 + rr, rr);
            g.lineTo(x1, y1 - rr); g.arcTo(x1, y1, x1 - rr, y1, rr);
            g.lineTo(x0 + rr, y1); g.arcTo(x0, y1, x0, y1 - rr, rr);
            g.lineTo(x0, y0 + rr); g.arcTo(x0, y0, x0 + rr, y0, rr);
            g.closePath();
          } else g.rect(x0, y0, x1 - x0, y1 - y0);
        }
      }

      function drawSource(g, w, h) {
        if (!source) return;
        g.drawImage(source, 0, 0, w, h);
      }

      function drawOverlay(g, w, h) {
        g.save();
        shapePath(g, w, h, false);
        g.strokeStyle = state.mode === 'polygon' ? 'rgba(43,111,224,.95)' : 'rgba(43,111,224,.7)';
        g.lineWidth = 1.5;
        g.setLineDash(state.mode === 'polygon' ? [6, 4] : [8, 6]);
        g.stroke();
        g.restore();
        if (state.mode === 'polygon') {
          state.points.forEach(function (p, i) {
            var x = p.x * w, y = p.y * h;
            g.beginPath();
            g.arc(x, y, i === active ? 8 : 6, 0, Math.PI * 2);
            g.fillStyle = i === active ? '#2b6fe0' : 'rgba(255,255,255,.9)';
            g.fill();
            g.strokeStyle = '#2b6fe0'; g.lineWidth = 1.5; g.stroke();
          });
        }
      }

      function redraw() {
        c2.clearRect(0, 0, canvas.width, canvas.height);
        c2.save();
        shapePath(c2, canvas.width, canvas.height, false);
        c2.clip();
        drawSource(c2, canvas.width, canvas.height);
        c2.restore();
        drawOverlay(c2, canvas.width, canvas.height);
        updateCss();
      }

      function pct(n) { return Math.round(n * 10000) / 100; }

      function updateCss() {
        var value;
        if (state.mode === 'polygon') {
          value = 'polygon(' + state.points.map(function (p) { return pct(p.x) + '% ' + pct(p.y) + '%'; }).join(', ') + ')';
        } else if (state.mode === 'circle') {
          value = 'circle(' + state.r + '% at 50% 50%)';
        } else if (state.mode === 'ellipse') {
          value = 'ellipse(' + state.rx + '% ' + state.ry + '% at 50% 50%)';
        } else {
          value = 'inset(' + state.inset + '% round ' + state.round + 'px)';
        }
        var css = '-webkit-clip-path: ' + value + ';\nclip-path: ' + value + ';';
        if (cssEl) cssEl.textContent = css;
      }

      function showTools() {
        polyTools.hidden = state.mode !== 'polygon';
        circleTools.hidden = state.mode !== 'circle';
        ellipseTools.hidden = state.mode !== 'ellipse';
        insetTools.hidden = state.mode !== 'inset';
      }

      function setMode(mode) {
        state.mode = mode;
        modeEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === mode); });
        showTools(); redraw();
      }

      function mapPoint(e) {
        var rect = canvas.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))),
          y: Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)))
        };
      }

      function nearestPoint(p) {
        var best = -1, dist = 1e9;
        state.points.forEach(function (q, i) {
          var dx = (q.x - p.x) * canvas.width, dy = (q.y - p.y) * canvas.height;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < dist) { dist = d; best = i; }
        });
        return dist <= 16 ? best : -1;
      }

      function addPointAt(p) {
        if (state.mode !== 'polygon' || state.points.length >= 12) return;
        state.points.push({ x: p.x, y: p.y });
        active = state.points.length - 1;
        redraw();
      }

      function addMidpoint() {
        if (state.points.length >= 12) { status(msg, '最多 12 个顶点', true); return; }
        if (state.points.length < 2) { state.points.push({ x: .5, y: .8 }); redraw(); return; }
        var bestEdge = 0, bestLen = -1;
        state.points.forEach(function (p, i) {
          var q = state.points[(i + 1) % state.points.length];
          var len = Math.pow((q.x - p.x) * canvas.width, 2) + Math.pow((q.y - p.y) * canvas.height, 2);
          if (len > bestLen) { bestLen = len; bestEdge = i; }
        });
        var a = state.points[bestEdge], b = state.points[(bestEdge + 1) % state.points.length];
        state.points.splice(bestEdge + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        active = bestEdge + 1;
        redraw();
      }

      async function load() {
        var item = pick.files[0];
        if (!item) return;
        var my = ++loadSeq;
        info.textContent = '正在解码…';
        try {
          var res = await TB.readImage(item.file);
          if (my !== loadSeq) { if (res.url) URL.revokeObjectURL(res.url); return; }
          if (res.url) URL.revokeObjectURL(res.url);
          source = res.img; sourceW = res.img.naturalWidth || res.img.width; sourceH = res.img.naturalHeight || res.img.height;
          state.points = defaultPoints(); active = -1; drag = -1;
          panel.hidden = false; cssPanel.hidden = false;
          fitPreview(); redraw();
          info.innerHTML = '<b>' + TB.esc(item.file.name) + '</b> · ' + sourceW + ' × ' + sourceH + ' · ' + TB.fmtBytes(item.file.size);
          status(msg, '图片已载入，拖动控制点或切换形状', false);
        } catch (e) {
          if (my !== loadSeq) return;
          panel.hidden = true; cssPanel.hidden = true;
          info.textContent = '读取失败';
          status(msg, '图片读取失败：' + (e && e.message ? e.message : '不是支持的图片格式'), true);
        }
      }

      function useSample() {
        source = sampleCanvas(); sourceW = SAMPLE_W; sourceH = SAMPLE_H;
        pick.files = [];
        state.points = defaultPoints(); active = -1; drag = -1;
        panel.hidden = false; cssPanel.hidden = false;
        fitPreview(); redraw();
        info.innerHTML = '<b>示例图</b> · ' + sourceW + ' × ' + sourceH;
        status(msg, '已载入示例图，拖动控制点试试', false);
      }

      pick.onChange = function () {
        if (pick.files[0]) load();
        else { loadSeq++; source = null; panel.hidden = true; cssPanel.hidden = true; info.textContent = ''; status(msg, ''); }
      };

      modeEl.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-mode]');
        if (b) setMode(b.getAttribute('data-mode'));
      });

      [rEl, rxEl, ryEl, insetEl, roundEl].forEach(function (el) {
        el.addEventListener('input', function () {
          if (el === rEl) { state.r = Number(rEl.value); rVal.textContent = rEl.value; }
          if (el === rxEl) { state.rx = Number(rxEl.value); rxVal.textContent = rxEl.value; }
          if (el === ryEl) { state.ry = Number(ryEl.value); ryVal.textContent = ryEl.value; }
          if (el === insetEl) { state.inset = Number(insetEl.value); insetVal.textContent = insetEl.value; }
          if (el === roundEl) { state.round = Number(roundEl.value); roundVal.textContent = roundEl.value; }
          redraw();
        });
      });

      canvas.addEventListener('pointerdown', function (e) {
        if (!source || state.mode !== 'polygon') return;
        var p = mapPoint(e);
        var i = nearestPoint(p);
        if (i >= 0) {
          e.preventDefault(); active = i; drag = i;
          canvas.setPointerCapture(e.pointerId);
          redraw();
        }
      });
      canvas.addEventListener('pointermove', function (e) {
        if (drag < 0) return;
        e.preventDefault();
        var p = mapPoint(e);
        state.points[drag] = p;
        redraw();
      });
      function endDrag(e) {
        if (drag < 0) return;
        drag = -1;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
        redraw();
      }
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('dblclick', function (e) {
        if (!source || state.mode !== 'polygon') return;
        var p = mapPoint(e);
        if (nearestPoint(p) < 0) addPointAt(p);
      });

      TB.$('#cpSample', root).addEventListener('click', useSample);
      TB.$('#cpAdd', root).addEventListener('click', addMidpoint);
      TB.$('#cpDel', root).addEventListener('click', function () {
        if (state.points.length <= 3) { status(msg, '多边形至少保留 3 个顶点', true); return; }
        state.points.pop(); active = -1; redraw();
      });
      TB.$('#cpResetPoints', root).addEventListener('click', function () {
        state.points = defaultPoints(); active = -1; drag = -1; redraw();
      });
      function copyCss() {
        if (!source) { status(msg, '请先选择图片', true); return; }
        var text = cssEl.textContent;
        TB.copy(text);
      }
      TB.$('#cpCopy', root).addEventListener('click', copyCss);
      TB.$('#cpCopy2', root).addEventListener('click', copyCss);
      TB.$('#cpDl', root).addEventListener('click', function () {
        if (!source) { status(msg, '请先选择图片', true); return; }
        var maxSide = 2400;
        var scale = Math.min(1, maxSide / Math.max(sourceW, sourceH));
        var ow = Math.max(1, Math.round(sourceW * scale));
        var oh = Math.max(1, Math.round(sourceH * scale));
        var out = document.createElement('canvas');
        out.width = ow; out.height = oh;
        var g = out.getContext('2d');
        g.clearRect(0, 0, ow, oh);
        shapePath(g, ow, oh, true);
        g.clip();
        drawSource(g, ow, oh);
        TB.downloadCanvas(out, 'clip-path.png', 'image/png');
      });

      setMode('polygon');
      showTools();
    }
  });
})();
