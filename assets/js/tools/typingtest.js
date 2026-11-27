/* =============================================================================
 * 打字速度测试
 * -----------------------------------------------------------------------------
 * 自定义练习文本，输入时逐字高亮对错，统计时间、字/分、正确率和进度。
 * 可选 30 / 60 / 120 秒限时或不计时；纯前端，不保存输入内容。
 * ========================================================================== */

(function () {
  'use strict';

  var SAMPLES = [
    '简单工具箱是一个纯浏览器本地处理的在线工具集合，不需要登录，也不会上传你的文件。打字时请保持节奏，准确比速度更重要。',
    'The quick brown fox jumps over the lazy dog. Practice makes progress, so keep typing one word at a time.'
  ];
  var sampleIndex = 0;

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note ty-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function clock(ms) {
    var total = Math.max(0, Math.floor(ms / 100));
    var sec = Math.floor(total / 10), tenth = total % 10;
    return (sec < 10 ? '0' : '') + sec + '.' + tenth + 's';
  }

  TB.def({
    slug: 'typing-test', cat: 'fun', name: '打字速度测试', desc: '自定义文本 · 字/分 · 正确率',
    icon: '⌨️', kw: '打字 速度 测试 打字练习 wpm cpm 正确率 键盘 练习',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">练习设置<span class="hint">第一次输入开始计时</span></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>限时</b></div><select class="input" id="tpLimit">' +
              '<option value="30">30 秒</option><option value="60" selected>60 秒</option>' +
              '<option value="120">120 秒</option><option value="0">不限时</option></select></div>' +
            '<div class="field"><div class="label"><b>练习文本</b></div><textarea class="textarea ty-text" id="tpText" spellcheck="false"></textarea></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="tpApply" type="button">应用文本</button>' +
            '<button class="btn" id="tpNext" type="button">换一段</button>' +
            '<button class="btn" id="tpReset" type="button">重新开始</button></div>' +
          '<div id="tpMsg"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">开始打字<span class="hint">正确输入会变绿，错误会变红</span></div>' +
          '<div class="ty-stats">' +
            '<div><span>时间</span><b id="tpTime">00.0s</b></div>' +
            '<div><span>速度</span><b id="tpSpeed">0</b><i>字/分</i></div>' +
            '<div><span>正确率</span><b id="tpAcc">0</b><i>%</i></div>' +
            '<div><span>进度</span><b id="tpProg">0</b><i>%</i></div>' +
          '</div>' +
          '<div class="ty-target" id="tpTarget" aria-live="polite"></div>' +
          '<div class="field ty-input-wrap"><textarea class="textarea ty-input" id="tpInput" spellcheck="false" autocomplete="off" placeholder="在这里开始输入…"></textarea></div>' +
          '<div class="note">速度按已输入字符数 / 已用时间计算，中文以“字/分”显示；标点和空格也会计入。刷新页面不会保留成绩和文本。</div>' +
        '</div>';

      var limitSel = TB.$('#tpLimit', root), textSrc = TB.$('#tpText', root);
      var targetEl = TB.$('#tpTarget', root), input = TB.$('#tpInput', root);
      var timeEl = TB.$('#tpTime', root), speedEl = TB.$('#tpSpeed', root);
      var accEl = TB.$('#tpAcc', root), progEl = TB.$('#tpProg', root), msg = TB.$('#tpMsg', root);
      var target = '';
      var startedAt = 0, timer = null, running = false, finished = false;

      function stopTimer() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      function cleanText(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
      }

      function reset() {
        stopTimer();
        running = false; finished = false; startedAt = 0;
        input.readOnly = false; input.value = '';
        timeEl.textContent = '00.0s'; speedEl.textContent = '0';
        accEl.textContent = '0'; progEl.textContent = '0';
        status(msg, '');
        renderTarget();
        input.focus();
      }

      function renderTarget() {
        var typed = input.value;
        var html = '';
        for (var i = 0; i < target.length; i++) {
          var cls = '';
          if (i < typed.length) cls = typed[i] === target[i] ? 'ok' : 'bad';
          else if (i === typed.length) cls = 'cur';
          var ch = target[i];
          html += '<span class="' + cls + '">' + (ch === ' ' ? '&nbsp;' : TB.esc(ch)) + '</span>';
        }
        targetEl.innerHTML = html;
      }

      function stats() {
        var typed = input.value;
        var good = 0, len = Math.min(typed.length, target.length);
        for (var i = 0; i < len; i++) if (typed[i] === target[i]) good++;
        var elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
        var speed = elapsed >= 0.8 && typed.length ? Math.round(typed.length / (elapsed / 60)) : 0;
        var acc = typed.length ? Math.round(good / typed.length * 100) : 0;
        var prog = target.length ? Math.min(100, Math.round(typed.length / target.length * 100)) : 0;
        timeEl.textContent = clock(elapsed * 1000);
        speedEl.textContent = String(speed);
        accEl.textContent = String(acc);
        progEl.textContent = String(prog);
        return { typed: typed, good: good, elapsed: elapsed, prog: prog };
      }

      function finish(reason) {
        if (finished) return;
        finished = true; running = false;
        stopTimer();
        stats(); renderTarget();
        input.readOnly = true;
        status(msg, reason || '完成，点击“重新开始”再来一次', false);
      }

      function tick() {
        if (!root.isConnected) { stopTimer(); return; }
        if (!running) return;
        var s = stats();
        var limit = Number(limitSel.value) || 0;
        if (limit && s.elapsed >= limit) finish('时间到，本次练习结束');
        else if (s.typed.length >= target.length) finish('已输入完全部文本');
      }

      function begin() {
        if (running || finished) return;
        running = true; startedAt = Date.now();
        stopTimer();
        timer = setInterval(tick, 100);
      }

      input.addEventListener('input', function () {
        if (finished) return;
        if (!running) begin();
        stats(); renderTarget();
        tick();
      });

      TB.$('#tpApply', root).addEventListener('click', function () {
        var t = cleanText(textSrc.value);
        if (!t) { status(msg, '请输入练习文本', true); return; }
        target = t; reset(); status(msg, '已应用练习文本');
      });
      TB.$('#tpNext', root).addEventListener('click', function () {
        sampleIndex = (sampleIndex + 1) % SAMPLES.length;
        textSrc.value = SAMPLES[sampleIndex];
        target = cleanText(textSrc.value);
        reset(); status(msg, '已换一段文本');
      });
      TB.$('#tpReset', root).addEventListener('click', function () {
        target = cleanText(textSrc.value);
        if (!target) { status(msg, '请输入练习文本', true); return; }
        reset(); status(msg, '重新开始，第一次输入开始计时');
      });
      limitSel.addEventListener('change', function () { reset(); });

      textSrc.value = SAMPLES[0];
      target = cleanText(textSrc.value);
      reset();
    }
  });
})();

