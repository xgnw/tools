/* =============================================================================
 * Sitemap 生成器
 * -----------------------------------------------------------------------------
 * 把 URL 列表生成 sitemap.xml。纯字符串处理，不爬站、不请求服务器。
 * ========================================================================== */

(function () {
  'use strict';

  var FREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
  var MAX_URLS = 10000;

  function xmlEscape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note sm-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  TB.def({
    slug: 'sitemap', cat: 'web', name: 'Sitemap 生成器', desc: 'URL 列表生成 sitemap.xml',
    icon: '🗺️', kw: 'sitemap 站点地图 xml seo 搜索引擎 站长 url',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">页面地址<span class="hint">每行一个完整 URL，自动去重</span></div>' +
          '<div class="field"><textarea class="textarea sm-src" id="smUrls" spellcheck="false" placeholder="https://example.com/\nhttps://example.com/about"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>最后修改日期</b></div><input class="input" id="smLast" type="date"></div>' +
            '<div class="field"><div class="label"><b>更新频率</b></div><select class="select" id="smFreq">' +
              FREQ.map(function (f) { return '<option value="' + f + '"' + (f === 'weekly' ? ' selected' : '') + '>' + f + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><div class="label"><b>优先级</b></div><input class="input" id="smPriority" type="number" min="0" max="1" step="0.1" value="0.8"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="smRun" type="button">生成 sitemap.xml</button>' +
            '<button class="btn" id="smExample" type="button">填入示例</button>' +
            '<button class="btn" id="smClear" type="button">清空</button></div>' +
          '<div id="smMsg" class="sm-msg"></div>' +
        '</div>' +
        '<div class="panel" id="smResult" hidden>' +
          '<div class="panel-h">sitemap.xml<span class="hint" id="smCount"></span></div>' +
          '<div class="out"><div class="out-b"><textarea class="textarea sm-out" id="smOut" readonly spellcheck="false"></textarea></div></div>' +
          '<div class="btns"><button class="btn" id="smCopy" type="button">复制 XML</button>' +
            '<button class="btn primary" id="smDl" type="button">下载 sitemap.xml</button></div>' +
        '</div>' +
        '<div class="note">同一批 URL 共用一组 lastmod / changefreq / priority；不同页面需要不同值时，分多次生成再合并。sitemap 只应列出真实可访问的页面，不要把 hash 路由当作独立 URL；工具不会抓取站点、不会提交搜索引擎。</div>';

      var urls = TB.$('#smUrls', root);
      var last = TB.$('#smLast', root);
      var freq = TB.$('#smFreq', root);
      var priority = TB.$('#smPriority', root);
      var msg = TB.$('#smMsg', root);
      var result = TB.$('#smResult', root);
      var out = TB.$('#smOut', root);
      var count = TB.$('#smCount', root);
      var xml = '';

      function build() {
        var lines = urls.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) { status(msg, '请至少填写一个 URL', true); result.hidden = true; return; }
        var seen = Object.create(null);
        var clean = [];
        var invalid = [];
        lines.forEach(function (line) {
          try {
            var u = new URL(line);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('只支持 http / https');
            u.hash = '';
            if (!seen[u.href]) { seen[u.href] = 1; clean.push(u.href); }
          } catch (e) { invalid.push(line); }
        });
        if (invalid.length) {
          status(msg, '有 ' + invalid.length + ' 个地址不合法：' + invalid.slice(0, 3).join('、') + (invalid.length > 3 ? '…' : ''), true);
          result.hidden = true;
          return;
        }
        if (clean.length > MAX_URLS) {
          status(msg, '一次最多生成 ' + MAX_URLS + ' 个 URL，请拆分文件', true);
          result.hidden = true;
          return;
        }
        var pr = Number(priority.value);
        if (!isFinite(pr) || pr < 0 || pr > 1) {
          status(msg, '优先级应为 0—1 之间的数字', true);
          result.hidden = true;
          return;
        }
        var head = '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        var body = clean.map(function (loc) {
          return '  <url>\n' +
            '    <loc>' + xmlEscape(loc) + '</loc>\n' +
            (last.value ? '    <lastmod>' + xmlEscape(last.value) + '</lastmod>\n' : '') +
            '    <changefreq>' + xmlEscape(freq.value) + '</changefreq>\n' +
            '    <priority>' + pr.toFixed(1) + '</priority>\n' +
            '  </url>\n';
        }).join('');
        xml = head + body + '</urlset>\n';
        out.value = xml;
        count.textContent = clean.length + ' 个 URL' + (clean.length < lines.length ? '，已去重 ' + (lines.length - clean.length) + ' 个' : '');
        result.hidden = false;
        status(msg, '已生成 ' + clean.length + ' 个 URL 的 sitemap', false);
      }

      TB.$('#smRun', root).addEventListener('click', build);
      TB.$('#smExample', root).addEventListener('click', function () {
        urls.value = 'https://tools.432600.xyz/\nhttps://tools.432600.xyz/pay.html';
        build();
      });
      TB.$('#smClear', root).addEventListener('click', function () {
        urls.value = '';
        last.value = '';
        out.value = '';
        xml = '';
        result.hidden = true;
        status(msg, '');
      });
      TB.$('#smCopy', root).addEventListener('click', function () {
        if (!xml) { status(msg, '请先生成 sitemap', true); return; }
        TB.copy(xml);
      });
      TB.$('#smDl', root).addEventListener('click', function () {
        if (!xml) { status(msg, '请先生成 sitemap', true); return; }
        TB.downloadText(xml, 'sitemap.xml', 'application/xml');
      });
    }
  });
})();
