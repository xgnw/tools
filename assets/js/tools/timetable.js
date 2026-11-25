/* =============================================================================
 * 课程表生成器
 * -----------------------------------------------------------------------------
 * 5 天 × 6—10 节的网格编辑，导出 PNG 或用新窗口打印。
 * 不引入表格库，直接用 DOM 表格和 Canvas 绘制。
 * ========================================================================== */

(function () {
  'use strict';

  var DAYS = ['周一', '周二', '周三', '周四', '周五'];
  var SAMPLE = [
    ['语文', '数学', '英语', '物理', '化学'],
    ['数学', '语文', '英语', '化学', '物理'],
    ['英语', '数学', '语文', '生物', '体育'],
    ['物理', '英语', '数学', '语文', '历史'],
    ['化学', '生物', '物理', '英语', '数学'],
    ['体育', '音乐', '美术', '自习', '班会'],
    ['自习', '物理', '化学', '数学', '英语'],
    ['班会', '自习', '体育', '语文', '数学']
  ];

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note tt-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function fitFont(ctx, text, maxWidth, start, min) {
    var size = start;
    do {
      ctx.font = '500 ' + size + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
      if (ctx.measureText(text).width <= maxWidth) break;
      size--;
    } while (size > min);
    return size;
  }

  TB.def({
    slug: 'timetable', cat: 'office', name: '课程表生成器', desc: '5 天网格编辑，导出 PNG 或打印',
    icon: '📅', kw: '课程表 课表 时间表 学校 班级 打印 导出 png 表格',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">课程表设置<span class="hint">周一至周五，节数可调</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>标题</b></div><input class="input" id="ttTitle" value="我的课程表" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>每天节数</b></div><select class="select" id="ttPeriods">' +
              [6, 7, 8, 9, 10].map(function (n) { return '<option value="' + n + '"' + (n === 8 ? ' selected' : '') + '>' + n + ' 节</option>'; }).join('') +
            '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="ttPng" type="button">导出 PNG</button>' +
            '<button class="btn" id="ttPrint" type="button">打印</button>' +
            '<button class="btn" id="ttSample" type="button">填入示例</button>' +
            '<button class="btn" id="ttClear" type="button">清空课程</button></div>' +
          '<div id="ttMsg" class="tt-msg"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">预览<span class="hint">直接修改单元格，自动保存到当前页面</span></div>' +
          '<div class="tt-wrap" id="ttWrap"></div>' +
        '</div>' +
        '<div class="note">导出的 PNG 是固定版式，长课程名会自动缩小字号；打印使用浏览器的新窗口，不依赖 iframe。页面刷新后课程内容不会保留，需要长期保存请下载 PNG 或使用打印。</div>';

      var wrap = TB.$('#ttWrap', root);
      var titleInput = TB.$('#ttTitle', root);
      var periodsSel = TB.$('#ttPeriods', root);
      var msg = TB.$('#ttMsg', root);
      var state = { title: '我的课程表', periods: 8, cells: [] };

      function resetCells(rows, keep) {
        var old = state.cells || [];
        var next = [];
        for (var r = 0; r < rows; r++) {
          next[r] = [];
          for (var c = 0; c < DAYS.length; c++) next[r][c] = keep && old[r] && old[r][c] ? old[r][c] : '';
        }
        state.cells = next;
      }

      function readCells() {
        var next = [];
        wrap.querySelectorAll('input[data-r]').forEach(function (el) {
          var r = Number(el.getAttribute('data-r'));
          var c = Number(el.getAttribute('data-c'));
          if (!next[r]) next[r] = [];
          next[r][c] = el.value;
        });
        state.cells = next;
      }

      function sheetHtml(print) {
        var html = '<div class="tt-sheet"><div class="tt-title">' + TB.esc(state.title || '课程表') + '</div>' +
          '<table class="tt-table"><thead><tr><th class="tt-period">节次</th>' +
          DAYS.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr></thead><tbody>';
        for (var r = 0; r < state.periods; r++) {
          html += '<tr><th class="tt-period">第 ' + (r + 1) + ' 节</th>';
          for (var c = 0; c < DAYS.length; c++) {
            var v = (state.cells[r] && state.cells[r][c]) || '';
            html += '<td>' + (print ? TB.esc(v) : '<input class="tt-cell" data-r="' + r + '" data-c="' + c + '" value="' + TB.esc(v) + '" autocomplete="off" spellcheck="false">') + '</td>';
          }
          html += '</tr>';
        }
        return html + '</tbody></table></div>';
      }

      function render() {
        wrap.innerHTML = sheetHtml(false);
      }

      function syncTitle() {
        state.title = titleInput.value.trim() || '课程表';
        var t = wrap.querySelector('.tt-title');
        if (t) t.textContent = state.title;
      }

      function downloadPng() {
        readCells();
        var rows = state.periods;
        var cols = DAYS.length;
        var pad = 48, titleH = 110, headerH = 68, rowH = 88, footH = 48;
        var w = 1500;
        var h = pad * 2 + titleH + headerH + rowH * rows + footH;
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var g = canvas.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, h);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#16233a';
        g.font = 'bold 46px "Microsoft YaHei", "PingFang SC", sans-serif';
        g.fillText(state.title || '课程表', w / 2, pad + titleH / 2);

        var x0 = pad, y0 = pad + titleH;
        var periodW = 130;
        var colW = (w - pad * 2 - periodW) / cols;
        var tableW = periodW + colW * cols;
        g.fillStyle = '#eef4ff';
        g.fillRect(x0, y0, tableW, headerH);
        g.fillStyle = '#2f6fed';
        g.font = 'bold 26px "Microsoft YaHei", "PingFang SC", sans-serif';
        g.fillText('节次', x0 + periodW / 2, y0 + headerH / 2);
        DAYS.forEach(function (d, c) {
          g.fillText(d, x0 + periodW + colW * c + colW / 2, y0 + headerH / 2);
        });
        for (var r = 0; r < rows; r++) {
          var ry = y0 + headerH + rowH * r;
          g.fillStyle = r % 2 ? '#f8fbff' : '#ffffff';
          g.fillRect(x0, ry, tableW, rowH);
          g.strokeStyle = '#d9e3f2';
          g.lineWidth = 1;
          g.strokeRect(x0, ry, tableW, rowH);
          g.fillStyle = '#5b6b82';
          g.font = '500 23px "Microsoft YaHei", "PingFang SC", sans-serif';
          g.fillText('第 ' + (r + 1) + ' 节', x0 + periodW / 2, ry + rowH / 2);
          for (var c = 0; c < cols; c++) {
            var cx = x0 + periodW + colW * c;
            g.strokeStyle = '#d9e3f2';
            g.beginPath();
            g.moveTo(cx, ry);
            g.lineTo(cx, ry + rowH);
            g.stroke();
            var text = (state.cells[r] && state.cells[r][c]) || '';
            if (text) {
              var size = fitFont(g, text, colW - 24, 28, 16);
              g.fillStyle = '#24344d';
              g.font = '500 ' + size + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
              g.fillText(text, cx + colW / 2, ry + rowH / 2);
            }
          }
        }
        g.strokeStyle = '#d9e3f2';
        g.strokeRect(x0, y0, tableW, headerH + rowH * rows);
        g.fillStyle = '#8b9bb4';
        g.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
        g.fillText('由简单工具箱生成', w / 2, h - pad / 2 - 4);
        canvas.toBlob(function (b) {
          if (b) TB.download(b, '课程表.png');
          else TB.toast('PNG 编码失败');
        }, 'image/png');
      }

      function printSheet() {
        readCells();
        var win = window.open('', '_blank');
        if (!win) { status(msg, '浏览器拦截了打印窗口，请允许弹窗后重试', true); return; }
        var style = '@page{size:A4 landscape;margin:12mm}body{margin:0;font-family:"Microsoft YaHei","PingFang SC",sans-serif;color:#16233a}' +
          '.tt-sheet{padding:10mm}.tt-title{text-align:center;font-size:22pt;font-weight:700;margin:0 0 6mm}' +
          '.tt-table{width:100%;border-collapse:collapse;table-layout:fixed}.tt-table th,.tt-table td{border:1px solid #c9d5e6;padding:6mm 2mm;text-align:center;font-size:11pt}' +
          '.tt-table thead th{background:#eef4ff;color:#2f6fed}.tt-table .tt-period{width:14%;color:#5b6b82;font-weight:500}';
        win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + TB.esc(state.title || '课程表') + '</title><style>' + style + '</style></head><body>' + sheetHtml(true) + '</body></html>');
        win.document.close();
        win.focus();
        setTimeout(function () { try { win.print(); } catch (e) {} }, 400);
        status(msg, '已打开打印窗口');
      }

      wrap.addEventListener('input', function (e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains('tt-cell')) {
          readCells();
          status(msg, '');
        }
      });
      titleInput.addEventListener('input', syncTitle);
      periodsSel.addEventListener('change', function () {
        readCells();
        state.periods = Number(periodsSel.value);
        resetCells(state.periods, true);
        render();
      });
      TB.$('#ttSample', root).addEventListener('click', function () {
        state.periods = 8;
        periodsSel.value = '8';
        resetCells(8, false);
        for (var r = 0; r < 8; r++) {
          for (var c = 0; c < DAYS.length; c++) state.cells[r][c] = SAMPLE[r][c];
        }
        render();
        status(msg, '已填入示例课程');
      });
      TB.$('#ttClear', root).addEventListener('click', function () {
        readCells();
        resetCells(state.periods, false);
        render();
        status(msg, '已清空课程');
      });
      TB.$('#ttPng', root).addEventListener('click', downloadPng);
      TB.$('#ttPrint', root).addEventListener('click', printSheet);

      resetCells(8, false);
      render();
    }
  });
})();
