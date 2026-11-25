/* =============================================================================
 * 办公速查
 * -----------------------------------------------------------------------------
 * 静态数据：Excel 常用函数 + Excel / Word / PPT / WPS / VS Code / Photoshop
 * 快捷键。没有网络请求，数据直接内置；搜索只在当前标签内过滤。
 * 快捷键以 Windows 版为准，macOS 以 Cmd 替代 Ctrl 的地方不逐条展开。
 * ========================================================================== */

(function () {
  'use strict';

  var GROUPS = [
    {
      id: 'excelFn', label: 'Excel 函数', type: 'fn',
      items: [
        { n: 'SUM', g: '数学统计', d: '求和', s: '=SUM(数值1, [数值2], ...)' },
        { n: 'SUMIF', g: '数学统计', d: '按单条件求和', s: '=SUMIF(条件区域, 条件, [求和区域])' },
        { n: 'SUMIFS', g: '数学统计', d: '按多条件求和', s: '=SUMIFS(求和区域, 条件区域1, 条件1, [条件区域2, 条件2], ...)' },
        { n: 'AVERAGE', g: '数学统计', d: '求平均值', s: '=AVERAGE(数值1, [数值2], ...)' },
        { n: 'AVERAGEIF', g: '数学统计', d: '按单条件求平均', s: '=AVERAGEIF(条件区域, 条件, [平均区域])' },
        { n: 'COUNT', g: '数学统计', d: '统计数字个数', s: '=COUNT(值1, [值2], ...)' },
        { n: 'COUNTA', g: '数学统计', d: '统计非空单元格个数', s: '=COUNTA(值1, [值2], ...)' },
        { n: 'COUNTIF', g: '数学统计', d: '按单条件计数', s: '=COUNTIF(区域, 条件)' },
        { n: 'COUNTIFS', g: '数学统计', d: '按多条件计数', s: '=COUNTIFS(区域1, 条件1, [区域2, 条件2], ...)' },
        { n: 'MAX', g: '数学统计', d: '最大值', s: '=MAX(数值1, [数值2], ...)' },
        { n: 'MIN', g: '数学统计', d: '最小值', s: '=MIN(数值1, [数值2], ...)' },
        { n: 'LARGE', g: '数学统计', d: '第 k 大的值', s: '=LARGE(数组, k)' },
        { n: 'SMALL', g: '数学统计', d: '第 k 小的值', s: '=SMALL(数组, k)' },
        { n: 'ROUND', g: '数学统计', d: '四舍五入到指定小数位', s: '=ROUND(数值, 小数位数)' },
        { n: 'ROUNDUP', g: '数学统计', d: '向上舍入', s: '=ROUNDUP(数值, 小数位数)' },
        { n: 'ROUNDDOWN', g: '数学统计', d: '向下舍入', s: '=ROUNDDOWN(数值, 小数位数)' },
        { n: 'INT', g: '数学统计', d: '向下取整为整数', s: '=INT(数值)' },
        { n: 'ABS', g: '数学统计', d: '绝对值', s: '=ABS(数值)' },
        { n: 'MOD', g: '数学统计', d: '取余数', s: '=MOD(被除数, 除数)' },
        { n: 'POWER', g: '数学统计', d: '乘幂', s: '=POWER(底数, 指数)' },
        { n: 'SQRT', g: '数学统计', d: '平方根', s: '=SQRT(数值)' },
        { n: 'RANK', g: '数学统计', d: '排名（旧版函数，新版可用 RANK.EQ）', s: '=RANK(数值, 引用, [排序方式])' },

        { n: 'IF', g: '逻辑判断', d: '按条件返回不同结果', s: '=IF(条件, 真值, [假值])' },
        { n: 'IFS', g: '逻辑判断', d: '多条件依次判断', s: '=IFS(条件1, 值1, 条件2, 值2, ...)' },
        { n: 'AND', g: '逻辑判断', d: '所有条件都成立', s: '=AND(条件1, [条件2], ...)' },
        { n: 'OR', g: '逻辑判断', d: '任一条件成立', s: '=OR(条件1, [条件2], ...)' },
        { n: 'NOT', g: '逻辑判断', d: '取反', s: '=NOT(条件)' },
        { n: 'IFERROR', g: '逻辑判断', d: '出错时返回指定值', s: '=IFERROR(值, 出错时返回)' },
        { n: 'IFNA', g: '逻辑判断', d: '仅处理 #N/A 错误', s: '=IFNA(值, 找不到时返回)' },

        { n: 'VLOOKUP', g: '查找引用', d: '按首列纵向查找', s: '=VLOOKUP(查找值, 表格区域, 列序号, [匹配方式])' },
        { n: 'HLOOKUP', g: '查找引用', d: '按首行横向查找', s: '=HLOOKUP(查找值, 表格区域, 行序号, [匹配方式])' },
        { n: 'XLOOKUP', g: '查找引用', d: '更灵活的查找，支持找不到时返回', s: '=XLOOKUP(查找值, 查找数组, 返回数组, [未找到], [匹配模式], [搜索模式])' },
        { n: 'INDEX', g: '查找引用', d: '按行列位置取值', s: '=INDEX(区域, 行号, [列号])' },
        { n: 'MATCH', g: '查找引用', d: '返回查找值在区域中的位置', s: '=MATCH(查找值, 查找区域, [匹配类型])' },
        { n: 'FILTER', g: '查找引用', d: '按条件筛选数组', s: '=FILTER(数组, 条件, [无结果时返回])' },
        { n: 'UNIQUE', g: '查找引用', d: '提取唯一值', s: '=UNIQUE(数组, [按列], [仅出现一次])' },
        { n: 'SORT', g: '查找引用', d: '对数组排序', s: '=SORT(数组, [排序索引], [排序方向], [按列])' },

        { n: 'TEXT', g: '文本处理', d: '按格式代码把值转成文本', s: '=TEXT(值, "格式代码")' },
        { n: 'CONCAT', g: '文本处理', d: '连接多个文本', s: '=CONCAT(文本1, [文本2], ...)' },
        { n: 'TEXTJOIN', g: '文本处理', d: '用分隔符连接，可忽略空值', s: '=TEXTJOIN(分隔符, 忽略空值, 文本1, ...)' },
        { n: 'LEFT', g: '文本处理', d: '从左侧截取字符', s: '=LEFT(文本, [字符数])' },
        { n: 'RIGHT', g: '文本处理', d: '从右侧截取字符', s: '=RIGHT(文本, [字符数])' },
        { n: 'MID', g: '文本处理', d: '从指定位置截取字符', s: '=MID(文本, 起始位置, 字符数)' },
        { n: 'LEN', g: '文本处理', d: '文本长度', s: '=LEN(文本)' },
        { n: 'FIND', g: '文本处理', d: '区分大小写查找位置', s: '=FIND(查找文本, 文本, [起始位置])' },
        { n: 'SEARCH', g: '文本处理', d: '不区分大小写查找位置', s: '=SEARCH(查找文本, 文本, [起始位置])' },
        { n: 'SUBSTITUTE', g: '文本处理', d: '替换指定文本', s: '=SUBSTITUTE(文本, 旧文本, 新文本, [替换第几个])' },
        { n: 'TRIM', g: '文本处理', d: '去掉首尾空格并压缩连续空格', s: '=TRIM(文本)' },
        { n: 'UPPER', g: '文本处理', d: '转大写', s: '=UPPER(文本)' },
        { n: 'LOWER', g: '文本处理', d: '转小写', s: '=LOWER(文本)' },
        { n: 'PROPER', g: '文本处理', d: '英文单词首字母大写', s: '=PROPER(文本)' },

        { n: 'TODAY', g: '日期时间', d: '今天的日期', s: '=TODAY()' },
        { n: 'NOW', g: '日期时间', d: '当前日期和时间', s: '=NOW()' },
        { n: 'DATE', g: '日期时间', d: '用年、月、日组成日期', s: '=DATE(年, 月, 日)' },
        { n: 'YEAR', g: '日期时间', d: '提取年份', s: '=YEAR(日期)' },
        { n: 'MONTH', g: '日期时间', d: '提取月份', s: '=MONTH(日期)' },
        { n: 'DAY', g: '日期时间', d: '提取日', s: '=DAY(日期)' },
        { n: 'DATEDIF', g: '日期时间', d: '计算两个日期相差的年/月/日', s: '=DATEDIF(开始日期, 结束日期, "Y/M/D")' },
        { n: 'EDATE', g: '日期时间', d: '前后若干个月的同日', s: '=EDATE(开始日期, 月数)' },
        { n: 'EOMONTH', g: '日期时间', d: '前后若干个月所在月的最后一天', s: '=EOMONTH(开始日期, 月数)' },
        { n: 'NETWORKDAYS', g: '日期时间', d: '计算工作日天数', s: '=NETWORKDAYS(开始日期, 结束日期, [节假日])' },
        { n: 'WORKDAY', g: '日期时间', d: '若干工作日后的日期', s: '=WORKDAY(开始日期, 工作日数, [节假日])' }
      ]
    },
    {
      id: 'excelKey', label: 'Excel 快捷键', type: 'key',
      items: [
        { k: 'Ctrl+N', d: '新建工作簿' }, { k: 'Ctrl+O', d: '打开工作簿' },
        { k: 'Ctrl+S', d: '保存' }, { k: 'Ctrl+P', d: '打印' },
        { k: 'Ctrl+C', d: '复制' }, { k: 'Ctrl+V', d: '粘贴' }, { k: 'Ctrl+X', d: '剪切' },
        { k: 'Ctrl+Z', d: '撤销' }, { k: 'Ctrl+Y', d: '重做' },
        { k: 'Ctrl+F', d: '查找' }, { k: 'Ctrl+H', d: '替换' },
        { k: 'Ctrl+A', d: '选中当前区域（再按一次全表）' },
        { k: 'Ctrl+1', d: '打开“设置单元格格式”' },
        { k: 'F2', d: '编辑当前单元格' }, { k: 'F4', d: '切换绝对 / 相对引用' },
        { k: 'F9', d: '重新计算所有工作簿' }, { k: 'Shift+F9', d: '只重算当前工作表' },
        { k: 'Ctrl+`', d: '显示 / 隐藏公式' },
        { k: 'Ctrl+;', d: '插入当前日期' }, { k: 'Ctrl+Shift+;', d: '插入当前时间' },
        { k: 'Alt+Enter', d: '单元格内换行' },
        { k: 'Ctrl+Enter', d: '把输入内容填充到选中区域' },
        { k: 'Ctrl+D', d: '向下填充' }, { k: 'Ctrl+R', d: '向右填充' },
        { k: 'Ctrl+Arrow', d: '跳到数据区域边缘' },
        { k: 'Ctrl+Shift+Arrow', d: '从当前单元格选中到数据边缘' },
        { k: 'Ctrl+PageUp', d: '切换到上一个工作表' }, { k: 'Ctrl+PageDown', d: '切换到下一个工作表' },
        { k: 'Ctrl+Home', d: '回到 A1' }, { k: 'Ctrl+End', d: '跳到已用区域右下角' },
        { k: 'Ctrl+Shift+L', d: '打开 / 关闭筛选' },
        { k: 'Ctrl+T', d: '把区域转为表格' },
        { k: 'Alt+=', d: '自动求和' },
        { k: 'Ctrl+K', d: '插入超链接' }
      ]
    },
    {
      id: 'wordKey', label: 'Word 快捷键', type: 'key',
      items: [
        { k: 'Ctrl+N', d: '新建文档' }, { k: 'Ctrl+O', d: '打开文档' },
        { k: 'Ctrl+S', d: '保存' }, { k: 'Ctrl+P', d: '打印' },
        { k: 'Ctrl+Z', d: '撤销' }, { k: 'Ctrl+Y', d: '重做' },
        { k: 'Ctrl+C', d: '复制' }, { k: 'Ctrl+V', d: '粘贴' }, { k: 'Ctrl+X', d: '剪切' },
        { k: 'Ctrl+A', d: '全选' }, { k: 'Ctrl+F', d: '查找' }, { k: 'Ctrl+H', d: '替换' },
        { k: 'Ctrl+B', d: '加粗' }, { k: 'Ctrl+I', d: '斜体' }, { k: 'Ctrl+U', d: '下划线' },
        { k: 'Ctrl+Shift+>', d: '增大字号' }, { k: 'Ctrl+Shift+<', d: '减小字号' },
        { k: 'Ctrl+D', d: '打开字体对话框' },
        { k: 'Ctrl+E', d: '居中对齐' }, { k: 'Ctrl+L', d: '左对齐' },
        { k: 'Ctrl+R', d: '右对齐' }, { k: 'Ctrl+J', d: '两端对齐' },
        { k: 'Ctrl+1', d: '单倍行距' }, { k: 'Ctrl+2', d: '双倍行距' }, { k: 'Ctrl+5', d: '1.5 倍行距' },
        { k: 'Ctrl+Enter', d: '插入分页符' }, { k: 'Ctrl+Shift+Enter', d: '插入分栏符' },
        { k: 'Ctrl+Alt+M', d: '插入批注' }, { k: 'Ctrl+Shift+E', d: '开启 / 关闭修订' },
        { k: 'F7', d: '拼写和语法检查' }, { k: 'Shift+F7', d: '同义词词典' },
        { k: 'Alt+F9', d: '显示 / 隐藏域代码' },
        { k: 'Ctrl+K', d: '插入超链接' },
        { k: 'Ctrl+Shift+C', d: '复制所选文本的格式' }, { k: 'Ctrl+Shift+V', d: '粘贴格式' }
      ]
    },
    {
      id: 'pptKey', label: 'PPT 快捷键', type: 'key',
      items: [
        { k: 'Ctrl+N', d: '新建演示文稿' }, { k: 'Ctrl+O', d: '打开演示文稿' },
        { k: 'Ctrl+S', d: '保存' }, { k: 'Ctrl+P', d: '打印' },
        { k: 'Ctrl+Z', d: '撤销' }, { k: 'Ctrl+Y', d: '重做' },
        { k: 'Ctrl+C', d: '复制' }, { k: 'Ctrl+V', d: '粘贴' }, { k: 'Ctrl+X', d: '剪切' },
        { k: 'Ctrl+A', d: '全选' }, { k: 'Ctrl+F', d: '查找' }, { k: 'Ctrl+H', d: '替换' },
        { k: 'Ctrl+M', d: '新建幻灯片' }, { k: 'Ctrl+D', d: '复制当前幻灯片或对象' },
        { k: 'F5', d: '从头开始放映' }, { k: 'Shift+F5', d: '从当前页开始放映' },
        { k: 'Alt+F5', d: '演讲者视图' }, { k: 'Esc', d: '结束放映' },
        { k: 'B', d: '放映时黑屏' }, { k: 'W', d: '放映时白屏' },
        { k: 'Ctrl+G', d: '组合所选对象' }, { k: 'Ctrl+Shift+G', d: '取消组合' },
        { k: 'Ctrl+Enter', d: '跳到下一个占位符' },
        { k: 'Ctrl+Shift+>', d: '增大字号' }, { k: 'Ctrl+Shift+<', d: '减小字号' },
        { k: 'Tab', d: '在对象之间循环选择' }, { k: 'F2', d: '重命名对象或编辑文本' },
        { k: 'Ctrl+K', d: '插入超链接' }
      ]
    },
    {
      id: 'wpsKey', label: 'WPS 通用', type: 'key',
      items: [
        { k: 'Ctrl+N', d: '新建文档' }, { k: 'Ctrl+O', d: '打开文件' },
        { k: 'Ctrl+S', d: '保存' }, { k: 'Ctrl+P', d: '打印' },
        { k: 'Ctrl+Z', d: '撤销' }, { k: 'Ctrl+Y', d: '重做' },
        { k: 'Ctrl+C', d: '复制' }, { k: 'Ctrl+V', d: '粘贴' }, { k: 'Ctrl+X', d: '剪切' },
        { k: 'Ctrl+A', d: '全选' }, { k: 'Ctrl+F', d: '查找' }, { k: 'Ctrl+H', d: '替换' },
        { k: 'Ctrl+B', d: '加粗' }, { k: 'Ctrl+I', d: '斜体' }, { k: 'Ctrl+U', d: '下划线' },
        { k: 'Ctrl+E', d: '居中对齐' }, { k: 'Ctrl+L', d: '左对齐' },
        { k: 'Ctrl+R', d: '右对齐' }, { k: 'Ctrl+J', d: '两端对齐' },
        { k: 'Ctrl+1', d: '打开格式设置' },
        { k: 'F4', d: '表格中切换绝对 / 相对引用' },
        { k: 'F5', d: '演示中从头放映' },
        { k: 'Alt+Enter', d: '单元格内换行' },
        { k: 'Ctrl+;', d: '插入当前日期' }, { k: 'Ctrl+Shift+;', d: '插入当前时间' },
        { k: 'Ctrl+Enter', d: '填充选中区域' }, { k: 'Ctrl+D', d: '向下填充' },
        { k: 'Ctrl+Shift+L', d: '打开 / 关闭筛选' }
      ]
    },
    {
      id: 'vscodeKey', label: 'VS Code', type: 'key',
      items: [
        { k: 'Ctrl+Shift+P', d: '命令面板' }, { k: 'Ctrl+P', d: '快速打开文件' },
        { k: 'Ctrl+Shift+F', d: '全局搜索' }, { k: 'Ctrl+H', d: '当前文件替换' },
        { k: 'Ctrl+`', d: '显示 / 隐藏终端' }, { k: 'Ctrl+Shift+`', d: '新建终端' },
        { k: 'Ctrl+B', d: '显示 / 隐藏侧边栏' }, { k: 'Ctrl+J', d: '显示 / 隐藏面板' },
        { k: 'Ctrl+/', d: '切换行注释' }, { k: 'Shift+Alt+A', d: '切换块注释' },
        { k: 'Alt+Up', d: '向上移动当前行' }, { k: 'Alt+Down', d: '向下移动当前行' },
        { k: 'Shift+Alt+Down', d: '向下复制当前行' },
        { k: 'Ctrl+D', d: '选择下一个相同词' }, { k: 'Ctrl+Shift+L', d: '选择所有相同词' },
        { k: 'F12', d: '跳转到定义' }, { k: 'Alt+F12', d: 'Peek 快速查看定义' },
        { k: 'Shift+Alt+F', d: '格式化文档' }, { k: 'F2', d: '重命名符号' },
        { k: 'Ctrl+G', d: '跳转到指定行' }, { k: 'Ctrl+Shift+O', d: '跳转到符号' },
        { k: 'Ctrl+Shift+M', d: '打开问题面板' },
        { k: 'Ctrl+K Ctrl+S', d: '打开快捷键设置' },
        { k: 'Ctrl+Shift+X', d: '打开扩展面板' }
      ]
    },
    {
      id: 'psKey', label: 'Photoshop', type: 'key',
      items: [
        { k: 'Ctrl+N', d: '新建文档' }, { k: 'Ctrl+O', d: '打开文件' },
        { k: 'Ctrl+S', d: '保存' }, { k: 'Ctrl+Shift+S', d: '另存为' },
        { k: 'Ctrl+Alt+Shift+S', d: '存储为 Web 所用格式' },
        { k: 'Ctrl+Z', d: '撤销' }, { k: 'Ctrl+Shift+Z', d: '重做' },
        { k: 'Ctrl+T', d: '自由变换' }, { k: 'Ctrl+J', d: '复制当前图层' },
        { k: 'Ctrl+G', d: '编组图层' }, { k: 'Ctrl+E', d: '向下合并图层' },
        { k: 'Ctrl+Shift+E', d: '合并所有可见图层' },
        { k: 'Ctrl+Alt+Shift+E', d: '盖印可见图层' },
        { k: 'Ctrl+0', d: '适应屏幕' }, { k: 'Ctrl+1', d: '100% 显示' },
        { k: 'Tab', d: '显示 / 隐藏所有面板' }, { k: 'F', d: '切换屏幕模式' },
        { k: 'X', d: '交换前景色和背景色' }, { k: 'D', d: '恢复默认黑白前景 / 背景色' },
        { k: '[', d: '减小画笔' }, { k: ']', d: '增大画笔' },
        { k: 'V', d: '移动工具' }, { k: 'M', d: '矩形 / 椭圆选框' },
        { k: 'L', d: '套索工具' }, { k: 'W', d: '快速选择 / 魔棒' },
        { k: 'C', d: '裁剪工具' }, { k: 'I', d: '吸管工具' },
        { k: 'B', d: '画笔工具' }, { k: 'S', d: '仿制图章' },
        { k: 'E', d: '橡皮擦' }, { k: 'G', d: '渐变 / 油漆桶' },
        { k: 'T', d: '文字工具' }, { k: 'P', d: '钢笔工具' },
        { k: 'H', d: '抓手工具' }, { k: 'Z', d: '缩放工具' }
      ]
    }
  ];

  var byId = {};
  GROUPS.forEach(function (g) { byId[g.id] = g; });

  function keyHtml(k) {
    /* VS Code 的 Ctrl+K Ctrl+S 是两段式组合键，先按空格分组 */
    if (k.indexOf(' ') >= 0) {
      return k.split(' ').map(function (seq) {
        return '<kbd>' + TB.esc(seq.trim()) + '</kbd>';
      }).join('<span class="oc-plus">然后</span>');
    }
    return k.split('+').map(function (part) {
      return '<kbd>' + TB.esc(part.trim()) + '</kbd>';
    }).join('<span class="oc-plus">+</span>');
  }

  function rowHtml(item, type) {
    var search, title, sub, copy;
    if (type === 'fn') {
      search = [item.n, item.g, item.d, item.s].join(' ').toLowerCase();
      title = '<b class="oc-name">' + TB.esc(item.n) + '</b><span class="oc-tag">' + TB.esc(item.g) + '</span>';
      sub = '<div class="oc-code">' + TB.esc(item.s) + '</div><div class="oc-desc">' + TB.esc(item.d) + '</div>';
      copy = item.n;
    } else {
      search = [item.k, item.d].join(' ').toLowerCase();
      title = '<div class="oc-keys">' + keyHtml(item.k) + '</div>';
      sub = '<div class="oc-desc">' + TB.esc(item.d) + '</div>';
      copy = item.k;
    }
    return '<div class="oc-row" data-s="' + TB.esc(search) + '">' +
      '<div class="oc-main">' + title + sub + '</div>' +
      '<button class="btn sm oc-copy" type="button" data-copy="' + TB.esc(copy) + '" title="复制">复制</button>' +
    '</div>';
  }

  TB.def({
    slug: 'office-cheat', cat: 'office', name: '办公速查', desc: 'Excel 函数与常用快捷键', icon: '📋',
    kw: 'excel 函数 公式 快捷键 word ppt wps vscode photoshop 办公 速查 表格 文档 演示',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label"><b>搜索</b><span style="color:var(--ink-3)">在当前标签内按名称、语法或说明过滤</span></div>' +
            '<input class="input" id="ocQ" placeholder="例如：查找、VLOOKUP、求和、复制" autocomplete="off"></div>' +
          '<div class="tabs oc-tabs" id="ocTabs">' +
            GROUPS.map(function (g, i) {
              return '<button class="tab' + (i === 0 ? ' on' : '') + '" type="button" data-g="' + g.id + '">' + TB.esc(g.label) + '</button>';
            }).join('') +
          '</div>' +
          '<div class="oc-bar"><span id="ocCount">—</span><span class="oc-hint">Windows 版快捷键；macOS 请把 Ctrl 换成 Cmd，部分组合不同</span></div>' +
          '<div class="oc-list" id="ocList"></div>' +
        '</div>' +
        '<div class="note">Excel 函数语法以 Microsoft 365 / Excel 2021 为参考；不同版本对 XLOOKUP、FILTER、UNIQUE、SORT、IFS 等新函数的支持不同。快捷键以 Windows 版为准，WPS 与 Office 大部分通用，但个别组合可能被系统或其他软件占用。</div>';

      var list = TB.$('#ocList', root);
      var count = TB.$('#ocCount', root);
      var q = TB.$('#ocQ', root);
      var current = GROUPS[0];

      function render() {
        var term = q.value.trim().toLowerCase();
        var hits = current.items.filter(function (item) {
          if (!term) return true;
          var text = current.type === 'fn'
            ? [item.n, item.g, item.d, item.s].join(' ').toLowerCase()
            : [item.k, item.d].join(' ').toLowerCase();
          return text.indexOf(term) >= 0;
        });
        list.innerHTML = hits.length
          ? hits.map(function (item) { return rowHtml(item, current.type); }).join('')
          : '<div class="oc-empty">没有匹配项，换个关键词试试</div>';
        count.textContent = '显示 ' + hits.length + ' / ' + current.items.length + ' 条 · ' + current.label;
      }

      TB.$('#ocTabs', root).addEventListener('click', function (e) {
        var btn = e.target.closest('.tab');
        if (!btn) return;
        TB.$$('.tab', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
        current = byId[btn.getAttribute('data-g')];
        render();
      });

      q.addEventListener('input', render);

      list.addEventListener('click', function (e) {
        var btn = e.target.closest('.oc-copy');
        if (!btn) return;
        TB.copy(btn.getAttribute('data-copy'));
      });

      render();
    }
  });
})();
