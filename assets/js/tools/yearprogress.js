/* =============================================================================
 * 年度日历进度
 * -----------------------------------------------------------------------------
 * 选择任意日期，查看它在这一年、这个月、这一周走过了多少：
 * 年度环形进度、本月 / 本周横向进度、第几天 / 第几周 / 剩余天数。
 * 只使用本地日期计算，不依赖时区接口。
 * ========================================================================== */
(function () {
  'use strict';

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function dayOfYear(y, m, d) {
    return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
  }

  function daysInYear(y) {
    return (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function isoWeek(y, m, d) {
    var date = new Date(Date.UTC(y, m - 1, d));
    var day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day + 3);
    var firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    var diff = date - firstThursday;
    return 1 + Math.round(diff / 604800000);
  }

  function todayValue() {
    var now = new Date();
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function parseDate(value) {
    var m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return { y: y, m: mo, d: d, date: date };
  }

  function pct(a, b) { return b ? (a / b) * 100 : 0; }
  function fmtPct(n) { return Number(n.toFixed(1)) + '%'; }

  TB.def({
    slug: 'yearprogress',
    cat: 'fun',
    name: '年度日历进度',
    desc: '用环形和进度条查看一年、一月、一周已经走过多少。',
    icon: '🗓️',
    kw: '年度 进度 日历 一年 月份 星期 时间 百分比',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择日期</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">日期</div><input class="input" type="date" id="ypDate"></div>' +
            '<div class="field"><div class="label">&nbsp;</div><button class="btn" id="ypToday" type="button" style="width:100%">今天</button></div>' +
          '</div>' +
          '<div class="hint" id="ypMsg"></div></div>' +
        '<div class="panel"><div class="panel-h">年度进度</div>' +
          '<div class="yp-ring" id="ypRing"><div class="yp-ring-inner"><b id="ypPct">0%</b><small>今年已过</small></div></div>' +
          '<div class="kv" id="ypStats" style="margin-top:18px"></div></div>' +
        '<div class="panel"><div class="panel-h">本月 / 本周</div>' +
          '<div class="yp-line"><div class="yp-line-head"><span>本月</span><b id="ypMonthText"></b></div><div class="yp-track"><div class="yp-fill" id="ypMonthBar"></div></div></div>' +
          '<div class="yp-line"><div class="yp-line-head"><span>本周</span><b id="ypWeekText"></b></div><div class="yp-track"><div class="yp-fill" id="ypWeekBar"></div></div></div></div>' +
        '<div class="btns"><button class="btn" id="ypCopy" type="button">复制摘要</button></div>' +
        '<p class="note">年度按 1 月 1 日至 12 月 31 日计算；周进度按周一至周日，周数使用 ISO 8601 规则（周一为一周起点）。</p>';

      var dateInput = TB.$('#ypDate', root);
      var ring = TB.$('#ypRing', root);
      var pctText = TB.$('#ypPct', root);
      var stats = TB.$('#ypStats', root);
      var msg = TB.$('#ypMsg', root);
      var monthBar = TB.$('#ypMonthBar', root);
      var weekBar = TB.$('#ypWeekBar', root);
      var monthText = TB.$('#ypMonthText', root);
      var weekText = TB.$('#ypWeekText', root);
      var lastSummary = '';

      function update() {
        var parsed = parseDate(dateInput.value);
        if (!parsed) {
          msg.textContent = '请选择有效日期';
          stats.innerHTML = '';
          return;
        }
        var yearDays = daysInYear(parsed.y);
        var doy = dayOfYear(parsed.y, parsed.m, parsed.d);
        var yearPct = pct(doy, yearDays);
        var monthDays = daysInMonth(parsed.y, parsed.m);
        var monthPct = pct(parsed.d, monthDays);
        var weekDay = parsed.date.getDay() === 0 ? 7 : parsed.date.getDay();
        var weekPct = pct(weekDay, 7);

        ring.style.setProperty('--p', yearPct.toFixed(3) + '%');
        pctText.textContent = fmtPct(yearPct);
        monthBar.style.width = monthPct.toFixed(2) + '%';
        weekBar.style.width = weekPct.toFixed(2) + '%';
        monthText.textContent = parsed.d + ' / ' + monthDays + ' 天 · ' + fmtPct(monthPct);
        weekText.textContent = '周' + '一二三四五六日'.charAt(weekDay - 1) + ' · ' + fmtPct(weekPct);

        var items = [
          ['日期', parsed.y + '-' + pad(parsed.m) + '-' + pad(parsed.d) + ' 周' + '日一二三四五六'.charAt(parsed.date.getDay())],
          ['本年第几天', doy + ' / ' + yearDays + ' 天'],
          ['已过 / 剩余', doy + ' 天 / ' + (yearDays - doy) + ' 天'],
          ['ISO 周数', '第 ' + isoWeek(parsed.y, parsed.m, parsed.d) + ' 周'],
          ['本月天数', monthDays + ' 天'],
          ['年度进度', fmtPct(yearPct)]
        ];
        stats.innerHTML = items.map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + TB.esc(it[0]) + '</div><div class="kv-v">' + TB.esc(it[1]) + '</div></div>';
        }).join('');
        msg.textContent = '';
        lastSummary = items.map(function (it) { return it[0] + '：' + it[1]; }).join('\n');
      }

      dateInput.value = todayValue();
      dateInput.addEventListener('change', update);
      dateInput.addEventListener('input', update);
      TB.$('#ypToday', root).addEventListener('click', function () {
        dateInput.value = todayValue();
        update();
      });
      TB.$('#ypCopy', root).addEventListener('click', function () {
        if (lastSummary) TB.copy(lastSummary);
      });

      update();
    }
  });
})();
