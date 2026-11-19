/* =============================================================================
 * Chmod 计算器
 * -----------------------------------------------------------------------------
 * 在八进制权限与 rwx 符号之间互转，并显示等价的 chmod 命令。
 * 只做计算，不会执行任何命令。
 * ========================================================================== */
(function () {
  'use strict';

  var BITS = {
    setuid: 2048, setgid: 1024, sticky: 512,
    ur: 256, uw: 128, ux: 64,
    gr: 32, gw: 16, gx: 8,
    or: 4, ow: 2, ox: 1
  };
  var PRESETS = [['644', '644 普通文件'], ['755', '755 可执行'], ['700', '700 仅所有者'], ['777', '777 全部开放']];

  function toSymbolic(m) {
    function part(read, write, exec, special, specialChar) {
      var r = (m & read) ? 'r' : '-';
      var w = (m & write) ? 'w' : '-';
      var x = (m & exec) ? 'x' : '-';
      if (m & special) x = (m & exec) ? specialChar : specialChar.toUpperCase();
      return r + w + x;
    }
    return part(BITS.ur, BITS.uw, BITS.ux, BITS.setuid, 's') +
      part(BITS.gr, BITS.gw, BITS.gx, BITS.setgid, 's') +
      part(BITS.or, BITS.ow, BITS.ox, BITS.sticky, 't');
  }

  TB.def({
    slug: 'chmod',
    cat: 'web',
    name: 'Chmod 计算器',
    desc: '八进制权限与 rwx 符号互转，生成 chmod 命令。',
    icon: '🔐',
    kw: 'chmod 权限 linux rwx 八进制 755 644 文件权限',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">权限模式 <span class="hint">输入八进制或勾选下方权限</span></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">八进制模式</div><input class="input" id="cmOctal" maxlength="4" inputmode="numeric" value="755"></div>' +
            '<div class="field"><div class="label">文件 / 目录路径</div><input class="input" id="cmPath" value="file.txt"></div>' +
          '</div>' +
          '<div class="chips" id="cmPresets">' + PRESETS.map(function (p) {
            return '<button class="chip" type="button" data-mode="' + p[0] + '">' + p[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="table-wrap" style="margin-top:14px"><table class="table"><thead><tr><th>类别</th><th>读</th><th>写</th><th>执行</th></tr></thead><tbody>' +
            '<tr><td>所有者（u）</td><td><input type="checkbox" data-bit="ur" aria-label="所有者读"></td><td><input type="checkbox" data-bit="uw" aria-label="所有者写"></td><td><input type="checkbox" data-bit="ux" aria-label="所有者执行"></td></tr>' +
            '<tr><td>用户组（g）</td><td><input type="checkbox" data-bit="gr" aria-label="用户组读"></td><td><input type="checkbox" data-bit="gw" aria-label="用户组写"></td><td><input type="checkbox" data-bit="gx" aria-label="用户组执行"></td></tr>' +
            '<tr><td>其他人（o）</td><td><input type="checkbox" data-bit="or" aria-label="其他人读"></td><td><input type="checkbox" data-bit="ow" aria-label="其他人写"></td><td><input type="checkbox" data-bit="ox" aria-label="其他人执行"></td></tr>' +
          '</tbody></table></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<div class="field"><label class="hint" style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-bit="setuid" aria-label="setuid"> setuid（4000）</label></div>' +
            '<div class="field"><label class="hint" style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-bit="setgid" aria-label="setgid"> setgid（2000）</label></div>' +
            '<div class="field"><label class="hint" style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-bit="sticky" aria-label="sticky"> sticky（1000）</label></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="cmCopy" type="button">复制命令</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">转换结果</div>' +
          '<div class="kv" style="margin-bottom:12px">' +
            '<div class="kv-item"><div class="kv-k">八进制</div><div class="kv-v" id="cmOutOctal">755</div></div>' +
            '<div class="kv-item"><div class="kv-k">符号模式</div><div class="kv-v" id="cmOutSym">rwxr-xr-x</div></div>' +
            '<div class="kv-item"><div class="kv-k">符号表达式</div><div class="kv-v" id="cmOutExpr">u=rwx,g=rx,o=rx</div></div>' +
          '</div>' +
          '<pre class="codeBox" id="cmCommand">chmod 755 file.txt</pre>' +
        '</div>' +
        '<p class="note">setuid / setgid / sticky 分别对应八进制的 4000 / 2000 / 1000。这里只计算权限字符串，不会执行 <b>chmod</b> 命令。</p>';

      var octal = TB.$('#cmOctal', root);
      var path = TB.$('#cmPath', root);
      var boxes = Array.prototype.slice.call(root.querySelectorAll('input[data-bit]'));
      var outOctal = TB.$('#cmOutOctal', root);
      var outSym = TB.$('#cmOutSym', root);
      var outExpr = TB.$('#cmOutExpr', root);
      var command = TB.$('#cmCommand', root);
      var mode = 0;

      function syncBoxes() {
        boxes.forEach(function (box) {
          box.checked = !!(mode & BITS[box.getAttribute('data-bit')]);
        });
      }

      function expr(s) {
        return 'u=' + s.slice(0, 3).replace(/-/g, '') + ',g=' + s.slice(3, 6).replace(/-/g, '') + ',o=' + s.slice(6, 9).replace(/-/g, '');
      }

      function render() {
        var s = toSymbolic(mode);
        var oct = mode.toString(8);
        outOctal.textContent = oct;
        outSym.textContent = s;
        outExpr.textContent = expr(s);
        var target = path.value.trim() || 'file.txt';
        command.textContent = 'chmod ' + oct + ' ' + target;
        octal.value = oct;
      }

      function setMode(next) {
        mode = Math.max(0, Math.min(4095, next));
        syncBoxes();
        render();
      }

      octal.addEventListener('input', function () {
        var digits = octal.value.replace(/[^0-7]/g, '').slice(0, 4);
        octal.value = digits;
        if (!digits) { mode = 0; syncBoxes(); render(); return; }
        var next = parseInt(digits, 8);
        if (isNaN(next) || next > 4095) return;
        mode = next;
        syncBoxes();
        outOctal.textContent = mode.toString(8);
        outSym.textContent = toSymbolic(mode);
        var s = toSymbolic(mode);
        outExpr.textContent = expr(s);
        command.textContent = 'chmod ' + mode.toString(8) + ' ' + (path.value.trim() || 'file.txt');
      });

      boxes.forEach(function (box) {
        box.addEventListener('change', function () {
          var bit = BITS[box.getAttribute('data-bit')];
          mode = box.checked ? (mode | bit) : (mode & ~bit);
          render();
        });
      });

      root.querySelectorAll('#cmPresets .chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setMode(parseInt(btn.getAttribute('data-mode'), 8));
        });
      });

      path.addEventListener('input', render);
      TB.$('#cmCopy', root).addEventListener('click', function () { TB.copy(command.textContent); });

      mode = parseInt('755', 8);
      syncBoxes();
      render();
    }
  });
})();
