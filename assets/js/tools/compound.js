/* =============================================================================
 * 复利计算器
 * -----------------------------------------------------------------------------
 * 计算一次性本金 + 每月定投的复利终值，展示总投入、利息与逐年明细。
 * 只做数学估算，不含税费、通胀与产品风险。
 * ========================================================================== */
(function () {
  'use strict';

  function num(id, root) {
    var v = parseFloat(TB.$('#' + id, root).value);
    return isFinite(v) ? v : 0;
  }

  TB.def({
    slug: 'compound',
    cat: 'data',
    name: '复利计算器',
    desc: '计算本金和每月定投在复利下的终值，查看总投入与逐年增长。',
    icon: '📈',
    kw: '复利 定投 理财 收益 年化 终值 利息 投资',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">投入参数 <span class="hint">按月复利，每月月末投入</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">初始本金（元）</div><input class="input" id="cpPrincipal" type="number" min="0" step="1000" value="10000"></div>' +
            '<div class="field"><div class="label">每月定投（元）</div><input class="input" id="cpMonthly" type="number" min="0" step="100" value="1000"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">年化收益率（%）</div><input class="input" id="cpRate" type="number" min="0" max="50" step="0.1" value="5"></div>' +
            '<div class="field"><div class="label">投资年限</div><input class="input" id="cpYears" type="number" min="1" max="50" step="1" value="10"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="cpRun" type="button">计算</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">计算结果</div>' +
          '<div class="kv">' +
            '<div class="kv-item"><div class="kv-k">期末总资产</div><div class="kv-v" id="cpTotal">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">累计投入</div><div class="kv-v" id="cpInvest">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">其中利息</div><div class="kv-v" id="cpInterest">—</div></div>' +
            '<div class="kv-item"><div class="kv-k">利息占资产比例</div><div class="kv-v" id="cpRatio">—</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">逐年明细</div><div class="table-wrap"><table class="table"><thead><tr><th>年末</th><th>总资产</th><th>累计投入</th><th>累计利息</th></tr></thead><tbody id="cpBody"></tbody></table></div></div>' +
        '<p class="note">结果按固定年化收益率、按月复利估算，未考虑税费、通胀、申赎费用和收益波动。实际投资可能亏损，本工具不构成投资建议。</p>';

      function run() {
        var principal = Math.max(0, num('cpPrincipal', root));
        var monthly = Math.max(0, num('cpMonthly', root));
        var annual = Math.max(0, Math.min(50, num('cpRate', root)));
        var years = Math.max(1, Math.min(50, Math.round(num('cpYears', root))));
        var months = years * 12;
        var r = annual / 100 / 12;
        var totalInvest = principal + monthly * months;
        var total = principal * Math.pow(1 + r, months) + (r === 0 ? monthly * months : monthly * (Math.pow(1 + r, months) - 1) / r);
        var interest = total - totalInvest;
        TB.$('#cpTotal', root).textContent = '¥ ' + TB.num(total, 2);
        TB.$('#cpInvest', root).textContent = '¥ ' + TB.num(totalInvest, 2);
        TB.$('#cpInterest', root).textContent = '¥ ' + TB.num(interest, 2);
        TB.$('#cpRatio', root).textContent = total > 0 ? TB.num(interest / total * 100, 1) + '%' : '—';

        var rows = [];
        for (var y = 1; y <= years; y++) {
          var n = y * 12;
          var balance = principal * Math.pow(1 + r, n) + (r === 0 ? monthly * n : monthly * (Math.pow(1 + r, n) - 1) / r);
          var invested = principal + monthly * n;
          rows.push('<tr><td>' + y + ' 年</td><td class="num">¥ ' + TB.num(balance, 2) + '</td><td class="num">¥ ' + TB.num(invested, 2) + '</td><td class="num">¥ ' + TB.num(balance - invested, 2) + '</td></tr>');
        }
        TB.$('#cpBody', root).innerHTML = rows.join('');
      }

      TB.$('#cpRun', root).addEventListener('click', run);
      ['cpPrincipal', 'cpMonthly', 'cpRate', 'cpYears'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
      });
      run();
    }
  });
})();
