# 简单工具箱

> GitHub 仓库：<https://github.com/xgnw/tools>，仓库名为 `tools`；仓库根目录就是本站根目录。

一个可以直接丢到 GitHub Pages / Cloudflare Pages 的纯静态在线工具站：252 个 PDF、图片、文档、表格、开发者、数据、AI 辅助、硬件检测与休闲工具，**全部在浏览器本地运行，没有登录、没有次数限制、文件不上传服务器**。

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
| 无名工具网 | <https://tool.662662.xyz/> | 开发 / 站长类工具清单，评估 RSA、AES、证书 / CSR、Linux 命令、数字 IP、国密 SM2、在线钢琴、头像挂件等候选 | 只取能在浏览器本地完成的功能点；第 230 版新增 4 个工具，数字 IP 并入现有子网计算；第 234 版再接入 SM2、在线钢琴、头像挂件、中文排版 4 项 |
| 办公兔工具箱 | <https://ttt.cm/>（工具页在 officetu.com） | 454 个工具清单、14 个分类与部分功能点 | 第 240 版逐项评估后接入 IPv6 地址、文件 Base64、Excel 函数 / 快捷键、元素周期表、课堂名单、屏幕参数 6 项；WHOIS / DNS / 健康预测 / 彩票 / 品牌梗等依赖第三方或风险较高的项不接，页面视觉不照搬 |
| NewKit | <https://www.newkit.site/tools/> | 233 个工具的功能清单与分类方式 | 第一批接入 6 个纯静态工具（`jsonschema.js`、`toml.js`、`csvsql.js`、`favicon.js`、`pdfsign.js`、`mdtable.js`）；第二批 6 个（`wifiqr.js`、`gitdocker.js`、`csslayout.js`、`seo.js`、`mask.js`、`bankcard.js`）；第三批 6 个（`screenshot.js`、`socialcrop.js`、`imgfilter.js`、`httpref.js`、`passstrength.js`、`compound.js`）；第四批 6 个（`pivot.js`、`compose.js`、`nginx.js`、`wordcloud.js`、`tts.js`、`mindmap.js`）；第五批 6 个（`jsonzod.js`、`chmod.js`、`keyword.js`、`jsonld.js`、`utm.js`、`invest.js`）；第六批 6 个（`headers.js`、`graphql.js`、`html2md.js`、`jsontree.js`、`socguide.js`、`asciiart.js`）；第七批 6 个（`cssfmt.js`、`uuidparse.js`、`yamlview.js`、`commitgen.js`、`scicalc.js`、`invoicetax.js`）；第八批 6 个（`cronbuild.js`、`cssvars.js`、`radiusgen.js`、`jsoncsv.js`、`tzconv.js`、`matrixcalc.js`）；第九批 6 个（`stats.js`、`eqsolve.js`、`macgen.js`、`propsyaml.js`、`yearprogress.js`、`dice.js`）；第十批 6 个（`primes.js`、`palette.js`、`cssanim.js`、`snippets.js`、`meeting.js`、`whiteboard.js`） |
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
| 依赖 | 多个 CDN | 二十一个库全部本地放在 `assets/lib/`，用到才加载，首屏零依赖 |
| 热门榜 | 服务端统计 | 用 localStorage 记录本机使用次数 |

## 工具清单（252 个）

| 分类 | 数量 | 工具 |
|---|---|---|
| 办公文档 | 42 | PDF 合并 / 拆分 / 页面管理 / 压缩 / 尺寸调整 / 加水印 / 加页码 / 转图片、图片转 PDF、PDF 镜像翻转 / 页面裁剪、PDF 签名、PDF 表单填写、PDF 转长图、Word 批量替换 / 清理痕迹 / 公文排版、Word 转 Excel、PDF 转 Markdown / PDF 转 Word、CSV ⇄ Excel、CSV → SQL、JSON 转 Excel、HTML 表格转 Excel、表格合并 / 拆分、Excel 转 Word、Excel 比对、批量重命名、ZIP 压缩 / 解压、虚拟键盘、轻量文本编辑器、智能待办清单、数据透视表生成器、浏览器文本朗读、会议时间协调器、PDF 扫描件效果、在线提词器、PPT 演示文稿生成器、Word 文档预览、办公速查、课堂名单、课程表生成器 |
| 图片处理 | 31 | 图片转换压缩、图片拼接、九宫格、加水印、图片转 Base64、SVG 转 PNG、占位图、印章生成、二维码美化（背景 / Logo）、二维码识别、收款码三合一、图片裁剪 / 旋转、随机色头像、微信名片生成器、图片取色器、证件照尺寸修改、四点透视矫正、图片颜色替换、Favicon 生成器、截图美化、社媒尺寸裁剪、图片滤镜、文字云生成器、社交媒体尺寸指南、图片 EXIF 信息查看、圆角图片生成、图片去白边、图片 / 扫描 PDF OCR、头像挂件生成器、图片像素化 / 马赛克、图片 CSS 裁剪 |
| 文档创作 | 12 | Markdown 预览、Markdown 表格生成器、组织架构图、甘特图、座位牌、简繁转换、歌词转字幕、拼音转换、字帖生成、Markdown 思维导图、Mermaid 图表、中文排版助手 |
| 站长工具 | 105 | 编码转换（含 Gzip / Deflate）、时间戳、JSON 格式化、正则测试、Cron 解析、命名转换、颜色转换、文本工具、二维码（含批量）、WiFi 二维码、文本 Diff、.gitignore、robots.txt、TOTP、IP 子网、哈希、SEO 分享预览、SEO 套件、浏览器与设备、JWT 解析、YAML ⇄ JSON、TOML ⇄ JSON、SQL 格式化、条码生成、CRC 校验、请求片段生成（含 cURL 解析）、XML 格式化、HMAC 签名、JSON 转类型、JSONPath 查询、CSS 生成器、CSS Grid / Flexbox 生成器、Git / Docker 命令生成器、对比度检测、ID 生成、假数据生成、文本相似度、酷炫文字生成、特殊符号大全、超级书签、网页可视化编辑、屏幕检测、屏幕常亮、键盘键码、新拟态生成、毛玻璃生成、SVG 海浪、SVG 压缩、JSON 扁平化 ⇄ 反扁平化、JSON ⇄ SQL、JSON Schema 构建器、HTTP 状态码 / MIME / 端口速查、密码强度检测、Docker Compose 配置生成器、Nginx 配置生成器、JSON → Zod Schema、Chmod 计算器、关键词密度分析器、JSON-LD 结构化数据生成器、UTM 参数生成器、HTTP Headers 分析、GraphQL 格式化、HTML → Markdown、JSON 树形可视化、ASCII Art 文字、CSS 美化 / 压缩、UUID 解析器、YAML 可视化查看器、Git Commit 生成器、Crontab 生成器、CSS 变量生成器、圆角生成器、MAC 地址生成器、配色方案生成器、CSS 动画生成器、代码片段管理器、CSS 虚线边框生成器、HTML 代码格式化、JavaScript 代码格式化、正则表达式可视化、URL 解析拆分、链接批量生成器、Punycode 编解码、文件夹目录树生成、摄像头测试、麦克风测试、键盘测试、鼠标测试、游戏手柄测试、屏幕刷新率与帧率测试、GPU 图形性能测试、扬声器 / 耳机测试、RSA / ECC 密钥工具、AES 加密解密、证书与 CSR 工具、Linux 命令速查、国密 SM2 工具、IPv6 地址计算、文件 ⇄ Base64、OpenAPI / Swagger 查看器、Sitemap 生成器、vCard 二维码、SQL 建表转实体类、XPath 测试器、字体 CSS 样式生成器 |
| 数据驿站 | 30 | 房贷、个税、折扣 / 百分比、单位换算、算钱神器、身份证解析、精确小数计算、汇率换算、进制转换、屏幕量尺、数字转大写、法定退休年龄计算器、数据脱敏、银行卡校验、复利计算器、投资分析计算器、科学计算器、发票税率换算器、JSON → CSV、时区转换器、矩阵计算器、统计计算器、方程求解器、Properties ⇄ YAML、质数判断与因数分解、硬盘整数分区计算、图表生成器、SQLite 查询器、元素周期表、屏幕参数计算 |
| AI 工具集 | 6 | 28 条中文提示词、Token 估算、提示词模板填充、系统提示词生成、AI 绘图提示词、模型成本估算 |
| 休闲娱乐 | 26 | 随机数、UUID / 密码、日期差（含保质期）、BMI、年龄星座生肖、世界时钟、桌面时钟、今天吃什么、番茄钟、万年历、24 点计算、五子棋、迷宫寻路、轮盘抽选、记分板、在线秒表、倒计时器、手机跑马灯、掷筊、亲戚称谓计算器、摩斯密码、年度日历进度、骰子模拟器、在线白板、在线钢琴、打字速度测试 |

## 第 252 版新增的 6 个工具

这一版参考了 toolnb.com 的分类页，去掉依赖服务端、跨域抓取、重库或能力不可靠的候选后，补入 6 个能纯前端完成、且与现有 252 个工具不重复的缺口。6 个工具都没有新增第三方库，PDF 长图复用现有的 pdf.js。

| 工具 | 分类 | 页面脚本 | 本地依赖 | 能力与边界 |
|---|---|---|---|---|
| SQL 建表转实体类 | 站长工具 | `sqlddl.js` | 0 依赖 | 解析常见 MySQL / PostgreSQL / SQLite 的 `CREATE TABLE`，生成 Java 实体（可选 Lombok `@Data`）、Go struct（json / gorm 标签）与 TypeScript interface；支持主键、唯一键、非空、默认值、自增和注释。不连数据库、不上传 SQL，复杂视图 / 触发器 / 方言特有语法不处理 |
| XPath 测试器 | 站长工具 | `xpath.js` | 0 依赖 | 粘贴 XML / HTML，用 `DOMParser` + `document.evaluate` 执行 XPath，支持文本、JSON 数组和节点 HTML 三种输出；只查询粘贴内容，不按 URL 抓取网页，避免跨域与隐私问题 |
| PDF 转长图 | 办公文档 | `pdflong.js` | `pdf.min.js` / `pdf.worker.min.js`（复用） | 逐页渲染 PDF 后纵向拼成一张 PNG，可选 1200 / 1600 / 2000px 宽度和 0 / 12 / 24 / 40px 页间距；最多 30 页，总高度不超过 30000px、总像素不超过 3600 万。文件只在本机渲染，不上传 |
| 图片 CSS 裁剪 | 图片处理 | `clippath.js` | 0 依赖（Canvas） | 上传图片或使用内置示例图，支持多边形、圆形、椭圆、内缩四种 `clip-path` 模式；多边形可拖点、加点、删点、重置，实时生成 CSS，并可导出透明 PNG。输出只影响网页显示，不修改原图 |
| 字体 CSS 样式生成器 | 站长工具 | `fontcss.js` | 0 依赖 | 字体栈、字号、字重、字距、行高、文字颜色与预览文字实时联动，生成 `.typo` 字体声明并复制；不加载远程字体，字体是否可用取决于系统 |
| 打字速度测试 | 休闲娱乐 | `typingtest.js` | 0 依赖 | 自定义练习文本，30 / 60 / 120 秒或不限时；逐字高亮对错，统计时间、字 / 分、正确率与进度。输入内容不保存，刷新即清空 |

新增 6 个脚本合计约 66 KB（未压缩）。工具数从 246 增至 252，分类为 `office 42 / image 31 / doc 12 / web 105 / data 30 / ai 6 / fun 26`。首页脚本、`app.css`、`README.md` 已同步到 252 版，旧版工具脚本继续保留原版本号。

同版还把 3 个候选并入现有工具，不单独占工具数：

| 现有工具 | 本次增强 | 能力与边界 |
|---|---|---|
| 日期差计算 | 新增「保质期计算」面板 | 生产日期 + 保质期（天 / 个月 / 年）→ 到期日、距今天数、剩余或过期状态；按月 / 年顺延时遇到月底会自动收窄到目标月最后一天 |
| 编码转换 | 新增 Gzip / Deflate 两种方式 | 使用浏览器原生 `CompressionStream`，压缩结果以 Base64 输出，解码时粘贴 Base64；不做流式大文件、ZIP 打包或密码加密 |
| 请求片段生成 | 新增「粘贴 cURL」回填 | 解析 `-X` / `-H` / `-d` / `--data-raw` / `--url` / `-u` / `-b` / `-A`，自动填入方法、URL、请求头和请求体；multipart 的 `-F` 文件上传不解析 |

## 第 246 版新增的 6 个工具

用户确认在 240 版基础上继续补 6 个能纯前端完成、且不与现有工具重复的缺口。这一版没有继续追参考站的工具数量，只按「打开就能用、文件不外传、依赖可本地化」的标准筛选；6 个工具都没有新增第三方库。

| 工具 | 分类 | 页面脚本 | 本地依赖 | 能力与边界 |
|---|---|---|---|---|
| OpenAPI / Swagger 查看器 | 站长工具 | `openapi.js` | `js-yaml.min.js`（仅 YAML 时加载） | 粘贴 OpenAPI 3.x 或 Swagger 2.0 的 JSON / YAML，展开接口路径、方法、参数、请求体、响应、tag 与 servers；支持关键词筛选和 Markdown 导出。只读文档，不发起在线试请求；`$ref` 显示引用名，不递归展开整份 Schema |
| PDF 表单填写 | 办公文档 | `pdfform.js` | `pdf-lib.min.js` | 读取 AcroForm 的文本、复选框、下拉框、单选组和多选列表；默认扁平化后下载，也可保留字段。扫描版 / 图片型 PDF 没有字段时明确提示；中文字体由原 PDF 的表单字体决定，填写异常时建议扁平化或更换模板 |
| Sitemap 生成器 | 站长工具 | `sitemap.js` | 0 依赖 | 每行一个 URL，校验 http / https、去掉 hash 片段、自动去重，统一添加 lastmod / changefreq / priority 并生成 `sitemap.xml`；不爬站、不提交搜索引擎。不同页面需要不同元数据时，分多次生成再合并 |
| vCard 二维码 | 站长工具 | `vcard.js` | `qrcode.js` | 姓名、公司、职位、电话、邮箱、网站、地址、备注生成 vCard 3.0 与二维码，可下载 PNG / SVG 或复制原文；字段转义按 vCard 规则处理，扫码后的导入行为由手机通讯录决定 |
| 课程表生成器 | 办公文档 | `timetable.js` | 0 依赖 | 周一至周五 × 6—10 节的网格编辑，实时预览，导出 1500px 宽的 PNG，或在新窗口打印 A4 横向版式；课程内容不写入 localStorage，刷新后不保留 |
| 图片像素化 / 马赛克 | 图片处理 | `mosaic.js` | 0 依赖（Canvas） | 全图块状像素化，或切换到局部马赛克用鼠标 / 手指涂抹；像素块大小和笔刷直径可调，导出 PNG。最长边超过 3000px 时等比缩小；马赛克是像素覆盖，不提供还原 |

新增 6 个脚本合计约 63 KB（未压缩）。工具数从 240 增至 246，分类为 `office 41 / image 30 / doc 12 / web 102 / data 30 / ai 6 / fun 25`。首页脚本、`app.css`、`README.md` 已同步到 246 版，旧版工具脚本继续保留原版本号。

## 第 226 版新增的 6 个开源工具

这一版沿用「纯静态、文件不上传、无 iframe」的约束，只接入能在浏览器里独立完成、依赖可以完整本地化、许可证允许再分发的开源能力。依赖文件放在 `assets/lib/`，许可证原文放在 `assets/licenses/`。

| 工具 | 页面脚本 | 本地依赖 | 许可证 | 能力 |
|---|---|---|---|---|
| PPT 演示文稿生成器 | `pptxgen.js` | PptxGenJS 4.0.1 | MIT | 解析 Markdown 大纲或表格，自动分页生成封面、目录、章节页、正文页、表格页与结束页，支持主题、16:9 / 4:3 和演讲备注，下载标准 `.pptx` |
| 图表生成器 | `chartgen.js` | Chart.js 4.6.1 | MIT | 解析 CSV / TSV / JSON，自动识别标签列与数值列，支持柱状、横向条形、折线、饼图、环形图、雷达图、极区图，实时预览并导出 PNG |
| 图片 / 扫描 PDF OCR | `ocr.js` | Tesseract.js 7.0.0、tesseract.js-core 6.1.2、pdf.js 3.11 | Apache-2.0 | 图片与 PDF 多选，中文 + 英文 / 中文 / 英文识别；PDF 先用 pdf.js 渲染页面，支持页码范围、渲染精度、灰度增强、分页结果、复制与 TXT 下载 |
| SQLite 查询器 | `sqlite.js` | sql.js 1.17.0 | MIT | 把 CSV / JSON 导入内存 SQLite，文件名作表名并推断字段类型；提供示例表、Schema、SQL 执行、结果表格、CSV 与 `.sqlite` 导出 |
| Mermaid 图表 | `mermaid.js` | Mermaid 12.3.0 | MIT | 流程图、时序图、类图、ER、甘特图、思维导图模板，实时渲染，SVG / PNG 导出，缩放与主题跟随；`securityLevel:'strict'`、关闭 HTML 标签以保证导出稳定 |
| Word 文档预览 | `docxview.js` | docx-preview 0.4.1 | Apache-2.0 | 在本地把 DOCX 渲染为分页 HTML，支持页眉页脚 / 批注、缩放、适应宽度，并导出自包含 HTML（图片内嵌、脚本与事件属性已清理），不使用 iframe |

实施中特别处理了两类浏览器限制：pdf.js 的页面渲染改用 `intent:'print'` 并加 45 秒超时，避免后台标签页的 `requestAnimationFrame` 节流让 OCR 永远停在“正在解析 PDF”；Chart.js 关闭入场动画，避免嵌入 / 后台窗口里画布一直空白。Mermaid 关闭 HTML 标签，避免 SVG 里的 `foreignObject` 导致 PNG 导出失败。

## 第 230 版新增的 4 个开发者工具

在参考无名工具网之后，只接入了 4 个能在浏览器本地完成、不依赖服务端的开发者工具；数字 IP 地址转换并入现有「IP 子网计算」，不单列卡片。230 版新增依赖只有一个证书库组合，约 0.23 MB，避免再次出现 226 版 OCR / Mermaid 那样 5 MB 级的体积跳变；234 版只加了 40 KB 的 SM2 构建，其余三个工具零依赖。

| 工具 | 页面脚本 | 本地依赖 | 许可证 | 能力 |
|---|---|---|---|---|
| RSA / ECC 密钥工具 | `cryptotools.js` | WebCrypto（0 依赖） | 浏览器内置 | RSA-OAEP / RSA-PSS 2048、4096 位与 ECDSA P-256 / P-384 密钥生成；SPKI 公钥、PKCS#8 私钥 PEM 复制 / 下载；RSA-PSS 与 ECDSA 签名验签；RSA-OAEP 短文本加解密。只保留 WebCrypto 正确支持的算法，不提供 PKCS#1、512 / 1024 位 RSA、DSA、DH |
| AES 加密解密 | `cryptotools.js` | WebCrypto（0 依赖） | 浏览器内置 | AES-256-GCM，密钥由 PBKDF2-SHA256（310,000 次）从密码派生；文本加密输出 JSON，文件加密输出 `.tben` 容器（版本、迭代次数、盐、IV、密文），文本与文件都可本地解密。不提供 DES、RC4、ECB |
| 证书与 CSR 工具 | `certtool.js` | `@peculiar/x509` 2.2.0、`@abraham/reflection` 0.14.0 | MIT | 本地解析 X.509 证书（PEM / Base64 / DER），显示主体、签发者、有效期、签名算法、公钥算法、SAN、KeyUsage、EKU、BasicConstraints、SKID / AKID、SHA-1 / SHA-256 指纹；生成 RSA 2048 / 4096 或 ECDSA P-256 / P-384 CSR，支持 SAN 与 KeyUsage；解析 CSR 并校验自签名 |
| Linux 命令速查 | `linuxref.js` | 0 依赖 | 静态数据 | 106 条常用命令，覆盖文件与目录、文本处理、进程与系统、网络、包管理、开发；支持分类筛选、关键词搜索、一键复制示例，并对 `rm`、`rsync --delete`、`fdisk`、`mkfs`、`dd` 等标注“谨慎” |

证书库接入时先加载 Reflect polyfill，再加载 x509；否则 `@peculiar/x509` 依赖的 `tsyringe` 会报 “requires a reflect polyfill”。证书和私钥只在当前页面内存中处理，刷新即消失；工具不会根据域名在线拉取证书，也不会上传文件。

## 第 234 版新增的 4 个工具

第二批继续按「纯静态、浏览器本地处理、文件不上传、无 iframe」的标准筛选，补上开发者、图片、文档和休闲各一个。新增依赖只有 `sm-crypto` 的 sm2 构建（40,583 B），在线钢琴、头像挂件和中文排版均为原生 Canvas / Web Audio / 字符串处理，不引入音频、字体或图片素材。

| 工具 | 分类 | 页面脚本 | 本地依赖 | 许可证 | 能力 |
|---|---|---|---|---|---|
| 国密 SM2 工具 | 站长工具 | `sm2tool.js` | `sm-crypto` 0.5.9 的 `sm2.js` | MIT | 生成 64 位私钥与 130 位未压缩公钥，支持公钥校验、压缩到 66 位、私钥导出公钥；SM2 加密解密支持 C1C3C2 / C1C2C3；签名验签支持 SM3 杂凑、可改 UserId、R+S 与 ASN.1 DER 两种签名格式，密钥和密文都兼容 Hex / Base64。不做 SM4、不做证书格式转换 |
| 在线钢琴 | 休闲娱乐 | `piano.js` | Web Audio（0 依赖） | 浏览器内置 | 双八度 24 键，鼠标 / 触屏 / 电脑键盘均可弹奏；三角波、正弦波、方波、锯齿波四种音色，音量与延音可调；内置《小星星》《欢乐颂》《生日快乐》三首公共领域练习曲，可播放和停止，不加载任何音频文件 |
| 头像挂件生成器 | 图片处理 | `avatarframe.js` | Canvas（0 依赖） | 浏览器内置 | 上传头像后圆形裁剪，支持缩放与左右 / 上下平移；国庆、春节、中秋、毕业、生日五种主题，圆环粗细和挂件文字可调；导出 512 / 800 / 1024 透明背景 PNG，图片只在本地处理 |
| 中文排版助手 | 文档创作 | `cntypeset.js` | 原生字符串处理（0 依赖） | 无 | 一键排版、中文与英文 / 数字之间加空格、中文语境下的半角标点转全角、清理连续空格与行尾空白、段首缩进 / 去缩进；同时统计字符、汉字、英文词、行数与段落数 |

没有放进这一批的项：证书格式转换（PEM ⇄ DER 价值有限，PKCS#12 / JKS 需要额外重库和密码处理，与体积约束冲突）、文章生成器（随机拼句质量不可控）、支付宝到账语音（存在伪造到账提示的伦理风险）。网页源代码查看、在线图片编辑、字数统计与现有 HTML 格式化、图片裁剪 / 滤镜 / 水印、文本工具重叠，暂不单列。

## 第 240 版新增的 6 个工具

第三批参考办公兔工具箱（`ttt.cm` 是目录页，工具落在 `officetu.com`）。抓取首页后统计到 498 个卡片、454 个唯一工具，PDF、图片、编码、文本、数学和万年历与本站重合度很高；WHOIS、DNS、SSL 检测、HTTP 状态、FTP、WebSocket 等依赖第三方接口，健康预测、彩票、宝宝血型、到账音效和品牌梗等风险较高，均不接。最终只补 6 个结构性缺口，不复制源站代码、素材或页面视觉。

| 工具 | 分类 | 页面脚本 | 本地依赖 | 许可证 | 能力 |
|---|---|---|---|---|---|
| IPv6 地址计算 | 站长工具 | `ipv6.js` | BigInt（0 依赖） | 浏览器内置 | 解析 `::` 缩写、CIDR 前缀、`%zone` 与 `::ffff:192.168.1.1` 映射写法；输出压缩 / 完整展开、网络地址、末地址、地址总数与地址类型；支持 IPv6 ⇄ 128 位十进制 / 十六进制 / 二进制整数，全部用 BigInt 精确计算 |
| 文件 ⇄ Base64 | 站长工具 | `filebase64.js` | FileReader + Blob（0 依赖） | 浏览器内置 | 任意文件转纯 Base64 或 Data URL，显示文件名、大小、MIME 与字符数；支持复制、下载 TXT；反向解析纯 Base64 / `data:...;base64,`，按文件名或 Data URL 推断类型并还原文件。超过 20 MB 给出内存提示 |
| 办公速查 | 办公文档 | `officecheat.js` | 静态数据（0 依赖） | 无 | 62 条 Excel 常用函数（数学统计、逻辑、查找、文本、日期），以及 Excel 34、Word 35、PPT 28、WPS 28、VS Code 24、Photoshop 35 条快捷键；分标签、关键词过滤、一键复制，注明 Windows 口径 |
| 元素周期表 | 数据驿站 | `periodic.js` | 静态数据（0 依赖） | 公开化学数据 | 118 个元素的原子序数、符号、中文名、相对原子质量、分类、周期族、常温状态、电子排布、电负性与熔沸点；周期表 / 列表双视图、搜索、分类筛选、元素详情；104 号以后标注理论预测 |
| 课堂名单 | 办公文档 | `roster.js` | 复用 `pinyin-pro` | MIT | 粘贴名单后按拼音 A→Z / Z→A、随机或恢复原序；随机点名一轮内不重复，点完自动开启下一轮；名单存本机 localStorage，可复制、导出 TXT / CSV。不做笔画排序 |
| 屏幕参数计算 | 数据驿站 | `screencalc.js` | 0 依赖 | 无 | 输入对角线英寸与分辨率，计算 PPI、点距、物理宽高、面积、宽高比；按 THX 40°、SMPTE 30° 与 1.5—2 倍屏高给出观看距离估算，附 7 个常见设备预设，注明不是护眼或购买建议 |

这一批没有新增第三方库：IPv6 用 BigInt，文件 Base64 用 FileReader / Blob，办公速查与周期表是内置静态数据，课堂名单复用已有的 325 KB `pinyin-pro`，屏幕参数是纯算术。新增 6 个脚本合计约 87 KB（未压缩），站点工具数从 234 增至 240，分类为 `office 39 / image 29 / doc 12 / web 99 / data 30 / ai 6 / fun 25`。

元素周期表的数据从公开的 PeriodicTableJSON 数据集整理，只保留原子序数、符号、中文名、相对原子质量、分类、周期族、状态、电子排布、电负性与熔沸点等客观字段，不复制第三方描述文本。该数据集仓库没有 LICENSE 文件，README 只写“Feel free to use it”，因此这里把它记为公开化学数据，不再额外声明为 MIT；104 号以后元素的熔沸点和部分性质多为理论预测值。

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
│   │       │                # Diff、.gitignore、robots、TOTP、子网（含数字 IP）、哈希
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
│   │       ├── stats.js     # 统计计算器（平均数 / 中位数 / 方差 / 四分位数）
│   │       ├── eqsolve.js   # 方程求解器（一元一次 / 二次，实数根与复根）
│   │       ├── macgen.js    # MAC 地址生成器（随机 / OUI / 多种格式）
│   │       ├── propsyaml.js # Properties ⇄ YAML（嵌套键与数组）
│   │       ├── yearprogress.js # 年度日历进度（年 / 月 / 周环形与进度条）
│   │       ├── dice.js      # 骰子模拟器（d4–d20 / 加值 / 历史）
│   │       ├── primes.js    # 质数判断与因数分解（试除法 + 约数 / 欧拉 φ）
│   │       ├── palette.js   # 配色方案生成器（单色 / 类似 / 互补 / 三角 / 分裂互补 / 色阶）
│   │       ├── cssanim.js   # CSS 动画生成器（关键帧 + 参数调校 + 预览）
│   │       ├── snippets.js  # 代码片段管理器（localStorage + 搜索 / 导入导出）
│   │       ├── meeting.js   # 会议时间协调器（IANA 时区 + 工作时段重叠）
│   │       ├── whiteboard.js # 在线白板（Canvas 画笔 / 橡皮 / 撤销 / PNG）
│   │       ├── toolwa-a.js  # 虚线边框 / HTML、JS 格式化 / 正则可视化 / EXIF / PDF 扫描件
│   │       ├── toolwa-b.js  # 圆角图 / 去白边 / URL 解析 / 链接批量 / Punycode / 目录树 / 提词器 / 分区
│   │       ├── toolwa-c.js  # 摄像头 / 麦克风 / 键盘 / 鼠标 / 手柄 / 刷新率 / GPU / 扬声器
│   │       ├── pptxgen.js   # PPT 演示文稿生成器（Markdown / 表格 → 标准 .pptx）
│   │       ├── chartgen.js  # 图表生成器（CSV / JSON → 7 种图表 + PNG）
│   │       ├── ocr.js       # 图片 / 扫描 PDF OCR（Tesseract.js + pdf.js）
│   │       ├── sqlite.js    # SQLite 查询器（CSV / JSON → 内存数据库）
│   │       ├── mermaid.js   # Mermaid 图表（流程图 / 时序图 / 甘特图等）
│   │       ├── docxview.js  # Word 文档预览（分页 HTML + 离线导出）
│   │       ├── cryptotools.js # RSA / ECC 密钥工具 + AES 加密解密（WebCrypto）
│   │       ├── certtool.js  # 证书查看 / CSR 生成与解析（x509 + reflection）
│   │       ├── linuxref.js  # Linux 命令速查（106 条静态命令）
│   │       ├── sm2tool.js   # 国密 SM2（密钥 / 加密解密 / 签名验签，sm-crypto）
│   │       ├── piano.js     # 在线钢琴（Web Audio 双八度键盘 + 示例曲）
│   │       ├── avatarframe.js # 头像挂件生成器（Canvas 圆形裁剪 + 五种主题）
│   │       ├── cntypeset.js # 中文排版助手（空格 / 标点 / 缩进 / 统计）
│   │       ├── ipv6.js      # IPv6 地址计算（压缩 / 网段 / 128 位整数）
│   │       ├── filebase64.js # 文件 ⇄ Base64（Data URL / 文件还原）
│   │       ├── officecheat.js # 办公速查（62 条 Excel 函数 + 184 条快捷键）
│   │       ├── periodic.js  # 元素周期表（118 元素 + 分类筛选 / 详情）
│   │       ├── roster.js    # 课堂名单（拼音排序 + 随机点名 + localStorage）
│   │       ├── screencalc.js # 屏幕参数计算（PPI / 宽高比 / 观看距离）
│   │       ├── openapi.js   # OpenAPI / Swagger 查看器（JSON / YAML → Markdown）
│   │       ├── pdfform.js    # PDF 表单填写（AcroForm 字段 + 扁平化下载）
│   │       ├── sitemap.js    # Sitemap 生成器（URL 列表 → sitemap.xml）
│   │       ├── vcard.js      # vCard 二维码（vCard 3.0 + PNG / SVG）
│   │       ├── timetable.js  # 课程表生成器（5 天 × 6—10 节，PNG / 打印）
│   │       ├── mosaic.js     # 图片像素化 / 马赛克（全图 + 局部画笔）
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
│       ├── smol-toml.js     # smol-toml 1.4.2（TOML 解析 / 序列化，BSD-3-Clause）
│       ├── pptxgen.bundle.js # PptxGenJS 4.0.1（生成 .pptx，MIT）
│       ├── chart.umd.min.js  # Chart.js 4.6.1（Canvas 图表，MIT）
│       ├── tesseract.min.js  # Tesseract.js 7.0.0（OCR 调度，Apache-2.0）
│       ├── tesseract.worker.min.js
│       ├── tesseract-core-simd-lstm.wasm.js # tesseract.js-core 6.1.2（Apache-2.0）
│       ├── sql-wasm.js      # sql.js 1.17.0（WebAssembly SQLite，MIT）
│       ├── sql-wasm.wasm
│       ├── mermaid.min.js   # Mermaid 12.3.0（图表渲染，MIT）
│       ├── docx-preview.min.js # docx-preview 0.4.1（DOCX 渲染，Apache-2.0）
│       ├── x509.js          # @peculiar/x509 2.2.0（证书 / CSR 解析与生成，MIT）
│       ├── reflection.js    # @abraham/reflection 0.14.0（Reflect metadata polyfill，MIT）
│       ├── sm2.js           # sm-crypto 0.5.9 的 SM2 构建（国密密钥 / 加解密 / 签名，MIT）
│       └── tessdata/        # OCR 语言包（eng / chi_sim，gzip）
│           ├── eng.traineddata.gz
│           └── chi_sim.traineddata.gz
│   └── licenses/            # 第三方许可证原文（PptxGenJS / Chart.js / Tesseract / sql.js / Mermaid / docx-preview / x509 / reflection / sm-crypto）
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
- 文件处理全在浏览器内存里完成，关闭标签页即消失；`localStorage` 只存六样东西：主题、手动城市、发薪日、本机使用次数、定位结果缓存、课堂名单。
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
- **IPv6 地址计算**用 BigInt 保证 128 位精度，需要浏览器支持 BigInt；不支持 IE。网段结果中的“地址总数”是地址空间大小，不代表可分配主机数；IPv6 没有 IPv4 那样的广播地址概念。
- **文件 ⇄ Base64** 通过 FileReader 一次性读取，超大文件会同时占用原文件、Data URL 与 Base64 字符串的内存；超过 20 MB 只给提示，不硬性拦截。Base64 不是加密，不能用来保护敏感文件。
- **办公速查**是人工整理的静态速查表，不是完整函数手册；Excel 函数语法以 Microsoft 365 / Excel 2021 为参考，XLOOKUP、FILTER、UNIQUE、SORT、IFS 等新函数在旧版本中可能不可用。快捷键以 Windows 版为准，WPS 与 Office 大部分通用，个别组合可能被系统或其他软件占用。
- **元素周期表**的相对原子质量取常用值，放射性元素为半衰期最长同位素的质量数近似值；104 号以后元素的熔沸点与部分性质多为理论预测，仅供学习参考。周期表采用 18 族布局，镧系 / 锕系单独列出。
- **课堂名单**的拼音排序依赖 pinyin-pro，多音字姓名按常用读音处理，排序后建议人工核对；名单保存在本机 localStorage，换浏览器或清除站点数据后不会同步；不提供笔画排序，也没有服务端班级管理。
- **屏幕参数计算**的观看距离是几何视角估算：THX 40°、SMPTE 30° 与 1.5—2 倍屏高只是常见参考，不构成护眼、医疗或购买建议；PPI 按正方形像素计算，Pentile 等非标准像素排列会有偏差。

- **JWT 解析**只做 Base64URL 解码与 HMAC（HS256/384/512）验签；RS256 / ES256 需要公钥，页面只显示结构、不验签，也不会联网取 JWKS。
- **YAML ⇄ JSON** 依赖 js-yaml，遇到重复键会按 YAML 规范报错；超大的多文档 YAML（`---` 分隔）只解析第一份。
- **SQL 格式化**是按关键字换行缩进的轻量美化，不做语法校验，也不会改写你写的表达式；存储过程、方言特有语法可能排得不理想。参数填充只替换字符串与注释之外的占位符。
- **条码生成**只支持 Code 128 / EAN-13 / EAN-8 / Code 39 / ITF-14 / UPC-A 六种；EAN/UPC 位数不对会直接报错，不会生成一张扫不出来的图。
- **CRC 校验**固定四个标准参数（CRC32/IEEE、CRC16/MODBUS、CRC16/CCITT-FALSE、CRC8），不提供自定义多项式。
- **歌词转字幕**只认 `[mm:ss.xx]` 时间标签，纯文本歌词没有时间轴就转不了；每条时长取「到下一句为止」和「设定值」的较小者。
- **进制转换**整数用 BigInt 精确计算，小数按目标进制逐位展开、最多保留 12 位（二进制除不尽会有舍入）。
- **请求片段生成**只输出 curl / fetch / Python requests / axios / Go 五种写法，不做签名、鉴权或环境变量替换；可以直接粘贴常见 cURL 命令回填表单，但 multipart 的 `-F` 文件上传不解析。
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
- **统计计算器**只接受数字，不支持 `1,000` 这种带千分位的写法；样本方差与样本标准差至少需要 2 个数据，输入 1 个时显示 `—`。四分位数用 R-7 线性插值，与部分统计软件的口径可能不同。
- **方程求解器**只覆盖一元一次与一元二次实系数方程，不处理三次以上、方程组、不等式或符号解；二次方程 `a=0` 时按一次方程回退，复数根只做展示。
- **MAC 地址生成器**不查询厂商数据库，也不保证生成的地址在现实中唯一或可分配；固定 OUI 时只替换前 3 字节，随机地址默认设为单播 + 本地管理类型。请勿把生成结果直接用于真实网络设备。
- **Properties ⇄ YAML**不保留注释，点号键会被当作嵌套路径，键名本身含字面点号时无法无损往返；YAML 只解析单文档，多文档 `---` 需要拆开处理。
- **年度日历进度**按浏览器本地时区计算，周数使用 ISO 8601 规则；只显示时间比例，不包含调休、节假日安排。
- **骰子模拟器**使用 `Math.random`，不是密码学随机数，不适合真实抽奖、赌博或需要可验证公平性的场景；历史记录只存在当前页面内存，刷新即清空。
- **国密 SM2 工具**使用纯 JS 的 `sm-crypto` 0.5.9，密钥与签名都在浏览器内存中处理；它适合开发调试和轻量业务，但不是经过侧信道加固的硬件密码实现，生产环境的高价值密钥建议使用国密硬件密码机或经认证的密码库。只做 SM2 / SM3 签名与 SM2 加解密，不做 SM4、PKCS#7 / PKCS#12 证书转换。
- **在线钢琴**用 Web Audio 实时合成，不是采样钢琴音源，音色偏电子；不输出 MIDI，也不支持多指和弦录制。示例曲只选公共领域旋律，不内置受版权保护的流行歌曲。
- **头像挂件生成器**只做圆形裁剪、缩放平移和矢量挂件，不做 AI 抠图、人脸识别或自动构图；上传图片的版权与肖像权由使用者自行确认，图片不会离开浏览器。
- **中文排版助手**是规则处理，不是完整排版引擎：只处理中英文间距、中文语境标点、连续空格和段首缩进，不懂 Markdown / 代码块语义，处理含代码的文本前建议先备份。

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
| 请求片段生成 | curl / fetch / Python / axios / Go；支持粘贴 cURL 回填 |
| 进制转换 | BigInt 任意 2–36 进制，负数与 `0x` 前缀 |

**没接的**：DES / 3DES / RC4 / SM4 / bcrypt（这些算法要么已被淘汰，要么需要额外的国密库与测试向量；做浅了容易让人误用不安全参数）、WebSocket 调试（必须有服务端配合，静态站只能当摆设）、ARM 指令转机器码（受众极窄），以及更复杂的 IP 规划（本站已有「IP 子网」「IPv6 地址计算」）、URL 解析、表单序列化、变量名转换（本站已有「编码转换」「命名转换」覆盖同类需求）。拼音转换已接入本地 pinyin-pro（325KB，MIT），支持声调、数字声调与首字母；多音字按常用读音。AES、RSA / ECC 与证书 / CSR 已在第 230 版按 WebCrypto 和 `@peculiar/x509` 的正确参数范围单独接入，不使用本轮 Ctool 的重型打包文件；SM2 在第 234 版用 MIT 的 `sm-crypto` 单独接入；IPv6 在第 240 版用原生 BigInt 接入。

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

**没接的**：IP 归属地 / DNS 查询 / WHOIS / SSL 证书检测 / HTTP 接口测试（都要请求第三方服务，纯静态站绕不开跨域与密钥）、AI 增强类 12 个（需要模型 API Key 与计费）、bcrypt / SSH 密钥 / SM4（需要额外的算法库与参数校验；当时未做浅层实现）、JSON / Markdown / YAML / SQL / CSS / JS / CSV 格式化（本站已有 JSON、YAML、SQL、CSS 生成、CSV 互转，重复的不再堆一个）、时间戳 / UUID / 时间换算 / 单位换算 / 颜色转换（已有同名工具）。证书与 CSR 后来在第 230 版用本地 `@peculiar/x509` 单独接入；AES 与 RSA / ECC 用 WebCrypto 接入；SM2 在第 234 版用 `sm-crypto` 接入。剩下这些仍在评估、尚未接入：TOML ⇄ JSON（已由 NewKit 批次接入）、ROT13 / Punycode / ASCII 码表、色盲模拟、Tailwind 色板、SemVer 解析、许可证 / README / Meta 生成、EXIF 读取、罗马数字、JSON 表格互转（JSON Schema 校验已由 NewKit 批次单独接入）、HTTP 状态码 / MIME / 端口速查。

## 关于 NewKit（newkit.site）的功能对照

参考 [newkit.site/tools](https://www.newkit.site/tools/) 的 233 个工具清单（开发者 94、文档 15、文本 25、图像 33、数据转换 15、加密 10、媒体 10、网络 16、数学 15）做逐项比对。NewKit 有大量工具与本站已有的格式化、二维码、PDF、图片压缩重复，或依赖后端、第三方接口、AI Key、ffmpeg 与代码沙箱；本站只挑选**纯静态、浏览器本地可完成**的能力，第一批接入 6 个，第二批再接入 6 个，第三批再接入 6 个，第四批再接入 6 个，第五批再接入 6 个，第六批再接入 6 个，第七批再接入 6 个，第八批再接入 6 个，第九批再接入 6 个，第十批再接入 6 个，共 60 个。

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
| 统计计算器 | 数据驿站 | 粘贴一组数字，计算个数、总和、平均、中位数、极值、极差、总体 / 样本方差与标准差、Q1/Q3/IQR 和众数；四分位数用 R-7 线性插值 |
| 方程求解器 | 数据驿站 | 一元一次 `ax+b=0` 与一元二次 `ax²+bx+c=0`；按判别式输出两个实根、重根或共轭复根，`a=0` 自动回退一次方程 |
| MAC 地址生成器 | 站长工具 | 批量生成 1–50 个随机 MAC，可选 OUI 前缀，支持冒号 / 连字符 / 无分隔 / Cisco 点分格式与大小写；随机地址默认为单播 + 本地管理类型 |
| Properties ⇄ YAML | 数据驿站 | Java `.properties` 与 YAML 双向转换；支持注释、续行、`\uXXXX` 转义，点号 / `[n]` 键还原为嵌套对象或数组 |
| 年度日历进度 | 休闲娱乐 | 选择日期查看年度环形进度、本月 / 本周横向进度、第几天、剩余天数与 ISO 周数 |
| 骰子模拟器 | 休闲娱乐 | 一次掷 1–6 个 d4/d6/d8/d10/d12/d20，支持固定加值、总点数 / 平均值、最近 10 次记录与复制 |
| 质数判断与因数分解 | 数据驿站 | 6k±1 试除判断 1e12 以内的质数，输出质因数分解、约数个数、约数和与欧拉 φ(n) |
| 配色方案生成器 | 站长工具 | 以主色生成单色、类似、互补、三角、分裂互补与明暗色阶六组配色，点色块复制 HEX，导出 30 个 CSS 变量 |
| CSS 动画生成器 | 站长工具 | 淡入、滑入、缩放、旋转、弹跳、翻转、摇摆、脉冲八种关键帧，调时长 / 延迟 / 曲线 / 循环 / 方向并实时预览 |
| 代码片段管理器 | 站长工具 | localStorage 保存标题、语言、标签与代码，支持搜索、复制、编辑、删除及 JSON 导入导出 |
| 会议时间协调器 | 办公文档 | 按 UTC 日期把 0–23 点换算到多个 IANA 时区，按各人工作时段寻找全员重叠；没有重叠时给出最大重合 |
| 在线白板 | 休闲娱乐 | Canvas 画笔、橡皮、颜色、粗细、撤销、清空与导出 PNG；内部画布 1600×900，响应式缩放 |

**没接的**：视频 / 音频媒体工具（需要 ffmpeg 或服务端重编码）、IP / DNS / WHOIS / 网速 / 短链（依赖第三方接口或服务端）、AI 类（需要模型 Key 与计费）、代码运行器 / API Mock / 在线协作（需要沙箱或后端）、PDF → PPT / Word → PDF / PDF 加密（依赖重型引擎或密码学参数）、国密 SM4（需要额外算法库与测试向量），以及与现有 252 个重复的格式化 / 转换 / 二维码 / PDF / 图片压缩工具。前两批已接入 12 个；第三批接入截图美化、社媒尺寸裁剪、图片滤镜、HTTP 状态码 / MIME / 端口速查、密码强度检测、复利计算器；第四批接入数据透视表、Docker Compose、Nginx、文字云、浏览器文本朗读、Markdown 思维导图；第五批接入 JSON → Zod Schema、Chmod 计算器、关键词密度分析器、JSON-LD 结构化数据生成器、UTM 参数生成器、投资分析计算器；第六批接入 HTTP Headers 分析、GraphQL 格式化、HTML → Markdown、JSON 树形可视化、社交媒体尺寸指南、ASCII Art 文字；第七批接入 CSS 美化 / 压缩、UUID 解析器、YAML 可视化查看器、Git Commit 生成器、科学计算器、发票税率换算器；第八批接入 Crontab 生成器、CSS 变量生成器、圆角生成器、JSON → CSV、时区转换器、矩阵计算器；第九批接入统计计算器、方程求解器、MAC 地址生成器、Properties ⇄ YAML、年度日历进度、骰子模拟器；第十批接入质数判断与因数分解、配色方案生成器、CSS 动画生成器、代码片段管理器、会议时间协调器、在线白板；第 230 版接入 RSA / ECC、AES、证书 / CSR 与 Linux 命令速查；第 234 版接入国密 SM2、在线钢琴、头像挂件与中文排版；第 240 版接入 IPv6 地址计算、文件 ⇄ Base64、办公速查、元素周期表、课堂名单与屏幕参数计算；第 246 版接入 OpenAPI / Swagger 查看器、PDF 表单填写、Sitemap 生成器、vCard 二维码、课程表生成器与图片像素化 / 马赛克；第 252 版接入 SQL 建表转实体类、XPath 测试器、PDF 转长图、图片 CSS 裁剪、字体 CSS 样式生成器与打字速度测试。更多纯静态的格式化、转换与视觉类工具可按同样标准继续接入。

## 关于 Toolwa（工具哇）镜像的功能对照

用户提供的本地镜像 `toolwa-mirror.pre-jd-20261013` 根索引收录 145 个工具入口。镜像页面沿用 Toolwa 旧模板，很多逻辑写在内联代码或压缩缓存里，**不能直接复制**；本站按 `TB.def({ slug, cat, name, desc, icon, kw, render })` 重新实现，样式继续使用 `.panel`、`.btn`、`.field` 等现有类。

本轮接入 22 个，分三组：

- 开发与文档组 6 个（`toolwa-a.js`）：CSS 虚线边框生成器、HTML 代码格式化、JavaScript 代码格式化、正则表达式可视化、图片 EXIF 信息查看、PDF 扫描件效果。
- 图片与实用组 8 个（`toolwa-b.js`）：圆角图片生成、图片去白边、URL 解析拆分、链接批量生成器、Punycode 编解码、文件夹目录树生成、在线提词器、硬盘整数分区计算。
- 硬件检测组 8 个（`toolwa-c.js`）：摄像头测试、麦克风测试、键盘测试、鼠标测试、游戏手柄测试、屏幕刷新率与帧率测试、GPU 图形性能测试、扬声器 / 耳机测试。

| 已接入 | 分类 | 实现说明 |
|---|---|---|
| CSS 虚线边框生成器 | 站长工具 | 用 SVG `rect` 生成 `stroke-dasharray` 背景，调线宽、虚线长度、间距、颜色、圆角和底色；输出可直接复制的 CSS data URI |
| HTML 代码格式化 | 站长工具 | 自写标签扫描器，按标签层级缩进；script、style、pre、textarea 内部原文不重排 |
| JavaScript 代码格式化 | 站长工具 | 字符串 / 注释 / 正则感知的轻量格式化器，整理大括号、分号、逗号和常见二元运算符；不替代 Prettier |
| 正则表达式可视化 | 站长工具 | 自写子集解析器，渲染分组、分支、字符集、转义、锚点和量词结构树；不引入镜像里约 1MB 的 regexper 打包文件 |
| 图片 EXIF 信息查看 | 图片处理 | 解析 JPEG APP1 / TIFF IFD，读取相机、镜头、曝光、光圈、ISO、焦距、方向、GPS 和全部标签；非 JPEG 明确提示无 EXIF |
| PDF 扫描件效果 | 办公文档 | 复用本地 pdf.js 渲染页面，做灰度、对比度、纸张底色和随机噪点，支持预览单页与 ZIP 批量导出 PNG |
| 圆角图片生成 | 图片处理 | Canvas 圆角路径裁剪，半径按短边百分比；PNG 保留透明角，JPEG 自动铺白底 |
| 图片去白边 | 图片处理 | 扫描四边像素，按容差识别白色或透明背景，取其包围盒并加留白后裁剪；显示原图与结果尺寸 |
| URL 解析拆分 | 站长工具 | 用浏览器 `URL` API 拆协议、主机、端口、路径、查询串、锚点、用户名和密码，查询参数逐条列表 |
| 链接批量生成器 | 站长工具 | 用 `{n}` 模板按起止值和步长生成链接，支持补零、去重、复制与 txt 下载；上限 5000 条 |
| Punycode 编解码 | 站长工具 | RFC 3492 纯前端实现，逐域名标签处理中文域名与 `xn--` ASCII 域名互转 |
| 文件夹目录树生成 | 站长工具 | 多行路径构建树，输出 `├─` / `└─` ASCII 目录树，可排序、加根目录名并下载 |
| 在线提词器 | 办公文档 | 大字号台词自动滚动，调字号、速度、水平镜像，支持暂停、回开头与全屏 |
| 硬盘整数分区计算 | 数据驿站 | NTFS 按 7.84423828125 MB 对齐向上取整，FAT32 用 `1028×GB−4`；显示应输入的 MB、字节数和常用容量表 |
| 摄像头测试 | 站长工具 | `getUserMedia` 本地预览，显示设备名、实际分辨率、帧率和朝向；关闭页面路由时停止轨道 |
| 麦克风测试 | 站长工具 | Web Audio `AnalyserNode` 实时显示 RMS、峰值、估算 dBFS 和波形；停止时关闭 AudioContext |
| 键盘测试 | 站长工具 | 在测试区监听 keydown / keyup，显示 key、code、keyCode、位置和修饰键；只拦截空格与方向键等页面滚动键 |
| 鼠标测试 | 站长工具 | 指针移动、按下、松开、单击、双击、右键和滚轮计数，显示相对坐标与事件日志 |
| 游戏手柄测试 | 站长工具 | 轮询 Gamepad API，列出设备、按键值、按下状态和摇杆轴；无设备时给出连接提示 |
| 屏幕刷新率与帧率测试 | 站长工具 | requestAnimationFrame 采集 3 秒帧间隔，估算 FPS / 刷新率、平均间隔、最短最长和明显掉帧次数 |
| GPU 图形性能测试 | 站长工具 | WebGL 2 绘制 20,000 个旋转粒子并统计 3 秒帧率；WebGL 不可用时自动替换为 Canvas 2D 回退 |
| 扬声器 / 耳机测试 | 站长工具 | Web Audio 生成指定频率正弦波，可选左右声道与音量；用于检查耳机和双声道输出 |

**没接的**：备案查询、微信拦截检测、DNS 查询、下拉词、IP 归属地、MAC 厂商、手机归属地、VIN 解析、Whois、网页缩略图等依赖第三方接口或后端的工具；OCR、全能视频、音频编辑器等依赖大模型或大编码库的工具；塞尔达类版权内容。镜像里与本站已有的 CRC、条码、子网、2FA、亲戚称谓、在线白板、屏幕检测、正则测试、命名转换、Diff、JSON / SQL / XML / YAML 格式化、键码、UUID、科学计算器、进制转换、统计计算器、时间戳、迷宫等重复的条目也不重复接入。
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

**没接的**：工具哇 / 在线 PS / 白板 / 音频编辑器 / 屏幕录制 / FC 游戏 / 谷歌电吉他 / 手鼓猫 / 架子鼓（外链应用、素材体积或交互工程量过大）；LOGO 生成（涉及品牌仿制）；艺术二维码（本站已有二维码生成 / 美化 / 识别三个工具）；中国家庭称谓 / 屏幕检测 / 屏幕常亮 / IP 地址查询 / 浏览器 UA / 进制转换 / 文本差异 / 字数统计 / HTML 转义 / MD5 / 时间戳 / 密码 / JSON / Markdown / 图片 Base64 / PDF 拆分合并（本站已有对应工具）；聚合翻译 / 手机号归属地 / DNS / Whois / 网址安全检测 / 聚合图床 / WordPress 主题嗅探 / GitHub 文件夹下载（需要服务端、数据库或第三方接口）。Autoprefixer / js 混淆加密 / CSS 美化暂不引入，避免为了几个正则再背一个大库。

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
