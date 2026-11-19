/* =============================================================================
 * 方程求解器
 * -----------------------------------------------------------------------------
 * 一元一次方程 ax + b = 0 与一元二次方程 ax² + bx + c = 0。
 * 二次方程根据判别式输出两个实根、重根或一对共轭复根，并显示计算过程。
 * ========================================================================== */
(function () {
  'use strict';

  function fmt(n) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) < 1e-10) return '0';
    return String(Number(n.toFixed(6)));
  }

  function num(id, root) {
    var el = TB.$('#' + id, root);
    if (!el) return NaN;
    var text = el.value.trim();
    if (!text) return 0;
    var n = Number(text);
    return isFinite(n) ? n : NaN;
  }

  function complex(real, imag) {
    if (Math.abs(imag) < 1e-10) return fmt(real);
    var absIm = Math.abs(imag);
    if (Math.abs(real) < 1e-10) {
      return (imag < 0 ? '−' : '') + (Math.abs(absIm - 1) < 1e-10 ? 'i' : fmt(absIm) + 'i');
    }
    var sign = imag < 0 ? '−' : '+';
    return fmt(real) + ' ' + sign + ' ' + (Math.abs(absIm - 1) < 1e-10 ? '' : fmt(absIm)) + 'i';
  }

  function solveLinear(a, b) {
    if (!isFinite(a) || !isFinite(b)) return '系数不是有效数字';
    if (Math.abs(a) < 1e-12) {
      return Math.abs(b) < 1e-12 ? '方程恒成立：任意实数都是解' : '方程无解';
    }
    return 'x = ' + fmt(-b / a);
  }

  function solveQuadratic(a, b, c) {
    if (!isFinite(a) || !isFinite(b) || !isFinite(c)) return '系数不是有效数字';
    if (Math.abs(a) < 1e-12) {
      return 'a = 0，不是二次方程；按一元一次方程求解：\n' + solveLinear(b, c);
    }
    var delta = b * b - 4 * a * c;
    var head = 'Δ = b² − 4ac = ' + fmt(delta);
    if (delta > 1e-12) {
      var sqrtD = Math.sqrt(delta);
      var x1 = (-b - sqrtD) / (2 * a);
      var x2 = (-b + sqrtD) / (2 * a);
      return head + '\nx₁ = ' + fmt(x1) + '\nx₂ = ' + fmt(x2);
    }
    if (Math.abs(delta) <= 1e-12) {
      var x = -b / (2 * a);
      return head + '\nΔ = 0，方程有两个相等的实根\nx₁ = x₂ = ' + fmt(x);
    }
    var real = -b / (2 * a);
    var imag = Math.sqrt(-delta) / (2 * a);
    return head + '\nΔ < 0，方程有一对共轭复根\nx₁ = ' + complex(real, imag) + '\nx₂ = ' + complex(real, -imag);
  }

  TB.def({
    slug: 'eqsolve',
    cat: 'data',
    name: '方程求解器',
    desc: '一元一次、一元二次方程求解，支持实数根与复数根。',
    icon: '🟰',
    kw: '方程 求解 一元一次 一元二次 判别式 复数根 数学',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab on" type="button" data-eq="linear" role="tab" aria-selected="true">一元一次</button>' +
          '<button class="tab" type="button" data-eq="quad" role="tab" aria-selected="false">一元二次</button>' +
        '</div>' +
        '<div class="panel" id="eqLinear">' +
          '<div class="panel-h">ax + b = 0</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">a</div><input class="input" id="eq-a1" type="number" step="any" value="2"></div>' +
            '<div class="field"><div class="label">b</div><input class="input" id="eq-b1" type="number" step="any" value="-8"></div>' +
          '</div>' +
          '<div class="hint" id="eqEq1">2x − 8 = 0</div>' +
        '</div>' +
        '<div class="panel" id="eqQuad" hidden>' +
          '<div class="panel-h">ax² + bx + c = 0</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">a</div><input class="input" id="eq-a2" type="number" step="any" value="1"></div>' +
            '<div class="field"><div class="label">b</div><input class="input" id="eq-b2" type="number" step="any" value="-3"></div>' +
            '<div class="field"><div class="label">c</div><input class="input" id="eq-c2" type="number" step="any" value="2"></div>' +
          '</div>' +
          '<div class="hint" id="eqEq2">x² − 3x + 2 = 0</div>' +
        '</div>' +
        '<div class="btns"><button class="btn primary" id="eqRun" type="button">求解</button>' +
          '<button class="btn" id="eqCopy" type="button">复制结果</button></div>' +
        '<div class="panel"><div class="panel-h">求解结果</div><pre class="codeBox" id="eqOut" style="min-height:110px"></pre></div>' +
        '<p class="note">系数可以是整数、小数或负数；空白按 0 处理。二次方程 a = 0 时会自动按一次方程处理。</p>';

      var mode = 'linear';
      var linearBox = TB.$('#eqLinear', root);
      var quadBox = TB.$('#eqQuad', root);
      var out = TB.$('#eqOut', root);
      var eq1 = TB.$('#eqEq1', root);
      var eq2 = TB.$('#eqEq2', root);

      function equationText(a, b, c, isQuad) {
        function term(value, variable) {
          if (Math.abs(value) < 1e-12) return '';
          var abs = Math.abs(value);
          var s = variable ? (Math.abs(abs - 1) < 1e-12 ? variable : fmt(abs) + variable) : fmt(abs);
          return (value < 0 ? ' − ' : ' + ') + s;
        }
        var text = (isQuad ? term(a, 'x²') : term(a, 'x')) || '0';
        text += term(b, isQuad ? 'x' : '');
        if (isQuad) text += term(c, '');
        text += ' = 0';
        return text.replace(/^ \+ /, '').replace(/^ − /, '−');
      }

      function updateEquationLabel() {
        var a1 = num('eq-a1', root), b1 = num('eq-b1', root);
        var a2 = num('eq-a2', root), b2 = num('eq-b2', root), c2 = num('eq-c2', root);
        eq1.textContent = equationText(a1, b1, 0, false);
        eq2.textContent = equationText(a2, b2, c2, true);
      }

      function solve() {
        updateEquationLabel();
        if (mode === 'linear') {
          var a1 = num('eq-a1', root), b1 = num('eq-b1', root);
          if (!isFinite(a1) || !isFinite(b1)) {
            out.textContent = '请输入有效的数字系数';
            return;
          }
          out.textContent = equationText(a1, b1, 0, false) + '\n' + solveLinear(a1, b1);
        } else {
          var a2 = num('eq-a2', root), b2 = num('eq-b2', root), c2 = num('eq-c2', root);
          if (!isFinite(a2) || !isFinite(b2) || !isFinite(c2)) {
            out.textContent = '请输入有效的数字系数';
            return;
          }
          out.textContent = equationText(a2, b2, c2, true) + '\n' + solveQuadratic(a2, b2, c2);
        }
      }

      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          mode = tab.getAttribute('data-eq');
          TB.$$('.tab', root).forEach(function (x) {
            x.classList.toggle('on', x === tab);
            x.setAttribute('aria-selected', x === tab ? 'true' : 'false');
          });
          linearBox.hidden = mode !== 'linear';
          quadBox.hidden = mode !== 'quad';
          solve();
        });
      });
      TB.$$('input[type=number]', root).forEach(function (el) {
        el.addEventListener('input', function () { updateEquationLabel(); solve(); });
      });
      TB.$('#eqRun', root).addEventListener('click', solve);
      TB.$('#eqCopy', root).addEventListener('click', function () {
        if (out.textContent) TB.copy(out.textContent);
      });

      solve();
    }
  });
})();
