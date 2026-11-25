/* =============================================================================
 * vCard 二维码
 * -----------------------------------------------------------------------------
 * 把联系人信息生成 vCard 3.0 文本，再用本地 qrcode-generator 生成二维码。
 * 手机扫码后可直接导入通讯录；所有信息只在当前页面内处理。
 * ========================================================================== */

(function () {
  'use strict';

  function escV(value) {
    return String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
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
        if (qr.isDark(r, c)) ctx.fillRect(c * cell + margin * cell, r * cell + margin * cell, cell, cell);
      }
    }
    return canvas;
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note vc-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  TB.def({
    slug: 'vcard', cat: 'web', name: 'vCard 二维码', desc: '扫码把联系人信息导入通讯录',
    icon: '👤', kw: 'vcard 联系人 通讯录 名片 二维码 扫码 电话 邮箱 地址',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">联系人信息<span class="hint">姓名必填；手机、邮箱等可以留空</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>姓名</b></div><input class="input" id="vcName" placeholder="例如：张三" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>公司 / 组织</b></div><input class="input" id="vcOrg" placeholder="例如：简单科技" autocomplete="off"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>职位</b></div><input class="input" id="vcTitle" placeholder="例如：产品经理" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>手机 / 电话</b></div><input class="input" id="vcPhone" placeholder="例如：13800138000" autocomplete="off"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>邮箱</b></div><input class="input" id="vcEmail" placeholder="name@example.com" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>网站</b></div><input class="input" id="vcUrl" placeholder="https://example.com" autocomplete="off"></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>地址</b></div><input class="input" id="vcAddr" placeholder="例如：安徽省安庆市……" autocomplete="off"></div>' +
          '<div class="field"><div class="label"><b>备注</b></div><input class="input" id="vcNote" placeholder="例如：负责教育行业" autocomplete="off"></div>' +
          '<div class="btns"><button class="btn primary" id="vcRun" type="button">生成二维码</button>' +
            '<button class="btn" id="vcExample" type="button">填入示例</button>' +
            '<button class="btn" id="vcClear" type="button">清空</button></div>' +
          '<div id="vcMsg" class="vc-msg"></div>' +
        '</div>' +
        '<div class="panel" id="vcPanel" hidden>' +
          '<div class="panel-h">二维码<span class="hint" id="vcInfo"></span></div>' +
          '<div class="vc-preview" id="vcPv"></div>' +
          '<div class="btns"><button class="btn" id="vcPng" type="button">下载 PNG</button>' +
            '<button class="btn" id="vcSvg" type="button">下载 SVG</button>' +
            '<button class="btn" id="vcCopy" type="button">复制 vCard</button></div>' +
          '<div class="field"><div class="label"><b>vCard 文本</b></div>' +
            '<textarea class="textarea vc-raw" id="vcRaw" readonly spellcheck="false"></textarea></div>' +
        '</div>' +
        '<div class="note">生成的二维码包含 vCard 3.0 文本，扫码后由手机通讯录决定是否导入；不同手机的字段支持略有差异。二维码内容较长时识别速度会下降，建议只填常用字段。</div>';

      var name = TB.$('#vcName', root), org = TB.$('#vcOrg', root), title = TB.$('#vcTitle', root);
      var phone = TB.$('#vcPhone', root), email = TB.$('#vcEmail', root), url = TB.$('#vcUrl', root);
      var addr = TB.$('#vcAddr', root), note = TB.$('#vcNote', root);
      var msg = TB.$('#vcMsg', root), panel = TB.$('#vcPanel', root), pv = TB.$('#vcPv', root);
      var raw = TB.$('#vcRaw', root), info = TB.$('#vcInfo', root);
      var last = null;

      function buildPayload() {
        var lines = ['BEGIN:VCARD', 'VERSION:3.0'];
        lines.push('N:' + escV(name.value.trim()) + ';;;;');
        lines.push('FN:' + escV(name.value.trim()));
        if (org.value.trim()) lines.push('ORG:' + escV(org.value.trim()));
        if (title.value.trim()) lines.push('TITLE:' + escV(title.value.trim()));
        if (phone.value.trim()) lines.push('TEL;TYPE=CELL:' + escV(phone.value.trim()));
        if (email.value.trim()) lines.push('EMAIL;TYPE=INTERNET:' + escV(email.value.trim()));
        if (url.value.trim()) lines.push('URL:' + escV(url.value.trim()));
        if (addr.value.trim()) lines.push('ADR;TYPE=WORK:;;' + escV(addr.value.trim()) + ';;;;');
        if (note.value.trim()) lines.push('NOTE:' + escV(note.value.trim()));
        lines.push('END:VCARD');
        return lines.join('\r\n');
      }

      async function generate() {
        var n = name.value.trim();
        if (!n) { status(msg, '请填写姓名', true); name.focus(); return; }
        status(msg, '正在生成…');
        try {
          await TB.loadLib('qrcode.js');
          var payload = buildPayload();
          var qr = window.qrcode(0, 'M');
          qr.addData(payload);
          qr.make();
          var canvas = makeCanvas(qr, 360, 4, '#16233a', '#ffffff');
          var svg = makeSvg(qr, 360, 4, '#16233a', '#ffffff');
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          pv.innerHTML = '';
          pv.appendChild(canvas);
          raw.value = payload;
          info.textContent = 'vCard 3.0 · ' + payload.length + ' 字符';
          last = { canvas: canvas, svg: svg, payload: payload };
          panel.hidden = false;
          status(msg, '已生成，扫码即可导入联系人', false);
        } catch (e) {
          status(msg, '生成失败：' + (e && e.message ? e.message : '联系人内容可能过长'), true);
          panel.hidden = true;
        }
      }

      TB.$('#vcRun', root).addEventListener('click', generate);
      TB.$('#vcExample', root).addEventListener('click', function () {
        name.value = '张三';
        org.value = '简单科技';
        title.value = '产品经理';
        phone.value = '13800138000';
        email.value = 'zhangsan@example.com';
        url.value = 'https://tools.432600.xyz/';
        addr.value = '安徽省安庆市迎江区';
        note.value = '负责教育行业';
        generate();
      });
      TB.$('#vcClear', root).addEventListener('click', function () {
        [name, org, title, phone, email, url, addr, note].forEach(function (el) { el.value = ''; });
        pv.innerHTML = '';
        raw.value = '';
        panel.hidden = true;
        last = null;
        status(msg, '');
      });
      TB.$('#vcPng', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先生成二维码', true); return; }
        last.canvas.toBlob(function (b) { if (b) TB.download(b, 'vcard-qr.png'); else TB.toast('PNG 编码失败'); }, 'image/png');
      });
      TB.$('#vcSvg', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先生成二维码', true); return; }
        TB.download(new Blob([last.svg], { type: 'image/svg+xml;charset=utf-8' }), 'vcard-qr.svg');
      });
      TB.$('#vcCopy', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先生成二维码', true); return; }
        TB.copy(last.payload);
      });
    }
  });
})();
