/* =============================================================================
 * 浏览器文本朗读
 * -----------------------------------------------------------------------------
 * 使用系统 Web Speech API 在本机朗读文本，可调语速、音调、音量和语音。
 * 只播放，不生成、不上传音频文件。
 * ========================================================================== */
(function () {
  'use strict';

  TB.def({
    slug: 'tts',
    cat: 'office',
    name: '浏览器文本朗读',
    desc: '用系统语音朗读文本，可调语速、音调、音量和语音。',
    icon: '🔊',
    kw: '朗读 tts 语音 文本转语音 speech 听书 发音 无障碍',
    render: function (ctx) {
      var root = ctx.root;
      var supported = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
      root.innerHTML =
        '<div class="panel"><div class="panel-h">朗读内容</div>' +
          '<div class="field"><textarea class="input" id="ttsText" rows="7" spellcheck="false">简单工具箱是一个纯本地的在线工具站。所有文件处理都在浏览器里完成，不会上传到服务器。</textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">语音</div><select class="select" id="ttsVoice"><option value="">系统默认语音</option></select></div>' +
            '<div class="field"><div class="label">语速 <b id="ttsRateVal">1.0</b></div><input type="range" id="ttsRate" min="0.5" max="2" step="0.1" value="1"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">音调 <b id="ttsPitchVal">1.0</b></div><input type="range" id="ttsPitch" min="0" max="2" step="0.1" value="1"></div>' +
            '<div class="field"><div class="label">音量 <b id="ttsVolVal">1.0</b></div><input type="range" id="ttsVol" min="0" max="1" step="0.1" value="1"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="ttsPlay" type="button">开始朗读</button>' +
            '<button class="btn" id="ttsPause" type="button">暂停</button>' +
            '<button class="btn" id="ttsStop" type="button">停止</button></div>' +
          '<div class="kv" style="margin-top:12px"><div class="kv-item"><div class="kv-k">状态</div><div class="kv-v" id="ttsStatus">待机</div></div>' +
            '<div class="kv-item"><div class="kv-k">字符数</div><div class="kv-v" id="ttsCount">0</div></div>' +
            '<div class="kv-item"><div class="kv-k">可用语音</div><div class="kv-v" id="ttsVoices">0</div></div></div>' +
        '</div>' +
        '<p class="note">朗读使用操作系统的语音引擎，声音效果取决于本机安装的语音包；只播放，不会生成音频文件。部分浏览器需要先点击一次「开始朗读」才允许发声。</p>';

      var text = TB.$('#ttsText', root);
      var voiceSel = TB.$('#ttsVoice', root);
      var status = TB.$('#ttsStatus', root);
      var count = TB.$('#ttsCount', root);
      var voiceCount = TB.$('#ttsVoices', root);
      var play = TB.$('#ttsPlay', root);
      var pause = TB.$('#ttsPause', root);
      var stop = TB.$('#ttsStop', root);
      var utterance = null;

      function updateCount() { count.textContent = text.value.length + ' 字'; }
      text.addEventListener('input', updateCount);
      updateCount();

      function loadVoices() {
        if (!supported) return;
        var voices = window.speechSynthesis.getVoices() || [];
        var current = voiceSel.value;
        voiceSel.innerHTML = '<option value="">系统默认语音</option>' + voices.map(function (v, i) {
          var label = v.name + (v.lang ? ' · ' + v.lang : '') + (v.default ? '（默认）' : '');
          return '<option value="' + i + '">' + TB.esc(label) + '</option>';
        }).join('');
        if (current && voices[parseInt(current, 10)]) voiceSel.value = current;
        voiceCount.textContent = String(voices.length);
      }
      if (supported) {
        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      } else {
        status.textContent = '当前浏览器不支持';
        play.disabled = true;
        pause.disabled = true;
        stop.disabled = true;
      }

      function updateLabels() {
        TB.$('#ttsRateVal', root).textContent = Number(TB.$('#ttsRate', root).value).toFixed(1);
        TB.$('#ttsPitchVal', root).textContent = Number(TB.$('#ttsPitch', root).value).toFixed(1);
        TB.$('#ttsVolVal', root).textContent = Number(TB.$('#ttsVol', root).value).toFixed(1);
      }
      ['ttsRate', 'ttsPitch', 'ttsVol'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('input', updateLabels);
      });
      updateLabels();

      play.addEventListener('click', function () {
        if (!supported) return;
        var content = text.value.trim();
        if (!content) { TB.toast('请先输入要朗读的文本'); return; }
        window.speechSynthesis.cancel();
        utterance = new SpeechSynthesisUtterance(content);
        var voices = window.speechSynthesis.getVoices() || [];
        var idx = voiceSel.value === '' ? -1 : parseInt(voiceSel.value, 10);
        if (idx >= 0 && voices[idx]) {
          utterance.voice = voices[idx];
          utterance.lang = voices[idx].lang;
        }
        utterance.rate = parseFloat(TB.$('#ttsRate', root).value);
        utterance.pitch = parseFloat(TB.$('#ttsPitch', root).value);
        utterance.volume = parseFloat(TB.$('#ttsVol', root).value);
        utterance.onstart = function () { status.textContent = '正在朗读'; };
        utterance.onend = function () { status.textContent = '已结束'; pause.textContent = '暂停'; };
        utterance.onerror = function (e) {
          if (e.error !== 'interrupted' && e.error !== 'canceled') status.textContent = '朗读失败：' + (e.error || '未知错误');
          pause.textContent = '暂停';
        };
        status.textContent = '准备中';
        window.speechSynthesis.speak(utterance);
      });

      pause.addEventListener('click', function () {
        if (!supported || !window.speechSynthesis.speaking) return;
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          pause.textContent = '暂停';
          status.textContent = '正在朗读';
        } else {
          window.speechSynthesis.pause();
          pause.textContent = '继续';
          status.textContent = '已暂停';
        }
      });

      stop.addEventListener('click', function () {
        if (!supported) return;
        window.speechSynthesis.cancel();
        status.textContent = '已停止';
        pause.textContent = '暂停';
      });
    }
  });
})();
