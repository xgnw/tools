/* =============================================================================
 * MAC 地址生成器
 * -----------------------------------------------------------------------------
 * 随机生成单播、本地管理类型的 MAC 地址；也可以固定 OUI 前缀（前 3 字节），
 * 支持冒号 / 连字符 / 无分隔 / Cisco 点分格式与大小写切换。
 * ========================================================================== */
(function () {
  'use strict';

  function randomByte() { return Math.floor(Math.random() * 256); }

  function parseOUI(text) {
    var hex = String(text || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
    if (!hex) return null;
    if (hex.length !== 6) throw new Error('OUI 需要 3 字节，共 6 位十六进制字符');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }

  function format(bytes, sep, upper) {
    var hex = bytes.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
    var text;
    if (sep === 'none') text = hex;
    else if (sep === 'cisco') text = hex.slice(0, 4) + '.' + hex.slice(4, 8) + '.' + hex.slice(8, 12);
    else text = hex.match(/../g).join(sep);
    return upper ? text.toUpperCase() : text;
  }

  function makeOne(oui, sep, upper) {
    var bytes = [];
    if (oui) {
      bytes = oui.slice();
    } else {
      bytes = [randomByte(), randomByte(), randomByte()];
      // 最低位为 0 表示单播，次低位为 1 表示本地管理
      bytes[0] = (bytes[0] & 0xFC) | 0x02;
    }
    bytes.push(randomByte(), randomByte(), randomByte());
    return format(bytes, sep, upper);
  }

  TB.def({
    slug: 'macgen',
    cat: 'web',
    name: 'MAC 地址生成器',
    desc: '批量生成随机 MAC，支持固定 OUI、分隔符与大小写。',
    icon: '🔌',
    kw: 'MAC 地址 网卡 物理地址 OUI 随机 生成器 网络',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">生成设置</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">数量（1–50）</div><input class="input" type="number" id="macCount" min="1" max="50" value="5"></div>' +
            '<div class="field"><div class="label">OUI 前缀（可选）</div><input class="input" id="macOui" placeholder="例如 00:1A:2B" spellcheck="false"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">分隔格式</div><select class="select" id="macSep">' +
              '<option value=":">冒号 00:1A:2B:3C:4D:5E</option>' +
              '<option value="-">连字符 00-1A-2B-3C-4D-5E</option>' +
              '<option value="none">无分隔 001A2B3C4D5E</option>' +
              '<option value="cisco">Cisco 001A.2B3C.4D5E</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">大小写</div><select class="select" id="macCase"><option value="upper">大写</option><option value="lower">小写</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="macRun" type="button">生成</button>' +
            '<button class="btn" id="macCopy" type="button">复制全部</button>' +
            '<button class="btn" id="macDownload" type="button">下载 TXT</button></div>' +
          '<div class="hint" id="macMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">生成结果</div><pre class="codeBox" id="macOut" style="max-height:320px;overflow:auto;min-height:100px"></pre></div>' +
        '<p class="note">不填 OUI 时，本工具会生成单播、本地管理类型的随机 MAC（首字节 bit0 = 0、bit1 = 1）；填写 OUI 时只替换前 3 字节，不查询厂商数据库，也不保证地址在现实中唯一或可分配。</p>';

      var count = TB.$('#macCount', root);
      var ouiInput = TB.$('#macOui', root);
      var sep = TB.$('#macSep', root);
      var upper = TB.$('#macCase', root);
      var out = TB.$('#macOut', root);
      var msg = TB.$('#macMsg', root);

      function generate() {
        var n = Number(count.value);
        if (!Number.isInteger(n) || n < 1 || n > 50) {
          msg.textContent = '数量需要是 1–50 的整数';
          out.textContent = '';
          return;
        }
        var oui;
        try { oui = parseOUI(ouiInput.value); }
        catch (e) { msg.textContent = e.message; out.textContent = ''; return; }

        var list = [];
        var seen = {};
        var guard = 0;
        while (list.length < n && guard < n * 50 + 100) {
          var mac = makeOne(oui, sep.value, upper.value === 'upper');
          if (!seen[mac]) { seen[mac] = true; list.push(mac); }
          guard++;
        }
        // 极端情况下（固定 OUI 后随机空间耗尽）允许重复，避免死循环
        while (list.length < n) list.push(makeOne(oui, sep.value, upper.value === 'upper'));

        out.textContent = list.join('\n');
        msg.textContent = '已生成 ' + list.length + ' 个 MAC 地址' + (oui ? '，OUI 固定为 ' + oui.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16).toUpperCase(); }).join(':') : '');
      }

      TB.$('#macRun', root).addEventListener('click', generate);
      [count, ouiInput, sep, upper].forEach(function (el) {
        el.addEventListener('change', generate);
      });
      TB.$('#macCopy', root).addEventListener('click', function () {
        if (out.textContent) TB.copy(out.textContent);
      });
      TB.$('#macDownload', root).addEventListener('click', function () {
        if (!out.textContent) generate();
        if (out.textContent) {
          TB.downloadText(out.textContent + '\n', 'mac-addresses.txt', 'text/plain');
          TB.toast('已开始下载 mac-addresses.txt');
        }
      });

      generate();
    }
  });
})();
