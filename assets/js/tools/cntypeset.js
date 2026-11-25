/* =============================================================================
 * 中文排版助手
 * -----------------------------------------------------------------------------
 * 面向中文写作的轻量排版：
 *   - 中英文 / 数字之间自动加空格
 *   - 中文语境下的半角标点转全角
 *   - 清理多余空格、空行和行尾空白
 *   - 段首缩进、去缩进、一键排版、字数统计
 *
 * 所有处理都在浏览器本地完成，不上传文本。
 * ========================================================================== */

(function () {
  'use strict';

  var PUNCT = { ',': '，', ';': '；', ':': '：', '?': '？', '!': '！' };

  function normalizeNewlines(s) {
    return String(s || '').replace(/\r\n?/g, '\n');
  }

  function trimTrailing(s) {
    return s.split('\n').map(function (line) { return line.replace(/[ \t]+$/, ''); }).join('\n');
  }

  function collapseSpaces(s) {
    return s.split('\n').map(function (line) {
      return line
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/[ \t]+([，。！？；：、）》」』])/g, '$1')
        .replace(/([（《「『])[ \t]+/g, '$1');
    }).join('\n');
  }

  function addCjkLatinSpaces(s) {
    return s
      .replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, '$1 $2')
      .replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, '$1 $2');
  }

  function fullwidthPunct(s) {
    return s
      .replace(/([\u4e00-\u9fff])([,;:?!])/g, function (m, cn, p) { return cn + PUNCT[p]; })
      .replace(/([,;:?!])([\u4e00-\u9fff])/g, function (m, p, cn) { return PUNCT[p] + cn; });
  }

  function oneClick(s) {
    s = normalizeNewlines(s);
    s = trimTrailing(s);
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.replace(/\n+$/, '');
    s = collapseSpaces(s);
    s = addCjkLatinSpaces(s);
    s = fullwidthPunct(s);
    s = collapseSpaces(s);
    return s;
  }

  function indent(s) {
    return s.split('\n').map(function (line) {
      if (!line.trim()) return line;
      return /^\u3000\u3000/.test(line) ? line : '　　' + line;
    }).join('\n');
  }

  function deindent(s) {
    return s.split('\n').map(function (line) {
      return line.replace(/^[\u3000 \t]+/, '');
    }).join('\n');
  }

  function stats(text) {
    var chars = Array.from(text).length;
    var cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var en = (text.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || []).length;
    var lines = text ? text.split('\n').length : 0;
    var paras = text.trim() ? text.trim().split(/\n[\s\u3000]*\n/).filter(function (x) { return x.trim(); }).length : 0;
    return [['字符', chars], ['汉字', cn], ['英文词', en], ['行数', lines], ['段落', paras]];
  }

  TB.def({
    slug: 'cn-typeset', cat: 'doc', name: '中文排版助手', icon: '✍️',
    desc: '中英文空格、标点、缩进、统计',
    kw: '中文 排版 写作 空格 标点 全角 半角 缩进 字数 统计 段落 格式',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="ct-actions">' +
            '<button class="btn primary" type="button" data-ct="one">一键排版</button>' +
            '<button class="btn" type="button" data-ct="space">中英文加空格</button>' +
            '<button class="btn" type="button" data-ct="punct">标点全角化</button>' +
            '<button class="btn" type="button" data-ct="clean">清理多余空格</button>' +
            '<button class="btn" type="button" data-ct="indent">段首缩进</button>' +
            '<button class="btn" type="button" data-ct="deindent">去段首缩进</button>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>原文</b><span class="hint">粘贴需要排版的文本</span></div>' +
              '<textarea class="textarea" id="ctIn" style="min-height:210px" placeholder="例如：使用HTML5和CSS3制作响应式页面,让中文和English混排更整齐。"></textarea>' +
              '<div class="ct-stat" id="ctInStat"></div></div>' +
            '<div class="field"><div class="label"><b>结果</b><span class="hint">可以直接修改</span></div>' +
              '<textarea class="textarea" id="ctOut" style="min-height:210px" placeholder="点击上方按钮，结果会出现在这里"></textarea>' +
              '<div class="ct-stat" id="ctOutStat"></div></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn" type="button" id="ctCopy">复制结果</button>' +
            '<button class="btn" type="button" id="ctApply">结果 → 原文</button>' +
            '<button class="btn" type="button" id="ctClear">清空</button>' +
          '</div>' +
          '<div id="ctMsg"></div>' +
          '<div class="note">一键排版会保留段落和手动换行，只处理行尾空白、连续空行、中英文间距和中文语境下的 , ; : ? ! 标点。代码、URL、小数点和英文正文不会被强行改写。</div>' +
        '</div>';

      var input = TB.$('#ctIn', root);
      var output = TB.$('#ctOut', root);
      var msgEl = TB.$('#ctMsg', root);

      function renderStat(el, text) {
        el.innerHTML = stats(text).map(function (x) {
          return '<span><b>' + x[0] + '</b> ' + x[1] + '</span>';
        }).join('');
      }

      function refresh() {
        renderStat(TB.$('#ctInStat', root), input.value);
        renderStat(TB.$('#ctOutStat', root), output.value);
      }

      function setOut(text, note) {
        output.value = text;
        refresh();
        msgEl.innerHTML = note
          ? '<div class="note" style="margin-top:12px">' + TB.esc(note) + '</div>'
          : '';
      }

      input.addEventListener('input', refresh);
      output.addEventListener('input', refresh);

      root.addEventListener('click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-ct');
        if (!act) return;
        var src = input.value;
        if (!src.trim()) { msgEl.innerHTML = '<div class="note" style="margin-top:12px"><span class="result-err">请先填写原文。</span></div>'; return; }
        var out;
        switch (act) {
          case 'one': out = oneClick(src); setOut(out, '已一键排版。'); break;
          case 'space': out = collapseSpaces(addCjkLatinSpaces(src)); setOut(out, '已在中文与英文 / 数字之间加空格。'); break;
          case 'punct': out = fullwidthPunct(src); setOut(out, '已把中文语境下的半角标点转为全角。'); break;
          case 'clean': out = collapseSpaces(trimTrailing(normalizeNewlines(src))); setOut(out, '已清理连续空格和行尾空白。'); break;
          case 'indent': out = indent(normalizeNewlines(src)); setOut(out, '已为每个非空段落加两个全角空格缩进。'); break;
          case 'deindent': out = deindent(normalizeNewlines(src)); setOut(out, '已移除行首缩进。'); break;
        }
      });

      TB.$('#ctCopy', root).addEventListener('click', function () {
        if (!output.value) { TB.toast('还没有结果'); return; }
        TB.copy(output.value);
      });

      TB.$('#ctApply', root).addEventListener('click', function () {
        if (!output.value) { TB.toast('还没有结果'); return; }
        input.value = output.value;
        refresh();
        msgEl.innerHTML = '';
      });

      TB.$('#ctClear', root).addEventListener('click', function () {
        input.value = '';
        output.value = '';
        msgEl.innerHTML = '';
        refresh();
      });

      refresh();
    }
  });
})();
