/* =============================================================================
   趣味 / 生活类补充工具（参考工具邦 cn.piliapp.com 的常用小工具）
   -----------------------------------------------------------------------------
   全部纯前端实现，不依赖后端、不需要登录：
     fun   : 轮盘抽选 / 记分板 / 秒表 / 倒计时 / 跑马灯 / 掷筊
     data  : 屏幕量尺（用银行卡校准）
     image : 图片裁剪旋转
     office: ZIP 压缩 / 解压（本地 JSZip）
     web   : 酷炫文字 / 特殊符号大全
   ============================================================================= */
(function () {
  'use strict';

  /* ---------- 小工具函数 ---------- */
  function alive(root) { return !!(root && root.isConnected); }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function fmtClock(ms) {
    ms = Math.max(0, ms);
    var cs = Math.floor(ms / 10) % 100;
    var s = Math.floor(ms / 1000) % 60;
    var m = Math.floor(ms / 60000) % 60;
    var h = Math.floor(ms / 3600000);
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return (h ? h + ':' : '') + p2(m) + ':' + p2(s) + '.' + p2(cs);
  }

  /* 用 WebAudio 发几声「哔」，不引外部音频文件 */
  function beep(times) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ac = new AC();
      var n = times || 1;
      for (var i = 0; i < n; i++) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.12;
        o.connect(g); g.connect(ac.destination);
        o.start(ac.currentTime + i * 0.28);
        o.stop(ac.currentTime + i * 0.28 + 0.18);
      }
      setTimeout(function () { try { ac.close(); } catch (e) {} }, 300 + n * 300);
    } catch (e) {}
  }

  /* 生成 Unicode 数学字母区块（粗体 / 无衬线粗体 / 等宽体都是连续码位） */
  function blockChars(start, n) {
    var s = '', i;
    for (i = 0; i < n; i++) s += String.fromCodePoint(start + i);
    return s;
  }

  function saveNum(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (e) {}
  }

  function loadNum(key, def) {
    try {
      var v = parseFloat(localStorage.getItem(key));
      return isFinite(v) ? v : def;
    } catch (e) { return def; }
  }

  /* =========================================================== 1. 轮盘抽选 */
  TB.def({
    slug: 'wheel', cat: 'fun', name: '轮盘抽选', icon: '🎡',
    desc: '把选项转到哪个就选哪个',
    kw: '转盘 轮盘 抽奖 随机 决定 选择 wheel random',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="wheel-wrap" id="wheelWrap">' +
            '<canvas id="wheelCv" width="380" height="380"></canvas>' +
            '<span class="wheel-pin"></span>' +
          '</div>' +
          '<div class="btns" style="justify-content:center">' +
            '<button class="btn primary" id="spin">开始转</button>' +
            '<button class="btn" id="shuffle">打乱顺序</button>' +
            '<label class="checks" style="align-items:center"><label><input type="checkbox" id="drop"> 抽中后移除</label></label>' +
          '</div>' +
          '<div class="out" style="margin-top:14px">' +
            '<div class="out-h"><b>结果</b><span class="hint" id="wheelHint">点「开始转」</span></div>' +
            '<div class="out-b wheel-win" id="win">—</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">参与选项<span class="hint">一行一个，最多 40 个</span></div>' +
          '<div class="field"><textarea class="textarea" id="items" style="min-height:160px"></textarea></div>' +
          '<div class="wheel-hist" id="hist"></div>' +
        '</div>' +
        '<div class="note">转盘在本地转，不联网；抽中后移除适合「逐个抽人」的场景。</div>';

      var cv = TB.$('#wheelCv', root);
      var itemsEl = TB.$('#items', root);
      var winEl = TB.$('#win', root);
      var hintEl = TB.$('#wheelHint', root);
      var histEl = TB.$('#hist', root);
      var dropEl = TB.$('#drop', root);
      var ctx2 = cv.getContext('2d');
      var palette = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#eab308', '#ec4899'];
      var rot = 0, spinning = false, history = [];

      itemsEl.value = ['火锅', '烧烤', '日料', '麻辣烫', '牛肉面', '披萨', '盖浇饭', '随便吃点'].join('\n');

      function getItems() {
        return itemsEl.value.split('\n').map(function (s) { return s.trim(); })
          .filter(function (s) { return s; }).slice(0, 40);
      }

      function draw() {
        var items = getItems();
        var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, r = W / 2 - 6;
        ctx2.clearRect(0, 0, W, H);
        if (!items.length) {
          ctx2.fillStyle = '#e8eef6';
          ctx2.beginPath(); ctx2.arc(cx, cy, r, 0, Math.PI * 2); ctx2.fill();
          ctx2.fillStyle = '#8b9cb3';
          ctx2.font = '14px system-ui, sans-serif';
          ctx2.textAlign = 'center';
          ctx2.fillText('先在上面填选项', cx, cy + 5);
          return;
        }
        var seg = Math.PI * 2 / items.length;
        for (var i = 0; i < items.length; i++) {
          var a0 = i * seg + rot, a1 = a0 + seg;
          ctx2.beginPath();
          ctx2.moveTo(cx, cy);
          ctx2.arc(cx, cy, r, a0, a1);
          ctx2.closePath();
          ctx2.fillStyle = palette[i % palette.length];
          ctx2.fill();
        }
        /* 文字 */
        ctx2.fillStyle = '#fff';
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';
        ctx2.font = '600 14px system-ui, sans-serif';
        for (var j = 0; j < items.length; j++) {
          var mid = j * seg + seg / 2 + rot;
          var tx = cx + Math.cos(mid) * r * 0.62;
          var ty = cy + Math.sin(mid) * r * 0.62;
          var txt = items[j].length > 7 ? items[j].slice(0, 7) + '…' : items[j];
          ctx2.save();
          ctx2.translate(tx, ty);
          ctx2.rotate(mid + Math.PI / 2);
          ctx2.fillText(txt, 0, 0);
          ctx2.restore();
        }
        /* 中心圆 */
        ctx2.beginPath();
        ctx2.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx2.fillStyle = 'rgba(255,255,255,.92)';
        ctx2.fill();
        ctx2.fillStyle = '#16233a';
        ctx2.font = '600 15px system-ui, sans-serif';
        ctx2.fillText('转', cx, cy + 1);
      }

      function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var k = Math.floor(Math.random() * (i + 1));
          var t = arr[i]; arr[i] = arr[k]; arr[k] = t;
        }
        return arr;
      }

      function pushHistory(name) {
        history.unshift(name);
        history = history.slice(0, 8);
        histEl.innerHTML = history.length
          ? '<span class="hint">最近结果：</span>' + history.map(function (h, i) {
              return '<span class="wheel-his' + (i === 0 ? ' on' : '') + '">' + TB.esc(h) + '</span>';
            }).join('')
          : '';
      }

      TB.$('#shuffle', root).addEventListener('click', function () {
        if (spinning) return;
        var items = shuffle(getItems());
        itemsEl.value = items.join('\n');
        draw();
        TB.toast('已打乱');
      });

      TB.$('#spin', root).addEventListener('click', function () {
        if (spinning) return;
        var items = getItems();
        if (items.length < 2) { TB.toast('至少要有 2 个选项'); return; }
        spinning = true;
        hintEl.textContent = '转动中…';
        winEl.textContent = '—';
        var idx = Math.floor(Math.random() * items.length);
        var seg = Math.PI * 2 / items.length;
        var center = idx * seg + seg / 2;
        var desired = (Math.PI * 1.5 - center) % (Math.PI * 2);
        var cur = ((rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var delta = ((desired - cur) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        var from = rot;
        var to = rot + Math.PI * 2 * (6 + Math.floor(Math.random() * 3)) + delta;
        var t0 = performance.now(), dur = 3600;

        function step(now) {
          if (!alive(root)) return;
          var p = clamp((now - t0) / dur, 0, 1);
          var e = 1 - Math.pow(1 - p, 3);
          rot = from + (to - from) * e;
          draw();
          if (p < 1) {
            requestAnimationFrame(step);
          } else {
            spinning = false;
            var name = getItems()[idx] || '';
            winEl.textContent = name;
            hintEl.textContent = '共 ' + items.length + ' 个选项';
            pushHistory(name);
            beep(2);
            if (dropEl.checked) {
              var cur2 = getItems();
              cur2.splice(idx, 1);
              itemsEl.value = cur2.join('\n');
              draw();
            }
          }
        }
        requestAnimationFrame(step);
      });

      itemsEl.addEventListener('input', function () { if (!spinning) draw(); });
      draw();
    }
  });

  /* =========================================================== 2. 记分板 */
  TB.def({
    slug: 'scoreboard', cat: 'fun', name: '记分板', icon: '🏆',
    desc: '两队比分，一键加减，可全屏',
    kw: '记分 比分 比赛 篮球 桌游 计分 scoreboard',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="sb-wrap" id="sbWrap">' +
            '<div class="sb-card red">' +
              '<input class="sb-name" id="nameA" value="红队" maxlength="12">' +
              '<div class="sb-score" id="scoreA">0</div>' +
              '<div class="sb-btns">' +
                '<button class="btn sm" data-team="A" data-add="1">+1</button>' +
                '<button class="btn sm" data-team="A" data-add="2">+2</button>' +
                '<button class="btn sm" data-team="A" data-add="3">+3</button>' +
                '<button class="btn sm" data-team="A" data-add="-1">-1</button>' +
              '</div>' +
            '</div>' +
            '<div class="sb-vs">VS</div>' +
            '<div class="sb-card blue">' +
              '<input class="sb-name" id="nameB" value="蓝队" maxlength="12">' +
              '<div class="sb-score" id="scoreB">0</div>' +
              '<div class="sb-btns">' +
                '<button class="btn sm" data-team="B" data-add="1">+1</button>' +
                '<button class="btn sm" data-team="B" data-add="2">+2</button>' +
                '<button class="btn sm" data-team="B" data-add="3">+3</button>' +
                '<button class="btn sm" data-team="B" data-add="-1">-1</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn" id="reset">归零</button>' +
            '<button class="btn" id="swap">交换左右</button>' +
            '<button class="btn primary" id="fs">全屏记分</button>' +
          '</div>' +
        '</div>' +
        '<div class="note">适合篮球、羽毛球、桌游、课堂小组比拼；全屏后按 Esc 退出，分数只存在当前页面。</div>';

      var a = 0, b = 0;
      var scoreA = TB.$('#scoreA', root), scoreB = TB.$('#scoreB', root);
      var nameA = TB.$('#nameA', root), nameB = TB.$('#nameB', root);
      var wrap = TB.$('#sbWrap', root);

      function paint() {
        scoreA.textContent = a;
        scoreB.textContent = b;
        scoreA.classList.toggle('lead', a > b);
        scoreB.classList.toggle('lead', b > a);
      }

      TB.$$('[data-team]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var add = parseInt(btn.getAttribute('data-add'), 10);
          if (btn.getAttribute('data-team') === 'A') a = Math.max(0, a + add);
          else b = Math.max(0, b + add);
          paint();
        });
      });

      TB.$('#reset', root).addEventListener('click', function () {
        a = 0; b = 0; paint(); TB.toast('已归零');
      });

      TB.$('#swap', root).addEventListener('click', function () {
        var t = a; a = b; b = t;
        var n = nameA.value; nameA.value = nameB.value; nameB.value = n;
        paint();
      });

      TB.$('#fs', root).addEventListener('click', function () {
        if (document.fullscreenElement) { document.exitFullscreen(); return; }
        if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () { TB.toast('浏览器不让全屏'); });
      });

      paint();
    }
  });

  /* =========================================================== 3. 秒表 */
  TB.def({
    slug: 'stopwatch', cat: 'fun', name: '在线秒表', icon: '⏱️',
    desc: '计时 / 记圈，精度到 10 毫秒',
    kw: '秒表 计时 计圈 跑步 测试 stopwatch',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="big-clock" id="swTime">00:00.00</div>' +
          '<div class="btns" style="justify-content:center">' +
            '<button class="btn primary" id="start">开始</button>' +
            '<button class="btn" id="lap" disabled>记一圈</button>' +
            '<button class="btn" id="reset">重置</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">分圈记录<span class="hint">按空格开始/暂停，L 记圈</span></div>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>单圈</th><th class="num">累计</th></tr></thead><tbody id="laps"></tbody></table></div>' +
        '</div>' +
        '<div class="note">用 <b>performance.now()</b> 计时，切换标签页也不会跑偏；刷新页面会清空。</div>';

      var disp = TB.$('#swTime', root);
      var startBtn = TB.$('#start', root), lapBtn = TB.$('#lap', root), resetBtn = TB.$('#reset', root);
      var lapsBody = TB.$('#laps', root);
      var running = false, base = 0, acc = 0, laps = [], t0 = 0, timer = null;

      function now() { return acc + (running ? performance.now() - t0 : 0); }

      function paint() {
        disp.textContent = fmtClock(now());
      }

      function tick() {
        if (!alive(root)) { clearInterval(timer); return; }
        paint();
      }

      function start() {
        if (running) return;
        running = true;
        t0 = performance.now();
        startBtn.textContent = '暂停';
        startBtn.classList.remove('primary');
        lapBtn.disabled = false;
        timer = setInterval(tick, 30);
      }

      function pause() {
        if (!running) return;
        acc = now();
        running = false;
        clearInterval(timer);
        startBtn.textContent = '继续';
        startBtn.classList.add('primary');
        paint();
      }

      function reset() {
        running = false;
        clearInterval(timer);
        acc = 0; laps = []; lapsBody.innerHTML = '';
        startBtn.textContent = '开始';
        startBtn.classList.add('primary');
        lapBtn.disabled = true;
        paint();
      }

      function lap() {
        var t = now();
        if (!t) return;
        var prev = laps.length ? laps[laps.length - 1].total : 0;
        laps.push({ total: t, split: t - prev });
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + laps.length + '</td><td>' + fmtClock(t - prev) + '</td>' +
          '<td class="num">' + fmtClock(t) + '</td>';
        lapsBody.insertBefore(tr, lapsBody.firstChild);
      }

      startBtn.addEventListener('click', function () { running ? pause() : start(); });
      lapBtn.addEventListener('click', lap);
      resetBtn.addEventListener('click', reset);

      document.addEventListener('keydown', function (e) {
        if (!alive(root)) return;
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (e.code === 'Space') { e.preventDefault(); running ? pause() : start(); }
        if (e.key === 'l' || e.key === 'L') { e.preventDefault(); lap(); }
      });

      paint();
    }
  });

  /* =========================================================== 4. 倒计时 */
  TB.def({
    slug: 'countdown', cat: 'fun', name: '倒计时器', icon: '⏳',
    desc: '自定义时长，结束响铃',
    kw: '倒计时 定时 提醒 演讲 计时 countdown',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="big-clock" id="cdTime">05:00</div>' +
          '<div class="cd-presets" id="presets">' +
            '<button class="btn sm" data-min="1">1 分钟</button>' +
            '<button class="btn sm" data-min="3">3 分钟</button>' +
            '<button class="btn sm" data-min="5">5 分钟</button>' +
            '<button class="btn sm" data-min="10">10 分钟</button>' +
            '<button class="btn sm" data-min="25">25 分钟</button>' +
          '</div>' +
          '<div class="row" style="margin-top:14px">' +
            '<div class="field"><div class="label">分钟</div><input class="input" id="min" type="number" min="0" max="999" value="5"></div>' +
            '<div class="field"><div class="label">秒</div><input class="input" id="sec" type="number" min="0" max="59" value="0"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="go">开始</button>' +
            '<button class="btn" id="pause" disabled>暂停</button>' +
            '<button class="btn" id="reset">重置</button>' +
          '</div>' +
        '</div>' +
        '<div class="note">结束时播放三声提示音（需浏览器允许声音）；切到后台仍按真实时间计算。</div>';

      var disp = TB.$('#cdTime', root);
      var minEl = TB.$('#min', root), secEl = TB.$('#sec', root);
      var goBtn = TB.$('#go', root), pauseBtn = TB.$('#pause', root), resetBtn = TB.$('#reset', root);
      var total = 300000, left = total, endAt = 0, running = false, paused = false, timer = null;

      function setLeft(ms) {
        left = Math.max(0, ms);
        var s = Math.ceil(left / 1000);
        var m = Math.floor(s / 60), ss = s % 60;
        disp.textContent = (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
        disp.classList.toggle('warn', left > 0 && left <= 10000);
      }

      function readInputs() {
        total = ((parseInt(minEl.value, 10) || 0) * 60 + (parseInt(secEl.value, 10) || 0)) * 1000;
        if (total <= 0) total = 60000;
        return total;
      }

      function tick() {
        if (!alive(root)) { clearInterval(timer); return; }
        setLeft(endAt - Date.now());
        if (left <= 0) {
          clearInterval(timer);
          running = false;
          goBtn.disabled = false;
          pauseBtn.disabled = true;
          beep(3);
          TB.toast('时间到');
        }
      }

      function start() {
        if (running) return;
        if (left <= 0) left = readInputs();
        endAt = Date.now() + left;
        running = true;
        paused = false;
        goBtn.disabled = true;
        pauseBtn.disabled = false;
        timer = setInterval(tick, 100);
        setLeft(left);
      }

      function pause() {
        if (!running) return;
        running = false;
        paused = true;
        clearInterval(timer);
        left = endAt - Date.now();
        goBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = '继续';
      }

      function reset() {
        clearInterval(timer);
        running = false;
        paused = false;
        goBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停';
        setLeft(readInputs());
      }

      goBtn.addEventListener('click', function () {
        /* 没在跑也没暂停，就按输入框里的时间重新计时；暂停中则接着走 */
        if (!running && !paused) {
          total = readInputs();
          left = total;
        }
        start();
      });
      pauseBtn.addEventListener('click', function () { running ? pause() : start(); });
      resetBtn.addEventListener('click', reset);

      TB.$$('#presets .btn', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var m = parseInt(btn.getAttribute('data-min'), 10);
          minEl.value = m;
          secEl.value = 0;
          reset();
          TB.toast('已设为 ' + m + ' 分钟');
        });
      });

      setLeft(total);
    }
  });

  /* =========================================================== 5. 跑马灯 */
  TB.def({
    slug: 'marquee', cat: 'fun', name: '手机跑马灯', icon: '💡',
    desc: '大字滚动，演唱会举牌 / 接机',
    kw: '跑马灯 LED 接机 举牌 应援 滚动字幕 marquee',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="led-stage" id="stage">' +
            '<div class="led-track" id="track"><span>简单工具箱 · 全部在本机处理</span><span>简单工具箱 · 全部在本机处理</span></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="fs">全屏播放</button>' +
            '<button class="btn" id="pause">暂停滚动</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="field"><div class="label">文字</div><input class="input" id="txt" maxlength="80" value="简单工具箱 · 全部在本机处理"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">颜色</div><input class="input color" id="color" type="color" value="#ffd400"></div>' +
            '<div class="field"><div class="label">字号 <b id="sizeV">72</b></div><input class="range" id="size" type="range" min="28" max="180" value="72"></div>' +
            '<div class="field"><div class="label">速度 <b id="spdV">5</b></div><input class="range" id="spd" type="range" min="1" max="10" value="5"></div>' +
          '</div>' +
        '</div>' +
        '<div class="note">背景固定黑底，适合手机横屏全屏展示；滚不完的长文字会自动循环。</div>';

      var stage = TB.$('#stage', root);
      var track = TB.$('#track', root);
      var txt = TB.$('#txt', root), color = TB.$('#color', root);
      var size = TB.$('#size', root), spd = TB.$('#spd', root);
      var sizeV = TB.$('#sizeV', root), spdV = TB.$('#spdV', root);
      var paused = false, raf = null, x = 0, last = 0;

      function applyText() {
        var t = TB.esc(txt.value || '简单工具箱');
        track.innerHTML = '<span>' + t + '</span><span>' + t + '</span>';
        track.style.color = color.value;
        stage.style.setProperty('--led-size', size.value + 'px');
        sizeV.textContent = size.value;
        spdV.textContent = spd.value;
        measure();
      }

      function measure() {
        /* 用两段拼接 + 位移循环，文字再长也能无缝滚动 */
        var first = track.firstElementChild;
        if (!first) return;
        track.style.setProperty('--seg', first.getBoundingClientRect().width + 'px');
        if (!x) {
          x = stage.clientWidth;
          track.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
        }
      }

      function loop(now) {
        if (!alive(root)) return;
        if (!last) last = now;
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          x -= (parseFloat(spd.value) * 28) * dt;
          var seg = parseFloat(getComputedStyle(track).getPropertyValue('--seg')) || 0;
          if (seg && x <= -seg) x += seg;
          track.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
        }
        raf = requestAnimationFrame(loop);
      }

      txt.addEventListener('input', applyText);
      color.addEventListener('input', function () { track.style.color = color.value; });
      size.addEventListener('input', applyText);
      spd.addEventListener('input', function () { spdV.textContent = spd.value; });

      TB.$('#pause', root).addEventListener('click', function (e) {
        paused = !paused;
        e.target.textContent = paused ? '继续滚动' : '暂停滚动';
      });

      TB.$('#fs', root).addEventListener('click', function () {
        if (document.fullscreenElement) { document.exitFullscreen(); return; }
        if (stage.requestFullscreen) stage.requestFullscreen().catch(function () { TB.toast('浏览器不让全屏'); });
      });

      window.addEventListener('resize', function () { if (alive(root)) measure(); });
      applyText();
      requestAnimationFrame(loop);
    }
  });

  /* =========================================================== 6. 掷筊 */
  TB.def({
    slug: 'moonblocks', cat: 'fun', name: '掷筊', icon: '🎋',
    desc: '两个筊杯，看是圣杯、笑杯还是阴杯',
    kw: '掷筊 筊杯 圣杯 求签 庙 占卜 moonblocks',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="mb-stage" id="mbStage">' +
            '<div class="mb-block" id="blockA"><span class="mb-face">平</span></div>' +
            '<div class="mb-block" id="blockB"><span class="mb-face">平</span></div>' +
          '</div>' +
          '<div class="mb-result" id="mbResult">点下面按钮掷一次</div>' +
          '<div class="btns" style="justify-content:center"><button class="btn primary" id="toss">掷筊</button></div>' +
          '<div class="kv" id="mbStats" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">一平一凸为「圣杯」，两平为「笑杯」，两凸为「阴杯」。传统民俗玩法，结果随机，仅供娱乐。</div>';

      var blockA = TB.$('#blockA', root), blockB = TB.$('#blockB', root);
      var resultEl = TB.$('#mbResult', root), statsEl = TB.$('#mbStats', root);
      var tossing = false;
      var stats = { sheng: 0, xiao: 0, yin: 0, total: 0 };

      function paintStats() {
        statsEl.innerHTML =
          '<div class="kv-item"><div class="kv-k">圣杯</div><div class="kv-v">' + stats.sheng + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">笑杯</div><div class="kv-v">' + stats.xiao + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">阴杯</div><div class="kv-v">' + stats.yin + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">已掷</div><div class="kv-v">' + stats.total + ' 次</div></div>';
      }

      function setFace(el, flat) {
        el.classList.toggle('flat', flat);
        TB.$('.mb-face', el).textContent = flat ? '平' : '凸';
      }

      TB.$('#toss', root).addEventListener('click', function () {
        if (tossing) return;
        tossing = true;
        resultEl.textContent = '…';
        var a = Math.random() < 0.5, b = Math.random() < 0.5;
        blockA.classList.add('toss');
        blockB.classList.add('toss');
        blockA.style.setProperty('--spin', (540 + Math.floor(Math.random() * 540)) + 'deg');
        blockB.style.setProperty('--spin', (-(540 + Math.floor(Math.random() * 540))) + 'deg');
        setTimeout(function () {
          if (!alive(root)) return;
          blockA.classList.remove('toss');
          blockB.classList.remove('toss');
          setFace(blockA, a);
          setFace(blockB, b);
          var kind = a && b ? '阴杯' : !a && !b ? '笑杯' : '圣杯';
          resultEl.textContent = kind;
          resultEl.className = 'mb-result ' + (kind === '圣杯' ? 'ok' : kind === '笑杯' ? 'mid' : 'bad');
          if (kind === '圣杯') stats.sheng++;
          else if (kind === '笑杯') stats.xiao++;
          else stats.yin++;
          stats.total++;
          paintStats();
          tossing = false;
        }, 900);
      });

      paintStats();
    }
  });

  /* =========================================================== 7. 屏幕量尺 */
  TB.def({
    slug: 'ruler', cat: 'data', name: '屏幕量尺', icon: '📏',
    desc: '用银行卡校准，量小物件的厘米 / 英寸',
    kw: '量尺 尺子 厘米 英寸 屏幕 测量 ruler',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="ruler-unit tabs" style="margin-bottom:12px">' +
            '<button class="tab on" data-unit="cm">厘米</button>' +
            '<button class="tab" data-unit="in">英寸</button>' +
          '</div>' +
          '<div class="ruler-holder"><canvas id="rulerCv" height="150"></canvas></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">先用银行卡校准<span class="hint">银行卡宽 85.60 mm</span></div>' +
          '<div class="cal-card" id="calCard"><span>把银行卡贴在这里，调滑块让它正好一样宽</span></div>' +
          '<div class="field"><div class="label">校准 <b id="ppcmV">38</b> 像素 / 厘米</div><input class="range" id="ppcm" type="range" min="28" max="60" step="0.1" value="38"></div>' +
          '<div class="btns"><button class="btn" id="save">记住这个校准</button><button class="btn" id="resetCal">恢复默认</button></div>' +
        '</div>' +
        '<div class="note">不同屏幕缩放比例会让「1 厘米」变长或变短，校准一次后本机会记住；参考物：1 元硬币直径 25 mm、A4 纸宽 210 mm。</div>';

      var cv = TB.$('#rulerCv', root);
      var c = cv.getContext('2d');
      var ppcm = loadNum('wl_ppcm', 38);
      var unit = 'cm';
      var range = TB.$('#ppcm', root), valEl = TB.$('#ppcmV', root);
      var card = TB.$('#calCard', root);
      range.value = ppcm;
      valEl.textContent = ppcm.toFixed(1);

      function cardWidth() { return 8.56 * ppcm; }

      function paintCard() {
        card.style.width = Math.round(cardWidth()) + 'px';
      }

      function draw() {
        if (!alive(root)) return;
        var host = cv.parentElement;
        var w = host.clientWidth;
        var dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(150 * dpr);
        cv.style.width = w + 'px';
        cv.style.height = '150px';
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, 150);
        c.fillStyle = '#f7f9fc';
        c.fillRect(0, 0, w, 150);
        c.strokeStyle = '#c7d2e3';
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(0, 120.5); c.lineTo(w, 120.5); c.stroke();

        var step = unit === 'cm' ? ppcm / 10 : ppcm / 2.54 / 8;   /* 1mm 或 1/8 英寸 */
        var major = unit === 'cm' ? ppcm : ppcm / 2.54;            /* 1cm 或 1英寸 */
        var n = 0;
        for (var x = 0; x <= w; x += step) {
          var isMajor = Math.abs((x / major) - Math.round(x / major)) < 0.001;
          var len = isMajor ? 22 : (n % 5 === 0 ? 14 : 8);
          c.strokeStyle = isMajor ? '#57687f' : '#a9b7ca';
          c.beginPath(); c.moveTo(x + 0.5, 120); c.lineTo(x + 0.5, 120 - len); c.stroke();
          if (isMajor && x > 12) {
            c.fillStyle = '#57687f';
            c.font = '11px system-ui, sans-serif';
            c.textAlign = 'center';
            c.fillText(unit === 'cm' ? String(Math.round(x / major)) : String(Math.round(x / major)), x, 138);
          }
          n++;
        }
        c.fillStyle = '#8b9cb3';
        c.font = '11px system-ui, sans-serif';
        c.textAlign = 'left';
        c.fillText(unit === 'cm' ? '厘米（calibrated ' + ppcm.toFixed(1) + ' px/cm）' : '英寸', 6, 20);
      }

      TB.$$('[data-unit]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          unit = btn.getAttribute('data-unit');
          TB.$$('[data-unit]', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
          draw();
        });
      });

      range.addEventListener('input', function () {
        ppcm = parseFloat(range.value);
        valEl.textContent = ppcm.toFixed(1);
        paintCard();
        draw();
      });

      TB.$('#save', root).addEventListener('click', function () {
        saveNum('wl_ppcm', ppcm);
        TB.toast('已记住本机校准');
      });

      TB.$('#resetCal', root).addEventListener('click', function () {
        ppcm = 38;
        range.value = ppcm;
        valEl.textContent = '38.0';
        paintCard();
        draw();
        saveNum('wl_ppcm', ppcm);
      });

      window.addEventListener('resize', draw);
      paintCard();
      draw();
    }
  });

  /* =========================================================== 8. 图片裁剪 */
  TB.def({
    slug: 'img-crop', cat: 'image', name: '图片裁剪 / 旋转', icon: '✂️',
    desc: '按比例裁切，可旋转、翻转、拖动取景',
    kw: '裁剪 裁切 旋转 翻转 头像 比例 crop rotate',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label">选择图片</div><div id="pick"></div></div>' +
          '<div class="crop-stage" id="cropStage" hidden>' +
            '<canvas id="cropCv"></canvas>' +
            '<span class="crop-tip">拖动图片调整取景</span>' +
          '</div>' +
          '<div class="row" style="margin-top:14px">' +
            '<div class="field"><div class="label">比例</div><select class="select" id="ratio">' +
              '<option value="free">原图比例</option><option value="1">1:1 头像</option>' +
              '<option value="1.3333">4:3</option><option value="0.75">3:4</option>' +
              '<option value="1.7778">16:9</option><option value="0.5625">9:16</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">缩放 <b id="zoomV">1.0×</b></div><input class="range" id="zoom" type="range" min="1" max="3" step="0.01" value="1"></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn" id="rotL">左转 90°</button>' +
            '<button class="btn" id="rotR">右转 90°</button>' +
            '<button class="btn" id="flip">左右翻转</button>' +
            '<button class="btn" id="resetView">复位</button>' +
            '<button class="btn primary" id="save" disabled>下载 PNG</button>' +
            '<button class="btn" id="saveJpg" disabled>下载 JPG</button>' +
          '</div>' +
        '</div>' +
        '<div class="note">导出长边约 1400px；裁剪框内的内容就是最终图片，原图不会被上传。</div>';

      var pick = TB.filePicker(TB.$('#pick', root), { accept: 'image/*', hint: 'JPG / PNG / WebP' });
      var stage = TB.$('#cropStage', root);
      var cv = TB.$('#cropCv', root);
      var c = cv.getContext('2d');
      var ratioEl = TB.$('#ratio', root), zoomEl = TB.$('#zoom', root), zoomV = TB.$('#zoomV', root);
      var saveBtn = TB.$('#save', root), saveJpg = TB.$('#saveJpg', root);

      var img = null, rot = 0, flip = false, zoom = 1, ox = 0, oy = 0;
      var frameW = 0, frameH = 0, dragging = false, lastX = 0, lastY = 0;

      function rotSize() {
        var r = ((rot % 360) + 360) % 360;
        return r === 90 || r === 270 ? { w: img.naturalHeight, h: img.naturalWidth } : { w: img.naturalWidth, h: img.naturalHeight };
      }

      function layout() {
        if (!img) return;
        var hostW = Math.min(stage.parentElement.clientWidth, 640);
        var ratio = ratioEl.value === 'free' ? (rotSize().w / rotSize().h) : parseFloat(ratioEl.value);
        frameW = Math.max(160, Math.round(hostW - 2));
        frameH = Math.round(frameW / ratio);
        if (frameH > 460) { frameH = 460; frameW = Math.round(frameH * ratio); }
        var dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(frameW * dpr);
        cv.height = Math.round(frameH * dpr);
        cv.style.width = frameW + 'px';
        cv.style.height = frameH + 'px';
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        clampOffset();
        draw();
      }

      function baseScale() {
        var rs = rotSize();
        return Math.max(frameW / rs.w, frameH / rs.h) * zoom;
      }

      function clampOffset() {
        var rs = rotSize(), s = baseScale();
        var maxX = Math.max(0, (rs.w * s - frameW) / 2);
        var maxY = Math.max(0, (rs.h * s - frameH) / 2);
        ox = clamp(ox, -maxX, maxX);
        oy = clamp(oy, -maxY, maxY);
      }

      function draw() {
        if (!img) return;
        c.clearRect(0, 0, frameW, frameH);
        c.save();
        c.translate(frameW / 2 + ox, frameH / 2 + oy);
        c.rotate(rot * Math.PI / 180);
        var s = baseScale();
        c.scale(flip ? -s : s, s);
        c.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        c.restore();
        /* 取景框边角提示 */
        c.strokeStyle = 'rgba(255,255,255,.9)';
        c.lineWidth = 1;
        c.strokeRect(.5, .5, frameW - 1, frameH - 1);
      }

      function resetView() {
        rot = 0; flip = false; zoom = 1; ox = 0; oy = 0;
        zoomEl.value = 1; zoomV.textContent = '1.0×';
        layout();
      }

      pick.onChange = function () {
        var f = pick.files[0];
        if (!f) return;
        saveBtn.disabled = false;
        saveJpg.disabled = false;
        TB.readImage(f.file).then(function (res) {
          img = res.img;
          stage.hidden = false;
          resetView();
        }).catch(function (e) { TB.toast(e.message); });
      };

      ratioEl.addEventListener('change', layout);
      zoomEl.addEventListener('input', function () {
        zoom = parseFloat(zoomEl.value);
        zoomV.textContent = zoom.toFixed(1) + '×';
        clampOffset();
        draw();
      });

      TB.$('#rotL', root).addEventListener('click', function () { rot -= 90; layout(); });
      TB.$('#rotR', root).addEventListener('click', function () { rot += 90; layout(); });
      TB.$('#flip', root).addEventListener('click', function () { flip = !flip; draw(); });
      TB.$('#resetView', root).addEventListener('click', resetView);

      cv.addEventListener('pointerdown', function (e) {
        if (!img) return;
        dragging = true;
        lastX = e.clientX; lastY = e.clientY;
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        ox += e.clientX - lastX;
        oy += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        clampOffset();
        draw();
      });
      cv.addEventListener('pointerup', function () { dragging = false; });
      cv.addEventListener('pointercancel', function () { dragging = false; });

      function exportImg(type, name) {
        if (!img) return;
        var ratio = frameW / frameH;
        var long = 1400;
        var outW = ratio >= 1 ? long : Math.round(long * ratio);
        var outH = ratio >= 1 ? Math.round(long / ratio) : long;
        var rs = rotSize();
        var s = Math.max(outW / rs.w, outH / rs.h) * zoom;
        var k = outW / frameW;
        var out = document.createElement('canvas');
        out.width = outW; out.height = outH;
        var x = out.getContext('2d');
        x.translate(outW / 2 + ox * k, outH / 2 + oy * k);
        x.rotate(rot * Math.PI / 180);
        x.scale(flip ? -s : s, s);
        x.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        TB.downloadCanvas(out, name, type, type === 'image/jpeg' ? 0.92 : undefined);
      }

      saveBtn.addEventListener('click', function () { exportImg('image/png', 'crop.png'); });
      saveJpg.addEventListener('click', function () { exportImg('image/jpeg', 'crop.jpg'); });

      window.addEventListener('resize', function () { if (alive(root) && img) layout(); });
    }
  });

  /* =========================================================== 9. ZIP 压缩 / 解压 */
  TB.def({
    slug: 'zip', cat: 'office', name: 'ZIP 压缩 / 解压', icon: '🗜️',
    desc: '本地打包多个文件，或解压查看压缩包',
    kw: '压缩 解压 zip 打包 归档 文件夹 zip unzip',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="zipTabs"><button class="tab on" data-tab="c">压缩</button><button class="tab" data-tab="x">解压</button></div>' +
          '<div id="zipC">' +
            '<div class="field"><div class="label">要打包的文件</div><div id="pickC"></div></div>' +
            '<div class="row"><div class="field"><div class="label">压缩包名称</div><input class="input" id="zname" value="归档.zip"></div></div>' +
            '<div class="btns"><button class="btn primary" id="pack" disabled>打包下载</button><span class="hint" id="cHint" style="align-self:center"></span></div>' +
            '<div class="out" style="margin-top:12px"><div class="out-b" id="cOut" style="min-height:44px">等待选择文件…</div></div>' +
          '</div>' +
          '<div id="zipX" hidden>' +
            '<div class="field"><div class="label">选择压缩包</div><div id="pickX"></div></div>' +
            '<div class="out" style="margin-top:12px"><div class="out-b" id="xOut" style="min-height:44px">等待选择 .zip 文件…</div></div>' +
            '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>文件</th><th class="num">大小</th><th style="width:78px">操作</th></tr></thead><tbody id="xList"></tbody></table></div>' +
          '</div>' +
        '</div>' +
        '<div class="note">压缩用浏览器内置 JSZip，文件只在内存里处理；加密压缩包暂不支持。</div>';

      var nameEl = TB.$('#zname', root), packBtn = TB.$('#pack', root), cHint = TB.$('#cHint', root), cOut = TB.$('#cOut', root);
      var xOut = TB.$('#xOut', root), xList = TB.$('#xList', root);
      var pickC = TB.filePicker(TB.$('#pickC', root), { multiple: true, hint: '可多选，也可以拖多个文件进来' });
      var pickX = TB.filePicker(TB.$('#pickX', root), { accept: '.zip,application/zip', hint: '仅支持 .zip' });
      var zipped = null;

      pickC.onChange = function () {
        packBtn.disabled = !pickC.files.length;
        cHint.textContent = pickC.files.length ? '共 ' + pickC.files.length + ' 个文件' : '';
        cOut.textContent = pickC.files.length ? '已选 ' + pickC.files.length + ' 个文件，可以打包了。' : '等待选择文件…';
      };

      packBtn.addEventListener('click', function () {
        if (!pickC.files.length) return;
        var name = (nameEl.value || '归档.zip').replace(/[\\/:*?"<>|]/g, '_');
        if (!/\.zip$/i.test(name)) name += '.zip';
        packBtn.disabled = true;
        cOut.textContent = '正在压缩…';
        TB.loadLib('jszip.min.js').then(function () {
          var zip = new JSZip();
          var used = {};
          pickC.files.forEach(function (item) {
            var fn = item.file.name;
            if (used[fn]) {
              var base = fn.replace(/\.([^.]+)$/, '');
              var ext = fn.slice(base.length);
              var k = 2;
              while (used[base + '(' + k + ')' + ext]) k++;
              fn = base + '(' + k + ')' + ext;
            }
            used[fn] = 1;
            zip.file(fn, item.file);
          });
          return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        }).then(function (blob) {
          zipped = blob;
          TB.download(blob, name);
          cOut.innerHTML = '<span class="result-ok">已打包 ' + pickC.files.length + ' 个文件</span>，大小 ' +
            TB.fmtBytes(blob.size) + '，浏览器已开始下载。';
          packBtn.disabled = false;
        }).catch(function (e) {
          cOut.innerHTML = '<span class="result-err">压缩失败：' + TB.esc(e.message) + '</span>';
          packBtn.disabled = false;
        });
      });

      pickX.onChange = function () {
        var f = pickX.files[0];
        if (!f) return;
        xOut.textContent = '正在读取压缩包…';
        xList.innerHTML = '';
        TB.loadLib('jszip.min.js').then(function () {
          return JSZip.loadAsync(f.file);
        }).then(function (zip) {
          var entries = [];
          zip.forEach(function (path, entry) {
            if (!entry.dir) entries.push({ path: path, entry: entry });
          });
          if (entries.length > 3000) throw new Error('文件数超过 3000，拒绝继续解压');
          var total = 0;
          entries.forEach(function (it) { total += (it.entry._data && it.entry._data.uncompressedSize) || 0; });
          if (total > 300 * 1024 * 1024) throw new Error('解压后超过 300MB，拒绝继续');
          xOut.innerHTML = '<span class="result-ok">共 ' + entries.length + ' 个文件</span>，可逐个下载。';
          entries.slice(0, 300).forEach(function (it) {
            var tr = document.createElement('tr');
            tr.innerHTML = '<td style="word-break:break-all">' + TB.esc(it.path) + '</td>' +
              '<td class="num">' + ((it.entry._data && it.entry._data.uncompressedSize) ? TB.fmtBytes(it.entry._data.uncompressedSize) : '—') + '</td>' +
              '<td><button class="btn sm">下载</button></td>';
            tr.querySelector('button').addEventListener('click', function () {
              var btn = tr.querySelector('button');
              btn.disabled = true;
              it.entry.async('blob').then(function (blob) {
                var n = it.path.split('/').pop() || 'file';
                TB.download(blob, n);
                btn.disabled = false;
              }).catch(function () { btn.disabled = false; TB.toast('这个文件解不出来'); });
            });
            xList.appendChild(tr);
          });
          if (entries.length > 300) {
            var tr2 = document.createElement('tr');
            tr2.innerHTML = '<td colspan="3" style="color:var(--ink-3)">文件太多，只显示前 300 个</td>';
            xList.appendChild(tr2);
          }
        }).catch(function (e) {
          xOut.innerHTML = '<span class="result-err">读取失败：' + TB.esc(e.message) + '</span>';
        });
      };

      TB.$$('[data-tab]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-tab');
          TB.$$('[data-tab]', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
          TB.$('#zipC', root).hidden = tab !== 'c';
          TB.$('#zipX', root).hidden = tab !== 'x';
        });
      });
    }
  });

  /* =========================================================== 10. 酷炫文字 */
  TB.def({
    slug: 'fancy-text', cat: 'web', name: '酷炫文字生成', icon: '✨',
    desc: '一键把英文换成粗体、手写体、气泡体',
    kw: '艺术字 花体 粗体 气泡 特殊文字 昵称 fancy text',
    render: function (ctx) {
      var root = ctx.root;
      var letters = {
        boldU: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
        boldL: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
        boldD: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗',
        sansU: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭',
        sansL: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇',
        sansD: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵',
        monoU: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉',
        monoL: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣',
        monoD: '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿',
        scrU: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
        scrL: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
        dblU: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
        dblL: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
        dblD: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡',
        cirU: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
        cirL: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
        cirD: '⓪①②③④⑤⑥⑦⑧⑨',
        scU: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'
      };

      function mapText(text, u, l, d) {
        /* 数学字母在 Unicode 里是代理对，必须按码点取，否则会把一个字符劈成两半 */
        var U = u ? Array.from(u) : [], L = l ? Array.from(l) : [], D = d ? Array.from(d) : [];
        return Array.from(text).map(function (ch) {
          var code = ch.codePointAt(0);
          if (code >= 65 && code <= 90 && U.length) return U[code - 65] || ch;
          if (code >= 97 && code <= 122 && L.length) return L[code - 97] || ch;
          if (code >= 48 && code <= 57 && D.length) return D[code - 48] || ch;
          return ch;
        }).join('');
      }

      function smallCaps(text) {
        return text.toLowerCase().split('').map(function (ch) {
          var i = ch.charCodeAt(0) - 97;
          return i >= 0 && i < 26 ? letters.scU[i] : ch;
        }).join('');
      }

      function fullWidth(text) {
        return text.split('').map(function (ch) {
          var c = ch.charCodeAt(0);
          if (c === 32) return '\u3000';
          if (c >= 33 && c <= 126) return String.fromCharCode(c + 0xFEE0);
          return ch;
        }).join('');
      }

      function combine(text, mark) {
        return text.split('').map(function (ch) { return ch === ' ' ? ch : ch + mark; }).join('');
      }

      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label">输入英文或数字<span class="hint">中文会原样保留</span></div>' +
            '<input class="input" id="ftIn" value="JianDan Toolbox" maxlength="60"></div>' +
          '<div class="fancy-list" id="ftList"></div>' +
          '<div class="note" style="margin-top:12px">这些是 Unicode 字符，复制后粘到昵称、签名、聊天里都能用；部分平台字体不支持会显示成方框。</div>' +
        '</div>';

      var input = TB.$('#ftIn', root), listEl = TB.$('#ftList', root);

      var styles = [
        { name: '粗体', fn: function (t) { return mapText(t, blockChars(0x1D400, 26), blockChars(0x1D41A, 26), blockChars(0x1D7CE, 10)); } },
        { name: '无衬线粗体', fn: function (t) { return mapText(t, blockChars(0x1D5D4, 26), blockChars(0x1D5EE, 26), blockChars(0x1D7EC, 10)); } },
        { name: '等宽', fn: function (t) { return mapText(t, blockChars(0x1D670, 26), blockChars(0x1D68A, 26), blockChars(0x1D7F6, 10)); } },
        { name: '手写体', fn: function (t) { return mapText(t, letters.scrU, letters.scrL, null); } },
        { name: '双线体', fn: function (t) { return mapText(t, letters.dblU, letters.dblL, letters.dblD); } },
        { name: '气泡体', fn: function (t) { return mapText(t, letters.cirU, letters.cirL, letters.cirD); } },
        { name: '小型大写', fn: smallCaps },
        { name: '全角', fn: fullWidth },
        { name: '删除线', fn: function (t) { return combine(t, '\u0336'); } },
        { name: '下划线', fn: function (t) { return combine(t, '\u0332'); } },
        { name: '斜杠', fn: function (t) { return combine(t, '\u0338'); } }
      ];

      function render() {
        var text = input.value || '';
        listEl.innerHTML = styles.map(function (s) {
          var out = s.fn(text);
          return '<div class="fancy-row"><span class="fancy-k">' + s.name + '</span>' +
            '<span class="fancy-v">' + TB.esc(out || '—') + '</span>' +
            '<button class="btn sm" data-copy="' + TB.esc(out) + '">复制</button></div>';
        }).join('');
        TB.$$('[data-copy]', listEl).forEach(function (btn) {
          btn.addEventListener('click', function () { TB.copy(btn.getAttribute('data-copy')); });
        });
      }

      input.addEventListener('input', render);
      render();
    }
  });

  /* =========================================================== 11. 特殊符号 */
  TB.def({
    slug: 'symbols', cat: 'web', name: '特殊符号大全', icon: '🔣',
    desc: '箭头、数学、货币、图形符号，点一下复制',
    kw: '符号 特殊字符 箭头 数学符号 复制 emoji symbol',
    render: function (ctx) {
      var root = ctx.root;
      var groups = {
        '常用': ['✓', '✔', '✗', '✘', '★', '☆', '♥', '♡', '☀', '☁', '☂', '☃', '☎', '✈', '✉', '✎', '✂', '⌚', '⌛', '☕', '⚡', '⚠', '♻', '☯', '☮', '✡', '☸', '♠', '♣', '♦', '♤', '♧', '♢', '♪', '♫', '♬'],
        '箭头': ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓', '⇔', '⇕', '↖', '↗', '↘', '↙', '↺', '↻', '⟵', '⟶', '⟷', '➔', '➜', '➤', '➜', '⤴', '⤵', '↩', '↪', '⏎'],
        '数学': ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '√', '∑', '∏', '∫', 'π', '°', '′', '″', '‰', '‱', '∅', '∈', '∉', '⊂', '⊃', '⊆', '⊇', '∧', '∨', '∩', '∪', '≡', '∂', '∆', '∇', '≈', '∝', '∟', '∠', '⊥', '∥'],
        '货币': ['¥', '$', '€', '£', '₩', '₽', '₹', '₺', '₴', '₦', '₱', '฿', '₫', '₪', '₡', '₲', '₵', '₸', '₮', '₼', '₾', '₿', '¢', '¤'],
        '图形': ['●', '○', '◎', '◐', '◑', '◒', '◓', '■', '□', '▣', '▤', '▥', '▦', '▧', '▨', '▩', '▲', '△', '▼', '▽', '◆', '◇', '◈', '◉', '◊', '⬤', '⬜', '⬛', '🔶', '🔷', '🔸', '🔹'],
        '星花': ['★', '☆', '✦', '✧', '✪', '✫', '✬', '✭', '✮', '✯', '✰', '❀', '❁', '❂', '❃', '❄', '❅', '❆', '❇', '❈', '❉', '❊', '❋', '✿', '✾', '✽', '✼', '✻', '✺', '✹'],
        '序号': ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳', '⑴', '⑵', '⑶', '⑷', '⑸', '⑹', '⑺', '⑻', '⑼', '⑽', '⒈', '⒉', '⒊', '⒋', '⒌', '⒍', '⒎', '⒏', '⒐', '⒑', '❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '❿'],
        '标点': ['、', '。', '，', '；', '：', '？', '！', '“', '”', '‘', '’', '（', '）', '【', '】', '《', '》', '〈', '〉', '「', '」', '『', '』', '…', '—', '·', '～', '・', '•', '‥', '※', '§', '¶', '©', '®', '™'],
        '表情': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙏', '💪', '👌', '✌', '🤞', '🤝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯', '🔥', '✨', '🎉', '🎊', '🎁', '🌈', '☀️', '🌙', '⭐', '⚡', '❄️', '🌸', '🌹', '🍀', '🍎', '🍺', '☕', '🍕', '🍰']
      };

      var tabs = Object.keys(groups);
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="symTabs">' + tabs.map(function (t, i) {
            return '<button class="tab' + (i === 0 ? ' on' : '') + '" data-g="' + t + '">' + t + '</button>';
          }).join('') + '</div>' +
          '<div class="field"><input class="input" id="symQ" placeholder="搜索符号，例如 star / 箭头 / 币"></div>' +
          '<div class="sym-grid" id="symGrid"></div>' +
          '<div class="note" style="margin-top:12px">点任意符号即复制；搜不到时先切回「常用」再搜。</div>' +
        '</div>';

      var grid = TB.$('#symGrid', root), q = TB.$('#symQ', root);
      var cur = tabs[0];

      function renderGrid() {
        var key = q.value.trim();
        var pool = [];
        if (key) {
          tabs.forEach(function (t) { pool = pool.concat(groups[t].map(function (s) { return { s: s, g: t }; })); });
          pool = pool.filter(function (it) { return it.s.indexOf(key) >= 0 || it.g.indexOf(key) >= 0; });
        } else {
          pool = groups[cur].map(function (s) { return { s: s, g: cur }; });
        }
        if (!pool.length) { grid.innerHTML = '<span class="hint">没有匹配的符号</span>'; return; }
        grid.innerHTML = pool.map(function (it) {
          return '<button class="sym" data-s="' + TB.esc(it.s) + '" title="' + it.g + '">' + it.s + '</button>';
        }).join('');
        TB.$$('.sym', grid).forEach(function (btn) {
          btn.addEventListener('click', function () { TB.copy(btn.getAttribute('data-s')); });
        });
      }

      TB.$$('[data-g]', root).forEach(function (btn) {
        btn.addEventListener('click', function () {
          cur = btn.getAttribute('data-g');
          q.value = '';
          TB.$$('[data-g]', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
          renderGrid();
        });
      });

      q.addEventListener('input', renderGrid);
      renderGrid();
    }
  });
})();
