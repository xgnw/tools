/* =============================================================================
 * SEO 套件
 * -----------------------------------------------------------------------------
 * 生成基础 SEO 标签、Open Graph 与 Twitter Card，并给出标题 / 描述长度提示。
 * 纯文本生成，不抓取网页、不请求搜索引擎接口。
 * ========================================================================== */
(function () {
  'use strict';

  function tag(name, content, attrName) {
    if (!content) return '';
    return '<meta ' + (attrName || 'name') + '="' + TB.esc(name) + '" content="' + TB.esc(content) + '">';
  }

  function limitClass(len, min, max) {
    if (!len) return '';
    return len < min || len > max ? ' style="color:var(--danger)"' : ' style="color:var(--ok)"';
  }

  TB.def({
    slug: 'seo',
    cat: 'web',
    name: 'SEO 套件',
    desc: '生成标题、描述、Canonical、Open Graph 与 Twitter Card 标签。',
    icon: '🔎',
    kw: 'seo meta og open graph twitter card 标题 描述 收录 分享',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">页面信息 <span class="hint">标题建议 30–60 字，描述建议 80–160 字</span></div>' +
          '<div class="field"><div class="label"><b>页面标题</b><span id="seoTitleCount" style="color:var(--ink-3)">0 / 60</span></div>' +
            '<input class="input" id="seoTitle" maxlength="120" value="简单工具箱 - 在线工具箱"></div>' +
          '<div class="field"><div class="label"><b>页面描述</b><span id="seoDescCount" style="color:var(--ink-3)">0 / 160</span></div>' +
            '<textarea class="textarea" id="seoDesc" rows="3" maxlength="260">150 个 PDF、图片、文档、表格与开发者工具，全部在浏览器本地运行，文件不上传服务器。</textarea></div>' +
          '<div class="field"><div class="label">关键词 <span class="hint">用英文逗号分隔，现代搜索引擎权重较低</span></div>' +
            '<input class="input" id="seoKeywords" value="在线工具,PDF工具,图片处理,开发者工具"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">Canonical 地址</div><input class="input" id="seoCanonical" placeholder="https://tools.432600.xyz/"></div>' +
            '<div class="field"><div class="label">站点名称</div><input class="input" id="seoSiteName" value="简单工具箱"></div>' +
          '</div>' +
          '<div class="field"><div class="label">社交分享图 URL</div><input class="input" id="seoImage" placeholder="https://example.com/cover.png"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">收录设置</div><label style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2)">' +
              '<input type="checkbox" id="seoIndex" checked> 允许搜索引擎收录（index,follow）</label></div>' +
            '<div class="field"><div class="label">Twitter Card</div><select class="select" id="seoTwitter">' +
              '<option value="summary_large_image" selected>大图卡片 summary_large_image</option>' +
              '<option value="summary">小图卡片 summary</option>' +
            '</select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="seoRun" type="button">生成标签</button>' +
            '<button class="btn" id="seoCopy" type="button">复制代码</button>' +
            '<button class="btn" id="seoDownload" type="button">下载 HTML</button></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">搜索结果预览</div>' +
          '<div class="seoPreview"><div class="seoUrl" id="seoPreviewUrl">tools.432600.xyz</div>' +
            '<div class="seoTitle" id="seoPreviewTitle"></div>' +
            '<div class="seoDesc" id="seoPreviewDesc"></div></div>' +
          '<div class="out"><div class="out-b" id="seoCode" style="min-height:120px"></div></div>' +
        '</div>' +
        '<p class="note">这些标签只描述页面内容，不会自动让页面被收录。上线后仍需提交站点地图、等待搜索引擎抓取；社交平台缓存更新也可能需要时间。</p>';

      var els = {
        title: TB.$('#seoTitle', root),
        desc: TB.$('#seoDesc', root),
        keywords: TB.$('#seoKeywords', root),
        canonical: TB.$('#seoCanonical', root),
        siteName: TB.$('#seoSiteName', root),
        image: TB.$('#seoImage', root),
        index: TB.$('#seoIndex', root),
        twitter: TB.$('#seoTwitter', root),
        code: TB.$('#seoCode', root),
        pvTitle: TB.$('#seoPreviewTitle', root),
        pvDesc: TB.$('#seoPreviewDesc', root),
        pvUrl: TB.$('#seoPreviewUrl', root)
      };
      var last = '';

      function safeUrl(value, suffix) {
        var text = String(value || '').trim();
        if (!text) return '';
        return text + (suffix || '');
      }

      function run() {
        var title = els.title.value.trim();
        var desc = els.desc.value.trim();
        var keywords = els.keywords.value.trim();
        var canonical = els.canonical.value.trim();
        var siteName = els.siteName.value.trim();
        var image = els.image.value.trim();
        var lines = [];

        if (title) lines.push('<title>' + TB.esc(title) + '</title>');
        lines.push(tag('description', desc));
        lines.push(tag('keywords', keywords));
        if (canonical) lines.push('<link rel="canonical" href="' + TB.esc(canonical) + '">');
        lines.push(tag('robots', els.index.checked ? 'index,follow' : 'noindex,nofollow'));
        lines.push(tag('og:type', 'website', 'property'));
        lines.push(tag('og:title', title, 'property'));
        lines.push(tag('og:description', desc, 'property'));
        if (canonical) lines.push(tag('og:url', canonical, 'property'));
        if (siteName) lines.push(tag('og:site_name', siteName, 'property'));
        if (image) lines.push(tag('og:image', image, 'property'));
        lines.push(tag('twitter:card', els.twitter.value));
        lines.push(tag('twitter:title', title));
        lines.push(tag('twitter:description', desc));
        if (image) lines.push(tag('twitter:image', image));

        last = lines.filter(Boolean).join('\n');
        els.code.textContent = last;
        els.pvTitle.textContent = title || '页面标题';
        els.pvDesc.textContent = desc || '页面描述会显示在这里，建议写清楚页面能做什么。';
        els.pvUrl.textContent = canonical || 'example.com/page';
        els.pvTitle.style.color = title ? '' : 'var(--ink-3)';
        els.pvDesc.style.color = desc ? '' : 'var(--ink-3)';
        els.pvUrl.style.color = canonical ? '' : 'var(--ink-3)';

        var tc = TB.$('#seoTitleCount', root);
        var dc = TB.$('#seoDescCount', root);
        tc.textContent = title.length + ' / 60';
        tc.setAttribute('style', 'color:' + (title.length >= 30 && title.length <= 60 ? 'var(--ok)' : 'var(--danger)'));
        dc.textContent = desc.length + ' / 160';
        dc.setAttribute('style', 'color:' + (desc.length >= 80 && desc.length <= 160 ? 'var(--ok)' : 'var(--danger)'));
      }

      TB.$('#seoRun', root).addEventListener('click', run);
      TB.$('#seoCopy', root).addEventListener('click', function () {
        if (!last) run();
        if (last) TB.copy(last);
      });
      TB.$('#seoDownload', root).addEventListener('click', function () {
        if (!last) run();
        if (last) TB.downloadText(last, 'seo-meta.html', 'text/html');
      });
      [els.title, els.desc, els.keywords, els.canonical, els.siteName, els.image, els.index, els.twitter].forEach(function (el) {
        el.addEventListener('input', run);
        el.addEventListener('change', run);
      });

      run();
    }
  });
})();
