/* =============================================================================
 * UUID 解析器
 * -----------------------------------------------------------------------------
 * 解析标准 UUID 的版本、变体、时间戳、节点与字节分组。
 * 不生成随机 UUID（生成功能在「UUID / 密码生成」里）。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = 'f47ac10b-58cc-11cf-a447-001122334455';

  function parseUuid(raw) {
    var s = String(raw || '').trim().replace(/^urn:uuid:/i, '').replace(/[{}]/g, '').replace(/\s+/g, '').toLowerCase();
    var hit = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/.exec(s);
    if (!hit) throw new Error('不是合法的 UUID：需要 8-4-4-4-12 位十六进制');
    var hex = s.replace(/-/g, '');
    var version = parseInt(hex.charAt(12), 16);
    var variantNibble = parseInt(hex.charAt(16), 16);
    var variant;
    if (variantNibble >= 8 && variantNibble <= 11) variant = 'RFC 4122 / RFC 9562';
    else if (variantNibble >= 12 && variantNibble <= 13) variant = 'Microsoft';
    else if (variantNibble >= 14) variant = '未来保留';
    else variant = 'NCS 保留';

    var versionName = {
      1: '时间戳（MAC 节点）', 2: 'DCE Security', 3: 'MD5 命名空间',
      4: '随机', 5: 'SHA-1 命名空间', 6: '时间戳（重排）',
      7: 'Unix 毫秒时间戳', 8: '自定义 / 实验'
    }[version] || '未知';

    var timestamp = null;
    if (version === 1 || version === 6) {
      var ticks;
      if (version === 1) {
        var low = BigInt('0x' + hex.slice(0, 8));
        var mid = BigInt('0x' + hex.slice(8, 12));
        var high = BigInt('0x' + hex.slice(13, 16));
        ticks = (high << 48n) | (mid << 32n) | low;
      } else {
        var tHigh = BigInt('0x' + hex.slice(0, 8));
        var tMid = BigInt('0x' + hex.slice(8, 12));
        var tLow = BigInt('0x' + hex.slice(13, 16));
        ticks = (tHigh << 28n) | (tMid << 12n) | tLow;
      }
      timestamp = Number(ticks / 10000n - 12219292800000n);
    } else if (version === 7) {
      timestamp = Number(BigInt('0x' + hex.slice(0, 12)));
    }

    var date = timestamp != null && isFinite(timestamp) ? new Date(timestamp) : null;
    var clockSeq = null, node = null;
    if (version === 1 || version === 6) {
      clockSeq = (parseInt(hex.slice(16, 18), 16) & 0x3f) << 8 | parseInt(hex.slice(18, 20), 16);
      node = hex.slice(20, 32).replace(/(.{2})/g, '$1 ').trim().toUpperCase();
    }

    return {
      uuid: s,
      version: version,
      versionName: versionName,
      variant: variant,
      variantNibble: variantNibble,
      timestamp: date && !isNaN(date.getTime()) ? date.toISOString() : null,
      localTime: date && !isNaN(date.getTime()) ? date.toLocaleString('zh-CN') : null,
      clockSeq: clockSeq,
      node: node,
      hex: hex.toUpperCase(),
      bytes: hex.replace(/(.{2})/g, '$1 ').trim().toUpperCase(),
      groups: [hit[1], hit[2], hit[3], hit[4], hit[5]]
    };
  }

  function buildRow(k, v) {
    return '<div class="kv-item"><div class="kv-k">' + TB.esc(k) + '</div><div class="kv-v">' + TB.esc(v) + '</div></div>';
  }

  TB.def({
    slug: 'uuidparse',
    cat: 'web',
    name: 'UUID 解析器',
    desc: '识别 UUID 版本、变体、时间戳和节点信息。',
    icon: '🧬',
    kw: 'uuid guid 解析 版本 v1 v4 v7 时间戳 变体',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">UUID <span class="hint">支持带花括号或 urn:uuid: 前缀</span></div>' +
          '<div class="field"><input class="input" id="upIn" value="' + SAMPLE + '" spellcheck="false"></div>' +
          '<div class="btns"><button class="btn primary" id="upRun" type="button">解析</button>' +
            '<button class="btn" id="upSample" type="button">载入示例</button>' +
            '<button class="btn" id="upCopy" type="button">复制 JSON</button></div>' +
          '<div class="hint" id="upMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">解析结果</div><div class="kv" id="upKv"></div></div>' +
        '<div class="panel"><div class="panel-h">按字段查看</div><pre class="codeBox" id="upJson" style="max-height:360px;overflow:auto"></pre></div>' +
        '<p class="note">v1 / v6 使用 100 纳秒时间戳（1582-10-15 起算），v7 使用 Unix 毫秒时间戳；v3 / v5 只显示版本，完整还原还需要命名空间。</p>';

      var input = TB.$('#upIn', root);
      var kv = TB.$('#upKv', root);
      var json = TB.$('#upJson', root);
      var msg = TB.$('#upMsg', root);
      var current = null;

      function run() {
        try {
          var data = parseUuid(input.value);
          current = data;
          var rows = [
            ['标准形式', data.uuid],
            ['版本', 'v' + data.version + ' · ' + data.versionName],
            ['变体', data.variant],
            ['时间戳', data.localTime || '不包含时间戳'],
            ['ISO 时间', data.timestamp || '—'],
            ['字节（16 字节）', data.bytes],
            ['十六进制（32 位）', data.hex]
          ];
          if (data.clockSeq != null) rows.push(['Clock Sequence', String(data.clockSeq)]);
          if (data.node) rows.push(['Node', data.node]);
          kv.innerHTML = rows.map(function (r) { return buildRow(r[0], r[1]); }).join('');
          var out = {
            uuid: data.uuid,
            version: data.version,
            versionName: data.versionName,
            variant: data.variant,
            timestamp: data.timestamp,
            localTime: data.localTime,
            clockSeq: data.clockSeq,
            node: data.node,
            bytes: data.bytes,
            hex: data.hex
          };
          json.textContent = JSON.stringify(out, null, 2);
          msg.textContent = '解析成功 · ' + data.uuid + ' · v' + data.version;
        } catch (e) {
          current = null;
          kv.innerHTML = '';
          json.textContent = '';
          msg.textContent = e.message;
        }
      }

      TB.$('#upRun', root).addEventListener('click', run);
      TB.$('#upSample', root).addEventListener('click', function () { input.value = SAMPLE; run(); });
      TB.$('#upCopy', root).addEventListener('click', function () {
        if (current) TB.copy(json.textContent); else TB.toast('还没有解析结果');
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
      run();
    }
  });
})();
