/* =============================================================================
 * Properties ⇄ YAML
 * -----------------------------------------------------------------------------
 * Java .properties 与 YAML 双向转换：
 * - Properties 支持注释、续行、\uXXXX 与常见反斜杠转义；
 * - 点号 / [下标] 键会还原成嵌套对象或数组；
 * - YAML 对象与数组会展开为 a.b[0].c 形式的 properties 键。
 * 使用本地 js-yaml，文件内容只在浏览器内处理。
 * ========================================================================== */
(function () {
  'use strict';

  var PROP_SAMPLE = [
    '# 应用配置示例',
    'server.port=8080',
    'server.host=0.0.0.0',
    'database.url=jdbc:mysql://localhost:3306/demo',
    'database.user=root',
    'database.password=secret',
    'features.cache=true',
    'features.limit=100'
  ].join('\n');

  var YAML_SAMPLE = [
    'server:',
    '  port: 8080',
    '  host: 0.0.0.0',
    'database:',
    '  url: jdbc:mysql://localhost:3306/demo',
    '  user: root',
    '  password: secret',
    'features:',
    '  cache: true',
    '  limit: 100',
    'list:',
    '  - one',
    '  - two'
  ].join('\n');

  function unescapeProp(text) {
    return String(text)
      .replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); })
      .replace(/\\(.)/g, function (_, ch) {
        switch (ch) {
          case 'n': return '\n';
          case 'r': return '\r';
          case 't': return '\t';
          case 'f': return '\f';
          default: return ch;
        }
      });
  }

  /**
   * 找出第一个未转义的键值分隔符（=、: 或空白）。
   */
  function separatorIndex(line) {
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '\\') { i++; continue; }
      if (ch === '=' || ch === ':' || ch === ' ' || ch === '\t') return i;
    }
    return -1;
  }

  function pathTokens(key) {
    var tokens = [];
    var buf = '';
    for (var i = 0; i < key.length; i++) {
      var ch = key.charAt(i);
      if (ch === '.') {
        if (buf) tokens.push(buf);
        buf = '';
      } else if (ch === '[') {
        if (buf) tokens.push(buf);
        buf = '';
        var end = key.indexOf(']', i + 1);
        if (end > i) {
          var index = key.slice(i + 1, end).trim();
          if (/^\d+$/.test(index)) tokens.push(index);
          else if (index) tokens.push(index);
          i = end;
        } else {
          buf += ch;
        }
      } else {
        buf += ch;
      }
    }
    if (buf) tokens.push(buf);
    return tokens;
  }

  function assignPath(obj, key, value) {
    var tokens = pathTokens(key);
    if (!tokens.length) return;
    var cur = obj;
    for (var i = 0; i < tokens.length - 1; i++) {
      var token = tokens[i];
      if (!cur[token] || typeof cur[token] !== 'object') cur[token] = {};
      cur = cur[token];
    }
    cur[tokens[tokens.length - 1]] = value;
  }

  function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    var keys = Object.keys(value);
    var numeric = keys.filter(function (k) { return /^\d+$/.test(k); }).map(Number).sort(function (a, b) { return a - b; });
    var allNumeric = keys.length > 0 && numeric.length === keys.length;
    var contiguous = allNumeric && numeric.every(function (n, i) { return n === i; });
    if (contiguous) {
      var arr = [];
      numeric.forEach(function (n) { arr[n] = normalize(value[String(n)]); });
      return arr;
    }
    var out = {};
    keys.forEach(function (k) { out[k] = normalize(value[k]); });
    return out;
  }

  function parseProperties(text) {
    var rawLines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var logical = [];
    var pending = '';
    rawLines.forEach(function (line) {
      if (pending) line = line.replace(/^\s+/, '');
      var trailing = line.match(/\\+$/);
      if (trailing && trailing[0].length % 2 === 1) {
        pending += line.slice(0, -1);
        return;
      }
      logical.push(pending + line);
      pending = '';
    });
    if (pending) logical.push(pending);

    var root = {};
    logical.forEach(function (line) {
      line = line.replace(/^\s+/, '');
      if (!line || line.charAt(0) === '#' || line.charAt(0) === '!') return;
      var idx = separatorIndex(line);
      var key, value;
      if (idx < 0) {
        key = line.trim();
        value = '';
      } else {
        key = line.slice(0, idx).trim();
        value = line.slice(idx).replace(/^\s+/, '');
        if (value.charAt(0) === '=' || value.charAt(0) === ':') value = value.slice(1).replace(/^\s+/, '');
      }
      key = unescapeProp(key);
      value = unescapeProp(value);
      if (key) assignPath(root, key, value);
    });
    return normalize(root);
  }

  function escapeKey(key) {
    return String(key).replace(/\\/g, '\\\\').replace(/([=:#! ])/g, '\\$1');
  }

  function escapeValue(value) {
    var text = String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    if (/^ /.test(text)) text = '\\' + text;
    return text;
  }

  function flatten(value, prefix, out) {
    if (Array.isArray(value)) {
      if (!value.length && prefix) out[prefix] = '';
      value.forEach(function (item, i) {
        flatten(item, prefix ? prefix + '[' + i + ']' : '[' + i + ']', out);
      });
      return;
    }
    if (value instanceof Date) {
      out[prefix] = value.toISOString();
      return;
    }
    if (value && typeof value === 'object') {
      var keys = Object.keys(value);
      if (!keys.length && prefix) out[prefix] = '';
      keys.forEach(function (k) {
        flatten(value[k], prefix ? prefix + '.' + k : k, out);
      });
      return;
    }
    out[prefix] = value === null || value === undefined ? '' : String(value);
  }

  function toProperties(data) {
    var flat = {};
    flatten(data, '', flat);
    return Object.keys(flat).map(function (k) {
      return escapeKey(k) + '=' + escapeValue(flat[k]);
    }).join('\n');
  }

  TB.def({
    slug: 'propsyaml',
    cat: 'data',
    name: 'Properties ⇄ YAML',
    desc: 'Java Properties 与 YAML 双向转换，自动处理嵌套键。',
    icon: '🔄',
    kw: 'properties yaml 配置 转换 嵌套 键值 java 开发',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab on" type="button" data-py="p2y" role="tab" aria-selected="true">Properties → YAML</button>' +
          '<button class="tab" type="button" data-py="y2p" role="tab" aria-selected="false">YAML → Properties</button>' +
        '</div>' +
        '<div class="panel" id="pyP2Y">' +
          '<div class="panel-h">Properties 输入</div>' +
          '<div class="field"><textarea class="textarea" id="pyPropIn" spellcheck="false" style="min-height:200px">' + TB.esc(PROP_SAMPLE) + '</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="pyP2YRun" type="button">转换为 YAML</button>' +
            '<button class="btn" id="pyPropSample" type="button">载入示例</button></div>' +
        '</div>' +
        '<div class="panel" id="pyY2P" hidden>' +
          '<div class="panel-h">YAML 输入</div>' +
          '<div class="field"><textarea class="textarea" id="pyYamlIn" spellcheck="false" style="min-height:200px">' + TB.esc(YAML_SAMPLE) + '</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="pyY2PRun" type="button">转换为 Properties</button>' +
            '<button class="btn" id="pyYamlSample" type="button">载入示例</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">转换结果 <span class="hint" id="pyStatus"></span></div>' +
          '<pre class="codeBox" id="pyOut" style="max-height:360px;overflow:auto;min-height:120px"></pre>' +
          '<div class="btns" style="margin-top:10px"><button class="btn" id="pyCopy" type="button">复制结果</button></div></div>' +
        '<p class="note">点号键（a.b.c）会转成嵌套对象，[数字] 键会转成数组；数组反向展开成 key[0]、key[1]。Properties 的注释不会被保留，键名中的点号请谨慎使用。</p>';

      var mode = 'p2y';
      var p2y = TB.$('#pyP2Y', root);
      var y2p = TB.$('#pyY2P', root);
      var out = TB.$('#pyOut', root);
      var status = TB.$('#pyStatus', root);

      function setStatus(text) { status.textContent = text; }

      function ensureYaml() {
        return TB.loadLib('js-yaml.min.js').then(function () {
          if (!window.jsyaml) throw new Error('js-yaml 未加载');
          return window.jsyaml;
        });
      }

      function convertProps() {
        setStatus('转换中…');
        ensureYaml().then(function (yaml) {
          var data = parseProperties(TB.$('#pyPropIn', root).value);
          out.textContent = yaml.dump(data, { noRefs: true, lineWidth: -1, sortKeys: false });
          setStatus('已生成 YAML');
        }).catch(function (e) {
          out.textContent = '';
          setStatus('转换失败：' + e.message);
        });
      }

      function convertYaml() {
        setStatus('转换中…');
        ensureYaml().then(function (yaml) {
          var data = yaml.load(TB.$('#pyYamlIn', root).value);
          if (data === undefined || data === null) throw new Error('YAML 内容为空');
          if (typeof data !== 'object') throw new Error('YAML 根节点需要是对象或数组');
          out.textContent = toProperties(data);
          setStatus('已生成 Properties');
        }).catch(function (e) {
          out.textContent = '';
          setStatus('转换失败：' + e.message);
        });
      }

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          mode = tab.getAttribute('data-py');
          TB.$$('.tab', root).forEach(function (x) {
            x.classList.toggle('on', x === tab);
            x.setAttribute('aria-selected', x === tab ? 'true' : 'false');
          });
          p2y.hidden = mode !== 'p2y';
          y2p.hidden = mode !== 'y2p';
          out.textContent = '';
          setStatus('');
        });
      });
      TB.$('#pyP2YRun', root).addEventListener('click', convertProps);
      TB.$('#pyY2PRun', root).addEventListener('click', convertYaml);
      TB.$('#pyPropSample', root).addEventListener('click', function () {
        TB.$('#pyPropIn', root).value = PROP_SAMPLE;
        convertProps();
      });
      TB.$('#pyYamlSample', root).addEventListener('click', function () {
        TB.$('#pyYamlIn', root).value = YAML_SAMPLE;
        convertYaml();
      });
      TB.$('#pyCopy', root).addEventListener('click', function () {
        if (out.textContent) TB.copy(out.textContent);
      });

      convertProps();
    }
  });
})();
