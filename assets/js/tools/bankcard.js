/* =============================================================================
 * 银行卡校验
 * -----------------------------------------------------------------------------
 * 按 Luhn 算法校验卡号，并识别常见卡组织前缀。
 * 只做格式校验，不联网、不验证真实发卡行、余额或有效期。
 * ========================================================================== */
(function () {
  'use strict';

  var TEST_NUMBER = '4242424242424242';

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatCard(value) {
    return digitsOnly(value).replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function luhnCheck(digits) {
    var sum = 0;
    var alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = parseInt(digits.charAt(i), 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function checkDigit(partial) {
    for (var d = 0; d <= 9; d++) {
      if (luhnCheck(partial + d)) return d;
    }
    return -1;
  }

  function detectBrand(digits) {
    if (!digits) return '未知';
    if (/^4/.test(digits)) return 'Visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^62/.test(digits)) return 'UnionPay 银联';
    if (/^35/.test(digits)) return 'JCB';
    if (/^(6011|65|64[4-9]|622)/.test(digits)) return 'Discover';
    if (/^3(0[0-5]|[68])/.test(digits)) return 'Diners Club';
    if (/^(5018|5020|5038|56|57|58|6304|6759|676[1-3])/.test(digits)) return 'Maestro';
    return '未知';
  }

  TB.def({
    slug: 'bankcard',
    cat: 'data',
    name: '银行卡校验',
    desc: '用 Luhn 算法校验银行卡号并识别常见卡组织，不联网。',
    icon: '💳',
    kw: '银行卡 信用卡 卡号 luhn 校验 visa mastercard 银联',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">卡号输入 <span class="hint">只做格式校验，不代表卡号真实存在</span></div>' +
          '<div class="field"><div class="label"><b>银行卡号</b></div>' +
            '<input class="input" id="bcInput" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="输入 12–19 位卡号">' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="bcRun" type="button">校验卡号</button>' +
            '<button class="btn" id="bcTest" type="button">填入测试号</button>' +
            '<button class="btn" id="bcCheck" type="button">计算校验位</button>' +
            '<button class="btn" id="bcCopy" type="button">复制卡号</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">校验结果</div>' +
          '<div id="bcResult"><div style="color:var(--ink-3);font-size:12.5px">输入卡号后开始校验</div></div>' +
        '</div>' +
        '<p class="note">Luhn 校验只能排除部分输错的卡号，不能证明卡号有效或可用。请勿在不可信的页面输入真实银行卡信息；本工具不会保存或上传任何内容。</p>';

      var input = TB.$('#bcInput', root);
      var result = TB.$('#bcResult', root);

      function setResult(html) { result.innerHTML = html; }

      function validate() {
        var digits = digitsOnly(input.value);
        if (!digits) {
          setResult('<div style="color:var(--danger);font-size:12.5px">请输入银行卡号。</div>');
          return;
        }
        var brand = detectBrand(digits);
        var lenOk = digits.length >= 12 && digits.length <= 19;
        var luhnOk = luhnCheck(digits);
        var ok = lenOk && luhnOk;
        setResult(
          '<div class="kv">' +
            '<div class="kv-item"><div class="kv-k">校验结果</div><div class="kv-v ' + (ok ? 'result-ok' : 'result-err') + '">' + (ok ? '通过 Luhn 校验' : (lenOk ? 'Luhn 校验失败' : '长度不符合 12–19 位')) + '</div></div>' +
            '<div class="kv-item"><div class="kv-k">卡组织</div><div class="kv-v">' + TB.esc(brand) + '</div></div>' +
            '<div class="kv-item"><div class="kv-k">卡号长度</div><div class="kv-v">' + digits.length + ' 位</div></div>' +
            '<div class="kv-item"><div class="kv-k">格式化卡号</div><div class="kv-v mono">' + TB.esc(formatCard(digits)) + '</div></div>' +
          '</div>' +
          (ok ? '<div class="note" style="text-align:left;margin-top:10px">格式和校验位正确，但无法确认发卡行、余额或卡片状态。</div>' :
            '<div class="note" style="text-align:left;margin-top:10px">请检查是否少输、多输或输错了某一位；测试号可以用 4242 4242 4242 4242。</div>')
        );
      }

      input.addEventListener('input', function () {
        input.value = formatCard(input.value);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') validate();
      });
      TB.$('#bcRun', root).addEventListener('click', validate);
      TB.$('#bcTest', root).addEventListener('click', function () {
        input.value = formatCard(TEST_NUMBER);
        validate();
      });
      TB.$('#bcCheck', root).addEventListener('click', function () {
        var digits = digitsOnly(input.value);
        if (digits.length < 2) { TB.toast('请先输入至少 2 位卡号'); return; }
        var d = checkDigit(digits);
        if (d < 0) { TB.toast('无法计算校验位'); return; }
        setResult(
          '<div class="kv"><div class="kv-item"><div class="kv-k">校验位</div><div class="kv-v result-ok">' + d + '</div></div>' +
          '<div class="kv-item"><div class="kv-k">补上校验位后的卡号</div><div class="kv-v mono">' + TB.esc(formatCard(digits + d)) + '</div></div></div>' +
          '<div class="note" style="text-align:left;margin-top:10px">这是把当前输入当作“去掉最后一位”的卡号来计算；如果输入本身已含校验位，请先删掉最后一位再计算。</div>'
        );
      });
      TB.$('#bcCopy', root).addEventListener('click', function () {
        var digits = digitsOnly(input.value);
        if (!digits) { TB.toast('还没有卡号'); return; }
        TB.copy(digits);
      });

      input.value = formatCard(TEST_NUMBER);
      validate();
    }
  });
})();
