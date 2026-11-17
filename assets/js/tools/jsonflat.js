/* =============================================================================
 * JSON 扁平化 ⇄ 反扁平化
 * -----------------------------------------------------------------------------
 * 扁平化：嵌套对象 / 数组压成单层键值，例如 a.b[0].c。
 * 反扁平化：把单层键值还原成嵌套 JSON，数组按 [0]、[1] 还原。
 * 全部在浏览器本地完成，不请求接口。
 * ========================================================================== */

(function () {
  'use strict';

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /* 把任意 JSON 值压成单层键值。数组用 [i]，对象用分隔符。 */
  function flatten(value, sep) {
    var out = {};
    function walk(v, path) {
      if (Array.isArray(v)) {
        if (!v.length) { out[path || 'value'] = []; return; }
        v.forEach(function (item, i) { walk(item, path ? path + '[' + i + ']' : '[' + i + ']'); });
        return;
      }
      if (isPlainObject(v)) {
        var keys = Object.keys(v);
        if (!keys.length) { out[path || 'value'] = {}; return; }
        keys.forEach(function (k) { walk(v[k], path ? path + sep + k : k); });
        return;
      }
      out[path || 'value'] = v;
    }
    walk(value, '');
    return out;
  }

  /* 把 a.b[0].c 解析成 [{key:'a'},{key:'b'},{key:0,index:true},...] */
  function parsePath(key, sep) {
    var tokens = [], buf = '', i = 0;
    while (i < key.length) {
      var ch = key.charAt(i);
      if (ch === '[') {
        if (buf) { tokens.push({ key: buf, index: false }); buf = ''; }
        var end = key.indexOf(']', i);
        if (end < 0) throw new Error('键名「' + key + '」的数组下标缺少 ]');
        var raw = key.slice(i + 1, end);
        if (!/^\d+$/.test(raw)) throw new Error('键名「' + key + '」的数组下标不是数字');
        tokens.push({ key: parseInt(raw, 10), index: true });
        i = end + 1;
      } else if (ch === sep) {
        if (buf) { tokens.push({ key: buf, index: false }); buf = ''; }
        i++;
      } else {
        buf += ch;
        i++;
      }
    }
    if (buf) tokens.push({ key: buf, index: false });
    if (!tokens.length) throw new Error('存在空键名');
    return tokens;
  }

  function unflatten(flat, sep) {
    var root = null;
    Object.keys(flat).forEach(function (key) {
      var tokens = parsePath(key, sep);
      if (root === null) root = tokens[0].index ? [] : {};
      var cur = root;

      tokens.forEach(function (token, i) {
        var last = i === tokens.length - 1;
        var next = tokens[i + 1];
        if (last) {
          if (token.index) {
            if (!Array.isArray(cur)) throw new Error('键「' + key + '」与已有对象结构冲突');
            cur[token.key] = flat[key];
          } else {
            if (!isPlainObject(cur)) throw new Error('键「' + key + '」与已有数组结构冲突');
            cur[token.key] = flat[key];
          }
          return;
        }

        var need = next.index ? [] : {};
        if (token.index) {
          if (!Array.isArray(cur)) throw new Error('键「' + key + '」与已有对象结构冲突');
          if (cur[token.key] === undefined) cur[token.key] = need;
          else if (cur[token.key] === null || typeof cur[token.key] !== 'object') {
            throw new Error('键「' + key + '」存在路径冲突');
          }
          cur = cur[token.key];
        } else {
          if (!isPlainObject(cur)) throw new Error('键「' + key + '」与已有数组结构冲突');
          if (cur[token.key] === undefined) cur[token.key] = need;
          else if (cur[token.key] === null || typeof cur[token.key] !== 'object') {
            throw new Error('键「' + key + '」存在路径冲突');
          }
          cur = cur[token.key];
        }
      });
    });
    return root === null ? {} : root;
  }

  TB.def({
    slug: 'json-flat', cat: 'web', name: 'JSON 扁平化 ⇄ 反扁平化', desc: '嵌套 JSON 与单层键值互转', icon: '🧩',
    kw: 'json flatten 扁平化 反扁平化 嵌套 键值 单层 数组 转换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>转换方向</b></div>' +
              '<select class="select" id="mode">' +
                '<option value="flat">扁平化：嵌套 → 单层</option>' +
                '<option value="unflat">反扁平化：单层 → 嵌套</option>' +
              '</select></div>' +
            '<div class="field"><div class="label"><b>对象键分隔符</b></div>' +
              '<select class="select" id="sep">' +
                '<option value=".">点号 .（a.b.c）</option>' +
                '<option value="_">下划线 _（a_b_c）</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>输入 JSON</b><span style="color:var(--ink-3)">数组用 [0]、[1] 表示</span></div>' +
            '<textarea class="textarea" id="src" spellcheck="false" style="min-height:190px">{' +
              '\n  "user": {' +
              '\n    "name": "张三",' +
              '\n    "tags": ["前端", "工具"]' +
              '\n  },' +
              '\n  "active": true' +
              '\n}</textarea></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="run">开始转换</button>' +
            '<button class="btn" id="copy">复制结果</button>' +
            '<button class="btn" id="dl">下载 JSON</button>' +
            '<button class="btn" id="demo">恢复示例</button>' +
          '</div>' +
          '<div id="msg"></div>' +
          '<div class="out" id="outBox" hidden style="margin-top:14px">' +
            '<div class="out-h"><span class="grow">转换结果</span></div>' +
            '<div class="out-b" id="out"></div>' +
          '</div>' +
        '</div>' +
        '<div class="note">扁平化会保留数组下标；反扁平化按分隔符和 [i] 还原。键名本身含分隔符时无法无损还原，请换一种分隔符。</div>';

      var src = TB.$('#src', root), outBox = TB.$('#outBox', root), out = TB.$('#out', root);
      var msg = TB.$('#msg', root), mode = TB.$('#mode', root), sep = TB.$('#sep', root);
      var SAMPLE = '{\n  "user": {\n    "name": "张三",\n    "tags": ["前端", "工具"]\n  },\n  "active": true\n}';

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function run() {
        var raw = src.value.trim();
        if (!raw) { showMsg('请先输入 JSON'); return; }
        var data;
        try { data = JSON.parse(raw); } catch (e) { showMsg('JSON 解析失败：' + e.message); return; }
        if (data === null || typeof data !== 'object') { showMsg('请输入对象或数组，不要只输入字符串 / 数字'); return; }

        try {
          var result = mode.value === 'flat' ? flatten(data, sep.value) : unflatten(data, sep.value);
          var text = JSON.stringify(result, null, 2);
          outBox.hidden = false;
          out.textContent = text;
          showMsg('');
        } catch (e) {
          outBox.hidden = true;
          showMsg('转换失败：' + e.message);
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#dl', root).addEventListener('click', function () {
        if (!out.textContent) { showMsg('请先转换'); return; }
        TB.downloadText(out.textContent, mode.value === 'flat' ? '扁平化.json' : '反扁平化.json', 'application/json');
      });
      TB.$('#demo', root).addEventListener('click', function () {
        src.value = SAMPLE;
        mode.value = 'flat';
        run();
      });
      mode.addEventListener('change', run);
      sep.addEventListener('change', run);
      run();
    }
  });
})();
