/* =============================================================================
 * 文档创作类工具：字帖生成
 * -----------------------------------------------------------------------------
 * 参考 z2h.cn 字帖生成器的使用路径，但页面、排版和描红逻辑都是本地实现：
 *   - 汉字 / 英文 / 数字 / 笔画 / 拼音 / 控笔六种练习内容
 *   - 田字格 / 米字格 / 回宫格 / 空白方格 / 四线三格
 *   - 首字示范、描红数量、描红颜色、字体大小、上下位置、纸张标题
 *   - A4 预览，直接调用浏览器打印或「另存为 PDF」
 * 所有内容只在浏览器里排版，没有服务端，也不上传文字。
 * ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- 练习类型 */
  var MODES = {
    han: {
      label: '中文汉字',
      hint: '每行一段文字；可选单字重复或整行重复',
      text: '你好世界',
      font: 'kai',
      grid: 'tian',
      size: 70,
      layout: 'single'
    },
    eng: {
      label: '英文书写',
      hint: '每行一组字母、单词或句子，按四线三格排布',
      text: 'A a B b C c',
      font: 'italic',
      grid: 'four',
      size: 85,
      layout: 'line'
    },
    num: {
      label: '数字练习',
      hint: '每行一组数字，适合 0-9 反复描红',
      text: '0 1 2 3 4 5 6 7 8 9',
      font: 'kai',
      grid: 'tian',
      size: 70,
      layout: 'single'
    },
    stroke: {
      label: '基本笔画',
      hint: '横、竖、撇、捺、折、钩，逐笔反复练习',
      text: '一 丨 丿 丶 乙',
      font: 'kai',
      grid: 'tian',
      size: 70,
      layout: 'single'
    },
    pinyin: {
      label: '拼音练习',
      hint: '每行一组声母、韵母或音节',
      text: 'b p m f d t n l',
      font: 'song',
      grid: 'tian',
      size: 70,
      layout: 'single'
    },
    pen: {
      label: '控笔线条',
      hint: '在方格中反复描摹线条，练习运笔稳定性',
      text: '〰 ／ ＼ 丨',
      font: 'kai',
      grid: 'blank',
      size: 70,
      layout: 'single'
    }
  };

  /* 字体只用系统字体，不额外下载字体文件，离线也能打印 */
  var FONTS = {
    kai: { label: '楷体', css: "'KaiTi','STKaiti','Kaiti SC','楷体',serif", style: 'normal' },
    song: { label: '宋体', css: "'SimSun','Songti SC','宋体',serif", style: 'normal' },
    hei: { label: '黑体', css: "'SimHei','Heiti SC','黑体',sans-serif", style: 'normal' },
    italic: { label: '意大利体', css: "Georgia,'Times New Roman',serif", style: 'italic' },
    mono: { label: '等宽体', css: "'Courier New',monospace", style: 'normal' }
  };

  var GRIDS = {
    tian: '田字格',
    mi: '米字格',
    hui: '回宫格',
    blank: '空白方格',
    four: '四线三格'
  };

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function modeOf(id) { return MODES[id] || MODES.han; }

  function esc(s) { return TB.esc(String(s == null ? '' : s)); }

  /* 单字 / 整行都按字符拆；英文保留空格，交给行排版处理 */
  function charsOf(line, mode) {
    var s = String(line || '').trim();
    if (mode === 'eng') return Array.from(s);
    return Array.from(s.replace(/\s+/g, ''));
  }

  /* 英文「大小写成对」：ABCD -> Aa Bb Cc Dd */
  function pairText(line) {
    return Array.from(String(line || '').replace(/\s+/g, '')).map(function (c) {
      return /[a-z]/i.test(c) ? c.toUpperCase() + c.toLowerCase() : c;
    }).join(' ');
  }

  function cellHtml(ch, grid, isModel) {
    return '<div class="ws-cell g-' + grid + '"><span class="ws-char ' +
      (isModel ? 'model' : 'trace') + '">' + esc(ch) + '</span></div>';
  }

  function blankCells(n) {
    var out = '';
    for (var i = 0; i < n; i++) out += '<div class="ws-cell g-blank"></div>';
    return out;
  }

  /* ---------------------------------------------------------------- 渲染 */
  TB.def({
    slug: 'worksheet',
    cat: 'doc',
    name: '字帖生成',
    desc: '汉字 / 英文 / 拼音 / 数字 / 笔画可打印字帖',
    icon: '✍️',
    kw: '字帖 练字 描红 临摹 田字格 米字格 回宫格 拼音 控笔 打印 字帖生成器 练字帖',
    render: function (ctx) {
      var root = ctx.root;

      root.innerHTML =
        '<div class="panel no-print">' +
          '<div class="field">' +
            '<div class="label"><b>练习内容</b><span id="wsHint" style="color:var(--ink-3)"></span></div>' +
            '<textarea class="textarea" id="wsText" style="min-height:88px" spellcheck="false"></textarea>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">练习类型</div><select class="select" id="wsMode">' +
              Object.keys(MODES).map(function (k) { return '<option value="' + k + '">' + MODES[k].label + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><div class="label">方格类型</div><select class="select" id="wsGrid"></select></div>' +
            '<div class="field"><div class="label">字体</div><select class="select" id="wsFont">' +
              Object.keys(FONTS).map(function (k) { return '<option value="' + k + '">' + FONTS[k].label + '</option>'; }).join('') +
            '</select></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">方格大小（px）</div><input class="input" id="wsCell" type="number" min="28" max="80" step="2" value="44"></div>' +
            '<div class="field"><div class="label">字体大小（%）</div><input class="input" id="wsSize" type="number" min="40" max="100" step="5" value="70"></div>' +
            '<div class="field"><div class="label">上下位置（px）</div><input class="input" id="wsOffset" type="number" min="-20" max="20" step="1" value="0"></div>' +
            '<div class="field"><div class="label">字体粗细</div><select class="select" id="wsWeight">' +
              '<option value="400">常规</option><option value="700">加粗</option></select></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">描红数量</div><input class="input" id="wsRepeat" type="number" min="1" max="30" step="1" value="10"></div>' +
            '<div class="field"><div class="label">描红颜色</div><select class="select" id="wsTrace">' +
              '<option value="#bccbdb">浅灰</option><option value="#b8d4ee">浅蓝</option>' +
              '<option value="#eccbd4">浅粉</option><option value="#c8e6d0">浅绿</option></select></div>' +
            '<div class="field" id="wsLayoutField"><div class="label">排布方式</div><select class="select" id="wsLayout">' +
              '<option value="single">单字重复（每字一行）</option>' +
              '<option value="group">整行重复（词组 / 短句）</option></select></div>' +
          '</div>' +
          '<div class="checks">' +
            '<label><input id="wsFirst" type="checkbox" checked> 显示首字</label>' +
            '<label><input id="wsBlank" type="checkbox"> 插入空行</label>' +
            '<label id="wsPairWrap" hidden><input id="wsPair" type="checkbox"> 大小写成对</label>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="wsRun">生成预览</button>' +
            '<button class="btn" id="wsPrint">打印 / 存 PDF</button>' +
          '</div>' +
          '<div id="wsMsg"></div>' +
        '</div>' +
        '<div class="note no-print">打印时建议在浏览器打印面板里把页边距设为「无」并勾选「背景图形」，方格线才会完整。</div>' +
        '<div class="ws-wrap" id="wsWrap" aria-live="polite"></div>';

      var ui = {
        text: TB.$('#wsText', root),
        mode: TB.$('#wsMode', root),
        grid: TB.$('#wsGrid', root),
        font: TB.$('#wsFont', root),
        cell: TB.$('#wsCell', root),
        size: TB.$('#wsSize', root),
        offset: TB.$('#wsOffset', root),
        weight: TB.$('#wsWeight', root),
        repeat: TB.$('#wsRepeat', root),
        trace: TB.$('#wsTrace', root),
        layout: TB.$('#wsLayout', root),
        layoutField: TB.$('#wsLayoutField', root),
        first: TB.$('#wsFirst', root),
        blank: TB.$('#wsBlank', root),
        pair: TB.$('#wsPair', root),
        pairWrap: TB.$('#wsPairWrap', root),
        hint: TB.$('#wsHint', root),
        msg: TB.$('#wsMsg', root),
        wrap: TB.$('#wsWrap', root)
      };

      function setGridOptions(mode, selected) {
        var list = mode === 'eng'
          ? ['four']
          : ['tian', 'mi', 'hui', 'blank'];
        ui.grid.innerHTML = list.map(function (k) {
          return '<option value="' + k + '">' + GRIDS[k] + '</option>';
        }).join('');
        ui.grid.value = selected || list[0];
      }

      function setMode(mode) {
        var def = modeOf(mode);
        ui.mode.value = mode;
        ui.text.value = def.text;
        ui.font.value = def.font;
        ui.size.value = def.size;
        ui.layout.value = def.layout;
        ui.hint.textContent = def.hint;
        setGridOptions(mode, def.grid);
        ui.layoutField.hidden = mode === 'eng';
        ui.pairWrap.hidden = mode !== 'eng';
        if (mode !== 'eng') ui.pair.checked = false;
      }

      function read() {
        var mode = ui.mode.value;
        var def = modeOf(mode);
        var cell = clamp(ui.cell.value, 28, 80);
        var size = clamp(ui.size.value, 40, 100);
        var offset = clamp(ui.offset.value, -20, 20);
        var repeat = clamp(ui.repeat.value, 1, 30);
        var grid = mode === 'eng' ? 'four' : ui.grid.value;
        var font = FONTS[ui.font.value] || FONTS[def.font] || FONTS.kai;

        ui.cell.value = cell;
        ui.size.value = size;
        ui.offset.value = offset;
        ui.repeat.value = repeat;

        return {
          mode: mode,
          def: def,
          cell: cell,
          size: size,
          offset: offset,
          repeat: repeat,
          grid: grid,
          font: font,
          weight: ui.weight.value === '700' ? 700 : 400,
          trace: ui.trace.value,
          layout: mode === 'eng' ? 'line' : ui.layout.value,
          first: ui.first.checked,
          blank: ui.blank.checked,
          pair: mode === 'eng' && ui.pair.checked
        };
      }

      function lineRows(text, o) {
        var out = [];
        String(text || '').replace(/\r\n?/g, '\n').split('\n').forEach(function (raw) {
          var line = raw.trim();
          if (!line) return;
          var chars = charsOf(line, o.mode);
          if (!chars.length) return;

          if (o.layout === 'single') {
            chars.forEach(function (ch) { out.push({ chars: [ch] }); });
          } else if (o.layout === 'group') {
            out.push({ chars: chars });
          }
        });
        return out;
      }

      function renderGridRow(chars, o, cols) {
        var modelCount = o.first ? chars.length : 0;
        var traces = Math.max(1, o.repeat);
        var total = modelCount + traces * chars.length;

        /* 超出 A4 行宽就自动减少描红次数，避免右侧被裁掉 */
        if (total > cols) {
          traces = Math.max(1, Math.floor((cols - modelCount) / chars.length));
        }

        var html = '';
        var count = 0;
        var i, r;
        if (o.first) {
          for (i = 0; i < chars.length; i++) { html += cellHtml(chars[i], o.grid, true); count++; }
        }
        for (r = 0; r < traces; r++) {
          for (i = 0; i < chars.length; i++) { html += cellHtml(chars[i], o.grid, false); count++; }
        }
        html += blankCells(Math.max(0, cols - count));
        return '<div class="ws-row">' + html + '</div>';
      }

      function renderBlankGridRow(o, cols) {
        return '<div class="ws-row">' + blankCells(cols) + '</div>';
      }

      function renderEnglishLines(text, o, blank) {
        if (blank) return ['<div class="ws-line"></div>'];

        var shown = o.pair ? pairText(text) : text;
        var fontSize = o.cell * o.size / 100;
        var approx = Math.max(1, shown.length) * fontSize * 0.54;
        var perLine = Math.max(1, Math.floor(680 / (approx + 12)));
        var copies = Math.max(1, o.repeat) + (o.first ? 1 : 0);
        var out = [];

        /* 一行放不下就续到下一行四线格，模型只出现在最前面 */
        for (var start = 0; start < copies; start += perLine) {
          var body = '';
          for (var i = start; i < Math.min(copies, start + perLine); i++) {
            var isModel = o.first && i === 0;
            body += '<span class="ws-line-text ' + (isModel ? 'model' : 'trace') + '">' +
              esc(shown) + '</span>';
          }
          out.push('<div class="ws-line"><div class="ws-line-content">' + body + '</div></div>');
        }
        return out;
      }

      function render() {
        var o = read();
        var lines = String(ui.text.value || '').replace(/\r\n?/g, '\n')
          .split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l; });

        if (!lines.length) {
          ui.wrap.innerHTML = '<div class="ws-empty">先在上方输入要练习的内容。</div>';
          ui.msg.innerHTML = '';
          return;
        }

        var cols = Math.max(1, Math.floor(680 / o.cell));
        var rows = lineRows(ui.text.value, o);
        var blocks = [];

        if (o.layout === 'line') {
          lines.forEach(function (line) {
            renderEnglishLines(line, o, false).forEach(function (row) {
              blocks.push({ html: row, h: o.cell * 1.6 + 7 });
            });
            if (o.blank) blocks.push({ html: renderEnglishLines('', o, true)[0], h: o.cell * 1.6 + 7 });
          });
        } else {
          rows.forEach(function (row) {
            /* 词组超过一行宽度时拆成多行，避免右侧被纸边裁掉 */
            for (var start = 0; start < row.chars.length; start += cols) {
              var chunk = row.chars.slice(start, start + cols);
              blocks.push({ html: renderGridRow(chunk, o, cols), h: o.cell + 6 });
              if (o.blank) blocks.push({ html: renderBlankGridRow(o, cols), h: o.cell + 6 });
            }
          });
        }

        /* 按 A4 的可用高度分页；一页放不下时不会把后面的行裁掉 */
        var bodyH = 946;
        var pageRows = [[]];
        var used = 0;
        blocks.forEach(function (block) {
          if (used + block.h > bodyH && pageRows[pageRows.length - 1].length) {
            pageRows.push([]);
            used = 0;
          }
          pageRows[pageRows.length - 1].push(block.html);
          used += block.h;
        });

        var pageStyle = 'font-family:' + o.font.css + ';font-style:' + o.font.style +
          ';--guide:#c9d8e8;--trace:' + o.trace + ';--cell:' + o.cell +
          'px;--fs:' + (o.size / 100) + ';--off:' + o.offset + 'px;--weight:' + o.weight + ';';

        var pageHtml = function (bodyRows) {
          return '<div class="ws-page" style="' + pageStyle + '">' +
            '<div class="ws-head"><div class="ws-title">字帖练习</div>' +
              '<div class="ws-kind">' + o.def.label + '</div></div>' +
            '<div class="ws-name">姓名：_____________　日期：_____________</div>' +
            '<div class="ws-body">' + bodyRows.join('') + '</div>' +
          '</div>';
        };

        ui.wrap.innerHTML = pageRows.map(pageHtml).join('');
        ui.msg.innerHTML = '<div class="note" style="margin-top:10px">已生成 ' + blocks.length +
          ' 行，共 ' + pageRows.length + ' 页 A4；内容较长时会自动分页。</div>';
      }

      var later = TB.debounce(render, 220);

      Object.keys(ui).forEach(function (key) {
        var el = ui[key];
        if (!el || !el.addEventListener) return;
        if (key === 'mode') {
          el.addEventListener('change', function () { setMode(el.value); render(); });
        } else if (key === 'msg' || key === 'wrap' || key === 'hint' || key === 'layoutField' || key === 'pairWrap') {
          return;
        } else {
          el.addEventListener('input', later);
          el.addEventListener('change', later);
        }
      });

      TB.$('#wsRun', root).addEventListener('click', render);
      TB.$('#wsPrint', root).addEventListener('click', function () {
        render();
        setTimeout(function () { window.print(); }, 120);
      });

      /* 默认进入中文汉字；之后切换类型时恢复该类型的推荐参数 */
      setMode('han');
      render();
    }
  });

})();
