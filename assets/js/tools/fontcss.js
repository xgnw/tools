/* =============================================================================
 * 字体 CSS 样式生成器
 * -----------------------------------------------------------------------------
 * 用滑杆调字体栈、字号、字重、字距、行高和颜色，实时看到中英文排版效果，
 * 并复制一段可直接使用的 CSS。只声明字体栈，不加载远程字体。
 * ========================================================================== */

(function () {
  'use strict';

  var PRESETS = {
    sans: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    serif: '"Songti SC", "SimSun", Georgia, serif',
    kai: '"Kaiti SC", "KaiTi", "STKaiti", serif',
    round: '"Yuanti SC", "YouYuan", "Microsoft YaHei", sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
  };
  var SAMPLE = '简单工具箱 · Typography\n中文排版要看着舒服，英文也要清楚。\nThe quick brown fox jumps over the lazy dog. 0123456789';

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note fc-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function buildCss(st) {
    return '.typo {\n' +
      '  font-family: ' + st.family + ';\n' +
      '  font-size: ' + st.size + 'px;\n' +
      '  font-weight: ' + st.weight + ';\n' +
      '  letter-spacing: ' + st.spacing + 'px;\n' +
      '  line-height: ' + st.lineHeight + ';\n' +
      '  color: ' + st.color + ';\n' +
      '}';
  }

  TB.def({
    slug: 'font-css', cat: 'web', name: '字体 CSS 样式生成器', desc: '中英文字体排版实时预览',
    icon: '🔤', kw: '字体 css typography 字号 字重 字距 行高 排版 预览 font',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">排版参数<span class="hint">实时预览，复制 CSS</span></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>字体栈</b></div><select class="input" id="fcFamily">' +
              '<option value="sans">系统无衬线（黑体）</option><option value="serif">宋体 / 衬线</option>' +
              '<option value="kai">楷体</option><option value="round">圆体</option><option value="mono">等宽字体</option>' +
            '</select></div>' +
            '<div class="field"><div class="label"><b>字重</b></div><select class="input" id="fcWeight">' +
              '<option value="300">300 细</option><option value="400">400 常规</option><option value="500" selected>500 中等</option>' +
              '<option value="600">600 半粗</option><option value="700">700 粗</option><option value="800">800 特粗</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label"><b>字号</b> <span id="fcSizeVal">18</span> px</div>' +
              '<input class="range" id="fcSize" type="range" min="12" max="48" value="18" step="1"></div>' +
            '<div class="field"><div class="label"><b>字距</b> <span id="fcSpacingVal">0</span> px</div>' +
              '<input class="range" id="fcSpacing" type="range" min="-1" max="8" value="0" step="0.5"></div>' +
            '<div class="field"><div class="label"><b>行高</b> <span id="fcLineVal">1.8</span></div>' +
              '<input class="range" id="fcLine" type="range" min="1.2" max="2.4" value="1.8" step="0.1"></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>文字颜色</b></div><input class="input color" id="fcColor" type="color" value="#1f2937"></div>' +
            '<div class="field"><div class="label"><b>预览文字</b></div><textarea class="textarea fc-text" id="fcText" spellcheck="false"></textarea></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="fcCopy" type="button">复制 CSS</button>' +
            '<button class="btn" id="fcReset" type="button">恢复默认</button></div>' +
          '<div id="fcMsg"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">预览<span class="hint">字体是否可用取决于系统</span></div>' +
          '<div class="fc-preview" id="fcPreview"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">CSS<span class="hint">直接复制到样式表</span></div>' +
          '<div class="out"><div class="out-h"><span class="grow">.typo</span>' +
            '<button class="btn sm" id="fcCopy2" type="button">复制</button></div>' +
            '<pre class="out-b fc-css" id="fcCss"></pre></div>' +
          '<div class="note">这里只生成 CSS 字体声明，不加载远程字体文件；不同系统可用的中文字体不同，建议保留完整的后备字体栈。</div>' +
        '</div>';

      var family = TB.$('#fcFamily', root), weight = TB.$('#fcWeight', root);
      var size = TB.$('#fcSize', root), spacing = TB.$('#fcSpacing', root), line = TB.$('#fcLine', root);
      var color = TB.$('#fcColor', root), text = TB.$('#fcText', root);
      var sizeVal = TB.$('#fcSizeVal', root), spacingVal = TB.$('#fcSpacingVal', root), lineVal = TB.$('#fcLineVal', root);
      var preview = TB.$('#fcPreview', root), cssEl = TB.$('#fcCss', root), msg = TB.$('#fcMsg', root);
      var lastCss = '';

      function current() {
        return {
          family: PRESETS[family.value] || PRESETS.sans,
          size: Number(size.value) || 18,
          weight: weight.value,
          spacing: Number(spacing.value) || 0,
          lineHeight: Number(line.value) || 1.8,
          color: color.value
        };
      }

      function update() {
        var st = current();
        sizeVal.textContent = st.size;
        spacingVal.textContent = st.spacing;
        lineVal.textContent = st.lineHeight.toFixed(1);
        preview.style.fontFamily = st.family;
        preview.style.fontSize = st.size + 'px';
        preview.style.fontWeight = st.weight;
        preview.style.letterSpacing = st.spacing + 'px';
        preview.style.lineHeight = String(st.lineHeight);
        preview.style.color = st.color;
        preview.textContent = text.value || '输入预览文字';
        lastCss = buildCss(st);
        cssEl.textContent = lastCss;
        status(msg, '');
      }

      [family, weight, size, spacing, line, color].forEach(function (el) {
        el.addEventListener('input', update);
        el.addEventListener('change', update);
      });
      text.addEventListener('input', update);
      function copyCss() { TB.copy(lastCss); }
      TB.$('#fcCopy', root).addEventListener('click', copyCss);
      TB.$('#fcCopy2', root).addEventListener('click', copyCss);
      TB.$('#fcReset', root).addEventListener('click', function () {
        family.value = 'sans'; weight.value = '500'; size.value = '18';
        spacing.value = '0'; line.value = '1.8'; color.value = '#1f2937'; text.value = SAMPLE;
        update(); status(msg, '已恢复默认设置');
      });

      text.value = SAMPLE;
      update();
    }
  });
})();
