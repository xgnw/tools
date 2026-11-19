/* =============================================================================
 * 质数判断与因数分解
 * -----------------------------------------------------------------------------
 * 输入一个正整数，判断是否质数，并给出质因数分解、约数个数与约数和。
 * 采用 6k±1 试除，限制在 JavaScript 安全整数范围内的 1e12 以内。
 * ========================================================================== */
(function () {
  'use strict';

  var MAX = 1e12;

  function readNumber(text) {
    var clean = String(text || '').replace(/[,\s_]/g, '');
    if (!/^\d+$/.test(clean)) throw new Error('请输入一个正整数');
    var n = Number(clean);
    if (!Number.isSafeInteger(n)) throw new Error('数字太大，请输入不超过 1e12 的整数');
    if (n === 0) throw new Error('请输入 1 或更大的正整数');
    if (n > MAX) throw new Error('数字太大，请输入不超过 1e12 的整数');
    return n;
  }

  function factorize(n) {
    var factors = [];
    if (n < 2) return factors;
    var count = 0;
    while (n % 2 === 0) { n /= 2; count++; }
    if (count) factors.push({ p: 2, e: count });
    count = 0;
    while (n % 3 === 0) { n /= 3; count++; }
    if (count) factors.push({ p: 3, e: count });
    for (var d = 5; d * d <= n; d += 6) {
      count = 0;
      while (n % d === 0) { n /= d; count++; }
      if (count) factors.push({ p: d, e: count });
      count = 0;
      var d2 = d + 2;
      while (n % d2 === 0) { n /= d2; count++; }
      if (count) factors.push({ p: d2, e: count });
    }
    if (n > 1) factors.push({ p: n, e: 1 });
    return factors;
  }

  function divisorStats(factors) {
    if (!factors.length) return { count: 1, sum: 1 };
    var count = 1;
    var sum = 1;
    factors.forEach(function (f) {
      count *= f.e + 1;
      var term = 1;
      var pow = 1;
      for (var i = 0; i < f.e; i++) { pow *= f.p; term += pow; }
      sum *= term;
    });
    return { count: count, sum: sum };
  }

  function exprOf(factors) {
    if (!factors.length) return '1 没有质因数';
    return factors.map(function (f) {
      return f.p + (f.e > 1 ? '^' + f.e : '');
    }).join(' × ');
  }

  TB.def({
    slug: 'primes',
    cat: 'data',
    name: '质数判断与因数分解',
    desc: '判断质数、分解质因数，查看约数个数与约数和。',
    icon: '🔢',
    kw: '质数 素数 因数 分解 约数 数学 合数',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">输入整数 <span class="hint">范围 1–1,000,000,000,000</span></div>' +
          '<div class="row">' +
            '<div class="field" style="flex:2 1 260px"><div class="label">正整数</div><input class="input" id="prNum" type="text" inputmode="numeric" value="360" spellcheck="false"></div>' +
            '<div class="field" style="flex:0 1 auto"><div class="label">&nbsp;</div><button class="btn primary" id="prRun" type="button" style="width:100%">判断 / 分解</button></div>' +
            '<div class="field" style="flex:0 1 auto"><div class="label">&nbsp;</div><button class="btn" id="prRandom" type="button" style="width:100%">随机整数</button></div>' +
          '</div>' +
          '<div class="hint" id="prMsg" style="margin-top:8px"></div></div>' +
        '<div class="panel"><div class="panel-h">判断结果</div>' +
          '<div class="pr-verdict" id="prVerdict"></div>' +
          '<div class="kv" id="prKv" style="margin-top:12px"></div></div>' +
        '<div class="panel"><div class="panel-h">质因数分解</div>' +
          '<div class="codeBox" id="prExpr" style="min-height:52px"></div>' +
          '<div class="chips" id="prFactors"></div>' +
          '<div class="btns"><button class="btn" id="prCopy" type="button">复制结果</button></div></div>' +
        '<p class="note">质数判断与分解都在浏览器本地完成。大数采用试除法，1e12 以内通常很快；再大的整数需要更复杂的算法，本工具不做支持。</p>';

      var input = TB.$('#prNum', root);
      var verdict = TB.$('#prVerdict', root);
      var kv = TB.$('#prKv', root);
      var expr = TB.$('#prExpr', root);
      var factorsBox = TB.$('#prFactors', root);
      var msg = TB.$('#prMsg', root);
      var lastSummary = '';

      function calculate() {
        var n;
        try { n = readNumber(input.value); }
        catch (e) {
          msg.textContent = e.message;
          verdict.className = 'pr-verdict';
          verdict.textContent = '';
          kv.innerHTML = '';
          expr.textContent = '';
          factorsBox.innerHTML = '';
          lastSummary = '';
          return;
        }
        msg.textContent = '';
        var factors = factorize(n);
        var isPrime = n > 1 && factors.length === 1 && factors[0].e === 1;
        var stats = divisorStats(factors);

        verdict.className = 'pr-verdict ' + (n === 1 ? 'one' : (isPrime ? 'prime' : 'composite'));
        if (n === 1) {
          verdict.innerHTML = '<b>1</b><span>既不是质数，也不是合数</span>';
        } else if (isPrime) {
          verdict.innerHTML = '<b>' + TB.esc(String(n)) + '</b><span>是质数 · 只能被 1 和自身整除</span>';
        } else {
          verdict.innerHTML = '<b>' + TB.esc(String(n)) + '</b><span>是合数 · 可以分解为更小的质因数</span>';
        }

        var items = [
          ['类型', n === 1 ? '单位数' : (isPrime ? '质数' : '合数')],
          ['质因数个数', factors.reduce(function (s, f) { return s + f.e; }, 0) + ' 个（含重数）'],
          ['不同质因数', factors.length + ' 个'],
          ['约数个数', stats.count + ' 个'],
          ['约数和', String(stats.sum)]
        ];
        if (n > 1) items.push(['欧拉 φ(n)', String(eulerPhi(n, factors))]);
        kv.innerHTML = items.map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + TB.esc(it[0]) + '</div><div class="kv-v">' + TB.esc(it[1]) + '</div></div>';
        }).join('');

        expr.textContent = exprOf(factors);
        factorsBox.innerHTML = factors.map(function (f) {
          return '<span class="chip">' + f.p + (f.e > 1 ? '<sup>' + f.e + '</sup>' : '') + '</span>';
        }).join('');
        lastSummary = '整数：' + n + '\n类型：' + (n === 1 ? '既不是质数也不是合数' : (isPrime ? '质数' : '合数')) +
          '\n质因数分解：' + exprOf(factors) + '\n约数个数：' + stats.count + '\n约数和：' + stats.sum;
      }

      function eulerPhi(n, factors) {
        var result = n;
        factors.forEach(function (f) { result = result * (f.p - 1) / f.p; });
        return Math.round(result);
      }

      TB.$('#prRun', root).addEventListener('click', calculate);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') calculate(); });
      input.addEventListener('change', calculate);
      TB.$('#prRandom', root).addEventListener('click', function () {
        input.value = String(Math.floor(Math.random() * 999999) + 2);
        calculate();
      });
      TB.$('#prCopy', root).addEventListener('click', function () {
        if (lastSummary) TB.copy(lastSummary);
      });

      calculate();
    }
  });
})();
