/* =============================================================================
 * OpenAPI / Swagger 查看器
 * -----------------------------------------------------------------------------
 * 粘贴 OpenAPI 3.x 或 Swagger 2.0 的 JSON / YAML，在本地解析并展开接口。
 * JSON 直接解析；YAML 复用已有的本地 js-yaml（38KB，按需加载）。
 * 不请求接口、不执行接口，只做文档阅读和 Markdown 导出。
 * ========================================================================== */

(function () {
  'use strict';

  var METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
  var EXAMPLE = {
    openapi: '3.0.3',
    info: {
      title: '示例用户 API',
      version: '1.0.0',
      description: '一个用于演示的小型用户接口文档。替换成你自己的 OpenAPI 文档即可。'
    },
    servers: [{ url: 'https://api.example.com/v1', description: '生产环境' }],
    paths: {
      '/users': {
        get: {
          tags: ['用户'],
          summary: '查询用户列表',
          parameters: [
            { name: 'page', in: 'query', description: '页码，从 1 开始', schema: { type: 'integer', default: 1 } },
            { name: 'size', in: 'query', description: '每页数量', schema: { type: 'integer', default: 20 } }
          ],
          responses: {
            '200': {
              description: '成功',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } }
            }
          }
        },
        post: {
          tags: ['用户'],
          summary: '创建用户',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          },
          responses: { '201': { description: '创建成功' } }
        }
      },
      '/users/{id}': {
        get: {
          tags: ['用户'],
          summary: '获取单个用户',
          parameters: [{ name: 'id', in: 'path', required: true, description: '用户 ID', schema: { type: 'string' } }],
          responses: {
            '200': { description: '成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '404': { description: '用户不存在' }
          }
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', example: 'u_1001' },
            name: { type: 'string', example: '张三' },
            email: { type: 'string', format: 'email' }
          }
        }
      }
    }
  };

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note oa-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  function methodClass(m) { return 'oa-' + m; }

  function deref(root, value) {
    if (!value || typeof value.$ref !== 'string' || value.$ref.indexOf('#/') !== 0) return value;
    var parts = value.$ref.slice(2).split('/');
    var cur = root;
    for (var i = 0; i < parts.length; i++) {
      var key = parts[i].replace(/~1/g, '/').replace(/~0/g, '~');
      if (!cur || typeof cur !== 'object') return value;
      cur = cur[key];
    }
    return cur || value;
  }

  function refName(obj) {
    if (!obj) return '';
    if (typeof obj.$ref === 'string') return obj.$ref.split('/').pop();
    return '';
  }

  function schemaText(schema, depth) {
    if (!schema) return '—';
    if (typeof schema.$ref === 'string') return refName(schema);
    if (!depth) depth = 0;
    if (depth > 3) return '…';
    if (schema.oneOf && schema.oneOf.length) return 'oneOf(' + schema.oneOf.map(function (s) { return schemaText(s, depth + 1); }).join(' | ') + ')';
    if (schema.anyOf && schema.anyOf.length) return 'anyOf(' + schema.anyOf.map(function (s) { return schemaText(s, depth + 1); }).join(' | ') + ')';
    if (schema.type === 'array') return 'array<' + schemaText(schema.items, depth + 1) + '>';
    var type = schema.type || (schema.properties ? 'object' : '');
    if (!type && schema.enum) type = 'enum';
    if (!type) return '—';
    return type + (schema.format ? '(' + schema.format + ')' : '');
  }

  function paramText(root, p) {
    p = deref(root, p);
    if (!p) return null;
    return {
      name: p.name || '—',
      in: p.in || '—',
      required: !!p.required,
      type: schemaText(p.schema || p, 0),
      desc: p.description || ''
    };
  }

  function serverOf(obj, isV2) {
    if (!isV2) {
      if (obj.servers && obj.servers.length) return obj.servers[0].url || '';
      return '';
    }
    var scheme = (obj.schemes && obj.schemes[0]) || 'https';
    return (obj.host ? scheme + '://' + obj.host : '') + (obj.basePath || '');
  }

  function endpointCount(paths) {
    var n = 0;
    Object.keys(paths || {}).forEach(function (path) {
      METHODS.forEach(function (m) { if (paths[path] && paths[path][m]) n++; });
    });
    return n;
  }

  function collectParams(root, pathItem, op) {
    var list = [];
    var seen = {};
    (pathItem.parameters || []).concat(op.parameters || []).forEach(function (p) {
      var item = paramText(root, p);
      if (!item) return;
      var key = item.in + '|' + item.name;
      if (seen[key]) return;
      seen[key] = true;
      list.push(item);
    });
    return list;
  }

  function renderParamList(list) {
    if (!list.length) return '';
    return '<div class="oa-params">' + list.map(function (p) {
      return '<div class="oa-param"><code>' + TB.esc(p.name) + '</code>' +
        '<span class="oa-pin">' + TB.esc(p.in) + '</span>' +
        '<span class="oa-ptype">' + TB.esc(p.type) + '</span>' +
        (p.required ? '<span class="oa-required">必填</span>' : '') +
        (p.desc ? '<span class="oa-pdesc">' + TB.esc(p.desc) + '</span>' : '') +
      '</div>';
    }).join('') + '</div>';
  }

  function requestBodyText(root, op, isV2) {
    if (!isV2) {
      var rb = op.requestBody;
      rb = deref(root, rb);
      if (!rb) return '';
      var content = rb.content || {};
      var types = Object.keys(content);
      return (types.length ? types.join(' / ') + ' · ' : '') + schemaText(types.length ? content[types[0]].schema : null, 0);
    }
    var body = (op.parameters || []).filter(function (p) { return p.in === 'body'; })[0];
    return body ? schemaText(body.schema, 0) : '';
  }

  function responsesText(root, op, isV2) {
    var out = [];
    Object.keys(op.responses || {}).forEach(function (code) {
      var r = deref(root, op.responses[code]);
      var text = r && r.description ? r.description : '';
      var type = '';
      if (r && r.content) {
        var keys = Object.keys(r.content);
        type = keys.length ? keys[0] + ' · ' + schemaText(r.content[keys[0]].schema, 0) : '';
      } else if (r && r.schema) {
        type = schemaText(r.schema, 0);
      }
      out.push({ code: code, desc: text, type: type });
    });
    return out;
  }

  function renderEndpoint(root, path, method, op, pathItem, isV2) {
    var params = collectParams(root, pathItem, op);
    var body = requestBodyText(root, op, isV2);
    var responses = responsesText(root, op, isV2);
    var tags = (op.tags || []).map(function (t) { return '<span class="oa-tag">' + TB.esc(t) + '</span>'; }).join('');
    var search = [path, method, op.summary, op.description, op.operationId, (op.tags || []).join(' ')].join(' ').toLowerCase();
    var html =
      '<article class="oa-ep" data-s="' + TB.esc(search) + '">' +
        '<div class="oa-ep-top">' +
          '<span class="oa-method ' + methodClass(method) + '">' + method.toUpperCase() + '</span>' +
          '<code class="oa-path">' + TB.esc(path) + '</code>' +
          (op.deprecated ? '<span class="oa-deprecated">已弃用</span>' : '') +
        '</div>' +
        '<div class="oa-ep-title">' + TB.esc(op.summary || op.operationId || '（无摘要）') + '</div>' +
        (tags ? '<div class="oa-tags">' + tags + '</div>' : '') +
        (op.description ? '<div class="oa-desc">' + TB.esc(op.description) + '</div>' : '') +
        (params.length ? '<div class="oa-block"><b>参数</b>' + renderParamList(params) + '</div>' : '') +
        (body ? '<div class="oa-block"><b>请求体</b><code class="oa-body">' + TB.esc(body) + '</code></div>' : '') +
        (responses.length ? '<div class="oa-block"><b>响应</b><div class="oa-responses">' + responses.map(function (r) {
          return '<div class="oa-response"><code>' + TB.esc(r.code) + '</code><span>' + TB.esc(r.desc) + '</span>' +
            (r.type ? '<em>' + TB.esc(r.type) + '</em>' : '') + '</div>';
        }).join('') + '</div></div>' : '') +
      '</article>';
    return html;
  }

  function buildMarkdown(obj, isV2) {
    var info = obj.info || {};
    var lines = ['# ' + (info.title || 'API 文档'), '', '版本：' + (info.version || '—')];
    var server = serverOf(obj, isV2);
    if (server) lines.push('服务器：' + server);
    if (info.description) { lines.push('', info.description); }
    Object.keys(obj.paths || {}).forEach(function (path) {
      var pathItem = obj.paths[path] || {};
      METHODS.forEach(function (method) {
        var op = pathItem[method];
        if (!op) return;
        lines.push('', '## ' + method.toUpperCase() + ' ' + path, '', op.summary || op.operationId || '（无摘要）');
        var params = collectParams(obj, pathItem, op);
        params.forEach(function (p) {
          lines.push('- 参数：`' + p.name + '`（' + p.in + (p.required ? '，必填' : '') + '，' + p.type + '）' + (p.desc ? '：' + p.desc : ''));
        });
        var body = requestBodyText(obj, op, isV2);
        if (body) lines.push('- 请求体：`' + body + '`');
        responsesText(obj, op, isV2).forEach(function (r) {
          lines.push('- 响应 ' + r.code + '：' + r.desc + (r.type ? '（' + r.type + '）' : ''));
        });
      });
    });
    return lines.join('\n') + '\n';
  }

  TB.def({
    slug: 'openapi', cat: 'web', name: 'OpenAPI / Swagger 查看器', desc: '阅读 Swagger / OpenAPI 文档',
    icon: '📘', kw: 'openapi swagger api 接口 文档 yaml json 查看 解析 rest',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">粘贴文档<span class="hint">支持 OpenAPI 3.x / Swagger 2.0，JSON 或 YAML</span></div>' +
          '<div class="field"><textarea class="textarea oa-src" id="oaSrc" spellcheck="false" placeholder="在这里粘贴 openapi.json 或 swagger.yaml"></textarea></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="oaRun" type="button">解析文档</button>' +
            '<button class="btn" id="oaExample" type="button">填入示例</button>' +
            '<button class="btn" id="oaClear" type="button">清空</button>' +
          '</div>' +
          '<div id="oaMsg" class="oa-msg"></div>' +
        '</div>' +
        '<div class="panel" id="oaResult" hidden>' +
          '<div id="oaSummary"></div>' +
          '<div class="oa-toolbar"><div class="field"><div class="label"><b>筛选接口</b></div>' +
            '<input class="input" id="oaQ" placeholder="路径、方法、摘要或 tag" autocomplete="off"></div>' +
            '<span id="oaCount" class="oa-count"></span></div>' +
          '<div id="oaList" class="oa-list"></div>' +
          '<div class="btns"><button class="btn" id="oaMdCopy" type="button">复制 Markdown</button>' +
            '<button class="btn" id="oaMdDl" type="button">下载 Markdown</button></div>' +
        '</div>' +
        '<div class="note">文档只在本机解析，不请求接口、不执行接口；支持 JSON 与 YAML，YAML 需要按需加载本地 js-yaml。$ref 只展开一层名称，不递归展开整份 Schema。</div>';

      var src = TB.$('#oaSrc', root);
      var msg = TB.$('#oaMsg', root);
      var result = TB.$('#oaResult', root);
      var summaryEl = TB.$('#oaSummary', root);
      var listEl = TB.$('#oaList', root);
      var countEl = TB.$('#oaCount', root);
      var q = TB.$('#oaQ', root);
      var current = null;
      var currentV2 = false;
      var currentMd = '';
      var loadSeq = 0;

      function endpointList(spec, isV2, term) {
        var html = '';
        Object.keys(spec.paths || {}).forEach(function (path) {
          var pathItem = spec.paths[path] || {};
          METHODS.forEach(function (method) {
            var op = pathItem[method];
            if (!op) return;
            var card = renderEndpoint(spec, path, method, op, pathItem, isV2);
            if (term && card.toLowerCase().indexOf(term) < 0) return;
            html += card;
          });
        });
        return html;
      }

      function renderResult() {
        if (!current) return;
        result.hidden = false;
        var info = current.info || {};
        var server = serverOf(current, currentV2);
        var n = endpointCount(current.paths);
        var specVersion = current.openapi || (current.swagger ? 'Swagger ' + current.swagger : '');
        summaryEl.innerHTML =
          '<div class="oa-summary"><div><h2>' + TB.esc(info.title || 'API 文档') + '</h2>' +
            '<div class="oa-sub">' + TB.esc(info.version ? '版本 ' + info.version : '') +
              (specVersion ? ' · ' + TB.esc(specVersion) : '') + ' · ' + n + ' 个接口</div></div></div>' +
          (info.description ? '<p class="oa-head-desc">' + TB.esc(info.description) + '</p>' : '') +
          (server ? '<div class="oa-server"><b>服务器</b><code>' + TB.esc(server) + '</code></div>' : '');
        var term = q.value.trim().toLowerCase();
        var html = endpointList(current, currentV2, term);
        var shown = (html.match(/class="oa-ep"/g) || []).length;
        countEl.textContent = '显示 ' + shown + ' / ' + n + ' 个接口';
        listEl.innerHTML = html || '<div class="oa-empty">没有匹配的接口</div>';
        currentMd = buildMarkdown(current, currentV2);
      }

      async function parse() {
        var text = src.value.trim();
        if (!text) { status(msg, '请先粘贴 OpenAPI / Swagger 文档', true); result.hidden = true; return; }
        var my = ++loadSeq;
        status(msg, '正在解析…');
        try {
          var obj;
          try { obj = JSON.parse(text); }
          catch (jsonErr) {
            await TB.loadLib('js-yaml.min.js');
            if (!window.jsyaml) throw new Error('js-yaml 未加载');
            obj = window.jsyaml.load(text);
          }
          if (my !== loadSeq) return;
          if (!obj || typeof obj !== 'object') throw new Error('文档不是有效的对象');
          if (!obj.paths && !obj.openapi && !obj.swagger) throw new Error('没有找到 openapi / swagger 或 paths 字段');
          current = obj;
          currentV2 = String(obj.swagger || '').indexOf('2.') === 0;
          q.value = '';
          renderResult();
          status(msg, '已解析：' + (obj.info && obj.info.title ? obj.info.title : 'API 文档'), false);
        } catch (e) {
          if (my !== loadSeq) return;
          current = null;
          result.hidden = true;
          status(msg, '解析失败：' + (e && e.message ? e.message : '不是有效的 JSON / YAML'), true);
        }
      }

      TB.$('#oaRun', root).addEventListener('click', parse);
      TB.$('#oaExample', root).addEventListener('click', function () {
        src.value = JSON.stringify(EXAMPLE, null, 2);
        parse();
      });
      TB.$('#oaClear', root).addEventListener('click', function () {
        loadSeq++;
        src.value = '';
        current = null;
        result.hidden = true;
        status(msg, '');
      });
      q.addEventListener('input', renderResult);
      TB.$('#oaMdCopy', root).addEventListener('click', function () {
        if (!currentMd) { status(msg, '请先解析文档', true); return; }
        TB.copy(currentMd);
      });
      TB.$('#oaMdDl', root).addEventListener('click', function () {
        if (!currentMd) { status(msg, '请先解析文档', true); return; }
        var name = ((current.info && current.info.title) || 'api').replace(/[\\/:*?"<>|]/g, '_');
        TB.downloadText(currentMd, name + '.md', 'text/markdown');
      });

      src.value = JSON.stringify(EXAMPLE, null, 2);
    }
  });
})();
