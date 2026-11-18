/* =============================================================================
 * JSON Schema 构建器 / 验证器
 * -----------------------------------------------------------------------------
 * 纯前端：可视化维护顶层字段，生成 Draft-07 Schema；再按常用子集校验 JSON。
 * 为了控制体积，验证器覆盖 type / required / properties / items / enum /
 * 数值与字符串约束 / allOf / anyOf / oneOf / not 等常用关键字，不引入 Ajv。
 * ========================================================================== */
(function () {
  'use strict';

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function valueType(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
    if (typeof v === 'string') return 'string';
    if (typeof v === 'boolean') return 'boolean';
    if (isPlainObject(v)) return 'object';
    return 'string';
  }

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /* 从一段 JSON 样例递归生成 schema；数组取所有元素的合并结构 */
  function schemaFromSample(v) {
    var type = valueType(v);
    if (type === 'object') {
      var props = {};
      var required = [];
      Object.keys(v).forEach(function (k) {
        props[k] = schemaFromSample(v[k]);
        required.push(k);
      });
      return {
        type: 'object',
        properties: props,
        required: required,
        additionalProperties: true
      };
    }
    if (type === 'array') {
      if (!v.length) return { type: 'array', items: {} };
      var itemSchemas = v.map(schemaFromSample);
      return { type: 'array', items: mergeSchemas(itemSchemas) };
    }
    if (type === 'integer') return { type: 'integer' };
    if (type === 'number') return { type: 'number' };
    if (type === 'boolean') return { type: 'boolean' };
    if (type === 'null') return { type: 'null' };
    return { type: 'string' };
  }

  function mergeSchemas(list) {
    if (!list.length) return {};
    var first = list[0];
    var sameType = list.every(function (s) { return s && s.type === first.type; });
    if (!sameType) return {};
    if (first.type === 'object') {
      var props = {};
      var required = [];
      list.forEach(function (s, idx) {
        Object.keys(s.properties || {}).forEach(function (k) {
          if (!props[k]) props[k] = [];
          props[k].push(s.properties[k]);
        });
        if (idx === 0) required = (s.required || []).slice();
        else required = required.filter(function (k) { return (s.required || []).indexOf(k) !== -1; });
      });
      var outProps = {};
      Object.keys(props).forEach(function (k) { outProps[k] = mergeSchemas(props[k]); });
      return { type: 'object', properties: outProps, required: required, additionalProperties: true };
    }
    if (first.type === 'array') {
      return { type: 'array', items: mergeSchemas(list.map(function (s) { return s.items || {}; })) };
    }
    return { type: first.type };
  }

  /* 把可视化字段生成 schema；对象 / 数组内部结构留给源码编辑 */
  function schemaFromFields(fields) {
    var props = {};
    var required = [];
    var seen = {};
    fields.forEach(function (f) {
      var name = (f.name || '').trim();
      if (!name) return;
      if (seen[name]) throw new Error('字段名重复：' + name);
      seen[name] = true;
      var item = { type: f.type || 'string' };
      if ((f.desc || '').trim()) item.description = f.desc.trim();
      if (item.type === 'object') {
        item.properties = {};
        item.additionalProperties = true;
      }
      if (item.type === 'array') item.items = {};
      props[name] = item;
      if (f.required) required.push(name);
    });
    if (!Object.keys(props).length) throw new Error('至少添加一个有名称的字段');
    var schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: props,
      additionalProperties: true
    };
    if (required.length) schema.required = required;
    return schema;
  }

  /* 解析本地 JSON Pointer，支持 $ref: "#/definitions/X" */
  function resolveRef(root, ref) {
    if (!ref || ref === '#') return root;
    if (ref.indexOf('#/') !== 0) return undefined;
    var parts = ref.slice(2).split('/');
    var cur = root;
    for (var i = 0; i < parts.length; i++) {
      var key = decodeURIComponent(parts[i]).replace(/~1/g, '/').replace(/~0/g, '~');
      if (cur === null || cur === undefined || !(key in cur)) return undefined;
      cur = cur[key];
    }
    return cur;
  }

  function matchesType(v, type) {
    if (type === 'null') return v === null;
    if (type === 'array') return Array.isArray(v);
    if (type === 'object') return isPlainObject(v);
    if (type === 'integer') return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
    if (type === 'number') return typeof v === 'number' && isFinite(v);
    if (type === 'string') return typeof v === 'string';
    if (type === 'boolean') return typeof v === 'boolean';
    return true;
  }

  function typeLabel(type) {
    var map = { object: '对象', array: '数组', integer: '整数', number: '数字', string: '字符串', boolean: '布尔值', null: 'null' };
    return map[type] || type;
  }

  function validateFormat(v, format) {
    if (typeof v !== 'string') return true;
    if (format === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (format === 'uri' || format === 'url') {
      try { new URL(v); return true; } catch (e) { return false; }
    }
    if (format === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
    if (format === 'date-time') return !isNaN(Date.parse(v)) && /T|\d{1,2}:\d{2}/.test(v);
    if (format === 'ipv4') {
      var m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      return !!m && m.slice(1).every(function (x) { return parseInt(x, 10) <= 255; });
    }
    if (format === 'hostname') return /^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(v);
    return true;
  }

  function validate(data, schema, root, path) {
    var errors = [];
    if (schema === true || schema === undefined) return errors;
    if (schema === false) return [{ path: path, message: '这里不允许出现任何值' }];
    if (schema === null || typeof schema !== 'object') return errors;

    if (schema.$ref) {
      var target = resolveRef(root, schema.$ref);
      if (target === undefined) return [{ path: path, message: '无法解析 $ref：' + schema.$ref }];
      return validate(data, target, root, path);
    }

    if (schema.type) {
      var types = Array.isArray(schema.type) ? schema.type : [schema.type];
      var okType = types.some(function (t) { return matchesType(data, t); });
      if (!okType) {
        errors.push({ path: path, message: '应为 ' + types.map(typeLabel).join(' / ') + '，实际为 ' + typeLabel(valueType(data)) });
      }
    }

    if (schema.enum && !schema.enum.some(function (x) { return deepEqual(x, data); })) {
      errors.push({ path: path, message: '不在枚举允许值中' });
    }
    if (schema.const !== undefined && !deepEqual(schema.const, data)) {
      errors.push({ path: path, message: '必须等于固定值 ' + JSON.stringify(schema.const) });
    }

    if (isPlainObject(data)) {
      var props = schema.properties || {};
      var required = schema.required || [];
      required.forEach(function (key) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          errors.push({ path: path + '.' + key, message: '缺少必填字段' });
        }
      });
      Object.keys(data).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(props, key)) {
          errors = errors.concat(validate(data[key], props[key], root, path + '.' + key));
        } else {
          var matchedPattern = false;
          if (schema.patternProperties) {
            Object.keys(schema.patternProperties).forEach(function (p) {
              try {
                if (new RegExp(p).test(key)) {
                  matchedPattern = true;
                  errors = errors.concat(validate(data[key], schema.patternProperties[p], root, path + '.' + key));
                }
              } catch (e) { /* 无效正则忽略 */ }
            });
          }
          if (!matchedPattern && schema.additionalProperties === false) {
            errors.push({ path: path + '.' + key, message: '不允许额外字段' });
          } else if (!matchedPattern && schema.additionalProperties && typeof schema.additionalProperties === 'object') {
            errors = errors.concat(validate(data[key], schema.additionalProperties, root, path + '.' + key));
          }
        }
      });
      if (typeof schema.minProperties === 'number' && Object.keys(data).length < schema.minProperties) {
        errors.push({ path: path, message: '属性数量不能少于 ' + schema.minProperties });
      }
      if (typeof schema.maxProperties === 'number' && Object.keys(data).length > schema.maxProperties) {
        errors.push({ path: path, message: '属性数量不能多于 ' + schema.maxProperties });
      }
    }

    if (Array.isArray(data)) {
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          data.forEach(function (item, i) {
            if (i < schema.items.length) errors = errors.concat(validate(item, schema.items[i], root, path + '[' + i + ']'));
            else if (schema.additionalItems === false) errors.push({ path: path + '[' + i + ']', message: '不允许额外数组项' });
          });
        } else {
          data.forEach(function (item, i) {
            errors = errors.concat(validate(item, schema.items, root, path + '[' + i + ']'));
          });
        }
      }
      if (typeof schema.minItems === 'number' && data.length < schema.minItems) {
        errors.push({ path: path, message: '数组项不能少于 ' + schema.minItems });
      }
      if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) {
        errors.push({ path: path, message: '数组项不能多于 ' + schema.maxItems });
      }
      if (schema.uniqueItems === true) {
        var seen = {};
        data.forEach(function (item, i) {
          var key = JSON.stringify(item);
          if (seen[key]) errors.push({ path: path + '[' + i + ']', message: '数组项必须唯一' });
          seen[key] = true;
        });
      }
    }

    if (typeof data === 'string') {
      if (typeof schema.minLength === 'number' && data.length < schema.minLength) {
        errors.push({ path: path, message: '长度不能少于 ' + schema.minLength });
      }
      if (typeof schema.maxLength === 'number' && data.length > schema.maxLength) {
        errors.push({ path: path, message: '长度不能多于 ' + schema.maxLength });
      }
      if (schema.pattern) {
        try {
          if (!new RegExp(schema.pattern).test(data)) errors.push({ path: path, message: '不匹配正则 ' + schema.pattern });
        } catch (e) { /* 无效正则忽略 */ }
      }
      if (schema.format && !validateFormat(data, schema.format)) {
        errors.push({ path: path, message: '不符合格式 ' + schema.format });
      }
    }

    if (typeof data === 'number') {
      if (typeof schema.minimum === 'number' && data < schema.minimum) errors.push({ path: path, message: '不能小于 ' + schema.minimum });
      if (typeof schema.maximum === 'number' && data > schema.maximum) errors.push({ path: path, message: '不能大于 ' + schema.maximum });
      if (typeof schema.exclusiveMinimum === 'number' && data <= schema.exclusiveMinimum) errors.push({ path: path, message: '必须大于 ' + schema.exclusiveMinimum });
      if (typeof schema.exclusiveMaximum === 'number' && data >= schema.exclusiveMaximum) errors.push({ path: path, message: '必须小于 ' + schema.exclusiveMaximum });
      if (typeof schema.multipleOf === 'number' && schema.multipleOf !== 0) {
        var ratio = data / schema.multipleOf;
        if (Math.abs(Math.round(ratio) - ratio) > 1e-9) errors.push({ path: path, message: '必须是 ' + schema.multipleOf + ' 的倍数' });
      }
    }

    if (schema.allOf) {
      schema.allOf.forEach(function (s) { errors = errors.concat(validate(data, s, root, path)); });
    }
    if (schema.anyOf) {
      var anyOk = schema.anyOf.some(function (s) { return validate(data, s, root, path).length === 0; });
      if (!anyOk) errors.push({ path: path, message: '不满足 anyOf 的任一分支' });
    }
    if (schema.oneOf) {
      var oneCount = schema.oneOf.filter(function (s) { return validate(data, s, root, path).length === 0; }).length;
      if (oneCount !== 1) errors.push({ path: path, message: 'oneOf 必须恰好满足一个分支，当前满足 ' + oneCount + ' 个' });
    }
    if (schema.not && validate(data, schema.not, root, path).length === 0) {
      errors.push({ path: path, message: '命中了 not 禁止的结构' });
    }
    if (schema.if) {
      var ifOk = validate(data, schema.if, root, path).length === 0;
      if (ifOk && schema.then) errors = errors.concat(validate(data, schema.then, root, path));
      if (!ifOk && schema.else) errors = errors.concat(validate(data, schema.else, root, path));
    }
    return errors;
  }

  var TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];

  TB.def({
    slug: 'jsonschema',
    cat: 'web',
    name: 'JSON Schema 构建器',
    desc: '可视化维护字段并生成 JSON Schema，再用常用 Draft-07 规则校验 JSON。',
    icon: '🧩',
    kw: 'json schema 校验 验证 draft-07 数据结构 生成器',
    render: function (ctx) {
      var root = ctx.root;
      var sample = {
        name: '张三',
        age: 28,
        email: 'zhangsan@example.com',
        tags: ['前端', '设计'],
        address: { city: '上海', district: '浦东新区' }
      };
      var fields = [];

      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab on" type="button" data-pane="build" role="tab" aria-selected="true">构建 Schema</button>' +
          '<button class="tab" type="button" data-pane="check" role="tab" aria-selected="false">验证 JSON</button>' +
        '</div>' +
        '<div id="paneBuild">' +
          '<div class="panel">' +
            '<div class="panel-h">1. 从 JSON 样例生成 <span class="hint">嵌套对象 / 数组会自动展开</span></div>' +
            '<div class="field"><textarea id="jsSample" class="textarea" rows="7" spellcheck="false"></textarea></div>' +
            '<div class="btns">' +
              '<button id="jsFromSample" class="btn primary" type="button">生成字段和 Schema</button>' +
              '<button id="jsLoadSample" class="btn" type="button">载入示例</button>' +
            '</div>' +
          '</div>' +
          '<div class="panel">' +
            '<div class="panel-h">2. 字段设置 <span class="hint">对象 / 数组的内部结构可在源码中继续补充</span></div>' +
            '<div class="table-wrap schemaTable-wrap">' +
              '<table class="table schemaTable">' +
                '<thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>说明</th><th></th></tr></thead>' +
                '<tbody id="jsFields"></tbody>' +
              '</table>' +
            '</div>' +
            '<div class="btns">' +
              '<button id="jsAddField" class="btn" type="button">+ 添加字段</button>' +
              '<button id="jsBuild" class="btn primary" type="button">生成 Schema</button>' +
            '</div>' +
            '<p class="hint-text" id="jsBuildHint">当前显示的是示例 Schema；修改字段后点「生成 Schema」刷新源码。</p>' +
          '</div>' +
          '<div class="panel">' +
            '<div class="panel-h">3. Schema 源码 <span class="hint">可直接编辑，验证时以这里为准</span></div>' +
            '<textarea id="jsSchema" class="textarea" rows="16" spellcheck="false"></textarea>' +
            '<div class="btns">' +
              '<button id="jsCopySchema" class="btn" type="button">复制 Schema</button>' +
              '<button id="jsDownloadSchema" class="btn" type="button">下载 .json</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="paneCheck" hidden>' +
          '<div class="panel">' +
            '<div class="panel-h">待验证的 JSON</div>' +
            '<div class="field"><textarea id="jsData" class="textarea" rows="10" spellcheck="false"></textarea></div>' +
            '<div class="btns"><button id="jsValidate" class="btn primary" type="button">校验 JSON</button></div>' +
          '</div>' +
          '<div id="jsResult"></div>' +
        '</div>' +
        '<p class="note">支持 Draft-07 常用子集：type、required、properties、items、enum、const、数值 / 字符串范围、pattern、format、allOf / anyOf / oneOf / not。复杂业务 Schema 建议先用本工具生成骨架，再手工补充。</p>';

      var els = {
        sample: TB.$('#jsSample', root),
        fields: TB.$('#jsFields', root),
        schema: TB.$('#jsSchema', root),
        hint: TB.$('#jsBuildHint', root),
        data: TB.$('#jsData', root),
        result: TB.$('#jsResult', root)
      };

      function setHint(text) { els.hint.textContent = text; }

      function writeSchema(schema) {
        els.schema.value = JSON.stringify(schema, null, 2);
      }

      function fieldsFromObject(obj) {
        if (!isPlainObject(obj)) return [];
        return Object.keys(obj).map(function (k) {
          return {
            name: k,
            type: valueType(obj[k]),
            required: true,
            desc: ''
          };
        });
      }

      function renderFields() {
        if (!fields.length) {
          els.fields.innerHTML = '<tr><td colspan="5" class="schemaEmpty">还没有字段，点下方「+ 添加字段」开始。</td></tr>';
          return;
        }
        els.fields.innerHTML = fields.map(function (f, i) {
          return '<tr data-i="' + i + '">' +
            '<td><input class="input jsName" value="' + TB.esc(f.name) + '" placeholder="字段名" aria-label="字段名"></td>' +
            '<td><select class="select jsType" aria-label="字段类型">' +
              TYPES.map(function (t) { return '<option value="' + t + '"' + (f.type === t ? ' selected' : '') + '>' + typeLabel(t) + '</option>'; }).join('') +
            '</select></td>' +
            '<td class="schemaReq"><label class="checks"><input type="checkbox" class="jsReq"' + (f.required ? ' checked' : '') + '> 必填</label></td>' +
            '<td><input class="input jsDesc" value="' + TB.esc(f.desc) + '" placeholder="可选说明" aria-label="字段说明"></td>' +
            '<td><button class="btn sm danger jsDel" type="button">删除</button></td>' +
          '</tr>';
        }).join('');
      }

      function updateField(e) {
        var tr = e.target.closest('tr[data-i]');
        if (!tr) return;
        var i = parseInt(tr.getAttribute('data-i'), 10);
        var f = fields[i];
        if (!f) return;
        if (e.target.classList.contains('jsName')) f.name = e.target.value;
        if (e.target.classList.contains('jsType')) f.type = e.target.value;
        if (e.target.classList.contains('jsReq')) f.required = e.target.checked;
        if (e.target.classList.contains('jsDesc')) f.desc = e.target.value;
        setHint('字段已修改，点「生成 Schema」刷新源码。');
      }

      els.fields.addEventListener('input', updateField);
      els.fields.addEventListener('change', updateField);
      els.fields.addEventListener('click', function (e) {
        if (!e.target.classList.contains('jsDel')) return;
        var tr = e.target.closest('tr[data-i]');
        fields.splice(parseInt(tr.getAttribute('data-i'), 10), 1);
        renderFields();
        setHint('字段已删除，点「生成 Schema」刷新源码。');
      });

      TB.$('#jsAddField', root).addEventListener('click', function () {
        fields.push({ name: '', type: 'string', required: false, desc: '' });
        renderFields();
        var last = TB.$('tr[data-i="' + (fields.length - 1) + '"] .jsName', root);
        if (last) last.focus();
      });

      TB.$('#jsLoadSample', root).addEventListener('click', function () {
        els.sample.value = JSON.stringify(sample, null, 2);
        els.data.value = JSON.stringify(sample, null, 2);
      });

      TB.$('#jsFromSample', root).addEventListener('click', function () {
        var parsed;
        try { parsed = JSON.parse(els.sample.value); }
        catch (e) { TB.toast('样例 JSON 解析失败：' + e.message); return; }
        fields = fieldsFromObject(parsed);
        writeSchema(schemaFromSample(parsed));
        renderFields();
        setHint(isPlainObject(parsed)
          ? '已从样例生成字段；对象 / 数组内部结构保留在 Schema 源码中。'
          : '根节点不是对象，字段表不适用；已直接生成数组 / 基础类型的 Schema。');
        els.data.value = JSON.stringify(parsed, null, 2);
        TB.toast('已生成 Schema');
      });

      TB.$('#jsBuild', root).addEventListener('click', function () {
        try {
          writeSchema(schemaFromFields(fields));
          setHint('已按当前字段重新生成 Schema。');
          TB.toast('Schema 已生成');
        } catch (e) {
          TB.toast(e.message);
        }
      });

      TB.$('#jsCopySchema', root).addEventListener('click', function () {
        TB.copy(els.schema.value);
      });

      TB.$('#jsDownloadSchema', root).addEventListener('click', function () {
        TB.downloadText(els.schema.value, 'schema.json', 'application/json');
      });

      TB.$('#jsValidate', root).addEventListener('click', function () {
        var schema;
        try { schema = JSON.parse(els.schema.value); }
        catch (e) { els.result.innerHTML = '<div class="panel"><div class="result-err">Schema 不是合法 JSON：' + TB.esc(e.message) + '</div></div>'; return; }
        var data;
        try { data = JSON.parse(els.data.value); }
        catch (e) { els.result.innerHTML = '<div class="panel"><div class="result-err">待验证 JSON 解析失败：' + TB.esc(e.message) + '</div></div>'; return; }

        var list = validate(data, schema, schema, '$');
        if (!list.length) {
          els.result.innerHTML = '<div class="out"><div class="out-h"><span class="grow">校验结果</span><span class="result-ok">✓ 通过</span></div><div class="out-b">JSON 与当前 Schema 匹配。</div></div>';
          return;
        }
        var rows = list.slice(0, 40).map(function (x) {
          return '<div class="schemaErr"><span class="schemaPath">' + TB.esc(x.path) + '</span><span>' + TB.esc(x.message) + '</span></div>';
        }).join('');
        var more = list.length > 40 ? '<div class="hint-text">还有 ' + (list.length - 40) + ' 条错误未显示。</div>' : '';
        els.result.innerHTML = '<div class="out"><div class="out-h"><span class="grow">校验结果</span><span class="result-err">✗ 未通过</span></div><div class="out-b">' + rows + more + '</div></div>';
      });

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          var name = tab.getAttribute('data-pane');
          TB.$$('.tab', root).forEach(function (x) {
            var on = x === tab;
            x.classList.toggle('on', on);
            x.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          TB.$('#paneBuild', root).hidden = name !== 'build';
          TB.$('#paneCheck', root).hidden = name !== 'check';
        });
      });

      // 初始状态：载入示例，便于直接看效果
      els.sample.value = JSON.stringify(sample, null, 2);
      els.data.value = JSON.stringify(sample, null, 2);
      fields = fieldsFromObject(sample);
      writeSchema(schemaFromSample(sample));
      renderFields();
    }
  });
})();
