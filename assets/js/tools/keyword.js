/* =============================================================================
 * 关键词密度分析器
 * -----------------------------------------------------------------------------
 * 中文用 Intl.Segmenter 分词，英文按单词统计；过滤常见虚词，计算词频与密度。
 * 所有分析在浏览器内完成，文本不会上传。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '简单工具箱是一个纯本地的在线工具站。所有图片、PDF、文档和表格都在浏览器里处理，文件不会上传到服务器。\n\n这里提供图片压缩、PDF 合并、JSON 格式化、二维码生成等常用工具。每个工具都尽量保持简单，打开即用，不需要登录，也没有次数限制。';

  var STOP = ('的 了 和 是 在 我 有 就 不 人 都 一 一个 上 也 很 到 说 要 去 你 会 着 没有 看 好 自己 这 那 他 她 它 们 与 及 或 而 但 并 被 把 让 给 对 从 为 以 于 中 内 外 后 前 里 时 年 月 日 个 些 什么 怎么 如何 可以 进行 我们 你们 他们 以及 因为 所以 如果 但是 然后 已经 还是 就是 这个 那个 这些 那些 不是 需要 使用 支持 以及 一个 一种 一些 通过 对于 关于 由于 因此 目前 可能 应该 能够 一个 自己 没有 不是 就是 这个 那个 这里 那里 现在 今天 然后 而且 并且 或者 还 也 都 很 更 最 再 又 ' +
    'the a an and or of to in for on with is are was were be been it this that as at by from you your we our they their he she his her its not no yes can could should would will just about into over after before').split(/\s+/);

  var stopSet = {};
  STOP.forEach(function (w) { if (w) stopSet[w.toLowerCase()] = true; });

  function tokenize(text) {
    var tokens = [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var seg = new Intl.Segmenter('zh', { granularity: 'word' });
      Array.from(seg.segment(text)).forEach(function (s) {
        if (!s.isWordLike) return;
        var w = s.segment.trim().toLowerCase();
        if (!/^[\p{L}\p{N}]+$/u.test(w)) return;
        if (w.length < 2) return;
        if (stopSet[w]) return;
        tokens.push(w);
      });
    } else {
      String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).forEach(function (w) {
        if (w.length < 2 || stopSet[w] || !/^[\p{L}\p{N}]+$/u.test(w)) return;
        tokens.push(w);
      });
    }
    return tokens;
  }

  function countPhrase(text, phrase) {
    if (!phrase) return 0;
    var hay = String(text).toLowerCase();
    var needle = String(phrase).toLowerCase();
    var count = 0, pos = 0;
    while (needle && (pos = hay.indexOf(needle, pos)) !== -1) { count++; pos += needle.length; }
    return count;
  }

  TB.def({
    slug: 'keyword',
    cat: 'web',
    name: '关键词密度分析器',
    desc: '统计词频、关键词密度和文本规模，适合 SEO 文案自检。',
    icon: '🔎',
    kw: '关键词 密度 词频 seo 文案 分词 统计 内容分析',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">待分析文本 <span class="hint">中文自动分词，英文按单词统计</span></div>' +
          '<div class="field"><textarea class="textarea" id="kwText" rows="9" spellcheck="false"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">目标关键词（可选）</div><input class="input" id="kwTarget" placeholder="例如：在线工具"></div>' +
            '<div class="field"><div class="label">显示数量</div><select class="select" id="kwTop"><option value="20">前 20 个</option><option value="30" selected>前 30 个</option><option value="50">前 50 个</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="kwRun" type="button">开始分析</button>' +
            '<button class="btn" id="kwSample" type="button">载入示例</button>' +
            '<button class="btn" id="kwExport" type="button">导出 CSV</button></div>' +
          '<div class="hint" id="kwInfo" style="margin-top:10px">等待分析</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">概览</div><div class="kv" id="kwStats"></div></div>' +
        '<div class="panel"><div class="panel-h">词频排行</div><div class="table-wrap"><table class="table" id="kwTable"></table></div></div>' +
        '<p class="note">密度 = 该词出现次数 / 有效词总数。分词和词频只能辅助判断，真正的 SEO 还需要结合搜索意图、标题结构和内容质量。</p>';

      var text = TB.$('#kwText', root);
      var target = TB.$('#kwTarget', root);
      var topSel = TB.$('#kwTop', root);
      var info = TB.$('#kwInfo', root);
      var stats = TB.$('#kwStats', root);
      var table = TB.$('#kwTable', root);
      var rows = [];
      text.value = SAMPLE;

      function esc(s) { return TB.esc(s); }

      function analyze() {
        var raw = text.value;
        if (!raw.trim()) {
          stats.innerHTML = '';
          table.innerHTML = '';
          info.textContent = '请先输入文本';
          rows = [];
          return;
        }
        var tokens = tokenize(raw);
        var counts = {};
        tokens.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; });
        var total = tokens.length;
        var unique = Object.keys(counts).length;
        var maxCount = 1;
        Object.keys(counts).forEach(function (w) { if (counts[w] > maxCount) maxCount = counts[w]; });
        var targetPhrase = target.value.trim();
        var phraseCount = countPhrase(raw, targetPhrase);
        var phraseDensity = total ? phraseCount / total * 100 : 0;
        var chars = raw.replace(/\s/g, '').length;
        var sentences = (raw.match(/[^。！？.!?]+[。！？.!?]?/g) || []).length;

        stats.innerHTML =
          '<div class="kv-item"><div class="kv-k">字符数（不含空白）</div><div class="kv-v">' + chars + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">有效词总数</div><div class="kv-v">' + total + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">不同词数</div><div class="kv-v">' + unique + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">句子数</div><div class="kv-v">' + sentences + '</div></div>' +
          (targetPhrase ? '<div class="kv-item"><div class="kv-k">目标词出现</div><div class="kv-v">' + phraseCount + ' 次</div></div>' +
            '<div class="kv-item"><div class="kv-k">目标词密度</div><div class="kv-v">' + TB.num(phraseDensity, 2) + '%</div></div>' : '');

        rows = Object.keys(counts).map(function (w) {
          return { word: w, count: counts[w], density: total ? counts[w] / total * 100 : 0 };
        }).sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word, 'zh'); });

        var limit = parseInt(topSel.value, 10) || 30;
        var shown = rows.slice(0, limit);
        table.innerHTML = '<thead><tr><th>#</th><th>关键词</th><th class="num">次数</th><th class="num">密度</th></tr></thead><tbody>' +
          (shown.length ? shown.map(function (r, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.word) + '</td><td class="num">' + r.count + '</td><td class="num">' + TB.num(r.density, 2) + '%</td></tr>';
          }).join('') : '<tr><td colspan="4" class="hint">没有有效词汇</td></tr>') +
          '</tbody>';
        info.textContent = '已分析 · ' + total + ' 个有效词 · ' + unique + ' 个不同词，显示前 ' + shown.length + ' 个';
      }

      TB.$('#kwRun', root).addEventListener('click', analyze);
      TB.$('#kwSample', root).addEventListener('click', function () { text.value = SAMPLE; target.value = ''; analyze(); });
      topSel.addEventListener('change', analyze);
      target.addEventListener('input', analyze);
      text.addEventListener('input', function () {
        clearTimeout(text._kwTimer);
        text._kwTimer = setTimeout(analyze, 350);
      });
      TB.$('#kwExport', root).addEventListener('click', function () {
        if (!rows.length) { TB.toast('还没有可导出的数据'); return; }
        var lines = ['关键词,次数,密度(%)'];
        rows.forEach(function (r) { lines.push(JSON.stringify(r.word) + ',' + r.count + ',' + TB.num(r.density, 2)); });
        TB.downloadText(lines.join('\r\n'), '关键词密度.csv', 'text/csv');
      });
      analyze();
    }
  });
})();
