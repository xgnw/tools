/* =============================================================================
 * 密码强度检测
 * -----------------------------------------------------------------------------
 * 本地估算字符集与熵值，给出长度、字符种类和常见弱密码提示。
 * 不保存、不上传、不记录输入内容。
 * ========================================================================== */
(function () {
  'use strict';
  var COMMON = ['123456', 'password', '12345678', 'qwerty', '123456789', '111111', 'abc123', '123123', 'admin', 'letmein', 'welcome', 'monkey', '000000', 'iloveyou', 'password1'];

  TB.def({
    slug: 'passstrength',
    cat: 'web',
    name: '密码强度检测',
    desc: '本地估算密码长度、字符集与熵值，提示常见弱密码风险。',
    icon: '🔐',
    kw: '密码 强度 检测 熵 弱密码 安全 字符',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">输入密码 <span class="hint">输入只在本机内存中计算</span></div>' +
          '<div class="field"><div class="label"><b>待检测密码</b></div><input class="input" id="psInput" type="password" autocomplete="off" spellcheck="false" placeholder="输入后即时评估"></div>' +
          '<div class="checks"><label><input type="checkbox" id="psShow"> 显示密码</label></div>' +
          '<div class="strengthBar"><div class="strengthFill" id="psFill"></div></div>' +
          '<div class="kv" style="margin-top:12px">' +
            '<div class="kv-item"><div class="kv-k">强度</div><div class="kv-v" id="psLevel">等待输入</div></div>' +
            '<div class="kv-item"><div class="kv-k">估算熵值</div><div class="kv-v" id="psEntropy">0 bit</div></div>' +
            '<div class="kv-item"><div class="kv-k">字符种类</div><div class="kv-v" id="psClasses">0 类</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">改进建议</div><div id="psTips" style="font-size:12.5px;line-height:1.8;color:var(--ink-2)">输入密码后显示建议。</div></div>' +
        '<p class="note">熵值只是粗略估算，不代表密码一定安全。真正重要的还包括是否泄露、是否复用、是否使用密码管理器；请勿把真实密码粘贴到不可信的页面。</p>';

      var input = TB.$('#psInput', root);
      var show = TB.$('#psShow', root);
      var fill = TB.$('#psFill', root);
      var level = TB.$('#psLevel', root);
      var entropyEl = TB.$('#psEntropy', root);
      var classesEl = TB.$('#psClasses', root);
      var tips = TB.$('#psTips', root);

      function analyze(value) {
        if (!value) return { score: 0, entropy: 0, classes: 0, tips: ['请输入密码。'] };
        var lower = /[a-z]/.test(value), upper = /[A-Z]/.test(value), digit = /\d/.test(value), symbol = /[^A-Za-z0-9]/.test(value);
        var classes = [lower, upper, digit, symbol].filter(Boolean).length;
        var charset = 0;
        if (lower) charset += 26;
        if (upper) charset += 26;
        if (digit) charset += 10;
        if (symbol) charset += 32;
        var entropy = Math.round(value.length * (charset ? Math.log2(charset) : 0));
        var score = Math.min(100, Math.round(entropy / 80 * 100));
        var list = [];
        var normalized = value.toLowerCase();

        if (COMMON.indexOf(normalized) >= 0) {
          score = Math.min(score, 12);
          list.push('这是常见弱密码，几乎肯定会被字典攻击命中。');
        }
        if (value.length < 8) {
          score = Math.min(score, 30);
          list.push('长度不足 8 位，建议至少 12–16 位。');
        } else if (value.length < 12) {
          list.push('长度还可以再加长，12 位以上更稳妥。');
        }
        if (classes < 3) {
          score = Math.min(score, 55);
          list.push('字符种类偏少，可以混合大小写、数字和符号。');
        }
        if (/^(.)\1{3,}$/.test(value)) {
          score = Math.min(score, 20);
          list.push('重复使用同一个字符，实际强度很低。');
        }
        if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(value)) {
          score = Math.min(score, 45);
          list.push('包含明显的连续序列，容易被模式匹配。');
        }
        if (!list.length) list.push('长度和字符种类都不错；继续避免复用密码，并优先使用密码管理器保存。');
        return { score: score, entropy: entropy, classes: classes, tips: list };
      }

      function render() {
        var value = input.value;
        if (!value) {
          fill.style.width = '0%';
          fill.style.background = 'var(--line-2)';
          level.textContent = '等待输入';
          entropyEl.textContent = '0 bit';
          classesEl.textContent = '0 类';
          tips.textContent = '输入密码后显示建议。';
          return;
        }
        var r = analyze(value);
        fill.style.width = Math.max(4, r.score) + '%';
        fill.style.background = r.score < 35 ? 'var(--danger)' : (r.score < 65 ? '#f59e0b' : (r.score < 85 ? '#3b82f6' : 'var(--ok)'));
        level.textContent = r.score < 35 ? '弱' : (r.score < 65 ? '中' : (r.score < 85 ? '强' : '很强'));
        entropyEl.textContent = r.entropy + ' bit';
        classesEl.textContent = r.classes + ' 类';
        tips.innerHTML = r.tips.map(function (t) { return '<div>· ' + TB.esc(t) + '</div>'; }).join('');
      }

      input.addEventListener('input', render);
      show.addEventListener('change', function () { input.type = show.checked ? 'text' : 'password'; });
      render();
    }
  });
})();
