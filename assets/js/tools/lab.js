/* =============================================================================
 * 工具箱第二组开发者工具：XML 格式化、HMAC、JSON 转类型、JSONPath、CSS 生成器、
 * 对比度检测、ID 生成、假数据、文本相似度、二维码识别。
 * -----------------------------------------------------------------------------
 * 功能点参考 IT Toolbox（Zoroaaa/it-toolbox）的清单，代码全部按本站风格重写：
 *  - 除二维码识别用 jsQR（Apache-2.0，250KB，懒加载）外，其余零依赖；
 *  - 所有计算都在浏览器里完成，不联网、不上传内容。
 * ========================================================================== */

(function () {

  /* ---------------------------------------------------------- 1. XML 格式化 */
  TB.def({
    slug: 'xml', cat: 'web', name: 'XML 格式化', desc: '美化 / 压缩 / 校验', icon: '📐',
    kw: 'xml 格式化 美化 压缩 校验 缩进 svg plist',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>XML</b></div>' +
            '<textarea class="textarea codeIn" id="src" rows="9">&lt;config&gt;&lt;server host="127.0.0.1" port="8080"&gt;&lt;name&gt;demo&lt;/name&gt;&lt;tags&gt;&lt;tag&gt;a&lt;/tag&gt;&lt;tag&gt;b&lt;/tag&gt;&lt;/tags&gt;&lt;/server&gt;&lt;/config&gt;</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="fmt">格式化</button>' +
            '<button class="btn" id="min">压缩</button>' +
            '<button class="btn" id="chk">校验</button>' +
            '<button class="btn" id="copy">复制结果</button></div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>结果</b></div>' +
            '<textarea class="textarea codeIn" id="dst" rows="12" readonly></textarea></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">用浏览器自带的 XML 解析器校验，能指出错在第几行第几列；格式化只调整标签之间的空白，文本内容原样保留。</div>';

      var src = TB.$('#src', root), dst = TB.$('#dst', root), msg = TB.$('#msg', root);

      function parse(text) {
        var doc = new DOMParser().parseFromString(text, 'application/xml');
        var err = doc.getElementsByTagName('parsererror');
        if (err.length) {
          var text2 = (err[0].textContent || '').replace(/\s+/g, ' ').trim();
          throw new Error(text2.split('。')[0] || 'XML 语法错误');
        }
        return doc;
      }

      function pretty(node, depth) {
        var pad = new Array(depth + 1).join('  ');
        if (node.nodeType === 3) {
          var t = node.nodeValue.replace(/\s+/g, ' ').trim();
          return t ? pad + t : '';
        }
        if (node.nodeType === 4) return pad + '<![CDATA[' + node.nodeValue + ']]>';
        if (node.nodeType === 8) return pad + '<!--' + node.nodeValue + '-->';
        if (node.nodeType === 9 || node.nodeType === 11) {
          var head = '';
          var kids = [];
          Array.prototype.forEach.call(node.childNodes, function (n) {
            if (n.nodeType === 10) { head = '<!DOCTYPE ' + n.name + '>'; return; }
            var s = pretty(n, depth);
            if (s) kids.push(s);
          });
          return (head ? head + '\n' : '') + kids.join('\n');
        }
        if (node.nodeType !== 1) return '';

        var attrs = '';
        Array.prototype.forEach.call(node.attributes, function (a) {
          attrs += ' ' + a.name + '="' + a.value + '"';
        });
        var children = [];
        Array.prototype.forEach.call(node.childNodes, function (n) {
          var s = pretty(n, depth + 1);
          if (s) children.push(s);
        });

        /* 只有一个文本子节点时写成一行，避免把短标签拆成三行 */
        if (children.length === 1 && node.firstElementChild === null) {
          var oneLine = children[0].trim();
          if (oneLine && oneLine.indexOf('<') !== 0) {
            return pad + '<' + node.nodeName + attrs + '>' + oneLine + '</' + node.nodeName + '>';
          }
        }
        if (!children.length) return pad + '<' + node.nodeName + attrs + '/>';
        return pad + '<' + node.nodeName + attrs + '>\n' + children.join('\n') + '\n' + pad + '</' + node.nodeName + '>';
      }

      function minify(text) {
        var doc = parse(text);
        /* 删掉纯空白的文本节点，真实文字（含首尾空格）不动 */
        (function walk(n) {
          Array.prototype.forEach.call(n.childNodes, function (c) {
            if (c.nodeType === 1) walk(c);
          });
          Array.prototype.forEach.call(n.childNodes, function (c) {
            if (c.nodeType === 3 && !c.nodeValue.trim()) c.parentNode.removeChild(c);
          });
        })(doc);
        return new XMLSerializer().serializeToString(doc);
      }

      function status(text, isErr) {
        msg.innerHTML = text ? '<div class="' + (isErr ? 'result-err' : 'note') + '" style="margin-top:10px">' + TB.esc(text) + '</div>' : '';
      }

      TB.$('#fmt', root).addEventListener('click', function () {
        try {
          var doc = parse(src.value);
          dst.value = pretty(doc, 0);
          var count = doc.getElementsByTagName('*').length;
          status('语法正确，共 ' + count + ' 个元素。');
        } catch (e) { dst.value = ''; status(e.message, true); }
      });

      TB.$('#min', root).addEventListener('click', function () {
        try {
          var out = minify(src.value);
          dst.value = out;
          status('已压缩到 ' + out.length + ' 个字符。');
        } catch (e) { dst.value = ''; status(e.message, true); }
      });

      TB.$('#chk', root).addEventListener('click', function () {
        try {
          var doc = parse(src.value);
          var els = doc.getElementsByTagName('*');
          var attrs = 0;
          Array.prototype.forEach.call(els, function (el) { attrs += el.attributes.length; });
          var maxDepth = 0;
          Array.prototype.forEach.call(els, function (el) {
            var d = 0, p = el;
            while (p.parentNode && p.parentNode.nodeType === 1) { d++; p = p.parentNode; }
            if (d > maxDepth) maxDepth = d;
          });
          status('通过校验。根元素 <' + doc.documentElement.nodeName + '>，元素 ' + els.length +
            ' 个，属性 ' + attrs + ' 个，最大层级 ' + (maxDepth + 1) + ' 层。');
          dst.value = '';
        } catch (e) { status(e.message, true); }
      });

      TB.$('#copy', root).addEventListener('click', function () { TB.copy(dst.value); });
      TB.$('#fmt', root).click();
    }
  });

  /* ---------------------------------------------------------- 2. HMAC */
  TB.def({
    slug: 'hmac', cat: 'web', name: 'HMAC 签名', desc: 'SHA-1/256/384/512', icon: '🔏',
    kw: 'hmac 签名 密钥 sha256 api 鉴权 webhook',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>密钥（Key）</b></div>' +
              '<input class="input codeIn" id="key" value="secret-key" autocomplete="off" spellcheck="false"></div>' +
            '<div class="field"><div class="label">算法</div><select class="input" id="alg">' +
              '<option value="SHA-256" selected>HMAC-SHA256</option><option value="SHA-1">HMAC-SHA1</option>' +
              '<option value="SHA-384">HMAC-SHA384</option><option value="SHA-512">HMAC-SHA512</option></select></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>消息（Message）</b><span style="color:var(--ink-3)">按 UTF-8 编码</span></div>' +
            '<textarea class="textarea codeIn" id="msg" rows="7">{"orderId":"20261114001","amount":99.5}</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">计算</button>' +
            '<button class="btn" id="copyHex">复制 Hex</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">和各家开放平台的签名规则一致：HMAC(密钥, 消息)，再按对方要求转成 Hex 或 Base64。密钥只在内存里，不写 localStorage。</div>';

      var out = TB.$('#out', root);

      async function run() {
        var alg = TB.$('#alg', root).value;
        try {
          var k = await crypto.subtle.importKey('raw',
            new TextEncoder().encode(TB.$('#key', root).value),
            { name: 'HMAC', hash: alg }, false, ['sign']);
          var mac = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(TB.$('#msg', root).value));
          var bytes = new Uint8Array(mac);
          var hex = Array.prototype.map.call(bytes, function (x) {
            return ('0' + x.toString(16)).slice(-2);
          }).join('');
          var b64 = btoa(Array.prototype.map.call(bytes, function (x) { return String.fromCharCode(x); }).join(''));
          var b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          out.innerHTML =
            '<div class="kvTable">' +
              '<div class="kvRow"><span>Hex（小写）</span><b class="mono">' + hex + '</b></div>' +
              '<div class="kvRow"><span>Hex（大写）</span><b class="mono">' + hex.toUpperCase() + '</b></div>' +
              '<div class="kvRow"><span>Base64</span><b class="mono">' + TB.esc(b64) + '</b></div>' +
              '<div class="kvRow"><span>Base64URL</span><b class="mono">' + TB.esc(b64url) + '</b></div>' +
            '</div>';
        } catch (e) {
          out.innerHTML = '<div class="result-err">计算失败：' + TB.esc(e.message) + '</div>';
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copyHex', root).addEventListener('click', function () {
        var b = out.querySelector('.kvRow b');
        if (b) TB.copy(b.textContent);
      });
      ['#key', '#msg'].forEach(function (s) {
        TB.$(s, root).addEventListener('input', TB.debounce(run, 350));
      });
      TB.$('#alg', root).addEventListener('change', run);
      run();
    }
  });

  /* ---------------------------------------------------------- 3. JSON 转类型 */
  TB.def({
    slug: 'json2type', cat: 'web', name: 'JSON 转类型', desc: 'TS / Go / Python', icon: '🧩',
    kw: 'json 转 typescript interface go struct python 类型 定义',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>JSON</b></div>' +
            '<textarea class="textarea codeIn" id="src" rows="9">{"id":1,"name":"张三","active":true,"tags":["a","b"],"profile":{"city":"上海","score":88.5},"orders":[{"no":"A1","amount":10}]}</textarea></div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">语言</div><select class="input" id="lang">' +
              '<option value="ts" selected>TypeScript</option><option value="go">Go</option><option value="py">Python</option></select></div>' +
            '<div class="field"><div class="label">根类型名</div><input class="input" id="name" value="Root" autocomplete="off"></div>' +
            '<div class="field"><div class="label">操作</div><div class="btns" style="margin:0">' +
              '<button class="btn primary" id="run">生成</button><button class="btn" id="copy">复制</button></div></div>' +
          '</div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>类型定义</b></div>' +
            '<pre class="codeBox" id="out"></pre></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">数组里有多个对象时会合并字段，缺字段的标成可选；数字会区分整数（int / int64）与小数（number / float64）。只生成结构，不生成运行时校验代码。</div>';

      var out = TB.$('#out', root), msg = TB.$('#msg', root);

      /* 把 JSON 值抽象成形状树：object / array / string / number / boolean / null */
      function shape(v) {
        if (v === null) return { kind: 'null' };
        if (Array.isArray(v)) return { kind: 'array', items: v.map(shape) };
        if (typeof v === 'object') {
          var props = {};
          Object.keys(v).forEach(function (k) { props[k] = shape(v[k]); });
          return { kind: 'object', props: props };
        }
        if (typeof v === 'number') return { kind: Number.isInteger(v) ? 'int' : 'float' };
        if (typeof v === 'boolean') return { kind: 'bool' };
        return { kind: 'string' };
      }

      /* 数组合并：全是对象就合并属性；否则保留各成员类型 */
      function merge(items) {
        if (!items.length) return { kind: 'unknown' };
        var allObj = items.every(function (s) { return s.kind === 'object'; });
        if (allObj) {
          var props = {};
          var counts = {};
          items.forEach(function (s) {
            Object.keys(s.props).forEach(function (k) {
              counts[k] = (counts[k] || 0) + 1;
              props[k] = props[k] ? merge([props[k], s.props[k]]) : s.props[k];
            });
          });
          Object.keys(props).forEach(function (k) { props[k].optional = counts[k] < items.length; });
          return { kind: 'object', props: props };
        }
        var kinds = items.filter(function (s, i, a) {
          return a.findIndex(function (x) { return x.kind === s.kind; }) === i;
        });
        if (kinds.length === 1) return kinds[0];
        return { kind: 'union', items: kinds };
      }

      function sane(name, fallback) {
        var s = String(name || '').replace(/[^\w\u4e00-\u9fa5]+/g, ' ').trim();
        if (!s) return fallback;
        s = s.replace(/\s+(\w)/g, function (_, c) { return c.toUpperCase(); });
        s = s.charAt(0).toUpperCase() + s.slice(1);
        return /^\d/.test(s) ? 'T' + s : s;
      }
      /* 字段名转 PascalCase 片段，用来拼嵌套类型名（profile → RootProfile） */
      function cap(s) {
        s = String(s || '');
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
      }
      function propKey(k, lang) {
        if (lang === 'ts') return /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        if (lang === 'go') return JSON.stringify(k);
        return /^[A-Za-z_][\w]*$/.test(k) ? k : JSON.stringify(k);
      }
      function pyName(k) {
        return /^[A-Za-z_][\w]*$/.test(k) ? k : null;
      }

      /* ---------------- TypeScript ---------------- */
      function ts(shapeRoot, rootName) {
        var blocks = [];
        var used = {};
        function typeOf(s, hint) {
          if (!s) return 'any';
          switch (s.kind) {
            case 'object':
              var name = sane(hint, 'Item');
              if (used[name]) name = name + '2';
              used[name] = true;
              var lines = [];
              Object.keys(s.props).forEach(function (k) {
                var p = s.props[k];
                lines.push('  ' + propKey(k, 'ts') + (p.optional ? '?' : '') + ': ' + typeOf(p, name + cap(k)) + ';');
              });
              blocks.push('export interface ' + name + ' {\n' + lines.join('\n') + '\n}');
              return name;
            case 'array':
              if (!s.items.length) return 'any[]';
              var m = merge(s.items);
              var inner = typeOf(m, hint + 'Item');
              return /[ |]/.test(inner) && inner.indexOf('[]') === -1 ? '(' + inner + ')[]' : inner + '[]';
            case 'int': case 'float': return 'number';
            case 'bool': return 'boolean';
            case 'string': return 'string';
            case 'null': return 'any';
            case 'union': return s.items.map(function (x) { return typeOf(x, hint); }).join(' | ');
            default: return 'any';
          }
        }
        var main = typeOf(shapeRoot, rootName);
        /* 根是对象时，第一块接口就是根，提到最前面便于阅读 */
        if (shapeRoot.kind === 'object') {
          var idx = blocks.findIndex(function (b) { return b.indexOf('interface ' + sane(rootName, 'Root') + ' ') === 0; });
          if (idx > 0) blocks.unshift(blocks.splice(idx, 1)[0]);
        }
        return blocks.join('\n\n') + '\n\n/* 根类型：' + main + ' */\n';
      }

      /* ---------------- Go ---------------- */
      function go(shapeRoot, rootName) {
        var blocks = [];
        var used = {};
        function typeOf(s, hint) {
          if (!s) return 'interface{}';
          switch (s.kind) {
            case 'object':
              var name = sane(hint, 'Item');
              if (used[name]) name = name + '2';
              used[name] = true;
              var lines = [];
              Object.keys(s.props).forEach(function (k) {
                var p = s.props[k];
                var t = typeOf(p, name + cap(k));
                if (p.optional) t = '*' + t.replace(/^\*/, '');
                lines.push('\t' + sane(k, 'Field') + ' ' + t + ' `json:"' + k + '"`');
              });
              blocks.push('type ' + name + ' struct {\n' + lines.join('\n') + '\n}');
              return name;
            case 'array':
              if (!s.items.length) return '[]interface{}';
              var m = merge(s.items);
              var inner = typeOf(m, hint + 'Item');
              return '[]' + inner;
            case 'union': return 'interface{}';
            case 'int': return 'int64';
            case 'float': return 'float64';
            case 'bool': return 'bool';
            case 'string': return 'string';
            default: return 'interface{}';
          }
        }
        var main = typeOf(shapeRoot, rootName);
        return 'package main\n\n' + blocks.join('\n\n') + '\n\n/* 根类型：' + main + ' */\n';
      }

      /* ---------------- Python ---------------- */
      function py(shapeRoot, rootName) {
        var blocks = [];
        var used = {};
        function typeOf(s, hint) {
          if (!s) return 'Any';
          switch (s.kind) {
            case 'object':
              var name = sane(hint, 'Item');
              if (used[name]) name = name + '2';
              used[name] = true;
              var lines = [];
              Object.keys(s.props).forEach(function (k) {
                var p = s.props[k];
                var key = pyName(k);
                var t = typeOf(p, name + cap(k));
                if (p.optional || !key) t = 'Optional[' + t + ']';
                lines.push('    ' + (key ? key : '"' + k + '"') + ': ' + t);
              });
              blocks.push('class ' + name + '(TypedDict, total=False):\n' + (lines.length ? lines.join('\n') : '    pass'));
              return name;
            case 'array':
              if (!s.items.length) return 'List[Any]';
              var m = merge(s.items);
              return 'List[' + typeOf(m, hint + 'Item') + ']';
            case 'union': return 'Union[' + s.items.map(function (x) { return typeOf(x, hint); }).join(', ') + ']';
            case 'int': return 'int';
            case 'float': return 'float';
            case 'bool': return 'bool';
            case 'string': return 'str';
            default: return 'Any';
          }
        }
        var main = typeOf(shapeRoot, rootName);
        return 'from typing import Any, Dict, List, Optional, TypedDict, Union\n\n\n' +
          blocks.join('\n\n\n') + '\n\n# 根类型：' + main + '\n';
      }

      function run() {
        var json;
        try { json = JSON.parse(TB.$('#src', root).value); }
        catch (e) { out.textContent = ''; msg.innerHTML = '<div class="result-err">JSON 解析失败：' + TB.esc(e.message) + '</div>'; return; }
        if (json === null || typeof json !== 'object') {
          out.textContent = '';
          msg.innerHTML = '<div class="result-err">根节点必须是对象或数组，单个标量没有类型可生成</div>';
          return;
        }
        var rootName = TB.$('#name', root).value.trim() || 'Root';
        var lang = TB.$('#lang', root).value;
        var sh = shape(json);
        try {
          out.textContent = lang === 'go' ? go(sh, rootName) : lang === 'py' ? py(sh, rootName) : ts(sh, rootName);
          msg.innerHTML = '';
        } catch (e) {
          out.textContent = '';
          msg.innerHTML = '<div class="result-err">生成失败：' + TB.esc(e.message) + '</div>';
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      ['#lang', '#name'].forEach(function (s) { TB.$(s, root).addEventListener('change', run); });
      TB.$('#name', root).addEventListener('input', TB.debounce(run, 300));
      run();
    }
  });

  /* ---------------------------------------------------------- 4. JSONPath */
  TB.def({
    slug: 'jsonpath', cat: 'web', name: 'JSONPath 查询', desc: '$..key 取值', icon: '🔎',
    kw: 'jsonpath json 查询 取值 提取 路径 过滤',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>JSON</b></div>' +
            '<textarea class="textarea codeIn" id="src" rows="7">{"store":{"book":[{"title":"A","price":10},{"title":"B","price":20}],"city":"上海"}}</textarea></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">JSONPath 表达式</div>' +
              '<input class="input codeIn" id="path" value="$.store.book[*].title" autocomplete="off" spellcheck="false"></div>' +
            '<div class="field"><div class="label">操作</div><div class="btns" style="margin:0">' +
              '<button class="btn primary" id="run">查询</button><button class="btn" id="copy">复制结果</button></div></div>' +
          '</div>' +
          '<div id="out" style="margin-top:14px"></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">支持 <code>$</code> 根、<code>.key</code> / <code>[&#39;key&#39;]</code>、<code>[0]</code> / <code>[-1]</code>、<code>[*]</code> 通配、<code>..key</code> 递归下降。过滤表达式 <code>[?(@.x==1)]</code> 不做。</div>';

      var out = TB.$('#out', root), msg = TB.$('#msg', root);

      /* 把路径切成 token：prop / index / wildcard / deep */
      function parsePath(text) {
        var p = String(text || '').trim();
        if (!p || p.charAt(0) !== '$') throw new Error('表达式要以 $ 开头，例如 $.data.items[*]');
        var tokens = [], i = 1;
        while (i < p.length) {
          if (p.charAt(i) === '.') {
            if (p.charAt(i + 1) === '.') {
              i += 2;
              var name = '';
              while (i < p.length && p.charAt(i) !== '.' && p.charAt(i) !== '[') name += p.charAt(i++);
              tokens.push({ t: name === '*' ? 'deepAll' : 'deep', name: name });
            } else {
              i++;
              if (p.charAt(i) === '*') { tokens.push({ t: 'wild' }); i++; continue; }
              var key = '';
              while (i < p.length && p.charAt(i) !== '.' && p.charAt(i) !== '[') key += p.charAt(i++);
              if (!key) throw new Error('“.” 后面缺少字段名');
              tokens.push({ t: 'prop', name: key });
            }
          } else if (p.charAt(i) === '[') {
            var close = p.indexOf(']', i);
            if (close < 0) throw new Error('缺少右方括号 ]');
            var inside = p.slice(i + 1, close).trim();
            i = close + 1;
            if (inside === '*') { tokens.push({ t: 'wild' }); continue; }
            var q = inside.match(/^['"]([\s\S]+)['"]$/);
            if (q) { tokens.push({ t: 'prop', name: q[1] }); continue; }
            if (/^-?\d+$/.test(inside)) { tokens.push({ t: 'index', n: parseInt(inside, 10) }); continue; }
            throw new Error('方括号里只支持字段名、数字下标或 *，收到 ' + inside);
          } else if (p.slice(i) === '*') {
            /* 允许直接写 $* */
            tokens.push({ t: 'wild' }); i++;
          } else {
            throw new Error('无法识别的位置：' + p.slice(i, i + 8));
          }
        }
        return tokens;
      }

      function collectDeep(value, name, out2) {
        if (Array.isArray(value)) {
          value.forEach(function (v) { collectDeep(v, name, out2); });
        } else if (value && typeof value === 'object') {
          Object.keys(value).forEach(function (k) {
            if (name === '*' || k === name) out2.push(value[k]);
            collectDeep(value[k], name, out2);
          });
        }
      }
      function collectAll(value, out2) {
        if (Array.isArray(value)) {
          value.forEach(function (v) { out2.push(v); collectAll(v, out2); });
        } else if (value && typeof value === 'object') {
          Object.keys(value).forEach(function (k) { out2.push(value[k]); collectAll(value[k], out2); });
        }
      }

      function query(data, tokens) {
        var current = [data];
        tokens.forEach(function (tk) {
          var next = [];
          current.forEach(function (v) {
            if (tk.t === 'prop') {
              if (v && typeof v === 'object' && !Array.isArray(v) && tk.name in v) next.push(v[tk.name]);
            } else if (tk.t === 'index') {
              if (Array.isArray(v)) {
                var idx = tk.n < 0 ? v.length + tk.n : tk.n;
                if (idx >= 0 && idx < v.length) next.push(v[idx]);
              }
            } else if (tk.t === 'wild') {
              if (Array.isArray(v)) v.forEach(function (x) { next.push(x); });
              else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { next.push(v[k]); });
            } else if (tk.t === 'deep') {
              collectDeep(v, tk.name, next);
            } else if (tk.t === 'deepAll') {
              collectAll(v, next);
            }
          });
          current = next;
        });
        return current;
      }

      function run() {
        var data;
        try { data = JSON.parse(TB.$('#src', root).value); }
        catch (e) { out.innerHTML = ''; msg.innerHTML = '<div class="result-err">JSON 解析失败：' + TB.esc(e.message) + '</div>'; return; }
        var tokens;
        try { tokens = parsePath(TB.$('#path', root).value); }
        catch (e) { out.innerHTML = ''; msg.innerHTML = '<div class="result-err">' + TB.esc(e.message) + '</div>'; return; }

        var hits = query(data, tokens);
        if (!hits.length) {
          out.innerHTML = '';
          msg.innerHTML = '<div class="note">没有匹配到任何值。</div>';
          return;
        }
        var lines = hits.map(function (h) {
          return typeof h === 'object' ? JSON.stringify(h, null, 2) : JSON.stringify(h);
        });
        out.innerHTML = '<div class="label"><b>命中 ' + hits.length + ' 个值</b></div>' +
          '<pre class="codeBox">' + TB.esc(lines.join('\n')) + '</pre>';
        msg.innerHTML = '';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () {
        var pre = out.querySelector('.codeBox');
        if (pre) TB.copy(pre.textContent);
      });
      TB.$('#path', root).addEventListener('input', TB.debounce(run, 350));
      run();
    }
  });

  /* ---------------------------------------------------------- 5. CSS 生成器 */
  TB.def({
    slug: 'css-gen', cat: 'web', name: 'CSS 生成器', desc: '渐变 / 阴影可视化', icon: '🎨',
    kw: 'css 渐变 gradient 阴影 box-shadow 生成器 样式',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="label"><b>线性渐变</b></div>' +
          '<div class="cssPreview" id="gPrev"></div>' +
          '<div class="row3" style="margin-top:12px">' +
            '<div class="field"><div class="label">角度 <b id="angV">135°</b></div>' +
              '<input type="range" id="ang" min="0" max="360" value="135" class="range"></div>' +
            '<div class="field"><div class="label">起点色</div><input type="color" class="input color" id="c1" value="#4f7cff"></div>' +
            '<div class="field"><div class="label">终点色</div><input type="color" class="input color" id="c2" value="#8b5cf6"></div>' +
          '</div>' +
          '<div class="field" style="margin-top:10px"><div class="label"><b>渐变代码</b></div>' +
            '<pre class="codeBox" id="gCode"></pre></div>' +
          '<div class="label" style="margin-top:22px"><b>卡片阴影</b></div>' +
          '<div class="shadowStage"><div class="shadowCard" id="sPrev">简单工具箱</div></div>' +
          '<div class="row3" style="margin-top:12px">' +
            '<div class="field"><div class="label">X 偏移 <b id="sxV">0</b>px</div><input type="range" id="sx" min="-40" max="40" value="0" class="range"></div>' +
            '<div class="field"><div class="label">Y 偏移 <b id="syV">18</b>px</div><input type="range" id="sy" min="-40" max="60" value="18" class="range"></div>' +
            '<div class="field"><div class="label">模糊 <b id="sbV">40</b>px</div><input type="range" id="sb" min="0" max="80" value="40" class="range"></div>' +
          '</div>' +
          '<div class="row3" style="margin-top:10px">' +
            '<div class="field"><div class="label">扩散 <b id="ssV">-12</b>px</div><input type="range" id="ss" min="-30" max="30" value="-12" class="range"></div>' +
            '<div class="field"><div class="label">颜色</div><input type="color" class="input color" id="sc" value="#1b2a4a"></div>' +
            '<div class="field"><div class="label">不透明度 <b id="soV">25</b>%</div><input type="range" id="so" min="0" max="100" value="25" class="range"></div>' +
          '</div>' +
          '<div class="field" style="margin-top:10px"><div class="label"><b>阴影代码</b></div>' +
            '<pre class="codeBox" id="sCode"></pre></div>' +
          '<div class="btns"><button class="btn" id="copyG">复制渐变</button>' +
            '<button class="btn" id="copyS">复制阴影</button></div>' +
        '</div>' +
        '<div class="note">调滑块就能看到效果，代码可直接粘到样式表。颜色用浏览器原生取色器，十六进制与透明度分开控制。</div>';

      function hexToRgba(hex, alpha) {
        var h = hex.replace('#', '');
        if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
        var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (alpha / 100).toFixed(2) + ')';
      }

      function draw() {
        var ang = TB.$('#ang', root).value;
        var c1 = TB.$('#c1', root).value, c2 = TB.$('#c2', root).value;
        TB.$('#angV', root).textContent = ang + '°';
        var g = 'linear-gradient(' + ang + 'deg, ' + c1 + ' 0%, ' + c2 + ' 100%)';
        TB.$('#gPrev', root).style.background = g;
        TB.$('#gCode', root).textContent = 'background: ' + g + ';';

        var sx = TB.$('#sx', root).value, sy = TB.$('#sy', root).value;
        var sb = TB.$('#sb', root).value, ss = TB.$('#ss', root).value;
        var sc = TB.$('#sc', root).value, so = TB.$('#so', root).value;
        TB.$('#sxV', root).textContent = sx;
        TB.$('#syV', root).textContent = sy;
        TB.$('#sbV', root).textContent = sb;
        TB.$('#ssV', root).textContent = ss;
        TB.$('#soV', root).textContent = so;
        var color = hexToRgba(sc, so);
        var shadow = sx + 'px ' + sy + 'px ' + sb + 'px ' + ss + 'px ' + color;
        TB.$('#sPrev', root).style.boxShadow = shadow;
        TB.$('#sCode', root).textContent = 'box-shadow: ' + shadow + ';';
      }

      Array.prototype.forEach.call(root.querySelectorAll('input'), function (el) {
        el.addEventListener('input', draw);
      });
      TB.$('#copyG', root).addEventListener('click', function () { TB.copy(TB.$('#gCode', root).textContent); });
      TB.$('#copyS', root).addEventListener('click', function () { TB.copy(TB.$('#sCode', root).textContent); });
      draw();
    }
  });

  /* ---------------------------------------------------------- 6. 对比度检测 */
  TB.def({
    slug: 'contrast', cat: 'web', name: '对比度检测', desc: 'WCAG AA / AAA', icon: '◐',
    kw: '对比度 wcag 可读性 无障碍 颜色 前景 背景',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>文字颜色</b></div>' +
              '<div class="calcRow"><input type="color" class="input color" id="fg" value="#1b2a4a">' +
              '<input class="input codeIn" id="fgHex" value="#1b2a4a" autocomplete="off"></div></div>' +
            '<div class="field"><div class="label"><b>背景颜色</b></div>' +
              '<div class="calcRow"><input type="color" class="input color" id="bg" value="#f4f6fb">' +
              '<input class="input codeIn" id="bgHex" value="#f4f6fb" autocomplete="off"></div></div>' +
          '</div>' +
          '<div class="contrastBox" id="demo">' +
            '<div style="font-size:22px;font-weight:700" id="big">大号文字预览 22px</div>' +
            '<div style="font-size:13px;margin-top:6px" id="small">正文预览 13px · 简单工具箱 The quick brown fox 0123456789</div>' +
          '</div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">按 WCAG 2.1 的相对亮度公式计算。正文（小于 18pt / 14pt 粗体）要 4.5:1 才过 AA，大号文字 3:1 即可；AAA 分别是 7:1 与 4.5:1。</div>';

      var out = TB.$('#out', root);

      function norm(hex) {
        var h = String(hex || '').trim().replace('#', '');
        if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
        return /^[0-9a-fA-F]{6}$/.test(h) ? '#' + h.toLowerCase() : null;
      }
      function lum(hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255;
        var g = parseInt(hex.slice(3, 5), 16) / 255;
        var b = parseInt(hex.slice(5, 7), 16) / 255;
        var f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      }

      function run() {
        var fg = norm(TB.$('#fgHex', root).value), bg = norm(TB.$('#bgHex', root).value);
        if (!fg || !bg) {
          out.innerHTML = '<div class="result-err">颜色要写成 #rrggbb 或 #rgb</div>';
          return;
        }
        TB.$('#fgHex', root).value = fg;
        TB.$('#bgHex', root).value = bg;
        TB.$('#fg', root).value = fg;
        TB.$('#bg', root).value = bg;
        TB.$('#demo', root).style.color = fg;
        TB.$('#demo', root).style.background = bg;

        var l1 = lum(fg), l2 = lum(bg);
        var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        var r2 = Math.round(ratio * 100) / 100;
        var pass = function (need) { return r2 >= need ? '<b class="ok">通过</b>' : '<b class="bad">不通过</b>'; };

        out.innerHTML =
          '<div class="kvTable">' +
            '<div class="kvRow"><span>对比度</span><b>' + r2 + ' : 1</b></div>' +
            '<div class="kvRow"><span>正文 AA（≥ 4.5）</span>' + pass(4.5) + '</div>' +
            '<div class="kvRow"><span>正文 AAA（≥ 7）</span>' + pass(7) + '</div>' +
            '<div class="kvRow"><span>大号文字 AA（≥ 3）</span>' + pass(3) + '</div>' +
            '<div class="kvRow"><span>大号文字 AAA（≥ 4.5）</span>' + pass(4.5) + '</div>' +
          '</div>' +
          '<div class="note" style="margin-top:8px">前景相对亮度 ' + Math.round(l1 * 10000) / 10000 +
          '，背景 ' + Math.round(l2 * 10000) / 10000 + '。</div>';
      }

      ['#fg', '#bg'].forEach(function (s) {
        TB.$(s, root).addEventListener('input', function () {
          TB.$(s + 'Hex', root).value = TB.$(s, root).value;
          run();
        });
      });
      ['#fgHex', '#bgHex'].forEach(function (s) {
        TB.$(s, root).addEventListener('input', TB.debounce(run, 300));
      });
      run();
    }
  });

  /* ---------------------------------------------------------- 7. ID 生成 */
  TB.def({
    slug: 'id-gen', cat: 'web', name: 'ID 生成', desc: 'NanoID / ULID / ObjectID', icon: '🆔',
    kw: 'nanoid ulid objectid mongodb 唯一 id 短 id 生成',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row3">' +
            '<div class="field"><div class="label">类型</div><select class="input" id="type">' +
              '<option value="nano" selected>NanoID（URL 安全短 ID）</option>' +
              '<option value="ulid">ULID（时间有序）</option>' +
              '<option value="oid">MongoDB ObjectID</option></select></div>' +
            '<div class="field"><div class="label">数量</div><input class="input" id="count" type="number" min="1" max="50" value="5"></div>' +
            '<div class="field"><div class="label">NanoID 长度</div><input class="input" id="len" type="number" min="6" max="64" value="21"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="copy">复制全部</button></div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>结果</b></div>' +
            '<pre class="codeBox" id="out"></pre></div>' +
          '<div id="meta"></div>' +
        '</div>' +
        '<div class="note">随机数用 <code>crypto.getRandomValues</code>，并按长度做拒绝采样，避免取模偏差。ULID 前 10 位是时间戳，可按生成顺序排序；ObjectID 前 8 位十六进制是时间。</div>';

      var out = TB.$('#out', root), meta = TB.$('#meta', root);
      var NANO = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
      var CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

      function randBytes(n) {
        var b = new Uint8Array(n);
        crypto.getRandomValues(b);
        return b;
      }
      function pick(alphabet, len) {
        var s = '', bytes = randBytes(len * 2), i = 0;
        /* nanoid 的做法：字母表长度不是 2 的幂时丢弃多余空间，避免概率不均 */
        var limit = 256 - (256 % alphabet.length);
        while (s.length < len) {
          if (i >= bytes.length) { bytes = randBytes(len * 2); i = 0; }
          var b = bytes[i++];
          if (b >= limit) continue;
          s += alphabet.charAt(b % alphabet.length);
        }
        return s;
      }
      function ulid() {
        var ts = Date.now();
        var time = '';
        for (var i = 0; i < 10; i++) {
          time = CROCK.charAt(ts % 32) + time;
          ts = Math.floor(ts / 32);
        }
        var body = '';
        for (var j = 0; j < 16; j++) body += CROCK.charAt(randBytes(1)[0] % 32);
        return time + body;
      }
      var counter = Math.floor(Math.random() * 0xFFFFFF);
      function objectId() {
        /* 4 字节时间 + 5 字节随机 + 3 字节自增计数，和 MongoDB 的构成一致 */
        var hex = Math.floor(Date.now() / 1000).toString(16);
        while (hex.length < 8) hex = '0' + hex;
        var mid = '', b = randBytes(5);
        for (var k = 0; k < 5; k++) mid += ('0' + b[k].toString(16)).slice(-2);
        counter = (counter + 1) % 0xFFFFFF;
        var c = counter.toString(16);
        while (c.length < 6) c = '0' + c;
        return hex + mid + c;
      }

      function run() {
        var n = Math.min(50, Math.max(1, parseInt(TB.$('#count', root).value, 10) || 1));
        var type = TB.$('#type', root).value;
        var len = Math.min(64, Math.max(6, parseInt(TB.$('#len', root).value, 10) || 21));
        var list = [];
        for (var i = 0; i < n; i++) {
          list.push(type === 'ulid' ? ulid() : type === 'oid' ? objectId() : pick(NANO, len));
        }
        out.textContent = list.join('\n');
        if (type === 'oid') {
          var first = list[0];
          var t = parseInt(first.slice(0, 8), 16) * 1000;
          meta.innerHTML = '<div class="note">ObjectID 时间戳解析：' + new Date(t).toLocaleString('zh-CN') +
            '（' + first.slice(0, 8) + '）</div>';
        } else if (type === 'ulid') {
          meta.innerHTML = '<div class="note">ULID 用 Crockford Base32 编码时间戳，同一毫秒内也按随机段递增排列。</div>';
        } else {
          meta.innerHTML = '<div class="note">NanoID 字符集 64 个字符，21 位约等于 126 位随机量。</div>';
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#type', root).addEventListener('change', run);
      run();
    }
  });

  /* ---------------------------------------------------------- 8. 假数据生成 */
  TB.def({
    slug: 'fake-data', cat: 'web', name: '假数据生成', desc: '姓名 / 手机 / 地址', icon: '🧪',
    kw: '假数据 mock 测试数据 姓名 手机 邮箱 地址 csv json',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row3">' +
            '<div class="field"><div class="label">行数</div><input class="input" id="count" type="number" min="1" max="200" value="20"></div>' +
            '<div class="field"><div class="label">输出格式</div><select class="input" id="fmt">' +
              '<option value="csv" selected>CSV（Excel 可开）</option><option value="json">JSON</option></select></div>' +
            '<div class="field"><div class="label">操作</div><div class="btns" style="margin:0">' +
              '<button class="btn primary" id="run">生成</button><button class="btn" id="dl">下载</button></div></div>' +
          '</div>' +
          '<div class="field" style="margin-top:6px"><div class="label">字段</div>' +
            '<div class="checks" id="fields">' +
              '<label><input type="checkbox" value="name" checked> 姓名</label>' +
              '<label><input type="checkbox" value="gender" checked> 性别</label>' +
              '<label><input type="checkbox" value="phone" checked> 手机号</label>' +
              '<label><input type="checkbox" value="email" checked> 邮箱</label>' +
              '<label><input type="checkbox" value="company" checked> 公司</label>' +
              '<label><input type="checkbox" value="city" checked> 城市</label>' +
              '<label><input type="checkbox" value="address"> 详细地址</label>' +
              '<label><input type="checkbox" value="date"> 日期</label>' +
            '</div></div>' +
          '<div class="field" style="margin-top:12px"><div class="label"><b>结果</b></div>' +
            '<textarea class="textarea codeIn" id="out" rows="12" readonly></textarea></div>' +
        '</div>' +
        '<div class="note">姓名、公司、地址都是随机拼出来的，不对应真实个人；手机号按 1[3-9] 规则随机拼出，仅用于测试，不是真实已分配的号码；邮箱统一用 example.com 这类保留域名。</div>';

      var SURNAME = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split('');
      var GIVEN = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '霞', '平', '刚', '桂英', '文', '辉', '建国', '志强', '建华', '晓明', '雪', '晨', '宇', '欣', '婷', '浩', '鑫'];
      var CITY = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '苏州', '天津', '长沙', '郑州', '青岛', '宁波', '东莞', '佛山', '合肥', '福州'];
      var ROAD = ['人民路', '中山路', '解放路', '建设路', '长江路', '文化路', '科技大道', '创业路', '园区二路', '滨江大道'];
      var COMPANY = ['云启科技', '星链网络', '蓝海数据', '智研信息', '天工智能', '万物互联', '极光软件', '拓维技术', '恒达系统', '锐捷云'];
      var DOMAIN = ['example.com', 'test.cn', 'demo.io', 'mail.com', 'sample.org'];

      function ri(n) { return Math.floor(Math.random() * n); }
      function pick(a) { return a[ri(a.length)]; }
      function pad(n) { return n < 10 ? '0' + n : String(n); }

      function oneRow(fields, i) {
        var name = pick(SURNAME) + pick(GIVEN);
        var gender = ri(2) ? '男' : '女';
        var city = pick(CITY);
        var obj = {};
        fields.forEach(function (f) {
          if (f === 'name') obj['姓名'] = name;
          else if (f === 'gender') obj['性别'] = gender;
          else if (f === 'phone') obj['手机号'] = '1' + (3 + ri(7)) + String(100000000 + ri(900000000)).slice(0, 9);
          else if (f === 'email') obj['邮箱'] = 'user' + (1000 + i) + '@' + pick(DOMAIN);
          else if (f === 'company') obj['公司'] = city + pick(COMPANY) + '有限公司';
          else if (f === 'city') obj['城市'] = city;
          else if (f === 'address') obj['地址'] = city + pick(ROAD) + (1 + ri(300)) + '号' + (1 + ri(20)) + '0' + (1 + ri(9)) + '室';
          else if (f === 'date') {
            var d = new Date(Date.now() - ri(365) * 86400000);
            obj['日期'] = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
          }
        });
        return obj;
      }

      function run() {
        var fields = Array.prototype.map.call(root.querySelectorAll('#fields input:checked'), function (el) { return el.value; });
        if (!fields.length) { TB.toast('至少选一个字段'); return; }
        var n = Math.min(200, Math.max(1, parseInt(TB.$('#count', root).value, 10) || 1));
        var rows = [];
        for (var i = 0; i < n; i++) rows.push(oneRow(fields, i));
        if (TB.$('#fmt', root).value === 'json') {
          TB.$('#out', root).value = JSON.stringify(rows, null, 2);
        } else {
          var head = Object.keys(rows[0]);
          var esc = function (s) { return /[",\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : s; };
          var lines = [head.join(',')].concat(rows.map(function (r) {
            return head.map(function (k) { return esc(r[k]); }).join(',');
          }));
          TB.$('#out', root).value = lines.join('\n');
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#fmt', root).addEventListener('change', run);
      TB.$('#dl', root).addEventListener('click', function () {
        if (!TB.$('#out', root).value) run();
        var fmt = TB.$('#fmt', root).value;
        TB.downloadText(TB.$('#out', root).value, 'mock-data.' + fmt, fmt === 'json' ? 'application/json' : 'text/csv');
      });
      run();
    }
  });

  /* ---------------------------------------------------------- 9. 文本相似度 */
  TB.def({
    slug: 'text-similarity', cat: 'web', name: '文本相似度', desc: '编辑距离 / Jaccard / 余弦', icon: '📊',
    kw: '相似度 文本 重复 查重 编辑距离 levenshtein',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>文本 A</b></div>' +
              '<textarea class="textarea codeIn" id="a" rows="7">简单工具箱是一个纯静态的在线工具站。</textarea></div>' +
            '<div class="field"><div class="label"><b>文本 B</b></div>' +
              '<textarea class="textarea codeIn" id="b" rows="7">简单工具箱是一个纯前端的在线工具集合。</textarea></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">比较</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">三种口径一起看更稳：编辑距离看逐字改动，Jaccard 看二元组重合，余弦看词频分布。超过 5000 字会截断，避免浏览器卡住。</div>';

      var out = TB.$('#out', root);

      function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        var prev = new Array(b.length + 1), cur = new Array(b.length + 1);
        for (var j = 0; j <= b.length; j++) prev[j] = j;
        for (var i = 1; i <= a.length; i++) {
          cur[0] = i;
          for (var k = 1; k <= b.length; k++) {
            var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
            cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost);
          }
          var tmp = prev; prev = cur; cur = tmp;
        }
        return prev[b.length];
      }
      function bigrams(s) {
        var set = {};
        for (var i = 0; i < s.length - 1; i++) set[s.substr(i, 2)] = 1;
        return set;
      }
      function chars(s) {
        var map = {};
        for (var i = 0; i < s.length; i++) map[s.charAt(i)] = (map[s.charAt(i)] || 0) + 1;
        return map;
      }
      function pct(x) { return (Math.round(x * 1000) / 10).toFixed(1) + '%'; }
      function bar(v) {
        var w = Math.max(0, Math.min(100, v * 100));
        return '<div class="simBar"><i style="width:' + w + '%"></i></div>';
      }

      function run() {
        var a = TB.$('#a', root).value.slice(0, 5000);
        var b = TB.$('#b', root).value.slice(0, 5000);
        if (!a.length && !b.length) { out.innerHTML = '<div class="result-err">两段都空着</div>'; return; }

        var dist = levenshtein(a, b);
        var simEdit = 1 - dist / Math.max(1, Math.max(a.length, b.length));

        var A = bigrams(a), B = bigrams(b);
        var inter = 0, union = 0;
        var keys = {};
        Object.keys(A).forEach(function (k) { keys[k] = 1; });
        Object.keys(B).forEach(function (k) { keys[k] = 1; });
        Object.keys(keys).forEach(function (k) {
          var x = A[k] ? 1 : 0, y = B[k] ? 1 : 0;
          if (x && y) inter++;
          if (x || y) union++;
        });
        var simJac = union ? inter / union : 0;

        var CA = chars(a), CB = chars(b);
        var dot = 0, na = 0, nb = 0;
        var all = {};
        Object.keys(CA).forEach(function (k) { all[k] = 1; });
        Object.keys(CB).forEach(function (k) { all[k] = 1; });
        Object.keys(all).forEach(function (k) {
          var x = CA[k] || 0, y = CB[k] || 0;
          dot += x * y; na += x * x; nb += y * y;
        });
        var simCos = na && nb ? dot / Math.sqrt(na * nb) : 0;

        out.innerHTML =
          '<div class="kvTable">' +
            '<div class="kvRow"><span>编辑距离</span><b>' + dist + ' 次改动 · 相似 ' + pct(simEdit) + '</b></div>' +
            '<div class="kvRow"><span>Jaccard（二元组）</span><b>交集 ' + inter + ' / 并集 ' + union + ' · ' + pct(simJac) + '</b></div>' +
            '<div class="kvRow"><span>余弦（字频）</span><b>' + pct(simCos) + '</b></div>' +
          '</div>' +
          '<div class="simPanel">' +
            '<div class="simRow"><span>编辑距离</span>' + bar(simEdit) + '<b>' + pct(simEdit) + '</b></div>' +
            '<div class="simRow"><span>Jaccard</span>' + bar(simJac) + '<b>' + pct(simJac) + '</b></div>' +
            '<div class="simRow"><span>余弦</span>' + bar(simCos) + '<b>' + pct(simCos) + '</b></div>' +
          '</div>' +
          '<div class="note" style="margin-top:8px">A ' + a.length + ' 字，B ' + b.length + ' 字。</div>';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#a', root).addEventListener('input', TB.debounce(run, 300));
      TB.$('#b', root).addEventListener('input', TB.debounce(run, 300));
      run();
    }
  });

  /* ---------------------------------------------------------- 10. 二维码识别 */
  TB.def({
    slug: 'qr-scan', cat: 'image', name: '二维码识别', desc: '图片解出内容', icon: '🔍',
    kw: '二维码 识别 解码 扫码 qr 图片',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>二维码图片</b></div>' +
            '<div id="pick"></div></div>' +
          '<div class="qrScanWrap"><canvas id="cv"></canvas></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">纯本地解码：图片画到 canvas，再交给 jsQR（Apache-2.0，按需加载 250KB）。模糊、反光、过度压缩的图可能识不出来，尽量用原图。</div>';

      var out = TB.$('#out', root), cv = TB.$('#cv', root);

      async function decode(file) {
        out.innerHTML = '<div class="note">识别中…</div>';
        try {
          var res = await TB.readImage(file);
          var img = res.img;
          /* 大图先缩到 1400px 以内，jsQR 对超大图反而慢且容易失败 */
          var scale = Math.min(1, 1400 / Math.max(img.width, img.height));
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          var g = cv.getContext('2d');
          g.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(res.url);
          var data = g.getImageData(0, 0, cv.width, cv.height);
          await TB.loadLib('jsqr.min.js');
          var result = window.jsQR(data.data, cv.width, cv.height, { inversionAttempts: 'attemptBoth' });
          if (!result) {
            out.innerHTML = '<div class="result-err">没识别出二维码。换个清晰的图，或把二维码裁出来再试。</div>';
            return;
          }
          out.innerHTML =
            '<div class="kvTable" style="margin-bottom:12px">' +
              '<div class="kvRow"><span>版本</span><b>' + result.version + '</b></div>' +
              '<div class="kvRow"><span>内容长度</span><b>' + result.data.length + ' 字符</b></div>' +
            '</div>' +
            '<div class="label"><b>内容</b><button class="btn sm" id="copyRes" style="margin-left:auto">复制</button></div>' +
            '<pre class="codeBox" id="res">' + TB.esc(result.data) + '</pre>';
          TB.$('#copyRes', root).addEventListener('click', function () { TB.copy(result.data); });
        } catch (e) {
          out.innerHTML = '<div class="result-err">识别失败：' + TB.esc(e.message) + '</div>';
        }
      }

      /* 复用全站的拖拽选择器，选图后自动解码 */
      var pick = TB.filePicker(TB.$('#pick', root), { accept: 'image/*', hint: 'PNG / JPG / WebP，单张' });
      pick.onChange = function () {
        if (pick.files.length) decode(pick.files[0].file);
      };
    }
  });

})();



