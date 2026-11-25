/* =============================================================================
 * PDF 表单填写
 * -----------------------------------------------------------------------------
 * 用本地 pdf-lib 读取 AcroForm 字段，在浏览器里填写文本、复选框、下拉框和单选组，
 * 可选扁平化后下载。扫描版 PDF 没有表单字段，本工具不会假装能填。
 * ========================================================================== */

(function () {
  'use strict';

  var PDFLib = function () { return window.PDFLib; };

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note pf-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function typeOf(field) {
    var L = window.PDFLib;
    if (L) {
      if (L.PDFTextField && field instanceof L.PDFTextField) return 'PDFTextField';
      if (L.PDFCheckBox && field instanceof L.PDFCheckBox) return 'PDFCheckBox';
      if (L.PDFDropdown && field instanceof L.PDFDropdown) return 'PDFDropdown';
      if (L.PDFRadioGroup && field instanceof L.PDFRadioGroup) return 'PDFRadioGroup';
      if (L.PDFOptionList && field instanceof L.PDFOptionList) return 'PDFOptionList';
    }
    return field && field.constructor ? field.constructor.name : '';
  }

  function fieldValue(field, type) {
    try {
      if (type === 'PDFTextField') return field.getText() || '';
      if (type === 'PDFCheckBox') return field.isChecked();
      if (type === 'PDFDropdown' || type === 'PDFRadioGroup') {
        var sel = field.getSelected();
        return Array.isArray(sel) ? (sel[0] || '') : (sel || '');
      }
      if (type === 'PDFOptionList') {
        var list = field.getSelected();
        return Array.isArray(list) ? list : [];
      }
    } catch (e) {}
    return '';
  }

  TB.def({
    slug: 'pdf-form', cat: 'office', name: 'PDF 表单填写', desc: '填写 AcroForm 并扁平化下载',
    icon: '🧾', kw: 'pdf 表单 form acroform 填写 填充 复选框 下拉框 签名 扁平化',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">选择 PDF<span class="hint">支持带 AcroForm 字段的 PDF，不上传文件</span></div>' +
          '<div id="pfPick"></div>' +
          '<div id="pfInfo" class="pf-info"></div>' +
          '<div class="btns">' +
            '<button class="btn" id="pfReload" type="button">重新读取</button>' +
            '<label class="pf-check"><input type="checkbox" id="pfFlat" checked> 扁平化（推荐，避免阅读器字体差异）</label>' +
          '</div>' +
          '<div id="pfMsg" class="pf-msg"></div>' +
        '</div>' +
        '<div class="panel" id="pfPanel" hidden>' +
          '<div class="panel-h">表单字段<span class="hint" id="pfCount"></span></div>' +
          '<div id="pfFields" class="pf-fields"></div>' +
          '<div class="btns"><button class="btn primary" id="pfFill" type="button" disabled>填写并下载 PDF</button>' +
            '<button class="btn" id="pfReset" type="button">重置为原值</button></div>' +
          '<div class="note">字段名和当前值来自 PDF 自带的 AcroForm。中文字体由原 PDF 的表单字体决定，若填写后显示异常，请勾选“扁平化”或改用支持中文的表单模板；扫描版 PDF 没有可填写字段。</div>' +
        '</div>';

      var pick = TB.filePicker(TB.$('#pfPick', root), { accept: 'application/pdf,.pdf', hint: '一个带表单字段的 PDF' });
      var msg = TB.$('#pfMsg', root);
      var info = TB.$('#pfInfo', root);
      var panel = TB.$('#pfPanel', root);
      var fieldsEl = TB.$('#pfFields', root);
      var countEl = TB.$('#pfCount', root);
      var fillBtn = TB.$('#pfFill', root);
      var flat = TB.$('#pfFlat', root);
      var doc = null;
      var form = null;
      var fields = [];
      var originalValues = [];
      var loadSeq = 0;

      function renderFields() {
        panel.hidden = false;
        countEl.textContent = fields.length ? fields.length + ' 个字段' : '';
        if (!fields.length) {
          fieldsEl.innerHTML = '<div class="pf-empty">这个 PDF 没有可填写的 AcroForm 字段。扫描版 / 图片型 PDF 需要先用 OCR 或 PDF 编辑工具添加表单。</div>';
          fillBtn.disabled = true;
          return;
        }
        fieldsEl.innerHTML = fields.map(function (f, i) {
          var type = typeOf(f);
          var name = f.getName ? f.getName() : ('字段 ' + (i + 1));
          var label = TB.esc(name);
          var body = '';
          if (type === 'PDFTextField') {
            body = '<input class="input pf-input" data-i="' + i + '" value="' + TB.esc(fieldValue(f, type)) + '" autocomplete="off" spellcheck="false">';
          } else if (type === 'PDFCheckBox') {
            body = '<label class="pf-cb"><input type="checkbox" data-i="' + i + '"' + (fieldValue(f, type) ? ' checked' : '') + '> 勾选</label>';
          } else if (type === 'PDFDropdown' || type === 'PDFRadioGroup' || type === 'PDFOptionList') {
            var opts = [];
            try { opts = f.getOptions() || []; } catch (e) {}
            var selected = fieldValue(f, type);
            var multiple = type === 'PDFOptionList';
            body = '<select class="select pf-select" data-i="' + i + '"' + (multiple ? ' multiple' : '') + '>' +
              (multiple ? '' : '<option value="">（不选择）</option>') +
              opts.map(function (o) {
                var on = multiple ? selected.indexOf(o) >= 0 : selected === o;
                return '<option value="' + TB.esc(o) + '"' + (on ? ' selected' : '') + '>' + TB.esc(o) + '</option>';
              }).join('') + '</select>';
          } else {
            body = '<span class="pf-unsupported">暂不支持此字段类型：' + TB.esc(type || '未知') + '</span>';
          }
          return '<div class="pf-field" data-field="' + i + '">' +
            '<div class="pf-label"><b>' + label + '</b><span>' + TB.esc(type.replace(/^PDF/, '')) + '</span></div>' +
            '<div class="pf-control">' + body + '</div></div>';
        }).join('');
        fillBtn.disabled = false;
        originalValues = fields.map(function (f, i) { return fieldValue(f, typeOf(f)); });
      }

      async function scan() {
        var item = pick.files[0];
        if (!item) { status(msg, '请先选择 PDF 文件', true); return; }
        var my = ++loadSeq;
        doc = null; form = null; fields = [];
        panel.hidden = true;
        fillBtn.disabled = true;
        info.textContent = '正在读取…';
        status(msg, '正在解析 PDF 表单…');
        try {
          await TB.loadLib('pdf-lib.min.js');
          if (my !== loadSeq) return;
          var buf = await TB.readArrayBuffer(item.file);
          if (my !== loadSeq) return;
          doc = await PDFLib().PDFDocument.load(buf, { ignoreEncryption: true });
          if (my !== loadSeq) return;
          form = doc.getForm();
          fields = form.getFields();
          info.innerHTML = '<b>' + TB.esc(item.file.name) + '</b> · ' + TB.fmtBytes(item.file.size) + ' · ' + doc.getPageCount() + ' 页';
          renderFields();
          status(msg, fields.length ? '已读取 ' + fields.length + ' 个字段' : '这个 PDF 没有可填写的表单字段', !fields.length);
        } catch (e) {
          if (my !== loadSeq) return;
          info.textContent = '读取失败';
          status(msg, '读取失败：' + (e && e.message ? e.message : 'PDF 可能已加密或不是有效的表单'), true);
        }
      }

      function collectValues() {
        var values = [];
        fieldsEl.querySelectorAll('[data-i]').forEach(function (el) {
          var i = Number(el.getAttribute('data-i'));
          values[i] = el.type === 'checkbox' ? el.checked :
            el.tagName === 'SELECT' && el.multiple ? Array.prototype.map.call(el.selectedOptions, function (o) { return o.value; }) : el.value;
        });
        return values;
      }

      async function fill() {
        if (!doc || !fields.length) return;
        var values = collectValues();
        var failed = [];
        fields.forEach(function (f, i) {
          var type = typeOf(f);
          try {
            if (type === 'PDFTextField') f.setText(String(values[i] == null ? '' : values[i]));
            else if (type === 'PDFCheckBox') { if (values[i]) f.check(); else f.uncheck(); }
            else if (type === 'PDFDropdown' || type === 'PDFRadioGroup') { if (values[i]) f.select(values[i]); }
            else if (type === 'PDFOptionList') {
              var list = Array.isArray(values[i]) ? values[i] : (values[i] ? [values[i]] : []);
              f.select(list);
            }
          } catch (e) { failed.push(f.getName ? f.getName() : ('字段 ' + (i + 1))); }
        });
        if (flat.checked) {
          try { form.flatten(); }
          catch (e) { failed.push('扁平化'); }
        }
        try {
          var bytes = await doc.save();
          var base = (pick.files[0] && pick.files[0].file.name || 'document.pdf').replace(/\.pdf$/i, '');
          TB.download(new Blob([bytes], { type: 'application/pdf' }), base + '-filled.pdf');
          fillBtn.disabled = true;
          status(msg, failed.length ? '已下载，但有 ' + failed.length + ' 个字段处理失败：' + failed.join('、') : '已填写并下载；如需再次填写，请重新读取 PDF', failed.length > 0);
        } catch (e) {
          status(msg, '保存失败：' + (e && e.message ? e.message : 'PDF 写入出错'), true);
        }
      }

      pick.onChange = function () {
        if (pick.files[0]) scan();
        else { loadSeq++; info.textContent = ''; panel.hidden = true; status(msg, ''); }
      };
      TB.$('#pfReload', root).addEventListener('click', scan);
      TB.$('#pfReset', root).addEventListener('click', function () {
        if (!fields.length) return;
        fieldsEl.querySelectorAll('[data-i]').forEach(function (el) {
          var i = Number(el.getAttribute('data-i'));
          var type = typeOf(fields[i]);
          if (type === 'PDFCheckBox') el.checked = !!originalValues[i];
          else if (el.tagName === 'SELECT' && el.multiple) {
            Array.prototype.forEach.call(el.options, function (o) { o.selected = (originalValues[i] || []).indexOf(o.value) >= 0; });
          } else el.value = originalValues[i] == null ? '' : originalValues[i];
        });
        status(msg, '已恢复为读取时的值');
      });
      fillBtn.addEventListener('click', fill);
    }
  });
})();
