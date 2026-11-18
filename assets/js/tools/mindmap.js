/* =============================================================================
 * Markdown 思维导图
 * -----------------------------------------------------------------------------
 * 把 Markdown 标题和缩进列表解析成树，用 Canvas 绘制横向导图并导出 PNG。
 * 只解析结构，不执行 Markdown 里的 HTML。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '# 项目计划\n## 需求\n- 用户调研\n- 竞品分析\n## 设计\n- 信息架构\n  - 首页\n  - 工具详情\n- 视觉稿\n## 开发\n- 前端\n- 后端\n## 上线\n- 测试\n- 部署';

  function addChild(parent, text) {
    var node = { text: text, children: [], depth: (parent.depth || 0) + 1 };
    parent.children.push(node);
    return node;
  }

  function parseOutline(src) {
    var root = { text: '思维导图', children: [], depth: 0 };
    var headingStack = [];
    var listStack = [];
    var currentHeading = root;
    var hasH1 = false;
    String(src || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.replace(/\t/g, '  ');
      var h = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        var level = h[1].length;
        var text = h[2].trim();
        if (!text) return;
        if (level === 1) {
          if (!hasH1) {
            root.text = text;
            hasH1 = true;
          } else {
            addChild(root, text);
          }
          currentHeading = root;
          headingStack = [root];
          listStack = [];
          return;
        }
        var parent = headingStack[level - 1] || currentHeading || root;
        var node = addChild(parent, text);
        currentHeading = node;
        headingStack[level] = node;
        headingStack.length = level + 1;
        listStack = [];
        return;
      }
      var item = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/);
      if (item) {
        var depth = Math.floor(item[1].length / 2);
        var parent = depth > 0 ? (listStack[depth - 1] || currentHeading) : currentHeading;
        var child = addChild(parent, item[2].trim());
        listStack[depth] = child;
        listStack.length = depth + 1;
        return;
      }
      // 普通段落不进入导图，避免把说明文字误当成节点
    });
    return root;
  }

  function wrapLines(g, text, maxWidth, font) {
    g.font = font;
    var lines = [], line = '';
    var chars = Array.from(String(text || ''));
    chars.forEach(function (ch) {
      if (ch === '\n') { lines.push(line); line = ''; return; }
      var test = line + ch;
      if (g.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 4);
  }

  function prepare(node, g) {
    var font = node.depth === 0 ? '700 16px "PingFang SC", "Microsoft YaHei", sans-serif' : '600 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    node.lines = wrapLines(g, node.text, 158, font);
    node.fontSize = node.depth === 0 ? 16 : 13;
    node.lineHeight = node.depth === 0 ? 24 : 19;
    node.h = Math.max(44, node.lines.length * node.lineHeight + 18);
    node.w = 182;
    node.children.forEach(function (c) { prepare(c, g); });
  }

  function subtreeHeight(node) {
    var total = 0;
    node.children.forEach(function (c) { total += subtreeHeight(c) + 12; });
    node.subH = Math.max(node.h, total ? total - 12 : 0);
    return node.subH;
  }

  function place(node, x, top) {
    node.x = x;
    node.y = top + node.subH / 2;
    var y = top;
    node.children.forEach(function (c) {
      place(c, x + 248, y);
      y += c.subH + 12;
    });
    node.maxRight = node.x + node.w;
    node.children.forEach(function (c) { node.maxRight = Math.max(node.maxRight, c.maxRight); });
  }

  function drawNode(g, node) {
    var fill = node.depth === 0 ? '#0f3d5e' : (node.depth === 1 ? '#e8f3fa' : '#f5f8fb');
    var stroke = node.depth === 0 ? '#0f3d5e' : '#c8d9e6';
    var color = node.depth === 0 ? '#ffffff' : '#17324a';
    var x = node.x, y = node.y - node.h / 2;
    g.fillStyle = fill;
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, node.w, node.h, 10); else g.rect(x, y, node.w, node.h);
    g.fill();
    g.stroke();
    g.fillStyle = color;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = (node.depth === 0 ? '700 16px' : '600 13px') + ' "PingFang SC", "Microsoft YaHei", sans-serif';
    var startY = node.y - ((node.lines.length - 1) * node.lineHeight) / 2;
    node.lines.forEach(function (line, i) {
      g.fillText(line, x + 12, startY + i * node.lineHeight);
    });
  }

  function drawConnector(g, parent, child) {
    g.strokeStyle = '#9fbdd3';
    g.lineWidth = 1.6;
    g.beginPath();
    var x1 = parent.x + parent.w, y1 = parent.y;
    var x2 = child.x, y2 = child.y;
    var mid = (x1 + x2) / 2;
    g.moveTo(x1, y1);
    g.bezierCurveTo(mid, y1, mid, y2, x2, y2);
    g.stroke();
  }

  TB.def({
    slug: 'mindmap',
    cat: 'doc',
    name: 'Markdown 思维导图',
    desc: '把 Markdown 标题和列表转成树状思维导图，导出 PNG。',
    icon: '🧠',
    kw: '思维导图 markdown 脑图 大纲 结构图 导出 png',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">Markdown 大纲 <span class="hint"># 标题作为节点，缩进列表作为子节点</span></div>' +
          '<div class="field"><textarea class="input codeIn" id="mmInput" rows="9" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="mmRun" type="button">生成导图</button>' +
            '<button class="btn" id="mmSample" type="button">载入示例</button>' +
            '<button class="btn" id="mmDownload" type="button" disabled>下载 PNG</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint" id="mmInfo">等待生成</span></div>' +
          '<div class="preview" id="mmPreview" style="min-height:220px;overflow:auto;background:var(--surface-2)"></div></div>' +
        '<p class="note">只读取标题层级和列表缩进，不渲染 Markdown 的 HTML；普通段落会被忽略。节点较多时建议减少层级，导图会自动放大画布。</p>';

      var input = TB.$('#mmInput', root);
      var preview = TB.$('#mmPreview', root);
      var info = TB.$('#mmInfo', root);
      var dl = TB.$('#mmDownload', root);
      var result = null;
      input.value = SAMPLE;

      function render() {
        var tree = parseOutline(input.value);
        var measure = document.createElement('canvas').getContext('2d');
        prepare(tree, measure);
        subtreeHeight(tree);
        var padding = 28;
        place(tree, padding, padding);
        var canvas = document.createElement('canvas');
        var width = Math.max(360, tree.maxRight + padding + 30);
        var height = Math.max(160, tree.subH + padding * 2);
        canvas.width = Math.ceil(width);
        canvas.height = Math.ceil(height);
        var g = canvas.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, canvas.width, canvas.height);
        place(tree, padding, padding);
        (function walk(n) { n.children.forEach(function (c) { drawConnector(g, n, c); walk(c); }); })(tree);
        (function drawAll(n) { drawNode(g, n); n.children.forEach(drawAll); })(tree);
        result = canvas;
        preview.innerHTML = '';
        var pc = document.createElement('canvas');
        var scale = Math.min(1, 900 / canvas.width);
        pc.width = Math.round(canvas.width * scale);
        pc.height = Math.round(canvas.height * scale);
        var pg = pc.getContext('2d');
        pg.drawImage(canvas, 0, 0, pc.width, pc.height);
        pc.style.width = '100%';
        pc.style.maxWidth = '900px';
        pc.style.height = 'auto';
        pc.style.display = 'block';
        preview.appendChild(pc);
        dl.disabled = false;
        var count = 0;
        (function c(n) { count++; n.children.forEach(c); })(tree);
        info.textContent = count + ' 个节点 · ' + canvas.width + ' × ' + canvas.height;
      }

      TB.$('#mmRun', root).addEventListener('click', render);
      TB.$('#mmSample', root).addEventListener('click', function () { input.value = SAMPLE; render(); });
      dl.addEventListener('click', function () { if (result) TB.downloadCanvas(result, '思维导图.png', 'image/png'); });
      render();
    }
  });
})();
