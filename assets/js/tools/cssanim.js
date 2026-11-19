/* =============================================================================
 * CSS 动画生成器
 * -----------------------------------------------------------------------------
 * 选择动画类型、时长、延迟、缓动与循环方式，实时预览并生成 @keyframes +
 * animation 简写。预览与导出共用同一份参数，不依赖任何动画库。
 * ========================================================================== */
(function () {
  'use strict';

  var TYPES = {
    fade: {
      name: '淡入',
      desc: '透明度从 0 到 1',
      frames: 'from { opacity: 0; }\n  to { opacity: 1; }'
    },
    slideUp: {
      name: '上滑进入',
      desc: '从下方轻微上移并淡入',
      frames: 'from { opacity: 0; transform: translateY(28px); }\n  to { opacity: 1; transform: translateY(0); }'
    },
    scaleIn: {
      name: '缩放进入',
      desc: '从略小状态放大并淡入',
      frames: 'from { opacity: 0; transform: scale(.82); }\n  to { opacity: 1; transform: scale(1); }'
    },
    rotateIn: {
      name: '旋转进入',
      desc: '轻微旋转后归位',
      frames: 'from { opacity: 0; transform: rotate(-10deg); }\n  to { opacity: 1; transform: rotate(0); }'
    },
    bounce: {
      name: '弹跳',
      desc: '上下弹跳，适合提示元素',
      frames: '0%, 100% { transform: translateY(0); }\n  30% { transform: translateY(-20px); }\n  55% { transform: translateY(-9px); }\n  75% { transform: translateY(-3px); }'
    },
    flip: {
      name: '翻转进入',
      desc: '绕 Y 轴翻转入场',
      frames: 'from { opacity: 0; transform: perspective(600px) rotateY(-90deg); }\n  to { opacity: 1; transform: perspective(600px) rotateY(0); }'
    },
    shake: {
      name: '左右摇摆',
      desc: '短促左右移动，适合错误提示',
      frames: '0%, 100% { transform: translateX(0); }\n  20% { transform: translateX(-7px); }\n  40% { transform: translateX(7px); }\n  60% { transform: translateX(-5px); }\n  80% { transform: translateX(5px); }'
    },
    pulse: {
      name: '呼吸缩放',
      desc: '缓慢放大再回到原尺寸',
      frames: '0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.08); }'
    }
  };

  var EASINGS = [
    ['ease', 'ease（默认）'],
    ['ease-in', 'ease-in'],
    ['ease-out', 'ease-out'],
    ['ease-in-out', 'ease-in-out'],
    ['linear', 'linear'],
    ['cubic-bezier(.34,1.56,.64,1)', '回弹 cubic-bezier']
  ];

  function clampNum(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  TB.def({
    slug: 'cssanim',
    cat: 'web',
    name: 'CSS 动画生成器',
    desc: '可视化调参，生成 @keyframes 与 animation 简写。',
    icon: '🎞️',
    kw: 'CSS 动画 animation keyframes 关键帧 动效 前端',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">动画参数</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1 1 200px"><div class="label">动画类型</div><select class="select" id="caType">' +
              Object.keys(TYPES).map(function (k) { return '<option value="' + k + '">' + TYPES[k].name + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field" style="flex:0 1 120px"><div class="label">时长（秒）</div><input class="input" id="caDur" type="number" min="0.1" max="10" step="0.1" value="0.8"></div>' +
            '<div class="field" style="flex:0 1 120px"><div class="label">延迟（秒）</div><input class="input" id="caDelay" type="number" min="0" max="5" step="0.1" value="0"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field" style="flex:1 1 200px"><div class="label">缓动曲线</div><select class="select" id="caEase">' +
              EASINGS.map(function (e) { return '<option value="' + e[0] + '">' + e[1] + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field" style="flex:0 1 140px"><div class="label">循环次数</div><select class="select" id="caIter"><option value="1">1 次</option><option value="2">2 次</option><option value="3">3 次</option><option value="infinite">无限循环</option></select></div>' +
            '<div class="field" style="flex:0 1 140px"><div class="label">播放方向</div><select class="select" id="caDir"><option value="normal">normal</option><option value="alternate">alternate</option></select></div>' +
          '</div>' +
          '<div class="field"><label class="label" style="margin-bottom:10px"><input type="checkbox" id="caFill" checked> 保持结束状态（forwards）</label></div>' +
          '<div class="btns"><button class="btn primary" id="caPlay" type="button">播放动画</button>' +
            '<button class="btn" id="caCopy" type="button">复制 CSS</button></div></div>' +
        '<div class="panel"><div class="panel-h">预览 <span class="hint" id="caHint"></span></div>' +
          '<div class="ca-stage"><div class="ca-card" id="caPreview"><span>预览</span><small>CSS animation</small></div></div></div>' +
        '<div class="panel"><div class="panel-h">生成的 CSS</div><pre class="codeBox" id="caCode" style="min-height:160px"></pre></div>' +
        '<p class="note">生成的代码可直接粘贴到项目中。修改参数后会自动重播预览；「无限循环」会持续播放，切换类型或刷新页面即可停止。</p>' +
        '<style id="caKeyframes"></style>';

      var typeSel = TB.$('#caType', root);
      var durInput = TB.$('#caDur', root);
      var delayInput = TB.$('#caDelay', root);
      var easeSel = TB.$('#caEase', root);
      var iterSel = TB.$('#caIter', root);
      var dirSel = TB.$('#caDir', root);
      var fillCheck = TB.$('#caFill', root);
      var preview = TB.$('#caPreview', root);
      var code = TB.$('#caCode', root);
      var style = TB.$('#caKeyframes', root);
      var hint = TB.$('#caHint', root);
      var currentCss = '';

      function build() {
        var type = TYPES[typeSel.value] || TYPES.fade;
        var frename = 'tbAnim' + typeSel.value.charAt(0).toUpperCase() + typeSel.value.slice(1);
        var duration = clampNum(durInput.value, .1, 10, .8);
        var delay = clampNum(delayInput.value, 0, 5, 0);
        var easing = easeSel.value;
        var iteration = iterSel.value;
        var direction = dirSel.value;
        var fill = fillCheck.checked ? ' forwards' : '';

        durInput.value = String(duration);
        delayInput.value = String(delay);

        style.textContent = '@keyframes ' + frename + ' {\n  ' + type.frames + '\n}';
        var animation = frename + ' ' + duration + 's ' + easing + ' ' + delay + 's ' + iteration + ' ' + direction + fill;
        var css = '@keyframes ' + frename + ' {\n  ' + type.frames + '\n}\n\n' +
          '.animated-box {\n  animation: ' + animation + ';\n}';
        code.textContent = css;
        currentCss = css;
        hint.textContent = type.desc + ' · ' + duration + 's';
        return animation;
      }

      function play() {
        var animation = build();
        preview.style.animation = 'none';
        // 强制读取一次布局，保证重复点击也能重新播放
        void preview.offsetWidth;
        preview.style.animation = animation;
      }

      [typeSel, durInput, delayInput, easeSel, iterSel, dirSel, fillCheck].forEach(function (el) {
        el.addEventListener('input', play);
        el.addEventListener('change', play);
      });
      TB.$('#caPlay', root).addEventListener('click', play);
      TB.$('#caCopy', root).addEventListener('click', function () {
        if (currentCss) TB.copy(currentCss);
      });

      play();
    }
  });
})();
