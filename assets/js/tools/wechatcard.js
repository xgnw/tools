/* =============================================================================
   微信名片生成器
   -----------------------------------------------------------------------------
   改造自用户提供的 E:\网站源码 (2)\WWW\wx：
   - 去掉 jQuery / html2canvas / 阿里图标 CDN，改为纯 Canvas 绘制
   - 修掉原页面引用但缺失的 images/kkbk.png 二维码弹图
   - 保留「背景图 + 毛玻璃名片 + 右上角头像 + 昵称 / 微信号 / 状态」版式
   - 新增背景上传、二维码图片上传、4 套预设背景、实时预览、1160×720 导出
   注意：纯本地图片合成，不连接微信，也不代表微信官方。
   ============================================================================= */
(function () {
  'use strict';

  var W = 1160, H = 720;
  var FONT = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif';

  TB.def({
    slug: 'wechat-card', cat: 'image', name: '微信名片生成器', icon: '📇',
    desc: '个人主页卡片，一键导出',
    kw: '微信 名片 个人主页 卡片 头像 背景 图片 生成 wechat profile card',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">名片内容<span class="hint">输入即预览，全部在本机处理</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">昵称</div><input class="input" id="wcName" maxlength="16" value="简单"></div>' +
            '<div class="field"><div class="label">微信号</div><input class="input" id="wcId" maxlength="24" value="wechat_id"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">状态</div><input class="input" id="wcStatus" maxlength="30" value="今天也要开心呀"></div>' +
            '<div class="field"><div class="label">左上角时间</div><input class="input" id="wcTime" maxlength="10" value="05:20 ♡"></div>' +
          '</div>' +
          '<div class="wc-upload-row">' +
            '<div class="wc-upload"><button class="btn" id="wcAvatarBtn">上传头像</button><span id="wcAvatarName">未选择</span><input id="wcAvatarFile" type="file" accept="image/*" hidden></div>' +
            '<div class="wc-upload"><button class="btn" id="wcBgBtn">上传背景</button><span id="wcBgName">未选择</span><input id="wcBgFile" type="file" accept="image/*" hidden></div>' +
            '<div class="wc-upload"><button class="btn" id="wcQrBtn">上传二维码</button><span id="wcQrName">未选择</span><input id="wcQrFile" type="file" accept="image/*" hidden></div>' +
          '</div>' +
          '<div class="note">二维码位置可以放自己的微信二维码，不传就显示装饰图标。图片只在浏览器里合成，不会上传服务器。</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">背景<span class="hint">预设渐变，或上传自己的照片</span></div>' +
          '<div class="wc-bg-grid" id="wcBgGrid">' +
            '<button class="btn sm active" data-bg="dusk">暮色</button>' +
            '<button class="btn sm" data-bg="dawn">晨光</button>' +
            '<button class="btn sm" data-bg="ink">墨夜</button>' +
            '<button class="btn sm" data-bg="mint">薄荷</button>' +
            '<button class="btn sm" id="wcBgClear">用回预设</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">预览<span class="hint">1160 × 720</span></div>' +
          '<div class="wc-stage"><canvas id="wcCv" width="' + W + '" height="' + H + '"></canvas></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="wcDown">下载 PNG</button>' +
            '<button class="btn" id="wcReset">恢复默认</button>' +
          '</div>' +
        '</div>';

      var cv = TB.$('#wcCv', root), c2 = cv.getContext('2d');
      var nameEl = TB.$('#wcName', root), idEl = TB.$('#wcId', root);
      var statusEl = TB.$('#wcStatus', root), timeEl = TB.$('#wcTime', root);
      var avatarImg = null, bgImg = null, qrImg = null, preset = 'dusk';

      var DEFAULTS = { name: '简单', id: 'wechat_id', status: '今天也要开心呀', time: '05:20 ♡' };

      /* ---------- 基础绘制工具 ---------- */
      function rr(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        c2.beginPath();
        c2.moveTo(x + r, y);
        c2.lineTo(x + w - r, y);
        c2.quadraticCurveTo(x + w, y, x + w, y + r);
        c2.lineTo(x + w, y + h - r);
        c2.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c2.lineTo(x + r, y + h);
        c2.quadraticCurveTo(x, y + h, x, y + h - r);
        c2.lineTo(x, y + r);
        c2.quadraticCurveTo(x, y, x + r, y);
        c2.closePath();
      }

      function cover(img, x, y, w, h) {
        var sc = Math.max(w / img.width, h / img.height);
        var sw = w / sc, sh = h / sc;
        c2.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
      }

      function fit(text, max, size, weight) {
        var t = String(text || '').trim();
        c2.font = (weight || 600) + ' ' + size + 'px ' + FONT;
        if (c2.measureText(t).width <= max) return t;
        while (t.length > 1 && c2.measureText(t + '…').width > max) t = t.slice(0, -1);
        return t + '…';
      }

      /* ---------- 预设背景 ---------- */
      var stars = [];
      for (var i = 0; i < 70; i++) {
        stars.push({ x: (i * 97 + 13) % W, y: (i * 53 + 17) % 500, r: 0.8 + (i % 3) * 0.55, a: 0.25 + (i % 5) / 12 });
      }

      function tint() {
        var g = c2.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(6,8,16,.32)');
        g.addColorStop(.45, 'rgba(6,8,16,.10)');
        g.addColorStop(1, 'rgba(6,8,16,.48)');
        c2.fillStyle = g;
        c2.fillRect(0, 0, W, H);
        var g2 = c2.createLinearGradient(0, 0, W, 0);
        g2.addColorStop(0, 'rgba(6,8,16,.28)');
        g2.addColorStop(.62, 'rgba(6,8,16,.02)');
        g2.addColorStop(1, 'rgba(6,8,16,.18)');
        c2.fillStyle = g2;
        c2.fillRect(0, 0, W, H);
      }

      function hills(color, y, dip) {
        c2.fillStyle = color;
        c2.beginPath();
        c2.moveTo(0, y);
        c2.quadraticCurveTo(W * .22, y - dip, W * .42, y + 18);
        c2.quadraticCurveTo(W * .68, y - dip * .7, W * .84, y - 8);
        c2.quadraticCurveTo(W * .95, y - 26, W, y + 6);
        c2.lineTo(W, H);
        c2.lineTo(0, H);
        c2.closePath();
        c2.fill();
      }

      function presetBg() {
        if (preset === 'dawn') {
          var d = c2.createLinearGradient(0, 0, 0, H);
          d.addColorStop(0, '#c7e5ff');
          d.addColorStop(.45, '#ffe9d2');
          d.addColorStop(.78, '#ffc9d2');
          d.addColorStop(1, '#f6a6a0');
          c2.fillStyle = d;
          c2.fillRect(0, 0, W, H);
          var sun1 = c2.createRadialGradient(300, 230, 10, 300, 230, 300);
          sun1.addColorStop(0, 'rgba(255,252,235,.95)');
          sun1.addColorStop(.35, 'rgba(255,232,180,.55)');
          sun1.addColorStop(1, 'rgba(255,220,170,0)');
          c2.fillStyle = sun1;
          c2.fillRect(0, 0, W, H);
          hills('rgba(96,122,142,.55)', 540, 64);
          hills('rgba(62,82,100,.45)', 610, 36);
        } else if (preset === 'ink') {
          var k = c2.createLinearGradient(0, 0, 0, H);
          k.addColorStop(0, '#070b16');
          k.addColorStop(.5, '#0e1a2e');
          k.addColorStop(1, '#1b2c44');
          c2.fillStyle = k;
          c2.fillRect(0, 0, W, H);
          stars.forEach(function (s) {
            c2.fillStyle = 'rgba(255,255,255,' + s.a + ')';
            c2.beginPath();
            c2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            c2.fill();
          });
          var moon = c2.createRadialGradient(840, 210, 8, 840, 210, 250);
          moon.addColorStop(0, 'rgba(190,220,255,.65)');
          moon.addColorStop(.28, 'rgba(140,180,255,.18)');
          moon.addColorStop(1, 'rgba(120,160,255,0)');
          c2.fillStyle = moon;
          c2.fillRect(0, 0, W, H);
          c2.fillStyle = 'rgba(225,238,255,.85)';
          c2.beginPath();
          c2.arc(840, 210, 42, 0, Math.PI * 2);
          c2.fill();
          hills('rgba(6,12,24,.82)', 590, 58);
          hills('rgba(3,7,16,.92)', 650, 30);
        } else if (preset === 'mint') {
          var m = c2.createLinearGradient(0, 0, 0, H);
          m.addColorStop(0, '#dcfcef');
          m.addColorStop(.48, '#8ee2cd');
          m.addColorStop(.82, '#2aa896');
          m.addColorStop(1, '#0f766e');
          c2.fillStyle = m;
          c2.fillRect(0, 0, W, H);
          var glow = c2.createRadialGradient(880, 250, 10, 880, 250, 320);
          glow.addColorStop(0, 'rgba(255,255,240,.55)');
          glow.addColorStop(1, 'rgba(255,255,240,0)');
          c2.fillStyle = glow;
          c2.fillRect(0, 0, W, H);
          hills('rgba(16,94,88,.45)', 560, 70);
          hills('rgba(8,70,66,.62)', 630, 38);
        } else {
          var g = c2.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, '#171426');
          g.addColorStop(.4, '#472735');
          g.addColorStop(.72, '#a64b34');
          g.addColorStop(1, '#e0955c');
          c2.fillStyle = g;
          c2.fillRect(0, 0, W, H);
          var sun = c2.createRadialGradient(830, 330, 12, 830, 330, 300);
          sun.addColorStop(0, 'rgba(255,204,136,.78)');
          sun.addColorStop(.32, 'rgba(255,170,100,.30)');
          sun.addColorStop(1, 'rgba(255,150,80,0)');
          c2.fillStyle = sun;
          c2.fillRect(0, 0, W, H);
          hills('rgba(38,20,30,.80)', 560, 74);
          hills('rgba(18,10,17,.92)', 632, 36);
        }
        tint();
      }

      function uploadedBg() {
        cover(bgImg, 0, 0, W, H);
        var g = c2.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(6,8,16,.42)');
        g.addColorStop(.42, 'rgba(6,8,16,.18)');
        g.addColorStop(1, 'rgba(6,8,16,.55)');
        c2.fillStyle = g;
        c2.fillRect(0, 0, W, H);
        var g2 = c2.createLinearGradient(0, 0, W, 0);
        g2.addColorStop(0, 'rgba(6,8,16,.36)');
        g2.addColorStop(.6, 'rgba(6,8,16,.06)');
        g2.addColorStop(1, 'rgba(6,8,16,.22)');
        c2.fillStyle = g2;
        c2.fillRect(0, 0, W, H);
      }

      /* ---------- 状态栏 ---------- */
      function statusBar() {
        c2.textAlign = 'left';
        c2.textBaseline = 'middle';
        c2.fillStyle = 'rgba(255,255,255,.92)';
        c2.font = '600 30px ' + FONT;
        c2.fillText((timeEl.value || DEFAULTS.time).slice(0, 10), 58, 66);

        /* 信号 */
        c2.fillStyle = 'rgba(255,255,255,.82)';
        for (var i = 0; i < 4; i++) {
          c2.fillRect(902 + i * 11, 76 - (7 + i * 5), 7, 7 + i * 5);
        }
        /* Wi-Fi */
        c2.strokeStyle = 'rgba(255,255,255,.82)';
        c2.lineWidth = 3;
        for (var j = 0; j < 3; j++) {
          c2.beginPath();
          c2.arc(964, 76, 8 + j * 8, Math.PI * 1.18, Math.PI * 1.82);
          c2.stroke();
        }
        c2.beginPath();
        c2.arc(964, 76, 4, 0, Math.PI * 2);
        c2.fillStyle = 'rgba(255,255,255,.82)';
        c2.fill();
        /* 电池 */
        c2.strokeStyle = 'rgba(255,255,255,.75)';
        c2.lineWidth = 2;
        rr(1010, 54, 48, 22, 5);
        c2.stroke();
        c2.fillStyle = 'rgba(255,255,255,.85)';
        rr(1015, 59, 34, 12, 3);
        c2.fill();
        c2.fillStyle = 'rgba(255,255,255,.75)';
        rr(1061, 60, 4, 10, 2);
        c2.fill();

        /* 返回箭头与右上菜单 */
        c2.strokeStyle = 'rgba(255,255,255,.9)';
        c2.lineWidth = 3;
        c2.beginPath();
        c2.moveTo(76, 124);
        c2.lineTo(62, 138);
        c2.lineTo(76, 152);
        c2.stroke();
        c2.fillStyle = 'rgba(255,255,255,.9)';
        for (var d = 0; d < 3; d++) {
          c2.beginPath();
          c2.arc(1062 + d * 22, 138, 4.5, 0, Math.PI * 2);
          c2.fill();
        }
      }

      /* ---------- 头像 / 二维码 ---------- */
      function drawAvatar(nm) {
        var ax = 796, ay = 190, av = 220;
        c2.save();
        c2.shadowColor = 'rgba(0,0,0,.45)';
        c2.shadowBlur = 28;
        c2.shadowOffsetY = 12;
        c2.fillStyle = '#fff';
        rr(ax - 7, ay - 7, av + 14, av + 14, 30);
        c2.fill();
        c2.restore();

        c2.save();
        rr(ax, ay, av, av, 24);
        c2.clip();
        if (avatarImg) {
          cover(avatarImg, ax, ay, av, av);
        } else {
          var g = c2.createLinearGradient(ax, ay, ax + av, ay + av);
          g.addColorStop(0, '#6a8dff');
          g.addColorStop(1, '#c06ab3');
          c2.fillStyle = g;
          c2.fillRect(ax, ay, av, av);
          c2.fillStyle = 'rgba(255,255,255,.95)';
          c2.font = '700 92px ' + FONT;
          c2.textAlign = 'center';
          c2.textBaseline = 'middle';
          c2.fillText((nm || '微').slice(0, 1), ax + av / 2, ay + av / 2 + 4);
        }
        c2.restore();
      }

      function drawQr() {
        var qx = 824, qy = 452, qs = 156;
        if (qrImg) {
          c2.fillStyle = '#fff';
          rr(qx, qy, qs, qs, 16);
          c2.fill();
          c2.save();
          c2.beginPath();
          c2.rect(qx + 8, qy + 8, qs - 16, qs - 16);
          c2.clip();
          /* 二维码图必须留白，不裁切；按 contain 缩放 */
          var sc = Math.min((qs - 16) / qrImg.width, (qs - 16) / qrImg.height);
          var dw = qrImg.width * sc, dh = qrImg.height * sc;
          c2.fillStyle = '#fff';
          c2.fillRect(qx + 8, qy + 8, qs - 16, qs - 16);
          c2.drawImage(qrImg, qx + 8 + (qs - 16 - dw) / 2, qy + 8 + (qs - 16 - dh) / 2, dw, dh);
          c2.restore();
          return;
        }
        c2.fillStyle = 'rgba(255,255,255,.13)';
        rr(qx, qy, qs, qs, 16);
        c2.fill();
        c2.strokeStyle = 'rgba(255,255,255,.30)';
        c2.lineWidth = 1.5;
        rr(qx, qy, qs, qs, 16);
        c2.stroke();

        var ix = qx + 43, iy = qy + 43;
        c2.fillStyle = 'rgba(255,255,255,.9)';
        [[0, 0], [44, 0], [0, 44]].forEach(function (p) {
          c2.fillRect(ix + p[0], iy + p[1], 26, 26);
          c2.clearRect(ix + p[0] + 7, iy + p[1] + 7, 12, 12);
        });
        c2.fillRect(ix + 44, iy + 44, 8, 8);
        c2.fillRect(ix + 58, iy + 58, 8, 8);
        c2.fillRect(ix + 44, iy + 58, 8, 8);
      }

      /* ---------- 主绘制 ---------- */
      function draw() {
        c2.save();
        c2.clearRect(0, 0, W, H);
        c2.textAlign = 'left';
        c2.textBaseline = 'alphabetic';

        if (bgImg) uploadedBg(); else presetBg();
        statusBar();
        c2.textAlign = 'left';
        c2.textBaseline = 'alphabetic';

        var cx = 72, cy = 238, cw = 1016, ch = 384, rad = 38;
        c2.save();
        c2.shadowColor = 'rgba(0,0,0,.38)';
        c2.shadowBlur = 46;
        c2.shadowOffsetY = 18;
        var glass = c2.createLinearGradient(cx, cy, cx, cy + ch);
        glass.addColorStop(0, 'rgba(255,255,255,.24)');
        glass.addColorStop(.55, 'rgba(255,255,255,.13)');
        glass.addColorStop(1, 'rgba(255,255,255,.09)');
        c2.fillStyle = glass;
        rr(cx, cy, cw, ch, rad);
        c2.fill();
        c2.restore();

        c2.strokeStyle = 'rgba(255,255,255,.34)';
        c2.lineWidth = 1.5;
        rr(cx, cy, cw, ch, rad);
        c2.stroke();

        /* 顶部高光 */
        var sheen = c2.createLinearGradient(cx, cy, cx, cy + 120);
        sheen.addColorStop(0, 'rgba(255,255,255,.22)');
        sheen.addColorStop(1, 'rgba(255,255,255,0)');
        c2.fillStyle = sheen;
        rr(cx + 2, cy + 2, cw - 4, 116, rad - 2);
        c2.fill();

        var nm = nameEl.value.trim() || DEFAULTS.name;
        var wid = idEl.value.trim() || DEFAULTS.id;
        var st = statusEl.value.trim() || DEFAULTS.status;

        drawAvatar(nm);
        drawQr();

        c2.save();
        c2.shadowColor = 'rgba(0,0,0,.32)';
        c2.shadowBlur = 10;
        c2.shadowOffsetY = 3;
        c2.fillStyle = 'rgba(255,255,255,.97)';
        c2.font = '600 58px ' + FONT;
        c2.fillText(fit(nm, 620, 58, 600), 116, 340);

        c2.fillStyle = 'rgba(255,255,255,.82)';
        c2.font = '400 29px ' + FONT;
        c2.fillText(fit('WeChat ID：' + wid, 610, 29, 400), 116, 400);

        var label = /^[+＋]/.test(st) ? st : '＋ ' + st;
        c2.font = '500 27px ' + FONT;
        var lw = Math.min(560, c2.measureText(label).width + 54);
        c2.fillStyle = 'rgba(255,255,255,.11)';
        rr(116, 452, lw, 54, 27);
        c2.fill();
        c2.strokeStyle = 'rgba(255,255,255,.55)';
        c2.lineWidth = 1.4;
        rr(116, 452, lw, 54, 27);
        c2.stroke();
        c2.fillStyle = 'rgba(255,255,255,.94)';
        c2.font = '500 26px ' + FONT;
        c2.fillText(fit(label, lw - 44, 26, 500), 140, 487);
        c2.restore();

        c2.textAlign = 'center';
        c2.fillStyle = 'rgba(255,255,255,.46)';
        c2.font = '500 19px ' + FONT;
        c2.fillText('本地合成 · 与微信官方无关', W / 2, 686);

        c2.restore();
      }

      /* ---------- 交互 ---------- */
      [nameEl, idEl, statusEl, timeEl].forEach(function (el) {
        el.addEventListener('input', draw);
      });

      function setActive(name) {
        TB.$('#wcBgGrid', root).querySelectorAll('[data-bg]').forEach(function (b) {
          b.classList.toggle('active', !bgImg && b.getAttribute('data-bg') === name);
        });
      }

      TB.$('#wcBgGrid', root).addEventListener('click', function (e) {
        var b = e.target.closest('[data-bg]');
        if (!b) return;
        preset = b.getAttribute('data-bg');
        bgImg = null;
        TB.$('#wcBgName', root).textContent = '未选择';
        setActive(preset);
        draw();
      });

      TB.$('#wcBgClear', root).addEventListener('click', function () {
        bgImg = null;
        TB.$('#wcBgName', root).textContent = '未选择';
        setActive(preset);
        draw();
        TB.toast('已用回预设背景');
      });

      function bindUpload(btnSel, fileSel, nameSel, onLoad) {
        var btn = TB.$(btnSel, root), file = TB.$(fileSel, root), label = TB.$(nameSel, root);
        btn.addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () {
          var f = file.files && file.files[0];
          if (!f) return;
          if (!/^image\//.test(f.type)) { TB.toast('请选择图片文件'); return; }
          var r = new FileReader();
          r.onload = function () {
            var im = new Image();
            im.onload = function () {
              onLoad(im);
              label.textContent = f.name;
              draw();
            };
            im.onerror = function () { TB.toast('图片读取失败，换一张试试'); };
            im.src = r.result;
          };
          r.onerror = function () { TB.toast('图片读取失败'); };
          r.readAsDataURL(f);
          file.value = '';
        });
      }

      bindUpload('#wcAvatarBtn', '#wcAvatarFile', '#wcAvatarName', function (im) { avatarImg = im; });
      bindUpload('#wcBgBtn', '#wcBgFile', '#wcBgName', function (im) {
        bgImg = im;
        setActive('');
      });
      bindUpload('#wcQrBtn', '#wcQrFile', '#wcQrName', function (im) { qrImg = im; });

      TB.$('#wcReset', root).addEventListener('click', function () {
        nameEl.value = DEFAULTS.name;
        idEl.value = DEFAULTS.id;
        statusEl.value = DEFAULTS.status;
        timeEl.value = DEFAULTS.time;
        avatarImg = bgImg = qrImg = null;
        preset = 'dusk';
        ['#wcAvatarName', '#wcBgName', '#wcQrName'].forEach(function (s) {
          TB.$(s, root).textContent = '未选择';
        });
        setActive('dusk');
        draw();
        TB.toast('已恢复默认');
      });

      TB.$('#wcDown', root).addEventListener('click', function () {
        draw();
        var slug = nameEl.value.trim().replace(/[\\/:*?"<>|\s]/g, '') || 'card';
        TB.downloadCanvas(cv, 'wechat-card-' + slug.slice(0, 20) + '.png');
      });

      draw();
    }
  });
})();
