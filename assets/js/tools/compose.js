/* =============================================================================
 * Docker Compose 配置生成器
 * -----------------------------------------------------------------------------
 * 用表单维护服务列表，生成 docker-compose.yml 文本。只生成配置，不执行 Docker。
 * ========================================================================== */
(function () {
  'use strict';

  function scalar(v) {
    v = String(v == null ? '' : v).trim();
    if (!v) return '';
    // 冒号、井号、引号、首尾空格、布尔/数字样式都用双引号包住，避免 YAML 歧义
    if (/^[\d.+-]+$/.test(v) || /^[#:[\]{}&*!|>'"%@`]/.test(v) || /:\s|#|^\s|\s$|^(true|false|null|yes|no)$/i.test(v)) {
      return JSON.stringify(v);
    }
    return v;
  }

  function list(v) {
    return String(v || '').split(/[\n,，]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  TB.def({
    slug: 'compose',
    cat: 'web',
    name: 'Docker Compose 配置生成器',
    desc: '用表单配置服务、端口、卷和环境变量，生成 docker-compose.yml。',
    icon: '🐳',
    kw: 'docker compose yaml 容器 服务 编排 配置 生成器',
    render: function (ctx) {
      var root = ctx.root;
      var seq = 0;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">服务列表 <span class="hint">每个服务生成一个 services 条目</span></div>' +
          '<div class="svcList" id="cbList"></div>' +
          '<div class="btns" style="margin-top:12px"><button class="btn primary" id="cbAdd" type="button">＋ 添加服务</button>' +
            '<button class="btn" id="cbExample" type="button">重载示例</button></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">生成的 docker-compose.yml</div>' +
          '<pre class="codeBox" id="cbOut"></pre>' +
          '<div class="btns" style="margin-top:12px"><button class="btn" id="cbCopy" type="button">复制 YAML</button>' +
            '<button class="btn" id="cbDownload" type="button">下载 .yml</button></div></div>' +
        '<p class="note">只生成 Compose 配置文本，不连接 Docker、不启动容器。生成前请按实际项目调整镜像、端口、卷和环境变量；不同 Compose 版本对字段的支持略有差异。</p>';

      var listEl = TB.$('#cbList', root);
      var out = TB.$('#cbOut', root);

      function addService(name, image) {
        seq++;
        var card = document.createElement('div');
        card.className = 'svcCard';
        card.innerHTML =
          '<div class="svcHead"><b>服务 ' + seq + '</b><button class="btn tiny danger" type="button" data-remove>删除</button></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">服务名</div><input class="input svcName" value="' + TB.esc(name || 'service' + seq) + '"></div>' +
            '<div class="field"><div class="label">镜像</div><input class="input svcImage" value="' + TB.esc(image || 'nginx:latest') + '"></div>' +
            '<div class="field"><div class="label">容器名（可选）</div><input class="input svcContainer" placeholder="my-app"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">端口</div><input class="input svcPorts" placeholder="8080:80，每行一个"></div>' +
            '<div class="field"><div class="label">数据卷</div><input class="input svcVolumes" placeholder="./data:/data，每行一个"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">环境变量</div><textarea class="input svcEnv" rows="2" placeholder="KEY=VALUE，每行一个"></textarea></div>' +
            '<div class="field"><div class="label">依赖服务</div><input class="input svcDepends" placeholder="db，多个用逗号分隔"></div>' +
          '</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">启动命令（可选）</div><input class="input svcCommand" placeholder="npm start"></div>' +
            '<div class="field"><div class="label">重启策略</div><select class="select svcRestart">' +
              '<option value="">不设置</option><option value="unless-stopped" selected>unless-stopped</option>' +
              '<option value="always">always</option><option value="on-failure">on-failure</option><option value="no">no</option>' +
            '</select></div>' +
          '</div>';
        listEl.appendChild(card);
        card.querySelectorAll('input,select,textarea').forEach(function (el) { el.addEventListener('input', generate); el.addEventListener('change', generate); });
        card.querySelector('[data-remove]').addEventListener('click', function () { card.remove(); generate(); });
        generate();
      }

      function resetExample() {
        listEl.innerHTML = '';
        seq = 0;
        addService('web', 'nginx:latest');
        var web = listEl.lastElementChild;
        web.querySelector('.svcContainer').value = 'simple-web';
        web.querySelector('.svcPorts').value = '8080:80';
        web.querySelector('.svcVolumes').value = './html:/usr/share/nginx/html';
        web.querySelector('.svcDepends').value = 'db';
        addService('db', 'postgres:16-alpine');
        var db = listEl.lastElementChild;
        db.querySelector('.svcContainer').value = 'simple-db';
        db.querySelector('.svcVolumes').value = './pgdata:/var/lib/postgresql/data';
        db.querySelector('.svcEnv').value = 'POSTGRES_DB=app\nPOSTGRES_USER=app\nPOSTGRES_PASSWORD=change-me';
        generate();
      }

      function generate() {
        var services = Array.prototype.map.call(listEl.querySelectorAll('.svcCard'), function (card) {
          return {
            name: card.querySelector('.svcName').value.trim(),
            image: card.querySelector('.svcImage').value.trim(),
            container: card.querySelector('.svcContainer').value.trim(),
            ports: list(card.querySelector('.svcPorts').value),
            volumes: list(card.querySelector('.svcVolumes').value),
            env: list(card.querySelector('.svcEnv').value),
            depends: list(card.querySelector('.svcDepends').value),
            command: card.querySelector('.svcCommand').value.trim(),
            restart: card.querySelector('.svcRestart').value
          };
        }).filter(function (s) { return s.name; });

        if (!services.length) { out.textContent = '还没有服务，请先添加一个服务。'; return; }
        var lines = ['services:'];
        services.forEach(function (s) {
          var name = s.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          lines.push('  ' + name + ':');
          lines.push('    image: ' + (scalar(s.image) || 'nginx:latest'));
          if (s.container) lines.push('    container_name: ' + scalar(s.container));
          if (s.restart) lines.push('    restart: ' + scalar(s.restart));
          if (s.command) lines.push('    command: ' + scalar(s.command));
          if (s.ports.length) {
            lines.push('    ports:');
            s.ports.forEach(function (x) { lines.push('      - ' + JSON.stringify(x)); });
          }
          if (s.volumes.length) {
            lines.push('    volumes:');
            s.volumes.forEach(function (x) { lines.push('      - ' + JSON.stringify(x)); });
          }
          if (s.env.length) {
            lines.push('    environment:');
            s.env.forEach(function (x) { lines.push('      - ' + JSON.stringify(x)); });
          }
          if (s.depends.length) {
            lines.push('    depends_on:');
            s.depends.forEach(function (x) { lines.push('      - ' + scalar(x)); });
          }
        });
        out.textContent = lines.join('\n');
      }

      TB.$('#cbAdd', root).addEventListener('click', function () { addService(); });
      TB.$('#cbExample', root).addEventListener('click', resetExample);
      TB.$('#cbCopy', root).addEventListener('click', function () { TB.copy(out.textContent); });
      TB.$('#cbDownload', root).addEventListener('click', function () {
        TB.downloadText(out.textContent + '\n', 'docker-compose.yml', 'text/yaml');
      });
      resetExample();
    }
  });
})();
