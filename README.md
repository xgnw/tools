# 简单工具箱

> GitHub 仓库：<https://github.com/xgnw/tools>，仓库名为 `tools`；仓库根目录就是本站根目录。

一个可以直接丢到 GitHub Pages / Cloudflare Pages 的纯静态在线工具站：186 个 PDF、图片、文档、表格、开发者、数据、AI 辅助与休闲工具，**全部在浏览器本地运行，没有登录、没有次数限制、文件不上传服务器**。

> 主参考 [vimon.cc/tools](https://www.vimon.cc/tools/) 的信息架构与视觉语言重写，但代码是自己写的原生实现：没有 iframe、没有框架、没有构建步骤，也不需要后端。不同批次的工具清单还参考过懒人工具、Ctool、PiliApp 等，完整来源见下方「参考过的源站」。

## 参考过的源站

下表按主要参考顺序列出。**只参考信息架构、交互方式、功能点或工具清单，不搬运源站代码、素材和打包产物**；具体接入与未接入项见后文各批次章节。

| 源站 | 地址 | 主要参考内容 | 落地方式 |
|---|---|---|---|
| VIMON Tools | <https://www.vimon.cc/tools/> | 首页信息架构、分类与卡片布局、整体视觉语言 | 全站主参考；用原生 HTML/CSS/JS 重写 |
| Z2H 字帖 | <https://z2h.cn/> | 字帖类型、描红参数与打印流程 | 参考使用路径，重写为本地 `worksheet.js`；未内置笔顺动画 |
| 懒人工具 | <https://www.lanren-tools.com/> | 左侧菜单结构、白色圆角菜单卡、无顶栏布局、全站 Alt 快捷键 | 侧栏与快捷键按本站结构简化；见 `core.js` 的 `TB.buildSide` 与 `app.css` 侧栏段 |
| passer-by | <https://passer-by.com/project.html> | 工具项目清单 | 选取 10 项按功能点原生重写，未照搬代码 |
| Ctool | <https://ctool.dev/> | 开发 / 站长类工具清单 | 只取功能点；未移植 Vue 打包产物 |
| IT Toolbox | <https://github.com/Zoroaaa/it-toolbox> | 140+ 工具清单与分类方式 | 只挑纯前端、可本地处理的能力，原生重写 |
| 工具邦 PiliApp | <https://cn.piliapp.com/> | 纯前端小工具清单 | 新代码集中在 `assets/js/tools/piliapp.js` |
| QuickSO 超级书签 | <https://quickso.cn/supermark.html> | `javascript:` 书签脚本清单 | 改造成可复制 / 拖拽的「超级书签」合集，见 `quickso.js` |
| MKBlog Tool | <https://tool.mkblog.cn/> | 60 个工具条目 | 逐项比对后接入 8 个，见 `mkblog.js`、`mkblog2.js` |
| NewKit | <https://www.newkit.site/tools/> | 233 个工具的功能清单与分类方式 | 第一批接入 6 个纯静态工具（`jsonschema.js`、`toml.js`、`csvsql.js`、`favicon.js`、`pdfsign.js`、`mdtable.js`）；第二批 6 个（`wifiqr.js`、`gitdocker.js`、`csslayout.js`、`seo.js`、`mask.js`、`bankcard.js`）；第三批 6 个（`screenshot.js`、`socialcrop.js`、`imgfilter.js`、`httpref.js`、`passstrength.js`、`compound.js`）；第四批 6 个（`pivot.js`、`compose.js`、`nginx.js`、`wordcloud.js`、`tts.js`、`mindmap.js`）；第五批 6 个（`jsonzod.js`、`chmod.js`、`keyword.js`、`jsonld.js`、`utm.js`、`invest.js`）；第六批 6 个（`headers.js`、`graphql.js`、`html2md.js`、`jsontree.js`、`socguide.js`、`asciiart.js`）；第七批 6 个（`cssfmt.js`、`uuidparse.js`、`yamlview.js`、`commitgen.js`、`scicalc.js`、`invoicetax.js`）；第八批 6 个（`cronbuild.js`、`cssvars.js`、`radiusgen.js`、`jsoncsv.js`、`tzconv.js`、`matrixcalc.js`） |
| BWmelon/qrcode | <https://github.com/BWmelon/qrcode> | 二维码 / 收款码功能点 | 仅参考功能；仓库无 LICENSE 且依赖外部服务，未整包接入 |

另有两个本地参考目录，不是线上站点：

- 用户提供的 `tool` 目录：7 组独立页面，选取 4 个纯前端工具重写，代码在 `assets/js/tools/sourcepack.js`。
- `WWW/wx` 微信名片页面：参考交互与结构，重写为 `assets/js/tools/wechatcard.js`，并移除原页的 jQuery、html2canvas 与第三方 CDN 依赖。

## 与「简单导航网」的关系

- 主站：**简单导航网** → <https://432600.xyz/>
- 工具站：**简单工具箱** → <https://tools.432600.xyz/>
- 源码：<https://github.com/xgnw/tools>
- 品牌：共用“简单”前缀；工具站 Logo 使用「简 + 工具」组合标
- 互导：工具站侧栏底部 / 页脚 / 关于页都有“简单导航网”入口；主站导航栏增加“简单工具箱”入口，本站独立部署在 `https://tools.432600.xyz/`

## 它和主参考站有什么不同

| | 主参考站 | 本项目 |
|---|---|---|
| 账号体系 | 有登录 / 会员 / 额度 | 完全没有，打开即用 |
| 文件处理 | 部分功能依赖服务端 | 全部用浏览器 API（pdf-lib、pdf.js、SheetJS、Canvas、WebCrypto、JSZip） |
| 部署 | 需要服务器 | 静态文件，任意静态托管 |
| 依赖 | 多个 CDN | 十三个库全部本地放在 `assets/lib/`，用到才加载，首屏零依赖 |
| 热门榜 | 服务端统计 | 用 localStorage 记录本机使用次数 |

## 工具清单（186 个）

| 分类 | 数量 | 工具 |
|---|---|---|
| 办公文档 | 32 | PDF 合并 / 拆分 / 页面管理 / 压缩 / 尺寸调整 / 加水印 / 加页码 / 转图片、图片转 PDF、PDF 镜像翻转 / 页面裁剪、PDF 签名、Word 批量替换 / 清理痕迹 / 公文排版、Word 转 Excel、PDF 转 Markdown / PDF 转 Word、CSV ⇄ Excel、CSV → SQL、JSON 转 Excel、HTML 表格转 Excel、表格合并 / 拆分、Excel 转 Word、Excel 比对、批量重命名、ZIP 压缩 / 解压、虚拟键盘、轻量文本编辑器、智能待办清单、数据透视表生成器、浏览器文本朗读 |
| 图片处理 | 24 | 图片转换压缩、图片拼接、九宫格、加水印、图片转 Base64、SVG 转 PNG、占位图、印章生成、二维码美化（背景 / Logo）、二维码识别、收款码三合一、图片裁剪 / 旋转、随机色头像、微信名片生成器、图片取色器、证件照尺寸修改、四点透视矫正、图片颜色替换、Favicon 生成器、截图美化、社媒尺寸裁剪、图片滤镜、文字云生成器、社交媒体尺寸指南 |
| 文档创作 | 10 | Markdown 预览、Markdown 表格生成器、组织架构图、甘特图、座位牌、简繁转换、歌词转字幕、拼音转换、字帖生成、Markdown 思维导图 |
| 站长工具 | 72 | 编码转换、时间戳、JSON 格式化、正则测试、Cron 解析、命名转换、颜色转换、文本工具、二维码（含批量）、WiFi 二维码、文本 Diff、.gitignore、robots.txt、TOTP、IP 子网、哈希、SEO 分享预览、SEO 套件、浏览器与设备、JWT 解析、YAML ⇄ JSON、TOML ⇄ JSON、SQL 格式化、条码生成、CRC 校验、请求片段生成、XML 格式化、HMAC 签名、JSON 转类型、JSONPath 查询、CSS 生成器、CSS Grid / Flexbox 生成器、Git / Docker 命令生成器、对比度检测、ID 生成、假数据生成、文本相似度、酷炫文字生成、特殊符号大全、超级书签、网页可视化编辑、屏幕检测、屏幕常亮、键盘键码、新拟态生成、毛玻璃生成、SVG 海浪、SVG 压缩、JSON 扁平化 ⇄ 反扁平化、JSON ⇄ SQL、JSON Schema 构建器、HTTP 状态码 / MIME / 端口速查、密码强度检测、Docker Compose 配置生成器、Nginx 配置生成器、JSON → Zod Schema、Chmod 计算器、关键词密度分析器、JSON-LD 结构化数据生成器、UTM 参数生成器、HTTP Headers 分析、GraphQL 格式化、HTML → Markdown、JSON 树形可视化、ASCII Art 文字、CSS 美化 / 压缩、UUID 解析器、YAML 可视化查看器、Git Commit 生成器、Crontab 生成器、CSS 变量生成器、圆角生成器 |
| 数据驿站 | 21 | 房贷、个税、折扣 / 百分比、单位换算、算钱神器、身份证解析、精确小数计算、汇率换算、进制转换、屏幕量尺、数字转大写、法定退休年龄计算器、数据脱敏、银行卡校验、复利计算器、投资分析计算器、科学计算器、发票税率换算器、JSON → CSV、时区转换器、矩阵计算器 |
| AI 工具集 | 6 | 28 条中文提示词、Token 估算、提示词模板填充、系统提示词生成、AI 绘图提示词、模型成本估算 |
| 休闲娱乐 | 21 | 随机数、UUID / 密码、日期差、BMI、年龄星座生肖、世界时钟、桌面时钟、今天吃什么、番茄钟、万年历、24 点计算、五子棋、迷宫寻路、轮盘抽选、记分板、在线秒表、倒计时器、手机跑马灯、掷筊、亲戚称谓计算器、摩斯密码 |

## 目录结构

```
tools/
├── index.html               # 唯一入口（hash 路由，不需要服务端 rewrite）
├── pay.html                 # 收款码三合一的可扫码收款页（纯静态）
├── .nojekyll                # 关掉 GitHub Pages 的 Jekyll 处理
├── assets/
│   ├── favicon.svg
│   ├── css/app.css          # 设计令牌 + 布局 + 组件 + 响应式 + 打印样式
│   ├── js/
│   │   ├── core.js          # 工具注册表、路由、搜索、主题、农历/天气、日历弹窗
│   │   ├── boot.js          # 启动
│   │   └── tools/
│   │       ├── office.js    # PDF 合并 / 拆分 / 图片转 PDF / 加页码 / Word 批量替换
│   │       ├── pdfx.js      # PDF 页面管理 / 压缩 / 尺寸调整 / 加水印
│   │       ├── sheet.js     # CSV⇄Excel / JSON 转 Excel / HTML 表格 / 表格合并 / 拆分
│   │       ├── wordx.js     # Word 清理痕迹 / 公文排版 / Word 转 Excel
│   │       ├── conv.js      # PDF 转 Markdown / PDF 转 Word / Excel 转 Word / Excel 比对
│   │       ├── extra.js     # SEO 分享预览 / 批量重命名
│   │       ├── small.js     # 桌面时钟 / 算钱神器
│   │       ├── kit.js       # 万年历 / 身份证解析 / 设备信息 / 24 点 / 精确小数 / 汇率 / 简繁
│   │       ├── play.js      # 五子棋 / 迷宫寻路 / 二维码美化（背景 + Logo）
│   │       ├── payqr.js     # 收款码三合一（jsQR 本地解码 + qrcode 本地生成）
│   │       ├── devx.js      # JWT / YAML⇄JSON / SQL / 条码 / CRC / 歌词转字幕 / 请求片段 / 进制
│   │       ├── lab.js       # XML / HMAC / JSON 转类型 / JSONPath / CSS 生成 / 对比度 /
│   │       │                # ID 生成 / 假数据 / 文本相似度 / 二维码识别
│   │       ├── image.js     # 图片转换、拼接、九宫格、水印、Base64、SVG→PNG、占位图、印章
│   │       ├── doc.js       # Markdown 预览、组织架构图、甘特图、座位牌
│   │       ├── worksheet.js # 字帖生成（汉字 / 英文 / 数字 / 拼音 / 控笔，A4 打印）
│   │       ├── web.js       # 编码、时间戳、JSON、正则、Cron、命名、颜色、文本、二维码、
│   │       │                # Diff、.gitignore、robots、TOTP、子网、哈希
│   │       ├── data.js      # 房贷、个税、折扣、单位换算
│   │       ├── ai.js        # 中文提示词库
│   │       ├── ai2.js       # Token 估算 / 模板填充 / 系统提示词 / 绘图提示词 / 成本估算
│   │       ├── mkblog.js   # 数字转大写 / PDF 转图片 / 键盘键码 / 摩斯密码
│   │       ├── mkblog2.js  # 新拟态 / 毛玻璃 / SVG 海浪 / SVG 压缩
│   │       ├── retire.js   # 法定退休年龄计算器
│   │       ├── jsonflat.js # JSON 扁平化 ⇄ 反扁平化
│   │       ├── eyedrop.js  # 图片取色器
│   │       ├── idphoto.js  # 证件照尺寸修改
│   │       ├── perspective.js # 四点透视矫正
│   │       ├── editor.js   # 轻量文本编辑器
│   │       ├── todo.js     # 智能待办清单（自然语言日期 / 优先级）
│   │       ├── jsonsql.js  # JSON ⇄ SQL（建表 / INSERT 解析）
│   │       ├── pinyin.js   # 拼音转换（pinyin-pro 本地库）
│   │       ├── recolor.js  # 图片颜色替换（吸管 + 容差）
│   │       ├── pdfedit.js  # PDF 镜像翻转 / 页面裁剪
│   │       ├── jsonschema.js # JSON Schema 构建器 + Draft-07 常用子集校验
│   │       ├── toml.js     # TOML ⇄ JSON（本地 smol-toml）
│   │       ├── csvsql.js   # CSV → SQL（MySQL / PostgreSQL / SQLite / SQL Server）
│   │       ├── favicon.js  # Favicon 生成器（PNG + ICO + webmanifest）
│   │       ├── pdfsign.js  # PDF 签名（手写 / 图片 / 文字）
│   │       ├── mdtable.js  # Markdown 表格生成器
│   │       ├── wifiqr.js   # WiFi 二维码（WIFI: 文本格式 + 本地 qrcode.js）
│   │       ├── gitdocker.js # Git / Docker 命令生成器（只拼接命令，不执行）
│   │       ├── csslayout.js # CSS Grid / Flexbox 生成器（实时预览 + 复制 CSS）
│   │       ├── seo.js      # SEO 套件（基础 Meta + Open Graph + Twitter Card）
│   │       ├── mask.js     # 数据脱敏（邮箱 / 手机 / 身份证 / 银行卡 / IP / 自定义词）
│   │       ├── bankcard.js # 银行卡校验（Luhn + 卡组织识别 + 校验位）
│   │       ├── screenshot.js # 截图美化（渐变背景 / 圆角 / 阴影 / 浏览器顶栏）
│   │       ├── socialcrop.js # 社媒尺寸裁剪（方图 / 小红书 / 竖屏 / 封面）
│   │       ├── imgfilter.js # 图片滤镜（亮度 / 对比度 / 饱和度 / 灰度 / 模糊）
│   │       ├── httpref.js   # HTTP 状态码 / MIME / 端口速查
│   │       ├── passstrength.js # 密码强度检测（长度 / 字符集 / 熵值）
│   │       ├── compound.js  # 复利计算器（本金 + 每月定投）
│   │       ├── pivot.js     # 数据透视表生成器（CSV / 行列表值汇总）
│   │       ├── compose.js   # Docker Compose 配置生成器
│   │       ├── nginx.js     # Nginx 配置生成器
│   │       ├── wordcloud.js # 文字云生成器（分词 + Canvas 布局）
│   │       ├── tts.js       # 浏览器文本朗读（Web Speech API）
│   │       ├── mindmap.js   # Markdown 思维导图（Canvas 导出）
│   │       ├── cssfmt.js    # CSS 美化 / 压缩（保留字符串与媒体查询）
│   │       ├── uuidparse.js # UUID 解析器（版本 / 变体 / 时间戳 / 节点）
│   │       ├── yamlview.js  # YAML 可视化查看器（可折叠树 + JSONPath）
│   │       ├── commitgen.js # Git Commit 生成器（Conventional Commits）
│   │       ├── scicalc.js   # 科学计算器（递归下降解析，不用 eval）
│   │       ├── invoicetax.js # 发票税率换算器（含税 / 不含税互转）
│   │       ├── cronbuild.js # Crontab 生成器（5 段表达式 + 未来执行预览）
│   │       ├── cssvars.js   # CSS 变量生成器（主题令牌 + 实时预览）
│   │       ├── radiusgen.js # 圆角生成器（四角联动 + border-radius 输出）
│   │       ├── jsoncsv.js   # JSON → CSV（嵌套展平 + BOM 下载）
│   │       ├── tzconv.js    # 时区转换器（IANA 时区 + 夏令时）
│   │       ├── matrixcalc.js # 矩阵计算器（2×2–5×5 方阵运算）
│   │       └── fun.js      # 随机数、UUID/密码、日期差、BMI、星座生肖、世界时钟、吃什么、番茄钟
│   └── lib/                 # 本地依赖（按需注入 <script>，首屏零加载）
│       ├── pdf-lib.min.js   # pdf-lib 1.17.1（读写 PDF）
│       ├── pdf.min.js       # pdf.js 3.11（渲染页面、提取文字层）
│       ├── pdf.worker.min.js
│       ├── xlsx.full.min.js # SheetJS 0.20.3（CSV / XLSX / XLS）
│       ├── jszip.min.js     # JSZip 3.10.1（docx / zip 打包）
│       ├── qrcode.js        # qrcode-generator 1.4.4
│       ├── hanconvert.js    # OpenCC 简繁字表（2843 + 3602 对，38KB）
│       ├── js-yaml.min.js   # js-yaml 4.1.0（YAML ⇄ JSON，38KB）
│       ├── jsbarcode.min.js # JsBarcode 3.11.6（Code128 / EAN / Code39 / ITF / UPC，59KB）
│       ├── jsqr.min.js      # jsQR 1.4.0（图片二维码解码，250KB，Apache-2.0）
│       ├── pinyin-pro.min.js # pinyin-pro 3.29.5（汉字转拼音，325KB，MIT）
│       └── smol-toml.js     # smol-toml 1.4.2（TOML 解析 / 序列化，BSD-3-Clause）
```

## 本地预览

因为用到了 hash 路由，`file://` 直接双击也能跑；用本地服务器更接近线上：

```bash
# 任选一种
python -m http.server 8099
npx serve .
```

然后打开 <http://localhost:8099>。

## 快捷键

全站快捷键参考[懒人工具](https://www.lanren-tools.com/)的全站 Alt 组合键思路，按本站结构做了适配：

| 按键 | 作用 |
|---|---|
| `/` 或 `Alt + Q` | 聚焦右侧顶部搜索框 |
| `Alt + H` | 回到首页 |
| `Alt + R` | 随机打开一个工具 |
| `Alt + T` | 切换深色 / 浅色 |
| `Alt + 0` | 回到首页顶部 |
| `Alt + 1 ~ 7` | 滚动到左侧分类顺序对应的分类区（办公文档、图片处理、文档创作、站长工具、数据驿站、AI 工具集、休闲娱乐） |
| `Ctrl / ⌘ + Enter` | 在工具页点击当前工具的 primary 主按钮（上传未完成或按钮禁用时会提示） |
| `Esc` | 关闭弹窗 / 收起移动端侧栏 |
| `?` | 打开快捷键说明面板 |

页脚也有「快捷键」入口，窄屏页脚隐藏时用 `?` 打开。没有照搬[懒人工具](https://www.lanren-tools.com/)的 `Alt + U / F`（最新上线、收藏），因为本站没有这两个独立页面；改成了更实用的分类直达。

## 部署

### GitHub Pages

源码仓库：<https://github.com/xgnw/tools>。仓库根目录就是本站根目录（`index.html` 必须在根）。

1. 确保 `tools` 仓库根目录就是本站根目录：把 `index.html`、`pay.html`、`assets/`、`CNAME`、`.nojekyll`、`README.md` 全部放在仓库根目录。
2. 提交推送：
   ```bash
   git init
   git add .
   git commit -m "init: 简单工具箱"
   git branch -M main
   git remote add origin https://github.com/xgnw/tools.git
   git push -u origin main
   ```
3. 仓库 → **Settings → Pages** → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`，保存。
4. 在 **Custom domain** 填写 `tools.432600.xyz`，并在 DNS 添加一条 CNAME 指向 `xgnw.github.io`。
5. 等 DNS 生效后访问 `https://tools.432600.xyz/`。

仓库里的 `.nojekyll` 与 `CNAME`（`tools.432600.xyz`）必须保留：前者避免 GitHub Pages 忽略静态资源目录，后者用于绑定独立域名。

### 与简单导航网互导

- 工具站：`https://tools.432600.xyz/`
- 主站：`https://432600.xyz/`
- 主站导航栏增加「简单工具箱」入口，指向工具站域名；工具站侧栏底部、页脚、关于页均回到主站。
- 工具站使用相对路径加载 `assets/`，独立域名或子目录部署都不需要改资源地址。

### Cloudflare Pages

1. 打开 Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**，选同一个仓库。
2. 构建设置：
   - Framework preset：`None`
   - Build command：**留空**
   - Build output directory：`/`（仓库 `tools` 的根目录就是站点根目录）
3. Save and Deploy，完成后拿到 `https://<project>.pages.dev`。

不想接 Git 也可以：**Direct Upload** 把整个文件夹拖进去即可。

### 其它静态托管

Vercel、Netlify、对象存储（R2 / OSS）+ CDN 都一样：把目录当静态资源发布，不需要任何重写规则——所有页面都在 `#/` 之后。

## 自定义

### 新增一个工具

在 `assets/js/tools/` 任意文件里追加一段注册代码即可（顺序在 `index.html` 的脚本标签里已排好）：

```js
TB.def({
  slug: 'my-tool',            // 地址栏 #/tool/my-tool，全站唯一
  cat: 'web',                 // office / image / doc / web / data / ai / fun
  name: '我的工具',
  desc: '一句话说明',
  icon: '🧪',
  kw: '搜索关键词 空格分隔',
  render: function (ctx) {
    var root = ctx.root;                       // 已经创建好的容器
    root.innerHTML = '<div class="panel">…</div>';
    // 在这里绑定事件、处理数据
  }
});
```

首页、分类页、侧栏计数、搜索、热门榜都会自动带上这个工具，不用改别的地方。

### 换品牌 / 配色

- 品牌名：`index.html` 的 `<title>`、`assets/js/core.js` 的动态标题与关于页；侧栏 Logo 由 `TB.buildSide` 生成。
- 组合标：`assets/js/core.js` 的 `TB.buildSide` 中 `.logo-mark`（上“简”、下“工具”），样式在 `assets/css/app.css` 的 `.logo i.logo-mark` 段。
- 主站入口：`assets/js/core.js` 的 `TB.mainSite`；`index.html` 页脚有静态链接，侧栏底部入口由 `TB.buildSide` 生成。
- 配色：`assets/css/app.css` 顶部的设计令牌（`:root` 浅色、`[data-theme="dark"]` 深色），改 `--brand` 一处即可换主色。
- 图标：`assets/favicon.svg`。

### 换成自己的天气/城市

第一次打开会先请求浏览器定位（授权后按经纬度取天气，并反查城市名）；拒绝授权或定位失败时自动退回网络 IP 粗定位，两条路都走不通才显示北京。点日期条右侧的城市名可以手动指定城市（如「武汉」），留空则回到自动定位。手动城市记在 `localStorage.wl_city`，定位结果缓存半天记在 `localStorage.wl_geo`。天气走 open-meteo 的免费接口（不需要 key），请求失败时整条隐藏，不影响其它功能。

## 隐私

- 没有账号、没有埋点、没有第三方统计脚本。
- 文件处理全在浏览器内存里完成，关闭标签页即消失；`localStorage` 只存五样东西：主题、手动城市、发薪日、本机使用次数、定位结果缓存。
- 外部请求只有四个用途：天气（open-meteo）、汇率（open.er-api.com）、网络定位（ipwho.is，失败退 ipapi.co）、经纬度反查城市名（BigDataCloud）；都不带文件内容与身份信息。定位只在没有手动城市时发生，浏览器定位要你授权才会拿到坐标。

## 浏览器支持

Chrome / Edge / Firefox / Safari 最近两年版本。依赖 WebCrypto（哈希、TOTP）、Canvas、`Intl` 农历、pdf.js 的 Web Worker，IE 不支持。

## 已知限制

- **PDF 加页码**使用 PDF 内置 Helvetica，只支持数字与英文；写中文会给出提示而不是静默失败。
- **PDF 压缩**会把页面重绘成 JPEG，文字层会丢失（不可选中、不可搜索）；纯文字 PDF 可能压不动甚至变大，这是原理决定的。
- **PDF 转 Markdown / Word** 只提取文字层，扫描版（整页图片）提取不到内容，需要先做 OCR。
- **PDF 转 Excel / PPT、移除 PDF 水印、图片去水印**没有做：需要版面识别或 AI 模型，纯静态站无法可靠完成，不做半成品。
- **Word 排版**能把字体名、字号、行距、缩进、页边距写进 docx，但字体本身要本机有；没有的字体 Word 会自动回退显示。
- **批量重命名**只生成 `.bat` / `.sh` 脚本和对照表，不直接改磁盘文件（浏览器没有静默改名的权限）。
- **Excel 比对**按单元格值比较，不比较样式、公式、批注。
- 天气与城市名解析依赖网络，离线时该模块自动隐藏。
- **自动定位**优先用浏览器 GPS：拒绝授权、`file://` 下授权被拦或 8 秒超时，会退回 IP 粗定位（只能到城市级，可能落到运营商机房所在城市）；定位与网络都失败时显示北京，点城市名可手动指定。
- **汇率换算**需要联网取一次汇率（10 分钟内缓存）；取不到时会让你手填汇率继续算。
- **万年历**只换农历与常见节日，**不含调休安排与二十四节气**（节气要天文计算，误差不值得）。
- **身份证解析**只解析到省级籍贯（前两位），不查区县；号码校验按 GB 11643 加权算法。
- **简繁转换**是逐字替换（OpenCC 字表），"干 / 乾 / 幹"这类一词多形按常用写法取一个，不做词组消歧。
- **五子棋**电脑是一步前瞻的启发式（成五 > 堵四 > 活三），不是棋力引擎，认真下能赢。
- **二维码美化**的中心文字 / Logo 会遮住模块，内容较长时请把容错调到 Q 或 H；背景图只做视觉层，二维码仍保持高对比度白底。
- **收款码三合一**没有短链服务，二维码里是完整的 `pay.html` 地址，链接会比短链长；部署地址必须填线上目录，`file://` 预览时生成的二维码手机扫不开。它只做二维码合成，不校验支付账户、不参与交易、不保存链接。

- **JWT 解析**只做 Base64URL 解码与 HMAC（HS256/384/512）验签；RS256 / ES256 需要公钥，页面只显示结构、不验签，也不会联网取 JWKS。
- **YAML ⇄ JSON** 依赖 js-yaml，遇到重复键会按 YAML 规范报错；超大的多文档 YAML（`---` 分隔）只解析第一份。
- **SQL 格式化**是按关键字换行缩进的轻量美化，不做语法校验，也不会改写你写的表达式；存储过程、方言特有语法可能排得不理想。参数填充只替换字符串与注释之外的占位符。
- **条码生成**只支持 Code 128 / EAN-13 / EAN-8 / Code 39 / ITF-14 / UPC-A 六种；EAN/UPC 位数不对会直接报错，不会生成一张扫不出来的图。
- **CRC 校验**固定四个标准参数（CRC32/IEEE、CRC16/MODBUS、CRC16/CCITT-FALSE、CRC8），不提供自定义多项式。
- **歌词转字幕**只认 `[mm:ss.xx]` 时间标签，纯文本歌词没有时间轴就转不了；每条时长取「到下一句为止」和「设定值」的较小者。
- **进制转换**整数用 BigInt 精确计算，小数按目标进制逐位展开、最多保留 12 位（二进制除不尽会有舍入）。
- **请求片段生成**只输出 curl / fetch / Python requests / axios / Go 五种写法，不做签名、鉴权或环境变量替换。
- **XML 格式化**用浏览器自带解析器，只调整标签之间的空白、不重排文本内容；压缩会删掉纯空白的文本节点，注释与 CDATA 原样保留。
- **HMAC 签名**走 WebCrypto，只支持 SHA-1 / 256 / 384 / 512 四种摘要，不做密钥派生（PBKDF2 / scrypt）与分块计算。
- **JSON 转类型**是「从样例推断」：同一字段在不同对象里类型不一致会输出联合类型，Go 侧的 `interface{}` 与 Python 的 `Any` 都不做运行时校验。
- **JSONPath** 支持 `$`、`.key`、`['key']`、`[n]`、`[-1]`、`[*]`、`..key`，**不支持过滤表达式** `[?(@.x==1)]`、切片 `[1:3]` 与函数。
- **CSS 生成器**只做线性渐变和单层 `box-shadow`，不做径向 / 锥形渐变与多层阴影叠加。
- **对比度检测**按 WCAG 2.1 相对亮度公式，只判断 AA / AAA 阈值，不检查字号、字重与背景图叠加后的实际效果。
- **ID 生成**的 NanoID 用 64 字符默认字母表；ULID 与 ObjectID 按规范拼装，但**不保证全局唯一**（浏览器里没有进程级计数器）。
- **假数据生成**是随机拼接的虚构信息，手机号按 `1[3-9]` 规则随机、邮箱用保留域名，不对应任何真实个人或企业。
- **文本相似度**最长各取 5000 字；编辑距离是 O(n·m)，超长文本会明显变慢，所以先截断再算。
- **二维码识别**依赖 jsQR（250KB 懒加载），模糊、反光、强透视的图可能失败；只解码，不生成，也不支持一图多码。
- **Token 估算**用经验系数（汉字 0.75、英文单词 1.3 左右）而不是各家真实分词器，误差约 ±15%；要精确到个位得加载几 MB 词表，纯静态站不做。上下文占用只是算术，不代表模型一定接受（还有消息条数、工具定义等额外开销）。
- **模型成本估算**里的单价是量级参考，不是实时报价，也不含缓存折扣、批处理优惠与代理加价；表格里的单价可以直接改，改完立即重算。
- **提示词模板填充 / 系统提示词生成**只做字符串拼装，不调用模型，也不校验内容好坏；模板里的 `{{变量}}` 没填时会原样保留。
- **AI 绘图提示词**是把选项拼成 Midjourney / Stable Diffusion 的提示词串，不保证出图效果——画面取决于模型权重、LoRA 与随机种子，同一串词在不同模型上差异很大。
- **AI 工具集整体不联网调用模型**：不做需要 API Key 的推理、不做「AI 味检测」这类不可靠判定，所有计算都在浏览器里完成。

## 关于 passer-by.com 的项目

这批工具参考了 [passer-by.com/project.html](https://passer-by.com/project.html) 的项目清单，但**没有照搬代码**，只按它的功能点用原生 JS 重写：

| 已接入 | 说明 |
|---|---|
| 万年历 | Intl 中式历法，月视图 + 农历 + 节日 |
| 身份证解析 | 校验位、生日、性别、年龄、省级籍贯 |
| 浏览器及设备判断 | UA 解析 + 屏幕 / 硬件 / 显卡 / 时区 |
| 24 点计算 | 分数精确求解，去重后列写法 |
| 大数浮点计算 | 以「精确小数计算」形式落地，BigInt 十进制 |
| 换货币 | 以「汇率换算」形式落地，open.er-api.com 免费接口 |
| 中文简繁转换 | OpenCC 字表本地化，双向转换 |
| 五子棋 | 人机对战，启发式 AI |
| 最短寻址 | 以「迷宫寻路」形式落地，DFS 生成 + BFS 最短路径 |
| 二维码美化 | 背景 / 圆点 / 配色 / 码眼 / 中心文字 / Logo |

**没接的**：亲戚计算器（中文称谓规则庞大，四代以外的叫法各地方言不一，容易给出"看着对其实错"的结果，不做半成品）、行政区划选择器 / 中国行政区划数据（要随民政部每年更新，几十万条数据不适合塞进静态包）、集邮吧 / 空凤网 / 随机网址导航（内容站点，不是工具）、吃豆人 / 21 点（纯娱乐游戏，与工具箱定位偏离，需要可以再加）、各种"库"（时间格式化、异步请求、本地存储监听、jQuery 插件库属于组件而非可用的工具）、脚本加密（把代码变图片，实际是混淆思路，不推荐）。



## 关于 Ctool 的功能对照

这批工具参考了 [Ctool](https://ctool.dev)（`Ctool-gh-pages` 代码包）的功能清单，但**没有移植它的 Vue 打包产物**——那些 chunk 是编译后的代码（单个 2MB），既没法维护也不该塞进静态站；这里只按功能点用原生 JS 重写，需要成熟算法的两处引入 MIT 小库并懒加载。

| 已接入 | 说明 |
|---|---|
| JWT 解析 | 三段解码、时间字段可读化、HMAC 验签（WebCrypto） |
| YAML ⇄ JSON | js-yaml 本地化，双向转换 + 报错行列 |
| SQL 格式化 | 关键字大写、子句换行缩进、括号内逗号不拆行 |
| SQL 参数填充 | `?` 顺序替换、`:name` / `@name` 按 JSON 对象替换 |
| 条码生成 | JsBarcode 本地化，6 种格式 + PNG 导出 |
| CRC 校验 | CRC32 / CRC16-MODBUS / CRC16-CCITT / CRC8 |
| 歌词转字幕 | LRC → SRT / WebVTT，多标签与 offset |
| 请求片段生成 | curl / fetch / Python / axios / Go |
| 进制转换 | BigInt 任意 2–36 进制，负数与 `0x` 前缀 |

**没接的**：AES / DES / 3DES / RC4 / RSA / SM2 / SM4 / bcrypt（密码学工具需要密钥管理、模式选择一堆前置条件，做浅了容易让人误用不安全参数；Ctool 的相关 chunk 加起来近 1MB，不适合搬进纯静态包）、WebSocket 调试（必须有服务端配合，静态站只能当摆设）、gzip 压缩（与已有的 ZIP 打包功能重叠）、ASN.1 / 证书解析、ARM 指令转机器码（受众极窄），以及 IPv4/IPv6 计算、URL 解析、表单序列化、变量名转换（本站已有「IP 子网」「编码转换」「命名转换」覆盖同类需求）。拼音转换已接入本地 pinyin-pro（325KB，MIT），支持声调、数字声调与首字母；多音字按常用读音。

## 关于 IT Toolbox 的功能对照

这批工具参考了 [Zoroaaa/it-toolbox](https://github.com/Zoroaaa/it-toolbox)（IT Toolbox，React + TypeScript 前端 + Cloudflare Pages Functions 后端，140+ 工具）的功能清单。它是全栈项目，很多能力必须跑在服务端，本站坚持纯静态，所以只挑了不依赖后端、也不与现有工具重复的部分，用原生 JS 重写，二维码识别引入 Apache-2.0 的 jsQR 懒加载。

| 已接入 | 说明 |
|---|---|
| XML 格式化 | 美化 / 压缩 / 校验，报错带行号列号，统计元素、属性与最大层级 |
| HMAC 签名 | SHA-1 / 256 / 384 / 512，输出 Hex / Base64 / Base64URL |
| JSON 转类型 | 从 JSON 样例生成 TypeScript 接口、Go struct、Python TypedDict |
| JSONPath 查询 | `$` 根、点号 / 方括号、下标与负下标、通配、递归下降 |
| CSS 生成器 | 线性渐变 + 卡片阴影，滑块实时预览并输出可直接粘的代码 |
| 对比度检测 | WCAG 2.1 对比度与 AA / AAA 四项判定，带大号 / 正文两档预览 |
| ID 生成 | NanoID / ULID / MongoDB ObjectID，拒绝采样避免取模偏差 |
| 假数据生成 | 姓名 / 性别 / 手机 / 邮箱 / 公司 / 城市 / 地址 / 日期，CSV 或 JSON |
| 文本相似度 | 编辑距离、二元组 Jaccard、字频余弦，三种口径加条形图 |
| 二维码识别 | 图片上传 → canvas → jsQR 本地解码，不上传服务器 |

**没接的**：IP 归属地 / DNS 查询 / WHOIS / SSL 证书检测 / HTTP 接口测试（都要请求第三方服务，纯静态站绕不开跨域与密钥）、AI 增强类 12 个（需要模型 API Key 与计费）、AES / RSA / bcrypt / SSH 密钥 / 证书解析（重密码学，与 Ctool 那轮的取舍一致，不做浅层实现）、JSON / Markdown / YAML / SQL / CSS / JS / CSV 格式化（本站已有 JSON、YAML、SQL、CSS 生成、CSV 互转，重复的不再堆一个）、时间戳 / UUID / 时间换算 / 单位换算 / 颜色转换（已有同名工具）。剩下这些仍在评估、尚未接入：TOML ⇄ JSON（已由 NewKit 批次接入）、ROT13 / Punycode / ASCII 码表、色盲模拟、Tailwind 色板、SemVer 解析、许可证 / README / Meta 生成、EXIF 读取、罗马数字、JSON 表格互转（JSON Schema 校验已由 NewKit 批次单独接入）、HTTP 状态码 / MIME / 端口速查。

## 关于 NewKit（newkit.site）的功能对照

参考 [newkit.site/tools](https://www.newkit.site/tools/) 的 233 个工具清单（开发者 94、文档 15、文本 25、图像 33、数据转换 15、加密 10、媒体 10、网络 16、数学 15）做逐项比对。NewKit 有大量工具与本站已有的格式化、二维码、PDF、图片压缩重复，或依赖后端、第三方接口、AI Key、ffmpeg 与代码沙箱；本站只挑选**纯静态、浏览器本地可完成**的能力，第一批接入 6 个，第二批再接入 6 个，第三批再接入 6 个，第四批再接入 6 个，第五批再接入 6 个，第六批再接入 6 个，第七批再接入 6 个，第八批再接入 6 个，共 48 个。

| 已接入 | 分类 | 实现说明 |
|---|---|---|
| JSON Schema 构建器 | 站长工具 | 从 JSON 样例生成字段表与 Draft-07 骨架；验证器覆盖 type / required / properties / items / enum / const / 数值与字符串约束 / pattern / format / allOf / anyOf / oneOf / not 等常用子集，不引入 Ajv |
| TOML ⇄ JSON | 站长工具 | 用本地 `smol-toml`（BSD-3-Clause）双向转换，支持注释、表、数组、内联表与日期；TOML 无 null，遇到 JSON null 会明确报错 |
| CSV → SQL | 办公文档 | 自写 CSV 状态机（引号、转义引号、字段内换行），自动推断整数 / 小数 / 日期 / 时间 / 布尔，生成 CREATE TABLE 与分批 INSERT；支持 MySQL、PostgreSQL、SQLite、SQL Server 的标识符与类型写法 |
| Favicon 生成器 | 图片处理 | Canvas 生成 16~512 PNG，文字 / Emoji / 图片三种来源，圆角 / 圆形 / 方形外形；ICO 用 PNG 条目封装，另打包 `site.webmanifest` 与 PNG 套图 |
| PDF 签名 | 办公文档 | 复用 pdf-lib，手写（自动裁掉透明留白）、图片、文字三种签名，可选页面与六种位置；仅可视签名，不提供 CA 数字证书或法律电子签章 |
| Markdown 表格生成器 | 文档创作 | 可视化增删行列、设置左 / 中 / 右对齐，实时生成 Markdown；单元格 `|` 自动转义、换行转 `<br>` |
| WiFi 二维码 | 站长工具 | 按 Wi-Fi 联盟 `WIFI:T:...;S:...;P:...;;` 格式生成，复用本地 `qrcode.js`，支持隐藏网络、PNG / SVG 下载与内容复制 |
| Git / Docker 命令生成器 | 站长工具 | Git 与 Docker 双 tab、场景下拉与动态字段，只拼接可复制的命令文本，不执行任何命令 |
| CSS Grid / Flexbox 生成器 | 站长工具 | 列数 / 行数 / 间距 / 对齐与方向 / 换行实时调节，带网格预览并复制生成的 CSS |
| SEO 套件 | 站长工具 | 生成 title、description、keywords、canonical、robots、Open Graph、Twitter Card；提示标题 30–60 字、描述 80–160 字，带搜索结果预览 |
| 数据脱敏 | 数据驿站 | 本地遮罩邮箱、手机号、身份证、银行卡、IPv4 与自定义敏感词，统计命中数量，不存储、不上传 |
| 银行卡校验 | 数据驿站 | Luhn 校验、常见卡组织识别、格式化卡号与校验位计算；不联网、不验证真实发卡行或余额 |
| 截图美化 | 图片处理 | Canvas 渐变背景、留白 / 圆角 / 阴影可调，可选浏览器顶栏，导出 PNG |
| 社媒尺寸裁剪 | 图片处理 | 方图、小红书 4:5、9:16 竖屏、16:9 封面、公众号首图、头像；居中裁切或完整留白 |
| 图片滤镜 | 图片处理 | 亮度、对比度、饱和度、灰度、复古、模糊实时预览，导出 PNG |
| HTTP 状态码 / MIME / 端口速查 | 站长工具 | 本地静态速查表，按状态码、MIME、端口分组并可搜索 |
| 密码强度检测 | 站长工具 | 估算长度、字符集与熵值，提示常见弱密码、连续序列和重复字符；输入不保存 |
| 复利计算器 | 数据驿站 | 初始本金 + 每月定投，按月复利计算终值、总投入、利息与逐年明细 |
| 数据透视表生成器 | 办公文档 | CSV / TSV 行列值汇总，支持求和、计数、平均、最大值、最小值与 CSV 导出 |
| Docker Compose 配置生成器 | 站长工具 | 表单维护服务、镜像、端口、卷、环境变量和依赖，生成 docker-compose.yml |
| Nginx 配置生成器 | 站长工具 | 静态站点 / 反向代理，支持 HTTPS 跳转、gzip、WebSocket 和上传大小 |
| 文字云生成器 | 图片处理 | 浏览器分词、词频统计、螺旋无重叠布局，配色和背景可调，导出 PNG |
| 浏览器文本朗读 | 办公文档 | 调用本机 Web Speech API 朗读文本，语速、音调、音量、语音可调，只播放不导出音频 |
| Markdown 思维导图 | 文档创作 | 解析标题层级与列表缩进，Canvas 绘制横向导图并导出 PNG |
| JSON → Zod Schema | 站长工具 | 从 JSON 样例推断 Zod 结构，覆盖对象、数组、联合类型、整数与 null，并可生成 `z.infer` 类型 |
| Chmod 计算器 | 站长工具 | 八进制与 rwx 互转，支持 setuid / setgid / sticky、常用权限预设和 `chmod` 命令生成 |
| 关键词密度分析器 | 站长工具 | 中文分词、英文单词统计、停用词过滤、词频 / 密度排行与目标关键词统计，支持 CSV 导出 |
| JSON-LD 结构化数据生成器 | 站长工具 | Article、Product、FAQPage、BreadcrumbList、Organization 五种模板，生成可粘贴的 `<script type="application/ld+json">` |
| UTM 参数生成器 | 站长工具 | 保留原 query 与 hash，追加标准 utm_* 参数，带渠道预设、参数明细和复制 / 打开 |
| 投资分析计算器 | 数据驿站 | NPV 净现值、投资回收期、夏普比率三个页签，含现金流折现表、回收明细和年化计算 |
| HTTP Headers 分析 | 站长工具 | 解析状态行与响应头，检查 CSP / HSTS / XCTO / XFO / Referrer / Permissions 六类安全头，拆解 Set-Cookie 标记 |
| GraphQL 格式化 | 站长工具 | 本地词法扫描，格式化 query / mutation / fragment、变量、指令和对象参数，并支持压缩 |
| HTML → Markdown | 站长工具 | 用 DOMParser 递归转换标题、段落、列表、链接、图片、引用、表格和代码块 |
| JSON 树形可视化 | 站长工具 | 折叠展开对象与数组，按关键词过滤并自动展开命中路径，可复制 JSONPath |
| 社交媒体尺寸指南 | 图片处理 | 小红书、抖音、微信、B站、YouTube、Instagram 等平台封面、头像与配图尺寸速查，可跳到裁剪工具 |
| ASCII Art 文字 | 站长工具 | 内置 5×7 点阵字体，把英文、数字和标点拼成块状大字，支持自定义填充字符、换行和 txt 下载 |
| CSS 美化 / 压缩 | 站长工具 | 自写扫描器，保留字符串、注释、`url()`、`calc()` 与媒体查询内容；美化按大括号缩进、声明逐行，压缩删普通注释但保留 `/*!` 版权注释 |
| UUID 解析器 | 站长工具 | 解析 8-4-4-4-12、花括号与 `urn:uuid:` 前缀，显示版本、变体、v1/v6 时间戳、clock sequence、node 与 16 字节分组 |
| YAML 可视化查看器 | 站长工具 | js-yaml 解析后渲染可折叠树，支持对象、数组、标量、日期、多文档与锚点引用，点击行复制 JSONPath |
| Git Commit 生成器 | 站长工具 | 按 Conventional Commits 拼装 `type(scope)!: subject`，支持正文、页脚、破坏性说明、字符数提示与复制 |
| 科学计算器 | 数据驿站 | 自写递归下降解析器，不使用 eval；支持四则、幂、取余、括号、三角 / 反三角 / 对数 / 根号与角度 / 弧度切换 |
| 发票税率换算器 | 数据驿站 | 含税金额与不含税金额互转，拆出税额，支持 13% / 9% / 6% / 3% / 1% / 0% 快捷税率与结果复制 |
| Crontab 生成器 | 站长工具 | 可视化填写分 / 时 / 日 / 月 / 周五个字段，支持常用预设、步长 / 区间 / 列表，预览未来 5 次执行时间并复制表达式 |
| CSS 变量生成器 | 站长工具 | 调整品牌色、背景、文字、圆角与间距，内置 5 套主题预设，实时预览并生成可直接粘贴的 `:root` 变量块 |
| 圆角生成器 | 站长工具 | 四个角分别调 px / % 半径，支持四角联动与卡片、胶囊、圆形、异形预设，实时预览并复制 `border-radius` |
| JSON → CSV | 数据驿站 | JSON 数组转 CSV，支持嵌套对象点号展平、数组字段 JSON 序列化、逗号 / Tab / 分号分隔；下载带 UTF-8 BOM，Excel 打开中文不乱码 |
| 时区转换器 | 数据驿站 | 输入某一时区的日期时间，换算多个目标时区；使用浏览器内置 IANA 时区库自动处理夏令时，显示 UTC 偏移与跨日提示 |
| 矩阵计算器 | 数据驿站 | 支持 2×2 到 5×5 方阵的加减、乘法、转置和行列式；高斯消元带部分主元，结果保留 6 位小数 |

**没接的**：视频 / 音频媒体工具（需要 ffmpeg 或服务端重编码）、IP / DNS / WHOIS / SSL / 网速 / 短链（依赖第三方接口或服务端）、AI 类（需要模型 Key 与计费）、代码运行器 / API Mock / 在线协作（需要沙箱或后端）、OCR / PDF → PPT / Word → PDF / PDF 加密（依赖重型引擎或密码学参数）、AES / RSA 等重型密码学，以及与现有 186 个重复的格式化 / 转换 / 二维码 / PDF / 图片压缩工具。前两批已接入 12 个；第三批接入截图美化、社媒尺寸裁剪、图片滤镜、HTTP 状态码 / MIME / 端口速查、密码强度检测、复利计算器；第四批接入数据透视表、Docker Compose、Nginx、文字云、浏览器文本朗读、Markdown 思维导图；第五批接入 JSON → Zod Schema、Chmod 计算器、关键词密度分析器、JSON-LD 结构化数据生成器、UTM 参数生成器、投资分析计算器；第六批接入 HTTP Headers 分析、GraphQL 格式化、HTML → Markdown、JSON 树形可视化、社交媒体尺寸指南、ASCII Art 文字；第七批接入 CSS 美化 / 压缩、UUID 解析器、YAML 可视化查看器、Git Commit 生成器、科学计算器、发票税率换算器；第八批接入 Crontab 生成器、CSS 变量生成器、圆角生成器、JSON → CSV、时区转换器、矩阵计算器。更多纯静态的格式化、转换与视觉类工具可按同样标准继续接入。

## 关于 工具邦（cn.piliapp.com）的功能对照

参考 [cn.piliapp.com](https://cn.piliapp.com/) 的工具清单补齐了一批纯前端小工具，同样全部本地运行、无登录。新代码集中在 `assets/js/tools/piliapp.js`，样式追加在 `app.css` 末尾。

| 已接入 | 分类 | 说明 |
|---|---|---|
| 轮盘抽选 | 休闲娱乐 | Canvas 扇区 + 指针，3.6s 缓动旋转，抽中可移除并留历史 |
| 记分板 | 休闲娱乐 | 两队大分数 +1/+2/+3/-1，改名 / 交换 / 归零 / 全屏 |
| 在线秒表 | 休闲娱乐 | `performance.now` 计时、10ms 精度、记圈表、空格与 L 快捷键 |
| 倒计时器 | 休闲娱乐 | 时分秒输入 + 5 档预设，结束三声 WebAudio 提示 |
| 手机跑马灯 | 休闲娱乐 | 黑底滚动大字，颜色 / 字号 / 速度可调，支持全屏 |
| 掷筊 | 休闲娱乐 | 两个筊杯 CSS 翻转动画，圣杯 / 笑杯 / 阴杯与次数统计 |
| 屏幕量尺 | 数据驿站 | Canvas 画 cm / inch 刻度，银行卡 85.6mm 校准，比例记忆 |
| 图片裁剪 / 旋转 | 图片处理 | 比例预设、缩放、拖动取景、左右翻转，导出 PNG / JPG 长边 1400px |
| 微信名片生成器 | 图片处理 | Canvas 绘制毛玻璃名片，头像 / 背景 / 二维码上传，4 套预设背景，导出 1160×720 PNG |
| ZIP 压缩 / 解压 | 办公文档 | 多文件 DEFLATE 打包、重名自动加序号，解压后逐个下载 |
| 酷炫文字生成 | 站长工具 | 11 种 Unicode 字体样式，逐行复制 |
| 特殊符号大全 | 站长工具 | 9 组符号 + 搜索 + 点击复制 |

**没接的**：视频剪辑 / 分割 / 合并 / 压缩 / 转 GIF、音频转换 / 合并 / 剪辑、录音 / 录屏 / 摄像头录制（需要 ffmpeg 或服务端重编码）、互联网测速与设备测试（依赖外部服务或硬件权限）、黄历 / 农历转换（本站已有万年历）、时区转换与翻页时钟（与现有世界时钟 / 桌面时钟重复）、小游戏合集（受众与维护成本不划算）。

## 关于 quickso.cn 超级书签的对照

参考 [quickso.cn/supermark.html](https://quickso.cn/supermark.html) 的「超级书签」清单。它本质上是一组 `javascript:` 书签脚本，用来给任意网页临时加功能，而不是独立网页工具。本站新增 `assets/js/tools/quickso.js`，把它们做成可拖拽 / 可复制的「超级书签」合集，并补了两个可以独立使用的工具。

| 已接入 | 分类 | 说明 |
|---|---|---|
| 超级书签 | 站长工具 | 6 个书签：解除复制限制、网页自由编辑、夜间模式、字体查询、元素测量、换背景；支持拖到书签栏或复制代码 |
| 虚拟键盘 | 办公文档 | 屏幕软键盘，字母 / 大写 / 符号三层，插入光标位置，可复制、清空、全屏 |
| 网页可视化编辑 | 站长工具 | 粘贴或上传 HTML，渲染后直接改字并导出；渲染前移除脚本、iframe、内联事件与 `javascript:` 链接 |

**没接的**：VIP 视频解析（绕过付费墙，不做）、商品历史价格（需要第三方接口与电商页面适配）、网页分屏（依赖 iframe，与本站「无 iframe」约定冲突）、谷歌选词翻译（依赖外部服务，国内网络不可用）。二维码生成本站已有独立工具。




## 关于 tool.mkblog.cn 的功能对照

参考 [tool.mkblog.cn](https://tool.mkblog.cn/) 的 60 个工具条目，逐项与本站已有工具比对后，接入 8 个能纯前端完成、且不重复的工具。代码集中在 `assets/js/tools/mkblog.js`、`mkblog2.js`，样式追加在 `app.css` 末尾。

| 已接入 | 分类 | 说明 |
|---|---|---|
| PDF 转图片 | 办公文档 | pdf.js 逐页渲染，PNG / JPG、96 / 144 / 192 / 300 DPI、页码范围（如 `1-3,5`）、缩略图、单张下载、JSZip 打包 |
| 数字转大写 | 数据驿站 | 人民币财务大写（元角分 / 整）、中文读法、英文读法；BigInt 整数处理，最多 15 位整数 + 2 位小数 |
| 键盘键码 | 站长工具 | 大按键舞台显示 key / code / keyCode / which / location / repeat / 修饰键，保留最近 10 次按键，可复制 JSON |
| 摩斯密码 | 休闲娱乐 | 英文、数字、常用标点与点划互转，WebAudio 播放点划音频；中文需要电报码，不做中文编码 |
| 新拟态生成 | 站长工具 | 尺寸 / 圆角 / 距离 / 模糊 / 底色 / 光源角度，凸起与凹陷两种，实时预览并复制 CSS |
| 毛玻璃生成 | 站长工具 | 渐变背景上的玻璃卡片，模糊 / 透明度 / 边框 / 圆角 / 色调可调，输出 `backdrop-filter` CSS |
| SVG 海浪 | 站长工具 | 2–6 层正弦波、振幅 / 波长 / 相位 / 4 套配色，预览并下载 SVG 或 1200×400 PNG |
| SVG 压缩 | 站长工具 | 保守清理注释、XML 声明、metadata 与标签间空白，显示压缩前后字节和比例；不引入 SVGO |

**没接的**：工具哇 / 在线 PS / 白板 / 音频编辑器 / 屏幕录制 / FC 游戏 / 谷歌电吉他 / 手鼓猫 / 架子鼓（外链应用、素材体积或交互工程量过大）；LOGO 生成（涉及品牌仿制）；艺术二维码（本站已有二维码生成 / 美化 / 识别三个工具）；中国家庭称谓 / 屏幕检测 / 屏幕常亮 / IP 地址查询 / 浏览器 UA / 进制转换 / 文本差异 / 字数统计 / HTML 转义 / MD5 / 时间戳 / 密码 / JSON / Markdown / 图片 Base64 / PDF 拆分合并（本站已有对应工具）；OCR / 聚合翻译 / 手机号归属地 / DNS / Whois / 网址安全检测 / 聚合图床 / WordPress 主题嗅探 / GitHub 文件夹下载（需要服务端、数据库或第三方接口）。Autoprefixer / js 混淆加密 / CSS 美化暂不引入，避免为了几个正则再背一个大库。

## 关于用户提供的「网站源码」工具包

用户提供的 `tool` 目录里有 7 组独立页面。逐页比对后，优先接入能纯前端跑、且与现有工具不重复的 4 个，新增 `assets/js/tools/sourcepack.js`；亲戚称谓依赖的 MIT 库单独放在 `assets/lib/relationship.js`，首次进入页面时才加载。

| 已接入 | 分类 | 原文件 | 说明 |
|---|---|---|---|
| 亲戚称谓计算器 | 休闲娱乐 | `family.html` | 输入关系链或点「父 / 母 / 夫 / 妻 / 子 / 女 / 兄 / 弟 / 姐 / 妹」快捷词，支持找称呼 / 找关系、我称呼对方 / 对方称呼我；称谓库为 [relationship.js](https://github.com/mumuy/relationship)（MIT） |
| 随机色头像 | 图片处理 | `color.html` | 1080×1080 Canvas 纯色头像，自动按背景亮度选黑 / 白文字，可随机换色、复制色值、导出 PNG |
| 屏幕检测 | 站长工具 | `isMyScreenOk.html` | 重写为原生 JS，去掉 Vue / Element CDN；纯色 / 渐变双模式、颜色与角度可调、全屏后 ← → 换色、Enter 显隐工具栏 |
| 屏幕常亮 | 站长工具 | `no/index.html` | 改用 Screen Wake Lock API，不再加载 NoSleep 视频；显示开启状态，页面回到前台自动重新申请，不支持时给出原因 |

**没接的**：

- `password.html` —— 与本站「UUID / 密码」重复，且本站已支持长度、数量、大小写、数字、符号、排除易混淆字符，使用 WebCrypto 真随机。
- `qrcode.html` —— 本站已有「二维码生成」「二维码美化」「二维码识别」「收款码三合一」四个工具。
- `taiqian/`（台签制作）—— 与本站「座位牌生成」重复（已有 A4 折页 / 平铺、批量、打印），且原页面打包的 `FZDBSJW.TTF` 有商业字体版权风险，不引入。

## 关于用户提供的「微信名片」源码

源目录 `WWW/wx` 是一个用 jQuery + html2canvas 拼出来的「微信个人名片在线生成」页，还从阿里图标 CDN 拉字体图标，二维码弹图引用的 `images/kkbk.png` 在目录里并不存在。本站把它重写成 `assets/js/tools/wechatcard.js`：

- 去掉 jQuery、html2canvas、阿里图标 CDN 三个外部依赖，改为纯 Canvas 绘制，预览与导出共用同一套坐标。
- 保留原版式：全屏背景图 + 居中毛玻璃名片 + 右上角头像 + 昵称 / 微信号 / 状态 + 底部二维码位。
- 补齐原页面缺失的二维码：支持上传自己的二维码图片，不传时显示装饰图标。
- 新增 4 套预设背景（暮色 / 晨光 / 墨夜 / 薄荷）、背景图上传、时间可改、恢复默认。
- 导出 1160 × 720 PNG，文件名取昵称；所有图片只在本地用 FileReader + Canvas 处理。
- 画布底部保留「本地合成 · 与微信官方无关」小字，避免被误认为官方页面。

原页面里的 `img.jpg` 是一张有版权的照片，没有打包进本站；默认背景改为 Canvas 渐变。

## 关于 BWmelon/qrcode 的取舍

参考 [BWmelon/qrcode](https://github.com/BWmelon/qrcode) 的功能点，但**没有整包接入**：仓库没有 `LICENSE`，README 明确写着“部分样式来源于芝麻收款和第九工场，如有侵权，请联系删除”；同时依赖 `long2tiny.php` 短链服务、百度统计、`cdn.bootcss.com`、淘宝图床和第三方解码站，和本站纯静态、无登录、无外部统计的约束冲突。

只按功能点重写了两处：

| 已接入 | 分类 | 说明 |
|---|---|---|
| 艺术二维码能力 | 图片处理 | 加进现有「二维码美化」：本地渐变 / 点阵 / 斜纹 / 网格背景、背景图上传、中心 Logo；不搬运仓库的背景素材 |
| 收款码三合一 | 图片处理 | 新增 `qr-pay` + `pay.html`：jsQR 本地解码三张收款码，qrcode-generator 本地生成，收款页按 UA 显示支付宝 / 微信 / QQ；不用 PHP 短链 |

**没接的**：仓库自带的 16 张艺术背景、Layui / Bootstrap / Swiper、百度统计、外部图床与 `long2tiny.php`。二维码美化原有的圆点 / 配色 / 码眼 / 中心文字全部保留。
