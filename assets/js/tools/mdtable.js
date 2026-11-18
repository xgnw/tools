/* =============================================================================
 * Markdown 表格生成器
 * -----------------------------------------------------------------------------
 * 可视化编辑列名、对齐方式和单元格，实时生成可复制的 Markdown 表格。
 * 自动转义 |，单元格内换行转成 <br>。
 * ========================================================================== */
(function () {
  'use strict';

  var ALIGNS = [
    { id: 'left', label: '左对齐', sep: ':---' },
    { id: 'center', label: '居中', sep: ':---:' },
    { id: 'right', label: '右对齐', sep: '---:' }
  ];

  function escapeCell(value) {
    return String(value == null ? '' : value)
      .replace(/\r\n|\r|\n/g, '<br>')
      .replace(/\|/g, '\\|')
      .trim();
  }

  function makeMarkdown(columns, rows) {
    var names = columns.map(function (c, i) { return escapeCell(c.name || ('列' + (i + 1))); });
    var seps = columns.map(function (c) {
      var found = ALIGNS.filter(function (a) { return a.id === c.align; })[0];
      return found ? found.sep : ':---';
    });
    var lines = [
      '| ' + names.join(' | ') + ' |',
      '| ' + seps.join(' | ') + ' |'
    ];
    rows.forEach(function (row) {
      lines.push('| ' + columns.map(function (_, i) { return escapeCell(row[i]); }).join(' | ') + ' |');
    });
    return lines.join('\n');
  }

  TB.def({
    slug: 'mdtable',
    cat: 'doc',
    name: 'Markdown 表格生成器',
    desc: '编辑列名、对齐和单元格，实时生成 Markdown 表格并复制到文档。',
    icon: '📋',
    kw: 'markdown 表格 md table 生成器 文档',
    render: function (ctx) {
      var root = ctx.root;
      var columns = [
        { name: '工具', align: 'left' },
        { name: '用途', align: 'left' },
        { name: '状态', align: 'center' }
      ];
      var rows = [
        ['PDF 合并', '把多个 PDF 合成一个', '可用'],
        ['图片压缩', '在本地减小图片体积', '可用'],
        ['JSON 格式化', '格式化与校验 JSON', '可用']
      ];
      var output = '';

      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">表格编辑 <span class="hint">输入时实时更新下方 Markdown</span></div>' +
          '<div class="mdEditorWrap"><table class="mdEditorTable"><thead id="mdHead"></thead><tbody id="mdBody"></tbody></table></div>' +
          '<div class="btns">' +
            '<button id="mdAddCol" class="btn" type="button">+ 添加列</button>' +
            '<button id="mdAddRow" class="btn" type="button">+ 添加行</button>' +
            '<button id="mdSample" class="btn" type="button">载入示例</button>' +
            '<button id="mdClear" class="btn danger" type="button">清空内容</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">Markdown 预览</div>' +
          '<div class="out"><div class="out-b" id="mdOut" style="min-height:90px"></div></div>' +
          '<div class="btns">' +
            '<button id="mdCopy" class="btn" type="button">复制 Markdown</button>' +
            '<button id="mdDownload" class="btn" type="button">下载 .md</button>' +
          '</div>' +
        '</div>' +
        '<p class="note">单元格里的 | 会自动转义为 \\|，换行会转成 &lt;br&gt;；复制到 GitHub、飞书、Typora 等常见 Markdown 环境即可使用。</p>';

      var els = {
        head: TB.$('#mdHead', root),
        body: TB.$('#mdBody', root),
        out: TB.$('#mdOut', root)
      };

      function render() {
        els.head.innerHTML = '<tr><th class="mdIdx">#</th>' + columns.map(function (c, i) {
          return '<th><div class="mdHeadCell">' +
            '<input class="input mdColName" data-c="' + i + '" value="' + TB.esc(c.name) + '" placeholder="列名" aria-label="列名">' +
            '<select class="select mdAlign" data-c="' + i + '" aria-label="对齐方式">' +
              ALIGNS.map(function (a) { return '<option value="' + a.id + '"' + (c.align === a.id ? ' selected' : '') + '>' + a.label + '</option>'; }).join('') +
            '</select>' +
            '<button class="btn sm danger mdDelCol" data-c="' + i + '" type="button" title="删除这一列">×</button>' +
          '</div></th>';
        }).join('') + '<th class="mdIdx">操作</th></tr>';

        els.body.innerHTML = rows.map(function (row, r) {
          return '<tr>' +
            '<td class="mdIdx">' + (r + 1) + '</td>' +
            columns.map(function (_, c) {
              return '<td><input class="input mdCell" data-r="' + r + '" data-c="' + c + '" value="' + TB.esc(row[c] || '') + '" aria-label="第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列"></td>';
            }).join('') +
            '<td class="mdIdx"><button class="btn sm danger mdDelRow" data-r="' + r + '" type="button" title="删除这一行">×</button></td>' +
          '</tr>';
        }).join('');

        output = makeMarkdown(columns, rows);
        els.out.textContent = output;
      }

      function updatePreview() {
        output = makeMarkdown(columns, rows);
        els.out.textContent = output;
      }

      els.head.addEventListener('input', function (e) {
        if (!e.target.classList.contains('mdColName')) return;
        var i = parseInt(e.target.getAttribute('data-c'), 10);
        if (columns[i]) columns[i].name = e.target.value;
        updatePreview();
      });
      els.head.addEventListener('change', function (e) {
        if (!e.target.classList.contains('mdAlign')) return;
        var i = parseInt(e.target.getAttribute('data-c'), 10);
        if (columns[i]) columns[i].align = e.target.value;
        updatePreview();
      });
      els.head.addEventListener('click', function (e) {
        if (!e.target.classList.contains('mdDelCol')) return;
        if (columns.length <= 1) { TB.toast('至少保留一列'); return; }
        var i = parseInt(e.target.getAttribute('data-c'), 10);
        columns.splice(i, 1);
        rows.forEach(function (r) { r.splice(i, 1); });
        render();
      });

      els.body.addEventListener('input', function (e) {
        if (!e.target.classList.contains('mdCell')) return;
        var r = parseInt(e.target.getAttribute('data-r'), 10);
        var c = parseInt(e.target.getAttribute('data-c'), 10);
        if (rows[r]) rows[r][c] = e.target.value;
        updatePreview();
      });
      els.body.addEventListener('click', function (e) {
        if (!e.target.classList.contains('mdDelRow')) return;
        var r = parseInt(e.target.getAttribute('data-r'), 10);
        rows.splice(r, 1);
        render();
      });

      TB.$('#mdAddCol', root).addEventListener('click', function () {
        columns.push({ name: '', align: 'left' });
        rows.forEach(function (r) { r.push(''); });
        render();
      });
      TB.$('#mdAddRow', root).addEventListener('click', function () {
        rows.push(columns.map(function () { return ''; }));
        render();
      });
      TB.$('#mdSample', root).addEventListener('click', function () {
        columns = [
          { name: '工具', align: 'left' },
          { name: '用途', align: 'left' },
          { name: '状态', align: 'center' }
        ];
        rows = [
          ['PDF 合并', '把多个 PDF 合成一个', '可用'],
          ['图片压缩', '在本地减小图片体积', '可用'],
          ['JSON 格式化', '格式化与校验 JSON', '可用']
        ];
        render();
      });
      TB.$('#mdClear', root).addEventListener('click', function () {
        rows = [columns.map(function () { return ''; })];
        render();
      });

      TB.$('#mdCopy', root).addEventListener('click', function () { TB.copy(output); });
      TB.$('#mdDownload', root).addEventListener('click', function () {
        TB.downloadText(output, 'table.md', 'text/markdown');
      });

      render();
    }
  });
})();
