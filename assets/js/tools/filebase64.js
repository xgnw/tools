/* =============================================================================
 * 文件 ⇄ Base64
 * -----------------------------------------------------------------------------
 * 任意文件转 Base64，或把 Base64 / Data URL 还原成文件。
 * 使用 FileReader + Blob，完全在浏览器本地完成；大文件只给内存提示，不上传。
 * ========================================================================== */

(function () {
  'use strict';

  var MIME_BY_EXT = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
    pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
    txt: 'text/plain', csv: 'text/csv', json: 'application/json', xml: 'application/xml',
    html: 'text/html', css: 'text/css', js: 'text/javascript',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };

  function mimeOfName(name) {
    var ext = String(name || '').split('.').pop().toLowerCase();
    return MIME_BY_EXT[ext] || 'application/octet-stream';
  }

  function safeName(name) {
    return String(name || '').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 120) || 'decoded.bin';
  }

  TB.def({
    slug: 'file-base64', cat: 'web', name: '文件 ⇄ Base64', desc: '任意文件转 Base64 并还原', icon: '🔁',
    kw: 'base64 文件 编码 解码 dataurl data url blob 转换 还原 任意文件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">文件 → Base64<span class="hint">文件只在浏览器内存中读取</span></div>' +
          '<div id="fbPick"></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<div class="field"><div class="label"><b>输出形式</b></div>' +
              '<select class="select" id="fbMode">' +
                '<option value="plain">纯 Base64</option>' +
                '<option value="dataurl">Data URL（含 MIME 前缀）</option>' +
              '</select></div>' +
            '<div class="field"><div class="label"><b>文件信息</b></div>' +
              '<div class="fb-fileinfo" id="fbInfo">尚未选择文件</div></div>' +
          '</div>' +
          '<div class="btns" style="margin-top:12px">' +
            '<button class="btn primary" id="fbConvert" type="button">转换为 Base64</button>' +
            '<button class="btn" id="fbCopy" type="button">复制</button>' +
            '<button class="btn" id="fbSave" type="button">下载 TXT</button>' +
          '</div>' +
          '<div id="fbMsg" class="fb-msg"></div>' +
          '<div class="out" id="fbBox" hidden>' +
            '<div class="out-h"><span class="grow">Base64 结果</span><span id="fbLen">0 字符</span></div>' +
            '<div class="out-b"><textarea class="textarea fb-out" id="fbOut" readonly spellcheck="false" placeholder="转换结果会显示在这里"></textarea></div>' +
          '</div>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-h">Base64 → 文件<span class="hint">支持纯 Base64 与 data:...;base64, 前缀</span></div>' +
          '<div class="field"><div class="label"><b>Base64 / Data URL</b><span style="color:var(--ink-3)">空白与换行会自动忽略</span></div>' +
            '<textarea class="textarea" id="fbIn" placeholder="粘贴 Base64，例如 iVBORw0KGgo... 或 data:image/png;base64,..." style="min-height:130px"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>还原文件名</b></div>' +
              '<input class="input" id="fbName" value="decoded.bin" autocomplete="off" spellcheck="false"></div>' +
            '<div class="field"><div class="label"><b>文件类型</b></div>' +
              '<select class="select" id="fbMime">' +
                '<option value="">按扩展名 / Data URL 自动判断</option>' +
                '<option value="application/octet-stream">二进制（application/octet-stream）</option>' +
                '<option value="image/png">PNG 图片</option>' +
                '<option value="image/jpeg">JPEG 图片</option>' +
                '<option value="application/pdf">PDF 文档</option>' +
                '<option value="text/plain">纯文本</option>' +
                '<option value="application/zip">ZIP 压缩包</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="fbDecode" type="button">解码并下载</button>' +
            '<button class="btn" id="fbClear" type="button">清空</button>' +
          '</div>' +
          '<div id="fbDecMsg" class="fb-msg"></div>' +
          '<div class="kv" id="fbDecOut" style="margin-top:12px"></div>' +
        '</div>' +

        '<div class="note">Base64 只是编码，不是加密，任何人都能还原；不要用它保护密码或隐私文件。文件读取和还原都在本机浏览器完成，不会上传服务器。超过 20 MB 的文件会占用较多内存，建议先压缩。</div>';

      var pick = TB.filePicker(TB.$('#fbPick', root), {
        hint: '任意文件，单个选择；也可直接拖拽'
      });
      var msg = TB.$('#fbMsg', root);
      var decMsg = TB.$('#fbDecMsg', root);
      var out = TB.$('#fbOut', root);
      var box = TB.$('#fbBox', root);
      var info = TB.$('#fbInfo', root);
      var cached = null; /* { file, base64, mime } */

      function showMsg(text, isErr) {
        msg.innerHTML = text ? '<div class="note fb-note"><span class="' + (isErr ? 'result-err' : 'result-ok') + '">' + TB.esc(text) + '</span></div>' : '';
      }

      function showDecMsg(text, isErr) {
        decMsg.innerHTML = text ? '<div class="note fb-note"><span class="' + (isErr ? 'result-err' : 'result-ok') + '">' + TB.esc(text) + '</span></div>' : '';
      }

      function updateInfo(file) {
        if (!file) { info.textContent = '尚未选择文件'; return; }
        info.innerHTML = '<b>' + TB.esc(file.name) + '</b><br>' + TB.fmtBytes(file.size) + ' · ' + TB.esc(file.type || '未知类型');
      }

      function render() {
        var mode = TB.$('#fbMode', root).value;
        if (!cached) return;
        var text = mode === 'dataurl'
          ? 'data:' + cached.mime + ';base64,' + cached.base64
          : cached.base64;
        out.value = text;
        TB.$('#fbLen', root).textContent = text.length.toLocaleString('zh-CN') + ' 字符';
        box.hidden = false;
      }

      async function convert() {
        var item = pick.files[0];
        if (!item) { showMsg('请先选择文件', true); box.hidden = true; return; }
        var file = item.file;
        showMsg(file.size > 20 * 1024 * 1024 ? '文件较大（' + TB.fmtBytes(file.size) + '），转换时可能占用较多内存…' : '正在读取文件…');
        try {
          var dataUrl = await TB.readDataURL(file);
          var comma = dataUrl.indexOf(',');
          var head = dataUrl.slice(0, comma);
          var base64 = dataUrl.slice(comma + 1);
          var mime = (head.match(/^data:([^;]+)/) || [])[1] || file.type || 'application/octet-stream';
          cached = { file: file, base64: base64, mime: mime };
          updateInfo(file);
          render();
          showMsg('转换完成，共 ' + base64.length.toLocaleString('zh-CN') + ' 个 Base64 字符');
        } catch (e) {
          cached = null;
          box.hidden = true;
          showMsg('读取失败：' + (e && e.message ? e.message : '未知错误'), true);
        }
      }

      pick.onChange = function () {
        var file = pick.files[0] ? pick.files[0].file : null;
        cached = null;
        box.hidden = true;
        out.value = '';
        updateInfo(file);
        showMsg('');
        if (file) convert();
      };

      TB.$('#fbMode', root).addEventListener('change', render);
      TB.$('#fbConvert', root).addEventListener('click', convert);
      TB.$('#fbCopy', root).addEventListener('click', function () {
        if (!out.value) { showMsg('还没有可复制的内容', true); return; }
        TB.copy(out.value);
      });
      TB.$('#fbSave', root).addEventListener('click', function () {
        if (!out.value) { showMsg('请先转换文件', true); return; }
        var base = cached ? cached.file.name.replace(/\.[^.]*$/, '') : 'base64';
        TB.downloadText(out.value, (base || 'base64') + '.base64.txt');
      });

      /* Base64 → 文件 */
      TB.$('#fbDecode', root).addEventListener('click', function () {
        var raw = TB.$('#fbIn', root).value.trim();
        if (!raw) { showDecMsg('请先粘贴 Base64 内容', true); return; }
        var mimeFromData = '';
        var m = raw.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,/i);
        if (m) {
          mimeFromData = m[1] || '';
          raw = raw.slice(m[0].length);
        }
        raw = raw.replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) {
          showDecMsg('包含 Base64 之外的字符，请检查内容', true);
          return;
        }
        /* 允许无填充；长度为 4n+1 时无法解码 */
        if (raw.length % 4 === 1) { showDecMsg('Base64 长度不合法，可能缺少字符', true); return; }
        var pad = (4 - raw.length % 4) % 4;
        if (pad) raw += '==='.slice(0, pad);

        var bin;
        try { bin = atob(raw); } catch (e) { showDecMsg('Base64 解码失败，请检查内容', true); return; }

        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var name = safeName(TB.$('#fbName', root).value);
        var chosen = TB.$('#fbMime', root).value;
        var mime = chosen || mimeFromData || mimeOfName(name);
        var blob = new Blob([bytes], { type: mime });

        TB.$('#fbDecOut', root).innerHTML = [
          ['文件名', TB.esc(name)],
          ['大小', TB.fmtBytes(bytes.length)],
          ['类型', TB.esc(mime)],
          ['Base64 字符数', raw.length.toLocaleString('zh-CN')]
        ].map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');

        TB.download(blob, name);
        showDecMsg(bytes.length ? '已解码并开始下载' : '解码结果为空文件', false);
      });

      TB.$('#fbClear', root).addEventListener('click', function () {
        TB.$('#fbIn', root).value = '';
        TB.$('#fbDecOut', root).innerHTML = '';
        showDecMsg('');
      });
    }
  });
})();
