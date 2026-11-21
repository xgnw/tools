/* =============================================================================
 * Mermaid 图表
 * -----------------------------------------------------------------------------
 * 输入 Mermaid 文本，实时渲染流程图、时序图、类图、ER 图、甘特图、思维导图等。
 * 支持导出 SVG / PNG，纯前端，不上传文本。
 * 依赖：Mermaid（MIT），按需加载。
 * ========================================================================== */
(function () {
  'use strict';

  var EXAMPLES = {
    flow: 'graph TD\n' +
      '  A[打开简单工具箱] --> B{要处理什么？}\n' +
      '  B -->|图片| C[压缩 / 裁剪 / OCR]\n' +
      '  B -->|文档| D[PDF 合并 / Word 预览]\n' +
      '  B -->|数据| E[CSV / SQLite / 图表]\n' +
      '  C --> F[本地处理完成]\n' +
      '  D --> F\n' +
      '  E --> F\n' +
      '  F --> G[下载结果]\n' +
      '  classDef hot fill:#2F6BFF,color:#fff,stroke:#2F6BFF;\n' +
      '  class A,G hot;',
    sequence: 'sequenceDiagram\n' +
      '  participant U as 用户\n' +
      '  participant B as 浏览器\n' +
      '  participant W as WebAssembly\n' +
      '  U->>B: 选择本地文件\n' +
      '  B->>B: 读取为 ArrayBuffer\n' +
      '  B->>W: 调用处理模块\n' +
      '  W-->>B: 返回结果\n' +
      '  B-->>U: 生成下载链接\n' +
      '  Note over U,W: 文件全程不离开设备',
    klass: 'classDiagram\n' +
      '  class Tool {\n' +
      '    +String slug\n' +
      '    +String name\n' +
      '    +render(ctx)\n' +
      '  }\n' +
      '  class PdfTool {\n' +
      '    +merge()\n' +
      '    +split()\n' +
      '  }\n' +
      '  class ImageTool {\n' +
      '    +compress()\n' +
      '    +crop()\n' +
      '  }\n' +
      '  Tool <|-- PdfTool\n' +
      '  Tool <|-- ImageTool',
    er: 'erDiagram\n' +
      '  USER ||--o{ ORDER : places\n' +
      '  ORDER ||--|{ ORDER_ITEM : contains\n' +
      '  PRODUCT ||--o{ ORDER_ITEM : included\n' +
      '  USER {\n' +
      '    string id\n' +
      '    string name\n' +
      '  }\n' +
      '  ORDER {\n' +
      '    string id\n' +
      '    date created_at\n' +
      '    float total\n' +
      '  }\n' +
      '  PRODUCT {\n' +
      '    string sku\n' +
      '    float price\n' +
      '  }',
    gantt: 'gantt\n' +
      '  title 简单工具箱迭代计划\n' +
      '  dateFormat  YYYY-MM-DD\n' +
      '  axisFormat  %m/%d\n' +
      '  section 调研\n' +
      '  整理候选工具       :done, a1, 2026-11-02, 4d\n' +
      '  许可与体积评估     :done, a2, after a1, 3d\n' +
      '  section 开发\n' +
      '  PPT / 图表         :active, b1, 2026-11-10, 5d\n' +
      '  OCR / SQLite       :b2, after b1, 5d\n' +
      '  section 发布\n' +
      '  浏览器验收         :c1, after b2, 2d\n' +
      '  部署到 Pages       :c2, after c1, 1d',
    mindmap: 'mindmap\n' +
      '  root((简单工具箱))\n' +
      '    办公\n' +
      '      PDF 工具\n' +
      '      PPT 生成\n' +
      '      Word 预览\n' +
      '    图片\n' +
      '      压缩裁剪\n' +
      '      OCR\n' +
      '      截图美化\n' +
      '    数据\n' +
      '      CSV\n' +
      '      SQLite\n' +
      '      图表'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function themeName() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
  }

  function sanitizeSvg(svg) {
    var box = document.createElement('div');
    box.innerHTML = svg;
    box.querySelectorAll('script, iframe, object, embed').forEach(function (n) { n.remove(); });
    box.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name)) el.removeAttribute(a.name);
        if ((a.name === 'href' || a.name === 'xlink:href') && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
      });
    });
    var node = box.querySelector('svg');
    return node;
  }

  TB.def({
    slug: 'mermaid',
    cat: 'doc',
    name: 'Mermaid 图表',
    desc: '用文本画流程图、时序图、类图、ER 图、甘特图和思维导图，导出 SVG / PNG。',
    icon: '🧩',
    kw: 'Mermaid 流程图 时序图 类图 ER 甘特图 思维导图 diagram 代码绘图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">Mermaid 代码 <span class="hint">支持 flowchart / sequence / class / ER / gantt / mindmap</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">示例模板</div><select class="select" id="mmdExample">' +
              '<option value="flow">流程图</option><option value="sequence">时序图</option>' +
              '<option value="klass">类图</option><option value="er">ER 图</option>' +
              '<option value="gantt">甘特图</option><option value="mindmap">思维导图</option></select></div>' +
            '<div class="field"><div class="label">缩放 <b id="mmdZoomVal">100</b>%</div><input type="range" id="mmdZoom" min="50" max="200" value="100"></div>' +
          '</div>' +
          '<div class="field"><div class="label">代码 <span class="hint" id="mmdStatus">等待渲染</span></div>' +
            '<textarea class="textarea mmd-code" id="mmdCode" rows="12" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="mmdRender" type="button">重新渲染</button>' +
            '<button class="btn" id="mmdCopy" type="button">复制代码</button>' +
            '<button class="btn" id="mmdSvg" type="button" disabled>导出 SVG</button>' +
            '<button class="btn" id="mmdPng" type="button" disabled>导出 PNG</button></div>' +
          '<p class="note" id="mmdMsg" style="margin-bottom:0">Mermaid 会先解析语法，错误位置会显示在下方预览区。</p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint">导出 PNG 默认按 2 倍分辨率</span></div>' +
          '<div class="mmd-stage" id="mmdStage"><div class="mmd-canvas" id="mmdCanvas"><div class="mmd-empty">正在准备预览…</div></div></div>' +
        '</div>' +
        '<p class="note">图表标签文字会按当前主题渲染。Mermaid 代码只在本地解析，不会发送到任何服务器；复杂图表建议控制在 100 个节点以内。</p>';

      var exampleEl = TB.$('#mmdExample', root);
      var zoomEl = TB.$('#mmdZoom', root);
      var zoomVal = TB.$('#mmdZoomVal', root);
      var codeEl = TB.$('#mmdCode', root);
      var statusEl = TB.$('#mmdStatus', root);
      var msgEl = TB.$('#mmdMsg', root);
      var stage = TB.$('#mmdStage', root);
      var canvasHost = TB.$('#mmdCanvas', root);
      var svgBtn = TB.$('#mmdSvg', root);
      var pngBtn = TB.$('#mmdPng', root);

      var mermaidReady = false;
      var renderToken = 0;
      var currentSvg = null;
      var currentCode = '';

      function initializeMermaid() {
        if (!window.mermaid) throw new Error('Mermaid 未正确挂载');
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          htmlLabels: false,
          theme: themeName(),
          fontFamily: 'system-ui, -apple-system, "Microsoft YaHei", sans-serif',
          flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true, mirrorActors: false },
          gantt: { useMaxWidth: true, topAxis: false },
          mindmap: { useMaxWidth: true },
          themeVariables: themeName() === 'dark' ? {
            background: '#151A22', primaryColor: '#24344F', primaryTextColor: '#F4F7FF',
            primaryBorderColor: '#6EA8FF', lineColor: '#6C7A90', secondaryColor: '#1C283B',
            tertiaryColor: '#101725', fontSize: '14px'
          } : {
            background: '#FFFFFF', primaryColor: '#E8F0FF', primaryTextColor: '#172033',
            primaryBorderColor: '#2F6BFF', lineColor: '#7A8699', secondaryColor: '#F4F7FC',
            tertiaryColor: '#FFF9F2', fontSize: '14px'
          }
        });
      }

      function loadMermaid() {
        if (mermaidReady && window.mermaid) return Promise.resolve();
        statusEl.textContent = '正在加载 Mermaid（约 5.5 MB）…';
        msgEl.textContent = '第一次渲染需要加载 Mermaid 引擎，之后会复用。';
        return TB.loadLib('mermaid.min.js').then(function () {
          initializeMermaid();
          mermaidReady = true;
          msgEl.textContent = '';
        });
      }

      function setEmpty(text) {
        canvasHost.innerHTML = '<div class="mmd-empty">' + esc(text) + '</div>';
      }

      function render() {
        var code = codeEl.value.trim();
        currentCode = code;
        if (!code) {
          currentSvg = null;
          svgBtn.disabled = true;
          pngBtn.disabled = true;
          setEmpty('在左侧输入 Mermaid 代码');
          statusEl.textContent = '等待输入';
          return;
        }
        var token = ++renderToken;
        statusEl.textContent = '正在渲染…';
        loadMermaid().then(function () {
          if (token !== renderToken) return;
          return window.mermaid.parse(code);
        }).then(function () {
          if (token !== renderToken) return;
          return window.mermaid.render('mmdSvg_' + token, code);
        }).then(function (result) {
          if (token !== renderToken) return;
          var svg = sanitizeSvg(result.svg);
          if (!svg) throw new Error('渲染结果不是有效的 SVG');
          canvasHost.innerHTML = '';
          canvasHost.appendChild(svg);
          currentSvg = svg;
          if (result.bindFunctions) {
            try { result.bindFunctions(canvasHost); } catch (e) {}
          }
          svgBtn.disabled = false;
          pngBtn.disabled = false;
          statusEl.textContent = '渲染成功';
          msgEl.innerHTML = '<span class="result-ok">渲染完成。</span> 缩放会实时生效，导出 SVG 保留矢量。';
          applyZoom();
        }).catch(function (e) {
          if (token !== renderToken) return;
          console.error(e);
          currentSvg = null;
          svgBtn.disabled = true;
          pngBtn.disabled = true;
          var message = e && e.message ? e.message : String(e);
          canvasHost.innerHTML = '<div class="mmd-error"><b>语法或渲染错误</b><pre>' + esc(message) + '</pre></div>';
          statusEl.textContent = '渲染失败';
          msgEl.innerHTML = '<span class="result-err">请根据上方错误提示修改代码。</span>';
        });
      }

      function applyZoom() {
        var z = parseInt(zoomEl.value, 10) || 100;
        zoomVal.textContent = String(z);
        // CSS zoom 会连带布局尺寸一起缩放，滚动容器负责出现滚动条
        canvasHost.style.zoom = z / 100;
        canvasHost.style.minWidth = '0';
      }

      function downloadSvg() {
        if (!currentSvg) return;
        var clone = currentSvg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        var source = new XMLSerializer().serializeToString(clone);
        TB.download(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), 'Mermaid-图表.svg');
      }

      function downloadPng() {
        if (!currentSvg) return;
        var clone = currentSvg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        var vb = currentSvg.viewBox && currentSvg.viewBox.baseVal;
        var w = vb && vb.width ? vb.width : 1200;
        var h = vb && vb.height ? vb.height : 800;
        var scale = Math.min(2, 2600 / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        var g = c.getContext('2d');
        g.fillStyle = themeName() === 'dark' ? '#151A22' : '#FFFFFF';
        g.fillRect(0, 0, c.width, c.height);
        var svgText = new XMLSerializer().serializeToString(clone);
        var url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
        var img = new Image();
        img.onload = function () {
          g.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (blob) {
            if (blob) TB.download(blob, 'Mermaid-图表.png');
            else TB.toast('PNG 导出失败，可改用 SVG');
          }, 'image/png');
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          TB.toast('PNG 导出失败，可改用 SVG');
        };
        img.src = url;
      }

      function loadExample() {
        codeEl.value = EXAMPLES[exampleEl.value] || EXAMPLES.flow;
        render();
      }

      codeEl.value = EXAMPLES.flow;
      render();

      var debounced = TB.debounce(render, 650);
      codeEl.addEventListener('input', debounced);
      exampleEl.addEventListener('change', loadExample);
      zoomEl.addEventListener('input', applyZoom);
      TB.$('#mmdRender', root).addEventListener('click', render);
      TB.$('#mmdCopy', root).addEventListener('click', function () { TB.copy(codeEl.value); });
      svgBtn.addEventListener('click', downloadSvg);
      pngBtn.addEventListener('click', downloadPng);

      // 跟随站点深浅主题重绘
      if (window.MutationObserver) {
        var mo = new MutationObserver(function () {
          if (!mermaidReady) return;
          initializeMermaid();
          render();
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
    }
  });
})();
