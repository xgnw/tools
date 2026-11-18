/* =============================================================================
 * 数据透视表生成器
 * -----------------------------------------------------------------------------
 * 粘贴或选择 CSV / TSV，按一个行字段、一个列字段和一个值字段做汇总。
 * 支持求和、计数、平均、最大值、最小值，并可导出透视结果为 CSV。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '地区,产品,销售额,数量\n华东,A,1200,3\n华东,B,800,2\n华南,A,1500,4\n华南,B,600,1\n华北,A,900,3\n华北,B,1100,2';

  function findDelimiter(text) {
    var first = String(text || '').split(/\r?\n/)[0] || '';
    var counts = { ',': 0, ';': 0, '\t': 0 };
    var quote = false;
    for (var i = 0; i < first.length; i++) {
      var c = first[i];
      if (c === '"') quote = !quote;
      else if (!quote && counts[c] !== undefined) counts[c]++;
    }
    var best = ',', max = -1;
    Object.keys(counts).forEach(function (d) { if (counts[d] > max) { max = counts[d]; best = d; } });
    return best;
  }

  function parseCSV(text, delimiter) {
    text = String(text || '').replace(/^\uFEFF/, '');
    var rows = [], row = [], field = '', quote = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quote) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quote = false;
        } else field += c;
        continue;
      }
      if (c === '"' && field === '') { quote = true; continue; }
      if (c === delimiter) { row.push(field); field = ''; continue; }
      if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = []; field = ''; continue;
      }
      field += c;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  function toNumber(v) {
    var s = String(v == null ? '' : v).replace(/,/g, '').replace(/[¥￥$%]/g, '').trim();
    if (!s) return NaN;
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  TB.def({
    slug: 'pivot',
    cat: 'office',
    name: '数据透视表生成器',
    desc: '粘贴 CSV / TSV，按行、列和值字段汇总数据，支持导出 CSV。',
    icon: '🧾',
    kw: '透视表 pivot CSV TSV 汇总 分组 统计 求和 平均 计数',
    render: function (ctx) {
      var root = ctx.root;
      var state = null;

      root.innerHTML =
        '<div class="panel"><div class="panel-h">数据源 <span class="hint">第一行作为表头</span></div>' +
          '<div class="field"><textarea class="input codeIn" id="pvInput" rows="7" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="pvParse" type="button">解析数据</button>' +
            '<button class="btn" id="pvSample" type="button">填入示例</button></div>' +
          '<div id="pvDrop" style="margin-top:12px"></div>' +
        '</div>' +
        '<div id="pvBuilder"></div>' +
        '<p class="note">CSV 解析和汇总全部在浏览器本地完成，不上传文件。透视表只做当前数据的即时汇总，不会修改原始表格。</p>';

      var input = TB.$('#pvInput', root);
      var drop = TB.$('#pvDrop', root);
      input.value = SAMPLE;
      var picker = TB.filePicker(drop, { accept: '.csv,.tsv,.txt,text/csv,text/plain', hint: '也可以直接拖入 CSV / TSV 文件' });

      picker.onChange = function () {
        var f = picker.files[0];
        if (!f) return;
        TB.readText(f.file).then(function (text) {
          input.value = text;
          parse();
        }).catch(function () { TB.toast('读取文件失败'); });
      };

      function parse() {
        var rows = parseCSV(input.value, findDelimiter(input.value));
        if (rows.length < 2 || rows[0].length < 2) {
          TB.toast('至少需要一行表头和一行数据');
          return;
        }
        var headers = rows[0].map(function (h, i) { return String(h).trim() || ('列 ' + (i + 1)); });
        var seen = {};
        headers = headers.map(function (h) {
          seen[h] = (seen[h] || 0) + 1;
          return seen[h] === 1 ? h : h + ' (' + seen[h] + ')';
        });
        var data = rows.slice(1).filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); });
        if (!data.length) { TB.toast('没有可汇总的数据行'); return; }
        state = { headers: headers, rows: data };
        buildBuilder();
      }

      function buildBuilder() {
        var box = TB.$('#pvBuilder', root);
        var numericIndex = 0;
        for (var i = 2; i < state.headers.length; i++) {
          if (state.rows.some(function (r) { return isFinite(toNumber(r[i])); })) { numericIndex = i; break; }
        }
        box.innerHTML =
          '<div class="panel"><div class="panel-h">透视设置</div>' +
            '<div class="row">' +
              '<div class="field"><div class="label">行字段</div><select class="select" id="pvRow"></select></div>' +
              '<div class="field"><div class="label">列字段</div><select class="select" id="pvCol"></select></div>' +
              '<div class="field"><div class="label">值字段</div><select class="select" id="pvVal"></select></div>' +
              '<div class="field"><div class="label">汇总方式</div><select class="select" id="pvAgg">' +
                '<option value="sum">求和</option><option value="count">计数</option>' +
                '<option value="avg">平均值</option><option value="max">最大值</option><option value="min">最小值</option>' +
              '</select></div>' +
            '</div>' +
            '<div class="btns"><button class="btn primary" id="pvRun" type="button">生成透视表</button>' +
              '<button class="btn" id="pvExport" type="button">导出 CSV</button>' +
              '<span class="hint" id="pvInfo"></span></div>' +
            '<div class="table-wrap" style="margin-top:12px"><table class="table" id="pvTable"></table></div>' +
          '</div>';

        ['pvRow', 'pvCol', 'pvVal'].forEach(function (id) {
          var sel = TB.$('#' + id, root);
          sel.innerHTML = state.headers.map(function (h, i) {
            return '<option value="' + i + '">' + TB.esc(h) + '</option>';
          }).join('');
        });
        TB.$('#pvRow', root).value = '0';
        TB.$('#pvCol', root).value = state.headers.length > 1 ? '1' : '0';
        TB.$('#pvVal', root).value = String(numericIndex);
        ['pvRow', 'pvCol', 'pvVal', 'pvAgg'].forEach(function (id) {
          TB.$('#' + id, root).addEventListener('change', renderPivot);
        });
        TB.$('#pvRun', root).addEventListener('click', renderPivot);
        TB.$('#pvExport', root).addEventListener('click', exportCSV);
        renderPivot();
      }

      function stats() {
        var rowIdx = parseInt(TB.$('#pvRow', root).value, 10);
        var colIdx = parseInt(TB.$('#pvCol', root).value, 10);
        var valIdx = parseInt(TB.$('#pvVal', root).value, 10);
        var agg = TB.$('#pvAgg', root).value;
        var rowVals = [], colVals = [], rowSet = Object.create(null), colSet = Object.create(null);
        var cells = Object.create(null);
        function key(r, c) { return r + '\u0001' + c; }
        function add(cell, raw) {
          var n = toNumber(raw);
          cell.n++;
          if (isFinite(n)) {
            cell.sum += n;
            cell.min = cell.n === 1 || n < cell.min ? n : cell.min;
            cell.max = cell.n === 1 || n > cell.max ? n : cell.max;
            cell.numeric++;
          }
        }
        state.rows.forEach(function (row) {
          var r = String(row[rowIdx] == null ? '' : row[rowIdx]).trim() || '（空）';
          var c = String(row[colIdx] == null ? '' : row[colIdx]).trim() || '（空）';
          if (!(r in rowSet)) { rowSet[r] = 1; rowVals.push(r); }
          if (!(c in colSet)) { colSet[c] = 1; colVals.push(c); }
          var k = key(r, c);
          if (!cells[k]) cells[k] = { n: 0, numeric: 0, sum: 0, min: 0, max: 0 };
          add(cells[k], row[valIdx]);
        });
        function value(cell) {
          if (!cell) return '—';
          if (agg === 'count') return String(cell.n);
          if (!cell.numeric) return '—';
          if (agg === 'sum') return TB.num(cell.sum, 2);
          if (agg === 'avg') return TB.num(cell.sum / cell.numeric, 2);
          if (agg === 'max') return TB.num(cell.max, 2);
          if (agg === 'min') return TB.num(cell.min, 2);
          return '—';
        }
        function total(cells) {
          var n = 0, numeric = 0, sum = 0, min = 0, max = 0;
          cells.forEach(function (c) {
            n += c.n; numeric += c.numeric; sum += c.sum;
            if (c.numeric) { min = numeric === c.numeric ? c.min : Math.min(min, c.min); max = numeric === c.numeric ? c.max : Math.max(max, c.max); }
          });
          return value({ n: n, numeric: numeric, sum: sum, min: min, max: max });
        }
        return { rowVals: rowVals, colVals: colVals, rowIdx: rowIdx, colIdx: colIdx, valIdx: valIdx, agg: agg, cells: cells, value: value, total: total, key: key };
      }

      function renderPivot() {
        if (!state) return;
        var s = stats();
        var head = '<thead><tr><th>' + TB.esc(state.headers[s.rowIdx]) + ' \\ ' + TB.esc(state.headers[s.colIdx]) + '</th>' +
          s.colVals.map(function (c) { return '<th class="num">' + TB.esc(c) + '</th>'; }).join('') +
          '<th class="num">总计</th></tr></thead>';
        var body = s.rowVals.map(function (r) {
          var rowCells = s.colVals.map(function (c) { return s.cells[s.key(r, c)]; }).filter(Boolean);
          return '<tr><td><b>' + TB.esc(r) + '</b></td>' +
            s.colVals.map(function (c) { return '<td class="num">' + s.value(s.cells[s.key(r, c)]) + '</td>'; }).join('') +
            '<td class="num"><b>' + s.total(rowCells) + '</b></td></tr>';
        }).join('');
        var allCells = [];
        s.rowVals.forEach(function (r) { s.colVals.forEach(function (c) { if (s.cells[s.key(r, c)]) allCells.push(s.cells[s.key(r, c)]); }); });
        var footer = '<tr><td><b>总计</b></td>' + s.colVals.map(function (c) {
          var colCells = s.rowVals.map(function (r) { return s.cells[s.key(r, c)]; }).filter(Boolean);
          return '<td class="num"><b>' + s.total(colCells) + '</b></td>';
        }).join('') + '<td class="num"><b>' + s.total(allCells) + '</b></td></tr>';
        TB.$('#pvTable', root).innerHTML = head + '<tbody>' + body + '</tbody><tfoot>' + footer + '</tfoot>';
        TB.$('#pvInfo', root).textContent = state.rows.length + ' 行 · ' + s.rowVals.length + ' 个行值 · ' + s.colVals.length + ' 个列值';
      }

      function exportCSV() {
        if (!state) return;
        var s = stats();
        function cell(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
        var lines = [[state.headers[s.rowIdx] + ' / ' + state.headers[s.colIdx]].concat(s.colVals, ['总计']).map(cell).join(',')];
        s.rowVals.forEach(function (r) {
          var vals = [r];
          s.colVals.forEach(function (c) { vals.push(s.value(s.cells[s.key(r, c)])); });
          vals.push(s.total(s.colVals.map(function (c) { return s.cells[s.key(r, c)]; }).filter(Boolean)));
          lines.push(vals.map(cell).join(','));
        });
        TB.downloadText('\uFEFF' + lines.join('\r\n'), '透视表.csv', 'text/csv');
      }

      TB.$('#pvParse', root).addEventListener('click', parse);
      TB.$('#pvSample', root).addEventListener('click', function () { input.value = SAMPLE; parse(); });
      parse();
    }
  });
})();
