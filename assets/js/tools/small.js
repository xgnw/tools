/* =============================================================================
 * 两个轻量工具：桌面时钟、算钱神器
 * -----------------------------------------------------------------------------
 * 纯前端计算与展示，没有依赖。时钟支持数字/指针双模式与全屏。
 * ========================================================================== */

(function () {

  /* ----------------------------------------------------------- 1. 桌面时钟 */
  TB.def({
    slug: 'time', cat: 'fun', name: '桌面时钟', desc: '全屏数字 / 指针时钟', icon: '🕰️',
    kw: '时钟 全屏 时间 摆件 会议 计时 clock',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="clockWrap" id="clockWrap">' +
            '<div class="clockMain">' +
              '<canvas id="analog" width="360" height="360" hidden></canvas>' +
              '<div class="clockTime" id="digi"><span id="hhmm">00:00</span><span class="clockSec" id="ss">00</span></div>' +
              '<div class="clockDate" id="cdate"></div>' +
            '</div>' +
          '</div>' +
          '<div class="btns" style="margin-top:14px">' +
            '<button class="btn primary" id="fs">全屏显示</button>' +
            '<button class="btn" id="mode">切换指针模式</button>' +
            '<button class="btn" id="fs2" hidden>退出全屏</button>' +
          '</div>' +
        '</div>' +
        '<div class="note">会议投屏、放桌面当摆件都行；全屏后按 Esc 退出。时钟跟随系统时间，不联网校时。</div>';

      var hhmm = TB.$('#hhmm', root), ss = TB.$('#ss', root), cdate = TB.$('#cdate', root);
      var analog = TB.$('#analog', root), digi = TB.$('#digi', root);
      var wrap = TB.$('#clockWrap', root), modeBtn = TB.$('#mode', root);
      var isAnalog = false;

      function two(n) { return n < 10 ? '0' + n : '' + n; }

      function drawAnalog(now) {
        var c = analog, ctx2 = c.getContext('2d');
        var R = c.width / 2, r = R - 18;
        ctx2.clearRect(0, 0, c.width, c.height);
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx2.strokeStyle = dark ? '#3a4657' : '#dfe7f3';
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        ctx2.arc(R, R, r, 0, Math.PI * 2);
        ctx2.stroke();
        for (var i = 0; i < 12; i++) {
          var a = i * Math.PI / 6;
          ctx2.beginPath();
          ctx2.lineWidth = i % 3 === 0 ? 3 : 1.6;
          ctx2.strokeStyle = dark ? '#6b7b8f' : '#c3cfe0';
          ctx2.moveTo(R + Math.sin(a) * (r - 6), R - Math.cos(a) * (r - 6));
          ctx2.lineTo(R + Math.sin(a) * (r - (i % 3 === 0 ? 18 : 12)), R - Math.cos(a) * (r - (i % 3 === 0 ? 18 : 12)));
          ctx2.stroke();
        }
        function hand(angle, len, width, color) {
          ctx2.beginPath();
          ctx2.strokeStyle = color;
          ctx2.lineWidth = width;
          ctx2.lineCap = 'round';
          ctx2.moveTo(R, R);
          ctx2.lineTo(R + Math.sin(angle) * len, R - Math.cos(angle) * len);
          ctx2.stroke();
        }
        var s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
        hand(h * Math.PI / 6, r * 0.55, 7, '#2b7fff');
        hand(m * Math.PI / 30, r * 0.78, 5, '#1f2d44');
        hand(s * Math.PI / 30, r * 0.86, 3, '#e0483f');
        ctx2.beginPath();
        ctx2.fillStyle = '#2b7fff';
        ctx2.arc(R, R, 5, 0, Math.PI * 2);
        ctx2.fill();
      }

      function tick() {
        var now = new Date();
        hhmm.textContent = two(now.getHours()) + ':' + two(now.getMinutes());
        ss.textContent = two(now.getSeconds());
        var wk = '日一二三四五六'[now.getDay()];
        cdate.textContent = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 · 星期' + wk;
        if (isAnalog) drawAnalog(now);
      }
      tick();
      var timer = setInterval(tick, 1000);
      /* 页面切走时停掉，回来立刻对齐，避免后台被节流后显示旧时间 */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearInterval(timer);
        else { clearInterval(timer); timer = setInterval(tick, 1000); tick(); }
      });

      modeBtn.addEventListener('click', function () {
        isAnalog = !isAnalog;
        analog.hidden = !isAnalog;
        digi.hidden = isAnalog;
        modeBtn.textContent = isAnalog ? '切换数字模式' : '切换指针模式';
        if (isAnalog) drawAnalog(new Date());
      });

      TB.$('#fs', root).addEventListener('click', function () {
        if (wrap.requestFullscreen) wrap.requestFullscreen();
        else TB.toast('当前浏览器不支持全屏');
      });
      document.addEventListener('fullscreenchange', function () {
        var on = document.fullscreenElement === wrap;
        TB.$('#fs2', root).hidden = !on;
        TB.$('#fs', root).hidden = on;
      });
      TB.$('#fs2', root).addEventListener('click', function () {
        if (document.exitFullscreen) document.exitFullscreen();
      });
    }
  });

  /* ----------------------------------------------------------- 2. 算钱神器 */
  TB.def({
    slug: 'money', cat: 'data', name: '算钱神器', desc: '日薪时薪与加班费', icon: '💰',
    kw: '工资 月薪 日薪 时薪 加班费 请假 算钱',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>月薪（元）</b></div>' +
              '<input class="input" id="salary" type="number" value="12000" min="0" step="100"></div>' +
            '<div class="field"><div class="label">每月计薪天数</div>' +
              '<input class="input" id="days" type="number" value="21.75" min="1" max="31" step="0.01"></div>' +
          '</div>' +
          '<div class="field"><div class="label">每天工时（小时）</div>' +
            '<input class="input" id="hours" type="number" value="8" min="1" max="24" step="0.5"></div>' +
          '<div class="btns"><button class="btn" id="run">重新计算</button></div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">按月薪 12000、21.75 天、8 小时算：日薪约 552 元、时薪约 69 元。<b>加班费</b>按《劳动法》倍数计算，<b>请假扣款</b>按日薪折算，仅供参考，实际以公司制度为准。</div>';

      var salary = TB.$('#salary', root), days = TB.$('#days', root), hours = TB.$('#hours', root), out = TB.$('#out', root);

      function money(n) {
        return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      function calc() {
        var s = Math.max(0, parseFloat(salary.value) || 0);
        var d = Math.max(1, parseFloat(days.value) || 21.75);
        var h = Math.max(1, parseFloat(hours.value) || 8);
        var day = s / d, hour = day / h, minute = hour / 60, second = minute / 60;

        var rows = [
          ['日薪', money(day) + ' 元'],
          ['时薪', money(hour) + ' 元'],
          ['每分钟', money(minute) + ' 元'],
          ['每秒钟', money(second) + ' 元'],
          ['工作日加班（1.5 倍）', money(hour * 1.5) + ' 元/小时'],
          ['休息日加班（2 倍）', money(hour * 2) + ' 元/小时'],
          ['法定节假日（3 倍）', money(hour * 3) + ' 元/小时'],
          ['请一天假扣', money(day) + ' 元'],
          ['请一小时假扣', money(hour) + ' 元']
        ];

        out.innerHTML = '<div class="moneyGrid">' + rows.map(function (r, i) {
          return '<div class="moneyCell' + (i < 4 ? ' hi' : '') + '"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
        }).join('') + '</div>';
      }

      [salary, days, hours].forEach(function (i) { i.addEventListener('input', calc); });
      TB.$('#run', root).addEventListener('click', calc);
      calc();
    }
  });

})();
