/* =============================================================================
 * CSS 美化 / 压缩
 * -----------------------------------------------------------------------------
 * 纯本地 CSS 格式化器：
 *  - 美化：按大括号缩进，声明逐行排列，保留注释
 *  - 压缩：去掉普通注释与多余空白，保留 /*! 开头的版权注释
 * 字符串和 url()/calc()/媒体查询括号内的内容不会被拆开。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE =
    ':root{--brand:#4f7cff;--bg:#fff;--line:#e5eaf2}\n' +
    'body{margin:0;background:var(--bg);color:#1f2937;font-family:system-ui,"PingFang SC",sans-serif}\n' +
    '.card{padding:16px 20px;border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 28px rgba(15,23,42,.08)}\n' +
    '.card:hover{transform:translateY(-2px)}\n' +
    '@media (max-width:640px){.card{padding:12px}.card+.card{margin-top:12px}}\n' +
    '/* 保留注释，方便阅读 */\n' +
    '.tag::before{content:"A;B";color:var(--brand)}';

  /* 把 CSS 切成 text / comment / string / { } ; : , 几类片段 */
  function scan(text) {
    var tokens = [];
    var i = 0;
    var buf = '';
    var len = text.length;

    function flush() {
      if (buf.trim()) tokens.push({ type: 'text', value: buf.trim() });
      buf = '';
    }

    function readString(quote) {
      var start = i;
      i++;
      while (i < len) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === quote) { i++; break; }
        i++;
      }
      return text.slice(start, i);
    }

    function readParens() {
      var start = i;
      var depth = 0;
      while (i < len) {
        var c = text[i];
        if (c === '"' || c === "'") { readString(c); continue; }
        if (c === '(') depth++;
        if (c === ')') {
          depth--;
          if (depth === 0) { i++; break; }
        }
        i++;
      }
      return text.slice(start, i);
    }

    while (i < len) {
      var c = text[i];
      if (c === '/' && text[i + 1] === '*') {
        flush();
        var end = text.indexOf('*/', i + 2);
        if (end < 0) { tokens.push({ type: 'comment', value: text.slice(i) }); i = len; }
        else { tokens.push({ type: 'comment', value: text.slice(i, end + 2) }); i = end + 2; }
        continue;
      }
      if (c === '"' || c === "'") {
        flush();
        tokens.push({ type: 'string', value: readString(c) });
        continue;
      }
      if (c === '(') {
        buf += readParens();
        continue;
      }
      if (c === '{' || c === '}' || c === ';' || c === ':' || c === ',') {
        flush();
        tokens.push({ type: 'punct', value: c });
        i++;
        continue;
      }
      buf += c;
      i++;
    }
    flush();
    return tokens;
  }

  function braceCount(tokens) {
    var depth = 0;
    tokens.forEach(function (t) {
      if (t.type !== 'punct') return;
      if (t.value === '{') depth++;
      if (t.value === '}') depth--;
    });
    return depth;
  }

  function pretty(text) {
    var tokens = scan(text);
    var out = '';
    var indent = 0;
    var cur = '';
    var inDecl = false;
    var stack = [];

    function line(suffix) {
      var body = cur.trim();
      cur = '';
      if (!body) return;
      out += '  '.repeat(indent) + body + (suffix || '') + '\n';
    }

    tokens.forEach(function (t) {
      if (t.type === 'comment') {
        line('');
        out += '  '.repeat(indent) + t.value + '\n';
        return;
      }
      if (t.type === 'punct') {
        if (t.value === '{') {
          var header = cur.trim();
          var groupRule = /^@(?:media|supports|keyframes|layer|container|scope|document|-moz-document)\b/i.test(header);
          line(' {');
          stack.push(inDecl);
          inDecl = !groupRule;
          indent++;
        } else if (t.value === '}') {
          if (cur.trim() && inDecl) line(';');
          else line('');
          indent = Math.max(0, indent - 1);
          inDecl = stack.length ? stack.pop() : false;
          out += '  '.repeat(indent) + '}\n';
        } else if (t.value === ';') {
          line(';');
          inDecl = indent > 0;
        } else if (t.value === ':') {
          cur = cur.replace(/\s+$/, '') + (inDecl ? ': ' : ':');
        } else if (t.value === ',') {
          cur = cur.replace(/\s+$/, '') + ', ';
        }
        return;
      }
      cur += t.value;
    });
    line('');
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  function minify(text) {
    return scan(text).map(function (t) {
      if (t.type === 'comment' && !/^\/\*!/.test(t.value)) return '';
      if (t.type === 'text') return t.value.trim();
      return t.value;
    }).join('').trim();
  }

  TB.def({
    slug: 'cssfmt',
    cat: 'web',
    name: 'CSS 美化 / 压缩',
    desc: '格式化 CSS 选择器与声明，或压缩成一行。',
    icon: '🎛️',
    kw: 'css 美化 格式化 压缩 minify 代码 样式',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">CSS 源码 <span class="hint">支持 @media、变量、字符串与 url()</span></div>' +
          '<div class="field"><textarea class="textarea" id="cfIn" rows="12" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="cfPretty" type="button">美化</button>' +
            '<button class="btn" id="cfMin" type="button">压缩</button>' +
            '<button class="btn" id="cfSample" type="button">载入示例</button>' +
            '<button class="btn" id="cfCopy" type="button">复制结果</button>' +
            '<button class="btn" id="cfDl" type="button">下载 .css</button></div>' +
          '<div class="hint" id="cfMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">结果</div><pre class="codeBox" id="cfOut" style="max-height:440px;overflow:auto;white-space:pre"></pre></div>' +
        '<p class="note">格式化只调整空白，不改变选择器、属性值或注释内容；字符串和括号内的分号不会被误拆。</p>';

      var input = TB.$('#cfIn', root);
      var output = TB.$('#cfOut', root);
      var msg = TB.$('#cfMsg', root);
      var result = '';

      function report(raw, next, action) {
        result = next;
        output.textContent = result;
        var depth = braceCount(scan(raw));
        var info = raw.length + ' → ' + result.length + ' 字符';
        if (action === 'min') {
          var saved = raw.length ? Math.round((1 - result.length / raw.length) * 100) : 0;
          info += ' · 压缩 ' + saved + '%';
        }
        if (depth !== 0) info += ' · 警告：大括号数量不平衡（' + depth + '）';
        msg.textContent = info;
      }

      function run(action) {
        var raw = input.value;
        if (!raw.trim()) { result = ''; output.textContent = ''; msg.textContent = '先粘贴一段 CSS'; return; }
        try {
          report(raw, action === 'min' ? minify(raw) : pretty(raw), action);
        } catch (e) {
          output.textContent = '';
          msg.textContent = '处理失败：' + e.message;
        }
      }

      TB.$('#cfPretty', root).addEventListener('click', function () { run('pretty'); });
      TB.$('#cfMin', root).addEventListener('click', function () { run('min'); });
      TB.$('#cfSample', root).addEventListener('click', function () { input.value = SAMPLE; run('pretty'); });
      TB.$('#cfCopy', root).addEventListener('click', function () {
        if (result) TB.copy(result); else TB.toast('还没有可复制的结果');
      });
      TB.$('#cfDl', root).addEventListener('click', function () {
        if (result) TB.downloadText(result, 'style.css', 'text/css'); else TB.toast('还没有可下载的结果');
      });

      input.value = SAMPLE;
      run('pretty');
    }
  });
})();
