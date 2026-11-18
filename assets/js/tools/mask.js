/* =============================================================================
 * 数据脱敏
 * -----------------------------------------------------------------------------
 * 在本地对邮箱、手机号、身份证、银行卡、IPv4 与自定义敏感词做遮罩。
 * 只处理当前输入框文本，不存储、不上传。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = [
    '客户：张三',
    '手机：13812345678',
    '邮箱：zhangsan@example.com',
    '身份证：110101199001011234',
    '银行卡：6222021234567890123',
    '服务器 IP：192.168.1.100'
  ].join('\n');

  function countMatches(text, re) {
    var m = text.match(re);
    return m ? m.length : 0;
  }

  TB.def({
    slug: 'mask',
    cat: 'data',
    name: '数据脱敏',
    desc: '一键遮罩手机号、邮箱、身份证、银行卡与 IP，处理结果只在本地。',
    icon: '🕶️',
    kw: '数据脱敏 隐私 手机号 邮箱 身份证 银行卡 打码 遮罩 日志',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">原始文本 <span class="hint">支持普通文本、JSON、日志和表格内容</span></div>' +
          '<textarea class="textarea" id="maskInput" rows="10" spellcheck="false"></textarea>' +
          '<div class="checks" style="margin-top:12px">' +
            '<label><input type="checkbox" id="maskEmail" checked> 邮箱</label>' +
            '<label><input type="checkbox" id="maskPhone" checked> 手机号</label>' +
            '<label><input type="checkbox" id="maskId" checked> 身份证</label>' +
            '<label><input type="checkbox" id="maskBank" checked> 银行卡</label>' +
            '<label><input type="checkbox" id="maskIp" checked> IPv4</label>' +
          '</div>' +
          '<div class="field" style="margin-top:14px"><div class="label">自定义敏感词 <span class="hint">用逗号分隔，替换为 ***</span></div>' +
            '<input class="input" id="maskWords" placeholder="例如：内部项目名, 客户姓名"></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="maskRun" type="button">开始脱敏</button>' +
            '<button class="btn" id="maskSample" type="button">载入示例</button>' +
            '<button class="btn" id="maskClear" type="button">清空</button>' +
            '<button class="btn" id="maskCopy" type="button">复制结果</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">脱敏结果 <span class="hint" id="maskStats">等待处理</span></div>' +
          '<div class="out"><div class="out-b" id="maskOut" style="min-height:150px;color:var(--ink-3)">结果会显示在这里</div></div>' +
        '</div>' +
        '<p class="note">脱敏会改变文本内容，无法还原。请保留原始数据备份；涉及身份证、银行卡等敏感信息时，建议在离线环境处理。</p>';

      var input = TB.$('#maskInput', root);
      var out = TB.$('#maskOut', root);
      var stats = TB.$('#maskStats', root);

      function run() {
        var text = input.value;
        if (!text.trim()) {
          out.textContent = '请先粘贴需要脱敏的文本。';
          out.style.color = 'var(--ink-3)';
          stats.textContent = '等待处理';
          return;
        }
        var counts = {};
        var result = text;

        if (TB.$('#maskEmail', root).checked) {
          var emailRe = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
          counts.email = countMatches(result, emailRe);
          result = result.replace(emailRe, '$1***$2');
        }
        if (TB.$('#maskPhone', root).checked) {
          var phoneRe = /\b(1[3-9]\d)\d{4}(\d{4})\b/g;
          counts.phone = countMatches(result, phoneRe);
          result = result.replace(phoneRe, '$1****$2');
        }
        if (TB.$('#maskId', root).checked) {
          var id18 = /\b(\d{6})\d{8}(\d{3}[0-9Xx])\b/g;
          var id15 = /\b(\d{6})\d{6}(\d{3})\b/g;
          counts.id = countMatches(result, id18) + countMatches(result, id15);
          result = result.replace(id18, '$1********$2').replace(id15, '$1******$2');
        }
        if (TB.$('#maskBank', root).checked) {
          var bankRe = /\b(\d{4})\d{4,11}(\d{4})\b/g;
          counts.bank = countMatches(result, bankRe);
          result = result.replace(bankRe, '$1 **** **** $2');
        }
        if (TB.$('#maskIp', root).checked) {
          var ipRe = /\b(\d{1,3})\.\d{1,3}\.\d{1,3}\.(\d{1,3})\b/g;
          counts.ip = countMatches(result, ipRe);
          result = result.replace(ipRe, '$1.*.*.$2');
        }

        var words = TB.$('#maskWords', root).value.split(/[,，\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
        counts.custom = 0;
        words.forEach(function (word) {
          var re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          counts.custom += countMatches(result, re);
          result = result.replace(re, '***');
        });

        out.textContent = result;
        out.style.color = 'var(--ink)';
        var total = 0;
        ['email', 'phone', 'id', 'bank', 'ip', 'custom'].forEach(function (k) { total += counts[k] || 0; });
        stats.textContent = total ? '已处理 ' + total + ' 处' : '未匹配到可脱敏内容';
      }

      TB.$('#maskRun', root).addEventListener('click', run);
      TB.$('#maskSample', root).addEventListener('click', function () {
        input.value = SAMPLE;
        run();
      });
      TB.$('#maskClear', root).addEventListener('click', function () {
        input.value = '';
        out.textContent = '结果会显示在这里';
        out.style.color = 'var(--ink-3)';
        stats.textContent = '等待处理';
      });
      TB.$('#maskCopy', root).addEventListener('click', function () {
        if (out.textContent && out.textContent !== '结果会显示在这里') TB.copy(out.textContent);
        else TB.toast('还没有可复制的结果');
      });

      input.value = SAMPLE;
      run();
    }
  });
})();
