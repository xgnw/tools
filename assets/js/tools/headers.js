/* =============================================================================
 * HTTP Headers 分析
 * -----------------------------------------------------------------------------
 * 解析从浏览器 Network / curl -I 复制来的原始响应头：
 * 统计响应头、检查常见安全头、拆解 Set-Cookie 标记，并列出全部键值。
 * 只解析粘贴进来的文本，不会向目标域名发请求。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = 'HTTP/2 200 OK\n' +
    'content-type: text/html; charset=utf-8\n' +
    'cache-control: public, max-age=600\n' +
    'strict-transport-security: max-age=31536000; includeSubDomains\n' +
    'x-content-type-options: nosniff\n' +
    'x-frame-options: SAMEORIGIN\n' +
    'referrer-policy: strict-origin-when-cross-origin\n' +
    'set-cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax\n' +
    'set-cookie: theme=light; Path=/; SameSite=None\n' +
    'server: nginx\n' +
    'content-length: 5120';

  var SECURITY = [
    ['content-security-policy', 'Content-Security-Policy', '限制脚本、样式、图片等资源来源，降低 XSS 风险'],
    ['strict-transport-security', 'Strict-Transport-Security', '强制后续请求走 HTTPS，防止协议降级'],
    ['x-content-type-options', 'X-Content-Type-Options', '应为 nosniff，阻止浏览器猜测 MIME 类型'],
    ['x-frame-options', 'X-Frame-Options', '限制页面被其他站点 iframe 嵌入'],
    ['referrer-policy', 'Referrer-Policy', '控制跨站请求携带的 Referer 信息'],
    ['permissions-policy', 'Permissions-Policy', '限制摄像头、麦克风、定位等浏览器能力']
  ];

  function parseHeaders(raw) {
    var lines = String(raw || '').split(/\r?\n/);
    var status = '', headers = [];
    lines.forEach(function (line) {
      if (!line.trim()) return;
      if (!status && /^HTTP\/\d(?:\.\d)?\s+\d{3}/i.test(line.trim())) { status = line.trim(); return; }
      if (/^[ \t]/.test(line) && headers.length) {
        headers[headers.length - 1].value += ' ' + line.trim();
        return;
      }
      var idx = line.indexOf(':');
      if (idx < 1) return;
      var name = line.slice(0, idx).trim();
      var value = line.slice(idx + 1).trim();
      if (name) headers.push({ name: name, key: name.toLowerCase(), value: value });
    });
    return { status: status, headers: headers };
  }

  function byKey(list) {
    var map = {};
    list.forEach(function (h) {
      if (!map[h.key]) map[h.key] = [];
      map[h.key].push(h.value);
    });
    return map;
  }

  function parseCookie(value) {
    var parts = value.split(';').map(function (x) { return x.trim(); });
    var first = parts.shift() || '';
    var eq = first.indexOf('=');
    var name = eq > 0 ? first.slice(0, eq).trim() : first.trim();
    var flags = { secure: false, httpOnly: false, sameSite: '', path: '', domain: '', expires: '', maxAge: '' };
    parts.forEach(function (p) {
      var i = p.indexOf('=');
      var k = (i > -1 ? p.slice(0, i) : p).trim().toLowerCase();
      var v = i > -1 ? p.slice(i + 1).trim() : '';
      if (k === 'secure') flags.secure = true;
      else if (k === 'httponly') flags.httpOnly = true;
      else if (k === 'samesite') flags.sameSite = v;
      else if (k === 'path') flags.path = v;
      else if (k === 'domain') flags.domain = v;
      else if (k === 'expires') flags.expires = v;
      else if (k === 'max-age') flags.maxAge = v;
    });
    return { name: name, flags: flags };
  }

  TB.def({
    slug: 'headers',
    cat: 'web',
    name: 'HTTP Headers 分析',
    desc: '检查安全响应头、缓存头和 Cookie 标记，内容只在本地解析。',
    icon: '🧾',
    kw: 'http headers 响应头 安全头 csp hsts cookie 缓存 分析',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">原始响应头 <span class="hint">支持状态行和 Set-Cookie 多行</span></div>' +
          '<div class="field"><textarea class="textarea" id="hdInput" rows="10" spellcheck="false" placeholder="HTTP/2 200 OK&#10;content-type: text/html&#10;..."></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="hdRun" type="button">分析</button>' +
            '<button class="btn" id="hdSample" type="button">载入示例</button>' +
            '<button class="btn" id="hdCopy" type="button">复制 JSON</button></div>' +
          '<div class="hint" id="hdInfo" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">概览</div><div class="kv" id="hdStats"></div></div>' +
        '<div class="panel"><div class="panel-h">安全响应头</div><div class="table-wrap"><table class="table" id="hdSecurity"></table></div></div>' +
        '<div class="panel"><div class="panel-h">Cookie 标记</div><div class="table-wrap"><table class="table" id="hdCookies"></table></div></div>' +
        '<div class="panel"><div class="panel-h">全部响应头</div><div class="table-wrap"><table class="table" id="hdAll"></table></div></div>' +
        '<p class="note">安全评分只反映常见响应头是否存在，不代表站点一定安全；CSP 的具体策略、Cookie 的签名与过期时间仍需结合实际业务判断。</p>';

      var input = TB.$('#hdInput', root);
      var info = TB.$('#hdInfo', root);
      var stats = TB.$('#hdStats', root);
      var security = TB.$('#hdSecurity', root);
      var cookies = TB.$('#hdCookies', root);
      var all = TB.$('#hdAll', root);
      var current = null;

      function run() {
        var parsed = parseHeaders(input.value);
        var map = byKey(parsed.headers);
        current = parsed;
        if (!parsed.headers.length) {
          stats.innerHTML = ''; security.innerHTML = ''; cookies.innerHTML = ''; all.innerHTML = '';
          info.textContent = '没有识别到响应头，请粘贴「名称: 值」格式的文本';
          current = null;
          return;
        }
        var score = 0;
        SECURITY.forEach(function (s) { if (map[s[0]]) score++; });
        var cookieList = (map['set-cookie'] || []).map(parseCookie);
        stats.innerHTML =
          '<div class="kv-item"><div class="kv-k">状态行</div><div class="kv-v">' + (parsed.status ? TB.esc(parsed.status) : '未识别') + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">响应头数量</div><div class="kv-v">' + parsed.headers.length + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">Cookie 数量</div><div class="kv-v">' + cookieList.length + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">安全头覆盖</div><div class="kv-v">' + score + ' / ' + SECURITY.length + '</div></div>';

        security.innerHTML = '<thead><tr><th>响应头</th><th>状态</th><th>当前值 / 建议</th></tr></thead><tbody>' +
          SECURITY.map(function (s) {
            var vals = map[s[0]];
            return '<tr><td>' + s[1] + '</td><td>' + (vals ? '<span class="ok">已设置</span>' : '<span class="bad">缺失</span>') + '</td><td style="white-space:pre-wrap;word-break:break-all">' +
              (vals ? TB.esc(vals.join('\n')) : '<span class="hint">' + s[2] + '</span>') + '</td></tr>';
          }).join('') + '</tbody>';

        cookies.innerHTML = '<thead><tr><th>名称</th><th>Secure</th><th>HttpOnly</th><th>SameSite</th><th>提示</th></tr></thead><tbody>' +
          (cookieList.length ? cookieList.map(function (c) {
            var issues = [];
            if (!c.flags.secure) issues.push('缺少 Secure');
            if (!c.flags.httpOnly) issues.push('缺少 HttpOnly');
            if (!c.flags.sameSite) issues.push('缺少 SameSite');
            if (c.flags.sameSite.toLowerCase() === 'none' && !c.flags.secure) issues.push('SameSite=None 需配合 Secure');
            return '<tr><td>' + TB.esc(c.name) + '</td><td>' + (c.flags.secure ? '是' : '<span class="bad">否</span>') + '</td><td>' +
              (c.flags.httpOnly ? '是' : '<span class="bad">否</span>') + '</td><td>' + (c.flags.sameSite ? TB.esc(c.flags.sameSite) : '<span class="bad">未设置</span>') +
              '</td><td>' + (issues.length ? TB.esc(issues.join('；')) : '<span class="ok">基础标记完整</span>') + '</td></tr>';
          }).join('') : '<tr><td colspan="5" class="hint">没有 Set-Cookie</td></tr>') + '</tbody>';

        all.innerHTML = '<thead><tr><th>名称</th><th>值</th></tr></thead><tbody>' +
          parsed.headers.map(function (h) {
            return '<tr><td>' + TB.esc(h.name) + '</td><td style="white-space:pre-wrap;word-break:break-all">' + TB.esc(h.value) + '</td></tr>';
          }).join('') + '</tbody>';
        info.textContent = '已解析 · ' + parsed.headers.length + ' 个响应头 · 安全头 ' + score + '/' + SECURITY.length;
      }

      TB.$('#hdRun', root).addEventListener('click', run);
      TB.$('#hdSample', root).addEventListener('click', function () { input.value = SAMPLE; run(); });
      TB.$('#hdCopy', root).addEventListener('click', function () {
        if (!current) { TB.toast('还没有可复制的解析结果'); return; }
        var obj = { status: current.status, headers: {} };
        current.headers.forEach(function (h) {
          if (!obj.headers[h.name]) obj.headers[h.name] = h.value;
          else if (Array.isArray(obj.headers[h.name])) obj.headers[h.name].push(h.value);
          else obj.headers[h.name] = [obj.headers[h.name], h.value];
        });
        TB.copy(JSON.stringify(obj, null, 2));
      });
      input.value = SAMPLE;
      run();
    }
  });
})();
