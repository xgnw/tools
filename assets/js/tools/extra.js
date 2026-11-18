/* =============================================================================
 * 两个"站长/办公"向小工具：SEO 分享预览、批量重命名
 * -----------------------------------------------------------------------------
 * 都不需要第三方库；批量重命名只生成脚本与对照表，不会直接改动磁盘文件
 * （浏览器也没有静默改名的权限），避免误操作。
 * ========================================================================== */

(function () {

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note" style="margin-top:12px">' +
      '<span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  /* ------------------------------------------------------- 1. SEO 分享预览 */
  TB.def({
    slug: 'seo-preview', cat: 'web', name: 'SEO 分享预览', desc: '搜索与分享卡片', icon: '🔍',
    kw: 'seo 预览 标题 描述 分享 卡片 微信 twitter',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>标题</b><span id="tCount" style="color:var(--ink-3)">0 / 60</span></div>' +
            '<input class="input" id="title" type="text" placeholder="页面标题，建议 30–60 字"></div>' +
          '<div class="field"><div class="label"><b>描述</b><span id="dCount" style="color:var(--ink-3)">0 / 160</span></div>' +
            '<textarea class="textarea" id="desc" rows="3" placeholder="一两句话说明页面内容"></textarea></div>' +
          '<div class="field"><div class="label"><b>网址</b></div>' +
            '<input class="input" id="url" type="text" placeholder="https://example.com/page"></div>' +
          '<div class="field"><div class="label">站点名 / 封面图（可选）</div>' +
            '<div class="row2"><input class="input" id="site" type="text" placeholder="站点名">' +
            '<input class="input" id="cover" type="text" placeholder="封面图 URL"></div></div>' +
          '<div class="btns"><button class="btn" id="demo">填入示例</button>' +
            '<button class="btn" id="copyMeta">复制 meta 标签</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="field"><div class="label"><b>预览</b><span style="color:var(--ink-3)">超出长度会按各平台规则截断</span></div>' +
          '<div class="seoPreviews" id="pv"></div></div>';

      var el = {
        title: TB.$('#title', root), desc: TB.$('#desc', root), url: TB.$('#url', root),
        site: TB.$('#site', root), cover: TB.$('#cover', root), pv: TB.$('#pv', root)
      };

      function cut(s, n) {
        s = s || '';
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
      }
      function host(u) {
        try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u || 'example.com'; }
      }

      function paint() {
        var t = el.title.value.trim() || '页面标题会显示在这里';
        var d = el.desc.value.trim() || '这里显示页面描述，好的描述会让人更愿意点进来。';
        var u = el.url.value.trim() || 'https://example.com/page';
        var site = el.site.value.trim() || host(u);
        var cover = el.cover.value.trim();
        var h = host(u);
        var path = u.replace(/^https?:\/\/[^/]+/, '') || '/';

        TB.$('#tCount', root).textContent = el.title.value.length + ' / 60';
        TB.$('#dCount', root).textContent = el.desc.value.length + ' / 160';

        var coverHtml = cover
          ? '<div class="pv-cover" style="background-image:url(\'' + TB.esc(cover) + '\')"></div>'
          : '<div class="pv-cover pv-cover-ph">封面图</div>';

        el.pv.innerHTML =
          '<div class="pv-block"><div class="pv-label">Google 搜索结果</div>' +
            '<div class="pv-google"><div class="g-site"><span class="g-fav"></span>' + TB.esc(site) +
              '<span class="g-url">' + TB.esc(h + path) + '</span></div>' +
              '<div class="g-title">' + TB.esc(cut(t, 60)) + '</div>' +
              '<div class="g-desc">' + TB.esc(cut(d, 155)) + '</div></div>' +
            '<div class="pv-google pv-mobile"><div class="g-site"><span class="g-fav"></span>' + TB.esc(site) + '</div>' +
              '<div class="g-title">' + TB.esc(cut(t, 50)) + '</div>' +
              '<div class="g-desc">' + TB.esc(cut(d, 120)) + '</div></div></div>' +

          '<div class="pv-block"><div class="pv-label">微信 / 聊天分享卡片</div>' +
            '<div class="pv-wechat">' + coverHtml +
              '<div class="pv-wc-body"><div class="pv-wc-t">' + TB.esc(cut(t, 34)) + '</div>' +
              '<div class="pv-wc-d">' + TB.esc(cut(d, 40)) + '</div>' +
              '<div class="pv-wc-s">' + TB.esc(site) + '</div></div></div></div>' +

          '<div class="pv-block"><div class="pv-label">X / Twitter 大图卡</div>' +
            '<div class="pv-tw">' + coverHtml +
              '<div class="pv-tw-body"><div class="pv-tw-site">' + TB.esc(h) + '</div>' +
              '<div class="pv-tw-t">' + TB.esc(cut(t, 70)) + '</div>' +
              '<div class="pv-tw-d">' + TB.esc(cut(d, 120)) + '</div></div></div></div>';
      }

      [el.title, el.desc, el.url, el.site, el.cover].forEach(function (i) {
        i.addEventListener('input', paint);
      });

      TB.$('#demo', root).addEventListener('click', function () {
        el.title.value = '简单工具箱 · 138 个本地运行的在线小工具';
        el.desc.value = 'PDF 合并拆分、图片压缩、二维码美化、收款码三合一、JSON 格式化…… 全部在浏览器里完成，文件不上传服务器。';
        el.url.value = 'https://tools.432600.xyz/';
        el.site.value = '简单工具箱';
        paint();
      });

      TB.$('#copyMeta', root).addEventListener('click', function () {
        var t = el.title.value.trim(), d = el.desc.value.trim(), u = el.url.value.trim(), c = el.cover.value.trim();
        var lines = [
          '<title>' + (t || '页面标题') + '</title>',
          '<meta name="description" content="' + (d || '') + '">',
          '<meta property="og:title" content="' + (t || '') + '">',
          '<meta property="og:description" content="' + (d || '') + '">',
          '<meta property="og:url" content="' + (u || '') + '">'
        ];
        if (c) lines.push('<meta property="og:image" content="' + c + '">');
        TB.copy(lines.join('\n'));
        status(TB.$('#msg', root), '已复制 meta 标签到剪贴板。');
      });

      paint();
    }
  });

  /* ------------------------------------------------------- 2. 批量重命名 */
  TB.def({
    slug: 'batch-rename', cat: 'office', name: '批量重命名', desc: '规则预览 + 脚本导出', icon: '🏷️',
    kw: '批量 重命名 改名 rename 序号 前缀 后缀',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>文件名列表</b><span style="color:var(--ink-3)">一行一个，可直接粘贴，也可选择文件自动填入</span></div>' +
            '<textarea class="textarea" id="names" rows="6" spellcheck="false" placeholder="IMG_001.jpg&#10;IMG_002.jpg&#10;IMG_003.jpg"></textarea>' +
            '<div id="drop" style="margin-top:10px"></div></div>' +
          '<div class="field"><div class="label"><b>重命名规则</b></div>' +
            '<div class="row2"><input class="input" id="prefix" type="text" placeholder="前缀，如 2026_">' +
            '<input class="input" id="suffix" type="text" placeholder="后缀（在扩展名前），如 _终稿"></div>' +
            '<div class="row2" style="margin-top:8px"><input class="input" id="find" type="text" placeholder="查找">' +
            '<input class="input" id="repl" type="text" placeholder="替换为">' +
            '<label class="chk" style="white-space:nowrap"><input type="checkbox" id="regex"> 正则</label></div>' +
            '<div class="row3" style="margin-top:8px"><input class="input" id="seqStart" type="number" value="1" title="序号起始">' +
            '<input class="input" id="seqStep" type="number" value="1" title="序号步长">' +
            '<input class="input" id="seqDigits" type="number" value="3" min="1" max="8" title="序号位数"></div>' +
            '<label class="chk"><input type="checkbox" id="useSeq" checked> 添加序号</label>' +
            '<select class="select" id="case" style="margin-top:8px">' +
              '<option value="keep">大小写保持原样</option>' +
              '<option value="lower">扩展名转小写</option>' +
              '<option value="upper">扩展名转大写</option>' +
            '</select></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成预览</button>' +
            '<button class="btn" id="bat" disabled>下载 Windows .bat</button>' +
            '<button class="btn" id="sh" disabled>下载 macOS/Linux .sh</button>' +
            '<button class="btn" id="csv" disabled>下载对照表 CSV</button></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="panel" id="pvBox" hidden><div class="label"><b>预览</b><span id="pvCount" style="color:var(--ink-3)"></span></div>' +
          '<div id="pv" class="renamePv"></div></div>' +
        '<div class="note"><b>说明：</b>浏览器不能直接改你磁盘上的文件名，所以这里只生成<b>改名脚本</b>和对照表。.bat 放到文件夹里双击即可执行；执行前建议先备份。<b>脚本不会删除任何文件</b>，遇到同名会提示。</div>';

      var namesEl = TB.$('#names', root), msg = TB.$('#msg', root);
      var picker = TB.filePicker(TB.$('#drop', root), {
        accept: '', multiple: true, hint: '选择文件只读取文件名，不读取内容'
      });
      var preview = [], pvEl = TB.$('#pv', root), pvBox = TB.$('#pvBox', root);

      picker.onChange = function () {
        if (!picker.files.length) return;
        namesEl.value = picker.files.map(function (f) { return f.file.name; }).join('\n');
      };

      function splitName(name) {
        var i = name.lastIndexOf('.');
        if (i <= 0) return { base: name, ext: '' };
        return { base: name.slice(0, i), ext: name.slice(i) };
      }

      function build() {
        var lines = namesEl.value.split(/\r?\n/).map(function (s) { return s.trim(); })
          .filter(function (s) { return s; });
        if (!lines.length) throw new Error('请先填写文件名，或选择文件');

        var find = TB.$('#find', root).value;
        var repl = TB.$('#repl', root).value;
        var useRegex = TB.$('#regex', root).checked;
        var prefix = TB.$('#prefix', root).value;
        var suffix = TB.$('#suffix', root).value;
        var useSeq = TB.$('#useSeq', root).checked;
        var start = parseInt(TB.$('#seqStart', root).value, 10) || 1;
        var step = parseInt(TB.$('#seqStep', root).value, 10) || 1;
        var digits = parseInt(TB.$('#seqDigits', root).value, 10) || 3;
        var casing = TB.$('#case', root).value;
        var re = null;
        if (find) {
          try { re = useRegex ? new RegExp(find, 'g') : null; }
          catch (e) { throw new Error('正则表达式无效：' + e.message); }
        }

        return lines.map(function (name, i) {
          var p = splitName(name);
          var base = p.base, ext = p.ext;
          if (find) base = useRegex ? base.replace(re, repl) : base.split(find).join(repl);
          if (useSeq) base = base + '_' + String(start + i * step).padStart(digits, '0');
          base = prefix + base + suffix;
          if (casing === 'lower') ext = ext.toLowerCase();
          if (casing === 'upper') ext = ext.toUpperCase();
          return { from: name, to: base + ext };
        });
      }

      TB.$('#run', root).addEventListener('click', function () {
        try {
          preview = build();
          var dup = {};
          var warns = [];
          preview.forEach(function (r) {
            if (/[\\\/:*?"<>|]/.test(r.to)) warns.push('含非法字符：' + r.to);
            if (dup[r.to]) warns.push('重名：' + r.to);
            dup[r.to] = true;
            if (r.from === r.to) warns.push('没有变化：' + r.to);
          });
          pvEl.innerHTML = '<table class="renameTable"><thead><tr><th>#</th><th>原名</th><th>新名</th></tr></thead><tbody>' +
            preview.map(function (r, i) {
              var changed = r.from !== r.to;
              return '<tr><td>' + (i + 1) + '</td><td class="old">' + TB.esc(r.from) + '</td>' +
                '<td class="' + (changed ? 'new' : 'same') + '">' + TB.esc(r.to) + '</td></tr>';
            }).join('') + '</tbody></table>';
          pvBox.hidden = false;
          TB.$('#pvCount', root).textContent = preview.length + ' 个文件，' +
            preview.filter(function (r) { return r.from !== r.to; }).length + ' 个会改名';
          ['#bat', '#sh', '#csv'].forEach(function (s) { TB.$(s, root).disabled = false; });
          status(msg, warns.length ? '注意：' + warns.slice(0, 4).join('；') : '预览已生成，检查无误后下载脚本。', warns.length > 0);
        } catch (e) {
          status(msg, e.message, true);
        }
      });

      TB.$('#bat', root).addEventListener('click', function () {
        var lines = ['@echo off', 'chcp 65001 >nul', 'rem 由简单工具箱生成：批量重命名脚本', ''];
        preview.forEach(function (r) {
          if (r.from === r.to) return;
          lines.push('if exist "' + r.to + '" (echo 跳过，已存在：' + r.to + ') else ren "' + r.from + '" "' + r.to + '"');
        });
        lines.push('', 'echo 完成，按任意键关闭。', 'pause >nul');
        TB.downloadText(lines.join('\r\n'), '批量重命名.bat', 'application/x-bat');
      });

      TB.$('#sh', root).addEventListener('click', function () {
        var lines = ['#!/usr/bin/env bash', '# 由简单工具箱生成：批量重命名脚本', 'set -e', ''];
        preview.forEach(function (r) {
          if (r.from === r.to) return;
          lines.push('[ -e "' + r.to + '" ] && echo "跳过，已存在：' + r.to + '" || mv -- "' + r.from + '" "' + r.to + '"');
        });
        lines.push('', 'echo 完成');
        TB.downloadText(lines.join('\n'), '批量重命名.sh', 'text/x-shellscript');
      });

      TB.$('#csv', root).addEventListener('click', function () {
        var rows = [['原名', '新名']].concat(preview.map(function (r) { return [r.from, r.to]; }));
        var csv = '\uFEFF' + rows.map(function (r) {
          return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
        }).join('\n');
        TB.downloadText(csv, '重命名对照表.csv', 'text/csv');
      });
    }
  });

})();
