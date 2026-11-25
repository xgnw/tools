/* =============================================================================
 * IPv6 地址计算器
 * -----------------------------------------------------------------------------
 * 纯前端解析 IPv6 地址，支持：
 *   - 地址展开 / 压缩、CIDR 前缀、网络地址与末地址
 *   - IPv6 ⇄ 128 位十进制整数
 *   - IPv4 映射地址（::ffff:192.168.1.1）与 %zone 后缀
 * 关键计算全部使用 BigInt，避免 Number 在 128 位上丢精度。
 * ========================================================================== */

(function () {
  'use strict';

  var FULL = (1n << 128n) - 1n;

  /* 解析 IPv6。返回 { value, zone } 或 null；prefix 由调用方单独拆分。 */
  function parseIPv6(raw) {
    var text = String(raw || '').trim().toLowerCase();
    if (!text) return null;

    var zone = '';
    var z = text.indexOf('%');
    if (z >= 0) { zone = text.slice(z + 1); text = text.slice(0, z); }

    /* IPv4 尾部：把最后两段 IPv4 换成一个 32 位十六进制段 */
    if (text.indexOf('.') >= 0) {
      var lastColon = text.lastIndexOf(':');
      var v4 = text.slice(lastColon + 1);
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4)) return null;
      var nums = v4.split('.').map(Number);
      if (nums.some(function (n) { return n < 0 || n > 255; })) return null;
      text = text.slice(0, lastColon + 1) +
        (((nums[0] << 8) | nums[1]).toString(16)) + ':' +
        (((nums[2] << 8) | nums[3]).toString(16));
    }

    var parts = text.split('::');
    if (parts.length > 2) return null;
    var left = parts[0] ? parts[0].split(':') : [];
    var right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];

    /* 没有 :: 时必须刚好 8 段；有 :: 时至少要省略 1 段 */
    if (parts.length === 1 && left.length !== 8) return null;
    if (parts.length === 2 && left.length + right.length > 7) return null;

    var bad = left.concat(right).some(function (g) { return !/^[0-9a-f]{1,4}$/.test(g); });
    if (bad) return null;

    var groups = left.slice();
    var fill = 8 - left.length - right.length;
    for (var i = 0; i < fill; i++) groups.push('0');
    groups = groups.concat(right);

    var value = 0n;
    for (var j = 0; j < 8; j++) value = (value << 16n) + BigInt(parseInt(groups[j], 16));
    return { value: value, zone: zone };
  }

  function groupsOf(value) {
    var arr = [];
    for (var i = 7; i >= 0; i--) {
      var g = Number((value >> BigInt(i * 16)) & 0xffffn);
      arr.push(('0000' + g.toString(16)).slice(-4));
    }
    return arr;
  }

  /* RFC 5952 风格的压缩：找最长的一段连续 0，转成 :: */
  function compress(value) {
    var g = groupsOf(value);
    var best = -1, bestLen = 0, cur = -1, curLen = 0;
    for (var i = 0; i < 8; i++) {
      if (g[i] === '0000') {
        if (cur < 0) { cur = i; curLen = 0; }
        curLen++;
        if (curLen > bestLen) { best = cur; bestLen = curLen; }
      } else { cur = -1; curLen = 0; }
    }
    if (bestLen < 2) return g.map(function (x) { return parseInt(x, 16).toString(16); }).join(':');
    var head = g.slice(0, best).map(function (x) { return parseInt(x, 16).toString(16); });
    var tail = g.slice(best + bestLen).map(function (x) { return parseInt(x, 16).toString(16); });
    return head.join(':') + '::' + tail.join(':');
  }

  function expanded(value) {
    return groupsOf(value).join(':');
  }

  function binary(value) {
    var s = value.toString(2).padStart(128, '0');
    return s.match(/.{4}/g).join(' ');
  }

  function prefixMask(prefix) {
    var host = 128 - prefix;
    return ((FULL << BigInt(host)) & FULL);
  }

  function ipClass(value, prefix) {
    if (value === 0n) return '未指定地址（::）';
    if (value === 1n) return '环回地址（::1）';
    if ((value >> 32n) === 0xffffn) return 'IPv4 映射地址（::ffff:0:0/96）';
    if ((value >> 118n) === 0x3fan) return '链路本地（fe80::/10）';
    if ((value >> 121n) === 0x7en) return '唯一本地（fc00::/7）';
    if ((value >> 120n) === 0xffn) return '组播（ff00::/8）';
    if ((value >> 125n) === 0x1n) return '全球单播（2000::/3）';
    return '其他 / 保留范围';
  }

  function kv(rows) {
    return rows.map(function (r) {
      return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
    }).join('');
  }

  TB.def({
    slug: 'ipv6', cat: 'web', name: 'IPv6 地址计算', desc: '压缩、网段与 128 位整数', icon: '🛰️',
    kw: 'ipv6 ip 网段 cidr 前缀 压缩 展开 128 位 整数 地址 计算 子网',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>IPv6 地址 / 前缀</b><span style="color:var(--ink-3)">前缀省略时按 /64 计算</span></div>' +
            '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
              '<input class="input mono" id="ip6Src" value="2001:db8::1/64" spellcheck="false" autocomplete="off" style="flex:1 1 260px">' +
              '<button class="btn primary" id="ip6Run" type="button">计算</button>' +
            '</div></div>' +
          '<div class="btns" style="margin-top:0">' +
            '<button class="btn sm" type="button" data-ip6="2001:db8::1/64">示例 · 全球单播</button>' +
            '<button class="btn sm" type="button" data-ip6="fe80::1/64">示例 · 链路本地</button>' +
            '<button class="btn sm" type="button" data-ip6="::1/128">示例 · 环回</button>' +
            '<button class="btn sm" type="button" data-ip6="::ffff:192.168.1.1/96">示例 · IPv4 映射</button>' +
          '</div>' +
          '<div id="ip6Msg" class="ip6-msg"></div>' +
          '<div class="kv" id="ip6Out" style="margin-top:12px"></div>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-h">IPv6 ⇄ 128 位整数<span class="hint">十进制 / 十六进制 / 二进制</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>IPv6 地址</b></div>' +
              '<input class="input mono" id="ip6Addr" value="2001:db8::1" spellcheck="false" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>十进制整数</b></div>' +
              '<input class="input mono" id="ip6Dec" value="" spellcheck="false" autocomplete="off" placeholder="0 — 340282366920938463463374607431768211455"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="ip6ToDec" type="button">IPv6 → 整数</button>' +
            '<button class="btn" id="ip6ToAddr" type="button">整数 → IPv6</button>' +
          '</div>' +
          '<div class="kv" id="ip6NumOut" style="margin-top:12px"></div>' +
        '</div>' +

        '<div class="note">IPv6 共 128 位，地址空间远大于 IPv4。压缩规则遵循 RFC 5952；网段计算展示网络地址与末地址，不表示“可分配给主机的数量”。支持 <b>::</b> 缩写与 <b>::ffff:192.168.1.1</b> 映射写法，全部在本机计算。</div>';

      var src = TB.$('#ip6Src', root);
      var msg = TB.$('#ip6Msg', root);
      var out = TB.$('#ip6Out', root);

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note ip6-note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function run() {
        var text = src.value.trim();
        if (!text) { showMsg('请输入 IPv6 地址或 CIDR'); out.innerHTML = ''; return; }
        var prefix = 64;
        var slash = text.lastIndexOf('/');
        if (slash >= 0) {
          var ps = text.slice(slash + 1);
          text = text.slice(0, slash);
          if (!/^\d{1,3}$/.test(ps) || Number(ps) > 128) {
            showMsg('前缀应为 0—128 的整数');
            out.innerHTML = '';
            return;
          }
          prefix = Number(ps);
        }
        var parsed = parseIPv6(text);
        if (!parsed) { showMsg('IPv6 格式不正确，请检查段数、冒号或十六进制字符'); out.innerHTML = ''; return; }
        showMsg('');

        var value = parsed.value;
        var mask = prefixMask(prefix);
        var network = value & mask;
        var last = network | (FULL ^ mask);
        var total = 1n << BigInt(128 - prefix);
        var zone = parsed.zone ? '（zone: ' + TB.esc(parsed.zone) + '）' : '';

        out.innerHTML = kv([
          ['输入地址', '<span class="mono">' + compress(value) + '</span>' + zone],
          ['完整展开', '<span class="mono ip6-break">' + expanded(value) + '</span>'],
          ['前缀长度', '/' + prefix + '（' + prefix + ' 位网络位）'],
          ['网络地址', '<span class="mono">' + compress(network) + '/' + prefix + '</span>'],
          ['网络地址（展开）', '<span class="mono ip6-break">' + expanded(network) + '</span>'],
          ['末地址', '<span class="mono">' + compress(last) + '</span>'],
          ['地址总数', '<span class="mono">' + total.toString() + '</span>'],
          ['地址类型', ipClass(value, prefix)],
          ['128 位整数', '<span class="mono ip6-break">' + value.toString() + '</span>']
        ]);
      }

      TB.$('#ip6Run', root).addEventListener('click', run);
      src.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
      TB.$$('[data-ip6]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          src.value = btn.getAttribute('data-ip6');
          run();
        });
      });

      /* IPv6 ⇄ 十进制 */
      var addr = TB.$('#ip6Addr', root), dec = TB.$('#ip6Dec', root), numOut = TB.$('#ip6NumOut', root);

      function showNum(value) {
        numOut.innerHTML = kv([
          ['IPv6', '<span class="mono">' + compress(value) + '</span>'],
          ['十进制', '<span class="mono ip6-break">' + value.toString() + '</span>'],
          ['十六进制', '<span class="mono ip6-break">0x' + value.toString(16).toUpperCase().padStart(32, '0') + '</span>'],
          ['二进制', '<span class="mono ip6-break ip6-bin">' + binary(value) + '</span>']
        ]);
      }

      TB.$('#ip6ToDec', root).addEventListener('click', function () {
        var p = parseIPv6(addr.value);
        if (!p) { numOut.innerHTML = '<div class="result-err">IPv6 格式不正确</div>'; return; }
        dec.value = p.value.toString();
        showNum(p.value);
      });

      TB.$('#ip6ToAddr', root).addEventListener('click', function () {
        var s = dec.value.trim().replace(/,/g, '');
        if (!/^\d{1,39}$/.test(s)) { numOut.innerHTML = '<div class="result-err">请输入 0—340282366920938463463374607431768211455 的整数</div>'; return; }
        var v;
        try { v = BigInt(s); } catch (e) { numOut.innerHTML = '<div class="result-err">整数格式不正确</div>'; return; }
        if (v < 0n || v > FULL) {
          numOut.innerHTML = '<div class="result-err">整数超出 IPv6 的 128 位范围</div>';
          return;
        }
        addr.value = compress(v);
        showNum(v);
      });

      /* 初始：先算地址，再填整数展示 */
      run();
      var p0 = parseIPv6('2001:db8::1');
      dec.value = p0.value.toString();
      showNum(p0.value);
    }
  });
})();
