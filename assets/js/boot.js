/* =============================================================================
 * 启动脚本
 * -----------------------------------------------------------------------------
 * 单独成文件，保证所有工具都已注册后再初始化（工具文件按顺序同步加载，
 * 这里再用 DOMContentLoaded 兜一层，避免脚本放在 body 末尾时读到半成品 DOM）。
 * ========================================================================== */

(function () {
  function start() {
    try {
      TB.boot();
    } catch (e) {
      console.error('[简单工具箱] 启动失败', e);
      var app = document.getElementById('app');
      if (app) {
        app.innerHTML = '<div class="panel" style="margin-top:20px">' +
          '<div class="result-err">页面初始化失败：' + (e && e.message ? e.message : e) + '</div>' +
          '<div class="note">请用现代浏览器（Chrome / Edge / Firefox / Safari）打开，并确认 assets 目录完整。</div></div>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
