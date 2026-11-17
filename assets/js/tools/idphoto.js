/* =============================================================================
 * 证件照尺寸修改
 * -----------------------------------------------------------------------------
 * 按标准证件照比例做居中 / 偏上 / 偏下裁剪，输出指定 DPI 的 JPG。
 * 只做裁剪与缩放，不抠图、不换背景，避免对“换底色”做无法保证的承诺。
 * ========================================================================== */

(function () {
  'use strict';

  var SIZES = {
    '1寸': { w: 25, h: 35, label: '一寸 25×35mm' },
    '2寸': { w: 35, h: 49, label: '二寸 35×49mm' },
    '小1寸': { w: 22, h: 32, label: '小一寸 22×32mm' },
    '大1寸': { w: 33, h: 48, label: '大一寸 33×48mm' },
    '小2寸': { w: 35, h: 45, label: '小二寸 35×45mm' },
    '大2寸': { w: 35, h: 53, label: '大二寸 35×53mm' },
    '护照': { w: 33, h: 48, label: '护照 33×48mm' }
  };

  function px(mm, dpi) {
    return Math.round(mm / 25.4 * dpi);
  }

  TB.def({
    slug: 'id-photo', cat: 'image', name: '证件照尺寸修改', desc: '一寸 / 二寸 · 标准比例裁剪', icon: '🪪',
    kw: '证件照 一寸 二寸 护照 尺寸 裁剪 证件照制作 300dpi 头像',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>选择照片</b><span style="color:var(--ink-3)">建议正面、纯色背景</span></div>' +
            '<div id="drop"></div></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>证件规格</b></div>' +
              '<select class="select" id="size">' +
                Object.keys(SIZES).map(function (k) {
                  return '<option value="' + k + '">' + SIZES[k].label + '</option>';
                }).join('') +
                '<option value="custom">自定义尺寸（mm）</option>' +
              '</select></div>' +
            '<div class="field"><div class="label"><b>输出分辨率</b></div>' +
              '<select class="select" id="dpi">' +
                '<option value="300">300 DPI（常用打印）</option>' +
                '<option value="350">350 DPI（部分照相馆）</option>' +
                '<option value="600">600 DPI（高精度）</option>' +
              '</select></div>' +
            '<div class="field"><div class="label"><b>裁剪位置</b></div>' +
              '<select class="select" id="focus">' +
                '<option value="0.5">居中（默认）</option>' +
                '<option value="0.34">偏上（头部留白少）</option>' +
                '<option value="0.66">偏下（头部留白多）</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="row" id="customRow" hidden>' +
            '<div class="field"><div class="label">宽度（mm）</div><input class="input" id="cw" type="number" min="10" max="120" value="25"></div>' +
            '<div class="field"><div class="label">高度（mm）</div><input class="input" id="ch" type="number" min="10" max="160" value="35"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run" disabled>生成证件照</button>' +
            '<button class="btn" id="dl" disabled>下载 JPG</button></div>' +
          '<div id="msg"></div>' +
          '<div class="preview" id="preview" hidden style="margin-top:14px;min-height:0;padding:10px">' +
            '<canvas id="pv"></canvas>' +
          '</div>' +
          '<div id="meta" hidden style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">只按证件照比例裁剪和缩放，不自动抠图、不换底色。拍摄时用纯色背景，头顶留少量空间，效果更接近照相馆。</div>';

      var picker = TB.filePicker(TB.$('#drop', root), { accept: 'image/*', hint: '上传一张正面照片' });
      var run = TB.$('#run', root), dl = TB.$('#dl', root);
      var preview = TB.$('#preview', root), pv = TB.$('#pv', root);
      var meta = TB.$('#meta', root), msg = TB.$('#msg', root);
      var img = null, out = null;

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function invalid(text) {
        out = null;
        dl.disabled = true;
        preview.hidden = true;
        meta.hidden = true;
        showMsg(text);
      }

      function targetSize() {
        var key = TB.$('#size', root).value;
        var dpi = parseInt(TB.$('#dpi', root).value, 10) || 300;
        var spec;
        if (key === 'custom') {
          var w = parseFloat(TB.$('#cw', root).value);
          var h = parseFloat(TB.$('#ch', root).value);
          if (!(w > 0 && h > 0)) throw new Error('请填写有效的自定义宽高');
          spec = { w: w, h: h };
        } else {
          spec = SIZES[key];
        }
        return { w: px(spec.w, dpi), h: px(spec.h, dpi), mmW: spec.w, mmH: spec.h, dpi: dpi };
      }

      function make() {
        if (!img) return;
        var t;
        try { t = targetSize(); } catch (e) { invalid(e.message); return; }
        if (t.w > 4000 || t.h > 4000) { invalid('输出尺寸过大，请降低 DPI 或自定义尺寸'); return; }

        var iw = img.naturalWidth, ih = img.naturalHeight;
        var ratio = t.w / t.h;
        var cw, ch;
        if (iw / ih > ratio) { ch = ih; cw = ch * ratio; }
        else { cw = iw; ch = cw / ratio; }
        var cx = (iw - cw) / 2;
        var cy = (ih - ch) * (parseFloat(TB.$('#focus', root).value) || 0.5);

        var c = document.createElement('canvas');
        c.width = t.w; c.height = t.h;
        var g = c.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, cx, cy, cw, ch, 0, 0, t.w, t.h);
        out = c;

        /* 预览按最长边 380 缩放 */
        var scale = Math.min(1, 380 / Math.max(t.w, t.h));
        pv.width = Math.round(t.w * scale);
        pv.height = Math.round(t.h * scale);
        var pg = pv.getContext('2d');
        pg.clearRect(0, 0, pv.width, pv.height);
        pg.drawImage(c, 0, 0, pv.width, pv.height);
        preview.hidden = false;
        dl.disabled = false;

        meta.hidden = false;
        meta.innerHTML = '<div class="kv">' +
          '<div class="kv-item"><div class="kv-k">输出尺寸</div><div class="kv-v">' + t.w + ' × ' + t.h + ' px</div></div>' +
          '<div class="kv-item"><div class="kv-k">物理尺寸</div><div class="kv-v">' + t.mmW + ' × ' + t.mmH + ' mm</div></div>' +
          '<div class="kv-item"><div class="kv-k">分辨率</div><div class="kv-v">' + t.dpi + ' DPI</div></div>' +
          '<div class="kv-item"><div class="kv-k">原图</div><div class="kv-v">' + iw + ' × ' + ih + ' px</div></div>' +
          '</div>';
        showMsg('');
      }

      picker.onChange = async function () {
        if (!picker.files.length) { img = null; run.disabled = true; return; }
        showMsg('');
        try {
          var r = await TB.readImage(picker.files[0].file);
          img = r.img;
          run.disabled = false;
          make();
        } catch (e) {
          img = null; run.disabled = true;
          showMsg('图片读取失败：' + e.message);
        }
      };

      TB.$('#size', root).addEventListener('change', function () {
        TB.$('#customRow', root).hidden = this.value !== 'custom';
        make();
      });
      ['#dpi', '#focus', '#cw', '#ch'].forEach(function (sel) {
        TB.$(sel, root).addEventListener('change', make);
      });
      run.addEventListener('click', make);
      dl.addEventListener('click', function () {
        if (!out) return;
        TB.downloadCanvas(out, '证件照-' + out.width + 'x' + out.height + '.jpg', 'image/jpeg', 0.92);
      });
    }
  });
})();
