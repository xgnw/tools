/* =============================================================================
 * 科学计算器
 * -----------------------------------------------------------------------------
 * 自写递归下降解析器，不使用 eval。
 * 支持 + - * / ^ %、括号、pi/e/tau、三角 / 反三角 / 对数 / 根号等函数。
 * 可切换角度制与弧度制，保留最近 5 条计算历史。
 * ========================================================================== */
(function () {
  'use strict';

  function tokenize(src) {
    var tokens = [];
    var i = 0;
    while (i < src.length) {
      var c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var m = /^(?:\d*\.?\d+|\d+\.)(?:e[+-]?\d+)?/i.exec(src.slice(i));
        if (!m) throw new Error('数字格式不正确：' + src.slice(i, i + 8));
        tokens.push({ type: 'num', value: m[0] });
        i += m[0].length;
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        var w = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i));
        tokens.push({ type: 'name', value: w[0].toLowerCase() });
        i += w[0].length;
        continue;
      }
      if ('+-*/^%(),'.indexOf(c) >= 0) {
        tokens.push({ type: 'op', value: c });
        i++;
        continue;
      }
      throw new Error('不认识的字符：' + c);
    }
    return tokens;
  }

  function createParser(src, deg) {
    var tokens = tokenize(src);
    var pos = 0;

    function peek() { return tokens[pos]; }
    function eat(value) {
      var t = tokens[pos];
      if (!t || t.value !== value) return false;
      pos++;
      return true;
    }
    function expect(value) {
      if (!eat(value)) throw new Error('缺少 “' + value + '”');
    }

    function expr() {
      var v = term();
      while (peek() && (peek().value === '+' || peek().value === '-')) {
        var op = tokens[pos++].value;
        var r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }

    function term() {
      var v = unary();
      while (peek() && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        var op = tokens[pos++].value;
        var r = unary();
        if ((op === '/' || op === '%') && r === 0) throw new Error('不能除以 0');
        if (op === '*') v *= r;
        else if (op === '/') v /= r;
        else v %= r;
      }
      return v;
    }

    function unary() {
      if (eat('+')) return unary();
      if (eat('-')) return -unary();
      return power();
    }

    function power() {
      var base = primary();
      if (eat('^')) {
        var exp = unary();
        var out = Math.pow(base, exp);
        if (!isFinite(out)) throw new Error('幂运算结果不是有限数字');
        return out;
      }
      return base;
    }

    function primary() {
      var t = peek();
      if (!t) throw new Error('表达式不完整');
      if (t.type === 'num') {
        pos++;
        var n = Number(t.value);
        if (!isFinite(n)) throw new Error('数字超出范围');
        return n;
      }
      if (t.type === 'name') {
        pos++;
        if (t.value === 'pi') return Math.PI;
        if (t.value === 'e') return Math.E;
        if (t.value === 'tau') return Math.PI * 2;
        if (!eat('(')) throw new Error('函数 ' + t.value + ' 需要括号，例如 ' + t.value + '(30)');
        var arg = expr();
        expect(')');
        return applyFunction(t.value, arg, deg);
      }
      if (eat('(')) {
        var v = expr();
        expect(')');
        return v;
      }
      throw new Error('这里需要一个数字或括号');
    }

    var value = expr();
    if (pos < tokens.length) throw new Error('表达式末尾有多余内容');
    return value;
  }

  function applyFunction(name, x, deg) {
    var rad = deg ? x * Math.PI / 180 : x;
    var back = function (v) { return deg ? v * 180 / Math.PI : v; };
    switch (name) {
      case 'sin': return Math.sin(rad);
      case 'cos': return Math.cos(rad);
      case 'tan': return Math.tan(rad);
      case 'asin':
        if (x < -1 || x > 1) throw new Error('asin 的参数要在 -1 到 1 之间');
        return back(Math.asin(x));
      case 'acos':
        if (x < -1 || x > 1) throw new Error('acos 的参数要在 -1 到 1 之间');
        return back(Math.acos(x));
      case 'atan': return back(Math.atan(x));
      case 'sqrt':
        if (x < 0) throw new Error('sqrt 不能对负数开平方');
        return Math.sqrt(x);
      case 'cbrt': return Math.cbrt(x);
      case 'abs': return Math.abs(x);
      case 'log':
        if (x <= 0) throw new Error('log 的参数要大于 0');
        return Math.log10(x);
      case 'ln':
        if (x <= 0) throw new Error('ln 的参数要大于 0');
        return Math.log(x);
      case 'exp': return Math.exp(x);
      case 'round': return Math.round(x);
      case 'floor': return Math.floor(x);
      case 'ceil': return Math.ceil(x);
      default: throw new Error('不支持的函数：' + name);
    }
  }

  function formatNumber(n) {
    if (!isFinite(n)) throw new Error('结果不是有限数字');
    if (Object.is(n, -0)) n = 0;
    var abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(10).replace('e+', 'e');
    return String(Number(n.toPrecision(12)));
  }

  TB.def({
    slug: 'scicalc',
    cat: 'data',
    name: '科学计算器',
    desc: '支持三角、对数、幂和括号的表达式计算器。',
    icon: '🔬',
    kw: '科学计算器 三角函数 对数 幂 开方 表达式 角度 弧度',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">表达式 <span class="hint">示例：sin(30)+sqrt(16)</span></div>' +
          '<div class="field"><input class="input sc-input" id="scExpr" value="sin(30)+sqrt(16)" spellcheck="false" autocomplete="off"></div>' +
          '<div class="chips" id="scFuncs">' +
            '<button class="chip" type="button" data-ins="sin(">sin</button>' +
            '<button class="chip" type="button" data-ins="cos(">cos</button>' +
            '<button class="chip" type="button" data-ins="tan(">tan</button>' +
            '<button class="chip" type="button" data-ins="sqrt(">sqrt</button>' +
            '<button class="chip" type="button" data-ins="log(">log</button>' +
            '<button class="chip" type="button" data-ins="ln(">ln</button>' +
            '<button class="chip" type="button" data-ins="pi">π</button>' +
            '<button class="chip" type="button" data-ins="e">e</button>' +
          '</div>' +
          '<div class="row" style="margin-top:10px"><div class="field"><div class="label">角度单位</div>' +
            '<select class="select" id="scAngle"><option value="deg">角度制 DEG</option><option value="rad">弧度制 RAD</option></select></div></div>' +
          '<div class="btns"><button class="btn primary" id="scRun" type="button">计算</button>' +
            '<button class="btn" id="scClear" type="button">清空</button></div>' +
          '<div class="hint" id="scMsg" style="margin-top:10px"></div></div>' +
        '<div class="panel"><div class="panel-h">结果</div><div class="sc-result" id="scResult">—</div></div>' +
        '<div class="panel"><div class="panel-h">按键</div><div class="calc-pad" id="scPad">' +
          '<button class="btn" type="button" data-key="7">7</button><button class="btn" type="button" data-key="8">8</button><button class="btn" type="button" data-key="9">9</button><button class="btn" type="button" data-key="/">÷</button>' +
          '<button class="btn" type="button" data-key="4">4</button><button class="btn" type="button" data-key="5">5</button><button class="btn" type="button" data-key="6">6</button><button class="btn" type="button" data-key="*">×</button>' +
          '<button class="btn" type="button" data-key="1">1</button><button class="btn" type="button" data-key="2">2</button><button class="btn" type="button" data-key="3">3</button><button class="btn" type="button" data-key="-">−</button>' +
          '<button class="btn" type="button" data-key="0">0</button><button class="btn" type="button" data-key=".">.</button><button class="btn" type="button" data-key="(">(</button><button class="btn" type="button" data-key=")">)</button>' +
          '<button class="btn" type="button" data-key="+">+</button><button class="btn" type="button" data-key="^">^</button><button class="btn" type="button" data-key="%">%</button><button class="btn" type="button" data-key="C">C</button>' +
          '<button class="btn" type="button" data-key="back">⌫</button><button class="btn" type="button" data-key="=" style="grid-column:span 3">=</button>' +
        '</div><p class="hint" style="margin-top:8px">% 为取余运算；三角函数默认按角度计算。</p></div>' +
        '<div class="panel"><div class="panel-h">历史 <span class="hint">最近 5 条，点击可回填</span></div><div id="scHistory" class="sc-history"></div></div>';

      var expr = TB.$('#scExpr', root);
      var angle = TB.$('#scAngle', root);
      var result = TB.$('#scResult', root);
      var msg = TB.$('#scMsg', root);
      var historyBox = TB.$('#scHistory', root);
      var history = [];

      function calculate() {
        var src = expr.value.trim();
        if (!src) { result.textContent = '—'; msg.textContent = '先输入表达式'; return; }
        try {
          var value = createParser(src, angle.value === 'deg');
          var text = formatNumber(value);
          result.textContent = text;
          msg.textContent = '计算成功';
          addHistory(src, text);
        } catch (e) {
          result.textContent = '—';
          msg.textContent = e.message;
        }
      }

      function addHistory(src, value) {
        history.unshift({ src: src, value: value });
        history = history.slice(0, 5);
        historyBox.innerHTML = '';
        if (!history.length) { historyBox.innerHTML = '<div class="hint">还没有计算记录</div>'; return; }
        history.forEach(function (h) {
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'sc-history-item';
          var e = document.createElement('span');
          e.className = 'sc-history-expr';
          e.textContent = h.src;
          var v = document.createElement('b');
          v.textContent = '= ' + h.value;
          item.appendChild(e);
          item.appendChild(v);
          item.addEventListener('click', function () {
            expr.value = h.src;
            result.textContent = h.value;
            msg.textContent = '已回填';
          });
          historyBox.appendChild(item);
        });
      }

      function insert(text) {
        var start = expr.selectionStart == null ? expr.value.length : expr.selectionStart;
        var end = expr.selectionEnd == null ? start : expr.selectionEnd;
        expr.value = expr.value.slice(0, start) + text + expr.value.slice(end);
        var pos = start + text.length;
        expr.focus();
        expr.setSelectionRange(pos, pos);
      }

      TB.$('#scRun', root).addEventListener('click', calculate);
      TB.$('#scClear', root).addEventListener('click', function () {
        expr.value = '';
        result.textContent = '—';
        msg.textContent = '';
        expr.focus();
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-ins]'), function (btn) {
        btn.addEventListener('click', function () { insert(btn.dataset.ins); });
      });
      Array.prototype.forEach.call(root.querySelectorAll('#scPad [data-key]'), function (btn) {
        btn.addEventListener('click', function () {
          var k = btn.dataset.key;
          if (k === '=') calculate();
          else if (k === 'C') { expr.value = ''; result.textContent = '—'; msg.textContent = ''; expr.focus(); }
          else if (k === 'back') {
            var s = expr.selectionStart == null ? expr.value.length : expr.selectionStart;
            if (s > 0) {
              var e2 = expr.selectionEnd == null ? s : expr.selectionEnd;
              expr.value = expr.value.slice(0, s - 1) + expr.value.slice(e2);
              expr.setSelectionRange(s - 1, s - 1);
            }
            expr.focus();
          } else insert(k);
        });
      });
      expr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); calculate(); }
      });

      calculate();
    }
  });
})();
