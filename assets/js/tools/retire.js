/* =============================================================================
 * 法定退休年龄计算器
 * -----------------------------------------------------------------------------
 * 依据 2025-01-01 起施行的渐进式延迟法定退休年龄规则：
 *   - 男职工：原 60 周岁，每 4 个月延迟 1 个月，最终 63 周岁；
 *   - 原 55 周岁女职工：每 4 个月延迟 1 个月，最终 58 周岁；
 *   - 原 50 周岁女职工：每 2 个月延迟 1 个月，最终 55 周岁。
 * 纯本地计算，不读取、不上传任何个人信息。
 * ========================================================================== */

(function () {
  'use strict';

  /* 出生年月对应的延迟月数。改革前出生的人不延迟，达到目标年龄后封顶。 */
  function delayMonths(baseAge, birthY, birthM) {
    var startY, startM, step, cap;
    if (baseAge === 60) { startY = 1965; startM = 1; step = 4; cap = 36; }
    else if (baseAge === 55) { startY = 1970; startM = 1; step = 4; cap = 36; }
    else { startY = 1975; startM = 1; step = 2; cap = 60; }

    var offset = (birthY - startY) * 12 + (birthM - startM);
    if (offset < 0) return 0;
    return Math.min(cap, Math.floor(offset / step) + 1);
  }

  /* 把“年龄 + 延迟月数”换算成“X 岁 Y 个月” */
  function ageText(totalMonths) {
    var y = Math.floor(totalMonths / 12);
    var m = totalMonths % 12;
    return y + ' 岁' + (m ? ' ' + m + ' 个月' : '');
  }

  /* 最低缴费年限：2030 年起每年提高 6 个月，2039 年达到 20 年 */
  function minContribYears(retireYear) {
    if (retireYear < 2030) return 15;
    if (retireYear >= 2039) return 20;
    return 15 + (retireYear - 2029) * 0.5;
  }

  TB.def({
    slug: 'retire-age', cat: 'data', name: '法定退休年龄计算器', desc: '渐进式延迟退休测算', icon: '👴',
    kw: '退休 延迟退休 法定退休年龄 出生年月 养老金 缴费年限 社保',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>出生年月</b></div>' +
              '<input class="input" id="birth" type="month" min="1940-01" max="2015-12" value="1985-06"></div>' +
            '<div class="field"><div class="label"><b>人员类别</b></div>' +
              '<select class="select" id="kind">' +
                '<option value="male">男职工（原 60 岁）</option>' +
                '<option value="female55">女职工 · 管理 / 技术岗（原 55 岁）</option>' +
                '<option value="female50">女职工 · 工人岗（原 50 岁）</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">计算退休时间</button></div>' +
          '<div id="out" hidden style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">结果按国家渐进式延迟退休规则测算，不含特殊工种、病退、灵活就业等情形；最终以人社部门和社保经办机构核定为准。</div>';

      var out = TB.$('#out', root);

      function calc() {
        var val = TB.$('#birth', root).value;
        if (!val) {
          out.hidden = false;
          out.innerHTML = '<div class="note"><span class="result-err">请选择出生年月</span></div>';
          return;
        }
        var parts = val.split('-');
        var by = parseInt(parts[0], 10), bm = parseInt(parts[1], 10);
        if (!by || !bm || by < 1940 || by > 2015) {
          out.hidden = false;
          out.innerHTML = '<div class="note"><span class="result-err">出生年月超出计算范围（1940-01 至 2015-12）</span></div>';
          return;
        }

        var kind = TB.$('#kind', root).value;
        var baseAge = kind === 'male' ? 60 : kind === 'female55' ? 55 : 50;
        var delay = delayMonths(baseAge, by, bm);

        /* 退休月份 = 出生月份 + 原法定年龄 + 延迟月数 */
        var total = by * 12 + (bm - 1) + baseAge * 12 + delay;
        var ry = Math.floor(total / 12);
        var rm = total % 12 + 1;
        var ageMonths = baseAge * 12 + delay;

        var now = new Date();
        var nowTotal = now.getFullYear() * 12 + now.getMonth();
        var remain = total - nowTotal;
        var remainText;
        if (remain <= 0) remainText = '已达到法定退休年龄';
        else remainText = Math.floor(remain / 12) + ' 年 ' + (remain % 12) + ' 个月';

        var items = [
          ['改革后法定退休年龄', ageText(ageMonths)],
          ['预计退休时间', ry + ' 年 ' + rm + ' 月'],
          ['比原法定年龄延迟', delay ? delay + ' 个月' : '不延迟'],
          ['距离退休还有', remainText],
          ['最低缴费年限（按退休年份）', minContribYears(ry) + ' 年']
        ];
        out.hidden = false;
        out.innerHTML = '<div class="kv">' + items.map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + TB.esc(it[0]) +
            '</div><div class="kv-v">' + TB.esc(it[1]) + '</div></div>';
        }).join('') + '</div>' +
          '<div class="note" style="text-align:left">原法定退休年龄按“' +
          TB.esc(kind === 'male' ? '男职工 60 岁' : kind === 'female55' ? '女职工 55 岁' : '女职工 50 岁') +
          '”计算；最低缴费年限从 2030 年起逐步提高，2039 年达到 20 年。</div>';
      }

      TB.$('#run', root).addEventListener('click', calc);
      TB.$('#birth', root).addEventListener('change', calc);
      TB.$('#kind', root).addEventListener('change', calc);
      calc();
    }
  });
})();
