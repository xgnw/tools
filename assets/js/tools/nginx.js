/* =============================================================================
 * Nginx 配置生成器
 * -----------------------------------------------------------------------------
 * 按域名、静态目录或反向代理生成 server 块，可选 HTTPS 跳转、gzip 和 WebSocket。
 * 只生成配置文本，不连接服务器、不测试语法。
 * ========================================================================== */
(function () {
  'use strict';

  function lines(v) {
    return String(v || '').split(/[\s,，]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  TB.def({
    slug: 'nginx',
    cat: 'web',
    name: 'Nginx 配置生成器',
    desc: '配置域名、静态目录或反向代理，生成 Nginx server 配置。',
    icon: '🌐',
    kw: 'nginx 配置 server 反向代理 ssl 证书 gzip websocket 静态站点',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">基础设置</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">域名 / Server Name</div><input class="input" id="ngDomain" value="example.com"></div>' +
            '<div class="field"><div class="label">监听端口</div><input class="input" id="ngPort" type="number" min="1" max="65535" value="80"></div>' +
            '<div class="field"><div class="label">模式</div><select class="select" id="ngMode">' +
              '<option value="static">静态站点</option><option value="proxy">反向代理</option></select></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field ng-static"><div class="label">站点根目录</div><input class="input" id="ngRoot" value="/var/www/html"></div>' +
            '<div class="field ng-static"><div class="label">首页文件</div><input class="input" id="ngIndex" value="index.html index.htm"></div>' +
            '<div class="field ng-proxy"><div class="label">代理路径</div><input class="input" id="ngPath" value="/api/"></div>' +
            '<div class="field ng-proxy"><div class="label">上游地址</div><input class="input" id="ngPass" value="http://127.0.0.1:8080"></div>' +
          '</div>' +
          '<div class="checks" style="margin-top:4px">' +
            '<label><input type="checkbox" id="ngSsl"> 生成 HTTPS（80 跳转 443）</label>' +
            '<label><input type="checkbox" id="ngGzip" checked> 开启 gzip</label>' +
            '<label><input type="checkbox" id="ngWs"> 透传 WebSocket</label>' +
          '</div>' +
          '<div class="row" id="ngSslFields" style="margin-top:12px">' +
            '<div class="field"><div class="label">证书路径</div><input class="input" id="ngCert" value="/etc/nginx/ssl/fullchain.pem"></div>' +
            '<div class="field"><div class="label">私钥路径</div><input class="input" id="ngKey" value="/etc/nginx/ssl/privkey.pem"></div>' +
          '</div>' +
          '<div class="row"><div class="field"><div class="label">上传大小限制</div><input class="input" id="ngBody" value="20m"></div></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">生成的 Nginx 配置</div><pre class="codeBox" id="ngOut"></pre>' +
          '<div class="btns" style="margin-top:12px"><button class="btn" id="ngCopy" type="button">复制配置</button>' +
            '<button class="btn" id="ngDownload" type="button">下载 .conf</button></div></div>' +
        '<p class="note">生成的是可读的起点配置，不会自动修改服务器。部署前请用 `nginx -t` 检查语法，并按实际证书、目录和上游地址调整。</p>';

      var out = TB.$('#ngOut', root);

      function updateVisibility() {
        var proxy = TB.$('#ngMode', root).value === 'proxy';
        TB.$$('.ng-static', root).forEach(function (el) { el.style.display = proxy ? 'none' : ''; });
        TB.$$('.ng-proxy', root).forEach(function (el) { el.style.display = proxy ? '' : 'none'; });
        TB.$('#ngSslFields', root).style.display = TB.$('#ngSsl', root).checked ? '' : 'none';
      }

      function serverBlock(port, ssl) {
        var domain = lines(TB.$('#ngDomain', root).value).join(' ');
        var mode = TB.$('#ngMode', root).value;
        var b = [];
        b.push('server {');
        b.push('    listen ' + port + (ssl ? ' ssl' : '') + ';');
        if (ssl) b.push('    listen [::]:' + port + ' ssl;');
        b.push('    server_name ' + (domain || 'example.com') + ';');
        b.push('    client_max_body_size ' + (TB.$('#ngBody', root).value.trim() || '20m') + ';');
        if (ssl) {
          b.push('    ssl_certificate ' + (TB.$('#ngCert', root).value.trim() || '/etc/nginx/ssl/fullchain.pem') + ';');
          b.push('    ssl_certificate_key ' + (TB.$('#ngKey', root).value.trim() || '/etc/nginx/ssl/privkey.pem') + ';');
          b.push('    ssl_protocols TLSv1.2 TLSv1.3;');
        }
        if (mode === 'static') {
          b.push('    root ' + (TB.$('#ngRoot', root).value.trim() || '/var/www/html') + ';');
          b.push('    index ' + (TB.$('#ngIndex', root).value.trim() || 'index.html index.htm') + ';');
        }
        if (TB.$('#ngGzip', root).checked) {
          b.push('    gzip on;');
          b.push('    gzip_types text/plain text/css application/json application/javascript image/svg+xml;');
        }
        if (mode === 'static') {
          b.push('');
          b.push('    location / {');
          b.push('        try_files $uri $uri/ /index.html;');
          b.push('    }');
        } else {
          var path = TB.$('#ngPath', root).value.trim() || '/api/';
          if (path[0] !== '/') path = '/' + path;
          b.push('');
          b.push('    location ' + path + ' {');
          b.push('        proxy_pass ' + (TB.$('#ngPass', root).value.trim() || 'http://127.0.0.1:8080') + ';');
          b.push('        proxy_http_version 1.1;');
          b.push('        proxy_set_header Host $host;');
          b.push('        proxy_set_header X-Real-IP $remote_addr;');
          b.push('        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
          b.push('        proxy_set_header X-Forwarded-Proto $scheme;');
          if (TB.$('#ngWs', root).checked) {
            b.push('        proxy_set_header Upgrade $http_upgrade;');
            b.push('        proxy_set_header Connection "upgrade";');
          }
          b.push('    }');
        }
        b.push('}');
        return b.join('\n');
      }

      function generate() {
        updateVisibility();
        var port = TB.$('#ngPort', root).value.trim() || '80';
        var ssl = TB.$('#ngSsl', root).checked;
        var domain = lines(TB.$('#ngDomain', root).value)[0] || 'example.com';
        var blocks = [];
        if (ssl) {
          blocks.push('server {\n    listen 80;\n    server_name ' + (lines(TB.$('#ngDomain', root).value).join(' ') || domain) + ';\n    return 301 https://$host$request_uri;\n}');
          blocks.push(serverBlock('443', true));
        } else {
          blocks.push(serverBlock(port, false));
        }
        out.textContent = blocks.join('\n\n');
      }

      root.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('input', generate);
        el.addEventListener('change', generate);
      });
      TB.$('#ngCopy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#ngDownload', root).addEventListener('click', function () {
        TB.downloadText(out.textContent + '\n', 'nginx-site.conf', 'text/plain');
      });
      generate();
    }
  });
})();
