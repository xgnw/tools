/* =============================================================================
 * Favicon 生成器
 * -----------------------------------------------------------------------------
 * 用 Canvas 生成 16~512 的 PNG，并打包成带 PNG 条目的 ICO。
 * 支持文字 / Emoji / 上传图片、三种外形、内边距和透明背景。
 * ========================================================================== */
(function () {
  'use strict';

  var SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512];
  var ICO_SIZES = [16, 32, 48, 64, 128, 256];

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function clipShape(ctx, size, shape) {
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else if (shape === 'rounded') {
      roundRectPath(ctx, 0, 0, size, size, size * 0.22);
      ctx.clip();
    }
  }

  function fillShape(ctx, size, shape, color) {
    ctx.save();
    clipShape(ctx, size, shape);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  function drawCover(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih);
    var sw = w / scale;
    var sh = h / scale;
    var sx = (iw - sw) / 2;
    var sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function makeMaster(opts) {
    var size = 512;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    if (!opts.transparent) fillShape(ctx, size, opts.shape, opts.bg);

    ctx.save();
    clipShape(ctx, size, opts.shape);
    var pad = Math.round(size * Math.min(40, Math.max(0, opts.padding)) / 100);
    if (opts.image) {
      drawCover(ctx, opts.image, pad, pad, size - pad * 2, size - pad * 2);
    } else {
      var text = opts.text || '简';
      var box = size - pad * 2;
      var fontSize = Math.floor(box * 0.78);
      var family = '"Microsoft YaHei", "PingFang SC", "Segoe UI Emoji", Arial, sans-serif';
      ctx.fillStyle = opts.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 自动缩小，长文字也不会冲出图标
      do {
        ctx.font = '700 ' + fontSize + 'px ' + family;
        if (ctx.measureText(text).width <= box * 0.92) break;
        fontSize -= 2;
      } while (fontSize > 8);
      ctx.fillText(text, size / 2, size / 2 + fontSize * 0.02, box * 0.92);
    }
    ctx.restore();
    return canvas;
  }

  function resizeCanvas(master, size) {
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(master, 0, 0, size, size);
    return c;
  }

  function blobOf(canvas, type) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error('Canvas 导出失败'));
      }, type || 'image/png');
    });
  }

  function arrayBufferOf(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsArrayBuffer(blob);
    });
  }

  async function makeIco(master) {
    var parts = [];
    for (var i = 0; i < ICO_SIZES.length; i++) {
      var c = resizeCanvas(master, ICO_SIZES[i]);
      var b = await blobOf(c, 'image/png');
      parts.push({ size: ICO_SIZES[i], buf: await arrayBufferOf(b) });
    }
    var headerSize = 6 + parts.length * 16;
    var total = headerSize + parts.reduce(function (n, p) { return n + p.buf.byteLength; }, 0);
    var out = new Uint8Array(total);
    var view = new DataView(out.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, parts.length, true);

    var offset = headerSize;
    parts.forEach(function (p, idx) {
      var e = 6 + idx * 16;
      view.setUint8(e, p.size >= 256 ? 0 : p.size);
      view.setUint8(e + 1, p.size >= 256 ? 0 : p.size);
      view.setUint8(e + 2, 0);
      view.setUint8(e + 3, 0);
      view.setUint16(e + 4, 1, true);
      view.setUint16(e + 6, 32, true);
      view.setUint32(e + 8, p.buf.byteLength, true);
      view.setUint32(e + 12, offset, true);
      out.set(new Uint8Array(p.buf), offset);
      offset += p.buf.byteLength;
    });
    return new Blob([out], { type: 'image/x-icon' });
  }

  TB.def({
    slug: 'favicon',
    cat: 'image',
    name: 'Favicon 生成器',
    desc: '用文字、Emoji 或图片生成多尺寸网站图标，打包 PNG 与 favicon.ico。',
    icon: '⭐',
    kw: 'favicon ico 网站图标 logo 图标生成',
    render: function (ctx) {
      var root = ctx.root;
      var mode = 'text';
      var sourceImg = null;
      var sourceUrl = null;
      var master = null;
      var lastIco = null;
      var lastPack = null;

      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab on" type="button" data-fav-mode="text" role="tab" aria-selected="true">文字 / Emoji</button>' +
          '<button class="tab" type="button" data-fav-mode="image" role="tab" aria-selected="false">上传图片</button>' +
        '</div>' +
        '<div class="panel">' +
          '<div id="favTextPane">' +
            '<div class="row">' +
              '<div class="field"><label class="label" for="favText"><b>文字或 Emoji</b></label><input id="favText" class="input" value="简" maxlength="4" spellcheck="false"></div>' +
              '<div class="field"><label class="label" for="favFg"><b>文字颜色</b></label><div class="color-pick"><input id="favFg" type="color" value="#ffffff"> <span id="favFgText">#ffffff</span></div></div>' +
            '</div>' +
          '</div>' +
          '<div id="favImagePane" hidden>' +
            '<div id="favPicker"></div>' +
            '<p class="hint-text">图片会按中心正方形裁切，适合头像、Logo 或印章图。</p>' +
          '</div>' +
          '<div class="row" style="margin-top:14px">' +
            '<div class="field"><label class="label" for="favBg"><b>背景颜色</b></label><div class="color-pick"><input id="favBg" type="color" value="#2563eb"> <span id="favBgText">#2563eb</span></div></div>' +
            '<div class="field"><label class="label" for="favShape"><b>外形</b></label><select id="favShape" class="select"><option value="rounded">圆角方形</option><option value="circle">圆形</option><option value="square">正方形</option></select></div>' +
            '<div class="field"><label class="label" for="favPadding"><b>内边距</b> <span id="favPaddingText">8%</span></label><input id="favPadding" type="range" min="0" max="40" value="8" step="1" style="width:100%"></div>' +
          '</div>' +
          '<div class="checks" style="margin-top:10px"><label><input id="favTransparent" type="checkbox"> 透明背景（不填底色）</label></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">预览 <span class="hint">缩略图只用于检查形状，实际文件按标注尺寸导出</span></div>' +
          '<div class="favGrid" id="favGrid"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">导出</div>' +
          '<div class="btns" style="margin-top:0">' +
            '<button id="favPngPack" class="btn primary" type="button">下载 PNG 打包（.zip）</button>' +
            '<button id="favIco" class="btn" type="button">下载 favicon.ico</button>' +
          '</div>' +
          '<p class="hint-text" id="favStatus">PNG 包内含 16~512 常用尺寸、favicon.ico、site.webmanifest。</p>' +
        '</div>' +
        '<p class="note">ICO 使用 PNG 条目封装，现代浏览器可直接识别；如需兼容极老的 IE，建议另用专门工具生成传统 BMP 条目。</p>';

      var els = {
        text: TB.$('#favText', root),
        fg: TB.$('#favFg', root),
        bg: TB.$('#favBg', root),
        shape: TB.$('#favShape', root),
        padding: TB.$('#favPadding', root),
        transparent: TB.$('#favTransparent', root),
        grid: TB.$('#favGrid', root),
        status: TB.$('#favStatus', root),
        fgText: TB.$('#favFgText', root),
        bgText: TB.$('#favBgText', root),
        paddingText: TB.$('#favPaddingText', root)
      };

      var picker = TB.filePicker(TB.$('#favPicker', root), {
        accept: 'image/png,image/jpeg,image/webp,image/svg+xml,image/*',
        hint: '拖入 PNG / JPG / WebP / SVG'
      });
      picker.onChange = function () {
        var item = picker.files[0];
        if (!item) {
          sourceImg = null;
          if (sourceUrl) { URL.revokeObjectURL(sourceUrl); sourceUrl = null; }
          draw();
          return;
        }
        TB.readImage(item.file).then(function (r) {
          if (sourceUrl) URL.revokeObjectURL(sourceUrl);
          sourceImg = r.img;
          sourceUrl = r.url;
          mode = 'image';
          setMode('image');
          draw();
        }).catch(function (e) { TB.toast(e.message); });
      };

      function setMode(next) {
        mode = next;
        TB.$$('.tab', root).forEach(function (tab) {
          var on = tab.getAttribute('data-fav-mode') === mode;
          tab.classList.toggle('on', on);
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        TB.$('#favTextPane', root).hidden = mode !== 'text';
        TB.$('#favImagePane', root).hidden = mode !== 'image';
        draw();
      }

      function options() {
        return {
          text: els.text.value,
          fg: els.fg.value,
          bg: els.bg.value,
          shape: els.shape.value,
          padding: parseInt(els.padding.value, 10) || 0,
          transparent: els.transparent.checked,
          image: mode === 'image' ? sourceImg : null
        };
      }

      function draw() {
        els.fgText.textContent = els.fg.value;
        els.bgText.textContent = els.bg.value;
        els.paddingText.textContent = (parseInt(els.padding.value, 10) || 0) + '%';
        els.bg.disabled = els.transparent.checked;
        master = makeMaster(options());
        lastIco = null;
        lastPack = null;

        els.grid.innerHTML = SIZES.map(function (size) {
          return '<div class="favItem"><div class="favCanvasBox"><canvas width="' + size + '" height="' + size + '" data-size="' + size + '"></canvas></div><span>' + size + ' × ' + size + '</span></div>';
        }).join('');
        TB.$$('canvas[data-size]', els.grid).forEach(function (c) {
          var size = parseInt(c.getAttribute('data-size'), 10);
          var ctx2 = c.getContext('2d');
          ctx2.imageSmoothingEnabled = true;
          ctx2.imageSmoothingQuality = 'high';
          ctx2.drawImage(master, 0, 0, size, size);
        });
        els.status.textContent = '已生成 ' + SIZES.length + ' 个尺寸；PNG 包内含 favicon.ico 与 site.webmanifest。';
      }

      ['input', 'change'].forEach(function (evt) {
        [els.text, els.fg, els.bg, els.shape, els.padding, els.transparent].forEach(function (el) {
          el.addEventListener(evt, draw);
        });
      });

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () { setMode(tab.getAttribute('data-fav-mode')); });
      });

      TB.$('#favIco', root).addEventListener('click', async function () {
        try {
          if (!lastIco) lastIco = await makeIco(master);
          TB.download(lastIco, 'favicon.ico');
          els.status.textContent = '已导出 favicon.ico（16 / 32 / 48 / 64 / 128 / 256）。';
        } catch (e) {
          TB.toast('ICO 生成失败：' + e.message);
        }
      });

      TB.$('#favPngPack', root).addEventListener('click', async function () {
        try {
          var ico = lastIco || await makeIco(master);
          lastIco = ico;
          var entries = [];
          for (var i = 0; i < SIZES.length; i++) {
            var b = await blobOf(resizeCanvas(master, SIZES[i]), 'image/png');
            entries.push({ name: 'favicon-' + SIZES[i] + 'x' + SIZES[i] + '.png', blob: b });
          }
          entries.push({ name: 'favicon.ico', blob: ico });
          entries.push({
            name: 'site.webmanifest',
            data: JSON.stringify({
              name: '简单工具箱',
              short_name: '工具箱',
              icons: [
                { src: 'favicon-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'favicon-512x512.png', sizes: '512x512', type: 'image/png' }
              ],
              theme_color: els.transparent.checked ? '#ffffff' : els.bg.value,
              background_color: els.transparent.checked ? '#ffffff' : els.bg.value,
              display: 'standalone'
            }, null, 2)
          });
          entries.push({
            name: '使用说明.txt',
            data: '把 favicon.ico 放到网站根目录；其余 PNG 按文件名替换 manifest 中的路径。\n由简单工具箱 Favicon 生成器本地生成，文件未上传服务器。'
          });
          await TB.zipDownload(entries, 'favicon-pack.zip');
          els.status.textContent = '已导出 PNG 包（含 favicon.ico 与 site.webmanifest）。';
        } catch (e) {
          TB.toast('打包失败：' + e.message);
        }
      });

      draw();
    }
  });
})();
