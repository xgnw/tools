/* =============================================================================
 * JSON-LD 结构化数据生成器
 * -----------------------------------------------------------------------------
 * 用表单生成 Article、Product、FAQPage、BreadcrumbList、Organization 的
 * schema.org JSON-LD，输出可直接放进网页的 script 片段。
 * ========================================================================== */
(function () {
  'use strict';

  function field(label, id, value, placeholder, type) {
    return '<div class="field"><div class="label">' + label + '</div><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + TB.esc(value || '') + '" placeholder="' + TB.esc(placeholder || '') + '"></div>';
  }

  function area(label, id, value, placeholder, rows) {
    return '<div class="field"><div class="label">' + label + '</div><textarea class="textarea" id="' + id + '" rows="' + (rows || 4) + '" placeholder="' + TB.esc(placeholder || '') + '">' + TB.esc(value || '') + '</textarea></div>';
  }

  function lines(value) {
    return String(value || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  TB.def({
    slug: 'jsonld',
    cat: 'web',
    name: 'JSON-LD 结构化数据生成器',
    desc: '生成 Article、Product、FAQ、面包屑等 schema.org 结构化数据。',
    icon: '🏷️',
    kw: 'json-ld schema 结构化数据 seo 富媒体 搜索结果 article product faq',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">结构化数据类型</div>' +
          '<div class="field"><select class="select" id="jlType">' +
            '<option value="Article">Article 文章</option><option value="Product">Product 商品</option>' +
            '<option value="FAQPage">FAQPage 常见问题</option><option value="BreadcrumbList">BreadcrumbList 面包屑</option>' +
            '<option value="Organization">Organization 组织</option></select></div>' +
          '<div id="jlFields"></div>' +
          '<div class="btns"><button class="btn primary" id="jlRun" type="button">生成 JSON-LD</button>' +
            '<button class="btn" id="jlCopy" type="button">复制代码</button>' +
            '<button class="btn" id="jlDownload" type="button">下载 .json</button></div>' +
          '<div class="hint" id="jlInfo" style="margin-top:10px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">输出 <span class="hint">放入 &lt;head&gt; 或 &lt;body&gt; 即可</span></div><pre class="codeBox" id="jlOut" style="overflow:auto;max-height:460px"></pre></div>' +
        '<p class="note">生成的是 schema.org 的通用字段，Google 等搜索平台还会校验必填项和内容一致性；发布前请用平台的结构化数据测试工具检查。</p>';

      var typeSel = TB.$('#jlType', root);
      var fields = TB.$('#jlFields', root);
      var out = TB.$('#jlOut', root);
      var info = TB.$('#jlInfo', root);

      var templates = {
        Article: function () {
          return field('标题', 'jlName', '一篇值得阅读的文章', '文章标题') +
            area('摘要', 'jlDesc', '用一两句话说明文章内容。', '文章摘要', 3) +
            field('文章 URL', 'jlUrl', 'https://example.com/article', 'https://') +
            field('封面图 URL', 'jlImage', 'https://example.com/cover.jpg', 'https://') +
            field('作者', 'jlAuthor', '张三', '作者姓名') +
            field('发布时间', 'jlDate', '2026-11-19', 'YYYY-MM-DD', 'date');
        },
        Product: function () {
          return field('商品名称', 'jlName', '示例商品', '商品名称') +
            area('商品描述', 'jlDesc', '说明商品用途和特点。', '商品描述', 3) +
            field('商品 URL', 'jlUrl', 'https://example.com/product', 'https://') +
            field('图片 URL', 'jlImage', 'https://example.com/product.jpg', 'https://') +
            '<div class="row">' + field('品牌', 'jlBrand', '示例品牌', '品牌') + field('SKU', 'jlSku', 'SKU-001', 'SKU') + '</div>' +
            '<div class="row">' + field('价格', 'jlPrice', '199.00', '0.00', 'number') +
              '<div class="field"><div class="label">币种</div><select class="select" id="jlCurrency"><option value="CNY">CNY 人民币</option><option value="USD">USD 美元</option><option value="EUR">EUR 欧元</option><option value="JPY">JPY 日元</option></select></div></div>' +
            '<div class="field"><div class="label">库存状态</div><select class="select" id="jlAvail"><option value="https://schema.org/InStock">InStock 有货</option><option value="https://schema.org/OutOfStock">OutOfStock 缺货</option><option value="https://schema.org/PreOrder">PreOrder 预售</option></select></div>' +
            '<div class="row">' + field('评分（1–5）', 'jlRating', '4.8', '4.8', 'number') + field('评价数', 'jlReviews', '120', '0', 'number') + '</div>';
        },
        FAQPage: function () {
          return area('问题与答案', 'jlFaq', '这个工具收费吗？|不收费，所有工具都可以直接使用。\n文件会上传吗？|不会，文件只在浏览器本地处理。', '每行一个问题|答案', 7);
        },
        BreadcrumbList: function () {
          return area('面包屑条目', 'jlCrumbs', '首页|https://example.com/\n工具|https://example.com/tools/\n当前页面|https://example.com/tools/page/', '每行：名称|URL', 6);
        },
        Organization: function () {
          return field('组织名称', 'jlName', '示例公司', '组织名称') +
            field('官网 URL', 'jlUrl', 'https://example.com/', 'https://') +
            field('Logo URL', 'jlImage', 'https://example.com/logo.png', 'https://') +
            area('简介', 'jlDesc', '简单介绍组织提供的产品或服务。', '组织简介', 3) +
            '<div class="row">' + field('联系邮箱', 'jlEmail', 'hello@example.com', 'email', 'email') + field('联系电话', 'jlPhone', '+86 000 0000 0000', '电话', 'tel') + '</div>' +
            area('社交主页（每行一个 URL）', 'jlSameAs', 'https://github.com/example\nhttps://x.com/example', 'https://...', 3);
        }
      };

      function renderFields() {
        fields.innerHTML = templates[typeSel.value]();
        if (typeSel.value === 'Product') {
          var price = TB.$('#jlPrice', fields);
          if (price && !price.value) price.value = '199.00';
        }
        generate();
      }

      function val(id) {
        var el = TB.$('#' + id, fields);
        return el ? el.value.trim() : '';
      }

      function generate() {
        var type = typeSel.value;
        var data = { '@context': 'https://schema.org', '@type': type };
        function add(key, value) { if (value !== '' && value != null) data[key] = value; }

        if (type === 'Article') {
          add('headline', val('jlName'));
          add('description', val('jlDesc'));
          add('url', val('jlUrl'));
          add('image', val('jlImage'));
          add('datePublished', val('jlDate'));
          var author = val('jlAuthor');
          if (author) data.author = { '@type': 'Person', name: author };
          if (!data.headline) { info.textContent = '请填写文章标题'; out.textContent = ''; return; }
        } else if (type === 'Product') {
          add('name', val('jlName'));
          add('description', val('jlDesc'));
          add('url', val('jlUrl'));
          add('image', val('jlImage'));
          add('sku', val('jlSku'));
          var brand = val('jlBrand');
          if (brand) data.brand = { '@type': 'Brand', name: brand };
          var price = val('jlPrice');
          var currency = val('jlCurrency') || 'CNY';
          if (price !== '') {
            data.offers = {
              '@type': 'Offer',
              price: Number(price).toFixed(2),
              priceCurrency: currency,
              availability: val('jlAvail') || 'https://schema.org/InStock',
              url: val('jlUrl')
            };
            if (!data.offers.url) delete data.offers.url;
          }
          var rating = val('jlRating');
          var reviews = val('jlReviews');
          if (rating || reviews) {
            data.aggregateRating = {
              '@type': 'AggregateRating',
              ratingValue: rating || '0',
              reviewCount: reviews || '0'
            };
          }
          if (!data.name) { info.textContent = '请填写商品名称'; out.textContent = ''; return; }
        } else if (type === 'FAQPage') {
          var pairs = lines(val('jlFaq')).map(function (line) {
            var parts = line.split('|');
            return { q: (parts[0] || '').trim(), a: (parts.slice(1).join('|') || '').trim() };
          }).filter(function (p) { return p.q && p.a; });
          if (!pairs.length) { info.textContent = '请至少填写一组「问题|答案」'; out.textContent = ''; return; }
          data.mainEntity = pairs.map(function (p) {
            return {
              '@type': 'Question',
              name: p.q,
              acceptedAnswer: { '@type': 'Answer', text: p.a }
            };
          });
        } else if (type === 'BreadcrumbList') {
          var crumbs = lines(val('jlCrumbs')).map(function (line) {
            var parts = line.split('|');
            return { name: (parts[0] || '').trim(), url: (parts.slice(1).join('|') || '').trim() };
          }).filter(function (c) { return c.name && c.url; });
          if (!crumbs.length) { info.textContent = '请至少填写一条「名称|URL」'; out.textContent = ''; return; }
          data.itemListElement = crumbs.map(function (c, i) {
            return { '@type': 'ListItem', position: i + 1, name: c.name, item: c.url };
          });
        } else if (type === 'Organization') {
          add('name', val('jlName'));
          add('url', val('jlUrl'));
          add('logo', val('jlImage'));
          add('description', val('jlDesc'));
          add('email', val('jlEmail'));
          add('telephone', val('jlPhone'));
          var links = lines(val('jlSameAs'));
          if (links.length) data.sameAs = links;
          if (!data.name) { info.textContent = '请填写组织名称'; out.textContent = ''; return; }
        }

        var json = JSON.stringify(data, null, 2);
        out.textContent = '<script type="application/ld+json">\n' + json + '\n<\/script>';
        info.textContent = '已生成 · ' + type + ' · ' + json.split('\n').length + ' 行';
      }

      typeSel.addEventListener('change', renderFields);
      ['input', 'change'].forEach(function (evt) {
        fields.addEventListener(evt, function (e) {
          if (e.target && (e.target.matches('input,select,textarea'))) {
            clearTimeout(root._jlTimer);
            root._jlTimer = setTimeout(generate, 250);
          }
        });
      });
      TB.$('#jlRun', root).addEventListener('click', generate);
      TB.$('#jlCopy', root).addEventListener('click', function () {
        if (out.textContent) TB.copy(out.textContent); else TB.toast('还没有生成内容');
      });
      TB.$('#jlDownload', root).addEventListener('click', function () {
        if (!out.textContent) { TB.toast('还没有生成内容'); return; }
        var json = out.textContent.replace(/^<script[^>]*>\n?/, '').replace(/\n?<\/script>$/, '');
        TB.downloadText(json, 'structured-data.json', 'application/ld+json');
      });

      renderFields();
    }
  });
})();
