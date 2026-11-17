/* =============================================================================
 * 补齐一批"路人甲"式小工具：万年历、身份证解析、设备信息、24 点、精确计算、
 * 汇率换算、简繁转换。
 * -----------------------------------------------------------------------------
 * 全部纯前端：日历与农历用 Intl 的中式历法，身份证按 GB 11643 校验位算法，
 * 汇率读 open.er-api.com 的免密接口（失败可手填汇率），简繁用本地 OpenCC 字表。
 * ========================================================================== */

(function () {

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  function fmtDate(d) {
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  /* ================================================== 1. 万年历 */
  TB.def({
    slug: 'calendar', cat: 'fun', name: '万年历', desc: '农历 · 节日 · 月视图', icon: '📅',
    kw: '万年历 日历 农历 阴历 初一 节日 月历',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="calHead">' +
            '<button class="btn mini" id="prev" title="上个月">‹</button>' +
            '<button class="btn mini" id="next" title="下个月">›</button>' +
            '<div class="calTitle"><b id="ym">—</b><span id="lunarm">—</span></div>' +
            '<button class="btn mini" id="today">回到今天</button>' +
          '</div>' +
          '<div class="calWeek">' + WEEK.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
          '<div class="calGrid" id="grid"></div>' +
          '<div class="calDetail" id="detail"></div>' +
        '</div>' +
        '<div class="note">农历日期由浏览器内置的中式历法换算，1900—2100 年之间可用。节日只标常见公历与农历节日，不含调休安排。</div>';

      var grid = TB.$('#grid', root), ym = TB.$('#ym', root), lunarm = TB.$('#lunarm', root);
      var detail = TB.$('#detail', root);

      /* ICU 给的是"正月…十月、十一月、十二月"，另外兼容"冬月/腊月"的说法 */
      var MONTH_MAP = {
        '正月': 1, '一月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5, '六月': 6,
        '七月': 7, '八月': 8, '九月': 9, '十月': 10,
        '十一月': 11, '冬月': 11, '十二月': 12, '腊月': 12
      };
      var DAY_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
        '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
        '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
      var SOLAR_FEST = {
        '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '5-1': '劳动节', '5-4': '青年节',
        '6-1': '儿童节', '7-1': '建党节', '8-1': '建军节', '9-10': '教师节', '10-1': '国庆节',
        '12-25': '圣诞节'
      };
      var LUNAR_FEST = {
        '1-1': '春节', '1-15': '元宵', '5-5': '端午', '7-7': '七夕',
        '8-15': '中秋', '9-9': '重阳', '12-8': '腊八'
      };

      var lunarFmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' });

      /* 取某天的农历：返回 {m:1-12, d:1-30, leap:bool, mName:'正月', dName:'初一'} */
      function lunarOf(d) {
        var out = { m: 0, d: 0, leap: false, mName: '', dName: '' };
        try {
          var parts = lunarFmt.formatToParts(d);
          var ms = '', ds = '';
          parts.forEach(function (p) {
            if (p.type === 'month') ms = p.value;
            else if (p.type === 'day') ds = p.value;
            else if (p.type === 'relatedYear' && !out.year) out.year = p.value;
          });
          out.leap = /^闰/.test(ms);
          var mName = ms.replace(/^闰/, '');
          out.m = MONTH_MAP[mName] || 0;
          out.mName = out.m === 11 ? '冬月' : (out.m === 12 ? '腊月' : mName);
          var num = parseInt(String(ds).replace(/[^\d]/g, ''), 10);
          if (!num) num = DAY_CN.indexOf(ds) + 1;
          out.d = num;
          out.dName = DAY_CN[num - 1] || '';
        } catch (e) { /* 极端年份可能不支持，留空降级 */ }
        return out;
      }

      var view = new Date();
      view.setDate(1);
      var selected = new Date();

      function render() {
        var y = view.getFullYear(), m = view.getMonth();
        ym.textContent = y + ' 年 ' + (m + 1) + ' 月';
        var firstLunar = lunarOf(new Date(y, m, 1));
        lunarm.textContent = (firstLunar.mName ? (firstLunar.leap ? '闰' + firstLunar.mName : firstLunar.mName) : '') +
          (firstLunar.year ? ' · 农历 ' + firstLunar.year + ' 年' : '');

        /* 以周日为一周首日，前后补齐 6 行 */
        var startPad = new Date(y, m, 1).getDay();
        var daysInMonth = new Date(y, m + 1, 0).getDate();
        var cells = [];
        var start = new Date(y, m, 1 - startPad);
        for (var i = 0; i < 42; i++) {
          var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
          var lun = lunarOf(d);
          var key = (d.getMonth() + 1) + '-' + d.getDate();
          var fest = SOLAR_FEST[key] || (lun.m ? LUNAR_FEST[lun.m + '-' + lun.d] : '');
          var isOut = d.getMonth() !== m;
          var isToday = d.toDateString() === new Date().toDateString();
          var isSel = d.toDateString() === selected.toDateString();
          var lunarLabel = !lun.m ? '—'
            : (lun.d === 1 ? (lun.leap ? '闰' : '') + (lun.mName || '') : (lun.dName || ''));
          if (!lun.d) lunarLabel = '—';
          cells.push('<button class="calCell' + (isOut ? ' out' : '') + (isToday ? ' today' : '') +
            (isSel ? ' sel' : '') + (d.getDay() === 0 || d.getDay() === 6 ? ' weekend' : '') +
            '" data-d="' + d.toISOString() + '">' +
            '<span class="calDay">' + d.getDate() + '</span>' +
            '<span class="calLunar">' + lunarLabel + '</span>' +
            (fest ? '<span class="calFest">' + fest + '</span>' : '') +
            '</button>');
        }
        grid.innerHTML = cells.join('');
        Array.prototype.forEach.call(grid.querySelectorAll('.calCell'), function (btn) {
          btn.addEventListener('click', function () {
            selected = new Date(btn.getAttribute('data-d'));
            if (selected.getMonth() !== m) { view = new Date(selected.getFullYear(), selected.getMonth(), 1); }
            render();
          });
        });
        showDetail();
      }

      function showDetail() {
        var lun = lunarOf(selected);
        /* 用 UTC 时间戳相减，避免"当天 20 点"被四舍五入成 1 天 */
        var a = Date.UTC(selected.getFullYear(), selected.getMonth(), selected.getDate());
        var t = new Date();
        var b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
        var diff = Math.round((a - b) / 86400000);
        var ageLine = diff === 0 ? '今天' : (diff > 0 ? '还有 ' + diff + ' 天' : '已过去 ' + (-diff) + ' 天');
        detail.innerHTML = '<b>' + fmtDate(selected) + '</b>' +
          '<span>星期' + WEEK[selected.getDay()] + '</span>' +
          '<span>农历' + (lun.leap ? '闰' : '') + (lun.mName || '') + (lun.dName || '') + '</span>' +
          '<span>' + ageLine + '</span>';
      }

      TB.$('#prev', root).addEventListener('click', function () {
        view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render();
      });
      TB.$('#next', root).addEventListener('click', function () {
        view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render();
      });
      TB.$('#today', root).addEventListener('click', function () {
        selected = new Date(); view = new Date(selected.getFullYear(), selected.getMonth(), 1); render();
      });

      render();
    }
  });

  /* ================================================== 2. 身份证解析 */
  TB.def({
    slug: 'idcard', cat: 'data', name: '身份证解析', desc: '校验 · 生日 · 性别 · 籍贯', icon: '🪪',
    kw: '身份证 号码 解析 校验 生日 性别 年龄 籍贯 18位',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>身份证号码</b><span style="color:var(--ink-3)">18 位，支持末尾 X</span></div>' +
            '<input class="input" id="no" maxlength="18" placeholder="例如 110101199003074514" autocomplete="off"></div>' +
          '<div class="btns"><button class="btn primary" id="run">解析</button>' +
            '<button class="btn" id="demo">填个示例</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">校验位按 GB 11643 的加权算法核对；籍贯只到省级（前两位），不查具体区县。原始号码不会离开浏览器。</div>';

      var no = TB.$('#no', root), out = TB.$('#out', root);

      var PROV = {
        '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
        '21': '辽宁', '22': '吉林', '23': '黑龙江',
        '31': '上海', '32': '江苏', '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
        '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西', '46': '海南',
        '50': '重庆', '51': '四川', '52': '贵州', '53': '云南', '54': '西藏',
        '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
        '71': '台湾', '81': '香港', '82': '澳门', '91': '国外'
      };
      var W = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      var CODE = '10X98765432';
      var ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

      function checkDigit(s) {
        var sum = 0;
        for (var i = 0; i < 17; i++) sum += parseInt(s.charAt(i), 10) * W[i];
        return CODE.charAt(sum % 11);
      }

      function parse(s) {
        s = String(s || '').trim().toUpperCase();
        if (!/^\d{17}[\dX]$/.test(s)) return { err: '格式不对：需要 17 位数字 + 1 位数字或 X' };
        var expect = checkDigit(s);
        var ok = expect === s.charAt(17);
        var y = parseInt(s.substr(6, 4), 10);
        var m = parseInt(s.substr(10, 2), 10);
        var d = parseInt(s.substr(12, 2), 10);
        var dt = new Date(y, m - 1, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
          return { err: '出生日期不合法：' + y + '-' + m + '-' + d };
        }
        var today = new Date();
        var age = today.getFullYear() - y - ((today.getMonth() < m - 1 ||
          (today.getMonth() === m - 1 && today.getDate() < d)) ? 1 : 0);
        var gender = parseInt(s.charAt(16), 10) % 2 ? '男' : '女';
        return {
          ok: ok, expect: expect, prov: PROV[s.substr(0, 2)] || '未知（前两位 ' + s.substr(0, 2) + '）',
          date: y + ' 年 ' + m + ' 月 ' + d + ' 日', week: '星期' + WEEK[dt.getDay()],
          age: age, gender: gender, zodiac: '属' + ZODIAC[(y - 4) % 12],
          seq: s.substr(14, 3), code: s.charAt(17)
        };
      }

      function show(r) {
        if (r.err) {
          out.innerHTML = '<div class="result-err">' + TB.esc(r.err) + '</div>';
          return;
        }
        var rows = [
          ['校验位', (r.ok ? '通过' : '不通过（应为 ' + r.expect + '）')],
          ['籍贯', r.prov],
          ['出生日期', r.date + ' · ' + r.week],
          ['年龄', r.age + ' 岁'],
          ['性别', r.gender],
          ['生肖', r.zodiac],
          ['顺序码', r.seq],
          ['校验码', r.code]
        ];
        out.innerHTML = '<div class="kvTable">' + rows.map(function (x) {
          return '<div class="kvRow"><span>' + x[0] + '</span><b class="' +
            (x[0] === '校验位' ? (r.ok ? 'ok' : 'bad') : '') + '">' + TB.esc(String(x[1])) + '</b></div>';
        }).join('') + '</div>';
        TB.toast(r.ok ? '校验通过' : '校验位不符，号码可能输入有误');
      }

      TB.$('#run', root).addEventListener('click', function () { show(parse(no.value)); });
      TB.$('#demo', root).addEventListener('click', function () { no.value = '110101199003074514'; show(parse(no.value)); });
      no.addEventListener('keydown', function (e) { if (e.key === 'Enter') show(parse(no.value)); });
      no.addEventListener('input', function () {
        if (no.value.length === 18) show(parse(no.value));
      });
    }
  });

  /* ================================================== 3. 浏览器与设备信息 */
  TB.def({
    slug: 'ua-info', cat: 'web', name: '浏览器与设备', desc: 'UA · 屏幕 · 硬件 · 能力', icon: '🖥️',
    kw: '浏览器 设备 UA useragent 屏幕 分辨率 系统 检测 指纹',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML = '<div class="panel"><div class="label"><b>当前环境</b>' +
        '<span style="color:var(--ink-3)">本机读取，不上传</span></div>' +
        '<div id="out"><div class="note">读取中…</div></div>' +
        '<div class="btns" style="margin-top:12px"><button class="btn" id="copy">复制全部</button>' +
        '<button class="btn" id="reload">重新检测</button></div></div>';

      var out = TB.$('#out', root);

      function parseUA(ua) {
        var browser = '未知', ver = '';
        var tests = [
          ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
          ['Opera', /OPR\/([\d.]+)/],
          ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
          ['Firefox', /Firefox\/([\d.]+)/],
          ['Chrome', /Chrome\/([\d.]+)/],
          ['Safari', /Version\/([\d.]+).*Safari/]
        ];
        for (var i = 0; i < tests.length; i++) {
          var m = ua.match(tests[i][1]);
          if (m) { browser = tests[i][0]; ver = m[1].split('.')[0]; break; }
        }
        var os = '未知';
        if (/Windows NT 10/.test(ua)) os = 'Windows 10 / 11';
        else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
        else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
        else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
        else if (/(iPhone|iPad|iPod)/.test(ua)) os = 'iOS ' + ((ua.match(/OS (\d+)_/) || [])[1] || '');
        else if (/Mac OS X/.test(ua)) os = 'macOS ' + ((ua.match(/Mac OS X (\d+)_(\d+)/) || []).slice(1).join('.') || '');
        else if (/CrOS/.test(ua)) os = 'ChromeOS';
        else if (/Linux/.test(ua)) os = 'Linux';
        var device = /iPad|Tablet/.test(ua) ? '平板'
          : (/Mobi|Android|iPhone/.test(ua) ? '手机' : '桌面');
        return { browser: browser + (ver ? ' ' + ver : ''), os: os, device: device };
      }

      function gpu() {
        try {
          var c = document.createElement('canvas');
          var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
          if (!gl) return '不支持 WebGL';
          var ext = gl.getExtension('WEBGL_debug_renderer_info');
          if (ext) return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
          return gl.getParameter(gl.RENDERER);
        } catch (e) { return '读取失败'; }
      }

      function collect() {
        var nav = navigator, scr = screen;
        var ua = nav.userAgent;
        var u = parseUA(ua);
        var conn = nav.connection || nav.mozConnection || {};
        var rows = [
          ['组', '系统', u.os],
          ['组', '浏览器', u.browser],
          ['组', '设备类型', u.device],
          ['组', '设备像素比', String(window.devicePixelRatio || 1)],
          ['组', '屏幕分辨率', scr.width + ' × ' + scr.height],
          ['组', '可用屏幕', scr.availWidth + ' × ' + scr.availHeight],
          ['组', '窗口尺寸', window.innerWidth + ' × ' + window.innerHeight],
          ['组', '颜色深度', (scr.colorDepth || 0) + ' bit'],
          ['组', 'CPU 线程', (nav.hardwareConcurrency || '未知') + ''],
          ['组', '设备内存', (nav.deviceMemory ? nav.deviceMemory + ' GB（近似）' : '未提供')],
          ['组', '语言', (nav.languages || [nav.language]).join(' / ')],
          ['组', '时区', (Intl.DateTimeFormat().resolvedOptions().timeZone || '未知') +
            '（UTC' + (-new Date().getTimezoneOffset() / 60 >= 0 ? '+' : '') + (-new Date().getTimezoneOffset() / 60) + '）'],
          ['组', '触摸点数', String(nav.maxTouchPoints || 0)],
          ['组', 'Cookie 可用', nav.cookieEnabled ? '是' : '否'],
          ['组', '在线状态', nav.onLine ? '在线' : '离线'],
          ['组', '网络类型', (conn.effectiveType || '未提供') + (conn.downlink ? ' · ' + conn.downlink + ' Mb/s' : '')],
          ['组', '显卡', gpu()],
          ['组', 'UA', ua]
        ];
        return rows;
      }

      function render() {
        var rows = collect();
        var html = '', groupOpen = false;
        rows.forEach(function (r) {
          if (r[1] === '系统') {
            if (groupOpen) html += '</div>';
            html += '<div class="kvTable" style="margin-bottom:12px">';
            groupOpen = true;
          }
          html += '<div class="kvRow"><span>' + r[1] + '</span><b>' + TB.esc(r[2]) + '</b></div>';
        });
        if (groupOpen) html += '</div>';
        out.innerHTML = html;
      }

      TB.$('#reload', root).addEventListener('click', render);
      TB.$('#copy', root).addEventListener('click', function () {
        var text = collect().map(function (r) { return r[1] + '：' + r[2]; }).join('\n');
        TB.copy(text);
      });
      render();
    }
  });

  /* ================================================== 4. 24 点 */
  TB.def({
    slug: 'game24', cat: 'fun', name: '24 点计算', desc: '四个数凑出 24', icon: '🎲',
    kw: '24点 算24 扑克 数学 游戏 表达式',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>四个数字</b><span style="color:var(--ink-3)">1—13，空格或逗号分隔</span></div>' +
            '<input class="input" id="nums" value="3 3 8 8" autocomplete="off"></div>' +
          '<div class="btns"><button class="btn primary" id="run">求解</button>' +
            '<button class="btn" id="rand">换一组</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">用分数精确计算，不会出现 0.1 浮点误差；只显示前 6 种写法（去重后），找不到解会如实告诉你。</div>';

      var nums = TB.$('#nums', root), out = TB.$('#out', root);

      function gcd(a, b) { a = a < 0 ? -a : a; b = b < 0 ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a || 1; }
      function R(n, d) { var g = gcd(n, d); if (d < 0) { n = -n; d = -d; } return { n: n / g, d: d / g, s: '' }; }
      function add(a, b) { return R(a.n * b.d + b.n * a.d, a.d * b.d); }
      function sub(a, b) { return R(a.n * b.d - b.n * a.d, a.d * b.d); }
      function mul(a, b) { return R(a.n * b.n, a.d * b.d); }
      function div(a, b) { return b.n === 0 ? null : R(a.n * b.d, a.d * b.n); }

      function solve(list) {
        var found = {}, results = [];
        var ops = [
          ['+', add], ['-', sub], ['*', mul], ['/', div]
        ];
        function walk(arr) {
          if (arr.length === 1) {
            var v = arr[0].v;
            if (v.n === 24 * v.d) {
              var e = arr[0].s;
              if (!found[e]) { found[e] = 1; if (results.length < 60) results.push(e); }
            }
            return;
          }
          for (var i = 0; i < arr.length; i++) {
            for (var j = i + 1; j < arr.length; j++) {
              var a = arr[i], b = arr[j];
              var rest = arr.filter(function (_, k) { return k !== i && k !== j; });
              for (var k = 0; k < ops.length; k++) {
                var op = ops[k][0], fn = ops[k][1];
                /* 加法和乘法对称，只算一次 */
                if ((op === '+' || op === '*') && j > i + 1) continue;
                var v = fn(a.v, b.v);
                if (!v) continue;
                var s = '(' + a.s + ' ' + op + ' ' + b.s + ')';
                walk(rest.concat([{ v: v, s: s }]));
                if (op === '-' || op === '/') {
                  var v2 = fn(b.v, a.v);
                  if (v2) walk(rest.concat([{ v: v2, s: '(' + b.s + ' ' + op + ' ' + a.s + ')' }]));
                }
              }
            }
          }
        }
        walk(list.map(function (n) { return { v: R(n, 1), s: String(n) }; }));
        return results;
      }

      function run() {
        var raw = nums.value.split(/[\s,，]+/).filter(Boolean);
        if (raw.length !== 4) { out.innerHTML = '<div class="result-err">要正好 4 个数字，现在是 ' + raw.length + ' 个</div>'; return; }
        var list = raw.map(Number);
        if (list.some(function (n) { return !(n >= 1 && n <= 13) || n % 1 !== 0; })) {
          out.innerHTML = '<div class="result-err">只支持 1—13 的整数</div>'; return;
        }
        var res = solve(list);
        if (!res.length) {
          out.innerHTML = '<div class="note">这组数字凑不出 24，换一组试试。</div>';
          return;
        }
        /* 去掉最外层括号，读起来顺眼 */
        var clean = res.map(function (s) {
          var t = s;
          if (t.charAt(0) === '(' && t.charAt(t.length - 1) === ')') t = t.slice(1, -1);
          return t;
        });
        var seen = {}, uniq = [];
        clean.forEach(function (s) { if (!seen[s]) { seen[s] = 1; uniq.push(s); } });
        out.innerHTML = '<div class="label"><b>共找到 ' + uniq.length + ' 种写法</b>' +
          '<span style="color:var(--ink-3)">显示前 ' + Math.min(6, uniq.length) + ' 种</span></div>' +
          '<div class="exprList">' + uniq.slice(0, 6).map(function (s, i) {
            return '<div class="exprRow"><span>' + (i + 1) + '</span><b>' + TB.esc(s) + ' = 24</b></div>';
          }).join('') + '</div>';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#rand', root).addEventListener('click', function () {
        for (var t = 0; t < 80; t++) {
          var a = [];
          for (var i = 0; i < 4; i++) a.push(1 + Math.floor(Math.random() * 13));
          if (solve(a).length) { nums.value = a.join(' '); run(); return; }
        }
        nums.value = '3 3 8 8'; run();
      });
      run();
    }
  });

  /* ================================================== 5. 精确计算 */
  TB.def({
    slug: 'decimal', cat: 'data', name: '精确小数计算', desc: '避开 0.1+0.2 的坑', icon: '🧮',
    kw: '浮点 精度 小数 计算器 0.1+0.2 大数 BigInt',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>算式</b></div>' +
            '<div class="calcRow">' +
              '<input class="input" id="a" value="0.1" autocomplete="off">' +
              '<select class="input" id="op" style="max-width:90px"><option>+</option><option>-</option><option>*</option><option>/</option></select>' +
              '<input class="input" id="b" value="0.2" autocomplete="off">' +
            '</div></div>' +
          '<div class="field"><div class="label">除法保留小数位 <span style="color:var(--ink-3)">仅除号有效</span></div>' +
            '<input class="input" id="prec" type="number" value="10" min="1" max="40"></div>' +
          '<div class="btns"><button class="btn primary" id="run">计算</button>' +
            '<button class="btn" id="plain">看 JS 原生结果</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">按十进制逐位计算（大数用 BigInt），所以 0.1 + 0.2 就是 0.3；JS 的 Number 走二进制浮点，才会出现 0.30000000000000004。</div>';

      var a = TB.$('#a', root), b = TB.$('#b', root), op = TB.$('#op', root);
      var prec = TB.$('#prec', root), out = TB.$('#out', root);

      function parseDec(s) {
        s = String(s).trim().replace(/,/g, '');
        var m = s.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
        if (!m || (!m[2] && !m[3])) return null;
        var sign = m[1] === '-' ? -1n : 1n;
        var frac = m[3] || '';
        var digits = (m[2] || '0') + frac;
        var n = BigInt(digits) * sign;
        return { n: n, s: frac.length };
      }

      function pow10(k) { return 10n ** BigInt(k); }

      function align(x, y) {
        var s = Math.max(x.s, y.s);
        return [x.n * pow10(s - x.s), y.n * pow10(s - y.s), s];
      }

      function fmt(n, s) {
        var neg = n < 0n;
        var abs = neg ? -n : n;
        var str = abs.toString();
        while (str.length <= s) str = '0' + str;
        var ip = str.slice(0, str.length - s) || '0';
        var fp = s ? str.slice(str.length - s).replace(/0+$/, '') : '';
        return (neg ? '-' : '') + ip + (fp ? '.' + fp : '');
      }

      function calc(x, y, op, p) {
        if (op === '+') { var q = align(x, y); return fmt(q[0] + q[1], q[2]); }
        if (op === '-') { var q2 = align(x, y); return fmt(q2[0] - q2[1], q2[2]); }
        if (op === '*') {
          var n = x.n * y.n, s = x.s + y.s;
          return fmt(n, s);
        }
        /* 除法：把被除数放大 10^p 再整除，四舍五入一位判断 */
        if (y.n === 0n) return null;
        var scale = y.s + p - x.s;
        var num = x.n, den = y.n;
        if (scale > 0) num = num * pow10(scale);
        else if (scale < 0) den = den * pow10(-scale);
        var q3 = num / den, r = num % den;
        var twice = (r < 0n ? -r : r) * 2n;
        var dAbs = den < 0n ? -den : den;
        if (twice >= dAbs) q3 += (num < 0n) === (den < 0n) ? 1n : -1n;
        return fmt(q3, p);
      }

      function run() {
        var x = parseDec(a.value), y = parseDec(b.value);
        if (!x || !y) { out.innerHTML = '<div class="result-err">请输入合法数字（可带符号与小数点）</div>'; return; }
        var p = Math.max(1, Math.min(40, parseInt(prec.value, 10) || 10));
        var r = calc(x, y, op.value, p);
        if (r === null) { out.innerHTML = '<div class="result-err">除数不能为 0</div>'; return; }
        out.innerHTML = '<div class="bigResult"><span>' + TB.esc(a.value) + ' ' + op.value + ' ' + TB.esc(b.value) + '</span>' +
          '<b>= ' + TB.esc(r) + '</b></div>' +
          '<div class="native">JS 原生（二进制浮点）：' + TB.esc(numberResult()) + '</div>';
      }

      /* 同一算式的 Number 结果，用来对比"浮点误差"长什么样 */
      function numberResult() {
        var x = Number(a.value), y = Number(b.value);
        var v;
        if (op.value === '+') v = x + y;
        else if (op.value === '-') v = x - y;
        else if (op.value === '*') v = x * y;
        else v = y === 0 ? NaN : x / y;
        return String(v);
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#plain', root).addEventListener('click', function () {
        out.innerHTML = '<div class="note">Number 直接算：' + TB.esc(numberResult()) + '</div>';
      });
      [a, b, op].forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); });
      run();
    }
  });

  /* ================================================== 6. 汇率换算 */
  TB.def({
    slug: 'fx', cat: 'data', name: '汇率换算', desc: '实时汇率 · 离线手填', icon: '💱',
    kw: '汇率 货币 换算 美元 欧元 日元 人民币 汇率查询',
    render: function (ctx) {
      var root = ctx.root;
      var NAMES = {
        CNY: '人民币', USD: '美元', EUR: '欧元', JPY: '日元', GBP: '英镑', HKD: '港币',
        TWD: '新台币', KRW: '韩元', SGD: '新加坡元', AUD: '澳大利亚元', CAD: '加拿大元',
        CHF: '瑞士法郎', THB: '泰铢', MYR: '马来西亚林吉特', RUB: '俄罗斯卢布',
        INR: '印度卢比', AED: '阿联酋迪拉姆', NZD: '新西兰元', SEK: '瑞典克朗',
        PHP: '菲律宾比索', VND: '越南盾', IDR: '印尼盾', SAR: '沙特里亚尔', TRY: '土耳其里拉'
      };
      root.innerHTML =
        '<div class="panel">' +
          '<div class="calcRow" style="align-items:flex-end">' +
            '<div class="field" style="margin:0"><div class="label"><b>金额</b></div>' +
              '<input class="input" id="amt" type="number" value="100" min="0" step="0.01"></div>' +
            '<div class="field" style="margin:0"><div class="label">从</div><select class="input" id="from"></select></div>' +
            '<button class="btn" id="swap" title="互换" style="align-self:flex-end">⇄</button>' +
            '<div class="field" style="margin:0"><div class="label">到</div><select class="input" id="to"></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">换算</button>' +
            '<button class="btn" id="refresh">刷新汇率</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">汇率来自 open.er-api.com 的免费接口（每日更新，不需要 key）。取不到时可以直接手填汇率继续算，不影响离线使用。</div>';

      var amt = TB.$('#amt', root), from = TB.$('#from', root), to = TB.$('#to', root);
      var out = TB.$('#out', root);

      function fill(sel, def) {
        sel.innerHTML = Object.keys(NAMES).map(function (c) {
          return '<option value="' + c + '">' + c + ' · ' + NAMES[c] + '</option>';
        }).join('');
        sel.value = def;
      }
      fill(from, 'CNY'); fill(to, 'USD');

      var cache = {};   /* base -> {rates, ts} */

      async function rates(base) {
        var c = cache[base];
        if (c && Date.now() - c.ts < 10 * 60 * 1000) return c.rates;
        var r = await fetch('https://open.er-api.com/v6/latest/' + base);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var j = await r.json();
        if (j.result !== 'success') throw new Error('接口返回异常');
        cache[base] = { rates: j.rates, ts: Date.now() };
        return j.rates;
      }

      function show(result, extra) {
        out.innerHTML = '<div class="bigResult"><span>' + TB.esc(String(amt.value)) + ' ' + from.value + ' =</span>' +
          '<b>' + TB.esc(result) + ' ' + to.value + '</b></div>' + (extra || '');
      }

      async function run() {
        var a = Math.max(0, parseFloat(amt.value) || 0);
        out.innerHTML = '<div class="note">查询中…</div>';
        try {
          var rs = await rates(from.value);
          var rate = rs[to.value];
          if (!rate) throw new Error('这个币种不在接口里');
          show(TB.num(a * rate, 4), '<div class="note" style="margin-top:8px">1 ' + from.value + ' = ' + TB.num(rate, 6) +
            ' ' + to.value + ' · 更新 ' + new Date().toLocaleString('zh-CN') + '</div>');
        } catch (e) {
          out.innerHTML = '<div class="result-err">取汇率失败（' + TB.esc(e.message) + '），可以手填一个汇率：</div>' +
            '<div class="calcRow" style="margin-top:10px"><input class="input" id="manual" type="number" step="0.0001" placeholder="1 ' +
            from.value + ' = ? ' + to.value + '"><button class="btn primary" id="usemanual">用这个算</button></div>';
          TB.$('#usemanual', root).addEventListener('click', function () {
            var r = parseFloat(TB.$('#manual', root).value);
            if (!(r > 0)) { TB.toast('请填一个大于 0 的汇率'); return; }
            show(TB.num(Math.max(0, parseFloat(amt.value) || 0) * r, 4), '<div class="note" style="margin-top:8px">按手填汇率计算</div>');
          });
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#refresh', root).addEventListener('click', function () { cache = {}; run(); });
      TB.$('#swap', root).addEventListener('click', function () {
        var t = from.value; from.value = to.value; to.value = t; run();
      });
      [amt, from, to].forEach(function (el) { el.addEventListener('change', run); });
      run();
    }
  });

  /* ================================================== 7. 简繁转换 */
  TB.def({
    slug: 'hant', cat: 'doc', name: '简繁转换', desc: '简体 ⇄ 繁体', icon: '漢',
    kw: '简体 繁体 转换 中文 台湾 香港 汉字 opencc',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>方向</b></div>' +
              '<select class="input" id="dir"><option value="s2t">简体 → 繁体</option><option value="t2s">繁体 → 简体</option></select></div>' +
            '<div class="field"><div class="label">附加</div>' +
              '<label class="chk"><input type="checkbox" id="keep" checked> 保留原文中的英文与数字</label></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>原文</b></div>' +
            '<textarea class="input ta" id="src" rows="7" placeholder="把中文粘进来…">汉字简化后，亲不见，爱无心。</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">转换</button>' +
            '<button class="btn" id="copy">复制结果</button>' +
            '<button class="btn" id="dl">下载 TXT</button></div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>结果</b></div>' +
            '<textarea class="input ta" id="dst" rows="7" readonly></textarea></div>' +
        '</div>' +
        '<div class="note">按 OpenCC 的字表做逐字转换（2800+ 简→繁、3600+ 繁→简）。"干"这类一字多义的字按常用读法取一个写法，整句语义判断做不到。</div>';

      var src = TB.$('#src', root), dst = TB.$('#dst', root), dir = TB.$('#dir', root);

      var maps = null;
      function build() {
        var raw = window.HANCONV;
        function toMap(str) {
          var m = Object.create(null);
          for (var i = 0; i < str.length; i += 2) {
            if (!m[str.charAt(i)]) m[str.charAt(i)] = str.charAt(i + 1);
          }
          return m;
        }
        maps = { s2t: toMap(raw.s2t), t2s: toMap(raw.t2s) };
      }

      async function convert() {
        if (!maps) { await TB.loadLib('hanconvert.js'); build(); }
        var m = maps[dir.value];
        var text = src.value;
        var outText = '';
        for (var i = 0; i < text.length; i++) {
          var ch = text.charAt(i);
          outText += (m[ch] || ch);
        }
        dst.value = outText;
        return outText;
      }

      TB.$('#run', root).addEventListener('click', convert);
      TB.$('#copy', root).addEventListener('click', async function () {
        var t = dst.value || await convert();
        TB.copy(t);
      });
      TB.$('#dl', root).addEventListener('click', async function () {
        var t = dst.value || await convert();
        TB.downloadText(t, (dir.value === 's2t' ? '繁体' : '简体') + '.txt');
      });
      convert();
    }
  });

})();


