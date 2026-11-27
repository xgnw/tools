/* =============================================================================
 * XPath 测试器
 * -----------------------------------------------------------------------------
 * 粘贴 XML / HTML 源码，用浏览器原生 document.evaluate 执行 XPath。
 * 输出文本、HTML 或 JSON；只处理粘贴内容，不抓取网址（避免跨域和隐私问题）。
 * ========================================================================== */

(function () {
  'use strict';

  var SAMPLE = [
    '<catalog>',
    '  <book id="bk101" category="tech">',
    '    <title>XML 入门</title>',
    '    <author>张三</author>',
    '    <price>39.90</price>',
    '  </book>',
    '  <book id="bk102" category="life">',
    '    <title>周末手记</title>',
    '    <author>李四</author>',
    '    <price>28.00</price>',
    '  </book>',
    '</catalog>'
  ].join('\n');

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note xp-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function nodeValue(node, mode) {
    if (!node) return '';
    if (node.nodeType === 2) {
      return mode === 'html' ? node.name + '="' + node.value + '"' : node.value;
    }
    if (node.nodeType === 1) return mode === 'html' ? node.outerHTML : node.textContent;
    return node.nodeValue == null ? '' : node.nodeValue;
  }

  function evaluateExpr(doc, expr) {
    var result = doc.evaluate(expr, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    if (result.resultType === XPathResult.NUMBER_TYPE) return { scalar: result.numberValue, count: 1 };
    if (result.resultType === XPathResult.STRING_TYPE) return { scalar: result.stringValue, count: 1 };
    if (result.resultType === XPathResult.BOOLEAN_TYPE) return { scalar: result.booleanValue, count: 1 };
    var nodes = [];
    for (var i = 0; i < result.snapshotLength; i++) nodes.push(result.snapshotItem(i));
    return { nodes: nodes, count: nodes.length };
  }

  TB.def({
    slug: 'xpath', cat: 'web', name: 'XPath 测试器', desc: 'XML / HTML 节点查询',
    icon: '🔎', kw: 'xpath xml html 选择器 爬虫 采集 节点 查询 测试',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">源码与表达式<span class="hint">只处理粘贴内容，不抓取网址</span></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>源码类型</b></div><select class="input" id="xpMode">' +
              '<option value="xml">XML</option><option value="html">HTML</option></select></div>' +
            '<div class="field"><div class="label"><b>输出格式</b></div><select class="input" id="xpOut">' +
              '<option value="text">文本（每行一条）</option><option value="json">JSON 数组</option><option value="html">节点 HTML</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>XPath 表达式</b></div>' +
            '<input class="input xp-expr" id="xpExpr" value="//book[@category=&quot;tech&quot;]/title" autocomplete="off" spellcheck="false" placeholder="如 //a/@href 或 count(//book)"></div>' +
          '<div class="field"><div class="label"><b>源码</b> <span class="xp-dim">支持 XML / HTML 片段</span></div>' +
            '<textarea class="textarea xp-src" id="xpSrc" spellcheck="false" placeholder="粘贴 XML 或 HTML"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="xpRun" type="button">执行查询</button>' +
            '<button class="btn" id="xpSample" type="button">填入示例</button>' +
            '<button class="btn" id="xpClear" type="button">清空</button></div>' +
          '<div id="xpMsg"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">查询结果<span class="hint" id="xpCount">等待执行</span></div>' +
          '<div class="out xp-out">' +
            '<div class="out-h"><span class="grow" id="xpLabel">结果会显示在这里</span>' +
              '<button class="btn sm" id="xpCopy" type="button">复制</button>' +
              '<button class="btn sm" id="xpDl" type="button">下载</button></div>' +
            '<pre class="out-b xp-code" id="xpResult"></pre>' +
          '</div>' +
          '<div class="note">XPath 示例：<code>//a/@href</code> 取链接，<code>//div[@class="item"]</code> 取节点，<code>count(//book)</code> 计数。HTML 会按浏览器的容错规则解析；需要严格 XML 校验时请选 XML。</div>' +
        '</div>';

      var src = TB.$('#xpSrc', root), expr = TB.$('#xpExpr', root);
      var mode = TB.$('#xpMode', root), fmt = TB.$('#xpOut', root);
      var resultEl = TB.$('#xpResult', root), countEl = TB.$('#xpCount', root);
      var label = TB.$('#xpLabel', root), msg = TB.$('#xpMsg', root);
      var last = '';

      function run() {
        var source = src.value.trim();
        var q = expr.value.trim();
        if (!source) { status(msg, '请先粘贴 XML 或 HTML 源码', true); return; }
        if (!q) { status(msg, '请输入 XPath 表达式', true); return; }
        try {
          var type = mode.value === 'html' ? 'text/html' : 'application/xml';
          var doc = new DOMParser().parseFromString(source, type);
          if (mode.value === 'xml') {
            var err = doc.querySelector('parsererror');
            if (err) throw new Error('XML 解析失败：' + (err.textContent || '').replace(/\s+/g, ' ').slice(0, 180));
          }
          var data = evaluateExpr(doc, q);
          var values, display, count = data.count;
          if (data.scalar !== undefined) {
            values = [String(data.scalar)];
            display = String(data.scalar);
          } else {
            var all = data.nodes.map(function (n) { return nodeValue(n, fmt.value); });
            values = all.slice(0, 200);
            if (fmt.value === 'json') display = JSON.stringify(values, null, 2);
            else display = values.join('\n');
            if (all.length > 200) display += '\n… 仅显示前 200 条（共 ' + all.length + ' 条）';
          }
          if (!data.scalar && count === 0) {
            resultEl.textContent = '没有匹配到节点';
            countEl.textContent = '0 条';
            label.textContent = '查询完成';
            last = '';
            status(msg, '没有匹配结果，请检查表达式或源码类型', true);
            return;
          }
          if (display.length > 80000) {
            display = display.slice(0, 80000) + '\n… 内容过长，已截断';
          }
          resultEl.textContent = display;
          last = display;
          countEl.textContent = count + ' 条';
          label.textContent = q.length > 48 ? q.slice(0, 48) + '…' : q;
          status(msg, '查询完成', false);
        } catch (e) {
          resultEl.textContent = '';
          last = '';
          countEl.textContent = '执行失败';
          label.textContent = '请检查表达式';
          status(msg, e && e.message ? e.message : 'XPath 执行失败', true);
        }
      }

      TB.$('#xpRun', root).addEventListener('click', run);
      TB.$('#xpSample', root).addEventListener('click', function () {
        mode.value = 'xml'; fmt.value = 'text'; src.value = SAMPLE;
        expr.value = '//book[@category="tech"]/title';
        run();
      });
      TB.$('#xpClear', root).addEventListener('click', function () {
        src.value = ''; expr.value = ''; resultEl.textContent = ''; last = '';
        countEl.textContent = '等待执行'; label.textContent = '结果会显示在这里'; status(msg, '');
      });
      TB.$('#xpCopy', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先执行查询', true); return; }
        TB.copy(last);
      });
      TB.$('#xpDl', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先执行查询', true); return; }
        TB.downloadText(last, 'xpath-result.txt', 'text/plain');
      });
      src.addEventListener('input', function () { status(msg, ''); });
      expr.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });

      src.value = SAMPLE;
      run();
    }
  });
})();
