/* =============================================================================
 * 圆角生成器
 * -----------------------------------------------------------------------------
 * 分别调整四个角的圆角半径，支持 px / % 单位与四角联动，实时预览并复制
 * border-radius 声明。适合快速试卡片、头像、胶囊按钮的圆角。
 * ========================================================================== */
(function () {
  'use strict';

  var PRESETS = [
    ['卡片 14px', 'px', [14, 14, 14, 14]],
    ['大圆角 24px', 'px', [24, 24, 24, 24]],
    ['胶囊 999px', 'px', [999, 999, 999, 999]],
    ['圆形 50%', '%', [50, 50, 50, 50]],
    ['异形 60/20', '%', [60, 20, 60, 20]]
  ];

  var CORNERS = [
    ['tl', '左上'],
    ['tr', '右上'],
    ['br', '右下'],
    ['bl', '左下']
  ];

  TB.def({
    slug: 'radiusgen',
    cat: 'web',
    name: '圆角生成器',
    desc: '调四个角的圆角半径，实时预览并复制 border-radius。',
    icon: '◠',
    kw: 'border-radius 圆角 css 生成器 卡片 头像 按钮',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">圆角设置</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">预设</div><select class="select" id="rgPreset">' +
              PRESETS.map(function (p) { return '<option value="' + p[0] + '">' + p[0] + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><div class="label">单位</div><select class="select" id="rgUnit"><option value="px">px</option><option value="%">%</option></select></div>' +
          '</div>' +
          '<div class="rg-grid">' +
            CORNERS.map(function (c) {
              return '<div class="field"><div class="label">' + c[1] + '</div><input class="input" type="number" min="0" step="1" id="rg-' + c[0] + '" value="14"></div>';
            }).join('') +
          '</div>' +
          '<label class="rg-check"><input type="checkbox" id="rgLink" checked> 四角联动</label>' +
          '<div class="btns" style="margin-top:12px"><button class="btn primary" id="rgCopy" type="button">复制 CSS</button>' +
            '<button class="btn" id="rgReset" type="button">重置</button></div></div>' +
        '<div class="panel"><div class="panel-h">预览</div>' +
          '<div class="rg-stage"><div class="rg-preview" id="rgPreview"><span>圆角预览</span></div></div></div>' +
        '<div class="panel"><div class="panel-h">CSS 代码</div><pre class="codeBox" id="rgOut"></pre></div>' +
        '<p class="note">四个值依次对应左上、右上、右下、左下。百分比是相对元素宽高计算，宽高不等时会得到椭圆角。</p>';

      var unit = TB.$('#rgUnit', root);
      var link = TB.$('#rgLink', root);
      var preview = TB.$('#rgPreview', root);
      var out = TB.$('#rgOut', root);
      var inputs = {};
      CORNERS.forEach(function (c) { inputs[c[0]] = TB.$('#rg-' + c[0], root); });

      function values() {
        return CORNERS.map(function (c) {
          var n = Number(inputs[c[0]].value);
          if (!isFinite(n) || n < 0) n = 0;
          return n;
        });
      }

      function update() {
        var vals = values();
        var unitText = unit.value;
        var radius = vals.map(function (v) { return v + unitText; }).join(' ');
        preview.style.borderRadius = radius;
        out.textContent = 'border-radius: ' + radius + ';';
      }

      function applyPreset(name) {
        var p = PRESETS.filter(function (x) { return x[0] === name; })[0] || PRESETS[0];
        unit.value = p[1];
        CORNERS.forEach(function (c, i) {
          inputs[c[0]].value = p[2][i];
        });
        update();
      }

      CORNERS.forEach(function (c) {
        inputs[c[0]].addEventListener('input', function () {
          if (link.checked) {
            var v = inputs[c[0]].value;
            CORNERS.forEach(function (other) { inputs[other[0]].value = v; });
          }
          update();
        });
      });
      link.addEventListener('change', function () {
        if (link.checked) {
          var v = inputs.tl.value;
          CORNERS.forEach(function (c) { inputs[c[0]].value = v; });
          update();
        }
      });
      unit.addEventListener('change', function () {
        var max = unit.value === '%' ? 100 : 999;
        CORNERS.forEach(function (c) {
          inputs[c[0]].max = max;
          if (Number(inputs[c[0]].value) > max) inputs[c[0]].value = max;
        });
        update();
      });
      TB.$('#rgPreset', root).addEventListener('change', function (e) { applyPreset(e.target.value); });
      TB.$('#rgCopy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#rgReset', root).addEventListener('click', function () {
        TB.$('#rgPreset', root).value = '卡片 14px';
        applyPreset('卡片 14px');
      });

      applyPreset('卡片 14px');
    }
  });
})();
