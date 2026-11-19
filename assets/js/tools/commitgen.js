/* =============================================================================
 * Git Commit 生成器
 * -----------------------------------------------------------------------------
 * 按 Conventional Commits 规范拼装提交信息：
 *   type(scope)!: subject
 *   + 空行 + body + 空行 + footer
 * 只生成文本，不执行 git 命令。
 * ========================================================================== */
(function () {
  'use strict';

  var TYPES = [
    ['feat', '新功能'],
    ['fix', '修复 bug'],
    ['docs', '文档'],
    ['style', '格式 / 样式'],
    ['refactor', '重构'],
    ['perf', '性能优化'],
    ['test', '测试'],
    ['build', '构建 / 依赖'],
    ['ci', 'CI 配置'],
    ['chore', '杂项'],
    ['revert', '回滚']
  ];

  var SAMPLE = {
    type: 'feat',
    scope: 'toolbox',
    subject: '增加 YAML 可视化查看器',
    body: '把 YAML 配置渲染为可折叠的树，支持点击复制 JSONPath。',
    footer: 'Refs: #180',
    breaking: false,
    note: ''
  };

  TB.def({
    slug: 'commitgen',
    cat: 'web',
    name: 'Git Commit 生成器',
    desc: '按 Conventional Commits 规范拼装提交信息。',
    icon: '🧾',
    kw: 'git commit 提交信息 conventional commits feat fix scope',
    render: function (ctx) {
      var root = ctx.root;
      var options = TYPES.map(function (t) {
        return '<option value="' + t[0] + '">' + t[0] + ' · ' + t[1] + '</option>';
      }).join('');

      root.innerHTML =
        '<div class="panel"><div class="panel-h">提交信息 <span class="hint">type(scope): subject</span></div>' +
          '<div class="row"><div class="field"><div class="label">类型</div><select class="select" id="cmType">' + options + '</select></div>' +
          '<div class="field"><div class="label">范围 scope（可选）</div><input class="input" id="cmScope" placeholder="例如 ui / api / toolbox"></div></div>' +
          '<div class="field"><div class="label">标题 subject</div><input class="input" id="cmSubject" placeholder="用一句话说明改了什么"></div>' +
          '<div class="field"><div class="label">正文 body（可选）</div><textarea class="textarea" id="cmBody" rows="3" placeholder="为什么改、影响范围、实现要点"></textarea></div>' +
          '<div class="field"><div class="label">页脚 footer（可选）</div><input class="input" id="cmFooter" placeholder="例如 Refs: #174 / Closes: #12"></div>' +
          '<div class="field"><label class="hint" style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="cmBreaking"> 这是破坏性变更（会在标题后加 !）</label></div>' +
          '<div class="field" id="cmNoteWrap" style="display:none"><div class="label">破坏性说明</div><input class="input" id="cmNote" placeholder="BREAKING CHANGE: 具体影响"></div>' +
          '<div class="btns"><button class="btn primary" id="cmCopy" type="button">复制提交信息</button>' +
            '<button class="btn" id="cmSample" type="button">载入示例</button>' +
            '<button class="btn" id="cmClear" type="button">清空</button></div>' +
          '<div class="hint" id="cmMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">预览</div><pre class="codeBox" id="cmOut" style="white-space:pre-wrap;overflow:auto"></pre></div>' +
        '<p class="note">遵循 Conventional Commits；标题建议不超过 72 个字符，正文和页脚之间用空行分隔。生成后仍需你自己执行 git commit。</p>';

      var type = TB.$('#cmType', root);
      var scope = TB.$('#cmScope', root);
      var subject = TB.$('#cmSubject', root);
      var body = TB.$('#cmBody', root);
      var footer = TB.$('#cmFooter', root);
      var breaking = TB.$('#cmBreaking', root);
      var noteWrap = TB.$('#cmNoteWrap', root);
      var note = TB.$('#cmNote', root);
      var out = TB.$('#cmOut', root);
      var msg = TB.$('#cmMsg', root);

      function build() {
        var head = type.value;
        var sc = scope.value.trim();
        if (sc) head += '(' + sc + ')';
        if (breaking.checked) head += '!';
        var sub = subject.value.trim();
        head += ': ' + (sub || '（填写标题）');

        var parts = [head];
        var b = body.value.trim();
        if (b) parts.push(b);
        var f = footer.value.trim();
        var n = note.value.trim();
        if (breaking.checked && n) f = (f ? f + '\n' : '') + 'BREAKING CHANGE: ' + n;
        if (f) parts.push(f);

        var text = parts.join('\n\n');
        out.textContent = text;
        var len = sub.length;
        msg.textContent = sub ? ('标题 ' + len + ' 个字符' + (len > 72 ? ' · 偏长，建议压缩到 72 以内' : '')) : '填写标题后自动生成';
      }

      function fill(data) {
        type.value = data.type;
        scope.value = data.scope;
        subject.value = data.subject;
        body.value = data.body;
        footer.value = data.footer;
        breaking.checked = data.breaking;
        note.value = data.note;
        noteWrap.style.display = data.breaking ? '' : 'none';
        build();
      }

      [type, scope, subject, body, footer, note].forEach(function (el) {
        el.addEventListener('input', build);
        el.addEventListener('change', build);
      });
      breaking.addEventListener('change', function () {
        noteWrap.style.display = breaking.checked ? '' : 'none';
        build();
      });

      TB.$('#cmCopy', root).addEventListener('click', function () {
        if (!subject.value.trim()) { TB.toast('先填写标题'); return; }
        TB.copy(out.textContent);
      });
      TB.$('#cmSample', root).addEventListener('click', function () { fill(SAMPLE); });
      TB.$('#cmClear', root).addEventListener('click', function () {
        fill({ type: 'feat', scope: '', subject: '', body: '', footer: '', breaking: false, note: '' });
      });

      fill(SAMPLE);
    }
  });
})();
