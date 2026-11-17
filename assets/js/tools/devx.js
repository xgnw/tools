/* =============================================================================
 * 开发者补强工具：JWT 解析、YAML ⇄ JSON、SQL 格式化 / 参数填充、条码生成、
 * CRC 校验、LRC 歌词转字幕、HTTP 请求片段、进制转换。
 * -----------------------------------------------------------------------------
 * 参考 Ctool（ctool.dev）的功能清单，代码全部按本站风格重写：
 *  - JWT/CRC/SQL/HTTP/LRC/进制 纯手写，无依赖；
 *  - YAML 用 js-yaml（MIT，38KB）、条码用 JsBarcode（MIT，59KB），都懒加载。
 * ========================================================================== */

(function () {

  /* ---------------------------------------------------------- 1. JWT 解析 */
  TB.def({
    slug: 'jwt', cat: 'web', name: 'JWT 解析', desc: '解头/载荷 · HMAC 验签', icon: '🎫',
    kw: 'jwt token 解析 验签 jws bearer 登录 令牌',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>Token</b><span style="color:var(--ink-3)">粘贴完整的 x.y.z</span></div>' +
            '<textarea class="textarea codeIn" id="tok" rows="4"></textarea></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">验签密钥（可选，仅 HMAC）</div>' +
              '<input class="input" id="secret" placeholder="留空只看结构" autocomplete="off"></div>' +
            '<div class="field"><div class="label">操作</div>' +
              '<div class="btns" style="margin:0"><button class="btn primary" id="run">解析</button>' +
              '<button class="btn" id="demo">示例</button></div></div>' +
          '</div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">只在浏览器里做 Base64URL 解码与 HMAC 验签，token 不会发出去。RS256 / ES256 这类非对称签名需要公钥，这里不验，只显示结构。</div>';

      var tok = TB.$('#tok', root), out = TB.$('#out', root), secret = TB.$('#secret', root);

      function b64url(s) {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        return atob(s);
      }
      function utf8(bin) {
        try {
          return decodeURIComponent(Array.prototype.map.call(bin, function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
        } catch (e) { return bin; }
      }
      function pretty(o) {
        return JSON.stringify(o, null, 2);
      }
      function timeCell(v, kind) {
        if (typeof v !== 'number') return '';
        var d = new Date(v * 1000);
        var past = v * 1000 < Date.now();
        /* iat 天然在过去，只有 exp / nbf 需要判状态 */
        var flag = kind === 'exp' ? (past ? '已过期' : '未过期')
          : kind === 'nbf' ? (past ? '已生效' : '未生效') : '';
        return d.toLocaleString('zh-CN') + (flag ? '（' + flag + '）' : '');
      }

      async function verify(alg, signingInput, sigB64, key) {
        var map = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
        var hash = map[alg];
        if (!hash) return { ok: false, msg: '不支持的算法：' + alg + '（这里只验证 HMAC 系列）' };
        var kb = new TextEncoder().encode(key);
        var k = await crypto.subtle.importKey('raw', kb, { name: 'HMAC', hash: hash }, false, ['sign']);
        var mac = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(signingInput));
        var macB64 = btoa(Array.prototype.map.call(new Uint8Array(mac), function (x) {
          return String.fromCharCode(x);
        }).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        var given = sigB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return { ok: macB64 === given, b64: macB64 };
      }

      async function run() {
        var raw = tok.value.trim().replace(/^Bearer\s+/i, '');
        out.innerHTML = '';
        if (!raw) { out.innerHTML = '<div class="result-err">先粘贴 token</div>'; return; }
        var parts = raw.split('.');
        if (parts.length !== 3) { out.innerHTML = '<div class="result-err">不是标准 JWT：应该用两个点分成三段，现在是 ' + parts.length + ' 段</div>'; return; }
        var header, payload;
        try {
          header = JSON.parse(utf8(b64url(parts[0])));
          payload = JSON.parse(utf8(b64url(parts[1])));
        } catch (e) {
          out.innerHTML = '<div class="result-err">前两段不是合法 JSON：' + TB.esc(e.message) + '</div>'; return;
        }

        var timeRows = [['iat', '签发时间'], ['nbf', '生效时间'], ['exp', '过期时间']]
          .filter(function (x) { return payload[x[0]] !== undefined; })
          .map(function (x) { return '<div class="kvRow"><span>' + x[1] + '（' + x[0] + '）</span><b>' + TB.esc(timeCell(payload[x[0]], x[0])) + '</b></div>'; })
          .join('');

        var sigInfo = '';
        if (secret.value) {
          var r = await verify(header.alg, parts[0] + '.' + parts[1], parts[2], secret.value);
          sigInfo = r.msg ? '<div class="result-err">' + TB.esc(r.msg) + '</div>' : '<div class="kvTable" style="margin-top:12px">' +
            '<div class="kvRow"><span>签名校验</span><b class="' + (r.ok ? 'ok' : 'bad') + '">' + (r.ok ? '通过' : '不通过') + '</b></div>' +
            '<div class="kvRow"><span>计算结果</span><b class="mono">' + TB.esc(r.b64 || '') + '</b></div></div>';
        }

        out.innerHTML =
          '<div class="kvTable" style="margin-bottom:12px">' +
            '<div class="kvRow"><span>算法</span><b>' + TB.esc(header.alg || '—') + '</b></div>' +
            '<div class="kvRow"><span>类型</span><b>' + TB.esc(header.typ || '—') + '</b></div>' +
          '</div>' +
          '<div class="label"><b>Header</b></div><pre class="codeBox">' + TB.esc(pretty(header)) + '</pre>' +
          '<div class="label" style="margin-top:12px"><b>Payload</b></div><pre class="codeBox">' + TB.esc(pretty(payload)) + '</pre>' +
          (timeRows ? '<div class="kvTable" style="margin-top:12px">' + timeRows + '</div>' : '') +
          sigInfo;
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#demo', root).addEventListener('click', function () {
        /* 自造一个 HS256 token 并用真签名贴上，示例一定能通过验签 */
        function b64u(obj) {
          var bytes = new TextEncoder().encode(JSON.stringify(obj));
          return btoa(Array.prototype.map.call(bytes, function (x) { return String.fromCharCode(x); }).join(''))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        var h = b64u({ alg: 'HS256', typ: 'JWT' });
        var p = b64u({
          sub: '1234567890', name: '简单工具箱', iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        });
        secret.value = 'demo-secret';
        var input = h + '.' + p;
        crypto.subtle.importKey('raw', new TextEncoder().encode('demo-secret'),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']).then(function (k) {
            return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(input));
          }).then(function (mac) {
            var s = btoa(Array.prototype.map.call(new Uint8Array(mac), function (x) {
              return String.fromCharCode(x);
            }).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            tok.value = input + '.' + s;
            run();
          });
      });
    }
  });

  /* ---------------------------------------------------------- 2. YAML ⇄ JSON */
  TB.def({
    slug: 'yaml', cat: 'web', name: 'YAML ⇄ JSON', desc: '配置互转 · 报错定位', icon: '📑',
    kw: 'yaml yml json 转换 配置 k8s docker compose',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>输入</b></div>' +
              '<textarea class="textarea codeIn" id="src" rows="12">server:\n  port: 8080\n  hosts:\n    - a.example.com\n    - b.example.com\nfeature:\n  enabled: true\n  ratio: 0.75</textarea></div>' +
            '<div class="field"><div class="label"><b>输出</b></div>' +
              '<textarea class="textarea codeIn" id="dst" rows="12" readonly></textarea></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="y2j">YAML → JSON</button>' +
            '<button class="btn" id="j2y">JSON → YAML</button>' +
            '<button class="btn" id="copy">复制结果</button>' +
            '<button class="btn" id="dl">下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">解析用 js-yaml（本地 38KB，按需加载）。支持锚点、引用、多行文本；报错会给出具体行列，方便查缩进问题。</div>';

      var src = TB.$('#src', root), dst = TB.$('#dst', root), msg = TB.$('#msg', root);

      async function lib() {
        await TB.loadLib('js-yaml.min.js');
        return window.jsyaml;
      }
      function status(text, isErr) {
        msg.innerHTML = text ? '<div class="' + (isErr ? 'result-err' : 'note') + '" style="margin-top:12px">' + TB.esc(text) + '</div>' : '';
      }

      TB.$('#y2j', root).addEventListener('click', async function () {
        try {
          var Y = await lib();
          var obj = Y.load(src.value);
          dst.value = JSON.stringify(obj, null, 2);
          status('转换成功。');
        } catch (e) {
          dst.value = '';
          status('YAML 解析失败：' + e.message, true);
        }
      });

      TB.$('#j2y', root).addEventListener('click', async function () {
        try {
          var Y = await lib();
          var obj = JSON.parse(src.value);
          dst.value = Y.dump(obj, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
          status('转换成功。');
        } catch (e) {
          dst.value = '';
          status('JSON 解析失败：' + e.message, true);
        }
      });

      TB.$('#copy', root).addEventListener('click', function () { TB.copy(dst.value); });
      TB.$('#dl', root).addEventListener('click', function () {
        if (!dst.value) { TB.toast('先转换一次'); return; }
        TB.downloadText(dst.value, dst.value.trim().charAt(0) === '{' || dst.value.trim().charAt(0) === '[' ? 'data.json' : 'data.yaml');
      });

      /* 打开工具就转一次，避免右边空白让人以为坏了 */
      TB.$('#y2j', root).click();
    }
  });

  /* ---------------------------------------------------------- 3. SQL 格式化 */
  var SQL_KEYS = ('SELECT FROM WHERE GROUP BY ORDER BY HAVING LIMIT OFFSET JOIN LEFT RIGHT INNER OUTER ON ' +
    'AND OR NOT IN EXISTS BETWEEN LIKE IS NULL UNION ALL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ' +
    'ALTER ADD DROP PRIMARY KEY FOREIGN REFERENCES DEFAULT CASE WHEN THEN ELSE END AS DISTINCT COUNT SUM AVG ' +
    'MIN MAX ASC DESC RETURNING').split(' ');

  TB.def({
    slug: 'sql', cat: 'web', name: 'SQL 格式化', desc: '美化 · 参数填充', icon: '🧾',
    kw: 'sql 格式化 美化 参数 占位符 ? 填充 mysql',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>SQL</b></div>' +
            '<textarea class="textarea codeIn" id="src" rows="9">select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.status=1 and u.created_at between ? and ? group by u.id,u.name order by orders desc limit 20</textarea></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">参数（用 ? 时：逗号分隔；用 :name 时：JSON 对象）</div>' +
              '<input class="input" id="params" value="\'2024-01-01\',\'2024-12-31\'" autocomplete="off"></div>' +
            '<div class="field"><div class="label">缩进</div>' +
              '<select class="input" id="indent"><option value="2" selected>2 空格</option><option value="4">4 空格</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="fmt">格式化</button>' +
            '<button class="btn" id="fill">填充参数</button>' +
            '<button class="btn" id="copy">复制结果</button></div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>结果</b></div>' +
            '<textarea class="textarea codeIn" id="dst" rows="12" readonly></textarea></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">格式化按关键字换行与缩进，字符串里的内容不会被改动；参数填充只替换字符串与注释之外的占位符。</div>';

      var src = TB.$('#src', root), dst = TB.$('#dst', root), msg = TB.$('#msg', root);

      /* 把字符串/反引号/注释先抽出成占位符，避免格式化时被误伤 */
      function protect(sql) {
        var slots = [];
        var out = sql.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`|--[^\n]*|\/\*[\s\S]*?\*\/)/g, function (m) {
          slots.push(m);
          return '\u0000' + (slots.length - 1) + '\u0001';
        });
        return { text: out, slots: slots };
      }
      function restore(s, slots) {
        return s.replace(/\u0000(\d+)\u0001/g, function (_, i) { return slots[+i]; });
      }

      function format(sql, indentWidth) {
        var p = protect(sql.trim().replace(/\s+/g, ' '));
        var t = p.text;
        var ind = new Array(indentWidth + 1).join(' ');

        /* 关键字统一大写（只在词边界上） */
        var kwRe = new RegExp('\\b(' + SQL_KEYS.join('|') + ')\\b', 'gi');
        t = t.replace(kwRe, function (m) { return m.toUpperCase(); });

        /* 主语句换行：一次替换完成，长的词组排在前面，
           否则 JOIN 会先把 LEFT JOIN 拆成 "LEFT\nJOIN" */
        var phrases = ['LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
          'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN',
          'UNION ALL', 'GROUP BY', 'ORDER BY', 'INSERT INTO', 'DELETE FROM',
          'SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'ON',
          'VALUES', 'UPDATE', 'SET', 'UNION', 'JOIN', 'RETURNING'];
        var breakRe = new RegExp('\\s(' + phrases.join('|') + ')\\b', 'g');
        t = t.replace(breakRe, '\n$1');
        t = t.trim();

        /* SELECT 后面的字段单独成行（DISTINCT 也跟着一起下移） */
        t = t.replace(/\bSELECT\b/g, 'SELECT\n');

        /* 只对括号外的逗号换行：COUNT(a, b)、IN (1,2,3) 保持原样 */
        var depth = 0, out2 = '';
        for (var ci = 0; ci < t.length; ci++) {
          var ch = t.charAt(ci);
          if (ch === '(') depth++;
          if (ch === ')') depth = Math.max(0, depth - 1);
          if (ch === ',' && depth === 0) out2 += ',\n';
          else out2 += ch;
        }

        /* 逐行归一：子句头贴左，字段 / 连接条件缩进一层 */
        var lines = out2.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); })
          .filter(function (l) { return l; });
        lines = lines.map(function (l) {
          if (/^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION|UNION ALL|VALUES|UPDATE|SET|INSERT|DELETE|RETURNING)\b/.test(l)) return l;
          return ind + l;
        });
        t = lines.join('\n');

        return restore(t, p.slots);
      }

      function fillParams(sql, paramsText) {
        var p = protect(sql);
        var t = p.text;
        /* JSON 对象形式：:name / @name */
        try {
          var map = JSON.parse(paramsText);
          if (map && typeof map === 'object') {
            t = t.replace(/[:@][A-Za-z_][A-Za-z0-9_]*/g, function (m) {
              var k = m.slice(1);
              if (!(k in map)) return m;
              var v = map[k];
              return typeof v === 'string' ? "'" + v.replace(/'/g, "''") + "'" : String(v);
            });
            return restore(t, p.slots);
          }
        } catch (e) { /* 不是 JSON，按位置参数处理 */ }

        /* 顺序占位符 ? */
        var vals = splitValues(paramsText);
        var i = 0;
        t = t.replace(/\?/g, function () {
          if (i >= vals.length) return '?';
          return vals[i++];
        });
        return restore(t, p.slots);
      }

      /* 逗号分隔但要尊重引号：'a,b', 123, "x" */
      function splitValues(s) {
        var out = [], cur = '', q = null;
        for (var i = 0; i < s.length; i++) {
          var ch = s.charAt(i);
          if (q) {
            cur += ch;
            if (ch === q && s.charAt(i - 1) !== '\\') q = null;
          } else if (ch === '\'' || ch === '"') {
            q = ch; cur += ch;
          } else if (ch === ',' || ch === '，') {
            out.push(cur.trim()); cur = '';
          } else cur += ch;
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
      }

      function status(text, isErr) {
        msg.innerHTML = text ? '<div class="' + (isErr ? 'result-err' : 'note') + '" style="margin-top:10px">' + TB.esc(text) + '</div>' : '';
      }

      TB.$('#fmt', root).addEventListener('click', function () {
        if (!src.value.trim()) { status('先写点 SQL', true); return; }
        try {
          dst.value = format(src.value, parseInt(TB.$('#indent', root).value, 10));
          status('');
        } catch (e) { status('格式化失败：' + e.message, true); }
      });
      TB.$('#fill', root).addEventListener('click', function () {
        if (!src.value.trim()) { status('先写点 SQL', true); return; }
        try {
          dst.value = fillParams(src.value, TB.$('#params', root).value);
          status('');
        } catch (e) { status('填充失败：' + e.message, true); }
      });
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(dst.value); });
      TB.$('#fmt', root).click();
    }
  });

  /* ---------------------------------------------------------- 4. 条码生成 */
  TB.def({
    slug: 'barcode', cat: 'web', name: '条码生成', desc: 'Code128 / EAN / Code39', icon: '▮▯',
    kw: '条码 条形码 barcode code128 ean13 code39 upc 扫码',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>内容</b></div>' +
              '<input class="input" id="text" value="CTOOL-2026" autocomplete="off"></div>' +
            '<div class="field"><div class="label">格式</div><select class="input" id="fmt">' +
              '<option value="CODE128" selected>Code 128（任意字母数字）</option>' +
              '<option value="EAN13">EAN-13（12 或 13 位数字）</option>' +
              '<option value="EAN8">EAN-8（7 或 8 位数字）</option>' +
              '<option value="CODE39">Code 39（大写字母数字）</option>' +
              '<option value="ITF14">ITF-14（13 或 14 位数字）</option>' +
              '<option value="UPC">UPC-A（11 或 12 位数字）</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">条宽（px）</div><input class="input" id="w" type="number" value="2" min="1" max="6"></div>' +
            '<div class="field"><div class="label">高度（px）</div><input class="input" id="h" type="number" value="90" min="40" max="240"></div>' +
            '<div class="field"><div class="label">选项</div>' +
              '<label class="chk"><input type="checkbox" id="show" checked> 显示数值</label></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="dl">下载 PNG</button></div>' +
          '<div class="barcodeBox"><canvas id="bc"></canvas></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">用 JsBarcode 生成（MIT，59KB，按需加载）。EAN/UPC 会按规则自动补校验位；内容不符合格式会直接报错，不会画出一张扫不出来的条码。</div>';

      var cv = TB.$('#bc', root), msg = TB.$('#msg', root);

      async function render() {
        var text = TB.$('#text', root).value.trim();
        if (!text) { msg.innerHTML = '<div class="result-err">内容不能为空</div>'; return false; }
        await TB.loadLib('jsbarcode.min.js');
        try {
          window.JsBarcode(cv, text, {
            format: TB.$('#fmt', root).value,
            width: Math.max(1, parseInt(TB.$('#w', root).value, 10) || 2),
            height: Math.max(40, parseInt(TB.$('#h', root).value, 10) || 90),
            displayValue: TB.$('#show', root).checked,
            margin: 12,
            font: 'system-ui',
            background: '#ffffff',
            lineColor: '#111111'
          });
          msg.innerHTML = '<div class="note">已生成 ' + cv.width + ' × ' + cv.height + ' 的条码。</div>';
          return true;
        } catch (e) {
          msg.innerHTML = '<div class="result-err">生成失败：' + TB.esc(e.message || '格式或内容不合法') + '</div>';
          return false;
        }
      }

      TB.$('#run', root).addEventListener('click', render);
      TB.$('#dl', root).addEventListener('click', async function () {
        if (await render()) TB.downloadCanvas(cv, '条码-' + TB.$('#fmt', root).value + '.png', 'image/png');
      });
      ['#fmt', '#text'].forEach(function (sel) {
        TB.$(sel, root).addEventListener('change', render);
      });
      render();
    }
  });

  /* ---------------------------------------------------------- 5. CRC 校验 */
  TB.def({
    slug: 'crc', cat: 'web', name: 'CRC 校验', desc: 'CRC32 / 16 / 8', icon: '🧮',
    kw: 'crc crc32 crc16 modbus ccitt 校验 校验码 冗余',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>数据</b></div>' +
            '<textarea class="textarea codeIn" id="src" rows="6">hello world</textarea></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">输入格式</div><select class="input" id="mode">' +
              '<option value="text" selected>文本（按 UTF-8）</option>' +
              '<option value="hex">十六进制字节（48 65 6C 空格分隔）</option></div>' +
            '<div class="field"><div class="label">计算方式</div>' +
              '<label class="chk"><input type="checkbox" id="live" checked> 输入时自动计算</label></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">计算</button></div>' +
          '<div id="out" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">CRC32（IEEE，ZIP/PNG 用的那个）、CRC16/MODBUS、CRC16/CCITT-FALSE、CRC8 都按标准参数实现，结果可直接贴到协议文档里核对。</div>';

      var src = TB.$('#src', root), out = TB.$('#out', root), mode = TB.$('#mode', root);

      function crc32(bytes) {
        var table = [], c, n, k;
        for (n = 0; n < 256; n++) {
          c = n;
          for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
          table[n] = c >>> 0;
        }
        var crc = 0xFFFFFFFF;
        for (var i = 0; i < bytes.length; i++) {
          crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
        }
        return ((crc ^ 0xFFFFFFFF) >>> 0);
      }

      /* 反射式 16 位（MODBUS） */
      function crc16modbus(bytes) {
        var crc = 0xFFFF;
        for (var i = 0; i < bytes.length; i++) {
          crc ^= bytes[i];
          for (var j = 0; j < 8; j++) {
            crc = (crc & 1) ? ((crc >>> 1) ^ 0xA001) : (crc >>> 1);
          }
        }
        return crc & 0xFFFF;
      }

      /* 非反射 16 位（CCITT-FALSE） */
      function crc16ccitt(bytes) {
        var crc = 0xFFFF;
        for (var i = 0; i < bytes.length; i++) {
          crc ^= (bytes[i] << 8);
          for (var j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
          }
        }
        return crc;
      }

      function crc8(bytes) {
        var crc = 0x00;
        for (var i = 0; i < bytes.length; i++) {
          crc ^= bytes[i];
          for (var j = 0; j < 8; j++) {
            crc = (crc & 0x80) ? (((crc << 1) ^ 0x07) & 0xFF) : ((crc << 1) & 0xFF);
          }
        }
        return crc;
      }

      function toBytes() {
        var v = src.value;
        if (mode.value === 'hex') {
          var clean = v.replace(/[^0-9a-fA-F]/g, '');
          if (clean.length % 2) throw new Error('十六进制位数必须是偶数（现在是 ' + clean.length + '）');
          var arr = [];
          for (var i = 0; i < clean.length; i += 2) arr.push(parseInt(clean.substr(i, 2), 16));
          return arr;
        }
        return Array.prototype.map.call(new TextEncoder().encode(v), function (b) { return b; });
      }

      function hex(n, pad) {
        var s = n.toString(16).toUpperCase();
        while (s.length < pad) s = '0' + s;
        return s;
      }

      function run() {
        var bytes;
        try { bytes = toBytes(); }
        catch (e) { out.innerHTML = '<div class="result-err">' + TB.esc(e.message) + '</div>'; return; }
        var rows = [
          ['CRC32（IEEE）', hex(crc32(bytes), 8)],
          ['CRC16 / MODBUS', hex(crc16modbus(bytes), 4)],
          ['CRC16 / CCITT-FALSE', hex(crc16ccitt(bytes), 4)],
          ['CRC8', hex(crc8(bytes), 2)]
        ];
        out.innerHTML = '<div class="kvTable">' + rows.map(function (r) {
          return '<div class="kvRow"><span>' + r[0] + '</span><b class="mono">' + r[1] + '</b></div>';
        }).join('') + '</div>' +
          '<div class="note" style="margin-top:8px">共 ' + bytes.length + ' 字节。CRC32 的十进制值：' + crc32(bytes) + '。</div>';
      }

      TB.$('#run', root).addEventListener('click', run);
      var deb = TB.debounce(run, 250);
      src.addEventListener('input', function () { if (TB.$('#live', root).checked) deb(); });
      mode.addEventListener('change', run);
      run();
    }
  });

  /* ---------------------------------------------------------- 6. LRC 转字幕 */
  TB.def({
    slug: 'lrc', cat: 'doc', name: '歌词转字幕', desc: 'LRC → SRT / VTT', icon: '🎵',
    kw: 'lrc 歌词 字幕 srt vtt 时间轴 转换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>LRC 歌词</b></div>' +
              '<textarea class="textarea codeIn" id="src" rows="12">[ti:示例歌曲]\n[00:12.50]第一句歌词\n[00:18.20]第二句歌词\n[00:24.00][01:30.00]这一句重复出现</textarea></div>' +
            '<div class="field"><div class="label"><b>字幕</b></div>' +
              '<textarea class="textarea codeIn" id="dst" rows="12" readonly></textarea></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">输出格式</div><select class="input" id="fmt">' +
              '<option value="srt" selected>SRT（播放器通用）</option><option value="vtt">WebVTT（网页用）</option></select></div>' +
            '<div class="field"><div class="label">每条显示时长（秒）</div>' +
              '<input class="input" id="dur" type="number" value="3" min="0.5" step="0.5"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">转换</button>' +
            '<button class="btn" id="dl">下载字幕</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">支持一行多个时间标签（副歌重复）、[offset:] 偏移；没有时间标签的元数据行会被忽略。时长到了下一句还没结束的，按设定值截断。</div>';

      var src = TB.$('#src', root), dst = TB.$('#dst', root), msg = TB.$('#msg', root);

      function toSec(mm, ss, frac) {
        var f = frac ? parseFloat('0.' + frac) : 0;
        return parseInt(mm, 10) * 60 + parseInt(ss, 10) + f;
      }
      function stamp(sec, sep) {
        sec = Math.max(0, sec);
        var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
        var ms = Math.round((sec - Math.floor(sec)) * 1000);
        if (ms === 1000) { ms = 0; s++; if (s === 60) { s = 0; m++; if (m === 60) { m = 0; h++; } } }
        return (h < 10 ? '0' : '') + h + ':' + TB.pad2(m) + ':' + TB.pad2(s) + sep + (ms < 100 ? (ms < 10 ? '00' : '0') : '') + ms;
      }

      function parse(text) {
        var offset = 0, items = [];
        text.split(/\r?\n/).forEach(function (line) {
          var om = line.match(/^\s*\[offset:\s*([+-]?\d+(?:\.\d+)?)\s*\]/i);
          if (om) offset = parseFloat(om[1]) / 1000;
          var tags = [], re = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g, m;
          while ((m = re.exec(line))) tags.push({ at: toSec(m[1], m[2], m[3]), idx: m.index, len: m[0].length });
          if (!tags.length) return;
          var text2 = line.replace(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').trim();
          tags.forEach(function (t) { items.push({ at: t.at + offset, text: text2 }); });
        });
        items.sort(function (a, b) { return a.at - b.at; });
        return items;
      }

      function build() {
        var items = parse(src.value);
        if (!items.length) { msg.innerHTML = '<div class="result-err">没有找到 [分:秒] 形式的时间标签</div>'; dst.value = ''; return; }
        var dur = Math.max(0.5, parseFloat(TB.$('#dur', root).value) || 3);
        var fmt = TB.$('#fmt', root).value;
        var blocks = items.map(function (it, i) {
          var next = i + 1 < items.length ? items[i + 1].at : it.at + dur;
          var end = Math.min(next, it.at + dur);
          if (end <= it.at) end = it.at + dur;
          return { start: it.at, end: end, text: it.text };
        }).filter(function (b) { return b.text; });

        if (fmt === 'vtt') {
          dst.value = 'WEBVTT\n\n' + blocks.map(function (b, i) {
            return (i + 1) + '\n' + stamp(b.start, '.') + ' --> ' + stamp(b.end, '.') + '\n' + b.text;
          }).join('\n\n') + '\n';
        } else {
          dst.value = blocks.map(function (b, i) {
            return (i + 1) + '\n' + stamp(b.start, ',') + ' --> ' + stamp(b.end, ',') + '\n' + b.text;
          }).join('\n\n') + '\n';
        }
        msg.innerHTML = '<div class="note">共 ' + blocks.length + ' 条字幕。</div>';
      }

      TB.$('#run', root).addEventListener('click', build);
      TB.$('#dl', root).addEventListener('click', function () {
        if (!dst.value) build();
        if (!dst.value) return;
        var fmt = TB.$('#fmt', root).value;
        TB.downloadText(dst.value, 'subtitles.' + fmt, fmt === 'vtt' ? 'text/vtt' : 'text/plain');
      });
      build();
    }
  });

  /* ---------------------------------------------------------- 7. HTTP 请求片段 */
  TB.def({
    slug: 'http-snippet', cat: 'web', name: '请求片段生成', desc: 'curl / fetch / Python', icon: '📡',
    kw: 'http 请求 curl fetch axios python 代码 片段 接口',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>方法</b></div><select class="input" id="method">' +
              '<option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></div>' +
            '<div class="field"><div class="label">URL</div>' +
              '<input class="input" id="url" value="https://api.example.com/v1/items" autocomplete="off"></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">请求头 <span style="color:var(--ink-3)">每行 Key: Value</span></div>' +
              '<textarea class="textarea codeIn" id="headers" rows="4">Content-Type: application/json\nAuthorization: Bearer &lt;token&gt;</textarea></div>' +
            '<div class="field"><div class="label">请求体</div>' +
              '<textarea class="textarea codeIn" id="body" rows="4">{"name":"test","page":1}</textarea></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">语言</div><select class="input" id="lang">' +
              '<option value="curl" selected>cURL（bash）</option><option value="fetch">fetch（Node / 浏览器）</option>' +
              '<option value="python">Python requests</option><option value="axios">axios</option><option value="go">Go net/http</option></select></div>' +
            '<div class="field"><div class="label">操作</div><div class="btns" style="margin:0">' +
              '<button class="btn primary" id="run">生成</button><button class="btn" id="copy">复制</button></div></div>' +
          '</div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>代码</b></div>' +
            '<pre class="codeBox" id="out"></pre></div>' +
        '</div>' +
        '<div class="note">把接口文档里的 curl 换成任何语言的写法。请求头、请求体原样带进去，不做格式猜测。</div>';

      var out = TB.$('#out', root);

      function parseHeaders(text) {
        var h = [];
        text.split(/\r?\n/).forEach(function (line) {
          var m = line.match(/^\s*([^:#]+?)\s*:\s*(.*)$/);
          if (m) h.push([m[1].trim(), m[2].trim()]);
        });
        return h;
      }
      function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
      function jq(s) { return JSON.stringify(String(s)); }

      function build() {
        var method = TB.$('#method', root).value;
        var url = TB.$('#url', root).value.trim() || 'https://';
        var headers = parseHeaders(TB.$('#headers', root).value);
        var body = TB.$('#body', root).value;
        var lang = TB.$('#lang', root).value;
        var hasBody = method !== 'GET' && body.trim();

        if (lang === 'curl') {
          var parts = ['curl -X ' + method + ' ' + q(url)];
          headers.forEach(function (h) { parts.push('  -H ' + q(h[0] + ': ' + h[1])); });
          if (hasBody) parts.push('  --data-raw ' + q(body.trim()));
          return parts.join(' \\\n');
        }
        if (lang === 'fetch') {
          var obj = {
            method: method,
            headers: headers.reduce(function (a, h) { a[h[0]] = h[1]; return a; }, {})
          };
          if (hasBody) obj.body = body.trim();
          var head = 'const res = await fetch(' + jq(url) + ', ' + JSON.stringify(obj, null, 2)
            .replace(/"([^"]+)":/g, function (_, k) { return /^[A-Za-z_$][\w$]*$/.test(k) ? k + ':' : '"' + k + '":'; })
            + ');';
          return head + '\nconst data = await res.json();\nconsole.log(data);';
        }
        if (lang === 'python') {
          var lines = ['import requests', '', 'url = ' + jq(url)];
          if (headers.length) lines.push('headers = {\n' + headers.map(function (h) {
            return '    ' + jq(h[0]) + ': ' + jq(h[1]) + ',';
          }).join('\n') + '\n}');
          if (hasBody) {
            lines.push('payload = ' + jq(body.trim()));
            lines.push('res = requests.' + method.toLowerCase() + '(url, headers=headers, data=payload, timeout=15)');
          } else {
            lines.push('res = requests.' + method.toLowerCase() + '(url, headers=headers, timeout=15)');
          }
          lines.push('print(res.status_code, res.text)');
          return lines.join('\n');
        }
        if (lang === 'axios') {
          var cfg = ['  method: ' + jq(method.toLowerCase()), '  url: ' + jq(url)];
          if (headers.length) cfg.push('  headers: ' + JSON.stringify(
            headers.reduce(function (a, h) { a[h[0]] = h[1]; return a; }, {}), null, 2).replace(/\n/g, '\n  '));
          if (hasBody) cfg.push('  data: ' + body.trim());
          return 'const res = await axios({\n' + cfg.join(',\n') + '\n});\nconsole.log(res.data);';
        }
        /* Go */
        var g = ['package main', '', 'import (', '\t"fmt"', '\t"io"'];
        if (hasBody) g.push('\t"net/http"', '\t"strings"');
        else g.push('\t"net/http"');
        g.push(')', '', 'func main() {');
        if (hasBody) g.push('\tbody := strings.NewReader(' + jq(body.trim()) + ')');
        g.push('\treq, _ := http.NewRequest(' + jq(method) + ', ' + jq(url) + ', ' + (hasBody ? 'body' : 'nil') + ')');
        headers.forEach(function (h) { g.push('\treq.Header.Set(' + jq(h[0]) + ', ' + jq(h[1]) + ')'); });
        g.push('\tres, _ := http.DefaultClient.Do(req)', '\tdefer res.Body.Close()',
          '\tb, _ := io.ReadAll(res.Body)', '\tfmt.Println(res.Status, string(b))', '}');
        return g.join('\n');
      }

      function run() { out.textContent = build(); }
      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      ['#method', '#url', '#lang'].forEach(function (s) { TB.$(s, root).addEventListener('change', run); });
      ['#headers', '#body'].forEach(function (s) {
        TB.$(s, root).addEventListener('input', TB.debounce(run, 300));
      });
      TB.$('#url', root).addEventListener('input', TB.debounce(run, 300));
      run();
    }
  });

  /* ---------------------------------------------------------- 8. 进制转换 */
  TB.def({
    slug: 'radix', cat: 'data', name: '进制转换', desc: '2/8/10/16/36 任意进制', icon: '🔢',
    kw: '进制 二进制 八进制 十六进制 三十六进制 radix 转换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>数值</b></div>' +
              '<input class="input mono" id="val" value="255" autocomplete="off" spellcheck="false"></div>' +
            '<div class="field"><div class="label">原进制</div><select class="input" id="from">' +
              '<option value="2">2 进制</option><option value="8">8 进制</option><option value="10" selected>10 进制</option>' +
              '<option value="16">16 进制</option><option value="36">36 进制</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">转换</button>' +
            '<label class="chk"><input type="checkbox" id="upper" checked> 十六进制用大写</label></div>' +
          '<div id="out" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">用 BigInt 解析，整数多大都不丢精度（不像 parseInt 超过 2^53 就会糊）。小数、负数也支持；小数部分只保留 12 位，二进制除不尽的会四舍五入。</div>';

      var val = TB.$('#val', root), out = TB.$('#out', root);
      var upper = true;

      var DIG = '0123456789abcdefghijklmnopqrstuvwxyz';

      function parseBig(s, base) {
        s = String(s).trim().toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        if (!s) throw new Error('没有数值');
        var neg = false;
        if (s.charAt(0) === '-') { neg = true; s = s.slice(1); }
        else if (s.charAt(0) === '+') s = s.slice(1);
        if (base === 16 && /^0x/.test(s)) s = s.slice(2);
        var parts = s.split('.');
        var intPart = parts[0] || '0', fracPart = parts[1] || '';
        var n = 0n, b = BigInt(base);
        for (var i = 0; i < intPart.length; i++) {
          var d = DIG.indexOf(intPart.charAt(i));
          if (d < 0 || d >= base) throw new Error('“' + intPart.charAt(i) + '” 不是 ' + base + ' 进制的数字');
          n = n * b + BigInt(d);
        }
        if (neg) n = -n;
        return { n: n, frac: fracPart, neg: neg };
      }

      function toBase(n, base, frac) {
        var neg = n < 0n;
        var v = neg ? -n : n;
        var b = BigInt(base), s = '';
        if (v === 0n) s = '0';
        while (v > 0n) {
          s = DIG.charAt(Number(v % b)) + s;
          v = v / b;
        }
        var f = '';
        if (frac) {
          var num = 0n, den = 1n;
          for (var i = 0; i < frac.length; i++) {
            var d = DIG.indexOf(frac.charAt(i));
            if (d < 0 || d >= base) throw new Error('小数位“' + frac.charAt(i) + '”不合法');
            num = num * b + BigInt(d);
            den = den * b;
          }
          for (var k = 0; k < 12 && num > 0n; k++) {
            num *= b;
            var q2 = num / den;
            f += DIG.charAt(Number(q2));
            num -= q2 * den;
          }
        }
        return (neg ? '-' : '') + s + (f ? '.' + f : '');
      }

      function group(str, size) {
        return str.replace(new RegExp('(.)(?=(.{' + size + '})+$)', 'g'), '$1 ');
      }

      function run() {
        var base = parseInt(TB.$('#from', root).value, 10);
        var parsed;
        try { parsed = parseBig(val.value, base); }
        catch (e) { out.innerHTML = '<div class="result-err">' + TB.esc(e.message) + '</div>'; return; }

        var n = parsed.n;
        var rows = [2, 8, 10, 16, 36].map(function (b) {
          var s = toBase(n, b, parsed.frac);
          if (b === 16 && upper) s = s.toUpperCase();
          return { base: b, value: s };
        });

        out.innerHTML = '<div class="kvTable">' + rows.map(function (r) {
          var shown = r.value;
          var body = shown.replace('-', '');
          var sign = shown.charAt(0) === '-' ? '-' : '';
          /* 二进制 / 十六进制按 4 位分组，长数字一眼能数清位数 */
          if ((r.base === 2 || r.base === 16) && body.length >= 8) shown = sign + group(body, 4);
          return '<div class="kvRow"><span>' + r.base + ' 进制</span><b class="mono">' + TB.esc(shown) + '</b></div>';
        }).join('') + '</div>' +
          '<div class="note" style="margin-top:8px">十进制位数 ' + toBase(n < 0n ? -n : n, 10, '').length +
          ' · 二进制位数 ' + toBase(n < 0n ? -n : n, 2, '').length + '</div>';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#upper', root).addEventListener('change', function () { upper = this.checked; run(); });
      val.addEventListener('input', TB.debounce(run, 250));
      TB.$('#from', root).addEventListener('change', run);
      run();
    }
  });

})();


