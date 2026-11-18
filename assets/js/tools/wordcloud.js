/* =============================================================================
 * 文字云生成器
 * -----------------------------------------------------------------------------
 * 把一段文本分词、统计词频，用 Canvas 做无重叠的螺旋布局，导出 PNG。
 * 全程本地处理，不上传文本。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = '简单工具箱 在线工具 免费 本地处理 隐私 安全 PDF 图片 表格 文档 开发 效率 简洁 快速 无广告 浏览器';
  var STOP = ('的 了 和 是 在 我 有 就 不 人 都 一 一个 上 也 很 到 说 要 去 你 会 着 没有 看 好 自己 这 那 与 及 或 而 但 如果 因为 所以 the a an and or of to in for on with is are be this that it as at by from').split(/\s+/);
  var PALETTES = [
    ['#146c94', '#19a7ce', '#00b4d8', '#48cae4', '#90e0ef', '#0077b6'],
    ['#d62828', '#f77f00', '#fcbf49', '#eae2b7', '#003049', '#669bbc'],
    ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332'],
    ['#6a4c93', '#8e7dbe', '#b8a1d9', '#f2b5d4', '#ff8fab', '#fb6f92'],
    ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4', '#6c584c']
  ];

  function tokenize(text) {
    var counts = Object.create(null), display = Object.create(null);
    var lowerStop = STOP.map(function (s) { return s.toLowerCase(); });
    function add(word) {
      word = String(word || '').trim();
      if (!word) return;
      var low = word.toLowerCase();
      if (lowerStop.indexOf(low) >= 0) return;
      if (!/^[\p{L}\p{N}]+$/u.test(word)) return;
      if (word.length < 2) return;
      counts[low] = (counts[low] || 0) + 1;
      if (!display[low]) display[low] = word;
    }
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var seg = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      Array.from(seg.segment(text)).forEach(function (s) { if (s.isWordLike) add(s.segment); });
    } else {
      String(text).split(/[^\p{L}\p{N}]+/u).forEach(add);
    }
    return Object.keys(counts).map(function (k) { return { word: display[k], count: counts[k] }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word, 'zh'); });
  }

  TB.def({
    slug: 'wordcloud',
    cat: 'image',
    name: '文字云生成器',
    desc: '粘贴文本或词频，自动排版成文字云并导出 PNG。',
    icon: '☁️',
    kw: '文字云 词云 wordcloud 关键词 词频 海报 可视化',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">文本 <span class="hint">自动分词并统计词频</span></div>' +
          '<div class="field"><textarea class="input codeIn" id="wcText" rows="6" spellcheck="false"></textarea></div>' +
          '<div id="wcDrop" style="margin-bottom:12px"></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">最多显示</div><select class="select" id="wcMax">' +
              '<option value="40">40 个词</option><option value="60" selected>60 个词</option><option value="80">80 个词</option><option value="120">120 个词</option></select></div>' +
            '<div class="field"><div class="label">配色</div><select class="select" id="wcPalette">' +
              '<option value="0">海蓝</option><option value="1">日落</option><option value="2">森林</option><option value="3">莓果</option><option value="4">燕麦</option></select></div>' +
            '<div class="field"><div class="label">背景</div><input class="input" id="wcBg" type="color" value="#ffffff" style="height:36px;padding:3px"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="wcRun" type="button">生成文字云</button>' +
            '<button class="btn" id="wcShuffle" type="button">重新排版</button>' +
            '<button class="btn" id="wcDownload" type="button" disabled>下载 PNG</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint" id="wcInfo">等待生成</span></div>' +
          '<div class="preview" id="wcPreview" style="min-height:220px;background:var(--surface-2)"><div style="color:var(--ink-3);font-size:12.5px">生成后显示文字云</div></div></div>' +
        '<p class="note">中文使用浏览器内置分词，英文按单词统计；数字、单字和常见虚词会被过滤。文字云只在本机排版，不会上传文本。</p>';

      var text = TB.$('#wcText', root);
      var preview = TB.$('#wcPreview', root);
      var info = TB.$('#wcInfo', root);
      var dl = TB.$('#wcDownload', root);
      var result = null;
      var nonce = 0;
      text.value = SAMPLE;

      var picker = TB.filePicker(TB.$('#wcDrop', root), { accept: '.txt,text/plain', hint: '导入 TXT 文本' });
      picker.onChange = function () {
        var f = picker.files[0];
        if (!f) return;
        TB.readText(f.file).then(function (v) { text.value = v; }).catch(function () { TB.toast('读取文本失败'); });
      };

      function layout() {
        var words = tokenize(text.value);
        var maxWords = parseInt(TB.$('#wcMax', root).value, 10);
        words = words.slice(0, maxWords);
        if (!words.length) {
          preview.innerHTML = '<div style="color:var(--ink-3);font-size:12.5px">没有可排版的词，请换一段文本。</div>';
          dl.disabled = true;
          info.textContent = '没有有效词汇';
          return;
        }
        var canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 700;
        var g = canvas.getContext('2d');
        g.fillStyle = TB.$('#wcBg', root).value;
        g.fillRect(0, 0, canvas.width, canvas.height);
        var palette = PALETTES[parseInt(TB.$('#wcPalette', root).value, 10)] || PALETTES[0];
        var max = words[0].count;
        var boxes = [];
        var cx = canvas.width / 2, cy = canvas.height / 2;
        var radiusStep = 9.5;

        words.forEach(function (item, index) {
          var ratio = max ? item.count / max : 0;
          var size = Math.round(15 + Math.pow(ratio, 0.62) * 52);
          g.font = '700 ' + size + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
          var w = g.measureText(item.word).width;
          var h = size * 1.08;
          var pad = 7;
          var placed = false;
          var angle = (index + nonce) * 2.399963;
          for (var step = 0; step < 1600; step++) {
            var r = radiusStep * Math.sqrt(step);
            var x = cx + Math.cos(angle + step * 0.012) * r * 1.55;
            var y = cy + Math.sin(angle + step * 0.012) * r * 0.92;
            var box = { x: x - w / 2 - pad, y: y - h / 2 - pad, w: w + pad * 2, h: h + pad * 2 };
            if (box.x < 18 || box.y < 18 || box.x + box.w > canvas.width - 18 || box.y + box.h > canvas.height - 18) continue;
            var clash = false;
            for (var j = 0; j < boxes.length; j++) {
              if (box.x < boxes[j].x + boxes[j].w && box.x + box.w > boxes[j].x && box.y < boxes[j].y + boxes[j].h && box.y + box.h > boxes[j].y) { clash = true; break; }
            }
            if (clash) continue;
            boxes.push(box);
            g.fillStyle = palette[index % palette.length];
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(item.word, x, y);
            placed = true;
            break;
          }
          if (!placed) { /* 放不下的低频词直接跳过，保持画面干净 */ }
        });

        result = canvas;
        preview.innerHTML = '';
        var pc = document.createElement('canvas');
        var scale = Math.min(1, 900 / canvas.width);
        pc.width = Math.round(canvas.width * scale);
        pc.height = Math.round(canvas.height * scale);
        pc.getContext('2d').drawImage(canvas, 0, 0, pc.width, pc.height);
        pc.style.width = '100%';
        pc.style.maxWidth = '900px';
        pc.style.height = 'auto';
        pc.style.display = 'block';
        preview.appendChild(pc);
        dl.disabled = false;
        info.textContent = words.length + ' 个词 · 已排入 ' + boxes.length + ' 个';
      }

      TB.$('#wcRun', root).addEventListener('click', layout);
      TB.$('#wcShuffle', root).addEventListener('click', function () {
        // 改变螺旋起点，让同一份词频得到不同构图
        nonce += Math.random() * 7 + 1;
        layout();
      });
      dl.addEventListener('click', function () {
        if (result) TB.downloadCanvas(result, '文字云.png', 'image/png');
      });
      ['wcMax', 'wcPalette', 'wcBg'].forEach(function (id) {
        TB.$('#' + id, root).addEventListener('change', layout);
      });
      layout();
    }
  });
})();
