/* =============================================================================
 * 拼音转换
 * -----------------------------------------------------------------------------
 * 使用本地 pinyin-pro（MIT）把中文转成带声调 / 数字声调 / 无声调拼音，
 * 支持首字母与分隔符。库文件放在 assets/lib，不依赖 CDN。
 * ========================================================================== */

(function () {
  'use strict';

  TB.def({
    slug: 'pinyin', cat: 'doc', name: '拼音转换', desc: '带声调 / 首字母 / 数字声调', icon: '🈶',
    kw: '拼音 汉字 注音 声调 首字母 转换 pinyin 多音字',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>中文文本</b><span style="color:var(--ink-3)">支持多行，逐行转换</span></div>' +
            '<textarea class="textarea" id="src" style="min-height:150px">简单工具箱，让文档和图片在浏览器里处理。</textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>声调</b></div>' +
              '<select class="select" id="tone">' +
                '<option value="symbol">带声调（jiǎn dān）</option>' +
                '<option value="num">数字声调（jian3 dan1）</option>' +
                '<option value="none">无声调（jian dan）</option>' +
              '</select></div>' +
            '<div class="field"><div class="label"><b>输出形式</b></div>' +
              '<select class="select" id="style">' +
                '<option value="full">完整拼音</option>' +
                '<option value="first">首字母（j d g j x）</option>' +
              '</select></div>' +
            '<div class="field"><div class="label"><b>音节分隔</b></div>' +
              '<select class="select" id="sep">' +
                '<option value=" ">空格</option>' +
                '<option value="">不分隔</option>' +
                '<option value="&#39;">撇号（jiǎn’dān）</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">转换</button>' +
            '<button class="btn" id="copy">复制结果</button>' +
            '<button class="btn" id="dl">下载 TXT</button></div>' +
          '<div id="msg"></div>' +
          '<div class="out" id="outBox" hidden style="margin-top:14px">' +
            '<div class="out-h"><span class="grow">拼音结果</span></div>' +
            '<div class="out-b" id="out"></div>' +
          '</div>' +
        '</div>' +
        '<div class="note">多音字按常用读音处理，人名、地名或古诗词建议转换后手动核对。拼音库为本地 pinyin-pro（MIT），不会把文本发到服务器。</div>';

      var src = TB.$('#src', root), outBox = TB.$('#outBox', root), out = TB.$('#out', root), msg = TB.$('#msg', root);

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      async function run() {
        var text = src.value;
        if (!text.trim()) { showMsg('请输入中文文本'); return; }
        showMsg('');
        try {
          await TB.loadLib('pinyin-pro.min.js');
          if (!window.pinyinPro || typeof window.pinyinPro.pinyin !== 'function') {
            throw new Error('拼音库加载失败');
          }
          var opts = {
            toneType: TB.$('#tone', root).value,
            separator: TB.$('#sep', root).value
          };
          if (TB.$('#style', root).value === 'first') opts.pattern = 'first';
          var result = text.split(/\r?\n/).map(function (line) {
            if (!line) return '';
            return window.pinyinPro.pinyin(line, opts)
              /* pinyin-pro 会把标点当成独立音节，去掉中文标点两边的空格 */
              .replace(/\s*([，。、；：！？）》」』】…—])\s*/g, '$1')
              .replace(/\s*([（《「『【])\s*/g, '$1');
          }).join('\n');
          out.textContent = result;
          outBox.hidden = false;
        } catch (e) {
          outBox.hidden = true;
          showMsg('转换失败：' + e.message);
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#dl', root).addEventListener('click', function () {
        if (!out.textContent) { showMsg('请先转换'); return; }
        TB.downloadText(out.textContent, '拼音结果.txt');
      });
      ['#tone', '#style', '#sep'].forEach(function (sel) { TB.$(sel, root).addEventListener('change', run); });
      run();
    }
  });
})();
