/* =============================================================================
 * 办公文档类工具：PDF 合并 / 拆分 / 图片转 PDF / 加页码 / Word 批量替换
 * -----------------------------------------------------------------------------
 * 依赖：pdf-lib（PDF 读写）、JSZip（解析 .docx 压缩包），均为按需懒加载。
 * 所有处理都在浏览器内完成，文件不会离开本机。
 * ========================================================================== */

(function () {

  var PDFLib = function () { return window.PDFLib; };

  /* 读取 PDF 并转成 pdf-lib 文档对象；加密文件给出可读的提示 */
  async function loadPdf(file) {
    await TB.loadLib('pdf-lib.min.js');
    var buf = await TB.readArrayBuffer(file);
    try {
      return await PDFLib().PDFDocument.load(buf, { ignoreEncryption: true });
    } catch (e) {
      throw new Error('无法读取「' + file.name + '」，可能已加密或文件损坏');
    }
  }

  /* 统一的"执行中"提示 */
  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px">' +
      '<span class="' + (isErr ? 'result-err' : '') + '">' + text + '</span></div>' : '';
  }

  /* ------------------------------------------------------------------ 1. PDF 合并 */
  TB.def({
    slug: 'pdf-merge', cat: 'office', name: 'PDF 合并', desc: '多份合并为一份', icon: '📚',
    kw: 'pdf merge 合并 拼接 排序',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF 文件</b><span style="color:var(--ink-3)">可拖拽、可调整顺序</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>合并并下载</button>' +
            '<button class="btn" id="clear">清空</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note"><b>说明：</b>合并顺序 = 下面列表的顺序，用 ↑ ↓ 调整。加密 PDF 无法处理，请先解密。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), {
        accept: '.pdf', multiple: true, sortable: true, hint: '支持一次选择多份 PDF'
      });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);

      picker.onChange = function () {
        run.disabled = picker.files.length < 2;
      };

      TB.$('#clear', root).addEventListener('click', function () {
        picker.clear();
        status(msg, '');
        run.disabled = true;
      });

      run.addEventListener('click', async function () {
        var files = picker.files.map(function (f) { return f.file; });
        if (files.length < 2) return;
        run.disabled = true;
        status(msg, '正在合并…');
        try {
          /* 先确保 pdf-lib 已注入，再取 window.PDFLib */
          await TB.loadLib('pdf-lib.min.js');
          var out = await PDFLib().PDFDocument.create();
          for (var i = 0; i < files.length; i++) {
            var doc = await loadPdf(files[i]);
            var pages = await out.copyPages(doc, doc.getPageIndices());
            pages.forEach(function (p) { out.addPage(p); });
          }
          var bytes = await out.save();
          TB.download(new Blob([bytes], { type: 'application/pdf' }), '合并结果.pdf');
          status(msg, '完成，共合并 ' + files.length + ' 份，合计 ' + out.getPageCount() + ' 页，已开始下载。');
        } catch (e) {
          status(msg, '合并失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------------ 2. PDF 拆分 */
  TB.def({
    slug: 'pdf-split', cat: 'office', name: 'PDF 拆分', desc: '按页或范围拆分', icon: '✂️',
    kw: 'pdf split 拆分 分页 提取页面',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF 文件</b></div><div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>拆分方式</b></div>' +
            '<select class="select" id="mode">' +
              '<option value="each">每 1 页拆一份（全部拆开）</option>' +
              '<option value="n">每 N 页拆一份</option>' +
              '<option value="range">指定页码范围（每段一份）</option>' +
            '</select></div>' +
          '<div class="field" id="nBox" hidden><div class="label">每份页数</div>' +
            '<input class="input" id="n" type="number" min="1" value="2"></div>' +
          '<div class="field" id="rBox" hidden><div class="label">页码范围<span style="color:var(--ink-3)">用逗号分隔多段，如 1-3, 5, 8-10</span></div>' +
            '<input class="input" id="range" type="text" placeholder="1-3, 5, 8-10"></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>开始拆分</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">拆成多份时自动打包成一个 zip 下载；只有一份时直接输出 PDF。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var mode = TB.$('#mode', root), nBox = TB.$('#nBox', root), rBox = TB.$('#rBox', root);
      var run = TB.$('#run', root), msg = TB.$('#msg', root);

      picker.onChange = function () { run.disabled = !picker.files.length; };
      mode.addEventListener('change', function () {
        nBox.hidden = mode.value !== 'n';
        rBox.hidden = mode.value !== 'range';
      });

      run.addEventListener('click', async function () {
        if (!picker.files.length) return;
        var file = picker.files[0].file;
        run.disabled = true;
        status(msg, '正在读取 PDF…');
        try {
          var src = await loadPdf(file);
          var total = src.getPageCount();
          var groups = [];

          if (mode.value === 'each') {
            for (var i = 0; i < total; i++) groups.push({ label: '第' + (i + 1) + '页', idx: [i] });
          } else if (mode.value === 'n') {
            var n = Math.max(1, parseInt(TB.$('#n', root).value, 10) || 1);
            for (var s = 0; s < total; s += n) {
              var e = Math.min(total, s + n);
              groups.push({ label: (s + 1) + '-' + e + '页', idx: rangeIdx(s, e) });
            }
          } else {
            var spec = TB.$('#range', root).value.trim();
            if (!spec) throw new Error('请先填写页码范围');
            spec.split(/[,，]/).forEach(function (seg) {
              seg = seg.trim();
              if (!seg) return;
              var m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
              var a, b;
              if (m) { a = parseInt(m[1], 10); b = parseInt(m[2], 10); }
              else if (/^\d+$/.test(seg)) { a = b = parseInt(seg, 10); }
              else throw new Error('页码格式不对：' + seg);
              if (a < 1 || b > total || a > b) throw new Error('页码超出范围（共 ' + total + ' 页）：' + seg);
              groups.push({ label: a + '-' + b + '页', idx: rangeIdx(a - 1, b) });
            });
          }

          var entries = [];
          for (var g = 0; g < groups.length; g++) {
            var doc = await PDFLib().PDFDocument.create();
            var pages = await doc.copyPages(src, groups[g].idx);
            pages.forEach(function (p) { doc.addPage(p); });
            entries.push({ name: baseName(file.name) + '_' + groups[g].label + '.pdf', blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
          }

          if (entries.length === 1) {
            TB.download(entries[0].blob, entries[0].name);
          } else {
            await TB.zipDownload(entries, baseName(file.name) + '_拆分.zip');
          }
          status(msg, '完成：原文件 ' + total + ' 页，拆成 ' + entries.length + ' 份。');
        } catch (e) {
          status(msg, '拆分失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  function rangeIdx(a, b) {
    var r = [];
    for (var i = a; i < b; i++) r.push(i);
    return r;
  }

  function baseName(name) {
    return String(name).replace(/\.[^.]+$/, '');
  }

  /* ------------------------------------------------------------------ 3. 图片转 PDF */
  TB.def({
    slug: 'img-to-pdf', cat: 'office', name: '图片转 PDF', desc: '多图合成一份 PDF', icon: '🖼️',
    kw: 'jpg png 图片 pdf 合成 电子书',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择图片</b><span style="color:var(--ink-3)">JPG / PNG / WebP / GIF</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">纸张</div><select class="select" id="paper">' +
              '<option value="a4">A4 纵向</option><option value="a4l">A4 横向</option>' +
              '<option value="fit">按图片自适应（无留白）</option></select></div>' +
            '<div class="field"><div class="label">页面边距（pt）</div><input class="input" id="pad" type="number" min="0" max="72" value="18"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>生成 PDF</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">每张图片一页，按比例缩放居中。透明 PNG 会铺在白底上，避免打印发黑。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', multiple: true, sortable: true, hint: '拖拽可调整页序' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        status(msg, '正在处理图片…');
        try {
          await TB.loadLib('pdf-lib.min.js');
          var doc = await PDFLib().PDFDocument.create();
          var pad = Math.max(0, parseInt(TB.$('#pad', root).value, 10) || 0);
          var paper = TB.$('#paper', root).value;

          for (var i = 0; i < picker.files.length; i++) {
            var file = picker.files[i].file;
            /* 统一转成 PNG：规避 pdf-lib 不支持 WebP / GIF 的问题 */
            var pngBytes = await imageToPngBytes(file, 2000);
            var emb = await doc.embedPng(pngBytes);
            var pageW, pageH;
            if (paper === 'fit') {
              pageW = emb.width + pad * 2;
              pageH = emb.height + pad * 2;
            } else if (paper === 'a4l') {
              pageW = 841.89; pageH = 595.28;
            } else {
              pageW = 595.28; pageH = 841.89;
            }
            var page = doc.addPage([pageW, pageH]);
            var availW = pageW - pad * 2, availH = pageH - pad * 2;
            var scale = Math.min(availW / emb.width, availH / emb.height);
            var w = emb.width * scale, h = emb.height * scale;
            page.drawImage(emb, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
          }

          var bytes = await doc.save();
          TB.download(new Blob([bytes], { type: 'application/pdf' }), '图片合成.pdf');
          status(msg, '完成：' + picker.files.length + ' 张图片，' + doc.getPageCount() + ' 页。');
        } catch (e) {
          status(msg, '生成失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* 把任意浏览器可解码的图片压到最长边 maxSide，输出 PNG（白底，防透明变黑） */
  async function imageToPngBytes(file, maxSide) {
    var r = await TB.readImage(file);
    var img = r.img;
    var w = img.naturalWidth, h = img.naturalHeight;
    var scale = 1;
    if (maxSide && Math.max(w, h) > maxSide) scale = maxSide / Math.max(w, h);
    var c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    var g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(r.url);
    var blob = await TB.canvasBlob(c, 'image/png');
    return await new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.readAsArrayBuffer(blob);
    });
  }

  /* ------------------------------------------------------------------ 4. PDF 加页码 */
  TB.def({
    slug: 'pdf-number', cat: 'office', name: 'PDF 加页码', desc: '批量添加页码', icon: '🔢',
    kw: 'pdf 页码 编号 页码章',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 PDF 文件</b></div><div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">位置</div><select class="select" id="pos">' +
              '<option value="br">右下角</option><option value="bc" selected>底部居中</option>' +
              '<option value="bl">左下角</option><option value="tr">右上角</option></select></div>' +
            '<div class="field"><div class="label">起始页码</div><input class="input" id="start" type="number" value="1" min="0"></div>' +
            '<div class="field"><div class="label">字号</div><input class="input" id="size" type="number" value="10" min="6" max="24"></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>格式</b><span style="color:var(--ink-3)">用 {n} 表示当前页，{total} 表示总页数</span></div>' +
            '<input class="input" id="fmt" type="text" value="{n} / {total}" style="font-family:ui-monospace,monospace"></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>添加页码</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">数字用 PDF 内置 Helvetica 字体绘制，不支持中文；需要中文页码请用 "1 / 12" 这类纯数字格式。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.pdf', hint: '单个 PDF 文件' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        run.disabled = true;
        status(msg, '正在写入页码…');
        try {
          await TB.loadLib('pdf-lib.min.js');
          var doc = await loadPdf(picker.files[0].file);
          var font = await doc.embedFont(PDFLib().StandardFonts.Helvetica);
          var start = parseInt(TB.$('#start', root).value, 10) || 0;
          var size = Math.max(6, parseInt(TB.$('#size', root).value, 10) || 10);
          var fmtStr = TB.$('#fmt', root).value || '{n}';
          /* 内置 Helvetica 只支持 Latin-1，中文会在 drawText 时抛错，这里提前给可读提示 */
          if (/[^\x20-\x7E]/.test(fmtStr)) {
            throw new Error('页码格式含中文或特殊符号，PDF 内置字体画不出来。请改成纯数字格式，例如 {n} / {total}');
          }
          var pages = doc.getPages();
          var total = pages.length;

          pages.forEach(function (p, i) {
            var n = start + i;
            var text = fmtStr.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));
            var tw = font.widthOfTextAtSize(text, size);
            var pw = p.getWidth(), ph = p.getHeight();
            var pos = TB.$('#pos', root).value;
            var m = 24;
            var x = pos === 'br' || pos === 'tr' ? pw - tw - m : pos === 'bl' ? m : (pw - tw) / 2;
            var y = pos === 't' || pos === 'tr' ? ph - size - m : m;
            p.drawText(text, { x: x, y: y, size: size, font: font, color: PDFLib().rgb(0.25, 0.3, 0.38) });
          });

          var bytes = await doc.save();
          TB.download(new Blob([bytes], { type: 'application/pdf' }), baseName(picker.files[0].file.name) + '_页码.pdf');
          status(msg, '完成：' + total + ' 页已加页码。');
        } catch (e) {
          status(msg, '失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------------ 5. Word 批量替换 */
  TB.def({
    slug: 'word-replace', cat: 'office', name: 'Word 批量替换', desc: '多组规则一次替换', icon: '🔁',
    kw: 'docx word 替换 批量 敏感词 脱敏',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择 .docx 文件</b><span style="color:var(--ink-3)">旧版 .doc 请先另存为 .docx</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="field"><div class="label"><b>替换规则</b><span style="color:var(--ink-3)">每行一条：查找 => 替换</span></div>' +
            '<textarea class="textarea" id="rules" placeholder="某某公司 => 甲方&#10;2024年 => 2025年&#10;联系电话 => （已隐去）"></textarea></div>' +
          '<div class="field"><label class="checks"><label><input type="checkbox" id="cross" checked> 跨片段匹配（推荐）</label>' +
            '<label><input type="checkbox" id="meta" checked> 同时清理文档属性</label></div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>替换并下载</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">原理：.docx 本质是 zip，直接改写 word/document.xml、页眉页脚里的文字，<b>不改动排版和样式</b>。' +
        '「跨片段匹配」会先合并被 Word 拆散的同一段文字再替换，成功率更高。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: '.docx', hint: '单个 Word 文档' });
      var run = TB.$('#run', root), msg = TB.$('#msg', root);
      picker.onChange = function () { run.disabled = !picker.files.length; };

      run.addEventListener('click', async function () {
        if (!picker.files.length) return;
        var rules = parseRules(TB.$('#rules', root).value);
        if (!rules.length) { status(msg, '请先填写至少一条替换规则，格式：查找 => 替换', true); return; }
        run.disabled = true;
        status(msg, '正在替换…');
        try {
          await TB.loadLib('jszip.min.js');
          var file = picker.files[0].file;
          var zip = await window.JSZip.loadAsync(await TB.readArrayBuffer(file));
          var count = 0;
          var cross = TB.$('#cross', root).checked;

          var targets = [];
          zip.forEach(function (path, entry) {
            if (/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(path)) targets.push(path);
          });

          for (var ti = 0; ti < targets.length; ti++) {
            var xml = await zip.file(targets[ti]).async('string');
            var res = replaceInXml(xml, rules, cross);
            count += res.count;
            if (res.count) zip.file(targets[ti], res.xml);
          }

          /* 文档属性里的标题/作者/公司名也一起换掉 */
          if (TB.$('#meta', root).checked && zip.file('docProps/core.xml')) {
            var core = await zip.file('docProps/core.xml').async('string');
            var rc = replaceInXml(core, rules, false);
            count += rc.count;
            if (rc.count) zip.file('docProps/core.xml', rc.xml);
          }

          if (!count) { status(msg, '没有匹配到任何内容，检查一下查找词是否写对。', true); run.disabled = false; return; }

          var out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          TB.download(out, baseName(file.name) + '_已替换.docx');
          status(msg, '完成：共替换 ' + count + ' 处。');
        } catch (e) {
          status(msg, '替换失败：' + e.message, true);
        }
        run.disabled = false;
      });
    }
  });

  /* 解析规则文本：支持 => / -> / 制表符 三种分隔 */
  function parseRules(text) {
    var out = [];
    (text || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var m = line.match(/^(.*?)\s*(?:=>|->|\t)\s*(.*)$/);
      if (m && m[1]) out.push({ find: m[1], rip: m[2] == null ? '' : m[2] });
    });
    return out;
  }

  /* XML 字符串层面的替换：先转义查找/替换词，避免破坏 XML 结构 */
  function replaceInXml(xml, rules, cross) {
    var count = 0;
    rules.forEach(function (r) {
      var pat = escXml(r.find);
      var rep = escXml(r.rip);
      var parts = xml.split(pat);
      if (parts.length > 1) {
        count += parts.length - 1;
        xml = parts.join(rep);
      }
    });

    /* 跨 run 的兜底：Word 常把一个词拆成多个 <w:t>。
     * 做法：把每个段落里所有 w:t 文字合并判断，命中就把整段并到第一个 w:t，其余清空。
     * 只在纯文本层面处理，段落级样式仍然保留。
     * 注意：用 localName 匹配而不是 getElementsByTagName('w:t')，
     * 因为有些编辑器导出的 docx 用默认命名空间（标签没有 w: 前缀）。 */
    if (cross && typeof DOMParser !== 'undefined') {
      try {
        var doc = new DOMParser().parseFromString(xml, 'application/xml');
        var all = doc.getElementsByTagName('*');
        var paras = [];
        for (var i = 0; i < all.length; i++) {
          if (all[i].localName === 'p') paras.push(all[i]);
        }

        for (var pi = 0; pi < paras.length; pi++) {
          var ts = [];
          var kids = paras[pi].getElementsByTagName('*');
          for (var ki = 0; ki < kids.length; ki++) {
            if (kids[ki].localName === 't') ts.push(kids[ki]);
          }
          if (ts.length < 2) continue;

          var joined = '';
          for (var j = 0; j < ts.length; j++) joined += ts[j].textContent;

          var changed = joined, hits = 0;
          rules.forEach(function (r) {
            if (!r.find || joined.indexOf(r.find) < 0) return;
            var idx = joined.indexOf(r.find);
            while (idx >= 0) { hits++; idx = joined.indexOf(r.find, idx + r.find.length); }
            changed = changed.split(r.find).join(r.rip);
          });
          if (!hits) continue;

          ts[0].textContent = changed;
          for (var k = 1; k < ts.length; k++) ts[k].textContent = '';
          count += hits;
        }
        xml = new XMLSerializer().serializeToString(doc);
      } catch (e) { /* XML 解析失败就跳过兜底，不影响主流程 */ }
    }

    return { xml: xml, count: count };
  }

  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

})();
