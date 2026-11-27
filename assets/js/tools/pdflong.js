/* =============================================================================
 * PDF 转长图
 * -----------------------------------------------------------------------------
 * 用 pdf.js 在本机逐页渲染，再把所有页面纵向拼成一张 PNG。
 * 控制输出宽度、页间距和最大像素，超过限制时明确报错，避免移动端内存爆掉。
 * ========================================================================== */

(function () {
  'use strict';

  var MAX_PAGES = 30;
  var MAX_HEIGHT = 30000;
  var MAX_PIXELS = 36e6;

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note pl-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function alive(root) { return !!(root && root.isConnected); }

  async function loadPdfJs() {
    await TB.loadLib('pdf.min.js');
    var lib = window.pdfjsLib;
    if (lib && !lib.__workerSet) {
      lib.GlobalWorkerOptions.workerSrc = 'assets/lib/pdf.worker.min.js';
      lib.__workerSet = true;
    }
    return lib;
  }

  TB.def({
    slug: 'pdf-long', cat: 'office', name: 'PDF 转长图', desc: '多页纵向拼成一张 PNG',
    icon: '🧵', kw: 'pdf 长图 拼接 多页 png 导出 阅读 分享 文档',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">选择 PDF<span class="hint">只在本机渲染，不上传</span></div>' +
          '<div id="plPick"></div>' +
          '<div class="row3" style="margin-top:12px">' +
            '<div class="field"><div class="label"><b>输出宽度</b></div><select class="input" id="plWidth">' +
              '<option value="1200" selected>1200 px</option><option value="1600">1600 px</option><option value="2000">2000 px</option>' +
            '</select></div>' +
            '<div class="field"><div class="label"><b>页间距</b></div><select class="input" id="plGap">' +
              '<option value="0" selected>0 px</option><option value="12">12 px</option><option value="24">24 px</option><option value="40">40 px</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">页数限制 <span class="pl-dim">最多 30 页</span></div>' +
              '<div class="pl-readonly" id="plPages">生成时显示页数</div></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="plRun" disabled type="button">生成 PNG 长图</button>' +
            '<button class="btn" id="plDl" disabled type="button">下载 PNG</button>' +
            '<button class="btn" id="plClear" type="button">清空结果</button></div>' +
          '<div id="plMsg"></div>' +
        '</div>' +
        '<div class="panel" id="plPanel" hidden>' +
          '<div class="panel-h">预览<span class="hint" id="plMeta"></span></div>' +
          '<div class="pl-preview"><img id="plImg" alt="PDF 长图预览"></div>' +
          '<div class="note">长图会把多页拼在一起，页数越多高度越大。受浏览器 Canvas 限制，总高度不超过 30000px、总像素不超过 3600 万；超限时请降低宽度、减少页数或分两次生成。PDF 文件和渲染结果都只留在当前浏览器。</div>' +
        '</div>';

      var pick = TB.filePicker(TB.$('#plPick', root), { accept: 'application/pdf,.pdf', hint: '选择一个 PDF 文件' });
      var runBtn = TB.$('#plRun', root), dlBtn = TB.$('#plDl', root), clearBtn = TB.$('#plClear', root);
      var msg = TB.$('#plMsg', root), panel = TB.$('#plPanel', root), img = TB.$('#plImg', root);
      var meta = TB.$('#plMeta', root), pagesEl = TB.$('#plPages', root);
      var widthSel = TB.$('#plWidth', root), gapSel = TB.$('#plGap', root);
      var busy = false, seq = 0, outBlob = null, outUrl = '', outName = 'pdf-long.png';

      function note(text, isErr) { status(msg, text, isErr); }

      function clearOutput() {
        if (outUrl) URL.revokeObjectURL(outUrl);
        outUrl = ''; outBlob = null;
        img.removeAttribute('src');
        panel.hidden = true;
        dlBtn.disabled = true;
        meta.textContent = '';
      }

      function resetAll() {
        seq++;
        busy = false;
        outBlob = null;
        clearOutput();
        pagesEl.textContent = '生成时显示页数';
        runBtn.disabled = !pick.files.length;
        note('');
      }

      pick.onChange = function () {
        seq++;
        busy = false;
        clearOutput();
        if (!pick.files.length) { resetAll(); return; }
        runBtn.disabled = false;
        var f = pick.files[0].file;
        pagesEl.textContent = '生成时显示页数';
        note('已选择：' + f.name);
      };

      async function run() {
        var item = pick.files[0];
        if (!item || busy) return;
        var my = ++seq;
        busy = true;
        runBtn.disabled = true;
        clearOutput();
        var width = Number(widthSel.value) || 1200;
        var gap = Number(gapSel.value) || 0;
        var pdf = null;
        try {
          note('正在载入 PDF…');
          var lib = await loadPdfJs();
          if (my !== seq || !alive(root)) return;
          var buf = await TB.readArrayBuffer(item.file);
          if (my !== seq || !alive(root)) return;
          pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
          pagesEl.textContent = pdf.numPages + ' 页';
          if (pdf.numPages > MAX_PAGES) throw new Error('PDF 共 ' + pdf.numPages + ' 页，超过 ' + MAX_PAGES + ' 页限制，请先拆分');
          var pageCanvases = [], totalH = 0;
          for (var p = 1; p <= pdf.numPages; p++) {
            if (my !== seq || !alive(root)) { pdf.destroy(); return; }
            note('正在渲染第 ' + p + ' / ' + pdf.numPages + ' 页…');
            var page = await pdf.getPage(p);
            var base = page.getViewport({ scale: 1 });
            var scale = width / base.width;
            var vp = page.getViewport({ scale: scale });
            var ch = Math.max(1, Math.round(vp.height));
            if (totalH + ch + (pageCanvases.length ? gap : 0) > MAX_HEIGHT ||
                width * (totalH + ch + (pageCanvases.length ? gap : 0)) > MAX_PIXELS) {
              throw new Error('拼接后高度会超过浏览器限制（30000px / 3600 万像素），请降低宽度或减少页数');
            }
            var cv = document.createElement('canvas');
            cv.width = width;
            cv.height = ch;
            var g = cv.getContext('2d');
            g.fillStyle = '#fff';
            g.fillRect(0, 0, cv.width, cv.height);
            await page.render({ canvasContext: g, viewport: vp }).promise;
            pageCanvases.push(cv);
            totalH += ch + (pageCanvases.length > 1 ? gap : 0);
            await new Promise(function (r) { setTimeout(r, 24); });
          }
          if (my !== seq || !alive(root)) { pdf.destroy(); return; }
          var final = document.createElement('canvas');
          final.width = width;
          final.height = totalH;
          var fg = final.getContext('2d');
          fg.fillStyle = '#fff';
          fg.fillRect(0, 0, width, totalH);
          var y = 0;
          pageCanvases.forEach(function (pc, i) {
            if (i) y += gap;
            fg.drawImage(pc, 0, y);
            y += pc.height;
          });
          var blob = await TB.canvasBlob(final, 'image/png');
          if (!blob) throw new Error('PNG 编码失败');
          if (my !== seq || !alive(root)) { pdf.destroy(); return; }
          outBlob = blob;
          outUrl = URL.createObjectURL(blob);
          outName = item.file.name.replace(/\.pdf$/i, '') + '-长图.png';
          img.src = outUrl;
          panel.hidden = false;
          meta.textContent = final.width + ' × ' + final.height + ' · ' + TB.fmtBytes(blob.size);
          dlBtn.disabled = false;
          note('完成：' + pdf.numPages + ' 页，已拼成一张 ' + final.width + ' × ' + final.height + ' 的长图', false);
          pdf.destroy();
        } catch (e) {
          if (pdf) { try { pdf.destroy(); } catch (err) {} }
          note('转换失败：' + (e && e.message ? e.message : '未知错误'), true);
        } finally {
          if (my === seq && alive(root)) {
            busy = false;
            runBtn.disabled = !pick.files.length;
          }
        }
      }

      runBtn.addEventListener('click', run);
      dlBtn.addEventListener('click', function () {
        if (outBlob) TB.download(outBlob, outName);
      });
      clearBtn.addEventListener('click', function () {
        seq++;
        busy = false;
        clearOutput();
        runBtn.disabled = !pick.files.length;
        note('');
      });
    }
  });
})();
