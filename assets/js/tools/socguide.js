/* =============================================================================
 * 社交媒体尺寸指南
 * -----------------------------------------------------------------------------
 * 常用平台封面、头像、视频和配图尺寸速查；可搜索、按平台筛选，并直接跳到
 * 本站「社媒尺寸裁剪」工具。数据为静态参考值，平台改版时以官方后台为准。
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = [
    { p: '小红书', s: '竖版笔记封面', r: '3:4', w: 1080, h: 1440, note: '笔记首图，占信息流面积更大', tool: 'socialcrop' },
    { p: '小红书', s: '方图', r: '1:1', w: 1080, h: 1080, note: '头像、商品图、方版配图', tool: 'socialcrop' },
    { p: '小红书', s: '视频封面', r: '9:16', w: 1080, h: 1920, note: '竖屏视频与全屏封面', tool: 'socialcrop' },
    { p: '抖音', s: '竖屏视频', r: '9:16', w: 1080, h: 1920, note: '标准全屏短视频尺寸', tool: 'socialcrop' },
    { p: '抖音', s: '视频封面', r: '9:16', w: 1080, h: 1920, note: '封面会裁掉上下部分，主体放中间', tool: 'socialcrop' },
    { p: '抖音', s: '头像', r: '1:1', w: 800, h: 800, note: '建议正方形，避免细字', tool: '' },
    { p: '微信', s: '公众号首图', r: '2.35:1', w: 900, h: 383, note: '订阅号消息列表头图', tool: 'socialcrop' },
    { p: '微信', s: '公众号次图', r: '1:1', w: 200, h: 200, note: '多图文消息的小图', tool: 'socialcrop' },
    { p: '微信', s: '朋友圈配图', r: '1:1', w: 1080, h: 1080, note: '九宫格单张，方图更整齐', tool: 'socialcrop' },
    { p: '微信', s: '视频号竖屏', r: '9:16', w: 1080, h: 1920, note: '视频号全屏视频', tool: 'socialcrop' },
    { p: '微信', s: '头像', r: '1:1', w: 640, h: 640, note: '个人头像，圆形裁切', tool: '' },
    { p: '微博', s: '信息流配图', r: '16:9', w: 1200, h: 675, note: '横版配图，正文内展示', tool: 'socialcrop' },
    { p: '微博', s: '头像', r: '1:1', w: 500, h: 500, note: '方形头像', tool: '' },
    { p: 'B站', s: '视频封面', r: '16:9', w: 1920, h: 1080, note: '视频封面，文字保持可读', tool: 'socialcrop' },
    { p: 'B站', s: '头像', r: '1:1', w: 800, h: 800, note: 'UP 主头像', tool: '' },
    { p: 'YouTube', s: '视频缩略图', r: '16:9', w: 1280, h: 720, note: '缩略图最小 1280×720', tool: 'socialcrop' },
    { p: 'YouTube', s: '频道横幅', r: '16:9', w: 2560, h: 1440, note: '安全区约 1546×423，重要内容放中间', tool: '' },
    { p: 'Instagram', s: '方图', r: '1:1', w: 1080, h: 1080, note: '经典正方形帖子', tool: 'socialcrop' },
    { p: 'Instagram', s: '竖图', r: '4:5', w: 1080, h: 1350, note: '信息流占比更高的竖版图', tool: 'socialcrop' },
    { p: 'Instagram', s: 'Story / Reels', r: '9:16', w: 1080, h: 1920, note: '全屏故事与短视频', tool: 'socialcrop' },
    { p: 'X / Twitter', s: '配图', r: '16:9', w: 1600, h: 900, note: '时间线大图', tool: 'socialcrop' },
    { p: 'X / Twitter', s: '页头横幅', r: '3:1', w: 1500, h: 500, note: '个人主页顶部横幅', tool: '' },
    { p: 'LinkedIn', s: '分享图', r: '1.91:1', w: 1200, h: 627, note: '动态分享链接预览图', tool: 'socialcrop' },
    { p: 'LinkedIn', s: '个人横幅', r: '4:1', w: 1584, h: 396, note: '个人主页背景横幅', tool: '' },
    { p: '电商', s: '商品主图', r: '1:1', w: 1000, h: 1000, note: '多数平台要求正方形，细节可放大查看', tool: 'socialcrop' },
    { p: '电商', s: '详情页宽图', r: '3:4', w: 750, h: 1000, note: '手机端详情页常用 750px 宽', tool: 'socialcrop' }
  ];

  TB.def({
    slug: 'socguide',
    cat: 'image',
    name: '社交媒体尺寸指南',
    desc: '小红书、抖音、微信、B站等平台封面与配图尺寸速查。',
    icon: '📐',
    kw: '社交媒体 尺寸 小红书 抖音 微信 公众号 b站 youtube instagram 封面 头像 配图',
    render: function (ctx) {
      var root = ctx.root;
      var platforms = ['全部'].concat(DATA.map(function (d) { return d.p; }).filter(function (p, i, arr) { return arr.indexOf(p) === i; }));
      root.innerHTML =
        '<div class="panel"><div class="panel-h">筛选 <span class="hint">数据为常用参考值，平台后台可能随时调整</span></div>' +
          '<div class="field"><input class="input" id="sgSearch" placeholder="搜索平台、场景或用途，例如「封面」「头像」"></div>' +
          '<div class="chips" id="sgChips">' + platforms.map(function (p, i) {
            return '<button class="chip' + (i === 0 ? ' on' : '') + '" type="button" data-p="' + TB.esc(p) + '">' + TB.esc(p) + '</button>';
          }).join('') + '</div>' +
          '<div class="hint" id="sgCount" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">尺寸速查</div><div class="table-wrap"><table class="table" id="sgTable"></table></div></div>' +
        '<p class="note">头像、横幅和公众号首图等固定位置以平台后台上传框为准；需要裁成指定比例时，可直接用本站「社媒尺寸裁剪」，图片不会上传。</p>';

      var search = TB.$('#sgSearch', root);
      var chips = TB.$('#sgChips', root);
      var count = TB.$('#sgCount', root);
      var table = TB.$('#sgTable', root);
      var platform = '全部';

      function render() {
        var q = search.value.trim().toLowerCase();
        var rows = DATA.filter(function (d) {
          if (platform !== '全部' && d.p !== platform) return false;
          if (!q) return true;
          return (d.p + ' ' + d.s + ' ' + d.r + ' ' + d.note + ' ' + d.w + '×' + d.h).toLowerCase().indexOf(q) > -1;
        });
        count.textContent = '共 ' + rows.length + ' 条 · 点击「复制」可复制宽 × 高';
        table.innerHTML = '<thead><tr><th>平台</th><th>场景</th><th>像素尺寸</th><th>比例</th><th>说明</th><th>操作</th></tr></thead><tbody>' +
          (rows.length ? rows.map(function (d) {
            var size = d.w + ' × ' + d.h;
            return '<tr><td>' + TB.esc(d.p) + '</td><td>' + TB.esc(d.s) + '</td><td class="num">' + size + '</td><td>' + d.r + '</td><td>' + TB.esc(d.note) + '</td><td><button class="btn tiny" type="button" data-size="' + size + '">复制</button>' +
              (d.tool ? ' <a class="btn tiny" href="#/tool/' + d.tool + '">去裁剪</a>' : '') + '</td></tr>';
          }).join('') : '<tr><td colspan="6" class="hint">没有匹配的尺寸</td></tr>') + '</tbody>';
      }

      table.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-size]');
        if (btn) TB.copy(btn.getAttribute('data-size'));
      });
      chips.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        platform = chip.getAttribute('data-p');
        Array.from(chips.querySelectorAll('.chip')).forEach(function (c) { c.classList.toggle('on', c === chip); });
        render();
      });
      search.addEventListener('input', render);
      render();
    }
  });
})();
