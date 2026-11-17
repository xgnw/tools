/* =============================================================================
 * PDF 镜像翻转 / 页面裁剪
 * -----------------------------------------------------------------------------
 * 镜像：用 pdf-lib 的 scaleContent + translateContent 翻转页面内容，
 *       文字仍是文字，不会把整页转成图片。
 * 裁剪：设置 CropBox，按毫米边距裁掉页面四周，适合扫描件去黑边。
 * 依赖本地 pdf-lib，不上传文件。
 * ========================================================================== */

(function () {
  'use strict';

  var PDFLib = function () { return window.PDFLib; };
  var MM = 72 / 25.4;

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px"><span class="' +
      (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  async function loadDoc(buf) {
    await TB.loadLib('pdf-lib.min.js');
    return PDFLib().PDFDocument.load(buf, { ignoreEncryption: true });
  }

  function parseRange(text, total) {
    var raw = String(text || '').trim();
    if (!raw || raw === '全部') {
      return Array.from({ length: total }, function (_, i) { return i; });
    }
    var set = {};
    raw.split(/[,，]/).forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var m = part.match(/^(\d+)\s*[-~]\s*(\d+)$/);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a > b) { var t = a; a = b; b = t; }
        for (var i = a; i <= b; i++) {
          if (i < 1 || i > total) throw new Error('页码 ' + i + ' 超出范围');
          set[i - 1] = true;
        }
      } else if (/^\d+$/.test(part)) {
        var n = parseInt(part, 10);
        if (n < 1 || n > total) throw new Error('页码 ' + n + ' 超出范围');
        set[n - 1] = true;
      } else {
        throw new Error('页码格式不对：' + part);
      }
    });
    var idx = Object.keys(set).map(Number);
    if (!idx.length) throw new Error('没有选中任何页面');
    return idx;
  }

  TB.def({
    slug: 'pdf-mirror-crop', cat: 'office', name: 'PDF 镜像翻转 / 页面裁剪', desc: '镜像打印 · 扫描件去黑边', icon: '🪞',
    kw: 'pdf 镜像 翻转 裁剪 黑边 扫描件 页面 crop mirror',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b></div><div id="drop"></div></div>' +
          '<div id="info" hidden style="margin-bottom:14px"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>镜像方式</b></div>' +
              '<div class="checks">' +
                '<label><input type="checkbox" id="hm"> 水平镜像（左右翻）</label>' +
                '<label><input type="checkbox" id="vm"> 垂直镜像（上下翻）</label>' +
              '</div></div>' +
            '<div class="field"><div class="label"><b>应用页码</b><span style="color:var(--ink-3)">如 1-3,5</span></div>' +
              '<input class="input" id="range" value="全部" placeholder="全部"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">左裁剪（mm）</div><input class="input" id="cl" type="number" min="0" max="100" value="0"></div>' +
            '<div class="field"><div class="label">右裁剪（mm）</div><input class="input" id="cr" type="number" min="0" max="100" value="0"></div>' +
            '<div class="field"><div class="label">上裁剪（mm）</div><input class="input" id="ct" type="number" min="0" max="100" value="0"></div>' +
            '<div class="field"><div class="label">下裁剪（mm）</div><input class="input" id="cb" type="number" min="0" max="100" value="0"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>应用并下载 PDF</button>' +
            '<button class="btn" id="reset" disabled>重置参数</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">镜像只翻转页面内容，适合镜像打印 / 转印；PDF 里的表单与批注不会被翻转。裁剪使用 CropBox，内容仍在文件里但显示范围会变小。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var info = TB.$('#info', root), msg = TB.$('#msg', root);
      var run = TB.$('#run', root), reset = TB.$('#reset', root);
      var buf = null, fileName = '', pageCount = 0;

      function payload() {
        var l = Math.max(0, parseFloat(TB.$('#cl', root).value) || 0);
        var r = Math.max(0, parseFloat(TB.$('#cr', root).value) || 0);
        var t = Math.max(0, parseFloat(TB.$('#ct', root).value) || 0);
        var b = Math.max(0, parseFloat(TB.$('#cb', root).value) || 0);
        return { l: l, r: r, t: t, b: b, hm: TB.$('#hm', root).checked, vm: TB.$('#vm', root).checked };
      }

      picker.onChange = async function () {
        buf = null; fileName = ''; pageCount = 0;
        info.hidden = true; run.disabled = true; reset.disabled = true;
        if (!picker.files.length) { status(msg, ''); return; }
        try {
          buf = await TB.readArrayBuffer(picker.files[0].file);
          fileName = picker.files[0].file.name.replace(/\.pdf$/i, '');
          var doc = await loadDoc(buf);
          pageCount = doc.getPageCount();
          var size = doc.getPage(0).getSize();
          info.hidden = false;
          info.innerHTML = '<div class="kv">' +
            '<div class="kv-item"><div class="kv-k">页数</div><div class="kv-v">' + pageCount + ' 页</div></div>' +
            '<div class="kv-item"><div class="kv-k">首页尺寸</div><div class="kv-v">' + Math.round(size.width) + ' × ' + Math.round(size.height) + ' pt</div></div>' +
            '</div>';
          run.disabled = false;
          reset.disabled = false;
          status(msg, '已读取 ' + pageCount + ' 页，可以设置镜像或裁剪。');
        } catch (e) {
          status(msg, '读取失败：' + e.message, true);
        }
      };

      reset.addEventListener('click', function () {
        TB.$('#hm', root).checked = false;
        TB.$('#vm', root).checked = false;
        TB.$('#range', root).value = '全部';
        ['#cl', '#cr', '#ct', '#cb'].forEach(function (s) { TB.$(s, root).value = '0'; });
        status(msg, '');
      });

      run.addEventListener('click', async function () {
        if (!buf) return;
        var p = payload();
        if (!p.hm && !p.vm && !p.l && !p.r && !p.t && !p.b) {
          status(msg, '没有设置镜像或裁剪参数', true);
          return;
        }
        run.disabled = true;
        status(msg, '处理中…');
        try {
          var doc = await loadDoc(buf);
          var pages = parseRange(TB.$('#range', root).value, doc.getPageCount());
          pages.forEach(function (idx) {
            var page = doc.getPage(idx);
            var size = page.getSize();
            var w = size.width, h = size.height;

            if (p.hm || p.vm) {
              if (p.hm && p.vm) {
                page.scaleContent(-1, -1);
                page.translateContent(w, h);
              } else if (p.hm) {
                page.scaleContent(-1, 1);
                page.translateContent(w, 0);
              } else {
                page.scaleContent(1, -1);
                page.translateContent(0, h);
              }
            }

            if (p.l || p.r || p.t || p.b) {
              var l = p.l * MM, r = p.r * MM, t = p.t * MM, b = p.b * MM;
              var cw = w - l - r, ch = h - t - b;
              if (cw < 10 || ch < 10) throw new Error('第 ' + (idx + 1) + ' 页裁剪边距过大，页面只剩不到 10pt');
              page.setCropBox(l, b, cw, ch);
            }
          });
          var bytes = await doc.save();
          TB.download(new Blob([bytes], { type: 'application/pdf' }), fileName + '-镜像裁剪.pdf');
          status(msg, '已处理 ' + pages.length + ' 页，开始下载。');
        } catch (e) {
          status(msg, '处理失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });
})();
