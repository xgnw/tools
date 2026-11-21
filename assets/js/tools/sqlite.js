/* =============================================================================
 * SQLite 查询器
 * -----------------------------------------------------------------------------
 * 把 CSV / JSON 导入浏览器内存里的 SQLite 数据库，直接写 SQL 查询。
 * 数据库和查询结果都只存在当前标签页，刷新即清空；可导出 CSV 或 .sqlite。
 * 依赖：sql.js（MIT）+ sql-wasm.wasm。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE_SQL =
    'CREATE TABLE "sales" ("月份" TEXT, "销售额" REAL, "利润" REAL, "访客" INTEGER);\n' +
    'INSERT INTO "sales" VALUES (\'1月\',128,32,4200),(\'2月\',156,41,4680),(\'3月\',142,36,4510),\n' +
    '(\'4月\',188,55,5300),(\'5月\',205,62,5890),(\'6月\',236,74,6420);\n' +
    'CREATE TABLE "products" ("产品" TEXT, "单价" REAL, "库存" INTEGER);\n' +
    'INSERT INTO "products" VALUES (\'无线键盘\',199,86),(\'显示器支架\',129,54),(\'USB-C 扩展坞\',249,31);';

  var DEFAULT_QUERY =
    'SELECT 月份, 销售额, 利润,\n' +
    '       ROUND(利润 / 销售额 * 100, 1) AS "利润率%" \n' +
    'FROM "sales"\n' +
    'ORDER BY 月份;';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function quoteIdent(name) {
    return '"' + String(name).replace(/"/g, '""') + '"';
  }

  function parseDelimited(text, delim) {
    var src = String(text || '').replace(/\r\n?/g, '\n');
    var rows = [], row = [], field = '', quoted = false;
    for (var i = 0; i < src.length; i++) {
      var ch = src[i];
      if (quoted) {
        if (ch === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += ch;
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === delim) {
        row.push(field); field = '';
      } else if (ch === '\n') {
        row.push(field); field = '';
        if (row.some(function (x) { return x !== ''; })) rows.push(row);
        row = [];
      } else field += ch;
    }
    row.push(field);
    if (row.some(function (x) { return x !== ''; })) rows.push(row);
    return rows;
  }

  function detectDelim(text) {
    var first = String(text || '').split(/\r?\n/).find(function (l) { return l.trim(); }) || '';
    var counts = { ',': 0, '\t': 0, ';': 0 };
    for (var i = 0; i < first.length; i++) if (counts[first[i]] != null) counts[first[i]]++;
    var best = ',';
    Object.keys(counts).forEach(function (k) { if (counts[k] > counts[best]) best = k; });
    return best;
  }

  function uniqueColumns(list) {
    var seen = {};
    return list.map(function (c, i) {
      var base = String(c || '').trim() || ('列' + (i + 1));
      var name = base, n = 1;
      while (seen[name]) { n++; name = base + '_' + n; }
      seen[name] = 1;
      return name;
    });
  }

  function csvData(text, hasHeader) {
    var rows = parseDelimited(text, detectDelim(text));
    if (!rows.length) throw new Error('CSV 没有内容');
    var width = rows[0].length;
    var columns = hasHeader ? uniqueColumns(rows[0]) : uniqueColumns(rows[0].map(function (_, i) { return '列' + (i + 1); }));
    var body = hasHeader ? rows.slice(1) : rows;
    var objects = body.map(function (r) {
      var o = {};
      columns.forEach(function (c, i) { o[c] = r[i] == null ? '' : r[i]; });
      return o;
    });
    return { columns: columns, rows: objects };
  }

  function jsonData(text) {
    var data = JSON.parse(text);
    if (data && !Array.isArray(data) && typeof data === 'object') {
      var key = Object.keys(data).find(function (k) { return Array.isArray(data[k]); });
      if (key) data = data[key];
    }
    if (!Array.isArray(data)) throw new Error('JSON 需要是对象数组，例如 [{"name":"A","value":1}]');
    if (!data.length) throw new Error('JSON 数组为空');
    if (data.every(function (x) { return x === null || typeof x !== 'object'; })) {
      data = data.map(function (x, i) { return { 序号: i + 1, 值: x }; });
    }
    var columns = [];
    data.forEach(function (o) {
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) { if (columns.indexOf(k) < 0) columns.push(k); });
    });
    var rows = data.map(function (o) {
      var r = {};
      columns.forEach(function (c) {
        var v = o && typeof o === 'object' ? o[c] : '';
        r[c] = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      });
      return r;
    });
    return { columns: columns, rows: rows };
  }

  function inferType(values) {
    var non = values.filter(function (v) { return String(v == null ? '' : v).trim() !== ''; });
    if (!non.length) return 'TEXT';
    var allInt = non.every(function (v) { return /^-?(0|[1-9]\d{0,14})$/.test(String(v).trim()); });
    var allNum = non.every(function (v) { return isFinite(Number(String(v).replace(/,/g, ''))); });
    // 超过 15 位的数字、带前导零的编号按文本保存，避免精度丢失
    var keepText = non.some(function (v) { return /^0\d+$/.test(String(v).trim()) || String(v).replace(/\D/g, '').length > 15; });
    if (keepText) return 'TEXT';
    if (allInt) return 'INTEGER';
    if (allNum) return 'REAL';
    return 'TEXT';
  }

  function valueFor(v, type) {
    if (v == null || String(v).trim() === '') return null;
    var s = String(v).trim();
    if (type === 'INTEGER' || type === 'REAL') {
      var n = Number(s.replace(/,/g, ''));
      return isFinite(n) ? n : s;
    }
    return s;
  }

  function tableNameFromFile(file) {
    var base = String(file.name || 'data').replace(/\.(csv|tsv|txt|json)$/i, '');
    base = base.replace(/[^\w\u4e00-\u9fa5]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
    /* SQLite 把 sqlite_ 开头视为内部保留名，用户文件名命中时加前缀避开 */
    if (/^sqlite_/i.test(base)) base = 't_' + base;
    return base || 'data';
  }

  function csvLine(values, columns) {
    var row = columns.map(function (c, i) {
      var v = values[i];
      if (v == null) return '';
      var s = String(v);
      // 只有包含分隔符、引号或换行时才加引号，导出结果更干净
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    });
    return row.join(',');
  }

  TB.def({
    slug: 'sqlite',
    cat: 'data',
    name: 'SQLite 查询器',
    desc: '把 CSV / JSON 导入内存 SQLite，直接写 SQL 查询、导出结果和数据库文件。',
    icon: '🗄️',
    kw: 'SQLite SQL 查询 数据库 CSV JSON 导入 导出 wasm 本地',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">导入数据 <span class="hint">CSV / TSV / JSON，文件名会作为表名</span></div>' +
          '<div id="sqlDrop"></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<div class="field"><div class="label">CSV 选项</div><div class="checks" style="padding-top:6px">' +
              '<label><input type="checkbox" id="sqlHeader" checked> 首行是表头</label></div></div>' +
            '<div class="field"><div class="label">快捷操作</div><div class="btns" style="margin-top:0">' +
              '<button class="btn sm" id="sqlSample" type="button">载入示例表</button>' +
              '<button class="btn sm danger" id="sqlWipe" type="button">清空数据库</button></div></div>' +
          '</div>' +
          '<p class="note" id="sqlImportMsg" style="margin-bottom:0">还没有数据。拖入 CSV / JSON，或先载入示例。</p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">数据表 <span class="hint" id="sqlSchemaHint">—</span></div>' +
          '<div class="sql-schema" id="sqlSchema"><div class="empty" style="padding:18px">数据库还没有表</div></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">SQL 查询 <span class="hint">Ctrl / Cmd + Enter 执行</span></div>' +
          '<textarea class="textarea sql-editor" id="sqlText" rows="8" spellcheck="false"></textarea>' +
          '<div class="btns"><button class="btn primary" id="sqlRun" type="button" disabled>执行查询</button>' +
            '<button class="btn" id="sqlFormat" type="button">恢复示例 SQL</button>' +
            '<button class="btn" id="sqlExportCsv" type="button" disabled>导出结果 CSV</button>' +
            '<button class="btn" id="sqlExportDb" type="button" disabled>导出 .sqlite</button></div>' +
          '<p class="note" id="sqlMsg" style="margin-bottom:0">正在加载 SQLite 引擎…</p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">查询结果 <span class="hint" id="sqlResultHint">—</span></div>' +
          '<div id="sqlResults"><div class="empty" style="padding:22px">执行 SELECT 后在这里查看结果</div></div>' +
        '</div>' +
        '<p class="note">这是运行在当前页面里的完整 SQLite（WebAssembly 版），支持建表、索引、视图、JOIN、窗口函数等常用语法。关闭页面后数据库自动销毁。</p>';

      var drop = TB.$('#sqlDrop', root);
      var headerEl = TB.$('#sqlHeader', root);
      var importMsg = TB.$('#sqlImportMsg', root);
      var schemaEl = TB.$('#sqlSchema', root);
      var schemaHint = TB.$('#sqlSchemaHint', root);
      var textEl = TB.$('#sqlText', root);
      var runBtn = TB.$('#sqlRun', root);
      var sampleBtn = TB.$('#sqlSample', root);
      var wipeBtn = TB.$('#sqlWipe', root);
      var formatBtn = TB.$('#sqlFormat', root);
      var exportCsvBtn = TB.$('#sqlExportCsv', root);
      var exportDbBtn = TB.$('#sqlExportDb', root);
      var msgEl = TB.$('#sqlMsg', root);
      var resultsEl = TB.$('#sqlResults', root);
      var resultHint = TB.$('#sqlResultHint', root);

      var picker = TB.filePicker(drop, {
        accept: '.csv,.tsv,.txt,.json,text/csv,application/json',
        multiple: true,
        hint: 'CSV / TSV / JSON，可多选'
      });
      var SQL = null;
      var db = null;
      var lastResult = null;
      var importing = false;

      function setMsg(html) { msgEl.innerHTML = html; }

      function load() {
        setMsg('正在加载 SQLite 引擎（约 690 KB）…');
        return TB.loadLib('sql-wasm.js').then(function () {
          if (!window.initSqlJs) throw new Error('sql.js 未正确挂载');
          return window.initSqlJs({
            locateFile: function (f) { return 'assets/lib/' + f; }
          });
        }).then(function (sql) {
          SQL = sql;
          db = new SQL.Database();
          runBtn.disabled = false;
          exportDbBtn.disabled = false;
          textEl.value = DEFAULT_QUERY;
          setMsg('引擎已就绪。可以导入数据，或先载入示例表。');
          refreshSchema();
        }).catch(function (e) {
          console.error(e);
          setMsg('<span class="result-err">SQLite 引擎加载失败：' + esc(e.message || e) + '</span>');
        });
      }

      function tableNames() {
        if (!db) return [];
        try {
          // 不用 LIKE 'sqlite_%'：_ 在 LIKE 里是通配符，会误伤 sqlite-test 这类表名
          var r = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
          return r.length ? r[0].values.map(function (v) { return String(v[0]); })
            .filter(function (n) { return n.indexOf('sqlite_') !== 0; }) : [];
        } catch (e) { return []; }
      }

      function refreshSchema() {
        if (!db) return;
        var names = tableNames();
        schemaHint.textContent = names.length ? (names.length + ' 张表') : '—';
        if (!names.length) {
          schemaEl.innerHTML = '<div class="empty" style="padding:18px">数据库还没有表，导入 CSV / JSON 或载入示例</div>';
          return;
        }
        var html = '<div class="sql-tables">';
        names.forEach(function (name) {
          var cols = [];
          var count = 0;
          try {
            cols = db.exec('PRAGMA table_info(' + quoteIdent(name) + ')')[0].values.map(function (r) {
              return { name: r[1], type: r[2] };
            });
            var c = db.exec('SELECT COUNT(*) FROM ' + quoteIdent(name));
            count = c.length ? Number(c[0].values[0][0]) : 0;
          } catch (e) {}
          html += '<div class="sql-table-card"><div class="sql-table-name">' + esc(name) +
            '<span>' + count + ' 行</span></div><div class="sql-cols">' +
            cols.map(function (c) {
              return '<span><b>' + esc(c.name) + '</b><i>' + esc(c.type || 'TEXT') + '</i></span>';
            }).join('') + '</div>' +
            '<button class="btn sm" type="button" data-query="SELECT * FROM ' + esc(quoteIdent(name)) + ' LIMIT 20;">预览 20 行</button></div>';
        });
        html += '</div>';
        schemaEl.innerHTML = html;
        TB.$$('[data-query]', schemaEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            textEl.value = btn.getAttribute('data-query');
            runQuery();
          });
        });
      }

      function createTable(name, data, fileLabel) {
        var base = name;
        var n = 1;
        while (tableNames().indexOf(name) >= 0) {
          n++;
          name = base + '_' + n;
        }
        var cols = data.columns;
        var types = {};
        cols.forEach(function (c) {
          types[c] = inferType(data.rows.map(function (r) { return r[c]; }));
        });
        db.run('CREATE TABLE ' + quoteIdent(name) + ' (' + cols.map(function (c) {
          return quoteIdent(c) + ' ' + types[c];
        }).join(', ') + ')');
        db.run('BEGIN');
        try {
          var stmt = db.prepare('INSERT INTO ' + quoteIdent(name) + ' VALUES (' + cols.map(function () { return '?'; }).join(',') + ')');
          data.rows.forEach(function (r) {
            stmt.run(cols.map(function (c) { return valueFor(r[c], types[c]); }));
          });
          stmt.free();
          db.run('COMMIT');
        } catch (e) {
          db.run('ROLLBACK');
          throw e;
        }
        return { name: name, rows: data.rows.length, cols: cols.length, file: fileLabel };
      }

      function importOne(file) {
        var isJson = /\.json$/i.test(file.name);
        return (isJson ? TB.readText(file).then(function (t) { return jsonData(t); })
          : TB.readText(file).then(function (t) { return csvData(t, headerEl.checked); }))
          .then(function (data) {
            if (!data.columns.length) throw new Error('没有识别到列名');
            if (!data.rows.length) throw new Error('没有数据行');
            return createTable(tableNameFromFile(file), data, file.name);
          });
      }

      function importFiles() {
        if (!db || importing || !picker.files.length) return;
        importing = true;
        importMsg.textContent = '正在导入 ' + picker.files.length + ' 个文件…';
        var list = picker.files.map(function (x) { return x.file; });
        var out = [];
        var chain = Promise.resolve();
        list.forEach(function (file) {
          chain = chain.then(function () {
            return importOne(file).then(function (info) { out.push(info); });
          });
        });
        chain.then(function () {
          importMsg.innerHTML = '<span class="result-ok">已导入 ' + out.length + ' 个表：</span> ' +
            out.map(function (x) { return esc(x.name) + '（' + x.rows + ' 行 / ' + x.cols + ' 列）'; }).join('、');
          refreshSchema();
          if (out.length) {
            textEl.value = 'SELECT * FROM ' + quoteIdent(out[out.length - 1].name) + ' LIMIT 20;';
          }
        }).catch(function (e) {
          console.error(e);
          importMsg.innerHTML = '<span class="result-err">导入失败：' + esc(e.message || e) + '</span>';
        }).then(function () {
          importing = false;
        });
      }

      function renderResults(results) {
        lastResult = null;
        exportCsvBtn.disabled = true;
        if (!results || !results.length) {
          resultsEl.innerHTML = '<div class="result-ok" style="padding:18px">执行成功，没有返回结果集（DDL / DML 已写入当前数据库）。</div>';
          resultHint.textContent = '执行成功';
          refreshSchema();
          return;
        }
        var html = '';
        results.forEach(function (r, ri) {
          if (!r.columns || !r.columns.length) return;
          var total = r.values.length;
          var shown = Math.min(total, 200);
          if (ri === results.length - 1) {
            lastResult = { columns: r.columns, values: r.values };
            exportCsvBtn.disabled = !total;
          }
          html += '<div class="sql-result-block"><div class="sql-result-head">结果 ' + (ri + 1) +
            '<span>' + total + ' 行 × ' + r.columns.length + ' 列' + (total > 200 ? '（仅显示前 200 行）' : '') + '</span></div>' +
            '<div class="table-wrap"><table class="table"><thead><tr>' +
            r.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
            '</tr></thead><tbody>';
          for (var i = 0; i < shown; i++) {
            html += '<tr>' + r.values[i].map(function (v) {
              if (v == null) return '<td><i style="color:var(--ink-3)">NULL</i></td>';
              return '<td>' + esc(v) + '</td>';
            }).join('') + '</tr>';
          }
          html += '</tbody></table></div></div>';
        });
        resultsEl.innerHTML = html || '<div class="empty" style="padding:18px">没有可显示的结果</div>';
        if (lastResult) resultHint.textContent = lastResult.values.length + ' 行';
        refreshSchema();
      }

      function runQuery() {
        if (!db) return;
        var sql = textEl.value.trim();
        if (!sql) { setMsg('请输入 SQL。'); return; }
        setMsg('正在执行…');
        try {
          var results = db.exec(sql);
          setMsg('<span class="result-ok">执行完成。</span>');
          renderResults(results);
        } catch (e) {
          console.error(e);
          setMsg('<span class="result-err">SQL 错误：' + esc(e.message || e) + '</span>');
          resultsEl.innerHTML = '<div class="result-err" style="padding:18px">' + esc(e.message || e) + '</div>';
          resultHint.textContent = '有错误';
          exportCsvBtn.disabled = true;
        }
      }

      function loadSample() {
        if (!db) return;
        if (tableNames().length && !window.confirm('当前数据库里已有表。载入示例会覆盖同名的 sales / products 表，继续吗？')) return;
        try {
          db.run('DROP TABLE IF EXISTS "sales"');
          db.run('DROP TABLE IF EXISTS "products"');
          db.exec(SAMPLE_SQL);
          importMsg.innerHTML = '<span class="result-ok">示例数据已载入：sales 6 行、products 3 行。</span>';
          refreshSchema();
          textEl.value = DEFAULT_QUERY;
        } catch (e) {
          importMsg.innerHTML = '<span class="result-err">载入示例失败：' + esc(e.message || e) + '</span>';
        }
      }

      function wipe() {
        if (!db) return;
        if (!window.confirm('确定清空当前数据库的全部表吗？此操作不可恢复，但只影响当前页面。')) return;
        try {
          db.close();
          db = new SQL.Database();
          lastResult = null;
          exportCsvBtn.disabled = true;
          importMsg.textContent = '数据库已清空，可以重新导入。';
          resultsEl.innerHTML = '<div class="empty" style="padding:22px">执行 SELECT 后在这里查看结果</div>';
          refreshSchema();
        } catch (e) {
          importMsg.innerHTML = '<span class="result-err">清空失败：' + esc(e.message || e) + '</span>';
        }
      }

      function exportCsv() {
        if (!lastResult) return;
        var text = csvLine(lastResult.columns, lastResult.columns) + '\n' +
          lastResult.values.map(function (r) { return csvLine(r, lastResult.columns); }).join('\n');
        TB.downloadText(text, 'SQLite-查询结果.csv', 'text/csv');
      }

      function exportDb() {
        if (!db) return;
        try {
          var bytes = db.export();
          TB.download(new Blob([bytes], { type: 'application/x-sqlite3' }), 'database.sqlite');
        } catch (e) {
          setMsg('<span class="result-err">导出失败：' + esc(e.message || e) + '</span>');
        }
      }

      // 事件绑定
      picker.onChange = function () {
        if (picker.files.length && db) importFiles();
      };
      headerEl.addEventListener('change', function () {
        if (picker.files.length) importFiles();
      });
      runBtn.addEventListener('click', runQuery);
      sampleBtn.addEventListener('click', loadSample);
      wipeBtn.addEventListener('click', wipe);
      formatBtn.addEventListener('click', function () { textEl.value = DEFAULT_QUERY; });
      exportCsvBtn.addEventListener('click', exportCsv);
      exportDbBtn.addEventListener('click', exportDb);
      textEl.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runQuery();
        }
      });

      load();
    }
  });
})();
