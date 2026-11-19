/* =============================================================================
 * 会议时间协调器
 * -----------------------------------------------------------------------------
 * 以某个 UTC 日期为基准，把 0–23 点逐个换算到各参与城市，并按每个人的
 * 工作时间判断是否可用。最后给出一致可用时段；没有全员时段时给出最大重合。
 * 时区换算使用浏览器内置 Intl，不需要联网或第三方接口。
 * ========================================================================== */
(function () {
  'use strict';

  var ZONES = [
    { id: 'Asia/Shanghai', name: '上海' },
    { id: 'Asia/Tokyo', name: '东京' },
    { id: 'Asia/Seoul', name: '首尔' },
    { id: 'Asia/Singapore', name: '新加坡' },
    { id: 'Asia/Bangkok', name: '曼谷' },
    { id: 'Asia/Kolkata', name: '加尔各答' },
    { id: 'Asia/Dubai', name: '迪拜' },
    { id: 'Europe/Moscow', name: '莫斯科' },
    { id: 'Europe/Berlin', name: '柏林' },
    { id: 'Europe/Paris', name: '巴黎' },
    { id: 'Europe/London', name: '伦敦' },
    { id: 'America/Sao_Paulo', name: '圣保罗' },
    { id: 'America/New_York', name: '纽约' },
    { id: 'America/Chicago', name: '芝加哥' },
    { id: 'America/Denver', name: '丹佛' },
    { id: 'America/Los_Angeles', name: '洛杉矶' },
    { id: 'Australia/Perth', name: '珀斯' },
    { id: 'Australia/Sydney', name: '悉尼' },
    { id: 'Pacific/Auckland', name: '奥克兰' },
    { id: 'UTC', name: 'UTC' }
  ];

  var MAX_PEOPLE = 6;

  function zoneName(id) {
    for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id) return ZONES[i].name;
    return id;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayValue() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* 取某个 UTC 时刻在指定时区的年月日时分；hourCycle=h23 避免出现 24 点 */
  function localParts(date, zone) {
    var fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    var parts = {};
    fmt.formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour) % 24,
      minute: Number(parts.minute)
    };
  }

  function dayOffset(local, utcDate) {
    var a = Date.UTC(local.year, local.month - 1, local.day);
    var b = Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
    return Math.round((a - b) / 86400000);
  }

  function localLabel(local, withDate) {
    var time = pad(local.hour) + ':' + pad(local.minute);
    if (!withDate) return time;
    return pad(local.month) + '-' + pad(local.day) + ' ' + time;
  }

  function shiftText(n) {
    if (!n) return '';
    return n > 0 ? ' +' + n + '天' : ' ' + n + '天';
  }

  TB.def({
    slug: 'meeting',
    cat: 'office',
    name: '会议时间协调器',
    desc: '多城市工作时间对照，自动寻找可开会的重叠时段。',
    icon: '🗓️',
    kw: '会议 时区 跨时区 时间协调 世界时钟 工作时间 约会',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">会议设置</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:0 1 210px"><div class="label">UTC 基准日期</div><input class="input" id="mtDate" type="date" value="' + todayValue() + '"></div>' +
            '<div class="field" style="flex:1 1 260px"><div class="label">说明</div><div class="hint" style="padding-top:9px">下面的时间均按这一天的 UTC 整点换算；参与者的工作时段默认 09:00–18:00。</div></div>' +
          '</div>' +
          '<div class="mt-people" id="mtPeople"></div>' +
          '<div class="btns"><button class="btn primary" id="mtRun" type="button">寻找重叠时段</button>' +
            '<button class="btn" id="mtAdd" type="button">添加参与者</button>' +
            '<button class="btn" id="mtReset" type="button">恢复默认</button></div>' +
          '<div class="hint" id="mtMsg" style="margin-top:8px"></div></div>' +
        '<div class="panel"><div class="panel-h">推荐时段 <span class="hint" id="mtSummary"></span></div>' +
          '<div class="mt-best" id="mtBest"></div>' +
          '<div class="btns"><button class="btn" id="mtCopy" type="button">复制推荐时段</button></div></div>' +
        '<div class="panel"><div class="panel-h">24 小时对照表 <span class="hint">绿色 = 在该参与者的工作时间内</span></div>' +
          '<div class="table-wrap"><table class="table" id="mtTable"></table></div></div>' +
        '<p class="note">仅按整点计算，适合先找大方向；印度 +5:30、尼泊尔 +5:45 等半小时时区需要再按实际分钟微调。跨夏令时日期由浏览器时区数据库自动处理。</p>';

      var peopleBox = TB.$('#mtPeople', root);
      var dateInput = TB.$('#mtDate', root);
      var bestBox = TB.$('#mtBest', root);
      var table = TB.$('#mtTable', root);
      var summary = TB.$('#mtSummary', root);
      var msg = TB.$('#mtMsg', root);
      var copyText = '';
      var people = [
        { zone: 'Asia/Shanghai', start: 9, end: 18 },
        { zone: 'Asia/Tokyo', start: 9, end: 18 },
        { zone: 'Asia/Singapore', start: 9, end: 18 }
      ];

      function optionsHtml(selected) {
        return ZONES.map(function (z) {
          return '<option value="' + z.id + '"' + (z.id === selected ? ' selected' : '') + '>' + TB.esc(z.name) + '（' + TB.esc(z.id) + '）</option>';
        }).join('');
      }

      function hourOptions(selected) {
        var out = '';
        for (var h = 0; h < 24; h++) out += '<option value="' + h + '"' + (h === selected ? ' selected' : '') + '>' + pad(h) + ':00</option>';
        return out;
      }

      function renderPeople() {
        peopleBox.innerHTML = people.map(function (p, i) {
          return '<div class="mt-person" data-i="' + i + '">' +
            '<div class="mt-zone"><span class="mt-dot">' + (i + 1) + '</span><select class="select" data-role="zone">' + optionsHtml(p.zone) + '</select></div>' +
            '<div class="mt-hours"><span class="mt-hours-label">工作</span><select class="select" data-role="start">' + hourOptions(p.start) + '</select><span>–</span><select class="select" data-role="end">' + hourOptions(p.end) + '</select>' +
              '<button class="btn tiny danger" type="button" data-role="remove" title="移除">移除</button></div>' +
          '</div>';
        }).join('');
        TB.$$('.mt-person', peopleBox).forEach(function (row) {
          var index = Number(row.getAttribute('data-i'));
          TB.$$('select', row).forEach(function (sel) {
            sel.addEventListener('change', function () {
              people[index].zone = TB.$('[data-role="zone"]', row).value;
              people[index].start = Number(TB.$('[data-role="start"]', row).value);
              people[index].end = Number(TB.$('[data-role="end"]', row).value);
              run();
            });
          });
          TB.$('[data-role="remove"]', row).addEventListener('click', function () {
            if (people.length <= 1) { TB.toast('至少保留一位参与者'); return; }
            people.splice(index, 1);
            renderPeople();
            run();
          });
        });
      }

      function addPerson() {
        if (people.length >= MAX_PEOPLE) { TB.toast('最多 6 位参与者'); return; }
        var used = people.map(function (p) { return p.zone; });
        var next = ZONES.filter(function (z) { return used.indexOf(z.id) < 0; })[0] || ZONES[0];
        people.push({ zone: next.id, start: 9, end: 18 });
        renderPeople();
        run();
      }

      function groupRanges(hours) {
        var groups = [];
        var start = null, last = null;
        hours.forEach(function (h) {
          if (start === null) { start = h; last = h; }
          else if (h === last + 1) last = h;
          else { groups.push([start, last]); start = h; last = h; }
        });
        if (start !== null) groups.push([start, last]);
        return groups;
      }

      function run() {
        var valid = people.filter(function (p) {
          return p.start < p.end;
        });
        if (!valid.length) {
          msg.textContent = '请至少设置一位参与者的有效工作时间（开始时间要早于结束时间）';
          table.innerHTML = '';
          bestBox.innerHTML = '';
          summary.textContent = '';
          copyText = '';
          return;
        }
        if (valid.length !== people.length) msg.textContent = '部分参与者的结束时间早于开始时间，已按无效时段跳过';
        else msg.textContent = '';

        var dateValue = dateInput.value;
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
        if (!match) { msg.textContent = '请选择有效日期'; return; }
        var baseDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
        var rows = [];
        var maxCount = 0;
        var bestHours = [];

        for (var h = 0; h < 24; h++) {
          var utc = new Date(baseDate.getTime() + h * 3600000);
          var item = { hour: h, count: 0, all: false, cells: [] };
          valid.forEach(function (p) {
            var local = localParts(utc, p.zone);
            var offset = dayOffset(local, utc);
            var available = local.hour >= p.start && local.hour < p.end;
            if (available) item.count++;
            item.cells.push({ local: local, offset: offset, available: available });
          });
          item.all = item.count === valid.length;
          if (item.all) bestHours.push(h);
          if (item.count > maxCount) maxCount = item.count;
          rows.push(item);
        }

        var targetHours = bestHours.length ? bestHours : rows.filter(function (r) { return r.count === maxCount; }).map(function (r) { return r.hour; });
        var groups = groupRanges(targetHours);
        var all = bestHours.length > 0;

        summary.textContent = all
          ? '找到 ' + bestHours.length + ' 个整点全员在线（' + groups.length + ' 段连续）'
          : '没有全员重叠；最多 ' + maxCount + '/' + valid.length + ' 人同时在线，共 ' + targetHours.length + ' 个整点';

        var groupHtml = groups.map(function (g) {
          var start = g[0], end = g[1] + 1;
          var first = rows[start];
          var times = valid.map(function (p, i) {
            var c = first.cells[i];
            return '<span class="mt-time ' + (c.available ? 'ok' : 'off') + '"><b>' + TB.esc(zoneName(p.zone)) + '</b> ' + localLabel(c.local, false) + shiftText(c.offset) + '</span>';
          }).join('');
          return '<div class="mt-slot"><div class="mt-slot-h"><b>UTC ' + pad(start) + ':00 – ' + pad(end) + ':00</b>' +
            '<span class="chip">' + (end - start) + ' 小时</span></div>' +
            '<div class="mt-slot-times">' + times + '</div></div>';
        }).join('');
        bestBox.innerHTML = groupHtml || '<div class="sn-empty">没有可用时段</div>';

        // 生成复制文本
        copyText = '会议时间建议（UTC 日期 ' + dateValue + '）\n' +
          (all ? '全员可用时段：' : '最大重合时段（' + maxCount + '/' + valid.length + ' 人）：') + '\n' +
          groups.map(function (g) {
            var start = g[0], end = g[1] + 1;
            var first = rows[start];
            return 'UTC ' + pad(start) + ':00–' + pad(end) + ':00\n' + valid.map(function (p, i) {
              var c = first.cells[i];
              return '  ' + zoneName(p.zone) + ' ' + localLabel(c.local, true) + shiftText(c.offset) + (c.available ? '（可用）' : '（休息）');
            }).join('\n');
          }).join('\n\n');

        // 表格
        var head = '<thead><tr><th>UTC</th>' + valid.map(function (p) {
          return '<th>' + TB.esc(zoneName(p.zone)) + '</th>';
        }).join('') + '</tr></thead>';
        var body = rows.map(function (r) {
          var cls = r.all ? 'mt-row-all' : (r.count === maxCount && maxCount ? 'mt-row-max' : '');
          return '<tr class="' + cls + '"><td><b>' + pad(r.hour) + ':00</b></td>' + r.cells.map(function (c) {
            return '<td class="' + (c.available ? 'mt-cell-ok' : 'mt-cell-off') + '">' + localLabel(c.local, false) + shiftText(c.offset) + '</td>';
          }).join('') + '</tr>';
        }).join('');
        table.innerHTML = head + '<tbody>' + body + '</tbody>';

        TB.$('#mtCopy', root).onclick = function () { if (copyText) TB.copy(copyText); };
      }

      TB.$('#mtRun', root).addEventListener('click', run);
      TB.$('#mtAdd', root).addEventListener('click', addPerson);
      TB.$('#mtReset', root).addEventListener('click', function () {
        people = [
          { zone: 'Asia/Shanghai', start: 9, end: 18 },
          { zone: 'Asia/Tokyo', start: 9, end: 18 },
          { zone: 'Asia/Singapore', start: 9, end: 18 }
        ];
        renderPeople();
        run();
      });
      dateInput.addEventListener('change', run);

      renderPeople();
      run();
    }
  });
})();
