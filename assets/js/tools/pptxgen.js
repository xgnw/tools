/* =============================================================================
 * PPT 演示文稿生成器
 * -----------------------------------------------------------------------------
 * 用文字大纲或表格，在浏览器里生成标准 .pptx 文件。
 * 依赖：PptxGenJS（MIT），按需从 assets/lib 加载，不上传任何内容。
 *
 * 大纲约定：
 *   # 封面标题          可选；不填则使用上方“主标题”
 *   ## 章节标题         每个二级标题开始一个新章节
 *   - 要点 / 1. 要点    章节内的正文，每 6 条自动分页
 *   普通文字            也会作为一条正文
 *   > 备注              作为演讲备注写入当前页
 * ========================================================================== */
(function () {
  'use strict';

  var THEMES = {
    blue: {
      name: '商务蓝',
      bg: 'F5F8FD',
      ink: '172033',
      sub: '5B6B84',
      accent: '2F6BFF',
      accent2: '8FB2FF',
      panel: 'FFFFFF',
      line: 'DCE6F7'
    },
    green: {
      name: '清新绿',
      bg: 'F4FAF7',
      ink: '16302A',
      sub: '567069',
      accent: '168C68',
      accent2: '8FD6BE',
      panel: 'FFFFFF',
      line: 'D7ECE4'
    },
    dark: {
      name: '深色科技',
      bg: '101725',
      ink: 'F4F7FF',
      sub: 'A9B7CC',
      accent: '6EA8FF',
      accent2: '9D7BFF',
      panel: '182235',
      line: '2A3854'
    },
    warm: {
      name: '暖橙',
      bg: 'FFF9F2',
      ink: '35241A',
      sub: '84695A',
      accent: 'E56A2E',
      accent2: 'FFC08E',
      panel: 'FFFFFF',
      line: 'F4DFCE'
    },
    purple: {
      name: '紫罗兰',
      bg: 'F9F6FF',
      ink: '251A3B',
      sub: '6F6388',
      accent: '7652D6',
      accent2: 'C3B1FF',
      panel: 'FFFFFF',
      line: 'E7DFF9'
    },
    mono: {
      name: '极简黑白',
      bg: 'F7F7F6',
      ink: '161616',
      sub: '6B6B6B',
      accent: '222222',
      accent2: 'BDBDBD',
      panel: 'FFFFFF',
      line: 'E2E2E0'
    }
  };

  var SAMPLE_OUTLINE =
    '# 简单工具箱 · 产品介绍\n' +
    '## 我们解决什么问题\n' +
    '- 日常小任务分散在十几个网站，登录、上传、等待，步骤太多\n' +
    '- 很多在线工具会把文件传到服务器，隐私和速度都不可控\n' +
    '- 简单工具箱把常用处理集中到一个页面，打开即用\n' +
    '## 核心特点\n' +
    '- 纯前端运行：文件只在浏览器内存里处理，不上传服务器\n' +
    '- 不需要登录：没有账号、次数限制、水印和排队\n' +
    '- 响应式界面：电脑、平板、手机都能直接使用\n' +
    '- 持续扩充：办公、图片、文档、站长、数据、AI、休闲七个分类\n' +
    '## 典型使用场景\n' +
    '- 临时压缩图片、转换格式、生成二维码\n' +
    '- 合并拆分 PDF、给 PDF 签名、提取文字\n' +
    '- 处理 CSV、生成图表、格式化 JSON\n' +
    '- 写文案时顺手做字帖、配色、思维导图\n' +
    '> 讲到这里可以现场打开一个工具演示，30 秒内完成一次真实处理。\n' +
    '## 接下来做什么\n' +
    '- 继续接入 MIT / Apache 许可的开源能力\n' +
    '- 优化移动端操作和键盘可达性\n' +
    '- 保持零后端、零追踪、零上传';

  var SAMPLE_TABLE =
    '工具分类|工具数量|代表工具\n' +
    '办公文档|37|PDF 合并、PPT 生成、Word 预览\n' +
    '图片处理|28|图片压缩、OCR、截图美化\n' +
    '文档创作|11|Markdown、Mermaid、字帖\n' +
    '站长工具|92|JSON、正则、HTTP 头\n' +
    '数据驿站|28|CSV、SQLite、图表\n' +
    'AI 工具集|6|提示词、文本处理\n' +
    '休闲娱乐|24|骰子、抽签、计时';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cleanLines(text) {
    return String(text || '').replace(/\r/g, '').split('\n').map(function (s) {
      return s.replace(/\s+$/, '');
    });
  }

  /* 去掉 Markdown 行首标记，返回 { kind, text } */
  function classifyLine(raw) {
    var line = raw.trim();
    if (!line) return { kind: 'blank', text: '' };
    if (/^#{1,6}\s+/.test(line)) {
      return { kind: 'heading', level: line.match(/^#+/)[0].length, text: line.replace(/^#{1,6}\s+/, '').trim() };
    }
    if (/^>\s?/.test(line)) return { kind: 'note', text: line.replace(/^>\s?/, '').trim() };
    if (/^[-*+]\s+/.test(line)) return { kind: 'bullet', text: line.replace(/^[-*+]\s+/, '').trim() };
    if (/^\d+[.)、]\s*/.test(line)) return { kind: 'bullet', text: line.replace(/^\d+[.)、]\s*/, '').trim() };
    if (/^---+$/.test(line)) return { kind: 'blank', text: '' };
    return { kind: 'bullet', text: line };
  }

  /* 把大纲解析成 deck：{ coverTitle, subtitle, sections:[{title,bullets:[{text,note}]}] } */
  function parseOutline(text, fallbackTitle) {
    var lines = cleanLines(text);
    var coverTitle = '';
    var sections = [];
    var current = null;

    function ensureSection(title) {
      current = { title: title || '正文', bullets: [] };
      sections.push(current);
      return current;
    }

    lines.forEach(function (raw) {
      var line = classifyLine(raw);
      if (!line.text) return;
      if (line.kind === 'heading') {
        if (line.level === 1 && !coverTitle && !sections.length) {
          coverTitle = line.text;
        } else {
          ensureSection(line.text);
        }
        return;
      }
      if (line.kind === 'note') {
        if (!current || !current.bullets.length) return;
        var last = current.bullets[current.bullets.length - 1];
        last.note = (last.note ? last.note + '\n' : '') + line.text;
        return;
      }
      if (!current) ensureSection('');
      current.bullets.push({ text: line.text, note: '' });
    });

    if (!sections.length) sections.push({ title: '正文', bullets: [{ text: '在左侧大纲里输入内容后，这里会自动生成页面。', note: '' }] });

    return {
      coverTitle: coverTitle || fallbackTitle || '演示文稿',
      sections: sections.filter(function (s) { return s.title !== '' || s.bullets.length; })
    };
  }

  /* 解析竖线分隔的表格；也兼容 CSV 逗号分隔 */
  function parseTable(text) {
    var lines = cleanLines(text).filter(function (s) { return s.trim(); });
    if (!lines.length) return [];
    var delim = '|';
    if (lines[0].indexOf('|') < 0) delim = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
    return lines.map(function (line) { return line.split(delim); }).filter(function (r) { return r.length > 1; });
  }

  /* 把长正文切成每页最多 6 条，标题过长时截断 */
  function paginate(section) {
    var pages = [];
    var bullets = section.bullets.length ? section.bullets : [{ text: '（本节暂无要点）', note: '' }];
    for (var i = 0; i < bullets.length; i += 6) {
      pages.push({
        title: section.title || '正文',
        index: pages.length + 1,
        total: Math.ceil(bullets.length / 6),
        bullets: bullets.slice(i, i + 6)
      });
    }
    return pages;
  }

  function buildModel(opts) {
    var outline = parseOutline(opts.outline, opts.title);
    var sections = outline.sections;
    var slides = [];
    slides.push({ type: 'cover', title: opts.title || outline.coverTitle, subtitle: opts.subtitle });
    if (sections.length > 1 || (sections[0] && sections[0].title && sections[0].title !== '正文')) {
      slides.push({ type: 'agenda', items: sections.map(function (s) { return s.title; }) });
    }
    sections.forEach(function (section) {
      // 多章节时先放一张章节过渡页；单章节“正文”不需要
      if (sections.length > 1) {
        slides.push({ type: 'section', title: section.title || '正文' });
      }
      var pages = paginate(section);
      pages.forEach(function (p, idx) {
        slides.push({
          type: 'content',
          title: p.title + (pages.length > 1 ? '（' + (idx + 1) + '/' + pages.length + '）' : ''),
          bullets: p.bullets,
          pageIndex: idx + 1,
          pageTotal: pages.length
        });
      });
    });
    if (opts.closing !== false) slides.push({ type: 'end', title: '谢谢观看', subtitle: '简单工具箱 · tools.432600.xyz' });
    return { coverTitle: opts.title || outline.coverTitle, slides: slides, outline: outline };
  }

  function buildTableModel(opts) {
    var rows = parseTable(opts.outline);
    if (!rows.length) throw new Error('表格内容为空，请至少填写表头和一行数据');
    var slides = [
      { type: 'cover', title: opts.title || '数据表格', subtitle: opts.subtitle },
      { type: 'table', rows: rows, title: '数据明细' }
    ];
    return { coverTitle: opts.title, slides: slides, tableRows: rows };
  }

  /* 预览：把生成的页面按 16:9 缩小展示，纯 HTML，不依赖 PPT 引擎 */
  function previewCard(slide, i, total, theme) {
    var foot = '<div class="ppt-foot"><span>简单工具箱</span><span>' + (i + 1) + ' / ' + total + '</span></div>';
    var body = '';
    if (slide.type === 'cover') {
      body = '<div class="ppt-cover"><span class="ppt-kicker">PRESENTATION</span><h3>' + esc(slide.title) + '</h3>' +
        (slide.subtitle ? '<p>' + esc(slide.subtitle) + '</p>' : '') + '</div>';
    } else if (slide.type === 'agenda') {
      body = '<div class="ppt-agenda"><h4>目录</h4><ol>' +
        slide.items.slice(0, 12).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
        '</ol>' + (slide.items.length > 12 ? '<p>…共 ' + slide.items.length + ' 个章节</p>' : '') + '</div>';
    } else if (slide.type === 'table') {
      var rows = slide.rows.slice(0, 8);
      body = '<div class="ppt-table-slide"><h4>' + esc(slide.title) + '</h4><table><tbody>' +
        rows.map(function (r, ri) {
          return '<tr>' + r.slice(0, 6).map(function (c) {
            return '<td' + (ri === 0 ? ' class="head"' : '') + '>' + esc(c) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>' +
        (slide.rows.length > 8 ? '<p class="ppt-more">仅预览前 8 行，共 ' + slide.rows.length + ' 行</p>' : '') + '</div>';
    } else if (slide.type === 'section') {
      body = '<div class="ppt-section"><span class="ppt-kicker">SECTION</span><h3>' + esc(slide.title) + '</h3></div>';
    } else if (slide.type === 'end') {
      body = '<div class="ppt-end"><h3>' + esc(slide.title) + '</h3><p>' + esc(slide.subtitle || '') + '</p></div>';
    } else {
      body = '<div class="ppt-content"><h4>' + esc(slide.title) + (slide.pageTotal > 1 ? ' <em>' + slide.pageIndex + '/' + slide.pageTotal + '</em>' : '') +
        '</h4><ul>' + slide.bullets.map(function (b) {
          return '<li>' + esc(b.text) + (b.note ? '<i title="演讲备注">备</i>' : '') + '</li>';
        }).join('') + '</ul></div>';
    }
    return '<div class="ppt-prev-card" data-theme="' + theme + '">' +
      '<div class="ppt-canvas">' + body + foot + '</div>' +
      '<div class="ppt-prev-meta">' + (i + 1) + ' · ' + ({
        cover: '封面', agenda: '目录', section: '章节', content: '正文', table: '表格', end: '结束'
      }[slide.type] || '页面') + '</div></div>';
  }

  function sanitizeFileName(name) {
    return (String(name || '演示文稿').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60) || '演示文稿') + '.pptx';
  }

  function addPageBase(pptx, slide, pal, W, H, pageNo, total) {
    slide.background = { color: pal.bg };
    // 左上角品牌色块和页脚细线，保持每页统一的版式语言
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.16, h: H, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
    slide.addShape(pptx.ShapeType.line, { x: 0.55, y: H - 0.52, w: W - 1.1, h: 0, line: { color: pal.line, width: 1 } });
    slide.addText('简单工具箱', {
      x: 0.55, y: H - 0.46, w: 3, h: 0.28, fontFace: 'Microsoft YaHei',
      fontSize: 9, color: pal.sub, margin: 0
    });
    slide.addText(String(pageNo) + ' / ' + String(total), {
      x: W - 1.6, y: H - 0.46, w: 1.05, h: 0.28, fontFace: 'Microsoft YaHei',
      fontSize: 9, color: pal.sub, align: 'right', margin: 0
    });
  }

  function addBullets(slide, bullets, pal, x, y, w, h) {
    var rowH = Math.min(0.72, h / Math.max(1, bullets.length));
    bullets.forEach(function (b, i) {
      var top = y + i * rowH;
      slide.addShape(pptxShapeType(), { x: x, y: top + 0.12, w: 0.12, h: 0.12, fill: { color: i === 0 ? pal.accent : pal.accent2 }, line: { color: i === 0 ? pal.accent : pal.accent2, width: 0 } });
      slide.addText(b.text, {
        x: x + 0.24, y: top - 0.02, w: w - 0.24, h: rowH - 0.04,
        fontFace: 'Microsoft YaHei', fontSize: bullets.length > 5 ? 15 : 17,
        color: pal.ink, valign: 'mid', margin: 0, breakLine: false, fit: 'shrink'
      });
    });
  }

  /* 延迟取 ShapeType，避免库还没加载时报错 */
  function pptxShapeType() {
    var P = window.PptxGenJS;
    return (P && P.ShapeType && P.ShapeType.rect) || 'rect';
  }

  function buildPptx(pptx, model, opts, mode) {
    var pal = THEMES[opts.theme] || THEMES.blue;
    var wide = opts.ratio !== '4:3';
    var W = wide ? 13.333 : 10;
    var H = 7.5;
    pptx.defineLayout({ name: 'TB_WIDE', width: W, height: H });
    pptx.layout = 'TB_WIDE';
    pptx.author = '简单工具箱';
    pptx.company = '简单工具箱';
    pptx.subject = opts.title || model.coverTitle;
    pptx.title = opts.title || model.coverTitle;

    var total = model.slides.length;

    model.slides.forEach(function (s, index) {
      var slide = pptx.addSlide();
      var pageNo = index + 1;
      addPageBase(pptx, slide, pal, W, H, pageNo, total);

      if (s.type === 'cover') {
        // 右侧大色块 + 左侧文字，封面只出现一次
        slide.addShape(pptx.ShapeType.rect, { x: W * 0.62, y: 0, w: W * 0.38, h: H, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
        slide.addShape(pptx.ShapeType.rect, { x: W * 0.62, y: 0, w: W * 0.06, h: H, fill: { color: pal.accent2 }, line: { color: pal.accent2, width: 0 } });
        slide.addText('PRESENTATION', {
          x: 0.75, y: 1.15, w: 3.4, h: 0.3, fontFace: 'Arial', fontSize: 11,
          color: pal.accent, bold: true, charSpacing: 3, margin: 0
        });
        slide.addText(s.title, {
          x: 0.72, y: 1.55, w: W * 0.52, h: 1.9, fontFace: 'Microsoft YaHei',
          fontSize: wide ? 32 : 28, bold: true, color: pal.ink, valign: 'mid', fit: 'shrink', margin: 0
        });
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.75, y: 3.55, w: W * 0.5, h: 0.9, fontFace: 'Microsoft YaHei',
            fontSize: 14, color: pal.sub, valign: 'top', fit: 'shrink', margin: 0
          });
        }
        slide.addText('简单工具箱 · 纯本地处理', {
          x: 0.75, y: H - 1.15, w: 5, h: 0.35, fontFace: 'Microsoft YaHei',
          fontSize: 10, color: pal.sub, margin: 0
        });
      } else if (s.type === 'agenda') {
        slide.addText('目录', {
          x: 0.75, y: 0.55, w: 3, h: 0.5, fontFace: 'Microsoft YaHei',
          fontSize: 26, bold: true, color: pal.ink, margin: 0
        });
        slide.addShape(pptx.ShapeType.line, { x: 0.76, y: 1.16, w: 0.7, h: 0, line: { color: pal.accent, width: 2 } });
        var items = s.items.slice(0, 12);
        var twoCol = items.length > 6;
        items.forEach(function (item, i) {
          var col = twoCol && i >= Math.ceil(items.length / 2) ? 1 : 0;
          var row = twoCol ? i % Math.ceil(items.length / 2) : i;
          var x = 0.85 + col * (W / 2 - 0.1);
          var y = 1.55 + row * 0.67;
          slide.addText(String(i + 1).padStart(2, '0'), {
            x: x, y: y, w: 0.55, h: 0.42, fontFace: 'Arial', fontSize: 13, bold: true,
            color: pal.accent, valign: 'mid', margin: 0
          });
          slide.addText(item, {
            x: x + 0.55, y: y, w: W / 2 - 1.4, h: 0.42, fontFace: 'Microsoft YaHei',
            fontSize: 15, color: pal.ink, valign: 'mid', fit: 'shrink', margin: 0
          });
        });
        if (s.items.length > 12) {
          slide.addText('…… 共 ' + s.items.length + ' 个章节', {
            x: 0.85, y: H - 1.3, w: 4, h: 0.35, fontFace: 'Microsoft YaHei',
            fontSize: 10, color: pal.sub, margin: 0
          });
        }
      } else if (s.type === 'section') {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.5, h: H, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
        slide.addText('SECTION', {
          x: 1.0, y: 2.0, w: 3, h: 0.35, fontFace: 'Arial', fontSize: 11, bold: true,
          color: pal.accent, charSpacing: 2, margin: 0
        });
        slide.addText(s.title, {
          x: 0.98, y: 2.35, w: W - 1.8, h: 1.4, fontFace: 'Microsoft YaHei',
          fontSize: 30, bold: true, color: pal.ink, valign: 'mid', fit: 'shrink', margin: 0
        });
      } else if (s.type === 'table') {
        slide.addText(s.title, {
          x: 0.75, y: 0.55, w: W - 1.5, h: 0.5, fontFace: 'Microsoft YaHei',
          fontSize: 24, bold: true, color: pal.ink, margin: 0
        });
        var rows = s.rows.map(function (row, ri) {
          return row.map(function (cell) {
            return {
              text: String(cell == null ? '' : cell),
              options: ri === 0 ? {
                bold: true, color: pal.bg, fill: { color: pal.accent },
                fontFace: 'Microsoft YaHei', fontSize: 11
              } : {
                color: pal.ink, fill: { color: ri % 2 ? pal.panel : pal.bg },
                fontFace: 'Microsoft YaHei', fontSize: 10.5
              }
            };
          });
        });
        var colCount = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        var colW = [];
        for (var ci = 0; ci < colCount; ci++) colW.push((W - 1.5) / colCount);
        slide.addTable(rows, {
          x: 0.75, y: 1.35, w: W - 1.5, colW: colW,
          border: { pt: 0.7, color: pal.line },
          margin: 0.08, autoPage: { slideBreak: true, breakLines: true }
        });
      } else if (s.type === 'end') {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
        slide.addText(s.title, {
          x: 1, y: 2.15, w: W - 2, h: 1.2, fontFace: 'Microsoft YaHei',
          fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', valign: 'mid', margin: 0
        });
        slide.addText(s.subtitle || '', {
          x: 1, y: 3.45, w: W - 2, h: 0.55, fontFace: 'Microsoft YaHei',
          fontSize: 14, color: 'FFFFFF', align: 'center', margin: 0
        });
      } else {
        slide.addText(s.title + (s.isContinuation ? '' : ''), {
          x: 0.75, y: 0.5, w: W - 1.5, h: 0.62, fontFace: 'Microsoft YaHei',
          fontSize: 24, bold: true, color: pal.ink, valign: 'mid', fit: 'shrink', margin: 0
        });
        slide.addShape(pptx.ShapeType.line, { x: 0.76, y: 1.18, w: 0.7, h: 0, line: { color: pal.accent, width: 2 } });
        addBullets(slide, s.bullets, pal, 0.85, 1.45, W - 1.7, H - 2.25);
      }

      // 演讲备注放在备注区，不影响页面排版
      var notes = [];
      if (s.bullets) {
        s.bullets.forEach(function (b) { if (b.note) notes.push(b.text + '：' + b.note); });
      }
      if (notes.length) slide.addNotes(notes.join('\n'));
    });

    return pptx;
  }

  TB.def({
    slug: 'pptxgen',
    cat: 'office',
    name: 'PPT 演示文稿生成器',
    desc: '用大纲或表格在浏览器里生成标准 .pptx，选主题、自动分页，文件不上传。',
    icon: '📽️',
    kw: 'PPT pptx 演示文稿 幻灯片 大纲 表格 生成 下载 office PptxGenJS',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">演示内容 <span class="hint">大纲或表格，全部在本地解析</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">输入方式</div><select class="select" id="pptMode">' +
              '<option value="outline">文字大纲 / Markdown</option>' +
              '<option value="table">表格（竖线或逗号分隔）</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">比例</div><select class="select" id="pptRatio">' +
              '<option value="16:9">16:9 宽屏</option><option value="4:3">4:3 标准</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">主题</div><select class="select" id="pptTheme">' +
              Object.keys(THEMES).map(function (k) { return '<option value="' + k + '">' + THEMES[k].name + '</option>'; }).join('') +
            '</select></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">主标题</div><input class="input" id="pptTitle" value="简单工具箱 · 产品介绍" maxlength="80"></div>' +
            '<div class="field"><div class="label">副标题（可选）</div><input class="input" id="pptSubtitle" value="纯前端在线工具站 · 2026" maxlength="100"></div>' +
          '</div>' +
          '<div class="field"><div class="label">大纲 / 表格内容 <span id="pptFormatHint" class="hint"># 封面标题，## 章节，- 要点</span></div>' +
            '<textarea class="textarea" id="pptOutline" rows="14" spellcheck="false"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="pptBuild" type="button">生成并下载 .pptx</button>' +
            '<button class="btn" id="pptRefresh" type="button">刷新预览</button>' +
            '<button class="btn" id="pptSample" type="button">填入示例</button>' +
            '<button class="btn" id="pptCopyOutline" type="button">复制大纲</button></div>' +
          '<p id="pptMsg" class="note" style="margin-bottom:0"></p>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">页面预览 <span class="hint" id="pptCount">—</span></div>' +
          '<div class="ppt-preview-grid" id="pptPreview"></div>' +
        '</div>' +
        '<p class="note">生成的 .pptx 使用标准 OOXML，可直接用 PowerPoint、WPS、Keynote 打开。主题色、分页和演讲备注都会写入文件；所有内容只在当前标签页内处理。</p>';

      var modeEl = TB.$('#pptMode', root);
      var ratioEl = TB.$('#pptRatio', root);
      var themeEl = TB.$('#pptTheme', root);
      var titleEl = TB.$('#pptTitle', root);
      var subtitleEl = TB.$('#pptSubtitle', root);
      var outlineEl = TB.$('#pptOutline', root);
      var previewEl = TB.$('#pptPreview', root);
      var countEl = TB.$('#pptCount', root);
      var msgEl = TB.$('#pptMsg', root);
      var buildBtn = TB.$('#pptBuild', root);
      var sampleBtn = TB.$('#pptSample', root);
      var formatHint = TB.$('#pptFormatHint', root);

      var model = null;
      var busy = false;

      function opts() {
        return {
          mode: modeEl.value,
          ratio: ratioEl.value,
          theme: themeEl.value,
          title: titleEl.value.trim(),
          subtitle: subtitleEl.value.trim(),
          outline: outlineEl.value,
          closing: true
        };
      }

      function makeModel() {
        return opts().mode === 'table' ? buildTableModel(opts()) : buildModel(opts());
      }

      function renderPreview(force) {
        try {
          model = makeModel();
        } catch (e) {
          previewEl.innerHTML = '<div class="empty" style="grid-column:1/-1">' + esc(e.message) + '</div>';
          countEl.textContent = '—';
          return;
        }
        var o = opts();
        var total = model.slides.length;
        countEl.textContent = total + ' 页 · ' + (o.ratio === '4:3' ? '4:3' : '16:9');
        previewEl.innerHTML = model.slides.map(function (s, i) {
          return previewCard(s, i, total, o.theme);
        }).join('');
        if (force) msgEl.textContent = '';
      }

      function setBusy(v) {
        busy = v;
        buildBtn.disabled = v;
        buildBtn.textContent = v ? '正在生成…' : '生成并下载 .pptx';
      }

      function buildFile() {
        if (busy) return;
        if (!window.PptxGenJS) {
          msgEl.innerHTML = '<span class="result-err">PptxGenJS 还没有加载完成，请稍后再试。</span>';
          return;
        }
        try {
          model = makeModel();
        } catch (e) {
          msgEl.innerHTML = '<span class="result-err">' + esc(e.message) + '</span>';
          return;
        }
        var o = opts();
        var pptx = new window.PptxGenJS();
        buildPptx(pptx, model, o, o.mode);
        setBusy(true);
        msgEl.textContent = '正在写入 PowerPoint 文件…';
        pptx.writeFile({ fileName: sanitizeFileName(o.title || model.coverTitle) })
          .then(function () {
            msgEl.innerHTML = '<span class="result-ok">已生成并开始下载：' + esc(sanitizeFileName(o.title || model.coverTitle)) + '</span>';
          })
          .catch(function (e) {
            console.error(e);
            msgEl.innerHTML = '<span class="result-err">生成失败：' + esc(e.message || e) + '</span>';
          })
          .then(function () { setBusy(false); });
      }

      function loadLibThen(fn) {
        if (window.PptxGenJS) { fn(); return; }
        msgEl.textContent = '正在加载 PPT 生成库（约 450 KB）…';
        TB.loadLib('pptxgen.bundle.js').then(function () {
          if (!window.PptxGenJS) throw new Error('PPT 生成库未正确挂载');
          fn();
        }).catch(function (e) {
          console.error(e);
          msgEl.innerHTML = '<span class="result-err">依赖加载失败：' + esc(e.message) + '</span>';
          setBusy(false);
        });
      }

      function fillSample() {
        outlineEl.value = modeEl.value === 'table' ? SAMPLE_TABLE : SAMPLE_OUTLINE;
        renderPreview();
        msgEl.textContent = '已填入示例内容，可直接修改。';
      }

      function syncMode() {
        var table = modeEl.value === 'table';
        formatHint.textContent = table ? '第一行是表头，列之间用 | 分隔' : '# 封面标题，## 章节，- 要点，> 备注';
        if (!outlineEl.value.trim() || outlineEl.value === SAMPLE_OUTLINE || outlineEl.value === SAMPLE_TABLE) {
          outlineEl.value = table ? SAMPLE_TABLE : SAMPLE_OUTLINE;
        }
        renderPreview();
      }

      // 首次进入直接给一份可用的示例，降低空态门槛
      outlineEl.value = SAMPLE_OUTLINE;
      renderPreview();

      var debouncedPreview = TB.debounce(function () { renderPreview(); }, 350);

      [titleEl, subtitleEl, outlineEl].forEach(function (el) {
        el.addEventListener('input', debouncedPreview);
      });
      [modeEl, ratioEl, themeEl].forEach(function (el) {
        el.addEventListener('change', function () {
          if (el === modeEl) syncMode();
          else renderPreview();
        });
      });
      TB.$('#pptRefresh', root).addEventListener('click', function () { renderPreview(true); });
      TB.$('#pptSample', root).addEventListener('click', fillSample);
      TB.$('#pptCopyOutline', root).addEventListener('click', function () { TB.copy(outlineEl.value); });
      buildBtn.addEventListener('click', function () {
        loadLibThen(buildFile);
      });

      // Ctrl / Cmd + Enter 直接生成，和站内其他工具保持一致的快捷键
      root.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          loadLibThen(buildFile);
        }
      });
    }
  });
})();
