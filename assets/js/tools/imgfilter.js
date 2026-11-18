/* =============================================================================
 * 图片滤镜
 * -----------------------------------------------------------------------------
 * 用 Canvas 2D 的 filter 能力调整亮度、对比度、饱和度、灰度、复古和模糊。
 * 实时预览，导出 PNG / JPG，不上传图片。
 * ========================================================================== */
(function () {
  'use strict';
  var DEFAULTS = { b: 100, c: 100, s: 100, g: 0, sep: 0, blur: 0 };

  function label(id) { return TB.$('#' + id + 'Val'); }

  TB.def({
    slug: 'imgfilter',
    cat: 'image',
    name: '图片滤镜',
    desc: '调整亮度、对比度、饱和度、灰度、复古和模糊，实时预览并导出。',
    icon: '🎛️',
    kw: '滤镜 亮度 对比度 饱和度 灰度 复古 模糊 修图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择图片</div><div id="ifDrop"></div></div>' +
        '<div class="panel"><div class="panel-h">滤镜参数 <span class="hint">拖动滑块实时预览</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">亮度 <b id="ifBVal">100</b>%</div><input type="range" id="ifB" min="20" max="180" value="100"></div>' +
            '<div class="field"><div class="label">对比度 <b id="ifCVal">100</b>%</div><input type="range" id="ifC" min="20" max="180" value="100"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">饱和度 <b id="ifSVal">100</b>%</div><input type="range" id="ifS" min="0" max="200" value="100"></div>' +
            '<div class="field"><div class="label">灰度 <b id="ifGVal">0</b>%</div><input type="range" id="ifG" min="0" max="100" value="0"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">复古 <b id="ifSepVal">0</b>%</div><input type="range" id="ifSep" min="0" max="100" value="0"></div>' +
            '<div class="field"><div class="label">模糊 <b id="ifBlurVal">0</b> px</div><input type="range" id="ifBlur" min="0" max="20" value="0"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="ifApply" type="button" disabled>应用并预览</button>' +
            '<button class="btn" id="ifReset" type="button">恢复默认</button>' +
            '<button class="btn" id="ifDl" type="button" disabled>下载图片</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览</div><div class="preview" id="ifPreview" style="min-height:240px;background:var(--surface-2)"><div style="color:var(--ink-3);font-size:12.5px">选择图片后显示</div></div></div>' +
        '<p class="note">滤镜会直接写入导出的图片像素；原图不受影响。浏览器不支持 Canvas filter 时，预览可能与导出结果略有差异。</p>';

      var picker = TB.filePicker(TB.$('#ifDrop', root), { accept: 'image/*', hint: '一张图片' });
      var preview = TB.$('#ifPreview', root);
      var apply = TB.$('#ifApply', root);
      var dl = TB.$('#ifDl', root);
      var image = null;
      var result = null;

      function value(id) { return parseInt(TB.$('#' + id, root).value, 10); }
      function updateLabels() {
        [['ifB', 'ifBVal'], ['ifC', 'ifCVal'], ['ifS', 'ifSVal'], ['ifG', 'ifGVal'], ['ifSep', 'ifSepVal'], ['ifBlur', 'ifBlurVal']].forEach(function (p) {
          TB.$('#' + p[1], root).textContent = TB.$('#' + p[0], root).value;
        });
      }
      function filterString() {
        return 'brightness(' + value('ifB') + '%) contrast(' + value('ifC') + '%) saturate(' + value('ifS') + '%) grayscale(' + value('ifG') + '%) sepia(' + value('ifSep') + '%) blur(' + value('ifBlur') + 'px)';
      }
      function render() {
        if (!image) return;
        var scale = Math.min(1, 1200 / image.naturalWidth);
        var w = Math.max(1, Math.round(image.naturalWidth * scale));
        var h = Math.max(1, Math.round(image.naturalHeight * scale));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var g = c.getContext('2d');
        g.filter = filterString();
        g.drawImage(image, 0, 0, w, h);
        result = c;
        preview.innerHTML = '';
        var pc = document.createElement('canvas');
        var ps = Math.min(1, 900 / Math.max(w, h));
        pc.width = Math.max(1, Math.round(w * ps));
        pc.height = Math.max(1, Math.round(h * ps));
        pc.getContext('2d').filter = g.filter;
        pc.getContext('2d').drawImage(image, 0, 0, pc.width, pc.height);
        pc.style.maxWidth = '100%';
        pc.style.height = 'auto';
        pc.style.display = 'block';
        preview.appendChild(pc);
        dl.disabled = false;
      }

      picker.onChange = function () {
        var f = picker.files[0];
        if (!f) { image = null; apply.disabled = true; dl.disabled = true; return; }
        TB.readImage(f.file).then(function (r) {
          image = r.img;
          URL.revokeObjectURL(r.url);
          apply.disabled = false;
          updateLabels();
          render();
        }).catch(function () { TB.toast('读取图片失败'); });
      };

      apply.addEventListener('click', render);
      TB.$('#ifReset', root).addEventListener('click', function () {
        TB.$('#ifB', root).value = DEFAULTS.b;
        TB.$('#ifC', root).value = DEFAULTS.c;
        TB.$('#ifS', root).value = DEFAULTS.s;
        TB.$('#ifG', root).value = DEFAULTS.g;
        TB.$('#ifSep', root).value = DEFAULTS.sep;
        TB.$('#ifBlur', root).value = DEFAULTS.blur;
        updateLabels();
        if (image) render();
      });
      dl.addEventListener('click', function () {
        if (result) TB.downloadCanvas(result, '滤镜图片.png', 'image/png');
      });
      ['ifB', 'ifC', 'ifS', 'ifG', 'ifSep', 'ifBlur'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', function () { updateLabels(); if (image) render(); });
      });
    }
  });
})();
