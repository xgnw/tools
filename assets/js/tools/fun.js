/* =============================================================================
 * 休闲娱乐：随机数 / UUID 密码 / 日期差 / BMI / 星座生肖 / 世界时钟 / 吃什么 / 番茄钟
 * -----------------------------------------------------------------------------
 * 都是纯前端小工具，注意定时器要在离开页面时自动清理（判断 root.isConnected）。
 * ========================================================================== */

(function () {

  /* ------------------------------------------------------------ 1. 随机数 */
  TB.def({
    slug: 'random', cat: 'fun', name: '随机数生成', desc: '抽奖 / 抽样', icon: '🎲',
    kw: '随机 抽奖 抽样 摇号 数字',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">随机数字</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">最小值</div><input class="input" id="min" type="number" value="1"></div>' +
            '<div class="field"><div class="label">最大值</div><input class="input" id="max" type="number" value="100"></div>' +
            '<div class="field"><div class="label">生成几个</div><input class="input" id="cnt" type="number" value="1" min="1" max="1000"></div>' +
          '</div>' +
          '<div class="field"><label class="checks"><label><input type="checkbox" id="uniq" checked> 不重复</label>' +
            '<label><input type="checkbox" id="int" checked> 只取整数</label></label></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button></div>' +
          '<div class="out"><div class="out-b" id="out" style="font-size:15px;min-height:52px">—</div></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">名单抽奖<span class="hint">每行一个名字</span></div>' +
          '<div class="field"><textarea class="textarea" id="names" style="min-height:110px">张三\n李四\n王五\n赵六\n孙七\n周八</textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">抽几个</div><input class="input" id="pick" type="number" value="1" min="1"></div>' +
            '<div class="field"><div class="label">&nbsp;</div><button class="btn" id="draw" style="width:100%">开始抽奖</button></div>' +
          '</div>' +
          '<div class="kv" id="drawOut" style="margin-top:12px"></div>' +
        '</div>';

      TB.$('#run', root).addEventListener('click', function () {
        var min = Number(TB.$('#min', root).value);
        var max = Number(TB.$('#max', root).value);
        if (min > max) { var t = min; min = max; max = t; }
        var cnt = Math.max(1, Math.min(1000, parseInt(TB.$('#cnt', root).value, 10) || 1));
        var uniq = TB.$('#uniq', root).checked;
        var isInt = TB.$('#int', root).checked;

        var res = [];
        if (isInt) {
          var range = Math.floor(max) - Math.ceil(min) + 1;
          if (uniq && cnt > range) cnt = range;
          if (uniq) {
            /* 洗牌取前 cnt 个，避免死循环 */
            var pool = [];
            for (var i = Math.ceil(min); i <= Math.floor(max); i++) pool.push(i);
            for (var j = pool.length - 1; j > 0; j--) {
              var k = Math.floor(Math.random() * (j + 1));
              var tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp;
            }
            res = pool.slice(0, cnt);
          } else {
            for (var m = 0; m < cnt; m++) res.push(Math.floor(Math.random() * (max - min + 1)) + min);
          }
        } else {
          for (var n = 0; n < cnt; n++) res.push(min + Math.random() * (max - min));
        }
        TB.$('#out', root).textContent = res.map(function (v) {
          return isInt ? v : v.toFixed(4);
        }).join('  ');
      });

      TB.$('#draw', root).addEventListener('click', function () {
        var names = TB.$('#names', root).value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!names.length) { TB.toast('名单是空的'); return; }
        var n = Math.max(1, parseInt(TB.$('#pick', root).value, 10) || 1);
        n = Math.min(n, names.length);
        var pool = names.slice();
        for (var i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        TB.$('#drawOut', root).innerHTML = pool.slice(0, n).map(function (name, i) {
          return '<div class="kv-item"><div class="kv-k">第 ' + (i + 1) + ' 位</div><div class="kv-v">' + TB.esc(name) + '</div></div>';
        }).join('');
      });

      TB.$('#run', root).click();
    }
  });

  /* ------------------------------------------------------------ 2. UUID / 密码 */
  TB.def({
    slug: 'uuid', cat: 'fun', name: 'UUID / 密码生成', desc: '随机标识与密码', icon: '🆔',
    kw: 'uuid guid 密码 随机 强密码 密钥',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">UUID v4</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">数量</div><input class="input" id="n" type="number" value="5" min="1" max="200"></div>' +
            '<div class="field"><div class="label">格式</div><select class="select" id="fmt">' +
              '<option value="plain">标准 36 位（带连字符）</option>' +
              '<option value="nodash">去掉连字符</option>' +
              '<option value="upper">全大写</option></select></div>' +
            '<div class="field"><div class="label">&nbsp;</div><button class="btn primary" id="gen" style="width:100%">生成</button></div>' +
          '</div>' +
          '<div class="out"><div class="out-h"><span class="grow">结果</span><button class="btn sm" id="copy1">复制</button></div>' +
            '<div class="out-b" id="out1"></div></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">随机密码</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">长度</div><input class="input" id="len" type="number" value="16" min="4" max="128"></div>' +
            '<div class="field"><div class="label">数量</div><input class="input" id="pn" type="number" value="3" min="1" max="50"></div>' +
          '</div>' +
          '<div class="field"><div class="label">字符集</div><div class="checks">' +
            '<label><input type="checkbox" data-set="lower" checked> 小写字母</label>' +
            '<label><input type="checkbox" data-set="upper" checked> 大写字母</label>' +
            '<label><input type="checkbox" data-set="digit" checked> 数字</label>' +
            '<label><input type="checkbox" data-set="sym"> 符号 !@#$%^&amp;*</label>' +
            '<label><input type="checkbox" id="noconfuse"> 排除易混淆字符（0O1lI）</label>' +
          '</div></div>' +
          '<div class="btns"><button class="btn primary" id="pgen">生成密码</button></div>' +
          '<div class="out"><div class="out-h"><span class="grow">结果</span><button class="btn sm" id="copy2">复制</button></div>' +
            '<div class="out-b" id="out2"></div></div>' +
        '</div>' +
        '<div class="note">UUID 用浏览器原生 crypto.randomUUID（没有则退回 getRandomValues），是真随机。<br>' +
        '密码生成用 WebCrypto 随机字节，不是 Math.random，具备密码学强度。</div>';

      function uuid() {
        if (crypto.randomUUID) return crypto.randomUUID();
        var b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var s = Array.from(b).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
        return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' + s.slice(16, 20) + '-' + s.slice(20);
      }

      TB.$('#gen', root).addEventListener('click', function () {
        var n = Math.max(1, Math.min(200, parseInt(TB.$('#n', root).value, 10) || 1));
        var fmt = TB.$('#fmt', root).value;
        var list = [];
        for (var i = 0; i < n; i++) {
          var u = uuid();
          if (fmt === 'nodash') u = u.replace(/-/g, '');
          if (fmt === 'upper') u = u.toUpperCase();
          list.push(u);
        }
        TB.$('#out1', root).textContent = list.join('\n');
      });

      TB.$('#pgen', root).addEventListener('click', function () {
        var len = Math.max(4, Math.min(128, parseInt(TB.$('#len', root).value, 10) || 16));
        var sets = [];
        TB.$('input[data-set="lower"]', root).checked && sets.push('abcdefghijklmnopqrstuvwxyz');
        TB.$('input[data-set="upper"]', root).checked && sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        TB.$('input[data-set="digit"]', root).checked && sets.push('0123456789');
        TB.$('input[data-set="sym"]', root).checked && sets.push('!@#$%^&*()-_=+[]{};:,.?/');
        if (!sets.length) { TB.toast('至少选一种字符集'); return; }

        if (TB.$('#noconfuse', root).checked) {
          sets = sets.map(function (s) { return s.replace(/[0O1lI|`]/g, ''); });
        }
        var all = sets.join('');
        var count = Math.max(1, Math.min(50, parseInt(TB.$('#pn', root).value, 10) || 1));
        var out = [];

        for (var c = 0; c < count; c++) {
          var chars = [];
          /* 先保证每类字符至少出现一个，避免生成"纯字母"的弱密码 */
          sets.forEach(function (s) {
            var idx = randomInt(s.length);
            chars.push(s[idx]);
          });
          while (chars.length < len) chars.push(all[randomInt(all.length)]);
          for (var i = chars.length - 1; i > 0; i--) {
            var j = randomInt(i + 1);
            var t = chars[i]; chars[i] = chars[j]; chars[j] = t;
          }
          out.push(chars.slice(0, len).join(''));
        }
        TB.$('#out2', root).textContent = out.join('\n');
      });

      function randomInt(max) {
        var b = new Uint32Array(1);
        crypto.getRandomValues(b);
        return b[0] % max;
      }

      TB.$('#copy1', root).addEventListener('click', function () { TB.copy(TB.$('#out1', root).textContent); });
      TB.$('#copy2', root).addEventListener('click', function () { TB.copy(TB.$('#out2', root).textContent); });

      TB.$('#gen', root).click();
      TB.$('#pgen', root).click();
    }
  });

  /* ------------------------------------------------------------ 3. 日期差 */
  TB.def({
    slug: 'date-diff', cat: 'fun', name: '日期差计算', desc: '天数 / 工作日 / 保质期', icon: '📆',
    kw: '日期 相差 天数 工作日 到期 倒计时 保质期 生产日期',
    render: function (ctx) {
      var root = ctx.root;
      var today = new Date();
      var iso = today.getFullYear() + '-' + TB.pad2(today.getMonth() + 1) + '-' + TB.pad2(today.getDate());
      root.innerHTML =
        '<div class="panel"><div class="panel-h">两个日期相差多久</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">开始日期</div><input class="input" id="a" type="date" value="' + iso + '"></div>' +
            '<div class="field"><div class="label">结束日期</div><input class="input" id="b" type="date" value="' + iso + '"></div>' +
          '</div>' +
          '<div class="kv" id="out1" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">日期推算</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">基准日期</div><input class="input" id="base" type="date" value="' + iso + '"></div>' +
            '<div class="field"><div class="label">加减天数（可为负）</div><input class="input" id="shift" type="number" value="30"></div>' +
          '</div>' +
          '<div class="kv" id="out2" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">保质期计算</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">生产日期</div><input class="input" id="pd" type="date" value="' + iso + '"></div>' +
            '<div class="field"><div class="label">保质期</div><input class="input" id="shelf" type="number" min="0" step="1" value="180"></div>' +
            '<div class="field"><div class="label">单位</div><select class="select" id="shelfUnit">' +
              '<option value="day">天</option><option value="month">个月</option><option value="year">年</option></select></div>' +
          '</div>' +
          '<div class="kv" id="out3" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">工作日按周一到周五计算，未排除法定节假日与调休。保质期按月 / 年计算时，遇到 29 / 30 / 31 日会自动落到目标月份的最后一天。</div>';

      function parse(el) {
        if (!el.value) return null;
        var p = el.value.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]);
      }
      function fmtDate(d) {
        return d.getFullYear() + '-' + TB.pad2(d.getMonth() + 1) + '-' + TB.pad2(d.getDate()) +
          '（星期' + '日一二三四五六'[d.getDay()] + '）';
      }
      function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
      function workdays(a, b) {
        var sign = b >= a ? 1 : -1;
        var cur = new Date(a), end = new Date(b), n = 0;
        while (sign > 0 ? cur < end : cur > end) {
          cur.setDate(cur.getDate() + sign);
          var w = cur.getDay();
          if (w !== 0 && w !== 6) n++;
        }
        return n;
      }

      function calc2() {
        var a = parse(TB.$('#a', root)), b = parse(TB.$('#b', root));
        if (!a || !b) { TB.$('#out1', root).innerHTML = ''; return; }
        var days = daysBetween(a, b);
        var abs = Math.abs(days);
        var months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        TB.$('#out1', root).innerHTML = [
          ['相差天数', abs + ' 天' + (days < 0 ? '（结束日期更早）' : '')],
          ['折算周数', Math.floor(abs / 7) + ' 周 ' + (abs % 7) + ' 天'],
          ['相差月数（粗略）', Math.abs(months) + ' 个月'],
          ['工作日数', workdays(a, b) + ' 天'],
          ['周末天数', abs - workdays(a, b) + ' 天'],
          ['起始/结束', fmtDate(a) + ' → ' + fmtDate(b)]
        ].map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');
      }

      function calcShift() {
        var base = parse(TB.$('#base', root));
        var n = parseInt(TB.$('#shift', root).value, 10) || 0;
        if (!base) return;
        var d = new Date(base);
        d.setDate(d.getDate() + n);
        TB.$('#out2', root).innerHTML = [
          ['结果日期', fmtDate(d)],
          ['相对今天', daysBetween(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), d) + ' 天'],
          ['所在年第几天', Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1 + ' 天']
        ].map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');
      }

      function calcShelf() {
        var start = parse(TB.$('#pd', root));
        var n = parseInt(TB.$('#shelf', root).value, 10);
        var unit = TB.$('#shelfUnit', root).value;
        if (!start || !isFinite(n) || n < 0) { TB.$('#out3', root).innerHTML = ''; return; }
        var expiry = new Date(start);
        if (unit === 'day') expiry.setDate(expiry.getDate() + n);
        else {
          /* 月 / 年按日历顺延，月底自动收窄，避免 1 月 31 日 + 1 个月变成 3 月 3 日 */
          var months = unit === 'year' ? n * 12 : n;
          var day = expiry.getDate();
          expiry.setDate(1);
          expiry.setMonth(expiry.getMonth() + months);
          var last = new Date(expiry.getFullYear(), expiry.getMonth() + 1, 0).getDate();
          expiry.setDate(Math.min(day, last));
        }
        var today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var remain = daysBetween(today0, expiry);
        var stateText = remain > 0 ? '剩余 ' + remain + ' 天' : remain === 0 ? '今天到期' : '已过期 ' + (-remain) + ' 天';
        TB.$('#out3', root).innerHTML = [
          ['生产日期', fmtDate(start)],
          ['到期日期', fmtDate(expiry)],
          ['距今天数', (remain > 0 ? '还有 ' : remain < 0 ? '已过 ' : '') + Math.abs(remain) + ' 天'],
          ['状态', stateText]
        ].map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');
      }

      root.addEventListener('change', function () { calc2(); calcShift(); calcShelf(); });
      root.addEventListener('input', TB.debounce(function () { calc2(); calcShift(); calcShelf(); }, 300));
      calc2(); calcShift(); calcShelf();
    }
  });

  /* ------------------------------------------------------------ 4. BMI */
  TB.def({
    slug: 'bmi', cat: 'fun', name: 'BMI 计算', desc: '体重与代谢', icon: '⚖️',
    kw: 'bmi 体重 身高 胖瘦 健康 代谢',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label">身高（cm）</div><input class="input" id="h" type="number" value="170" min="80" max="250"></div>' +
            '<div class="field"><div class="label">体重（kg）</div><input class="input" id="w" type="number" value="65" min="20" max="300"></div>' +
            '<div class="field"><div class="label">性别</div><select class="select" id="sex"><option value="m">男</option><option value="f">女</option></select></div>' +
          '</div>' +
          '<div class="kv" id="out" style="margin-top:14px"></div>' +
          '<div class="panel-h" style="margin:16px 0 8px">BMI 分级</div>' +
          '<div class="table-wrap"><table class="table" id="tbl"></table></div>' +
        '</div>' +
        '<div class="note">BMI 只看身高体重，不区分肌肉与脂肪。中国成人标准：18.5–23.9 正常，24–27.9 超重，≥28 肥胖。' +
        '运动员、孕妇、儿童不适用本表。</div>';

      var LEVELS = [
        ['偏瘦', '< 18.5', '可以适当增加优质蛋白和主食'],
        ['正常', '18.5 – 23.9', '保持现有饮食和运动习惯'],
        ['超重', '24 – 27.9', '控制精制碳水，每周 150 分钟中等强度运动'],
        ['肥胖', '≥ 28', '建议做体成分与代谢检查，循序减重']
      ];

      function calc() {
        var h = parseFloat(TB.$('#h', root).value) || 0;
        var w = parseFloat(TB.$('#w', root).value) || 0;
        if (!h || !w) return;
        var bmi = w / Math.pow(h / 100, 2);
        var level = bmi < 18.5 ? LEVELS[0] : bmi < 24 ? LEVELS[1] : bmi < 28 ? LEVELS[2] : LEVELS[3];
        var idealMin = 18.5 * Math.pow(h / 100, 2);
        var idealMax = 23.9 * Math.pow(h / 100, 2);

        TB.$('#out', root).innerHTML = [
          ['BMI', bmi.toFixed(1)],
          ['体重状态', level[0]],
          ['理想体重范围', idealMin.toFixed(1) + ' – ' + idealMax.toFixed(1) + ' kg'],
          ['距上限', w > idealMax ? '超出 ' + (w - idealMax).toFixed(1) + ' kg' : '还有 ' + (idealMax - w).toFixed(1) + ' kg 空间'],
          ['每日建议热量', (w * (TB.$('#sex', root).value === 'm' ? 24 : 22)).toFixed(0) + ' kcal（轻活动量估算）']
        ].map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');

        TB.$('#tbl', root).innerHTML = '<tr><th>分级</th><th>BMI 范围</th><th>建议</th></tr>' +
          LEVELS.map(function (l) {
            var on = l[0] === level[0];
            return '<tr style="' + (on ? 'background:var(--brand-soft)' : '') + '"><td>' + l[0] + '</td><td>' + l[1] + '</td><td>' + l[2] + '</td></tr>';
          }).join('');
      }

      root.addEventListener('input', TB.debounce(calc, 300));
      root.addEventListener('change', calc);
      calc();
    }
  });

  /* ------------------------------------------------------------ 5. 年龄星座生肖 */
  TB.def({
    slug: 'zodiac', cat: 'fun', name: '年龄星座生肖', desc: '生日一键算', icon: '🎂',
    kw: '生日 年龄 星座 生肖 虚岁 周岁',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label">出生日期</div><input class="input" id="birth" type="date" value="1995-06-18"></div>' +
          '<div class="kv" id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">生肖按公历年份计算（农历新年前后出生的人可能差一个生肖）；星座按公历日期划分，边界日的说法各平台略有差异。</div>';

      var ZODIAC = [
        ['摩羯座', '12-22', '01-19'], ['水瓶座', '01-20', '02-18'], ['双鱼座', '02-19', '03-20'],
        ['白羊座', '03-21', '04-19'], ['金牛座', '04-20', '05-20'], ['双子座', '05-21', '06-21'],
        ['巨蟹座', '06-22', '07-22'], ['狮子座', '07-23', '08-22'], ['处女座', '08-23', '09-22'],
        ['天秤座', '09-23', '10-23'], ['天蝎座', '10-24', '11-22'], ['射手座', '11-23', '12-21']
      ];
      var SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

      function calc() {
        var v = TB.$('#birth', root).value;
        if (!v) return;
        var p = v.split('-');
        var birth = new Date(+p[0], +p[1] - 1, +p[2]);
        var now = new Date();
        var age = now.getFullYear() - birth.getFullYear();
        var hadBirthday = (now.getMonth() > birth.getMonth()) ||
          (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
        if (!hadBirthday) age--;

        var next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
        if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());
        var toNext = Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);

        var md = TB.pad2(birth.getMonth() + 1) + '-' + TB.pad2(birth.getDate());
        var sign = ZODIAC.find(function (z) {
          if (z[1] <= z[2]) return md >= z[1] && md <= z[2];
          return md >= z[1] || md <= z[2];
        }) || ZODIAC[0];

        var alive = Math.round((now - birth) / 86400000);

        TB.$('#out', root).innerHTML = [
          ['周岁', age + ' 岁'],
          ['虚岁', (age + 1) + ' 岁'],
          ['星座', sign[0]],
          ['生肖', SHENGXIAO[((birth.getFullYear() - 4) % 12 + 12) % 12]],
          ['下一次生日', '还有 ' + toNext + ' 天'],
          ['已经活了', alive.toLocaleString('zh-CN') + ' 天'],
          ['出生那天', '星期' + '日一二三四五六'[birth.getDay()]]
        ].map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');
      }

      root.addEventListener('change', calc);
      root.addEventListener('input', TB.debounce(calc, 300));
      calc();
    }
  });

  /* ------------------------------------------------------------ 6. 世界时钟 */
  TB.def({
    slug: 'world-clock', cat: 'fun', name: '世界时钟', desc: '多城市时差', icon: '🌍',
    kw: '时区 世界时间 时差 纽约 伦敦 东京',
    render: function (ctx) {
      var root = ctx.root;
      var CITIES = [
        ['北京', 'Asia/Shanghai'], ['东京', 'Asia/Tokyo'], ['首尔', 'Asia/Seoul'],
        ['新加坡', 'Asia/Singapore'], ['迪拜', 'Asia/Dubai'], ['伦敦', 'Europe/London'],
        ['巴黎', 'Europe/Paris'], ['纽约', 'America/New_York'], ['洛杉矶', 'America/Los_Angeles'],
        ['悉尼', 'Australia/Sydney']
      ];

      root.innerHTML =
        '<div class="panel"><div class="panel-h">主要城市当前时间<span class="hint">每秒刷新</span></div>' +
          '<div class="kv" id="grid"></div></div>' +
        '<div class="note">时区数据来自浏览器内置的 IANA 数据库，会自动处理夏令时。</div>';

      function tick() {
        if (!root.isConnected) { clearInterval(timer); return; }
        var now = new Date();
        TB.$('#grid', root).innerHTML = CITIES.map(function (c) {
          var time = '';
          var offset = '';
          try {
            time = new Intl.DateTimeFormat('zh-CN', {
              timeZone: c[1], hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).format(now);
            var parts = new Intl.DateTimeFormat('en-US', { timeZone: c[1], timeZoneName: 'shortOffset' }).formatToParts(now);
            var tz = parts.find(function (x) { return x.type === 'timeZoneName'; });
            offset = tz ? tz.value.replace('GMT', 'UTC') : '';
            var dayParts = new Intl.DateTimeFormat('zh-CN', { timeZone: c[1], weekday: 'short' }).format(now);
            var dStr = new Intl.DateTimeFormat('zh-CN', { timeZone: c[1], month: 'numeric', day: 'numeric' }).format(now);
            var localDay = new Intl.DateTimeFormat('zh-CN', { timeZone: c[1], day: 'numeric' }).format(now);
            var today = new Intl.DateTimeFormat('zh-CN', { day: 'numeric' }).format(now);
            var diffDay = localDay !== today ? '（' + (parseInt(localDay, 10) > parseInt(today, 10) ? '次日' : '前一日') + '）' : '';
            return '<div class="kv-item"><div class="kv-k">' + c[0] + ' ' + offset + '</div>' +
              '<div class="kv-v" style="font-family:ui-monospace,monospace">' + time + '</div>' +
              '<div style="font-size:11px;color:var(--ink-3);margin-top:2px">' + dStr + ' ' + dayParts + diffDay + '</div></div>';
          } catch (e) {
            return '<div class="kv-item"><div class="kv-k">' + c[0] + '</div><div class="kv-v">不支持</div></div>';
          }
        }).join('');
      }

      tick();
      var timer = setInterval(tick, 1000);
    }
  });

  /* ------------------------------------------------------------ 7. 今天吃什么 */
  var FOODS = {
    '家常菜': ['番茄炒蛋', '红烧肉', '可乐鸡翅', '青椒肉丝', '蒜蓉西兰花', '土豆炖牛腩', '糖醋排骨', '麻婆豆腐', '酸辣土豆丝', '西红柿鸡蛋面', '香菇滑鸡', '红烧茄子'],
    '外卖': ['黄焖鸡米饭', '螺蛳粉', '麻辣烫', '煲仔饭', '沙县小吃', '兰州拉面', '炸鸡汉堡', '酸菜鱼', '盖浇饭', '寿司'],
    '轻食': ['鸡胸肉沙拉', '牛油果三明治', '藜麦碗', '全麦卷饼', '水煮虾配蔬菜', '酸奶麦片', '烤南瓜', '紫薯鸡蛋'],
    '面食': ['刀削面', '重庆小面', '热干面', '炸酱面', '阳春面', '牛肉面', '拌面', '馄饨']
  };

      TB.def({
        slug: 'food', cat: 'fun', name: '今天吃什么', desc: '选择困难症救星', icon: '🍜',
        kw: '吃什么 随机 点餐 选择困难',
        render: function (ctx) {
          var root = ctx.root;
          root.innerHTML =
            '<div class="panel">' +
              '<div class="field"><div class="label">想吃哪一类</div><div class="checks" id="tags">' +
                Object.keys(FOODS).map(function (k, i) {
                  return '<label><input type="checkbox" value="' + k + '"' + (i === 0 ? ' checked' : '') + '> ' + k + '</label>';
                }).join('') +
              '</div></div>' +
              '<div class="btns"><button class="btn primary" id="run">抽一个</button>' +
                '<button class="btn" id="run3">连抽 3 个</button></div>' +
              '<div class="preview" style="margin-top:16px;background:var(--surface-2);padding:28px">' +
                '<div style="text-align:center;font-size:28px;font-weight:700;color:var(--brand)" id="res">—</div>' +
              '</div>' +
              '<div class="kv" id="more" style="margin-top:12px"></div>' +
            '</div>' +
            '<div class="note">为什么纠结？因为选项太多。先随机一个，吃不吃得下再说——反正都比继续纠结快。</div>';

          function pick() {
            var cats = TB.$$('#tags input', root).filter(function (i) { return i.checked; })
              .map(function (i) { return i.value; });
            if (!cats.length) return null;
            var pool = [];
            cats.forEach(function (c) { pool = pool.concat(FOODS[c]); });
            return pool[Math.floor(Math.random() * pool.length)];
          }

          TB.$('#run', root).addEventListener('click', function () {
            var r = pick();
            TB.$('#res', root).textContent = r || '至少选一类';
            TB.$('#more', root).innerHTML = '';
          });

          TB.$('#run3', root).addEventListener('click', function () {
            var res = [];
            while (res.length < 3) {
              var r = pick();
              if (!r) break;
              if (res.indexOf(r) < 0) res.push(r);
            }
            TB.$('#res', root).textContent = res[0] || '至少选一类';
            TB.$('#more', root).innerHTML = res.slice(1).map(function (r, i) {
              return '<div class="kv-item"><div class="kv-k">备选 ' + (i + 1) + '</div><div class="kv-v">' + r + '</div></div>';
            }).join('');
          });
        }
      });

  /* ------------------------------------------------------------ 8. 专注计时器 */
  TB.def({
    slug: 'pomodoro', cat: 'fun', name: '专注计时器', desc: '番茄钟 / 52-17', icon: '🍅',
    kw: '番茄钟 专注 计时 52 17 白噪音',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="modes">' +
            '<button class="tab on" data-work="25" data-rest="5">番茄钟 25 / 5</button>' +
            '<button class="tab" data-work="52" data-rest="17">52 / 17（脑力工作）</button>' +
            '<button class="tab" data-work="45" data-rest="10">45 / 10</button>' +
            '<button class="tab" data-work="90" data-rest="20">90 / 20（心流）</button>' +
          '</div>' +
          '<div class="preview" style="background:var(--surface-2);padding:26px">' +
            '<div style="text-align:center">' +
              '<div id="phase" style="font-size:12.5px;color:var(--ink-3);letter-spacing:2px">专注</div>' +
              '<div id="clock" style="font-size:48px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--brand);line-height:1.25">25:00</div>' +
              '<div style="height:6px;border-radius:3px;background:var(--surface-3);margin:10px auto 0;max-width:280px;overflow:hidden">' +
                '<div id="bar" style="height:100%;width:0;background:var(--brand);transition:width .3s linear"></div></div>' +
            '</div>' +
          '</div>' +
          '<div class="btns" style="justify-content:center"><button class="btn primary" id="start">开始</button>' +
            '<button class="btn" id="reset">重置</button>' +
            '<button class="btn" id="skip">跳过本轮</button></div>' +
          '<div class="kv" id="stat" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">每完成一个专注段自动进入休息，循环往复。页面关闭后不保存进度；完成后会响一声提示（需要浏览器允许播放声音）。</div>';

      var workMin = 25, restMin = 5;
      var remain = workMin * 60, total = workMin * 60;
      var running = false, phase = 'work', done = 0, timer = null;

      function paint() {
        var m = Math.floor(remain / 60), s = remain % 60;
        TB.$('#clock', root).textContent = TB.pad2(m) + ':' + TB.pad2(s);
        TB.$('#phase', root).textContent = phase === 'work' ? '专注' : '休息';
        TB.$('#phase', root).style.color = phase === 'work' ? 'var(--brand)' : 'var(--ok)';
        TB.$('#bar', root).style.width = (100 - remain / total * 100) + '%';
        TB.$('#stat', root).innerHTML = '<div class="kv-item" style="grid-column:1/-1"><div class="kv-k">今日完成</div>' +
          '<div class="kv-v">' + done + ' 个专注段 · 共 ' + (done * workMin) + ' 分钟</div></div>';
      }

      function beep() {
        try {
          var ctxA = new (window.AudioContext || window.webkitAudioContext)();
          var osc = ctxA.createOscillator();
          var gain = ctxA.createGain();
          osc.connect(gain); gain.connect(ctxA.destination);
          osc.frequency.value = 880;
          gain.gain.value = .25;
          osc.start();
          setTimeout(function () { osc.stop(); ctxA.close(); }, 220);
        } catch (e) {}
      }

      function tick() {
        if (!root.isConnected) { clearInterval(timer); timer = null; return; }
        if (!running) return;
        remain--;
        if (remain <= 0) {
          beep();
          if (phase === 'work') { done++; phase = 'rest'; remain = total = restMin * 60; }
          else { phase = 'work'; remain = total = workMin * 60; }
          TB.toast(phase === 'work' ? '休息结束，继续专注' : '专注完成，休息一下');
        }
        paint();
      }

      TB.$('#start', root).addEventListener('click', function () {
        running = !running;
        TB.$('#start', root).textContent = running ? '暂停' : '开始';
        TB.$('#start', root).classList.toggle('primary', !running);
        if (running && !timer) timer = setInterval(tick, 1000);
      });

      TB.$('#reset', root).addEventListener('click', function () {
        running = false; phase = 'work'; remain = total = workMin * 60; done = 0;
        TB.$('#start', root).textContent = '开始';
        paint();
      });

      TB.$('#skip', root).addEventListener('click', function () {
        remain = 0;
        tick();
      });

      TB.$('#modes', root).addEventListener('click', function (e) {
        var b = e.target.closest('.tab');
        if (!b) return;
        TB.$$('.tab', TB.$('#modes', root)).forEach(function (x) { x.classList.toggle('on', x === b); });
        workMin = parseInt(b.getAttribute('data-work'), 10);
        restMin = parseInt(b.getAttribute('data-rest'), 10);
        running = false; phase = 'work'; remain = total = workMin * 60; done = 0;
        TB.$('#start', root).textContent = '开始';
        paint();
      });

      paint();
    }
  });

})();
