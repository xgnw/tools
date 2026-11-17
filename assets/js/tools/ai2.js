/* =============================================================================
 * AI 工具集（第二批）：Token 估算、提示词模板填充、系统提示词生成、
 * AI 绘图提示词、模型调用成本估算。
 * -----------------------------------------------------------------------------
 * 全部是「不调用模型也能用」的辅助工具：算量、拼串、套模板、算钱。
 * 不做需要 API Key 的在线推理，也不假装能做 AI 检测。
 * ========================================================================== */

(function () {

  /* ---------------------------------------------------------- 1. Token 估算 */
  TB.def({
    slug: 'token-est', cat: 'ai', name: 'Token 估算', desc: '上下文占用 / 费用前置', icon: '🧮',
    kw: 'token 估算 上下文 长度 计费 字数 gpt claude 模型',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>文本</b><span style="color:var(--ink-3)">粘贴提示词或待处理的原文</span></div>' +
            '<textarea class="textarea codeIn" id="src" rows="9">你是一名资深产品经理。请把下面这段用户反馈整理成需求清单，按优先级排序，每条注明影响范围与验证方式。不要编造未提到的信息。</textarea></div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">对照模型</div><select class="input" id="model">' +
              '<option value="128000" selected>GPT-4o / GPT-4.1（128K）</option>' +
              '<option value="200000">Claude Sonnet（200K）</option>' +
              '<option value="1000000">Gemini 2.5 Pro（1M）</option>' +
              '<option value="131072">Qwen / 通义千问（128K）</option>' +
              '<option value="65536">DeepSeek（64K）</option></select></div>' +
            '<div class="field"><div class="label">操作</div><div class="btns" style="margin:0">' +
              '<button class="btn primary" id="run">估算</button><button class="btn" id="copy">复制结果</button></div></div>' +
          '</div>' +
          '<div id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">估算用的是经验系数（汉字约 0.75、英文单词约 1.3、数字与标点各约 0.5 个 token），不是真正的分词器，误差大约 ±15%。要精确到个位得加载各家几 MB 的词表，纯静态站不做这件事。</div>';

      var out = TB.$('#out', root);

      function estimate(text) {
        var han = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
        var words = (text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
        var nums = (text.match(/\d+(?:[.,]\d+)*/g) || []).length;
        var punct = (text.match(/[，。！？、；：,.!?;:()（）「」“”"'\-—…]/g) || []).length;
        var emoji = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
        var raw = han * 0.75 + words * 1.3 + nums * 0.6 + punct * 0.45 + emoji * 1.2;
        return {
          chars: text.length,
          charsNoSpace: text.replace(/\s+/g, '').length,
          han: han, words: words, nums: nums, punct: punct, emoji: emoji,
          tokens: Math.max(0, Math.round(raw))
        };
      }

      function run() {
        var text = TB.$('#src', root).value;
        var win = parseInt(TB.$('#model', root).value, 10);
        var s = estimate(text);
        if (!s.chars) { out.innerHTML = '<div class="result-err">先粘贴一段文本</div>'; return; }
        var low = Math.round(s.tokens * 0.85), high = Math.round(s.tokens * 1.15);
        var pct = s.tokens / win * 100;
        var barW = Math.min(100, pct);
        var over = pct > 100;
        out.innerHTML =
          '<div class="kvTable">' +
            '<div class="kvRow"><span>字符数（含空格 / 不含）</span><b>' + s.chars + ' / ' + s.charsNoSpace + '</b></div>' +
            '<div class="kvRow"><span>汉字 · 英文单词 · 数字串</span><b>' + s.han + ' · ' + s.words + ' · ' + s.nums + '</b></div>' +
            '<div class="kvRow"><span>标点 · Emoji</span><b>' + s.punct + ' · ' + s.emoji + '</b></div>' +
            '<div class="kvRow"><span>估算 token</span><b>' + s.tokens + '（' + low + ' – ' + high + '）</b></div>' +
            '<div class="kvRow"><span>占上下文 ' + (win / 1000) + 'K</span><b' + (over ? ' class="bad"' : '') + '>' + pct.toFixed(2) + '%</b></div>' +
            '<div class="kvRow"><span>剩余可用</span><b>' + (over ? '已超出 ' + (s.tokens - win) + ' token' : (win - s.tokens) + ' token') + '</b></div>' +
          '</div>' +
          '<div class="tokBar"><i style="width:' + barW + '%" class="' + (over ? 'bad' : '') + '"></i></div>' +
          '<div class="note" style="margin-top:8px">按最大值 ' + high + ' token 留余量更安全：模型返回的内容也要占上下文，别把窗口塞满。</div>';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#model', root).addEventListener('change', run);
      TB.$('#src', root).addEventListener('input', TB.debounce(run, 350));
      TB.$('#copy', root).addEventListener('click', function () {
        var rows = Array.prototype.map.call(out.querySelectorAll('.kvRow'), function (r) {
          return r.querySelector('span').textContent + '：' + r.querySelector('b').textContent;
        });
        TB.copy(rows.join('\n'));
      });
      run();
    }
  });

  /* ---------------------------------------------------------- 2. 提示词模板填充 */
  TB.def({
    slug: 'prompt-fill', cat: 'ai', name: '提示词模板填充', desc: '{{变量}} 自动成表', icon: '🧩',
    kw: '提示词 模板 变量 占位符 填充 prompt 复用',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>模板</b><span style="color:var(--ink-3)">用 {{变量名}} 占位，同名变量只出现一次输入框</span></div>' +
            '<textarea class="textarea codeIn" id="tpl" rows="8">你是一名{{角色}}。请为{{受众}}写一份关于「{{主题}}」的{{产出类型}}，语气{{语气}}，控制在 {{字数}} 字以内。\n要求：\n1) 开头直接给结论；\n2) 中间给 3 个可执行要点；\n3) 结尾给一句行动建议。</textarea></div>' +
          '<div class="varGrid" id="vars"></div>' +
          '<div class="field" style="margin-top:12px"><div class="label"><b>最终提示词</b><span id="cnt" style="color:var(--ink-3)"></span></div>' +
            '<textarea class="textarea codeIn" id="out" rows="8" readonly></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="copy">复制</button>' +
            '<button class="btn" id="dl">下载 .txt</button>' +
            '<button class="btn" id="reset">清空填写</button></div>' +
        '</div>' +
        '<div class="note">变量值只在页面内存里，关掉标签页就没了。模板里没填的变量会原样保留，方便你看出还差哪一项。</div>';

      var tpl = TB.$('#tpl', root), varsHost = TB.$('#vars', root), out = TB.$('#out', root), cnt = TB.$('#cnt', root);
      var values = {};
      var varNames = [];

      function readVars() {
        var names = [], re = /\{\{\s*([^{}]+?)\s*\}\}/g, m;
        while ((m = re.exec(tpl.value))) {
          var n = m[1];
          if (names.indexOf(n) === -1) names.push(n);
        }
        return names;
      }

      function buildInputs() {
        var names = readVars();
        /* 常见变量给个示例，空白框也能看出该填什么 */
        var hints = {
          '角色': '如：资深产品经理', '受众': '如：刚入职的实习生', '主题': '如：用户反馈整理',
          '产出类型': '如：需求清单', '语气': '如：专业、直接', '字数': '如：300'
        };
        /* 模板变了但变量没变时保留已填的值 */
        varNames = names;
        varsHost.innerHTML = '';
        if (!names.length) {
          varsHost.innerHTML = '<div class="note">模板里还没有 {{变量}}，直接写内容也行。</div>';
          render();
          return;
        }
        names.forEach(function (n) {
          var row = TB.h('<label class="varField"><span>' + TB.esc(n) + '</span>' +
            '<input class="input" data-var="' + TB.esc(n) + '" placeholder="' + TB.esc(hints[n] || '') +
            '" autocomplete="off" spellcheck="false"></label>');
          var input = row.querySelector('input');
          input.value = values[n] || '';
          input.addEventListener('input', function () {
            values[n] = input.value;
            render();
          });
          varsHost.appendChild(row);
        });
        render();
      }

      function render() {
        var text = tpl.value, missing = [];
        varNames.forEach(function (n) {
          var v = values[n] || '';
          /* 变量名允许前后带空格（{{ 角色 }}），统一替换 */
          var re = new RegExp('\\{\\{\\s*' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\}\\}', 'g');
          if (!v.trim()) missing.push(n);
          text = text.replace(re, v || '{{' + n + '}}');
        });
        out.value = text;
        cnt.textContent = varNames.length
          ? '（' + (varNames.length - missing.length) + '/' + varNames.length + ' 已填' + (missing.length ? '，缺：' + missing.join('、') : '') + '）'
          : '';
      }

      tpl.addEventListener('input', TB.debounce(buildInputs, 400));
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.value); });
      TB.$('#dl', root).addEventListener('click', function () { TB.downloadText(out.value, 'prompt.txt'); });
      TB.$('#reset', root).addEventListener('click', function () {
        values = {};
        Array.prototype.forEach.call(varsHost.querySelectorAll('input'), function (i) { i.value = ''; });
        render();
      });
      buildInputs();
    }
  });

  /* ---------------------------------------------------------- 3. 系统提示词生成 */
  TB.def({
    slug: 'sys-prompt', cat: 'ai', name: '系统提示词生成', desc: '角色 / 任务 / 约束', icon: '📝',
    kw: 'system prompt 系统提示词 角色 设定 生成器 结构化',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row2">' +
            '<div class="field"><div class="label"><b>角色</b></div>' +
              '<input class="input" id="role" placeholder="如：十年经验的产品经理" autocomplete="off"></div>' +
            '<div class="field"><div class="label"><b>服务对象</b></div>' +
              '<input class="input" id="audience" placeholder="如：刚入职的实习生" autocomplete="off"></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>任务</b></div>' +
            '<textarea class="textarea" id="task" rows="3" placeholder="如：帮我把零散需求整理成可执行的方案，指出风险"></textarea></div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">语气</div><select class="input" id="tone">' +
              '<option value="专业、克制、直接">专业克制</option><option value="友好、口语化、像一个耐心的同事">友好口语</option>' +
              '<option value="严谨、学术、给出依据">严谨学术</option><option value="轻松、有幽默感但不说废话">轻松幽默</option></select></div>' +
            '<div class="field"><div class="label">输出格式</div><select class="input" id="format">' +
              '<option value="Markdown，分点作答，层级不超过三级">Markdown 分点</option>' +
              '<option value="纯文本段落，不用列表">纯文本段落</option>' +
              '<option value="严格合法的 JSON，只输出 JSON">JSON</option>' +
              '<option value="表格，列名写在第一行">表格</option></select></div>' +
            '<div class="field"><div class="label">不确定时</div><select class="input" id="unknown">' +
              '<option value="ask" selected>先向我确认，不要猜</option>' +
              '<option value="mark">明确标注「不确定」并说明缺什么</option>' +
              '<option value="best">按最合理假设继续，并写出假设</option></select></div>' +
          '</div>' +
          '<div class="field"><div class="label"><b>必须遵守</b><span style="color:var(--ink-3)">每行一条</span></div>' +
            '<textarea class="textarea" id="must" rows="4" placeholder="每条结论给依据&#10;数字保留两位小数&#10;涉及法律、医疗时提示找专业人士复核"></textarea></div>' +
          '<div class="field"><div class="label"><b>不要做</b><span style="color:var(--ink-3)">每行一条</span></div>' +
            '<textarea class="textarea" id="forbid" rows="3" placeholder="不要编造没给的信息&#10;不要用「赋能、抓手」这类空词&#10;不要一次抛出所有问题"></textarea></div>' +
          '<div class="btns"><button class="btn primary" id="run">生成</button>' +
            '<button class="btn" id="copy">复制</button>' +
            '<button class="btn" id="dl">下载 .md</button></div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>结果</b><span id="len" style="color:var(--ink-3)"></span></div>' +
            '<pre class="codeBox" id="out"></pre></div>' +
        '</div>' +
        '<div class="note">系统提示词写得越具体，模型越不容易跑偏：把「你是谁、为谁做、做什么、怎么做、不许做什么」分开写，比一句长句有效。空着的字段不会出现在结果里。</div>';

      var out = TB.$('#out', root), len = TB.$('#len', root);

      function lines(id) {
        return TB.$(id, root).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      }

      function run() {
        var blocks = [];
        var role = TB.$('#role', root).value.trim();
        var task = TB.$('#task', root).value.trim();
        var audience = TB.$('#audience', root).value.trim();
        var tone = TB.$('#tone', root).value;
        var format = TB.$('#format', root).value;
        var unknown = TB.$('#unknown', root).value;

        if (role) blocks.push('# 角色\n你是' + role + '。');
        if (task) blocks.push('# 任务\n' + task);
        if (audience) blocks.push('# 服务对象\n对方是' + audience + '，按对方的水平组织信息，不要假设对方懂行话。');
        blocks.push('# 语气\n' + tone + '。');
        blocks.push('# 输出格式\n' + format + '。');

        var must = lines('#must');
        if (must.length) blocks.push('# 必须遵守\n' + must.map(function (s) { return '- ' + s; }).join('\n'));
        if (unknown === 'ask') blocks.push('# 信息不足时\n先向我提问确认，不要自己补全事实；一次只问最关键的 1-2 个问题。');
        if (unknown === 'mark') blocks.push('# 信息不足时\n明确写出「不确定」以及缺少哪些信息，不要用模糊表述掩盖。');
        if (unknown === 'best') blocks.push('# 信息不足时\n按最合理的假设继续，并在开头单独列出你做的假设。');

        var forbid = lines('#forbid');
        if (forbid.length) blocks.push('# 不要做\n' + forbid.map(function (s) { return '- ' + s; }).join('\n'));

        var text = blocks.join('\n\n') + '\n';
        /* 什么都没填时，别只丢出一节「语气」让人以为坏了 */
        if (!role && !task && !audience && !must.length && !forbid.length) {
          out.textContent = '（填好上面的角色或任务，这里会自动生成结构化提示词）';
          len.textContent = '';
          return;
        }
        out.textContent = text;
        len.textContent = '（' + text.length + ' 字符）';
      }

      TB.$('#run', root).addEventListener('click', run);
      TB.$('#copy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#dl', root).addEventListener('click', function () {
        TB.downloadText(out.textContent, 'system-prompt.md', 'text/markdown');
      });
      Array.prototype.forEach.call(root.querySelectorAll('input,textarea,select'), function (el) {
        el.addEventListener('input', TB.debounce(run, 300));
        el.addEventListener('change', run);
      });
      run();
    }
  });

  /* ---------------------------------------------------------- 4. AI 绘图提示词 */
  TB.def({
    slug: 'img-prompt', cat: 'ai', name: 'AI 绘图提示词', desc: 'Midjourney / SD 拼装', icon: '🖼️',
    kw: 'ai 绘图 提示词 midjourney stable diffusion 出图 prompt 负向',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>画面主体</b><span style="color:var(--ink-3)">建议用英文，模型更容易理解</span></div>' +
            '<input class="input" id="subject" value="a ginger cat napping on a sunny windowsill" autocomplete="off" spellcheck="false"></div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">风格</div><select class="input" id="style">' +
              '<option value="professional photo, natural textures, shallow depth of field" selected>真实摄影</option>' +
              '<option value="clean vector illustration, flat colors, crisp lines">扁平插画</option>' +
              '<option value="3D render, soft studio lighting, octane, subsurface scattering">3D 渲染</option>' +
              '<option value="watercolor painting, visible paper texture, soft edges">水彩</option>' +
              '<option value="cyberpunk, neon lights, rainy night, volumetric fog">赛博朋克</option>' +
              '<option value="minimalist composition, generous negative space, muted palette">极简</option>' +
              '<option value="Chinese ink painting, rice paper texture, elegant brush strokes">国风水墨</option></select></div>' +
            '<div class="field"><div class="label">构图</div><select class="input" id="shot">' +
              '<option value="close-up shot, macro detail" selected>特写</option>' +
              '<option value="medium shot, waist up">半身</option>' +
              '<option value="full body shot, environmental portrait">全身</option>' +
              '<option value="top-down overhead view">俯视</option>' +
              '<option value="low angle shot, dramatic perspective">仰视</option>' +
              '<option value="wide angle, sweeping landscape">广角</option></select></div>' +
            '<div class="field"><div class="label">光线</div><select class="input" id="light">' +
              '<option value="soft natural daylight, gentle shadows" selected>自然光</option>' +
              '<option value="golden hour, warm rim light">黄金时刻</option>' +
              '<option value="diffused softbox lighting, even illumination">柔光棚拍</option>' +
              '<option value="neon glow, colored reflections">霓虹</option>' +
              '<option value="backlit, silhouette, lens flare">逆光</option></select></div>' +
          '</div>' +
          '<div class="row3">' +
            '<div class="field"><div class="label">色调</div><select class="input" id="color">' +
              '<option value="warm and cozy tones" selected>暖调</option>' +
              '<option value="cool blue tones">冷调</option>' +
              '<option value="pastel colors, low saturation">低饱和</option>' +
              '<option value="high contrast, deep shadows">高对比</option>' +
              '<option value="monochrome, black and white">黑白</option></select></div>' +
            '<div class="field"><div class="label">画幅</div><select class="input" id="ratio">' +
              '<option value="2:3" selected>2:3 竖幅</option><option value="3:2">3:2 横幅</option>' +
              '<option value="1:1">1:1 方图</option><option value="16:9">16:9 宽屏</option>' +
              '<option value="9:16">9:16 手机</option><option value="4:3">4:3</option></select></div>' +
            '<div class="field"><div class="label">负向词</div><div class="checks" id="neg">' +
              '<label><input type="checkbox" value="low quality" checked> 低质量</label>' +
              '<label><input type="checkbox" value="blurry" checked> 模糊</label>' +
              '<label><input type="checkbox" value="extra fingers" checked> 多指</label>' +
              '<label><input type="checkbox" value="deformed hands" checked> 手部畸形</label>' +
              '<label><input type="checkbox" value="watermark" checked> 水印</label>' +
              '<label><input type="checkbox" value="text" checked> 文字</label></div></div>' +
          '</div>' +
          '<div class="field" style="margin-top:14px"><div class="label"><b>Midjourney</b><button class="btn sm" data-copy="mj" style="margin-left:auto">复制</button></div>' +
            '<pre class="codeBox" id="mj"></pre></div>' +
          '<div class="field" style="margin-top:12px"><div class="label"><b>Stable Diffusion 正向</b><button class="btn sm" data-copy="sd" style="margin-left:auto">复制</button></div>' +
            '<pre class="codeBox" id="sd"></pre></div>' +
          '<div class="field" style="margin-top:12px"><div class="label"><b>Stable Diffusion 负向</b><button class="btn sm" data-copy="negout" style="margin-left:auto">复制</button></div>' +
            '<pre class="codeBox" id="negout"></pre></div>' +
        '</div>' +
        '<div class="note">只是把选项拼成提示词，不保证出图效果——真正决定画面的是模型、权重与随机种子。英文提示词通常比中文稳定，主体部分可以自己继续加细节。</div>';

      var mj = TB.$('#mj', root), sd = TB.$('#sd', root), negOut = TB.$('#negout', root);

      function build() {
        var subject = TB.$('#subject', root).value.trim();
        var parts = [subject, TB.$('#style', root).value, TB.$('#shot', root).value,
          TB.$('#light', root).value, TB.$('#color', root).value, 'highly detailed, sharp focus'];
        var body = parts.filter(Boolean).join(', ');
        var ratio = TB.$('#ratio', root).value;
        mj.textContent = body + ' --ar ' + ratio + ' --v 6';
        sd.textContent = body;
        var negs = Array.prototype.map.call(root.querySelectorAll('#neg input:checked'), function (el) { return el.value; });
        negOut.textContent = negs.join(', ') || '—';
      }

      Array.prototype.forEach.call(root.querySelectorAll('input,select'), function (el) {
        el.addEventListener('input', build);
        el.addEventListener('change', build);
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-copy]'), function (btn) {
        btn.addEventListener('click', function () {
          var map = { mj: mj, sd: sd, negout: negOut };
          TB.copy(map[btn.getAttribute('data-copy')].textContent);
        });
      });
      build();
    }
  });

  /* ---------------------------------------------------------- 5. 模型调用成本 */
  TB.def({
    slug: 'ai-cost', cat: 'ai', name: '模型成本估算', desc: '按 token 算钱', icon: '💰',
    kw: 'ai 成本 费用 token 价格 gpt claude gemini deepseek 预算',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row3">' +
            '<div class="field"><div class="label">每次输入 token</div><input class="input" id="inTok" type="number" min="0" value="1000"></div>' +
            '<div class="field"><div class="label">每次输出 token</div><input class="input" id="outTok" type="number" min="0" value="500"></div>' +
            '<div class="field"><div class="label">调用次数</div><input class="input" id="calls" type="number" min="1" value="10"></div>' +
          '</div>' +
          '<div class="row2">' +
            '<div class="field"><div class="label">美元兑人民币（可改）</div><input class="input" id="rate" type="number" min="0" step="0.01" value="7.10"></div>' +
            '<div class="field"><div class="label">操作</div><div class="btns" style="margin:0">' +
              '<button class="btn primary" id="run">重新计算</button>' +
              '<button class="btn" id="csv">复制表格</button></div></div>' +
          '</div>' +
          '<div class="table-wrap" style="margin-top:14px">' +
            '<table class="table"><thead><tr>' +
              '<th>模型</th><th class="num">输入 $/百万</th><th class="num">输出 $/百万</th><th class="num">单次 $</th><th class="num">合计 $</th><th class="num">合计 ¥</th>' +
            '</tr></thead><tbody id="rows"></tbody></table>' +
          '</div>' +
          '<div id="best" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">表里的单价只是量级参考（不是实时报价，也不含缓存折扣、批处理优惠与代理加价），可以直接点数字改成你实际谈的价。成本 =（输入 token × 输入单价 + 输出 token × 输出单价）/ 1000000 × 次数。</div>';

      /* 默认单价（美元 / 百万 token），仅作参考，表格里可编辑 */
      var MODELS = [
        { name: 'GPT-4o', in: 2.5, out: 10 },
        { name: 'GPT-4.1', in: 2, out: 8 },
        { name: 'Claude Sonnet', in: 3, out: 15 },
        { name: 'Gemini 2.5 Pro', in: 1.25, out: 10 },
        { name: 'DeepSeek V3', in: 0.27, out: 1.1 },
        { name: 'Qwen-Plus', in: 0.4, out: 1 }
      ];

      var tbody = TB.$('#rows', root);
      tbody.innerHTML = MODELS.map(function (m, i) {
        return '<tr data-i="' + i + '">' +
          '<td>' + TB.esc(m.name) + '</td>' +
          '<td class="num"><input class="input priceIn" data-k="in" value="' + m.in + '" type="number" min="0" step="0.01"></td>' +
          '<td class="num"><input class="input priceIn" data-k="out" value="' + m.out + '" type="number" min="0" step="0.01"></td>' +
          '<td class="num" data-c="one">—</td>' +
          '<td class="num" data-c="all">—</td>' +
          '<td class="num" data-c="cny">—</td>' +
        '</tr>';
      }).join('');

      function money(v) {
        if (!isFinite(v)) return '—';
        if (v === 0) return '0';
        if (v < 0.01) return v.toFixed(5);
        if (v < 1) return v.toFixed(4);
        return v.toFixed(2);
      }

      function calc() {
        var inTok = Math.max(0, parseFloat(TB.$('#inTok', root).value) || 0);
        var outTok = Math.max(0, parseFloat(TB.$('#outTok', root).value) || 0);
        var calls = Math.max(1, parseInt(TB.$('#calls', root).value, 10) || 1);
        var rate = Math.max(0, parseFloat(TB.$('#rate', root).value) || 0);
        var best = null;

        Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function (tr) {
          var inPrice = Math.max(0, parseFloat(tr.querySelector('[data-k=in]').value) || 0);
          var outPrice = Math.max(0, parseFloat(tr.querySelector('[data-k=out]').value) || 0);
          var one = (inTok * inPrice + outTok * outPrice) / 1e6;
          var all = one * calls;
          tr.querySelector('[data-c=one]').textContent = '$' + money(one);
          tr.querySelector('[data-c=all]').textContent = '$' + money(all);
          tr.querySelector('[data-c=cny]').textContent = '¥' + money(all * rate);
          if (!best || all < best.all) best = { name: tr.querySelector('td').textContent, all: all };
        });

        TB.$('#best', root).innerHTML = best
          ? '<div class="note">这批里最便宜的是 <b>' + TB.esc(best.name) + '</b>，合计 $' +
            money(best.all) + '（约 ¥' + money(best.all * rate) + '）。单价可改，改完立刻重算。</div>'
          : '';
      }

      function csv() {
        var lines = ['模型,输入$/百万,输出$/百万,单次$,合计$,合计¥'];
        Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function (tr) {
          var cells = Array.prototype.slice.call(tr.querySelectorAll('td')).map(function (td) {
            return td.querySelector('input') ? td.querySelector('input').value : td.textContent;
          });
          lines.push(cells.join(','));
        });
        TB.copy(lines.join('\n'));
      }

      TB.$('#run', root).addEventListener('click', calc);
      TB.$('#csv', root).addEventListener('click', csv);
      TB.$('#inTok', root).addEventListener('input', TB.debounce(calc, 300));
      TB.$('#outTok', root).addEventListener('input', TB.debounce(calc, 300));
      TB.$('#calls', root).addEventListener('input', TB.debounce(calc, 300));
      TB.$('#rate', root).addEventListener('input', TB.debounce(calc, 300));
      tbody.addEventListener('input', calc);
      calc();
    }
  });

})();

