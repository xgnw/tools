/* =============================================================================
 * PDF 签名
 * -----------------------------------------------------------------------------
 * 支持手写、图片、文字三种签名，把签名作为可视图层叠加到指定页面。
 * 依赖本地 pdf-lib；不是 CA 数字证书签名，不改变 PDF 的加密 / 签章有效性。
 * ========================================================================== */
(function () {
  'use strict';

  function arrayBufferOf(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsArrayBuffer(blob);
    });
  }

  function blobOf(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error('签名画布导出失败'));
      }, 'image/png');
    });
  }

  /* 去掉手写画布四周的透明留白，避免签名悬浮在过大的空白里 */
  function trimCanvas(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    var data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || maxY < 0) return null;
    var pad = 6;
    var x0 = Math.max(0, minX - pad);
    var y0 = Math.max(0, minY - pad);
    var x1 = Math.min(w, maxX + pad + 1);
    var y1 = Math.min(h, maxY + pad + 1);
    var out = document.createElement('canvas');
    out.width = x1 - x0;
    out.height = y1 - y0;
    out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  TB.def({
    slug: 'pdfsign',
    cat: 'office',
    name: 'PDF 签名',
    desc: '在 PDF 指定页叠加手写、图片或文字签名，并下载签署后的 PDF。',
    icon: '✍️',
    kw: 'pdf 签名 手写 电子签名 图片签名 文字签名',
    render: function (ctx) {
      var root = ctx.root;
      var pdfInfo = null;
      var signMode = 'draw';
      var signatureImage = null;
      var signatureImageUrl = null;

      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">1. 选择 PDF</div>' +
          '<div id="psPicker"></div>' +
          '<p class="hint-text" id="psMeta">尚未选择 PDF。文件只在本地处理，不会上传服务器。</p>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">2. 准备签名</div>' +
          '<div class="tabs" role="tablist">' +
            '<button class="tab on" type="button" data-sign-mode="draw" role="tab" aria-selected="true">手写</button>' +
            '<button class="tab" type="button" data-sign-mode="image" role="tab" aria-selected="false">图片</button>' +
            '<button class="tab" type="button" data-sign-mode="text" role="tab" aria-selected="false">文字</button>' +
          '</div>' +
          '<div id="psDrawPane">' +
            '<canvas id="psPad" class="sigPad" width="600" height="220" aria-label="手写签名画布"></canvas>' +
            '<div class="row" style="margin-top:10px">' +
              '<div class="field"><label class="label" for="psInk"><b>笔迹颜色</b></label><div class="color-pick"><input id="psInk" type="color" value="#1f2937"></div></div>' +
              '<div class="field"><label class="label" for="psInkWidth"><b>笔迹粗细</b> <span id="psInkWidthText">2.5</span></label><input id="psInkWidth" type="range" min="1" max="8" value="2.5" step="0.5" style="width:100%"></div>' +
            '</div>' +
            '<div class="btns" style="margin-top:10px"><button id="psClearPad" class="btn" type="button">清除重写</button></div>' +
          '</div>' +
          '<div id="psImagePane" hidden>' +
            '<div id="psImagePicker"></div>' +
            '<p class="hint-text">建议使用透明 PNG；白底扫描图会把白底一起贴到 PDF 上。</p>' +
          '</div>' +
          '<div id="psTextPane" hidden>' +
            '<div class="row">' +
              '<div class="field"><label class="label" for="psText"><b>签名文字</b></label><input id="psText" class="input" value="Signature" spellcheck="false"></div>' +
              '<div class="field"><label class="label" for="psFont"><b>字体</b></label><select id="psFont" class="select"><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times Roman</option><option value="Courier">Courier</option></select></div>' +
              '<div class="field"><label class="label" for="psFontSize"><b>字号（pt）</b></label><input id="psFontSize" class="input" type="number" min="8" max="72" value="18"></div>' +
            '</div>' +
            '<p class="hint-text">pdf-lib 内置字体只支持英文 / 数字等 WinAnsi 字符；中文请使用手写或图片签名。</p>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">3. 放置与导出</div>' +
          '<div class="row">' +
            '<div class="field"><label class="label" for="psPage"><b>签署页面</b></label><select id="psPage" class="select"><option value="last">最后一页</option><option value="first">第一页</option><option value="custom">指定页</option></select></div>' +
            '<div class="field"><label class="label" for="psPageNo"><b>页码</b></label><input id="psPageNo" class="input" type="number" min="1" value="1" disabled></div>' +
            '<div class="field"><label class="label" for="psWhere"><b>位置</b></label><select id="psWhere" class="select"><option value="br">右下角</option><option value="bc">底部居中</option><option value="bl">左下角</option><option value="tr">右上角</option><option value="tc">顶部居中</option><option value="tl">左上角</option></select></div>' +
            '<div class="field"><label class="label" for="psWidth"><b>签名宽度（pt）</b></label><input id="psWidth" class="input" type="number" min="40" max="400" value="160"></div>' +
            '<div class="field"><label class="label" for="psMargin"><b>页边距（pt）</b></label><input id="psMargin" class="input" type="number" min="10" max="120" value="36"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button id="psSign" class="btn primary" type="button">签署并下载 PDF</button>' +
          '</div>' +
          '<p class="hint-text" id="psStatus">选择 PDF 并准备好签名后导出。</p>' +
        '</div>' +
        '<p class="note">本工具只把签名作为图片 / 文字图层绘制到 PDF 页面上，属于可视签名；不包含 CA 数字证书、时间戳或法律意义上的电子签章。重要合同请使用合规电子签名平台。</p>';

      var els = {
        pickerHost: TB.$('#psPicker', root),
        meta: TB.$('#psMeta', root),
        pad: TB.$('#psPad', root),
        ink: TB.$('#psInk', root),
        inkWidth: TB.$('#psInkWidth', root),
        inkWidthText: TB.$('#psInkWidthText', root),
        page: TB.$('#psPage', root),
        pageNo: TB.$('#psPageNo', root),
        where: TB.$('#psWhere', root),
        width: TB.$('#psWidth', root),
        margin: TB.$('#psMargin', root),
        status: TB.$('#psStatus', root),
        text: TB.$('#psText', root),
        font: TB.$('#psFont', root),
        fontSize: TB.$('#psFontSize', root)
      };

      var picker = TB.filePicker(els.pickerHost, {
        accept: '.pdf,application/pdf',
        hint: '拖入 PDF 文件'
      });
      picker.onChange = function () {
        var item = picker.files[0];
        if (!item) { pdfInfo = null; els.meta.textContent = '尚未选择 PDF。'; return; }
        loadPdf(item.file);
      };

      function loadPdf(file) {
        els.meta.textContent = '正在读取 PDF…';
        TB.loadLib('pdf-lib.min.js').then(function () {
          if (!window.PDFLib) throw new Error('PDF 依赖加载失败');
          return TB.readArrayBuffer(file);
        }).then(function (buf) {
          return window.PDFLib.PDFDocument.load(buf);
        }).then(function (doc) {
          pdfInfo = { doc: doc, pages: doc.getPageCount(), name: file.name };
          els.meta.textContent = '已载入：' + file.name + ' · ' + pdfInfo.pages + ' 页';
          els.pageNo.max = String(pdfInfo.pages);
          if (pdfInfo.pages === 1) {
            els.page.value = 'first';
            els.pageNo.disabled = true;
          }
          els.status.textContent = 'PDF 已就绪，可以签署。';
        }).catch(function (e) {
          pdfInfo = null;
          els.meta.textContent = 'PDF 读取失败：' + (e.message || String(e));
          els.status.textContent = '请换一个未加密的 PDF 重试。';
        });
      }

      var imagePicker = TB.filePicker(TB.$('#psImagePicker', root), {
        accept: 'image/png,image/jpeg,image/webp,image/*',
        hint: '拖入签名图片'
      });
      imagePicker.onChange = function () {
        var item = imagePicker.files[0];
        if (!item) { signatureImage = null; return; }
        TB.readImage(item.file).then(function (r) {
          if (signatureImageUrl) URL.revokeObjectURL(signatureImageUrl);
          signatureImage = r.img;
          signatureImageUrl = r.url;
        }).catch(function (e) { TB.toast(e.message); });
      };

      function setMode(next) {
        signMode = next;
        TB.$$('.tab', root).forEach(function (tab) {
          var on = tab.getAttribute('data-sign-mode') === signMode;
          tab.classList.toggle('on', on);
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        TB.$('#psDrawPane', root).hidden = signMode !== 'draw';
        TB.$('#psImagePane', root).hidden = signMode !== 'image';
        TB.$('#psTextPane', root).hidden = signMode !== 'text';
      }

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () { setMode(tab.getAttribute('data-sign-mode')); });
      });

      // 手写画布
      var padCtx = els.pad.getContext('2d');
      var drawing = false;
      var lastX = 0;
      var lastY = 0;
      var hasInk = false;

      function padPoint(e) {
        var rect = els.pad.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * els.pad.width / rect.width,
          y: (e.clientY - rect.top) * els.pad.height / rect.height
        };
      }

      function startDraw(e) {
        e.preventDefault();
        drawing = true;
        var p = padPoint(e);
        lastX = p.x;
        lastY = p.y;
        if (els.pad.setPointerCapture) els.pad.setPointerCapture(e.pointerId);
      }
      function moveDraw(e) {
        if (!drawing) return;
        e.preventDefault();
        var p = padPoint(e);
        padCtx.strokeStyle = els.ink.value;
        padCtx.lineWidth = parseFloat(els.inkWidth.value) || 2.5;
        padCtx.lineCap = 'round';
        padCtx.lineJoin = 'round';
        padCtx.beginPath();
        padCtx.moveTo(lastX, lastY);
        padCtx.lineTo(p.x, p.y);
        padCtx.stroke();
        lastX = p.x;
        lastY = p.y;
        hasInk = true;
      }
      function endDraw(e) {
        if (!drawing) return;
        drawing = false;
        if (els.pad.releasePointerCapture && e.pointerId !== undefined) {
          try { els.pad.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
      }

      els.pad.addEventListener('pointerdown', startDraw);
      els.pad.addEventListener('pointermove', moveDraw);
      els.pad.addEventListener('pointerup', endDraw);
      els.pad.addEventListener('pointercancel', endDraw);
      els.pad.addEventListener('pointerleave', endDraw);
      els.inkWidth.addEventListener('input', function () {
        els.inkWidthText.textContent = els.inkWidth.value;
      });
      TB.$('#psClearPad', root).addEventListener('click', function () {
        padCtx.clearRect(0, 0, els.pad.width, els.pad.height);
        hasInk = false;
      });

      els.page.addEventListener('change', function () {
        els.pageNo.disabled = els.page.value !== 'custom';
      });

      function getPageNo() {
        if (!pdfInfo) return 0;
        if (els.page.value === 'first') return 0;
        if (els.page.value === 'last') return pdfInfo.pages - 1;
        var n = parseInt(els.pageNo.value, 10);
        if (!n || n < 1 || n > pdfInfo.pages) throw new Error('页码必须在 1~' + pdfInfo.pages + ' 之间');
        return n - 1;
      }

      function makeImageCanvas(img) {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c;
      }

      async function sign() {
        if (!pdfInfo) { TB.toast('请先选择 PDF'); return; }
        var PDFLib = window.PDFLib;
        if (!PDFLib) { TB.toast('PDF 依赖尚未加载'); return; }
        els.status.textContent = '正在生成签名 PDF…';
        try {
          var pageIndex = getPageNo();
          var doc = pdfInfo.doc;
          var page = doc.getPages()[pageIndex];
          var pageW = page.getWidth();
          var pageH = page.getHeight();
          var margin = Math.max(0, parseFloat(els.margin.value) || 0);
          var wantWidth = Math.max(20, parseFloat(els.width.value) || 160);
          var box = null;
          var drawText = null;
          var drawFont = null;
          var drawSize = 0;

          if (signMode === 'text') {
            var text = els.text.value.trim();
            if (!text) throw new Error('请输入签名文字');
            drawFont = await doc.embedFont(PDFLib.StandardFonts[els.font.value] || PDFLib.StandardFonts.Helvetica);
            drawSize = Math.max(8, parseFloat(els.fontSize.value) || 18);
            var textWidth = drawFont.widthOfTextAtSize(text, drawSize);
            box = {
              width: Math.min(textWidth, pageW - margin * 2),
              height: drawSize * 1.25
            };
            drawText = text;
          } else {
            var sourceCanvas;
            if (signMode === 'draw') {
              if (!hasInk) throw new Error('请先在画布上签名');
              sourceCanvas = trimCanvas(els.pad);
              if (!sourceCanvas) throw new Error('没有检测到笔迹');
            } else {
              if (!signatureImage) throw new Error('请先选择签名图片');
              sourceCanvas = trimCanvas(makeImageCanvas(signatureImage)) || makeImageCanvas(signatureImage);
            }
            var blob = await blobOf(sourceCanvas);
            var pngBytes = await arrayBufferOf(blob);
            var png = await doc.embedPng(pngBytes);
            var width = Math.min(wantWidth, pageW - margin * 2);
            var height = width * png.height / png.width;
            if (height > pageH - margin * 2) {
              height = pageH - margin * 2;
              width = height * png.width / png.height;
            }
            box = { width: width, height: height, png: png };
          }

          if (box.width > pageW - margin * 2) box.width = pageW - margin * 2;
          if (box.height > pageH - margin * 2) box.height = pageH - margin * 2;
          var where = els.where.value;
          var x, y;
          if (where === 'bl' || where === 'tl') x = margin;
          else if (where === 'bc' || where === 'tc') x = (pageW - box.width) / 2;
          else x = pageW - margin - box.width;
          if (where === 'tl' || where === 'tc' || where === 'tr') y = pageH - margin - box.height;
          else y = margin;

          if (box.png) {
            page.drawImage(box.png, { x: x, y: y, width: box.width, height: box.height });
          } else {
            page.drawText(drawText, {
              x: x,
              y: y + (box.height - drawSize) / 2,
              size: drawSize,
              font: drawFont,
              color: PDFLib.rgb(0.12, 0.16, 0.22)
            });
          }
          var bytes = await doc.save();
          var base = pdfInfo.name.replace(/\.pdf$/i, '') || 'document';
          TB.download(new Blob([bytes], { type: 'application/pdf' }), base + '-已签名.pdf');
          els.status.textContent = '已签署第 ' + (pageIndex + 1) + ' 页并开始下载。';
        } catch (e) {
          var msg = e && e.message ? e.message : String(e);
          if (/WinAnsi|encode|U\+/i.test(msg)) msg = '文字签名包含内置字体不支持的字符（如中文），请改用手写或图片签名。';
          els.status.textContent = '签署失败：' + msg;
          TB.toast('签署失败：' + msg);
        }
      }

      TB.$('#psSign', root).addEventListener('click', sign);
      setMode('draw');
    }
  });
})();
