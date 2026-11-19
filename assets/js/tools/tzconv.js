/* =============================================================================
 * 时区转换器
 * -----------------------------------------------------------------------------
 * 输入某个时区的日期时间，换算成多个目标时区的本地时间。
 * 使用浏览器内置 Intl / IANA 时区数据，自动处理夏令时，不依赖外部接口。
 * ========================================================================== */
(function () {
  'use strict';

  var ZONES = [
    ['Asia/Shanghai', '中国标准时间 · 上海'],
    ['UTC', 'UTC 协调世界时'],
    ['Asia/Tokyo', '东京'],
    ['Asia/Seoul', '首尔'],
    ['Asia/Singapore', '新加坡'],
    ['Asia/Kolkata', '印度'],
    ['Asia/Dubai', '迪拜'],
    ['Europe/London', '伦敦'],
    ['Europe/Paris', '巴黎'],
    ['Europe/Moscow', '莫斯科'],
    ['America/New_York', '纽约'],
    ['America/Chicago', '芝加哥'],
    ['America/Denver', '丹佛'],
    ['America/Los_Angeles', '洛杉矶'],
    ['America/Sao_Paulo', '圣保罗'],
    ['Australia/Sydney', '悉尼'],
    ['Pacific/Auckland', '奥克兰']
  ];

  var DEFAULT_TARGETS = ['UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  var WEEK_CN = {
    Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四',
    Fri: '周五', Sat: '周六', Sun: '周日'
  };

  function zoneLabel(zone) {
    var hit = ZONES.filter(function (z) { return z[0] === zone; })[0];
    return hit ? hit[1] : zone;
  }

  function zoneOptions(selected) {
    return ZONES.map(function (z) {
      return '<option value="' + z[0] + '"' + (z[0] === selected ? ' selected' : '') + '>' + z[1] + ' · ' + z[0] + '</option>';
    }).join('');
  }

  /**
   * 取某个 UTC 时刻在指定时区的墙上时间与星期。
   */
  function partsAt(utcMs, zone) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'short', hourCycle: 'h23'
    });
    var parts = {};
    fmt.formatToParts(new Date(utcMs)).forEach(function (p) {
      if (p.type !== 'literal') parts[p.type] = p.value;
    });
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
      weekday: WEEK_CN[parts.weekday] || parts.weekday || ''
    };
  }

  /**
   * 该 UTC 时刻在目标时区的偏移量（毫秒）。正数表示快于 UTC。
   */
  function offsetAt(utcMs, zone) {
    var p = partsAt(utcMs, zone);
    var asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    var whole = Math.floor(utcMs / 1000) * 1000;
    return asUtc - whole;
  }

  /**
   * 把目标时区的墙上时间换算为 UTC 毫秒。
   * 迭代 3 次以处理夏令时切换附近的偏移变化。
   */
  function wallToUtc(y, m, d, hour, minute, zone) {
    var base = Date.UTC(y, m - 1, d, hour, minute, 0);
    var utc = base;
    for (var i = 0; i < 4; i++) {
      var next = base - offsetAt(utc, zone);
      if (next === utc) break;
      utc = next;
    }
    return utc;
  }

  function formatAt(utcMs, zone) {
    var p = partsAt(utcMs, zone);
    return p.year + '-' + pad(p.month) + '-' + pad(p.day) + ' ' +
      pad(p.hour) + ':' + pad(p.minute) + ' ' + p.weekday;
  }

  function offsetText(ms) {
    var mins = Math.round(ms / 60000);
    var sign = mins >= 0 ? '+' : '-';
    mins = Math.abs(mins);
    return 'UTC' + sign + pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
  }

  function dateNumber(p) {
    return Date.UTC(p.year, p.month - 1, p.day);
  }

  function dayDiff(source, target) {
    var diff = Math.round((dateNumber(target) - dateNumber(source)) / 86400000);
    if (diff === 0) return '同日';
    return diff > 0 ? '+' + diff + ' 天' : diff + ' 天';
  }

  function nowValue(zone) {
    var p = partsAt(Date.now(), zone || 'Asia/Shanghai');
    return p.year + '-' + pad(p.month) + '-' + pad(p.day) + 'T' + pad(p.hour) + ':' + pad(p.minute);
  }

  TB.def({
    slug: 'tzconv',
    cat: 'data',
    name: '时区转换器',
    desc: '把某个时区的时间换算成多个时区，自动处理夏令时。',
    icon: '🌐',
    kw: '时区 时间 转换 时差 夏令时 国际会议 utc',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">源时间</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">日期时间</div><input class="input" type="datetime-local" id="tzWhen"></div>' +
            '<div class="field"><div class="label">所属时区</div><select class="select" id="tzSource">' + zoneOptions('Asia/Shanghai') + '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="tzNow" type="button">使用当前时间</button>' +
            '<button class="btn" id="tzAddBtn" type="button">添加目标时区</button></div>' +
          '<div class="field" style="margin-top:10px"><div class="label">目标时区</div><select class="select" id="tzAdd">' + zoneOptions('UTC') + '</select></div>' +
          '<div class="chips" id="tzChips"></div>' +
          '<div class="hint" id="tzMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">换算结果</div><div class="kv" id="tzOut"></div></div>' +
        '<p class="note">时区数据来自浏览器内置的 IANA 时区库，夏令时由系统规则自动处理。若浏览器缺少某个时区数据，会在结果里提示。</p>';

      var when = TB.$('#tzWhen', root);
      var source = TB.$('#tzSource', root);
      var add = TB.$('#tzAdd', root);
      var chips = TB.$('#tzChips', root);
      var out = TB.$('#tzOut', root);
      var msg = TB.$('#tzMsg', root);
      var targets = DEFAULT_TARGETS.slice();

      function renderChips() {
        chips.innerHTML = targets.map(function (zone, i) {
          return '<span class="chip">' + TB.esc(zoneLabel(zone)) + ' <button type="button" class="tz-remove" data-i="' + i + '" aria-label="移除 ' + TB.esc(zone) + '">×</button></span>';
        }).join('');
      }

      function update() {
        var sourceZone = source.value;
        var value = when.value;
        if (!value) {
          msg.textContent = '请选择日期和时间';
          out.innerHTML = '';
          return;
        }
        var m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!m) {
          msg.textContent = '日期时间格式无法识别';
          out.innerHTML = '';
          return;
        }
        var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]), h = Number(m[4]), mi = Number(m[5]);
        try {
          var utc = wallToUtc(y, mo, d, h, mi, sourceZone);
          var sourceParts = partsAt(utc, sourceZone);
          msg.textContent = '源时间：' + formatAt(utc, sourceZone) + ' · ' + offsetText(offsetAt(utc, sourceZone));
          out.innerHTML = targets.map(function (zone) {
            try {
              var targetParts = partsAt(utc, zone);
              return '<div class="kv-item"><div class="kv-k">' + TB.esc(zoneLabel(zone)) + '<br><small>' + TB.esc(zone) + '</small></div>' +
                '<div class="kv-v">' + TB.esc(formatAt(utc, zone)) + '<br><small>' +
                TB.esc(offsetText(offsetAt(utc, zone))) + ' · ' + TB.esc(dayDiff(sourceParts, targetParts)) + '</small></div></div>';
            } catch (e) {
              return '<div class="kv-item"><div class="kv-k">' + TB.esc(zone) + '</div><div class="kv-v">该时区不可用</div></div>';
            }
          }).join('');
        } catch (e) {
          msg.textContent = '换算失败：' + e.message;
          out.innerHTML = '';
        }
      }

      function setNow() {
        when.value = nowValue(source.value);
        update();
      }

      renderChips();
      setNow();

      source.addEventListener('change', update);
      when.addEventListener('input', update);
      when.addEventListener('change', update);
      TB.$('#tzNow', root).addEventListener('click', setNow);
      TB.$('#tzAddBtn', root).addEventListener('click', function () {
        var zone = add.value;
        if (targets.indexOf(zone) >= 0) {
          TB.toast('该时区已在列表中');
          return;
        }
        if (targets.length >= 8) {
          TB.toast('最多同时显示 8 个目标时区');
          return;
        }
        targets.push(zone);
        renderChips();
        update();
      });
      chips.addEventListener('click', function (e) {
        var btn = e.target.closest('.tz-remove');
        if (!btn) return;
        targets.splice(Number(btn.getAttribute('data-i')), 1);
        renderChips();
        update();
      });
    }
  });
})();
