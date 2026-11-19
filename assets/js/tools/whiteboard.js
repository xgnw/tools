/* =============================================================================
 * 在线白板
 * -----------------------------------------------------------------------------
 * 基于 Canvas 的手绘白板：画笔、橡皮、颜色、粗细、撤销、清空、导出 PNG。
 * 画布内部固定为 1600×900，CSS 等比缩放以适配不同屏幕；所有笔迹保存在内存中，
 * 撤销时按笔画重绘，不上传任何图片。
 * ========================================================================== */
(function () {
  'use strict';

  TB.def({
    slug: 'whiteboard',
    cat: 'fun',
    name: '在线白板',
    desc: '随手画图、写字，支持撤销与导出 PNG。',
    icon: '🖍️',
    kw: '白板 画板 手绘 涂鸦 画图 canvas 草图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">白板 <span class="hint" id="wbHint"></span></div>' +
          '<div class="wb-bar"><div class="wb-tools">' +
            '<button class="wb-tool on" type="button" data-tool="pen">✏️ 画笔</button>' +
            '<button class="wb-tool" type="button" data-tool="eraser">🧽 橡皮</button>' +
            '<span class="wb-sep"></span>' +
            '<label class="wb-color">颜色 <input type="color" id="wbColor" value="#2b7fff"></label>' +
            '<label class="wb-size">粗细 <input type="range" id="wbSize" min="2" max="30" value="4"><b id="wbSizeVal">4</b></label>' +
            '<span class="wb-sep"></span>' +
            '<button class="btn sm" id="wbUndo" type="button">撤销</button>' +
            '<button class="btn sm danger" id="wbClear" type="button">清空</button>' +
            '<button class="btn sm primary" id="wbSave" type="button">下载 PNG</button>' +
          '</div></div>' +
          '<div class="wb-wrap"><canvas class="wb-canvas" id="wbCanvas" width="1600" height="900"></canvas></div></div>' +
        '<p class="note">白板在浏览器本地绘制。下载得到 1600×900 的 PNG；移动端请用单指绘制，页面会阻止画布区域的滚动手势。</p>';

      var canvas = TB.$('#wbCanvas', root);
      var ctx2d = canvas.getContext('2d');
      var hint = TB.$('#wbHint', root);
      var colorInput = TB.$('#wbColor', root);
      var sizeInput = TB.$('#wbSize', root);
      var sizeLabel = TB.$('#wbSizeVal', root);
      var tool = 'pen';
      var size = Number(sizeInput.value) || 4;
      var strokes = [];
      var drawing = false;
      var current = null;
      var lastPoint = null;

      function initCanvas() {
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      }

      function drawDot(stroke, point) {
        ctx2d.save();
        ctx2d.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx2d.beginPath();
        ctx2d.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();
      }

      function drawSegment(stroke, from, to) {
        ctx2d.save();
        ctx2d.lineCap = 'round';
        ctx2d.lineJoin = 'round';
        ctx2d.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx2d.lineWidth = stroke.tool === 'eraser' ? stroke.size * 1.8 : stroke.size;
        ctx2d.beginPath();
        ctx2d.moveTo(from.x, from.y);
        ctx2d.lineTo(to.x, to.y);
        ctx2d.stroke();
        ctx2d.restore();
      }

      function redraw() {
        initCanvas();
        strokes.forEach(function (s) {
          if (s.points.length === 1) drawDot(s, s.points[0]);
          else {
            for (var i = 1; i < s.points.length; i++) drawSegment(s, s.points[i - 1], s.points[i]);
          }
        });
        updateHint();
      }

      function updateHint() {
        var toolName = tool === 'pen' ? '画笔' : '橡皮';
        hint.textContent = toolName + ' · ' + size + 'px · ' + strokes.length + ' 笔';
        TB.$('#wbUndo', root).disabled = strokes.length === 0;
      }

      function pointOf(e) {
        var rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
      }

      function start(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        var p = pointOf(e);
        current = { tool: tool, color: colorInput.value, size: size, points: [p] };
        strokes.push(current);
        lastPoint = p;
        drawing = true;
        drawDot(current, p);
        if (canvas.setPointerCapture) {
          try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        }
        updateHint();
      }

      function move(e) {
        if (!drawing || !current) return;
        e.preventDefault();
        var p = pointOf(e);
        // 过滤掉距离过近的点，减少笔迹数量
        if (Math.abs(p.x - lastPoint.x) + Math.abs(p.y - lastPoint.y) < 1.2) return;
        current.points.push(p);
        drawSegment(current, lastPoint, p);
        lastPoint = p;
      }

      function finish(e) {
        if (!drawing) return;
        if (e && e.preventDefault) e.preventDefault();
        drawing = false;
        current = null;
        lastPoint = null;
        updateHint();
      }

      TB.$$('.wb-tool', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          tool = btn.getAttribute('data-tool');
          TB.$$('.wb-tool', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
          updateHint();
        });
      });

      colorInput.addEventListener('input', updateHint);
      sizeInput.addEventListener('input', function () {
        size = Number(sizeInput.value) || 4;
        sizeLabel.textContent = String(size);
        updateHint();
      });

      TB.$('#wbUndo', root).addEventListener('click', function () {
        if (!strokes.length) return;
        strokes.pop();
        redraw();
        TB.toast('已撤销');
      });

      TB.$('#wbClear', root).addEventListener('click', function () {
        if (!strokes.length) return;
        if (!window.confirm('清空整块白板？此操作不可撤销。')) return;
        strokes = [];
        redraw();
        TB.toast('白板已清空');
      });

      TB.$('#wbSave', root).addEventListener('click', function () {
        var d = new Date();
        var name = 'whiteboard-' + d.getFullYear() + TB.pad2(d.getMonth() + 1) + TB.pad2(d.getDate()) + '-' + TB.pad2(d.getHours()) + TB.pad2(d.getMinutes()) + '.png';
        TB.downloadCanvas(canvas, name, 'image/png');
      });

      canvas.addEventListener('pointerdown', start);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', finish);
      canvas.addEventListener('pointercancel', finish);

      initCanvas();
      updateHint();
    }
  });
})();
