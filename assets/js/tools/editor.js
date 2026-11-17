/* =============================================================================
 * 轻量文本编辑器
 * -----------------------------------------------------------------------------
 * 多文档、行号、自动保存、TXT 导入导出。数据存在 localStorage，
 * 不上传服务器；清空浏览器数据会丢失内容。
 * ========================================================================== */

(function () {
  'use strict';

  var DOC_KEY = 'wl_editor_docs_v1';
  var CUR_KEY = 'wl_editor_current_v1';
  var FONT_KEY = 'wl_editor_font_v1';

  function uid() {
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadDocs() {
    var docs;
    try {
      docs = JSON.parse(localStorage.getItem(DOC_KEY) || '[]');
      if (!Array.isArray(docs)) docs = [];
    } catch (e) { docs = []; }
    docs = docs.filter(function (d) {
      return d && typeof d.id === 'string' && typeof d.name === 'string' && typeof d.text === 'string';
    });
    if (!docs.length) {
      docs = [{ id: uid(), name: '未命名文档', text: '', updated: Date.now() }];
    }
    return docs;
  }

  TB.def({
    slug: 'text-editor', cat: 'office', name: '轻量文本编辑器', desc: '多文档 · 行号 · 自动保存', icon: '📝',
    kw: '文本 编辑器 记事本 txt 行号 自动保存 多文档 写作 草稿',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="editor-bar">' +
            '<div class="editor-doc">' +
              '<select class="select" id="docSel" aria-label="切换文档"></select>' +
              '<input class="input" id="docName" aria-label="文档名称" maxlength="60" placeholder="文档名称">' +
            '</div>' +
            '<div class="btns" style="margin:0">' +
              '<button class="btn" id="newDoc">新建</button>' +
              '<button class="btn danger" id="delDoc">删除</button>' +
            '</div>' +
          '</div>' +
          '<div class="editor-wrap">' +
            '<div class="editor-gutter" id="gutter" aria-hidden="true"><div id="lineNums"></div></div>' +
            '<textarea class="editor-area" id="area" wrap="off" spellcheck="false" placeholder="在这里输入内容，Ctrl+S 可立即保存"></textarea>' +
          '</div>' +
          '<div class="editor-foot">' +
            '<span id="stat">1 行 · 0 字符</span>' +
            '<span id="saveState" class="editor-save">已保存</span>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn" id="import">导入 TXT</button>' +
            '<button class="btn" id="download">下载 TXT</button>' +
            '<button class="btn" id="copyAll">复制全文</button>' +
            '<button class="btn danger" id="clear">清空</button>' +
            '<label class="color-pick" style="margin-left:auto">字号' +
              '<button class="btn" id="fontDown" type="button" style="height:30px;padding:0 10px">−</button>' +
              '<button class="btn" id="fontUp" type="button" style="height:30px;padding:0 10px">+</button>' +
            '</label>' +
            '<input type="file" id="file" accept=".txt,text/plain" hidden>' +
          '</div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">内容自动保存在当前浏览器，不会上传；换浏览器、清理站点数据或使用无痕模式会丢失。建议重要内容及时下载 TXT。</div>';

      var docSel = TB.$('#docSel', root), docName = TB.$('#docName', root);
      var area = TB.$('#area', root), lineNums = TB.$('#lineNums', root), gutter = TB.$('#gutter', root);
      var stat = TB.$('#stat', root), saveState = TB.$('#saveState', root), msg = TB.$('#msg', root);

      var docs = loadDocs();
      var currentId = localStorage.getItem(CUR_KEY) || '';
      if (!docs.some(function (d) { return d.id === currentId; })) currentId = docs[0].id;
      var fontSize = Math.max(12, Math.min(22, parseInt(localStorage.getItem(FONT_KEY), 10) || 13));
      var saveTimer = null;

      function current() {
        for (var i = 0; i < docs.length; i++) if (docs[i].id === currentId) return docs[i];
        return docs[0];
      }

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function persist() {
        var d = current();
        d.text = area.value;
        d.updated = Date.now();
        try {
          localStorage.setItem(DOC_KEY, JSON.stringify(docs));
          localStorage.setItem(CUR_KEY, currentId);
          saveState.textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          showMsg('');
        } catch (e) {
          saveState.textContent = '保存失败';
          showMsg('本地存储写入失败，可能是空间已满：' + e.message);
        }
      }

      function scheduleSave() {
        saveState.textContent = '编辑中…';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(persist, 260);
      }

      function updateLines() {
        var text = area.value;
        var count = text.split('\n').length;
        var html = '';
        for (var i = 1; i <= count; i++) html += '<span>' + i + '</span>';
        lineNums.innerHTML = html;
        stat.textContent = count + ' 行 · ' + text.length + ' 字符';
        gutter.scrollTop = area.scrollTop;
      }

      function applyFont() {
        area.style.fontSize = fontSize + 'px';
        gutter.style.fontSize = fontSize + 'px';
      }

      function renderDocs() {
        docSel.innerHTML = '';
        docs.forEach(function (d) {
          var opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = d.name;
          docSel.appendChild(opt);
        });
        docSel.value = currentId;
      }

      function renderAll() {
        renderDocs();
        var d = current();
        docName.value = d.name;
        area.value = d.text;
        area.scrollTop = 0;
        applyFont();
        updateLines();
        saveState.textContent = '已保存';
      }

      docSel.addEventListener('change', function () {
        persist();
        currentId = docSel.value;
        localStorage.setItem(CUR_KEY, currentId);
        renderAll();
      });

      docName.addEventListener('change', function () {
        var name = docName.value.trim();
        if (!name) { docName.value = current().name; return; }
        current().name = name;
        persist();
        renderDocs();
      });

      TB.$('#newDoc', root).addEventListener('click', function () {
        persist();
        var base = '未命名文档', name = base, n = 2;
        while (docs.some(function (d) { return d.name === name; })) name = base + ' ' + n++;
        var d = { id: uid(), name: name, text: '', updated: Date.now() };
        docs.push(d);
        currentId = d.id;
        persist();
        renderAll();
        area.focus();
      });

      TB.$('#delDoc', root).addEventListener('click', function () {
        if (docs.length <= 1) { showMsg('至少保留一个文档'); return; }
        var d = current();
        if (!window.confirm('删除「' + d.name + '」？删除后无法恢复。')) return;
        docs = docs.filter(function (x) { return x.id !== d.id; });
        currentId = docs[0].id;
        persist();
        renderAll();
      });

      TB.$('#clear', root).addEventListener('click', function () {
        if (!area.value) return;
        if (!window.confirm('清空当前文档？')) return;
        area.value = '';
        updateLines();
        persist();
      });

      TB.$('#copyAll', root).addEventListener('click', function () {
        if (area.value) TB.copy(area.value);
      });

      TB.$('#download', root).addEventListener('click', function () {
        var d = current();
        TB.downloadText(area.value, (d.name || '未命名文档') + '.txt');
      });

      TB.$('#import', root).addEventListener('click', function () { TB.$('#file', root).click(); });
      TB.$('#file', root).addEventListener('change', async function () {
        var file = this.files && this.files[0];
        if (!file) return;
        try {
          var text = await TB.readText(file);
          persist();
          var name = file.name.replace(/\.txt$/i, '').slice(0, 60) || '导入文档';
          var d = { id: uid(), name: name, text: text, updated: Date.now() };
          docs.push(d);
          currentId = d.id;
          persist();
          renderAll();
        } catch (e) {
          showMsg('导入失败：' + e.message);
        }
        this.value = '';
      });

      area.addEventListener('input', function () { updateLines(); scheduleSave(); });
      area.addEventListener('scroll', function () { gutter.scrollTop = area.scrollTop; });
      area.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          clearTimeout(saveTimer);
          persist();
        }
      });

      TB.$('#fontDown', root).addEventListener('click', function () {
        fontSize = Math.max(12, fontSize - 1);
        localStorage.setItem(FONT_KEY, String(fontSize));
        applyFont();
        updateLines();
      });
      TB.$('#fontUp', root).addEventListener('click', function () {
        fontSize = Math.min(22, fontSize + 1);
        localStorage.setItem(FONT_KEY, String(fontSize));
        applyFont();
        updateLines();
      });

      renderAll();
    }
  });
})();
