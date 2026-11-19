/* =============================================================================
 * HTML → Markdown
 * -----------------------------------------------------------------------------
 * 用浏览器 DOMParser 解析粘贴的 HTML，递归转换标题、段落、列表、链接、图片、
 * 表格、引用和代码块。不加载外部资源，也不执行 HTML 中的脚本。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '<article>\n' +
    '  <h1>简单工具箱</h1>\n' +
    '  <p>一个<strong>纯本地</strong>的在线工具站，文件不会上传。</p>\n' +
    '  <h2>支持的能力</h2>\n' +
    '  <ul>\n    <li>图片压缩与裁剪</li>\n    <li>PDF 合并、拆分与签名</li>\n    <li>JSON / YAML / TOML 互转</li>\n  </ul>\n' +
    '  <blockquote>所有处理都在浏览器里完成。</blockquote>\n' +
    '  <p>访问 <a href="https://tools.432600.xyz/">工具站</a> 或查看 <a href="#/tool/pdfsign">PDF 签名</a>。</p>\n' +
    '  <table>\n    <thead><tr><th>分类</th><th>数量</th></tr></thead>\n    <tbody><tr><td>站长工具</td><td>65</td></tr><tr><td>图片处理</td><td>24</td></tr></tbody>\n  </table>\n' +
    '  <pre><code class="language-js">const local = true;\nconsole.log(local);</code></pre>\n' +
    '</article>';

  function escapeText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  }

  function escapeCell(s) {
    return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  function attr(el, name) {
    return (el.getAttribute && el.getAttribute(name)) || '';
  }

  function inline(node) {
    if (node.nodeType === 3) {
      return escapeText(node.nodeValue.replace(/\u00a0/g, ' ').replace(/\s+/g, ' '));
    }
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'head') return '';
    if (tag === 'br') return '  \n';
    if (tag === 'strong' || tag === 'b') return '**' + inlineChildren(node) + '**';
    if (tag === 'em' || tag === 'i') return '*' + inlineChildren(node) + '*';
    if (tag === 'del' || tag === 's') return '~~' + inlineChildren(node) + '~~';
    if (tag === 'code') {
      var code = node.textContent;
      var ticks = code.indexOf('`') > -1 ? '``' : '`';
      return ticks + code + ticks;
    }
    if (tag === 'a') {
      var text = inlineChildren(node).trim() || escapeText(node.textContent.trim());
      var href = attr(node, 'href');
      if (!href) return text;
      var title = attr(node, 'title');
      return '[' + text + '](' + (href.indexOf(' ') > -1 || href.indexOf(')') > -1 ? '<' + href + '>' : href) + (title ? ' "' + title.replace(/"/g, '\\"') + '"' : '') + ')';
    }
    if (tag === 'img') {
      var alt = attr(node, 'alt').replace(/\]/g, '\\]');
      var src = attr(node, 'src');
      return src ? '![' + alt + '](' + (src.indexOf(' ') > -1 || src.indexOf(')') > -1 ? '<' + src + '>' : src) + ')' : '';
    }
    return inlineChildren(node);
  }

  function inlineChildren(node) {
    return Array.from(node.childNodes).map(inline).join('').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  }

  function isInlineTag(tag) {
    return ['a', 'strong', 'b', 'em', 'i', 'code', 'span', 'del', 's', 'img', 'br', 'small', 'mark', 'sub', 'sup'].indexOf(tag) > -1;
  }

  function list(el, depth) {
    var ordered = el.tagName.toLowerCase() === 'ol';
    var start = parseInt(attr(el, 'start'), 10) || 1;
    var pad = '  '.repeat(depth);
    var items = Array.from(el.children).filter(function (c) { return c.tagName && c.tagName.toLowerCase() === 'li'; });
    return items.map(function (li, i) {
      var main = '', nested = '';
      Array.from(li.childNodes).forEach(function (child) {
        if (child.nodeType === 1 && /^(ul|ol)$/i.test(child.tagName)) nested += block(child, depth + 1);
        else main += inline(child);
      });
      main = main.replace(/\n+/g, ' ').trim();
      var marker = ordered ? (start + i) + '. ' : '- ';
      return pad + marker + main + (nested ? '\n' + nested.replace(/\n+$/, '') : '');
    }).join('\n') + '\n\n';
  }

  function table(el) {
    var rows = Array.from(el.querySelectorAll('tr'));
    if (!rows.length) return '';
    var data = rows.map(function (row) {
      return Array.from(row.querySelectorAll('th,td')).map(function (cell) {
        return escapeCell(inlineChildren(cell).replace(/\n/g, ' '));
      });
    }).filter(function (r) { return r.length; });
    if (!data.length) return '';
    var width = Math.max.apply(null, data.map(function (r) { return r.length; }));
    function normalize(r) { while (r.length < width) r.push(''); return r; }
    var header = normalize(data[0]);
    var lines = ['| ' + header.join(' | ') + ' |'];
    var aligns = Array.from(rows[0].querySelectorAll('th,td')).map(function (cell) {
      var style = attr(cell, 'style').toLowerCase();
      var align = attr(cell, 'align').toLowerCase();
      if (/text-align\s*:\s*center/.test(style) || align === 'center') return ':---:';
      if (/text-align\s*:\s*right/.test(style) || align === 'right') return '---:';
      if (/text-align\s*:\s*left/.test(style) || align === 'left') return ':---';
      return '---';
    });
    while (aligns.length < width) aligns.push('---');
    lines.push('| ' + aligns.slice(0, width).join(' | ') + ' |');
    data.slice(1).forEach(function (r) { lines.push('| ' + normalize(r).join(' | ') + ' |'); });
    return lines.join('\n') + '\n\n';
  }

  function block(node, depth) {
    depth = depth || 0;
    if (node.nodeType === 3) {
      var text = inline(node).trim();
      return text ? text + '\n\n' : '';
    }
    if (node.nodeType !== 1) return '';
    var tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'head' || tag === 'iframe') return '';
    if (/^h[1-6]$/.test(tag)) {
      return '#'.repeat(Number(tag[1])) + ' ' + inlineChildren(node) + '\n\n';
    }
    if (tag === 'p') return inlineChildren(node) + '\n\n';
    if (tag === 'br') return '  \n';
    if (tag === 'hr') return '---\n\n';
    if (tag === 'pre') {
      var code = node.textContent.replace(/\n$/, '');
      var codeEl = node.querySelector('code');
      var lang = codeEl ? attr(codeEl, 'class').match(/language-([\w-]+)/) : null;
      var fence = code.indexOf('```') > -1 ? '~~~' : '```';
      return fence + (lang ? lang[1] : '') + '\n' + code + '\n' + fence + '\n\n';
    }
    if (tag === 'ul' || tag === 'ol') return list(node, depth);
    if (tag === 'blockquote') {
      var quote = Array.from(node.childNodes).map(function (c) { return block(c, depth); }).join('').trim();
      return quote.split('\n').map(function (line) { return line ? '> ' + line : '>'; }).join('\n') + '\n\n';
    }
    if (tag === 'table') return table(node);
    if (tag === 'dl') {
      var terms = Array.from(node.querySelectorAll('dt')).map(function (dt) { return '**' + inlineChildren(dt) + '**'; });
      var defs = Array.from(node.querySelectorAll('dd')).map(function (dd) { return ': ' + inlineChildren(dd); });
      return terms.concat(defs).join('\n') + '\n\n';
    }
    if (isInlineTag(tag)) return inline(node);
    return Array.from(node.childNodes).map(function (c) { return block(c, depth); }).join('');
  }

  TB.def({
    slug: 'html2md',
    cat: 'web',
    name: 'HTML → Markdown',
    desc: '把网页或富文本 HTML 转成 Markdown，支持标题、列表、表格和代码块。',
    icon: '📝',
    kw: 'html markdown md 转换 富文本 表格 代码块 文档',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">HTML 源码</div>' +
          '<div class="field"><textarea class="textarea" id="hmIn" rows="10" spellcheck="false" placeholder="粘贴 HTML 片段或完整页面"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="hmRun" type="button">转换</button>' +
            '<button class="btn" id="hmSample" type="button">载入示例</button>' +
            '<button class="btn" id="hmCopy" type="button">复制 Markdown</button>' +
            '<button class="btn" id="hmDownload" type="button">下载 .md</button></div>' +
          '<div class="hint" id="hmInfo" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">Markdown 结果</div><pre class="codeBox" id="hmOut" style="overflow:auto;max-height:560px;white-space:pre-wrap"></pre></div>' +
        '<p class="note">转换会丢弃 script、style、iframe 与表单控件，只保留可读内容；表格会以第一行作为表头，复杂合并单元格可能被拆平。</p>';

      var input = TB.$('#hmIn', root);
      var out = TB.$('#hmOut', root);
      var info = TB.$('#hmInfo', root);
      var result = '';

      function run() {
        try {
          var doc = new DOMParser().parseFromString(input.value, 'text/html');
          var body = doc.body;
          if (!body || !body.textContent.trim()) throw new Error('没有可转换的 HTML 内容');
          var md = Array.from(body.childNodes).map(function (n) { return block(n, 0); }).join('')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (!md) throw new Error('没有生成 Markdown，请检查 HTML 结构');
          result = md;
          out.textContent = md;
          info.textContent = '已转换 · ' + md.length + ' 字符 · ' + md.split('\n').length + ' 行';
        } catch (e) {
          result = '';
          out.textContent = '';
          info.textContent = e.message;
          TB.toast(e.message);
        }
      }

      TB.$('#hmRun', root).addEventListener('click', run);
      TB.$('#hmSample', root).addEventListener('click', function () { input.value = SAMPLE; run(); });
      TB.$('#hmCopy', root).addEventListener('click', function () {
        if (result) TB.copy(result); else TB.toast('还没有可复制的内容');
      });
      TB.$('#hmDownload', root).addEventListener('click', function () {
        if (result) TB.downloadText(result, '转换结果.md', 'text/markdown');
        else TB.toast('还没有可下载的内容');
      });
      input.value = SAMPLE;
      run();
    }
  });
})();
