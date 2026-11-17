/* =============================================================================
 * 文档转换：PDF 转 Markdown / PDF 转 Word / Excel 转 Word / Excel 比对
 * -----------------------------------------------------------------------------
 * 依赖：pdf.js（取文字层）、SheetJS（读表）、JSZip（打包 docx）。
 * 说明：PDF 转文字类工具依赖 PDF 里本身有文字层；扫描件（纯图片）提取不到内容。
 * ========================================================================== */

(function () {

  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px">' +
      '<span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function loadPdfJs() {
    await TB.loadLib('pdf.min.js');
    var lib = window.pdfjsLib;
    if (lib && !lib.__workerSet) {
      lib.GlobalWorkerOptions.workerSrc = 'assets/lib/pdf.worker.min.js';
      lib.__workerSet = true;
    }
    return lib;
  }

  /* 把 PDF 的文字层按"行"聚合起来：同一 y 坐标的 item 归为一行，行内按 x 排序 */
  async function pdfLines(file, onProgress) {
    var lib = await loadPdfJs();
    var buf = await TB.readArrayBuffer(file);
    var pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
    var pages = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      if (onProgress) onProgress(i, pdf.numPages);
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      var groups = {};
      content.items.forEach(function (it) {
        if (!it.str || !it.str.trim()) return;
        var key = Math.round(it.transform[5] / 3);   /* 3pt 容差，避免同行抖动被拆开 */
        (groups[key] = groups[key] || []).push(it);
      });
      var ys = Object.keys(groups).map(Number).sort(function (a, b) { return b - a; });
      var lines = ys.map(function (y) {
        var items = groups[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; });
        var text = '';
        items.forEach(function (it, idx) {
          if (idx && it.transform[4] - (items[idx - 1].transform[4] + items[idx - 1].width) > 3) text += ' ';
          text += it.str;
        });
        return text.replace(/\s+/g, ' ').trim();
      }).filter(function (t) { return t; });
      pages.push(lines);
    }
    return { pages: pages, numPages: pdf.numPages };
  }

  /* 生成一个最小可用的 docx（正文段落数组，可选分页符） */
  async function makeDocx(blocks) {
    await TB.loadLib('jszip.min.js');
    var zip = new window.JSZip();
    var body = blocks.map(function (b) {
      if (b.pageBreak) return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      if (b.table) return b.table;
      return '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' +
        '<w:r><w:t xml:space="preserve">' + escXml(b.text) + '</w:t></w:r></w:p>';
    }).join('');

    var sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1440" w:right="1474" w:bottom="1440" w:left="1587"' +
      ' w:header="851" w:footer="992" w:gutter="0"/></w:sectPr>';

    zip.file('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>');
    zip.file('_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>');
    zip.file('word/document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      body + sect + '</w:body></w:document>');

    return await zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME });
  }

  /* -------------------------------------------------------- 1. PDF 转 Markdown */
  TB.def({
    slug: 'pdf-to-md', cat: 'office', name: 'PDF 转 Markdown', desc: '提取文字转 md', icon: '📝',
    kw: 'pdf markdown md 提取 文字 转换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b><span style="color:var(--ink-3)">需要有文字层</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>输出细节</b></div>' +
            '<label class="chk"><input type="checkbox" id="sep" checked> 每页之间加分隔线（---）</label>' +
            '<label class="chk"><input type="checkbox" id="h1"> 把明显更大的第一行识别为标题</label></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>转换并下载 .md</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">扫描版 PDF（整页是图片）提取不到文字，会得到空结果；那种文件需要先做 OCR。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var r = await pdfLines(picker.files[0].file, function (i, n) {
            status(msg, '正在提取第 ' + i + '/' + n + ' 页…');
          });
          var total = r.pages.reduce(function (a, p) { return a + p.length; }, 0);
          if (!total) throw new Error('没有提取到文字，这个 PDF 可能是扫描件（纯图片）');

          var md = r.pages.map(function (lines, i) {
            var body = lines.join('\n\n');
            if (TB.$('#h1', root).checked && lines.length) {
              body = '# ' + lines[0] + '\n\n' + lines.slice(1).join('\n\n');
            }
            return (i && TB.$('#sep', root).checked ? '\n---\n\n' : '') + body;
          }).join('\n\n');

          TB.downloadText(md, picker.files[0].file.name.replace(/\.pdf$/i, '') + '.md', 'text/markdown');
          status(msg, '完成：' + r.numPages + ' 页，共 ' + total + ' 行文字。');
        } catch (e) {
          status(msg, '转换失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------ 2. PDF 转 Word */
  TB.def({
    slug: 'pdf-to-word', cat: 'office', name: 'PDF 转 Word', desc: '提取文字生成 docx', icon: '📄',
    kw: 'pdf word docx 转换 提取 文字',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF</b></div><div id="drop"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>转换并下载 .docx</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">只提取文字与段落顺序，<b>不保留</b>原 PDF 的字体、图片、表格线。要在 Word 里继续编辑文字，这是最轻的办法；要保留版式请用「PDF 转图片」后插入。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var r = await pdfLines(picker.files[0].file, function (i, n) {
            status(msg, '正在提取第 ' + i + '/' + n + ' 页…');
          });
          var total = r.pages.reduce(function (a, p) { return a + p.length; }, 0);
          if (!total) throw new Error('没有提取到文字，这个 PDF 可能是扫描件');
          var blocks = [];
          r.pages.forEach(function (lines, i) {
            if (i) blocks.push({ pageBreak: true });
            lines.forEach(function (t) { blocks.push({ text: t }); });
          });
          var blob = await makeDocx(blocks);
          TB.download(blob, picker.files[0].file.name.replace(/\.pdf$/i, '') + '.docx');
          status(msg, '完成：' + r.numPages + ' 页，共 ' + total + ' 段文字。');
        } catch (e) {
          status(msg, '转换失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ---------------------------------------------------------- 3. Excel 转 Word */
  TB.def({
    slug: 'excel-to-word', cat: 'office', name: 'Excel 转 Word', desc: '工作表转表格', icon: '📋',
    kw: 'excel xlsx word docx 表格 转换',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 Excel</b><span style="color:var(--ink-3)">每张工作表转成一个 Word 表格</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label">首行作为表头（加粗） <input type="checkbox" id="hdr" checked style="vertical-align:middle"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>转换并下载 .docx</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">适合把对账单、清单贴进报告。表格线会自动加上，列宽按内容自适应。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.xlsx,.xls,.csv', hint: '单个表格文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root), hdr = TB.$('#hdr', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          await TB.loadLib('xlsx.full.min.js');
          var X = window.XLSX;
          var buf = await TB.readArrayBuffer(picker.files[0].file);
          var wb = X.read(new Uint8Array(buf), { type: 'array' });
          var blocks = [];

          wb.SheetNames.forEach(function (sn, si) {
            if (si) blocks.push({ pageBreak: true });
            blocks.push({ text: sn });
            var aoa = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false });
            aoa = aoa.filter(function (r) { return r && r.length; });
            if (!aoa.length) return;
            var cols = Math.max.apply(null, aoa.map(function (r) { return r.length; }));
            var rows = aoa.map(function (r, ri) {
              var cells = '';
              for (var c = 0; c < cols; c++) {
                var v = r[c] === undefined ? '' : r[c];
                var bold = (hdr.checked && ri === 0) ? '<w:rPr><w:b/></w:rPr>' : '';
                cells += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' +
                  '<w:p><w:r>' + bold + '<w:t xml:space="preserve">' + escXml(v) + '</w:t></w:r></w:p></w:tc>';
              }
              return '<w:tr>' + cells + '</w:tr>';
            }).join('');
            blocks.push({
              table: '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/>' +
                '<w:tblBorders>' +
                ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) {
                  return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>';
                }).join('') + '</w:tblBorders></w:tblPr>' +
                '<w:tblGrid>' + Array.apply(null, Array(cols)).map(function () {
                  return '<w:gridCol w:w="2400"/>';
                }).join('') + '</w:tblGrid>' + rows + '</w:tbl>'
            });
          });

          if (!blocks.length) throw new Error('这个文件里没有可转换的内容');
          var blob = await makeDocx(blocks);
          TB.download(blob, picker.files[0].file.name.replace(/\.(xlsx|xls|csv)$/i, '') + '.docx');
          status(msg, '完成：' + wb.SheetNames.length + ' 张表已转成 Word。');
        } catch (e) {
          status(msg, '转换失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------- 4. Excel 比对 */
  TB.def({
    slug: 'xlsx-diff', cat: 'office', name: 'Excel 比对', desc: '逐单元格找差异', icon: '🔬',
    kw: 'excel xlsx 比对 对比 diff 差异',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择两个表格</b><span style="color:var(--ink-3)">比较各自的第一张工作表</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label">数值近似比较（忽略末尾小数误差） <input type="checkbox" id="num" style="vertical-align:middle"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>开始比对</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div id="out"></div>' +
        '<div class="note">输出一张差异表：单元格坐标、左表值、右表值、差异类型；没有差异会给一句提示。用来核对两份报表是否被改过。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), {
        accept: '.xlsx,.xls,.csv', multiple: true, sortable: true, hint: '按顺序选两个文件'
      });
      var run = TB.$('#run', root), msg = TB.$('#msg', root), out = TB.$('#out', root);
      picker.onChange = function () { run.disabled = picker.files.length !== 2; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        out.innerHTML = '';
        try {
          await TB.loadLib('xlsx.full.min.js');
          var X = window.XLSX;
          var books = [];
          for (var i = 0; i < 2; i++) {
            var buf = await TB.readArrayBuffer(picker.files[i].file);
            var bk = X.read(new Uint8Array(buf), { type: 'array' });
            var ws = bk.Sheets[bk.SheetNames[0]];
            books.push(X.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false }));
          }
          var A = books[0], B = books[1];
          var maxR = Math.max(A.length, B.length);
          var diffs = [];
          var numeric = TB.$('#num', root).checked;

          for (var r = 0; r < maxR; r++) {
            var ra = A[r] || [], rb = B[r] || [];
            var maxC = Math.max(ra.length, rb.length);
            for (var c = 0; c < maxC; c++) {
              var va = ra[c] === undefined ? '' : ra[c];
              var vb = rb[c] === undefined ? '' : rb[c];
              var same;
              if (typeof va === 'number' && typeof vb === 'number' && numeric) {
                same = Math.abs(va - vb) < 1e-9;
              } else {
                same = String(va) === String(vb);
              }
              if (!same) {
                diffs.push({
                  cell: X.utils.encode_cell({ r: r, c: c }),
                  a: String(va), b: String(vb),
                  type: va === '' ? '仅右表有' : (vb === '' ? '仅左表有' : '值不同')
                });
              }
            }
          }

          if (!diffs.length) {
            status(msg, '完成：两张表内容完全一致。');
            run.disabled = false;
            return;
          }

          var aoa = [['单元格', '左表值', '右表值', '差异类型']].concat(diffs.map(function (d) {
            return [d.cell, d.a, d.b, d.type];
          }));
          var wbOut = X.utils.book_new();
          X.utils.book_append_sheet(wbOut, X.utils.aoa_to_sheet(aoa), '差异');
          var bytes = X.write(wbOut, { bookType: 'xlsx', type: 'array' });
          TB.download(new Blob([bytes], { type: XLSX_MIME }), '表格差异.xlsx');

          out.innerHTML = '<div class="panel"><div class="label"><b>前 10 处差异</b>' +
            '<span style="color:var(--ink-3)">共 ' + diffs.length + ' 处</span></div>' +
            '<div class="renamePv"><table class="renameTable"><thead><tr><th>单元格</th><th>左表</th><th>右表</th><th>类型</th></tr></thead><tbody>' +
            diffs.slice(0, 10).map(function (d) {
              return '<tr><td>' + d.cell + '</td><td class="old">' + TB.esc(d.a) + '</td>' +
                '<td class="new">' + TB.esc(d.b) + '</td><td>' + d.type + '</td></tr>';
            }).join('') + '</tbody></table></div></div>';
          status(msg, '完成：共 ' + diffs.length + ' 处差异，差异表已下载。');
        } catch (e) {
          status(msg, '比对失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

})();
