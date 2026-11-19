/* =============================================================================
 * JSON → Zod Schema
 * -----------------------------------------------------------------------------
 * 从一段 JSON 样例推断 Zod 结构，支持对象、数组、联合类型和 TypeScript 类型。
 * 推断结果只是开发起点：空数组、混合对象和可选字段仍需人工确认。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = JSON.stringify({
    id: 1001,
    name: '简单工具箱',
    active: true,
    tags: ['工具', '本地'],
    owner: { name: '张三', email: 'hello@example.com' },
    scores: [98, 87, 92],
    extra: null
  }, null, 2);

  function safeKey(key) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
  }

  function infer(value, depth) {
    depth = depth || 0;
    if (value === null) return 'z.null()';
    if (Array.isArray(value)) {
      if (!value.length) return 'z.array(z.unknown())';
      var itemSchemas = {};
      value.forEach(function (item) { itemSchemas[infer(item, depth)] = true; });
      var list = Object.keys(itemSchemas);
      return 'z.array(' + (list.length === 1 ? list[0] : union(list)) + ')';
    }
    if (typeof value === 'string') return 'z.string()';
    if (typeof value === 'boolean') return 'z.boolean()';
    if (typeof value === 'number') return Number.isInteger(value) ? 'z.number().int()' : 'z.number()';
    if (typeof value === 'object') {
      var pad = '  '.repeat(depth);
      var entries = Object.keys(value).map(function (key) {
        return pad + '  ' + safeKey(key) + ': ' + infer(value[key], depth + 1);
      });
      return entries.length ? 'z.object({\n' + entries.join(',\n') + '\n' + pad + '})' : 'z.object({})';
    }
    return 'z.unknown()';
  }

  function union(list) {
    return list.length === 1 ? list[0] : 'z.union([' + list.join(', ') + '])';
  }

  TB.def({
    slug: 'jsonzod',
    cat: 'web',
    name: 'JSON → Zod Schema',
    desc: '从 JSON 样例推断 Zod 校验结构，并生成 TypeScript 类型。',
    icon: '🧬',
    kw: 'json zod schema 校验 typescript 类型 生成 前端',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">JSON 样例 <span class="hint">粘贴接口返回或配置对象</span></div>' +
          '<div class="field"><textarea class="textarea" id="jzInput" rows="10" spellcheck="false"></textarea></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">Schema 变量名</div><input class="input" id="jzName" value="rootSchema"></div>' +
            '<div class="field"><div class="label">输出选项</div><label class="hint" style="display:flex;align-items:center;gap:8px;height:36px"><input type="checkbox" id="jzType" checked> 同时生成 TypeScript 类型</label></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="jzRun" type="button">生成 Schema</button>' +
            '<button class="btn" id="jzSample" type="button">载入示例</button>' +
            '<button class="btn" id="jzCopy" type="button">复制</button>' +
            '<button class="btn" id="jzDownload" type="button">下载 .ts</button></div>' +
          '<div class="hint" id="jzInfo" style="margin-top:10px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">生成结果</div><pre class="codeBox" id="jzOut" style="overflow:auto;max-height:460px"></pre></div>' +
        '<p class="note">推断基于样例值，不会判断业务上的必填 / 可选；数组元素结构不一致时会生成 union。空数组只能得到 <b>z.array(z.unknown())</b>，请按真实接口补充。</p>';

      var input = TB.$('#jzInput', root);
      var name = TB.$('#jzName', root);
      var typeBox = TB.$('#jzType', root);
      var out = TB.$('#jzOut', root);
      var info = TB.$('#jzInfo', root);

      function build() {
        var raw = input.value.trim();
        if (!raw) { out.textContent = ''; info.textContent = '请先输入 JSON'; return; }
        var data;
        try {
          data = JSON.parse(raw);
        } catch (e) {
          out.textContent = '';
          info.textContent = 'JSON 解析失败：' + e.message;
          return;
        }
        var varName = (name.value.trim() || 'rootSchema').replace(/[^A-Za-z0-9_$]/g, '_');
        if (!/^[A-Za-z_$]/.test(varName)) varName = '_' + varName;
        var schema = infer(data);
        var text = 'import { z } from "zod";\n\nconst ' + varName + ' = ' + schema + ';\n';
        if (typeBox.checked) {
          text += '\ntype ' + varName.charAt(0).toUpperCase() + varName.slice(1) + ' = z.infer<typeof ' + varName + '>;\n';
        }
        out.textContent = text;
        info.textContent = '已生成 · ' + text.split('\n').length + ' 行';
      }

      TB.$('#jzRun', root).addEventListener('click', build);
      TB.$('#jzSample', root).addEventListener('click', function () { input.value = SAMPLE; build(); });
      TB.$('#jzCopy', root).addEventListener('click', function () {
        if (out.textContent) TB.copy(out.textContent); else TB.toast('还没有生成内容');
      });
      TB.$('#jzDownload', root).addEventListener('click', function () {
        if (!out.textContent) { TB.toast('还没有生成内容'); return; }
        TB.downloadText(out.textContent, (name.value.trim() || 'rootSchema') + '.ts', 'text/plain');
      });
      input.value = SAMPLE;
      build();
    }
  });
})();
