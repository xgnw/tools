/* =============================================================================
 * 社媒尺寸裁剪
 * -----------------------------------------------------------------------------
 * 把一张图片按常见社交平台比例 / 尺寸裁成封面，支持居中裁切或留白填充。
 * 输出由 Canvas 生成，不压缩原图、不上传。
 * ========================================================================== */
(function () {
  'use strict';

  var SIZES = [
    { id: 'square', label: '1:1 方图 · 1080 × 1080', w: 1080, h: 1080 },
    { id: 'xhs', label: '4:5 小红书 · 1080 × 1350', w: 1080, h: 1350 },
    { id: 'story', label: '9:16 竖屏 · 1080 × 1920', w: 1080, h: 1920 },
    { id: 'cover', label: '16:9 横版封面 · 1600 × 900', w: 1600, h: 900 },
    { id: 'wechat', label: '2.35:1 公众号首图 · 900 × 383', w: 900, h: 383 },
    { id: 'avatar', label: '1:1 头像 · 800 × 800', w: 800, h: 800 }
  ];

  TB.def({
    slug: 'socialcrop',
    cat: 'image',
    name: '社媒尺寸裁剪',
    desc: '把图片裁成方图、小红书、竖屏、封面等常用尺寸，支持居中裁切或留白。',
    icon: '📐',
    kw: '小红书 封面 方图 头像 裁剪 尺寸 比例 公众号 社媒',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">选择图片</div><div id="scDrop"></div></div>' +
        '<div class="panel"><div class="panel-h">输出规格</div>' +
          '<div class="row"><div class="field"><div class="label">目标尺寸</div><select class="select" id="scSize">' +
            SIZES.map(function (s) { return '<option value="' + s.id + '">' + s.label + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><div class="label">填充方式</div><select class="select" id="scFit">' +
            '<option value="cover" selected>居中裁切（铺满）</option><option value="contain">完整显示（留白）</option></select></div></div>' +
          '<div class="row"><div class="field"><div class="label">留白底色</div><input class="input" id="scBg" type="color" value="#f2f3f5" style="height:36px;padding:3px"></div>' +
          '<div class="field"><div class="label">导出格式</div><select class="select" id="scFmt"><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select></div></div>' +
          '<div class="btns"><button class="btn primary" id="scRun" type="button" disabled>生成裁剪图</button><button class="btn" id="scDl" type="button" disabled>下载</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint" id="scMsg">选择图片后显示</span></div><div class="preview" id="scPreview" style="min-height:240px;background:var(--surface-2)"><div style="color:var(--ink-3);font-size:12.5px">还没有图片</div></div></div>' +
        '<p class="note">裁切只影响导出图，原图不会被修改。需要同时导出多个比例时，可以逐个切换尺寸后下载。</p>';

      var picker = TB.filePicker(TB.$('#scDrop', root), { accept: 'image/*', hint: '建议使用清晰的原始图片' });
      var preview = TB.$('#scPreview', root);
      var msg = TB.$('#scMsg', root);
      var runBtn = TB.$('#scRun', root);
      var dlBtn = TB.$('#scDl', root);
      var image = null;
      var result = null;
      var resultName = '社交封面.png';

      function spec() {
        var id = TB.$('#scSize', root).value;
        for (var i = 0; i < SIZES.length; i++) if (SIZES[i].id === id) return SIZES[i];
        return SIZES[0];
      }

      function render() {
        if (!image) return;
        var s = spec();
        var fit = TB.$('#scFit', root).value;
        var bg = TB.$('#scBg', root).value;
        var c = document.createElement('canvas');
        c.width = s.w;
        c.height = s.h;
        var g = c.getContext('2d');
        g.fillStyle = bg;
        g.fillRect(0, 0, c.width, c.height);
        var scale = fit === 'cover' ? Math.max(s.w / image.naturalWidth, s.h / image.naturalHeight)
          : Math.min(s.w / image.naturalWidth, s.h / image.naturalHeight);
        var dw = image.naturalWidth * scale;
        var dh = image.naturalHeight * scale;
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(image, (s.w - dw) / 2, (s.h - dh) / 2, dw, dh);
        result = c;
        resultName = '社媒-' + s.w + 'x' + s.h + (TB.$('#scFmt', root).value === 'image/jpeg' ? '.jpg' : '.png');
        preview.innerHTML = '';
        var pc = document.createElement('canvas');
        var ps = Math.min(1, 720 / Math.max(c.width, c.height));
        pc.width = Math.round(c.width * ps);
        pc.height = Math.round(c.height * ps);
        pc.getContext('2d').drawImage(c, 0, 0, pc.width, pc.height);
        pc.style.maxWidth = '100%';
        pc.style.height = 'auto';
        pc.style.display = 'block';
        preview.appendChild(pc);
        msg.textContent = s.w + ' × ' + s.h + ' · ' + (fit === 'cover' ? '居中裁切' : '完整留白');
        dlBtn.disabled = false;
      }

      picker.onChange = function () {
        var f = picker.files[0];
        if (!f) { image = null; runBtn.disabled = true; dlBtn.disabled = true; return; }
        TB.readImage(f.file).then(function (r) {
          image = r.img;
          URL.revokeObjectURL(r.url);
          runBtn.disabled = false;
          render();
        }).catch(function () { TB.toast('读取图片失败'); });
      };

      runBtn.addEventListener('click', render);
      dlBtn.addEventListener('click', function () {
        if (!result) return;
        var fmt = TB.$('#scFmt', root).value;
        TB.downloadCanvas(result, resultName, fmt, fmt === 'image/jpeg' ? 0.92 : undefined);
      });
      ['scSize', 'scFit', 'scBg', 'scFmt'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('change', function () { if (image) render(); });
      });
    }
  });
})();
