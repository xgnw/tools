/* =============================================================================
 * JSON ⇄ SQL
 * -----------------------------------------------------------------------------
 * JSON → SQL：把对象数组生成 CREATE TABLE + INSERT。
 * SQL → JSON：解析 INSERT INTO ... VALUES 语句，适合导出的 SQL 数据片段。
 * 不连接数据库、不执行任何 SQL。
 * ========================================================================== */

(function () {
  'use strict';

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  function sqlStr(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

  function cell(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'number') return isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'object') return sqlStr(JSON.stringify(v));
    return sqlStr(v);
  }

  function typeOf(values) {
    var nums = 0, ints = 0, bools = 0, nonNull = 0;
    values.forEach(function (v) {
      if (v === null || v === undefined) return;
      nonNull++;
      if (typeof v === 'number' && isFinite(v)) nums++;
      if (typeof v === 'number' && Math.floor(v) === v) ints++;
      if (typeof v === 'boolean') bools++;
    });
    if (!nonNull) return 'TEXT';
    if (nums === nonNull) return ints === nonNull ? 'INTEGER' : 'REAL';
    if (bools === nonNull) return 'INTEGER';
    return 'TEXT';
  }

  function tableName(raw) {
    var t = String(raw || '').trim() || 'data';
    t = t.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    if (!/^[A-Za-z_\u4e00-\u9fa5]/.test(t)) t = 't_' + t;
    return t;
  }

  function jsonToSql(json, name, createTable) {
    var data = JSON.parse(json);
    var rows;
    if (Array.isArray(data)) rows = data;
    else if (isObj(data)) rows = [data];
    else rows = [{ value: data }];
    if (!rows.length) throw new Error('JSON 数组为空，没有可转换的数据');

    /* 统一成对象行；基础值放进 value 列 */
    rows = rows.map(function (r) { return isObj(r) ? r : { value: r }; });
    var cols = [];
    rows.forEach(function (r) {
      Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); });
    });
    if (!cols.length) throw new Error('没有可转换的字段');

    var t = tableName(name);
    var colsSql = cols.map(function (k) {
      return '  ' + tableName(k) + ' ' + typeOf(rows.map(function (r) { return r[k]; }));
    }).join(',\n');

    var values = rows.map(function (r) {
      return '  (' + cols.map(function (k) { return cell(r[k]); }).join(', ') + ')';
    }).join(',\n');

    var sql = '';
    if (createTable) sql += 'CREATE TABLE IF NOT EXISTS ' + t + ' (\n' + colsSql + '\n);\n\n';
    sql += 'INSERT INTO ' + t + ' (' + cols.map(tableName).join(', ') + ') VALUES\n' + values + ';\n';
    return sql;
  }

  /* 读一个 SQL 括号元组，返回 [values, endIndex] */
  function readTuple(sql, start) {
    var vals = [], buf = '', quote = '', depth = 0, i = start + 1;
    while (i < sql.length) {
      var ch = sql.charAt(i);
      if (quote) {
        if (ch === quote) {
          if (sql.charAt(i + 1) === quote) { buf += quote; i += 2; continue; }
          buf += ch;
          quote = '';
        } else buf += ch;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"') { quote = ch; buf += ch; i++; continue; }
      if (ch === '(') { depth++; buf += ch; i++; continue; }
      if (ch === ')') {
        if (depth === 0) { vals.push(buf.trim()); return [vals, i + 1]; }
        depth--; buf += ch; i++; continue;
      }
      if (ch === ',' && depth === 0) { vals.push(buf.trim()); buf = ''; i++; continue; }
      buf += ch;
      i++;
    }
    throw new Error('SQL 括号不完整');
  }

  function valueOf(raw) {
    var v = raw.trim();
    if (/^null$/i.test(v)) return null;
    if (/^true$/i.test(v)) return true;
    if (/^false$/i.test(v)) return false;
    if (/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(v)) return Number(v);
    if (/^'.*'$/.test(v) || /^".*"$/.test(v)) {
      var q = v.charAt(0);
      var inner = v.slice(1, -1);
      return inner.split(q + q).join(q);
    }
    return v;
  }

  function sqlToJson(sql) {
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n\r]*/g, '');
    var re = /insert\s+into\s+([^\s(]+)\s*(?:\(([^)]*)\))?\s*values\s*/gi;
    var tables = {}, order = [], count = 0;
    var m;
    while ((m = re.exec(sql)) !== null) {
      var table = (m[1] || 'data').replace(/^["'`]|["'`]$/g, '');
      var cols = m[2] ? m[2].split(',').map(function (c) {
        return c.trim().replace(/^["'`]|["'`]$/g, '');
      }).filter(Boolean) : [];
      var pos = re.lastIndex;
      var rows = [];
      while (pos < sql.length) {
        while (pos < sql.length && /[\s,]/.test(sql.charAt(pos))) pos++;
        if (sql.charAt(pos) !== '(') break;
        var tuple = readTuple(sql, pos);
        rows.push(tuple[0]);
        pos = tuple[1];
        while (pos < sql.length && /\s/.test(sql.charAt(pos))) pos++;
        if (sql.charAt(pos) === ',') { pos++; continue; }
        if (sql.charAt(pos) === ';') { pos++; break; }
        break;
      }
      re.lastIndex = pos;
      if (!rows.length) continue;
      var width = 0;
      rows.forEach(function (r) { width = Math.max(width, r.length); });
      if (!cols.length) {
        for (var c = 0; c < width; c++) cols.push('col' + (c + 1));
      }
      var objs = rows.map(function (r) {
        var o = {};
        cols.forEach(function (k, i) { o[k] = i < r.length ? valueOf(r[i]) : null; });
        return o;
      });
      if (!tables[table]) { tables[table] = []; order.push(table); }
      tables[table] = tables[table].concat(objs);
      count += objs.length;
    }
    if (!count) throw new Error('没有找到 INSERT INTO ... VALUES 语句（当前只支持 INSERT 数据）');
    return order.length === 1 ? tables[order[0]] : (function () {
      var o = {};
      order.forEach(function (t) { o[t] = tables[t]; });
      return o;
    })();
  }

  var JSON_SAMPLE = '[\n  { "id": 1, "name": "张三", "active": true },\n  { "id": 2, "name": "李四", "active": false }\n]';
  var SQL_SAMPLE = "INSERT INTO users (id, name, active) VALUES\n(1, '张三', 1),\n(2, '李四', 0);";

  TB.def({
    slug: 'json-sql', cat: 'web', name: 'JSON ⇄ SQL', desc: 'JSON 与 INSERT 语句互转', icon: '🗄️',
    kw: 'json sql 建表 insert 数据库 转换 ddl 数据迁移',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label"><b>转换方向</b></div>' +
              '<select class="select" id="mode">' +
                '<option value="j2s">JSON → SQL（建表 + 插入）</option>' +
                '<option value="s2j">SQL → JSON（解析 INSERT）</option>' +
              '</select></div>' +
            '<div class="field" id="tableField"><div class="label"><b>表名</b></div>' +
              '<input class="input" id="table" value="users" maxlength="60"></div>' +
          '</div>' +
          '<div class="field" id="ddlField"><label class="checks"><label><input type="checkbox" id="ddl" checked> 生成 CREATE TABLE 语句</label></label></div>' +
          '<div class="field"><div class="label"><b>输入</b><span style="color:var(--ink-3)" id="inHint">对象数组</span></div>' +
            '<textarea class="textarea" id="src" spellcheck="false" style="min-height:190px"></textarea></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="run">转换</button>' +
            '<button class="btn" id="copy">复制结果</button>' +
            '<button class="btn" id="dl">下载</button>' +
            '<button class="btn" id="demo">恢复示例</button>' +
          '</div>' +
          '<div id="msg"></div>' +
          '<div class="out" id="outBox" hidden style="margin-top:14px">' +
            '<div class="out-h"><span class="grow">转换结果</span></div>' +
            '<div class="out-b" id="out"></div>' +
          '</div>' +
        '</div>' +
        '<div class="note">JSON → SQL 会把嵌套对象 / 数组转成 JSON 字符串存入 TEXT 列；SQL → JSON 只解析 INSERT INTO ... VALUES，不执行 SQL，也不支持存储过程。</div>';

      var mode = TB.$('#mode', root), src = TB.$('#src', root), table = TB.$('#table', root);
      var ddl = TB.$('#ddl', root), ddlField = TB.$('#ddlField', root), tableField = TB.$('#tableField', root);
      var inHint = TB.$('#inHint', root), outBox = TB.$('#outBox', root), out = TB.$('#out', root);
      var msg = TB.$('#msg', root);

      function showMsg(text) {
        msg.innerHTML = text ? '<div class="note"><span class="result-err">' + TB.esc(text) + '</span></div>' : '';
      }

      function syncMode() {
        var j2s = mode.value === 'j2s';
        tableField.hidden = !j2s;
        ddlField.hidden = !j2s;
        inHint.textContent = j2s ? '对象数组 / 单个对象' : 'INSERT INTO 语句';
        src.value = j2s ? JSON_SAMPLE : SQL_SAMPLE;
        outBox.hidden = true;
        showMsg('');
      }

      function run() {
        var raw = src.value.trim();
        if (!raw) { showMsg('请先输入内容'); return; }
        try {
          var text = mode.value === 'j2s'
            ? jsonToSql(raw, table.value, ddl.checked)
            : JSON.stringify(sqlToJson(raw), null, 2);
          out.textContent = text;
          outBox.hidden = false;
          showMsg('');
        } catch (e) {
          outBox.hidden = true;
          showMsg('转换失败：' + e.message);
        }
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#dl', root).addEventListener('click', function () {
        if (!out.textContent) { showMsg('请先转换'); return; }
        if (mode.value === 'j2s') TB.downloadText(out.textContent, '数据.sql', 'application/sql');
        else TB.downloadText(out.textContent, '数据.json', 'application/json');
      });
      TB.$('#demo', root).addEventListener('click', syncMode);
      mode.addEventListener('change', syncMode);
      syncMode();
      run();
    }
  });
})();
