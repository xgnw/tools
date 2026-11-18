/* =============================================================================
 * CSS Grid / Flexbox 生成器
 * -----------------------------------------------------------------------------
 * 用滑块和下拉框调整布局参数，实时预览并输出可直接粘贴的 CSS。
 * 不引入外部布局库，预览元素全部由本地 DOM 生成。
 * ========================================================================== */
(function () {
  'use strict';

  var GRID_ALIGN = ['stretch', 'start', 'center', 'end'];
  var FLEX_JUSTIFY = ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'];

  function rangeField(id, label, min, max, value) {
    return '<div class="field"><div class="label">' + label + ' <b id="' + id + 'Val">' + value + '</b></div>' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + value + '">' +
      '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-3)"><span>' + min + '</span><span>' + max + '</span></div></div>';
  }

  function selectField(id, label, options, value) {
    return '<div class="field"><div class="label">' + label + '</div><select class="select" id="' + id + '">' +
      options.map(function (o) {
        var pair = typeof o === 'string' ? [o, o] : o;
        return '<option value="' + pair[0] + '"' + (pair[0] === value ? ' selected' : '') + '>' + pair[1] + '</option>';
      }).join('') + '</select></div>';
  }

  TB.def({
    slug: 'csslayout',
    cat: 'web',
    name: 'CSS Grid / Flexbox 生成器',
    desc: '拖动参数实时预览 Grid 与 Flexbox 布局，并复制生成的 CSS。',
    icon: '🧱',
    kw: 'css grid flexbox 布局 生成器 网格 弹性 前端',
    render: function (ctx) {
      var root = ctx.root;
      var mode = 'grid';

      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab on" type="button" data-mode="grid" role="tab" aria-selected="true">Grid 网格</button>' +
          '<button class="tab" type="button" data-mode="flex" role="tab" aria-selected="false">Flexbox 弹性</button>' +
        '</div>' +
        '<div class="panel" id="clControls">' +
          '<div id="clGrid">' +
            '<div class="row">' +
              rangeField('cgCols', '列数', 1, 6, 3) +
              rangeField('cgRows', '行数', 1, 4, 2) +
              rangeField('cgGap', '间距（px）', 0, 40, 12) +
            '</div>' +
            '<div class="row">' +
              selectField('cgJustify', '水平对齐（justify-items）', GRID_ALIGN, 'stretch') +
              selectField('cgAlign', '垂直对齐（align-items）', GRID_ALIGN, 'stretch') +
            '</div>' +
          '</div>' +
          '<div id="clFlex" hidden>' +
            '<div class="row">' +
              rangeField('cfItems', '子项数量', 2, 10, 5) +
              rangeField('cfGap', '间距（px）', 0, 40, 12) +
            '</div>' +
            '<div class="row">' +
              selectField('cfDir', '方向', [['row', '水平 row'], ['column', '垂直 column']], 'row') +
              selectField('cfWrap', '换行', [['nowrap', '不换行 nowrap'], ['wrap', '换行 wrap']], 'nowrap') +
            '</div>' +
            '<div class="row">' +
              selectField('cfJustify', '主轴对齐', FLEX_JUSTIFY, 'flex-start') +
              selectField('cfAlign', '交叉轴对齐', ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'], 'stretch') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">实时预览 <span class="hint">灰色格子代表子元素</span></div>' +
          '<div class="layoutPreview" id="clPreview"></div>' +
          '<div class="out"><div class="out-h"><span class="grow">生成的 CSS</span>' +
            '<button class="btn sm" id="clCopy" type="button">复制 CSS</button></div>' +
            '<div class="out-b" id="clCode" style="min-height:100px"></div></div>' +
        '</div>' +
        '<p class="note">预览只用于快速比较布局效果；实际页面还需要给子元素设置宽高、内容或媒体查询。</p>';

      var gridBox = TB.$('#clGrid', root);
      var flexBox = TB.$('#clFlex', root);
      var preview = TB.$('#clPreview', root);
      var code = TB.$('#clCode', root);

      function val(id) { return parseInt(TB.$('#' + id, root).value, 10); }
      function pick(id) { return TB.$('#' + id, root).value; }

      function updateVal(id) {
        var out = TB.$('#' + id + 'Val', root);
        if (out) out.textContent = TB.$('#' + id, root).value;
      }

      function renderGrid() {
        var cols = val('cgCols'), rows = val('cgRows'), gap = val('cgGap');
        var justify = pick('cgJustify'), align = pick('cgAlign');
        var css = '.grid-demo {\n' +
          '  display: grid;\n' +
          '  grid-template-columns: repeat(' + cols + ', minmax(0, 1fr));\n' +
          '  grid-template-rows: repeat(' + rows + ', minmax(0, 1fr));\n' +
          '  gap: ' + gap + 'px;\n' +
          '  justify-items: ' + justify + ';\n' +
          '  align-items: ' + align + ';\n' +
          '}';
        preview.className = 'layoutPreview layoutGrid';
        preview.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
        preview.style.gridTemplateRows = 'repeat(' + rows + ', minmax(0, 1fr))';
        preview.style.gap = gap + 'px';
        preview.style.justifyItems = justify;
        preview.style.alignItems = align;
        preview.innerHTML = '';
        var total = cols * rows;
        for (var i = 0; i < total; i++) {
          var cell = document.createElement('div');
          cell.className = 'layoutCell';
          cell.textContent = String(i + 1);
          if (justify !== 'stretch') cell.style.width = '62%';
          preview.appendChild(cell);
        }
        code.textContent = css;
      }

      function renderFlex() {
        var count = val('cfItems'), gap = val('cfGap');
        var dir = pick('cfDir'), wrap = pick('cfWrap');
        var justify = pick('cfJustify'), align = pick('cfAlign');
        var css = '.flex-demo {\n' +
          '  display: flex;\n' +
          '  flex-direction: ' + dir + ';\n' +
          '  flex-wrap: ' + wrap + ';\n' +
          '  justify-content: ' + justify + ';\n' +
          '  align-items: ' + align + ';\n' +
          '  gap: ' + gap + 'px;\n' +
          '}';
        preview.className = 'layoutPreview layoutFlex';
        preview.style.flexDirection = dir;
        preview.style.flexWrap = wrap;
        preview.style.justifyContent = justify;
        preview.style.alignItems = align;
        preview.style.gap = gap + 'px';
        preview.innerHTML = '';
        for (var i = 0; i < count; i++) {
          var item = document.createElement('div');
          item.className = 'layoutCell layoutFlexItem';
          item.textContent = String(i + 1);
          if (dir === 'column') item.style.width = '100%';
          preview.appendChild(item);
        }
        code.textContent = css;
      }

      function render() {
        if (mode === 'grid') renderGrid();
        else renderFlex();
      }

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          mode = tab.getAttribute('data-mode');
          TB.$$('.tab', root).forEach(function (x) {
            x.classList.toggle('on', x === tab);
            x.setAttribute('aria-selected', x === tab ? 'true' : 'false');
          });
          gridBox.hidden = mode !== 'grid';
          flexBox.hidden = mode !== 'flex';
          render();
        });
      });

      TB.$$('input[type=range], select', root).forEach(function (el) {
        el.addEventListener('input', function () {
          if (el.id && el.id.indexOf('c') === 0) updateVal(el.id);
          render();
        });
        el.addEventListener('change', render);
      });

      TB.$('#clCopy', root).addEventListener('click', function () {
        TB.copy(code.textContent);
      });

      render();
    }
  });
})();
