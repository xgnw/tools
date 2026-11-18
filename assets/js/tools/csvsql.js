/* =============================================================================
 * CSV → SQL
 * -----------------------------------------------------------------------------
 * 纯前端解析 CSV / TSV，自动推断列类型，生成 CREATE TABLE 与批量 INSERT。
 * 支持 MySQL / PostgreSQL / SQLite / SQL Server 的标识符与类型写法。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE_CSV = [
    'id,name,city,amount,joined_at',
    '1,张三,上海,128.50,2024-03-01',
    '2,李四,北京,99,2024-05-18',
    '3,王五,深圳,0,2024-08-09'
  ].join('\n');

  function detectDelimiter(text) {
    var first = '';
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === '\n' || c === '\r') break;
      first += c;
    }
    var counts = { ',': 0, ';': 0, '\t': 0 };
    var inQuotes = false;
    for (var j = 0; j < first.length; j++) {
      var ch = first[j];
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && counts[ch] !== undefined) counts[ch]++;
    }
    var best = ',';
    var max = -1;
    Object.keys(counts).forEach(function (d) {
      if (counts[d] > max) { max = counts[d]; best = d; }
    });
    return max > 0 ? best : ',';
  }

  /* 标准 CSV 状态机：支持双引号、转义双引号、字段内换行 */
  function parseCSV(text, delimiter) {
    text = String(text || '').replace(/^\uFEFF/, '');
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
        continue;
      }
      if (c === '"' && field === '') {
        inQuotes = true;
      } else if (c === delimiter) {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (row.some(function (x) { return x !== ''; })) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      if (row.some(function (x) { return x !== ''; })) rows.push(row);
    }
    return rows;
  }

  function decodeBuffer(buffer) {
    var bytes = new Uint8Array(buffer);
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return new TextDecoder('utf-8').decode(bytes.subarray(3));
    }
    var utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (utf8.indexOf('\uFFFD') !== -1) {
      try { return new TextDecoder('gb18030').decode(bytes); } catch (e) { /* 浏览器不支持则保留 UTF-8 */ }
    }
    return utf8;
  }

  function quoteIdent(name, dialect) {
    if (dialect === 'mysql') return '`' + String(name).replace(/`/g, '``') + '`';
    if (dialect === 'sqlserver') return '[' + String(name).replace(/]/g, ']]') + ']';
    return '"' + String(name).replace(/"/g, '""') + '"';
  }

  function quoteValue(value, kind, dialect) {
    if (value === null || value === undefined) return 'NULL';
    if (kind === 'integer' || kind === 'number') return String(value);
    if (kind === 'boolean') {
      if (dialect === 'postgres') return value ? 'TRUE' : 'FALSE';
      return value ? '1' : '0';
    }
    return "'" + String(value).replace(/'/g, "''").replace(/\u0000/g, '') + "'";
  }

  function inferKind(values) {
    var list = values.filter(function (v) { return v !== '' && v !== null && v !== undefined; });
    if (!list.length) return 'text';
    if (list.every(function (v) { return /^(true|false)$/i.test(v); })) return 'boolean';
    if (list.every(function (v) { return /^[+-]?\d+$/.test(v); })) return 'integer';
    if (list.every(function (v) { return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v); })) return 'number';
    if (list.every(function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)); })) return 'date';
    if (list.every(function (v) { return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/.test(v); })) return 'datetime';
    return 'text';
  }

  function typeFor(kind, dialect) {
    var map = {
      mysql: { integer: 'INT', number: 'DECIMAL(18,6)', boolean: 'TINYINT(1)', date: 'DATE', datetime: 'DATETIME', text: 'TEXT' },
      postgres: { integer: 'INTEGER', number: 'NUMERIC', boolean: 'BOOLEAN', date: 'DATE', datetime: 'TIMESTAMP', text: 'TEXT' },
      sqlite: { integer: 'INTEGER', number: 'REAL', boolean: 'INTEGER', date: 'TEXT', datetime: 'TEXT', text: 'TEXT' },
      sqlserver: { integer: 'INT', number: 'DECIMAL(18,6)', boolean: 'BIT', date: 'DATE', datetime: 'DATETIME2', text: 'NVARCHAR(MAX)' }
    };
    return (map[dialect] || map.postgres)[kind] || 'TEXT';
  }

  function normalizeHeaders(headers) {
    var seen = {};
    return headers.map(function (h, i) {
      var name = String(h || '').trim() || ('column_' + (i + 1));
      if (seen[name]) {
        seen[name]++;
        name = name + '_' + seen[name];
      } else {
        seen[name] = 1;
      }
      return name;
    });
  }

  function buildSQL(text, opts) {
    var delimiter = opts.delimiter || detectDelimiter(text);
    var rows = parseCSV(text, delimiter);
    if (!rows.length) throw new Error('没有解析到数据行');
    var headers;
    var dataRows;
    if (opts.header) {
      headers = normalizeHeaders(rows[0]);
      dataRows = rows.slice(1);
    } else {
      var width = rows[0].length;
      headers = [];
      for (var i = 0; i < width; i++) headers.push('column_' + (i + 1));
      dataRows = rows;
    }
    if (!headers.length) throw new Error('没有识别到列');

    // 对齐列数：短行补空，长行截断
    dataRows = dataRows.map(function (r) {
      var out = [];
      for (var i = 0; i < headers.length; i++) out.push(r[i] === undefined ? '' : r[i]);
      return out;
    });

    var kinds = headers.map(function (_, col) {
      return inferKind(dataRows.map(function (r) { return r[col]; }));
    });

    var table = (opts.table || '').trim() || 'my_table';
    var qTable = quoteIdent(table, opts.dialect);
    var lines = [];
    lines.push('-- Generated by 简单工具箱 · CSV → SQL');
    lines.push('-- Rows: ' + dataRows.length + ', Columns: ' + headers.length);
    if (opts.create) {
      lines.push('CREATE TABLE ' + qTable + ' (');
      headers.forEach(function (h, i) {
        lines.push('  ' + quoteIdent(h, opts.dialect) + ' ' + typeFor(kinds[i], opts.dialect) + (i === headers.length - 1 ? '' : ','));
      });
      lines.push(');');
      lines.push('');
    }

    var batch = Math.max(1, parseInt(opts.batch, 10) || 50);
    var cols = headers.map(function (h) { return quoteIdent(h, opts.dialect); }).join(', ');
    for (var start = 0; start < dataRows.length; start += batch) {
      var chunk = dataRows.slice(start, start + batch);
      lines.push('INSERT INTO ' + qTable + ' (' + cols + ') VALUES');
      chunk.forEach(function (r, idx) {
        var vals = r.map(function (v, col) {
          var empty = opts.nullEmpty && v === '';
          return quoteValue(empty ? null : v, kinds[col], opts.dialect);
        });
        lines.push('  (' + vals.join(', ') + ')' + (idx === chunk.length - 1 ? ';' : ','));
      });
      lines.push('');
    }
    return {
      sql: lines.join('\n').trim(),
      rows: dataRows.length,
      columns: headers.length,
      kinds: kinds,
      delimiter: delimiter === '\t' ? 'Tab' : delimiter
    };
  }

  TB.def({
    slug: 'csvsql',
    cat: 'office',
    name: 'CSV → SQL',
    desc: '把 CSV / TSV 转成建表语句和批量 INSERT，支持四种常见 SQL 方言。',
    icon: '🗄️',
    kw: 'csv sql 建表 insert mysql postgres sqlite sqlserver 数据库',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">CSV 文件 <span class="hint">也可以直接粘贴到下方文本框</span></div>' +
          '<div id="csvPicker"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">CSV 内容 <span class="hint">首行默认作为表头</span></div>' +
          '<textarea id="csvText" class="textarea" rows="12" spellcheck="false"></textarea>' +
          '<div class="row" style="margin-top:14px">' +
            '<div class="field"><label class="label" for="csvTable"><b>表名</b></label><input id="csvTable" class="input" value="my_table" spellcheck="false"></div>' +
            '<div class="field"><label class="label" for="csvDialect"><b>SQL 方言</b></label>' +
              '<select id="csvDialect" class="select">' +
                '<option value="mysql">MySQL</option>' +
                '<option value="postgres">PostgreSQL</option>' +
                '<option value="sqlite">SQLite</option>' +
                '<option value="sqlserver">SQL Server</option>' +
              '</select></div>' +
            '<div class="field"><label class="label" for="csvBatch"><b>每批 INSERT 行数</b></label><input id="csvBatch" class="input" type="number" min="1" max="500" value="50"></div>' +
          '</div>' +
          '<div class="checks" style="margin-top:12px">' +
            '<label><input id="csvHeader" type="checkbox" checked> 首行作为表头</label>' +
            '<label><input id="csvCreate" type="checkbox" checked> 生成 CREATE TABLE</label>' +
            '<label><input id="csvNull" type="checkbox" checked> 空单元格输出 NULL</label>' +
          '</div>' +
          '<div class="btns">' +
            '<button id="csvRun" class="btn primary" type="button">生成 SQL</button>' +
            '<button id="csvSample" class="btn" type="button">载入示例</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">SQL 输出 <span class="hint" id="csvStatus"></span></div>' +
          '<div class="out"><div class="out-b" id="csvOut" style="min-height:120px">等待生成…</div></div>' +
          '<div class="btns">' +
            '<button id="csvCopy" class="btn" type="button">复制 SQL</button>' +
            '<button id="csvDownload" class="btn" type="button">下载 .sql</button>' +
          '</div>' +
        '</div>' +
        '<p class="note">自动推断整数、小数、日期、时间和布尔值；空值默认写 NULL。生成结果请按目标数据库的命名规范再核对表名、列名与字符集。</p>';

      var els = {
        text: TB.$('#csvText', root),
        out: TB.$('#csvOut', root),
        status: TB.$('#csvStatus', root),
        table: TB.$('#csvTable', root),
        dialect: TB.$('#csvDialect', root),
        batch: TB.$('#csvBatch', root),
        header: TB.$('#csvHeader', root),
        create: TB.$('#csvCreate', root),
        nullEmpty: TB.$('#csvNull', root)
      };
      var output = '';

      var picker = TB.filePicker(TB.$('#csvPicker', root), {
        accept: '.csv,.tsv,.txt,text/csv,text/plain',
        hint: '拖入 CSV / TSV 文件'
      });
      picker.onChange = function () {
        var item = picker.files[0];
        if (!item) return;
        TB.readArrayBuffer(item.file).then(function (buf) {
          els.text.value = decodeBuffer(buf);
          run();
        }).catch(function (e) { TB.toast('读取失败：' + e.message); });
      };

      function loadSample() {
        els.text.value = SAMPLE_CSV;
        els.table.value = 'users';
        els.status.textContent = '';
        els.out.textContent = '等待生成…';
        output = '';
      }

      function run() {
        els.status.textContent = '';
        output = '';
        try {
          var result = buildSQL(els.text.value, {
            table: els.table.value,
            dialect: els.dialect.value,
            batch: els.batch.value,
            header: els.header.checked,
            create: els.create.checked,
            nullEmpty: els.nullEmpty.checked
          });
          output = result.sql;
          els.out.textContent = output;
          els.status.textContent = result.rows + ' 行 · ' + result.columns + ' 列 · 分隔符 ' + result.delimiter;
        } catch (e) {
          els.status.textContent = '生成失败';
          els.out.textContent = '生成失败：' + (e && e.message ? e.message : String(e));
        }
      }

      TB.$('#csvRun', root).addEventListener('click', run);
      TB.$('#csvSample', root).addEventListener('click', loadSample);
      TB.$('#csvCopy', root).addEventListener('click', function () {
        if (!output) { TB.toast('还没有可复制的 SQL'); return; }
        TB.copy(output);
      });
      TB.$('#csvDownload', root).addEventListener('click', function () {
        if (!output) { TB.toast('还没有可下载的 SQL'); return; }
        TB.downloadText(output, 'export.sql', 'application/sql');
      });

      loadSample();
      run();
    }
  });
})();
