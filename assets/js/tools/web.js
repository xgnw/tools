/* =============================================================================
 * 站长 / 开发者工具
 * -----------------------------------------------------------------------------
 * 编码转换、时间戳、JSON、正则、Cron、命名、颜色、文本、二维码、Diff、
 * .gitignore、robots、2FA(TOTP)、IP 子网、哈希
 * 除二维码外都不依赖第三方库；TOTP / 哈希使用浏览器原生 WebCrypto。
 * ========================================================================== */

(function () {

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px"><span class="' +
      (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  /* ---------------------------------------------------------- 1. 编码转换 */
  var CODECS = [
    { id: 'b64', name: 'Base64' },
    { id: 'url', name: 'URL 编码' },
    { id: 'hex', name: 'Hex（十六进制）' },
    { id: 'html', name: 'HTML 实体' },
    { id: 'unicode', name: 'Unicode 转义' }
  ];

  function utf8B64Encode(s) { return btoa(unescape(encodeURIComponent(s))); }
  function utf8B64Decode(s) {
    try { return decodeURIComponent(escape(atob(s.replace(/\s/g, '')))); }
    catch (e) { return decodeURIComponent(escape(atob(s.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')))); }
  }

  function hexEncode(s) {
    /* 统一按 UTF-8 字节输出，中文才不会变成乱码 */
    var bytes = new TextEncoder().encode(s);
    var arr = [];
    for (var j = 0; j < bytes.length; j++) arr.push(bytes[j].toString(16).padStart(2, '0'));
    return arr.join(' ');
  }

  function hexDecode(s) {
    var clean = s.replace(/[^0-9a-fA-F]/g, '');
    var bytes = new Uint8Array(Math.floor(clean.length / 2));
    for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    return new TextDecoder().decode(bytes);
  }

  function htmlEncode(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
  }
  function htmlDecode(s) {
    var d = document.createElement('textarea');
    d.innerHTML = s.replace(/<br\s*\/?>/gi, '\n');
    return d.value;
  }

  function unicodeEncode(s) {
    return s.split('').map(function (c) {
      var code = c.codePointAt(0);
      return code < 128 ? c : '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
    }).join('');
  }
  function unicodeDecode(s) {
    return s.replace(/\\u([0-9a-fA-F]{4})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
      .replace(/\\x([0-9a-fA-F]{2})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
  }

  TB.def({
    slug: 'codec', cat: 'web', name: '编码转换', desc: 'Base64 / URL / Hex', icon: '🔤',
    kw: 'base64 urlencode 编码 解码 hex 实体 unicode',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>输入</b></div>' +
            '<textarea class="textarea" id="in" placeholder="粘贴要编码或解码的内容"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">编码方式</div><select class="select" id="type">' +
              CODECS.map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><div class="label">操作</div><select class="select" id="dir">' +
              '<option value="enc">编码</option><option value="dec">解码</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">转换</button>' +
            '<button class="btn" id="swap">结果 → 输入</button>' +
            '<button class="btn" id="copy">复制结果</button></div>' +
          '<div id="msg"></div>' +
          '<div class="out" id="outBox" hidden><div class="out-h"><span class="grow">输出</span><span id="len"></span></div>' +
            '<div class="out-b" id="out"></div></div>' +
        '</div>' +
        '<div class="note">中文走 UTF-8 处理，不会出现乱码。URL 编码采用 encodeURIComponent（会编码 / ? &amp; 等符号）。</div>';

      var inp = TB.$('#in', root), outEl = TB.$('#out', root), box = TB.$('#outBox', root), msg = TB.$('#msg', root);

      function convert() {
        var type = TB.$('#type', root).value;
        var dir = TB.$('#dir', root).value;
        var text = inp.value;
        var out = '';
        try {
          if (type === 'b64') out = dir === 'enc' ? utf8B64Encode(text) : utf8B64Decode(text);
          else if (type === 'url') out = dir === 'enc' ? encodeURIComponent(text) : decodeURIComponent(text);
          else if (type === 'hex') out = dir === 'enc' ? hexEncode(text) : hexDecode(text);
          else if (type === 'html') out = dir === 'enc' ? htmlEncode(text) : htmlDecode(text);
          else if (type === 'unicode') out = dir === 'enc' ? unicodeEncode(text) : unicodeDecode(text);

          box.hidden = false;
          outEl.textContent = out;
          TB.$('#len', root).textContent = out.length + ' 字符';
          status(msg, '');
        } catch (e) {
          status(msg, '转换失败：输入可能不是合法的 ' + (CODECS.find(function (c) { return c.id === type; }) || {}).name, true);
        }
      }

      TB.$('#run', root).addEventListener('click', convert);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(outEl.textContent); });
      TB.$('#swap', root).addEventListener('click', function () {
        inp.value = outEl.textContent;
        TB.$('#dir', root).value = TB.$('#dir', root).value === 'enc' ? 'dec' : 'enc';
        convert();
      });
      inp.addEventListener('input', TB.debounce(convert, 400));
    }
  });

  /* ---------------------------------------------------------- 2. 时间戳转换 */
  TB.def({
    slug: 'timestamp', cat: 'web', name: '时间戳转换', desc: '时间与时间戳互转', icon: '🕒',
    kw: 'timestamp unix 时间戳 日期 时区 iso',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>时间戳 → 时间</b><span style="color:var(--ink-3)">支持秒(10位) / 毫秒(13位)</span></div>' +
            '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
              '<input class="input" id="ts" style="flex:1 1 220px" placeholder="例如 1763000000">' +
              '<button class="btn" id="tsRun">转换</button><button class="btn" id="now">用现在</button>' +
            '</div></div>' +
          '<div class="kv" id="tsOut" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>时间 → 时间戳</b><span style="color:var(--ink-3)">格式：2026-11-14 20:30:00</span></div>' +
            '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
              '<input class="input" id="dt" style="flex:1 1 240px" placeholder="2026-11-14 20:30:00">' +
              '<button class="btn primary" id="dtRun">转换</button>' +
            '</div></div>' +
          '<div class="kv" id="dtOut" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">时间戳按本地时区显示；需要 UTC 请复制 ISO 那一行。毫秒/秒会自动识别。</div>';

      function fill(host, items) {
        host.innerHTML = items.map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + it[0] + '</div><div class="kv-v" title="' +
            TB.esc(String(it[1])) + '">' + TB.esc(String(it[1])) + '</div></div>';
        }).join('');
      }

      function fromTs() {
        var v = TB.$('#ts', root).value.trim();
        if (!v) { fill(TB.$('#tsOut', root), [['提示', '请输入时间戳']]); return; }
        var n = Number(v);
        if (!isFinite(n)) { fill(TB.$('#tsOut', root), [['错误', '不是合法数字']]); return; }
        var ms = n < 1e11 ? n * 1000 : n;
        var d = new Date(ms);
        if (isNaN(d)) { fill(TB.$('#tsOut', root), [['错误', '时间戳超出范围']]); return; }
        var p = function (x) { return TB.pad2(x); };
        fill(TB.$('#tsOut', root), [
          ['本地时间', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())],
          ['ISO 8601（UTC）', d.toISOString()],
          ['UTC 时间', d.toUTCString()],
          ['星期', '星期' + '日一二三四五六'[d.getDay()]],
          ['秒级时间戳', Math.floor(ms / 1000)],
          ['毫秒级时间戳', ms],
          ['距现在', fromNow(d)]
        ]);
      }

      function fromNow(d) {
        var diff = (Date.now() - d.getTime()) / 1000;
        var abs = Math.abs(diff);
        var txt = abs < 60 ? Math.round(abs) + ' 秒' : abs < 3600 ? Math.round(abs / 60) + ' 分钟' :
          abs < 86400 ? Math.round(abs / 3600) + ' 小时' : Math.round(abs / 86400) + ' 天';
        return diff >= 0 ? txt + '前' : txt + '后';
      }

      TB.$('#tsRun', root).addEventListener('click', fromTs);
      TB.$('#now', root).addEventListener('click', function () {
        TB.$('#ts', root).value = Math.floor(Date.now() / 1000);
        fromTs();
      });

      TB.$('#dtRun', root).addEventListener('click', function () {
        var v = TB.$('#dt', root).value.trim();
        if (!v) return;
        var m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
        var d = m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : new Date(v);
        if (isNaN(d)) { fill(TB.$('#dtOut', root), [['错误', '时间格式无法识别']]); return; }
        fill(TB.$('#dtOut', root), [
          ['秒级时间戳', Math.floor(d.getTime() / 1000)],
          ['毫秒级时间戳', d.getTime()],
          ['ISO 8601', d.toISOString()],
          ['UTC 时间', d.toUTCString()]
        ]);
      });

      TB.$('#ts', root).value = Math.floor(Date.now() / 1000);
      fromTs();
      TB.$('#dt', root).value = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
  });

  /* ---------------------------------------------------------- 3. JSON 工具 */
  TB.def({
    slug: 'json', cat: 'web', name: 'JSON 格式化', desc: '校验与美化压缩', icon: '🧩',
    kw: 'json 格式化 美化 压缩 校验 转义',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>JSON 内容</b></div>' +
            '<textarea class="textarea" id="src" style="min-height:260px" placeholder=\'{"hello":"world"}\'></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">缩进</div><select class="select" id="ind">' +
              '<option value="2">2 空格</option><option value="4">4 空格</option><option value="tab">Tab</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="fmt">格式化</button>' +
            '<button class="btn" id="compress">压缩一行</button>' +
            '<button class="btn" id="sort">键名排序</button>' +
            '<button class="btn" id="esc">转义为字符串</button>' +
            '<button class="btn" id="copy">复制</button>' +
            '<button class="btn" id="dl">下载 .json</button></div>' +
          '<div id="msg"></div>' +
          '<div class="out" hidden id="outBox"><div class="out-h"><span class="grow">结果</span><span id="info"></span></div>' +
            '<div class="out-b" id="out"></div></div>' +
        '</div>' +
        '<div class="note">出错时会给出大致位置。格式化只做缩进，不会改变数据本身；「键名排序」会递归重排对象键。</div>';

      var src = TB.$('#src', root), outEl = TB.$('#out', root), box = TB.$('#outBox', root), msg = TB.$('#msg', root);

      function parse() {
        try {
          return { ok: true, data: JSON.parse(src.value) };
        } catch (e) {
          /* 从 V8 报错里抽出位置，换算成行号更直观 */
          var m = String(e.message).match(/position (\d+)/);
          var line = 1;
          if (m) {
            var pos = parseInt(m[1], 10);
            line = src.value.slice(0, pos).split('\n').length;
          }
          return { ok: false, err: e.message + (m ? '（约第 ' + line + ' 行）' : '') };
        }
      }

      function show(text, note) {
        box.hidden = false;
        outEl.textContent = text;
        TB.$('#info', root).textContent = note || (text.length + ' 字符');
        status(msg, '');
      }

      function need() {
        var r = parse();
        if (!r.ok) { status(msg, 'JSON 不合法：' + r.err, true); return null; }
        return r.data;
      }

      TB.$('#fmt', root).addEventListener('click', function () {
        var d = need(); if (d === null) return;
        var ind = TB.$('#ind', root).value;
        show(JSON.stringify(d, null, ind === 'tab' ? '\t' : +ind), '格式化完成');
      });

      TB.$('#compress', root).addEventListener('click', function () {
        var d = need(); if (d === null) return;
        show(JSON.stringify(d), '压缩完成');
      });

      TB.$('#sort', root).addEventListener('click', function () {
        var d = need(); if (d === null) return;
        var sortObj = function (v) {
          if (Array.isArray(v)) return v.map(sortObj);
          if (v && typeof v === 'object') {
            var o = {};
            Object.keys(v).sort().forEach(function (k) { o[k] = sortObj(v[k]); });
            return o;
          }
          return v;
        };
        var ind = TB.$('#ind', root).value;
        show(JSON.stringify(sortObj(d), null, ind === 'tab' ? '\t' : +ind), '键名已排序');
      });

      TB.$('#esc', root).addEventListener('click', function () {
        var d = need(); if (d === null) return;
        show(JSON.stringify(JSON.stringify(d)), '已转义，可直接放进字符串');
      });

      TB.$('#copy', root).addEventListener('click', function () { TB.copy(outEl.textContent); });
      TB.$('#dl', root).addEventListener('click', function () {
        TB.downloadText(outEl.textContent || '{}', 'data.json', 'application/json');
      });

      src.value = '{\n  "name": "简单工具箱",\n  "free": true,\n  "tools": ["pdf", "image", "json"],\n  "author": {"city": "武汉"}\n}';
      TB.$('#fmt', root).click();
    }
  });

  /* ---------------------------------------------------------- 4. 正则测试 */
  TB.def({
    slug: 'regex', cat: 'web', name: '正则测试', desc: '在线正则调试', icon: '🔍',
    kw: 'regex 正则 匹配 调试 替换 分组',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>表达式</b></div>' +
            '<input class="input" id="pat" type="text" value="(\\d{4})-(\\d{2})-(\\d{2})" style="font-family:ui-monospace,monospace"></div>' +
          '<div class="field"><div class="label">修饰符</div><div class="checks" id="flags">' +
            '<label><input type="checkbox" value="g" checked> g 全局</label>' +
            '<label><input type="checkbox" value="i"> i 忽略大小写</label>' +
            '<label><input type="checkbox" value="m"> m 多行</label>' +
            '<label><input type="checkbox" value="s"> s 点匹配换行</label>' +
            '<label><input type="checkbox" value="u"> u Unicode</label>' +
          '</div></div>' +
          '<div class="field"><div class="label"><b>测试文本</b></div>' +
            '<textarea class="textarea" id="src" style="min-height:150px">今天是 2026-11-14，明天是 2026-11-15。\n订单号 A1234，金额 ¥88.50。</textarea></div>' +
          '<div class="field"><div class="label">替换为<span style="color:var(--ink-3)">支持 $1 $2 引用分组</span></div>' +
            '<input class="input" id="rep" type="text" placeholder="留空则只看匹配"></div>' +
          '<div class="btns"><button class="btn primary" id="run">测试</button><button class="btn" id="copy">复制替换结果</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">匹配结果<span class="hint" id="cnt"></span></div><div id="pv"></div></div>' +
        '<div class="panel" id="repBox" hidden><div class="panel-h">替换预览</div><div class="out-b" id="repOut"></div></div>';

      var msg = TB.$('#msg', root);

      function run() {
        var pat = TB.$('#pat', root).value;
        var flags = TB.$$('#flags input', root).filter(function (i) { return i.checked; })
          .map(function (i) { return i.value; }).join('');
        var src = TB.$('#src', root).value;
        var rep = TB.$('#rep', root).value;

        TB.$('#pv', root).innerHTML = '';
        TB.$('#repBox', root).hidden = true;
        status(msg, '');

        var re;
        try { re = new RegExp(pat, flags); }
        catch (e) { status(msg, '正则语法错误：' + e.message, true); return; }

        /* 高亮：只处理非零宽匹配，避免死循环 */
        var html = '', last = 0, count = 0, groupsList = [];
        if (flags.indexOf('g') >= 0) {
          var m;
          var guard = 0;
          while ((m = re.exec(src)) !== null && guard++ < 5000) {
            count++;
            html += TB.esc(src.slice(last, m.index));
            html += '<mark style="background:color-mix(in srgb,var(--brand) 22%,transparent);border-radius:3px">' +
              TB.esc(m[0]) + '</mark>';
            last = m.index + m[0].length;
            groupsList.push(m);
            if (m[0] === '') re.lastIndex++;
          }
          html += TB.esc(src.slice(last));
        } else {
          var one = re.exec(src);
          if (one) {
            count = 1;
            groupsList.push(one);
            html = TB.esc(src.slice(0, one.index)) +
              '<mark style="background:color-mix(in srgb,var(--brand) 22%,transparent);border-radius:3px">' +
              TB.esc(one[0]) + '</mark>' + TB.esc(src.slice(one.index + one[0].length));
          } else html = TB.esc(src);
        }

        TB.$('#pv', root).innerHTML = '<div class="out-b" style="max-height:300px">' + html.replace(/\n/g, '<br>') + '</div>';
        TB.$('#cnt', root).textContent = '共 ' + count + ' 处匹配';

        if (groupsList.length) {
          var tbl = '<div class="table-wrap" style="margin-top:12px"><table class="table"><tr><th>#</th><th>匹配</th><th>位置</th><th>分组</th></tr>' +
            groupsList.slice(0, 200).map(function (m, i) {
              return '<tr><td class="num">' + (i + 1) + '</td><td>' + TB.esc(m[0]) + '</td><td class="num">' + m.index + '</td><td>' +
                TB.esc(m.slice(1).map(function (g) { return g == null ? '—' : g; }).join(' | ')) + '</td></tr>';
            }).join('') + '</table></div>';
          TB.$('#pv', root).innerHTML += tbl;
        }

        if (rep) {
          var replaced = src.replace(re, rep);
          TB.$('#repBox', root).hidden = false;
          TB.$('#repOut', root).textContent = replaced;
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () {
        TB.copy(TB.$('#repOut', root).textContent);
      });
      ['#pat', '#src', '#rep'].forEach(function (sel) {
        TB.$(sel, root).addEventListener('input', TB.debounce(run, 350));
      });
      TB.$('#flags', root).addEventListener('change', run);
      run();
    }
  });

  /* ---------------------------------------------------------- 5. Cron 解析 */
  TB.def({
    slug: 'cron', cat: 'web', name: 'Cron 解析', desc: '定时表达式解释', icon: '⏰',
    kw: 'cron crontab 定时 表达式 解释',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>Cron 表达式</b><span style="color:var(--ink-3)">5 段：分 时 日 月 周；也支持 6 段（含秒）</span></div>' +
            '<input class="input" id="expr" type="text" value="0 9 * * 1-5" style="font-family:ui-monospace,monospace"></div>' +
          '<div class="btns"><button class="btn primary" id="run">解析</button>' +
            '<button class="btn" id="copy">复制说明</button></div>' +
          '<div class="field" style="margin-top:12px"><div class="label">快速示例</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
              ['0 9 * * 1-5', '*/5 * * * *', '0 0 1 * *', '30 2 * * *', '0 */2 * * *'].map(function (e) {
                return '<button class="btn sm" data-ex="' + e + '">' + e + '</button>';
              }).join('') +
            '</div></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="panel" id="descBox" hidden><div class="panel-h">含义</div><div id="desc" style="font-size:13.5px;line-height:1.9"></div></div>' +
        '<div class="panel" id="nextBox" hidden><div class="panel-h">接下来 5 次触发</div><div class="kv" id="next"></div></div>';

      var msg = TB.$('#msg', root);

      var NAMES = {
        month: { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 },
        dow: { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
      };

      function parseField(field, min, max, kind) {
        var set = {};
        field.split(',').forEach(function (part) {
          part = part.trim().toLowerCase();
          if (!part) return;
          var step = 1;
          if (part.indexOf('/') >= 0) {
            var sp = part.split('/');
            step = parseInt(sp[1], 10) || 1;
            part = sp[0];
          }
          var lo, hi;
          if (part === '*') { lo = min; hi = max; }
          else if (part.indexOf('-') >= 0) {
            var r = part.split('-');
            lo = toNum(r[0], kind); hi = toNum(r[1], kind);
          } else {
            lo = hi = toNum(part, kind);
            if (step > 1) hi = max;
          }
          if (isNaN(lo) || isNaN(hi)) throw new Error('无法识别的字段：' + field);
          for (var v = lo; v <= hi; v += step) {
            if (v >= min && v <= max) set[v] = true;
          }
        });
        if (!Object.keys(set).length) throw new Error('字段为空：' + field);
        return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
      }

      function toNum(s, kind) {
        var map = NAMES[kind] || {};
        if (map[s] !== undefined) return map[s];
        return parseInt(s, 10);
      }

      function run() {
        var expr = TB.$('#expr', root).value.trim().replace(/\s+/g, ' ');
        if (!expr) return;
        var f = expr.split(' ');
        if (f.length < 5 || f.length > 6) { status(msg, '需要 5 段或 6 段，当前 ' + f.length + ' 段', true); return; }
        var hasSec = f.length === 6;
        try {
          var sec = hasSec ? parseField(f[0], 0, 59, null) : [0];
          var min = parseField(f[hasSec ? 1 : 0], 0, 59, null);
          var hour = parseField(f[hasSec ? 2 : 1], 0, 23, null);
          var dom = parseField(f[hasSec ? 3 : 2], 1, 31, null);
          var mon = parseField(f[hasSec ? 4 : 3], 1, 12, 'month');
          var dow = parseField(f[hasSec ? 5 : 4], 0, 6, 'dow');

          var domWild = f[hasSec ? 3 : 2] === '*';
          var dowWild = f[hasSec ? 5 : 4] === '*';

          /* 中文说明 */
          var unit = function (arr, all, template) {
            return arr.length === all ? '' : template(arr);
          };
          var descParts = [];
          descParts.push('在 ' + mon.map(function (m) { return m + '月'; }).join('、') + ' 的' +
            (domWild && dowWild ? '每一天' : '') +
            (domWild ? '' : dom.map(function (d) { return d + '日'; }).join('、')) +
            (dowWild ? '' : ' 周' + dow.map(function (d) { return '日一二三四五六'[d]; }).join('、')) +
            '，' + hour.map(function (h) { return TB.pad2(h); }).join('、') + ' 点 ' +
            min.map(function (m) { return TB.pad2(m); }).join('、') + ' 分触发');
          if (hasSec) descParts.push('（精确到秒：' + sec.join('、') + ' 秒）');

          /* 逐分钟（或逐秒）推算接下来 5 次 */
          var dates = [];
          var d = new Date();
          d.setMilliseconds(0);
          if (hasSec) d.setSeconds(d.getSeconds() + 1); else { d.setSeconds(0); d.setMinutes(d.getMinutes() + 1); }
          var limit = hasSec ? 400000 : 1500000;
          var it = 0;
          while (dates.length < 5 && it < limit) {
            it++;
            if (domWild && dowWild) {
              /* 两者都是 * 时不做日期过滤 */
            } else if (!domWild && !dowWild) {
              if (dom.indexOf(d.getDate()) < 0 && dow.indexOf(d.getDay()) < 0) { next(d, hasSec); continue; }
            } else if (!domWild) {
              if (dom.indexOf(d.getDate()) < 0) { next(d, hasSec); continue; }
            } else if (!dowWild) {
              if (dow.indexOf(d.getDay()) < 0) { next(d, hasSec); continue; }
            }
            if (mon.indexOf(d.getMonth() + 1) < 0) { next(d, hasSec); continue; }
            if (hour.indexOf(d.getHours()) < 0) { next(d, hasSec); continue; }
            if (min.indexOf(d.getMinutes()) < 0) { next(d, hasSec); continue; }
            if (hasSec && sec.indexOf(d.getSeconds()) < 0) { next(d, hasSec); continue; }
            dates.push(new Date(d));
            next(d, hasSec);
          }

          TB.$('#descBox', root).hidden = false;
          TB.$('#desc', root).innerHTML = TB.esc(descParts.join('')) +
            '<div style="margin-top:8px;color:var(--ink-3);font-size:12.5px">分：' + min.join(',') +
            '｜时：' + hour.join(',') + '｜日：' + dom.join(',') + '｜月：' + mon.join(',') +
            '｜周：' + dow.join(',') + '</div>';

          if (dates.length) {
            TB.$('#nextBox', root).hidden = false;
            TB.$('#next', root).innerHTML = dates.map(function (dt, i) {
              return '<div class="kv-item"><div class="kv-k">第 ' + (i + 1) + ' 次</div><div class="kv-v">' +
                formatDate(dt, hasSec) + ' · 星期' + '日一二三四五六'[dt.getDay()] + '</div></div>';
            }).join('');
          }
          status(msg, '');
        } catch (e) {
          status(msg, '解析失败：' + e.message, true);
          TB.$('#descBox', root).hidden = true;
          TB.$('#nextBox', root).hidden = true;
        }
      }

      function next(d, hasSec) {
        if (hasSec) d.setSeconds(d.getSeconds() + 1); else d.setMinutes(d.getMinutes() + 1);
      }

      function formatDate(d, hasSec) {
        var p = TB.pad2;
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
          p(d.getHours()) + ':' + p(d.getMinutes()) + (hasSec ? ':' + p(d.getSeconds()) : '');
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#expr', root).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
      TB.$('#copy', root).addEventListener('click', function () {
        TB.copy(TB.$('#desc', root).textContent + '\n' + TB.$('#next', root).textContent);
      });
      root.addEventListener('click', function (e) {
        var ex = e.target.getAttribute && e.target.getAttribute('data-ex');
        if (ex) { TB.$('#expr', root).value = ex; run(); }
      });
      run();
    }
  });

  /* ---------------------------------------------------------- 6. 命名转换 */
  var NAME_STYLES = [
    ['camel', '小驼峰 camelCase'],
    ['pascal', '大驼峰 PascalCase'],
    ['snake', '下划线 snake_case'],
    ['kebab', '短横线 kebab-case'],
    ['constant', '常量 CONSTANT_CASE'],
    ['title', '标题 Title Case'],
    ['dot', '点号 dot.case']
  ];

  function splitWords(s) {
    return String(s)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-.]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function toStyle(s, style) {
    var w = splitWords(s);
    if (!w.length) return '';
    var lc = w.map(function (x) { return x.toLowerCase(); });
    var cap = function (x) { return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); };
    switch (style) {
      case 'camel': return lc[0] + lc.slice(1).map(cap).join('');
      case 'pascal': return lc.map(cap).join('');
      case 'snake': return lc.join('_');
      case 'kebab': return lc.join('-');
      case 'constant': return lc.join('_').toUpperCase();
      case 'title': return lc.map(cap).join(' ');
      case 'dot': return lc.join('.');
      default: return s;
    }
  }

  TB.def({
    slug: 'naming', cat: 'web', name: '命名转换', desc: '驼峰下划线互转', icon: '🔡',
    kw: '命名 camel snake kebab 常量 变量 转换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>输入标识符</b><span style="color:var(--ink-3)">每行一个，会批量转换</span></div>' +
            '<textarea class="textarea" id="src" style="min-height:130px">user name\nUserProfile\nORDER_ID\napi-base-url</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">转换</button><button class="btn" id="copy">复制全部</button></div>' +
          '<div class="out" id="outBox" hidden><div class="out-h"><span class="grow">结果</span></div><div class="out-b" id="out"></div></div>' +
        '</div>' +
        '<div class="note">自动识别 camelCase / snake_case / kebab-case / 空格 等写法，再做拆分重组。</div>';

      var outEl = TB.$('#out', root);

      TB.$('#run', root).addEventListener('click', function () {
        var lines = TB.$('#src', root).value.split(/\r?\n/).filter(function (l) { return l.trim(); });
        if (!lines.length) return;
        var out = lines.map(function (line) {
          return NAME_STYLES.map(function (st) {
            return st[1].split(' ')[1] + '：' + toStyle(line, st[0]);
          }).join('\n');
        }).join('\n\n');
        TB.$('#outBox', root).hidden = false;
        outEl.textContent = out;
      });

      TB.$('#copy', root).addEventListener('click', function () { TB.copy(outEl.textContent); });
      TB.$('#run', root).click();
    }
  });

  /* ---------------------------------------------------------- 7. 颜色转换 */
  TB.def({
    slug: 'color', cat: 'web', name: '颜色转换', desc: 'HEX / RGB / HSL', icon: '🎨',
    kw: '颜色 hex rgb hsl hsv 取色 调色板 对比度',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>颜色值</b><span style="color:var(--ink-3)">支持 #2b7fff、rgb(43,127,255)、hsl(215,100%,60%)</span></div>' +
            '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
              '<input class="input" id="src" style="flex:1 1 240px" value="#2b7fff">' +
              '<input type="color" class="input" id="pick" value="#2b7fff" style="width:56px;padding:2px;flex:none">' +
            '</div></div>' +
          '<div class="kv" id="res" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">明度阶梯<span class="hint">点击色块复制 HEX</span></div><div class="swatches" id="ramp"></div></div>' +
        '<div class="panel"><div class="panel-h">搭配建议<span class="hint">同色系 + 互补色</span></div><div class="swatches" id="harmony"></div></div>';

      function parseColor(s) {
        s = String(s).trim().toLowerCase();
        var m;
        if ((m = s.match(/^#?([0-9a-f]{3,8})$/))) {
          var hex = m[1];
          if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
          if (hex.length === 8) hex = hex.slice(0, 6);
          if (hex.length !== 6) return null;
          return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
        }
        if ((m = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/))) {
          return { r: Math.min(255, +m[1]), g: Math.min(255, +m[2]), b: Math.min(255, +m[3]) };
        }
        if ((m = s.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/))) {
          return hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);
        }
        return null;
      }

      function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360 / 360;
        var q = l < .5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        var f = function (t) {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
      }

      function rgbToHsl(c) {
        var r = c.r / 255, g = c.g / 255, b = c.b / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          var d = max - min;
          s = l > .5 ? d / (2 - max - min) : d / (max + min);
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          else if (max === g) h = ((b - r) / d + 2) / 6;
          else h = ((r - g) / d + 4) / 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      }

      function toHex(c) {
        var p = function (n) { return n.toString(16).padStart(2, '0'); };
        return '#' + p(c.r) + p(c.g) + p(c.b);
      }

      /* WCAG 相对亮度，用来算黑白文字对比度 */
      function luminance(c) {
        var f = function (v) {
          v /= 255;
          return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
        };
        return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b);
      }

      function render() {
        var c = parseColor(TB.$('#src', root).value);
        if (!c) { TB.$('#res', root).innerHTML = '<div class="result-err">无法识别这个颜色值</div>'; return; }
        var hsl = rgbToHsl(c);
        var hex = toHex(c);
        TB.$('#pick', root).value = hex;

        TB.$('#res', root).innerHTML =
          '<div class="kv-item" style="grid-column:span 1"><div class="kv-k">预览</div>' +
            '<div style="height:44px;border-radius:8px;margin-top:4px;background:' + hex + ';display:flex;align-items:center;justify-content:center;color:' +
            (luminance(c) > .5 ? '#16233a' : '#fff') + ';font-size:12px">Aa ' + hex + '</div></div>' +
          [['HEX', hex],
           ['RGB', 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')'],
           ['HSL', 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)'],
           ['HSV', 'hsv(' + hsl.h + ', ' + Math.round(Math.max(c.r, c.g, c.b) === 0 ? 0 : (1 - Math.min(c.r, c.g, c.b) / Math.max(c.r, c.g, c.b)) * 100) + '%, ' + Math.round(Math.max(c.r, c.g, c.b) / 255 * 100) + '%)'],
           ['RGB 分量', c.r + ' / ' + c.g + ' / ' + c.b],
           ['相对亮度', luminance(c).toFixed(3)]
          ].map(function (it) {
            return '<div class="kv-item"><div class="kv-k">' + it[0] + '</div><div class="kv-v">' + it[1] + '</div></div>';
          }).join('');

        /* 明度阶梯：hsl 里调 l */
        var ramp = '';
        for (var i = 95; i >= 5; i -= 10) {
          var col = hslToRgb(hsl.h, hsl.s / 100, i / 100);
          ramp += '<div class="swatch" style="background:' + toHex(col) + '" title="' + toHex(col) + ' · L' + i + '" data-hex="' + toHex(col) + '"></div>';
        }
        TB.$('#ramp', root).innerHTML = ramp;

        var harmony = [
          { c: c, n: '本色' },
          { c: hslToRgb(hsl.h, hsl.s / 100, Math.min(1, hsl.l / 100 + .18)), n: '浅一档' },
          { c: hslToRgb(hsl.h, hsl.s / 100, Math.max(0, hsl.l / 100 - .18)), n: '深一档' },
          { c: hslToRgb(hsl.h + 180, hsl.s / 100, hsl.l / 100), n: '互补色' },
          { c: hslToRgb(hsl.h + 30, hsl.s / 100, hsl.l / 100), n: '邻近 +30°' },
          { c: hslToRgb(hsl.h - 30, hsl.s / 100, hsl.l / 100), n: '邻近 -30°' }
        ].map(function (x) {
          var hx = toHex(x.c);
          return '<div class="swatch" style="background:' + hx + '" title="' + x.n + ' ' + hx + '" data-hex="' + hx + '"></div>';
        }).join('');
        TB.$('#harmony', root).innerHTML = harmony;
      }

      TB.$('#src', root).addEventListener('input', TB.debounce(render, 300));
      TB.$('#pick', root).addEventListener('input', function () {
        TB.$('#src', root).value = TB.$('#pick', root).value;
        render();
      });
      root.addEventListener('click', function (e) {
        var hex = e.target.getAttribute && e.target.getAttribute('data-hex');
        if (hex) { TB.copy(hex); }
      });
      render();
    }
  });

  /* ---------------------------------------------------------- 8. 文本工具 */
  TB.def({
    slug: 'text-tools', cat: 'web', name: '文本工具', desc: '去重排序统计', icon: '📋',
    kw: '文本 去重 排序 空行 统计 大小写 替换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>文本</b></div>' +
            '<textarea class="textarea" id="src" style="min-height:200px" placeholder="粘贴需要处理的文本"></textarea></div>' +
          '<div class="field"><div class="label">操作</div><div style="display:flex;gap:7px;flex-wrap:wrap">' +
            [['dedupe', '去重行'], ['sortAsc', '按行排序 ↑'], ['sortDesc', '排序 ↓'], ['trim', '去空行'],
             ['strip', '去首尾空格'], ['upper', '转大写'], ['lower', '转小写'], ['reverse', '行序颠倒'],
             ['num', '加行号'], ['escape', '转义换行'], ['unescape', '反转义']].map(function (op) {
              return '<button class="btn sm" data-op="' + op[0] + '">' + op[1] + '</button>';
            }).join('') +
          '</div></div>' +
          '<div class="row"><div class="field"><div class="label">查找</div><input class="input" id="find"></div>' +
            '<div class="field"><div class="label">替换为</div><input class="input" id="repl"></div>' +
            '<div class="field"><div class="label">&nbsp;</div><button class="btn" id="doReplace" style="width:100%">替换</button></div></div>' +
          '<div class="kv" id="stat" style="margin-top:14px"></div>' +
          '<div class="btns"><button class="btn" id="copy">复制结果</button><button class="btn primary" id="apply">结果 → 上文</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">输出</div><div class="out-b" id="out" style="min-height:60px"></div></div>';

      var src = TB.$('#src', root), outEl = TB.$('#out', root);

      function stats() {
        var t = src.value;
        var chars = Array.from(t).length;
        var charsNoSpace = Array.from(t.replace(/\s/g, '')).length;
        var lines = t ? t.split(/\r?\n/).length : 0;
        var words = t.trim() ? t.trim().split(/[\s,，。.;；:：!！?？]+/).filter(Boolean).length : 0;
        var cn = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
        TB.$('#stat', root).innerHTML = [
          ['字符数', chars], ['不含空白', charsNoSpace], ['汉字', cn], ['行数', lines], ['词数（粗略）', words]
        ].map(function (x) {
          return '<div class="kv-item"><div class="kv-k">' + x[0] + '</div><div class="kv-v">' + x[1] + '</div></div>';
        }).join('');
      }

      function put(text) { outEl.textContent = text; stats(); }

      root.addEventListener('click', function (e) {
        var op = e.target.getAttribute && e.target.getAttribute('data-op');
        if (!op) return;
        var t = src.value;
        switch (op) {
          case 'dedupe': {
            var seen = {}, keep = [];
            t.split(/\r?\n/).forEach(function (l) { if (!seen[l]) { seen[l] = 1; keep.push(l); } });
            put(keep.join('\n')); break;
          }
          case 'sortAsc': put(t.split(/\r?\n/).sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); }).join('\n')); break;
          case 'sortDesc': put(t.split(/\r?\n/).sort(function (a, b) { return b.localeCompare(a, 'zh-CN'); }).join('\n')); break;
          case 'trim': put(t.split(/\r?\n/).filter(function (l) { return l.trim(); }).join('\n')); break;
          case 'strip': put(t.split(/\r?\n/).map(function (l) { return l.trim(); }).join('\n')); break;
          case 'upper': put(t.toUpperCase()); break;
          case 'lower': put(t.toLowerCase()); break;
          case 'reverse': put(t.split(/\r?\n/).reverse().join('\n')); break;
          case 'num': put(t.split(/\r?\n/).map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n')); break;
          case 'escape': put(JSON.stringify(t)); break;
          case 'unescape': try { put(JSON.parse(t)); } catch (err) { TB.toast('不是合法的转义字符串'); } break;
        }
      });

      TB.$('#doReplace', root).addEventListener('click', function () {
        var f = TB.$('#find', root).value;
        if (!f) return;
        put(src.value.split(f).join(TB.$('#repl', root).value));
      });
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(outEl.textContent); });
      TB.$('#apply', root).addEventListener('click', function () { src.value = outEl.textContent; stats(); });
      src.addEventListener('input', TB.debounce(stats, 400));
      stats();
    }
  });

  /* ---------------------------------------------------------- 9. 二维码 */
  TB.def({
    slug: 'qrcode', cat: 'web', name: '二维码生成', desc: '单个 / 批量 · 文本 / 链接', icon: '🔳',
    kw: 'qrcode 二维码 qr 扫码 链接 微信 批量 每行一个',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>生成模式</b></div>' +
            '<select class="select" id="mode">' +
              '<option value="single">单个二维码</option>' +
              '<option value="batch">批量（每行一个内容）</option>' +
            '</select></div>' +
          '<div class="field"><div class="label"><b>内容</b><span style="color:var(--ink-3)" id="srcHint">网址、文本、Wi-Fi、名片都行</span></div>' +
            '<textarea class="textarea" id="src" style="min-height:100px">https://tools.432600.xyz/</textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">尺寸（px）</div><input class="input" id="size" type="number" value="320" min="80" max="1200"></div>' +
            '<div class="field"><div class="label">容错级别</div><select class="select" id="ec">' +
              '<option value="L">L（7%，图案最稀）</option><option value="M" selected>M（15%，推荐）</option>' +
              '<option value="Q">Q（25%）</option><option value="H">H（30%，最抗污）</option></select></div>' +
            '<div class="field"><div class="label">边距（模块）</div><input class="input" id="margin" type="number" value="4" min="0" max="16"></div>' +
          '</div>' +
          '<div class="field"><div class="label">颜色</div>' +
            '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;height:36px">' +
              '<label class="color-pick">前景色<input type="color" id="fg" value="#16233a"></label>' +
              '<label class="color-pick">背景色<input type="color" id="bg" value="#ffffff"></label>' +
            '</div></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="dlPng" disabled>下载 PNG</button>' +
            '<button class="btn" id="dlSvg" disabled>下载 SVG</button>' +
            '<button class="btn" id="dlZipPng" disabled hidden>下载 PNG 包</button>' +
            '<button class="btn" id="dlZipSvg" disabled hidden>下载 SVG 包</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="pv" style="margin-top:14px;min-height:120px;background:#fff"></div>' +
        '</div>' +
        '<div class="note">内容过长时二维码会变密，扫码成功率下降。网址建议用短链。</div>';

      var pv = TB.$('#pv', root), msg = TB.$('#msg', root), mode = TB.$('#mode', root);
      var last = null, lastBatch = [], lastBg = '#ffffff';

      function readOpts() {
        return {
          size: Math.max(80, parseInt(TB.$('#size', root).value, 10) || 320),
          ec: TB.$('#ec', root).value,
          margin: Math.max(0, parseInt(TB.$('#margin', root).value, 10) || 0),
          fg: TB.$('#fg', root).value,
          bg: TB.$('#bg', root).value
        };
      }

      async function makeSvg(text, opt) {
        await TB.loadLib('qrcode.js');
        var qr = window.qrcode(0, opt.ec);
        qr.addData(text);
        qr.make();

        /* 自己拼 SVG，而不是用库自带模板：尺寸、边距、颜色都能精确控制 */
        var n = qr.getModuleCount();
        var cell = Math.max(1, Math.floor(opt.size / (n + opt.margin * 2)));
        var px = n * cell + opt.margin * cell * 2;
        var path = '';
        for (var r = 0; r < n; r++) {
          for (var c = 0; c < n; c++) {
            if (qr.isDark(r, c)) {
              path += 'M' + (c * cell + opt.margin * cell) + ',' + (r * cell + opt.margin * cell) +
                'h' + cell + 'v' + cell + 'h-' + cell + 'z';
            }
          }
        }
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px +
          '" viewBox="0 0 ' + px + ' ' + px + '" shape-rendering="crispEdges">' +
          '<rect width="100%" height="100%" fill="' + opt.bg + '"/>' +
          '<path d="' + path + '" fill="' + opt.fg + '"/></svg>';
        return { svg: svg, size: px, n: n };
      }

      function canvasBlob(canvas) {
        return new Promise(function (res, rej) {
          canvas.toBlob(function (b) { b ? res(b) : rej(new Error('PNG 编码失败')); }, 'image/png');
        });
      }

      function batchNo(i, len) {
        var s = String(i).padStart(len, '0');
        return s;
      }

      function renderBatchPreview(batch) {
        var show = batch.slice(0, 48);
        pv.style.background = '#fff';
        pv.innerHTML = '<div class="qr-grid">' + show.map(function (q) {
          return '<div class="qr-card"><div class="qr-card-img">' + q.svg + '</div>' +
            '<div class="qr-card-no">' + q.index + '</div></div>';
        }).join('') + '</div>' +
          (batch.length > show.length ? '<div class="note" style="margin:10px 0 0">已生成 ' + batch.length +
            ' 个，预览只显示前 ' + show.length + ' 个；下载包包含全部。</div>' : '');
      }

      async function generateSingle() {
        var text = TB.$('#src', root).value.trim();
        if (!text) { status(msg, '请输入内容', true); return; }
        status(msg, '生成中…');
        try {
          var opt = readOpts();
          var q = await makeSvg(text, opt);
          last = q;
          lastBatch = [];
          lastBg = opt.bg;
          pv.style.background = opt.bg;
          pv.innerHTML = '<div style="max-width:100%">' + q.svg + '</div>';
          TB.$('#dlPng', root).disabled = false;
          TB.$('#dlSvg', root).disabled = false;
          TB.$('#dlZipPng', root).disabled = true;
          TB.$('#dlZipSvg', root).disabled = true;
          status(msg, '已生成：' + q.n + ' × ' + q.n + ' 模块，输出 ' + q.size + ' px。');
        } catch (e) {
          status(msg, '生成失败：内容可能太长，' + e.message, true);
        }
      }

      async function generateBatch() {
        var lines = TB.$('#src', root).value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) { status(msg, '请输入内容，每行一个', true); return; }
        if (lines.length > 300) { status(msg, '一次最多 300 条，请分批生成', true); return; }
        status(msg, '正在生成 ' + lines.length + ' 个二维码…');
        var opt = readOpts();
        last = null;
        lastBatch = [];
        lastBg = opt.bg;
        var failed = 0, firstErr = '';
        for (var i = 0; i < lines.length; i++) {
          try {
            var q = await makeSvg(lines[i], opt);
            lastBatch.push({ index: i + 1, text: lines[i], svg: q.svg, size: q.size, n: q.n });
          } catch (e) {
            failed++;
            if (!firstErr) firstErr = e.message;
          }
        }
        if (!lastBatch.length) {
          status(msg, '生成失败：' + (firstErr || '内容无法编码'), true);
          return;
        }
        renderBatchPreview(lastBatch);
        TB.$('#dlZipPng', root).disabled = false;
        TB.$('#dlZipSvg', root).disabled = false;
        TB.$('#dlPng', root).disabled = true;
        TB.$('#dlSvg', root).disabled = true;
        status(msg, '已生成 ' + lastBatch.length + ' 个二维码' +
          (failed ? '，' + failed + ' 条失败（内容可能过长）' : '') + '。');
      }

      function generate() {
        if (mode.value === 'batch') generateBatch();
        else generateSingle();
      }

      function syncMode() {
        var isBatch = mode.value === 'batch';
        TB.$('#srcHint', root).textContent = isBatch ? '每行一个内容，空行忽略' : '网址、文本、Wi-Fi、名片都行';
        TB.$('#dlPng', root).hidden = isBatch;
        TB.$('#dlSvg', root).hidden = isBatch;
        TB.$('#dlZipPng', root).hidden = !isBatch;
        TB.$('#dlZipSvg', root).hidden = !isBatch;
        TB.$('#dlPng', root).disabled = true;
        TB.$('#dlSvg', root).disabled = true;
        TB.$('#dlZipPng', root).disabled = true;
        TB.$('#dlZipSvg', root).disabled = true;
        last = null;
        lastBatch = [];
        pv.innerHTML = '';
        pv.style.background = '#fff';
        status(msg, '');
      }

      TB.$('#run', root).addEventListener('click', generate);
      mode.addEventListener('change', syncMode);
      TB.$('#dlSvg', root).addEventListener('click', function () {
        if (last) TB.downloadText(last.svg, '二维码.svg', 'image/svg+xml');
      });
      TB.$('#dlPng', root).addEventListener('click', async function () {
        if (!last) return;
        try {
          var c = await svgToCanvas(last.svg, 2, lastBg);
          TB.downloadCanvas(c, '二维码.png', 'image/png');
        } catch (e) { status(msg, '导出 PNG 失败：' + e.message, true); }
      });
      TB.$('#dlZipSvg', root).addEventListener('click', function () {
        if (!lastBatch.length) return;
        var len = String(lastBatch.length).length;
        TB.zipDownload(lastBatch.map(function (q) {
          return { name: '二维码-' + batchNo(q.index, len) + '.svg', data: q.svg };
        }), '二维码-SVG.zip');
      });
      TB.$('#dlZipPng', root).addEventListener('click', async function () {
        if (!lastBatch.length) return;
        var btn = this;
        btn.disabled = true;
        status(msg, '正在打包 PNG…');
        try {
          var len = String(lastBatch.length).length;
          var entries = [];
          for (var i = 0; i < lastBatch.length; i++) {
            var c = await svgToCanvas(lastBatch[i].svg, 2, lastBg);
            entries.push({ name: '二维码-' + batchNo(lastBatch[i].index, len) + '.png', blob: await canvasBlob(c) });
          }
          await TB.zipDownload(entries, '二维码-PNG.zip');
          status(msg, '已打包 ' + entries.length + ' 张 PNG。');
        } catch (e) {
          status(msg, '打包失败：' + e.message, true);
        }
        btn.disabled = false;
      });

      syncMode();
      generate();
    }
  });

  /* SVG → canvas（二维码 / 图表共用） */
  function svgToCanvas(svg, scale, bg) {
    return new Promise(function (res, rej) {
      var m = svg.match(/width="([\d.]+)"[^>]*height="([\d.]+)"/);
      var w = m ? parseFloat(m[1]) : 400, h = m ? parseFloat(m[2]) : 400;
      var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = Math.round(w * (scale || 1));
        c.height = Math.round(h * (scale || 1));
        var g = c.getContext('2d');
        if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('SVG 渲染失败')); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------- 10. 文本 Diff */
  TB.def({
    slug: 'diff', cat: 'web', name: '文本 Diff', desc: '逐行差异对比', icon: '🆚',
    kw: 'diff 对比 差异 比较 版本 改动',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>原文本</b></div><textarea class="textarea" id="a" style="min-height:180px"></textarea></div>' +
            '<div class="field"><div class="label"><b>新文本</b></div><textarea class="textarea" id="b" style="min-height:180px"></textarea></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">对比</button>' +
            '<button class="btn" id="swap">左右互换</button>' +
            '<button class="btn" id="copy">复制差异</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">差异结果<span class="hint" id="cnt"></span></div>' +
          '<div class="out-b" id="out" style="max-height:520px;white-space:pre-wrap"></div></div>';

      var outEl = TB.$('#out', root), msg = TB.$('#msg', root);

      /* LCS 求最长公共子序列 → 生成增删记录 */
      function diffLines(aLines, bLines) {
        var n = aLines.length, m = bLines.length;
        var max = n * m;
        if (max > 4e6) return null;  /* 太大就放弃精确对比，避免卡死 */
        var dp = new Array(n + 1);
        for (var i = 0; i <= n; i++) dp[i] = new Array(m + 1).fill(0);
        for (var i2 = n - 1; i2 >= 0; i2--) {
          for (var j = m - 1; j >= 0; j--) {
            dp[i2][j] = aLines[i2] === bLines[j] ? dp[i2 + 1][j + 1] + 1 : Math.max(dp[i2 + 1][j], dp[i2][j + 1]);
          }
        }
        var res = [], x = 0, y = 0;
        while (x < n && y < m) {
          if (aLines[x] === bLines[y]) { res.push({ t: 'eq', s: aLines[x], x: x, y: y }); x++; y++; }
          else if (dp[x + 1][y] >= dp[x][y + 1]) { res.push({ t: 'del', s: aLines[x], x: x }); x++; }
          else { res.push({ t: 'add', s: bLines[y], y: y }); y++; }
        }
        while (x < n) { res.push({ t: 'del', s: aLines[x], x: x }); x++; }
        while (y < m) { res.push({ t: 'add', s: bLines[y], y: y }); y++; }
        return res;
      }

      function run() {
        var a = TB.$('#a', root).value.split(/\r?\n/);
        var b = TB.$('#b', root).value.split(/\r?\n/);
        var res = diffLines(a, b);
        if (!res) { status(msg, '文本太长，超过精确对比上限（约 2000 行 × 2000 行）', true); return; }
        status(msg, '');

        var adds = res.filter(function (r) { return r.t === 'add'; }).length;
        var dels = res.filter(function (r) { return r.t === 'del'; }).length;
        TB.$('#cnt', root).textContent = '新增 ' + adds + ' 行，删除 ' + dels + ' 行';

        outEl.innerHTML = res.map(function (r) {
          var sign = r.t === 'add' ? '+' : r.t === 'del' ? '-' : ' ';
          var cls = r.t === 'add' ? 'add' : r.t === 'del' ? 'del' : '';
          return '<div class="diff-line ' + cls + '"><span class="ln">' + (r.x != null ? r.x + 1 : '') + '</span>' +
            '<span class="ln">' + (r.y != null ? r.y + 1 : '') + '</span>' +
            '<span class="sign" style="flex:none;width:12px">' + sign + '</span>' +
            '<span>' + TB.esc(r.s) + '</span></div>';
        }).join('') || '<div class="empty">两个文本完全一样</div>';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#swap', root).addEventListener('click', function () {
        var t = TB.$('#a', root).value;
        TB.$('#a', root).value = TB.$('#b', root).value;
        TB.$('#b', root).value = t;
        run();
      });
      TB.$('#copy', root).addEventListener('click', function () {
        TB.copy(outEl.textContent);
      });

      TB.$('#a', root).value = '简单工具箱 v1\n支持 PDF 合并\n支持图片压缩\n价格：免费';
      TB.$('#b', root).value = '简单工具箱 v2\n支持 PDF 合并与拆分\n支持图片压缩\n支持二维码\n价格：免费';
      run();
    }
  });

  /* ---------------------------------------------------------- 11. .gitignore */
  var GITIGNORE_PRESETS = {
    node: { name: 'Node.js', content: 'node_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-store/\ncoverage/\ndist/\nbuild/\n.env\n.env.local\n.env.*.local' },
    next: { name: 'Next.js', content: '.next/\nout/\n.vercel\nnext-env.d.ts' },
    vue: { name: 'Vue / Vite', content: 'dist/\n.vite/\n*.local\n.idea/' },
    python: { name: 'Python', content: '__pycache__/\n*.py[cod]\n.venv/\nvenv/\nenv/\n*.egg-info/\n.pytest_cache/\n.mypy_cache/\nbuild/\ndist/' },
    java: { name: 'Java / Maven', content: 'target/\n*.class\n*.jar\n!gradle-wrapper.jar\n.gradle/\nbuild/' },
    go: { name: 'Go', content: '*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\nvendor/' },
    rust: { name: 'Rust', content: 'target/\nCargo.lock\n**/*.rs.bk' },
    os: { name: '系统文件', content: '.DS_Store\nThumbs.db\ndesktop.ini' },
    ide: { name: '编辑器 / IDE', content: '.vscode/\n.idea/\n*.swp\n*.swo\n*.iml' },
    log: { name: '日志与缓存', content: '*.log\nlogs/\n.cache/\n.temp/\n*.tmp' }
  };

  TB.def({
    slug: 'gitignore', cat: 'web', name: '.gitignore 生成', desc: '忽略规则生成', icon: '🙈',
    kw: 'gitignore git 忽略 规则 仓库',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>按技术栈勾选</b></div><div class="checks" id="presets">' +
            Object.keys(GITIGNORE_PRESETS).map(function (k) {
              return '<label><input type="checkbox" value="' + k + '"' + (k === 'node' || k === 'os' ? ' checked' : '') + '> ' +
                GITIGNORE_PRESETS[k].name + '</label>';
            }).join('') +
          '</div></div>' +
          '<div class="field"><div class="label">额外规则<span style="color:var(--ink-3)">每行一条</span></div>' +
            '<textarea class="textarea" id="extra" style="min-height:90px" placeholder="*.psd&#10;素材/"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="copy">复制</button><button class="btn" id="dl">下载 .gitignore</button></div>' +
          '<div class="out"><div class="out-b" id="out"></div></div>' +
        '</div>' +
        '<div class="note">生成的是纯文本，直接放到项目根目录即可。已经提交过的文件要额外执行 <b>git rm --cached</b> 才会生效。</div>';

      function generate() {
        var checked = TB.$$('#presets input', root).filter(function (i) { return i.checked; })
          .map(function (i) { return i.value; });
        var parts = checked.map(function (k) { return '# ' + GITIGNORE_PRESETS[k].name + '\n' + GITIGNORE_PRESETS[k].content; });
        var extra = TB.$('#extra', root).value.trim();
        if (extra) parts.push('# 自定义\n' + extra);
        var text = parts.join('\n\n') + '\n';
        TB.$('#out', root).textContent = text;
        return text;
      }

      root.addEventListener('change', generate);
      TB.$('#extra', root).addEventListener('input', TB.debounce(generate, 400));
      TB.$('#run', root).addEventListener('click', generate);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(generate()); });
      TB.$('#dl', root).addEventListener('click', function () { TB.downloadText(generate(), 'gitignore.txt'); });
      generate();
    }
  });

  /* ---------------------------------------------------------- 12. robots.txt */
  TB.def({
    slug: 'robots', cat: 'web', name: 'robots.txt 生成', desc: '搜索协议生成', icon: '🤖',
    kw: 'robots txt seo 爬虫 收录 sitemap',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label">策略</div><select class="select" id="mode">' +
              '<option value="allow">允许所有爬虫收录</option>' +
              '<option value="block">禁止所有爬虫（全站不收录）</option>' +
              '<option value="custom">自定义</option></select></div>' +
            '<div class="field"><div class="label">Crawl-delay（秒，可空）</div><input class="input" id="delay" type="number" min="0" placeholder="不限制"></div>' +
          '</div>' +
          '<div class="field"><div class="label">Sitemap 地址</div><input class="input" id="sitemap" placeholder="https://example.com/sitemap.xml"></div>' +
          '<div class="field"><div class="label">禁止路径<span style="color:var(--ink-3)">每行一个，如 /admin/</span></div>' +
            '<textarea class="textarea" id="disallow" style="min-height:90px">/admin/\n/api/\n/private/</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="copy">复制</button></div>' +
          '<div class="out"><div class="out-b" id="out"></div></div>' +
        '</div>' +
        '<div class="note">robots.txt 放在站点根目录。注意：它只是"君子协定"，恶意爬虫不会遵守；真正的权限控制还得靠服务端。</div>';

      function generate() {
        var mode = TB.$('#mode', root).value;
        var delay = TB.$('#delay', root).value.trim();
        var sitemap = TB.$('#sitemap', root).value.trim();
        var disallow = TB.$('#disallow', root).value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);

        var lines = ['User-agent: *'];
        if (mode === 'block') lines.push('Disallow: /');
        else {
          if (disallow.length) disallow.forEach(function (d) { lines.push('Disallow: ' + d); });
          else lines.push('Disallow:');
        }
        if (delay) lines.push('Crawl-delay: ' + delay);
        if (sitemap) lines.push('', 'Sitemap: ' + sitemap);
        var text = lines.join('\n') + '\n';
        TB.$('#out', root).textContent = text;
        return text;
      }

      root.addEventListener('change', generate);
      ['#sitemap', '#disallow', '#delay'].forEach(function (s) {
        TB.$(s, root).addEventListener('input', TB.debounce(generate, 400));
      });
      TB.$('#run', root).addEventListener('click', generate);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(generate()); });
      generate();
    }
  });

  /* ---------------------------------------------------------- 13. TOTP 2FA */
  TB.def({
    slug: 'totp', cat: 'web', name: '2FA 验证码', desc: 'TOTP 动态口令', icon: '🔐',
    kw: '2fa totp 验证码 authenticator 动态口令 谷歌验证',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>密钥或 otpauth 链接</b><span style="color:var(--ink-3)">支持 base32 密钥或 otpauth://totp/... 二维码内容</span></div>' +
            '<input class="input" id="secret" placeholder="例如 JBSWY3DPEHPK3PXP 或 otpauth://totp/..."></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成验证码</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" style="margin-top:14px;min-height:0;background:var(--surface-2);padding:22px">' +
            '<div style="text-align:center">' +
              '<div id="code" style="font-size:34px;font-weight:700;letter-spacing:6px;font-family:ui-monospace,monospace;color:var(--brand)">------</div>' +
              '<div id="left" style="font-size:12.5px;color:var(--ink-3);margin-top:6px">等待输入密钥</div>' +
              '<div style="height:5px;border-radius:3px;background:var(--surface-3);margin:12px auto 0;max-width:240px;overflow:hidden">' +
                '<div id="bar" style="height:100%;width:0;background:var(--brand);transition:width .3s linear"></div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="note">采用 RFC 6238 标准，30 秒一换、默认 6 位数字，与 Google Authenticator / 1Password 一致。' +
        '计算全部在本机完成，密钥不会发送到任何地方；但仍建议只在可信设备上使用。</div>';

      var msg = TB.$('#msg', root);
      var timer = null;
      var conf = { secret: '', digits: 6, period: 30, algorithm: 'SHA1' };

      function base32Decode(str) {
        var map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        var s = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
        var out = [];
        var bits = 0, val = 0;
        for (var i = 0; i < s.length; i++) {
          val = (val << 5) | map.indexOf(s[i]);
          bits += 5;
          if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
        }
        return new Uint8Array(out);
      }

      function parseInput(v) {
        v = String(v).trim();
        if (v.toLowerCase().indexOf('otpauth://') === 0) {
          var u = new URL(v);
          conf.digits = parseInt(u.searchParams.get('digits') || '6', 10);
          conf.period = parseInt(u.searchParams.get('period') || '30', 10);
          conf.algorithm = (u.searchParams.get('algorithm') || 'SHA1').toUpperCase();
          conf.secret = u.searchParams.get('secret') || '';
        } else {
          conf.secret = v;
        }
        return conf.secret;
      }

      async function computeCode() {
        var keyBytes = base32Decode(conf.secret);
        if (!keyBytes.length) return null;
        var counter = Math.floor(Date.now() / 1000 / conf.period);
        var buf = new ArrayBuffer(8);
        var view = new DataView(buf);
        view.setUint32(4, counter, false);
        view.setUint32(0, Math.floor(counter / 4294967296), false);

        var key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-' + conf.algorithm }, false, ['sign']);
        var sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
        var offset = sig[sig.length - 1] & 0x0f;
        var binCode = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
        var code = String(binCode % Math.pow(10, conf.digits));
        while (code.length < conf.digits) code = '0' + code;
        return code;
      }

      async function tick() {
        if (!root.isConnected) { clearInterval(timer); return; }
        try {
          var code = await computeCode();
          var left = conf.period - (Math.floor(Date.now() / 1000) % conf.period);
          TB.$('#code', root).textContent = code ? code.replace(/(.{3})/g, '$1 ').trim() : '------';
          TB.$('#left', root).textContent = code ? '剩余 ' + left + ' 秒刷新 · ' + conf.algorithm + ' / ' + conf.digits + ' 位' : '等待输入密钥';
          TB.$('#bar', root).style.width = (left / conf.period * 100) + '%';
        } catch (e) {
          TB.$('#left', root).textContent = '密钥格式不正确';
        }
      }

      TB.$('#run', root).addEventListener('click', function () {
        var s = parseInput(TB.$('#secret', root).value);
        if (!s) { status(msg, '请输入密钥', true); return; }
        if (!crypto.subtle) { status(msg, '当前页面不是 https 环境，浏览器禁用了加密 API', true); return; }
        status(msg, '');
        if (timer) clearInterval(timer);
        tick();
        timer = setInterval(tick, 1000);
      });

      /* 示例密钥，打开即可看到效果（对应 "HELLO" 演示用） */
      TB.$('#secret', root).value = 'JBSWY3DPEHPK3PXP';
      TB.$('#run', root).click();
    }
  });

  /* ---------------------------------------------------------- 14. IP 子网 */
  TB.def({
    slug: 'subnet', cat: 'web', name: 'IP 子网计算', desc: 'CIDR 网段换算', icon: '🌐',
    kw: 'ip 子网 cidr 掩码 网段 广播 主机',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>IP / CIDR</b></div>' +
            '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
              '<input class="input" id="ip" value="192.168.10.25/24" style="flex:1 1 220px;font-family:ui-monospace,monospace">' +
              '<button class="btn primary" id="run">计算</button>' +
            '</div></div>' +
          '<div class="kv" id="out" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">支持 IPv4，例如 10.0.0.5/8、172.16.1.0/20。计算内容包括网络地址、广播地址、可用主机范围与主机数量。</div>';

      function ipToInt(ip) {
        var p = ip.split('.');
        if (p.length !== 4) return null;
        var n = 0;
        for (var i = 0; i < 4; i++) {
          var v = Number(p[i]);
          if (!/^\d+$/.test(p[i]) || v < 0 || v > 255) return null;
          n = (n << 8) | v;
        }
        return n >>> 0;
      }
      function intToIp(n) {
        return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
      }

      TB.$('#run', root).addEventListener('click', function () {
        var v = TB.$('#ip', root).value.trim();
        var m = v.match(/^([\d.]+)(?:\/(\d{1,2}))?$/);
        if (!m) { TB.$('#out', root).innerHTML = '<div class="result-err">格式不对，应该像 192.168.1.1/24</div>'; return; }
        var ip = ipToInt(m[1]);
        var prefix = m[2] === undefined ? 32 : parseInt(m[2], 10);
        if (ip === null || prefix < 0 || prefix > 32) {
          TB.$('#out', root).innerHTML = '<div class="result-err">IP 或掩码不合法</div>';
          return;
        }
        var mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        var network = (ip & mask) >>> 0;
        var broadcast = (network | (~mask >>> 0)) >>> 0;
        var total = Math.pow(2, 32 - prefix);
        var usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : total - 2;
        var firstHost = prefix >= 31 ? network : network + 1;
        var lastHost = prefix >= 31 ? broadcast : broadcast - 1;

        var rows = [
          ['网络地址', intToIp(network)],
          ['子网掩码', intToIp(mask) + '（/' + prefix + '）'],
          ['广播地址', intToIp(broadcast)],
          ['可用主机范围', intToIp(firstHost) + ' — ' + intToIp(lastHost)],
          ['可用主机数', usable],
          ['地址总数', total],
          ['反掩码（Wildcard）', intToIp((~mask) >>> 0)],
          ['IP 类别', m[1].split('.')[0] < 128 ? 'A 类' : m[1].split('.')[0] < 192 ? 'B 类' : m[1].split('.')[0] < 224 ? 'C 类' : 'D/E 类'],
          ['二进制掩码', (mask >>> 0).toString(2).padStart(32, '0').match(/.{8}/g).join('.')]
        ];
        TB.$('#out', root).innerHTML = rows.map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');
      });

      TB.$('#run', root).click();
    }
  });

  /* ---------------------------------------------------------- 15. 哈希计算 */
  TB.def({
    slug: 'hash', cat: 'web', name: '哈希计算', desc: 'MD5 / SHA 摘要', icon: '#️⃣',
    kw: 'hash md5 sha1 sha256 摘要 校验 指纹',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>文本或文件</b></div>' +
            '<textarea class="textarea" id="src" style="min-height:100px" placeholder="粘贴文本，或下方选择文件"></textarea></div>' +
          '<div id="drop"></div>' +
          '<div class="btns"><button class="btn primary" id="runTxt">计算文本哈希</button></div>' +
          '<div id="msg"></div>' +
          '<div class="kv" id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">SHA 系列由浏览器原生 WebCrypto 计算（仅 https 可用）；MD5 为纯 JS 实现，用于老系统校验。' +
        '哈希不可逆，不能当加密用。</div>';

      var out = TB.$('#out', root), msg = TB.$('#msg', root);

      /* 纯 JS MD5：WebCrypto 不提供该算法。入参可以是字符串或字节数组 */
      function md5(input) {
        var k = [], i;
        for (i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
        var s = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
        var bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
        var len = bytes.length;
        var words = [];
        for (i = 0; i < len; i++) words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << ((i % 4) * 8));
        words[len >> 2] = (words[len >> 2] || 0) | (0x80 << ((len % 4) * 8));
        var nBlocks = Math.ceil((len + 9) / 64);
        words[nBlocks * 16 - 2] = len * 8;
        var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
        for (var blk = 0; blk < nBlocks; blk++) {
          var a = a0, b = b0, c = c0, d = d0;
          for (i = 0; i < 64; i++) {
            var f, g;
            if (i < 16) { f = (b & c) | (~b & d); g = i; }
            else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
            else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
            else { f = c ^ (b | ~d); g = (7 * i) % 16; }
            var tmp = d;
            d = c; c = b;
            var sum = (a + f + k[i] + (words[blk * 16 + g] || 0)) >>> 0;
            var sh = s[(i >> 4) * 4 + (i % 4)];
            b = (b + ((sum << sh) | (sum >>> (32 - sh)))) >>> 0;
            a = tmp;
          }
          a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
        }
        var hex = '';
        [a0, b0, c0, d0].forEach(function (n) {
          for (var j = 0; j < 4; j++) hex += ('0' + ((n >>> (j * 8)) & 255).toString(16)).slice(-2);
        });
        return hex;
      }

      function show(map) {
        out.innerHTML = Object.keys(map).map(function (k) {
          return '<div class="kv-item" style="grid-column:1/-1"><div class="kv-k">' + k + '</div>' +
            '<div class="kv-v" style="font-family:ui-monospace,monospace;font-size:12px;word-break:break-all">' +
            (map[k] || '（当前环境不支持）') + '</div></div>';
        }).join('');
      }

      async function hashBuffer(buf) {
        var map = {};
        map['MD5'] = md5(buf);
        if (crypto.subtle) {
          var algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
          for (var i = 0; i < algos.length; i++) {
            try {
              var d = await crypto.subtle.digest(algos[i], buf);
              map[algos[i]] = Array.from(new Uint8Array(d)).map(function (b) {
                return b.toString(16).padStart(2, '0');
              }).join('');
            } catch (e) { map[algos[i]] = ''; }
          }
        }
        return map;
      }

      TB.$('#runTxt', root).addEventListener('click', async function () {
        var t = TB.$('#src', root).value;
        if (!t) { status(msg, '请输入文本', true); return; }
        status(msg, '计算中…');
        try {
          var buf = new TextEncoder().encode(t);
          show(await hashBuffer(buf));
          status(msg, '');
        } catch (e) { status(msg, '计算失败：' + e.message, true); }
      });

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '', hint: '或选择文件计算校验值' });
      picker.onChange = async function () {
        if (!picker.files.length) return;
        status(msg, '计算中…');
        try {
          var buf = new Uint8Array(await TB.readArrayBuffer(picker.files[0].file));
          var map = await hashBuffer(buf);
          map['文件大小'] = TB.fmtBytes(buf.byteLength);
          show(map);
          status(msg, '');
        } catch (e) { status(msg, '计算失败：' + e.message, true); }
      };
    }
  });

})();
