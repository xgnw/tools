/* =============================================================================
 * 统计计算器
 * -----------------------------------------------------------------------------
 * 粘贴一组数字，计算个数、总和、平均、中位数、极值、方差、标准差、四分位数
 * 与众数。支持空格、逗号、分号、换行分隔；输入不保存、不上传。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '12, 18, 21, 21, 25, 30, 34, 38, 42, 50';

  function fmt(n) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) >= 1e12) return n.toExponential(6);
    var v = Number(n.toFixed(6));
    return String(v);
  }

  function parseNumbers(text) {
    var parts = String(text || '').split(/[\s,，;；、]+/).filter(Boolean);
    var values = [];
    var ignored = 0;
    parts.forEach(function (p) {
      var n = Number(p);
      if (isFinite(n)) values.push(n);
      else ignored++;
    });
    return { values: values, ignored: ignored };
  }

  function quantile(sorted, p) {
    var n = sorted.length;
    if (!n) return NaN;
    if (n === 1) return sorted[0];
    var pos = (n - 1) * p;
    var lower = Math.floor(pos);
    var upper = Math.ceil(pos);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
  }

  function calculate(values) {
    var n = values.length;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var sum = values.reduce(function (a, b) { return a + b; }, 0);
    var mean = sum / n;
    var median = quantile(sorted, 0.5);
    var min = sorted[0];
    var max = sorted[n - 1];
    var q1 = quantile(sorted, 0.25);
    var q3 = quantile(sorted, 0.75);
    var popVar = values.reduce(function (acc, v) { return acc + Math.pow(v - mean, 2); }, 0) / n;
    var sampleVar = n > 1 ? values.reduce(function (acc, v) { return acc + Math.pow(v - mean, 2); }, 0) / (n - 1) : NaN;

    var counts = {};
    values.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var maxCount = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));
    var modes = Object.keys(counts).filter(function (k) { return counts[k] === maxCount; }).map(Number);

    return {
      n: n, sum: sum, mean: mean, median: median, min: min, max: max,
      range: max - min, q1: q1, q3: q3, iqr: q3 - q1,
      popVar: popVar, popStd: Math.sqrt(popVar),
      sampleVar: sampleVar, sampleStd: Math.sqrt(sampleVar),
      modes: modes, maxCount: maxCount
    };
  }

  function rows(s) {
    var modeText = s.maxCount > 1
      ? s.modes.map(fmt).join('、') + '（各出现 ' + s.maxCount + ' 次）'
      : '无（各值均只出现一次）';
    var items = [
      ['数据个数', String(s.n)],
      ['总和', fmt(s.sum)],
      ['平均值', fmt(s.mean)],
      ['中位数', fmt(s.median)],
      ['最小值 / 最大值', fmt(s.min) + ' / ' + fmt(s.max)],
      ['极差', fmt(s.range)],
      ['下四分位数 Q1', fmt(s.q1)],
      ['上四分位数 Q3', fmt(s.q3)],
      ['四分位距 IQR', fmt(s.iqr)],
      ['总体方差 σ²', fmt(s.popVar)],
      ['总体标准差 σ', fmt(s.popStd)],
      ['样本方差 s²', fmt(s.sampleVar) + (s.n < 2 ? '（至少 2 个数据）' : '')],
      ['样本标准差 s', fmt(s.sampleStd) + (s.n < 2 ? '（至少 2 个数据）' : '')],
      ['众数', modeText]
    ];
    return items.map(function (it) {
      return '<div class="kv-item"><div class="kv-k">' + TB.esc(it[0]) + '</div><div class="kv-v">' + TB.esc(it[1]) + '</div></div>';
    }).join('');
  }

  TB.def({
    slug: 'stats',
    cat: 'data',
    name: '统计计算器',
    desc: '平均数、中位数、方差、标准差与四分位数，粘贴即算。',
    icon: '📈',
    kw: '统计 平均数 中位数 方差 标准差 四分位数 众数 数据分析',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">数据输入</div>' +
          '<div class="field"><textarea class="textarea" id="stIn" spellcheck="false" style="min-height:150px" placeholder="例如：12, 18, 21, 25 或每行一个数字">' + TB.esc(SAMPLE) + '</textarea></div>' +
          '<div class="btns"><button class="btn" id="stSample" type="button">载入示例</button>' +
            '<button class="btn" id="stClear" type="button">清空</button>' +
            '<button class="btn" id="stCopy" type="button">复制结果</button></div>' +
          '<div class="hint" id="stMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">统计结果</div><div class="kv" id="stOut"></div></div>' +
        '<p class="note">方差与标准差同时给出总体（除以 n）和样本（除以 n−1）两种口径；四分位数使用线性插值（R-7）。不支持带千分位的 1,000 写法。</p>';

      var input = TB.$('#stIn', root);
      var out = TB.$('#stOut', root);
      var msg = TB.$('#stMsg', root);
      var lastSummary = '';

      function update() {
        var parsed = parseNumbers(input.value);
        if (!parsed.values.length) {
          out.innerHTML = '';
          msg.textContent = input.value.trim() ? '没有识别到有效数字' : '请输入一组数字';
          lastSummary = '';
          return;
        }
        var s = calculate(parsed.values);
        out.innerHTML = rows(s);
        msg.textContent = '已识别 ' + s.n + ' 个数字' + (parsed.ignored ? '，忽略 ' + parsed.ignored + ' 个非数字项' : '');
        lastSummary = [
          '数据个数：' + s.n,
          '总和：' + fmt(s.sum),
          '平均值：' + fmt(s.mean),
          '中位数：' + fmt(s.median),
          '总体标准差：' + fmt(s.popStd),
          '样本标准差：' + fmt(s.sampleStd)
        ].join('\n');
      }

      input.addEventListener('input', update);
      TB.$('#stSample', root).addEventListener('click', function () {
        input.value = SAMPLE;
        update();
      });
      TB.$('#stClear', root).addEventListener('click', function () {
        input.value = '';
        update();
        input.focus();
      });
      TB.$('#stCopy', root).addEventListener('click', function () {
        if (lastSummary) TB.copy(lastSummary);
      });

      update();
    }
  });
})();
