/* =============================================================================
 * 发票税率换算器
 * -----------------------------------------------------------------------------
 * 在「含税金额」和「不含税金额」之间换算，支持 13% / 9% / 6% / 3% 等常见税率。
 * 计算全部在本地完成，不连接税务系统。
 * ========================================================================== */
(function () {
  'use strict';

  function money(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function display(n) {
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  TB.def({
    slug: 'invoicetax',
    cat: 'data',
    name: '发票税率换算器',
    desc: '含税价与不含税价互转，拆出税额。',
    icon: '🧮',
    kw: '发票 税率 含税 不含税 增值税 税额 13% 9% 6% 3%',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">金额与税率</div>' +
          '<div class="field"><div class="label">计算方向</div><select class="select" id="itMode">' +
            '<option value="incl">含税金额 → 不含税 / 税额</option>' +
            '<option value="excl">不含税金额 → 含税 / 税额</option></select></div>' +
          '<div class="row"><div class="field"><div class="label">金额（元）</div><input class="input" id="itAmount" type="number" min="0" step="0.01" value="1130"></div>' +
          '<div class="field"><div class="label">税率（%）</div><input class="input" id="itRate" type="number" min="0" max="100" step="0.01" value="13"></div></div>' +
          '<div class="chips" id="itRates"><button class="chip on" type="button" data-rate="13">13%</button>' +
            '<button class="chip" type="button" data-rate="9">9%</button>' +
            '<button class="chip" type="button" data-rate="6">6%</button>' +
            '<button class="chip" type="button" data-rate="3">3%</button>' +
            '<button class="chip" type="button" data-rate="1">1%</button>' +
            '<button class="chip" type="button" data-rate="0">0%</button></div>' +
          '<div class="btns" style="margin-top:12px"><button class="btn primary" id="itRun" type="button">换算</button>' +
            '<button class="btn" id="itCopy" type="button">复制结果</button></div>' +
          '<div class="hint" id="itMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">换算结果</div><div class="kv" id="itKv"></div></div>' +
        '<div class="panel"><div class="panel-h">计算说明</div><div class="note" id="itFormula"></div></div>' +
        '<p class="note">按价税合计 = 不含税金额 × (1 + 税率) 计算；结果保留两位小数，仅用于报价和记账核对。</p>';

      var mode = TB.$('#itMode', root);
      var amount = TB.$('#itAmount', root);
      var rate = TB.$('#itRate', root);
      var kv = TB.$('#itKv', root);
      var formula = TB.$('#itFormula', root);
      var msg = TB.$('#itMsg', root);
      var result = null;

      function row(k, v, cls) {
        return '<div class="kv-item"><div class="kv-k">' + TB.esc(k) + '</div><div class="kv-v ' + (cls || '') + '">' + TB.esc(v) + '</div></div>';
      }

      function run() {
        var a = Number(amount.value);
        var r = Number(rate.value);
        if (!isFinite(a) || a < 0) { msg.textContent = '请输入不小于 0 的金额'; kv.innerHTML = ''; formula.textContent = ''; result = null; return; }
        if (!isFinite(r) || r < 0 || r > 100) { msg.textContent = '税率需要在 0 到 100 之间'; kv.innerHTML = ''; formula.textContent = ''; result = null; return; }
        var dec = r / 100;
        var net, tax, total;
        if (mode.value === 'incl') {
          total = a;
          net = a / (1 + dec);
          tax = a - net;
          formula.textContent = '不含税金额 = 含税金额 ÷ (1 + ' + r + '%)；税额 = 含税金额 − 不含税金额。';
        } else {
          net = a;
          tax = a * dec;
          total = a + tax;
          formula.textContent = '税额 = 不含税金额 × ' + r + '%；价税合计 = 不含税金额 + 税额。';
        }
        var n = money(net), t = money(tax), tot = money(total);
        result = { net: n, tax: t, total: tot, rate: r };
        kv.innerHTML =
          row('不含税金额', display(Number(n))) +
          row('税额', display(Number(t)), 'result-ok') +
          row('价税合计', display(Number(tot))) +
          row('税率', r + '%');
        msg.textContent = '换算完成 · 金额保留两位小数';
      }

      Array.prototype.forEach.call(root.querySelectorAll('#itRates [data-rate]'), function (btn) {
        btn.addEventListener('click', function () {
          rate.value = btn.dataset.rate;
          Array.prototype.forEach.call(root.querySelectorAll('#itRates .chip'), function (b) { b.classList.remove('on'); });
          btn.classList.add('on');
          run();
        });
      });
      TB.$('#itRun', root).addEventListener('click', run);
      TB.$('#itCopy', root).addEventListener('click', function () {
        if (!result) { TB.toast('先换算一次'); return; }
        TB.copy('不含税金额：' + result.net + ' 元\n税额：' + result.tax + ' 元\n价税合计：' + result.total + ' 元\n税率：' + result.rate + '%');
      });
      mode.addEventListener('change', run);
      amount.addEventListener('input', run);
      rate.addEventListener('input', run);
      run();
    }
  });
})();
