/* =============================================================================
 * Toolwa 迁移工具 · B 组
 * -----------------------------------------------------------------------------
 * 本文件收纳第二批 8 个工具：
 *   1. 圆角图片生成（Canvas 圆角裁剪，透明角）
 *   2. 图片去白边（按容差扫描边界并裁剪）
 *   3. URL 解析拆分（URL API + 查询参数表）
 *   4. 链接批量生成（模板占位符 + 范围）
 *   5. Punycode 编解码（RFC 3492 纯前端实现）
 *   6. 文件夹目录树生成（路径文本 → ASCII 树）
 *   7. 在线提词器（自动滚动 / 镜像 / 全屏）
 *   8. 硬盘整数分区计算（NTFS / FAT32 对齐公式）
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------- 圆角图片 */
  TB.def({
    slug: 'img-round',
    cat: 'image',
    name: '圆角图片生成',
    desc: '给图片加上透明圆角，适合头像、卡片和社媒配图。',
    icon: '🟦',
    kw: '圆角 图片 头像 卡片 透明 PNG 裁剪 canvas',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择图片</div>' +
          '<input class="input" type="file" id="irFile" accept="image/*">' +
          '<div class="row">' +
            '<div class="field"><div class="label">圆角比例 <b id="irRadiusV">12</b>%</div><input class="input" type="range" id="irRadius" min="0" max="50" value="12"></div>' +
            '<div class="field"><div class="label">导出格式</div><select class="select" id="irType"><option value="image/png">PNG（透明角）</option><option value="image/jpeg">JPEG（白底）</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="irGo" type="button">生成圆角图</button>' +
            '<button class="btn" id="irDownload" type="button" disabled>下载图片</button></div>' +
          '<p class="note">圆角半径按图片短边的百分比计算；PNG 保留透明角，JPEG 不支持透明，会自动铺白底。</p></div>' +
        '<div class="panel"><div class="panel-h">预览</div>' +
          '<div class="ir-preview" id="irPreview"><div class="hint">尚未选择图片</div></div>' +
          '<div class="ir-meta" id="irMeta"></div></div>';

      var input = TB.$('#irFile', root);
      var radius = TB.$('#irRadius', root);
      var type = TB.$('#irType', root);
      var preview = TB.$('#irPreview', root);
      var meta = TB.$('#irMeta', root);
      var download = TB.$('#irDownload', root);
      var image = null;
      var objectUrl = '';
      var canvas = null;

      function roundPath(ctx2, w, h, r) {
        r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        ctx2.beginPath();
        ctx2.moveTo(r, 0);
        ctx2.lineTo(w - r, 0);
        ctx2.quadraticCurveTo(w, 0, w, r);
        ctx2.lineTo(w, h - r);
        ctx2.quadraticCurveTo(w, h, w - r, h);
        ctx2.lineTo(r, h);
        ctx2.quadraticCurveTo(0, h, 0, h - r);
        ctx2.lineTo(0, r);
        ctx2.quadraticCurveTo(0, 0, r, 0);
        ctx2.closePath();
      }

      function draw() {
        if (!image) return;
        var w = image.naturalWidth;
        var h = image.naturalHeight;
        var r = Math.min(w, h) * (Number(radius.value) / 100);
        canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx2 = canvas.getContext('2d');
        if (type.value === 'image/jpeg') {
          ctx2.fillStyle = '#ffffff';
          ctx2.fillRect(0, 0, w, h);
        }
        roundPath(ctx2, w, h, r);
        ctx2.clip();
        ctx2.drawImage(image, 0, 0, w, h);
        preview.innerHTML = '';
        preview.appendChild(canvas);
        canvas.className = 'ir-canvas';
        meta.textContent = w + ' × ' + h + ' px · 圆角 ' + Math.round(r) + ' px';
        download.disabled = false;
      }

      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        TB.readImage(file).then(function (obj) {
          image = obj.img;
          objectUrl = obj.url;
          draw();
          TB.$('#irRadiusV', root).textContent = radius.value;
        }).catch(function (e) {
          preview.innerHTML = '<div class="hint">' + TB.esc(e.message) + '</div>';
        });
      });

      radius.addEventListener('input', function () {
        TB.$('#irRadiusV', root).textContent = radius.value;
        draw();
      });
      type.addEventListener('change', draw);

      TB.$('#irGo', root).addEventListener('click', function () {
        if (!image) return TB.toast('请先选择图片');
        draw();
      });
      download.addEventListener('click', function () {
        if (!canvas) return TB.toast('请先生成');
        TB.downloadCanvas(canvas, 'rounded.' + (type.value === 'image/jpeg' ? 'jpg' : 'png'), type.value, 0.92);
      });
    }
  });

  /* --------------------------------------------------------- 去白边 */
  TB.def({
    slug: 'white-trim',
    cat: 'image',
    name: '图片去白边',
    desc: '自动识别图片四周的白色 / 透明背景并裁剪，支持留白。',
    icon: '✂️',
    kw: '去白边 裁剪 图片 白底 透明 留白 扫描件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择图片</div>' +
          '<input class="input" type="file" id="wtFile" accept="image/*">' +
          '<div class="row">' +
            '<div class="field"><div class="label">白色容差 <b id="wtTolV">18</b></div><input class="input" type="range" id="wtTol" min="0" max="80" value="18"></div>' +
            '<div class="field"><div class="label">保留留白 <b id="wtPadV">10</b> px</div><input class="input" type="range" id="wtPad" min="0" max="80" value="10"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="wtGo" type="button">自动去白边</button>' +
            '<button class="btn" id="wtDownload" type="button" disabled>下载结果</button></div>' +
          '<p class="note">容差越大，越容易把浅灰、米白也当作背景；透明像素同样会被视为背景。适合扫描件、截图和白底商品图。</p></div>' +
        '<div class="panel"><div class="panel-h">处理结果</div>' +
          '<div class="wt-preview" id="wtPreview"><div class="hint">尚未选择图片</div></div>' +
          '<div class="wt-meta" id="wtMeta"></div></div>';

      var input = TB.$('#wtFile', root);
      var tol = TB.$('#wtTol', root);
      var pad = TB.$('#wtPad', root);
      var preview = TB.$('#wtPreview', root);
      var meta = TB.$('#wtMeta', root);
      var download = TB.$('#wtDownload', root);
      var image = null;
      var canvas = null;
      var objectUrl = '';

      function trim() {
        if (!image) return TB.toast('请先选择图片');
        var w = image.naturalWidth, h = image.naturalHeight;
        var temp = document.createElement('canvas');
        temp.width = w; temp.height = h;
        var tctx = temp.getContext('2d', { willReadFrequently: true });
        tctx.drawImage(image, 0, 0);
        var data = tctx.getImageData(0, 0, w, h).data;
        var t = Number(tol.value);
        var minX = w, minY = h, maxX = -1, maxY = -1;

        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var i = (y * w + x) * 4;
            var a = data[i + 3];
            var isBg = a < 8 || (data[i] >= 255 - t && data[i + 1] >= 255 - t && data[i + 2] >= 255 - t);
            if (!isBg) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < 0 || maxY < 0) {
          meta.textContent = '整张图都在容差范围内，没有可裁剪的内容。';
          return;
        }

        var p = Number(pad.value);
        var sx = Math.max(0, minX - p);
        var sy = Math.max(0, minY - p);
        var ex = Math.min(w - 1, maxX + p);
        var ey = Math.min(h - 1, maxY + p);
        var sw = ex - sx + 1;
        var sh = ey - sy + 1;
        canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        var ctx2 = canvas.getContext('2d');
        ctx2.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        preview.innerHTML = '';
        preview.appendChild(canvas);
        canvas.className = 'wt-canvas';
        meta.innerHTML = '<b>' + w + ' × ' + h + '</b> → <b>' + sw + ' × ' + sh + '</b> px　' +
          '<span>裁掉 ' + (w - sw) + ' × ' + (h - sh) + ' 像素</span>';
        download.disabled = false;
        TB.toast('已裁剪为 ' + sw + ' × ' + sh);
      }

      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        TB.readImage(file).then(function (obj) {
          image = obj.img;
          objectUrl = obj.url;
          preview.innerHTML = '<img class="wt-original" src="' + obj.url + '" alt="原图">';
          meta.textContent = '原图 ' + obj.img.naturalWidth + ' × ' + obj.img.naturalHeight + ' px，点击“自动去白边”。';
          download.disabled = true;
        }).catch(function (e) {
          preview.innerHTML = '<div class="hint">' + TB.esc(e.message) + '</div>';
        });
      });

      tol.addEventListener('input', function () { TB.$('#wtTolV', root).textContent = tol.value; });
      pad.addEventListener('input', function () { TB.$('#wtPadV', root).textContent = pad.value; });
      TB.$('#wtGo', root).addEventListener('click', trim);
      download.addEventListener('click', function () {
        if (!canvas) return TB.toast('请先处理');
        TB.downloadCanvas(canvas, 'trimmed.png', 'image/png');
      });
    }
  });

  /* --------------------------------------------------------- URL 解析 */
  TB.def({
    slug: 'url-parser',
    cat: 'web',
    name: 'URL 解析拆分',
    desc: '拆出协议、主机、端口、路径、查询参数与锚点，便于排查链接。',
    icon: '🔗',
    kw: 'URL 解析 拆分 参数 query 域名 端口 路径 链接',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">输入 URL</div>' +
          '<input class="input mono" id="upIn" value="https://example.com:8443/api/users?page=2&sort=name#list" spellcheck="false">' +
          '<div class="btns"><button class="btn primary" id="upGo" type="button">解析</button>' +
            '<button class="btn" id="upCopy" type="button">复制 JSON</button>' +
            '<button class="btn" id="upClear" type="button">清空</button></div>' +
          '<p class="note">如果省略协议，会自动按 https:// 尝试解析；本地文件、相对路径不是完整 URL，无法拆出主机。</p></div>' +
        '<div class="panel"><div class="panel-h">组成</div><div class="up-grid" id="upGrid"></div></div>' +
        '<div class="panel"><div class="panel-h">查询参数</div><div class="up-table-wrap"><table class="table" id="upTable"><thead><tr><th>参数</th><th>值</th></tr></thead><tbody></tbody></table></div></div>' +
        '<div class="panel"><div class="panel-h">JSON 结果</div><textarea class="textarea mono" id="upOut" rows="10" spellcheck="false"></textarea></div>';

      var input = TB.$('#upIn', root);
      var grid = TB.$('#upGrid', root);
      var tbody = TB.$('#upTable tbody', root);
      var out = TB.$('#upOut', root);
      var lastJson = '';

      function parse() {
        var raw = input.value.trim();
        if (!raw) return TB.toast('请输入 URL');
        var normalized = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : 'https://' + raw;
        try {
          var u = new URL(normalized);
          var params = [];
          u.searchParams.forEach(function (value, key) { params.push([key, value]); });
          var data = {
            href: u.href,
            protocol: u.protocol.replace(':', ''),
            username: u.username,
            password: u.password,
            host: u.host,
            hostname: u.hostname,
            port: u.port,
            origin: u.origin,
            pathname: u.pathname,
            search: u.search,
            hash: u.hash,
            params: params
          };
          var rows = [
            ['协议', data.protocol], ['主机名', data.hostname], ['端口', data.port || '默认'],
            ['Origin', data.origin], ['路径', data.pathname], ['查询串', data.search || '无'],
            ['锚点', data.hash || '无'], ['用户名', data.username || '无'],
            ['密码', data.password ? '已设置' : '无'], ['完整 URL', data.href]
          ];
          grid.innerHTML = rows.map(function (row) {
            return '<div class="up-item"><span>' + TB.esc(row[0]) + '</span><b class="mono">' + TB.esc(row[1]) + '</b></div>';
          }).join('');
          tbody.innerHTML = params.length ? params.map(function (row) {
            return '<tr><td class="mono">' + TB.esc(row[0]) + '</td><td class="mono">' + TB.esc(row[1]) + '</td></tr>';
          }).join('') : '<tr><td colspan="2" class="hint">没有查询参数</td></tr>';
          lastJson = JSON.stringify(data, null, 2);
          out.value = lastJson;
        } catch (e) {
          grid.innerHTML = '<div class="up-error">解析失败：' + TB.esc(e.message) + '</div>';
          tbody.innerHTML = '<tr><td colspan="2" class="hint">无法解析</td></tr>';
          out.value = '';
          lastJson = '';
        }
      }

      TB.$('#upGo', root).addEventListener('click', parse);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') parse(); });
      TB.$('#upCopy', root).addEventListener('click', function () {
        if (!lastJson) return TB.toast('请先解析');
        TB.copy(lastJson);
      });
      TB.$('#upClear', root).addEventListener('click', function () { input.value = ''; grid.innerHTML = ''; tbody.innerHTML = ''; out.value = ''; });
      parse();
    }
  });

  /* --------------------------------------------------------- 链接批量 */
  TB.def({
    slug: 'link-batch',
    cat: 'web',
    name: '链接批量生成器',
    desc: '用 {n} 占位符按范围批量生成链接，支持补零和去重。',
    icon: '🔢',
    kw: '链接 批量 生成 URL 分页 编号 占位符',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">生成规则</div>' +
          '<div class="field"><div class="label">链接模板（用 {n} 表示编号）</div>' +
            '<input class="input mono" id="lbTpl" value="https://example.com/list?page={n}" spellcheck="false"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">起始</div><input class="input" type="number" id="lbStart" value="1"></div>' +
            '<div class="field"><div class="label">结束</div><input class="input" type="number" id="lbEnd" value="20"></div>' +
            '<div class="field"><div class="label">步长</div><input class="input" type="number" id="lbStep" value="1" min="1"></div>' +
            '<div class="field"><div class="label">补零位数</div><input class="input" type="number" id="lbPad" value="0" min="0" max="10"></div>' +
            '<div class="field"><div class="label">去重</div><select class="select" id="lbUnique"><option value="1">是</option><option value="0">否</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="lbGo" type="button">生成</button>' +
            '<button class="btn" id="lbCopy" type="button">复制全部</button>' +
            '<button class="btn" id="lbDown" type="button">下载 .txt</button></div>' +
          '<p class="note">最多生成 5000 条；模板里没有 {n} 时会在末尾自动追加 /{n}，避免生成重复链接。</p></div>' +
        '<div class="panel"><div class="panel-h">生成结果 <small id="lbCount"></small></div>' +
          '<textarea class="textarea mono" id="lbOut" rows="16" spellcheck="false"></textarea></div>';

      var tpl = TB.$('#lbTpl', root);
      var start = TB.$('#lbStart', root);
      var end = TB.$('#lbEnd', root);
      var step = TB.$('#lbStep', root);
      var pad = TB.$('#lbPad', root);
      var unique = TB.$('#lbUnique', root);
      var out = TB.$('#lbOut', root);
      var count = TB.$('#lbCount', root);
      var current = '';

      function padNum(n, width) {
        var s = String(n);
        while (s.length < width) s = '0' + s;
        return s;
      }

      function build() {
        var a = Number(start.value);
        var b = Number(end.value);
        var st = Math.max(1, Number(step.value) || 1);
        var width = Math.max(0, Number(pad.value) || 0);
        if (!isFinite(a) || !isFinite(b)) return TB.toast('请输入有效范围');
        if (a > b) { var tmp = a; a = b; b = tmp; }
        var template = tpl.value.trim();
        if (!template) return TB.toast('请输入链接模板');
        var hasToken = /\{n\}/.test(template);
        var list = [];
        var seen = {};
        for (var n = a; n <= b && list.length < 5000; n += st) {
          var formatted = padNum(n, width);
          var url = hasToken ? template.split('{n}').join(formatted) : template.replace(/\/$/, '') + '/' + formatted;
          if (unique.value === '1') {
            if (seen[url]) continue;
            seen[url] = 1;
          }
          list.push(url);
        }
        current = list.join('\n');
        out.value = current;
        count.textContent = '共 ' + list.length + ' 条';
        if (list.length >= 5000) TB.toast('已达到 5000 条上限');
      }

      TB.$('#lbGo', root).addEventListener('click', build);
      TB.$('#lbCopy', root).addEventListener('click', function () {
        if (!current) build();
        if (current) TB.copy(current);
      });
      TB.$('#lbDown', root).addEventListener('click', function () {
        if (!current) build();
        if (current) TB.downloadText(current, 'links.txt', 'text/plain');
      });
      build();
    }
  });

  /* --------------------------------------------------------- Punycode */
  TB.def({
    slug: 'punycode',
    cat: 'web',
    name: 'Punycode 编解码',
    desc: '中文域名与 xn-- ASCII 域名互转，纯前端实现 RFC 3492。',
    icon: '🌐',
    kw: 'Punycode 中文域名 IDN 域名 xn-- 编码 解码',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">域名输入</div>' +
          '<input class="input mono" id="pcIn" value="中文.cn" spellcheck="false">' +
          '<div class="row"><div class="field"><div class="label">模式</div><select class="select" id="pcMode">' +
            '<option value="auto">自动判断</option><option value="encode">编码为 xn--</option><option value="decode">解码为中文</option>' +
          '</select></div></div>' +
          '<div class="btns"><button class="btn primary" id="pcGo" type="button">转换</button>' +
            '<button class="btn" id="pcCopy" type="button">复制结果</button>' +
            '<button class="btn" id="pcSwap" type="button">交换输入 / 输出</button></div>' +
          '<p class="note">逐段转换域名标签，保留点号；例如 中文.cn → xn--fiq228c.cn。只处理域名，不处理完整 URL。</p></div>' +
        '<div class="panel"><div class="panel-h">转换结果</div>' +
          '<div class="pc-result mono" id="pcOut"></div>' +
          '<div class="pc-table-wrap"><table class="table" id="pcTable"><thead><tr><th>原标签</th><th>结果</th></tr></thead><tbody></tbody></table></div></div>';

      var input = TB.$('#pcIn', root);
      var mode = TB.$('#pcMode', root);
      var out = TB.$('#pcOut', root);
      var tbody = TB.$('#pcTable tbody', root);
      var result = '';

      var BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128, DELIMITER = '-';

      function adapt(delta, numPoints, firstTime) {
        var k = 0;
        delta = firstTime ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
        delta += Math.floor(delta / numPoints);
        while (delta > ((BASE - TMIN) * TMAX) / 2) {
          delta = Math.floor(delta / (BASE - TMIN));
          k += BASE;
        }
        return Math.floor(k + (BASE - TMIN + 1) * delta / (delta + SKEW));
      }

      function digitToBasic(d) {
        return String.fromCharCode(d < 26 ? 97 + d : 22 + d);
      }

      function basicToDigit(code) {
        if (code >= 48 && code <= 57) return 26 + code - 48;
        if (code >= 65 && code <= 90) return code - 65;
        if (code >= 97 && code <= 122) return code - 97;
        return 36;
      }

      function encodeLabel(label) {
        var cps = Array.from(label).map(function (ch) { return ch.codePointAt(0); });
        var output = [];
        var basic = [];
        cps.forEach(function (cp) { if (cp < 128) basic.push(String.fromCharCode(cp)); });
        var basicLength = basic.length;
        if (basicLength) output.push(basic.join(''));
        var handled = basicLength;
        if (basicLength) output.push(DELIMITER);
        var n = INITIAL_N, delta = 0, bias = INITIAL_BIAS;
        while (handled < cps.length) {
          var m = Infinity;
          cps.forEach(function (cp) { if (cp >= n && cp < m) m = cp; });
          if (m === Infinity) break;
          delta += (m - n) * (handled + 1);
          n = m;
          for (var idx = 0; idx < cps.length; idx++) {
            var cp = cps[idx];
            if (cp < n) delta++;
            if (cp === n) {
              var q = delta;
              for (var k = BASE; ; k += BASE) {
                var t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
                if (q < t) break;
                output.push(digitToBasic(t + ((q - t) % (BASE - t))));
                q = Math.floor((q - t) / (BASE - t));
              }
              output.push(digitToBasic(q));
              bias = adapt(delta, handled + 1, handled === basicLength);
              delta = 0;
              handled++;
            }
          }
          delta++;
          n++;
        }
        return output.join('');
      }

      function decodeLabel(label) {
        var output = [];
        var basic = label.lastIndexOf(DELIMITER);
        var index = 0;
        if (basic > 0) {
          for (var j = 0; j < basic; j++) output.push(label.charCodeAt(j));
          index = basic + 1;
        }
        var n = INITIAL_N, i = 0, bias = INITIAL_BIAS;
        while (index < label.length) {
          var oldi = i, w = 1;
          for (var k = BASE; ; k += BASE) {
            if (index >= label.length) throw new Error('Punycode 数据不完整');
            var digit = basicToDigit(label.charCodeAt(index++));
            if (digit >= BASE) throw new Error('Punycode 含非法字符');
            i += digit * w;
            var t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
            if (digit < t) break;
            w *= BASE - t;
          }
          bias = adapt(i - oldi, output.length + 1, oldi === 0);
          n += Math.floor(i / (output.length + 1));
          i %= output.length + 1;
          output.splice(i, 0, n);
          i++;
        }
        return output.map(function (cp) { return String.fromCodePoint(cp); }).join('');
      }

      function convert() {
        var raw = input.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        if (!raw) return TB.toast('请输入域名');
        var labels = raw.split('.');
        var rows = [];
        try {
          labels.forEach(function (label) {
            if (!label) { rows.push([label, label]); return; }
            var isPuny = /^xn--/i.test(label);
            var hasUnicode = /[^\x00-\x7F]/.test(label);
            var doDecode = mode.value === 'decode' || (mode.value === 'auto' && isPuny);
            if (doDecode && isPuny) rows.push([label, decodeLabel(label.slice(4))]);
            else if (doDecode && !isPuny) rows.push([label, label]);
            else if (hasUnicode) rows.push([label, 'xn--' + encodeLabel(label)]);
            else rows.push([label, label]);
          });
          result = rows.map(function (row) { return row[1]; }).join('.');
          out.textContent = result;
          tbody.innerHTML = rows.map(function (row) {
            return '<tr><td class="mono">' + TB.esc(row[0]) + '</td><td class="mono">' + TB.esc(row[1]) + '</td></tr>';
          }).join('');
        } catch (e) {
          result = '';
          out.textContent = '';
          tbody.innerHTML = '<tr><td colspan="2" class="hint">转换失败：' + TB.esc(e.message) + '</td></tr>';
        }
      }

      TB.$('#pcGo', root).addEventListener('click', convert);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') convert(); });
      TB.$('#pcCopy', root).addEventListener('click', function () {
        if (!result) return TB.toast('没有可复制的结果');
        TB.copy(result);
      });
      TB.$('#pcSwap', root).addEventListener('click', function () {
        if (!result) return;
        input.value = result;
        mode.value = /^xn--/i.test(result.split('.')[0]) ? 'decode' : 'encode';
        convert();
      });
      convert();
    }
  });

  /* --------------------------------------------------------- 目录树 */
  TB.def({
    slug: 'dir-tree',
    cat: 'web',
    name: '文件夹目录树生成',
    desc: '把多行路径整理成 ├─ └─ 目录树，适合 README 和文档。',
    icon: '🌳',
    kw: '目录树 文件夹 树形 路径 README 项目结构 ASCII',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">路径列表</div>' +
          '<textarea class="textarea mono" id="dtIn" rows="10" spellcheck="false" placeholder="每行一个路径，例如：\nsrc/components/Button.js\nsrc/components/Modal.js\nREADME.md"></textarea>' +
          '<div class="row">' +
            '<div class="field"><div class="label">排序</div><select class="select" id="dtSort"><option value="1">按名称排序</option><option value="0">保持输入顺序</option></select></div>' +
            '<div class="field"><div class="label">根目录名（可选）</div><input class="input" id="dtRoot" placeholder="例如 project"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="dtGo" type="button">生成目录树</button>' +
            '<button class="btn" id="dtCopy" type="button">复制</button>' +
            '<button class="btn" id="dtDown" type="button">下载 .txt</button></div>' +
          '<p class="note">目录行以 / 结尾；重复路径会自动合并。输出使用常见的 ├─ / └─ 树形字符，可直接贴进 README。</p></div>' +
        '<div class="panel"><div class="panel-h">目录树 <small id="dtStats"></small></div>' +
          '<textarea class="textarea mono" id="dtOut" rows="18" spellcheck="false"></textarea></div>';

      var input = TB.$('#dtIn', root);
      var sort = TB.$('#dtSort', root);
      var rootName = TB.$('#dtRoot', root);
      var out = TB.$('#dtOut', root);
      var stats = TB.$('#dtStats', root);
      var current = '';

      function buildTree(lines) {
        var tree = { dirs: {}, files: {} };
        var dirCount = 0, fileCount = 0;
        lines.forEach(function (line) {
          var raw = line.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
          if (!raw || raw === '.') return;
          var parts = raw.split('/').filter(Boolean);
          if (!parts.length) return;
          var node = tree;
          parts.forEach(function (part, idx) {
            var last = idx === parts.length - 1;
            if (last && !raw.endsWith('/')) {
              if (!node.files[part]) { node.files[part] = true; fileCount++; }
            } else {
              if (!node.dirs[part]) { node.dirs[part] = { dirs: {}, files: {} }; dirCount++; }
              node = node.dirs[part];
            }
          });
        });
        return { tree: tree, dirs: dirCount, files: fileCount };
      }

      function renderNode(node, prefix, lines, doSort) {
        var dirs = Object.keys(node.dirs);
        var files = Object.keys(node.files);
        if (doSort) {
          dirs.sort(function (a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
          files.sort(function (a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
        }
        var entries = dirs.map(function (name) { return { name: name, dir: true }; })
          .concat(files.map(function (name) { return { name: name, dir: false }; }));
        entries.forEach(function (entry, idx) {
          var last = idx === entries.length - 1;
          lines.push(prefix + (last ? '└─ ' : '├─ ') + entry.name + (entry.dir ? '/' : ''));
          if (entry.dir) renderNode(node.dirs[entry.name], prefix + (last ? '   ' : '│  '), lines, doSort);
        });
      }

      function build() {
        var lines = input.value.split(/\r?\n/);
        var result = buildTree(lines);
        if (!result.files && !result.dirs) { current = ''; out.value = ''; stats.textContent = ''; return TB.toast('请至少输入一个路径'); }
        var treeLines = [];
        var name = rootName.value.trim();
        if (name) {
          treeLines.push(name + '/');
          renderNode(result.tree, '', treeLines, sort.value === '1');
        } else {
          renderNode(result.tree, '', treeLines, sort.value === '1');
        }
        current = treeLines.join('\n');
        out.value = current;
        stats.textContent = result.dirs + ' 个目录 · ' + result.files + ' 个文件';
      }

      TB.$('#dtGo', root).addEventListener('click', build);
      TB.$('#dtCopy', root).addEventListener('click', function () {
        if (!current) build();
        if (current) TB.copy(current);
      });
      TB.$('#dtDown', root).addEventListener('click', function () {
        if (!current) build();
        if (current) TB.downloadText(current, 'directory-tree.txt', 'text/plain');
      });
    }
  });

  /* --------------------------------------------------------- 提词器 */
  TB.def({
    slug: 'teleprompter',
    cat: 'office',
    name: '在线提词器',
    desc: '大字号自动滚动台词，支持镜像、速度与全屏。',
    icon: '🎤',
    kw: '提词器 台词 滚动 镜像 全屏 口播 录视频',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">台词与参数</div>' +
          '<textarea class="textarea" id="tpText" rows="5" spellcheck="false">大家好，欢迎来到今天的分享。\n\n这是提词器的示例文本，你可以把整段口播稿粘贴进来。\n\n调整字号和速度后，点击开始滚动。</textarea>' +
          '<div class="row">' +
            '<div class="field"><div class="label">字号 <b id="tpFontV">42</b> px</div><input class="input" type="range" id="tpFont" min="24" max="96" value="42"></div>' +
            '<div class="field"><div class="label">速度 <b id="tpSpeedV">70</b> px/s</div><input class="input" type="range" id="tpSpeed" min="20" max="180" value="70"></div>' +
            '<div class="field"><div class="label">镜像</div><select class="select" id="tpMirror"><option value="0">正常</option><option value="1">水平镜像</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="tpPlay" type="button">开始滚动</button>' +
            '<button class="btn" id="tpPause" type="button">暂停</button>' +
            '<button class="btn" id="tpReset" type="button">回到开头</button>' +
            '<button class="btn" id="tpFull" type="button">全屏提词</button></div></div>' +
        '<div class="panel"><div class="panel-h">提词区</div>' +
          '<div class="tp-stage" id="tpStage"><div class="tp-content" id="tpContent"></div></div>' +
          '<p class="note">提示：全屏后按 Esc 退出；空格键在提词区内可暂停 / 继续。</p></div>';

      var text = TB.$('#tpText', root);
      var font = TB.$('#tpFont', root);
      var speed = TB.$('#tpSpeed', root);
      var mirror = TB.$('#tpMirror', root);
      var stage = TB.$('#tpStage', root);
      var content = TB.$('#tpContent', root);
      var playBtn = TB.$('#tpPlay', root);
      var pauseBtn = TB.$('#tpPause', root);
      var playing = false;
      var offset = 0;
      var lastTime = 0;
      var rafId = 0;

      function applyStyle() {
        content.style.fontSize = font.value + 'px';
        content.style.transform = (mirror.value === '1' ? 'scaleX(-1) ' : '') + 'translateY(' + (-offset) + 'px)';
        stage.classList.toggle('tp-mirrored', mirror.value === '1');
        TB.$('#tpFontV', root).textContent = font.value;
        TB.$('#tpSpeedV', root).textContent = speed.value;
      }

      function resetContent() {
        content.textContent = text.value || '';
        offset = 0;
        applyStyle();
      }

      function stop() {
        playing = false;
        lastTime = 0;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        playBtn.textContent = '开始滚动';
      }

      function tick(ts) {
        if (!playing || !stage.isConnected) { stop(); return; }
        if (!lastTime) lastTime = ts;
        var dt = Math.min(0.05, (ts - lastTime) / 1000);
        lastTime = ts;
        offset += (Number(speed.value) || 70) * dt;
        var max = Math.max(0, content.scrollHeight - stage.clientHeight + 60);
        if (offset > max) offset = 0; // 循环回到开头
        content.style.transform = (mirror.value === '1' ? 'scaleX(-1) ' : '') + 'translateY(' + (-offset) + 'px)';
        rafId = requestAnimationFrame(tick);
      }

      function start() {
        if (!text.value.trim()) return TB.toast('请先输入台词');
        if (!content.textContent || content.textContent !== text.value) resetContent();
        if (playing) return;
        playing = true;
        lastTime = 0;
        playBtn.textContent = '正在滚动';
        rafId = requestAnimationFrame(tick);
      }

      function pause() {
        if (!playing) return;
        playing = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        playBtn.textContent = '继续滚动';
      }

      playBtn.addEventListener('click', function () {
        if (playing) pause();
        else start();
      });
      pauseBtn.addEventListener('click', pause);
      TB.$('#tpReset', root).addEventListener('click', function () { stop(); resetContent(); });
      font.addEventListener('input', function () { applyStyle(); });
      speed.addEventListener('input', function () { applyStyle(); });
      mirror.addEventListener('change', function () {
        applyStyle();
      });
      text.addEventListener('input', function () {
        if (!playing) resetContent();
      });
      TB.$('#tpFull', root).addEventListener('click', function () {
        if (stage.requestFullscreen) {
          stage.requestFullscreen().catch(function () { TB.toast('浏览器拒绝了全屏请求'); });
        } else {
          stage.classList.toggle('tp-faux-full');
        }
      });
      stage.addEventListener('keydown', function (e) {
        if (e.key === ' ') { e.preventDefault(); if (playing) pause(); else start(); }
      });
      stage.setAttribute('tabindex', '0');

      window.addEventListener('hashchange', stop, { once: true });
      resetContent();
    }
  });

  /* --------------------------------------------------------- 硬盘分区 */
  TB.def({
    slug: 'disk-partition',
    cat: 'data',
    name: '硬盘整数分区计算',
    desc: '按 NTFS / FAT32 对齐规则计算分区应输入的 MB 数。',
    icon: '💽',
    kw: '硬盘 分区 整数 GB MB NTFS FAT32 对齐 装机',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">目标容量</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">想要显示的容量（GB）</div><input class="input" type="number" id="dpGb" value="100" min="1" step="1"></div>' +
            '<div class="field"><div class="label">文件系统</div><select class="select" id="dpFs"><option value="ntfs">NTFS（Windows 默认）</option><option value="fat32">FAT32</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="dpGo" type="button">计算</button>' +
            '<button class="btn" id="dpCopy" type="button">复制结果</button></div>' +
          '<div class="dp-result" id="dpResult"></div>' +
          '<p class="note">Windows 以 1024 进制显示容量，但分区工具按 MB 输入。要得到整数 GB，需要比理论值略大；NTFS 按 7.84423828125 MB 对齐，FAT32 按常见公式 1028×GB−4 计算。</p></div>' +
        '<div class="panel"><div class="panel-h">常用容量对照</div><div class="dp-table-wrap"><table class="table" id="dpTable"><thead><tr><th>目标</th><th>NTFS 输入</th><th>FAT32 输入</th></tr></thead><tbody></tbody></table></div></div>';

      var gbInput = TB.$('#dpGb', root);
      var fs = TB.$('#dpFs', root);
      var result = TB.$('#dpResult', root);
      var copyText = '';

      function ntfsMb(gb) {
        var align = 7.84423828125;
        return Math.ceil((gb * 1024) / align) * align;
      }
      function fat32Mb(gb) {
        return 1028 * gb - 4;
      }
      function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

      function calc() {
        var gb = Math.max(1, Math.round(Number(gbInput.value) || 0));
        if (!gb) return TB.toast('请输入目标容量');
        var mb = fs.value === 'ntfs' ? ntfsMb(gb) : fat32Mb(gb);
        var mbInt = Math.ceil(mb);
        var bytes = mbInt * 1024 * 1024;
        copyText = mbInt + ' MB';
        result.innerHTML =
          '<div class="dp-main"><b>' + fmt(mbInt) + '</b><span>MB</span></div>' +
          '<div class="dp-sub">目标 ' + gb + ' GB · ' + (fs.value === 'ntfs' ? 'NTFS 对齐' : 'FAT32 公式') + '</div>' +
          '<div class="dp-kv"><span>字节数</span><b class="mono">' + bytes.toLocaleString('en-US') + '</b></div>' +
          '<div class="dp-kv"><span>理论值</span><b class="mono">' + (gb * 1024).toLocaleString('en-US') + ' MB</b></div>';
      }

      TB.$('#dpGo', root).addEventListener('click', calc);
      gbInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') calc(); });
      fs.addEventListener('change', calc);
      TB.$('#dpCopy', root).addEventListener('click', function () {
        if (!copyText) calc();
        if (copyText) TB.copy(copyText);
      });

      var rows = [1, 10, 50, 100, 200, 500, 1024];
      TB.$('#dpTable tbody', root).innerHTML = rows.map(function (gb) {
        return '<tr><td><b>' + gb + ' GB</b></td><td class="mono">' + fmt(Math.ceil(ntfsMb(gb))) + ' MB</td><td class="mono">' + fmt(fat32Mb(gb)) + ' MB</td></tr>';
      }).join('');
      calc();
    }
  });

})();
