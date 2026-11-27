/* =============================================================================
 * SQL 建表语句转实体类
 * -----------------------------------------------------------------------------
 * 粘贴常见 MySQL / PostgreSQL / SQLite 的 CREATE TABLE 语句，生成：
 *   Java 实体（可选 Lombok）、Go struct（json / gorm 标签）、TypeScript interface。
 * 只解析文本，不连接数据库、不上传 SQL；复杂的视图、函数和方言特性不处理。
 * ========================================================================== */

(function () {
  'use strict';

  var SAMPLE = [
    'CREATE TABLE `user` (',
    '  `id` bigint NOT NULL AUTO_INCREMENT COMMENT \'主键\',',
    '  `username` varchar(64) NOT NULL COMMENT \'用户名\',',
    '  `email` varchar(255) DEFAULT NULL,',
    '  `balance` decimal(12,2) NOT NULL DEFAULT \'0.00\',',
    '  `is_active` tinyint(1) NOT NULL DEFAULT \'1\',',
    '  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,',
    '  PRIMARY KEY (`id`),',
    '  UNIQUE KEY `uk_username` (`username`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'
  ].join('\n');

  var KEYWORDS = /^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|KEY|INDEX|FULLTEXT|SPATIAL)\b/i;
  var TYPE_WORDS = /^(NOT\s+NULL|NULL|DEFAULT|PRIMARY|UNIQUE|REFERENCES|CHECK|COLLATE|COMMENT|AUTO_INCREMENT|GENERATED|AS)\b/i;

  function unquote(s) {
    s = String(s == null ? '' : s).trim();
    if ((s.charAt(0) === '`' && s.charAt(s.length - 1) === '`') ||
        (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")) {
      return s.slice(1, -1);
    }
    if (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']') return s.slice(1, -1);
    return s;
  }

  /* 去掉 SQL 注释，同时跳过字符串里的 -- 和 /* */
  function stripComments(sql) {
    var out = '', i = 0, quote = null;
    while (i < sql.length) {
      var c = sql[i], n = sql[i + 1];
      if (quote) {
        out += c;
        if (c === quote) {
          if (sql[i + 1] === quote) { out += sql[i + 1]; i += 2; continue; }
          quote = null;
        }
        i++;
      } else if (c === "'" || c === '"' || c === '`') {
        quote = c; out += c; i++;
      } else if (c === '-' && n === '-') {
        while (i < sql.length && sql[i] !== '\n') i++;
      } else if (c === '/' && n === '*') {
        i += 2;
        while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
        i += 2;
      } else { out += c; i++; }
    }
    return out;
  }

  /* 按顶层逗号切分，括号、引号里的逗号不切 */
  function splitTop(text) {
    var parts = [], buf = '', depth = 0, quote = null;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quote) {
        buf += c;
        if (c === quote) {
          if (text[i + 1] === quote) { buf += text[i + 1]; i++; continue; }
          quote = null;
        }
      } else if (c === "'" || c === '"' || c === '`') {
        quote = c; buf += c;
      } else if (c === '(') { depth++; buf += c; }
      else if (c === ')') { depth = Math.max(0, depth - 1); buf += c; }
      else if (c === ',' && depth === 0) { parts.push(buf.trim()); buf = ''; }
      else buf += c;
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts;
  }

  function findTables(sql) {
    var clean = stripComments(sql), out = [], re = /CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi, m;
    while ((m = re.exec(clean)) && re.lastIndex < clean.length) {
      var start = re.lastIndex, quote = null, i = start, found = -1;
      while (i < clean.length) {
        var c = clean[i];
        if (quote) {
          if (c === quote) {
            if (clean[i + 1] === quote) { i++; } else quote = null;
          }
        } else if (c === "'" || c === '"' || c === '`') quote = c;
        else if (c === '(') { found = i; break; }
        else if (c === ';') break;
        i++;
      }
      if (found < 0) break;
      var name = clean.slice(start, found).trim();
      if (!name) break;
      var depth = 1, j = found + 1, body = '', q2 = null;
      while (j < clean.length && depth > 0) {
        var d = clean[j];
        if (q2) {
          body += d;
          if (d === q2) {
            if (clean[j + 1] === q2) { body += clean[j + 1]; j++; } else q2 = null;
          }
        } else if (d === "'" || d === '"' || d === '`') { q2 = d; body += d; }
        else if (d === '(') { depth++; body += d; }
        else if (d === ')') { depth--; if (depth > 0) body += d; }
        else body += d;
        j++;
      }
      if (depth !== 0) break;
      out.push({ name: name, body: body });
      re.lastIndex = j;
    }
    return out;
  }

  function parseType(rest) {
    var m = rest.match(/^((?:[A-Za-z]+(?:\s+(?:varying|precision|with|without|time|zone))?)(?:\s*\([^)]*\))?(?:\s+unsigned)?(?:\s+zerofill)?)/i);
    return m ? m[1].trim() : (rest.split(/\s+/)[0] || '');
  }

  function typeBase(type) {
    return String(type || '').toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/\bunsigned\b|\bzerofill\b/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  function parseColumn(part) {
    var m = part.match(/^(`[^`]+`|"[^"]+"|\[[^\]]+\]|[^\s]+)\s+([\s\S]+)$/);
    if (!m) return null;
    var name = unquote(m[1]), rest = m[2].trim();
    var type = parseType(rest);
    var isTinyBool = /^tinyint\s*\(\s*1\s*\)/i.test(type);
    var notNull = /\bNOT\s+NULL\b/i.test(rest);
    var auto = /\bAUTO_INCREMENT\b|\bGENERATED\s+ALWAYS\b/i.test(rest);
    var cm = rest.match(/\bCOMMENT\s+('(?:''|[^'])*'|"(?:[^"]|"")*")/i);
    return {
      name: name,
      type: type,
      base: typeBase(type),
      tinyBool: isTinyBool,
      notNull: notNull,
      auto: auto,
      comment: cm ? unquote(cm[1].replace(/''/g, "'")) : ''
    };
  }

  function parseTable(table) {
    var parts = splitTop(table.body);
    var columns = [], primary = {};
    parts.forEach(function (part) {
      var pm = part.match(/\bPRIMARY\s+KEY\s*\(([^)]*)\)/i);
      if (pm) {
        splitTop(pm[1]).forEach(function (x) { primary[unquote(x.trim())] = true; });
      }
    });
    parts.forEach(function (part) {
      if (KEYWORDS.test(part)) return;
      var col = parseColumn(part);
      if (!col) return;
      col.primary = !!primary[col.name];
      columns.push(col);
    });
    var rawName = table.name.replace(/[`"\[\]]/g, '');
    var shortName = rawName.split('.').pop();
    return { rawName: rawName, name: shortName, columns: columns };
  }

  function ident(s) {
    var v = String(s || '').replace(/[^\w$]/g, '_');
    if (!v || /^\d/.test(v)) v = 'f_' + v;
    return v;
  }

  function pascal(s) {
    var words = String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean);
    var out = words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('');
    if (!out) out = 'Table';
    if (/^\d/.test(out)) out = 'T' + out;
    return out;
  }

  function camel(s) {
    var p = pascal(s);
    return p.charAt(0).toLowerCase() + p.slice(1);
  }

  /* Go 字段名按常见缩写习惯修正，避免 Id / Url / Api 这类不符合 golint 的写法 */
  function goName(s) {
    var p = pascal(s).replace(/Id$/, 'ID');
    var abbr = { Id: 'ID', Uuid: 'UUID', Url: 'URL', Uri: 'URI', Ip: 'IP', Api: 'API', Json: 'JSON', Sql: 'SQL', Http: 'HTTP', Html: 'HTML', Csv: 'CSV', Pdf: 'PDF', Ocr: 'OCR' };
    return abbr[p] || p;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function javaType(col) {
    var b = col.base;
    if (col.tinyBool) return 'Boolean';
    if (/^(bool|boolean|bit)$/.test(b)) return 'Boolean';
    if (/^(tinyint|smallint|mediumint|int|integer|serial)$/.test(b)) return 'Integer';
    if (/^(bigint|bigserial)$/.test(b)) return 'Long';
    if (/^(decimal|numeric|money|smallmoney)$/.test(b)) return 'BigDecimal';
    if (/^(real|float)$/.test(b)) return 'Float';
    if (/^(double|double precision)$/.test(b)) return 'Double';
    if (b === 'date') return 'LocalDate';
    if (/^(datetime|timestamp|timestamp with time zone|timestamp without time zone)$/.test(b)) return 'LocalDateTime';
    if (b === 'time' || b === 'time with time zone' || b === 'time without time zone') return 'LocalTime';
    if (/^(blob|binary|varbinary|bytea|longblob|mediumblob|tinyblob)$/.test(b)) return 'byte[]';
    return 'String';
  }

  function goType(col) {
    var b = col.base;
    if (col.tinyBool || /^(bool|boolean|bit)$/.test(b)) return 'bool';
    if (/^(tinyint|smallint|mediumint)$/.test(b)) return 'int32';
    if (/^(int|integer|serial|bigint|bigserial)$/.test(b)) return 'int64';
    if (/^(real|float)$/.test(b)) return 'float32';
    if (/^(double|double precision|decimal|numeric|money|smallmoney)$/.test(b)) return 'float64';
    if (/^(date|datetime|timestamp|timestamp with time zone|timestamp without time zone|time|time with time zone|time without time zone)$/.test(b)) return 'time.Time';
    if (/^(blob|binary|varbinary|bytea|longblob|mediumblob|tinyblob)$/.test(b)) return '[]byte';
    return 'string';
  }

  function tsType(col) {
    var b = col.base;
    if (col.tinyBool || /^(bool|boolean|bit)$/.test(b)) return 'boolean';
    if (/^(tinyint|smallint|mediumint|int|integer|serial|bigint|bigserial|real|float|double|double precision|decimal|numeric|money|smallmoney)$/.test(b)) return 'number';
    return 'string';
  }

  function javaOutput(tables, useLombok) {
    var imports = {};
    var body = tables.map(function (t) {
      var cls = pascal(t.name);
      var fields = t.columns.map(function (c) {
        var jt = javaType(c);
        if (/^BigDecimal$/.test(jt)) imports['java.math.BigDecimal'] = 1;
        if (/^LocalDate$/.test(jt) || /^LocalDateTime$/.test(jt) || /^LocalTime$/.test(jt)) imports['java.time.' + jt] = 1;
        var field = camel(c.name), name = ident(field);
        var doc = c.comment ? '    /** ' + c.comment.replace(/[*]/g, '') + ' */\n' : '';
        return doc + '    private ' + jt + ' ' + name + ';' + (c.primary ? ' // 主键' : '');
      }).join('\n\n');
      var accessors = '';
      if (!useLombok) {
        accessors = t.columns.map(function (c) {
          var jt = javaType(c), field = ident(camel(c.name)), m = cap(field);
          return '\n    public ' + jt + ' get' + m + '() { return ' + field + '; }\n' +
            '    public void set' + m + '(' + jt + ' ' + field + ') { this.' + field + ' = ' + field + '; }';
        }).join('\n');
      }
      return (useLombok ? '@Data\n' : '') + 'public class ' + cls + ' {\n' + fields + (accessors ? '\n' + accessors : '') + '\n}';
    }).join('\n\n');
    var imp = Object.keys(imports).sort();
    if (useLombok) imp.unshift('lombok.Data');
    return (imp.length ? 'import ' + imp.join(';\nimport ') + ';\n\n' : '') + body + '\n';
  }

  function goOutput(tables) {
    var needTime = false;
    var structs = tables.map(function (t) {
      var lines = t.columns.map(function (c) {
        var gt = goType(c), nullable = !c.notNull && !c.primary;
        if (gt === 'time.Time') needTime = true;
        if (nullable && gt !== '[]byte') gt = '*' + gt;
        var tag = '`json:"' + c.name + (nullable ? ',omitempty' : '') + '" gorm:"column:' + c.name +
          (c.primary ? ';primaryKey' : '') + (c.auto ? ';autoIncrement' : '') + '"`';
        return '\t' + goName(c.name) + ' ' + gt + ' ' + tag + (c.comment ? ' // ' + c.comment : '');
      }).join('\n');
      return 'type ' + pascal(t.name) + ' struct {\n' + lines + '\n}';
    }).join('\n\n');
    return 'package model\n\n' + (needTime ? 'import "time"\n\n' : '') + structs + '\n';
  }

  function tsOutput(tables) {
    return tables.map(function (t) {
      var lines = t.columns.map(function (c) {
        var nullable = !c.notNull && !c.primary;
        return '  ' + camel(c.name) + ': ' + tsType(c) + (nullable ? ' | null' : '') + ';' + (c.comment ? ' // ' + c.comment : '');
      }).join('\n');
      return 'export interface ' + pascal(t.name) + ' {\n' + lines + '\n}';
    }).join('\n\n') + '\n';
  }

  function status(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text ? '<div class="note se-note"><span class="' + (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>' : '';
  }

  TB.def({
    slug: 'sql-entity', cat: 'web', name: 'SQL 建表转实体类', desc: 'CREATE TABLE → Java / Go / TS',
    icon: '🧱', kw: 'sql ddl create table java go golang typescript 实体类 struct 代码生成',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">CREATE TABLE 语句<span class="hint">MySQL / PostgreSQL / SQLite 常见建表语法</span></div>' +
          '<div class="field"><textarea class="textarea se-src" id="seSrc" spellcheck="false" placeholder="粘贴 CREATE TABLE ..."></textarea></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>输出语言</b></div><select class="input" id="seLang">' +
              '<option value="java">Java 实体</option><option value="go">Go struct</option><option value="ts">TypeScript interface</option>' +
            '</select></div>' +
            '<div class="field"><div class="label">Java 选项</div>' +
              '<label class="se-check"><input type="checkbox" id="seLombok" checked> 使用 Lombok @Data</label></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="seRun" type="button">生成代码</button>' +
            '<button class="btn" id="seSample" type="button">填入示例</button>' +
            '<button class="btn" id="seClear" type="button">清空</button></div>' +
          '<div id="seMsg"></div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">生成结果<span class="hint" id="seHint">只解析文本，不连接数据库</span></div>' +
          '<div class="out se-out">' +
            '<div class="out-h"><span class="grow" id="seOutLabel">等待生成</span>' +
              '<button class="btn sm" id="seCopy" type="button">复制</button>' +
              '<button class="btn sm" id="seDl" type="button">下载</button></div>' +
            '<pre class="out-b se-code" id="seOut"></pre>' +
          '</div>' +
          '<div class="note">支持常见的列定义、PRIMARY KEY / UNIQUE / KEY 约束、NOT NULL、DEFAULT、AUTO_INCREMENT、COMMENT。复杂视图、函数、触发器和方言特有语法不在此处理；金额字段建议在业务层使用高精度类型。</div>' +
        '</div>';

      var src = TB.$('#seSrc', root), out = TB.$('#seOut', root), msg = TB.$('#seMsg', root);
      var lang = TB.$('#seLang', root), lombok = TB.$('#seLombok', root);
      var outLabel = TB.$('#seOutLabel', root), hint = TB.$('#seHint', root);
      var last = '';

      function generate() {
        var sql = src.value.trim();
        if (!sql) { status(msg, '请先粘贴 CREATE TABLE 语句', true); out.textContent = ''; last = ''; return; }
        try {
          var raw = findTables(sql);
          if (!raw.length) throw new Error('没有找到 CREATE TABLE 语句');
          var tables = raw.map(parseTable).filter(function (t) { return t.columns.length; });
          if (!tables.length) throw new Error('建表语句里没有可识别的列定义');
          var code;
          if (lang.value === 'java') code = javaOutput(tables, lombok.checked);
          else if (lang.value === 'go') code = goOutput(tables);
          else code = tsOutput(tables);
          last = code;
          out.textContent = code;
          outLabel.textContent = tables.length + ' 张表 · ' + { java: 'Java', go: 'Go', ts: 'TypeScript' }[lang.value];
          hint.textContent = tables.map(function (t) { return t.name; }).join(' / ');
          status(msg, '已生成 ' + tables.length + ' 张表的代码', false);
        } catch (e) {
          last = ''; out.textContent = '';
          outLabel.textContent = '生成失败';
          status(msg, (e && e.message ? e.message : 'SQL 解析失败'), true);
        }
      }

      lang.addEventListener('change', function () {
        var isJava = lang.value === 'java';
        TB.$('.se-check', root).style.display = isJava ? '' : 'none';
        if (src.value.trim()) generate();
      });
      lombok.addEventListener('change', function () { if (src.value.trim()) generate(); });
      TB.$('#seRun', root).addEventListener('click', generate);
      TB.$('#seSample', root).addEventListener('click', function () {
        src.value = SAMPLE; generate();
      });
      TB.$('#seClear', root).addEventListener('click', function () {
        src.value = ''; out.textContent = ''; last = ''; outLabel.textContent = '等待生成'; status(msg, '');
      });
      TB.$('#seCopy', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先生成代码', true); return; }
        TB.copy(last);
      });
      TB.$('#seDl', root).addEventListener('click', function () {
        if (!last) { status(msg, '请先生成代码', true); return; }
        var ext = lang.value === 'java' ? 'java' : (lang.value === 'go' ? 'go' : 'ts');
        TB.downloadText(last, 'entity.' + ext, 'text/plain');
      });

      src.value = SAMPLE;
      generate();
    }
  });
})();
