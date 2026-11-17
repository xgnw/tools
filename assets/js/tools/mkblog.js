/* =============================================================================
   tool.mkblog.cn 工具精选（第一批：实用 / 开发者）
   -----------------------------------------------------------------------------
   接入：数字转大写、PDF 转图片、键盘键码、摩斯密码
   未接：在线 PS / 白板 / 音频编辑器 / 录屏 / FC 游戏 / OCR / DNS / Whois /
         图床 / Wordpress 嗅探 / 手机归属地（外部服务或工程量过大）；
         亲属称谓、屏幕检测、进制转换、文本 Diff、时间戳、JSON、Markdown、
         图片 Base64、PDF 合并拆分等本站已有。
   ============================================================================= */
(function () {
  'use strict';

  function alive(root) { return !!(root && root.isConnected); }
  var D = '零壹贰叁肆伍陆柒捌玖';
  var UNIT4 = ['仟', '佰', '拾', ''];

  /* ------------------------------------------------------------ 数字转大写 */
  function four(n) {
    var d = [Math.floor(n / 1000) % 10, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
    var s = '', zero = false;
    for (var i = 0; i < 4; i++) {
      if (!d[i]) { if (s) zero = true; continue; }
      if (zero) { s += '零'; zero = false; }
      s += D[d[i]] + UNIT4[i];
    }
    return s;
  }

  function intChinese(intStr) {
    var groups = [], s = intStr.replace(/^0+/, '') || '0';
    while (s.length) { groups.push(s.slice(-4)); s = s.slice(0, -4); }
    var units = ['', '万', '亿', '万亿'];
    var out = '', needZero = false;
    for (var i = groups.length - 1; i >= 0; i--) {
      var g = parseInt(groups[i], 10);
      if (!g) { if (out) needZero = true; continue; }
      if (out && (needZero || g < 1000)) out += '零';
      out += four(g) + (units[i] || '');
      needZero = (g % 10 === 0);
    }
    return out || '零';
  }

  function rmbUpper(intStr, frac) {
    if (intStr === '0' && frac === '00') return '零元整';
    var base = intChinese(intStr) + '元';
    var jiao = +frac.charAt(0), fen = +frac.charAt(1);
    if (!jiao && !fen) return base + '整';
    if (jiao) base += D[jiao] + '角';
    else if (fen) base += '零';
    if (fen) base += D[fen] + '分';
    return base;
  }

  function plainChinese(intStr, frac) {
    var DL = '零一二三四五六七八九';
    var PU = ['千', '百', '十', ''];
    var units = ['', '万', '亿', '万亿'];
    var groups = [], s = intStr.replace(/^0+/, '') || '0';
    while (s.length) { groups.push(s.slice(-4)); s = s.slice(0, -4); }
    var out = '', needZero = false;
    for (var i = groups.length - 1; i >= 0; i--) {
      var g = parseInt(groups[i], 10);
      if (!g) { if (out) needZero = true; continue; }
      if (out && (needZero || g < 1000)) out += '零';
      var d = [Math.floor(g / 1000) % 10, Math.floor(g / 100) % 10, Math.floor(g / 10) % 10, g % 10];
      var part = '', zero = false;
      for (var j = 0; j < 4; j++) {
        if (!d[j]) { if (part) zero = true; continue; }
        if (zero) { part += '零'; zero = false; }
        part += DL[d[j]] + PU[j];
      }
      out += part + (units[i] || '');
      needZero = (g % 10 === 0);
    }
    out = (out || '零').replace(/^一十/, '十');
    var f = frac.replace(/0+$/, '');
    if (f) out += '点' + Array.from(f).map(function (c) { return DL[+c]; }).join('');
    return out;
  }

  var EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var EN_SCALE = ['', 'thousand', 'million', 'billion', 'trillion'];

  function enThree(n) {
    var h = Math.floor(n / 100), rest = n % 100, out = [];
    if (h) out.push(EN_ONES[h] + ' hundred');
    if (rest) {
      if (h) out.push('and');
      if (rest < 20) out.push(EN_ONES[rest]);
      else {
        var t = EN_TENS[Math.floor(rest / 10)], o = rest % 10;
        out.push(t + (o ? '-' + EN_ONES[o] : ''));
      }
    }
    return out.join(' ');
  }

  function enInt(intStr) {
    var groups = [], s = intStr.replace(/^0+/, '') || '0';
    while (s.length) { groups.push(s.slice(-3)); s = s.slice(0, -3); }
    var out = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      var g = parseInt(groups[i], 10);
      if (!g) continue;
      out.push(enThree(g) + (EN_SCALE[i] ? ' ' + EN_SCALE[i] : ''));
    }
    return out.join(' ') || 'zero';
  }

  TB.def({
    slug: 'num-upper', cat: 'data', name: '数字转大写', icon: '🔠',
    desc: '人民币 / 中文 / 英文金额',
    kw: '数字 大写 人民币 金额 中文 英文 财务 报销 发票',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">金额<span class="hint">最多 15 位整数 + 2 位小数</span></div>' +
          '<div class="field"><input class="input num-input" id="nuVal" value="1234.56" autocomplete="off" spellcheck="false"></div>' +
          '<div class="btns">' +
            [['1234.56', '1234.56'], ['100000001', '1 亿零 1'], ['0.05', '5 分'], ['88888888.88', '8888 万']].map(function (p) {
              return '<button class="btn sm" data-n="' + p[0] + '">' + p[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div id="nuErr" class="note" style="margin-top:10px;display:none"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">结果</div>' +
          '<div id="nuOut"></div>' +
        '</div>';

      var val = TB.$('#nuVal', root), out = TB.$('#nuOut', root), err = TB.$('#nuErr', root);

      function parse(raw) {
        raw = String(raw).trim().replace(/[,，\s¥￥]/g, '');
        if (/^-?\.\d+$/.test(raw)) raw = raw.replace(/^(-?)\./, '$10.');
        if (!/^-?\d{1,15}(\.\d{1,2})?$/.test(raw)) throw new Error('请输入最多 15 位整数、最多 2 位小数的数字');
        var neg = raw.charAt(0) === '-';
        var s = neg ? raw.slice(1) : raw;
        var parts = s.split('.');
        var frac = (parts[1] || '').padEnd(2, '0').slice(0, 2);
        return { neg: neg, int: parts[0], frac: frac };
      }

      function run() {
        var r;
        try { r = parse(val.value); } catch (e) {
          err.style.display = '';
          err.innerHTML = '<span class="result-err">' + TB.esc(e.message) + '</span>';
          out.innerHTML = '';
          return;
        }
        err.style.display = 'none';
        var intStr = (r.int.replace(/^0+/, '') || '0');
        var prefix = r.neg ? '负' : '';

        var rmb = rmbUpper(intStr, r.frac);
        var cn = plainChinese(intStr, r.frac);
        var cents = (+r.frac.charAt(0)) * 10 + (+r.frac.charAt(1));
        var en = enInt(intStr);
        if (cents) en += ' yuan and ' + enThree(cents) + (cents === 1 ? ' cent' : ' cents');
        else en += ' yuan';

        var rows = [
          ['人民币大写', prefix + rmb],
          ['中文读法', prefix + cn],
          ['英文读法', (r.neg ? 'minus ' : '') + en]
        ];
        out.innerHTML = rows.map(function (x, i) {
          return '<div class="num-row"><div class="num-k">' + x[0] + '</div>' +
            '<div class="num-v" id="nuV' + i + '">' + TB.esc(x[1]) + '</div>' +
            '<button class="btn sm" data-copy="' + i + '">复制</button></div>';
        }).join('');
        out.setAttribute('data-vals', JSON.stringify(rows.map(function (x) { return x[1]; })));
      }

      val.addEventListener('input', run);
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-n]');
        if (b) { val.value = b.getAttribute('data-n'); run(); return; }
        var c = e.target.closest('[data-copy]');
        if (c) {
          var vals = JSON.parse(out.getAttribute('data-vals') || '[]');
          TB.copy(vals[+c.getAttribute('data-copy')] || '');
        }
      });
      run();
    }
  });

  /* ------------------------------------------------------------ PDF 转图片 */
  async function loadPdfJs() {
    await TB.loadLib('pdf.min.js');
    var lib = window.pdfjsLib;
    if (lib && !lib.__workerSet) {
      lib.GlobalWorkerOptions.workerSrc = 'assets/lib/pdf.worker.min.js';
      lib.__workerSet = true;
    }
    return lib;
  }

  function parsePages(text, max) {
    text = String(text || '').trim();
    if (!text) {
      var all = [];
      for (var i = 1; i <= max; i++) all.push(i);
      return all;
    }
    var seen = {}, out = [];
    text.split(/[,，\s]+/).forEach(function (tok) {
      if (!tok) return;
      var m = tok.match(/^(\d+)-(\d+)$/);
      var a, b;
      if (m) { a = +m[1]; b = +m[2]; }
      else if (/^\d+$/.test(tok)) { a = b = +tok; }
      else throw new Error('页码范围格式不对：' + tok);
      if (a < 1 || b < 1 || a > max || b > max) throw new Error('页码超出 1-' + max);
      if (a > b) { var t = a; a = b; b = t; }
      for (var p = a; p <= b; p++) {
        if (!seen[p]) { seen[p] = 1; out.push(p); }
      }
    });
    if (!out.length) throw new Error('没有选中任何页');
    if (out.length > 200) throw new Error('一次最多转换 200 页');
    return out;
  }

  TB.def({
    slug: 'pdf-to-img', cat: 'office', name: 'PDF 转图片', icon: '🖼️',
    desc: '按页导出 PNG / JPG',
    kw: 'pdf 图片 png jpg 导出 分页 转换 长图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">选择 PDF<span class="hint">只在本机渲染，不上传</span></div>' +
          '<div id="pdPick"></div>' +
          '<div class="row3" style="margin-top:12px">' +
            '<div class="field"><div class="label">格式</div><select class="input" id="pdFmt">' +
              '<option value="png">PNG（无损）</option><option value="jpg">JPG（体积小）</option></select></div>' +
            '<div class="field"><div class="label">清晰度</div><select class="input" id="pdDpi">' +
              '<option value="96">96 DPI（屏幕）</option><option value="144" selected>144 DPI（推荐）</option>' +
              '<option value="192">192 DPI（高清）</option><option value="300">300 DPI（打印）</option></select></div>' +
            '<div class="field"><div class="label">页码范围 <span style="color:var(--ink-3)">留空=全部</span></div>' +
              '<input class="input" id="pdRange" placeholder="如 1-3,5"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="pdRun" disabled>开始转换</button>' +
            '<button class="btn" id="pdZip" disabled>全部下载 ZIP</button>' +
          '</div>' +
          '<div id="pdStatus"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">输出<span class="hint" id="pdCount"></span></div>' +
          '<div class="pdf-grid" id="pdGrid"></div>' +
        '</div>';

      var pick = TB.filePicker(TB.$('#pdPick', root), { accept: 'application/pdf,.pdf', hint: '选择一个 PDF 文件' });
      var runBtn = TB.$('#pdRun', root), zipBtn = TB.$('#pdZip', root);
      var status = TB.$('#pdStatus', root), grid = TB.$('#pdGrid', root), count = TB.$('#pdCount', root);
      var results = [], busy = false;

      function note(text, isErr) {
        status.innerHTML = text ? '<div class="note" style="margin-top:12px"><span class="' +
          (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
      }
      pick.onChange = function () {
        runBtn.disabled = !pick.files.length || busy;
        if (!pick.files.length) zipBtn.disabled = true;
      };

      function clearResults() {
        results.forEach(function (r) { URL.revokeObjectURL(r.url); });
        results = [];
        grid.innerHTML = '';
        count.textContent = '';
        zipBtn.disabled = true;
      }

      function showResults() {
        count.textContent = '共 ' + results.length + ' 页';
        grid.innerHTML = results.map(function (r, i) {
          return '<div class="pdf-card">' +
            '<img src="' + r.url + '" alt="第 ' + r.page + ' 页" loading="lazy">' +
            '<div class="pdf-meta"><b>第 ' + r.page + ' 页</b><span>' + r.w + ' × ' + r.h + '</span></div>' +
            '<button class="btn sm" data-i="' + i + '">下载</button>' +
          '</div>';
        }).join('');
        zipBtn.disabled = false;
      }

      grid.addEventListener('click', function (e) {
        var b = e.target.closest('[data-i]');
        if (!b) return;
        var r = results[+b.getAttribute('data-i')];
        if (r) TB.download(r.blob, r.name);
      });

      async function run() {
        var item = pick.files[0];
        if (!item || busy) return;
        busy = true;
        runBtn.disabled = true;
        clearResults();
        var fmt = TB.$('#pdFmt', root).value;
        var dpi = parseFloat(TB.$('#pdDpi', root).value) || 144;
        var range = TB.$('#pdRange', root).value;
        try {
          note('正在载入 PDF…');
          var lib = await loadPdfJs();
          var buf = await TB.readArrayBuffer(item.file);
          var pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
          var pages = parsePages(range, pdf.numPages);
          var ext = fmt === 'png' ? 'png' : 'jpg';
          var mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
          var base = item.file.name.replace(/\.pdf$/i, '');

          for (var k = 0; k < pages.length; k++) {
            if (!alive(root)) { pdf.destroy(); return; }
            note('正在渲染第 ' + (k + 1) + '/' + pages.length + ' 页…');
            var page = await pdf.getPage(pages[k]);
            var scale = dpi / 72;
            var vp = page.getViewport({ scale: scale });
            var px = vp.width * vp.height;
            if (px > 20e6) {
              var f = Math.sqrt(20e6 / px);
              vp = page.getViewport({ scale: scale * f });
            }
            var cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(vp.width));
            cv.height = Math.max(1, Math.round(vp.height));
            var c2 = cv.getContext('2d');
            c2.fillStyle = '#fff';
            c2.fillRect(0, 0, cv.width, cv.height);
            await page.render({ canvasContext: c2, viewport: vp }).promise;

            var blob = await new Promise(function (res) {
              cv.toBlob(res, mime, fmt === 'jpg' ? 0.9 : undefined);
            });
            if (!blob) throw new Error('第 ' + pages[k] + ' 页导出失败');
            var url = URL.createObjectURL(blob);
            results.push({
              page: pages[k], w: cv.width, h: cv.height, blob: blob, url: url,
              name: base + '-第' + pages[k] + '页.' + ext
            });
            showResults();
            await new Promise(function (r) { setTimeout(r, 30); });
          }
          pdf.destroy();
          note('完成：' + results.length + ' 页，可单张下载或打包 ZIP。');
        } catch (e) {
          note('转换失败：' + (e && e.message ? e.message : '未知错误'), true);
        }
        busy = false;
        runBtn.disabled = !pick.files.length;
      }

      runBtn.addEventListener('click', run);

      zipBtn.addEventListener('click', async function () {
        if (!results.length) return;
        zipBtn.disabled = true;
        note('正在打包…');
        try {
          await TB.loadLib('jszip.min.js');
          var zip = new JSZip();
          results.forEach(function (r) { zip.file(r.name, r.blob); });
          var blob = await zip.generateAsync({ type: 'blob' });
          TB.download(blob, 'PDF图片.zip');
          note('已打包 ' + results.length + ' 张图片。');
        } catch (e) {
          note('打包失败：' + e.message, true);
        }
        zipBtn.disabled = false;
      });
    }
  });

  /* ------------------------------------------------------------ 键盘键码 */
  function prettyKey(k) {
    var map = {
      ' ': 'Space', 'Enter': 'Enter', 'Escape': 'Esc', 'Backspace': 'Backspace',
      'Tab': 'Tab', 'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
      'Control': 'Ctrl', 'Meta': 'Meta', 'Shift': 'Shift', 'Alt': 'Alt'
    };
    return map[k] || k;
  }

  TB.def({
    slug: 'keycode', cat: 'web', name: '键盘键码', icon: '⌨️',
    desc: '按键 / code / keyCode',
    kw: '键盘 keycode code 键码 按键 事件 调试 keyboard',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">按一个键<span class="hint">先点下面的方框获得焦点</span></div>' +
          '<div class="kc-stage" id="kcStage" tabindex="0">' +
            '<div class="kc-key" id="kcKey">按任意键</div>' +
            '<div class="kc-sub" id="kcSub">点这里，然后按键</div>' +
          '</div>' +
          '<div class="kv" id="kcMeta" style="margin-top:12px"></div>' +
          '<div class="btns"><button class="btn" id="kcCopy">复制 JSON</button>' +
            '<button class="btn" id="kcClear">清空</button></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">最近按键</div>' +
          '<div class="kc-hist" id="kcHist"><span class="hint">还没有记录</span></div>' +
        '</div>' +
        '<div class="note">keyCode / which 是旧属性，部分浏览器对新键返回 0；写新代码优先用 <b>key</b> 和 <b>code</b>。' +
          '只有舞台获得焦点时才会拦截 Tab / 空格 / 方向键，避免影响页面滚动。</div>';

      var stage = TB.$('#kcStage', root), keyEl = TB.$('#kcKey', root), sub = TB.$('#kcSub', root);
      var meta = TB.$('#kcMeta', root), hist = TB.$('#kcHist', root);
      var last = null, history = [];

      var LOC = { 0: '标准键', 1: '左侧', 2: '右侧', 3: '数字小键盘' };

      function render() {
        if (!last) {
          keyEl.textContent = '按任意键';
          sub.textContent = '点这里，然后按键';
          meta.innerHTML = '';
          return;
        }
        keyEl.textContent = prettyKey(last.key);
        sub.textContent = last.repeat ? '按住重复中…' : '已捕获 · 再按一个键试试';
        var rows = [
          ['event.key', last.key === ' ' ? '(空格)' : last.key],
          ['event.code', last.code],
          ['keyCode', last.keyCode],
          ['which', last.which],
          ['location', last.location + ' · ' + (LOC[last.location] || '未知')],
          ['修饰键', last.mods.length ? last.mods.join(' + ') : '无'],
          ['repeat', last.repeat ? 'true' : 'false'],
          ['isComposing', last.composing ? 'true' : 'false']
        ];
        meta.innerHTML = rows.map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div>' +
            '<div class="kv-v mono">' + TB.esc(String(r[1])) + '</div></div>';
        }).join('');
      }

      function addHistory(item) {
        history.unshift(item);
        if (history.length > 10) history.pop();
        hist.innerHTML = history.map(function (h) {
          return '<span class="kc-chip"><b>' + TB.esc(prettyKey(h.key)) + '</b>' +
            '<i>' + TB.esc(h.code) + '</i></span>';
        }).join('');
      }

      function onKey(e) {
        if (!alive(root)) return;
        var mods = [];
        if (e.ctrlKey) mods.push('Ctrl');
        if (e.altKey) mods.push('Alt');
        if (e.shiftKey) mods.push('Shift');
        if (e.metaKey) mods.push('Meta');
        last = {
          key: e.key, code: e.code, keyCode: e.keyCode, which: e.which, location: e.location,
          repeat: e.repeat, composing: e.isComposing, mods: mods
        };
        render();
        addHistory(last);

        var focused = document.activeElement === stage;
        if (focused && !e.ctrlKey && !e.metaKey && !e.altKey &&
            ['Tab', ' ', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
              'PageUp', 'PageDown', 'Home', 'End'].indexOf(e.key) >= 0) {
          e.preventDefault();
        }
      }

      stage.addEventListener('pointerdown', function () { stage.focus(); });
      stage.addEventListener('focus', function () { stage.classList.add('on'); });
      stage.addEventListener('blur', function () { stage.classList.remove('on'); });
      document.addEventListener('keydown', onKey);

      TB.$('#kcCopy', root).addEventListener('click', function () {
        if (!last) { TB.toast('先按一个键'); return; }
        TB.copy(JSON.stringify({
          key: last.key, code: last.code, keyCode: last.keyCode, which: last.which,
          location: last.location, repeat: last.repeat, ctrl: last.mods.indexOf('Ctrl') >= 0,
          alt: last.mods.indexOf('Alt') >= 0, shift: last.mods.indexOf('Shift') >= 0,
          meta: last.mods.indexOf('Meta') >= 0
        }, null, 2));
      });

      TB.$('#kcClear', root).addEventListener('click', function () {
        last = null;
        history = [];
        hist.innerHTML = '<span class="hint">还没有记录</span>';
        render();
      });
    }
  });

  /* ------------------------------------------------------------ 摩斯密码 */
  var MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
    5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
    '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---..',
    ';': '---...', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
    '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
  };
  var MORSE_REV = {};
  Object.keys(MORSE).forEach(function (k) { MORSE_REV[MORSE[k]] = k; });

  function morseEncode(text) {
    var ignored = 0;
    var out = text.toUpperCase().split(/\s+/).map(function (word) {
      return Array.from(word).map(function (ch) {
        if (MORSE[ch]) return MORSE[ch];
        ignored++;
        return '';
      }).filter(Boolean).join(' ');
    }).filter(Boolean).join(' / ');
    return { text: out, ignored: ignored };
  }

  function morseDecode(code) {
    var bad = 0;
    return String(code).trim().replace(/\s+\/\s+/g, ' / ').split('/').map(function (word) {
      return word.trim().split(/\s+/).map(function (sym) {
        if (!sym) return '';
        if (MORSE_REV[sym]) return MORSE_REV[sym];
        bad++;
        return '';
      }).join('');
    }).join(' ').trim() + (bad ? '\n\n（有 ' + bad + ' 组点划无法识别，已跳过）' : '');
  }

  TB.def({
    slug: 'morse', cat: 'fun', name: '摩斯密码', icon: '📡',
    desc: '英文 / 数字 ↔ 点划',
    kw: '摩斯 密码 morse 电报 点划 编码 解码 音频',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label">方向</div><select class="input" id="moMode">' +
              '<option value="en">文字 → 摩斯</option><option value="de">摩斯 → 文字</option></select></div>' +
            '<div class="field"><div class="label">常用短语</div><div class="btns" style="margin:0">' +
              '<button class="btn sm" data-mo="SOS">SOS</button>' +
              '<button class="btn sm" data-mo="HELLO WORLD">HELLO WORLD</button>' +
            '</div></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b id="moLabel">文字</b></div>' +
            '<textarea class="textarea mono" id="moSrc" style="min-height:130px" placeholder="输入英文、数字或常用标点">SOS</textarea></div>' +
          '<div class="btns"><button class="btn primary" id="moRun">转换</button>' +
            '<button class="btn" id="moPlay">播放音频</button>' +
            '<button class="btn" id="moStop" disabled>停止</button>' +
            '<button class="btn" id="moClear">清空</button></div>' +
          '<div class="note" id="moTip"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">结果</div>' +
          '<div class="mo-out mono" id="moOut">... --- ...</div>' +
          '<div class="btns"><button class="btn" id="moCopy">复制结果</button></div>' +
        '</div>' +
        '<div class="note">标准摩斯只覆盖英文 26 个字母、数字和常用标点，中文需要另外的电报码，本站不做中文编码。' +
          '点划之间 1 个单位、字母之间 3 个、单词之间 7 个，音频按这个节奏播放。</div>';

      var mode = TB.$('#moMode', root), src = TB.$('#moSrc', root), out = TB.$('#moOut', root);
      var label = TB.$('#moLabel', root), tip = TB.$('#moTip', root);
      var playBtn = TB.$('#moPlay', root), stopBtn = TB.$('#moStop', root);
      var audio = null, stopTimer = 0;

      function setMode() {
        if (mode.value === 'en') {
          label.textContent = '文字';
          src.placeholder = '输入英文、数字或常用标点';
          out.textContent = '... --- ...';
        } else {
          label.textContent = '摩斯电码';
          src.placeholder = '用空格分字母、/ 分单词，例如 ... --- ...';
          out.textContent = 'SOS';
        }
        tip.textContent = '';
      }

      function convert() {
        var v = src.value;
        if (mode.value === 'en') {
          var r = morseEncode(v);
          out.textContent = r.text || '（没有可编码的字符）';
          tip.textContent = r.ignored ? '已忽略 ' + r.ignored + ' 个不支持的字符（仅英文、数字、常用标点）。' : '';
          if (!r.text) tip.textContent = '没有可编码的字符，请改用英文、数字或常用标点。';
        } else {
          out.textContent = morseDecode(v) || '（没有可解码的内容）';
          tip.textContent = '';
        }
        return out.textContent;
      }

      function stopAudio() {
        if (stopTimer) { clearTimeout(stopTimer); stopTimer = 0; }
        if (audio) {
          try { audio.close(); } catch (e) { /* 已关闭 */ }
          audio = null;
        }
        playBtn.textContent = '播放音频';
        stopBtn.disabled = true;
      }

      function play() {
        var code = mode.value === 'en' ? convert() : src.value;
        if (!code || !/[.-]/.test(code)) { TB.toast('没有可播放的点划'); return; }
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { TB.toast('当前浏览器不支持音频播放'); return; }
        stopAudio();
        try {
          audio = new AC();
          var t = audio.currentTime + 0.06;
          var dot = 0.12, dash = 0.36, intra = 0.12, letter = 0.36, word = 0.84;
          code.replace(/[^.\-/\s]/g, '').split(' / ').forEach(function (w) {
            w.trim().split(/\s+/).forEach(function (sym) {
              if (!sym) return;
              for (var i = 0; i < sym.length; i++) {
                var dur = sym.charAt(i) === '.' ? dot : dash;
                var osc = audio.createOscillator(), gain = audio.createGain();
                osc.type = 'sine';
                osc.frequency.value = 620;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(0.22, t + 0.012);
                gain.gain.setValueAtTime(0.22, t + dur);
                gain.gain.linearRampToValueAtTime(0.0001, t + dur + 0.012);
                osc.connect(gain);
                gain.connect(audio.destination);
                osc.start(t);
                osc.stop(t + dur + 0.02);
                t += dur + intra;
              }
              t += letter - intra;
            });
            t += word - letter;
          });
          playBtn.textContent = '重新播放';
          stopBtn.disabled = false;
          var left = (t - audio.currentTime + 0.2) * 1000;
          stopTimer = setTimeout(stopAudio, Math.max(300, left));
        } catch (e) {
          stopAudio();
          TB.toast('播放失败：' + e.message);
        }
      }

      mode.addEventListener('change', function () {
        setMode();
        convert();
      });
      src.addEventListener('input', function () { tip.textContent = ''; });
      TB.$('#moRun', root).addEventListener('click', convert);
      playBtn.addEventListener('click', play);
      stopBtn.addEventListener('click', stopAudio);
      TB.$('#moCopy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#moClear', root).addEventListener('click', function () {
        src.value = '';
        out.textContent = '';
        tip.textContent = '';
      });
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-mo]');
        if (!b) return;
        if (mode.value !== 'en') { mode.value = 'en'; setMode(); }
        src.value = b.getAttribute('data-mo');
        convert();
      });
      setMode();
      convert();
    }
  });
})();
