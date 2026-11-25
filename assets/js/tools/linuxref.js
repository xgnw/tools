/* =============================================================================
 * Linux 命令速查
 * -----------------------------------------------------------------------------
 * 纯静态命令清单：按分类筛选、关键词搜索、一键复制示例。
 * 示例以 GNU/Linux 为主；不同发行版的参数可能略有差异。
 * ========================================================================== */

(function () {
  'use strict';

  var CMDS = [
    /* 文件与目录 */
    { c: 'ls', d: '列出目录内容', e: 'ls -lah', g: '文件与目录', k: 'list 目录 文件 隐藏 权限' },
    { c: 'cd', d: '切换当前目录', e: 'cd /var/log', g: '文件与目录', k: 'change directory 目录' },
    { c: 'pwd', d: '显示当前所在路径', e: 'pwd', g: '文件与目录', k: 'print working directory 路径' },
    { c: 'mkdir', d: '创建目录，-p 可递归创建', e: 'mkdir -p /data/app/logs', g: '文件与目录', k: 'make directory 新建 目录' },
    { c: 'rmdir', d: '删除空目录', e: 'rmdir empty-dir', g: '文件与目录', k: 'remove directory 空目录' },
    { c: 'rm', d: '删除文件或目录，-i 交互确认', e: 'rm -i old.log', g: '文件与目录', k: 'remove 删除', w: '删除前确认路径' },
    { c: 'cp', d: '复制文件或目录，-a 保留属性', e: 'cp -a src/ backup/', g: '文件与目录', k: 'copy 复制 备份' },
    { c: 'mv', d: '移动或重命名文件', e: 'mv old.txt new.txt', g: '文件与目录', k: 'move 移动 重命名' },
    { c: 'touch', d: '创建空文件或更新时间戳', e: 'touch app.log', g: '文件与目录', k: '创建 文件 时间' },
    { c: 'ln', d: '创建硬链接或软链接，-s 为软链接', e: 'ln -s /data/app current', g: '文件与目录', k: 'link 链接 软链接' },
    { c: 'tree', d: '树形展示目录结构', e: 'tree -L 2', g: '文件与目录', k: '目录 树 层级' },
    { c: 'find', d: '按名称、时间、大小查找文件', e: 'find . -name "*.log" -mtime +7', g: '文件与目录', k: '查找 文件 时间 大小' },
    { c: 'locate', d: '从索引快速查找路径，需先 updatedb', e: 'locate nginx.conf', g: '文件与目录', k: '查找 路径 索引' },
    { c: 'stat', d: '查看 inode、权限与时间信息', e: 'stat file.txt', g: '文件与目录', k: '文件 详情 权限 时间' },
    { c: 'file', d: '判断文件实际类型', e: 'file archive.bin', g: '文件与目录', k: '文件 类型 格式' },
    { c: 'du', d: '统计目录占用空间', e: 'du -sh * | sort -h', g: '文件与目录', k: 'disk usage 大小 空间' },
    { c: 'df', d: '查看文件系统磁盘空间', e: 'df -h', g: '文件与目录', k: 'disk free 磁盘 空间' },
    { c: 'tar', d: '打包或解压 tar 归档', e: 'tar -czf backup.tar.gz data/', g: '文件与目录', k: '打包 压缩 解压 归档' },
    { c: 'tar -x', d: '解压 tar.gz 归档', e: 'tar -xzf backup.tar.gz', g: '文件与目录', k: '解压 归档' },
    { c: 'gzip', d: '压缩文件，-k 保留原文件', e: 'gzip -k access.log', g: '文件与目录', k: '压缩 gz' },
    { c: 'unzip', d: '解压 zip 文件到指定目录', e: 'unzip archive.zip -d out/', g: '文件与目录', k: '解压 zip' },
    { c: 'rsync', d: '增量同步目录，--delete 会删除目标多余文件', e: 'rsync -av src/ dest/', g: '文件与目录', k: '同步 备份 增量', w: '使用 --delete 前先试运行' },
    { c: 'scp', d: '通过 SSH 复制文件到远程主机', e: 'scp file user@host:/path/', g: '文件与目录', k: '远程 复制 ssh' },
    { c: 'wget', d: '下载文件，-c 支持断点续传', e: 'wget -c https://example.com/file.zip', g: '文件与目录', k: '下载 断点 续传' },
    { c: 'curl', d: '请求 URL 或查看响应头', e: 'curl -I https://example.com', g: '文件与目录', k: 'http 请求 响应头' },
    { c: 'mount', d: '挂载设备到目录', e: 'mount /dev/sdb1 /mnt/data', g: '文件与目录', k: '挂载 磁盘 设备' },
    { c: 'umount', d: '卸载已挂载的设备', e: 'umount /mnt/data', g: '文件与目录', k: '卸载 挂载' },
    { c: 'lsblk', d: '查看块设备与文件系统', e: 'lsblk -f', g: '文件与目录', k: '磁盘 分区 设备' },
    { c: 'fdisk', d: '查看或编辑分区表', e: 'fdisk -l', g: '文件与目录', k: '分区 磁盘', w: '写分区表前备份数据' },
    { c: 'mkfs', d: '格式化分区为指定文件系统', e: 'mkfs.ext4 /dev/sdb1', g: '文件与目录', k: '格式化 文件系统', w: '会清空目标分区' },
    { c: 'dd', d: '按块复制镜像或写盘', e: 'dd if=input.iso of=output.img bs=4M status=progress', g: '文件与目录', k: '镜像 写盘 复制', w: 'of= 写错设备会丢数据' },
    { c: 'chmod', d: '修改文件权限', e: 'chmod 644 file.txt', g: '文件与目录', k: '权限 rwx 755 644' },
    { c: 'chown', d: '修改文件属主与属组', e: 'chown -R www-data:www-data /var/www', g: '文件与目录', k: '所有者 用户 组 权限' },
    { c: 'chgrp', d: '修改文件所属组', e: 'chgrp developers project/', g: '文件与目录', k: '用户组 权限' },
    { c: 'umask', d: '查看或设置默认权限掩码', e: 'umask 022', g: '文件与目录', k: '默认权限 掩码' },

    /* 文本处理 */
    { c: 'cat', d: '输出文件内容', e: 'cat file.txt', g: '文本处理', k: '查看 文件 内容' },
    { c: 'less', d: '分页查看大文件', e: 'less /var/log/syslog', g: '文本处理', k: '分页 查看 日志' },
    { c: 'head', d: '查看文件开头若干行', e: 'head -n 20 file.txt', g: '文本处理', k: '开头 行 日志' },
    { c: 'tail', d: '查看文件末尾，-f 实时跟踪', e: 'tail -f app.log', g: '文本处理', k: '末尾 实时 日志' },
    { c: 'grep', d: '按模式搜索文本，-R 递归', e: 'grep -Rni "error" /var/log', g: '文本处理', k: '搜索 过滤 正则 日志' },
    { c: 'sed', d: '流式替换或编辑文本，-i 直接改文件', e: "sed -i 's/old/new/g' file.txt", g: '文本处理', k: '替换 编辑 正则', w: '-i 会直接修改原文件' },
    { c: 'awk', d: '按列提取和处理文本', e: "awk '{print $1, $3}' access.log", g: '文本处理', k: '列 提取 统计 文本' },
    { c: 'sort', d: '按行或指定列排序', e: 'sort -k2 -nr file.txt', g: '文本处理', k: '排序 列' },
    { c: 'uniq', d: '去重或统计重复行', e: 'sort file.txt | uniq -c', g: '文本处理', k: '去重 计数' },
    { c: 'cut', d: '按分隔符或字符位置取列', e: 'cut -d: -f1 /etc/passwd', g: '文本处理', k: '列 分隔符' },
    { c: 'tr', d: '替换或删除字符', e: "tr 'A-Z' 'a-z' < input.txt", g: '文本处理', k: '字符 替换 大小写' },
    { c: 'wc', d: '统计行数、词数、字节数', e: 'wc -l file.txt', g: '文本处理', k: '行数 字数 统计' },
    { c: 'diff', d: '比较两个文件的差异', e: 'diff -u old.txt new.txt', g: '文本处理', k: '比较 差异 补丁' },
    { c: 'tee', d: '同时输出到屏幕和文件', e: 'command | tee output.log', g: '文本处理', k: '管道 输出 日志' },
    { c: 'xargs', d: '把输入转成命令参数批量处理', e: 'find . -name "*.tmp" -print0 | xargs -0 rm -f', g: '文本处理', k: '批量 管道 参数', w: '先打印确认再执行删除' },
    { c: 'jq', d: '解析、过滤和格式化 JSON', e: "jq '.items[] | .name' data.json", g: '文本处理', k: 'json 解析 格式化' },
    { c: 'column', d: '把文本按列对齐', e: 'column -t file.txt', g: '文本处理', k: '对齐 表格 列' },

    /* 进程与系统 */
    { c: 'ps', d: '查看当前进程', e: 'ps aux | grep nginx', g: '进程与系统', k: '进程 状态' },
    { c: 'top', d: '实时查看 CPU、内存和进程', e: 'top', g: '进程与系统', k: 'cpu 内存 进程 监控' },
    { c: 'htop', d: '交互式进程查看器', e: 'htop', g: '进程与系统', k: '进程 监控 交互' },
    { c: 'kill', d: '向进程发送信号，默认 TERM', e: 'kill -15 1234', g: '进程与系统', k: '结束 进程 信号' },
    { c: 'killall', d: '按进程名结束进程', e: 'killall nginx', g: '进程与系统', k: '结束 进程 名称' },
    { c: 'pkill', d: '按命令行模式结束进程', e: 'pkill -f "python app.py"', g: '进程与系统', k: '结束 进程 匹配' },
    { c: 'jobs', d: '查看当前 shell 的后台任务', e: 'jobs -l', g: '进程与系统', k: '后台 任务' },
    { c: 'bg', d: '让暂停的任务在后台继续', e: 'bg %1', g: '进程与系统', k: '后台 任务' },
    { c: 'fg', d: '把后台任务切回前台', e: 'fg %1', g: '进程与系统', k: '前台 任务' },
    { c: 'nohup', d: '脱离终端运行命令并写日志', e: 'nohup ./run.sh > run.log 2>&1 &', g: '进程与系统', k: '后台 守护 日志' },
    { c: 'free', d: '查看内存与交换分区', e: 'free -h', g: '进程与系统', k: '内存 swap' },
    { c: 'uptime', d: '查看运行时间与系统负载', e: 'uptime', g: '进程与系统', k: '负载 运行时间' },
    { c: 'uname', d: '查看内核与系统架构', e: 'uname -a', g: '进程与系统', k: '内核 架构 系统' },
    { c: 'hostname', d: '查看主机名，-I 查看 IP', e: 'hostname -I', g: '进程与系统', k: '主机名 ip' },
    { c: 'whoami', d: '查看当前用户', e: 'whoami', g: '进程与系统', k: '用户 身份' },
    { c: 'id', d: '查看用户与组 ID', e: 'id', g: '进程与系统', k: '用户 组 uid gid' },
    { c: 'sudo', d: '以其他用户身份执行命令', e: 'sudo systemctl restart nginx', g: '进程与系统', k: '提权 root 权限' },
    { c: 'systemctl', d: '管理 systemd 服务', e: 'systemctl status nginx', g: '进程与系统', k: '服务 启动 状态 systemd' },
    { c: 'journalctl', d: '查看 systemd 日志，-f 实时跟踪', e: 'journalctl -u nginx -f', g: '进程与系统', k: '日志 服务 systemd' },
    { c: 'dmesg', d: '查看内核日志，-T 显示时间', e: 'dmesg -T | tail -n 50', g: '进程与系统', k: '内核 日志 硬件' },
    { c: 'crontab', d: '编辑当前用户的定时任务', e: 'crontab -e', g: '进程与系统', k: '定时 任务 cron' },
    { c: 'at', d: '安排一次性定时任务', e: 'echo "./backup.sh" | at 02:00', g: '进程与系统', k: '定时 一次性 任务' },
    { c: 'history', d: '查看命令历史', e: 'history | tail -n 20', g: '进程与系统', k: '历史 命令' },

    /* 网络 */
    { c: 'ip', d: '查看和配置网络接口', e: 'ip addr show', g: '网络', k: 'ip 网卡 地址 路由' },
    { c: 'ss', d: '查看监听端口和连接', e: 'ss -lntp', g: '网络', k: '端口 连接 监听' },
    { c: 'ping', d: '测试网络连通性', e: 'ping -c 4 example.com', g: '网络', k: '连通性 延迟' },
    { c: 'traceroute', d: '查看到目标的路由路径', e: 'traceroute example.com', g: '网络', k: '路由 路径' },
    { c: 'dig', d: '查询 DNS 记录', e: 'dig example.com +short', g: '网络', k: 'dns 域名 解析' },
    { c: 'nslookup', d: '查询域名 DNS 记录', e: 'nslookup example.com', g: '网络', k: 'dns 域名 解析' },
    { c: 'host', d: '查询域名对应地址', e: 'host example.com', g: '网络', k: 'dns 域名 地址' },
    { c: 'ssh', d: '登录远程主机或执行远程命令', e: 'ssh user@host', g: '网络', k: '远程 登录 ssh' },
    { c: 'nc', d: '探测端口或做简单网络调试', e: 'nc -zv host 443', g: '网络', k: '端口 探测 netcat' },
    { c: 'tcpdump', d: '抓取网络流量，需要相应权限', e: 'tcpdump -i eth0 port 443', g: '网络', k: '抓包 流量 网络' },
    { c: 'curl -X', d: '发送 POST JSON 请求', e: "curl -X POST -H 'Content-Type: application/json' -d '{\"a\":1}' https://api.example.com", g: '网络', k: 'http post json api' },

    /* 包管理 */
    { c: 'apt', d: 'Debian / Ubuntu 安装与更新软件', e: 'sudo apt update && sudo apt install nginx', g: '包管理', k: 'debian ubuntu 安装 软件' },
    { c: 'dnf', d: 'Fedora / RHEL 安装软件', e: 'sudo dnf install nginx', g: '包管理', k: 'fedora rhel 安装 软件' },
    { c: 'yum', d: 'CentOS 7 等旧版 RPM 系统安装软件', e: 'sudo yum install nginx', g: '包管理', k: 'centos 安装 软件' },
    { c: 'pacman', d: 'Arch Linux 安装软件', e: 'sudo pacman -S nginx', g: '包管理', k: 'arch 安装 软件' },
    { c: 'apk', d: 'Alpine Linux 安装软件', e: 'sudo apk add nginx', g: '包管理', k: 'alpine 安装 软件' },
    { c: 'brew', d: 'macOS / Linuxbrew 安装软件', e: 'brew install nginx', g: '包管理', k: 'macos brew 安装 软件' },

    /* 开发 */
    { c: 'git status', d: '查看工作区与暂存区状态', e: 'git status -sb', g: '开发', k: 'git 状态 分支' },
    { c: 'git log', d: '查看提交历史', e: 'git log --oneline -10', g: '开发', k: 'git 提交 历史' },
    { c: 'git diff', d: '查看未提交的改动', e: 'git diff --stat', g: '开发', k: 'git 差异 改动' },
    { c: 'git branch', d: '查看本地分支与跟踪关系', e: 'git branch -vv', g: '开发', k: 'git 分支 远程' },
    { c: 'docker ps', d: '查看运行中的容器', e: 'docker ps', g: '开发', k: 'docker 容器 状态' },
    { c: 'docker logs', d: '查看容器日志，-f 实时跟踪', e: 'docker logs -f --tail 100 web', g: '开发', k: 'docker 日志 容器' },
    { c: 'docker compose', d: '启动 compose 服务', e: 'docker compose up -d', g: '开发', k: 'docker compose 服务' },
    { c: 'make', d: '按 Makefile 构建，-j 并行', e: 'make -j4', g: '开发', k: '构建 编译 makefile' },
    { c: 'gcc', d: '编译 C 程序', e: 'gcc -O2 -o app main.c', g: '开发', k: 'c 编译 gcc' },
    { c: 'python3', d: '启动临时 HTTP 服务或运行脚本', e: 'python3 -m http.server 8000', g: '开发', k: 'python 服务 脚本' },
    { c: 'node', d: '查看 Node.js 版本', e: 'node -v', g: '开发', k: 'nodejs 版本' },
    { c: 'npm', d: '运行项目脚本或安装依赖', e: 'npm run build', g: '开发', k: 'node npm 构建' },
    { c: 'ssh-keygen', d: '生成 SSH 密钥', e: 'ssh-keygen -t ed25519 -C "me@example.com"', g: '开发', k: 'ssh 密钥 生成' },
    { c: 'openssl', d: '查看证书文本信息', e: 'openssl x509 -in cert.pem -text -noout', g: '开发', k: '证书 ssl x509' }
  ];

  function categoryList() {
    var map = {}, cats = [];
    CMDS.forEach(function (x) {
      if (!map[x.g]) { map[x.g] = true; cats.push(x.g); }
    });
    return ['全部'].concat(cats);
  }

  TB.def({
    slug: 'linux-ref', cat: 'web', name: 'Linux 命令速查', icon: '🐧',
    desc: '常用 Linux 命令、示例与分类检索',
    kw: 'linux shell bash 命令 速查 运维 grep sed awk systemctl docker',
    render: function (ctx) {
      var root = ctx.root;
      var cats = categoryList();
      var active = '全部';

      root.innerHTML =
        '<div class="panel">' +
          '<div class="lx-toolbar">' +
            '<input class="input" id="lxQ" type="text" placeholder="搜索命令、用途或示例，如 日志、端口、tar" autocomplete="off">' +
            '<button class="btn" type="button" id="lxClear">清空</button>' +
          '</div>' +
          '<div class="tabs" id="lxTabs">' + cats.map(function (c) {
            return '<button class="tab' + (c === active ? ' on' : '') + '" type="button" data-lx-cat="' + TB.esc(c) + '">' + TB.esc(c) + '</button>';
          }).join('') + '</div>' +
          '<div class="lx-meta" id="lxMeta"></div>' +
          '<div class="lx-list" id="lxList"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">使用说明</div>' +
          '<div class="note">示例以 GNU/Linux 为主，不同发行版和 BSD 的参数可能不同。标注“谨慎”的命令会修改或删除数据，执行前先确认路径、设备和备份；不确定时先用 --help、man 或试运行参数检查。</div>' +
        '</div>';

      var qEl = TB.$('#lxQ', root);
      var listEl = TB.$('#lxList', root);
      var metaEl = TB.$('#lxMeta', root);

      function render() {
        var q = qEl.value.trim().toLowerCase();
        var list = CMDS.filter(function (x) {
          if (active !== '全部' && x.g !== active) return false;
          if (!q) return true;
          return (x.c + ' ' + x.d + ' ' + x.e + ' ' + x.g + ' ' + x.k).toLowerCase().indexOf(q) >= 0;
        });
        metaEl.textContent = '共 ' + CMDS.length + ' 条 · 当前 ' + list.length + ' 条';
        if (!list.length) {
          listEl.innerHTML = '<div class="empty">没有找到匹配的命令，换个关键词试试。</div>';
          return;
        }
        listEl.innerHTML = list.map(function (x) {
          var idx = CMDS.indexOf(x);
          return '<div class="lx-item">' +
            '<div class="lx-head"><code class="lx-cmd">' + TB.esc(x.c) + '</code>' +
              '<span class="lx-desc">' + TB.esc(x.d) + '</span>' +
              '<span class="lx-tag">' + TB.esc(x.g) + '</span>' +
              (x.w ? '<span class="lx-warn">谨慎</span>' : '') + '</div>' +
            '<div class="lx-ex"><code>' + TB.esc(x.e) + '</code>' +
              '<button class="btn" type="button" data-lx-copy="' + idx + '">复制</button></div>' +
            (x.w ? '<div class="lx-note">' + TB.esc(x.w) + '</div>' : '') +
            '</div>';
        }).join('');
      }

      TB.$('#lxTabs', root).addEventListener('click', function (e) {
        var btn = e.target;
        if (!btn || btn.tagName !== 'BUTTON') return;
        active = btn.getAttribute('data-lx-cat') || '全部';
        TB.$$('[data-lx-cat]', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
        render();
      });

      qEl.addEventListener('input', TB.debounce(render, 120));
      TB.$('#lxClear', root).addEventListener('click', function () {
        qEl.value = '';
        active = '全部';
        TB.$$('[data-lx-cat]', root).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lx-cat') === '全部'); });
        render();
      });

      listEl.addEventListener('click', function (e) {
        var btn = e.target;
        if (!btn || !btn.getAttribute || btn.getAttribute('data-lx-copy') === null) return;
        var item = CMDS[parseInt(btn.getAttribute('data-lx-copy'), 10)];
        if (!item) return;
        TB.copy(item.e);
      });

      render();
    }
  });

})();
