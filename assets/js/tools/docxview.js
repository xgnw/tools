/* =============================================================================
 * Word 文档预览
 * -----------------------------------------------------------------------------
 * 上传 .docx，在页面里渲染成接近 Word 的分页效果，可另存为自包含 HTML。
 * 图片会转成 base64 内嵌，导出的 HTML 离线也能查看；不使用 iframe。
 * 依赖：JSZip + docx-preview（Apache-2.0）。
 * ========================================================================== */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sanitize(host) {
    host.querySelectorAll('script, iframe, object, embed, form').forEach(function (n) { n.remove(); });
    host.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name)) el.removeAttribute(a.name);
        if ((a.name === 'href' || a.name === 'xlink:href' || a.name === 'src') && /^\s*javascript:/i.test(a.value)) {
          el.removeAttribute(a.name);
        }
      });
    });
    host.querySelectorAll('a').forEach(function (a) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  TB.def({
    slug: 'docxview',
    cat: 'office',
    name: 'Word 文档预览',
    desc: '上传 DOCX 在浏览器里查看分页效果，保留样式并导出可离线打开的 HTML。',
    icon: '📄',
    kw: 'Word docx 预览 查看 文档 转换 HTML docx-preview 不上传',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择 Word 文档 <span class="hint">仅支持 .docx，.doc 请先另存为 .docx</span></div>' +
          '<div id="docxDrop"></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<div class="field"><div class="label">缩放 <b id="docxZoomVal">100</b>%</div><input type="range" id="docxZoom" min="40" max="160" value="100"></div>' +
            '<div class="field"><div class="label">渲染选项</div><div class="checks" style="padding-top:6px">' +
              '<label><input type="checkbox" id="docxHeaders" checked> 显示页眉页脚</label>' +
              '<label><input type="checkbox" id="docxComments"> 显示批注</label></div></div>' +
          '</div>' +
          '<div class="btns"><button class="btn" id="docxFit" type="button">适应宽度</button>' +
            '<button class="btn" id="docxHtml" type="button" disabled>导出 HTML</button>' +
            '<button class="btn" id="docxClear" type="button">清空</button></div>' +
          '<p class="note" id="docxMsg" style="margin-bottom:0">选择文件后会自动解析，过程中不会上传到服务器。</p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">文档信息</div>' +
          '<div class="kv docx-meta" id="docxMeta">' +
            '<div class="kv-item"><div class="kv-k">文件</div><div class="kv-v">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">大小</div><div class="kv-v">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">页数</div><div class="kv-v">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">字符数</div><div class="kv-v">—</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint">浅色纸张效果，导出 HTML 会保留</span></div>' +
          '<div class="docx-stage" id="docxStage"><div class="docx-host" id="docxHost"><div class="empty" style="padding:32px">选择 .docx 后在这里预览</div></div></div>' +
        '</div>' +
        '<p class="note">渲染器支持标题、段落、表格、图片、列表、页眉页脚、分页符等常用结构。复杂浮动布局、SmartArt、嵌入视频可能与 Word 显示略有差异。</p>';

      var drop = TB.$('#docxDrop', root);
      var zoomEl = TB.$('#docxZoom', root);
      var zoomVal = TB.$('#docxZoomVal', root);
      var headersEl = TB.$('#docxHeaders', root);
      var commentsEl = TB.$('#docxComments', root);
      var msgEl = TB.$('#docxMsg', root);
      var stage = TB.$('#docxStage', root);
      var host = TB.$('#docxHost', root);
      var metaEl = TB.$('#docxMeta', root);
      var htmlBtn = TB.$('#docxHtml', root);
      var clearBtn = TB.$('#docxClear', root);

      var picker = TB.filePicker(drop, { accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', hint: '一个 .docx 文件' });
      var renderToken = 0;
      var currentFile = null;
      var rendered = false;

      function setMeta(name, size, pages, chars) {
        metaEl.innerHTML =
          '<div class="kv-item"><div class="kv-k">文件</div><div class="kv-v">' + esc(name || '—') + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">大小</div><div class="kv-v">' + (size == null ? '—' : TB.fmtBytes(size)) + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">页数</div><div class="kv-v">' + (pages == null ? '—' : pages) + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">字符数</div><div class="kv-v">' + (chars == null ? '—' : TB.num(chars, 0)) + '</div></div>';
      }

      function setZoom(z) {
        zoomEl.value = String(z);
        zoomVal.textContent = String(z);
        host.style.zoom = z / 100;
      }

      function fitWidth() {
        var z = Math.floor((stage.clientWidth - 36) / 820 * 100);
        z = Math.max(40, Math.min(120, z));
        setZoom(z);
      }

      function render() {
        var item = picker.files[0];
        if (!item) return;
        var file = item.file;
        currentFile = file;
        var token = ++renderToken;
        rendered = false;
        htmlBtn.disabled = true;
        clearBtn.disabled = true;
        host.innerHTML = '<div class="docx-loading"><span class="docx-spinner"></span>正在解析 Word 文档…</div>';
        setMeta(file.name, file.size, null, null);
        msgEl.textContent = '正在加载渲染组件…';

        TB.loadLib('jszip.min.js')
          .then(function () { return TB.loadLib('docx-preview.min.js'); })
          .then(function () {
            if (!window.docx || !window.docx.renderAsync) throw new Error('docx-preview 未正确挂载');
            if (token !== renderToken) throw new Error('已切换文件');
            msgEl.textContent = '正在读取文档结构…';
            host.innerHTML = '';
            return window.docx.renderAsync(file, host, host, {
              className: 'docx',
              inWrapper: true,
              breakPages: true,
              ignoreWidth: false,
              ignoreHeight: false,
              ignoreFonts: false,
              ignoreLastRenderedPageBreak: false,
              renderHeaders: headersEl.checked,
              renderFooters: headersEl.checked,
              renderFootnotes: headersEl.checked,
              renderEndnotes: headersEl.checked,
              renderComments: commentsEl.checked,
              renderAltChunks: false,
              useBase64URL: true,
              experimental: false
            });
          })
          .then(function () {
            if (token !== renderToken) return;
            sanitize(host);
            rendered = true;
            var pages = host.querySelectorAll('section.docx').length || host.querySelectorAll('.docx-wrapper > section').length;
            var chars = (host.innerText || host.textContent || '').replace(/\s/g, '').length;
            setMeta(file.name, file.size, pages || '—', chars);
            htmlBtn.disabled = false;
            clearBtn.disabled = false;
            msgEl.innerHTML = '<span class="result-ok">渲染完成。</span> 可以缩放查看，或导出为离线 HTML。';
            fitWidth();
          })
          .catch(function (e) {
            if (token !== renderToken) return;
            console.error(e);
            rendered = false;
            htmlBtn.disabled = true;
            clearBtn.disabled = false;
            host.innerHTML = '<div class="docx-error"><b>无法预览这个文件</b><p>' + esc(e.message || e) + '</p><p>请确认文件是有效的 .docx，而不是改了扩展名的 .doc 或加密文档。</p></div>';
            msgEl.innerHTML = '<span class="result-err">解析失败：' + esc(e.message || e) + '</span>';
          });
      }

      function exportHtml() {
        if (!rendered) return;
        var clone = host.cloneNode(true);
        var styles = '';
        // 把 docx-preview 注入的样式移到 head，正文只保留内容
        Array.prototype.slice.call(clone.querySelectorAll('style')).forEach(function (s) {
          styles += s.outerHTML;
          s.remove();
        });
        var name = (currentFile ? currentFile.name.replace(/\.docx$/i, '') : 'Word 文档');
        var html = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
          '<title>' + esc(name) + ' - Word 预览</title>\n' +
          '<style>\n' +
          'html,body{margin:0;background:#eef1f5;color:#222;font-family:"Microsoft YaHei",Arial,sans-serif;}\n' +
          'body{padding:20px 0;}\n' +
          '.docx-wrapper{background:#eef1f5;padding:0 12px 24px;}\n' +
          '.docx-wrapper>section.docx{box-shadow:0 2px 14px rgba(20,35,60,.12);margin:0 auto 18px;}\n' +
          '@media(max-width:760px){.docx-wrapper{padding:0 6px 18px;}section.docx{transform-origin:top left;}}\n' +
          '@media print{body{background:#fff;padding:0}.docx-wrapper{background:#fff;padding:0}.docx-wrapper>section.docx{box-shadow:none;margin:0;}}\n' +
          '</style>\n' + styles + '\n</head>\n<body>\n' + clone.innerHTML + '\n</body>\n</html>';
        TB.download(new Blob([html], { type: 'text/html;charset=utf-8' }), name + '-预览.html');
      }

      picker.onChange = function () {
        if (picker.files.length) render();
        else if (!rendered) setMeta(null, null, null, null);
      };
      headersEl.addEventListener('change', function () { if (picker.files.length) render(); });
      commentsEl.addEventListener('change', function () { if (picker.files.length) render(); });
      zoomEl.addEventListener('input', function () {
        var z = parseInt(zoomEl.value, 10) || 100;
        zoomVal.textContent = String(z);
        host.style.zoom = z / 100;
      });
      TB.$('#docxFit', root).addEventListener('click', fitWidth);
      htmlBtn.addEventListener('click', exportHtml);
      clearBtn.addEventListener('click', function () {
        if (!picker.files.length) return;
        picker.clear();
        renderToken++;
        rendered = false;
        currentFile = null;
        host.innerHTML = '<div class="empty" style="padding:32px">选择 .docx 后在这里预览</div>';
        setMeta(null, null, null, null);
        htmlBtn.disabled = true;
        clearBtn.disabled = true;
        msgEl.textContent = '已清空。选择文件后会自动解析。';
      });

      if (window.ResizeObserver) {
        var ro = new ResizeObserver(TB.debounce(function () {
          if (rendered) fitWidth();
        }, 180));
        ro.observe(stage);
      }
    }
  });
})();
