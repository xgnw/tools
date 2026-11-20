/* =============================================================================
 * Toolwa 迁移工具 · A 组
 * -----------------------------------------------------------------------------
 * 本文件收纳第一批 6 个工具：
 *   1. CSS 虚线边框生成器（SVG 背景，可调虚线间距）
 *   2. HTML 代码格式化（轻量缩进，保留 script/style 原文）
 *   3. JavaScript 代码格式化（字符串 / 注释 / 正则感知）
 *   4. 正则表达式可视化（结构树，不引入 1MB 的 regexper 打包文件）
 *   5. 图片 EXIF 信息查看（JPEG APP1 / TIFF IFD 解析）
 *   6. PDF 扫描件效果（pdf.js 渲染 + 灰度 / 对比度 / 噪点）
 *
 * 全部逻辑在浏览器本地执行，不上传文件、不使用 iframe。
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ 虚线边框 */
  TB.def({
    slug: 'dashborder',
    cat: 'web',
    name: 'CSS 虚线边框生成器',
    desc: '用 SVG 背景生成可调虚线长度、间距、颜色与圆角的边框。',
    icon: '⬜',
    kw: 'CSS 虚线 边框 dashed dotted 圆角 SVG 生成器 前端',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">边框参数</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">线型</div><select class="select" id="dbStyle">' +
              '<option value="dashed">虚线</option><option value="dotted">点线</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">线宽 <b id="dbWidthV">2</b> px</div><input class="input" type="range" id="dbWidth" min="1" max="10" value="2"></div>' +
            '<div class="field"><div class="label">颜色</div><input class="input" type="color" id="dbColor" value="#4f6bed"></div>' +
            '<div class="field"><div class="label">圆角 <b id="dbRadiusV">12</b> px</div><input class="input" type="range" id="dbRadius" min="0" max="80" value="12"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">虚线长度 <b id="dbDashV">10</b> px</div><input class="input" type="range" id="dbDash" min="1" max="40" value="10"></div>' +
            '<div class="field"><div class="label">虚线间距 <b id="dbGapV">6</b> px</div><input class="input" type="range" id="dbGap" min="1" max="30" value="6"></div>' +
            '<div class="field"><div class="label">预览底色</div><input class="input" type="color" id="dbBg" value="#ffffff"></div>' +
          '</div></div>' +
        '<div class="panel"><div class="panel-h">实时预览</div>' +
          '<div class="db-preview" id="dbPrev"><span>虚线边框预览</span></div>' +
          '<p class="note">预览会随参数实时变化；最终生成的是可复制到任意元素的 CSS 背景图，不依赖额外图片文件。</p></div>' +
        '<div class="panel"><div class="panel-h">生成的 CSS</div>' +
          '<div class="btns"><button class="btn primary" id="dbCopy" type="button">复制 CSS</button>' +
            '<button class="btn" id="dbDownload" type="button">下载 .css</button></div>' +
          '<textarea class="textarea mono" id="dbOut" rows="8" spellcheck="false"></textarea></div>';

      var ids = ['dbStyle', 'dbWidth', 'dbColor', 'dbRadius', 'dbDash', 'dbGap', 'dbBg'];
      var el = {};
      ids.forEach(function (id) { el[id] = TB.$('#' + id, root); });
      var vals = ['dbWidthV', 'dbRadiusV', 'dbDashV', 'dbGapV'];
      var out = TB.$('#dbOut', root);
      var prev = TB.$('#dbPrev', root);

      function num(input) { return Number(input.value) || 0; }

      function build() {
        var style = el.dbStyle.value;
        var width = num(el.dbWidth);
        var radius = num(el.dbRadius);
        var dash = num(el.dbDash);
        var gap = num(el.dbGap);
        var color = el.dbColor.value || '#4f6bed';
        var w = 360, h = 200, inset = width / 2;
        // SVG 本身按 360×200 绘制，再用 background-size:100% 100% 拉伸到元素尺寸。
        // 虚线长度和间距在拉伸后会等比变化；如需固定像素，可把 background-size 改成实际尺寸。
        var dashArray = style === 'dotted' ? '0 ' + (dash + gap) : dash + ' ' + gap;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
          '<rect x="' + inset + '" y="' + inset + '" width="' + (w - width) + '" height="' + (h - width) + '" rx="' + radius + '" ' +
          'fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-dasharray="' + dashArray + '" ' +
          'stroke-linecap="' + (style === 'dotted' ? 'round' : 'butt') + '" stroke-linejoin="round"/></svg>';
        var encoded = encodeURIComponent(svg).replace(/'/g, '%27');
        var css = '/* 虚线边框：SVG 背景，可自由调整 dash / gap */\n' +
          'background-image: url("data:image/svg+xml,' + encoded + '");\n' +
          'background-size: 100% 100%;\n' +
          'background-repeat: no-repeat;\n' +
          'border-radius: ' + radius + 'px;';
        out.value = css;
        prev.style.backgroundColor = el.dbBg.value || '#ffffff';
        prev.style.backgroundImage = 'url("data:image/svg+xml,' + encoded + '")';
        prev.style.borderRadius = radius + 'px';
        TB.$('#dbWidthV', root).textContent = width;
        TB.$('#dbRadiusV', root).textContent = radius;
        TB.$('#dbDashV', root).textContent = dash;
        TB.$('#dbGapV', root).textContent = gap;
      }

      ids.forEach(function (id) { el[id].addEventListener('input', build); });
      el.dbStyle.addEventListener('change', build);
      TB.$('#dbCopy', root).addEventListener('click', function () { TB.copy(out.value); });
      TB.$('#dbDownload', root).addEventListener('click', function () {
        TB.downloadText(out.value, 'dashed-border.css', 'text/css');
      });
      build();
    }
  });

  /* ------------------------------------------------------------ HTML 格式化 */
  TB.def({
    slug: 'htmlfmt',
    cat: 'web',
    name: 'HTML 代码格式化',
    desc: '按标签缩进整理 HTML，保留 script/style 等原文块。',
    icon: '🧹',
    kw: 'HTML 格式化 美化 缩进 代码 整理 formatter',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">HTML 输入</div>' +
          '<textarea class="textarea mono" id="hfIn" rows="10" spellcheck="false" placeholder="粘贴 HTML 代码，例如 <div><p>你好</p></div>"></textarea>' +
          '<div class="row">' +
            '<div class="field"><div class="label">缩进</div><select class="select" id="hfIndent">' +
              '<option value="2">2 空格</option><option value="4">4 空格</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="hfGo" type="button">格式化</button>' +
            '<button class="btn" id="hfSample" type="button">填入示例</button>' +
            '<button class="btn" id="hfClear" type="button">清空</button></div></div>' +
        '<div class="panel"><div class="panel-h">格式化结果</div>' +
          '<div class="btns"><button class="btn" id="hfCopy" type="button">复制结果</button>' +
            '<button class="btn" id="hfDownload" type="button">下载 .html</button></div>' +
          '<textarea class="textarea mono" id="hfOut" rows="14" spellcheck="false"></textarea>' +
          '<p class="note">轻量格式化器：不依赖第三方库；会保留 script、style、pre、textarea 的内部原文，避免破坏代码或空白格式。</p></div>';

      var input = TB.$('#hfIn', root);
      var output = TB.$('#hfOut', root);
      var indentSize = TB.$('#hfIndent', root);
      var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1 };
      var RAW = { script: 1, style: 1, pre: 1, textarea: 1 };

      // 找到标签结束的 >，同时跳过属性值引号里的 >。
      function tagEnd(src, start) {
        var quote = '';
        for (var i = start + 1; i < src.length; i++) {
          var ch = src.charAt(i);
          if (quote) { if (ch === quote) quote = ''; continue; }
          if (ch === '"' || ch === "'") { quote = ch; continue; }
          if (ch === '>') return i;
        }
        return src.length - 1;
      }

      function tokenize(src) {
        var list = [];
        var i = 0;
        while (i < src.length) {
          if (src.substr(i, 4) === '<!--') {
            var endComment = src.indexOf('-->', i + 4);
            if (endComment < 0) endComment = src.length - 3;
            list.push(src.slice(i, endComment + 3));
            i = endComment + 3;
          } else if (src.charAt(i) === '<') {
            var end = tagEnd(src, i);
            list.push(src.slice(i, end + 1));
            i = end + 1;
          } else {
            var next = src.indexOf('<', i);
            if (next < 0) next = src.length;
            list.push(src.slice(i, next));
            i = next;
          }
        }
        return list;
      }

      function tagName(tag) {
        var m = /^<\/?\s*([^\s/>]+)/.exec(tag);
        return m ? m[1].toLowerCase() : '';
      }

      function format(src, size) {
        var tokens = tokenize(src);
        var pad = new Array(size + 1).join(' ');
        var lines = [];
        var indent = 0;

        function add(text) {
          text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
          if (text) lines.push(new Array(indent + 1).join(pad) + text);
        }

        for (var i = 0; i < tokens.length; i++) {
          var tok = tokens[i];
          var trimmed = tok.trim();
          if (!trimmed) continue;

          if (/^<!--/.test(trimmed) || /^<!doctype/i.test(trimmed)) { add(trimmed); continue; }

          if (/^<\//.test(trimmed)) {
            indent = Math.max(0, indent - 1);
            add(trimmed);
            continue;
          }

          if (trimmed.charAt(0) === '<') {
            var name = tagName(trimmed);
            var selfClose = /\/>$/.test(trimmed) || !!VOID[name];
            add(trimmed);
            if (RAW[name] && !selfClose) {
              // script/style/pre/textarea：把内部内容原样收集，不逐行改动缩进。
              var end = i + 1;
              while (end < tokens.length) {
                if (/^<\/\s*/.test(tokens[end].trim()) && tagName(tokens[end].trim()) === name) break;
                end++;
              }
              var raw = tokens.slice(i + 1, end).join('');
              if (raw.trim()) {
                raw.split(/\r?\n/).forEach(function (line) {
                  if (line.trim()) lines.push(new Array(indent + 2).join(pad) + line.trim());
                });
              }
              i = end - 1; // 下一次循环处理闭合标签
              indent++;
            } else if (!selfClose) {
              indent++;
            }
            continue;
          }

          add(trimmed);
        }
        return lines.join('\n');
      }

      function run() {
        try {
          output.value = format(input.value, Number(indentSize.value) || 2);
          TB.toast('格式化完成');
        } catch (e) {
          output.value = '';
          TB.toast('格式化失败：' + e.message);
        }
      }

      TB.$('#hfGo', root).addEventListener('click', run);
      TB.$('#hfSample', root).addEventListener('click', function () {
        input.value = '<!DOCTYPE html>\n<html>\n<head><title>示例</title><style>body{color:#333}</style></head>\n<body>\n<div class="box"><p>你好，<b>世界</b></p><img src="a.png"></div>\n</body>\n</html>';
        run();
      });
      TB.$('#hfClear', root).addEventListener('click', function () { input.value = ''; output.value = ''; });
      TB.$('#hfCopy', root).addEventListener('click', function () {
        if (!output.value) return TB.toast('请先格式化');
        TB.copy(output.value);
      });
      TB.$('#hfDownload', root).addEventListener('click', function () {
        if (!output.value) return TB.toast('请先格式化');
        TB.downloadText(output.value, 'formatted.html', 'text/html');
      });
    }
  });

  /* ------------------------------------------------------------ JS 格式化 */
  TB.def({
    slug: 'jsfmt',
    cat: 'web',
    name: 'JavaScript 代码格式化',
    desc: '整理 JS 缩进与空格，识别字符串、注释和正则字面量。',
    icon: '🧩',
    kw: 'JavaScript JS 格式化 美化 缩进 代码 formatter',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">JavaScript 输入</div>' +
          '<textarea class="textarea mono" id="jfIn" rows="10" spellcheck="false" placeholder="粘贴 JS 代码，例如 function f(a){if(a){return 1;}else{return 2;}}"></textarea>' +
          '<div class="row"><div class="field"><div class="label">缩进</div><select class="select" id="jfIndent">' +
            '<option value="2">2 空格</option><option value="4">4 空格</option></select></div></div>' +
          '<div class="btns"><button class="btn primary" id="jfGo" type="button">格式化</button>' +
            '<button class="btn" id="jfSample" type="button">填入示例</button>' +
            '<button class="btn" id="jfClear" type="button">清空</button></div></div>' +
        '<div class="panel"><div class="panel-h">格式化结果</div>' +
          '<div class="btns"><button class="btn" id="jfCopy" type="button">复制结果</button>' +
            '<button class="btn" id="jfDownload" type="button">下载 .js</button></div>' +
          '<textarea class="textarea mono" id="jfOut" rows="14" spellcheck="false"></textarea>' +
          '<p class="note">这是轻量格式化器，不替代 Prettier：它处理常见缩进、空格、注释与正则；复杂表达式可能仍需要人工微调。</p></div>';

      var input = TB.$('#jfIn', root);
      var output = TB.$('#jfOut', root);
      var indentSel = TB.$('#jfIndent', root);

      function isWord(ch) { return /[A-Za-z0-9_$]/.test(ch) || ch === '.'; }
      function isRegexAllowed(prev, prevWord) {
        if (!prev) return true;
        if (/[([{;,:=!&|?+\-*%^~<>]/.test(prev)) return true;
        return /^(return|case|throw|typeof|instanceof|in|of|new|delete|void|yield|await)$/.test(prevWord || '');
      }

      function tokenize(src) {
        var toks = [];
        var i = 0;
        var prev = '';
        var prevWord = '';
        while (i < src.length) {
          var ch = src.charAt(i);
          if (/\s/.test(ch)) { i++; continue; }

          if (ch === '/' && src.charAt(i + 1) === '/') {
            var endLine = src.indexOf('\n', i);
            if (endLine < 0) endLine = src.length;
            toks.push({ type: 'comment', text: src.slice(i, endLine) });
            i = endLine;
            continue;
          }
          if (ch === '/' && src.charAt(i + 1) === '*') {
            var endBlock = src.indexOf('*/', i + 2);
            if (endBlock < 0) endBlock = src.length - 2;
            toks.push({ type: 'comment', text: src.slice(i, endBlock + 2) });
            i = endBlock + 2;
            continue;
          }

          if (ch === '"' || ch === "'" || ch === '`') {
            var quote = ch;
            var start = i;
            i++;
            while (i < src.length) {
              if (src.charAt(i) === '\\') { i += 2; continue; }
              if (src.charAt(i) === quote) { i++; break; }
              i++;
            }
            toks.push({ type: 'string', text: src.slice(start, i) });
            prev = quote;
            prevWord = '';
            continue;
          }

          if (ch === '/' && isRegexAllowed(prev, prevWord)) {
            var reStart = i;
            i++;
            var inClass = false;
            while (i < src.length) {
              var rc = src.charAt(i);
              if (rc === '\\') { i += 2; continue; }
              if (rc === '[') inClass = true;
              else if (rc === ']') inClass = false;
              else if (rc === '/' && !inClass) { i++; break; }
              else if (rc === '\n') break;
              i++;
            }
            while (/[a-z]/i.test(src.charAt(i))) i++;
            toks.push({ type: 'regex', text: src.slice(reStart, i) });
            prev = '/';
            prevWord = '';
            continue;
          }

          if (isWord(ch)) {
            var wStart = i;
            while (i < src.length && isWord(src.charAt(i))) i++;
            var word = src.slice(wStart, i);
            toks.push({ type: 'word', text: word });
            prev = word.charAt(word.length - 1);
            prevWord = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(word) ? word : '';
            continue;
          }

          // 双字符运算符优先，避免把 ++ / === / => 拆成孤立符号。
          var two = src.slice(i, i + 2);
          if (/^(===|!==|==|!=|>=|<=|&&|\|\||\+\+|--|=>|\+=|-=|\*=|\/=|%=|\*\*|<<|>>|\?\?)$/.test(two)) {
            toks.push({ type: 'op', text: two });
            prev = two.charAt(two.length - 1);
            prevWord = '';
            i += 2;
            continue;
          }
          toks.push({ type: 'punc', text: ch });
          prev = ch;
          prevWord = '';
          i++;
        }
        return toks;
      }

      function format(src, size) {
        var toks = tokenize(src);
        var pad = new Array(size + 1).join(' ');
        var out = [];
        var line = '';
        var indent = 0;
        var paren = 0;
        var bracket = 0;
        var pendingSpace = false;
        var lastType = '';
        var lastText = '';

        function rawAdd(text, space) {
          if (space && line && !/\s$/.test(line)) line += ' ';
          line += text;
        }
        function flush(keepIndent) {
          var t = line.replace(/\s+/g, ' ').replace(/\s+$/g, '');
          if (t) out.push(new Array(indent + 1).join(pad) + t);
          line = '';
          if (keepIndent) line = '';
        }
        function comment(tok) {
          var text = tok.text;
          if (text.indexOf('\n') >= 0) {
            var parts = text.split(/\r?\n/);
            parts.forEach(function (part, idx) {
              if (idx === 0 && line.trim()) line += ' ' + part.trim();
              else {
                if (line.trim()) flush();
                line = part.trim();
                flush();
              }
            });
            if (parts.length && line.trim()) flush();
            return;
          }
          if (line.trim()) line += ' ' + text;
          else line = text;
          flush();
        }

        for (var i = 0; i < toks.length; i++) {
          var tok = toks[i];
          if (tok.type === 'comment') { comment(tok); continue; }

          if (tok.type === 'punc') {
            var p = tok.text;
            if (p === '{') {
              // 函数体 / 对象字面量都换行；这会让 `const o={a:1}` 展开成多行，属于有意的可读性取舍。
              if (line.trim()) line += (line.slice(-1) === ' ' ? '' : ' ') + '{';
              else line = '{';
              flush();
              indent++;
            } else if (p === '}') {
              if (line.trim()) flush();
              indent = Math.max(0, indent - 1);
              line = '}';
              flush();
            } else if (p === ';') {
              line += ';';
              if (paren === 0 && bracket === 0) flush();
            } else if (p === '(') {
              rawAdd('(', false); paren++;
            } else if (p === ')') {
              rawAdd(')', false); paren = Math.max(0, paren - 1);
            } else if (p === '[') {
              rawAdd('[', false); bracket++;
            } else if (p === ']') {
              rawAdd(']', false); bracket = Math.max(0, bracket - 1);
            } else if (p === ',') {
              rawAdd(',', false); pendingSpace = true;
            } else if (p === ':') {
              rawAdd(':', false); pendingSpace = true;
            } else if (p === '.') {
              rawAdd('.', false);
            } else if (/^[=<>+*\/%&|^]$/.test(p)) {
              // 常见二元运算符补空格；! 与一元 + / - 不在这里处理，避免把 !flag 写成 ! flag。
              rawAdd(p, true);
              pendingSpace = true;
            } else {
              rawAdd(p, false);
            }
            lastType = 'punc'; lastText = p;
            continue;
          }

          if (tok.type === 'op') {
            // 一元运算符与箭头函数不强制两侧空格，其余运算符统一空格。
            var op = tok.text;
            if (/^(=>|\+\+|--)$/.test(op)) {
              if (op === '=>') rawAdd(' => ', false);
              else rawAdd(op, false);
            } else {
              rawAdd(op, true);
              pendingSpace = true;
            }
            lastType = 'op'; lastText = op;
            continue;
          }

          // 单词 / 字符串 / 正则：在两个“粘性”标记之间补空格，避免 `returnx` 之类拼接。
          var needSpace = pendingSpace ||
            (lastType === 'word' && (tok.type === 'word' || tok.type === 'string' || tok.type === 'regex')) ||
            (lastType === 'string' && tok.type === 'word') ||
            (lastType === 'regex' && tok.type === 'word');
          rawAdd(tok.text, needSpace);
          pendingSpace = false;
          lastType = tok.type;
          lastText = tok.text;
        }
        if (line.trim()) flush();
        return out.join('\n');
      }

      function run() {
        try {
          output.value = format(input.value, Number(indentSel.value) || 2);
          TB.toast('格式化完成');
        } catch (e) {
          output.value = '';
          TB.toast('格式化失败：' + e.message);
        }
      }

      TB.$('#jfGo', root).addEventListener('click', run);
      TB.$('#jfSample', root).addEventListener('click', function () {
        input.value = 'function sum(a,b){// 求和\n if(a>0){return a+b;}else{return b-a;}}\nconst re=/\\d+\\s(\\w+)/g; console.log(sum(2,3),re.test("12 abc"));';
        run();
      });
      TB.$('#jfClear', root).addEventListener('click', function () { input.value = ''; output.value = ''; });
      TB.$('#jfCopy', root).addEventListener('click', function () {
        if (!output.value) return TB.toast('请先格式化');
        TB.copy(output.value);
      });
      TB.$('#jfDownload', root).addEventListener('click', function () {
        if (!output.value) return TB.toast('请先格式化');
        TB.downloadText(output.value, 'formatted.js', 'text/javascript');
      });
    }
  });

  /* ------------------------------------------------------- 正则可视化 */
  TB.def({
    slug: 'regexviz',
    cat: 'web',
    name: '正则表达式可视化',
    desc: '把正则拆成分组、分支、字符集和量词结构树，便于理解。',
    icon: '🕸️',
    kw: '正则 可视化 结构树 分组 量词 regex railroad',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">正则表达式</div>' +
          '<input class="input mono" id="rvIn" value="^(https?):\\/\\/([^\\/]+)\\/api\\/(\\w+)(?:\\?.*)?$" spellcheck="false">' +
          '<div class="btns"><button class="btn primary" id="rvGo" type="button">生成结构图</button>' +
            '<button class="btn" id="rvSample" type="button">填入示例</button>' +
            '<button class="btn" id="rvClear" type="button">清空</button></div>' +
          '<p class="note">结构图展示表达式的组成与嵌套关系；它用于理解，不执行匹配。支持分组、分支、字符集、转义和常见量词。</p></div>' +
        '<div class="panel"><div class="panel-h">结构图</div><div class="rv-flow" id="rvTree"></div></div>' +
        '<div class="panel"><div class="panel-h">结构说明</div><div class="rv-legend" id="rvLegend"></div></div>';

      var input = TB.$('#rvIn', root);
      var tree = TB.$('#rvTree', root);
      var legend = TB.$('#rvLegend', root);

      function parse(pattern) {
        var i = 0;
        var p = pattern;

        function peek() { return p.charAt(i); }
        function eat(ch) { if (p.charAt(i) !== ch) throw new Error('第 ' + (i + 1) + ' 个字符应为 ' + ch); i++; }

        function parseAlt(stop) {
          var options = [];
          while (true) {
            options.push(parseSeq(stop));
            if (p.charAt(i) === '|') { i++; continue; }
            break;
          }
          return options.length > 1 ? { type: 'alt', options: options } : options[0];
        }

        function parseSeq(stop) {
          var items = [];
          while (i < p.length) {
            var ch = p.charAt(i);
            if (ch === '|' || ch === stop) break;
            items.push(parseAtom());
          }
          return { type: 'seq', items: items };
        }

        function parseQuant(child) {
          var q = p.charAt(i);
          var label = '';
          if (q === '*' || q === '+' || q === '?') {
            i++;
            label = q;
            if (p.charAt(i) === '?') { i++; label += ' 非贪婪'; }
          } else if (q === '{') {
            var close = p.indexOf('}', i);
            if (close > i) {
              label = p.slice(i, close + 1);
              i = close + 1;
              if (p.charAt(i) === '?') { i++; label += ' 非贪婪'; }
            }
          }
          return label ? { type: 'quant', label: label, child: child } : child;
        }

        function parseAtom() {
          var ch = p.charAt(i);
          var node;
          if (ch === '(') {
            i++;
            var label = '捕获组';
            if (p.charAt(i) === '?') {
              var next = p.charAt(i + 1);
              if (next === ':') { label = '非捕获组'; i += 2; }
              else if (next === '=') { label = '正向先行断言'; i += 2; }
              else if (next === '!') { label = '负向先行断言'; i += 2; }
              else if (next === '<') {
                var c2 = p.charAt(i + 2);
                if (c2 === '=' || c2 === '!') { label = c2 === '=' ? '正向后行断言' : '负向后行断言'; i += 3; }
                else {
                  var gt = p.indexOf('>', i + 2);
                  if (gt < 0) throw new Error('命名分组缺少 >');
                  label = '命名组 ' + p.slice(i + 2, gt);
                  i = gt + 1;
                }
              }
            }
            var inner = parseAlt(')');
            eat(')');
            node = { type: 'group', label: label, child: inner };
          } else if (ch === '[') {
            i++;
            var start = i;
            var escaped = false;
            while (i < p.length) {
              var cc = p.charAt(i);
              if (cc === '\\' && !escaped) { escaped = true; i++; continue; }
              if (cc === ']' && !escaped) break;
              escaped = false;
              i++;
            }
            eat(']');
            node = { type: 'class', text: '[' + p.slice(start, i - 1) + ']' };
          } else if (ch === '\\') {
            i++;
            var esc = p.charAt(i) || '';
            i++;
            node = { type: 'escape', text: '\\' + esc };
          } else if (ch === '.') {
            i++; node = { type: 'any', text: '.' };
          } else if (ch === '^' || ch === '$') {
            i++; node = { type: 'anchor', text: ch };
          } else if (ch === ')' || ch === '|' || ch === '') {
            throw new Error('意外的 ' + (ch || '结尾'));
          } else {
            i++;
            node = { type: 'literal', text: ch };
          }
          return parseQuant(node);
        }

        if (!p) return { type: 'seq', items: [] };
        var result = parseAlt('');
        if (i < p.length) throw new Error('未解析的结尾：' + p.slice(i));
        return result;
      }

      function render(node) {
        if (!node) return '<span class="rv-empty">空</span>';
        if (node.type === 'seq') {
          if (!node.items.length) return '<span class="rv-empty">空序列</span>';
          return '<div class="rv-seq">' + node.items.map(render).join('') + '</div>';
        }
        if (node.type === 'alt') {
          return '<div class="rv-alt">' + node.options.map(function (option, idx) {
            return '<div class="rv-branch"><span class="rv-or">' + (idx === 0 ? '分支' : '或') + '</span>' + render(option) + '</div>';
          }).join('') + '</div>';
        }
        if (node.type === 'group') {
          return '<span class="rv-group"><span class="rv-group-label">' + TB.esc(node.label) + '</span>' + render(node.child) + '</span>';
        }
        if (node.type === 'quant') {
          return '<span class="rv-quant"><span class="rv-quant-badge">' + TB.esc(node.label) + '</span>' + render(node.child) + '</span>';
        }
        var cls = {
          literal: 'rv-lit', escape: 'rv-esc', 'class': 'rv-class',
          any: 'rv-any', anchor: 'rv-anchor'
        }[node.type] || 'rv-lit';
        return '<span class="rv-pill ' + cls + '">' + TB.esc(node.text) + '</span>';
      }

      function collect(node, list) {
        if (!node) return;
        if (node.type === 'group') list.push('分组：' + node.label);
        if (node.type === 'quant') list.push('量词：' + node.label + (node.child && node.child.text ? '（作用于 ' + node.child.text + '）' : ''));
        if (node.type === 'alt') list.push('分支：' + node.options.length + ' 条路径');
        if (node.type === 'class') list.push('字符集：' + node.text);
        if (node.items) node.items.forEach(function (item) { collect(item, list); });
        if (node.child) collect(node.child, list);
        if (node.options) node.options.forEach(function (option) { collect(option, list); });
      }

      function run() {
        try {
          var ast = parse(input.value);
          tree.innerHTML = render(ast);
          var list = [];
          collect(ast, list);
          legend.innerHTML = list.length ? list.map(function (item) {
            return '<div class="rv-legend-item">' + TB.esc(item) + '</div>';
          }).join('') : '<div class="hint">没有额外的分组或量词，表达式是一条顺序结构。</div>';
          TB.toast('结构图已生成');
        } catch (e) {
          tree.innerHTML = '<div class="rv-error">解析失败：' + TB.esc(e.message) + '</div>';
          legend.innerHTML = '<div class="hint">请检查括号、方括号和量词是否成对。</div>';
        }
      }

      TB.$('#rvGo', root).addEventListener('click', run);
      TB.$('#rvSample', root).addEventListener('click', function () {
        input.value = '^(https?):\\/\\/([^\\/]+)\\/api\\/(\\w+)(?:\\?.*)?$';
        run();
      });
      TB.$('#rvClear', root).addEventListener('click', function () { input.value = ''; tree.innerHTML = ''; legend.innerHTML = ''; });
      run();
    }
  });

  /* ------------------------------------------------------------ EXIF 查看 */
  TB.def({
    slug: 'exif',
    cat: 'image',
    name: '图片 EXIF 信息查看',
    desc: '读取 JPEG 的相机、拍摄参数、时间与 GPS 信息，并显示原图。',
    icon: '📷',
    kw: 'EXIF 照片 相机 光圈 快门 ISO GPS 拍摄参数 图片信息',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择图片</div>' +
          '<input class="input" type="file" id="exFile" accept="image/jpeg,image/jpg,image/png,image/webp">' +
          '<p class="note">EXIF 主要存在于 JPEG；PNG / WebP 通常没有相机参数。所有解析都在本地完成，图片不会上传。</p></div>' +
        '<div class="panel"><div class="panel-h">图片预览</div>' +
          '<div class="ex-layout"><div class="ex-preview" id="exPreview"><div class="hint">尚未选择图片</div></div>' +
          '<div class="ex-summary" id="exSummary"></div></div></div>' +
        '<div class="panel"><div class="panel-h">拍摄信息</div><div class="ex-kv" id="exKv"><div class="hint">选择一张 JPEG 后显示。</div></div></div>' +
        '<div class="panel"><div class="panel-h">全部 EXIF 标签</div><div class="ex-table-wrap"><table class="table" id="exTable"><thead><tr><th>标签</th><th>值</th></tr></thead><tbody><tr><td colspan="2" class="hint">暂无数据</td></tr></tbody></table></div></div>';

      var input = TB.$('#exFile', root);
      var preview = TB.$('#exPreview', root);
      var summary = TB.$('#exSummary', root);
      var kv = TB.$('#exKv', root);
      var tableBody = TB.$('#exTable tbody', root);

      var TAGS = {
        0x0100: '图像宽度', 0x0101: '图像高度', 0x010E: '图像描述', 0x010F: '制造商', 0x0110: '相机型号',
        0x0112: '方向', 0x011A: 'X 分辨率', 0x011B: 'Y 分辨率', 0x0128: '分辨率单位', 0x0131: '软件',
        0x0132: '修改时间', 0x013B: '作者', 0x8298: '版权', 0x8769: 'EXIF 子 IFD', 0x8825: 'GPS IFD',
        0x829A: '曝光时间', 0x829D: '光圈值', 0x8822: '曝光程序', 0x8827: 'ISO 感光度',
        0x9000: 'EXIF 版本', 0x9003: '拍摄时间', 0x9004: '数字化时间', 0x9201: '快门速度',
        0x9202: '光圈', 0x9204: '曝光补偿', 0x9205: '最大光圈', 0x9207: '测光模式',
        0x9209: '闪光灯', 0x920A: '焦距', 0x927C: '厂商备注', 0x9286: '用户备注',
        0xA002: '像素 X 尺寸', 0xA003: '像素 Y 尺寸', 0xA405: '焦距（35mm 等效）', 0xA434: '镜头型号',
        0x0001: 'GPS 纬度参考', 0x0002: 'GPS 纬度', 0x0003: 'GPS 经度参考', 0x0004: 'GPS 经度',
        0x0005: 'GPS 高度参考', 0x0006: 'GPS 高度', 0x0007: 'GPS 时间戳', 0x001D: 'GPS 日期'
      };
      var TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

      function ascii(bytes) {
        var text = '';
        for (var i = 0; i < bytes.length; i++) {
          if (bytes[i] === 0) break;
          text += String.fromCharCode(bytes[i]);
        }
        return text;
      }

      function parseTiff(buffer, tiffStart) {
        var dv = new DataView(buffer);
        var u8 = new Uint8Array(buffer);
        var little = u8[tiffStart] === 0x49 && u8[tiffStart + 1] === 0x49;
        if (!little && !(u8[tiffStart] === 0x4D && u8[tiffStart + 1] === 0x4D)) return null;

        function u16(off) { return dv.getUint16(off, little); }
        function u32(off) { return dv.getUint32(off, little); }
        function s32(off) { return dv.getInt32(off, little); }

        function valueOf(entry) {
          var type = u16(entry + 2);
          var count = u32(entry + 4);
          var size = TYPE_SIZE[type];
          if (!size) return null;
          var total = size * count;
          var offset = total <= 4 ? entry + 8 : tiffStart + u32(entry + 8);
          if (offset + total > buffer.byteLength) return null;
          var out = [];
          for (var n = 0; n < count; n++) {
            var at = offset + n * size;
            if (type === 1 || type === 7) out.push(u8[at]);
            else if (type === 2) return ascii(u8.slice(offset, offset + count));
            else if (type === 3) out.push(u16(at));
            else if (type === 4) out.push(u32(at));
            else if (type === 5) out.push({ n: u32(at), d: u32(at + 4) });
            else if (type === 9) out.push(s32(at));
            else if (type === 10) out.push({ n: s32(at), d: s32(at + 4) });
          }
          return type === 2 ? out : out;
        }

        function ifd(offset, group) {
          var ptr = tiffStart + offset;
          if (ptr + 2 > buffer.byteLength) return {};
          var count = u16(ptr);
          if (count > 300) return {};
          var tags = {};
          for (var i = 0; i < count; i++) {
            var entry = ptr + 2 + i * 12;
            if (entry + 12 > buffer.byteLength) break;
            var tag = u16(entry);
            var val = valueOf(entry);
            tags[tag] = { group: group, value: val };
          }
          return tags;
        }

        var tags = {};
        var ifd0 = u32(tiffStart + 4);
        var first = ifd(ifd0, 'IFD0');
        Object.keys(first).forEach(function (k) { tags[k] = first[k]; });
        if (first[0x8769] && first[0x8769].value && first[0x8769].value[0]) {
          var exif = ifd(first[0x8769].value[0], 'EXIF');
          Object.keys(exif).forEach(function (k) { tags[k] = exif[k]; });
        }
        if (first[0x8825] && first[0x8825].value && first[0x8825].value[0]) {
          var gps = ifd(first[0x8825].value[0], 'GPS');
          Object.keys(gps).forEach(function (k) { tags[k] = gps[k]; });
        }
        return tags;
      }

      function findExif(buffer) {
        var u8 = new Uint8Array(buffer);
        if (u8.length < 4 || u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
        var dv = new DataView(buffer);
        var off = 2;
        while (off + 1 < u8.length) {
          if (u8[off] !== 0xFF) { off++; continue; }
          var marker = u8[off + 1];
          off += 2;
          if (marker === 0xD9 || marker === 0xDA) break;
          var len = dv.getUint16(off, false);
          if (len < 2) break;
          if (marker === 0xE1) {
            var data = off + 2;
            if (String.fromCharCode(u8[data], u8[data + 1], u8[data + 2], u8[data + 3]) === 'Exif' &&
                u8[data + 4] === 0 && u8[data + 5] === 0) {
              return parseTiff(buffer, data + 6);
            }
          }
          off += len;
        }
        return null;
      }

      function rational(v, digits) {
        if (!v || !v.length) return '—';
        var item = v[0];
        if (!item || !item.d) return '—';
        return (item.n / item.d).toFixed(digits == null ? 2 : digits).replace(/\.0+$/, '');
      }

      function gpsCoord(v, ref) {
        if (!v || v.length < 3) return '—';
        var deg = (v[0].n / v[0].d) + (v[1].n / v[1].d) / 60 + (v[2].n / v[2].d) / 3600;
        var sign = (ref === 'S' || ref === 'W') ? -1 : 1;
        return (deg * sign).toFixed(6) + '°';
      }

      function fmtDate(text) {
        if (!text) return '—';
        return String(text).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      }

      function show(file, img, url, tags) {
        preview.innerHTML = '<img class="ex-img" src="' + url + '" alt="预览">';
        summary.innerHTML =
          '<div class="ex-file"><b>' + TB.esc(file.name) + '</b><span>' + TB.fmtBytes(file.size) + '</span></div>' +
          '<div class="ex-dims">' + img.naturalWidth + ' × ' + img.naturalHeight + ' px</div>' +
          '<div class="ex-badge">' + (tags ? '含 EXIF' : '无 EXIF') + '</div>';

        if (!tags) {
          kv.innerHTML = '<div class="hint">没有找到 EXIF 数据。PNG、WebP 或经过压缩 / 截图处理的图片通常不包含拍摄参数。</div>';
          tableBody.innerHTML = '<tr><td colspan="2" class="hint">暂无 EXIF 标签</td></tr>';
          return;
        }

        var rows = [];
        function get(tag) { return tags[tag] && tags[tag].value; }
        var make = get(0x010F), model = get(0x0110);
        var date = get(0x9003) || get(0x0132);
        var exposure = get(0x829A), fnum = get(0x829D), iso = get(0x8827);
        var focal = get(0x920A), lens = get(0xA434);
        var lat = get(0x0002), latRef = get(0x0001), lng = get(0x0004), lngRef = get(0x0003);
        if (make || model) rows.push(['相机', [make, model].filter(Boolean).join(' ')]);
        if (date) rows.push(['拍摄时间', fmtDate(date)]);
        if (exposure) {
          var ex = exposure[0];
          rows.push(['曝光时间', ex && ex.d ? (ex.n / ex.d < 1 ? '1/' + Math.round(ex.d / ex.n) + ' s' : (ex.n / ex.d).toFixed(2) + ' s') : '—']);
        }
        if (fnum) rows.push(['光圈', 'f/' + rational(fnum, 1)]);
        if (iso) rows.push(['ISO', String(iso[0])]);
        if (focal) rows.push(['焦距', rational(focal, 1) + ' mm']);
        if (lens) rows.push(['镜头', lens]);
        if (lat && lng) {
          rows.push(['GPS 纬度', gpsCoord(lat, latRef)]);
          rows.push(['GPS 经度', gpsCoord(lng, lngRef)]);
        }
        var orientation = get(0x0112);
        if (orientation) {
          var om = { 1: '正常', 2: '水平镜像', 3: '旋转 180°', 4: '垂直镜像', 5: '转置', 6: '顺时针 90°', 7: '反转置', 8: '逆时针 90°' };
          rows.push(['方向', om[orientation[0]] || ('值 ' + orientation[0])]);
        }
        if (!rows.length) rows.push(['提示', '有 EXIF 块，但没有识别到常用拍摄字段']);

        kv.innerHTML = rows.map(function (row) {
          return '<div class="ex-kv-row"><span>' + TB.esc(row[0]) + '</span><b>' + TB.esc(row[1]) + '</b></div>';
        }).join('');

        var all = Object.keys(tags).sort(function (a, b) { return Number(a) - Number(b); });
        tableBody.innerHTML = all.map(function (key) {
          var item = tags[key];
          var value = item.value;
          if (Array.isArray(value)) {
            if (value.length && typeof value[0] === 'object' && value[0] && value[0].d != null) {
              value = value.map(function (r) { return r.n + '/' + r.d; }).join(' ');
            } else {
              value = value.join(', ');
            }
          }
          return '<tr><td><span class="ex-tag">0x' + Number(key).toString(16).toUpperCase() + '</span> ' +
            TB.esc(TAGS[key] || '未知标签') + '<small>' + TB.esc(item.group) + '</small></td><td class="mono">' + TB.esc(value) + '</td></tr>';
        }).join('');
      }

      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        preview.innerHTML = '<div class="hint">读取中…</div>';
        TB.readImage(file).then(function (obj) {
          TB.readArrayBuffer(file).then(function (buffer) {
            var tags = null;
            try { tags = findExif(buffer); } catch (e) { tags = null; }
            show(file, obj.img, obj.url, tags);
          }).catch(function (e) { TB.toast('读取失败：' + e.message); });
        }).catch(function (e) {
          preview.innerHTML = '<div class="hint">' + TB.esc(e.message) + '</div>';
        });
      });
    }
  });

  /* --------------------------------------------------------- PDF 扫描件 */
  TB.def({
    slug: 'pdfscan',
    cat: 'office',
    name: 'PDF 扫描件效果',
    desc: '把 PDF 页面渲染成灰度扫描件，可调对比度、噪点并批量导出 PNG。',
    icon: '📠',
    kw: 'PDF 扫描件 灰度 复印 噪点 图片 导出 PDF转图片',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择 PDF</div>' +
          '<input class="input" type="file" id="psFile" accept="application/pdf,.pdf">' +
          '<div class="row">' +
            '<div class="field"><div class="label">页面</div><input class="input" id="psRange" value="全部" placeholder="全部 / 1-3,5"></div>' +
            '<div class="field"><div class="label">清晰度</div><select class="select" id="psScale">' +
              '<option value="1.5">标准 (1.5×)</option><option value="2" selected>清晰 (2×)</option><option value="2.5">高清 (2.5×)</option><option value="3">打印 (3×)</option></select></div>' +
            '<div class="field"><div class="label">对比度 <b id="psContrastV">1.35</b></div><input class="input" type="range" id="psContrast" min="0.8" max="2.2" step="0.05" value="1.35"></div>' +
            '<div class="field"><div class="label">噪点 <b id="psNoiseV">7</b></div><input class="input" type="range" id="psNoise" min="0" max="30" value="7"></div>' +
            '<div class="field"><div class="label">纸张底色</div><select class="select" id="psPaper">' +
              '<option value="warm">暖白</option><option value="white">纯白</option><option value="gray">浅灰</option></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="psPreview" type="button">生成预览</button>' +
            '<button class="btn" id="psAll" type="button">导出全部 PNG（ZIP）</button></div>' +
          '<div class="ps-progress" id="psProgress"><span></span></div>' +
          '<p class="note">页面由 pdf.js 在本地渲染，再做灰度、对比度和纸张噪点处理；不会上传 PDF。</p></div>' +
        '<div class="panel"><div class="panel-h">扫描件预览</div><div class="ps-preview" id="psPreviewBox"><div class="hint">选择 PDF 后点击“生成预览”。</div></div></div>' +
        '<div class="panel"><div class="panel-h">当前页信息</div><div class="ps-info" id="psInfo"><div class="hint">尚未生成。</div></div></div>';

      var fileInput = TB.$('#psFile', root);
      var previewBtn = TB.$('#psPreview', root);
      var allBtn = TB.$('#psAll', root);
      var previewBox = TB.$('#psPreviewBox', root);
      var info = TB.$('#psInfo', root);
      var progress = TB.$('#psProgress', root);
      var progressBar = TB.$('span', progress);
      var doc = null;
      var currentCanvas = null;
      var currentPage = 1;

      function rangeList(text, max) {
        text = String(text || '').trim();
        if (!text || text === '全部' || text.toLowerCase() === 'all') {
          var all = [];
          for (var i = 1; i <= max; i++) all.push(i);
          return all;
        }
        var out = [];
        text.split(',').forEach(function (part) {
          part = part.trim();
          var m = /^([0-9]+)\s*-\s*([0-9]+)$/.exec(part);
          if (m) {
            var from = Math.max(1, Number(m[1])), to = Math.min(max, Number(m[2]));
            for (var j = from; j <= to; j++) if (out.indexOf(j) < 0) out.push(j);
          } else if (/^[0-9]+$/.test(part)) {
            var n = Number(part);
            if (n >= 1 && n <= max && out.indexOf(n) < 0) out.push(n);
          }
        });
        return out.length ? out.sort(function (a, b) { return a - b; }) : [1];
      }

      function paperTint(kind, value) {
        if (kind === 'white') return [value, value, value];
        if (kind === 'gray') return [value - 3, value - 3, value - 3];
        return [value + 7, value + 4, value - 2];
      }

      function scan(canvas) {
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var px = data.data;
        var contrast = Number(TB.$('#psContrast', root).value) || 1.35;
        var noise = Number(TB.$('#psNoise', root).value) || 0;
        var paper = TB.$('#psPaper', root).value;
        for (var i = 0; i < px.length; i += 4) {
          var gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
          var v = (gray - 128) * contrast + 128 + (Math.random() * 2 - 1) * noise;
          var rgb = paperTint(paper, Math.max(0, Math.min(255, v)));
          px[i] = Math.max(0, Math.min(255, rgb[0]));
          px[i + 1] = Math.max(0, Math.min(255, rgb[1]));
          px[i + 2] = Math.max(0, Math.min(255, rgb[2]));
          px[i + 3] = 255;
        }
        ctx.putImageData(data, 0, 0);
      }

      async function load() {
        var file = fileInput.files && fileInput.files[0];
        if (!file) throw new Error('请先选择 PDF');
        await TB.loadLib('pdf.min.js');
        var lib = window.pdfjsLib;
        if (!lib) throw new Error('pdf.js 加载失败');
        lib.GlobalWorkerOptions.workerSrc = 'assets/lib/pdf.worker.min.js';
        var buffer = await TB.readArrayBuffer(file);
        doc = await lib.getDocument({ data: buffer }).promise;
        currentPage = 1;
        info.innerHTML = '<div class="ps-kv"><span>文件</span><b>' + TB.esc(file.name) + '</b></div>' +
          '<div class="ps-kv"><span>页数</span><b>' + doc.numPages + ' 页</b></div>';
        return doc;
      }

      async function renderPage(num) {
        var scale = Number(TB.$('#psScale', root).value) || 2;
        var page = await doc.getPage(num);
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        var context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        scan(canvas);
        return canvas;
      }

      function setBusy(text, ratio) {
        progress.classList.toggle('on', !!text);
        progressBar.style.width = Math.round((ratio || 0) * 100) + '%';
        if (text) progressBar.title = text;
      }

      previewBtn.addEventListener('click', async function () {
        previewBtn.disabled = true;
        try {
          if (!doc) await load();
          var pages = rangeList(TB.$('#psRange', root).value, doc.numPages);
          currentPage = pages[0];
          setBusy('渲染第 ' + currentPage + ' 页…', 0.3);
          currentCanvas = await renderPage(currentPage);
          previewBox.innerHTML = '';
          previewBox.appendChild(currentCanvas);
          currentCanvas.className = 'ps-canvas';
          info.innerHTML = '<div class="ps-kv"><span>当前页</span><b>' + currentPage + '</b></div>' +
            '<div class="ps-kv"><span>输出尺寸</span><b>' + currentCanvas.width + ' × ' + currentCanvas.height + ' px</b></div>' +
            '<div class="ps-kv"><span>缩放</span><b>' + TB.$('#psScale', root).value + '×</b></div>';
          setBusy('', 1);
          TB.toast('预览已生成');
        } catch (e) {
          TB.toast(e.message || '生成失败');
        } finally {
          previewBtn.disabled = false;
        }
      });

      allBtn.addEventListener('click', async function () {
        allBtn.disabled = true;
        try {
          if (!doc) await load();
          var pages = rangeList(TB.$('#psRange', root).value, doc.numPages);
          if (pages.length > 30 && !confirm('将导出 ' + pages.length + ' 页，可能需要一些时间，继续吗？')) return;
          var entries = [];
          for (var i = 0; i < pages.length; i++) {
            setBusy('导出第 ' + (i + 1) + ' / ' + pages.length + ' 页…', (i + 1) / pages.length);
            var canvas = await renderPage(pages[i]);
            var blob = await TB.canvasBlob(canvas, 'image/png');
            entries.push({ name: 'page-' + ('00' + pages[i]).slice(-3) + '.png', blob: blob });
          }
          setBusy('正在打包…', 1);
          await TB.zipDownload(entries, 'pdf-scan-pages.zip');
          setBusy('', 0);
          TB.toast('已导出 ' + entries.length + ' 页');
        } catch (e) {
          setBusy('', 0);
          TB.toast(e.message || '导出失败');
        } finally {
          allBtn.disabled = false;
        }
      });

      ['psContrast', 'psNoise'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', function () {
          TB.$('#psContrastV', root).textContent = TB.$('#psContrast', root).value;
          TB.$('#psNoiseV', root).textContent = TB.$('#psNoise', root).value;
        });
      });
      fileInput.addEventListener('change', function () {
        doc = null;
        currentCanvas = null;
        previewBox.innerHTML = '<div class="hint">已选择文件，点击“生成预览”。</div>';
        info.innerHTML = '<div class="hint">点击生成后显示页数与尺寸。</div>';
      });
    }
  });

})();
