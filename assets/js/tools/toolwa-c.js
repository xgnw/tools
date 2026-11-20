/* =============================================================================
 * Toolwa 迁移工具 · C 组（硬件检测）
 * -----------------------------------------------------------------------------
 * 本文件收纳 8 个浏览器原生硬件检测工具：
 *   摄像头、麦克风、键盘、鼠标、游戏手柄、屏幕刷新率、GPU 图形性能、扬声器。
 *
 * 说明：
 *   - 摄像头 / 麦克风需要用户授权，拒绝授权或没有设备时会显示明确错误；
 *   - 键盘 / 鼠标 / 手柄检测只在对应测试区域内监听，不拦截浏览器全局快捷键；
 *   - 刷新率 / GPU 测试使用 requestAnimationFrame，结果为当前设备与浏览器下的估算值。
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------- 摄像头 */
  TB.def({
    slug: 'camera-test',
    cat: 'web',
    name: '摄像头测试',
    desc: '浏览器本地预览摄像头，查看分辨率、帧率与设备信息。',
    icon: '📹',
    kw: '摄像头 测试 相机 webcam 分辨率 帧率 权限 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">摄像头</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">设备</div><select class="select" id="ctDevice"><option value="">默认摄像头</option></select></div>' +
            '<div class="field"><div class="label">分辨率</div><select class="select" id="ctRes">' +
              '<option value="640x480">640 × 480</option><option value="1280x720" selected>1280 × 720</option><option value="1920x1080">1920 × 1080</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="ctStart" type="button">开启摄像头</button>' +
            '<button class="btn" id="ctStop" type="button">关闭</button>' +
            '<button class="btn" id="ctRefresh" type="button">刷新设备列表</button></div>' +
          '<div class="hw-status" id="ctStatus">尚未开启。首次使用会弹出系统 / 浏览器授权框。</div></div>' +
        '<div class="panel"><div class="panel-h">预览</div>' +
          '<div class="hw-video-wrap"><video class="hw-video" id="ctVideo" autoplay playsinline muted></video>' +
          '<div class="hw-video-empty" id="ctEmpty">摄像头画面将在这里显示</div></div>' +
          '<div class="hw-kv" id="ctInfo"></div></div>';

      var select = TB.$('#ctDevice', root);
      var res = TB.$('#ctRes', root);
      var video = TB.$('#ctVideo', root);
      var empty = TB.$('#ctEmpty', root);
      var status = TB.$('#ctStatus', root);
      var info = TB.$('#ctInfo', root);
      var stream = null;

      function setStatus(text, type) {
        status.textContent = text;
        status.className = 'hw-status' + (type ? ' ' + type : '');
      }

      async function devices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        try {
          var list = await navigator.mediaDevices.enumerateDevices();
          var cams = list.filter(function (d) { return d.kind === 'videoinput'; });
          var current = select.value;
          select.innerHTML = '<option value="">默认摄像头</option>' + cams.map(function (d, i) {
            return '<option value="' + TB.esc(d.deviceId) + '">' + TB.esc(d.label || ('摄像头 ' + (i + 1))) + '</option>';
          }).join('');
          if (current) select.value = current;
        } catch (e) { /* 枚举失败不阻塞预览 */ }
      }

      function stop() {
        if (stream) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          stream = null;
        }
        video.srcObject = null;
        empty.style.display = 'flex';
        info.innerHTML = '';
      }

      async function start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return setStatus('当前浏览器不支持摄像头 API，请换用 Chrome / Edge / Firefox。', 'bad');
        }
        stop();
        var size = res.value.split('x');
        var constraints = {
          audio: false,
          video: {
            width: { ideal: Number(size[0]) },
            height: { ideal: Number(size[1]) }
          }
        };
        if (select.value) constraints.video.deviceId = { exact: select.value };
        try {
          setStatus('正在请求摄像头权限…');
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          video.srcObject = stream;
          await video.play();
          empty.style.display = 'none';
          var track = stream.getVideoTracks()[0];
          var settings = track.getSettings ? track.getSettings() : {};
          var label = track.label || '摄像头';
          info.innerHTML =
            '<div class="hw-kv-row"><span>设备</span><b>' + TB.esc(label) + '</b></div>' +
            '<div class="hw-kv-row"><span>实际分辨率</span><b>' + (settings.width || video.videoWidth) + ' × ' + (settings.height || video.videoHeight) + '</b></div>' +
            '<div class="hw-kv-row"><span>帧率</span><b>' + (settings.frameRate ? settings.frameRate.toFixed(1) + ' fps' : '—') + '</b></div>' +
            '<div class="hw-kv-row"><span>朝向</span><b>' + TB.esc(settings.facingMode || '未报告') + '</b></div>';
          setStatus('摄像头已开启。', 'ok');
          devices();
        } catch (e) {
          var msg = e && e.name === 'NotAllowedError' ? '权限被拒绝，请在浏览器地址栏的权限设置中允许摄像头。' :
            e && e.name === 'NotFoundError' ? '没有找到摄像头设备。' :
            e && e.name === 'NotReadableError' ? '摄像头被其他程序占用，请关闭会议 / 相机应用后重试。' :
            '开启失败：' + (e.message || e.name || '未知错误');
          setStatus(msg, 'bad');
        }
      }

      TB.$('#ctStart', root).addEventListener('click', start);
      TB.$('#ctStop', root).addEventListener('click', function () { stop(); setStatus('已关闭摄像头。'); });
      TB.$('#ctRefresh', root).addEventListener('click', function () { devices(); setStatus('设备列表已刷新。'); });
      devices();
      window.addEventListener('hashchange', stop, { once: true });
    }
  });

  /* --------------------------------------------------------- 麦克风 */
  TB.def({
    slug: 'mic-test',
    cat: 'web',
    name: '麦克风测试',
    desc: '实时显示麦克风音量与波形，检查输入设备是否工作。',
    icon: '🎙️',
    kw: '麦克风 测试 录音 音量 波形 mic 输入设备 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">麦克风</div>' +
          '<div class="row"><div class="field"><div class="label">输入设备</div><select class="select" id="mtDevice"><option value="">默认麦克风</option></select></div></div>' +
          '<div class="btns"><button class="btn primary" id="mtStart" type="button">开始检测</button>' +
            '<button class="btn" id="mtStop" type="button">停止</button>' +
            '<button class="btn" id="mtRefresh" type="button">刷新设备</button></div>' +
          '<div class="hw-status" id="mtStatus">尚未开始。首次使用会弹出授权框。</div>' +
          '<div class="hw-meter"><div class="hw-meter-bar" id="mtBar"></div></div>' +
          '<div class="hw-kv" id="mtInfo"></div></div>' +
        '<div class="panel"><div class="panel-h">实时波形</div>' +
          '<canvas class="hw-wave" id="mtWave" width="900" height="220"></canvas>' +
          '<p class="note">对着麦克风说话，波形和音量条应同步变化；如果一直为零，请检查系统输入设备与静音键。</p></div>';

      var select = TB.$('#mtDevice', root);
      var status = TB.$('#mtStatus', root);
      var bar = TB.$('#mtBar', root);
      var info = TB.$('#mtInfo', root);
      var canvas = TB.$('#mtWave', root);
      var ctx2 = canvas.getContext('2d');
      var stream = null;
      var audioCtx = null;
      var analyser = null;
      var source = null;
      var rafId = 0;

      function setStatus(text, type) {
        status.textContent = text;
        status.className = 'hw-status' + (type ? ' ' + type : '');
      }

      async function devices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        try {
          var list = await navigator.mediaDevices.enumerateDevices();
          var mics = list.filter(function (d) { return d.kind === 'audioinput'; });
          var current = select.value;
          select.innerHTML = '<option value="">默认麦克风</option>' + mics.map(function (d, i) {
            return '<option value="' + TB.esc(d.deviceId) + '">' + TB.esc(d.label || ('麦克风 ' + (i + 1))) + '</option>';
          }).join('');
          if (current) select.value = current;
        } catch (e) { /* 忽略 */ }
      }

      function drawFlat() {
        ctx2.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.strokeStyle = 'rgba(120,130,150,.35)';
        ctx2.beginPath();
        ctx2.moveTo(0, canvas.height / 2);
        ctx2.lineTo(canvas.width, canvas.height / 2);
        ctx2.stroke();
      }

      function loop() {
        if (!analyser || !canvas.isConnected) { stop(); return; }
        var data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        var sum = 0, peak = 0;
        for (var i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
          peak = Math.max(peak, Math.abs(data[i]));
        }
        var rms = Math.sqrt(sum / data.length);
        var db = rms > 0 ? 20 * Math.log10(rms) : -100;
        var pct = Math.max(0, Math.min(100, (db + 60) / 60 * 100));
        bar.style.width = pct + '%';
        bar.className = 'hw-meter-bar' + (pct > 70 ? ' hot' : pct > 30 ? ' mid' : '');
        info.innerHTML = '<div class="hw-kv-row"><span>音量</span><b>' + Math.round(pct) + '%</b></div>' +
          '<div class="hw-kv-row"><span>RMS</span><b>' + (rms ? rms.toFixed(4) : '0') + '</b></div>' +
          '<div class="hw-kv-row"><span>峰值</span><b>' + (peak ? peak.toFixed(2) : '0') + '</b></div>' +
          '<div class="hw-kv-row"><span>估算 dBFS</span><b>' + (db > -100 ? db.toFixed(1) + ' dB' : '静音') + '</b></div>';

        ctx2.clearRect(0, 0, canvas.width, canvas.height);
        ctx2.strokeStyle = 'rgba(120,130,150,.25)';
        ctx2.beginPath();
        ctx2.moveTo(0, canvas.height / 2);
        ctx2.lineTo(canvas.width, canvas.height / 2);
        ctx2.stroke();
        ctx2.strokeStyle = pct > 70 ? '#e04b4b' : '#4f6bed';
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        for (var j = 0; j < data.length; j++) {
          var x = j / (data.length - 1) * canvas.width;
          var y = canvas.height / 2 + data[j] * canvas.height * 0.45;
          if (j === 0) ctx2.moveTo(x, y); else ctx2.lineTo(x, y);
        }
        ctx2.stroke();
        rafId = requestAnimationFrame(loop);
      }

      function stop() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        if (source) { try { source.disconnect(); } catch (e) {} source = null; }
        if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
        if (audioCtx) { audioCtx.close().catch(function () {}); audioCtx = null; }
        analyser = null;
        bar.style.width = '0%';
        drawFlat();
      }

      async function start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return setStatus('当前浏览器不支持麦克风 API。', 'bad');
        }
        stop();
        try {
          setStatus('正在请求麦克风权限…');
          var constraints = { audio: select.value ? { deviceId: { exact: select.value } } : true };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          await audioCtx.resume();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.82;
          source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          var track = stream.getAudioTracks()[0];
          var settings = track.getSettings ? track.getSettings() : {};
          info.innerHTML = '<div class="hw-kv-row"><span>设备</span><b>' + TB.esc(track.label || '麦克风') + '</b></div>' +
            '<div class="hw-kv-row"><span>采样率</span><b>' + (settings.sampleRate || audioCtx.sampleRate) + ' Hz</b></div>';
          setStatus('正在检测，请对着麦克风说话。', 'ok');
          drawFlat();
          loop();
          devices();
        } catch (e) {
          var msg = e && e.name === 'NotAllowedError' ? '权限被拒绝，请允许麦克风访问。' :
            e && e.name === 'NotFoundError' ? '没有找到麦克风设备。' :
            '开启失败：' + (e.message || e.name || '未知错误');
          setStatus(msg, 'bad');
        }
      }

      TB.$('#mtStart', root).addEventListener('click', start);
      TB.$('#mtStop', root).addEventListener('click', function () { stop(); setStatus('已停止检测。'); });
      TB.$('#mtRefresh', root).addEventListener('click', function () { devices(); setStatus('设备列表已刷新。'); });
      devices();
      drawFlat();
      window.addEventListener('hashchange', stop, { once: true });
    }
  });

  /* --------------------------------------------------------- 键盘 */
  TB.def({
    slug: 'keyboard-test',
    cat: 'web',
    name: '键盘测试',
    desc: '在测试区内按键，查看键名、键码、位置与修饰键，检查按键是否正常。',
    icon: '⌨️',
    kw: '键盘 测试 按键 keyCode 键码 硬件 坏键',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">按键测试</div>' +
          '<div class="hw-pad hw-keyboard-pad" id="kbPad" tabindex="0">' +
            '<div class="hw-pad-hint">点击这里，然后按下任意键</div>' +
            '<div class="hw-key-big" id="kbKey">—</div>' +
            '<div class="hw-key-sub" id="kbSub">等待按键…</div>' +
          '</div>' +
          '<div class="btns"><button class="btn" id="kbClear" type="button">清空记录</button></div>' +
          '<div class="hw-status" id="kbStatus">测试区只监听键盘事件，不会拦截浏览器快捷键。</div></div>' +
        '<div class="panel"><div class="panel-h">按键详情</div><div class="hw-kv" id="kbInfo"></div></div>' +
        '<div class="panel"><div class="panel-h">最近按键</div><div class="hw-log" id="kbLog"><div class="hint">还没有按键记录。</div></div></div>';

      var pad = TB.$('#kbPad', root);
      var big = TB.$('#kbKey', root);
      var sub = TB.$('#kbSub', root);
      var info = TB.$('#kbInfo', root);
      var log = TB.$('#kbLog', root);
      var status = TB.$('#kbStatus', root);
      var history = [];
      var held = {};

      function mods(e) {
        var list = [];
        if (e.ctrlKey) list.push('Ctrl');
        if (e.shiftKey) list.push('Shift');
        if (e.altKey) list.push('Alt');
        if (e.metaKey) list.push('Meta');
        return list.length ? list.join(' + ') : '无';
      }

      function addLog(text) {
        history.unshift(text);
        if (history.length > 12) history.pop();
        log.innerHTML = history.map(function (item, i) {
          return '<div class="hw-log-row"><span>' + (i === 0 ? '最新' : '#' + (i + 1)) + '</span><b class="mono">' + TB.esc(item) + '</b></div>';
        }).join('');
      }

      pad.addEventListener('click', function () {
        pad.focus();
        status.textContent = '测试区已聚焦，请按键。';
      });
      pad.addEventListener('keydown', function (e) {
        // 只拦截会影响页面滚动的键，Ctrl/Alt/Meta 组合保持浏览器默认行为。
        if (!e.ctrlKey && !e.altKey && !e.metaKey && /^(Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace)$/.test(e.code)) {
          e.preventDefault();
        }
        held[e.code] = true;
        var keyText = e.key === ' ' ? 'Space' : e.key;
        big.textContent = keyText;
        sub.textContent = e.code + (e.repeat ? ' · 自动重复' : '');
        info.innerHTML =
          '<div class="hw-kv-row"><span>key</span><b class="mono">' + TB.esc(e.key) + '</b></div>' +
          '<div class="hw-kv-row"><span>code</span><b class="mono">' + TB.esc(e.code) + '</b></div>' +
          '<div class="hw-kv-row"><span>keyCode</span><b class="mono">' + e.keyCode + '</b></div>' +
          '<div class="hw-kv-row"><span>位置</span><b>' + (e.location === 0 ? '标准' : e.location === 1 ? '左侧' : e.location === 2 ? '右侧' : '数字小键盘') + '</b></div>' +
          '<div class="hw-kv-row"><span>修饰键</span><b>' + mods(e) + '</b></div>' +
          '<div class="hw-kv-row"><span>repeat</span><b>' + (e.repeat ? '是' : '否') + '</b></div>';
        addLog(keyText + '  /  ' + e.code + '  /  ' + e.keyCode);
        status.textContent = '检测到按键：' + keyText;
      });
      pad.addEventListener('keyup', function (e) {
        delete held[e.code];
      });
      pad.addEventListener('blur', function () {
        held = {};
        status.textContent = '测试区已失去焦点，点击测试区继续。';
      });
      TB.$('#kbClear', root).addEventListener('click', function () {
        history = [];
        big.textContent = '—';
        sub.textContent = '等待按键…';
        info.innerHTML = '';
        log.innerHTML = '<div class="hint">还没有按键记录。</div>';
        status.textContent = '记录已清空。';
      });
    }
  });

  /* --------------------------------------------------------- 鼠标 */
  TB.def({
    slug: 'mouse-test',
    cat: 'web',
    name: '鼠标测试',
    desc: '检测鼠标移动、按键、双击、滚轮与右键，显示坐标和事件。',
    icon: '🖱️',
    kw: '鼠标 测试 左键 右键 滚轮 双击 坐标 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">鼠标测试区</div>' +
          '<div class="hw-mouse-pad" id="msPad">' +
            '<div class="hw-mouse-cross" id="msCross"></div>' +
            '<div class="hw-mouse-dot" id="msDot"></div>' +
            '<div class="hw-pad-hint">在区域内移动、点击、滚动和右键</div>' +
          '</div>' +
          '<div class="btns"><button class="btn" id="msClear" type="button">清空计数</button></div>' +
          '<div class="hw-status" id="msStatus">等待鼠标事件…</div></div>' +
        '<div class="panel"><div class="panel-h">实时数据</div><div class="hw-kv" id="msInfo"></div></div>' +
        '<div class="panel"><div class="panel-h">事件记录</div><div class="hw-log" id="msLog"><div class="hint">还没有事件。</div></div></div>';

      var pad = TB.$('#msPad', root);
      var dot = TB.$('#msDot', root);
      var cross = TB.$('#msCross', root);
      var info = TB.$('#msInfo', root);
      var log = TB.$('#msLog', root);
      var status = TB.$('#msStatus', root);
      var counts = { move: 0, down: 0, up: 0, click: 0, dbl: 0, wheel: 0, context: 0 };
      var history = [];

      function buttonName(n) {
        return n === 0 ? '左键' : n === 1 ? '中键' : n === 2 ? '右键' : n === 3 ? '侧键 1' : n === 4 ? '侧键 2' : '按键 ' + n;
      }
      function addLog(text) {
        history.unshift(text);
        if (history.length > 12) history.pop();
        log.innerHTML = history.map(function (item, i) {
          return '<div class="hw-log-row"><span>' + (i === 0 ? '最新' : '#' + (i + 1)) + '</span><b class="mono">' + TB.esc(item) + '</b></div>';
        }).join('');
      }
      function updateInfo(x, y, extra) {
        var w = pad.clientWidth, h = pad.clientHeight;
        info.innerHTML =
          '<div class="hw-kv-row"><span>坐标</span><b class="mono">' + Math.round(x) + ', ' + Math.round(y) + ' px</b></div>' +
          '<div class="hw-kv-row"><span>相对位置</span><b class="mono">' + (x / w * 100).toFixed(1) + '%, ' + (y / h * 100).toFixed(1) + '%</b></div>' +
          '<div class="hw-kv-row"><span>移动</span><b>' + counts.move + '</b></div>' +
          '<div class="hw-kv-row"><span>按下 / 松开</span><b>' + counts.down + ' / ' + counts.up + '</b></div>' +
          '<div class="hw-kv-row"><span>单击 / 双击</span><b>' + counts.click + ' / ' + counts.dbl + '</b></div>' +
          '<div class="hw-kv-row"><span>滚轮 / 右键</span><b>' + counts.wheel + ' / ' + counts.context + '</b></div>' +
          (extra ? '<div class="hw-kv-row"><span>最近</span><b>' + TB.esc(extra) + '</b></div>' : '');
      }
      function pos(e) {
        var r = pad.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
      }

      pad.addEventListener('pointermove', function (e) {
        var p = pos(e);
        counts.move++;
        dot.style.left = p.x + 'px';
        dot.style.top = p.y + 'px';
        cross.style.left = p.x + 'px';
        cross.style.top = p.y + 'px';
        updateInfo(p.x, p.y);
      });
      pad.addEventListener('pointerdown', function (e) {
        var p = pos(e);
        counts.down++;
        updateInfo(p.x, p.y, '按下 ' + buttonName(e.button));
        addLog('pointerdown ' + buttonName(e.button) + ' @ ' + Math.round(p.x) + ',' + Math.round(p.y));
        status.textContent = '检测到按下：' + buttonName(e.button);
        if (e.pointerType === 'mouse') pad.setPointerCapture && pad.setPointerCapture(e.pointerId);
      });
      pad.addEventListener('pointerup', function (e) {
        var p = pos(e);
        counts.up++;
        updateInfo(p.x, p.y, '松开 ' + buttonName(e.button));
        addLog('pointerup ' + buttonName(e.button));
      });
      pad.addEventListener('click', function (e) {
        counts.click++;
        addLog('click ' + buttonName(e.button));
        status.textContent = '检测到单击：' + buttonName(e.button);
      });
      pad.addEventListener('dblclick', function (e) {
        counts.dbl++;
        addLog('dblclick ' + buttonName(e.button));
        status.textContent = '检测到双击。';
      });
      pad.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        counts.context++;
        addLog('contextmenu 右键');
        status.textContent = '检测到右键菜单事件（已阻止弹出菜单）。';
      });
      pad.addEventListener('wheel', function (e) {
        e.preventDefault();
        counts.wheel++;
        addLog('wheel ΔY=' + Math.round(e.deltaY) + ' ΔX=' + Math.round(e.deltaX));
        status.textContent = '检测到滚轮：ΔY ' + Math.round(e.deltaY);
      }, { passive: false });
      TB.$('#msClear', root).addEventListener('click', function () {
        counts = { move: 0, down: 0, up: 0, click: 0, dbl: 0, wheel: 0, context: 0 };
        history = [];
        info.innerHTML = '';
        log.innerHTML = '<div class="hint">还没有事件。</div>';
        status.textContent = '计数已清空。';
      });
    }
  });

  /* --------------------------------------------------------- 游戏手柄 */
  TB.def({
    slug: 'gamepad-test',
    cat: 'web',
    name: '游戏手柄测试',
    desc: '识别已连接手柄，实时显示按键、摇杆轴与扳机状态。',
    icon: '🎮',
    kw: '游戏手柄 gamepad 摇杆 扳机 按键 测试 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">游戏手柄</div>' +
          '<div class="btns"><button class="btn primary" id="gpStart" type="button">开始检测</button>' +
            '<button class="btn" id="gpStop" type="button">停止</button></div>' +
          '<div class="hw-status" id="gpStatus">连接手柄后按任意键，然后点击“开始检测”。浏览器通常需要一次按键才会暴露手柄。</div></div>' +
        '<div class="panel"><div class="panel-h">已连接手柄</div><div class="hw-gamepads" id="gpList"><div class="hint">尚未检测。</div></div></div>' +
        '<div class="panel"><div class="panel-h">按键与轴</div><div class="hw-gamepad-detail" id="gpDetail"><div class="hint">等待手柄输入。</div></div></div>';

      var list = TB.$('#gpList', root);
      var detail = TB.$('#gpDetail', root);
      var status = TB.$('#gpStatus', root);
      var rafId = 0;
      var running = false;

      function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }

      function poll() {
        if (!running || !list.isConnected) { stop(); return; }
        var pads = navigator.getGamepads ? navigator.getGamepads() : [];
        var active = [];
        for (var i = 0; i < pads.length; i++) if (pads[i]) active.push(pads[i]);
        if (!active.length) {
          list.innerHTML = '<div class="hint">未检测到手柄。请通过 USB / 蓝牙连接，并按一下手柄按键。</div>';
          detail.innerHTML = '<div class="hint">等待手柄输入。</div>';
          status.textContent = '正在扫描手柄…';
        } else {
          list.innerHTML = active.map(function (pad, idx) {
            return '<div class="hw-gamepad-card"><b>' + TB.esc(pad.id || ('手柄 ' + (idx + 1))) + '</b>' +
              '<span>index ' + pad.index + ' · ' + pad.buttons.length + ' 键 · ' + pad.axes.length + ' 轴</span>' +
              '<em>' + (pad.connected ? '已连接' : '未连接') + '</em></div>';
          }).join('');
          var pad = active[0];
          var buttons = pad.buttons.map(function (b, idx) {
            return '<div class="hw-gp-btn' + (b.pressed ? ' on' : '') + '"><span>B' + idx + '</span><b>' + b.value.toFixed(2) + '</b></div>';
          }).join('');
          var axes = pad.axes.map(function (v, idx) {
            var pct = Math.round((v + 1) / 2 * 100);
            return '<div class="hw-axis"><span>轴 ' + idx + '</span><div class="hw-axis-track"><i style="width:' + pct + '%"></i></div><b>' + v.toFixed(2) + '</b></div>';
          }).join('');
          detail.innerHTML = '<div class="hw-gp-buttons">' + buttons + '</div>' + axes;
          status.textContent = '检测到手柄：' + (pad.id || '未知设备');
        }
        rafId = requestAnimationFrame(poll);
      }

      function start() {
        if (!navigator.getGamepads) {
          status.textContent = '当前浏览器不支持 Gamepad API。';
          return;
        }
        stop();
        running = true;
        status.textContent = '正在检测手柄…';
        poll();
      }

      TB.$('#gpStart', root).addEventListener('click', start);
      TB.$('#gpStop', root).addEventListener('click', function () { stop(); status.textContent = '已停止检测。'; });
      window.addEventListener('hashchange', stop, { once: true });
    }
  });

  /* --------------------------------------------------------- 刷新率 */
  TB.def({
    slug: 'fps-test',
    cat: 'web',
    name: '屏幕刷新率与帧率测试',
    desc: '用 requestAnimationFrame 估算当前屏幕刷新率与掉帧情况。',
    icon: '📺',
    kw: '刷新率 帧率 FPS 屏幕 显示器 掉帧 测试 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">屏幕信息</div><div class="hw-kv" id="ftInfo"></div>' +
          '<div class="btns"><button class="btn primary" id="ftStart" type="button">开始 3 秒测试</button>' +
            '<button class="btn" id="ftStop" type="button">停止</button></div>' +
          '<div class="hw-status" id="ftStatus">点击开始后，页面会显示一个移动方块并统计帧间隔。</div></div>' +
        '<div class="panel"><div class="panel-h">测试画面</div>' +
          '<div class="hw-fps-stage" id="ftStage"><div class="hw-fps-box" id="ftBox"></div></div>' +
          '<div class="hw-fps-result" id="ftResult"></div></div>';

      var info = TB.$('#ftInfo', root);
      var stage = TB.$('#ftStage', root);
      var box = TB.$('#ftBox', root);
      var result = TB.$('#ftResult', root);
      var status = TB.$('#ftStatus', root);
      var rafId = 0;
      var running = false;

      info.innerHTML =
        '<div class="hw-kv-row"><span>屏幕分辨率</span><b>' + screen.width + ' × ' + screen.height + '</b></div>' +
        '<div class="hw-kv-row"><span>可用窗口</span><b>' + window.innerWidth + ' × ' + window.innerHeight + '</b></div>' +
        '<div class="hw-kv-row"><span>设备像素比</span><b>' + (window.devicePixelRatio || 1).toFixed(2) + '</b></div>';

      function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        box.style.left = '0px';
      }

      function start() {
        stop();
        running = true;
        var times = [];
        var startTime = 0;
        var last = 0;
        var maxLeft = Math.max(0, stage.clientWidth - box.offsetWidth);
        status.textContent = '测试中，请保持页面可见…';
        result.innerHTML = '<div class="hint">正在采集帧数据…</div>';

        function frame(ts) {
          if (!running || !stage.isConnected) { stop(); return; }
          if (!startTime) { startTime = ts; last = ts; }
          times.push(ts - last);
          last = ts;
          var progress = Math.min(1, (ts - startTime) / 3000);
          box.style.left = Math.round(progress * maxLeft) + 'px';
          if (ts - startTime >= 3000) {
            running = false;
            var valid = times.slice(1);
            var avg = valid.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, valid.length);
            var fps = 1000 / avg;
            var min = Math.min.apply(null, valid);
            var max = Math.max.apply(null, valid);
            var dropped = valid.filter(function (t) { return t > avg * 1.5; }).length;
            var refresh = Math.round(fps / 10) * 10;
            result.innerHTML =
              '<div class="hw-fps-big"><b>' + fps.toFixed(1) + '</b><span>FPS</span></div>' +
              '<div class="hw-kv-row"><span>估算刷新率</span><b>' + refresh + ' Hz</b></div>' +
              '<div class="hw-kv-row"><span>平均帧间隔</span><b>' + avg.toFixed(2) + ' ms</b></div>' +
              '<div class="hw-kv-row"><span>最短 / 最长</span><b>' + min.toFixed(2) + ' / ' + max.toFixed(2) + ' ms</b></div>' +
              '<div class="hw-kv-row"><span>明显掉帧</span><b>' + dropped + ' 次</b></div>' +
              '<p class="note">浏览器会把刷新率与显示器同步；省电模式、后台标签页或远程桌面可能把结果压低。</p>';
            status.textContent = '测试完成。';
            return;
          }
          rafId = requestAnimationFrame(frame);
        }
        rafId = requestAnimationFrame(frame);
      }

      TB.$('#ftStart', root).addEventListener('click', start);
      TB.$('#ftStop', root).addEventListener('click', function () { stop(); status.textContent = '已停止测试。'; });
      window.addEventListener('hashchange', stop, { once: true });
    }
  });

  /* --------------------------------------------------------- GPU */
  TB.def({
    slug: 'gpu-test',
    cat: 'web',
    name: 'GPU 图形性能测试',
    desc: '用 WebGL 绘制大量粒子并统计帧率，查看显卡渲染器信息。',
    icon: '🧮',
    kw: 'GPU 显卡 WebGL 性能 帧率 渲染器 测试 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">GPU 信息</div><div class="hw-kv" id="gtInfo"></div>' +
          '<div class="btns"><button class="btn primary" id="gtStart" type="button">开始 3 秒测试</button>' +
            '<button class="btn" id="gtStop" type="button">停止</button></div>' +
          '<div class="hw-status" id="gtStatus">测试会在本地用 WebGL 绘制粒子；没有 WebGL 时自动回退到 Canvas 2D。</div></div>' +
        '<div class="panel"><div class="panel-h">渲染画面</div>' +
          '<div class="hw-gl-wrap"><canvas class="hw-gl" id="gtCanvas" width="720" height="405"></canvas>' +
          '<div class="hw-gl-overlay" id="gtOverlay">等待开始</div></div>' +
          '<div class="hw-fps-result" id="gtResult"></div></div>';

      var canvas = TB.$('#gtCanvas', root);
      var info = TB.$('#gtInfo', root);
      var overlay = TB.$('#gtOverlay', root);
      var result = TB.$('#gtResult', root);
      var status = TB.$('#gtStatus', root);
      var rafId = 0;
      var running = false;
      var gl = null;
      var program = null;
      var points = null;
      var uTime = null;
      var fallback = false;

      function initGL() {
        gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return false;
        var vs = 'attribute vec2 p; uniform float t; varying vec3 c;' +
          'void main(){float a=t*0.6+float(gl_VertexID%7);' +
          'gl_Position=vec4(p.x*cos(a)-p.y*sin(a),p.x*sin(a)+p.y*cos(a),0.0,1.0);' +
          'gl_PointSize=2.0+float(gl_VertexID%5);c=vec3(0.35+0.5*abs(p.x),0.55,0.95);}';
        var fs = 'precision mediump float; varying vec3 c; void main(){gl_FragColor=vec4(c,0.85);}';
        function shader(type, src) {
          var s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
          return s;
        }
        try {
          program = gl.createProgram();
          gl.attachShader(program, shader(gl.VERTEX_SHADER, vs));
          gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fs));
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
          gl.useProgram(program);
          points = gl.createBuffer();
          var data = new Float32Array(20000 * 2);
          for (var i = 0; i < 20000; i++) {
            data[i * 2] = Math.random() * 2 - 1;
            data[i * 2 + 1] = Math.random() * 2 - 1;
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, points);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
          var loc = gl.getAttribLocation(program, 'p');
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
          uTime = gl.getUniformLocation(program, 't');
          return true;
        } catch (e) {
          program = null;
          return false;
        }
      }

      function infoGL() {
        if (!gl) {
          info.innerHTML = '<div class="hw-kv-row"><span>WebGL</span><b>不可用，使用 Canvas 2D 回退</b></div>';
          return;
        }
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        var vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        var renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        info.innerHTML = '<div class="hw-kv-row"><span>WebGL</span><b>' + (window.WebGL2RenderingContext && gl instanceof window.WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1') + '</b></div>' +
          '<div class="hw-kv-row"><span>厂商</span><b>' + TB.esc(vendor || '—') + '</b></div>' +
          '<div class="hw-kv-row"><span>渲染器</span><b>' + TB.esc(renderer || '—') + '</b></div>' +
          '<div class="hw-kv-row"><span>画布</span><b>' + canvas.width + ' × ' + canvas.height + '</b></div>';
      }

      function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }

      function start() {
        stop();
        running = true;
        overlay.style.display = 'none';
        result.innerHTML = '<div class="hint">正在渲染粒子…</div>';
        status.textContent = '测试中，请保持页面可见…';
        var start = 0;
        var last = 0;
        var frames = 0;
        fallback = !initGL();
        infoGL();
        if (fallback) {
          // WebGL 失败后同一个 canvas 不能再取 2D 上下文，替换成一张新的 2D 画布。
          var oldCanvas = canvas;
          var c = document.createElement('canvas');
          c.width = oldCanvas.width;
          c.height = oldCanvas.height;
          c.className = oldCanvas.className;
          oldCanvas.parentNode.replaceChild(c, oldCanvas);
          canvas = c;
          var c2 = canvas.getContext('2d');
          var dots = [];
          for (var i = 0; i < 1200; i++) dots.push({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 1 });
          var draw2d = function (ts) {
            if (!running || !canvas.isConnected) { stop(); return; }
            if (!start) start = ts;
            frames++;
            c2.fillStyle = '#0d1424';
            c2.fillRect(0, 0, canvas.width, canvas.height);
            c2.fillStyle = '#6ea8ff';
            dots.forEach(function (d) {
              c2.beginPath();
              c2.arc(d.x * canvas.width, d.y * canvas.height, d.s, 0, Math.PI * 2);
              c2.fill();
            });
            if (ts - start >= 3000) {
              running = false;
              var secs = (ts - start) / 1000;
              var fps = frames / secs;
              result.innerHTML = '<div class="hw-fps-big"><b>' + fps.toFixed(0) + '</b><span>FPS</span></div>' +
                '<div class="hw-kv-row"><span>模式</span><b>Canvas 2D 回退</b></div>' +
                '<div class="hw-kv-row"><span>绘制对象</span><b>' + dots.length + ' 个粒子</b></div>' +
                '<p class="note">当前环境没有 WebGL，结果主要反映 CPU 与 2D 绘制性能。</p>';
              status.textContent = '测试完成（2D 回退）。';
              return;
            }
            rafId = requestAnimationFrame(draw2d);
          };
          rafId = requestAnimationFrame(draw2d);
          return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        var drawGL = function (ts) {
          if (!running || !canvas.isConnected) { stop(); return; }
          if (!start) start = ts;
          frames++;
          gl.clearColor(0.05, 0.08, 0.14, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform1f(uTime, ts / 1000);
          gl.drawArrays(gl.POINTS, 0, 20000);
          if (ts - start >= 3000) {
            running = false;
            var secs = (ts - start) / 1000;
            var fps = frames / secs;
            result.innerHTML = '<div class="hw-fps-big"><b>' + fps.toFixed(0) + '</b><span>FPS</span></div>' +
              '<div class="hw-kv-row"><span>模式</span><b>' + (window.WebGL2RenderingContext && gl instanceof window.WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1') + '</b></div>' +
              '<div class="hw-kv-row"><span>绘制对象</span><b>20,000 个粒子</b></div>' +
              '<div class="hw-kv-row"><span>参考分数</span><b>' + Math.round(fps * 10) + '</b></div>' +
              '<p class="note">分数只用于同一设备前后对比，不代表专业显卡跑分；浏览器与驱动会影响结果。</p>';
            status.textContent = '测试完成。';
            return;
          }
          rafId = requestAnimationFrame(drawGL);
        };
        rafId = requestAnimationFrame(drawGL);
      }

      infoGL();
      TB.$('#gtStart', root).addEventListener('click', start);
      TB.$('#gtStop', root).addEventListener('click', function () { stop(); overlay.style.display = 'flex'; overlay.textContent = '已停止'; status.textContent = '已停止测试。'; });
      window.addEventListener('hashchange', stop, { once: true });
    }
  });

  /* --------------------------------------------------------- 扬声器 */
  TB.def({
    slug: 'speaker-test',
    cat: 'web',
    name: '扬声器 / 耳机测试',
    desc: '播放指定频率与声道的测试音，检查左右声道和耳机输出。',
    icon: '🔊',
    kw: '扬声器 耳机 声道 测试 频率 音频 左声道 右声道 硬件',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">测试音</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">频率 <b id="spFreqV">440</b> Hz</div><input class="input" type="range" id="spFreq" min="40" max="12000" step="10" value="440"></div>' +
            '<div class="field"><div class="label">声道</div><select class="select" id="spChannel">' +
              '<option value="both">左右同时</option><option value="left">左声道</option><option value="right">右声道</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">音量 <b id="spVolV">30</b>%</div><input class="input" type="range" id="spVol" min="1" max="80" value="30"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="spPlay" type="button">播放测试音</button>' +
            '<button class="btn" id="spStop" type="button">停止</button></div>' +
          '<div class="hw-status" id="spStatus">点击播放后，浏览器才会允许创建音频上下文。</div>' +
          '<p class="note">建议从较低音量开始；高频音可能刺耳。左右声道测试需要耳机或双声道扬声器。</p></div>' +
        '<div class="panel"><div class="panel-h">输出信息</div><div class="hw-kv" id="spInfo"><div class="hint">尚未播放。</div></div></div>';

      var freq = TB.$('#spFreq', root);
      var channel = TB.$('#spChannel', root);
      var vol = TB.$('#spVol', root);
      var status = TB.$('#spStatus', root);
      var info = TB.$('#spInfo', root);
      var audioCtx = null;
      var oscillator = null;
      var gain = null;
      var panner = null;

      function setStatus(text, type) {
        status.textContent = text;
        status.className = 'hw-status' + (type ? ' ' + type : '');
      }

      function stop() {
        if (oscillator) { try { oscillator.stop(); } catch (e) {} oscillator.disconnect(); oscillator = null; }
        if (gain) { gain.disconnect(); gain = null; }
        if (panner) { panner.disconnect(); panner = null; }
        if (audioCtx) { audioCtx.close().catch(function () {}); audioCtx = null; }
        setStatus('已停止。');
      }

      function play() {
        stop();
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var f = Number(freq.value);
          oscillator = audioCtx.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.value = f;
          gain = audioCtx.createGain();
          gain.gain.value = Number(vol.value) / 100;
          if (audioCtx.createStereoPanner) {
            panner = audioCtx.createStereoPanner();
            panner.pan.value = channel.value === 'left' ? -1 : channel.value === 'right' ? 1 : 0;
            oscillator.connect(gain);
            gain.connect(panner);
            panner.connect(audioCtx.destination);
          } else {
            oscillator.connect(gain);
            gain.connect(audioCtx.destination);
          }
          oscillator.start();
          audioCtx.resume();
          var label = channel.value === 'left' ? '左声道' : channel.value === 'right' ? '右声道' : '左右同时';
          info.innerHTML = '<div class="hw-kv-row"><span>频率</span><b>' + f + ' Hz</b></div>' +
            '<div class="hw-kv-row"><span>声道</span><b>' + label + '</b></div>' +
            '<div class="hw-kv-row"><span>音量</span><b>' + vol.value + '%</b></div>' +
            '<div class="hw-kv-row"><span>音频上下文</span><b>' + audioCtx.state + '</b></div>';
          setStatus('正在播放 ' + f + ' Hz · ' + label + '。', 'ok');
        } catch (e) {
          setStatus('播放失败：' + (e.message || e.name), 'bad');
        }
      }

      freq.addEventListener('input', function () { TB.$('#spFreqV', root).textContent = freq.value; });
      vol.addEventListener('input', function () { TB.$('#spVolV', root).textContent = vol.value; });
      TB.$('#spPlay', root).addEventListener('click', play);
      TB.$('#spStop', root).addEventListener('click', stop);
      window.addEventListener('hashchange', stop, { once: true });
    }
  });

})();
