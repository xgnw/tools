/* =============================================================================
 * Word 类工具：清理痕迹 / 公文排版 / Word 转 Excel
 * -----------------------------------------------------------------------------
 * 全部基于 .docx 的 OOXML 结构（zip + xml），用 JSZip 拆包、正则改节点、
 * 再原样打包回去。不需要 Office，也不上传文件。
 * ========================================================================== */

(function () {

  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  async function openDocx(file) {
    await TB.loadLib('jszip.min.js');
    var buf = await TB.readArrayBuffer(file);
    try {
      return await window.JSZip.loadAsync(buf);
    } catch (e) {
      throw new Error('「' + file.name + '」不是有效的 .docx（旧版 .doc 请先另存为 .docx）');
    }
  }

  async function readXml(zip, path) {
    var f = zip.file(path);
    return f ? await f.async('string') : null;
  }

  async function saveDocx(zip, filename) {
    var blob = await zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME, compression: 'DEFLATE' });
    TB.download(blob, filename);
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px">' +
      '<span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  /* 段落纯文本（去掉所有标签，实体还原） */
  function paraText(p) {
    var t = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
      .map(function (x) { return x.replace(/<[^>]+>/g, ''); }).join('');
    return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }

  /* ------------------------------------------------------- 1. Word 清理痕迹 */
  TB.def({
    slug: 'word-clean', cat: 'office', name: 'Word 清理痕迹', desc: '去批注 / 修订 / 属性', icon: '🧽',
    kw: 'word docx 清理 批注 修订 属性 页眉 痕迹',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 .docx 文件</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>要清理的内容</b></div>' +
            '<label class="chk"><input type="checkbox" id="cmt" checked> 批注（含作者与回复）</label>' +
            '<label class="chk"><input type="checkbox" id="rev" checked> 修订记录（接受插入、删除删除）</label>' +
            '<label class="chk"><input type="checkbox" id="props" checked> 文档属性（作者 / 公司 / 最后修改人）</label>' +
            '<label class="chk"><input type="checkbox" id="hf"> 页眉与页脚</label>' +
            '<label class="chk"><input type="checkbox" id="rsid" checked> 编辑会话痕迹（rsid）</label>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>清理并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">发给外部前清一遍，避免泄露内部批注意见、修改人姓名与机器信息。清理只动这些痕迹，正文排版、图片、表格都保留。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.docx', hint: '单个 .docx 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var file = picker.files[0].file;
          var zip = await openDocx(file);
          var docXml = await readXml(zip, 'word/document.xml');
          if (!docXml) throw new Error('文件里缺少 document.xml，可能不是标准 docx');

          if (TB.$('#cmt', root).checked) {
            docXml = docXml
              .replace(/<w:commentRangeStart[^>]*\/>/g, '')
              .replace(/<w:commentRangeEnd[^>]*\/>/g, '')
              .replace(/<w:commentRangeEnd[^>]*>[\s\S]*?<\/w:commentRangeEnd>/g, '')
              .replace(/<w:commentReference[^>]*\/>/g, '');
            ['word/comments.xml', 'word/commentsExtended.xml', 'word/commentsIds.xml',
              'word/commentsExtensible.xml', 'word/people.xml'].forEach(function (p) {
              if (zip.file(p)) zip.remove(p);
            });
            var rels = await readXml(zip, 'word/_rels/document.xml.rels');
            if (rels) {
              zip.file('word/_rels/document.xml.rels',
                rels.replace(/<Relationship[^>]*Target="(comments|commentsExtended|commentsIds|people)\.xml"[^>]*\/>/g, ''));
            }
          }

          if (TB.$('#rev', root).checked) {
            /* 接受修订：插入内容保留、删除内容丢弃、移动视为删除+插入 */
            docXml = docXml
              .replace(/<w:ins[^>]*>([\s\S]*?)<\/w:ins>/g, '$1')
              .replace(/<w:moveTo[^>]*>([\s\S]*?)<\/w:moveTo>/g, '$1')
              .replace(/<w:del[^>]*>[\s\S]*?<\/w:del>/g, '')
              .replace(/<w:moveFrom[^>]*>[\s\S]*?<\/w:moveFrom>/g, '')
              .replace(/<w:rPrChange[^>]*>[\s\S]*?<\/w:rPrChange>/g, '')
              .replace(/<w:pPrChange[^>]*>[\s\S]*?<\/w:pPrChange>/g, '')
              .replace(/<w:sectPrChange[^>]*>[\s\S]*?<\/w:sectPrChange>/g, '');
          }

          if (TB.$('#hf', root).checked) {
            docXml = docXml.replace(/<w:(header|footer)Reference[^>]*\/>/g, '');
            Object.keys(zip.files).forEach(function (p) {
              if (/^word\/(header|footer)\d*\.xml$/.test(p)) zip.remove(p);
            });
            var rels2 = await readXml(zip, 'word/_rels/document.xml.rels');
            if (rels2) {
              zip.file('word/_rels/document.xml.rels',
                rels2.replace(/<Relationship[^>]*Target="(header|footer)\d*\.xml"[^>]*\/>/g, ''));
            }
          }

          if (TB.$('#rsid', root).checked) {
            docXml = docXml.replace(/\sw:rsid[A-Za-z]*="[^"]*"/g, '');
          }

          zip.file('word/document.xml', docXml);

          if (TB.$('#props', root).checked) {
            var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
              ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"' +
              ' xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
              '<dc:title></dc:title><dc:creator></dc:creator><cp:lastModifiedBy></cp:lastModifiedBy>' +
              '<cp:revision>1</cp:revision></cp:coreProperties>';
            zip.file('docProps/core.xml', core);
            var appXml = await readXml(zip, 'docProps/app.xml');
            if (appXml) {
              zip.file('docProps/app.xml', appXml
                .replace(/<Company>[\s\S]*?<\/Company>/g, '<Company></Company>')
                .replace(/<Manager>[\s\S]*?<\/Manager>/g, '<Manager></Manager>'));
            }
            if (zip.file('docProps/custom.xml')) zip.remove('docProps/custom.xml');
          }

          var outName = file.name.replace(/\.docx$/i, '') + '_已清理.docx';
          await saveDocx(zip, outName);
          status(msg, '完成：已生成「' + outName + '」。');
        } catch (e) {
          status(msg, '清理失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* --------------------------------------------------------- 2. Word 公文排版 */
  TB.def({
    slug: 'word-format', cat: 'office', name: 'Word 公文排版', desc: '一键统一字体行距', icon: '📜',
    kw: 'word docx 排版 公文 格式 字体 行距 页边距',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 .docx 文件</b><span style="color:var(--ink-3)">首段自动作为标题居中</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>版式</b></div>' +
            '<select class="select" id="preset">' +
              '<option value="gov">党政机关公文（仿宋三号 / 28 磅行距 / 公文页边距）</option>' +
              '<option value="report">一般报告（宋体小四 / 1.5 倍行距 / 常规页边距）</option>' +
            '</select></div>' +
          '<div class="field"><div class="label">正文字号 / 行距（磅）</div>' +
            '<div class="row2"><input class="input" id="size" type="number" value="16" min="9" max="26" step="0.5">' +
            '<input class="input" id="line" type="number" value="28" min="12" max="60" step="1"></div></div>' +
          '<div class="field"><div class="label">首行缩进（字符）</div>' +
            '<input class="input" id="indent" type="number" value="2" min="0" max="8" step="1"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>排版并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">会自动识别「一、」「（一）」「1.」开头的标题层级，分别用黑体、楷体、仿宋加粗；其余段落按正文处理。标题字体若本机没有，Word 会回退显示，但字号、行距、缩进、页边距都是写死的。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.docx', hint: '单个 .docx 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      var preset = TB.$('#preset', root), sizeInp = TB.$('#size', root), lineInp = TB.$('#line', root), indentInp = TB.$('#indent', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      preset.addEventListener('change', function () {
        if (preset.value === 'gov') {
          sizeInp.value = 16; lineInp.value = 28; indentInp.value = 2;
        } else {
          sizeInp.value = 12; lineInp.value = 22; indentInp.value = 2;
        }
      });

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          var file = picker.files[0].file;
          var zip = await openDocx(file);
          var docXml = await readXml(zip, 'word/document.xml');
          if (!docXml) throw new Error('缺少 document.xml');

          var cmToTwip = 566.93;
          var margins = preset.value === 'gov'
            ? { top: 3.7, bottom: 3.5, left: 2.8, right: 2.6 }
            : { top: 2.54, bottom: 2.54, left: 3.17, right: 3.17 };
          var pgMar = '<w:pgMar w:top="' + Math.round(margins.top * cmToTwip) + '"' +
            ' w:right="' + Math.round(margins.right * cmToTwip) + '"' +
            ' w:bottom="' + Math.round(margins.bottom * cmToTwip) + '"' +
            ' w:left="' + Math.round(margins.left * cmToTwip) + '"' +
            ' w:header="' + Math.round(1.5 * cmToTwip) + '" w:footer="' + Math.round(1.75 * cmToTwip) + '"' +
            ' w:gutter="0"/>';

          docXml = docXml.replace(/<w:pgMar[^>]*\/>/g, pgMar);
          if (!/<w:pgMar/.test(docXml)) {
            docXml = docXml.replace(/<w:sectPr([^>]*)>/, '<w:sectPr$1>' + pgMar);
          }

          var bodySize = Math.round((parseFloat(sizeInp.value) || 16) * 2);   /* 半磅 */
          var lineTwip = Math.round((parseFloat(lineInp.value) || 28) * 20);
          var firstLine = Math.round((parseFloat(indentInp.value) || 0) * 200);  /* 200 = 2 字符 */
          var bodyFont = preset.value === 'gov' ? '仿宋_GB2312' : '宋体';
          var asciiFont = preset.value === 'gov' ? 'Times New Roman' : 'Calibri';

          var seenFirst = false;
          var outXml = docXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, function (p) {
            var text = paraText(p).trim();
            var kind = 'body';
            if (!text) return p;                        /* 空段落保持原样 */
            if (!seenFirst) { kind = 'title'; seenFirst = true; }
            else if (/^[一二三四五六七八九十]+、/.test(text)) kind = 'h1';
            else if (/^（[一二三四五六七八九十]+）/.test(text)) kind = 'h2';
            else if (/^\d+[.、]/.test(text)) kind = 'h3';

            var font = bodyFont, sizeHalf = bodySize, jc = 'both', bold = false, indentChars = firstLine;
            if (kind === 'title') { font = '方正小标宋简体'; sizeHalf = 44; jc = 'center'; indentChars = 0; }
            if (kind === 'h1') { font = '黑体'; indentChars = 0; }
            if (kind === 'h2') { font = preset.value === 'gov' ? '楷体_GB2312' : '楷体'; indentChars = 0; }
            if (kind === 'h3') { bold = true; indentChars = 0; }

            var pPr = '<w:pPr>' +
              '<w:spacing w:before="0" w:after="0" w:line="' + lineTwip + '" w:lineRule="exact"/>' +
              '<w:ind w:firstLineChars="' + indentChars + '" w:firstLine="' + Math.round(indentChars * sizeHalf / 2 * 20) + '"/>' +
              '<w:jc w:val="' + jc + '"/>' +
              '</w:pPr>';

            /* 保留原有的 sectPr（分节符），其余 pPr 用新样式覆盖 */
            var sect = (p.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/) || [''])[0];
            var pNoPr = p.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, pPr + sect);
            if (pNoPr === p) {
              pNoPr = p.replace(/(<w:p\b[^>]*>)/, '$1' + pPr + sect);
            }

            /* 逐个 run 写字体字号，保留加粗/下划线等原有属性 */
            return pNoPr.replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, function (r) {
              var rPr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
              var fonts = '<w:rFonts w:ascii="' + asciiFont + '" w:hAnsi="' + asciiFont +
                '" w:eastAsia="' + font + '" w:cs="' + asciiFont + '"/>';
              var sz = '<w:sz w:val="' + sizeHalf + '"/><w:szCs w:val="' + sizeHalf + '"/>';
              if (bold) sz += '<w:b/><w:bCs/>';
              if (rPr) {
                var inner = rPr.replace(/<\/?w:rPr>/g, '');
                inner = inner.replace(/<w:rFonts[^>]*\/>/g, '').replace(/<w:sz[^>]*\/>/g, '').replace(/<w:szCs[^>]*\/>/g, '');
                if (bold) inner = inner.replace(/<w:b[^>]*\/>/g, '').replace(/<w:bCs[^>]*\/>/g, '');
                rPr = '<w:rPr>' + fonts + sz + inner + '</w:rPr>';
                r = r.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, rPr);
              } else {
                r = r.replace(/(<w:r\b[^>]*>)/, '$1<w:rPr>' + fonts + sz + '</w:rPr>');
              }
              return r;
            });
          });

          zip.file('word/document.xml', outXml);
          var outName = file.name.replace(/\.docx$/i, '') + '_排版.docx';
          await saveDocx(zip, outName);
          status(msg, '完成：已生成「' + outName + '」。');
        } catch (e) {
          status(msg, '排版失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------- 3. Word 转 Excel */
  TB.def({
    slug: 'word-to-excel', cat: 'office', name: 'Word 转 Excel', desc: '表格 / 段落提取成表', icon: '📊',
    kw: 'word docx 转 excel 表格 段落 提取',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 .docx 文件</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>提取内容</b></div>' +
            '<select class="select" id="mode">' +
              '<option value="table">只提取表格（每个表格一张工作表）</option>' +
              '<option value="both">表格 + 段落（没有表格时用段落）</option>' +
              '<option value="para">只提取段落（每段一行）</option>' +
            '</select></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>提取并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">只读取文字与表格结构，不保留 Word 的样式。合并单元格会按左上角值 + 空格占位还原成网格。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.docx', hint: '单个 .docx 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root), mode = TB.$('#mode', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        try {
          await TB.loadLib('xlsx.full.min.js');
          var X = window.XLSX;
          var zip = await openDocx(picker.files[0].file);
          var docXml = await readXml(zip, 'word/document.xml');
          if (!docXml) throw new Error('缺少 document.xml');

          var wb = X.utils.book_new();
          var tableCount = 0;

          if (mode.value !== 'para') {
            (docXml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []).forEach(function (tbl, ti) {
              var aoa = [];
              (tbl.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g) || []).forEach(function (tr) {
                var row = [];
                (tr.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g) || []).forEach(function (tc) {
                  var span = (tc.match(/<w:gridSpan[^>]*w:val="(\d+)"/) || [])[1];
                  var text = (tc.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [])
                    .map(function (x) { return x.replace(/<[^>]+>/g, ''); }).join('');
                  row.push(unescapeXml(text).trim());
                  for (var s = 1; s < (parseInt(span, 10) || 1); s++) row.push('');
                });
                if (row.length) aoa.push(row);
              });
              if (aoa.length) {
                tableCount++;
                X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), '表格' + (ti + 1));
              }
            });
          }

          if (mode.value !== 'table' && (!tableCount || mode.value === 'para')) {
            var paras = (docXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [])
              .map(paraText).filter(function (t) { return t.trim(); });
            var aoa2 = paras.map(function (t) {
              /* 用制表符/中文冒号/连续空格切列，方便直接成表 */
              var cells = t.split(/\t|：|:|\s{2,}/).filter(function (x, i, arr) { return x !== '' || i < arr.length; });
              return cells.length ? cells : [t];
            });
            X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa2), '段落');
          }

          if (!wb.SheetNames.length) throw new Error('这个文档里没有找到可提取的表格或段落');
          var out = X.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
          TB.download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            picker.files[0].file.name.replace(/\.docx$/i, '') + '_表格.xlsx');
          status(msg, '完成：' + wb.SheetNames.length + ' 张工作表' + (tableCount ? '（含 ' + tableCount + ' 个表格）' : '') + '。');
        } catch (e) {
          status(msg, '提取失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  function unescapeXml(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }

})();
