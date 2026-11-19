/* =============================================================================
 * 代码片段管理器
 * -----------------------------------------------------------------------------
 * 在浏览器本地保存常用代码片段，支持标题、语言、标签、搜索、编辑、复制、
 * JSON 导入导出。数据只写入 localStorage，不会上传到任何服务器。
 * ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'wl_snippets';
  var LANGS = ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'SQL', 'Shell', 'JSON', 'YAML', 'Other'];

  function loadAll() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalize).filter(Boolean) : [];
    } catch (e) { return []; }
  }

  function normalize(item) {
    if (!item || typeof item !== 'object') return null;
    var lang = String(item.lang || 'Other');
    return {
      id: String(item.id || makeId()),
      title: String(item.title || '').slice(0, 120),
      lang: LANGS.indexOf(lang) >= 0 ? lang : 'Other',
      tags: Array.isArray(item.tags) ? item.tags.map(function (t) { return String(t).slice(0, 24); }).slice(0, 8) : [],
      code: String(item.code || ''),
      updated: Number(item.updated) || Date.now()
    };
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function saveAll(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      TB.toast('保存失败，可能是浏览器存储已满');
      return false;
    }
  }

  function tagsOf(text) {
    return String(text || '').split(/[\s,，、;；]+/).filter(Boolean).map(function (t) { return t.replace(/^#/, ''); }).slice(0, 8);
  }

  function dateText(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + TB.pad2(d.getMonth() + 1) + '-' + TB.pad2(d.getDate()) + ' ' + TB.pad2(d.getHours()) + ':' + TB.pad2(d.getMinutes());
  }

  TB.def({
    slug: 'snippets',
    cat: 'web',
    name: '代码片段管理器',
    desc: '本地保存代码片段，支持搜索、标签、复制与导入导出。',
    icon: '📌',
    kw: '代码 片段 snippet 剪贴板 代码收藏 本地存储 开发者',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel" id="snFormPanel"><div class="panel-h">片段编辑器 <span class="hint" id="snMode">新建</span></div>' +
          '<div class="row">' +
            '<div class="field" style="flex:2 1 220px"><div class="label">标题</div><input class="input" id="snTitle" placeholder="例如：数组去重" maxlength="120"></div>' +
            '<div class="field" style="flex:0 1 150px"><div class="label">语言</div><select class="select" id="snLang">' +
              LANGS.map(function (l) { return '<option value="' + l + '">' + l + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field" style="flex:1 1 180px"><div class="label">标签</div><input class="input" id="snTags" placeholder="用逗号或空格分隔"></div>' +
          '</div>' +
          '<div class="field"><div class="label">代码</div><textarea class="textarea" id="snCode" style="min-height:210px" spellcheck="false" placeholder="把代码粘贴到这里…"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="snSave" type="button">保存片段</button>' +
            '<button class="btn" id="snClear" type="button">清空表单</button>' +
            '<button class="btn" id="snSample" type="button">填入示例</button></div>' +
          '<div class="hint" id="snMsg" style="margin-top:8px"></div></div>' +
        '<div class="panel"><div class="panel-h">已保存片段 <span class="hint" id="snCount"></span></div>' +
          '<div class="sn-toolbar">' +
            '<input class="input" id="snSearch" placeholder="搜索标题、标签或代码…" style="flex:1 1 220px">' +
            '<select class="select" id="snFilter" style="width:auto"><option value="">全部语言</option>' +
              LANGS.map(function (l) { return '<option value="' + l + '">' + l + '</option>'; }).join('') +
            '</select>' +
            '<button class="btn sm" id="snExport" type="button">导出 JSON</button>' +
            '<button class="btn sm" id="snImportBtn" type="button">导入 JSON</button>' +
            '<input type="file" id="snImport" accept=".json,application/json" hidden>' +
          '</div>' +
          '<div class="sn-list" id="snList" style="margin-top:12px"></div></div>' +
        '<p class="note">片段保存在当前浏览器的 localStorage 中，换浏览器或清理站点数据后不会保留。不要在这里存密钥、令牌等敏感信息。</p>';

      var title = TB.$('#snTitle', root);
      var lang = TB.$('#snLang', root);
      var tags = TB.$('#snTags', root);
      var code = TB.$('#snCode', root);
      var msg = TB.$('#snMsg', root);
      var mode = TB.$('#snMode', root);
      var listBox = TB.$('#snList', root);
      var count = TB.$('#snCount', root);
      var search = TB.$('#snSearch', root);
      var filter = TB.$('#snFilter', root);
      var editingId = null;
      var snippets = loadAll();

      function setMode(id) {
        editingId = id || null;
        mode.textContent = editingId ? '编辑中' : '新建';
        TB.$('#snSave', root).textContent = editingId ? '更新片段' : '保存片段';
      }

      function resetForm() {
        title.value = '';
        lang.value = 'JavaScript';
        tags.value = '';
        code.value = '';
        msg.textContent = '';
        setMode(null);
      }

      function fillForm(item) {
        title.value = item.title;
        lang.value = item.lang;
        tags.value = item.tags.join(', ');
        code.value = item.code;
        setMode(item.id);
        msg.textContent = '正在编辑「' + item.title + '」';
        TB.$('#snFormPanel', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
        title.focus();
      }

      function render() {
        var q = search.value.trim().toLowerCase();
        var f = filter.value;
        var visible = snippets.filter(function (s) {
          if (f && s.lang !== f) return false;
          if (!q) return true;
          return (s.title + ' ' + s.tags.join(' ') + ' ' + s.code + ' ' + s.lang).toLowerCase().indexOf(q) >= 0;
        }).sort(function (a, b) { return b.updated - a.updated; });

        count.textContent = visible.length + ' / ' + snippets.length + ' 个';
        if (!visible.length) {
          listBox.innerHTML = '<div class="sn-empty">' + (snippets.length ? '没有匹配的片段，换个关键词试试。' : '还没有片段。写一个，或点击「填入示例」开始。') + '</div>';
          return;
        }

        listBox.innerHTML = visible.map(function (s) {
          var codePreview = s.code.length > 420 ? s.code.slice(0, 420) + '\n…' : s.code;
          return '<div class="sn-item" data-id="' + TB.esc(s.id) + '">' +
            '<div class="sn-head"><span class="sn-title">' + TB.esc(s.title) + '</span><span class="sn-lang">' + TB.esc(s.lang) + '</span>' +
              '<span class="sn-date">' + TB.esc(dateText(s.updated)) + '</span></div>' +
            (s.tags.length ? '<div class="sn-tags">' + s.tags.map(function (t) { return '<span class="sn-tag">#' + TB.esc(t) + '</span>'; }).join('') + '</div>' : '') +
            '<pre class="sn-code">' + TB.esc(codePreview) + '</pre>' +
            '<div class="sn-actions"><button class="btn tiny" data-act="copy">复制代码</button>' +
              '<button class="btn tiny" data-act="edit">编辑</button>' +
              '<button class="btn tiny danger" data-act="del">删除</button></div></div>';
        }).join('');

        TB.$$('.sn-item', listBox).forEach(function (el) {
          var id = el.getAttribute('data-id');
          var item = snippets.filter(function (s) { return s.id === id; })[0];
          if (!item) return;
          TB.$$('[data-act]', el).forEach(function (btn) {
            btn.addEventListener('click', function () {
              var act = btn.getAttribute('data-act');
              if (act === 'copy') TB.copy(item.code);
              else if (act === 'edit') fillForm(item);
              else if (act === 'del' && window.confirm('删除「' + item.title + '」？此操作不可撤销。')) {
                snippets = snippets.filter(function (s) { return s.id !== id; });
                saveAll(snippets);
                if (editingId === id) resetForm();
                render();
                TB.toast('已删除');
              }
            });
          });
        });
      }

      TB.$('#snSave', root).addEventListener('click', function () {
        var t = title.value.trim();
        var c = code.value;
        var wasEditing = !!editingId;
        if (!t) { msg.textContent = '请先填写标题'; title.focus(); return; }
        if (!c.trim()) { msg.textContent = '代码不能为空'; code.focus(); return; }
        if (c.length > 120000) { msg.textContent = '单个片段请不要超过 12 万字符'; return; }
        var data = { title: t, lang: lang.value, tags: tagsOf(tags.value), code: c, updated: Date.now() };
        if (editingId) {
          snippets = snippets.map(function (s) { return s.id === editingId ? Object.assign({}, s, data) : s; });
        } else {
          snippets.push(Object.assign({ id: makeId() }, data));
        }
        if (!saveAll(snippets)) return;
        resetForm();
        msg.textContent = wasEditing ? '已更新，可继续新建' : '已保存，可继续新建';
        render();
        TB.toast(wasEditing ? '片段已更新' : '片段已保存');
      });

      TB.$('#snClear', root).addEventListener('click', resetForm);
      TB.$('#snSample', root).addEventListener('click', function () {
        title.value = '防抖函数';
        lang.value = 'JavaScript';
        tags.value = '工具函数, 性能';
        code.value = 'function debounce(fn, wait) {\n  let timer = null;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}';
        msg.textContent = '示例已填入，点击「保存片段」即可收藏';
      });
      TB.$('#snExport', root).addEventListener('click', function () {
        if (!snippets.length) { TB.toast('还没有可导出的片段'); return; }
        TB.downloadText(JSON.stringify(snippets, null, 2), 'snippets-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
      });
      TB.$('#snImportBtn', root).addEventListener('click', function () { TB.$('#snImport', root).click(); });
      TB.$('#snImport', root).addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        TB.readText(file).then(function (text) {
          var parsed;
          try { parsed = JSON.parse(text); } catch (err) { TB.toast('JSON 格式不正确'); return; }
          var arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.snippets) ? parsed.snippets : null);
          if (!arr) { TB.toast('没有找到片段数组'); return; }
          var added = 0;
          arr.forEach(function (raw) {
            var item = normalize(raw);
            if (item && item.title && item.code) {
              item.id = makeId();
              item.updated = Date.now();
              snippets.push(item);
              added++;
            }
          });
          if (!added) { TB.toast('没有可导入的片段'); return; }
          saveAll(snippets);
          render();
          TB.toast('已导入 ' + added + ' 个片段');
        }).catch(function () { TB.toast('读取文件失败'); });
        e.target.value = '';
      });
      search.addEventListener('input', render);
      filter.addEventListener('change', render);

      render();
    }
  });
})();
