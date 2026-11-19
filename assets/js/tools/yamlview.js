/* =============================================================================
 * YAML 可视化查看器
 * -----------------------------------------------------------------------------
 * 用本地 js-yaml 解析 YAML，再渲染成可折叠的配置树。
 * 支持对象、数组、标量、日期、多文档和锚点引用；点击行可复制 JSONPath。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE =
    'app:\n' +
    '  name: simple-toolbox\n' +
    '  version: 1.0.0\n' +
    '  features:\n' +
    '    - yaml-view\n' +
    '    - json-tree\n' +
    '  limits:\n' +
    '    maxNodes: 2000\n' +
    '    maxDepth: 20\n' +
    '  enabled: true\n' +
    '  owner:\n' +
    '    name: xgnw\n' +
    '    links:\n' +
    '      site: https://tools.432600.xyz/\n' +
    '      repo: https://github.com/xgnw/tools\n';

  var MAX_NODES = 2000;

  function keyPath(parent, key, isIndex) {
    var base = parent || '$';
    if (isIndex) return base + '[' + key + ']';
    return /^[A-Za-z_$][\w$]*$/.test(key) ? base + '.' + key : base + '["' + String(key).replace(/"/g, '\\"') + '"]';
  }

  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (v instanceof Date) return 'date';
    return typeof v;
  }

  function valueText(v) {
    var t = typeOf(v);
    if (t === 'null') return 'null';
    if (t === 'string') {
      var s = JSON.stringify(v);
      return s.length > 120 ? s.slice(0, 117) + '…"' : s;
    }
    if (t === 'date') return v.toISOString();
    if (t === 'object' || t === 'array') {
      var n = t === 'array' ? v.length : Object.keys(v).length;
      return (t === 'array' ? '[…]' : '{…}') + ' · ' + n + (t === 'array' ? ' 项' : ' 个字段');
    }
    return String(v);
  }

  function buildTree(value, key, path, parentBox, seen, state) {
    if (state.count >= MAX_NODES) { state.truncated = true; return null; }
    state.count++;
    var t = typeOf(value);
    var container = t === 'object' || t === 'array';
    var node = document.createElement('div');
    node.className = 'jt-node';
    node.dataset.path = path;

    var row = document.createElement('div');
    row.className = 'jt-row';
    row.title = '点击复制路径：' + path;

    var toggle = document.createElement('span');
    toggle.className = 'jt-toggle';
    toggle.textContent = container ? '▾' : '·';
    row.appendChild(toggle);

    var keyEl = document.createElement('span');
    keyEl.className = 'jt-key';
    keyEl.textContent = key;
    row.appendChild(keyEl);

    var typeEl = document.createElement('span');
    typeEl.className = 'jt-type';
    typeEl.textContent = t;
    row.appendChild(typeEl);

    var valEl = document.createElement('span');
    valEl.className = 'jt-val';
    valEl.textContent = valueText(value);
    row.appendChild(valEl);
    node.appendChild(row);

    var childBox = null;
    var expanded = true;
    var hasChildren = false;
    if (container) {
      var repeat = seen.has(value);
      if (repeat) {
        valEl.textContent = '↺ 引用（已展开过）';
      } else {
        seen.add(value);
        childBox = document.createElement('div');
        childBox.className = 'jt-children';
        node.appendChild(childBox);
        var keys = t === 'array' ? value.map(function (_, i) { return i; }) : Object.keys(value);
        keys.forEach(function (k) {
          var child = buildTree(value[k], String(k), keyPath(path, k, t === 'array'), childBox, seen, state);
          if (child) childBox.appendChild(child);
        });
        hasChildren = true;
        if (!keys.length) valEl.textContent = t === 'array' ? '[] · 空数组' : '{} · 空对象';
      }
    }

    function setExpanded(on) {
      expanded = on;
      if (childBox) childBox.style.display = on ? '' : 'none';
      if (hasChildren) toggle.textContent = on ? '▾' : '▸';
      node.classList.toggle('jt-collapsed', !on);
    }

    if (hasChildren) {
      toggle.style.cursor = 'pointer';
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        setExpanded(!expanded);
      });
      node._toggle = setExpanded;
    }

    row.addEventListener('click', function () {
      TB.copy(path);
    });
    node._setExpanded = setExpanded;
    return node;
  }

  function collect(node, list) {
    if (!node) return;
    list.push(node);
    Array.prototype.forEach.call(node.children, function (child) {
      if (child.classList && child.classList.contains('jt-node')) collect(child, list);
    });
  }

  TB.def({
    slug: 'yamlview',
    cat: 'web',
    name: 'YAML 可视化查看器',
    desc: '把 YAML 配置渲染成可折叠的树，点击复制路径。',
    icon: '🌲',
    kw: 'yaml yml 可视化 查看器 配置 树 折叠 k8s docker compose',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">YAML 源码 <span class="hint">支持多文档与锚点引用</span></div>' +
          '<div class="field"><textarea class="textarea" id="yvIn" rows="10" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="yvRun" type="button">解析并查看</button>' +
            '<button class="btn" id="yvSample" type="button">载入示例</button>' +
            '<button class="btn" id="yvExpand" type="button">展开全部</button>' +
            '<button class="btn" id="yvCollapse" type="button">折叠全部</button>' +
            '<button class="btn" id="yvCopy" type="button">复制 JSON</button></div>' +
          '<div class="hint" id="yvMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">配置树 <span class="hint">点击行复制 JSONPath</span></div><div class="jt-tree" id="yvTree"></div></div>' +
        '<p class="note">解析在浏览器内完成，使用本地 js-yaml；树最多展开 2000 个节点，超大配置建议先裁剪。</p>';

      var input = TB.$('#yvIn', root);
      var tree = TB.$('#yvTree', root);
      var msg = TB.$('#yvMsg', root);
      var parsed = null;
      var hasParsed = false;

      async function parse() {
        if (!input.value.trim()) { tree.innerHTML = ''; msg.textContent = '先粘贴一段 YAML'; parsed = null; hasParsed = false; return; }
        try {
          await TB.loadLib('js-yaml.min.js');
          var Y = window.jsyaml;
          var docs = Y.loadAll(input.value);
          if (!docs.length) throw new Error('YAML 内容为空');
          parsed = docs.length === 1 ? docs[0] : docs;
          hasParsed = true;
          tree.innerHTML = '';
          var state = { count: 0, truncated: false };
          var seen = new WeakSet();
          var rootNode = buildTree(parsed, '$', '$', tree, seen, state);
          if (rootNode) tree.appendChild(rootNode);
          if (state.truncated) {
            var tip = document.createElement('div');
            tip.className = 'jt-truncated hint';
            tip.textContent = '节点超过 ' + MAX_NODES + ' 个，后面的内容已省略。';
            tree.appendChild(tip);
          }
          msg.textContent = '解析成功 · ' + state.count + ' 个节点' + (docs.length > 1 ? ' · ' + docs.length + ' 个文档' : '');
        } catch (e) {
          parsed = null;
          hasParsed = false;
          tree.innerHTML = '';
          var detail = e.mark ? '（第 ' + (e.mark.line + 1) + ' 行，第 ' + (e.mark.column + 1) + ' 列）' : '';
          msg.textContent = 'YAML 解析失败' + detail + '：' + e.message.split('\n')[0];
        }
      }

      TB.$('#yvRun', root).addEventListener('click', parse);
      TB.$('#yvSample', root).addEventListener('click', function () { input.value = SAMPLE; parse(); });
      TB.$('#yvExpand', root).addEventListener('click', function () {
        collect(tree.firstElementChild, []).forEach(function (n) { if (n._setExpanded) n._setExpanded(true); });
      });
      TB.$('#yvCollapse', root).addEventListener('click', function () {
        var all = collect(tree.firstElementChild, []);
        all.forEach(function (n, i) { if (n._setExpanded) n._setExpanded(i === 0); });
      });
      TB.$('#yvCopy', root).addEventListener('click', function () {
        if (!hasParsed) { TB.toast('还没有解析结果'); return; }
        try { TB.copy(JSON.stringify(parsed, null, 2)); } catch (e) { TB.toast('JSON 序列化失败：' + e.message); }
      });

      input.value = SAMPLE;
      parse();
    }
  });
})();
