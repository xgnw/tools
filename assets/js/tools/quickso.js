/* =============================================================================
   超级书签 / 虚拟键盘 / 网页可视化编辑
   -----------------------------------------------------------------------------
   参考 quickso.cn/supermark.html 的「超级书签」清单，全部纯前端、无登录、无 iframe：
     web    : bookmarklets  超级书签（6 个安全书签，拖到书签栏即可用）
     office : onscreen-keyboard 虚拟键盘（触屏 / 展厅 / 收银场景）
     web    : html-live-edit 网页可视化编辑（离线改字后导出 HTML）
   未接入：VIP 视频解析（绕过付费墙）、商品历史价格（需第三方接口）、
           网页分屏（依赖 iframe）、谷歌选词翻译（依赖外部服务）。
   ============================================================================= */
(function () {
  'use strict';

  function alive(root) { return !!(root && root.isConnected); }

  /* ========================================================= 1. 超级书签 */
  TB.def({
    slug: 'bookmarklets', cat: 'web', name: '超级书签', icon: '🔖',
    desc: '拖到书签栏，给任意网页加功能',
    kw: '书签 bookmarklet 脚本 复制限制 夜间模式 自由编辑 字体 测量 换背景',
    render: function (ctx) {
      var root = ctx.root;
      var items = [
        {
          icon: '🔓', name: '解除复制限制',
          desc: '解锁复制、右键、选中限制，适用于大部分网站。',
          code: "javascript:(function(){var s=document.createElement('style');s.textContent='*{user-select:text!important;-webkit-user-select:text!important;}';document.head.appendChild(s);['contextmenu','selectstart','copy','cut','dragstart'].forEach(function(t){document.addEventListener(t,function(e){e.stopPropagation();},true);});document.oncontextmenu=null;document.onselectstart=null;document.oncopy=null;alert('已解除本页的复制 / 右键限制');})();"
        },
        {
          icon: '✏️', name: '网页自由编辑',
          desc: '整页进入可编辑状态，改完可直接截图或另存。',
          code: "javascript:(function(){var b=document.body;if(b.isContentEditable){b.contentEditable='false';b.style.outline='';}else{b.contentEditable='true';b.style.outline='2px dashed #ff8a00';}})();"
        },
        {
          icon: '🌙', name: '夜间模式',
          desc: '给当前页盖一层半透明黑幕，降低亮度护眼。',
          code: "javascript:(function(){var id='__qs_dim',o=document.getElementById(id);if(o){o.remove();return;}o=document.createElement('div');o.id=id;o.style.cssText='position:fixed;inset:0;background:#000;opacity:.7;pointer-events:none;z-index:2147483647;';document.documentElement.appendChild(o);})();"
        },
        {
          icon: '🔤', name: '字体查询',
          desc: '选中一段文字后点击，查看字体、字号、字重与颜色。',
          code: "javascript:(function(){var sel=window.getSelection(),el=sel&&sel.rangeCount?sel.getRangeAt(0).startContainer:null;if(el&&el.nodeType===3)el=el.parentElement;if(!el||!el.getBoundingClientRect){alert('请先选中一段文字');return;}var c=getComputedStyle(el);alert('字体：'+c.fontFamily+'\\n字号：'+c.fontSize+'\\n字重：'+c.fontWeight+'\\n行高：'+c.lineHeight+'\\n颜色：'+c.color);})();"
        },
        {
          icon: '📏', name: '元素测量',
          desc: '按住 Alt 移动鼠标，实时显示元素宽高与边框。',
          code: "javascript:(function(){if(window.__qs_measure){window.__qs_measure();return;}var box=document.createElement('div'),lab=document.createElement('div');box.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:1px solid #ff3b30;background:rgba(255,59,48,.08);display:none';lab.style.cssText='position:fixed;pointer-events:none;z-index:2147483648;background:#111;color:#fff;font:12px/1.4 monospace;padding:3px 6px;border-radius:4px;display:none';document.body.appendChild(box);document.body.appendChild(lab);function mv(e){if(!e.altKey){box.style.display=lab.style.display='none';return;}var r=e.target.getBoundingClientRect();box.style.display=lab.style.display='block';box.style.left=r.left+'px';box.style.top=r.top+'px';box.style.width=r.width+'px';box.style.height=r.height+'px';lab.textContent=Math.round(r.width)+' × '+Math.round(r.height);lab.style.left=r.left+'px';lab.style.top=Math.max(0,r.top-22)+'px';}document.addEventListener('mousemove',mv,true);window.__qs_measure=function(){document.removeEventListener('mousemove',mv,true);box.remove();lab.remove();delete window.__qs_measure;};alert('按住 Alt 移动鼠标开始测量，再点一次书签退出');})();"
        },
        {
          icon: '🎨', name: '换背景',
          desc: '在预设纹理之间循环切换当前页的背景。',
          code: "javascript:(function(){var b=document.body;if(!window.__qs_bg)window.__qs_bg=0;var g=['linear-gradient(135deg,#e0f7fa,#fff8e1)','repeating-linear-gradient(45deg,#fdfbfb,#fdfbfb 10px,#ebedee 10px,#ebedee 20px)','radial-gradient(circle at 20% 20%,#ffe0f0,#e0f0ff 60%,#fff)','linear-gradient(120deg,#f6d365,#fda085)'];window.__qs_bg=(window.__qs_bg+1)%g.length;b.style.backgroundImage=g[window.__qs_bg];b.style.backgroundAttachment='fixed';})();"
        }
      ];

      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">超级书签<span class="hint">按住按钮拖到浏览器书签栏</span></div>' +
          '<div class="bm-grid" id="bmGrid"></div>' +
          '<div class="note">书签只在点击时对「当前网页」生效，不会上传任何数据；部分站点有 CSP 限制时可能被拦截。</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">怎么用</div>' +
          '<ol class="bm-steps">' +
            '<li>先把浏览器书签栏显示出来（快捷键 Ctrl / ⌘ + Shift + B）。</li>' +
            '<li>把下面的按钮直接拖进书签栏，松手后会出现一个书签。</li>' +
            '<li>打开任意网页，点这个书签，就会执行对应功能；再点一次通常可关闭。</li>' +
            '<li>手机上不能拖拽，可点「复制代码」后新建书签，把代码粘到网址栏。</li>' +
          '</ol>' +
          '<div class="note">未接入：VIP 视频解析（绕过付费墙）、商品历史价格（需第三方接口）、网页分屏（依赖 iframe）、谷歌选词翻译（依赖外部服务）。本站已有二维码工具，可直接生成当前页链接。</div>' +
        '</div>';

      var grid = TB.$('#bmGrid', root);
      items.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'bm-card';
        card.innerHTML =
          '<div class="bm-ico">' + it.icon + '</div>' +
          '<div class="bm-main"><div class="bm-name">' + TB.esc(it.name) + '</div>' +
          '<div class="bm-desc">' + TB.esc(it.desc) + '</div></div>' +
          '<div class="bm-act">' +
            '<a class="bm-drag" draggable="true">拖到书签栏</a>' +
            '<button class="btn sm bm-copy">复制代码</button>' +
          '</div>';
        var a = card.querySelector('.bm-drag');
        a.setAttribute('href', it.code);
        a.addEventListener('click', function (e) {
          e.preventDefault();
          TB.toast('请把这个按钮拖到书签栏；手机上请用「复制代码」');
        });
        card.querySelector('.bm-copy').addEventListener('click', function (e) {
          e.stopPropagation();
          TB.copy(it.code);
          TB.toast('书签代码已复制，粘到新书签的网址栏即可');
        });
        grid.appendChild(card);
      });
    }
  });

  /* ======================================================= 2. 虚拟键盘 */
  TB.def({
    slug: 'onscreen-keyboard', cat: 'office', name: '虚拟键盘', icon: '⌨️',
    desc: '用鼠标或触屏点按输入文字',
    kw: '软键盘 屏幕键盘 触屏 输入 展厅 kiosk keyboard',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">输入区<span class="hint">点按键输入，也可以直接用物理键盘</span></div>' +
          '<textarea class="textarea vk-text" id="vkText" placeholder="在这里输入，或点下方按键…"></textarea>' +
          '<div class="vk-meta">' +
            '<span class="hint" id="vkCount">0 字符</span>' +
            '<div class="btns" style="margin:0">' +
              '<button class="btn sm" id="vkCopy">复制</button>' +
              '<button class="btn sm" id="vkClear">清空</button>' +
              '<button class="btn sm" id="vkFull">全屏</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel vk-board" id="vkBoard">' +
          '<div class="panel-h">屏幕键盘<span class="hint">Shift 切大写 · ?123 切符号</span></div>' +
          '<div class="vk-mirror" id="vkMirror"></div>' +
          '<div id="vkKeys"></div>' +
        '</div>';

      var text = TB.$('#vkText', root);
      var keys = TB.$('#vkKeys', root);
      var count = TB.$('#vkCount', root);
      var mirror = TB.$('#vkMirror', root);
      var shift = false, sym = false;

      var rows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫']
      ];
      var symbols = ['@', '.', ',', '?', '!', "'", '"', ':', ';', '/', '-', '_', '=', '+', '(', ')', '[', ']', '{', '}', '%', '&', '*', '#', '~', '|', '\\', '<', '>', '^', '$'];
      var shiftMap = { '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')' };

      function refreshCount() {
        count.textContent = Array.from(text.value).length + ' 字符';
        if (mirror) mirror.textContent = text.value || '（输入内容会显示在这里）';
      }

      function insert(ch) {
        var s = text.selectionStart, e = text.selectionEnd, v = text.value;
        text.value = v.slice(0, s) + ch + v.slice(e);
        var pos = s + ch.length;
        text.selectionStart = text.selectionEnd = pos;
        text.focus();
        refreshCount();
      }

      function backspace() {
        var s = text.selectionStart, e = text.selectionEnd, v = text.value;
        if (s !== e) {
          text.value = v.slice(0, s) + v.slice(e);
          text.selectionStart = text.selectionEnd = s;
        } else if (s > 0) {
          text.value = v.slice(0, s - 1) + v.slice(s);
          text.selectionStart = text.selectionEnd = s - 1;
        }
        text.focus();
        refreshCount();
      }

      function draw() {
        var html = '';
        rows.forEach(function (row) {
          html += '<div class="vk-row">';
          row.forEach(function (k) {
            if (k === '⇧') {
              html += '<button class="vk-key wide' + (shift ? ' on' : '') + '" data-k="shift">⇧</button>';
            } else if (k === '⌫') {
              html += '<button class="vk-key wide" data-k="back">⌫</button>';
            } else {
              var ch = k;
              if (!sym && /[a-z]/.test(k)) ch = shift ? k.toUpperCase() : k;
              if (!sym && /[0-9]/.test(k)) ch = shift ? shiftMap[k] : k;
              html += '<button class="vk-key" data-k="ch" data-v="' + TB.esc(ch) + '">' + TB.esc(ch) + '</button>';
            }
          });
          html += '</div>';
        });
        html +=
          '<div class="vk-row">' +
            '<button class="vk-key wide" data-k="sym">' + (sym ? 'ABC' : '?123') + '</button>' +
            '<button class="vk-key" data-k="ch" data-v=",">,</button>' +
            '<button class="vk-key space" data-k="ch" data-v=" ">空格</button>' +
            '<button class="vk-key" data-k="ch" data-v=".">.</button>' +
            '<button class="vk-key wide" data-k="enter">↵</button>' +
          '</div>';
        if (sym) {
          html += '<div class="vk-sym">';
          symbols.forEach(function (s) {
            html += '<button class="vk-key" data-k="ch" data-v="' + TB.esc(s) + '">' + TB.esc(s) + '</button>';
          });
          html += '</div>';
        }
        keys.innerHTML = html;
      }

      keys.addEventListener('mousedown', function (e) {
        var b = e.target.closest('.vk-key');
        if (b) e.preventDefault();
      });
      keys.addEventListener('click', function (e) {
        var b = e.target.closest('.vk-key');
        if (!b) return;
        var k = b.getAttribute('data-k');
        if (k === 'ch') insert(b.getAttribute('data-v'));
        else if (k === 'back') backspace();
        else if (k === 'enter') insert('\n');
        else if (k === 'shift') { shift = !shift; sym = false; draw(); }
        else if (k === 'sym') { sym = !sym; draw(); }
      });

      text.addEventListener('input', refreshCount);
      TB.$('#vkCopy').addEventListener('click', function () {
        if (!text.value) { TB.toast('还没有输入内容'); return; }
        TB.copy(text.value);
        TB.toast('已复制');
      });
      TB.$('#vkClear').addEventListener('click', function () {
        text.value = '';
        refreshCount();
        text.focus();
      });
      TB.$('#vkFull').addEventListener('click', function () {
        var board = TB.$('#vkBoard', root);
        if (document.fullscreenElement) document.exitFullscreen();
        else if (board.requestFullscreen) board.requestFullscreen();
        else TB.toast('当前浏览器不支持全屏');
      });
      document.addEventListener('fullscreenchange', function () {
        if (!alive(root)) return;
        TB.$('#vkFull', root).textContent = document.fullscreenElement ? '退出全屏' : '全屏';
      });

      draw();
      refreshCount();
    }
  });

  /* =================================================== 3. 网页可视化编辑 */
  TB.def({
    slug: 'html-live-edit', cat: 'web', name: '网页可视化编辑', icon: '📝',
    desc: '粘贴 HTML，像文档一样改字再导出',
    kw: 'HTML 编辑 可视化 contenteditable 改网页 源码 导出',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="panel-h">HTML 源码<span class="hint">粘贴整页 HTML，或选一个 .html 文件</span></div>' +
          '<div class="field"><textarea class="textarea hl-src" id="hlSrc" placeholder="&lt;!doctype html&gt;\n&lt;html&gt;&lt;body&gt;&lt;h1&gt;标题&lt;/h1&gt;&lt;p&gt;正文…&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;"></textarea></div>' +
          '<div id="hlDrop"></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="hlRun">渲染并编辑</button>' +
            '<button class="btn" id="hlSample">填充示例</button>' +
            '<button class="btn" id="hlClear">清空</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">可视化编辑<span class="hint" id="hlHint">渲染后可直接点文字修改</span></div>' +
          '<div class="hl-stage" id="hlStage" hidden><div class="hl-host" id="hlHost"></div></div>' +
          '<div class="btns" style="margin-top:12px">' +
            '<button class="btn" id="hlToggle" disabled>退出编辑</button>' +
            '<button class="btn primary" id="hlExport" disabled>导出 HTML</button>' +
            '<button class="btn" id="hlClose" disabled>收起预览</button>' +
          '</div>' +
          '<div class="note">脚本、iframe、内联事件和 javascript: 链接会在渲染前移除；图片若使用相对路径，预览时可能加载不出来。</div>' +
        '</div>';

      var src = TB.$('#hlSrc', root);
      var stage = TB.$('#hlStage', root);
      var host = TB.$('#hlHost', root);
      var hint = TB.$('#hlHint', root);
      var toggle = TB.$('#hlToggle', root);
      var exportBtn = TB.$('#hlExport', root);
      var closeBtn = TB.$('#hlClose', root);
      var shadow = null, stylesHTML = '', editing = true;

      var sample = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<title>说明</title>\n<style>\nbody{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.75;color:#222}\nh1{font-size:26px;margin:0 0 12px}\n.tag{display:inline-block;background:#eef4ff;color:#1d4ed8;border-radius:999px;padding:2px 10px;font-size:12px}\n</style>\n</head>\n<body>\n<h1>这是一个可以直接改的网页</h1>\n<p><span class="tag">提示</span> 点一下任意文字即可修改，改完点「导出 HTML」保存。</p>\n<p>脚本与 iframe 已被移除，只保留排版和文字。</p>\n</body>\n</html>';

      function sanitize(raw) {
        var doc = new DOMParser().parseFromString(raw, 'text/html');
        doc.querySelectorAll('script,iframe,frame,object,embed,base,meta[http-equiv="refresh"],link').forEach(function (n) { n.remove(); });
        doc.querySelectorAll('*').forEach(function (el) {
          Array.prototype.slice.call(el.attributes).forEach(function (a) {
            if (/^on/i.test(a.name)) el.removeAttribute(a.name);
            if ((a.name === 'href' || a.name === 'src') && /javascript:/i.test(a.value)) el.removeAttribute(a.name);
          });
        });
        var styles = Array.prototype.map.call(doc.querySelectorAll('style'), function (s) { return s.outerHTML; }).join('\n');
        return { styles: styles, body: doc.body ? doc.body.innerHTML : raw };
      }

      function render() {
        var raw = src.value.trim();
        if (!raw) {
          src.value = sample;
          raw = sample;
        }
        var clean = sanitize(raw);
        stylesHTML = clean.styles;
        if (!host.shadowRoot) shadow = host.attachShadow({ mode: 'open' });
        else shadow = host.shadowRoot;
        shadow.innerHTML =
          '<style>' +
            ':host{display:block}' +
            '.doc{all:initial;display:block;box-sizing:border-box;width:100%;min-height:260px;padding:24px;background:#fff;color:#222;' +
            'font:15px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif;outline:none;overflow:auto}' +
            '.doc *{box-sizing:border-box}' +
            '.doc[contenteditable="true"]:focus{box-shadow:inset 0 0 0 2px #ff8a00}' +
          '</style>' +
          stylesHTML +
          '<div class="doc" contenteditable="true">' + clean.body + '</div>';
        editing = true;
        stage.hidden = false;
        toggle.disabled = false;
        exportBtn.disabled = false;
        closeBtn.disabled = false;
        toggle.textContent = '退出编辑';
        hint.textContent = '正在编辑：点文字直接改';
        TB.toast('已渲染，可直接改字');
      }

      function serialize() {
        var docEl = shadow && shadow.querySelector('.doc');
        var body = docEl ? docEl.innerHTML : '';
        return '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<title>已编辑网页</title>\n' +
          stylesHTML + '\n</head>\n<body>\n' + body + '\n</body>\n</html>';
      }

      toggle.addEventListener('click', function () {
        var docEl = shadow && shadow.querySelector('.doc');
        if (!docEl) return;
        editing = !editing;
        docEl.setAttribute('contenteditable', editing ? 'true' : 'false');
        toggle.textContent = editing ? '退出编辑' : '继续编辑';
        hint.textContent = editing ? '正在编辑：点文字直接改' : '只读预览';
      });
      exportBtn.addEventListener('click', function () {
        if (!shadow) { TB.toast('先渲染再导出'); return; }
        TB.downloadText(serialize(), 'edited.html');
        TB.toast('已导出 edited.html');
      });
      closeBtn.addEventListener('click', function () {
        stage.hidden = true;
        toggle.disabled = exportBtn.disabled = closeBtn.disabled = true;
        hint.textContent = '渲染后可直接点文字修改';
      });
      TB.$('#hlRun').addEventListener('click', render);
      TB.$('#hlSample').addEventListener('click', function () {
        src.value = sample;
        render();
      });
      TB.$('#hlClear').addEventListener('click', function () {
        src.value = '';
        stage.hidden = true;
        toggle.disabled = exportBtn.disabled = closeBtn.disabled = true;
        if (shadow) shadow.innerHTML = '';
        hint.textContent = '渲染后可直接点文字修改';
      });

      var fp = TB.filePicker(TB.$('#hlDrop', root), { accept: '.html,.htm,text/html', hint: '选择 .html 文件自动填入源码' });
      fp.onChange = async function () {
        if (!fp.files.length) return;
        src.value = await TB.readText(fp.files[0].file);
        TB.toast('已载入 HTML，点「渲染并编辑」');
      };
    }
  });
})();
