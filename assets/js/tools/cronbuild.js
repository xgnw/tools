/* =============================================================================
 * Crontab 生成器
 * -----------------------------------------------------------------------------
 * 可视化填写 5 个 cron 字段，生成表达式，并预览接下来 5 次执行时间。
 * 支持星号、步长（斜杠加数字）、区间、列表等常见写法；只生成表达式，不修改系统 crontab。
 * ========================================================================== */
(function () {
  'use strict';

  var PRESETS = [
    ['每 5 分钟', '*/5 * * * *'],
    ['每小时整点', '0 * * * *'],
    ['每天 0 点', '0 0 * * *'],
    ['每天 9 点', '0 9 * * *'],
    ['工作日 9 点', '0 9 * * 1-5'],
    ['每周一 9 点', '0 9 * * 1'],
    ['每月 1 日 0 点', '0 0 1 * *']
  ];

  var FIELDS = [
    ['minute', '分', 0, 59],
    ['hour', '时', 0, 23],
    ['day', '日', 1, 31],
    ['month', '月', 1, 12],
    ['week', '周', 0, 7]
  ];

  function parseField(raw, min, max, label) {
    var text = String(raw || '').trim();
    if (!text) throw new Error(label + '不能为空');
    var values = [];
    text.split(',').forEach(function (part) {
      part = part.trim();
      if (!part) throw new Error(label + '有空项');
      var step = 1;
      var base = part;
      if (part.indexOf('/') >= 0) {
        var seg = part.split('/');
        if (seg.length !== 2) throw new Error(label + '的 / 写法不正确');
        base = seg[0].trim();
        step = Number(seg[1]);
        if (!Number.isInteger(step) || step <= 0) throw new Error(label + '的步长必须是正整数');
      }
      var from, to;
      if (base === '*') { from = min; to = max; }
      else if (base.indexOf('-') >= 0) {
        var rg = base.split('-');
        if (rg.length !== 2) throw new Error(label + '的区间写法不正确');
        from = Number(rg[0]); to = Number(rg[1]);
      } else {
        from = Number(base); to = from;
      }
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < min || to > max || from > to) {
        throw new Error(label + '的值要在 ' + min + '–' + max + ' 之间');
      }
      for (var v = from; v <= to; v += step) values.push(v);
    });
    return values;
  }

  function setOf(field, min, max, label) {
    var values = parseField(field, min, max, label);
    var set = {};
    values.forEach(function (v) { set[v] = true; });
    return set;
  }

  function inSet(set, value) { return !!set[value]; }

  /**
   * 判断某分钟是否命中 cron。日与周同时受限时按 Vixie cron 的 OR 规则。
   */
  function matches(date, parsed, raw) {
    var min = date.getMinutes();
    var hour = date.getHours();
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var week = date.getDay(); // 0 = 周日
    if (!inSet(parsed.minute, min) || !inSet(parsed.hour, hour) || !inSet(parsed.month, month)) return false;

    var domOk = inSet(parsed.day, day);
    var dowOk = inSet(parsed.week, week) || (week === 0 && inSet(parsed.week, 7));
    var domRestricted = String(raw.day).trim() !== '*';
    var dowRestricted = String(raw.week).trim() !== '*';
    if (domRestricted && dowRestricted) return domOk || dowOk;
    return domOk && dowOk;
  }

  function two(n) { return n < 10 ? '0' + n : String(n); }

  function formatDate(d) {
    var week = '日一二三四五六'.charAt(d.getDay());
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) +
      ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) + ' 周' + week;
  }

  function nextRuns(raw, count) {
    var parsed = {
      minute: setOf(raw.minute, 0, 59, '分'),
      hour: setOf(raw.hour, 0, 23, '时'),
      day: setOf(raw.day, 1, 31, '日'),
      month: setOf(raw.month, 1, 12, '月'),
      week: setOf(raw.week, 0, 7, '周')
    };
    var start = new Date();
    start.setSeconds(0, 0);
    start = new Date(start.getTime() + 60000);
    var out = [];
    // 最多向后找 366 天，足够覆盖年度任务
    var limit = 366 * 24 * 60;
    for (var i = 0; i < limit && out.length < count; i++) {
      var d = new Date(start.getTime() + i * 60000);
      if (matches(d, parsed, raw)) out.push(formatDate(d));
    }
    return out;
  }

  TB.def({
    slug: 'cronbuild',
    cat: 'web',
    name: 'Crontab 生成器',
    desc: '可视化拼装 cron 表达式，并预览接下来的执行时间。',
    icon: '⏱️',
    kw: 'crontab cron 定时任务 表达式 生成器 计划任务',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">常用预设</div>' +
          '<div class="field"><select class="select" id="cbPreset">' + PRESETS.map(function (p) {
            return '<option value="' + p[1] + '">' + p[0] + ' · ' + p[1] + '</option>';
          }).join('') + '</select></div>' +
          '<div class="row cb-fields">' +
            FIELDS.map(function (f) {
              return '<div class="field"><div class="label">' + f[1] + '</div><input class="input" id="cb-' + f[0] + '" value="*" spellcheck="false"></div>';
            }).join('') +
          '</div>' +
          '<div class="hint">支持 *、*/5、1-5、1,3,5；周字段 0 和 7 都表示周日。</div>' +
          '<div class="btns" style="margin-top:12px"><button class="btn primary" id="cbCopy" type="button">复制表达式</button>' +
            '<button class="btn" id="cbReset" type="button">重置</button></div>' +
          '<div class="hint" id="cbMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">表达式</div><pre class="codeBox" id="cbOut">0 9 * * 1-5</pre></div>' +
        '<div class="panel"><div class="panel-h">接下来 5 次</div><div class="kv" id="cbNext"></div></div>' +
        '<p class="note">这是标准 5 段 cron（分 时 日 月 周），不包含秒和年份。实际生效取决于服务器 cron 实现与时区。</p>';

      var preset = TB.$('#cbPreset', root);
      var out = TB.$('#cbOut', root);
      var msg = TB.$('#cbMsg', root);
      var nextBox = TB.$('#cbNext', root);
      var inputs = {};
      FIELDS.forEach(function (f) { inputs[f[0]] = TB.$('#cb-' + f[0], root); });

      function currentRaw() {
        var raw = {};
        FIELDS.forEach(function (f) { raw[f[0]] = inputs[f[0]].value.trim() || '*'; });
        return raw;
      }

      function update() {
        var raw = currentRaw();
        var text = [raw.minute, raw.hour, raw.day, raw.month, raw.week].join(' ');
        out.textContent = text;
        try {
          var runs = nextRuns(raw, 5);
          var label = PRESETS.filter(function (p) { return p[1] === text; })[0];
          msg.textContent = (label ? label[0] + ' · ' : '自定义计划 · ') + '未来 5 次已计算';
          nextBox.innerHTML = runs.length
            ? runs.map(function (t, i) { return '<div class="kv-item"><div class="kv-k">第 ' + (i + 1) + ' 次</div><div class="kv-v">' + TB.esc(t) + '</div></div>'; }).join('')
            : '<div class="hint">未来 366 天内没有匹配的执行时间，请检查字段。</div>';
        } catch (e) {
          msg.textContent = '表达式有误：' + e.message;
          nextBox.innerHTML = '';
        }
      }

      preset.addEventListener('change', function () {
        var parts = preset.value.split(/\s+/);
        if (parts.length !== 5) return;
        FIELDS.forEach(function (f, i) { inputs[f[0]].value = parts[i]; });
        update();
      });
      FIELDS.forEach(function (f) {
        inputs[f[0]].addEventListener('input', update);
        inputs[f[0]].addEventListener('change', update);
      });
      TB.$('#cbCopy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#cbReset', root).addEventListener('click', function () {
        preset.value = '0 9 * * 1-5';
        preset.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // 默认展示工作日 9 点
      preset.value = '0 9 * * 1-5';
      preset.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
})();
