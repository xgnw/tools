/* =============================================================================
 * WiFi 二维码
 * -----------------------------------------------------------------------------
 * 按 Wi-Fi 联盟的 WIFI: 二维码文本格式生成，密码只在本地参与编码。
 * 依赖本地 assets/lib/qrcode.js（qrcode-generator），不请求外部接口。
 * ========================================================================== */
(function () {
  'use strict';

  function escWifi(value) {
    return String(value == null ? '' : value).replace(/[\\;,:"']/g, function (ch) {
      return '\\' + ch;
    });
  }

  function buildPayload(ssid, password, encryption, hidden) {
    var type = encryption === 'nopass' ? 'nopass' : encryption;
    var text = 'WIFI:T:' + type + ';S:' + escWifi(ssid) + ';';
    if (type !== 'nopass') text += 'P:' + escWifi(password) + ';';
    if (hidden) text += 'H:true;';
    return text + ';';
  }

  function makeSvg(qr, size, margin, fg, bg) {
    var n = qr.getModuleCount();
    var cell = Math.max(1, Math.floor(size / (n + margin * 2)));
    var px = n * cell + margin * cell * 2;
    var path = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          path += 'M' + (c * cell + margin * cell) + ',' + (r * cell + margin * cell) +
            'h' + cell + 'v' + cell + 'h-' + cell + 'z';
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px +
      '" viewBox="0 0 ' + px + ' ' + px + '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/>' +
      '<path d="' + path + '" fill="' + fg + '"/></svg>';
  }

  function makeCanvas(qr, size, margin, fg, bg) {
    var n = qr.getModuleCount();
    var cell = Math.max(1, Math.floor(size / (n + margin * 2)));
    var px = n * cell + margin * cell * 2;
    var canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = fg;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(c * cell + margin * cell, r * cell + margin * cell, cell, cell);
        }
      }
    }
    return canvas;
  }

  TB.def({
    slug: 'wifiqr',
    cat: 'web',
    name: 'WiFi 二维码',
    desc: '把 WiFi 名称和密码生成扫码即可连接的二维码，适合贴在店里或家里。',
    icon: '📶',
    kw: 'wifi wi-fi 无线网 二维码 扫码 连接 密码 ssid',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">网络信息 <span class="hint">密码只在本地参与二维码编码</span></div>' +
          '<div class="field"><div class="label"><b>WiFi 名称（SSID）</b></div>' +
            '<input class="input" id="wSsid" maxlength="64" placeholder="例如：Home-WiFi" value="Home-WiFi"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">加密方式</div>' +
              '<select class="select" id="wEnc">' +
                '<option value="WPA" selected>WPA / WPA2 / WPA3</option>' +
                '<option value="WEP">WEP（旧设备）</option>' +
                '<option value="nopass">不加密</option>' +
              '</select></div>' +
            '<div class="field"><div class="label">密码</div>' +
              '<input class="input" id="wPass" type="password" maxlength="64" placeholder="WiFi 密码" autocomplete="off"></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>隐藏网络</b></div>' +
            '<label style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2)">' +
              '<input type="checkbox" id="wHidden"> 这是隐藏 SSID 的网络</label></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="wRun" type="button">生成二维码</button>' +
            '<button class="btn" id="wPng" type="button" disabled>下载 PNG</button>' +
            '<button class="btn" id="wSvg" type="button" disabled>下载 SVG</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">二维码预览 <span class="hint" id="wHint">填写后点击生成</span></div>' +
          '<div class="preview" id="wPv" style="min-height:280px;background:var(--surface-2)">' +
            '<div style="color:var(--ink-3);font-size:12.5px;text-align:center">生成后会显示在这里</div>' +
          '</div>' +
          '<div class="out"><div class="out-h"><span class="grow">二维码内容</span>' +
            '<button class="btn sm" id="wCopy" type="button">复制内容</button></div>' +
            '<div class="out-b" id="wText" style="min-height:52px">—</div></div>' +
        '</div>' +
        '<p class="note">扫码后手机会自动填入网络信息，仍需在系统弹窗中确认连接。二维码内容包含 WiFi 密码，请只分享给信任的人。</p>';

      var els = {
        ssid: TB.$('#wSsid', root),
        pass: TB.$('#wPass', root),
        enc: TB.$('#wEnc', root),
        hidden: TB.$('#wHidden', root),
        pv: TB.$('#wPv', root),
        text: TB.$('#wText', root),
        hint: TB.$('#wHint', root),
        png: TB.$('#wPng', root),
        svg: TB.$('#wSvg', root)
      };
      var last = null;

      function syncPasswordState() {
        var noPass = els.enc.value === 'nopass';
        els.pass.disabled = noPass;
        els.pass.placeholder = noPass ? '不加密网络无需密码' : 'WiFi 密码';
      }

      async function run() {
        var ssid = els.ssid.value.trim();
        if (!ssid) {
          TB.toast('请先填写 WiFi 名称');
          els.ssid.focus();
          return;
        }
        if (els.enc.value !== 'nopass' && !els.pass.value) {
          TB.toast('请填写 WiFi 密码，或选择“不加密”');
          els.pass.focus();
          return;
        }
        els.hint.textContent = '正在生成…';
        try {
          await TB.loadLib('qrcode.js');
          var payload = buildPayload(ssid, els.pass.value, els.enc.value, els.hidden.checked);
          var qr = window.qrcode(0, 'M');
          qr.addData(payload);
          qr.make();
          var svg = makeSvg(qr, 360, 4, '#16233a', '#ffffff');
          var canvas = makeCanvas(qr, 360, 4, '#16233a', '#ffffff');
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          els.pv.innerHTML = '';
          els.pv.appendChild(canvas);
          els.text.textContent = payload;
          last = { canvas: canvas, svg: svg, payload: payload };
          els.png.disabled = false;
          els.svg.disabled = false;
          els.hint.textContent = '已生成';
        } catch (e) {
          els.hint.textContent = '生成失败';
          els.pv.innerHTML = '<div style="color:var(--danger);font-size:12.5px;text-align:center">' +
            TB.esc(e && e.message ? e.message : String(e)) + '</div>';
          TB.toast('生成失败：' + (e && e.message ? e.message : '内容可能过长'));
        }
      }

      TB.$('#wRun', root).addEventListener('click', run);
      els.enc.addEventListener('change', syncPasswordState);
      els.png.addEventListener('click', function () {
        if (!last) return;
        last.canvas.toBlob(function (blob) {
          if (blob) TB.download(blob, 'wifi-qr.png');
          else TB.toast('PNG 编码失败，请重试');
        }, 'image/png');
      });
      els.svg.addEventListener('click', function () {
        if (!last) return;
        TB.download(new Blob([last.svg], { type: 'image/svg+xml;charset=utf-8' }), 'wifi-qr.svg');
      });
      TB.$('#wCopy', root).addEventListener('click', function () {
        if (!last) { TB.toast('请先生成二维码'); return; }
        TB.copy(last.payload);
      });

      syncPasswordState();
    }
  });
})();
