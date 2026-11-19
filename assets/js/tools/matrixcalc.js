/* =============================================================================
 * 矩阵计算器
 * -----------------------------------------------------------------------------
 * 支持 2×2 到 5×5 方阵的加减、乘法、转置和行列式。
 * 全部在浏览器本地计算，不调用后端；结果保留 6 位小数并自动去掉 -0。
 * ========================================================================== */
(function () {
  'use strict';

  function fmt(n) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) < 1e-10) return '0';
    var rounded = Number(n.toFixed(6));
    return String(rounded);
  }

  function matrixText(m) {
    return m.map(function (row) {
      return '[ ' + row.map(fmt).join('  ') + ' ]';
    }).join('\n');
  }

  function add(a, b, sign) {
    return a.map(function (row, i) {
      return row.map(function (v, j) { return v + sign * b[i][j]; });
    });
  }

  function multiply(a, b) {
    var n = a.length;
    var out = [];
    for (var i = 0; i < n; i++) {
      out[i] = [];
      for (var j = 0; j < n; j++) {
        var sum = 0;
        for (var k = 0; k < n; k++) sum += a[i][k] * b[k][j];
        out[i][j] = sum;
      }
    }
    return out;
  }

  function transpose(a) {
    return a.map(function (_, i) {
      return a.map(function (row) { return row[i]; });
    });
  }

  function determinant(m) {
    var n = m.length;
    var a = m.map(function (row) { return row.slice(); });
    var det = 1;
    for (var i = 0; i < n; i++) {
      var pivot = i;
      for (var r = i + 1; r < n; r++) {
        if (Math.abs(a[r][i]) > Math.abs(a[pivot][i])) pivot = r;
      }
      if (Math.abs(a[pivot][i]) < 1e-12) return 0;
      if (pivot !== i) {
        var tmp = a[i]; a[i] = a[pivot]; a[pivot] = tmp;
        det = -det;
      }
      det *= a[i][i];
      for (var r2 = i + 1; r2 < n; r2++) {
        var factor = a[r2][i] / a[i][i];
        for (var c = i + 1; c < n; c++) a[r2][c] -= factor * a[i][c];
      }
    }
    return det;
  }

  function sample(n) {
    var a = [], b = [];
    for (var i = 0; i < n; i++) {
      a[i] = [];
      b[i] = [];
      for (var j = 0; j < n; j++) {
        a[i][j] = i === j ? 2 : (j === (i + 1) % n ? 1 : 0);
        b[i][j] = i === j ? 1 : (j === (n - 1 - i) ? 1 : 0);
      }
    }
    return [a, b];
  }

  function grid(prefix, values, n) {
    var rows = '';
    for (var i = 0; i < n; i++) {
      var cells = '';
      for (var j = 0; j < n; j++) {
        cells += '<input class="input mx-input" type="number" step="any" id="' + prefix + '-' + i + '-' + j +
          '" value="' + values[i][j] + '" aria-label="' + prefix.toUpperCase() + ' 第' + (i + 1) + '行第' + (j + 1) + '列">';
      }
      rows += '<div class="mx-row">' + cells + '</div>';
    }
    return '<div class="mx-grid" data-matrix="' + prefix + '" style="--mx-n:' + n + '">' + rows + '</div>';
  }

  TB.def({
    slug: 'matrixcalc',
    cat: 'data',
    name: '矩阵计算器',
    desc: '2×2 到 5×5 方阵的加减、乘法、转置与行列式。',
    icon: '🔢',
    kw: '矩阵 行列式 转置 乘法 线性代数 计算器',
    render: function (ctx) {
      var root = ctx.root;
      var n = 3;
      var current = sample(n);

      root.innerHTML =
        '<div class="panel"><div class="panel-h">矩阵维度</div>' +
          '<div class="field"><select class="select" id="mxSize">' +
            [2, 3, 4, 5].map(function (s) { return '<option value="' + s + '"' + (s === n ? ' selected' : '') + '>' + s + ' × ' + s + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="hint">两个矩阵都是同维方阵，因此加减、乘法和转置可以直接进行。</div></div>' +
        '<div class="panel"><div class="panel-h">矩阵 A</div><div id="mxA"></div></div>' +
        '<div class="panel"><div class="panel-h">矩阵 B</div><div id="mxB"></div></div>' +
        '<div class="panel"><div class="panel-h">运算</div>' +
          '<div class="btns">' +
            '<button class="btn primary" data-op="add" type="button">A + B</button>' +
            '<button class="btn" data-op="sub" type="button">A − B</button>' +
            '<button class="btn" data-op="mul" type="button">A × B</button>' +
            '<button class="btn" data-op="ta" type="button">A 转置</button>' +
            '<button class="btn" data-op="tb" type="button">B 转置</button>' +
            '<button class="btn" data-op="da" type="button">|A| 行列式</button>' +
            '<button class="btn" data-op="db" type="button">|B| 行列式</button>' +
          '</div></div>' +
        '<div class="panel"><div class="panel-h">结果</div><pre class="codeBox" id="mxOut" style="min-height:80px"></pre>' +
          '<div class="btns" style="margin-top:10px"><button class="btn" id="mxCopy" type="button">复制结果</button></div></div>' +
        '<p class="note">行列式使用带部分主元的高斯消元；结果为浮点近似，保留 6 位小数。行列式为 0 时矩阵不可逆，但本工具不计算逆矩阵。</p>';

      var out = TB.$('#mxOut', root);
      var size = TB.$('#mxSize', root);

      function read(prefix) {
        var m = [];
        for (var i = 0; i < n; i++) {
          m[i] = [];
          for (var j = 0; j < n; j++) {
            var input = TB.$('#' + prefix + '-' + i + '-' + j, root);
            var v = Number(input.value);
            if (input.value.trim() === '') v = 0;
            if (!isFinite(v)) throw new Error(prefix.toUpperCase() + ' 的第 ' + (i + 1) + ' 行第 ' + (j + 1) + ' 列不是有效数字');
            m[i][j] = v;
          }
        }
        return m;
      }

      function renumber() {
        TB.$$('.mx-input', root).forEach(function (input) {
          input.addEventListener('input', function () { out.textContent = ''; });
        });
      }

      function rebuild(sizeValue) {
        n = Number(sizeValue);
        current = sample(n);
        TB.$('#mxA', root).innerHTML = grid('mxA', current[0], n);
        TB.$('#mxB', root).innerHTML = grid('mxB', current[1], n);
        out.textContent = '';
        renumber();
      }

      function calculate(op) {
        try {
          var a = read('mxA');
          var b = read('mxB');
          var result, title;
          if (op === 'add') { result = add(a, b, 1); title = 'A + B'; }
          else if (op === 'sub') { result = add(a, b, -1); title = 'A − B'; }
          else if (op === 'mul') { result = multiply(a, b); title = 'A × B'; }
          else if (op === 'ta') { result = transpose(a); title = 'A 的转置'; }
          else if (op === 'tb') { result = transpose(b); title = 'B 的转置'; }
          else if (op === 'da') { result = determinant(a); title = '|A| 行列式'; }
          else if (op === 'db') { result = determinant(b); title = '|B| 行列式'; }
          else return;
          out.textContent = title + ' =\n' + (typeof result === 'number' ? fmt(result) : matrixText(result));
        } catch (e) {
          out.textContent = '计算失败：' + e.message;
        }
      }

      TB.$('#mxSize', root).addEventListener('change', function (e) { rebuild(e.target.value); });
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-op]');
        if (btn) calculate(btn.getAttribute('data-op'));
      });
      TB.$('#mxCopy', root).addEventListener('click', function () {
        if (out.textContent) TB.copy(out.textContent);
      });

      rebuild(n);
    }
  });
})();
