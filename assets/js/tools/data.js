/* =============================================================================
 * 数据驿站：房贷 / 个税 / 折扣 / 单位换算
 * -----------------------------------------------------------------------------
 * 计算全部在前端完成，公式写死在代码里，结果右侧附公式说明，便于核对。
 * ========================================================================== */

(function () {

  /* ------------------------------------------------------------- 1. 房贷计算 */
  TB.def({
    slug: 'mortgage', cat: 'data', name: '房贷计算', desc: '等额本息 / 本金', icon: '🏠',
    kw: '房贷 贷款 月供 利息 等额本息 等额本金 公积金',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label">贷款金额（万元）</div><input class="input" id="amount" type="number" value="100" min="0" step="0.1"></div>' +
            '<div class="field"><div class="label">年利率（%）</div><input class="input" id="rate" type="number" value="3.1" step="0.01" min="0"></div>' +
            '<div class="field"><div class="label">贷款年限（年）</div><input class="input" id="years" type="number" value="30" min="1" max="50"></div>' +
          '</div>' +
          '<div class="field"><div class="label">还款方式</div><select class="select" id="mode">' +
            '<option value="equal">等额本息（每月还款一样）</option>' +
            '<option value="principal">等额本金（每月递减）</option></select></div>' +
          '<div class="btns"><button class="btn primary" id="run">计算</button></div>' +
          '<div class="kv" id="sum" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">还款明细<span class="hint" id="tblHint"></span></div>' +
          '<div class="table-wrap" style="max-height:420px"><table class="table" id="tbl"></table></div></div>' +
        '<div class="note">等额本息：每月还款额固定，前期利息占比高；等额本金：每月本金固定、利息递减，总利息更少但前期压力大。' +
        '实际银行会按日计息、四舍五入到分，结果可能有几元误差。</div>';

      function calc() {
        var P = Math.max(0, parseFloat(TB.$('#amount', root).value) || 0) * 10000;
        var yearRate = Math.max(0, parseFloat(TB.$('#rate', root).value) || 0) / 100;
        var years = Math.max(1, parseInt(TB.$('#years', root).value, 10) || 1);
        var n = years * 12;
        var r = yearRate / 12;
        var mode = TB.$('#mode', root).value;

        var rows = [], totalInterest = 0, firstPay = 0;
        if (mode === 'equal') {
          var monthly = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
          var balance = P;
          for (var i = 1; i <= n; i++) {
            var interest = balance * r;
            var principal = monthly - interest;
            balance = Math.max(0, balance - principal);
            totalInterest += interest;
            rows.push([i, monthly, principal, interest, balance]);
          }
          firstPay = monthly;
        } else {
          var perPrincipal = P / n;
          var bal = P;
          for (var j = 1; j <= n; j++) {
            var int2 = bal * r;
            var pay = perPrincipal + int2;
            bal = Math.max(0, bal - perPrincipal);
            totalInterest += int2;
            rows.push([j, pay, perPrincipal, int2, bal]);
          }
          firstPay = rows[0][1];
        }

        var total = P + totalInterest;
        TB.$('#sum', root).innerHTML = [
          ['首月月供', '¥ ' + TB.num(firstPay)],
          [mode === 'equal' ? '每月固定还款' : '末月月供', '¥ ' + TB.num(mode === 'equal' ? firstPay : rows[rows.length - 1][1])],
          ['支付总利息', '¥ ' + TB.num(totalInterest, 0)],
          ['还款总额', '¥ ' + TB.num(total, 0)],
          ['利息占比', TB.num(totalInterest / P * 100, 1) + '%'],
          ['还款期数', n + ' 期（' + years + ' 年）']
        ].map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + it[0] + '</div><div class="kv-v">' + it[1] + '</div></div>';
        }).join('');

        /* 表格只渲染前 36 期，避免上千行卡顿 */
        var show = rows.slice(0, 36);
        TB.$('#tbl', root).innerHTML =
          '<tr><th>期数</th><th>月供</th><th>本金</th><th>利息</th><th>剩余本金</th></tr>' +
          show.map(function (r2) {
            return '<tr><td class="num">' + r2[0] + '</td><td class="num">' + TB.num(r2[1]) +
              '</td><td class="num">' + TB.num(r2[2]) + '</td><td class="num">' + TB.num(r2[3]) +
              '</td><td class="num">' + TB.num(r2[4]) + '</td></tr>';
          }).join('');
        TB.$('#tblHint', root).textContent = '共 ' + n + ' 期，此处显示前 ' + show.length + ' 期';
      }

      TB.$('#run', root).addEventListener('click', calc);
      root.addEventListener('change', function (e) {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') calc();
      });
      calc();
    }
  });

  /* ------------------------------------------------------------- 2. 个税计算 */
  /* 月度税率表（居民个人工资薪金所得预扣预缴，按月换算） */
  var TAX_BRACKETS = [
    { limit: 3000, rate: .03, quick: 0 },
    { limit: 12000, rate: .10, quick: 210 },
    { limit: 25000, rate: .20, quick: 1410 },
    { limit: 35000, rate: .25, quick: 2660 },
    { limit: 55000, rate: .30, quick: 4410 },
    { limit: 80000, rate: .35, quick: 7160 },
    { limit: Infinity, rate: .45, quick: 15160 }
  ];

  TB.def({
    slug: 'tax', cat: 'data', name: '个税计算', desc: '工资薪金个税', icon: '💰',
    kw: '个税 工资 税率 五险一金 到手 税后',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="row">' +
            '<div class="field"><div class="label">税前月薪（元）</div><input class="input" id="gross" type="number" value="15000" min="0"></div>' +
            '<div class="field"><div class="label">个人社保 + 公积金（元）</div><input class="input" id="social" type="number" value="1800" min="0"></div>' +
            '<div class="field"><div class="label">专项附加扣除（元/月）</div><input class="input" id="extra" type="number" value="1000" min="0"></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">计算</button></div>' +
          '<div class="kv" id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">按 2019 年起实施的月度预扣预缴税率表计算（起征点 5000 元/月）。' +
        '专项附加扣除包括子女教育、继续教育、大病医疗、住房贷款利息、住房租金、赡养老人、3 岁以下婴幼儿照护等。' +
        '年度汇算清缴可能退税或补税，此结果仅供参考。</div>';

      function calc() {
        var gross = Math.max(0, parseFloat(TB.$('#gross', root).value) || 0);
        var social = Math.max(0, parseFloat(TB.$('#social', root).value) || 0);
        var extra = Math.max(0, parseFloat(TB.$('#extra', root).value) || 0);

        var taxable = Math.max(0, gross - social - extra - 5000);
        var bracket = TAX_BRACKETS.find(function (b) { return taxable <= b.limit; }) || TAX_BRACKETS[6];
        var tax = Math.max(0, taxable * bracket.rate - bracket.quick);
        var net = gross - social - tax;

        TB.$('#out', root).innerHTML = [
          ['应纳税所得额', '¥ ' + TB.num(taxable)],
          ['适用税率', (bracket.rate * 100) + '%（速算扣除 ' + bracket.quick + '）'],
          ['应缴个税', '¥ ' + TB.num(tax)],
          ['税后到手', '¥ ' + TB.num(net)],
          ['实际税负', TB.num(gross ? tax / gross * 100 : 0, 2) + '%'],
          ['一年个税', '¥ ' + TB.num(tax * 12, 0)]
        ].map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + it[0] + '</div><div class="kv-v">' + it[1] + '</div></div>';
        }).join('');
      }

      TB.$('#run', root).addEventListener('click', calc);
      root.addEventListener('input', TB.debounce(calc, 400));
      calc();
    }
  });

  /* ------------------------------------------------------------- 3. 折扣计算 */
  TB.def({
    slug: 'discount', cat: 'data', name: '折扣 / 百分比', desc: '折扣实付与占比计算', icon: '🏷️',
    kw: '折扣 打折 百分比 优惠 差价 比例',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel"><div class="panel-h">折扣实付</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">原价（元）</div><input class="input" id="price" type="number" value="299" min="0"></div>' +
            '<div class="field"><div class="label">折扣</div><input class="input" id="disc" type="number" value="7.5" step="0.1" min="0"></div>' +
            '<div class="field"><div class="label">折扣单位</div><select class="select" id="unit">' +
              '<option value="zhe">折（7.5 = 七五折）</option><option value="pct">%（75 = 七五折）</option></select></div>' +
          '</div>' +
          '<div class="kv" id="out1" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">百分比关系</div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">数值 A</div><input class="input" id="a" type="number" value="80"></div>' +
            '<div class="field"><div class="label">数值 B</div><input class="input" id="b" type="number" value="200"></div>' +
          '</div>' +
          '<div class="kv" id="out2" style="margin-top:12px"></div>' +
        '</div>' +
        '<div class="note">「A 是 B 的百分之几」「A 比 B 少/多多少」「B 占 A+B 的比例」都会算出来，方便比价和算优惠。</div>';

      function calc() {
        var price = Math.max(0, parseFloat(TB.$('#price', root).value) || 0);
        var disc = Math.max(0, parseFloat(TB.$('#disc', root).value) || 0);
        var unit = TB.$('#unit', root).value;
        var rate = unit === 'zhe' ? disc / 10 : disc / 100;
        var pay = price * rate;
        TB.$('#out1', root).innerHTML = [
          ['实付', '¥ ' + TB.num(pay)],
          ['省下', '¥ ' + TB.num(price - pay)],
          ['相当于', TB.num(rate * 10, 1) + ' 折（' + TB.num(rate * 100, 0) + '%）'],
          ['每 100 元', '¥ ' + TB.num(rate * 100)]
        ].map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + it[0] + '</div><div class="kv-v">' + it[1] + '</div></div>';
        }).join('');

        var a = parseFloat(TB.$('#a', root).value) || 0;
        var b = parseFloat(TB.$('#b', root).value) || 0;
        TB.$('#out2', root).innerHTML = [
          ['A 是 B 的', b ? TB.num(a / b * 100, 2) + '%' : '—'],
          ['A 比 B', b ? (a >= b ? '多 ' : '少 ') + TB.num(Math.abs(a - b) / b * 100, 2) + '%' : '—'],
          ['A 占两者合计', (a + b) ? TB.num(a / (a + b) * 100, 2) + '%' : '—'],
          ['倍数关系', b ? TB.num(a / b, 2) + ' 倍' : '—']
        ].map(function (it) {
          return '<div class="kv-item"><div class="kv-k">' + it[0] + '</div><div class="kv-v">' + it[1] + '</div></div>';
        }).join('');
      }

      root.addEventListener('input', TB.debounce(calc, 300));
      root.addEventListener('change', calc);
      calc();
    }
  });

  /* ------------------------------------------------------------- 4. 单位换算 */
  var UNIT_GROUPS = {
    length: {
      name: '长度', base: 'm',
      units: { '毫米 mm': .001, '厘米 cm': .01, '米 m': 1, '千米 km': 1000, '英寸 in': .0254, '英尺 ft': .3048, '码 yd': .9144, '英里 mi': 1609.344, '海里 nmi': 1852, '里': 500 }
    },
    weight: {
      name: '重量', base: 'kg',
      units: { '毫克 mg': 1e-6, '克 g': .001, '千克 kg': 1, '吨 t': 1000, '斤': .5, '两': .05, '磅 lb': .45359237, '盎司 oz': .028349523 }
    },
    area: {
      name: '面积', base: 'm²',
      units: { '平方毫米 mm²': 1e-6, '平方厘米 cm²': 1e-4, '平方米 m²': 1, '公顷 ha': 10000, '平方千米 km²': 1e6, '亩': 666.6667, '平方英尺 ft²': .09290304, '英亩 ac': 4046.856 }
    },
    volume: {
      name: '体积', base: 'L',
      units: { '毫升 mL': .001, '升 L': 1, '立方米 m³': 1000, '立方厘米 cm³': .001, '加仑（美） gal': 3.785411784, '品脱（美） pt': .473176473 }
    },
    speed: {
      name: '速度', base: 'm/s',
      units: { '米/秒 m/s': 1, '千米/小时 km/h': 1 / 3.6, '英里/小时 mph': .44704, '节 kn': .514444, '米/分钟 m/min': 1 / 60 }
    },
    data: {
      name: '数据存储', base: 'MB',
      units: { 'Byte B': 1 / 1048576, 'KB': 1 / 1024, 'MB': 1, 'GB': 1024, 'TB': 1048576, 'bit b': 1 / 8388608 }
    },
    time: {
      name: '时间', base: '秒',
      units: { '毫秒 ms': .001, '秒 s': 1, '分钟 min': 60, '小时 h': 3600, '天 d': 86400, '周 wk': 604800 }
    }
  };

  TB.def({
    slug: 'unit', cat: 'data', name: '单位换算', desc: '七类单位互转', icon: '📐',
    kw: '单位 换算 长度 重量 面积 体积 温度 速度 存储',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="field"><div class="label">类别</div><select class="select" id="group">' +
            Object.keys(UNIT_GROUPS).map(function (k) { return '<option value="' + k + '">' + UNIT_GROUPS[k].name + '</option>'; }).join('') +
            '<option value="temp">温度</option>' +
          '</select></div>' +
          '<div class="row">' +
            '<div class="field"><div class="label">数值</div><input class="input" id="val" type="number" value="1"></div>' +
            '<div class="field"><div class="label">从</div><select class="select" id="from"></select></div>' +
            '<div class="field"><div class="label">到</div><select class="select" id="to"></select></div>' +
          '</div>' +
          '<div class="btns"><button class="btn primary" id="run">换算</button></div>' +
          '<div class="kv" id="out" style="margin-top:14px"></div>' +
        '</div>' +
        '<div class="note">数据存储按 1024 进制（1 GB = 1024 MB），和硬盘厂商的 1000 进制不同。</div>';

      var groupSel = TB.$('#group', root), fromSel = TB.$('#from', root), toSel = TB.$('#to', root);

      function fillUnits() {
        var g = groupSel.value;
        var names = g === 'temp' ? ['摄氏度 °C', '华氏度 °F', '开尔文 K'] : Object.keys(UNIT_GROUPS[g].units);
        fromSel.innerHTML = names.map(function (n) { return '<option>' + n + '</option>'; }).join('');
        toSel.innerHTML = names.map(function (n) { return '<option>' + n + '</option>'; }).join('');
        toSel.selectedIndex = Math.min(1, names.length - 1);
        calc();
      }

      function convertTemp(v, from, to) {
        var c = from === '摄氏度 °C' ? v : from === '华氏度 °F' ? (v - 32) * 5 / 9 : v - 273.15;
        return to === '摄氏度 °C' ? c : to === '华氏度 °F' ? c * 9 / 5 + 32 : c + 273.15;
      }

      function calc() {
        var v = parseFloat(TB.$('#val', root).value);
        if (!isFinite(v)) v = 0;
        var g = groupSel.value;
        var from = fromSel.value, to = toSel.value, result;

        if (g === 'temp') result = convertTemp(v, from, to);
        else {
          var u = UNIT_GROUPS[g].units;
          result = v * u[from] / u[to];
        }

        var rows = [['结果', TB.num(result, 6).replace(/\.?0+$/, '') + ' ' + to.split(' ').slice(-1)[0]]];
        if (g !== 'temp') {
          var all = UNIT_GROUPS[g].units;
          rows = Object.keys(all).map(function (k) {
            return [k, TB.num(v * all[from] / all[k], 6).replace(/\.?0+$/, '')];
          });
        } else {
          rows = ['摄氏度 °C', '华氏度 °F', '开尔文 K'].map(function (k) {
            return [k, TB.num(convertTemp(v, from, k), 4)];
          });
        }
        TB.$('#out', root).innerHTML = rows.map(function (r) {
          return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
        }).join('');
      }

      groupSel.addEventListener('change', fillUnits);
      [fromSel, toSel].forEach(function (s) { s.addEventListener('change', calc); });
      TB.$('#val', root).addEventListener('input', TB.debounce(calc, 300));
      TB.$('#run', root).addEventListener('click', calc);
      fillUnits();
    }
  });

})();
