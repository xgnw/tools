/* =============================================================================
 * 在线钢琴
 * -----------------------------------------------------------------------------
 * 用 Web Audio 直接合成声音，不依赖音频文件：
 *   - 双八度键盘，支持鼠标、触屏和电脑键盘
 *   - 音色、音量、延音可调
 *   - 内置三首公共领域练习曲，可播放和停止
 * ========================================================================== */

(function () {
  'use strict';

  var NOTES = [
    { n: 'C3',  m: 48, key: 'z' },
    { n: 'C#3', m: 49, key: 's', black: 0 },
    { n: 'D3',  m: 50, key: 'x' },
    { n: 'D#3', m: 51, key: 'd', black: 1 },
    { n: 'E3',  m: 52, key: 'c' },
    { n: 'F3',  m: 53, key: 'v' },
    { n: 'F#3', m: 54, key: 'g', black: 3 },
    { n: 'G3',  m: 55, key: 'b' },
    { n: 'G#3', m: 56, key: 'h', black: 4 },
    { n: 'A3',  m: 57, key: 'n' },
    { n: 'A#3', m: 58, key: 'j', black: 5 },
    { n: 'B3',  m: 59, key: 'm' },
    { n: 'C4',  m: 60, key: 'q' },
    { n: 'C#4', m: 61, key: '2', black: 7 },
    { n: 'D4',  m: 62, key: 'w' },
    { n: 'D#4', m: 63, key: '3', black: 8 },
    { n: 'E4',  m: 64, key: 'e' },
    { n: 'F4',  m: 65, key: 'r' },
    { n: 'F#4', m: 66, key: '5', black: 10 },
    { n: 'G4',  m: 67, key: 't' },
    { n: 'G#4', m: 68, key: '6', black: 11 },
    { n: 'A4',  m: 69, key: 'y' },
    { n: 'A#4', m: 70, key: '7', black: 12 },
    { n: 'B4',  m: 71, key: 'u' }
  ];

  var WHITE = NOTES.filter(function (x) { return x.black === undefined; });

  var SONGS = [
    {
      name: '小星星', tempo: 100,
      notes: [
        ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
        ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2],
        ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
        ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
        ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
        ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2]
      ]
    },
    {
      name: '欢乐颂', tempo: 96,
      notes: [
        ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 2],
        ['E4', 1], ['F4', 1], ['G4', 2], ['E4', 1], ['F4', 1], ['G4', 2],
        ['G4', 1], ['A4', 1], ['B4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['B4', 1], ['G4', 2],
        ['B4', 1], ['C4', 1], ['D4', 2], ['B4', 1], ['C4', 1], ['D4', 2]
      ]
    },
    {
      name: '生日快乐', tempo: 92,
      notes: [
        ['C4', 1], ['C4', 1], ['D4', 2], ['C4', 2], ['F4', 2], ['E4', 2],
        ['C4', 1], ['C4', 1], ['D4', 2], ['C4', 2], ['G4', 2], ['F4', 2],
        ['C4', 1], ['C4', 1], ['C4', 2], ['A4', 2], ['F4', 2], ['E4', 2], ['D4', 2],
        ['A#4', 1], ['A#4', 1], ['A4', 2], ['F4', 2], ['G4', 2], ['F4', 2]
      ]
    }
  ];

  function midiOf(name) {
    for (var i = 0; i < NOTES.length; i++) if (NOTES[i].n === name) return NOTES[i].m;
    return null;
  }

  function freq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  TB.def({
    slug: 'piano', cat: 'fun', name: '在线钢琴', icon: '🎹',
    desc: '双八度键盘，弹奏与示例曲',
    kw: '钢琴 音乐 演奏 键盘 音符 音色 小星星 欢乐颂 生日快乐 声音',
    render: function (ctx) {
      var root = ctx.root;

      var whiteHtml = WHITE.map(function (note) {
        return '<button class="pn-key pn-white" type="button" data-midi="' + note.m + '">' +
          '<span class="pn-note">' + note.n + '</span>' +
          '<span class="pn-keycap">' + note.key + '</span>' +
        '</button>';
      }).join('');

      var blackHtml = NOTES.filter(function (n) { return n.black !== undefined; }).map(function (note) {
        var left = (note.black + 1) * (100 / WHITE.length);
        return '<button class="pn-key pn-black" type="button" data-midi="' + note.m + '" ' +
          'style="left:calc(' + left.toFixed(4) + '% - var(--pn-black-w)/2)">' +
          '<span class="pn-keycap">' + note.key + '</span>' +
        '</button>';
      }).join('');

      root.innerHTML =
        '<div class="panel">' +
          '<div class="pn-toolbar">' +
            '<div class="pn-field"><div class="label">音色</div>' +
              '<select class="select" id="pnWave">' +
                '<option value="triangle">三角波 · 柔和</option>' +
                '<option value="sine">正弦波 · 纯净</option>' +
                '<option value="square">方波 · 电子</option>' +
                '<option value="sawtooth">锯齿波 · 明亮</option>' +
              '</select></div>' +
            '<div class="pn-field pn-vol"><div class="label">音量 <b id="pnVolVal">35%</b></div>' +
              '<input type="range" id="pnVol" min="10" max="90" value="35"></div>' +
            '<label class="pn-check"><input type="checkbox" id="pnSustain"> 延音</label>' +
          '</div>' +

          '<div class="pn-board" id="pnBoard">' +
            '<div class="pn-whites">' + whiteHtml + '</div>' +
            '<div class="pn-blacks">' + blackHtml + '</div>' +
          '</div>' +
          '<div class="pn-tip">点击琴键，或按键盘上的字母 / 数字键。黑键对应上方一排按键。</div>' +

          '<div class="panel-h" style="margin-top:22px">示例曲</div>' +
          '<div class="btns" id="pnSongs">' +
            SONGS.map(function (s, i) {
              return '<button class="btn" type="button" data-song="' + i + '">♪ ' + s.name + '</button>';
            }).join('') +
            '<button class="btn" type="button" id="pnStop" disabled>停止</button>' +
          '</div>' +
          '<div id="pnMsg"></div>' +
          '<div class="note">示例曲只使用公共领域旋律；声音由浏览器实时合成，不会下载音频文件。首次点击琴键后才会启动音频。</div>' +
        '</div>';

      var board = TB.$('#pnBoard', root);
      var wave = TB.$('#pnWave', root);
      var volEl = TB.$('#pnVol', root);
      var volVal = TB.$('#pnVolVal', root);
      var sustain = TB.$('#pnSustain', root);
      var stopBtn = TB.$('#pnStop', root);
      var msgEl = TB.$('#pnMsg', root);

      var audio = null;
      var master = null;
      var active = {};            // midi -> { osc, gain }
      var volume = 0.35;
      var songToken = 0;
      var songTimer = null;

      function ensureAudio() {
        if (!audio) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) throw new Error('当前浏览器不支持 Web Audio，无法播放钢琴声音');
          audio = new AC();
          master = audio.createGain();
          master.gain.value = 1;
          master.connect(audio.destination);
        }
        if (audio.state === 'suspended') audio.resume();
        return audio;
      }

      function keyOn(midi) {
        ensureAudio();
        if (active[midi]) return;
        var now = audio.currentTime;
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.type = wave.value;
        osc.frequency.setValueAtTime(freq(midi), now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.55), now + 0.018);
        gain.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.12);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        active[midi] = { osc: osc, gain: gain };
        setKeyOn(midi, true);
      }

      function keyOff(midi) {
        var a = active[midi];
        if (!a || !audio) return;
        delete active[midi];
        var now = audio.currentTime;
        var release = sustain.checked ? 0.85 : 0.14;
        a.gain.gain.cancelScheduledValues(now);
        a.gain.gain.setValueAtTime(Math.max(0.0001, a.gain.gain.value), now);
        a.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
        a.osc.stop(now + release + 0.02);
        setKeyOn(midi, false);
      }

      function blip(midi, duration) {
        ensureAudio();
        var now = audio.currentTime;
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        var end = now + duration;
        osc.type = wave.value;
        osc.frequency.setValueAtTime(freq(midi), now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.55), now + 0.015);
        gain.gain.setValueAtTime(volume * 0.4, Math.max(now + 0.016, end - 0.08));
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(end + 0.02);
        setKeyOn(midi, true);
        setTimeout(function () { setKeyOn(midi, false); }, Math.max(0, duration * 1000));
      }

      function setKeyOn(midi, on) {
        var keys = board.querySelectorAll('.pn-key[data-midi="' + midi + '"]');
        Array.prototype.forEach.call(keys, function (k) { k.classList.toggle('on', on); });
      }

      function allOff() {
        Object.keys(active).forEach(function (m) { keyOff(Number(m)); });
        Array.prototype.forEach.call(board.querySelectorAll('.pn-key.on'), function (k) {
          k.classList.remove('on');
        });
      }

      function stopSong() {
        songToken++;
        if (songTimer) { clearTimeout(songTimer); songTimer = null; }
        allOff();
        stopBtn.disabled = true;
        msgEl.innerHTML = '';
      }

      wave.addEventListener('change', function () {
        Object.keys(active).forEach(function (m) { active[m].osc.type = wave.value; });
      });

      volEl.addEventListener('input', function () {
        volume = Number(volEl.value) / 100;
        volVal.textContent = volEl.value + '%';
        if (audio) {
          Object.keys(active).forEach(function (m) {
            active[m].gain.gain.setTargetAtTime(volume * 0.35, audio.currentTime, 0.06);
          });
        }
      });

      /* 屏幕琴键：按下发声，松开止音 */
      board.addEventListener('pointerdown', function (e) {
        var key = e.target.closest && e.target.closest('.pn-key');
        if (!key) return;
        e.preventDefault();
        key.setPointerCapture && key.setPointerCapture(e.pointerId);
        keyOn(Number(key.getAttribute('data-midi')));
      });

      board.addEventListener('pointerup', function (e) {
        var key = e.target.closest && e.target.closest('.pn-key');
        if (!key) return;
        keyOff(Number(key.getAttribute('data-midi')));
      });

      board.addEventListener('pointercancel', function (e) {
        var key = e.target.closest && e.target.closest('.pn-key');
        if (!key) return;
        keyOff(Number(key.getAttribute('data-midi')));
      });

      /* 电脑键盘映射 */
      var keyMap = {};
      NOTES.forEach(function (n) { keyMap[n.key] = n.m; });

      function onKeyDown(e) {
        if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
        var tag = (e.target && e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        var midi = keyMap[e.key.toLowerCase()];
        if (midi === undefined) return;
        e.preventDefault();
        keyOn(midi);
      }

      function onKeyUp(e) {
        var midi = keyMap[e.key.toLowerCase()];
        if (midi === undefined) return;
        e.preventDefault();
        keyOff(midi);
      }

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', allOff);

      /* 示例曲 */
      function playSong(song) {
        stopSong();
        var token = ++songToken;
        stopBtn.disabled = false;
        msgEl.innerHTML = '<div class="note" style="margin-top:10px">正在播放：' + TB.esc(song.name) + '</div>';
        var step = 60 / song.tempo;

        (async function () {
          for (var i = 0; i < song.notes.length; i++) {
            if (token !== songToken) return;
            var name = song.notes[i][0];
            var beats = song.notes[i][1];
            var midi = midiOf(name);
            if (midi !== null) blip(midi, Math.max(0.18, step * beats * 0.92));
            await sleep(step * beats * 1000);
          }
          if (token === songToken) {
            stopBtn.disabled = true;
            msgEl.innerHTML = '<div class="note" style="margin-top:10px">播放完毕。可以继续自由弹奏。</div>';
          }
        })();
      }

      TB.$('#pnSongs', root).addEventListener('click', function (e) {
        var idx = e.target.getAttribute && e.target.getAttribute('data-song');
        if (idx === null || idx === undefined) return;
        playSong(SONGS[Number(idx)]);
      });

      stopBtn.addEventListener('click', function () {
        stopSong();
        msgEl.innerHTML = '<div class="note" style="margin-top:10px">已停止。</div>';
      });

      /* 页面离开时释放音频。工具页切换会替换 #app 内容，这里用定时器兜底清理。 */
      var aliveTimer = setInterval(function () {
        if (board.isConnected) return;
        clearInterval(aliveTimer);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', allOff);
        stopSong();
        if (audio) { try { audio.close(); } catch (e) {} audio = null; master = null; }
      }, 1000);
    }
  });
})();
