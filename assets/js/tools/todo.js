/* =============================================================================
 * 智能待办清单
 * -----------------------------------------------------------------------------
 * 支持自然语言快速添加（今天 / 明天 / 周几 / 几月几日、!高 / !中 / !低），
 * 任务保存在 localStorage；不登录、不上传。
 * ========================================================================== */

(function () {
  'use strict';

  var KEY = 'wl_todo_v1';

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  /* 从自然语言里解析日期 */
  function parseDate(text) {
    var t = text, now = today();
    var m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = t.match(/(\d{1,2})月(\d{1,2})[日号]/);
    if (m) {
      var y = now.getFullYear();
      var d = new Date(y, +m[1] - 1, +m[2]);
      if (d < now) d.setFullYear(y + 1);
      return dateStr(d);
    }
    if (/后天/.test(t)) { now.setDate(now.getDate() + 2); return dateStr(now); }
    if (/明天/.test(t)) { now.setDate(now.getDate() + 1); return dateStr(now); }
    if (/今天/.test(t)) return dateStr(now);
    m = t.match(/(?:周|星期)([一二三四五六日天])/);
    if (m) {
      var map = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
      var target = map[m[1]];
      var diff = (target - now.getDay() + 7) % 7;
      if (diff === 0) diff = 0;
      now.setDate(now.getDate() + diff);
      return dateStr(now);
    }
    return '';
  }

  function parsePriority(text) {
    if (/(?:[!！]\s*高|#高|重要)/.test(text)) return 'high';
    if (/(?:[!！]\s*低|#低|不急)/.test(text)) return 'low';
    if (/(?:[!！]\s*中|#中)/.test(text)) return 'mid';
    return '';
  }

  function cleanText(text) {
    return text
      .replace(/(\d{4})[-/.]\d{1,2}[-/.]\d{1,2}/g, '')
      .replace(/\d{1,2}月\d{1,2}[日号]/g, '')
      .replace(/今天|明天|后天/g, '')
      .replace(/(?:周|星期)[一二三四五六日天]/g, '')
      .replace(/[!！]\s*(?:高|中|低)/g, '')
      .replace(/#(?:高|中|低)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function dueText(due) {
    if (!due) return '';
    var now = today();
    var d = new Date(due + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    var days = Math.round((d - now) / 86400000);
    if (days < 0) return '已逾期 ' + Math.abs(days) + ' 天';
    if (days === 0) return '今天';
    if (days === 1) return '明天';
    if (days === 2) return '后天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  TB.def({
    slug: 'smart-todo', cat: 'office', name: '智能待办清单', desc: '自然语言添加 · 本地保存', icon: '✅',
    kw: '待办 todo 任务 清单 提醒 优先级 截止日期 本地',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="todo-add">' +
            '<input class="input" id="txt" maxlength="120" placeholder="例如：明天下午 交周报 !高">' +
            '<input class="input" id="due" type="date" aria-label="截止日期">' +
            '<select class="select" id="pri" aria-label="优先级">' +
              '<option value="high">高优先级</option>' +
              '<option value="mid" selected>中优先级</option>' +
              '<option value="low">低优先级</option>' +
            '</select>' +
            '<button class="btn primary" id="add">添加</button>' +
          '</div>' +
          '<div class="todo-bar">' +
            '<div class="seg" id="filters" style="margin:0">' +
              '<button data-f="all" class="on" type="button">全部</button>' +
              '<button data-f="todo" type="button">待办</button>' +
              '<button data-f="done" type="button">已完成</button>' +
            '</div>' +
            '<span id="count" class="todo-count"></span>' +
            '<button class="btn sm" id="clearDone" type="button">清除已完成</button>' +
          '</div>' +
          '<div id="list" class="todo-list"></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">快速添加会识别「今天 / 明天 / 后天 / 周一 / 5月20日」和「!高 / !中 / !低」。任务只存在当前浏览器，换设备不会同步。</div>';

      var txt = TB.$('#txt', root), due = TB.$('#due', root), pri = TB.$('#pri', root);
      var listEl = TB.$('#list', root), countEl = TB.$('#count', root), msg = TB.$('#msg', root);
      var filter = 'all';
      var tasks;

      try {
        tasks = JSON.parse(localStorage.getItem(KEY) || '[]');
        if (!Array.isArray(tasks)) tasks = [];
      } catch (e) { tasks = []; }
      tasks = tasks.filter(function (t) { return t && typeof t.text === 'string'; });

      function save() {
        try { localStorage.setItem(KEY, JSON.stringify(tasks)); }
        catch (e) { showMsg('本地保存失败：' + e.message); }
      }

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function add() {
        var raw = txt.value.trim();
        if (!raw) { txt.focus(); return; }
        var text = cleanText(raw) || raw;
        var p = parsePriority(raw) || pri.value || 'mid';
        var d = due.value || parseDate(raw);
        tasks.push({
          id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          text: text, done: false, due: d, priority: p,
          created: Date.now()
        });
        txt.value = ''; due.value = ''; pri.value = 'mid';
        save(); render(); txt.focus();
      }

      function ordered() {
        var rank = { high: 0, mid: 1, low: 2 };
        return tasks.slice().sort(function (a, b) {
          if (!!a.done !== !!b.done) return a.done ? 1 : -1;
          if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
          if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
          if (a.due && !b.due) return -1;
          if (!a.due && b.due) return 1;
          return b.created - a.created;
        });
      }

      function render() {
        var shown = ordered().filter(function (t) {
          return filter === 'all' || (filter === 'todo' ? !t.done : t.done);
        });
        var done = tasks.filter(function (t) { return t.done; }).length;
        countEl.textContent = (tasks.length - done) + ' 待办 · ' + done + ' 已完成';

        if (!shown.length) {
          listEl.innerHTML = '<div class="todo-empty">' +
            (tasks.length ? '这个筛选下没有任务' : '还没有任务，先添加一条吧') + '</div>';
          return;
        }

        listEl.innerHTML = shown.map(function (t) {
          var dueLabel = dueText(t.due);
          var overdue = dueLabel.indexOf('逾期') >= 0;
          var pLabel = t.priority === 'high' ? '高' : t.priority === 'low' ? '低' : '中';
          return '<div class="todo-item' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
            '<input type="checkbox" data-act="toggle"' + (t.done ? ' checked' : '') + ' aria-label="标记完成">' +
            '<div class="todo-main">' +
              '<div class="todo-text" title="双击编辑">' + TB.esc(t.text) + '</div>' +
              '<div class="todo-meta">' +
                '<span class="todo-pri ' + t.priority + '">' + pLabel + '</span>' +
                (dueLabel ? '<span class="todo-due' + (overdue ? ' overdue' : '') + '">' + TB.esc(dueLabel) + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<button class="mini" data-act="edit" title="编辑">✎</button>' +
            '<button class="mini del" data-act="del" title="删除">✕</button>' +
          '</div>';
        }).join('');
      }

      function taskOf(el) {
        var id = el.closest('.todo-item').getAttribute('data-id');
        for (var i = 0; i < tasks.length; i++) if (tasks[i].id === id) return tasks[i];
        return null;
      }

      function edit(row) {
        var t = taskOf(row);
        if (!t) return;
        var box = row.querySelector('.todo-text');
        var input = document.createElement('input');
        input.className = 'input todo-edit';
        input.value = t.text;
        box.replaceWith(input);
        input.focus();
        input.select();
        function finish(saveIt) {
          if (saveIt && input.value.trim()) t.text = input.value.trim();
          save(); render();
        }
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); finish(true); }
          if (e.key === 'Escape') finish(false);
        });
        input.addEventListener('blur', function () { finish(true); });
      }

      listEl.addEventListener('change', function (e) {
        var cb = e.target.closest('input[data-act="toggle"]');
        if (!cb) return;
        var t = taskOf(cb);
        if (t) { t.done = cb.checked; save(); render(); }
      });

      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var t = taskOf(btn);
        if (!t) return;
        if (btn.getAttribute('data-act') === 'edit') { edit(btn.closest('.todo-item')); return; }
        if (btn.getAttribute('data-act') === 'del') {
          if (!window.confirm('删除「' + t.text + '」？')) return;
          tasks = tasks.filter(function (x) { return x.id !== t.id; });
          save(); render();
        }
      });

      listEl.addEventListener('dblclick', function (e) {
        var box = e.target.closest('.todo-text');
        if (box) edit(box.closest('.todo-item'));
      });

      TB.$('#add', root).addEventListener('click', add);
      txt.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });

      TB.$('#filters', root).addEventListener('click', function (e) {
        var b = e.target.closest('button[data-f]');
        if (!b) return;
        filter = b.getAttribute('data-f');
        TB.$$('#filters button', root).forEach(function (x) { x.classList.toggle('on', x === b); });
        render();
      });

      TB.$('#clearDone', root).addEventListener('click', function () {
        if (!tasks.some(function (t) { return t.done; })) return;
        if (!window.confirm('清除所有已完成任务？')) return;
        tasks = tasks.filter(function (t) { return !t.done; });
        save(); render();
      });

      /* 日期与优先级都由输入框 / 下拉框接管；自然语言解析只在日期为空时生效 */
      render();
    }
  });
})();
