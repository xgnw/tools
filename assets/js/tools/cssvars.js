/* =============================================================================
 * CSS 变量生成器
 * -----------------------------------------------------------------------------
 * 调一组常用设计变量（品牌色、背景、文字、圆角、间距），实时预览并生成
 * 可直接粘贴到样式表里的 :root 变量块。所有取值仅在本地浏览器处理。
 * ========================================================================== */
(function () {
  'use strict';

  var COLOR_VARS = [
    ['--brand', '品牌色', '#4f7cff'],
    ['--brand-dark', '品牌深色', '#3558c9'],
    ['--bg', '页面背景', '#f4f6fb'],
    ['--surface', '卡片表面', '#ffffff'],
    ['--text', '正文颜色', '#1f2430'],
    ['--muted', '次要文字', '#6b7280'],
    ['--line', '边框颜色', '#dde3ee']
  ];

  var SIZE_VARS = [
    ['--radius', '圆角', '14px'],
    ['--gap', '间距', '16px']
  ];

  var PRESETS = [
    ['默认蓝', {
      '--brand': '#4f7cff', '--brand-dark': '#3558c9', '--bg': '#f4f6fb',
      '--surface': '#ffffff', '--text': '#1f2430', '--muted': '#6b7280',
      '--line': '#dde3ee', '--radius': '14px', '--gap': '16px'
    }],
    ['薄荷绿', {
      '--brand': '#12a594', '--brand-dark': '#0b7b6e', '--bg': '#f1faf7',
      '--surface': '#ffffff', '--text': '#15332f', '--muted': '#5b7773',
      '--line': '#d3e9e4', '--radius': '18px', '--gap': '18px'
    }],
    ['日落橙', {
      '--brand': '#f06a3c', '--brand-dark': '#c94d24', '--bg': '#fff7f0',
      '--surface': '#ffffff', '--text': '#35231c', '--muted': '#84685c',
      '--line': '#f0dccf', '--radius': '16px', '--gap': '16px'
    }],
    ['暗色', {
      '--brand': '#7aa2ff', '--brand-dark': '#4d78e0', '--bg': '#10131a',
      '--surface': '#191e28', '--text': '#e8ecf5', '--muted': '#9aa6bb',
      '--line': '#2b3343', '--radius': '12px', '--gap': '16px'
    }],
    ['莫兰迪', {
      '--brand': '#9b8ea8', '--brand-dark': '#7a6d87', '--bg': '#f4f2f5',
      '--surface': '#fbfafc', '--text': '#302b36', '--muted': '#77707f',
      '--line': '#e3dfe8', '--radius': '8px', '--gap': '14px'
    }]
  ];

  function readValues(root) {
    var values = {};
    COLOR_VARS.concat(SIZE_VARS).forEach(function (v) {
      var input = TB.$('[data-var="' + v[0] + '"]', root);
      values[v[0]] = input.value || v[2];
    });
    return values;
  }

  function cssText(values) {
    return ':root {\n' +
      Object.keys(values).map(function (k) { return '  ' + k + ': ' + values[k] + ';'; }).join('\n') +
      '\n}';
  }

  function applyPreview(preview, values) {
    Object.keys(values).forEach(function (k) { preview.style.setProperty(k, values[k]); });
  }

  TB.def({
    slug: 'cssvars',
    cat: 'web',
    name: 'CSS 变量生成器',
    desc: '调好颜色、圆角和间距，实时生成 :root 变量块。',
    icon: '🎨',
    kw: 'css 变量 主题 配色 design token :root 生成器 前端',
    render: function (ctx) {
      var root = ctx.root;
      var rows = COLOR_VARS.map(function (v) {
        return '<div class="cv-item"><div class="cv-name">' + TB.esc(v[0]) + '</div><div class="cv-label">' + v[1] +
          '</div><input type="color" data-var="' + v[0] + '" value="' + v[2] + '" aria-label="' + v[1] + '"></div>';
      }).join('') + SIZE_VARS.map(function (v) {
        return '<div class="cv-item"><div class="cv-name">' + TB.esc(v[0]) + '</div><div class="cv-label">' + v[1] +
          '</div><input class="input cv-size" data-var="' + v[0] + '" value="' + v[2] + '" aria-label="' + v[1] + '"></div>';
      }).join('');

      root.innerHTML =
        '<div class="panel"><div class="panel-h">主题预设</div>' +
          '<div class="field"><select class="select" id="cvPreset">' + PRESETS.map(function (p) {
            return '<option value="' + p[0] + '">' + p[0] + '</option>';
          }).join('') + '</select></div>' +
          '<div class="cv-list" id="cvList">' + rows + '</div>' +
          '<div class="btns" style="margin-top:12px"><button class="btn primary" id="cvCopy" type="button">复制 :root 代码</button>' +
            '<button class="btn" id="cvReset" type="button">恢复默认</button></div></div>' +
        '<div class="panel"><div class="panel-h">实时预览</div>' +
          '<div class="cv-preview" id="cvPreview">' +
            '<div class="cv-card"><div class="cv-card-title">卡片标题</div>' +
              '<p>这是一段正文，用来检查背景、文字和边框的对比度。</p>' +
              '<p class="cv-muted">次要说明文字会使用 --muted 变量。</p>' +
              '<button class="cv-button" type="button">品牌按钮</button></div>' +
          '</div></div>' +
        '<div class="panel"><div class="panel-h">生成的代码</div><pre class="codeBox" id="cvOut"></pre></div>' +
        '<p class="note">颜色输入使用 HEX；圆角和间距可直接写 px、rem 或百分比。生成的是 CSS 自定义属性，不包含具体组件样式。</p>';

      var preview = TB.$('#cvPreview', root);
      var out = TB.$('#cvOut', root);
      var preset = TB.$('#cvPreset', root);

      function update() {
        var values = readValues(root);
        applyPreview(preview, values);
        out.textContent = cssText(values);
      }

      function applyPreset(name) {
        var p = PRESETS.filter(function (x) { return x[0] === name; })[0] || PRESETS[0];
        COLOR_VARS.concat(SIZE_VARS).forEach(function (v) {
          var input = TB.$('[data-var="' + v[0] + '"]', root);
          input.value = p[1][v[0]] || v[2];
        });
        update();
      }

      TB.$$('input[data-var]', root).forEach(function (input) {
        input.addEventListener('input', update);
        input.addEventListener('change', update);
      });
      preset.addEventListener('change', function () { applyPreset(preset.value); });
      TB.$('#cvCopy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#cvReset', root).addEventListener('click', function () {
        preset.value = '默认蓝';
        applyPreset('默认蓝');
      });

      applyPreset('默认蓝');
    }
  });
})();
