/* =============================================================================
 * 三个小游戏/可视化工具：五子棋（人机）、迷宫寻路、二维码美化
 * -----------------------------------------------------------------------------
 * 五子棋用"连子 + 开口"的启发式打分，一步前瞻；迷宫用深度优先生成 + BFS 求最短路；
 * 二维码在 qrcode-generator 的模块矩阵上自行绘制圆点、码眼与中心文字。
 * ========================================================================== */

(function () {

  /* ================================================== 1. 五子棋 */
  TB.def({
    slug: 'gomoku', cat: 'fun', name: '五子棋', desc: '人机对战 · 15×15', icon: '⚫',
    kw: '五子棋 棋 游戏 人机 对战 黑白',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="gomokuWrap"><canvas id="board" width="600" height="600"></canvas></div>' +
          '<div class="gomokuBar">' +
            '<span class="gomokuStatus" id="st">你先下（黑子），电脑执白</span>' +
            '<button class="btn primary" id="restart">重新开始</button>' +
            '<button class="btn" id="undo">悔一步</button>' +
          '</div>' +
        '</div>' +
        '<div class="note">电脑一步前瞻：先看自己能不能成五，再堵你的四连与活三。水平有限，赢它不难，但足够陪练。</div>';

      var cv = TB.$('#board', root), st = TB.$('#st', root);
      var N = 15;
      var dpr = window.devicePixelRatio || 1;
      var board = [], moves = [], over = false, thinking = false;
      var last = null;

      function reset() {
        board = [];
        for (var i = 0; i < N; i++) board.push(new Array(N).fill(0));
        moves = []; over = false; thinking = false; last = null;
        st.textContent = '你先下（黑子），电脑执白';
        draw();
      }

      function geom() {
        var size = cv.clientWidth || 600;
        var pad = Math.round(size * 0.035);
        return { size: size, pad: pad, cell: (size - pad * 2) / (N - 1) };
      }

      function draw() {
        var g = geom();
        var px = Math.round(g.size * dpr);
        if (cv.width !== px) { cv.width = px; cv.height = px; }
        var c = cv.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, g.size, g.size);
        c.fillStyle = '#e8c98d';
        c.fillRect(0, 0, g.size, g.size);

        c.strokeStyle = 'rgba(96,64,24,.55)';
        c.lineWidth = 1;
        for (var i = 0; i < N; i++) {
          var p = g.pad + i * g.cell;
          c.beginPath(); c.moveTo(g.pad, p); c.lineTo(g.size - g.pad, p); c.stroke();
          c.beginPath(); c.moveTo(p, g.pad); c.lineTo(p, g.size - g.pad); c.stroke();
        }
        /* 天元与四个星位 */
        [[7, 7], [3, 3], [3, 11], [11, 3], [11, 11]].forEach(function (s) {
          c.beginPath();
          c.arc(g.pad + s[0] * g.cell, g.pad + s[1] * g.cell, 3, 0, Math.PI * 2);
          c.fillStyle = 'rgba(96,64,24,.75)';
          c.fill();
        });

        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) {
            if (!board[y][x]) continue;
            var cx = g.pad + x * g.cell, cy = g.pad + y * g.cell;
            var r = g.cell * 0.44;
            var grd = c.createRadialGradient(cx - r * .3, cy - r * .3, r * .2, cx, cy, r);
            if (board[y][x] === 1) { grd.addColorStop(0, '#5a5a5a'); grd.addColorStop(1, '#111'); }
            else { grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#cfcfcf'); }
            c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
            c.fillStyle = grd; c.fill();
            c.strokeStyle = board[y][x] === 1 ? '#000' : '#bbb';
            c.lineWidth = 1; c.stroke();
          }
        }
        if (last) {
          var lx = g.pad + last[0] * g.cell, ly = g.pad + last[1] * g.cell;
          c.beginPath();
          c.arc(lx, ly, g.cell * 0.16, 0, Math.PI * 2);
          c.strokeStyle = board[last[1]][last[0]] === 1 ? '#f55' : '#e0483f';
          c.lineWidth = 2; c.stroke();
        }
      }

      function countDir(x, y, dx, dy, color) {
        var n = 1, open = 0;
        var i, cx, cy;
        for (i = 1; i < 5; i++) {
          cx = x + dx * i; cy = y + dy * i;
          if (cx < 0 || cy < 0 || cx >= N || cy >= N) break;
          if (board[cy][cx] === color) n++; else { if (board[cy][cx] === 0) open++; break; }
        }
        for (i = 1; i < 5; i++) {
          cx = x - dx * i; cy = y - dy * i;
          if (cx < 0 || cy < 0 || cx >= N || cy >= N) break;
          if (board[cy][cx] === color) n++; else { if (board[cy][cx] === 0) open++; break; }
        }
        return { n: n, open: open };
      }

      function wins(x, y, color) {
        var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (var i = 0; i < dirs.length; i++) {
          if (countDir(x, y, dirs[i][0], dirs[i][1], color).n >= 5) return true;
        }
        return false;
      }

      /* 打分：五连最高，其次活四、冲四、活三…，两头开口比单头值钱 */
      function scoreAt(x, y, color) {
        var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        var total = 0;
        for (var i = 0; i < dirs.length; i++) {
          var r = countDir(x, y, dirs[i][0], dirs[i][1], color);
          var open = r.open;
          if (r.n >= 5) total += 1000000;
          else if (r.n === 4) total += open >= 2 ? 120000 : (open === 1 ? 30000 : 0);
          else if (r.n === 3) total += open >= 2 ? 8000 : (open === 1 ? 1200 : 0);
          else if (r.n === 2) total += open >= 2 ? 600 : (open === 1 ? 120 : 0);
          else if (r.n === 1) total += open >= 2 ? 30 : 6;
        }
        return total;
      }

      function candidates() {
        var list = [];
        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) {
            if (board[y][x]) continue;
            var near = false;
            for (var dy = -2; dy <= 2 && !near; dy++) {
              for (var dx = -2; dx <= 2; dx++) {
                var nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < N && ny < N && board[ny][nx]) { near = true; break; }
              }
            }
            if (near || moves.length === 0) list.push([x, y]);
          }
        }
        return list;
      }

      function aiMove() {
        var list = candidates();
        var best = null, bestScore = -1;
        for (var i = 0; i < list.length; i++) {
          var x = list[i][0], y = list[i][1];
          /* 自己的进攻分 + 对手在这儿的进攻分（等于堵他） */
          var s = scoreAt(x, y, 2) * 1.15 + scoreAt(x, y, 1);
          if (s > bestScore) { bestScore = s; best = [x, y]; }
        }
        if (!best) return null;
        board[best[1]][best[0]] = 2;
        moves.push(best); last = best;
        if (wins(best[0], best[1], 2)) { over = true; st.textContent = '电脑赢了，再来一局？'; }
        else if (moves.length === N * N) { over = true; st.textContent = '棋盘满了，平局'; }
        else st.textContent = '你的回合（黑子）';
        thinking = false;
        draw();
        return best;
      }

      cv.addEventListener('click', function (e) {
        if (over || thinking) return;
        var g = geom();
        var rect = cv.getBoundingClientRect();
        var x = Math.round((e.clientX - rect.left - g.pad) / g.cell);
        var y = Math.round((e.clientY - rect.top - g.pad) / g.cell);
        if (x < 0 || y < 0 || x >= N || y >= N || board[y][x]) return;
        board[y][x] = 1;
        moves.push([x, y]); last = [x, y];
        draw();
        if (wins(x, y, 1)) { over = true; st.textContent = '你赢了！'; return; }
        if (moves.length === N * N) { over = true; st.textContent = '棋盘满了，平局'; return; }
        thinking = true;
        st.textContent = '电脑思考中…';
        setTimeout(aiMove, 220);
      });

      TB.$('#restart', root).addEventListener('click', reset);
      TB.$('#undo', root).addEventListener('click', function () {
        if (thinking || !moves.length) { TB.toast('等电脑下完再悔棋'); return; }
        /* 退两步：自己的 + 电脑的 */
        for (var i = 0; i < 2 && moves.length; i++) {
          var m = moves.pop();
          board[m[1]][m[0]] = 0;
        }
        over = false;
        last = moves.length ? moves[moves.length - 1] : null;
        st.textContent = '你的回合（黑子）';
        draw();
      });

      reset();
      window.addEventListener('resize', function () { draw(); });
    }
  });

  /* ================================================== 2. 迷宫生成与寻路 */
  TB.def({
    slug: 'maze', cat: 'fun', name: '迷宫寻路', desc: '生成 · BFS 最短路径', icon: '🧩',
    kw: '迷宫 生成 寻路 BFS 最短路 算法 可视化',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="calHead">' +
            '<label class="chk" style="margin:0">格子 <select class="input" id="size" style="width:auto;display:inline-block;margin-left:6px">' +
              '<option value="10">10 × 10</option><option value="15" selected>15 × 15</option>' +
              '<option value="20">20 × 20</option><option value="30">30 × 30</option></select></label>' +
            '<button class="btn primary" id="gen">新迷宫</button>' +
            '<button class="btn" id="solve">找最短路径</button>' +
          '</div>' +
          '<div class="mazeWrap"><canvas id="maze" width="660" height="660"></canvas></div>' +
          '<div class="note" id="msg">蓝点是起点，红点是终点。每次生成都是随机的完美迷宫（任意两点只有一条路径）。</div>' +
        '</div>' +
        '<div class="note">生成用深度优先（挖通道），寻路用广度优先，保证找到的是最短路径而不是"能走通"。</div>';

      var cv = TB.$('#maze', root), msg = TB.$('#msg', root);
      var dpr = window.devicePixelRatio || 1;
      var N = 15, cells = [], path = [], timer = null;

      /* 每个格子记 walls: 上右下左 */
      function generate(n) {
        N = n;
        cells = [];
        for (var y = 0; y < N; y++) {
          cells.push([]);
          for (var x = 0; x < N; x++) cells[y].push({ w: [1, 1, 1, 1], v: 0 });
        }
        var stack = [[0, 0]];
        cells[0][0].v = 1;
        while (stack.length) {
          var cur = stack[stack.length - 1];
          var x0 = cur[0], y0 = cur[1];
          var next = [];
          var moves = [[0, -1], [1, 0], [0, 1], [-1, 0]];
          for (var i = 0; i < 4; i++) {
            var nx = x0 + moves[i][0], ny = y0 + moves[i][1];
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && !cells[ny][nx].v) next.push([nx, ny, i]);
          }
          if (!next.length) { stack.pop(); continue; }
          var pick = next[Math.floor(Math.random() * next.length)];
          var nx2 = pick[0], ny2 = pick[1], d = pick[2];
          var opp = (d + 2) % 4;
          cells[y0][x0].w[d] = 0;
          cells[ny2][nx2].w[opp] = 0;
          cells[ny2][nx2].v = 1;
          stack.push([nx2, ny2]);
        }
        path = [];
      }

      function geom() {
        var size = cv.clientWidth || 660;
        var pad = 8;
        return { size: size, pad: pad, cell: (size - pad * 2) / N };
      }

      function draw() {
        var g = geom();
        var px = Math.round(g.size * dpr);
        if (cv.width !== px) { cv.width = px; cv.height = px; }
        var c = cv.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, g.size, g.size);
        c.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface') || '#fff';
        c.fillRect(0, 0, g.size, g.size);

        /* 路径先画，压在墙下面 */
        if (path.length) {
          c.strokeStyle = '#2b7fff';
          c.lineWidth = Math.max(2, g.cell * 0.34);
          c.lineJoin = 'round';
          c.beginPath();
          path.forEach(function (p, i) {
            var cx = g.pad + p[0] * g.cell + g.cell / 2;
            var cy = g.pad + p[1] * g.cell + g.cell / 2;
            if (i) c.lineTo(cx, cy); else c.moveTo(cx, cy);
          });
          c.stroke();
        }

        c.strokeStyle = getComputedStyle(document.body).getPropertyValue('--ink-2') || '#666';
        c.lineWidth = Math.max(1.5, g.cell * 0.09);
        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) {
            var cell = cells[y][x];
            var x0 = g.pad + x * g.cell, y0 = g.pad + y * g.cell;
            if (cell.w[0]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + g.cell, y0); }
            if (cell.w[1]) { c.beginPath(); c.moveTo(x0 + g.cell, y0); c.lineTo(x0 + g.cell, y0 + g.cell); }
            if (cell.w[2]) { c.beginPath(); c.moveTo(x0 + g.cell, y0 + g.cell); c.lineTo(x0, y0 + g.cell); }
            if (cell.w[3]) { c.beginPath(); c.moveTo(x0, y0 + g.cell); c.lineTo(x0, y0); }
            c.stroke();
          }
        }

        function dot(x, y, color) {
          c.beginPath();
          c.arc(g.pad + x * g.cell + g.cell / 2, g.pad + y * g.cell + g.cell / 2, g.cell * 0.3, 0, Math.PI * 2);
          c.fillStyle = color; c.fill();
        }
        dot(0, 0, '#2b7fff');
        dot(N - 1, N - 1, '#e0483f');
      }

      function solve() {
        if (timer) { clearInterval(timer); timer = null; }
        var dist = [], from = [];
        for (var y = 0; y < N; y++) { dist.push(new Array(N).fill(-1)); from.push(new Array(N).fill(null)); }
        /* 迷宫墙位定义：0 上、1 右、2 下、3 左；移动时检查当前格对应墙 */
        var q = [[0, 0]];
        dist[0][0] = 0;
        while (q.length) {
          var cur = q.shift();
          var x = cur[0], y0 = cur[1], cell = cells[y0][x];
          var nb = [[x, y0 - 1, 0], [x + 1, y0, 1], [x, y0 + 1, 2], [x - 1, y0, 3]];
          for (var i = 0; i < 4; i++) {
            var n = nb[i];
            if (n[0] < 0 || n[1] < 0 || n[0] >= N || n[1] >= N) continue;
            if (cell.w[n[2]]) continue;
            if (dist[n[1]][n[0]] !== -1) continue;
            dist[n[1]][n[0]] = dist[y0][x] + 1;
            from[n[1]][n[0]] = [x, y0];
            q.push([n[0], n[1]]);
          }
        }
        if (dist[N - 1][N - 1] < 0) { msg.textContent = '这个迷宫走不通（不该发生）'; return; }
        var p = [], cx = N - 1, cy = N - 1;
        while (cx !== 0 || cy !== 0) {
          p.push([cx, cy]);
          var f = from[cy][cx];
          if (!f) break;
          cx = f[0]; cy = f[1];
        }
        p.push([0, 0]);
        p.reverse();
        msg.textContent = '最短路径 ' + (p.length - 1) + ' 步，正在逐格铺开…';
        path = [];
        var i2 = 0;
        timer = setInterval(function () {
          path.push(p[i2]);
          i2++;
          if (i2 >= p.length) {
            clearInterval(timer); timer = null;
            msg.textContent = '最短路径 ' + (p.length - 1) + ' 步（BFS 保证最短）。';
          }
          draw();
        }, 12);
      }

      TB.$('#gen', root).addEventListener('click', function () {
        if (timer) { clearInterval(timer); timer = null; }
        generate(parseInt(TB.$('#size', root).value, 10));
        msg.textContent = '蓝点是起点，红点是终点。新迷宫已生成。';
        draw();
      });
      TB.$('#solve', root).addEventListener('click', solve);
      TB.$('#size', root).addEventListener('change', function () {
        if (timer) { clearInterval(timer); timer = null; }
        generate(parseInt(TB.$('#size', root).value, 10)); draw();
      });
      window.addEventListener('resize', function () { draw(); });

      generate(N);
      draw();
    }
  });

  /* ================================================== 3. 二维码美化 */
  TB.def({
    slug: 'qr-style', cat: 'image', name: '二维码美化', desc: '背景 · 圆点 · 配色 · 中心字 / Logo', icon: '🟦',
    kw: '二维码 美化 自定义 颜色 logo 圆点 qr 设计 艺术二维码 背景图',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>内容</b></div>' +
              '<input class="input" id="text" value="https://www.vimon.cc/tools/" autocomplete="off"></div>' +
            '<div class="field"><div class="label">中心文字 <span style="color:var(--ink-3)">最多 4 字，和 Logo 二选一</span></div>' +
              '<input class="input" id="center" maxlength="4" value="简单" autocomplete="off"></div>' +
          '</div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">前景色</div><input class="input color" type="color" id="fg" value="#1f2d44"></div>' +
            '<div class="field"><div class="label">背景色</div><input class="input color" type="color" id="bg" value="#ffffff"></div>' +
            '<div class="field" id="bg2Field"><div class="label">辅助色</div><input class="input color" type="color" id="bg2" value="#dbeafe"></div>' +
          '</div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">码眼颜色</div><input class="input color" type="color" id="eye" value="#2b7fff"></div>' +
            '<div class="field"><div class="label">点样式</div><select class="input" id="dot">' +
              '<option value="square">方块</option><option value="round" selected>圆点</option></select></div>' +
            '<div class="field"><div class="label">容错级别</div><select class="input" id="ec">' +
              '<option value="L">L · 7%</option><option value="M">M · 15%</option>' +
              '<option value="Q" selected>Q · 25%</option><option value="H">H · 30%</option></select></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">输出尺寸</div><select class="input" id="size">' +
              '<option value="512">512 × 512</option><option value="768" selected>768 × 768</option>' +
              '<option value="1024">1024 × 1024</option></select></div>' +
            '<div class="field"><div class="label">背景样式</div><select class="input" id="bgStyle">' +
              '<option value="plain">纯色</option><option value="gradient" selected>渐变</option>' +
              '<option value="dots">点阵</option><option value="stripes">斜纹</option>' +
              '<option value="grid">网格</option><option value="image">上传图片</option></select></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field" id="bgFileField"><div class="label">背景图</div>' +
              '<div class="payqr-file"><label class="btn sm">选择图片<input type="file" id="bgFile" accept="image/*"></label>' +
              '<button class="btn sm" id="bgClear" type="button">清除</button>' +
              '<span class="payqr-file-name" id="bgName">未选择</span></div></div>' +
            '<div class="field"><div class="label">中心 Logo</div>' +
              '<div class="payqr-file"><label class="btn sm">选择图片<input type="file" id="logoFile" accept="image/*"></label>' +
              '<button class="btn sm" id="logoClear" type="button">清除</button>' +
              '<span class="payqr-file-name" id="logoName">未选择</span></div></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="dl">下载 PNG</button></div>' +
          '<div class="qrBox"><canvas id="qc" width="768" height="768"></canvas></div>' +
          '<div id="msg"></div>' +
        '</div>' +
        '<div class="note">二维码本体由 qrcode-generator 生成，背景、圆点、码眼和中心 Logo 只影响渲染，扫码内容不变。中心 Logo / 文字会遮住中间模块，默认 Q 级容错；内容较长或遮挡较大时请选 H。</div>';

      var cv = TB.$('#qc', root), msg = TB.$('#msg', root);
      var bgImg = null, bgUrl = null, logoImg = null, logoUrl = null;
      var renderSeq = 0;

      function status(html, isErr) {
        msg.innerHTML = '<div class="' + (isErr ? 'result-err' : 'note') + '" style="margin-top:12px">' + html + '</div>';
      }

      function roundRect(c, x, y, w, h, r) {
        if (c.roundRect) {
          c.beginPath();
          c.roundRect(x, y, w, h, r);
        } else {
          c.beginPath();
          c.moveTo(x + r, y);
          c.arcTo(x + w, y, x + w, y + h, r);
          c.arcTo(x + w, y + h, x, y + h, r);
          c.arcTo(x, y + h, x, y, r);
          c.arcTo(x, y, x + w, y, r);
          c.closePath();
        }
      }

      function drawCover(c, img, size) {
        var ratio = Math.max(size / img.width, size / img.height);
        var w = img.width * ratio, h = img.height * ratio;
        c.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      }

      function drawBackground(c, size, style) {
        var bg = TB.$('#bg', root).value;
        var bg2 = TB.$('#bg2', root).value;

        if (style === 'image' && bgImg) {
          drawCover(c, bgImg, size);
          return;
        }

        if (style === 'gradient') {
          var g = c.createLinearGradient(0, 0, size, size);
          g.addColorStop(0, bg);
          g.addColorStop(1, bg2);
          c.fillStyle = g;
          c.fillRect(0, 0, size, size);
          return;
        }

        c.fillStyle = bg;
        c.fillRect(0, 0, size, size);

        if (style === 'dots') {
          var gap = size / 26;
          c.fillStyle = bg2;
          c.globalAlpha = 0.55;
          for (var y = gap / 2; y < size; y += gap) {
            for (var x = gap / 2; x < size; x += gap) {
              c.beginPath();
              c.arc(x, y, gap * 0.24, 0, Math.PI * 2);
              c.fill();
            }
          }
          c.globalAlpha = 1;
        } else if (style === 'stripes') {
          c.strokeStyle = bg2;
          c.globalAlpha = 0.4;
          c.lineWidth = Math.max(2, size / 40);
          for (var i = -size; i < size * 2; i += size / 12) {
            c.beginPath();
            c.moveTo(i, 0);
            c.lineTo(i - size, size);
            c.stroke();
          }
          c.globalAlpha = 1;
        } else if (style === 'grid') {
          c.strokeStyle = bg2;
          c.globalAlpha = 0.42;
          c.lineWidth = Math.max(1, size / 180);
          var step = size / 18;
          for (var gx = 0; gx <= size; gx += step) {
            c.beginPath();
            c.moveTo(gx, 0);
            c.lineTo(gx, size);
            c.stroke();
          }
          for (var gy = 0; gy <= size; gy += step) {
            c.beginPath();
            c.moveTo(0, gy);
            c.lineTo(size, gy);
            c.stroke();
          }
          c.globalAlpha = 1;
        }
      }

      function syncBgFields() {
        var style = TB.$('#bgStyle', root).value;
        TB.$('#bg2Field', root).style.display = (style === 'plain' || style === 'image') ? 'none' : '';
        TB.$('#bgFileField', root).style.display = style === 'image' ? '' : 'none';
      }

      async function render() {
        var seq = ++renderSeq;
        var text = TB.$('#text', root).value.trim();
        if (!text) { status('内容不能为空', true); return false; }

        var style = TB.$('#bgStyle', root).value;
        if (style === 'image' && !bgImg) { status('请先选择一张背景图，或把背景样式换回渐变 / 点阵。', true); return false; }

        await TB.loadLib('qrcode.js');
        if (seq !== renderSeq) return false;

        var ec = TB.$('#ec', root).value;
        var qr = window.qrcode(0, ec);
        try {
          qr.addData(text);
          qr.make();
        } catch (e) {
          status('内容太长，当前容错级别放不下。请缩短内容，或把容错降到 L。', true);
          return false;
        }

        var count = qr.getModuleCount();
        var size = parseInt(TB.$('#size', root).value, 10) || 768;
        var fg = TB.$('#fg', root).value;
        var eye = TB.$('#eye', root).value;
        var round = TB.$('#dot', root).value === 'round';
        var art = style !== 'plain';
        var platePad = art ? Math.round(size * 0.055) : 0;
        var plateSize = size - platePad * 2;
        var plateColor = art ? '#ffffff' : TB.$('#bg', root).value;

        cv.width = size;
        cv.height = size;
        var c = cv.getContext('2d');

        drawBackground(c, size, style);

        if (art) {
          c.save();
          c.shadowColor = 'rgba(15, 35, 70, 0.18)';
          c.shadowBlur = size * 0.025;
          c.shadowOffsetY = size * 0.01;
          c.fillStyle = 'rgba(255,255,255,0.97)';
          roundRect(c, platePad, platePad, plateSize, plateSize, size * 0.035);
          c.fill();
          c.restore();
        }

        var quiet = 3;
        var cell = plateSize / (count + quiet * 2);
        var off = platePad + quiet * cell;

        function inFinder(x, y) {
          return (x < 7 && y < 7) || (x >= count - 7 && y < 7) || (x < 7 && y >= count - 7);
        }

        c.fillStyle = fg;
        for (var y = 0; y < count; y++) {
          for (var x = 0; x < count; x++) {
            if (!qr.isDark(y, x) || inFinder(x, y)) continue;
            var px = off + x * cell, py = off + y * cell;
            if (round) {
              c.beginPath();
              c.arc(px + cell / 2, py + cell / 2, cell * 0.52, 0, Math.PI * 2);
              c.fill();
            } else {
              c.fillRect(px, py, cell, cell);
            }
          }
        }

        /* 三个码眼：按标准 7 / 5 / 3 比例画，外框只做轻微圆角，保证扫码器能识别 */
        function finder(cx, cy) {
          var s = cell * 7;
          var r = Math.max(2, cell * 0.8);
          c.fillStyle = eye;
          roundRect(c, cx, cy, s, s, r);
          c.fill();
          c.fillStyle = plateColor;
          var p2 = cell, s2 = cell * 5;
          roundRect(c, cx + p2, cy + p2, s2, s2, r * 0.6);
          c.fill();
          c.fillStyle = eye;
          var p3 = cell * 2, s3 = cell * 3;
          roundRect(c, cx + p3, cy + p3, s3, s3, r * 0.35);
          c.fill();
        }
        finder(off, off);
        finder(off + (count - 7) * cell, off);
        finder(off, off + (count - 7) * cell);

        var cx = size / 2, cy = size / 2;

        /* 中心 Logo 优先；没有 Logo 才画中心文字 */
        if (logoImg) {
          var logoBox = Math.min(cell * 11, plateSize * 0.44);
          c.fillStyle = plateColor;
          roundRect(c, cx - logoBox / 2, cy - logoBox / 2, logoBox, logoBox, Math.max(6, cell * 1.5));
          c.fill();
          c.strokeStyle = eye;
          c.lineWidth = Math.max(1, cell * 0.5);
          roundRect(c, cx - logoBox / 2, cy - logoBox / 2, logoBox, logoBox, Math.max(6, cell * 1.5));
          c.stroke();
          var pad = logoBox * 0.1;
          var ratio = Math.min((logoBox - pad * 2) / logoImg.width, (logoBox - pad * 2) / logoImg.height);
          var lw = logoImg.width * ratio, lh = logoImg.height * ratio;
          c.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
        } else {
          var center = TB.$('#center', root).value.trim();
          if (center && count >= 21) {
            var box = Math.min(cell * 9, plateSize * 0.37);
            c.fillStyle = plateColor;
            roundRect(c, cx - box / 2, cy - box / 2, box, box, cell * 1.6);
            c.fill();
            c.strokeStyle = eye;
            c.lineWidth = Math.max(1, cell * 0.5);
            roundRect(c, cx - box / 2, cy - box / 2, box, box, cell * 1.6);
            c.stroke();
            c.fillStyle = fg;
            c.font = '700 ' + Math.round(box / (center.length > 2 ? 3.2 : 2.2)) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(center, cx, cy);
          }
        }

        var detail = count + ' × ' + count + ' 模块 · 容错 ' + ec + ' · ' + size + 'px';
        if (logoImg) detail += ' · 已叠加中心 Logo';
        else if (TB.$('#center', root).value.trim()) detail += ' · 中心文字「' + TB.esc(TB.$('#center', root).value.trim()) + '」';
        status('已生成：' + detail + '。');
        return true;
      }

      async function loadImageFile(file, kind) {
        if (!file) return;
        if (!/^image\//.test(file.type)) { status('请选择图片文件。', true); return; }
        if (file.size > 12 * 1024 * 1024) { status('图片超过 12MB，请先压缩后再用。', true); return; }
        try {
          var res = await TB.readImage(file);
          if (kind === 'bg') {
            if (bgUrl) URL.revokeObjectURL(bgUrl);
            bgImg = res.img;
            bgUrl = res.url;
            TB.$('#bgName', root).textContent = file.name;
            TB.$('#bgStyle', root).value = 'image';
            syncBgFields();
          } else {
            if (logoUrl) URL.revokeObjectURL(logoUrl);
            logoImg = res.img;
            logoUrl = res.url;
            TB.$('#logoName', root).textContent = file.name;
          }
          await render();
        } catch (e) {
          status('图片读取失败：' + TB.esc(e.message || e), true);
        }
      }

      TB.$('#run', root).addEventListener('click', render);
      TB.$('#dl', root).addEventListener('click', async function () {
        if (await render()) TB.downloadCanvas(cv, '二维码-' + Date.now() + '.png', 'image/png');
      });

      TB.$('#bgStyle', root).addEventListener('change', function () { syncBgFields(); render(); });
      ['#fg', '#bg', '#bg2', '#eye', '#dot', '#ec', '#size'].forEach(function (sel) {
        TB.$(sel, root).addEventListener('change', render);
      });
      ['#text', '#center'].forEach(function (sel) {
        TB.$(sel, root).addEventListener('input', TB.debounce(render, 300));
      });

      TB.$('#bgFile', root).addEventListener('change', function (e) {
        loadImageFile(e.target.files[0], 'bg');
        e.target.value = '';
      });
      TB.$('#logoFile', root).addEventListener('change', function (e) {
        loadImageFile(e.target.files[0], 'logo');
        e.target.value = '';
      });
      TB.$('#bgClear', root).addEventListener('click', function () {
        if (bgUrl) URL.revokeObjectURL(bgUrl);
        bgImg = null; bgUrl = null;
        TB.$('#bgName', root).textContent = '未选择';
        if (TB.$('#bgStyle', root).value === 'image') TB.$('#bgStyle', root).value = 'gradient';
        syncBgFields();
        render();
      });
      TB.$('#logoClear', root).addEventListener('click', function () {
        if (logoUrl) URL.revokeObjectURL(logoUrl);
        logoImg = null; logoUrl = null;
        TB.$('#logoName', root).textContent = '未选择';
        render();
      });

      syncBgFields();
      render();
    }
  });

})();
