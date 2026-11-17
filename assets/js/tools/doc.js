/* =============================================================================
 * 文档创作类工具：Markdown 预览 / 组织架构图 / 甘特图 / 座位牌
 * -----------------------------------------------------------------------------
 * Markdown 用自研的小型渲染器（先整体转义再排版，天然防 XSS，不依赖外部库）。
 * 架构图、甘特图输出真 SVG，可继续编辑或转 PNG。
 * ========================================================================== */

(function () {

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px"><span class="' +
      (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  /* ================================================================ Markdown */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 只允许安全协议的链接，挡掉 javascript: 之类 */
  function safeUrl(u) {
    u = String(u).trim();
    if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(u)) return u;
    return '#';
  }

  function inlineMd(text) {
    var codes = [];
    var s = text;
    /* 行内代码先抽出来，避免里面的 * _ 被当成强调 */
    s = s.replace(/`([^`]+)`/g, function (m, p) {
      codes.push(p);
      return '\u0000C' + (codes.length - 1) + '\u0000';
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
      return '<img alt="' + alt + '" src="' + safeUrl(src) + '" style="max-width:100%">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
      return '<a href="' + safeUrl(href) + '" target="_blank" rel="noopener">' + txt + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/\u0000C(\d+)\u0000/g, function (m, i) { return '<code>' + codes[+i] + '</code>'; });
    return s;
  }

  function mdToHtml(src) {
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;

    function isTableSep(line) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.indexOf('-') >= 0; }

    while (i < lines.length) {
      var line = lines[i];

      /* 代码块 */
      var fence = line.match(/^\s*```(.*)$/);
      if (fence) {
        var lang = fence[1].trim();
        var buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre style="background:var(--surface-3);padding:12px;border-radius:9px;overflow:auto"><code' +
          (lang ? ' class="lang-' + escapeHtml(lang) + '"' : '') + '>' + escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }

      /* 空行 */
      if (!line.trim()) { i++; continue; }

      /* 标题 */
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var lv = h[1].length;
        var sizes = { 1: 26, 2: 21, 3: 18, 4: 16, 5: 14.5, 6: 13.5 };
        out.push('<h' + lv + ' style="font-size:' + sizes[lv] + 'px;margin:18px 0 8px;font-weight:700;line-height:1.4">' +
          inlineMd(escapeHtml(h[2])) + '</h' + lv + '>');
        i++;
        continue;
      }

      /* 分隔线 */
      if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
        out.push('<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">');
        i++;
        continue;
      }

      /* 表格：表头 + 分隔行 + 数据行 */
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var cells = function (l) {
          return l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return inlineMd(escapeHtml(c.trim())); });
        };
        var head = cells(line);
        var rows = [];
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') >= 0 && lines[i].trim()) {
          rows.push(cells(lines[i]));
          i++;
        }
        var html = '<div style="overflow:auto;margin:12px 0"><table class="table">' +
          '<tr>' + head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' +
          rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</table></div>';
        out.push(html);
        continue;
      }

      /* 引用 */
      if (/^\s*>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        out.push('<blockquote style="margin:12px 0;padding:8px 14px;border-left:3px solid var(--brand-line);color:var(--ink-2);background:var(--surface-3);border-radius:0 8px 8px 0">' +
          q.map(function (l) { return '<p style="margin:4px 0">' + inlineMd(escapeHtml(l)) + '</p>'; }).join('') + '</blockquote>');
        continue;
      }

      /* 列表（无序 / 有序，支持按缩进嵌套一层） */
      var lm = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (lm) {
        var ordered = /\d/.test(lm[2]);
        var baseIndent = lm[1].length;
        var items = [];
        while (i < lines.length) {
          var c = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (!c) break;
          items.push({ indent: c[1].length, ordered: /\d/.test(c[2]), text: c[3] });
          i++;
        }
        out.push(renderList(items));
        continue;
      }

      /* 普通段落：连续非空行合并，两个空格结尾视为换行 */
      var para = [line];
      i++;
      while (i < lines.length && lines[i].trim() &&
             !/^(#{1,6}\s|\s*```|\s*>|\s*([-*+]\s|\d+[.)]\s))/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push('<p style="margin:10px 0;line-height:1.8">' +
        para.map(function (l, idx) {
          var brk = /  $/.test(l);
          return inlineMd(escapeHtml(l.trim())) + (brk && idx < para.length - 1 ? '<br>' : '');
        }).join(' ') + '</p>');
    }
    return out.join('\n');
  }

  function renderList(items) {
    var html = '';
    var cur = null;
    var indent0 = items[0].indent;
    items.forEach(function (it) {
      if (cur === null) {
        cur = it.ordered ? 'ol' : 'ul';
        html += '<' + cur + ' style="margin:10px 0;padding-left:22px">';
      }
      var tag = it.ordered ? 'ol' : 'ul';
      if (tag !== cur) { html += '</' + cur + '><' + tag + ' style="margin:10px 0;padding-left:22px">'; cur = tag; }
      var depth = Math.max(0, Math.min(3, Math.round((it.indent - indent0) / 2)));
      html += '<li style="margin:3px 0;margin-left:' + (depth * 14) + 'px;line-height:1.75">' +
        inlineMd(escapeHtml(it.text)) + '</li>';
    });
    html += '</' + cur + '>';
    return html;
  }

  TB.mdToHtml = mdToHtml;

  var MD_DEMO = [
    '# 简单工具箱',
    '',
    '把 **文档** 和 *图片* 放在浏览器里处理，`不上传服务器`。',
    '',
    '## 支持语法',
    '',
    '- 标题、列表、引用',
    '- 行内代码与代码块',
    '- 表格、分割线、链接',
    '',
    '| 功能 | 是否免费 | 备注 |',
    '| --- | --- | --- |',
    '| Markdown 预览 | 免费 | 无需登录 |',
    '| PDF 合并 | 免费 | 本地处理 |',
    '',
    '> 提示：左侧输入，右侧实时渲染，可一键导出为 HTML。',
    '',
    '```js',
    'console.log("hello, jiandan");',
    '```'
  ].join('\n');

  TB.def({
    slug: 'markdown', cat: 'doc', name: 'Markdown 预览', desc: '实时渲染并导出', icon: '📝',
    kw: 'md markdown 预览 渲染 导出 html 笔记',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="md-split">' +
            '<div><div class="label"><b>Markdown</b><span style="flex:1"></span>' +
              '<button class="btn sm" id="demo">示例</button></div>' +
              '<textarea class="textarea" id="src" style="min-height:420px"></textarea></div>' +
            '<div><div class="label"><b>预览</b></div>' +
              '<div id="pv" style="min-height:420px;max-height:560px;overflow:auto;padding:14px;border:1px solid var(--line-2);border-radius:9px;background:var(--surface)"></div></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="dlHtml">导出 HTML</button>' +
            '<button class="btn" id="copyHtml">复制 HTML</button>' +
            '<button class="btn" id="dlMd">下载 .md</button></div>' +
        '</div>' +
        '<div class="note">渲染在本地完成，不会把内容发到任何地方。支持标题、列表、表格、代码块、引用、链接、图片、粗斜体、删除线。</div>';

      var src = TB.$('#src', root), pv = TB.$('#pv', root);
      function render() {
        pv.innerHTML = mdToHtml(src.value);
      }
      src.value = MD_DEMO;
      render();

      src.addEventListener('input', TB.debounce(render, 300));
      TB.$('#demo', root).addEventListener('click', function () { src.value = MD_DEMO; render(); });
      TB.$('#copyHtml', root).addEventListener('click', function () { TB.copy(mdToHtml(src.value)); });
      TB.$('#dlHtml', root).addEventListener('click', function () {
        var doc = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">' +
          '<title>文档</title><style>body{max-width:820px;margin:40px auto;padding:0 20px;font:15px/1.75 -apple-system,"Microsoft YaHei",sans-serif;color:#16233a}' +
          'pre{background:#f2f6fb;padding:12px;border-radius:9px;overflow:auto}table{border-collapse:collapse;width:100%}' +
          'th,td{border:1px solid #e8eef6;padding:7px 11px;text-align:left}img{max-width:100%}</style></head><body>' +
          mdToHtml(src.value) + '</body></html>';
        TB.downloadText(doc, 'markdown导出.html', 'text/html');
      });
      TB.$('#dlMd', root).addEventListener('click', function () { TB.downloadText(src.value, '文档.md', 'text/markdown'); });
    }
  });

  /* ============================================================ 组织架构图 */
  TB.def({
    slug: 'org-chart', cat: 'doc', name: '组织架构图', desc: '文本转架构图', icon: '🏢',
    kw: '组织架构 部门 汇报关系 树状图 ppt',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>层级文本</b><span style="color:var(--ink-3)">每行一个节点，用 Tab 或 2 个空格表示下一级</span></div>' +
            '<textarea class="textarea" id="src" style="min-height:190px"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">框宽度</div><input class="input" id="nw" type="number" value="150" min="60"></div>' +
            '<div class="field"><div class="label">风格</div><select class="select" id="style">' +
              '<option value="brand">蓝色简洁</option><option value="dark">深色描边</option><option value="soft">浅灰卡片</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成架构图</button>' +
            '<button class="btn" id="svg" disabled>下载 SVG</button>' +
            '<button class="btn" id="png" disabled>下载 PNG</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="pv" style="margin-top:14px;min-height:0;padding:16px;overflow:auto"></div>' +
        '</div>' +
        '<div class="note">示例：第一行写公司/部门，其后每行用两个空格缩进表示下级。生成的是矢量 SVG，可直接放进 PPT。</div>';

      var demo = [
        '简单科技',
        '  产品部',
        '    产品设计组',
        '    用户研究组',
        '  技术部',
        '    前端组',
        '    后端组',
        '    测试组',
        '  运营部',
        '    内容运营',
        '    市场推广'
      ].join('\n');
      var src = TB.$('#src', root); src.value = demo;

      var pv = TB.$('#pv', root), msg = TB.$('#msg', root);
      var lastSvg = null;

      TB.$('#run', root).addEventListener('click', function () {
        try {
          var rootNode = parseTree(src.value);
          if (!rootNode) throw new Error('没有可用的节点，请检查缩进');
          var opts = {
            nodeW: Math.max(60, parseInt(TB.$('#nw', root).value, 10) || 150),
            style: TB.$('#style', root).value
          };
          var svg = buildOrgSvg(rootNode, opts);
          lastSvg = svg;
          pv.innerHTML = svg;
          TB.$('#svg', root).disabled = false;
          TB.$('#png', root).disabled = false;
          status(msg, '生成完成，共 ' + countNodes(rootNode) + ' 个节点。');
        } catch (e) { status(msg, e.message, true); }
      });

      TB.$('#svg', root).addEventListener('click', function () {
        if (!lastSvg) return;
        TB.downloadText(lastSvg, '组织架构图.svg', 'image/svg+xml');
      });
      TB.$('#png', root).addEventListener('click', async function () {
        if (!lastSvg) return;
        try {
          var c = await svgToCanvas(lastSvg, 2);
          TB.downloadCanvas(c, '组织架构图.png', 'image/png');
        } catch (e) { status(msg, '导出 PNG 失败：' + e.message, true); }
      });

      TB.$('#run', root).click();
    }
  });

  function parseTree(text) {
    var root = null;
    var stack = [];
    String(text).split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var indent = line.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length;
      var depth = Math.floor(indent / 2);
      var node = { text: line.trim(), children: [], depth: depth };
      if (depth === 0 || !stack.length) {
        if (!root) { root = node; stack = [node]; }
        else { root.children.push(node); stack = [root, node]; }
        return;
      }
      while (stack.length - 1 > depth) stack.pop();
      var parent = stack[stack.length - 1];
      parent.children.push(node);
      stack.push(node);
    });
    return root;
  }

  function countNodes(n) {
    return 1 + n.children.reduce(function (s, c) { return s + countNodes(c); }, 0);
  }

  /* 经典 tidy-tree 布局：叶子按顺序排开，父节点居中于子节点 */
  function buildOrgSvg(rootNode, opts) {
    var nodeH = 40, gapX = 22, levelGap = 64;
    var colors = {
      brand: { fill: '#eaf2ff', stroke: '#cfe0ff', text: '#1a5fd0' },
      dark: { fill: '#ffffff', stroke: '#16233a', text: '#16233a' },
      soft: { fill: '#f2f6fb', stroke: '#dde6f2', text: '#57687f' }
    }[opts.style] || { fill: '#eaf2ff', stroke: '#cfe0ff', text: '#1a5fd0' };

    var cursor = 0, maxDepth = 0;
    (function measure(n, d) {
      maxDepth = Math.max(maxDepth, d);
      n.depth = d;
      if (!n.children.length) {
        n.x = cursor;
        cursor += opts.nodeW + gapX;
      } else {
        n.children.forEach(function (c) { measure(c, d + 1); });
        var first = n.children[0], last = n.children[n.children.length - 1];
        n.x = (first.x + last.x) / 2;
      }
    })(rootNode, 0);

    var width = cursor - gapX + 40;
    var height = (maxDepth + 1) * (nodeH + levelGap) - levelGap + 40;
    var parts = [];

    (function draw(n, d) {
      var x = n.x + 20;
      var y = d * (nodeH + levelGap) + 20;
      var label = n.text.length > 12 ? n.text.slice(0, 12) + '…' : n.text;
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + opts.nodeW + '" height="' + nodeH +
        '" rx="8" fill="' + colors.fill + '" stroke="' + colors.stroke + '" stroke-width="1"/>');
      parts.push('<text x="' + (x + opts.nodeW / 2) + '" y="' + (y + nodeH / 2 + 5) +
        '" fill="' + colors.text + '" font-size="13" font-weight="500" text-anchor="middle" font-family="sans-serif">' +
        escapeHtml(label) + '</text>');
      if (n.children.length) {
        var pxc = x + opts.nodeW / 2, pyc = y + nodeH;
        var cy = (d + 1) * (nodeH + levelGap) + 20;
        if (n.children.length > 1) {
          parts.push('<path d="M' + pxc + ' ' + pyc + ' V' + (pyc + (cy - pyc) / 2) +
            ' H' + (n.children[0].x + 20 + opts.nodeW / 2) + ' M' + pxc + ' ' + (pyc + (cy - pyc) / 2) +
            ' H' + (n.children[n.children.length - 1].x + 20 + opts.nodeW / 2) +
            ' M' + pxc + ' ' + (pyc + (cy - pyc) / 2) + ' V' + cy +
            '" stroke="' + colors.stroke + '" stroke-width="1.2" fill="none"/>');
        } else {
          parts.push('<path d="M' + pxc + ' ' + pyc + ' V' + cy + '" stroke="' + colors.stroke + '" stroke-width="1.2" fill="none"/>');
        }
        n.children.forEach(function (c) { draw(c, d + 1); });
      }
    })(rootNode, 0);

    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(width) + '" height="' + Math.round(height) +
      '" viewBox="0 0 ' + Math.round(width) + ' ' + Math.round(height) + '" style="background:#fff">' + parts.join('') + '</svg>';
  }

  /* SVG 字符串 → PNG canvas（用于下载位图） */
  function svgToCanvas(svg, scale) {
    return new Promise(function (res, rej) {
      var m = svg.match(/width="([\d.]+)"[^>]*height="([\d.]+)"/);
      var w = m ? parseFloat(m[1]) : 800, h = m ? parseFloat(m[2]) : 600;
      var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = Math.round(w * (scale || 1));
        c.height = Math.round(h * (scale || 1));
        var g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('SVG 渲染失败')); };
      img.src = url;
    });
  }

  /* ================================================================= 甘特图 */
  TB.def({
    slug: 'gantt', cat: 'doc', name: '甘特图生成', desc: '项目排期图', icon: '📅',
    kw: 'gantt 甘特 排期 项目计划 进度',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>任务列表</b><span style="color:var(--ink-3)">每行：任务名 | 开始日期 | 天数</span></div>' +
            '<textarea class="textarea" id="src" style="min-height:180px"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成甘特图</button>' +
            '<button class="btn" id="svg" disabled>下载 SVG</button>' +
            '<button class="btn" id="png" disabled>下载 PNG</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="pv" style="margin-top:14px;min-height:0;padding:16px;overflow:auto"></div>' +
        '</div>' +
        '<div class="note">日期格式 2026-11-14 / 2026/11/14 都行；第三天起自动按天排布。会画出今天的分界线。</div>';

      var src = TB.$('#src', root);
      src.value = [
        '需求评审 | 2026-11-10 | 3',
        '界面设计 | 2026-11-12 | 5',
        '前端开发 | 2026-11-16 | 8',
        '后端开发 | 2026-11-16 | 9',
        '联调测试 | 2026-11-24 | 4',
        '上线发布 | 2026-11-28 | 1'
      ].join('\n');

      var pv = TB.$('#pv', root), msg = TB.$('#msg', root);
      var lastSvg = null;

      function parseDate(s) {
        var m = String(s).trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (!m) return null;
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      }

      TB.$('#run', root).addEventListener('click', function () {
        try {
          var tasks = [];
          src.value.split(/\r?\n/).forEach(function (line) {
            if (!line.trim()) return;
            var parts = line.split(/\s*[|｜]\s*/);
            if (parts.length < 3) throw new Error('这一行格式不对：' + line);
            var d = parseDate(parts[1]);
            if (!d) throw new Error('日期无法识别：' + parts[1]);
            var days = Math.max(1, parseInt(parts[2], 10) || 1);
            tasks.push({ name: parts[0], start: d, days: days });
          });
          if (!tasks.length) throw new Error('请至少填一个任务');

          var min = tasks.reduce(function (m, t) { return t.start < m ? t.start : m; }, tasks[0].start);
          var max = tasks.reduce(function (m, t) {
            var end = new Date(t.start.getTime() + t.days * 86400000);
            return end > m ? end : m;
          }, tasks[0].start);
          var spanDays = Math.ceil((max - min) / 86400000) + 1;

          var rowH = 32, labelW = 150, dayW = Math.max(14, Math.min(34, Math.round(1200 / spanDays)));
          var width = labelW + spanDays * dayW + 30;
          var height = tasks.length * rowH + 60;
          var parts = [];

          /* 表头日期刻度 */
          for (var k = 0; k < spanDays; k++) {
            var d0 = new Date(min.getTime() + k * 86400000);
            if (k % Math.max(1, Math.round(7 * 20 / dayW)) === 0) {
              parts.push('<text x="' + (labelW + k * dayW + 2) + '" y="16" font-size="10" fill="#8b9cb3" font-family="sans-serif">' +
                (d0.getMonth() + 1) + '/' + d0.getDate() + '</text>');
            }
            if (k % 7 === 0) {
              parts.push('<rect x="' + (labelW + k * dayW) + '" y="20" width="1" height="' + (height - 30) + '" fill="#f2f6fb"/>');
            }
          }

          tasks.forEach(function (t, i) {
            var y = 28 + i * rowH;
            var offset = Math.round((t.start - min) / 86400000);
            var color = ['#2b7fff', '#12a065', '#d98a0b', '#6a5cff', '#e0483f', '#0aa39b'][i % 6];
            parts.push('<text x="0" y="' + (y + rowH / 2 + 4) + '" font-size="12.5" fill="#16233a" font-family="sans-serif">' +
              escapeHtml(t.name.length > 11 ? t.name.slice(0, 11) + '…' : t.name) + '</text>');
            parts.push('<rect x="' + (labelW + offset * dayW) + '" y="' + (y + 6) + '" width="' + (t.days * dayW) +
              '" height="' + (rowH - 12) + '" rx="4" fill="' + color + '" fill-opacity="0.16" stroke="' + color + '" stroke-width="1"/>');
            parts.push('<text x="' + (labelW + offset * dayW + 6) + '" y="' + (y + rowH / 2 + 3.5) +
              '" font-size="11" fill="' + color + '" font-family="sans-serif">' + t.days + '天</text>');
          });

          /* 今天线 */
          var today = new Date();
          var todayOffset = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - min) / 86400000);
          if (todayOffset >= 0 && todayOffset <= spanDays) {
            parts.push('<rect x="' + (labelW + todayOffset * dayW - 1) + '" y="20" width="2" height="' + (height - 30) + '" fill="#e0483f" fill-opacity="0.55"/>');
          }

          lastSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
            '" viewBox="0 0 ' + width + ' ' + height + '" style="background:#fff">' + parts.join('') + '</svg>';
          pv.innerHTML = lastSvg;
          TB.$('#svg', root).disabled = false;
          TB.$('#png', root).disabled = false;
          status(msg, '生成完成：' + tasks.length + ' 个任务，跨度 ' + spanDays + ' 天。');
        } catch (e) { status(msg, e.message, true); }
      });

      TB.$('#svg', root).addEventListener('click', function () {
        if (lastSvg) TB.downloadText(lastSvg, '甘特图.svg', 'image/svg+xml');
      });
      TB.$('#png', root).addEventListener('click', async function () {
        if (!lastSvg) return;
        try { TB.downloadCanvas(await svgToCanvas(lastSvg, 2), '甘特图.png', 'image/png'); }
        catch (e) { status(msg, '导出失败：' + e.message, true); }
      });

      TB.$('#run', root).click();
    }
  });

  /* ================================================================= 座位牌 */
  TB.def({
    slug: 'seat-card', cat: 'doc', name: '座位牌生成', desc: '批量桌牌 / 姓名牌', icon: '🏷️',
    kw: '桌牌 座位牌 姓名牌 会议 打印',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel no-print">' +
          '<div class="field"><div class="label"><b>名单</b><span style="color:var(--ink-3)">每行一人，可用「姓名|职位」</span></div>' +
            '<textarea class="textarea" id="names" style="min-height:170px"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">版式</div><select class="select" id="layout">' +
              '<option value="tent">双面折页桌牌（A4 横向，1 张/页）</option>' +
              '<option value="flat">单面平铺（A4 竖向，2 张/页）</option></select></div>' +
            '<div class="field"><div class="label">字号（pt）</div><input class="input" id="fs" type="number" value="68" min="20" max="160"></div>' +
            '<div class="field"><div class="label">装饰色</div><input class="input" id="color" type="color" value="#2b7fff"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成预览</button>' +
            '<button class="btn" id="print">打印 / 存 PDF</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note no-print">点「打印 / 存 PDF」后在打印对话框里选择「另存为 PDF」，边距设为「无」效果最好。</div>' +
        '<div id="pv" style="margin-top:14px"></div>';

      var src = TB.$('#names', root);
      src.value = ['张 三|产品经理', '李 四|技术总监', '王 五|运营负责人', '赵 六|财务'].join('\n');

      var pv = TB.$('#pv', root), msg = TB.$('#msg', root);

      TB.$('#run', root).addEventListener('click', function () {
        var list = src.value.split(/\r?\n/).filter(function (l) { return l.trim(); });
        if (!list.length) { status(msg, '请先填写名单', true); return; }
        var layout = TB.$('#layout', root).value;
        var fs = Math.max(20, parseInt(TB.$('#fs', root).value, 10) || 68);
        var color = TB.$('#color', root).value;

        var inner = list.map(function (line) {
          var p = line.split(/\s*[|｜]\s*/);
          var name = TB.esc(p[0]);
          var title = TB.esc(p[1] || '');
          var nameHtml = '<div style="font-size:' + fs + 'pt;font-weight:700;letter-spacing:' + (fs / 30) + 'px;line-height:1.2">' + name + '</div>';
          var titleHtml = title ? '<div style="font-size:' + Math.round(fs / 3) + 'pt;color:#57687f;margin-top:6pt">' + title + '</div>' : '';

          if (layout === 'tent') {
            /* 一张 A4 横向 = 两半，下半部分旋转 180°，折叠后两面都朝外 */
            return '<div class="seat" style="width:297mm;height:210mm;page-break-after:always">' +
              '<div style="height:105mm;display:flex;align-items:center;justify-content:center;border-bottom:1px dashed #dde6f2">' +
                '<div style="text-align:center">' + nameHtml + titleHtml + '</div>' +
                '<div style="position:absolute;left:0;top:104mm;width:297mm;height:2mm;background:' + color + ';opacity:.12"></div>' +
              '</div>' +
              '<div style="height:105mm;display:flex;align-items:center;justify-content:center;transform:rotate(180deg)">' +
                '<div style="text-align:center">' + nameHtml + titleHtml + '</div>' +
              '</div></div>';
          }
          return '<div class="seat" style="width:148mm;height:105mm;display:flex;align-items:center;justify-content:center;border:1px solid #e8eef6;page-break-inside:avoid">' +
            '<div style="text-align:center">' + nameHtml + titleHtml + '</div></div>';
        }).join('');

        pv.innerHTML = '<div style="display:' + (layout === 'flat' ? 'grid' : 'block') + ';' +
          (layout === 'flat' ? 'grid-template-columns:1fr 1fr;gap:0;' : '') +
          'background:#fff;color:#16233a;padding:0">' + inner + '</div>';
        status(msg, '已生成 ' + list.length + ' 张，共 ' + Math.ceil(list.length / (layout === 'flat' ? 2 : 1)) + ' 页。');
      });

      TB.$('#print', root).addEventListener('click', function () {
        TB.$('#run', root).click();
        setTimeout(function () { window.print(); }, 200);
      });

      TB.$('#run', root).click();
    }
  });

})();
