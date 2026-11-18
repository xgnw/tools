/* =============================================================================
 * Git / Docker 命令生成器
 * -----------------------------------------------------------------------------
 * 只生成可复制的命令文本，不执行任何命令。
 * 覆盖日常最常用的 Git 操作和 Docker 运行 / 构建 / 查看日志场景。
 * ========================================================================== */
(function () {
  'use strict';

  var GIT_ACTIONS = [
    { id: 'init', label: '初始化仓库', fields: [] },
    { id: 'clone', label: '克隆仓库', fields: [
      { key: 'url', label: '仓库地址', placeholder: 'https://github.com/user/repo.git', required: true }
    ] },
    { id: 'commit', label: '提交改动', fields: [
      { key: 'message', label: '提交说明', placeholder: '修复登录页样式', required: true },
      { key: 'stage', label: '先执行 git add -A', type: 'checkbox', checked: true }
    ] },
    { id: 'branch', label: '创建并切换分支', fields: [
      { key: 'branch', label: '分支名', placeholder: 'feature/login', required: true }
    ] },
    { id: 'push', label: '推送到远程', fields: [
      { key: 'remote', label: '远程名', value: 'origin' },
      { key: 'branch', label: '分支名', value: 'main' }
    ] },
    { id: 'pull', label: '拉取远程更新', fields: [
      { key: 'remote', label: '远程名', value: 'origin' },
      { key: 'branch', label: '分支名', value: 'main' }
    ] },
    { id: 'undo', label: '撤销最近一次提交（保留改动）', fields: [] },
    { id: 'tag', label: '创建附注标签', fields: [
      { key: 'tag', label: '标签名', placeholder: 'v1.2.0', required: true },
      { key: 'message', label: '标签说明', placeholder: '版本 1.2.0', required: true }
    ] }
  ];

  var DOCKER_ACTIONS = [
    { id: 'run', label: '运行容器', fields: [
      { key: 'image', label: '镜像', value: 'nginx:latest', required: true },
      { key: 'name', label: '容器名（可选）', placeholder: 'my-nginx' },
      { key: 'ports', label: '端口映射', placeholder: '8080:80，多个用逗号或换行分隔', type: 'textarea' },
      { key: 'env', label: '环境变量', placeholder: 'TZ=Asia/Shanghai，每行一个', type: 'textarea' },
      { key: 'volume', label: '目录挂载', placeholder: './data:/data，每行一个', type: 'textarea' },
      { key: 'detach', label: '后台运行（-d）', type: 'checkbox', checked: true }
    ] },
    { id: 'build', label: '构建镜像', fields: [
      { key: 'tag', label: '镜像标签', value: 'my-app:latest', required: true },
      { key: 'dockerfile', label: 'Dockerfile 路径', value: 'Dockerfile' },
      { key: 'context', label: '构建上下文', value: '.' },
      { key: 'noCache', label: '不使用缓存（--no-cache）', type: 'checkbox' }
    ] },
    { id: 'logs', label: '查看容器日志', fields: [
      { key: 'container', label: '容器名或 ID', placeholder: 'my-app', required: true },
      { key: 'tail', label: '显示最后 N 行', value: '100' }
    ] },
    { id: 'exec', label: '进入容器执行命令', fields: [
      { key: 'container', label: '容器名或 ID', placeholder: 'my-app', required: true },
      { key: 'command', label: '命令', value: 'sh' }
    ] },
    { id: 'compose', label: 'Docker Compose', fields: [
      { key: 'file', label: 'Compose 文件', value: 'docker-compose.yml' },
      { key: 'composeAction', label: '操作', type: 'select', options: [
        { value: 'up', label: '启动（up -d）' },
        { value: 'down', label: '停止并移除（down）' }
      ] }
    ] },
    { id: 'prune', label: '清理无用镜像 / 缓存（谨慎）', fields: [] }
  ];

  function arg(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return '';
    return /[\s"']/.test(text) ? '"' + text.replace(/"/g, '\\"') + '"' : text;
  }

  function splitLines(value) {
    return String(value || '').split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  TB.def({
    slug: 'gitdocker',
    cat: 'web',
    name: 'Git / Docker 命令生成器',
    desc: '按常用场景拼出可复制的 Git 和 Docker 命令，不用记参数。',
    icon: '🐳',
    kw: 'git docker 命令 生成器 clone commit push docker run build compose',
    render: function (ctx) {
      var root = ctx.root;
      var mode = 'git';

      root.innerHTML =
        '<div class="tabs" id="gdTabs" role="tablist">' +
          '<button class="tab on" type="button" data-mode="git" role="tab" aria-selected="true">Git</button>' +
          '<button class="tab" type="button" data-mode="docker" role="tab" aria-selected="false">Docker</button>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>操作场景</b></div>' +
            '<select class="select" id="gdAction"></select></div>' +
          '<div id="gdFields"></div>' +
          '<div class="btns">' +
            '<button class="btn primary" id="gdRun" type="button">生成命令</button>' +
            '<button class="btn" id="gdCopy" type="button">复制结果</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-h">命令结果 <span class="hint">生成后直接复制到终端</span></div>' +
          '<div class="out"><div class="out-b" id="gdOut" style="min-height:92px;color:var(--ink-3)">选择场景并填写参数后生成</div></div>' +
        '</div>' +
        '<p class="note">本工具只拼接命令文本，不会执行任何 Git 或 Docker 操作。运行前请确认当前目录、容器名和镜像标签；清理命令（prune）会删除未使用的镜像与缓存，请谨慎使用。</p>';

      var actionSel = TB.$('#gdAction', root);
      var fieldsBox = TB.$('#gdFields', root);
      var out = TB.$('#gdOut', root);
      var last = '';

      function actions() { return mode === 'git' ? GIT_ACTIONS : DOCKER_ACTIONS; }

      function fillActions() {
        actionSel.innerHTML = actions().map(function (a) {
          return '<option value="' + a.id + '">' + TB.esc(a.label) + '</option>';
        }).join('');
        renderFields();
      }

      function currentAction() {
        for (var i = 0; i < actions().length; i++) if (actions()[i].id === actionSel.value) return actions()[i];
        return actions()[0];
      }

      function renderFields() {
        var act = currentAction();
        fieldsBox.innerHTML = (act.fields || []).map(function (f) {
          var id = 'gd-f-' + f.key;
          var control;
          if (f.type === 'checkbox') {
            control = '<label style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2)">' +
              '<input type="checkbox" id="' + id + '"' + (f.checked ? ' checked' : '') + '> ' + TB.esc(f.label) + '</label>';
            return '<div class="field">' + control + '</div>';
          }
          if (f.type === 'select') {
            control = '<select class="select" id="' + id + '">' + (f.options || []).map(function (o) {
              return '<option value="' + TB.esc(o.value) + '">' + TB.esc(o.label) + '</option>';
            }).join('') + '</select>';
          } else if (f.type === 'textarea') {
            control = '<textarea class="textarea" id="' + id + '" rows="2" placeholder="' + TB.esc(f.placeholder || '') + '"></textarea>';
          } else {
            control = '<input class="input" id="' + id + '" value="' + TB.esc(f.value || '') + '" placeholder="' + TB.esc(f.placeholder || '') + '">';
          }
          return '<div class="field"><div class="label">' + TB.esc(f.label) + (f.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</div>' + control + '</div>';
        }).join('');
        out.textContent = '选择场景并填写参数后生成';
        out.style.color = 'var(--ink-3)';
        last = '';
      }

      function get(key) {
        var el = TB.$('#gd-f-' + key, root);
        if (!el) return '';
        return el.type === 'checkbox' ? el.checked : el.value.trim();
      }

      function requireValue(key, label) {
        var value = get(key);
        if (!value) {
          TB.toast('请填写' + label);
          var el = TB.$('#gd-f-' + key, root);
          if (el) el.focus();
          return '';
        }
        return value;
      }

      function buildGit(act) {
        if (act.id === 'init') return 'git init';
        if (act.id === 'clone') {
          var url = requireValue('url', '仓库地址');
          return url ? 'git clone ' + arg(url) : '';
        }
        if (act.id === 'commit') {
          var msg = requireValue('message', '提交说明');
          if (!msg) return '';
          var lines = [];
          if (get('stage')) lines.push('git add -A');
          lines.push('git commit -m ' + arg(msg));
          return lines.join('\n');
        }
        if (act.id === 'branch') {
          var branch = requireValue('branch', '分支名');
          return branch ? 'git checkout -b ' + arg(branch) : '';
        }
        if (act.id === 'push') {
          return 'git push -u ' + arg(get('remote') || 'origin') + ' ' + arg(get('branch') || 'main');
        }
        if (act.id === 'pull') {
          return 'git pull ' + arg(get('remote') || 'origin') + ' ' + arg(get('branch') || 'main');
        }
        if (act.id === 'undo') return 'git reset --soft HEAD~1';
        if (act.id === 'tag') {
          var tag = requireValue('tag', '标签名');
          var tagMsg = requireValue('message', '标签说明');
          return tag && tagMsg ? 'git tag -a ' + arg(tag) + ' -m ' + arg(tagMsg) : '';
        }
        return '';
      }

      function buildDocker(act) {
        if (act.id === 'run') {
          var image = requireValue('image', '镜像');
          if (!image) return '';
          var parts = ['docker', 'run'];
          if (get('detach')) parts.push('-d');
          if (get('name')) parts.push('--name ' + arg(get('name')));
          splitLines(get('ports')).forEach(function (p) { parts.push('-p ' + arg(p)); });
          splitLines(get('env')).forEach(function (e) { parts.push('-e ' + arg(e)); });
          splitLines(get('volume')).forEach(function (v) { parts.push('-v ' + arg(v)); });
          parts.push(arg(image));
          return parts.join(' ');
        }
        if (act.id === 'build') {
          var tag = requireValue('tag', '镜像标签');
          if (!tag) return '';
          var cmd = 'docker build -t ' + arg(tag);
          if (get('dockerfile')) cmd += ' -f ' + arg(get('dockerfile'));
          if (get('noCache')) cmd += ' --no-cache';
          cmd += ' ' + arg(get('context') || '.');
          return cmd;
        }
        if (act.id === 'logs') {
          var container = requireValue('container', '容器名');
          if (!container) return '';
          return 'docker logs -f --tail ' + arg(get('tail') || '100') + ' ' + arg(container);
        }
        if (act.id === 'exec') {
          var execContainer = requireValue('container', '容器名');
          if (!execContainer) return '';
          return 'docker exec -it ' + arg(execContainer) + ' ' + arg(get('command') || 'sh');
        }
        if (act.id === 'compose') {
          var file = get('file') || 'docker-compose.yml';
          return 'docker compose -f ' + arg(file) + (get('composeAction') === 'down' ? ' down' : ' up -d');
        }
        if (act.id === 'prune') return 'docker system prune -af';
        return '';
      }

      function run() {
        var act = currentAction();
        var text = mode === 'git' ? buildGit(act) : buildDocker(act);
        if (!text) return;
        last = text;
        out.textContent = text;
        out.style.color = 'var(--ink)';
      }

      TB.$('#gdRun', root).addEventListener('click', run);
      TB.$('#gdCopy', root).addEventListener('click', function () {
        if (!last) { TB.toast('请先生成命令'); return; }
        TB.copy(last);
      });
      actionSel.addEventListener('change', function () {
        renderFields();
      });
      TB.$$('.tab', root).forEach(function (tab) {
        tab.addEventListener('click', function () {
          mode = tab.getAttribute('data-mode');
          TB.$$('.tab', root).forEach(function (x) {
            x.classList.toggle('on', x === tab);
            x.setAttribute('aria-selected', x === tab ? 'true' : 'false');
          });
          fillActions();
        });
      });

      fillActions();
    }
  });
})();
