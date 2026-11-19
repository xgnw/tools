/* =============================================================================
 * 配色方案生成器
 * -----------------------------------------------------------------------------
 * 以一个主色为基准，生成单色、类似色、互补色、三角色、分裂互补与明暗色阶。
 * 支持点色块复制 HEX、复制整组和导出 CSS 变量；全部在本地计算。
 * ========================================================================== */
(function () {
  'use strict';

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function hexToRgb(hex) {
    var clean = String(hex || '').replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function h(n) { var s = Math.round(clamp(n, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; }
    return '#' + h(r) + h(g) + h(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > .5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    if (s === 0) {
      var gray = l * 255;
      return { r: gray, g: gray, b: gray };
    }
    function hue(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < .5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return {
      r: hue(p, q, h + 1 / 3) * 255,
      g: hue(p, q, h) * 255,
      b: hue(p, q, h - 1 / 3) * 255
    };
  }

  function hsl(h, s, l) {
    var rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function textColor(hex) {
    var rgb = hexToRgb(hex) || { r: 255, g: 255, b: 255 };
    var y = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return y >= 150 ? '#16233a' : '#ffffff';
  }

  function normalizeHex(text) {
    var rgb = hexToRgb(text);
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : null;
  }

  function buildPalettes(base) {
    var rgb = hexToRgb(base);
    var hslBase = rgbToHsl(rgb.r, rgb.g, rgb.b);
    function color(name, h, s, l) {
      return { name: name, hex: hsl(h, s, l) };
    }
    return [
      {
        key: 'mono', name: '单色系', desc: '固定色相，用饱和度拉开层次',
        colors: [25, 40, 55, 70, 90].map(function (s, i) {
          return color('饱和度 ' + s + '%', hslBase.h, s, hslBase.l);
        })
      },
      {
        key: 'analog', name: '类似色', desc: '色相相邻，整体氛围统一',
        colors: [-40, -20, 0, 20, 40].map(function (d, i) {
          return color(i === 2 ? '主色' : '色相 ' + (d > 0 ? '+' : '') + d + '°', hslBase.h + d, hslBase.s, hslBase.l);
        })
      },
      {
        key: 'comp', name: '互补色', desc: '色相相对，适合主色 + 强调色',
        colors: [
          color('主色', hslBase.h, hslBase.s, hslBase.l),
          color('主色浅', hslBase.h, hslBase.s, clamp(hslBase.l + 18, 20, 92)),
          color('互补色', hslBase.h + 180, hslBase.s, hslBase.l),
          color('互补浅', hslBase.h + 180, hslBase.s, clamp(hslBase.l + 18, 20, 92)),
          color('中性', hslBase.h, Math.min(hslBase.s, 12), 58)
        ]
      },
      {
        key: 'triad', name: '三角配色', desc: '色相均分 120°，色彩更活泼',
        colors: [
          color('主色', hslBase.h, hslBase.s, hslBase.l),
          color('辅色 1', hslBase.h + 120, hslBase.s, hslBase.l),
          color('辅色 2', hslBase.h + 240, hslBase.s, hslBase.l),
          color('辅色 1 浅', hslBase.h + 120, hslBase.s, clamp(hslBase.l + 16, 20, 92)),
          color('辅色 2 浅', hslBase.h + 240, hslBase.s, clamp(hslBase.l + 16, 20, 92))
        ]
      },
      {
        key: 'split', name: '分裂互补', desc: '互补色两侧取色，对比更柔和',
        colors: [
          color('主色', hslBase.h, hslBase.s, hslBase.l),
          color('左辅色', hslBase.h + 150, hslBase.s, hslBase.l),
          color('右辅色', hslBase.h + 210, hslBase.s, hslBase.l),
          color('左辅浅', hslBase.h + 150, hslBase.s, clamp(hslBase.l + 16, 20, 92)),
          color('右辅浅', hslBase.h + 210, hslBase.s, clamp(hslBase.l + 16, 20, 92))
        ]
      },
      {
        key: 'shades', name: '明暗色阶', desc: '同一色相，适合做背景、卡片与文字层级',
        colors: [22, 36, 50, 66, 82].map(function (l) {
          return color('明度 ' + l + '%', hslBase.h, hslBase.s, l);
        })
      }
    ];
  }

  TB.def({
    slug: 'palette',
    cat: 'web',
    name: '配色方案生成器',
    desc: '主色一键生成六组配色，复制 HEX 与 CSS 变量。',
    icon: '🌈',
    kw: '配色 色板 颜色 调色 色相 互补色 三角色 设计师',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">主色</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:0 1 96px"><div class="label">取色</div><input type="color" id="paColor" value="#2b7fff"></div>' +
            '<div class="field" style="flex:1 1 180px"><div class="label">HEX</div><input class="input" id="paHex" value="#2b7fff" spellcheck="false"></div>' +
            '<div class="field" style="flex:0 1 auto"><div class="label">&nbsp;</div><button class="btn" id="paRandom" type="button" style="width:100%">随机主色</button></div>' +
          '</div>' +
          '<div class="hint" id="paMsg" style="margin-top:8px">支持 #RGB 与 #RRGGBB</div></div>' +
        '<div id="paSections"></div>' +
        '<div class="panel"><div class="panel-h">CSS 变量 <span class="hint">可直接粘进 :root</span></div>' +
          '<pre class="codeBox" id="paCss" style="max-height:260px;overflow:auto"></pre>' +
          '<div class="btns"><button class="btn primary" id="paCopyCss" type="button">复制全部 CSS 变量</button>' +
            '<button class="btn" id="paCopyHex" type="button">复制全部 HEX</button></div></div>' +
        '<p class="note">配色基于 HSL 色相旋转与明度调整，适合作为设计起点；正式项目还要结合品牌色、对比度和印刷色域做校验。</p>';

      var colorInput = TB.$('#paColor', root);
      var hexInput = TB.$('#paHex', root);
      var sections = TB.$('#paSections', root);
      var cssBox = TB.$('#paCss', root);
      var msg = TB.$('#paMsg', root);
      var current = [];
      var currentBase = '#2b7fff';

      function copyGroup(palette) {
        TB.copy(palette.colors.map(function (c) { return c.hex; }).join('\n'));
      }

      function render(base) {
        currentBase = base;
        current = buildPalettes(base);
        sections.innerHTML = current.map(function (pal) {
          return '<div class="pa-section"><div class="pa-head"><div><b>' + TB.esc(pal.name) + '</b><span class="pa-desc">' + TB.esc(pal.desc) + '</span></div>' +
            '<button class="btn tiny" type="button" data-pa-copy="' + pal.key + '">复制 HEX</button></div>' +
            '<div class="pa-swatches">' + pal.colors.map(function (c) {
              return '<button class="pa-swatch" type="button" style="background:' + c.hex + ';color:' + textColor(c.hex) + '" data-pa-hex="' + c.hex + '" title="点击复制 ' + c.hex + '">' +
                '<b>' + TB.esc(c.name) + '</b><span>' + c.hex.toUpperCase() + '</span></button>';
            }).join('') + '</div></div>';
        }).join('');

        var lines = [':root {'];
        current.forEach(function (pal) {
          pal.colors.forEach(function (c, i) {
            lines.push('  --' + pal.key + '-' + (i + 1) + ': ' + c.hex + ';');
          });
        });
        lines.push('}');
        cssBox.textContent = lines.join('\n');

        TB.$$('.pa-swatch', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var hex = btn.getAttribute('data-pa-hex');
            TB.copy(hex.toUpperCase());
          });
        });
        TB.$$('[data-pa-copy]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var key = btn.getAttribute('data-pa-copy');
            var pal = current.filter(function (p) { return p.key === key; })[0];
            if (pal) copyGroup(pal);
          });
        });
      }

      function setBase(hex, syncInput) {
        var normalized = normalizeHex(hex);
        if (!normalized) {
          msg.textContent = 'HEX 格式不正确，请使用 #RGB 或 #RRGGBB';
          return;
        }
        msg.textContent = '当前主色 ' + normalized.toUpperCase() + '，点击色块即可复制';
        if (syncInput) hexInput.value = normalized.toUpperCase();
        colorInput.value = normalized;
        render(normalized);
      }

      colorInput.addEventListener('input', function () { setBase(colorInput.value, true); });
      hexInput.addEventListener('input', function () {
        if (normalizeHex(hexInput.value)) setBase(hexInput.value, false);
      });
      hexInput.addEventListener('change', function () { setBase(hexInput.value, true); });
      TB.$('#paRandom', root).addEventListener('click', function () {
        var h = Math.floor(Math.random() * 360);
        var s = 55 + Math.floor(Math.random() * 35);
        var l = 42 + Math.floor(Math.random() * 22);
        setBase(hsl(h, s, l), true);
      });
      TB.$('#paCopyCss', root).addEventListener('click', function () { TB.copy(cssBox.textContent); });
      TB.$('#paCopyHex', root).addEventListener('click', function () {
        TB.copy(current.map(function (p) {
          return p.name + '\n' + p.colors.map(function (c) { return c.hex; }).join('\n');
        }).join('\n\n'));
      });

      setBase('#2b7fff', true);
    }
  });
})();
