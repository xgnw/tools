/* =============================================================================
 * 课堂名单工具
 * -----------------------------------------------------------------------------
 * 粘贴班级名单后可以：
 *   - 按拼音 A→Z / Z→A 排序，或随机排序、恢复原顺序
 *   - 随机点名，默认一轮内不重复，点完自动开启下一轮
 *   - 名单自动保存在本机 localStorage，可导出 TXT / CSV
 * 拼音排序复用站点已有的本地 pinyin-pro（MIT），不额外引入新库。
 * ========================================================================== */

(function () {
  'use strict';

  var LS_KEY = 'tb_roster_names_v1';
  var SAMPLE = '张三\n李四\n王五\n赵六\n陈晨\n刘洋\n杨帆\n周悦\n吴桐\n徐宁';

  function parseNames(text) {
    return String(text || '')
      .split(/\r?\n|，|,|、|；|;|\t/)
      .map(function (s) { return s.trim().replace(/\s+/g, ' '); })
      .filter(Boolean);
  }

  function randomInt(max) {
    if (max <= 1) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function loadSaved() {
    try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; }
  }

  function saveLocal(text) {
    try { localStorage.setItem(LS_KEY, text); } catch (e) {}
  }

  function clearSaved() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  TB.def({
    slug: 'roster', cat: 'office', name: '课堂名单', desc: '拼音排序与随机点名', icon: '🙋',
    kw: '课堂 名单 姓名 排序 拼音 随机 点名 抽签 班级 学生 老师 花名册',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>班级名单</b><span style="color:var(--ink-3)">每行一个姓名，也可用逗号、顿号、分号分隔</span></div>' +
            '<textarea class="textarea" id="rsSrc" style="min-height:150px" spellcheck="false" placeholder="张三&#10;李四&#10;王五"></textarea></div>' +
          '<div class="btns" style="margin-top:0">' +
            '<button class="btn primary" id="rsLoad" type="button">载入 / 更新名单</button>' +
            '<button class="btn" id="rsCopy" type="button">复制名单</button>' +
            '<button class="btn" id="rsTxt" type="button">导出 TXT</button>' +
            '<button class="btn" id="rsCsv" type="button">导出 CSV</button>' +
            '<button class="btn danger" id="rsClear" type="button">清除本地名单</button>' +
          '</div>' +
          '<div id="rsMsg" class="rs-msg"></div>' +
          '<div class="rs-stats" id="rsStats"></div>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-h">排序<span class="hint" id="rsOrder">当前：原顺序</span></div>' +
          '<div class="btns" style="margin-top:0">' +
            '<button class="btn" id="rsAz" type="button">拼音 A → Z</button>' +
            '<button class="btn" id="rsZa" type="button">拼音 Z → A</button>' +
            '<button class="btn" id="rsRand" type="button">随机排序</button>' +
            '<button class="btn" id="rsOrig" type="button">恢复原序</button>' +
          '</div>' +
          '<div class="rs-list" id="rsList"></div>' +
        '</div>' +

        '<div class="panel rs-pick">' +
          '<div class="panel-h">随机点名<span class="hint">一轮内不重复；点完自动开启下一轮</span></div>' +
          '<div class="rs-hero" id="rsHero"><span>准备开始</span></div>' +
          '<div class="btns" style="justify-content:center">' +
            '<button class="btn primary" id="rsPick" type="button">开始点名</button>' +
            '<button class="btn" id="rsResetDraw" type="button">重置本轮</button>' +
            '<button class="btn" id="rsClearLog" type="button">清空记录</button>' +
          '</div>' +
          '<div class="rs-pool" id="rsPool"></div>' +
          '<div class="rs-log" id="rsLog"></div>' +
        '</div>' +

        '<div class="note">名单只保存在本机浏览器（localStorage），不会上传服务器；清除浏览器数据或点“清除本地名单”会删除。拼音排序使用本地 pinyin-pro，多音字姓名建议排序后人工核对；本工具不提供笔画排序。</div>';

      var src = TB.$('#rsSrc', root);
      var msg = TB.$('#rsMsg', root);
      var stats = TB.$('#rsStats', root);
      var list = TB.$('#rsList', root);
      var orderEl = TB.$('#rsOrder', root);
      var hero = TB.$('#rsHero', root);
      var poolEl = TB.$('#rsPool', root);
      var logEl = TB.$('#rsLog', root);

      var names = [];       /* 原始顺序 */
      var view = [];        /* 当前展示 [{name, py}] */
      var pyMap = Object.create(null); /* name -> 拼音，避免 __proto__ 等特殊姓名 */
      var order = 'original';
      var pool = [];        /* 本轮未点到的姓名 */
      var history = [];
      var animTimers = [];
      var picking = false;

      function alive() { return root.isConnected; }
      function stopAnim() {
        animTimers.forEach(function (t) { clearTimeout(t); });
        animTimers = [];
      }

      function showMsg(text, isErr) {
        msg.innerHTML = text ? '<div class="note rs-note"><span class="' + (isErr ? 'result-err' : 'result-ok') + '">' + TB.esc(text) + '</span></div>' : '';
      }

      function readNames() {
        names = parseNames(src.value);
        view = names.map(function (n) { return { name: n, py: pyMap[n] || '' }; });
        pool = names.slice();
        history = [];
        order = 'original';
        orderEl.textContent = '当前：原顺序';
        hero.innerHTML = '<span>准备开始</span>';
        renderAll();
      }

      function duplicates() {
        var seen = Object.create(null), dup = 0;
        names.forEach(function (n) {
          if (seen[n]) dup++; else seen[n] = 1;
        });
        return dup;
      }

      function renderAll() {
        var dup = duplicates();
        stats.innerHTML =
          '<span>总人数 <b>' + names.length + '</b></span>' +
          '<span>唯一姓名 <b>' + (names.length - dup) + '</b></span>' +
          (dup ? '<span class="result-err">重复 ' + dup + ' 个</span>' : '<span>无重名</span>');
        list.innerHTML = view.length ? view.map(function (v, i) {
          return '<div class="rs-row">' +
            '<span class="rs-idx">' + (i + 1) + '</span>' +
            '<b class="rs-name">' + TB.esc(v.name) + '</b>' +
            '<span class="rs-py">' + (v.py ? TB.esc(v.py) : '—') + '</span>' +
          '</div>';
        }).join('') : '<div class="rs-empty">尚未载入名单</div>';
        poolEl.textContent = names.length ? '本轮剩余 ' + pool.length + ' / ' + names.length + ' 人' : '';
        renderLog();
      }

      function renderLog() {
        logEl.innerHTML = history.length
          ? '<span class="rs-log-h">已点：</span>' + history.map(function (n) { return '<span class="rs-chip">' + TB.esc(n) + '</span>'; }).join('')
          : '';
      }

      function comparePy(a, b) {
        var pa = pyMap[a] || a;
        var pb = pyMap[b] || b;
        return pa.localeCompare(pb, 'zh-Hans-CN', { sensitivity: 'base' });
      }

      async function ensurePinyin() {
        if (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') return;
        showMsg('正在加载本地拼音库…');
        await TB.loadLib('pinyin-pro.min.js');
        if (!window.pinyinPro || typeof window.pinyinPro.pinyin !== 'function') throw new Error('拼音库加载失败');
        showMsg('');
      }

      function buildPy() {
        names.forEach(function (n) {
          try {
            pyMap[n] = window.pinyinPro.pinyin(n, { toneType: 'none', separator: ' ' }).toLowerCase();
          } catch (e) { pyMap[n] = ''; }
        });
      }

      function setView(next, label) {
        order = label;
        view = next.map(function (n) { return { name: n, py: pyMap[n] || '' }; });
        var labelText = ({ pinyin: '拼音 A → Z', reverse: '拼音 Z → A', random: '随机排序', original: '原顺序' })[label] || label;
        orderEl.textContent = '当前：' + labelText;
        renderAll();
      }

      async function sortPinyin(reverse) {
        if (!names.length) { showMsg('请先载入名单', true); return; }
        try {
          await ensurePinyin();
          buildPy();
          var sorted = names.slice().sort(comparePy);
          if (reverse) sorted.reverse();
          setView(sorted, reverse ? 'reverse' : 'pinyin');
          showMsg(reverse ? '已按拼音 Z → A 排序' : '已按拼音 A → Z 排序');
        } catch (e) {
          showMsg('拼音排序失败：' + (e.message || e), true);
        }
      }

      function pick() {
        if (!names.length) { showMsg('请先载入名单', true); return; }
        if (picking) return;
        var restarted = false;
        if (!pool.length) {
          pool = names.slice();
          restarted = true;
        }
        picking = true;
        TB.$('#rsPick', root).disabled = true;
        stopAnim();

        var chosen = pool[randomInt(pool.length)];
        var idx = pool.indexOf(chosen);
        if (idx >= 0) pool.splice(idx, 1);

        var step = 0;
        function tick() {
          if (!alive()) { stopAnim(); return; }
          if (step < 14) {
            hero.innerHTML = '<span class="rs-rolling">' + TB.esc(names[randomInt(names.length)]) + '</span>';
            step++;
            animTimers.push(setTimeout(tick, 45 + step * 3));
            return;
          }
          hero.innerHTML = '<span>' + TB.esc(chosen) + '</span>';
          history.unshift(chosen);
          if (history.length > 30) history.pop();
          picking = false;
          TB.$('#rsPick', root).disabled = false;
          renderAll();
          showMsg((restarted ? '上一轮已点完，已自动开启新一轮；' : '') + '点到：' + chosen);
        }
        tick();
      }

      /* 输入时自动保存，但等用户点“载入”再解析名单，避免打字过程中列表频繁跳动 */
      var saveTimer = null;
      src.addEventListener('input', function () {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { saveLocal(src.value); }, 400);
      });

      TB.$('#rsLoad', root).addEventListener('click', function () {
        saveLocal(src.value);
        readNames();
        showMsg(names.length ? '已载入 ' + names.length + ' 人' : '名单为空', !names.length);
      });

      TB.$('#rsCopy', root).addEventListener('click', function () {
        if (!names.length) { showMsg('名单为空', true); return; }
        TB.copy(view.map(function (v) { return v.name; }).join('\n'));
      });

      TB.$('#rsTxt', root).addEventListener('click', function () {
        if (!names.length) { showMsg('名单为空', true); return; }
        TB.downloadText(view.map(function (v, i) { return (i + 1) + '. ' + v.name + (v.py ? '（' + v.py + '）' : ''); }).join('\n'), '课堂名单.txt');
      });

      TB.$('#rsCsv', root).addEventListener('click', function () {
        if (!names.length) { showMsg('名单为空', true); return; }
        var rows = ['序号,姓名,拼音'].concat(view.map(function (v, i) {
          return (i + 1) + ',"' + v.name.replace(/"/g, '""') + '","' + (v.py || '').replace(/"/g, '""') + '"';
        }));
        TB.downloadText('\ufeff' + rows.join('\r\n'), '课堂名单.csv', 'text/csv');
      });

      TB.$('#rsClear', root).addEventListener('click', function () {
        src.value = '';
        saveLocal('');
        clearSaved();
        names = []; view = []; pool = []; history = []; pyMap = {};
        order = 'original';
        hero.innerHTML = '<span>准备开始</span>';
        renderAll();
        showMsg('已清除本地名单', false);
      });

      TB.$('#rsAz', root).addEventListener('click', function () { sortPinyin(false); });
      TB.$('#rsZa', root).addEventListener('click', function () { sortPinyin(true); });
      TB.$('#rsRand', root).addEventListener('click', function () {
        if (!names.length) { showMsg('请先载入名单', true); return; }
        setView(shuffle(names), 'random');
        showMsg('已随机排序');
      });
      TB.$('#rsOrig', root).addEventListener('click', function () {
        if (!names.length) { showMsg('请先载入名单', true); return; }
        setView(names.slice(), 'original');
        showMsg('已恢复原顺序');
      });

      TB.$('#rsPick', root).addEventListener('click', pick);
      TB.$('#rsResetDraw', root).addEventListener('click', function () {
        pool = names.slice();
        renderAll();
        showMsg('本轮点名已重置');
      });
      TB.$('#rsClearLog', root).addEventListener('click', function () {
        history = [];
        renderLog();
      });

      /* 初始化：优先读取本地保存，否则给一份示例名单 */
      var saved = loadSaved();
      src.value = saved || SAMPLE;
      if (saved) readNames(); else { names = parseNames(src.value); view = names.map(function (n) { return { name: n, py: '' }; }); pool = names.slice(); renderAll(); }
    }
  });
})();
