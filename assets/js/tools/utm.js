/* =============================================================================
 * UTM 参数生成器
 * -----------------------------------------------------------------------------
 * 在保留原 URL 查询参数和 #hash 的前提下，追加标准 utm_* 参数。
 * 生成过程只使用浏览器 URL API，不会访问或校验目标网站。
 * ========================================================================== */
(function () {
  'use strict';

  var PRESETS = [
    { name: '微信', source: 'wechat', medium: 'social' },
    { name: '微博', source: 'weibo', medium: 'social' },
    { name: '抖音', source: 'douyin', medium: 'social' },
    { name: '百度', source: 'baidu', medium: 'cpc' },
    { name: '邮件', source: 'newsletter', medium: 'email' },
    { name: '谷歌', source: 'google', medium: 'cpc' }
  ];

  TB.def({
    slug: 'utm',
    cat: 'web',
    name: 'UTM 参数生成器',
    desc: '快速拼接 utm_source、utm_medium、utm_campaign 等推广参数。',
    icon: '🔗',
    kw: 'utm 链接 推广 参数 营销 campaign source medium 广告',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">基础链接 <span class="hint">保留已有参数和锚点</span></div>' +
          '<div class="field"><input class="input" id="utBase" value="https://example.com/page" placeholder="https://example.com/page"></div>' +
          '<div class="chips" id="utPresets">' + PRESETS.map(function (p) {
            return '<button class="chip" type="button" data-source="' + p.source + '" data-medium="' + p.medium + '">' + p.name + '</button>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">UTM 参数</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">来源 source</div><input class="input" id="utSource" placeholder="wechat"></div>' +
            '<div class="field"><div class="label">媒介 medium</div><input class="input" id="utMedium" placeholder="social"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">活动 campaign</div><input class="input" id="utCampaign" placeholder="2026-spring"></div>' +
            '<div class="field"><div class="label">内容 content</div><input class="input" id="utContent" placeholder="banner-a"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">关键词 term</div><input class="input" id="utTerm" placeholder="在线工具"></div>' +
            '<div class="field"><div class="label">活动 ID id</div><input class="input" id="utId" placeholder="campaign-001"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="utCopy" type="button">复制链接</button>' +
            '<button class="btn" id="utOpen" type="button">在新标签打开</button>' +
            '<button class="btn" id="utClear" type="button">清空参数</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">生成结果</div><pre class="codeBox" id="utOut"></pre>' +
          '<div class="table-wrap" style="margin-top:12px"><table class="table" id="utTable"></table></div>' +
          '<div class="hint" id="utInfo" style="margin-top:10px"></div></div>' +
        '<p class="note">UTM 参数区分大小写，建议团队统一使用小写；不要把用户隐私、邮箱或手机号放进参数里。链接中的中文和空格会自动编码。</p>';

      var ids = ['utBase', 'utSource', 'utMedium', 'utCampaign', 'utContent', 'utTerm', 'utId'];
      var els = {};
      ids.forEach(function (id) { els[id] = TB.$('#' + id, root); });
      var out = TB.$('#utOut', root);
      var table = TB.$('#utTable', root);
      var info = TB.$('#utInfo', root);
      var current = '';

      function generate() {
        var base = els.utBase.value.trim();
        if (!base) { out.textContent = ''; table.innerHTML = ''; info.textContent = '请填写基础链接'; current = ''; return; }
        if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
        var url;
        try { url = new URL(base); } catch (e) {
          out.textContent = '';
          table.innerHTML = '';
          info.textContent = '链接格式不正确，需要 http:// 或 https:// 地址';
          current = '';
          return;
        }
        var params = [
          ['utm_source', els.utSource.value],
          ['utm_medium', els.utMedium.value],
          ['utm_campaign', els.utCampaign.value],
          ['utm_content', els.utContent.value],
          ['utm_term', els.utTerm.value],
          ['utm_id', els.utId.value]
        ];
        params.forEach(function (p) {
          var v = p[1].trim();
          if (v) url.searchParams.set(p[0], v);
          else url.searchParams.delete(p[0]);
        });
        current = url.toString();
        out.textContent = current;
        table.innerHTML = '<thead><tr><th>参数</th><th>值</th></tr></thead><tbody>' +
          params.map(function (p) {
            return '<tr><td>' + p[0] + '</td><td>' + (p[1].trim() ? TB.esc(p[1].trim()) : '<span class="hint">未填写</span>') + '</td></tr>';
          }).join('') + '</tbody>';
        info.textContent = '链接长度 ' + current.length + ' 个字符 · 已有参数会保留，同名 utm_* 参数会被覆盖';
      }

      ids.forEach(function (id) {
        els[id].addEventListener('input', generate);
      });
      root.querySelectorAll('#utPresets .chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          els.utSource.value = btn.getAttribute('data-source');
          els.utMedium.value = btn.getAttribute('data-medium');
          generate();
        });
      });
      TB.$('#utCopy', root).addEventListener('click', function () {
        if (current) TB.copy(current); else TB.toast('还没有可复制的链接');
      });
      TB.$('#utOpen', root).addEventListener('click', function () {
        if (!current) { TB.toast('还没有生成链接'); return; }
        window.open(current, '_blank', 'noopener,noreferrer');
      });
      TB.$('#utClear', root).addEventListener('click', function () {
        ['utSource', 'utMedium', 'utCampaign', 'utContent', 'utTerm', 'utId'].forEach(function (id) { els[id].value = ''; });
        generate();
      });
      generate();
    }
  });
})();
