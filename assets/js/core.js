/* =============================================================================
 * 简单工具箱 · 核心脚本
 * -----------------------------------------------------------------------------
 * 职责：
 *   1. 全局工具函数（DOM、剪贴板、下载、文件读取、懒加载库）
 *   2. 工具注册表（每个工具只需声明 meta + render，页面自动生成）
 *   3. 视图：首页 / 分类页 / 工具页 / 关于页
 *   4. 侧栏、搜索、主题、日期条（含农历）/ 天气 / 日历弹窗
 *   5. 基于 hash 的路由（纯静态部署，不需要服务器 rewrite）
 *
 * 约定：工具实现文件通过 TB.def({...}) 注册，不要直接操作页面骨架。
 * ========================================================================== */

'use strict';

var TB = window.TB = {
  tools: [],          // 已注册工具
  map: {},            // slug -> 工具
  searchQuery: '',    // 当前搜索词（空 = 常规首页）
  mainSite: {         // 主站「简单导航网」：两站互导的统一入口
    name: '简单导航网',
    url: 'https://432600.xyz/'
  }
};

/* ---------------------------------------------------------------- 分类定义 */
TB.cats = [
  { id: 'office', name: '办公文档', icon: '📝' },
  { id: 'image',  name: '图片处理', icon: '🖼️' },
  { id: 'doc',    name: '文档创作', icon: '✍️' },
  { id: 'web',    name: '站长工具', icon: '🧰' },
  { id: 'data',   name: '数据驿站', icon: '📊' },
  { id: 'ai',     name: 'AI 工具集', icon: '🤖' },
  { id: 'fun',    name: '休闲娱乐', icon: '🎮' }
];

/* 注册工具。spec 结构：
 *   slug     URL 片段（#/tool/<slug>），全站唯一
 *   cat      分类 id
 *   name     卡片标题
 *   desc     一句话说明
 *   icon     emoji 图标
 *   kw       额外搜索关键词（空格分隔）
 *   render   (ctx) => void  ctx = { root, spec }
 */
TB.def = function (spec) {
  if (!spec || !spec.slug || !spec.render) throw new Error('工具注册信息不完整: ' + (spec && spec.slug));
  if (TB.map[spec.slug]) console.warn('工具 slug 重复：' + spec.slug);
  TB.map[spec.slug] = spec;
  TB.tools.push(spec);
};

TB.catOf = function (id) {
  for (var i = 0; i < TB.cats.length; i++) if (TB.cats[i].id === id) return TB.cats[i];
  return null;
};

TB.toolsOf = function (catId) {
  var out = [];
  for (var i = 0; i < TB.tools.length; i++) if (TB.tools[i].cat === catId) out.push(TB.tools[i]);
  return out;
};

/* ---------------------------------------------------------------- 基础工具 */
TB.$  = function (sel, root) { return (root || document).querySelector(sel); };
TB.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

/* 从 HTML 字符串创建一个元素（避免每次都写 template 的样板代码） */
TB.h = function (html) {
  var t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

/* HTML 转义：所有把用户输入拼进 HTML 的地方都必须先过这个 */
TB.esc = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

TB.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

TB.debounce = function (fn, ms) {
  var t;
  return function () {
    var args = arguments, self = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(self, args); }, ms || 200);
  };
};

TB.fmtBytes = function (n) {
  if (!n && n !== 0) return '—';
  var u = ['B', 'KB', 'MB', 'GB'], i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(1)) + ' ' + u[i];
};

/* 千分位；digits 为小数位 */
TB.num = function (n, digits) {
  if (!isFinite(n)) return '—';
  var d = digits == null ? 2 : digits;
  return n.toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
};

/* 轻提示 */
var toastTimer = null;
TB.toast = function (msg, ms) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 2000);
};

/* 复制到剪贴板（优先 Clipboard API，降级 execCommand） */
TB.copy = function (text) {
  var done = function () { TB.toast('已复制'); };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, function () { fallback(); });
  } else { fallback(); }
  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { TB.toast('复制失败，请手动选择'); }
    document.body.removeChild(ta);
  }
};

/* 触发下载 */
TB.download = function (blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
};

TB.downloadText = function (text, filename, mime) {
  TB.download(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }), filename);
};

TB.downloadCanvas = function (canvas, filename, type, quality) {
  canvas.toBlob(function (blob) {
    if (blob) TB.download(blob, filename);
    else TB.toast('导出失败，请重试');
  }, type || 'image/png', quality);
};

/* 文件读取（全部返回 Promise） */
TB.readText = function (file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = rej;
    r.readAsText(file);
  });
};
TB.readArrayBuffer = function (file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
};
TB.readDataURL = function (file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
};

/* 读成 Image 对象，用于 canvas 处理 */
TB.readImage = function (file) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { res({ img: img, url: url }); };
    img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('图片解码失败：' + file.name)); };
    img.src = url;
  });
};

/* 按需加载本地库（pdf-lib / jszip / qrcode），只加载一次 */
TB._libs = {};
TB.loadLib = function (file) {
  if (TB._libs[file]) return TB._libs[file];
  TB._libs[file] = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = 'assets/lib/' + file;
    s.onload = function () { res(); };
    s.onerror = function () { rej(new Error('依赖库加载失败：' + file)); };
    document.head.appendChild(s);
  });
  return TB._libs[file];
};

/* 打包成 zip 下载：entries = [{name, blob|string}] */
TB.zipDownload = async function (entries, zipName) {
  await TB.loadLib('jszip.min.js');
  var zip = new window.JSZip();
  entries.forEach(function (e) {
    if (e.blob) zip.file(e.name, e.blob);
    else zip.file(e.name, e.data);
  });
  var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  TB.download(blob, zipName);
};

/* canvas.toBlob 的 Promise 版本 */
TB.canvasBlob = function (canvas, type, quality) {
  return new Promise(function (res) {
    canvas.toBlob(function (b) { res(b); }, type || 'image/png', quality);
  });
};

/* ------------------------------------------------------------ 文件选择器 */
/* 统一的"拖拽 / 点击选择"控件，返回可读写的对象：
 *   api.files      [{ file }]
 *   api.onChange   文件变化后的回调（由工具自己赋值）
 *   api.clear()
 * 选项：accept 过滤、multiple 多选、sortable 可上下挪动、hint 提示文字
 */
TB.filePicker = function (host, opts) {
  opts = opts || {};
  var multiple = !!opts.multiple;
  var sortable = !!opts.sortable;
  var hint = opts.hint || '点击选择文件，或拖拽到这里';

  host.innerHTML =
    '<div class="drop" tabindex="0" role="button">' +
      '<span class="drop-ico">📂</span><b>点击选择文件</b> · ' + TB.esc(hint) +
      '<input type="file" ' + (multiple ? 'multiple' : '') + ' accept="' + TB.esc(opts.accept || '') + '">' +
    '</div>' +
    '<div class="filelist"></div>';

  var drop = TB.$('.drop', host);
  var input = TB.$('input[type=file]', host);
  var listEl = TB.$('.filelist', host);
  var api = { files: [], onChange: null };

  function render() {
    listEl.innerHTML = '';
    api.files.forEach(function (item, i) {
      var row = TB.h('<div class="fileitem">' +
        '<span class="fn">' + (api.files.length > 1 && sortable ? '<b style="color:var(--ink-3)">' + (i + 1) + '.</b> ' : '') +
        TB.esc(item.file.name) + '</span>' +
        '<span class="fs">' + TB.fmtBytes(item.file.size) + '</span>' +
        (sortable && api.files.length > 1 ? '<button class="fx" data-move="-1" title="上移">↑</button><button class="fx" data-move="1" title="下移">↓</button>' : '') +
        '<button class="fx" data-del="1" title="移除">×</button>' +
      '</div>');
      row.querySelector('[data-del]').addEventListener('click', function () {
        api.files.splice(i, 1);
        render();
        if (api.onChange) api.onChange();
      });
      var ups = row.querySelectorAll('[data-move]');
      Array.prototype.forEach.call(ups, function (btn) {
        btn.addEventListener('click', function () {
          var to = i + parseInt(btn.getAttribute('data-move'), 10);
          if (to < 0 || to >= api.files.length) return;
          var tmp = api.files[i];
          api.files[i] = api.files[to];
          api.files[to] = tmp;
          render();
          if (api.onChange) api.onChange();
        });
      });
      listEl.appendChild(row);
    });
  }

  function add(fileList) {
    var arr = Array.prototype.slice.call(fileList);
    if (!multiple) api.files = [];
    arr.forEach(function (f) { api.files.push({ file: f }); });
    render();
    if (api.onChange) api.onChange();
  }

  drop.addEventListener('click', function () { input.click(); });
  drop.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', function () {
    add(input.value ? input.files : []);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) add(e.dataTransfer.files);
  });

  api.clear = function () { api.files = []; render(); if (api.onChange) api.onChange(); };
  api.render = render;
  return api;
};

/* ---------------------------------------------------------------- 本地统计 */
/* 本站没有后端，热门榜用"本机使用次数 + 预置权重"来排，纯本地记忆 */
TB.hitsKey = 'wl_hits';
TB.getHits = function () {
  try { return JSON.parse(localStorage.getItem(TB.hitsKey) || '{}') || {}; } catch (e) { return {}; }
};
TB.track = function (slug) {
  try {
    var h = TB.getHits();
    h[slug] = (h[slug] || 0) + 1;
    localStorage.setItem(TB.hitsKey, JSON.stringify(h));
  } catch (e) {}
};

/* ---------------------------------------------------------- 布局：侧栏 / 内容 */
var appEl, sideEl;

/* 侧栏“随机推荐”：每次从全部工具里抽 5 个，不重复、不推荐当前正在看的工具 */
function sideHomeHTML() {
  return '<a class="side-item side-home" href="#/"><span class="side-ico">🏠</span><span class="side-t">首页</span>' +
    '<span class="side-kbd" title="Alt+H 回到首页"><kbd>Alt</kbd><kbd>H</kbd></span></a>';
}

function sideItemHTML(t) {
  return '<a class="side-item" href="#/tool/' + t.slug + '">' +
    '<span class="side-ico">' + t.icon + '</span><span class="side-t">' + TB.esc(t.name) + '</span></a>';
}

function pickSideTools(n) {
  var current = (location.hash.match(/^#\/tool\/([\w-]+)/) || [])[1] || '';
  var pool = TB.tools.filter(function (t) { return t.slug !== current; });
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, n);
}

function sideRecommendHTML() {
  return pickSideTools(5).map(sideItemHTML).join('');
}

function syncSideActive() {
  var h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'tool') TB.setActive('tool', h[1]);
  else if (h[0] === 'cat') TB.setActive('cat', h[1]);
  else if (!h[0]) TB.setActive('home');
}

TB.buildSide = function () {
  /* 侧栏顶部品牌：无顶栏后，Logo 固定在左侧栏顶部 */
  var html = '<div class="side-brand"><a class="logo" href="#/" title="回到简单工具箱首页">' +
    '<i class="logo-mark" aria-hidden="true"><b>简单</b><em>工具</em></i>' +
    '<span>简单工具箱</span></a></div>';

  html += '<div class="side-scroll">';
  html += '<div class="side-nav">' + sideHomeHTML() +
    '<button class="side-item side-rec-entry" id="sideShuffle" type="button" title="点击随机推荐更换一批工具">' +
      '<span class="side-ico">🎲</span><span class="side-t">随机推荐</span>' +
      '<span class="side-kbd"><kbd>Alt</kbd><kbd>R</kbd></span></button>' +
    '</div>';
  html += '<div class="side-group"><div class="side-h">推荐工具</div>' +
    '<div class="side-list" id="sideRecList">' + sideRecommendHTML() + '</div></div>';

  html += '<div class="side-group"><div class="side-h">全部工具<em>' + TB.tools.length + '</em></div><div class="side-list">';
  TB.cats.forEach(function (c) {
    var n = TB.toolsOf(c.id).length;
    html += '<a class="side-item" href="#/cat/' + c.id + '" data-nav="' + c.id + '">' +
      '<span class="side-ico">' + c.icon + '</span><span class="side-t">' + c.name + '</span>' +
      '<span class="side-n">' + n + '</span></a>';
  });
  html += '</div></div></div>';

  /* 左下角固定操作区：互导入口 + 主题切换，不随侧栏内容滚动 */
  html += '<div class="side-foot">' +
    '<a class="side-link side-main" href="' + TB.mainSite.url + '" target="_blank" rel="noopener" title="打开' + TB.mainSite.name + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></svg>' +
      '<span>简单导航</span></a>' +
    '<button class="side-link" id="randTool" type="button" title="随机来一个工具">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>' +
      '<span>随机工具</span></button>' +
    '<button class="side-link" id="themeBtn" type="button" aria-label="切换主题"></button>' +
    '</div>';

  sideEl.innerHTML = html;

  var shuffle = TB.$('#sideShuffle', sideEl);
  if (shuffle) {
    shuffle.addEventListener('click', function () {
      TB.$('#sideRecList', sideEl).innerHTML = sideRecommendHTML();
      syncSideActive();
    });
  }
};

TB.setActive = function (kind, id) {
  TB.$$('.side-item', sideEl).forEach(function (a) {
    var on = false;
    if (kind === 'cat') on = a.getAttribute('data-nav') === id;
    else if (kind === 'home') on = a.getAttribute('href') === '#/';
    else if (kind === 'tool') on = a.getAttribute('href') === '#/tool/' + id;
    a.classList.toggle('on', !!on);
  });
};

/* ---------------------------------------------------------------- 首页视图 */
TB.homeHTML = function () {
  var h = '';
  h += hotHTML();

  TB.cats.forEach(function (c) {
    var list = TB.toolsOf(c.id);
    if (!list.length) return;
    h += '<section class="cat" data-cat="' + c.id + '" id="cat-' + c.id + '">' +
      '<div class="cat-h"><h2>' + c.name + '</h2><span>' + list.length + '</span></div>' +
      '<div class="grid">' + list.map(cardHTML).join('') + '</div></section>';
  });

  h += introHTML();
  return h;
};

/* 首页底部的问答式介绍：保留搜索引擎可读的完整说明，不占用工具区 */
function introHTML() {
  var n = TB.tools.length;
  var items = [
    ['简单工具箱是个什么样的网站？',
      '简单工具箱是一款集成 ' + n + ' 个实用功能的纯静态在线工具站，专注于 PDF、图片、文档、表格与开发者常用处理。核心理念是把文档与图片放在浏览器里处理：不需要注册登录、没有会员额度、文件不上传服务器，打开页面即可使用。'],
    ['简单工具箱包含哪些实用功能？',
      '覆盖办公文档、图片处理、文档创作、站长工具、数据驿站、AI 工具集与休闲娱乐七大类。常用功能包括 PDF 合并 / 拆分 / 压缩 / 转 Word、Word 批量替换 / 公文排版、CSV 与 Excel 互转、图片压缩 / 拼接 / 加水印、二维码生成与识别、JSON / 正则 / 时间戳 / 编码转换、房贷个税与单位换算等。'],
    ['简单工具箱适合哪些用户使用？',
      '适合学生、办公人员、教师、程序员、设计师、自媒体创作者，以及日常需要处理文件的人。无论是整理资料、合并 PDF、压缩图片、转换表格，还是调试代码、格式化 JSON，都可以直接在电脑或手机浏览器里完成。'],
    ['使用简单工具箱，有哪些优势？',
      '所有工具均在线使用，电脑与手机端都能访问，无需下载安装。文件只在浏览器内存中处理，关掉页面即清空，不上传服务器；没有登录、次数限制、水印或排队。界面保持简洁，常用工具会记录在本机使用次数，并在热门区优先展示。'],
    ['选择简单工具箱的理由是什么？',
      '它把高频的文档、图片和开发小工具集中到一个页面，减少在多个网站之间跳转。纯静态部署、打开即用，既适合临时救急，也适合长期收藏；同时与简单导航网互相打通，找网站和做工具可以在一个入口完成。']
  ];
  return '<section class="intro" id="intro" aria-labelledby="introTitle">' +
    '<h2 class="intro-h" id="introTitle">简单工具箱介绍</h2>' +
    '<div class="intro-list">' + items.map(function (it) {
      return '<article class="intro-item"><h3>' + it[0] + '</h3><p>' + it[1] + '</p></article>';
    }).join('') + '</div></section>';
}

var svgCube = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>';TB.cardHTML = function (t) { return cardHTML(t); };

function cardHTML(t) {
  return '<a class="tcard" href="#/tool/' + t.slug + '" data-kw="' +
    TB.esc([t.name, t.desc, (t.kw || ''), TB.catOf(t.cat).name].join(' ')) + '">' +
    '<div class="tcard-ico">' + t.icon + '</div>' +
    '<div class="tcard-b"><div class="tcard-t"><span>' + TB.esc(t.name) + '</span></div>' +
    '<div class="tcard-d">' + TB.esc(t.desc) + '</div></div></a>';
}

function hotHTML() {
  var hits = TB.getHits();
  var fallback = ['pdf-merge', 'codec', 'img-convert', 'json', 'qrcode', 'uuid', 'timestamp', 'markdown', 'pdf-split', 'token-est'];
  var list = TB.tools.slice().sort(function (a, b) {
    var ha = hits[a.slug] || 0, hb = hits[b.slug] || 0;
    if (ha !== hb) return hb - ha;
    var ia = fallback.indexOf(a.slug), ib = fallback.indexOf(b.slug);
    ia = ia < 0 ? 99 : ia; ib = ib < 0 ? 99 : ib;
    return ia - ib;
  }).slice(0, 10);

  var cards = list.map(function (t, i) {
    var r = i === 0 ? ' r1' : '';
    return '<a class="hotcard" href="#/tool/' + t.slug + '">' +
      '<span class="hotcard-n' + r + '">' + (i + 1) + '</span>' +
      '<span class="hotcard-ico">' + t.icon + '</span>' +
      '<span class="hotcard-b"><span class="hotcard-t">' + TB.esc(t.name) + '</span>' +
      '<span class="hotcard-d">' + TB.esc(t.desc) + '</span></span></a>';
  }).join('');

  return '<section class="hot"><div class="hot-panel">' +
    '<div class="hot-h"><h2>🔥 热门工具</h2><span class="hot-sub">本机使用记录 · TOP 10</span></div>' +
    '<div class="hot-grid">' + cards + '</div></div></section>';
}

/* ------------------------------------------------------- 日期条（公历+农历） */
/* 农历用浏览器内置的 Chinese calendar（ICU）算，不需要预置万年历表。
 * 注意：这条链路只支持 month:'long' + day:'numeric'，
 * day:'long' 会直接抛 RangeError；而数字日（如 6）要自己转成「初六」。 */
var CN_DAY = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

function lunarOf(date) {
  try {
    var fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' });
    var parts = fmt.formatToParts(date);
    var m = '', d = '';
    parts.forEach(function (p) {
      if (p.type === 'month') m = p.value;
      if (p.type === 'day') d = p.value;
    });
    var n = parseInt(d, 10);
    if (m && n) return m.replace(/\s/g, '') + (CN_DAY[n] || d);
    return '';
  } catch (e) { return ''; }
}

function daysBetween(a, b) {
  var d0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  var d1 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((d1 - d0) / 86400000);
}

TB.getPayday = function () {
  var p = 15;
  try { p = parseInt(localStorage.getItem('wl_payday'), 10); } catch (e) {}
  if (!p || p < 1 || p > 28) p = 15;
  return p;
};

function topSearchHTML() {
  return '<div class="top-search dash-search">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>' +
    '<input id="topQ" type="text" placeholder="搜索 ' + TB.tools.length + ' 个工具，如 PDF 合并" autocomplete="off" aria-label="搜索工具">' +
    '<kbd>/</kbd>' +
  '</div>';
}

/* 内容区顶部只保留搜索框；重渲染后重新绑定搜索 */
TB.renderTopDash = function () {
  var dash = document.getElementById('topDash');
  if (!dash) return;
  var oldQ = document.getElementById('topQ');
  var qVal = oldQ ? oldQ.value : '';
  dash.innerHTML = topSearchHTML();
  var newQ = document.getElementById('topQ');
  if (newQ && qVal) newQ.value = qVal;
  if (TB.initTopSearch) TB.initTopSearch();
};

/* 顶部搜索绑定：日期条重绘后输入框会换新节点，所以每次用标记重新挂一次 */
TB.initTopSearch = function () {
  var topQ = document.getElementById('topQ');
  if (!topQ || topQ.getAttribute('data-tb-bound')) return;
  topQ.setAttribute('data-tb-bound', '1');
  var searchMq = window.matchMedia('(max-width: 1100px)');
  var phoneMq = window.matchMedia('(max-width: 640px)');
  var syncSearchPh = function () {
    var n = TB.tools.length;
    topQ.placeholder = phoneMq.matches
      ? '搜索 ' + n + ' 个工具 · 文档图片本地处理'
      : searchMq.matches
        ? '搜索 ' + n + ' 个工具｜文档图片全在浏览器'
        : '搜索 ' + n + ' 个工具｜把文档与图片，放在浏览器里处理 · PDF、Word、Excel 全免费';
  };
  syncSearchPh();
  if (searchMq.addEventListener) {
    searchMq.addEventListener('change', syncSearchPh);
    phoneMq.addEventListener('change', syncSearchPh);
  } else if (searchMq.addListener) {
    searchMq.addListener(syncSearchPh);
    phoneMq.addListener(syncSearchPh);
  }
  topQ.addEventListener('input', TB.debounce(function () { TB.doSearch(topQ.value); }, 200));
  topQ.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { TB.doSearch(topQ.value); }
    if (e.key === 'Escape') { topQ.value = ''; TB.doSearch(''); topQ.blur(); }
  });
};

/* --------------------------------------------------------------- 天气（可选） */
/* 位置来源按优先级取：手动城市 > 浏览器定位（缓存 12 小时）> 网络 IP 粗定位 > 北京兜底。
 * 天气与城市名反查都用免费接口，不需要 key；任何一步失败都只是隐藏/降级，不影响其它功能。 */

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}
function writeJSON(key, val) {
  try { val ? localStorage.setItem(key, JSON.stringify(val)) : localStorage.removeItem(key); } catch (e) {}
}

/* 经纬度反查城市名：BigDataCloud 免 key、允许跨域，按中文返回 */
function reverseGeocode(lat, lon) {
  var url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
    lat + '&longitude=' + lon + '&localityLanguage=zh';
  return fetch(url, { cache: 'no-store' }).then(function (r) {
    return r.json();
  }).then(function (j) {
    return (j && (j.city || j.locality || j.principalSubdivision)) || '';
  });
}

/* IP 粗定位：ipwho.is 优先，失败退到 ipapi.co；两者都支持 https + CORS。
 * 两个接口给的城市名常常是英文（Wuhan），所以统一再用经纬度反查一次中文名。 */
function ipLocate() {
  var pickName = function (lat, lon, fallback) {
    var base = { lat: lat, lon: lon, src: 'ip' };
    return reverseGeocode(lat, lon).then(function (name) {
      base.name = name || fallback || '当前位置';
      return base;
    }, function () {
      base.name = fallback || '当前位置';
      return base;
    });
  };
  return fetch('https://ipwho.is/', { cache: 'no-store' }).then(function (r) {
    return r.json();
  }).then(function (j) {
    if (!j || j.success === false || !j.latitude) throw new Error('ip');
    return pickName(j.latitude, j.longitude, j.city || j.region || '');
  }).catch(function () {
    return fetch('https://ipapi.co/json/', { cache: 'no-store' }).then(function (r) {
      return r.json();
    }).then(function (j) {
      if (!j || !j.latitude) throw new Error('ip2');
      return pickName(j.latitude, j.longitude, j.city || j.region || '');
    });
  });
}

/* 取当前位置：浏览器定位需要用户授权，被拒绝或超时就用 IP 定位；结果缓存半天，避免每次刷新都弹窗 */
TB.locate = function (force) {
  var cached = readJSON('wl_geo');
  if (!force && cached && Date.now() - (cached.ts || 0) < 12 * 3600 * 1000) {
    return Promise.resolve(cached);
  }
  return new Promise(function (resolve) {
    var finish = function (v) {
      v.ts = Date.now();
      writeJSON('wl_geo', v);
      resolve(v);
    };
    var byIp = function () { ipLocate().then(finish, function () { resolve(null); }); };
    var askGps = function () {
      if (!navigator.geolocation) return byIp();
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude, lon = pos.coords.longitude;
        reverseGeocode(lat, lon).then(function (name) {
          finish({ lat: lat, lon: lon, name: name || '当前位置', src: 'gps' });
        }, function () {
          finish({ lat: lat, lon: lon, name: '当前位置', src: 'gps' });
        });
      }, byIp, { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false });
    };
    /* file:// 或用户以前拒绝过时，权限状态已是 denied，直接走 IP，不再白等 8 秒 */
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (ps) {
        if (ps && ps.state === 'denied') byIp(); else askGps();
      }, askGps);
    } else {
      askGps();
    }
  });
};

TB.weather = function () {
  var box = document.getElementById('wxBox');
  if (!box) return;
  var manual = '';
  try { manual = localStorage.getItem('wl_city') || ''; } catch (e) {}

  /* 用经纬度取当前天气；name 用于展示，src 区分定位来源 */
  function renderWeather(lat, lon, name, src) {
    var api = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m' +
      '&daily=uv_index_max&forecast_days=1&timezone=auto';
    return fetch(api, { cache: 'no-store' }).then(function (r) {
      return r.json();
    }).then(function (j) {
      var c = j && j.current;
      if (!c) throw new Error('no data');
      var w = weatherCode(c.weather_code);
      var temp = Math.round(c.temperature_2m);
      var dress = dressTip(temp, c.weather_code);
      /* 地名去掉末尾的「市」，日期条里更紧凑 */
      var label = String(name || '').replace(/市$/, '') || '当前位置';
      var tip = src === 'ip' ? '按网络近似定位，点击可改成具体城市' : '点击切换城市';
      var dir = windDir(c.wind_direction_10m);
      var windText = c.wind_speed_10m ? (dir ? dir + ' ' : '风力 ') + beaufort(c.wind_speed_10m) + '级' : '';
      var uvMax = j.daily && j.daily.uv_index_max ? j.daily.uv_index_max[0] : null;
      var uvText = uvMax == null ? '' : uvLabel(uvMax);
      box.hidden = false;
      box.innerHTML =
        '<span class="wx-ico">' + w.ico + '</span>' +
        '<span class="wx-temp">' + temp + '°C</span>' +
        '<span class="wx-text">' + w.text + '</span>' +
        '<span class="wx-dot">·</span>' +
        '<span class="wx-city" id="wxCity" role="button" tabindex="0" title="' + tip + '">' + TB.esc(label) + '</span>' +
        (windText ? '<span class="wx-wind">' + windText + '</span>' : '') +
        (windText ? '<span class="wx-sep">|</span>' : '') +
        '<span class="wx-dress">🧥 ' + dress + '</span>' +
        (uvText ? '<span class="wx-uv">☀️ 紫外线 ' + uvText + '</span>' : '');
      var cityEl = document.getElementById('wxCity');
      if (cityEl) {
        cityEl.addEventListener('click', function () {
          var v = prompt('输入城市名（如 武汉）；留空则按我的位置自动定位', label);
          if (v === null) return;
          v = v.trim();
          try { v ? localStorage.setItem('wl_city', v) : localStorage.removeItem('wl_city'); } catch (e) {}
          /* 手动清空时连定位缓存一起丢掉，下次重新定位而不是沿用旧坐标 */
          if (!v) writeJSON('wl_geo', null);
          TB.weather();
        });
      }
    });
  }

  /* 手动城市：走 open-meteo 的地理编码 */
  function byCity(city) {
    var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=zh&format=json&name=' + encodeURIComponent(city);
    return fetch(geoUrl, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('geo');
      return r.json();
    }).then(function (j) {
      var res = (j.results || [])[0];
      if (!res) throw new Error('no city');
      return renderWeather(res.latitude, res.longitude, city, 'city');
    });
  }

  if (manual) {
    byCity(manual).catch(function () { box.hidden = true; });
    return;
  }

  /* 没有手动城市：先给个占位，随后自动定位 */
  box.hidden = false;
  box.innerHTML = '<span style="color:var(--ink-3)">📍 正在定位…</span>';
  TB.locate().then(function (pos) {
    if (!pos) {
      /* 定位与网络都拿不到时退回北京，保证首页不是空的 */
      return byCity('北京').catch(function () { box.hidden = true; });
    }
    return renderWeather(pos.lat, pos.lon, pos.name || '当前位置', pos.src).catch(function () { box.hidden = true; });
  });
};

/* 风向角度转中文方位，例如 0° → 北风、90° → 东风 */
function windDir(deg) {
  if (deg == null || isNaN(deg)) return '';
  var dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  var d = ((Number(deg) % 360) + 360) % 360;
  return dirs[Math.round(d / 45) % 8] + '风';
}

/* 风速 m/s 转蒲福风级，和源站的「北风 6 级」保持同一口径 */
function beaufort(ms) {
  var limits = [0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  var v = Number(ms) || 0;
  for (var i = 0; i < limits.length; i++) if (v < limits[i]) return i;
  return 12;
}

/* 紫外线指数分级，文案对齐源站 */
function uvLabel(v) {
  var n = Number(v);
  if (isNaN(n)) return '';
  if (n < 3) return '最弱';
  if (n < 6) return '弱';
  if (n < 8) return '中等';
  if (n < 11) return '强';
  return '很强';
}

/* 穿衣建议：比原来的短句更完整，右侧天气区不会显得稀疏 */
function dressTip(temp, code) {
  var c = Number(code);
  if ([71, 73, 75, 77, 85, 86].indexOf(c) >= 0) return '有雪，路面湿滑，注意保暖和防滑。';
  if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].indexOf(c) >= 0) return '有雨，出门记得带伞，体感偏凉。';
  if (c === 45 || c === 48) return '有雾，能见度偏低，出门注意安全。';
  if (temp >= 28) return '短袖出门，午后偏热，注意防晒补水。';
  if (temp >= 22) return '薄长袖或短袖都合适，早晚备件外套。';
  if (temp >= 16) return '天有点阴，体感偏凉，记得加件外套。';
  if (temp >= 10) return '早晚偏凉，穿件外套，注意别着凉。';
  if (temp >= 4) return '天冷了，多穿一点，注意保暖。';
  return '天气很冷，羽绒服和围巾都备上。';
}

function weatherCode(code) {
  var map = {
    0: ['☀️', '晴'], 1: ['🌤️', '晴间多云'], 2: ['⛅', '多云'], 3: ['☁️', '阴'],
    45: ['🌫️', '雾'], 48: ['🌫️', '雾凇'],
    51: ['🌦️', '小毛毛雨'], 53: ['🌦️', '毛毛雨'], 55: ['🌧️', '大毛毛雨'],
    61: ['🌧️', '小雨'], 63: ['🌧️', '中雨'], 65: ['🌧️', '大雨'],
    66: ['🌧️', '冻雨'], 67: ['🌧️', '强冻雨'],
    71: ['🌨️', '小雪'], 73: ['🌨️', '中雪'], 75: ['❄️', '大雪'], 77: ['❄️', '米雪'],
    80: ['🌦️', '阵雨'], 81: ['🌧️', '强阵雨'], 82: ['⛈️', '暴雨'],
    85: ['🌨️', '阵雪'], 86: ['❄️', '强阵雪'],
    95: ['⛈️', '雷阵雨'], 96: ['⛈️', '雷阵雨伴冰雹'], 99: ['⛈️', '强雷暴伴冰雹']
  };
  var v = map[code] || ['🌡️', '天气'];
  return { ico: v[0], text: v[1] };
}

/* ------------------------------------------------------------ 日历弹窗（农历） */
TB.openCalendar = function () {
  var now = new Date();
  var payday = TB.getPayday();
  var y = now.getFullYear(), m = now.getMonth() + 1;
  var dim = new Date(y, m, 0).getDate();
  var firstWk = new Date(y, m - 1, 1).getDay();

  var cells = '';
  for (var i = 0; i < firstWk; i++) cells += '<span class="cal-cell is-empty"></span>';
  for (var d = 1; d <= dim; d++) {
    var date = new Date(y, m - 1, d);
    var lunar = lunarOf(date);
    var short = lunar.replace(/^.*月/, '');   /* 格子太窄，只留「初六」这类日名 */
    var cls = 'cal-cell';
    if (d === now.getDate()) cls += ' is-today';
    if (d === payday) cls += ' is-pay';
    cells += '<span class="' + cls + '" title="' + lunar + '"><b>' + d + '</b>' + (short ? '<i>' + short + '</i>' : '') + '</span>';
  }

  var mask = TB.h('<div class="modal-mask"><div class="modal" role="dialog" aria-modal="true">' +
    '<div class="modal-h"><h3>' + y + ' 年 ' + m + ' 月</h3><button type="button" aria-label="关闭">×</button></div>' +
    '<div class="cal-week"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    '<div class="cal-foot"><span class="legend"><i></i>今天 <i class="pay"></i>发薪日</span>' +
    '<label class="payday">发薪日 <input class="input" type="number" min="1" max="28" value="' + payday + '"> 日</label></div>' +
  '</div></div>');

  document.body.appendChild(mask);
  var close = function () { mask.remove(); document.removeEventListener('keydown', onKey); };
  var onKey = function (e) { if (e.key === 'Escape') close(); };
  mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  TB.$('.modal-h button', mask).addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  TB.$$('input', mask).forEach(function (inp) {
    inp.addEventListener('change', function () {
      var p = Math.max(1, Math.min(28, parseInt(inp.value, 10) || 15));
      try { localStorage.setItem('wl_payday', String(p)); } catch (e) {}
      close();
      TB.renderTopDash();   // 重绘顶部日期条上的「距发薪日」
    });
  });
};

/* ---------------------------------------------------------------- 首页渲染 */
TB.renderHome = function (query) {
  appEl.innerHTML = '<div id="homeWrap">' + TB.homeHTML() + '</div>';
  if (query) TB.applyFilter(query);
  TB.setActive('home');
};

/* 纯前端过滤：匹配名称 / 描述 / 关键词，命中数少于 1 时提示空 */
TB.applyFilter = function (q) {
  q = (q || '').trim().toLowerCase();
  var wrap = document.getElementById('homeWrap');
  if (!wrap) return;
  if (!q) {
    var old = document.getElementById('searchSec');
    if (old) old.remove();
    TB.$$('.cat, .hot, .today, .intro', wrap).forEach(function (e) { e.style.display = ''; });
    return;
  }
  var hits = TB.tools.filter(function (t) {
    var hay = (t.name + ' ' + t.desc + ' ' + (t.kw || '') + ' ' + TB.catOf(t.cat).name).toLowerCase();
    return hay.indexOf(q) >= 0;
  });

  var old = document.getElementById('searchSec');
  if (old) old.remove();
  TB.$$('.cat, .hot, .today, .intro', wrap).forEach(function (e) { e.style.display = 'none'; });

  var sec = TB.h('<section class="cat" id="searchSec">' +
    '<div class="cat-h"><h2>搜索结果</h2><span>' + hits.length + '</span></div>' +
    '<div class="grid">' + (hits.length ? hits.map(cardHTML).join('') : '<div class="empty">没有找到「' + TB.esc(q) + '」相关的工具，换个词试试？</div>') + '</div>' +
  '</section>');

  var hero = TB.$('#homeWrap .hero');
  if (hero && hero.parentNode) hero.parentNode.insertBefore(sec, hero.nextSibling);
  else wrap.insertBefore(sec, wrap.firstChild);
};

TB.doSearch = function (q, keepView) {
  TB.searchQuery = q || '';
  var topQ = document.getElementById('topQ');
  if (topQ && topQ.value !== q) topQ.value = q || '';
  if (TB.isHome) {
    TB.applyFilter(TB.searchQuery);
  } else {
    location.hash = '#/';
  }
};

/* ---------------------------------------------------------------- 分类视图 */
TB.renderCat = function (catId) {
  var c = TB.catOf(catId);
  if (!c) { location.hash = '#/'; return; }
  var list = TB.toolsOf(catId);
  appEl.innerHTML = '<section class="hero" style="text-align:left;padding-bottom:8px">' +
      '<h1 style="font-size:clamp(20px,2.4vw,28px)">' + c.icon + ' ' + c.name + '</h1>' +
      '<p class="hero-sub">共 ' + list.length + ' 个工具 · 全部在浏览器本地运行</p>' +
    '</section>' +
    '<section class="cat"><div class="grid">' + list.map(cardHTML).join('') + '</div></section>';
  TB.setActive('cat', catId);
};

/* ---------------------------------------------------------------- 工具视图 */
function recChipsHTML(t, mode) {
  var list = mode === 'all' ? TB.tools : TB.toolsOf(t.cat);
  return list.map(function (x) {
    var on = x.slug === t.slug;
    return '<a class="rec-chip' + (on ? ' on' : '') + '" href="#/tool/' + x.slug + '"' +
      (on ? ' aria-current="page"' : '') + '>' + TB.esc(x.name) + '</a>';
  }).join('');
}

function bindToolRec(t) {
  var rec = document.getElementById('toolRec');
  if (!rec) return;
  TB.$$('.rec-tab', rec).forEach(function (tab) {
    tab.addEventListener('click', function () {
      var mode = tab.getAttribute('data-rec');
      TB.$$('.rec-tab', rec).forEach(function (x) {
        var on = x === tab;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      var chips = TB.$('#recChips', rec);
      chips.innerHTML = recChipsHTML(t, mode);
    });
  });
}

TB.renderTool = function (slug) {
  var t = TB.map[slug];
  if (!t) {
    appEl.innerHTML = '<div class="empty">工具不存在或已下线。<br><br><a class="btn" href="#/">返回首页</a></div>';
    return;
  }
  var c = TB.catOf(t.cat);
  appEl.innerHTML =
    '<nav class="crumb"><a href="#/">首页</a><i>/</i><a href="#/cat/' + c.id + '">' + c.name + '</a><i>/</i><span>' + TB.esc(t.name) + '</span></nav>' +
    '<div class="tool-head">' +
      '<div class="tool-head-ico">' + t.icon + '</div>' +
      '<div class="tool-head-b"><h1>' + TB.esc(t.name) + '</h1><p>' + TB.esc(t.desc) + '</p></div>' +
    '</div>' +
    '<div id="toolBody"></div>' +
    '<section class="tool-rec" id="toolRec">' +
      '<div class="rec-tabs" role="tablist">' +
        '<button class="rec-tab on" type="button" data-rec="cat" role="tab" aria-selected="true">本类工具</button>' +
        '<button class="rec-tab" type="button" data-rec="all" role="tab" aria-selected="false">全部工具</button>' +
      '</div>' +
      '<div class="rec-chips" id="recChips">' + recChipsHTML(t, 'cat') + '</div>' +
    '</section>';

  var body = document.getElementById('toolBody');
  try {
    t.render({ root: body, spec: t });
  } catch (e) {
    console.error(e);
    body.innerHTML = '<div class="panel"><div class="result-err">工具初始化失败：' + TB.esc(e.message) + '</div></div>';
  }
  bindToolRec(t);
  document.title = t.name + ' - 简单工具箱';
  TB.setActive('tool', slug);
  TB.track(slug);
};

/* ---------------------------------------------------------------- 快捷键说明 */
TB.openShortcuts = function () {
  if (document.getElementById('shortcutModal')) return;
  var row = function (label, keys) {
    return '<div class="kbd-row"><span>' + label + '</span><span class="kbd-keys">' + keys + '</span></div>';
  };
  var k = function (s) { return '<kbd>' + s + '</kbd>'; };
  var mask = TB.h('<div class="modal-mask" id="shortcutModal">' +
    '<div class="modal modal-wide" role="dialog" aria-modal="true" aria-label="快捷键">' +
      '<div class="modal-h"><h3>快捷键</h3><button type="button" aria-label="关闭">×</button></div>' +
      '<div class="kbd-list">' +
        row('聚焦搜索', k('/') + ' 或 ' + k('Alt') + ' + ' + k('Q')) +
        row('回到首页', k('Alt') + ' + ' + k('H')) +
        row('随机打开一个工具', k('Alt') + ' + ' + k('R')) +
        row('切换深浅色', k('Alt') + ' + ' + k('T')) +
        row('全部工具 / 指定分类', k('Alt') + ' + ' + k('0') + ' ~ ' + k('7')) +
        row('执行当前工具主按钮', k('Ctrl') + ' / ' + k('⌘') + ' + ' + k('Enter')) +
        row('关闭弹窗 / 收起侧栏', k('Esc')) +
        row('打开本说明', k('?')) +
      '</div>' +
      '<p class="kbd-note">分类数字对应左侧顺序：1 办公文档、2 图片处理、3 文档创作、4 站长工具、5 数据驿站、6 AI 工具集、7 休闲娱乐。</p>' +
    '</div>' +
  '</div>');
  document.body.appendChild(mask);
  var onKey = function (e) { if (e.key === 'Escape') close(); };
  var close = function () {
    mask.remove();
    document.removeEventListener('keydown', onKey);
  };
  mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  TB.$('.modal-h button', mask).addEventListener('click', close);
  document.addEventListener('keydown', onKey);
};

/* ---------------------------------------------------------------- 关于页 */
TB.renderAbout = function () {
  appEl.innerHTML = '<nav class="crumb"><a href="#/">首页</a><i>/</i><span>关于与隐私</span></nav>' +
    '<div class="tool-head"><div class="tool-head-ico">ℹ️</div><div class="tool-head-b">' +
    '<h1>关于简单工具箱</h1><p>简单导航网出品的在线工具站，不需要登录、也不需要服务器</p></div></div>' +
    '<div class="panel"><div class="note" style="margin-top:0">' +
    '<b>文件去哪了？</b><br>所有 PDF、图片、Word 处理都在你的浏览器里完成，文件不会被上传到任何服务器。' +
    '关掉页面，数据就没了——这是特性，不是缺陷。<br><br>' +
    '<b>为什么不需要登录？</b><br>本站没有账号体系，也就没有次数限制、没有水印、没有排队。' +
    '把静态文件丢到 GitHub Pages 或 Cloudflare Pages 就能跑，不用数据库。<br><br>' +
    '<b>和简单导航网是什么关系？</b><br>简单工具箱是简单导航网的工具频道：导航站帮你找网站，工具箱帮你处理文件。两个站点互相导流，但都不需要账号。<br><br>' +
    '<b>技术栈</b><br>原生 HTML / CSS / JavaScript，零框架。PDF 用 pdf-lib，Zip 用 JSZip，二维码用 qrcode-generator，全部本地引入。' +
    '</div><div style="margin-top:14px;text-align:center"><a class="btn primary" href="' + TB.mainSite.url + '" target="_blank" rel="noopener">打开' + TB.mainSite.name + '</a></div></div>';
};

/* ---------------------------------------------------------------- 路由 */
TB.isHome = false;

TB.render = function () {
  var hash = location.hash.replace(/^#\/?/, '');
  var parts = hash.split('/');
  document.title = '简单工具箱 - 在线工具箱';

  if (parts[0] === 'tool' && parts[1]) {
    TB.isHome = false;
    TB.renderTool(decodeURIComponent(parts[1]));
  } else if (parts[0] === 'cat' && parts[1]) {
    TB.isHome = false;
    TB.renderCat(parts[1]);
  } else if (parts[0] === 'about') {
    TB.isHome = false;
    TB.renderAbout();
  } else {
    TB.isHome = true;
    TB.renderHome(TB.searchQuery);
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'auto' : 'auto' });
};

/* ---------------------------------------------------------------- 启动 */
TB.boot = function () {
  appEl = document.getElementById('app');
  sideEl = document.getElementById('side');

  TB.buildSide();
  TB.renderTopDash();

  /* 主题切换按钮图标 */
  var themeBtn = document.getElementById('themeBtn');
  var paint = function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.innerHTML = (dark
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M20.5 14.3A8.4 8.4 0 1 1 9.7 3.5a6.5 6.5 0 0 0 10.8 10.8z"/></svg>') +
      '<span>切换主题</span>';
    themeBtn.title = dark ? '切换到浅色' : '切换到深色';
  };
  var toggleTheme = function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('wl_theme', next); } catch (e) {}
    paint();
  };
  paint();
  themeBtn.addEventListener('click', toggleTheme);

  /* 内容区顶部搜索（顶部工具条渲染后绑定） */
  TB.initTopSearch();

  /* 随机工具：按钮和 Alt+R 共用 */
  var randomTool = function () {
    var t = TB.tools[Math.floor(Math.random() * TB.tools.length)];
    if (t) location.hash = '#/tool/' + t.slug;
  };
  document.getElementById('randTool').addEventListener('click', randomTool);

  /* 页脚「快捷键」入口 */
  var keyHelpBtn = document.getElementById('keyHelpBtn');
  if (keyHelpBtn) keyHelpBtn.addEventListener('click', TB.openShortcuts);

  /* 快捷键：/ 或 Alt+Q 聚焦搜索，Alt+H 首页，Alt+R 随机，Alt+T 主题，
     Alt+0~7 分类，Ctrl/⌘+Enter 执行工具，? 打开说明 */
  var focusSearch = function () {
    var q = document.getElementById('topQ');
    if (!q) return;
    q.focus();
    q.select();
  };
  var goHomeCat = function (id) {
    var apply = function () {
      if (id === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      var sec = document.getElementById('cat-' + id);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (!location.hash || location.hash === '#/') apply();
    else { location.hash = '#/'; setTimeout(apply, 80); }
  };
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    var key = e.key || '';

    /* ? 帮助：输入框内不拦截 */
    if (key === '?' && !typing && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      TB.openShortcuts();
      return;
    }

    /* / 聚焦搜索 */
    if (key === '/' && !typing && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      focusSearch();
      return;
    }

    /* Ctrl / ⌘ + Enter 执行当前工具主按钮 */
    if ((e.ctrlKey || e.metaKey) && key === 'Enter') {
      var btn = TB.$('#toolBody .btn.primary');
      if (btn) {
        e.preventDefault();
        if (btn.disabled) TB.toast('请先完成上传或填写');
        else btn.click();
      }
      return;
    }

    if (!e.altKey) return;
    var low = key.toLowerCase();

    if (low === 'q') { e.preventDefault(); focusSearch(); return; }
    if (low === 'h') {
      e.preventDefault();
      if (!location.hash || location.hash === '#/') window.scrollTo({ top: 0, behavior: 'smooth' });
      else location.hash = '#/';
      return;
    }
    if (low === 'r') { e.preventDefault(); randomTool(); return; }
    if (low === 't') { e.preventDefault(); toggleTheme(); return; }
    if (/^[0-7]$/.test(key)) {
      e.preventDefault();
      goHomeCat(key === '0' ? 'all' : (TB.cats[parseInt(key, 10) - 1] || {}).id || 'all');
    }
  });

  /* 移动端菜单：底部 tabbar 的「分类」打开抽屉 */
  var scrim = document.getElementById('scrim');
  function toggleSide(force) {
    var open = typeof force === 'boolean' ? force : !sideEl.classList.contains('open');
    sideEl.classList.toggle('open', open);
    if (scrim) scrim.classList.toggle('on', open);
  }
  function closeSide() { toggleSide(false); }
  var tabCat = document.getElementById('tabCat');
  if (tabCat) tabCat.addEventListener('click', function () { toggleSide(); });

  /* 底部 tabbar 的选中态跟着路由走 */
  var tabHome = document.getElementById('tabHome');
  var tabAbout = document.getElementById('tabAbout');
  function syncTab() {
    var h = location.hash || '#/';
    if (tabHome) tabHome.classList.toggle('on', h === '#/' || h === '');
    if (tabAbout) tabAbout.classList.toggle('on', h.indexOf('#/about') === 0);
  }
  window.addEventListener('hashchange', syncTab);
  syncTab();
  sideEl.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeSide();
  });
  if (scrim) scrim.addEventListener('click', closeSide);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSide();
  });

  /* 路由 */
  window.addEventListener('hashchange', function () {
    TB.searchQuery = '';
    var topQ = document.getElementById('topQ');
    if (topQ) topQ.value = '';
    TB.render();
  });

  TB.render();
};

