/* =============================================================================
 * JSON → CSV
 * -----------------------------------------------------------------------------
 * 把 JSON 数组转换为 CSV。支持嵌套对象展平、数组字段 JSON 序列化、
 * 逗号 / 制表符 / 分号分隔，下载时带 UTF-8 BOM，Excel 打开中文不乱码。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = JSON.stringify([
    { id: 1, name: '张三', tags: ['前端', '设计'], profile: { city: '安庆', age: 28 } },
    { id: 2, name: '李四', tags: ['后端'], profile: { city: '合肥', age: 32 } },
    { id: 3, name: '王五', tags: [], profile: { city: '上海' } }
  ], null, 2);

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function cellText(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function flattenRow(row, doFlatten) {
    var out = {};
    function walk(obj, prefix) {
      Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        var full = prefix ? prefix + '.' + key : key;
        if (doFlatten && isPlainObject(value)) walk(value, full);
        else out[full] = cellText(value);
      });
    }
    if (isPlainObject(row)) walk(row, '');
    else out.value = cellText(row);
    return out;
  }

  function escapeCell(text, delimiter) {
    var s = String(text == null ? '' : text);
    if (s.indexOf('"') >= 0 || s.indexOf(delimiter) >= 0 || /[\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function toCsv(rows, delimiter, header) {
    var columns = [];
    var seen = {};
    rows.forEach(function (row) {
      Object.keys(row).forEach(function (k) {
        if (!seen[k]) { seen[k] = true; columns.push(k); }
      });
    });
    if (!columns.length) return '';
    var lines = [];
    if (header) lines.push(columns.map(function (c) { return escapeCell(c, delimiter); }).join(delimiter));
    rows.forEach(function (row) {
      lines.push(columns.map(function (c) { return escapeCell(row[c], delimiter); }).join(delimiter));
    });
    return lines.join('\r\n');
  }

  TB.def({
    slug: 'jsoncsv',
    cat: 'data',
    name: 'JSON → CSV',
    desc: 'JSON 数组转 CSV，支持嵌套展平与 Excel 中文编码。',
    icon: '📊',
    kw: 'json csv 转换 导出 excel 表格 数据',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">JSON 输入</div>' +
          '<div class="field"><textarea class="textarea" id="jcIn" spellcheck="false" style="min-height:220px">' + TB.esc(SAMPLE) + '</textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">分隔符</div><select class="select" id="jcSep">' +
              '<option value=",">逗号 ,</option><option value="&#9;">制表符 Tab</option><option value=";">分号 ;</option></select></div>' +
            '<div class="field"><div class="label">文件名</div><input class="input" id="jcName" value="data.csv"></div>' +
          '</div>' +
          '<div class="field"><label class="rg-check"><input type="checkbox" id="jcHeader" checked> 输出表头</label></div>' +
          '<div class="field"><label class="rg-check"><input type="checkbox" id="jcFlatten" checked> 展平嵌套对象（用点号连接字段名）</label></div>' +
          '<div class="btns"><button class="btn primary" id="jcRun" type="button">转换</button>' +
            '<button class="btn" id="jcCopy" type="button">复制 CSV</button>' +
            '<button class="btn" id="jcDownload" type="button">下载 CSV</button></div>' +
          '<div class="hint" id="jcMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">预览</div><pre class="codeBox" id="jcOut" style="max-height:260px;overflow:auto"></pre></div>' +
        '<p class="note">顶层必须是数组（或单个对象 / 单个值）。CSV 采用 RFC 4180 引号转义；下载文件会自动加 UTF-8 BOM。</p>';

      var input = TB.$('#jcIn', root);
      var sep = TB.$('#jcSep', root);
      var header = TB.$('#jcHeader', root);
      var flatten = TB.$('#jcFlatten', root);
      var out = TB.$('#jcOut', root);
      var msg = TB.$('#jcMsg', root);
      var fileName = TB.$('#jcName', root);
      var csvCache = '';

      function build() {
        try {
          var data = JSON.parse(input.value);
          var list = Array.isArray(data) ? data : [data];
          if (!list.length) throw new Error('JSON 数组为空');
          var rows = list.map(function (row) { return flattenRow(row, flatten.checked); });
          csvCache = toCsv(rows, sep.value, header.checked);
          var previewLines = csvCache.split('\r\n').slice(0, 8).join('\n');
          out.textContent = previewLines + (csvCache.split('\r\n').length > 8 ? '\n…' : '');
          msg.textContent = '已转换 ' + rows.length + ' 行，' + (csvCache ? csvCache.split('\r\n').length : 0) + ' 条 CSV 行（含表头）';
          return true;
        } catch (e) {
          csvCache = '';
          out.textContent = '';
          msg.textContent = '解析失败：' + e.message;
          return false;
        }
      }

      function download() {
        if (!build()) return;
        var text = '\uFEFF' + csvCache;
        var name = fileName.value.trim() || 'data.csv';
        if (!/\.csv$/i.test(name)) name += '.csv';
        TB.downloadText(text, name, 'text/csv');
        TB.toast('已开始下载 ' + name);
      }

      TB.$('#jcRun', root).addEventListener('click', build);
      TB.$('#jcCopy', root).addEventListener('click', function () {
        if (build()) TB.copy(csvCache);
      });
      TB.$('#jcDownload', root).addEventListener('click', download);
      [input, sep, header, flatten].forEach(function (el) {
        el.addEventListener('input', build);
        el.addEventListener('change', build);
      });

      build();
    }
  });
})();
