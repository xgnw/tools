/* =============================================================================
 * HTTP 状态码 / MIME / 端口速查
 * -----------------------------------------------------------------------------
 * 本地静态速查表，不发起网络请求。支持按值、名称和说明过滤。
 * ========================================================================== */
(function () {
  'use strict';

  var STATUS = [
    ['100', 'Continue', '继续发送请求'],
    ['101', 'Switching Protocols', '切换协议，常见于 WebSocket 升级'],
    ['200', 'OK', '请求成功'],
    ['201', 'Created', '资源已创建'],
    ['204', 'No Content', '成功但没有响应体'],
    ['206', 'Partial Content', '断点续传 / 分段返回'],
    ['301', 'Moved Permanently', '永久重定向，建议更新书签'],
    ['302', 'Found', '临时重定向'],
    ['304', 'Not Modified', '缓存仍然有效'],
    ['307', 'Temporary Redirect', '临时重定向，保持原请求方法'],
    ['308', 'Permanent Redirect', '永久重定向，保持原请求方法'],
    ['400', 'Bad Request', '请求格式或参数有误'],
    ['401', 'Unauthorized', '缺少或无效的身份凭证'],
    ['403', 'Forbidden', '已认证但无权访问'],
    ['404', 'Not Found', '资源不存在'],
    ['405', 'Method Not Allowed', '该地址不支持此请求方法'],
    ['408', 'Request Timeout', '请求超时'],
    ['409', 'Conflict', '资源状态冲突'],
    ['410', 'Gone', '资源已永久移除'],
    ['413', 'Payload Too Large', '请求体超过服务器限制'],
    ['414', 'URI Too Long', '请求地址过长'],
    ['418', "I'm a teapot", '愚人节彩蛋状态码'],
    ['429', 'Too Many Requests', '请求过于频繁，被限流'],
    ['500', 'Internal Server Error', '服务器内部错误'],
    ['501', 'Not Implemented', '服务器不支持该功能'],
    ['502', 'Bad Gateway', '网关收到上游无效响应'],
    ['503', 'Service Unavailable', '服务暂时不可用或过载'],
    ['504', 'Gateway Timeout', '网关等待上游超时']
  ];

  var MIME = [
    ['text/html', 'HTML 文档', '.html / .htm'],
    ['text/css', '样式表', '.css'],
    ['text/javascript', 'JavaScript', '.js / .mjs'],
    ['application/json', 'JSON 数据', '.json'],
    ['application/xml', 'XML 数据', '.xml'],
    ['text/plain', '纯文本', '.txt'],
    ['text/csv', 'CSV 表格', '.csv'],
    ['image/png', 'PNG 图片', '.png'],
    ['image/jpeg', 'JPEG 图片', '.jpg / .jpeg'],
    ['image/gif', 'GIF 图片', '.gif'],
    ['image/webp', 'WebP 图片', '.webp'],
    ['image/svg+xml', 'SVG 矢量图', '.svg'],
    ['image/x-icon', '网站图标', '.ico'],
    ['application/pdf', 'PDF 文档', '.pdf'],
    ['application/zip', 'ZIP 压缩包', '.zip'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word 文档', '.docx'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel 工作簿', '.xlsx'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'PowerPoint 演示文稿', '.pptx'],
    ['video/mp4', 'MP4 视频', '.mp4'],
    ['audio/mpeg', 'MP3 音频', '.mp3'],
    ['font/woff2', 'Web 字体', '.woff2'],
    ['application/octet-stream', '未知二进制流', '通用下载']
  ];

  var PORTS = [
    ['20 / 21', 'FTP', '文件传输协议，21 为控制端口'],
    ['22', 'SSH', '远程登录与安全文件传输'],
    ['23', 'Telnet', '明文远程登录，已不推荐'],
    ['25', 'SMTP', '邮件发送'],
    ['53', 'DNS', '域名解析，UDP / TCP'],
    ['67 / 68', 'DHCP', '自动分配局域网 IP'],
    ['80', 'HTTP', '明文网页服务'],
    ['110', 'POP3', '邮件接收'],
    ['143', 'IMAP', '邮件同步'],
    ['443', 'HTTPS', 'TLS 加密网页服务'],
    ['445', 'SMB', 'Windows 文件共享'],
    ['3306', 'MySQL', 'MySQL / MariaDB 数据库'],
    ['3389', 'RDP', 'Windows 远程桌面'],
    ['5432', 'PostgreSQL', 'PostgreSQL 数据库'],
    ['6379', 'Redis', 'Redis 缓存 / 数据库'],
    ['8080', 'HTTP Alt', '常见备用 Web / 代理端口'],
    ['27017', 'MongoDB', 'MongoDB 数据库']
  ];

  var ITEMS = [];
  STATUS.forEach(function (x) { ITEMS.push({ kind: 'status', value: x[0], name: x[1], desc: x[2] }); });
  MIME.forEach(function (x) { ITEMS.push({ kind: 'mime', value: x[0], name: x[1], desc: x[2] }); });
  PORTS.forEach(function (x) { ITEMS.push({ kind: 'port', value: x[0], name: x[1], desc: x[2] }); });

  TB.def({
    slug: 'httpref',
    cat: 'web',
    name: 'HTTP 状态码 / MIME / 端口速查',
    desc: '本地查询常见 HTTP 状态码、MIME 类型和网络端口含义。',
    icon: '📡',
    kw: 'http 状态码 mime 端口 404 500 502 content-type 速查',
    render: function (ctx) {
      var root = ctx.root;
      var mode = 'all';
      root.innerHTML =
        '<div class="tabs"><button class="tab on" type="button" data-kind="all">全部</button>' +
          '<button class="tab" type="button" data-kind="status">状态码</button>' +
          '<button class="tab" type="button" data-kind="mime">MIME</button>' +
          '<button class="tab" type="button" data-kind="port">端口</button></div>' +
        '<div class="panel"><div class="field"><input class="input" id="hrSearch" placeholder="搜索 404、application/json、3306…"></div>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>值</th><th>名称</th><th>说明 / 后缀</th></tr></thead><tbody id="hrBody"></tbody></table></div>' +
          '<div class="note" id="hrCount" style="margin-top:10px">共 ' + ITEMS.length + ' 条</div>' +
        '</div>' +
        '<p class="note">速查表只用于理解常见协议约定；不同服务器、框架和 CDN 可能对状态码或 MIME 做额外处理。</p>';

      var body = TB.$('#hrBody', root);
      var search = TB.$('#hrSearch', root);
      var count = TB.$('#hrCount', root);

      function render() {
        var q = search.value.trim().toLowerCase();
        var rows = ITEMS.filter(function (x) {
          if (mode !== 'all' && x.kind !== mode) return false;
          if (!q) return true;
          return (x.value + ' ' + x.name + ' ' + x.desc).toLowerCase().indexOf(q) >= 0;
        });
        body.innerHTML = rows.map(function (x) {
          return '<tr><td><b class="mono">' + TB.esc(x.value) + '</b></td><td>' + TB.esc(x.name) + '</td><td style="white-space:normal">' + TB.esc(x.desc) + '</td></tr>';
        }).join('') || '<tr><td colspan="3" style="color:var(--ink-3)">没有匹配的条目</td></tr>';
        count.textContent = '共 ' + rows.length + ' 条';
      }

      search.addEventListener('input', render);
      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          mode = tab.getAttribute('data-kind');
          TB.$$('.tab', root).forEach(function (x) { x.classList.toggle('on', x === tab); });
          render();
        });
      });
      render();
    }
  });
})();
