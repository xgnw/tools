/* =============================================================================
 * JSON 树形可视化
 * -----------------------------------------------------------------------------
 * 把 JSON 解析成可折叠的节点树：对象按 key、数组按下标展开，支持按关键词
 * 过滤并自动展开命中路径。只读取粘贴内容，不请求外部接口。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '{\n' +
    '  "site": "简单工具箱",\n' +
    '  "count": 174,\n' +
    '  "local": true,\n' +
    '  "categories": [\n' +
    '    { "id": "office", "name": "办公文档", "count": 32 },\n' +
    '    { "id": "image", "name": "图片处理", "count": 24 },\n' +
    '    { "id": "web", "name": "站长工具", "count": 65 }\n' +
    '  ],\n' +
    '  "links": { "home": "https://tools.432600.xyz/", "source": "https://github.com/xgnw/tools" },\n' +
    '  "empty": null\n' +
    '}';

  var MAX_NODES = 2500;

  function pathKey(parent, key, isIndex) {
    if (isIndex) return parent + '[' + key + ']';
    return parent + (/^[A-Za-z_$][\w$]*$/.test(key) ? '.' + key : '[' + JSON.stringify(key) + ']');
  }

  function typeName(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function shortValue(v, type) {
    if (type === 'object') return '{…}';
    if (type === 'array') return '[…]';
    if (type === 'null') return 'null';
    if (type === 'string') {
      var s = JSON.stringify(v);
      return s.length > 72 ? s.slice(0, 69) + '…"' : s;
    }
    return String(v);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  TB.def({
    slug: 'jsontree',
    cat: 'web',
    name: 'JSON 树形可视化',
    desc: '折叠展开 JSON 对象与数组，按关键词定位字段和值。',
    icon: '🌳',
    kw: 'json 树 可视化 折叠 展开 查看 格式化 结构 path',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">JSON 数据</div>' +
          '<div class="field"><textarea class="textarea" id="jtIn" rows="8" spellcheck="false"></textarea></div>' +
          '<div class="row"><div class="field"><div class="label">过滤关键词</div><input class="input" id="jtSearch" placeholder="按字段名、值或路径过滤"></div>' +
          '<div class="field"><div class="label">当前路径</div><input class="input" id="jtPath" readonly value="$"></div></div>' +
          '<div class="btns"><button class="btn primary" id="jtRun" type="button">解析</button>' +
            '<button class="btn" id="jtSample" type="button">载入示例</button>' +
            '<button class="btn" id="jtExpand" type="button">展开全部</button>' +
            '<button class="btn" id="jtCollapse" type="button">折叠全部</button>' +
            '<button class="btn" id="jtCopyPath" type="button">复制路径</button></div>' +
          '<div class="hint" id="jtInfo" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">结构预览 <span class="hint">点击箭头展开，点击行选中路径</span></div><div class="jt-tree" id="jtTree"></div></div>' +
        '<p class="note">为了保持页面流畅，最多渲染约 ' + MAX_NODES + ' 个节点；超大 JSON 建议先用 JSON 格式化或 JSONPath 查询缩小范围。</p>';

      var input = TB.$('#jtIn', root);
      var search = TB.$('#jtSearch', root);
      var pathBox = TB.$('#jtPath', root);
      var info = TB.$('#jtInfo', root);
      var tree = TB.$('#jtTree', root);
      var allNodes = [];
      var selected = null;

      function makeNode(key, value, path, depth, isIndex) {
        if (allNodes.length >= MAX_NODES) return null;
        var type = typeName(value);
        var node = el('div', 'jt-node');
        node.dataset.path = path;
        var row = el('div', 'jt-row');
        row.title = path;
        var coll = type === 'object' || type === 'array';
        var toggle = el('span', 'jt-toggle', coll ? '▸' : '');
        row.appendChild(toggle);
        row.appendChild(el('span', 'jt-key', isIndex ? '[' + key + ']' : (depth === 0 ? '$' : key)));
        row.appendChild(el('span', 'jt-type', type));
        row.appendChild(el('span', 'jt-val', coll ? shortValue(value, type) + ' · ' + Object.keys(value).length + (type === 'array' ? ' 项' : ' 个字段') : shortValue(value, type)));
        node.appendChild(row);
        node._children = [];
        node._expanded = false;
        allNodes.push(node);

        if (coll) {
          var children = el('div', 'jt-children');
          children.hidden = true;
          var keys = type === 'array' ? value.map(function (_, i) { return i; }) : Object.keys(value);
          keys.forEach(function (k) {
            var child = makeNode(k, value[k], pathKey(path, k, type === 'array'), depth + 1, type === 'array');
            if (child) { node._children.push(child); children.appendChild(child); }
            else if (!node._truncated) {
              node._truncated = true;
              children.appendChild(el('div', 'jt-truncated hint', '节点超过 ' + MAX_NODES + ' 个，后续内容已省略'));
            }
          });
          node.appendChild(children);
          node._childrenBox = children;
        }
        return node;
      }

      function setExpanded(node, open) {
        node._expanded = open;
        if (!node._childrenBox) return;
        node._childrenBox.hidden = !open;
        var t = node.querySelector('.jt-toggle');
        if (t) t.textContent = open ? '▾' : '▸';
        if (open) node.classList.add('open'); else node.classList.remove('open');
      }

      function collapseAll() {
        allNodes.forEach(function (n) { setExpanded(n, false); });
        if (tree.firstChild) setExpanded(tree.firstChild, true);
      }

      function expandAll() {
        allNodes.forEach(function (n) { setExpanded(n, true); });
      }

      function selectPath(node) {
        if (selected) selected.classList.remove('jt-selected');
        selected = node;
        node.classList.add('jt-selected');
        pathBox.value = node.dataset.path;
      }

      function filter() {
        var q = search.value.trim().toLowerCase();
        if (!q) {
          allNodes.forEach(function (n) { n.classList.remove('jt-hide', 'jt-hit'); });
          collapseAll();
          info.textContent = '已解析 · ' + allNodes.length + ' 个节点';
          return;
        }
        function walk(node) {
          var own = node.querySelector('.jt-row').textContent.toLowerCase().indexOf(q) > -1;
          var hit = own;
          node._children.forEach(function (c) { if (walk(c)) hit = true; });
          node.classList.toggle('jt-hit', own);
          node.classList.toggle('jt-hide', !hit);
          if (hit && node._childrenBox) setExpanded(node, true);
          return hit;
        }
        if (tree.firstChild) walk(tree.firstChild);
        var shown = allNodes.filter(function (n) { return !n.classList.contains('jt-hide'); }).length;
        info.textContent = '过滤「' + search.value.trim() + '」· 命中路径 ' + shown + ' 个节点';
      }

      function run() {
        tree.innerHTML = '';
        allNodes = [];
        selected = null;
        pathBox.value = '$';
        var data;
        try {
          data = JSON.parse(input.value);
        } catch (e) {
          info.textContent = 'JSON 解析失败：' + e.message;
          return;
        }
        var rootNode = makeNode('', data, '$', 0, false);
        tree.appendChild(rootNode);
        setExpanded(rootNode, true);
        selectPath(rootNode);
        info.textContent = '已解析 · ' + allNodes.length + ' 个节点';
        if (search.value.trim()) filter();
      }

      tree.addEventListener('click', function (e) {
        var toggle = e.target.closest('.jt-toggle');
        var row = e.target.closest('.jt-row');
        if (!row) return;
        var node = row.parentNode;
        if (toggle && node._childrenBox) {
          setExpanded(node, !node._expanded);
          e.stopPropagation();
          return;
        }
        selectPath(node);
      });

      TB.$('#jtRun', root).addEventListener('click', run);
      TB.$('#jtSample', root).addEventListener('click', function () { input.value = SAMPLE; run(); });
      TB.$('#jtExpand', root).addEventListener('click', expandAll);
      TB.$('#jtCollapse', root).addEventListener('click', collapseAll);
      TB.$('#jtCopyPath', root).addEventListener('click', function () { TB.copy(pathBox.value); });
      search.addEventListener('input', function () {
        clearTimeout(root._jtTimer);
        root._jtTimer = setTimeout(filter, 250);
      });
      input.value = SAMPLE;
      run();
    }
  });
})();
