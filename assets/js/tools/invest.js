/* =============================================================================
 * 投资分析计算器
 * -----------------------------------------------------------------------------
 * 三个页签：NPV 净现值、投资回收期、夏普比率。
 * 全部按用户输入的现金流 / 收益率计算，不预测行情，也不构成投资建议。
 * ========================================================================== */
(function () {
  'use strict';

  function parseFlows(raw) {
    var parts = String(raw || '').split(/[\n,，]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!parts.length) throw new Error('请至少输入 1 期现金流');
    var nums = parts.map(function (x) {
      var n = Number(x);
      if (!isFinite(n)) throw new Error('现金流「' + x + '」不是有效数字');
      return n;
    });
    return nums;
  }

  function parseReturns(raw) {
    var parts = String(raw || '').split(/[\n,，]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length < 2) throw new Error('请至少输入 2 期收益率');
    var nums = parts.map(function (x) {
      var n = Number(x);
      if (!isFinite(n)) throw new Error('收益率「' + x + '」不是有效数字');
      return n;
    });
    return nums;
  }

  function kv(items) {
    return items.map(function (x) {
      return '<div class="kv-item"><div class="kv-k">' + x[0] + '</div><div class="kv-v">' + x[1] + '</div></div>';
    }).join('');
  }

  function table(head, rows) {
    return '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + r.map(function (cell, i) {
          return '<td' + (i > 0 && !isNaN(Number(String(cell).replace(/,/g, ''))) ? ' class="num"' : '') + '>' + cell + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
  }

  TB.def({
    slug: 'invest',
    cat: 'data',
    name: '投资分析计算器',
    desc: 'NPV 净现值、投资回收期和夏普比率，本地计算不预测行情。',
    icon: '📈',
    kw: '投资 npv 净现值 回收期 夏普比率 现金流 收益率 财务',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="tabs" id="ivTabs">' +
          '<button class="tab on" type="button" data-pane="npv">NPV 净现值</button>' +
          '<button class="tab" type="button" data-pane="payback">投资回收期</button>' +
          '<button class="tab" type="button" data-pane="sharpe">夏普比率</button></div>' +

        '<div class="panel ivPane" data-pane="npv"><div class="panel-h">NPV 净现值</div>' +
          '<div class="row"><div class="field"><div class="label">初始投入</div><input class="input" id="ivNpvInit" type="number" value="100000"></div>' +
          '<div class="field"><div class="label">折现率（%）</div><input class="input" id="ivNpvRate" type="number" value="12" step="0.01"></div></div>' +
          '<div class="field"><div class="label">各期现金流 <span class="hint">从第 1 年开始，每行或逗号分隔</span></div><textarea class="textarea" id="ivNpvFlows" rows="4">30000, 35000, 40000, 45000</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="ivNpvRun" type="button">计算 NPV</button></div>' +
          '<div class="kv" id="ivNpvStats" style="margin-top:12px"></div>' +
          '<div class="table-wrap" style="margin-top:12px"><table class="table" id="ivNpvTable"></table></div>' +
        '</div>' +

        '<div class="panel ivPane" data-pane="payback" style="display:none"><div class="panel-h">投资回收期</div>' +
          '<div class="row"><div class="field"><div class="label">初始投入</div><input class="input" id="ivPbInit" type="number" value="100000"></div>' +
          '<div class="field"><div class="label">各期现金流 <span class="hint">每行或逗号分隔</span></div><textarea class="textarea" id="ivPbFlows" rows="3">30000, 35000, 40000, 45000</textarea></div></div>' +
          '<div class="btns"><button class="btn primary" id="ivPbRun" type="button">计算回收期</button></div>' +
          '<div class="kv" id="ivPbStats" style="margin-top:12px"></div>' +
          '<div class="table-wrap" style="margin-top:12px"><table class="table" id="ivPbTable"></table></div>' +
        '</div>' +

        '<div class="panel ivPane" data-pane="sharpe" style="display:none"><div class="panel-h">夏普比率</div>' +
          '<div class="row"><div class="field"><div class="label">无风险收益率（%）</div><input class="input" id="ivSrRf" type="number" value="3" step="0.01"></div>' +
          '<div class="field"><div class="label">收益率频率</div><select class="select" id="ivSrFreq"><option value="1">每年</option><option value="12" selected>每月</option><option value="252">每个交易日</option></select></div></div>' +
          '<div class="field"><div class="label">历史收益率（%） <span class="hint">每行或逗号分隔，至少 2 期</span></div><textarea class="textarea" id="ivSrReturns" rows="4">2.1, -1.2, 3.4, 1.8, -0.5, 2.6, 1.1, 0.9, 2.8, -1.5, 1.7, 2.2</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="ivSrRun" type="button">计算夏普比率</button></div>' +
          '<div class="kv" id="ivSrStats" style="margin-top:12px"></div>' +
          '<div class="table-wrap" style="margin-top:12px"><table class="table" id="ivSrTable"></table></div>' +
        '</div>' +

        '<p class="note">NPV 使用期末现金流和固定折现率；回收期按未折现现金流计算；夏普比率按输入的期数频率年化。结果仅用于计算练习和方案比较，不构成投资建议。</p>';

      var panes = root.querySelectorAll('.ivPane');
      root.querySelectorAll('#ivTabs .tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          root.querySelectorAll('#ivTabs .tab').forEach(function (t) { t.classList.remove('on'); });
          tab.classList.add('on');
          var key = tab.getAttribute('data-pane');
          panes.forEach(function (p) { p.style.display = p.getAttribute('data-pane') === key ? '' : 'none'; });
        });
      });

      function num(id) {
        var n = Number(TB.$('#' + id, root).value);
        if (!isFinite(n)) throw new Error('请输入有效数字');
        return n;
      }

      function error(which) {
        TB.$('#iv' + which + 'Stats', root).innerHTML = '<div class="hint">' + which + ' 计算出错，请检查输入。</div>';
        TB.$('#iv' + which + 'Table', root).innerHTML = '';
      }

      function runNpv() {
        var stats = TB.$('#ivNpvStats', root);
        var tableEl = TB.$('#ivNpvTable', root);
        try {
          var initial = num('ivNpvInit');
          var rate = num('ivNpvRate') / 100;
          if (rate <= -1) throw new Error('折现率不能小于 -100%');
          var flows = parseFlows(TB.$('#ivNpvFlows', root).value);
          var rows = [], npv = -initial;
          rows.push([0, TB.num(-initial, 2), '1.0000', TB.num(-initial, 2)]);
          flows.forEach(function (cf, i) {
            var t = i + 1;
            var factor = Math.pow(1 + rate, -t);
            var pv = cf * factor;
            npv += pv;
            rows.push([t, TB.num(cf, 2), factor.toFixed(4), TB.num(pv, 2)]);
          });
          stats.innerHTML = kv([
            ['初始投入', TB.num(initial, 2)],
            ['现金流期数', flows.length + ' 期'],
            ['折现率', TB.num(rate * 100, 2) + '%'],
            ['NPV', '<span class="' + (npv >= 0 ? 'ok' : 'bad') + '">' + TB.num(npv, 2) + '</span>']
          ]);
          tableEl.innerHTML = table(['年份', '现金流', '折现因子', '现值'], rows);
        } catch (e) { error('Npv'); TB.toast(e.message); }
      }

      function runPayback() {
        var stats = TB.$('#ivPbStats', root);
        var tableEl = TB.$('#ivPbTable', root);
        try {
          var initial = num('ivPbInit');
          if (initial <= 0) throw new Error('初始投入需要大于 0');
          var flows = parseFlows(TB.$('#ivPbFlows', root).value);
          var cum = 0, payback = null, rows = [];
          flows.forEach(function (cf, i) {
            var before = cum;
            cum += cf;
            if (payback === null && cum >= initial) {
              payback = i + (cf > 0 ? (initial - before) / cf : 0);
            }
            rows.push([i + 1, TB.num(cf, 2), TB.num(cum, 2), TB.num(initial - cum, 2)]);
          });
          stats.innerHTML = kv([
            ['初始投入', TB.num(initial, 2)],
            ['累计回收', TB.num(cum, 2)],
            ['回收期', payback === null ? '<span class="bad">未回收</span>' : '<span class="ok">' + TB.num(payback, 2) + ' 年</span>'],
            ['期末剩余', TB.num(initial - cum, 2)]
          ]);
          tableEl.innerHTML = table(['年份', '现金流', '累计回收', '剩余投入'], rows);
        } catch (e) { error('Pb'); TB.toast(e.message); }
      }

      function runSharpe() {
        var stats = TB.$('#ivSrStats', root);
        var tableEl = TB.$('#ivSrTable', root);
        try {
          var rf = num('ivSrRf') / 100;
          var periods = Number(TB.$('#ivSrFreq', root).value) || 1;
          var returns = parseReturns(TB.$('#ivSrReturns', root).value).map(function (x) { return x / 100; });
          var mean = returns.reduce(function (a, b) { return a + b; }, 0) / returns.length;
          var variance = returns.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / (returns.length - 1);
          var std = Math.sqrt(variance);
          var annMean = mean * periods;
          var annStd = std * Math.sqrt(periods);
          var sharpe = annStd ? (annMean - rf) / annStd : NaN;
          stats.innerHTML = kv([
            ['平均期收益', TB.num(mean * 100, 2) + '%'],
            ['年化收益', TB.num(annMean * 100, 2) + '%'],
            ['年化波动', TB.num(annStd * 100, 2) + '%'],
            ['夏普比率', isFinite(sharpe) ? '<span class="' + (sharpe >= 1 ? 'ok' : '') + '">' + TB.num(sharpe, 2) + '</span>' : '波动为 0，无法计算']
          ]);
          tableEl.innerHTML = table(['期数', '收益率', '超额收益'], returns.map(function (r, i) {
            return [i + 1, TB.num(r * 100, 2) + '%', TB.num((r - rf / periods) * 100, 2) + '%'];
          }));
        } catch (e) { error('Sr'); TB.toast(e.message); }
      }

      TB.$('#ivNpvRun', root).addEventListener('click', runNpv);
      TB.$('#ivPbRun', root).addEventListener('click', runPayback);
      TB.$('#ivSrRun', root).addEventListener('click', runSharpe);
      runNpv();
      runPayback();
      runSharpe();
    }
  });
})();
