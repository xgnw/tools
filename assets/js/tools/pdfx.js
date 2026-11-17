/* =============================================================================
 * PDF 进阶工具：页面管理 / 压缩 / 尺寸调整 / 加水印
 * -----------------------------------------------------------------------------
 * 依赖：pdf-lib（页面复制、重排、绘制）、pdf.js（把页面渲染成位图做压缩）。
 * 两者都懒加载；文件不上传。
 * ========================================================================== */

(function () {

  var PDFLib = function () { return window.PDFLib; };
  var PDFJS = function () { return window.pdfjsLib; };
  var MIME = 'application/pdf';

  async function loadPdf(file) {
    await TB.loadLib('pdf-lib.min.js');
    var buf = await TB.readArrayBuffer(file);
    try {
      return await PDFLib().PDFDocument.load(buf, { ignoreEncryption: true });
    } catch (e) {
      throw new Error('无法读取「' + file.name + '」，可能已加密或文件损坏');
    }
  }

  /* 载入 pdf.js 并指向本地 worker（不依赖 CDN） */
  async function loadPdfJs() {
    await TB.loadLib('pdf.min.js');
    var lib = window.pdfjsLib;
    if (lib && !lib.__workerSet) {
      lib.GlobalWorkerOptions.workerSrc = 'assets/lib/pdf.worker.min.js';
      lib.__workerSet = true;
    }
    return lib;
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px">' +
      '<span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function savePdf(bytes, name) {
    TB.download(new Blob([bytes], { type: MIME }), name);
  }

  /* ------------------------------------------------------- 1. PDF 页面管理 */
  TB.def({
    slug: 'pdf-organize', cat: 'office', name: 'PDF 页面管理', desc: '旋转 / 删页 / 重排', icon: '🗂️',
    kw: 'pdf 页面 管理 旋转 删除 排序 重排 organize',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>页面列表</b><span style="color:var(--ink-3)">↺ ↻ 旋转 90° · ✕ 删除 · ↑↓ 调整顺序</span></div>' +
            '<div id="pages" class="note">选择文件后在这里管理页面</div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>应用并下载</button>' +
            '<button class="btn" id="reset" disabled>恢复原顺序</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">只改页面顺序与方向，不动页面内容，所以体积几乎不变、文字依旧可选中。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var pagesEl = TB.$('#pages', root), msg = TB.$('#msg', root);
      var run = TB.$('#run', root), reset = TB.$('#reset', root);
      var doc = null, order = [], fileName = '';

      function paint() {
        if (!order.length) {
          pagesEl.innerHTML = '<span style="color:var(--ink-3)">没有页面了</span>';
          run.disabled = true;
          return;
        }
        pagesEl.innerHTML = order.map(function (p, i) {
          return '<div class="pagerow" data-i="' + i + '">' +
            '<span class="pageno">' + (i + 1) + '</span>' +
            '<span class="pageref">原第 ' + (p.src + 1) + ' 页' + (p.rot ? ' · 旋转 ' + p.rot + '°' : '') + '</span>' +
            '<span class="pageacts">' +
              '<button class="mini" data-act="left" title="左转 90°">↺</button>' +
              '<button class="mini" data-act="right" title="右转 90°">↻</button>' +
              '<button class="mini" data-act="up" title="上移">↑</button>' +
              '<button class="mini" data-act="down" title="下移">↓</button>' +
              '<button class="mini del" data-act="del" title="删除">✕</button>' +
            '</span></div>';
        }).join('');
        run.disabled = false;
        reset.disabled = false;
      }

      pagesEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var row = btn.closest('.pagerow');
        var i = parseInt(row.getAttribute('data-i'), 10);
        var act = btn.getAttribute('data-act');
        var p = order[i];
        if (act === 'left') p.rot = (p.rot + 270) % 360;
        if (act === 'right') p.rot = (p.rot + 90) % 360;
        if (act === 'del') order.splice(i, 1);
        if (act === 'up' && i > 0) { order.splice(i, 1); order.splice(i - 1, 0, p); }
        if (act === 'down' && i < order.length - 1) { order.splice(i, 1); order.splice(i + 1, 0, p); }
        paint();
      });

      picker.onChange = async function () {
        order = [];
        doc = null;
        if (!picker.files.length) { paint(); return; }
        try {
          doc = await loadPdf(picker.files[0].file);
          fileName = picker.files[0].file.name.replace(/\.pdf$/i, '');
          order = doc.getPageIndices().map(function (i) { return { src: i, rot: 0 }; });
          paint();
          status(msg, '共 ' + order.length + ' 页，可以直接调整。');
        } catch (e) {
          status(msg, '读取失败：' + e.message, true);
          paint();
        }
      };

      reset.addEventListener('click', function () {
        order.forEach(function (p) { p.rot = 0; });
        order.sort(function (a, b) { return a.src - b.src; });
        paint();
      });

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          await TB.loadLib('pdf-lib.min.js');
          var out = await PDFLib().PDFDocument.create();
          for (var i = 0; i < order.length; i++) {
            var copies = await out.copyPages(doc, [order[i].src]);
            var pg = copies[0];
            var base = pg.getRotation().angle || 0;
            pg.setRotation(PDFLib().degrees((base + order[i].rot) % 360));
            out.addPage(pg);
          }
          savePdf(await out.save(), fileName + '_编排.pdf');
          status(msg, '完成：输出 ' + out.getPageCount() + ' 页，已开始下载。');
        } catch (e) {
          status(msg, '处理失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ----------------------------------------------------------- 2. PDF 压缩 */
  TB.def({
    slug: 'pdf-compress', cat: 'office', name: 'PDF 压缩', desc: '页面重绘、体积变小', icon: '🗜️',
    kw: 'pdf 压缩 变小 compress 减小体积',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>压缩强度</b></div>' +
            '<select class="select" id="level">' +
              '<option value="160">轻度：画质优先（约 160 DPI）</option>' +
              '<option value="120" selected>标准：体积与画质平衡（约 120 DPI）</option>' +
              '<option value="96">强力：体积优先（约 96 DPI）</option>' +
            '</select></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>开始压缩</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note"><b>原理：</b>把每一页重新渲染成 JPEG 再装回 PDF，所以扫描件、图片型 PDF 体积下降明显；纯文字 PDF 可能反而变大，也更适合用「拆分」或去空白处理。<b>压缩后文字不可选中</b>，需要保留文字层就换用「PDF 页面管理」。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root), level = TB.$('#level', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        var file = picker.files[0].file;
        try {
          var lib = await loadPdfJs();
          var buf = await TB.readArrayBuffer(file);
          var pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
          var dpi = parseFloat(level.value) || 120;
          var scale = dpi / 72;                                  /* PDF 的点是 72 DPI，按比例放大 */
          var quality = dpi >= 160 ? 0.82 : (dpi >= 120 ? 0.7 : 0.58);
          await TB.loadLib('pdf-lib.min.js');                    /* 先注入再取 window.PDFLib */
          var out = await PDFLib().PDFDocument.create();

          for (var i = 1; i <= pdf.numPages; i++) {
            status(msg, '正在压缩第 ' + i + '/' + pdf.numPages + ' 页…');
            var page = await pdf.getPage(i);
            var vp = page.getViewport({ scale: scale });
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(vp.width));
            canvas.height = Math.max(1, Math.round(vp.height));
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            var blob = await new Promise(function (res) { canvas.toBlob(res, 'image/jpeg', quality); });
            if (!blob) throw new Error('第 ' + i + ' 页导出图片失败');
            /* 必须把图片嵌进"输出文档"本身，嵌到临时文档会得到空白页 */
            var img = await out.embedJpg(await blob.arrayBuffer());
            var ptW = page.view[2] - page.view[0];
            var ptH = page.view[3] - page.view[1];
            var newPage = out.addPage([ptW, ptH]);
            newPage.drawImage(img, { x: 0, y: 0, width: ptW, height: ptH });
            canvas.width = canvas.height = 0;    /* 及时释放画布内存 */
          }
          var bytes = await out.save();
          var name = file.name.replace(/\.pdf$/i, '') + '_压缩.pdf';
          savePdf(bytes, name);
          var before = file.size, after = bytes.byteLength;
          var pct = before ? Math.round((1 - after / before) * 100) : 0;
          status(msg, '完成：' + TB.fmtBytes(before) + ' → ' + TB.fmtBytes(after) +
            (pct > 0 ? '（减小 ' + pct + '%）' : '（这个文件没压下来，原理是纯文字 PDF 压不动）') + '，已开始下载。');
        } catch (e) {
          status(msg, '压缩失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------- 3. PDF 尺寸调整 */
  TB.def({
    slug: 'pdf-resize', cat: 'office', name: 'PDF 尺寸调整', desc: '统一纸张 / 缩放拼版', icon: '📐',
    kw: 'pdf 尺寸 a4 缩放 版面 拼版 resize',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>目标纸张</b></div>' +
            '<select class="select" id="paper">' +
              '<option value="595.28x841.89">A4（210 × 297 mm）</option>' +
              '<option value="841.89x1190.55">A3（297 × 420 mm）</option>' +
              '<option value="612x792">Letter（216 × 279 mm）</option>' +
              '<option value="custom">自定义（毫米）</option>' +
            '</select></div>' +
          '<div class="field" id="cusBox" hidden><div class="label">宽 / 高（mm）</div>' +
            '<div class="row2"><input class="input" id="wmm" type="number" value="210" min="20" max="2000">' +
            '<input class="input" id="hmm" type="number" value="297" min="20" max="2000"></div></div>' +
          '<div class="field"><div class="label"><b>缩放方式</b></div>' +
            '<select class="select" id="fit">' +
              '<option value="contain">等比缩放并居中（不裁切，留白）</option>' +
              '<option value="stretch">拉伸铺满（会变形）</option>' +
              '<option value="crop">按原尺寸放置（超出部分被裁掉）</option>' +
            '</select></div>' +
          '<div class="field"><div class="label">横版自动旋转 <input type="checkbox" id="auto" checked style="vertical-align:middle"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>应用并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">常见用法：把手机拍的 A5 单据统一成 A4 打印、把混排尺寸的报告统一纸张。原页面内容按矢量重排，不损失清晰度。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      var paper = TB.$('#paper', root), cusBox = TB.$('#cusBox', root);
      var wmm = TB.$('#wmm', root), hmm = TB.$('#hmm', root);
      var fit = TB.$('#fit', root), auto = TB.$('#auto', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };
      paper.addEventListener('change', function () { cusBox.hidden = paper.value !== 'custom'; });

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var doc = await loadPdf(picker.files[0].file);
          var W, H;
          if (paper.value === 'custom') {
            W = Math.max(20, parseFloat(wmm.value) || 210) * 2.83465;
            H = Math.max(20, parseFloat(hmm.value) || 297) * 2.83465;
          } else {
            var parts = paper.value.split('x');
            W = parseFloat(parts[0]);
            H = parseFloat(parts[1]);
          }
          var out = await PDFLib().PDFDocument.create();
          var total = doc.getPageCount();

          for (var i = 0; i < total; i++) {
            status(msg, '正在处理第 ' + (i + 1) + '/' + total + ' 页…');
            var src = doc.getPage(i);
            var sw = src.getWidth(), sh = src.getHeight();
            var tw = W, th = H;
            /* 横页放进竖纸时自动换向，避免缩得太小 */
            if (auto.checked) {
              var srcLand = sw > sh, dstLand = tw > th;
              if (srcLand !== dstLand) { var t = tw; tw = th; th = t; }
            }
            var page = out.addPage([tw, th]);
            var embedded = await out.embedPage(src);
            if (fit.value === 'stretch') {
              page.drawPage(embedded, { x: 0, y: 0, width: tw, height: th });
            } else if (fit.value === 'crop') {
              page.drawPage(embedded, { x: 0, y: th - sh, width: sw, height: sh });
            } else {
              var k = Math.min(tw / sw, th / sh);
              var dw = sw * k, dh = sh * k;
              page.drawPage(embedded, { x: (tw - dw) / 2, y: (th - dh) / 2, width: dw, height: dh });
            }
          }
          var name = picker.files[0].file.name.replace(/\.pdf$/i, '') + '_调整尺寸.pdf';
          savePdf(await out.save(), name);
          status(msg, '完成：' + total + ' 页已统一为 ' + Math.round(tw / 2.83465) + '×' + Math.round(th / 2.83465) + ' mm，已开始下载。');
        } catch (e) {
          status(msg, '处理失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* --------------------------------------------------------- 4. PDF 加水印 */
  TB.def({
    slug: 'pdf-watermark', cat: 'office', name: 'PDF 加水印', desc: '文字 / 图片平铺', icon: '💧',
    kw: 'pdf 水印 watermark 文字 图片 平铺 版权',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>水印类型</b></div>' +
            '<select class="select" id="type">' +
              '<option value="text">文字水印（支持中文）</option>' +
              '<option value="image">图片水印（PNG / JPG）</option>' +
            '</select></div>' +
          '<div class="field" id="textBox"><div class="label">水印文字</div>' +
            '<input class="input" id="txt" type="text" value="内部资料 请勿外传"></div>' +
          '<div class="field" id="imgBox" hidden><div class="label">水印图片</div><div id="imgDrop"></div></div>' +
          '<div class="field"><div class="label">排布方式</div>' +
            '<select class="select" id="layout">' +
              '<option value="tile">斜向平铺（满页）</option>' +
              '<option value="center">页面居中（单个）</option>' +
              '<option value="corner">右下角（单个）</option>' +
            '</select></div>' +
          '<div class="field"><div class="label">字号 / 透明度 / 角度</div>' +
            '<div class="row3"><input class="input" id="size" type="number" value="36" min="8" max="120" title="字号">' +
            '<input class="input" id="opacity" type="number" value="0.18" min="0.02" max="1" step="0.02" title="透明度">' +
            '<input class="input" id="angle" type="number" value="30" min="-90" max="90" title="角度"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>添加并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">文字水印先在画布上渲染成透明图片再嵌入，所以中文不会变成方块；透明度建议 0.1–0.3，既能看见又不影响阅读。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var imgPicker = TB.filePicker(TB.$('#imgDrop', root), { accept: 'image/png,image/jpeg', hint: 'PNG 或 JPG' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      var type = TB.$('#type', root), textBox = TB.$('#textBox', root), imgBox = TB.$('#imgBox', root);
      var layout = TB.$('#layout', root), sizeInp = TB.$('#size', root), opInp = TB.$('#opacity', root), angInp = TB.$('#angle', root);

      var ready = function () { run.disabled = !picker.files.length || (type.value === 'image' && !imgPicker.files.length); };
      picker.onChange = ready;
      imgPicker.onChange = ready;
      type.addEventListener('change', function () {
        textBox.hidden = type.value !== 'text';
        imgBox.hidden = type.value !== 'image';
        ready();
      });

      /* 把文字画成透明底的 PNG，返回 ArrayBuffer（供 pdf-lib embedPng） */
      function textToPng(text, fontSize, angle) {
        var pad = 8;
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        var font = '600 ' + fontSize + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.font = font;
        var w = Math.ceil(ctx.measureText(text).width) + pad * 2;
        var h = Math.ceil(fontSize * 1.4);
        var rad = angle * Math.PI / 180;
        var aw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
        var ah = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
        c.width = Math.ceil(aw);
        c.height = Math.ceil(ah);
        ctx = c.getContext('2d');
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate(rad);
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        /* 白描边 + 深色字，放在任何底色的 PDF 上都清楚 */
        ctx.lineWidth = Math.max(2, fontSize / 12);
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle = '#2b3445';
        ctx.fillText(text, 0, 0);
        return new Promise(function (res) {
          c.toBlob(function (b) { b.arrayBuffer().then(res); }, 'image/png');
        });
      }

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var doc = await loadPdf(picker.files[0].file);
          var opacity = Math.max(0.02, Math.min(1, parseFloat(opInp.value) || 0.15));
          var angle = Math.max(-90, Math.min(90, parseFloat(angInp.value) || 0));
          var fontSize = Math.max(8, Math.min(120, parseFloat(sizeInp.value) || 36));

          var pngBytes = null, imgBytes = null, imgType = 'png';
          if (type.value === 'text') {
            var txt = TB.$('#txt', root).value.trim();
            if (!txt) throw new Error('请先填写水印文字');
            pngBytes = await textToPng(txt, fontSize, angle);
          } else {
            var f = imgPicker.files[0].file;
            imgBytes = await TB.readArrayBuffer(f);
            imgType = /png$/i.test(f.name) ? 'png' : 'jpg';
          }

          var total = doc.getPageCount();
          for (var i = 0; i < total; i++) {
            status(msg, '正在添加第 ' + (i + 1) + '/' + total + ' 页…');
            var page = doc.getPage(i);
            var W = page.getWidth(), H = page.getHeight();
            if (type.value === 'text') {
              var img = await doc.embedPng(pngBytes);
              var iw = img.width, ih = img.height;
              if (layout.value === 'center') {
                page.drawImage(img, {
                  x: (W - iw) / 2, y: (H - ih) / 2, width: iw, height: ih, opacity: opacity
                });
              } else if (layout.value === 'corner') {
                page.drawImage(img, {
                  x: W - iw - 24, y: 24, width: iw, height: ih, opacity: opacity
                });
              } else {
                /* 平铺：按页宽高均分格子，保证每块水印完整落在页面内，边缘不会被裁 */
                var cols = Math.max(1, Math.floor(W / (iw * 1.06)));
                var rows = Math.max(1, Math.floor(H / (ih * 1.7)));
                var stepX = W / cols, stepY = H / rows;
                for (var ri = 0; ri < rows; ri++) {
                  for (var ci = 0; ci < cols; ci++) {
                    page.drawImage(img, {
                      x: ci * stepX + (stepX - iw) / 2,
                      y: ri * stepY + (stepY - ih) / 2,
                      width: iw, height: ih, opacity: opacity
                    });
                  }
                }
              }
            } else {
              var pic = imgType === 'png' ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
              var pw = Math.min(W * 0.6, pic.width), ph = pw * (pic.height / pic.width);
              if (layout.value === 'center') {
                page.drawImage(pic, { x: (W - pw) / 2, y: (H - ph) / 2, width: pw, height: ph, opacity: opacity });
              } else if (layout.value === 'corner') {
                page.drawImage(pic, { x: W - pw - 24, y: 24, width: pw, height: ph, opacity: opacity });
              } else {
                for (var yy = -ph; yy < H + ph; yy += ph * 1.6) {
                  for (var xx = -pw; xx < W + pw; xx += pw * 1.3) {
                    page.drawImage(pic, { x: xx, y: yy, width: pw, height: ph, opacity: opacity });
                  }
                }
              }
            }
          }
          var name = picker.files[0].file.name.replace(/\.pdf$/i, '') + '_水印.pdf';
          savePdf(await doc.save(), name);
          status(msg, '完成：' + total + ' 页已添加水印，已开始下载。');
        } catch (e) {
          status(msg, '添加失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

})();
