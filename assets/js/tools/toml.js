/* =============================================================================
 * TOML ⇄ JSON
 * -----------------------------------------------------------------------------
 * 依赖本地 assets/lib/smol-toml.js（BSD-3-Clause），不请求外部 CDN。
 * 双向转换；TOML 的日期会以 ISO 字符串进入 JSON，JSON 的 null 无法写入 TOML。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE_TOML = [
    'title = "TOML 示例"',
    'enabled = true',
    'ports = [ 8001, 8002, 8003 ]',
    '',
    '[owner]',
    'name = "Tom"',
    'age = 30',
    'email = "tom@example.com"',
    '',
    '[database]',
    'server = "192.168.1.1"',
    'connection_max = 5000',
    'enabled = true'
  ].join('\n');

  var SAMPLE_JSON = {
    title: 'TOML 示例',
    enabled: true,
    ports: [8001, 8002, 8003],
    owner: { name: 'Tom', age: 30, email: 'tom@example.com' },
    database: { server: '192.168.1.1', connection_max: 5000, enabled: true }
  };

  function loadToml() {
    return TB.loadLib('smol-toml.js').then(function () {
      if (!window.SmolTOML) throw new Error('TOML 解析库初始化失败');
      return window.SmolTOML;
    });
  }

  function jsonStringify(value) {
    return JSON.stringify(value, null, 2);
  }

  TB.def({
    slug: 'tomljson',
    cat: 'web',
    name: 'TOML ⇄ JSON',
    desc: '在 TOML 配置与 JSON 之间双向转换，支持嵌套表、数组和日期。',
    icon: '🔁',
    kw: 'toml json 转换 配置文件 cargo pyproject',
    render: function (ctx) {
      var root = ctx.root;
      var mode = 'toml2json';
      var output = '';

      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab on" type="button" data-mode="toml2json" role="tab" aria-selected="true">TOML → JSON</button>' +
          '<button class="tab" type="button" data-mode="json2toml" role="tab" aria-selected="false">JSON → TOML</button>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">选择文件 <span class="hint">也可以直接在下方粘贴</span></div>' +
          '<div id="tomlPicker"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h"><span id="tomlInputLabel">TOML 输入</span><span class="hint">支持注释、表、数组、内联表与日期</span></div>' +
          '<textarea id="tomlInput" class="textarea" rows="14" spellcheck="false"></textarea>' +
          '<div class="btns">' +
            '<button id="tomlRun" class="btn primary" type="button">转换</button>' +
            '<button id="tomlSwap" class="btn" type="button">交换方向</button>' +
            '<button id="tomlSample" class="btn" type="button">载入示例</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h"><span id="tomlOutLabel">JSON 输出</span><span class="hint" id="tomlStatus"></span></div>' +
          '<div class="out"><div class="out-b" id="tomlOut" style="min-height:120px">等待转换…</div></div>' +
          '<div class="btns">' +
            '<button id="tomlCopy" class="btn" type="button">复制结果</button>' +
            '<button id="tomlDownload" class="btn" type="button">下载结果</button>' +
          '</div>' +
        '</div>' +
        '<p class="note">TOML 没有 null：JSON 中的 null 在转 TOML 时会报错，请先删除或改成空字符串。日期会以 ISO 字符串输出到 JSON。</p>';

      var els = {
        input: TB.$('#tomlInput', root),
        out: TB.$('#tomlOut', root),
        status: TB.$('#tomlStatus', root),
        inputLabel: TB.$('#tomlInputLabel', root),
        outLabel: TB.$('#tomlOutLabel', root)
      };

      var picker = TB.filePicker(TB.$('#tomlPicker', root), {
        accept: '.toml,.tml,.json,.txt,application/json,text/plain',
        hint: '拖入 .toml / .json 文件'
      });
      picker.onChange = function () {
        var item = picker.files[0];
        if (!item) return;
        var name = item.file.name.toLowerCase();
        setMode(name.endsWith('.json') ? 'json2toml' : 'toml2json');
        TB.readText(item.file).then(function (text) {
          els.input.value = text;
          run();
        }).catch(function (e) { TB.toast('读取失败：' + e.message); });
      };

      function setMode(next) {
        mode = next;
        TB.$$('.tab', root).forEach(function (tab) {
          var on = tab.getAttribute('data-mode') === mode;
          tab.classList.toggle('on', on);
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        els.inputLabel.textContent = mode === 'toml2json' ? 'TOML 输入' : 'JSON 输入';
        els.outLabel.textContent = mode === 'toml2json' ? 'JSON 输出' : 'TOML 输出';
        els.status.textContent = '';
        els.out.textContent = '等待转换…';
        output = '';
      }

      function loadSample() {
        if (mode === 'toml2json') els.input.value = SAMPLE_TOML;
        else els.input.value = jsonStringify(SAMPLE_JSON);
        els.status.textContent = '';
        els.out.textContent = '等待转换…';
        output = '';
        run();
      }

      async function run() {
        els.status.textContent = '';
        output = '';
        var text = els.input.value.trim();
        if (!text) { els.out.textContent = '请先粘贴内容或选择文件。'; return; }
        try {
          var toml = await loadToml();
          if (mode === 'toml2json') {
            var parsed = toml.parse(text);
            output = jsonStringify(parsed);
            els.out.textContent = output;
            els.status.textContent = '转换成功';
          } else {
            var obj = JSON.parse(text);
            if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
              throw new Error('TOML 根节点必须是表（对象），不能是数组或基础类型');
            }
            output = toml.stringify(obj);
            els.out.textContent = output;
            els.status.textContent = '转换成功';
          }
        } catch (e) {
          els.status.textContent = '转换失败';
          els.out.textContent = '转换失败：' + (e && e.message ? e.message : String(e));
        }
      }

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          setMode(tab.getAttribute('data-mode'));
          loadSample();
        });
      });

      TB.$('#tomlRun', root).addEventListener('click', run);
      TB.$('#tomlSample', root).addEventListener('click', loadSample);
      TB.$('#tomlSwap', root).addEventListener('click', function () {
        var next = mode === 'toml2json' ? 'json2toml' : 'toml2json';
        var current = output || els.input.value;
        setMode(next);
        els.input.value = current;
        run();
      });
      TB.$('#tomlCopy', root).addEventListener('click', function () {
        if (!output) { TB.toast('还没有可复制的结果'); return; }
        TB.copy(output);
      });
      TB.$('#tomlDownload', root).addEventListener('click', function () {
        if (!output) { TB.toast('还没有可下载的结果'); return; }
        var ext = mode === 'toml2json' ? '.json' : '.toml';
        TB.downloadText(output, 'converted' + ext, mode === 'toml2json' ? 'application/json' : 'text/plain');
      });

      loadSample();
      // 首次进入时 loadLib 的脚本可能还没在 onload 前把全局变量挂好；
      // 补一次短延迟的自动转换，避免首屏停留在“等待转换…”。
      setTimeout(function () {
        if (!output && els.input.value.trim()) run();
      }, 120);
    }
  });
})();
