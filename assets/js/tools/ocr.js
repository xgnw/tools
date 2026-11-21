/* =============================================================================
 * 图片 / 扫描 PDF OCR
 * -----------------------------------------------------------------------------
 * 选择图片或扫描版 PDF，在本机用 Tesseract.js 识别中英文。
 * 语言包、core 与 wasm 全部放在 assets/lib，第一次识别时才会下载。
 * PDF 会先用 pdf.js 渲染成页面图片，再交给 OCR；整个过程不上传文件。
 * ========================================================================== */
(function () {
  'use strict';

  var LANG_LABEL = {
    'eng+chi_sim': '中文 + 英文',
    'chi_sim': '简体中文',
    'eng': '英文'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseRange(text, max) {
    var raw = String(text || '').trim();
    if (!raw) return { list: null, label: '全部页面' };
    var set = {};
    raw.split(',').forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a > b) { var t = a; a = b; b = t; }
        for (var i = Math.max(1, a); i <= Math.min(max, b); i++) set[i] = 1;
      } else if (/^\d+$/.test(part)) {
        var n = parseInt(part, 10);
        if (n >= 1 && n <= max) set[n] = 1;
      }
    });
    var list = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    if (!list.length) throw new Error('页码范围无效，请用 1-3,5 这样的格式');
    return { list: list, label: list.join(', ') };
  }

  function canvasFromImage(img, enhance) {
    var max = 2400;
    var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.max(1, Math.round(img.naturalWidth * scale));
    var h = Math.max(1, Math.round(img.naturalHeight * scale));
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var g = c.getContext('2d');
    if (enhance && 'filter' in g) g.filter = 'grayscale(1) contrast(1.22)';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    return c;
  }

  /* 给单页渲染加超时保护：极复杂的矢量 PDF 仍可能渲染很久，
     超时后主动 cancel，避免界面永远停在“正在解析 PDF”。 */
  function renderWithTimeout(renderTask, ms, pageNo) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        try { renderTask.cancel(); } catch (e) { /* 忽略取消异常 */ }
        reject(new Error('第 ' + pageNo + ' 页渲染超过 ' + Math.round(ms / 1000) + ' 秒，请降低渲染精度或拆分 PDF 后重试'));
      }, ms);
      renderTask.promise.then(function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      }, function (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function pdfToCanvases(file, rangeText, scaleOpt, enhance) {
    return TB.loadLib('pdf.min.js').then(function () {
      var lib = window.pdfjsLib;
      if (!lib) throw new Error('pdf.js 未正确挂载');
      lib.GlobalWorkerOptions.workerSrc = 'assets/lib/pdf.worker.min.js';
      return TB.readArrayBuffer(file).then(function (buf) {
        return lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
      }).then(function (pdf) {
        var wanted = parseRange(rangeText, pdf.numPages);
        var pages = wanted.list || Array.from({ length: pdf.numPages }, function (_, i) { return i + 1; });
        if (pages.length > 20) throw new Error('一次最多识别 20 页，请缩小页码范围');
        var out = [];
        return pages.reduce(function (chain, n) {
          return chain.then(function () {
            return pdf.getPage(n).then(function (page) {
              var base = page.getViewport({ scale: 1 });
              var scale = Math.min(scaleOpt, 2600 / Math.max(base.width, base.height));
              var viewport = page.getViewport({ scale: Math.max(1, scale) });
              var c = document.createElement('canvas');
              c.width = Math.max(1, Math.floor(viewport.width));
              c.height = Math.max(1, Math.floor(viewport.height));
              var g = c.getContext('2d');
              g.fillStyle = '#fff';
              g.fillRect(0, 0, c.width, c.height);
              /* intent:'print' 让 pdf.js 同步分块渲染，不依赖 requestAnimationFrame。
                 默认的 'display' 在后台标签页会被浏览器节流，页面的 render.promise 可能永远不返回。 */
              var render = page.render({ canvasContext: g, viewport: viewport, intent: 'print' });
              return renderWithTimeout(render, 45000, n).then(function () {
                if (enhance && 'filter' in g) {
                  var copy = document.createElement('canvas');
                  copy.width = c.width; copy.height = c.height;
                  var cg = copy.getContext('2d');
                  cg.filter = 'grayscale(1) contrast(1.18)';
                  cg.drawImage(c, 0, 0);
                  c = copy;
                }
                out.push({ page: n, canvas: c });
              });
            });
          });
        }, Promise.resolve()).then(function () { return out; });
      });
    });
  }

  TB.def({
    slug: 'ocr',
    cat: 'image',
    name: '图片 / 扫描 PDF OCR',
    desc: '在浏览器里识别图片和扫描 PDF 的中英文，导出文本，文件不上传。',
    icon: '🔎',
    kw: 'OCR 图片识别 文字识别 扫描 PDF 中文 英文 Tesseract 提取文字',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择文件 <span class="hint">图片或扫描 PDF，单次最多 20 页</span></div>' +
          '<div id="ocrDrop"></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<div class="field"><div class="label">识别语言</div><select class="select" id="ocrLang">' +
              '<option value="eng+chi_sim">中文 + 英文（推荐）</option>' +
              '<option value="chi_sim">简体中文</option>' +
              '<option value="eng">英文</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">PDF 渲染精度</div><select class="select" id="ocrScale">' +
              '<option value="1.6">标准（速度快）</option>' +
              '<option value="2" selected>清晰（推荐）</option>' +
              '<option value="2.6">高清（较慢）</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">PDF 页码</div><input class="input" id="ocrRange" placeholder="留空识别全部，例如 1-3,5"></div>' +
          '</div>' +
          '<div class="checks"><label><input type="checkbox" id="ocrEnhance" checked> 灰度 + 对比度增强（适合照片和低清扫描件）</label></div>' +
          '<div class="btns"><button class="btn primary" id="ocrRun" type="button" disabled>开始识别</button>' +
            '<button class="btn" id="ocrClear" type="button">清空结果</button></div>' +
          '<p class="note" id="ocrHint" style="margin-bottom:0">第一次识别会加载语言包（中文约 1.7 MB、英文约 1.9 MB，已压缩），之后同一语言会复用。</p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">识别进度</div>' +
          '<div class="ocr-progress"><div class="ocr-progress-bar" id="ocrBar" style="width:0%"></div></div>' +
          '<div class="ocr-status" id="ocrStatus">等待选择文件</div>' +
          '<div class="ocr-pages" id="ocrPages"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">识别结果 <span class="hint">可以直接修改后复制或下载</span></div>' +
          '<textarea class="textarea ocr-output" id="ocrText" rows="14" spellcheck="false" placeholder="识别出的文字会出现在这里"></textarea>' +
          '<div class="btns"><button class="btn" id="ocrCopy" type="button">复制全文</button>' +
            '<button class="btn" id="ocrDownload" type="button">下载 TXT</button></div>' +
        '</div>' +
        '<p class="note">OCR 模型和图片都在你的浏览器内运行。识别质量取决于扫描清晰度；倾斜、反光或手写体可能需要先裁剪和增强。</p>';

      var drop = TB.$('#ocrDrop', root);
      var langEl = TB.$('#ocrLang', root);
      var scaleEl = TB.$('#ocrScale', root);
      var rangeEl = TB.$('#ocrRange', root);
      var enhanceEl = TB.$('#ocrEnhance', root);
      var runBtn = TB.$('#ocrRun', root);
      var clearBtn = TB.$('#ocrClear', root);
      var barEl = TB.$('#ocrBar', root);
      var statusEl = TB.$('#ocrStatus', root);
      var pagesEl = TB.$('#ocrPages', root);
      var textEl = TB.$('#ocrText', root);
      var hintEl = TB.$('#ocrHint', root);

      var picker = TB.filePicker(drop, {
        accept: 'image/*,.pdf,application/pdf',
        multiple: true,
        hint: '支持 PNG / JPG / WebP / PDF，可多选'
      });
      var busy = false;
      var runId = 0;
      var workerPromise = null;
      var workerLang = '';
      var workerToken = 0;
      var currentLogger = null;

      picker.onChange = function () {
        runBtn.disabled = !picker.files.length || busy;
        statusEl.textContent = picker.files.length ? ('已选择 ' + picker.files.length + ' 个文件，点击“开始识别”') : '等待选择文件';
        if (!picker.files.length) pagesEl.innerHTML = '';
      };

      function setProgress(p, label) {
        barEl.style.width = Math.max(0, Math.min(100, p)) + '%';
        if (label) statusEl.textContent = label;
      }

      function workerOptions() {
        var base = location.href.replace(/#.*$/, '');
        return {
          workerPath: new URL('assets/lib/tesseract.worker.min.js', base).href,
          corePath: new URL('assets/lib/tesseract-core-simd-lstm.wasm.js', base).href,
          langPath: new URL('assets/lib/tessdata', base).href,
          gzip: true,
          workerBlobURL: true,
          logger: function (m) {
            if (currentLogger) currentLogger(m);
          }
        };
      }

      function getWorker(lang) {
        if (workerPromise && workerLang === lang) return workerPromise;
        var token = ++workerToken;
        if (workerPromise) {
          workerPromise.then(function (w) { try { w.terminate(); } catch (e) {} }).catch(function () {});
        }
        workerLang = lang;
        setProgress(2, '正在准备 OCR 引擎…');
        workerPromise = window.Tesseract.createWorker(lang, 1, workerOptions()).catch(function (e) {
          if (token === workerToken) { workerPromise = null; workerLang = ''; }
          throw e;
        });
        return workerPromise;
      }

      function statusLabel(m) {
        if (!m) return '';
        if (m.status === 'recognizing text') return '正在识别文字';
        if (m.status === 'loading tesseract core') return '正在加载 OCR 核心';
        if (m.status === 'initializing tesseract') return '正在初始化引擎';
        if (m.status === 'loading language traineddata') return '正在加载语言包';
        if (m.status === 'initializing api') return '正在准备语言模型';
        return m.status || '';
      }

      function resetResults() {
        textEl.value = '';
        pagesEl.innerHTML = '';
        setProgress(0, '准备中…');
      }

      function run() {
        if (busy || !picker.files.length) return;
        busy = true;
        var id = ++runId;
        runBtn.disabled = true;
        clearBtn.disabled = true;
        resetResults();

        var files = picker.files.map(function (x) { return x.file; });
        var lang = langEl.value;
        var pages = [];
        var langLabel = LANG_LABEL[lang] || lang;

        // Tesseract 主库按需加载；core / worker / 语言包由 createWorker 再拉取
        var prep = window.Tesseract ? Promise.resolve() : TB.loadLib('tesseract.min.js').then(function () {
          if (!window.Tesseract) throw new Error('OCR 引擎未正确挂载');
          setProgress(3, 'OCR 引擎已加载，正在准备文件…');
        });

        // 先把所有文件拆成“待识别页”，PDF 需要先渲染
        var pdfIndex = 0;
        files.forEach(function (file, fi) {
          prep = prep.then(function () {
            if (id !== runId) return;
            if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
              pdfIndex++;
              setProgress(4, '正在解析 PDF：' + file.name);
              return pdfToCanvases(file, rangeEl.value, parseFloat(scaleEl.value), enhanceEl.checked).then(function (list) {
                list.forEach(function (item) {
                  pages.push({ name: file.name + ' · 第 ' + item.page + ' 页', canvas: item.canvas, file: file });
                });
              });
            }
            setProgress(8 + fi * 2, '正在读取图片：' + file.name);
            return TB.readImage(file).then(function (o) {
              pages.push({ name: file.name, canvas: canvasFromImage(o.img, enhanceEl.checked), file: file });
              URL.revokeObjectURL(o.url);
            });
          });
        });

        prep.then(function () {
          if (id !== runId) return;
          if (!pages.length) throw new Error('没有可识别的页面');
          setProgress(10, '共 ' + pages.length + ' 页，正在加载 ' + langLabel + ' 识别引擎…');
          return getWorker(lang);
        }).then(function (worker) {
          if (id !== runId) return;
          var list = [];
          var chain = Promise.resolve();
          pages.forEach(function (page, index) {
            chain = chain.then(function () {
              if (id !== runId) throw new Error('已取消');
              var base = 10 + (index / pages.length) * 84;
              var span = 84 / pages.length;
              currentLogger = function (m) {
                if (id !== runId) return;
                var p = m && typeof m.progress === 'number' ? m.progress : 0;
                setProgress(base + p * span, '第 ' + (index + 1) + '/' + pages.length + ' 页 · ' + statusLabel(m) + ' ' + Math.round(p * 100) + '%');
              };
              return worker.recognize(page.canvas).then(function (result) {
                var text = (result && result.data && result.data.text ? result.data.text : '').replace(/\n{3,}/g, '\n\n').trim();
                list.push({ name: page.name, text: text });
                var item = document.createElement('div');
                item.className = 'ocr-page-item';
                item.innerHTML = '<b>' + esc(page.name) + '</b><span>' + (text ? text.length + ' 字' : '未识别到文字') + '</span>';
                pagesEl.appendChild(item);
                if (text) {
                  textEl.value += (textEl.value ? '\n\n' : '') + '===== ' + page.name + ' =====\n' + text;
                  textEl.scrollTop = textEl.scrollHeight;
                }
              });
            });
          });
          return chain.then(function () {
            currentLogger = null;
            if (id !== runId) return;
            var chars = textEl.value.replace(/\s/g, '').length;
            setProgress(100, '识别完成：' + list.length + ' 页，共 ' + chars + ' 字');
            if (!textEl.value.trim()) {
              textEl.value = '没有识别到文字。可以尝试提高 PDF 渲染精度、勾选灰度增强，或换一张更清晰的图片。';
            }
          });
        }).catch(function (e) {
          if (id !== runId) return;
          console.error(e);
          setProgress(100, '识别失败');
          hintEl.innerHTML = '<span class="result-err">识别失败：' + esc(e.message || e) + '</span>';
        }).then(function () {
          if (id !== runId) return;
          busy = false;
          runBtn.disabled = !picker.files.length;
          clearBtn.disabled = false;
        });
      }

      function clearAll() {
        if (busy) return;
        runId++;
        textEl.value = '';
        pagesEl.innerHTML = '';
        setProgress(0, picker.files.length ? '已选择文件，点击“开始识别”' : '等待选择文件');
      }

      runBtn.addEventListener('click', run);
      clearBtn.addEventListener('click', clearAll);
      TB.$('#ocrCopy', root).addEventListener('click', function () {
        if (!textEl.value) { TB.toast('还没有可复制的内容'); return; }
        TB.copy(textEl.value);
      });
      TB.$('#ocrDownload', root).addEventListener('click', function () {
        if (!textEl.value.trim()) { TB.toast('还没有可下载的内容'); return; }
        TB.downloadText(textEl.value, 'OCR-识别结果.txt', 'text/plain');
      });

      // 语言变化时丢弃旧 worker，下一次识别重新加载对应语言包
      langEl.addEventListener('change', function () {
        if (!workerPromise || busy) return;
        workerPromise.then(function (w) { try { w.terminate(); } catch (e) {} }).catch(function () {});
        workerPromise = null;
        workerLang = '';
      });
    }
  });
})();
