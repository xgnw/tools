/* =============================================================================
 * 表格类工具：CSV ⇄ Excel / JSON 转 Excel / HTML 表格转 Excel / 表格合并 / 表格拆分
 * -----------------------------------------------------------------------------
 * 依赖：SheetJS（xlsx.full.min.js，懒加载）。
 * 全部读写都在浏览器内存里完成，文件不会上传。
 * ========================================================================== */

(function () {

  var XLSX = function () { return window.XLSX; };
  var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  /* 载入 SheetJS；首次调用会注入 <script> */
  async function loadXlsx() {
    await TB.loadLib('xlsx.full.min.js');
    return window.XLSX;
  }

  /* 读一个表格文件 → SheetJS workbook。CSV 走文本解析，xlsx/xls 走二进制解析。 */
  async function readBook(file) {
    var X = await loadXlsx();
    var name = file.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      var text = await readCsvText(file, 'auto');
      return X.read(text, { type: 'string', cellDates: true });
    }
    var buf = await TB.readArrayBuffer(file);
    return X.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  }

  /* CSV 常见两种编码：UTF-8 与 GBK。先按 UTF-8 解，出现替换字符再退回 GBK。 */
  async function readCsvText(file, enc) {
    var buf = await TB.readArrayBuffer(file);
    if (enc === 'gbk') return new TextDecoder('gbk').decode(buf);
    var text = new TextDecoder('utf-8').decode(buf);
    if (enc === 'auto' && /\uFFFD/.test(text)) {
      try { text = new TextDecoder('gbk').decode(buf); } catch (e) {}
    }
    return text.replace(/^\uFEFF/, '');
  }

  /* workbook → 下载（xlsx 二进制） */
  function saveBook(wb, filename) {
    var out = XLSX().write(wb, { bookType: 'xlsx', type: 'array', compression: true });
    TB.download(new Blob([out], { type: XLSX_MIME }), filename);
  }

  /* 用第一张表建一个单表工作簿 */
  function bookFromAoa(aoa, sheetName) {
    var X = XLSX();
    var wb = X.utils.book_new();
    var ws = X.utils.aoa_to_sheet(aoa || []);
    X.utils.book_append_sheet(wb, ws, safeSheetName(sheetName || 'Sheet1'));
    return wb;
  }

  /* Excel 的 sheet 名有长度与字符限制，统一洗一遍 */
  function safeSheetName(name) {
    var s = String(name || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, '_').trim();
    if (!s) s = 'Sheet';
    return s.slice(0, 31);
  }

  /* 工作表 → 二维数组（保留空单元格，日期按显示格式转字符串） */
  function sheetToAoa(ws) {
    return XLSX().utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: true });
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px">' +
      '<span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  /* ------------------------------------------------------------ 1. CSV ⇄ Excel */
  TB.def({
    slug: 'csv-xlsx', cat: 'office', name: 'CSV ⇄ Excel', desc: '表格格式互转', icon: '🔁',
    kw: 'csv xlsx xls excel 转换 表格 导出',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择文件</b><span style="color:var(--ink-3)">.csv 转 Excel，.xlsx / .xls 转 CSV</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label">CSV 编码<span style="color:var(--ink-3)">乱码时手动指定</span></div>' +
            '<select class="select" id="enc">' +
              '<option value="auto">自动识别</option>' +
              '<option value="utf8">UTF-8</option>' +
              '<option value="gbk">GBK / 国标</option>' +
            '</select></div>' +
          '<div class="field"><div class="label"><b>CSV 输出方式</b></div>' +
            '<select class="select" id="mode">' +
              '<option value="each">每个工作表一个 CSV（打包 zip）</option>' +
              '<option value="one">只导出第一张表（单个 CSV）</option>' +
            '</select></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>开始转换</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">CSV 导出会带 UTF-8 BOM，避免 Excel 打开中文变乱码；多个 CSV 也可以一次选中，合成一个工作簿的多张表。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), {
        accept: '.csv,.xlsx,.xls,.txt', multiple: true, hint: '支持 CSV、XLSX、XLS'
      });
      var run = TB.$('#run', root), msg = TB.$('#msg', root), enc = TB.$('#enc', root), mode = TB.$('#mode', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var files = picker.files.map(function (f) { return f.file; });
          var isCsv = files.every(function (f) { return /\.(csv|txt)$/i.test(f.name); });

          if (isCsv) {
            status(msg, '正在读取 CSV…');
            var X = await loadXlsx();
            var wb = X.utils.book_new();
            for (var i = 0; i < files.length; i++) {
              var t = await readCsvText(files[i], enc.value === 'utf8' ? 'utf8' : enc.value);
              var book = X.read(t, { type: 'string', raw: true });
              var ws = book.Sheets[book.SheetNames[0]];
              X.utils.book_append_sheet(wb, ws, safeSheetName(files[i].name.replace(/\.(csv|txt)$/i, '')));
            }
            saveBook(wb, 'csv转excel.xlsx');
            status(msg, '完成：' + files.length + ' 个 CSV 已合并为 ' + wb.SheetNames.length + ' 张表的 Excel。');
          } else {
            if (mode.value === 'one') {
              status(msg, '正在读取…');
              var b1 = await readBook(files[0]);
              var s1 = b1.Sheets[b1.SheetNames[0]];
              var csv = '\uFEFF' + XLSX().utils.sheet_to_csv(s1, { blankrows: false });
              TB.downloadText(csv, safeSheetName(b1.SheetNames[0]) + '.csv', 'text/csv');
              status(msg, '完成：已导出「' + b1.SheetNames[0] + '」为 CSV。');
            } else {
              var entries = [];
              for (var k = 0; k < files.length; k++) {
                status(msg, '正在处理第 ' + (k + 1) + '/' + files.length + ' 个文件…');
                var bk = await readBook(files[k]);
                var prefix = files.length > 1 ? files[k].name.replace(/\.(xlsx|xls)$/i, '') + '_' : '';
                bk.SheetNames.forEach(function (sn) {
                  var csvText = '\uFEFF' + XLSX().utils.sheet_to_csv(bk.Sheets[sn], { blankrows: false });
                  entries.push({ name: prefix + safeSheetName(sn) + '.csv', data: csvText });
                });
              }
              await TB.zipDownload(entries, 'excel转csv.zip');
              status(msg, '完成：共导出 ' + entries.length + ' 个 CSV，已打包下载。');
            }
          }
        } catch (e) {
          status(msg, '转换失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------ 2. JSON 转 Excel */
  TB.def({
    slug: 'json-xlsx', cat: 'office', name: 'JSON 转 Excel', desc: '接口数据一键成表', icon: '🧾',
    kw: 'json excel 表格 接口 数据 导出',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>粘贴 JSON</b><span style="color:var(--ink-3)">数组，或 { 表名: 数组 } 的形式</span></div>' +
            '<textarea class="textarea" id="src" spellcheck="false" placeholder=\'[{"name":"张三","age":28},{"name":"李四","age":31}]\'></textarea></div>' +
          '<div class="field"><div class="label"><b>或者上传 .json 文件</b></div><div id="drop"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成 Excel</button>' +
            '<button class="btn" id="demo">填入示例</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">数组里每个对象是一行，字段名是表头（不同对象的字段会自动求并集）；顶层对象若每个值都是数组，会拆成多张工作表。嵌套对象会转成 JSON 字符串放在一个单元格里。</div>';

      var src = TB.$('#src', root), msg = TB.$('#msg', root);
      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.json,.txt', hint: '单个 JSON 文件' });
      picker.onChange = async function () {
        if (picker.files.length) src.value = await TB.readText(picker.files[0].file);
      };

      TB.$('#demo', root).addEventListener('click', function () {
        src.value = JSON.stringify([
          { name: '张三', age: 28, city: '武汉' },
          { name: '李四', age: 31, city: '上海' },
          { name: '王五', age: 26, city: '深圳' }
        ], null, 2);
      });

      TB.$('#run', root).addEventListener('click', async function () {
        var text = src.value.trim();
        if (!text) { status(msg, '请先粘贴 JSON 或选择文件', true); return; }
        try {
          var data = JSON.parse(text);
          var X = await loadXlsx();
          var wb = X.utils.book_new();

          function addFromArray(arr, name) {
            var cols = [];
            arr.forEach(function (row) {
              if (row && typeof row === 'object' && !Array.isArray(row)) {
                Object.keys(row).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); });
              }
            });
            if (!cols.length) cols = ['值'];
            var aoa = [cols];
            arr.forEach(function (row) {
              if (row && typeof row === 'object' && !Array.isArray(row)) {
                aoa.push(cols.map(function (c) { return cellText(row[c]); }));
              } else {
                aoa.push([cellText(row)]);
              }
            });
            X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), safeSheetName(name));
          }

          if (Array.isArray(data)) {
            addFromArray(data, 'Sheet1');
          } else if (data && typeof data === 'object') {
            Object.keys(data).forEach(function (k) {
              if (Array.isArray(data[k])) addFromArray(data[k], k);
            });
            if (!wb.SheetNames.length) addFromArray([data], 'Sheet1');
          } else {
            addFromArray([{ value: data }], 'Sheet1');
          }

          saveBook(wb, 'json转excel.xlsx');
          status(msg, '完成：' + wb.SheetNames.length + ' 张表，' + wb.SheetNames.map(function (n) {
            return n + '(' + (X.utils.sheet_to_json(wb.Sheets[n], { header: 1 }).length - 1) + ' 行)';
          }).join('、'));
        } catch (e) {
          status(msg, 'JSON 解析失败：' + e.message, true);
        }
      });
    }
  });

  /* 单元格取值：对象/数组转 JSON 字符串，其余转字符串 */
  function cellText(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }

  /* ------------------------------------------------------- 3. HTML 表格转 Excel */
  TB.def({
    slug: 'html-to-xlsx', cat: 'office', name: 'HTML 表格转 Excel', desc: '网页表格导成表', icon: '🌐',
    kw: 'html table excel 表格 网页 导出',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>粘贴 HTML</b><span style="color:var(--ink-3)">含 &lt;table&gt; 的任意片段</span></div>' +
            '<textarea class="textarea" id="src" spellcheck="false" placeholder="<table><tr><th>姓名</th><th>金额</th></tr><tr><td>张三</td><td>1200</td></tr></table>"></textarea></div>' +
          '<div class="field"><div class="label">或上传 .html 文件</div><div id="drop"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run">解析并导出</button>' +
            '<button class="btn" id="demo">填入示例</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">多个 &lt;table&gt; 会分别放进不同工作表；rowspan / colspan 会合并成合并单元格。</div>';

      var src = TB.$('#src', root), msg = TB.$('#msg', root);
      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.html,.htm', hint: '单个 HTML 文件' });
      picker.onChange = async function () {
        if (picker.files.length) src.value = await TB.readText(picker.files[0].file);
      };
      TB.$('#demo', root).addEventListener('click', function () {
        src.value = '<table><tr><th>姓名</th><th>部门</th><th>金额</th></tr>' +
          '<tr><td>张三</td><td>产品</td><td>1200</td></tr>' +
          '<tr><td>李四</td><td>设计</td><td>980</td></tr></table>';
      });

      TB.$('#run', root).addEventListener('click', async function () {
        var html = src.value.trim();
        if (!html) { status(msg, '请先粘贴 HTML', true); return; }
        try {
          var X = await loadXlsx();
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var tables = doc.querySelectorAll('table');
          if (!tables.length) throw new Error('没有找到 <table> 标签');

          var wb = X.utils.book_new();
          Array.prototype.forEach.call(tables, function (tb, ti) {
            var aoa = tableToAoa(tb);
            var ws = X.utils.aoa_to_sheet(aoa);
            /* 还原合并单元格 */
            var merges = collectMerges(tb);
            if (merges.length) ws['!merges'] = merges;
            X.utils.book_append_sheet(wb, ws, safeSheetName('表' + (ti + 1)));
          });
          saveBook(wb, 'html表格.xlsx');
          status(msg, '完成：解析出 ' + tables.length + ' 个表格。');
        } catch (e) {
          status(msg, '解析失败：' + e.message, true);
        }
      });
    }
  });

  /* 把一个 <table> 摊平成二维数组（按行列位置占位，处理 rowspan/colspan） */
  function tableToAoa(table) {
    var rows = Array.prototype.slice.call(table.rows || []);
    var grid = [];
    rows.forEach(function (row, r) {
      if (!grid[r]) grid[r] = [];
      var c = 0;
      Array.prototype.forEach.call(row.cells, function (cell) {
        while (grid[r][c] !== undefined) c++;       /* 跳过被上方 rowspan 占用的格 */
        var text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        var rs = cell.rowSpan || 1, cs = cell.colSpan || 1;
        for (var i = 0; i < rs; i++) {
          if (!grid[r + i]) grid[r + i] = [];
          for (var j = 0; j < cs; j++) grid[r + i][c + j] = (i === 0 && j === 0) ? text : '';
        }
        c += cs;
      });
    });
    return grid;
  }

  /* 根据 rowspan/colspan 生成 SheetJS 的合并区域 */
  function collectMerges(table) {
    var out = [];
    var rows = Array.prototype.slice.call(table.rows || []);
    var offsets = [];
    rows.forEach(function (row, r) {
      var c = 0;
      Array.prototype.forEach.call(row.cells, function (cell) {
        while (offsets[r] && offsets[r][c]) c++;
        var rs = cell.rowSpan || 1, cs = cell.colSpan || 1;
        if (rs > 1 || cs > 1) out.push({ s: { r: r, c: c }, e: { r: r + rs - 1, c: c + cs - 1 } });
        for (var i = 0; i < rs; i++) {
          if (!offsets[r + i]) offsets[r + i] = [];
          for (var j = 0; j < cs; j++) offsets[r + i][c + j] = true;
        }
        c += cs;
      });
    });
    return out;
  }

  /* ------------------------------------------------------------- 4. 表格合并 */
  TB.def({
    slug: 'table-merge', cat: 'office', name: '表格合并', desc: '纵向追加 / 横向并排', icon: '🧩',
    kw: '表格 合并 追加 拼接 excel 多表',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择多个表格</b><span style="color:var(--ink-3)">每个文件取第一张工作表</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>合并方式</b></div>' +
            '<select class="select" id="mode">' +
              '<option value="v">纵向追加（按表头对齐列）</option>' +
              '<option value="h">横向并排（按行号对齐）</option>' +
              '<option value="book">合成一个工作簿（每份一张表）</option>' +
            '</select></div>' +
          '<div class="field"><div class="label">首行是表头 <input type="checkbox" id="hdr" checked style="vertical-align:middle"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>合并并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">纵向追加按「列名」匹配，不同表里顺序不一致也能对上，缺失的列留空；横向并排按行号硬拼，适合拼接同一批数据的不同字段。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), {
        accept: '.xlsx,.xls,.csv', multiple: true, sortable: true, hint: '可多选，顺序可调'
      });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      var mode = TB.$('#mode', root), hdr = TB.$('#hdr', root);
      picker.onChange = function () { run.disabled = picker.files.length < 2; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var X = await loadXlsx();
          var all = [];
          for (var i = 0; i < picker.files.length; i++) {
            status(msg, '读取 ' + (i + 1) + '/' + picker.files.length + '…');
            var bk = await readBook(picker.files[i].file);
            all.push({ name: picker.files[i].file.name, aoa: sheetToAoa(bk.Sheets[bk.SheetNames[0]]) });
          }

          var wb = X.utils.book_new();

          if (mode.value === 'book') {
            all.forEach(function (it, idx) {
              X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(it.aoa),
                safeSheetName(it.name.replace(/\.(xlsx|xls|csv)$/i, '') + (idx > 0 ? '_' + (idx + 1) : '')));
            });
          } else if (mode.value === 'v') {
            var headRow = hdr.checked ? all[0].aoa[0] || [] : [];
            var cols = headRow.map(function (x) { return String(x); });
            var body = [];
            all.forEach(function (it, idx) {
              var rows = it.aoa.slice(hdr.checked ? 1 : 0);
              var mapping;
              if (hdr.checked) {
                var h = (it.aoa[0] || []).map(function (x) { return String(x); });
                mapping = cols.map(function (c) { return h.indexOf(c); });
              } else {
                mapping = cols.map(function (_, ci) { return ci; });
              }
              rows.forEach(function (r) {
                var out = mapping.map(function (mi) { return mi >= 0 ? (r[mi] === undefined ? '' : r[mi]) : ''; });
                body.push(out);
              });
            });
            X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(hdr.checked ? [cols].concat(body) : body), '合并结果');
          } else {
            var maxRows = Math.max.apply(null, all.map(function (it) { return it.aoa.length; }));
            var combined = [];
            for (var r = 0; r < maxRows; r++) {
              var line = [];
              all.forEach(function (it) {
                var row = it.aoa[r] || [];
                line = line.concat(row);
              });
              combined.push(line);
            }
            X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(combined), '横向合并');
          }

          saveBook(wb, '表格合并.xlsx');
          status(msg, '完成：' + all.length + ' 个文件已合并。');
        } catch (e) {
          status(msg, '合并失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------- 5. 表格拆分 */
  TB.def({
    slug: 'table-split', cat: 'office', name: '表格拆分', desc: '按列值或行数拆表', icon: '📑',
    kw: '表格 拆分 分组 excel 按列 拆分',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择表格</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>拆分方式</b></div>' +
            '<select class="select" id="mode">' +
              '<option value="col">按某一列的值拆分</option>' +
              '<option value="rows">按固定行数拆分</option>' +
            '</select></div>' +
          '<div class="field" id="colBox"><div class="label">按哪一列<span style="color:var(--ink-3)">选择后自动读取表头</span></div>' +
            '<select class="select" id="col"><option>请先选择文件</option></select></div>' +
          '<div class="field" id="rowBox" hidden><div class="label">每份行数</div>' +
            '<input class="input" id="rows" type="number" min="1" value="50"></div>' +
          '<div class="field"><div class="label">输出形式</div>' +
            '<select class="select" id="out">' +
              '<option value="sheet">一个文件，多张工作表</option>' +
              '<option value="zip">每个分组一个文件（打包 zip）</option>' +
            '</select></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>开始拆分</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">按列拆分常用于「按部门 / 按地区 / 按月份」把一张大表拆成多份；表头会保留在每一份里。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.xlsx,.xls,.csv', hint: '单个表格文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      var mode = TB.$('#mode', root), colBox = TB.$('#colBox', root), rowBox = TB.$('#rowBox', root);
      var colSel = TB.$('#col', root), outSel = TB.$('#out', root), rowsInp = TB.$('#rows', root);
      var aoa = [];

      picker.onChange = async function () {
        run.disabled = !picker.files.length;
        if (!picker.files.length) return;
        try {
          var bk = await readBook(picker.files[0].file);
          aoa = sheetToAoa(bk.Sheets[bk.SheetNames[0]]);
          var head = aoa[0] || [];
          colSel.innerHTML = head.map(function (h, i) {
            return '<option value="' + i + '">' + TB.esc(String(h || ('第 ' + (i + 1) + ' 列'))) + '</option>';
          }).join('') || '<option value="0">第 1 列</option>';
        } catch (e) {
          status(msg, '读取失败：' + e.message, true);
        }
      };

      mode.addEventListener('change', function () {
        colBox.hidden = mode.value !== 'col';
        rowBox.hidden = mode.value !== 'rows';
      });

      run.addEventListener('click', async function () {
        if (!aoa.length) { status(msg, '请先选择文件', true); return; }
        run.disabled = true;
        try {
          var X = await loadXlsx();
          var head = aoa[0] || [];
          var body = aoa.slice(1);

          if (mode.value === 'col') {
            var ci = parseInt(colSel.value, 10) || 0;
            var groups = {};
            body.forEach(function (r) {
              var key = String(r[ci] === undefined ? '' : r[ci]) || '空值';
              (groups[key] = groups[key] || []).push(r);
            });
            var names = Object.keys(groups);
            if (outSel.value === 'zip') {
              var entries = names.map(function (k) {
                var wb1 = bookFromAoa([head].concat(groups[k]), k);
                var arr = X.write(wb1, { bookType: 'xlsx', type: 'array' });
                return { name: safeSheetName(k) + '.xlsx', blob: new Blob([arr], { type: XLSX_MIME }) };
              });
              await TB.zipDownload(entries, '表格拆分.zip');
              status(msg, '完成：拆成 ' + names.length + ' 个文件，已打包。');
            } else {
              var wb2 = X.utils.book_new();
              names.forEach(function (k) {
                X.utils.book_append_sheet(wb2, X.utils.aoa_to_sheet([head].concat(groups[k])), safeSheetName(k));
              });
              saveBook(wb2, '表格拆分.xlsx');
              status(msg, '完成：拆成 ' + names.length + ' 张工作表。');
            }
          } else {
            var step = Math.max(1, parseInt(rowsInp.value, 10) || 50);
            var parts = [];
            for (var i = 0; i < body.length; i += step) parts.push(body.slice(i, i + step));
            if (outSel.value === 'zip') {
              var ents = parts.map(function (p, i2) {
                var wb3 = bookFromAoa([head].concat(p), 'Sheet1');
                var a3 = X.write(wb3, { bookType: 'xlsx', type: 'array' });
                return { name: '第' + (i2 + 1) + '份.xlsx', blob: new Blob([a3], { type: XLSX_MIME }) };
              });
              await TB.zipDownload(ents, '表格拆分.zip');
              status(msg, '完成：拆成 ' + parts.length + ' 个文件。');
            } else {
              var wb4 = X.utils.book_new();
              parts.forEach(function (p, i4) {
                X.utils.book_append_sheet(wb4, X.utils.aoa_to_sheet([head].concat(p)), safeSheetName('第' + (i4 + 1) + '份'));
              });
              saveBook(wb4, '表格拆分.xlsx');
              status(msg, '完成：拆成 ' + parts.length + ' 张工作表。');
            }
          }
        } catch (e) {
          status(msg, '拆分失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

})();
