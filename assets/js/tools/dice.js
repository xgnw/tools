/* =============================================================================
 * 骰子模拟器
 * -----------------------------------------------------------------------------
 * 一次掷 1–6 个骰子，支持 d4/d6/d8/d10/d12/d20、固定加值与最近 10 次记录。
 * 只使用 Math.random，在浏览器本地演示概率与点数分布。
 * ========================================================================== */
(function () {
  'use strict';

  var SIDES = [4, 6, 8, 10, 12, 20];
  var D6_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  function randInt(max) { return Math.floor(Math.random() * max) + 1; }

  TB.def({
    slug: 'dice',
    cat: 'fun',
    name: '骰子模拟器',
    desc: '掷 1–6 个骰子，支持 d4–d20、加值与历史记录。',
    icon: '🎲',
    kw: '骰子 掷骰 随机 跑团 d20 d6 概率 游戏',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">掷骰设置</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">骰子数量</div><select class="select" id="dcCount">' +
              [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '">' + n + ' 个</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><div class="label">骰子面数</div><select class="select" id="dcSides">' +
              SIDES.map(function (s) { return '<option value="' + s + '"' + (s === 6 ? ' selected' : '') + '>d' + s + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><div class="label">加值</div><input class="input" type="number" id="dcMod" value="0" step="1"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="dcRoll" type="button">掷骰</button>' +
            '<button class="btn" id="dcClear" type="button">清空记录</button>' +
            '<button class="btn" id="dcCopy" type="button">复制结果</button></div></div>' +
        '<div class="panel"><div class="panel-h">本次结果</div>' +
          '<div class="dice-grid" id="dcDice"></div>' +
          '<div class="dice-total" id="dcTotal"></div></div>' +
        '<div class="panel"><div class="panel-h">最近 10 次</div><div class="dice-history" id="dcHistory"></div></div>' +
        '<p class="note">每颗骰子的点数独立随机；加值会加到总点数上，不影响单颗骰子。记录只保存在当前页面内存中，刷新即清空。</p>';

      var count = TB.$('#dcCount', root);
      var sides = TB.$('#dcSides', root);
      var mod = TB.$('#dcMod', root);
      var diceBox = TB.$('#dcDice', root);
      var totalBox = TB.$('#dcTotal', root);
      var historyBox = TB.$('#dcHistory', root);
      var history = [];
      var lastSummary = '';

      function renderDice(values, side) {
        diceBox.innerHTML = values.map(function (v, i) {
          var face = side === 6 ? D6_FACES[v - 1] : String(v);
          return '<div class="die" style="animation-delay:' + (i * 20) + 'ms" title="第' + (i + 1) + '颗：' + v + '"><span class="die-face">' + face + '</span><small>d' + side + '</small></div>';
        }).join('');
      }

      function renderHistory() {
        if (!history.length) {
          historyBox.innerHTML = '<div class="hint">还没有记录，先掷一次。</div>';
          return;
        }
        historyBox.innerHTML = history.map(function (item, i) {
          return '<div class="dice-history-item"><b>' + TB.esc(item.text) + '</b><span>' + TB.esc(item.time) + '</span></div>';
        }).join('');
      }

      function roll() {
        var n = Number(count.value);
        var side = Number(sides.value);
        var bonus = Number(mod.value);
        if (bonus === '' || !isFinite(bonus)) bonus = 0;
        bonus = Math.round(bonus);

        var values = [];
        var sum = 0;
        for (var i = 0; i < n; i++) {
          var v = randInt(side);
          values.push(v);
          sum += v;
        }
        var total = sum + bonus;
        var avg = total / n;

        renderDice(values, side);
        totalBox.innerHTML =
          '<div><span>点数和</span><b>' + sum + '</b></div>' +
          '<div><span>加值</span><b>' + (bonus >= 0 ? '+' : '') + bonus + '</b></div>' +
          '<div><span>平均（含加值）</span><b>' + Number(avg.toFixed(2)) + '</b></div>' +
          '<div class="dice-sum"><span>总点数</span><b>' + total + '</b></div>';

        var time = new Date();
        var timeText = [time.getHours(), time.getMinutes(), time.getSeconds()].map(function (t) {
          return t < 10 ? '0' + t : String(t);
        }).join(':');
        var text = values.join(' + ') + (bonus ? (bonus > 0 ? ' + ' + bonus : ' − ' + Math.abs(bonus)) : '') + ' = ' + total;
        history.unshift({ text: text, time: 'd' + side + ' · ' + timeText });
        history = history.slice(0, 10);
        renderHistory();
        lastSummary = '掷骰结果：' + text + '（单颗：' + values.join('、') + '）';
      }

      TB.$('#dcRoll', root).addEventListener('click', roll);
      TB.$('#dcClear', root).addEventListener('click', function () {
        history = [];
        renderHistory();
        lastSummary = '';
      });
      TB.$('#dcCopy', root).addEventListener('click', function () {
        if (lastSummary) TB.copy(lastSummary);
      });
      [count, sides, mod].forEach(function (el) {
        el.addEventListener('change', function () { totalBox.innerHTML = ''; diceBox.innerHTML = ''; });
      });

      roll();
    }
  });
})();
