/* =============================================================================
 * GraphQL 格式化
 * -----------------------------------------------------------------------------
 * 本地词法扫描 + 轻量排版：query / mutation / fragment、变量、指令、对象参数
 * 都按大括号层级缩进；不连接 GraphQL 服务端，也不做 schema 校验。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = 'query UserCard($id: ID!, $withPosts: Boolean = false) {\n' +
    '  user(id: $id) {\n  id\n  name\n  avatar(size: 120) { url width height }\n' +
    '    posts(first: 10, filter: { published: true }) @include(if: $withPosts) {\n' +
    '      edges { node { id title createdAt } }\n    }\n  }\n}\n\n' +
    'fragment UserFields on User { id name email ... on Admin { permissions } }';

  function lex(src) {
    var tokens = [], i = 0, n = src.length;
    while (i < n) {
      var c = src[i];
      if (/\s|,/.test(c)) { i++; continue; }
      if (c === '#') {
        var end = src.indexOf('\n', i);
        if (end < 0) end = n;
        tokens.push({ type: 'comment', value: src.slice(i, end).trim() });
        i = end;
        continue;
      }
      if (src.slice(i, i + 3) === '"""') {
        var close = src.indexOf('"""', i + 3);
        if (close < 0) throw new Error('块字符串没有闭合的 """');
        tokens.push({ type: 'block', value: src.slice(i, close + 3) });
        i = close + 3;
        continue;
      }
      if (c === '"') {
        var j = i + 1, closed = false;
        while (j < n) {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '"') { closed = true; break; }
          j++;
        }
        if (!closed) throw new Error('字符串没有闭合的双引号');
        tokens.push({ type: 'string', value: src.slice(i, j + 1) });
        i = j + 1;
        continue;
      }
      if (src.slice(i, i + 3) === '...') {
        tokens.push({ type: 'spread', value: '...' });
        i += 3;
        continue;
      }
      var m = src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (m) { tokens.push({ type: 'name', value: m[0] }); i += m[0].length; continue; }
      m = src.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (m) { tokens.push({ type: 'number', value: m[0] }); i += m[0].length; continue; }
      if ('{}()[]!:$@=|&'.indexOf(c) > -1) { tokens.push({ type: 'punct', value: c }); i++; continue; }
      throw new Error('无法识别的字符：' + c);
    }
    return tokens;
  }

  function pretty(tokens) {
    var out = [], indent = 0, depth = 0, paren = 0, cur = '', prev = null;
    function pad() { return '  '.repeat(Math.max(0, indent)); }
    function start() { if (!cur) cur = pad(); }
    function add(s) { start(); cur += s; }
    function flush() { if (cur.trim()) out.push(cur.replace(/\s+$/, '')); cur = ''; }

    tokens.forEach(function (t) {
      var v = t.value;
      if (t.type === 'comment') {
        flush();
        out.push(pad() + v);
        prev = t;
        return;
      }

      if (v === '{') {
        start();
        if (cur && !/[\s([{]$/.test(cur)) cur += ' ';
        cur += '{';
        flush();
        indent++; depth++;
      } else if (v === '}') {
        flush();
        indent = Math.max(0, indent - 1);
        depth = Math.max(0, depth - 1);
        cur = pad() + '}';
      } else if (v === '(') {
        add('('); paren++;
      } else if (v === ')') {
        add(')'); paren = Math.max(0, paren - 1);
      } else if (v === ':') {
        add(': ');
      } else if (v === '@') {
        start();
        if (cur && !/\s$/.test(cur)) cur += ' ';
        cur += '@';
      } else if (v === '$') {
        start();
        if (cur && !/[\s([{]$/.test(cur)) cur += ' ';
        cur += '$';
      } else if (v === '[' || v === ']' || v === '!' || v === '=') {
        add(v === '=' ? ' = ' : v);
      } else if (v === '|' || v === '&') {
        add(' ' + v + ' ');
      } else if (t.type === 'spread') {
        if (depth > 0 && paren === 0 && cur.trim()) flush();
        add('...');
      } else if (t.type === 'name' || t.type === 'number' || t.type === 'string' || t.type === 'block') {
        var fieldStart = depth > 0 && paren === 0 && cur.trim() && prev &&
          /^(name|number|string|block|spread|punct)$/.test(prev.type) &&
          prev.value !== 'on' && prev.value !== ':' && prev.value !== '@' && prev.value !== '...';
        var topStart = depth === 0 && prev && prev.value === '}' && cur.trim();
        if (fieldStart || topStart) flush();
        start();
        if (cur && prev && prev.value === '...') cur += ' ';
        if (cur && /[})\]]$/.test(cur) && /^[A-Za-z_$]/.test(v)) cur += ' ';
        if (cur && /[A-Za-z0-9_"]$/.test(cur) && /^[A-Za-z0-9_"]/.test(v)) cur += ' ';
        else if (cur && /[A-Za-z0-9_"]$/.test(cur) && v === '$') cur += ' ';
        cur += v;
      } else {
        add(v);
      }
      prev = t;
    });
    flush();
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function minify(tokens) {
    var out = '', prev = null;
    tokens.forEach(function (t) {
      if (t.type === 'comment') return;
      var v = t.value;
      var needSpace = prev && (
        ((prev.type === 'name' || prev.type === 'number' || prev.type === 'string' || prev.type === 'block') &&
          (t.type === 'name' || t.type === 'number' || t.type === 'string' || t.type === 'block')) ||
        (prev.type === 'spread' && (t.type === 'name' || t.type === 'spread')) ||
        (prev.value === '}' && (t.type === 'name' || t.type === 'spread'))
      );
      if (needSpace) out += ' ';
      out += v;
      prev = t;
    });
    return out;
  }

  function validate(tokens) {
    var braces = 0, parens = 0;
    tokens.forEach(function (t) {
      if (t.value === '{') braces++;
      else if (t.value === '}') braces--;
      else if (t.value === '(') parens++;
      else if (t.value === ')') parens--;
      if (braces < 0 || parens < 0) throw new Error('括号闭合顺序不正确');
    });
    if (braces !== 0 || parens !== 0) throw new Error('大括号或圆括号没有闭合');
  }

  TB.def({
    slug: 'graphql',
    cat: 'web',
    name: 'GraphQL 格式化',
    desc: '格式化或压缩 GraphQL query、mutation 与 fragment。',
    icon: '◈',
    kw: 'graphql query mutation fragment 格式化 压缩 api gql',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">GraphQL 原文</div>' +
          '<div class="field"><textarea class="textarea" id="grIn" rows="11" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="grFormat" type="button">格式化</button>' +
            '<button class="btn" id="grMin" type="button">压缩</button>' +
            '<button class="btn" id="grSample" type="button">载入示例</button>' +
            '<button class="btn" id="grCopy" type="button">复制结果</button></div>' +
          '<div class="hint" id="grInfo" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">输出</div><pre class="codeBox" id="grOut" style="overflow:auto;max-height:520px"></pre></div>' +
        '<p class="note">格式化只调整缩进和换行，不改变字段顺序，也不校验 schema；压缩会移除注释和多余空白。</p>';

      var input = TB.$('#grIn', root);
      var out = TB.$('#grOut', root);
      var info = TB.$('#grInfo', root);
      var result = '';

      function run(mode) {
        try {
          var tokens = lex(input.value);
          if (!tokens.length) throw new Error('请输入 GraphQL 内容');
          validate(tokens);
          result = mode === 'min' ? minify(tokens) : pretty(tokens);
          out.textContent = result;
          info.textContent = (mode === 'min' ? '已压缩' : '已格式化') + ' · ' + tokens.length + ' 个词法单元 · ' + result.length + ' 字符';
        } catch (e) {
          result = '';
          out.textContent = '';
          info.textContent = e.message;
          TB.toast(e.message);
        }
      }

      TB.$('#grFormat', root).addEventListener('click', function () { run('pretty'); });
      TB.$('#grMin', root).addEventListener('click', function () { run('min'); });
      TB.$('#grSample', root).addEventListener('click', function () { input.value = SAMPLE; run('pretty'); });
      TB.$('#grCopy', root).addEventListener('click', function () {
        if (result) TB.copy(result); else TB.toast('还没有可复制的结果');
      });
      input.value = SAMPLE;
      run('pretty');
    }
  });
})();
