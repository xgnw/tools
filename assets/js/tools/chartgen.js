/* =============================================================================
 * 图表生成器
 * -----------------------------------------------------------------------------
 * 输入 CSV / JSON，在本机解析数据，用 Chart.js 实时绘制柱状、折线、饼图、
 * 雷达图等，并可导出 PNG。文件不会上传。
 * 依赖：Chart.js（MIT），按需加载。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE_CSV =
    '月份,销售额,利润,访客(百)\n' +
    '1月,128,32,42\n' +
    '2月,156,41,47\n' +
    '3月,142,36,45\n' +
    '4月,188,55,53\n' +
    '5月,205,62,59\n' +
    '6月,236,74,64\n' +
    '7月,218,66,62\n' +
    '8月,251,82,70';

  var SAMPLE_JSON = '[\n' +
    '  { "渠道": "自然搜索", "访问": 4200, "转化": 318 },\n' +
    '  { "渠道": "直接访问", "访问": 2650, "转化": 224 },\n' +
    '  { "渠道": "社交媒体", "访问": 1980, "转化": 152 },\n' +
    '  { "渠道": "邮件营销", "访问": 860, "转化": 96 },\n' +
    '  { "渠道": "合作推荐", "访问": 620, "转化": 71 }\n' +
    ']';

  var PALETTES = {
    brand: ['#2F6BFF', '#6E9BFF', '#9D7BFF', '#35B98A', '#F0A33A', '#E6605A', '#49A9D8', '#B08A5A'],
    fresh: ['#168C68', '#4CBD94', '#8FD6BE', '#3E9BB5', '#77C7DF', '#C9B45C', '#E7A05A', '#8E9A6A'],
    warm: ['#E56A2E', '#FF9B62', '#FFC08E', '#D64545', '#F08A8A', '#B06A3B', '#F2C14E', '#8A5A44'],
    mono: ['#242424', '#4A4A4A', '#727272', '#969696', '#B8B8B8', '#D2D2D2', '#8E8E8E', '#606060']
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 解析带引号的 CSV/TSV：支持 "" 转义、字段内逗号、CRLF */
  function parseDelimited(text, delim) {
    var src = String(text || '').replace(/\r\n?/g, '\n');
    var rows = [];
    var row = [];
    var field = '';
    var quoted = false;
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
      } else {
        field += ch;
      }
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

  function csvToObjects(text, firstHeader) {
    var rows = parseDelimited(text, detectDelim(text));
    if (!rows.length) return { columns: [], rows: [] };
    var columns = rows[0].map(function (c, i) { return String(c || '').trim() || ('列' + (i + 1)); });
    var body = rows;
    if (firstHeader) body = rows.slice(1);
    else columns = columns.map(function (c, i) { return '列' + (i + 1); });
    // 去重表头，避免下拉框出现同名项
    var seen = {};
    columns = columns.map(function (c) {
      var base = c;
      if (seen[base]) { c = base + ' ' + seen[base]; }
      seen[base] = (seen[base] || 0) + 1;
      return c;
    });
    var objects = body.map(function (r) {
      var o = {};
      columns.forEach(function (c, i) { o[c] = r[i] == null ? '' : String(r[i]); });
      return o;
    });
    return { columns: columns, rows: objects };
  }

  function jsonToObjects(text) {
    var data = JSON.parse(text);
    if (data && !Array.isArray(data) && typeof data === 'object') {
      var arrayKey = Object.keys(data).find(function (k) { return Array.isArray(data[k]); });
      if (arrayKey) data = data[arrayKey];
    }
    if (!Array.isArray(data)) throw new Error('JSON 需要是对象数组，例如 [{"月份":"1月","销量":12}]');
    if (!data.length) return { columns: [], rows: [] };
    if (data.every(function (x) { return x === null || typeof x !== 'object'; })) {
      data = data.map(function (x, i) { return { 序号: i + 1, 数值: x }; });
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

  function isNumber(v) {
    if (v == null || String(v).trim() === '') return false;
    var n = Number(String(v).replace(/,/g, '').replace(/%$/, ''));
    return isFinite(n);
  }

  function numeric(v) {
    return Number(String(v == null ? 0 : v).replace(/,/g, '').replace(/%$/, ''));
  }

  function paletteColors(name) {
    return PALETTES[name] || PALETTES.brand;
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  TB.def({
    slug: 'chartgen',
    cat: 'data',
    name: '图表生成器',
    desc: '粘贴 CSV 或 JSON，实时生成柱状、折线、饼图、雷达图，并导出高清 PNG。',
    icon: '📊',
    kw: '图表 折线图 柱状图 饼图 雷达图 CSV JSON Chart.js 数据可视化 导出 PNG',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">数据源 <span class="hint">第一行作为表头，支持逗号 / 制表符 / 分号</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">格式</div><select class="select" id="cgMode">' +
              '<option value="csv">CSV / TSV</option><option value="json">JSON 对象数组</option></select></div>' +
            '<div class="field"><div class="label">选项</div><div class="checks" style="padding-top:6px">' +
              '<label><input type="checkbox" id="cgHeader" checked> 首行是表头</label></div></div>' +
          '</div>' +
          '<div class="field"><div class="label">数据 <span id="cgDataHint" class="hint">示例为月度销售数据</span></div>' +
            '<textarea class="textarea" id="cgData" rows="10" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn" id="cgSample" type="button">填入示例</button>' +
            '<button class="btn" id="cgParse" type="button">重新解析</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">图表设置</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">类型</div><select class="select" id="cgType">' +
              '<option value="bar">柱状图</option><option value="barH">横向条形图</option>' +
              '<option value="line">折线图</option><option value="pie">饼图</option>' +
              '<option value="doughnut">环形图</option><option value="radar">雷达图</option>' +
              '<option value="polarArea">极区图</option></select></div>' +
            '<div class="field"><div class="label">标题</div><input class="input" id="cgTitle" value="月度经营数据" maxlength="60"></div>' +
            '<div class="field"><div class="label">配色</div><select class="select" id="cgPalette">' +
              '<option value="brand">品牌蓝</option><option value="fresh">清爽绿</option>' +
              '<option value="warm">暖色</option><option value="mono">单色</option></select></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">横轴标签列</div><select class="select" id="cgLabel"></select></div>' +
            '<div class="field"><div class="label">显示</div><div class="checks" style="padding-top:6px">' +
              '<label><input type="checkbox" id="cgLegend" checked> 图例</label>' +
              '<label><input type="checkbox" id="cgGrid" checked> 网格线</label>' +
              '<label><input type="checkbox" id="cgStacked"> 堆叠</label>' +
              '<label><input type="checkbox" id="cgTransparent"> 透明背景</label></div></div>' +
          '</div>' +
          '<div class="field"><div class="label">数据系列</div><div class="checks" id="cgSeries"></div></div>' +
          '<p class="note" id="cgMsg" style="margin-bottom:0"></p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint" id="cgCount">—</span></div>' +
          '<div class="chart-stage"><canvas id="cgCanvas"></canvas><div class="chart-empty" id="cgEmpty">解析数据后在这里显示图表</div></div>' +
          '<div class="btns"><button class="btn primary" id="cgDl" type="button" disabled>导出 PNG</button></div>' +
        '</div>' +
        '<p class="note">图表由 Canvas 在本地绘制，导出的 PNG 不带任何服务器水印；数字中的千分位逗号和百分号会自动识别。</p>';

      var modeEl = TB.$('#cgMode', root);
      var headerEl = TB.$('#cgHeader', root);
      var dataEl = TB.$('#cgData', root);
      var dataHint = TB.$('#cgDataHint', root);
      var typeEl = TB.$('#cgType', root);
      var titleEl = TB.$('#cgTitle', root);
      var paletteEl = TB.$('#cgPalette', root);
      var labelEl = TB.$('#cgLabel', root);
      var legendEl = TB.$('#cgLegend', root);
      var gridEl = TB.$('#cgGrid', root);
      var stackedEl = TB.$('#cgStacked', root);
      var transparentEl = TB.$('#cgTransparent', root);
      var seriesEl = TB.$('#cgSeries', root);
      var canvas = TB.$('#cgCanvas', root);
      var emptyEl = TB.$('#cgEmpty', root);
      var msgEl = TB.$('#cgMsg', root);
      var countEl = TB.$('#cgCount', root);
      var dlBtn = TB.$('#cgDl', root);

      var table = null;
      var chart = null;
      var renderToken = 0;
      var selectedSeries = null;

      function setMsg(html) { msgEl.innerHTML = html; }

      function fillSample() {
        if (modeEl.value === 'json') {
          dataEl.value = SAMPLE_JSON;
          dataHint.textContent = '示例为渠道访问与转化数据';
        } else {
          dataEl.value = SAMPLE_CSV;
          dataHint.textContent = '示例为月度销售数据';
        }
        parseData();
      }

      function parseData() {
        try {
          table = modeEl.value === 'json'
            ? jsonToObjects(dataEl.value)
            : csvToObjects(dataEl.value, headerEl.checked);
        } catch (e) {
          table = null;
          setMsg('<span class="result-err">数据解析失败：' + esc(e.message) + '</span>');
          updateSelectors();
          renderChart();
          return;
        }
        if (!table.rows.length || table.columns.length < 2) {
          table = null;
          setMsg('<span class="result-err">至少需要两列数据：一列作为标签，一列作为数值。</span>');
          updateSelectors();
          renderChart();
          return;
        }
        setMsg('');
        updateSelectors();
        renderChart();
      }

      function updateSelectors() {
        if (!table) {
          labelEl.innerHTML = '';
          seriesEl.innerHTML = '<span style="color:var(--ink-3);font-size:12px">先解析数据</span>';
          countEl.textContent = '—';
          dlBtn.disabled = true;
          return;
        }
        var prevLabel = labelEl.value;
        labelEl.innerHTML = table.columns.map(function (c, i) {
          return '<option value="' + esc(c) + '"' + (c === prevLabel || (!prevLabel && i === 0) ? ' selected' : '') + '>' + esc(c) + '</option>';
        }).join('');

        var numericCols = table.columns.filter(function (c) {
          return table.rows.some(function (r) { return String(r[c]).trim() !== ''; }) &&
            table.rows.every(function (r) { return String(r[c]).trim() === '' || isNumber(r[c]); });
        });
        if (!numericCols.length) {
          seriesEl.innerHTML = '<span class="result-err">没有找到可用的数值列，请检查数据。</span>';
          countEl.textContent = '—';
          dlBtn.disabled = true;
          return;
        }
        var keep = selectedSeries && selectedSeries.length ? selectedSeries : null;
        seriesEl.innerHTML = numericCols.map(function (c, i) {
          var on = keep ? keep.indexOf(c) >= 0 : i < 4;
          return '<label><input type="checkbox" value="' + esc(c) + '"' + (on ? ' checked' : '') + '> ' + esc(c) + '</label>';
        }).join('');
        countEl.textContent = table.rows.length + ' 行 · ' + numericCols.length + ' 个数值列';
        dlBtn.disabled = false;
      }

      function activeSeries() {
        var out = [];
        TB.$$('input[type=checkbox]', seriesEl).forEach(function (el) {
          if (el.checked) out.push(el.value);
        });
        selectedSeries = out.slice();
        return out;
      }

      function chartType() {
        var t = typeEl.value;
        if (t === 'barH') return 'bar';
        return t;
      }

      function buildData(series) {
        var labelCol = labelEl.value || table.columns[0];
        var labels = table.rows.map(function (r, i) {
          var v = r[labelCol];
          return v == null || String(v).trim() === '' ? ('第 ' + (i + 1) + ' 项') : String(v);
        });
        var colors = paletteColors(paletteEl.value);
        var type = chartType();
        var list = series.slice();
        if (type === 'pie' || type === 'doughnut') list = list.slice(0, 1);
        var datasets = list.map(function (name, i) {
          var values = table.rows.map(function (r) { return numeric(r[name]); });
          var color = colors[i % colors.length];
          var ds = { label: name, data: values, borderColor: color, backgroundColor: color, borderWidth: 1.5 };
          if (type === 'line') {
            ds.fill = false;
            ds.tension = 0.28;
            ds.pointRadius = 3;
            ds.pointHoverRadius = 5;
            ds.borderWidth = 2.2;
          }
          if (type === 'bar' || type === 'barH') {
            ds.borderRadius = 5;
            ds.maxBarThickness = 54;
          }
          if (type === 'radar') {
            ds.fill = true;
            ds.backgroundColor = color + '26';
            ds.pointRadius = 3;
          }
          return ds;
        });
        return { labels: labels, datasets: datasets };
      }

      function renderChart() {
        if (!table) {
          if (chart) { chart.destroy(); chart = null; }
          canvas.style.display = 'none';
          emptyEl.style.display = 'flex';
          emptyEl.textContent = '解析数据后在这里显示图表';
          dlBtn.disabled = true;
          return;
        }
        var series = activeSeries();
        if (!series.length) {
          if (chart) { chart.destroy(); chart = null; }
          canvas.style.display = 'none';
          emptyEl.style.display = 'flex';
          emptyEl.textContent = '请至少勾选一个数据系列';
          dlBtn.disabled = true;
          return;
        }
        canvas.style.display = 'block';
        emptyEl.style.display = 'none';
        dlBtn.disabled = false;

        loadChart().then(function () {
          if (chart) { chart.destroy(); chart = null; }
          var token = ++renderToken;
          var type = chartType();
          var data = buildData(series);
          var dark = document.documentElement.getAttribute('data-theme') === 'dark';
          var ink = cssVar('--ink', dark ? '#F4F7FF' : '#172033');
          var muted = cssVar('--ink-3', dark ? '#8C9AB0' : '#7A8699');
          var grid = cssVar('--line', dark ? '#2A3854' : '#E4E9F1');
          var showLegend = legendEl.checked;
          var showGrid = gridEl.checked;

          var options = {
            responsive: true,
            maintainAspectRatio: false,
            /* 关闭入场动画：后台/嵌入窗口里 requestAnimationFrame 可能被节流，
               动画不推进会导致画布一直空白，直接绘制更可靠。 */
            animation: false,
            layout: { padding: { top: 4, right: 8, bottom: 2, left: 2 } },
            plugins: {
              legend: { display: showLegend, position: 'bottom', labels: { color: ink, boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 } },
              title: {
                display: !!titleEl.value.trim(), text: titleEl.value.trim(), color: ink,
                font: { size: 15, weight: '600', family: 'system-ui, Microsoft YaHei' }, padding: { bottom: 12 }
              },
              tooltip: { enabled: true }
            },
            scales: (type === 'pie' || type === 'doughnut' || type === 'polarArea') ? {} : {
              x: {
                grid: { display: showGrid, color: grid }, border: { display: showGrid, color: grid },
                ticks: { color: muted, maxRotation: 50, autoSkip: true }
              },
              y: {
                beginAtZero: true, grid: { display: showGrid, color: grid }, border: { display: showGrid, color: grid },
                ticks: { color: muted }
              }
            }
          };
          if (type === 'bar' || type === 'line') {
            options.scales.x.stacked = stackedEl.checked;
            options.scales.y.stacked = stackedEl.checked;
          }
          if (type === 'radar') {
            options.scales = {
              r: {
                beginAtZero: true, grid: { color: grid }, angleLines: { color: grid },
                pointLabels: { color: muted, font: { size: 11 } }, ticks: { color: muted, backdropColor: 'transparent' }
              }
            };
          }
          if (type === 'barH') {
            options.indexAxis = 'y';
            options.scales = {
              x: { grid: { display: showGrid, color: grid }, ticks: { color: muted } },
              y: { grid: { display: showGrid, color: grid }, ticks: { color: muted } }
            };
          }
          if (transparentEl.checked) {
            options.plugins.legend.labels.color = dark ? '#FFFFFF' : '#172033';
          }

          if (token !== renderToken) return;
          try {
            chart = new window.Chart(canvas.getContext('2d'), { type: type, data: data, options: options });
          } catch (e) {
            console.error(e);
            setMsg('<span class="result-err">绘图失败：' + esc(e.message || e) + '</span>');
          }
        }).catch(function (e) {
          console.error(e);
          setMsg('<span class="result-err">图表库加载失败：' + esc(e.message || e) + '</span>');
        });
      }

      function loadChart() {
        if (window.Chart) return Promise.resolve();
        setMsg('正在加载图表库（约 210 KB）…');
        return TB.loadLib('chart.umd.min.js').then(function () {
          if (!window.Chart) throw new Error('Chart.js 未正确挂载');
          window.Chart.defaults.font.family = 'system-ui, -apple-system, "Microsoft YaHei", sans-serif';
          setMsg('');
        });
      }

      function exportPng() {
        if (!chart) return;
        var src = canvas;
        var out = document.createElement('canvas');
        out.width = src.width;
        out.height = src.height;
        var g = out.getContext('2d');
        if (!transparentEl.checked) {
          g.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#151A22' : '#FFFFFF';
          g.fillRect(0, 0, out.width, out.height);
        }
        g.drawImage(src, 0, 0);
        out.toBlob(function (blob) {
          if (!blob) { TB.toast('导出失败，请重试'); return; }
          var name = (titleEl.value.trim() || '图表').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) + '.png';
          TB.download(blob, name);
        }, 'image/png');
      }

      // 初始化
      dataEl.value = SAMPLE_CSV;
      parseData();

      var debounced = TB.debounce(function () { parseData(); }, 420);

      modeEl.addEventListener('change', function () {
        dataEl.value = modeEl.value === 'json' ? SAMPLE_JSON : SAMPLE_CSV;
        dataHint.textContent = modeEl.value === 'json' ? '示例为渠道访问与转化数据' : '示例为月度销售数据';
        headerEl.disabled = modeEl.value === 'json';
        parseData();
      });
      dataEl.addEventListener('input', debounced);
      headerEl.addEventListener('change', parseData);
      TB.$('#cgSample', root).addEventListener('click', fillSample);
      TB.$('#cgParse', root).addEventListener('click', parseData);

      [typeEl, paletteEl, labelEl].forEach(function (el) { el.addEventListener('change', renderChart); });
      [legendEl, gridEl, stackedEl, transparentEl].forEach(function (el) { el.addEventListener('change', renderChart); });
      titleEl.addEventListener('input', TB.debounce(renderChart, 300));
      seriesEl.addEventListener('change', renderChart);
      dlBtn.addEventListener('click', exportPng);

      // 主题切换后重绘，避免图表文字在深色背景里看不清
      if (window.MutationObserver) {
        var mo = new MutationObserver(function () { if (chart) renderChart(); });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
    }
  });
})();
