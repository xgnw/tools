/* =============================================================================
   用户提供的「网站源码」工具包精选
   -----------------------------------------------------------------------------
   来源：E:\网站源码 (2)\tool
     family.html      → 亲戚称谓计算器（本地懒加载 relationship.js，MIT）
     color.html       → 随机色头像（Canvas 纯色头像 / 色卡）
     isMyScreenOk.html→ 屏幕检测（重写为原生 JS，去掉 Vue / Element 依赖）
     no/index.html    → 屏幕常亮（Screen Wake Lock，不再依赖 NoSleep 视频）
   未接入：password.html（与本站「UUID / 密码生成」重复且本站更强）、
           qrcode.html（已有二维码生成 / 美化 / 识别 / 收款码三合一）、
           taiqian/*（与「座位牌生成」重复，且字体有版权风险）。
   ============================================================================= */
(function () {
  'use strict';

  function alive(root) { return !!(root && root.isConnected); }

  /* ==================================================== 1. 亲戚称谓计算器 */
  TB.def({
    slug: 'family-calc', cat: 'fun', name: '亲戚称谓计算器', icon: '👨‍👩‍👧‍👦',
    desc: '爸爸的妈妈的哥哥该叫啥',
    kw: '亲戚 称谓 称呼 关系 计算器 家族 辈分 family relationship',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">关系链<span class="hint" id="fcHint">正在加载称谓库…</span></div>' +
          '<div class="field"><input class="input fc-input" id="fcText" placeholder="例如：爸爸的妈妈" autocomplete="off"></div>' +
          '<div class="fq-grid" id="fcQuick">' +
            [['父', '爸爸'], ['母', '妈妈'], ['夫', '老公'], ['妻', '老婆'],
             ['子', '儿子'], ['女', '女儿'], ['兄', '哥哥'], ['弟', '弟弟'],
             ['姐', '姐姐'], ['妹', '妹妹']].map(function (p) {
              return '<button class="btn sm" data-k="' + p[1] + '">' + p[0] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="fc-opts">' +
            '<div class="checks">' +
              '<label><input type="radio" name="fcSex" value="1" checked> 我是男</label>' +
              '<label><input type="radio" name="fcSex" value="0"> 我是女</label>' +
            '</div>' +
            '<div class="checks">' +
              '<label><input type="radio" name="fcType" value="default" checked> 找称呼</label>' +
              '<label><input type="radio" name="fcType" value="chain"> 找关系</label>' +
            '</div>' +
            '<div class="checks">' +
              '<label><input type="radio" name="fcDir" value="me" checked> 我称呼对方</label>' +
              '<label><input type="radio" name="fcDir" value="them"> 对方称呼我</label>' +
            '</div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="fcGo" disabled>计算</button>' +
            '<button class="btn" id="fcBack">回退</button>' +
            '<button class="btn" id="fcClear">清空</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">计算结果</div>' +
          '<div class="out fc-out"><div class="out-b" id="fcOut">—</div></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">常见关系<span class="hint">点一下直接算</span></div>' +
          '<div class="fc-examples">' +
            '<button class="btn sm" data-ex="爸爸的妈妈">爸爸的妈妈</button>' +
            '<button class="btn sm" data-ex="妈妈的哥哥">妈妈的哥哥</button>' +
            '<button class="btn sm" data-ex="爸爸的姐姐">爸爸的姐姐</button>' +
            '<button class="btn sm" data-ex="老婆的弟弟">老婆的弟弟</button>' +
            '<button class="btn sm" data-ex="妈妈的姐姐的女儿">妈妈的姐姐的女儿</button>' +
            '<button class="btn sm" data-ex="爷爷的哥哥">爷爷的哥哥</button>' +
          '</div>' +
          '<div class="note">称谓库来自开源项目 relationship.js（MIT），支持「老爸 / 爹地 / 老婆 / 媳妇」等口语叫法；南北方称谓差异不做绝对保证。</div>' +
        '</div>';

      var text = TB.$('#fcText', root);
      var out = TB.$('#fcOut', root);
      var hint = TB.$('#fcHint', root);
      var go = TB.$('#fcGo', root);
      var ready = false;

      function sex() {
        var r = TB.$('input[name="fcSex"]:checked', root);
        return r ? parseInt(r.value, 10) : 1;
      }
      function calc() {
        var v = text.value.trim();
        if (!v) { out.textContent = '先输入或点选一段关系'; return; }
        if (!ready || typeof window.relationship !== 'function') {
          out.textContent = '称谓库还没加载好，请稍后再试';
          return;
        }
        var type = TB.$('input[name="fcType"]:checked', root).value;
        var reverse = TB.$('input[name="fcDir"]:checked', root).value === 'them';
        var res = window.relationship({ text: v, sex: sex(), reverse: reverse, type: type });
        if (!res || !res.length) {
          out.textContent = '没算出来，试试换一种叫法（如「父亲的母亲」）';
          return;
        }
        out.textContent = res.join('\n');
      }
      function append(k) {
        var v = text.value.trim();
        text.value = v ? (v + '的' + k) : k;
        text.focus();
      }
      function syncSpouse() {
        /* 和原工具一致：男性不能选「夫」，女性不能选「妻」 */
        var husband = TB.$('[data-k="老公"]', root);
        var wife = TB.$('[data-k="老婆"]', root);
        var male = sex() === 1;
        if (husband) husband.disabled = male;
        if (wife) wife.disabled = !male;
      }

      TB.loadLib('relationship.js').then(function () {        if (!alive(root)) return;
        ready = true;
        go.disabled = false;
        hint.textContent = '可输入「爸爸的妈妈」，也可点下方快捷词';
      }, function () {
        if (!alive(root)) return;
        hint.textContent = '称谓库加载失败，请刷新重试';
      });

      TB.$('#fcQuick', root).addEventListener('click', function (e) {
        var b = e.target.closest('[data-k]');
        if (b) append(b.getAttribute('data-k'));
      });
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ex]');
        if (b) {
          text.value = b.getAttribute('data-ex');
          calc();
        }
      });
      go.addEventListener('click', calc);
      text.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); calc(); }
      });
      TB.$('#fcBack', root).addEventListener('click', function () {
        var v = text.value.trim();
        var i = v.lastIndexOf('的');
        text.value = i >= 0 ? v.slice(0, i) : '';
        out.textContent = '—';
        text.focus();
      });
      TB.$('#fcClear', root).addEventListener('click', function () {
        text.value = '';
        out.textContent = '—';
        text.focus();
      });
      TB.$$('input[name="fcSex"]', root).forEach(function (r) {
        r.addEventListener('change', syncSpouse);
      });
      syncSpouse();
    }
  });

  /* ======================================================== 2. 随机色头像 */
  TB.def({
    slug: 'color-avatar', cat: 'image', name: '随机色头像', icon: '🎨',
    desc: '纯色头像 / 色卡，一键下载',
    kw: '头像 色卡 RGB 颜色 纯色 随机 生成 avatar color',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">颜色<span class="hint">改色值或点「随机颜色」</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">颜色</div><input class="input color" id="caColor" type="color" value="#2b7fff" style="max-width:140px"></div>' +
            '<div class="field"><div class="label">显示文字 <span style="color:var(--ink-3)">留空则显示色值</span></div>' +
              '<input class="input" id="caText" maxlength="12" placeholder="自动显示色值"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="caRand">随机颜色</button>' +
            '<button class="btn" id="caCopy">复制色值</button>' +
            '<button class="btn" id="caDown">下载 PNG</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">预览<span class="hint">1080 × 1080</span></div>' +
          '<div class="ca-stage"><canvas id="caCv" width="1080" height="1080"></canvas></div>' +
        '</div>';

      var cv = TB.$('#caCv', root), ctx2 = cv.getContext('2d');
      var color = TB.$('#caColor', root), label = TB.$('#caText', root);

      function luminance(hex) {
        var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }

      function draw() {
        var hex = color.value.toLowerCase();
        var txt = label.value.trim() || hex.toUpperCase();
        ctx2.fillStyle = hex;
        ctx2.fillRect(0, 0, 1080, 1080);
        ctx2.fillStyle = luminance(hex) > 0.62 ? '#111' : '#fff';
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';
        var fs = 180;
        do {
          ctx2.font = '700 ' + fs + 'px Consolas, "PingFang SC", system-ui, sans-serif';
          if (ctx2.measureText(txt).width <= 900) break;
          fs -= 8;
        } while (fs > 40);
        ctx2.fillText(txt, 540, 540);
      }

      function randomHex() {
        var s = '#';
        for (var i = 0; i < 6; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
        return s;
      }

      color.addEventListener('input', draw);
      label.addEventListener('input', draw);
      TB.$('#caRand', root).addEventListener('click', function () {
        color.value = randomHex();
        label.value = '';
        draw();
        TB.toast('已换一个颜色');
      });
      TB.$('#caCopy', root).addEventListener('click', function () {
        TB.copy(color.value.toUpperCase());
      });
      TB.$('#caDown', root).addEventListener('click', function () {
        draw();
        TB.downloadCanvas(cv, 'color-' + color.value.slice(1) + '.png');
      });

      draw();
    }
  });

  /* ========================================================== 3. 屏幕检测 */
  TB.def({
    slug: 'screen-test', cat: 'web', name: '屏幕检测', icon: '🖥️',
    desc: '坏点 / 亮点 / 纯色 / 渐变',
    kw: '屏幕 检测 坏点 亮点 漏光 纯色 渐变 显示器 测试 screen test',
    render: function (ctx) {
      var root = ctx.root;
      var colors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#808080', '#70a1ff', '#ff6b81'];
      root.innerHTML =
        '<div class="panel no-print">' +
          '<div class="panel-h">检测项<span class="hint">全屏后可用 ← → 或 &lt; &gt; 换色</span></div>' +
          '<div class="btns">' +
            '<button class="btn primary" data-mode="solid" id="stSolid">纯色检测</button>' +
            '<button class="btn" data-mode="grad" id="stGrad">渐变检测</button>' +
            '<button class="btn" id="stFull">全屏检测</button>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">当前颜色</div><input class="input color" id="stColor" type="color" value="#ffffff" style="max-width:140px"></div>' +
            '<div class="field"><div class="label">渐变起点</div><input class="input color" id="stA" type="color" value="#70a1ff" style="max-width:140px"></div>' +
            '<div class="field"><div class="label">渐变终点</div><input class="input color" id="stB" type="color" value="#ff6348" style="max-width:140px"></div>' +
            '<div class="field"><div class="label">角度 <b id="stAngV">120</b>°</div><input class="range" id="stAng" type="range" min="0" max="360" value="120"></div>' +
          '</div>' +
          '<div class="note">看纯色时重点检查坏点（始终黑/白）、亮点与暗斑；渐变用于观察色带与漏光。检测时建议把屏幕亮度调到平时使用值。</div>' +
        '</div>' +
        '<div class="st-stage" id="stStage">' +
          '<div class="st-bar" id="stBar">' +
            '<button class="btn sm" id="stPrev2">← 上一个</button>' +
            '<span id="stBarLabel">纯色 · #FFFFFF</span>' +
            '<button class="btn sm" id="stNext2">下一个 →</button>' +
            '<button class="btn sm" id="stExit">退出全屏</button>' +
          '</div>' +
        '</div>';

      var stage = TB.$('#stStage', root);
      var bar = TB.$('#stBar', root);
      var barLabel = TB.$('#stBarLabel', root);
      var color = TB.$('#stColor', root);
      var a = TB.$('#stA', root), b = TB.$('#stB', root), ang = TB.$('#stAng', root);
      var mode = 'solid', idx = 0;

      function label() {
        if (mode === 'solid') {
          barLabel.textContent = '纯色 · ' + color.value.toUpperCase();
        } else {
          barLabel.textContent = '渐变 · ' + ang.value + '°';
        }
      }
      function apply() {
        if (mode === 'solid') {
          stage.style.background = color.value;
        } else {
          stage.style.background = 'linear-gradient(' + ang.value + 'deg, ' + a.value + ', ' + b.value + ')';
        }
        label();
      }
      function setMode(m) {
        mode = m;
        TB.$('#stSolid', root).className = 'btn' + (m === 'solid' ? ' primary' : '');
        TB.$('#stGrad', root).className = 'btn' + (m === 'grad' ? ' primary' : '');
        apply();
      }
      function step(n) {
        if (mode !== 'solid') return;
        idx = (idx + n + colors.length) % colors.length;
        color.value = colors[idx];
        apply();
      }

      color.addEventListener('input', function () {
        idx = -1;
        mode = 'solid';
        setMode('solid');
      });
      a.addEventListener('input', apply);
      b.addEventListener('input', apply);
      ang.addEventListener('input', function () {
        TB.$('#stAngV', root).textContent = ang.value;
        apply();
      });
      TB.$('#stSolid', root).addEventListener('click', function () { setMode('solid'); });
      TB.$('#stGrad', root).addEventListener('click', function () { setMode('grad'); });
      TB.$('#stFull', root).addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen();
        else TB.toast('当前浏览器不支持全屏');
      });
      TB.$('#stPrev2', root).addEventListener('click', function () { step(-1); });
      TB.$('#stNext2', root).addEventListener('click', function () { step(1); });
      TB.$('#stExit', root).addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
      });

      document.addEventListener('fullscreenchange', function () {
        if (!alive(root)) return;
        var on = document.fullscreenElement === stage;
        TB.$('#stFull', root).textContent = on ? '退出全屏' : '全屏检测';
        bar.hidden = false;
      });

      document.addEventListener('keydown', function (e) {
        if (!alive(root) || document.fullscreenElement !== stage) return;
        if (e.key === 'Enter') {
          bar.hidden = !bar.hidden;
          e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === '<' || e.key === ',') {
          step(-1);
          e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === '>' || e.key === '.') {
          step(1);
          e.preventDefault();
        }
      });

      apply();
    }
  });

  /* ========================================================== 4. 屏幕常亮 */
  TB.def({
    slug: 'keep-awake', cat: 'web', name: '屏幕常亮', icon: '💡',
    desc: '阻止手机 / 电脑自动睡眠',
    kw: '常亮 屏幕 睡眠 息屏 wake lock nosleep 展示 阅读',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">屏幕常亮<span class="hint">Screen Wake Lock</span></div>' +
          '<div class="ka-state" id="kaState">未开启</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="kaToggle">开启常亮</button>' +
            '<button class="btn" id="kaFull">全屏显示</button>' +
          '</div>' +
          '<div class="note">开启后本页在前台时不会自动息屏；切到后台或锁屏时浏览器会释放，回到本页会自动重新申请。需要 HTTPS（或 localhost）环境，iOS Safari 暂不支持。</div>' +
        '</div>';

      var state = TB.$('#kaState', root);
      var btn = TB.$('#kaToggle', root);
      var lock = null, want = false;

      function paint() {
        if (lock) {
          state.textContent = '常亮已开启';
          state.className = 'ka-state on';
          btn.textContent = '关闭常亮';
        } else if (want) {
          state.textContent = '正在申请常亮…';
          state.className = 'ka-state';
          btn.textContent = '取消';
        } else {
          state.textContent = '未开启';
          state.className = 'ka-state';
          btn.textContent = '开启常亮';
        }
      }

      async function acquire() {
        if (!('wakeLock' in navigator)) {
          state.textContent = '当前浏览器不支持 Wake Lock';
          state.className = 'ka-state bad';
          want = false;
          paint();
          return;
        }
        try {
          lock = await navigator.wakeLock.request('screen');
          lock.addEventListener('release', function () {
            lock = null;
            paint();
          });
          paint();
        } catch (e) {
          lock = null;
          want = false;
          state.textContent = '申请失败：' + (e && e.message ? e.message : '请确认页面在前台');
          state.className = 'ka-state bad';
          paint();
        }
      }

      function release() {
        want = false;
        if (lock) {
          try { lock.release(); } catch (e) {}
          lock = null;
        }
        paint();
      }

      btn.addEventListener('click', function () {
        if (lock || want) { release(); return; }
        want = true;
        paint();
        acquire();
      });

      TB.$('#kaFull', root).addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        else TB.toast('当前浏览器不支持全屏');
      });

      document.addEventListener('visibilitychange', function () {
        if (!alive(root)) {
          if (lock) { try { lock.release(); } catch (e) {} }
          return;
        }
        if (want && document.visibilityState === 'visible' && !lock) acquire();
      });

      paint();
    }
  });
})();
