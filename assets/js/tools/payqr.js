/* =============================================================================
 * 简单工具箱 · 收款码三合一
 * -----------------------------------------------------------------------------
 * 纯前端实现，不依赖 PHP / 短链服务 / 第三方统计：
 *   1. 三张收款码图片用 jsQR 在本地解码，解出 QQ / 微信 / 支付宝链接；
 *   2. 把三个链接拼成一个本站静态收款页地址 pay.html；
 *   3. 用 qrcode-generator 把收款页地址生成一张二维码。
 *
 * 二维码内容里只有链接，不包含任何图片或账户信息；文件不会上传。
 * ========================================================================== */

(function () {
  'use strict';

  TB.def({
    slug: 'qr-pay', cat: 'image', name: '收款码三合一', desc: 'QQ / 微信 / 支付宝合成一张码', icon: '💳',
    kw: '收款码 三合一 合并 聚合码 二维码 qq 微信 支付宝 收款',
    render: function (ctx) {
      var root = ctx.root;

      function defaultBase() {
        /* 线上部署时自动取当前目录；file:// 预览时退回正式部署地址 */
        if (location.protocol === 'http:' || location.protocol === 'https:') {
          return location.origin + location.pathname.replace(/index\.html?$/i, '').replace(/\/?$/, '/');
        }
        return 'https://tools.432600.xyz/';
      }

      function rowHTML(brand, label, hint) {
        return '<div class="payqr-row">' +
          '<span class="payqr-badge ' + brand + '">' + label + '</span>' +
          '<div class="field" style="margin:0"><input class="input" id="' + brand + '" placeholder="' + hint + '" autocomplete="off"></div>' +
          '<label class="btn sm payqr-pick">识别图片<input type="file" id="' + brand + 'File" accept="image/*"></label>' +
          '<span class="payqr-state" id="' + brand + 'State">未识别</span>' +
        '</div>';
      }

      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>部署地址</b><span style="color:var(--ink-3)">二维码指向的线上目录</span></div>' +
              '<input class="input" id="base" value="' + TB.esc(defaultBase()) + '" autocomplete="off"></div>' +
            '<div class="field"><div class="label">收款人名称 <span style="color:var(--ink-3)">可留空</span></div>' +
              '<input class="input" id="payName" maxlength="12" placeholder="例如：张三" autocomplete="off"></div>' +
          '</div>' +
          '<div class="note" style="margin-top:0">三张图只在浏览器里解码；解出的链接会拼到本站静态页 <b>pay.html</b>，不经过 PHP、短链平台或任何上传接口。' +
            (location.protocol === 'file:' ? '<br><b>当前是 file:// 预览：</b>请把上面的部署地址改成线上地址，否则二维码里的 file:// 链接手机扫不开。' : '') +
          '</div>' +
          '<div class="payqr-rows">' +
            rowHTML('qq', 'QQ', '上传 QQ 收款码，或直接粘贴 qianbao 链接') +
            rowHTML('wx', '微信', '上传微信收款码，或直接粘贴 wxp 链接') +
            rowHTML('ali', '支付宝', '上传支付宝收款码，或直接粘贴 alipay 链接') +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="run">生成三合一码</button>' +
            '<button class="btn" id="dl" disabled>下载 PNG</button>' +
            '<button class="btn" id="copy" disabled>复制收款页链接</button>' +
            '<button class="btn" id="reset">清空</button>' +
          '</div>' +
          '<div class="payqr-preview"><canvas id="pc" width="760" height="760"></canvas></div>' +
          '<div id="msg"></div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>二维码内容</b><span style="color:var(--ink-3)">可复制到别的二维码工具</span></div>' +
            '<textarea class="textarea payqr-link" id="linkOut" readonly style="min-height:74px" placeholder="生成后显示收款页链接"></textarea></div>' +
        '</div>' +
        '<div class="note">说明：本站没有短链服务，二维码里是完整收款页地址，所以码会比短链略密；如果提示“链接太长”，请减少填写项或先缩短收款链接。' +
          '<br>这个工具只做二维码合成，不参与收款、不校验支付账户，也不保存任何链接。' +
        '</div>';

      var cv = TB.$('#pc', root), msg = TB.$('#msg', root), linkOut = TB.$('#linkOut', root);
      var lastLink = '';

      function status(html, isErr) {
        msg.innerHTML = '<div class="' + (isErr ? 'result-err' : 'note') + '" style="margin-top:12px">' + html + '</div>';
      }

      function normalizeBase(value) {
        var s = String(value || '').trim();
        if (!/^https?:\/\//i.test(s)) return '';
        s = s.replace(/pay\.html$/i, '').replace(/index\.html?$/i, '');
        return s.replace(/\/+$/, '') + '/';
      }

      function labelOf(brand) {
        return brand === 'qq' ? 'QQ' : brand === 'wx' ? '微信' : '支付宝';
      }

      function matchesBrand(brand, text) {
        if (brand === 'qq') return /qianbao|qq\.com|mqqapi/i.test(text);
        if (brand === 'wx') return /wxp:|weixin:|wechat|wxpay/i.test(text);
        return /alipay|alipays|qr\.alipay/i.test(text);
      }

      function drawBlank() {
        cv.width = 760;
        cv.height = 760;
        var c = cv.getContext('2d');
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, cv.width, cv.height);
        c.fillStyle = '#9aa9bd';
        c.font = '500 22px system-ui, -apple-system, "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('生成后在这里预览', cv.width / 2, cv.height / 2);
      }

      /* 纯黑白方块：收款码优先保证扫码成功率，不做圆点 / Logo 遮挡 */
      function drawPayQR(text, ec) {
        var qr = window.qrcode(0, ec);
        qr.addData(text);
        qr.make();
        var count = qr.getModuleCount();
        var quiet = 4;
        var target = 760;
        var cell = Math.floor(target / (count + quiet * 2));
        if (cell < 2) throw new Error('二维码模块过多');
        var px = cell * (count + quiet * 2);
        cv.width = px;
        cv.height = px;
        var c = cv.getContext('2d');
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, px, px);
        c.fillStyle = '#111111';
        var off = quiet * cell;
        for (var y = 0; y < count; y++) {
          for (var x = 0; x < count; x++) {
            if (qr.isDark(y, x)) c.fillRect(off + x * cell, off + y * cell, cell, cell);
          }
        }
        return { count: count, px: px, ec: ec };
      }

      async function decodeFile(file, brand, input, state) {
        if (!file) return;
        state.className = 'payqr-state';
        state.textContent = '识别中…';
        var res = null;
        try {
          await TB.loadLib('jsqr.min.js');
          res = await TB.readImage(file);
          var img = res.img;
          var scale = Math.min(1, 1200 / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          var g = c.getContext('2d');
          g.drawImage(img, 0, 0, c.width, c.height);
          var data = g.getImageData(0, 0, c.width, c.height);
          var result = window.jsQR(data.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
          if (!result) throw new Error('没识别出二维码');
          input.value = result.data;
          var ok = matchesBrand(brand, result.data);
          state.textContent = ok ? '已识别 · ' + result.data.length + ' 字符' : '已识别，但不像' + labelOf(brand) + '收款码';
          state.className = 'payqr-state ' + (ok ? 'ok' : 'err');
        } catch (e) {
          state.textContent = '识别失败，可手动粘贴';
          state.className = 'payqr-state err';
        } finally {
          if (res && res.url) URL.revokeObjectURL(res.url);
        }
      }

      async function generate() {
        var qq = TB.$('#qq', root).value.trim();
        var wx = TB.$('#wx', root).value.trim();
        var ali = TB.$('#ali', root).value.trim();
        if (!qq && !wx && !ali) { status('至少填写一种收款码链接，或先上传收款码图片识别。', true); return; }

        /* 手动粘贴时 input 事件会更新状态；这里再兜一次，避免程序化填值后仍显示“未识别” */
        ['qq', 'wx', 'ali'].forEach(function (brand) {
          var input = TB.$('#' + brand, root);
          var state = TB.$('#' + brand + 'State', root);
          var value = input.value.trim();
          if (value && state.textContent === '未识别') {
            state.textContent = '手动填写 · ' + value.length + ' 字符';
            state.className = 'payqr-state ' + (matchesBrand(brand, value) ? 'ok' : 'err');
          }
        });

        var base = normalizeBase(TB.$('#base', root).value);
        if (!base) { status('部署地址必须以 https:// 或 http:// 开头，例如 https://tools.432600.xyz/。', true); return; }

        var params = [];
        if (qq) params.push('qq=' + encodeURIComponent(qq));
        if (wx) params.push('wx=' + encodeURIComponent(wx));
        if (ali) params.push('ali=' + encodeURIComponent(ali));
        var name = TB.$('#payName', root).value.trim();
        if (name) params.push('name=' + encodeURIComponent(name));

        var payUrl = base + 'pay.html?' + params.join('&');
        linkOut.value = payUrl;

        await TB.loadLib('qrcode.js');
        var info;
        try {
          info = drawPayQR(payUrl, 'M');
        } catch (e) {
          try {
            info = drawPayQR(payUrl, 'L');
          } catch (e2) {
            status('链接太长，二维码放不下。请减少填写项，或先把收款链接换成更短的地址。', true);
            return;
          }
        }

        lastLink = payUrl;
        TB.$('#dl', root).disabled = false;
        TB.$('#copy', root).disabled = false;
        status('已生成：' + info.count + ' × ' + info.count + ' 模块 · 容错 ' + info.ec + ' · 输出 ' + info.px + 'px · 链接 ' + payUrl.length + ' 字符。');
      }

      function reset() {
        ['#qq', '#wx', '#ali', '#payName'].forEach(function (sel) { TB.$(sel, root).value = ''; });
        ['qqState', 'wxState', 'aliState'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) { el.textContent = '未识别'; el.className = 'payqr-state'; }
        });
        lastLink = '';
        linkOut.value = '';
        TB.$('#dl', root).disabled = true;
        TB.$('#copy', root).disabled = true;
        msg.innerHTML = '';
        drawBlank();
      }

      ['qq', 'wx', 'ali'].forEach(function (brand) {
        var input = TB.$('#' + brand, root);
        var state = TB.$('#' + brand + 'State', root);
        TB.$('#' + brand + 'File', root).addEventListener('change', function (e) {
          decodeFile(e.target.files[0], brand, input, state);
          e.target.value = '';
        });
        input.addEventListener('input', function () {
          var text = input.value.trim();
          if (!text) { state.textContent = '未识别'; state.className = 'payqr-state'; return; }
          var ok = matchesBrand(brand, text);
          state.textContent = (ok ? '手动填写' : '手动填写（不像' + labelOf(brand) + '收款码）') + ' · ' + text.length + ' 字符';
          state.className = 'payqr-state ' + (ok ? 'ok' : 'err');
        });
      });

      TB.$('#run', root).addEventListener('click', generate);
      TB.$('#dl', root).addEventListener('click', function () {
        if (lastLink) TB.downloadCanvas(cv, '收款码三合一-' + Date.now() + '.png', 'image/png');
      });
      TB.$('#copy', root).addEventListener('click', function () {
        if (lastLink) TB.copy(lastLink);
      });
      TB.$('#reset', root).addEventListener('click', reset);

      drawBlank();
    }
  });

})();
