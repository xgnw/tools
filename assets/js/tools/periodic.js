/* =============================================================================
 * 元素周期表
 * -----------------------------------------------------------------------------
 * 118 个元素的静态数据 + 交互式周期表 / 列表 / 搜索 / 分类筛选 / 详情。
 * 数据只包含客观字段（原子序数、符号、中文名、相对原子质量、类别、周期族、
 * 常温状态、电子排布、电负性、熔沸点），不包含第三方文字描述。
 * 原子量与熔沸点为公开周期表常用值；104 号以后多为理论预测值，仅供学习参考。
 * ========================================================================== */

(function () {
  'use strict';

  /* 每行字段：
   * [原子序数, 符号, 中文名, 相对原子质量, 类别, 周期, 族, xpos, ypos,
   *  常温状态, 电子排布, 电负性, 熔点, 沸点]
   */
  var RAW = [    [1,'H','氢','1.008','非金属（双原子）',1,1,1,1,'气体','1s1','2.2','-259°C','-253°C'],
    [2,'He','氦','4.003','稀有气体',1,18,18,1,'气体','1s2','','-272°C','-269°C'],
    [3,'Li','锂','6.94','碱金属',2,1,1,2,'固体','[He] 2s1','0.98','180°C','1330°C'],
    [4,'Be','铍','9.012','碱土金属',2,2,2,2,'固体','[He] 2s2','1.57','1287°C','2469°C'],
    [5,'B','硼','10.81','类金属',2,13,13,2,'固体','[He] 2s2 2p1','2.04','2076°C','3927°C'],
    [6,'C','碳','12.011','非金属（多原子）',2,14,14,2,'固体','[He] 2s2 2p2','2.55','3642°C','3642°C'],
    [7,'N','氮','14.007','非金属（双原子）',2,15,15,2,'气体','[He] 2s2 2p3','3.04','-210°C','-196°C'],
    [8,'O','氧','15.999','非金属（双原子）',2,16,16,2,'气体','[He] 2s2 2p4','3.44','-219°C','-183°C'],
    [9,'F','氟','18.998','非金属（双原子）',2,17,17,2,'气体','[He] 2s2 2p5','3.98','-220°C','-188°C'],
    [10,'Ne','氖','20.18','稀有气体',2,18,18,2,'气体','[He] 2s2 2p6','','-249°C','-246°C'],
    [11,'Na','钠','22.99','碱金属',3,1,1,3,'固体','[Ne] 3s1','0.93','98°C','883°C'],
    [12,'Mg','镁','24.305','碱土金属',3,2,2,3,'固体','[Ne] 3s2','1.31','650°C','1090°C'],
    [13,'Al','铝','26.982','后过渡金属',3,13,13,3,'固体','[Ne] 3s2 3p1','1.61','660°C','2470°C'],
    [14,'Si','硅','28.085','类金属',3,14,14,3,'固体','[Ne] 3s2 3p2','1.9','1414°C','3265°C'],
    [15,'P','磷','30.974','非金属（多原子）',3,15,15,3,'固体','[Ne] 3s2 3p3','2.19','44°C','281°C'],
    [16,'S','硫','32.06','非金属（多原子）',3,16,16,3,'固体','[Ne] 3s2 3p4','2.58','115°C','445°C'],
    [17,'Cl','氯','35.45','非金属（双原子）',3,17,17,3,'气体','[Ne] 3s2 3p5','3.16','-102°C','-34°C'],
    [18,'Ar','氩','39.948','稀有气体',3,18,18,3,'气体','[Ne] 3s2 3p6','','-189°C','-186°C'],
    [19,'K','钾','39.098','碱金属',4,1,1,4,'固体','[Ar] 4s1','0.82','64°C','759°C'],
    [20,'Ca','钙','40.078','碱土金属',4,2,2,4,'固体','[Ar] 4s2','1','842°C','1484°C'],
    [21,'Sc','钪','44.956','过渡金属',4,3,3,4,'固体','[Ar] 3d1 4s2','1.36','1541°C','2836°C'],
    [22,'Ti','钛','47.867','过渡金属',4,4,4,4,'固体','[Ar] 3d2 4s2','1.54','1668°C','3287°C'],
    [23,'V','钒','50.942','过渡金属',4,5,5,4,'固体','[Ar] 3d3 4s2','1.63','1910°C','3407°C'],
    [24,'Cr','铬','51.996','过渡金属',4,6,6,4,'固体','[Ar] 3d5 4s1','1.66','1907°C','2671°C'],
    [25,'Mn','锰','54.938','过渡金属',4,7,7,4,'固体','[Ar] 3d5 4s2','1.55','1246°C','2061°C'],
    [26,'Fe','铁','55.845','过渡金属',4,8,8,4,'固体','[Ar] 3d6 4s2','1.83','1538°C','2861°C'],
    [27,'Co','钴','58.933','过渡金属',4,9,9,4,'固体','[Ar] 3d7 4s2','1.88','1495°C','2927°C'],
    [28,'Ni','镍','58.693','过渡金属',4,10,10,4,'固体','[Ar] 3d8 4s2','1.91','1455°C','2730°C'],
    [29,'Cu','铜','63.546','过渡金属',4,11,11,4,'固体','[Ar] 3d10 4s1','1.9','1085°C','2562°C'],
    [30,'Zn','锌','65.382','过渡金属',4,12,12,4,'固体','[Ar] 3d10 4s2','1.65','420°C','907°C'],
    [31,'Ga','镓','69.723','后过渡金属',4,13,13,4,'固体','[Ar] 3d10 4s2 4p1','1.81','30°C','2400°C'],
    [32,'Ge','锗','72.631','类金属',4,14,14,4,'固体','[Ar] 3d10 4s2 4p2','2.01','938°C','2833°C'],
    [33,'As','砷','74.922','类金属',4,15,15,4,'固体','[Ar] 3d10 4s2 4p3','2.18','614°C','614°C'],
    [34,'Se','硒','78.972','非金属（多原子）',4,16,16,4,'固体','[Ar] 3d10 4s2 4p4','2.55','221°C','685°C'],
    [35,'Br','溴','79.904','非金属（双原子）',4,17,17,4,'液体','[Ar] 3d10 4s2 4p5','2.96','-7°C','59°C'],
    [36,'Kr','氪','83.798','稀有气体',4,18,18,4,'气体','[Ar] 3d10 4s2 4p6','3','-157°C','-153°C'],
    [37,'Rb','铷','85.468','碱金属',5,1,1,5,'固体','[Kr] 5s1','0.82','39°C','688°C'],
    [38,'Sr','锶','87.621','碱土金属',5,2,2,5,'固体','[Kr] 5s2','0.95','777°C','1377°C'],
    [39,'Y','钇','88.906','过渡金属',5,3,3,5,'固体','[Kr] 4d1 5s2','1.22','1526°C','2930°C'],
    [40,'Zr','锆','91.224','过渡金属',5,4,4,5,'固体','[Kr] 4d2 5s2','1.33','1855°C','4377°C'],
    [41,'Nb','铌','92.906','过渡金属',5,5,5,5,'固体','[Kr] 4d4 5s1','1.6','2477°C','4744°C'],
    [42,'Mo','钼','95.951','过渡金属',5,6,6,5,'固体','[Kr] 4d5 5s1','2.16','2623°C','4639°C'],
    [43,'Tc','锝','98','过渡金属',5,7,7,5,'固体','[Kr] 4d5 5s2','1.9','2157°C','4265°C'],
    [44,'Ru','钌','101.072','过渡金属',5,8,8,5,'固体','[Kr] 4d7 5s1','2.2','2334°C','4150°C'],
    [45,'Rh','铑','102.906','过渡金属',5,9,9,5,'固体','[Kr] 4d8 5s1','2.28','1964°C','3695°C'],
    [46,'Pd','钯','106.421','过渡金属',5,10,10,5,'固体','[Kr] 4d10','2.2','1555°C','2963°C'],
    [47,'Ag','银','107.868','过渡金属',5,11,11,5,'固体','[Kr] 4d10 5s1','1.93','962°C','2162°C'],
    [48,'Cd','镉','112.414','过渡金属',5,12,12,5,'固体','[Kr] 4d10 5s2','1.69','321°C','767°C'],
    [49,'In','铟','114.818','后过渡金属',5,13,13,5,'固体','[Kr] 4d10 5s2 5p1','1.78','157°C','2072°C'],
    [50,'Sn','锡','118.711','后过渡金属',5,14,14,5,'固体','[Kr] 4d10 5s2 5p2','1.96','232°C','2602°C'],
    [51,'Sb','锑','121.76','类金属',5,15,15,5,'固体','[Kr] 4d10 5s2 5p3','2.05','631°C','1635°C'],
    [52,'Te','碲','127.603','类金属',5,16,16,5,'固体','[Kr] 4d10 5s2 5p4','2.1','450°C','988°C'],
    [53,'I','碘','126.904','非金属（双原子）',5,17,17,5,'固体','[Kr] 4d10 5s2 5p5','2.66','114°C','184°C'],
    [54,'Xe','氙','131.294','稀有气体',5,18,18,5,'气体','[Kr] 4d10 5s2 5p6','2.6','-112°C','-108°C'],
    [55,'Cs','铯','132.905','碱金属',6,1,1,6,'固体','[Xe] 6s1','0.79','29°C','671°C'],
    [56,'Ba','钡','137.328','碱土金属',6,2,2,6,'固体','[Xe] 6s2','0.89','727°C','1845°C'],
    [57,'La','镧','138.905','镧系',6,3,3,9,'固体','[Xe] 5d1 6s2','1.1','920°C','3464°C'],
    [58,'Ce','铈','140.116','镧系',6,3,4,9,'固体','[Xe] 4f1 5d1 6s2','1.12','795°C','3443°C'],
    [59,'Pr','镨','140.908','镧系',6,3,5,9,'固体','[Xe] 4f3 6s2','1.13','935°C','3130°C'],
    [60,'Nd','钕','144.242','镧系',6,3,6,9,'固体','[Xe] 4f4 6s2','1.14','1024°C','3074°C'],
    [61,'Pm','钷','145','镧系',6,3,7,9,'固体','[Xe] 4f5 6s2','1.13','1042°C','3000°C'],
    [62,'Sm','钐','150.362','镧系',6,3,8,9,'固体','[Xe] 4f6 6s2','1.17','1072°C','1900°C'],
    [63,'Eu','铕','151.964','镧系',6,3,9,9,'固体','[Xe] 4f7 6s2','1.2','826°C','1529°C'],
    [64,'Gd','钆','157.253','镧系',6,3,10,9,'固体','[Xe] 4f7 5d1 6s2','1.2','1312°C','3000°C'],
    [65,'Tb','铽','158.925','镧系',6,3,11,9,'固体','[Xe] 4f9 6s2','1.1','1356°C','3123°C'],
    [66,'Dy','镝','162.5','镧系',6,3,12,9,'固体','[Xe] 4f10 6s2','1.22','1407°C','2567°C'],
    [67,'Ho','钬','164.93','镧系',6,3,13,9,'固体','[Xe] 4f11 6s2','1.23','1461°C','2600°C'],
    [68,'Er','铒','167.259','镧系',6,3,14,9,'固体','[Xe] 4f12 6s2','1.24','1529°C','2868°C'],
    [69,'Tm','铥','168.934','镧系',6,3,15,9,'固体','[Xe] 4f13 6s2','1.25','1545°C','1950°C'],
    [70,'Yb','镱','173.045','镧系',6,3,16,9,'固体','[Xe] 4f14 6s2','1.1','824°C','1196°C'],
    [71,'Lu','镥','174.967','镧系',6,3,17,9,'固体','[Xe] 4f14 5d1 6s2','1.27','1652°C','3402°C'],
    [72,'Hf','铪','178.492','过渡金属',6,4,4,6,'固体','[Xe] 4f14 5d2 6s2','1.3','2233°C','4603°C'],
    [73,'Ta','钽','180.948','过渡金属',6,5,5,6,'固体','[Xe] 4f14 5d3 6s2','1.5','3017°C','5458°C'],
    [74,'W','钨','183.841','过渡金属',6,6,6,6,'固体','[Xe] 4f14 5d4 6s2','2.36','3422°C','5930°C'],
    [75,'Re','铼','186.207','过渡金属',6,7,7,6,'固体','[Xe] 4f14 5d5 6s2','1.9','3186°C','5596°C'],
    [76,'Os','锇','190.233','过渡金属',6,8,8,6,'固体','[Xe] 4f14 5d6 6s2','2.2','3033°C','5012°C'],
    [77,'Ir','铱','192.217','过渡金属',6,9,9,6,'固体','[Xe] 4f14 5d7 6s2','2.2','2446°C','4130°C'],
    [78,'Pt','铂','195.085','过渡金属',6,10,10,6,'固体','[Xe] 4f14 5d9 6s1','2.28','1768°C','3825°C'],
    [79,'Au','金','196.967','过渡金属',6,11,11,6,'固体','[Xe] 4f14 5d10 6s1','2.54','1064°C','2970°C'],
    [80,'Hg','汞','200.592','过渡金属',6,12,12,6,'液体','[Xe] 4f14 5d10 6s2','2','-39°C','357°C'],
    [81,'Tl','铊','204.38','后过渡金属',6,13,13,6,'固体','[Xe] 4f14 5d10 6s2 6p1','1.62','304°C','1473°C'],
    [82,'Pb','铅','207.21','后过渡金属',6,14,14,6,'固体','[Xe] 4f14 5d10 6s2 6p2','1.87','327°C','1749°C'],
    [83,'Bi','铋','208.98','后过渡金属',6,15,15,6,'固体','[Xe] 4f14 5d10 6s2 6p3','2.02','272°C','1564°C'],
    [84,'Po','钋','209','后过渡金属',6,16,16,6,'固体','[Xe] 4f14 5d10 6s2 6p4','2','254°C','962°C'],
    [85,'At','砹','210','类金属',6,17,17,6,'固体','[Xe] 4f14 5d10 6s2 6p5','2.2','302°C','337°C'],
    [86,'Rn','氡','222','稀有气体',6,18,18,6,'气体','[Xe] 4f14 5d10 6s2 6p6','2.2','-71°C','-62°C'],
    [87,'Fr','钫','223','碱金属',7,1,1,7,'固体','[Rn] 7s1','0.79','27°C','677°C'],
    [88,'Ra','镭','226','碱土金属',7,2,2,7,'固体','[Rn] 7s2','0.9','960°C','1737°C'],
    [89,'Ac','锕','227','锕系',7,3,3,10,'固体','[Rn] 6d1 7s2','1.1','1227°C','3227°C'],
    [90,'Th','钍','232.038','锕系',7,3,4,10,'固体','[Rn] 6d2 7s2','1.3','1750°C','4788°C'],
    [91,'Pa','镤','231.036','锕系',7,3,5,10,'固体','[Rn] 5f2 6d1 7s2','1.5','1568°C','4027°C'],
    [92,'U','铀','238.029','锕系',7,3,6,10,'固体','[Rn] 5f3 6d1 7s2','1.38','1132°C','4131°C'],
    [93,'Np','镎','237','锕系',7,3,7,10,'固体','[Rn] 5f4 6d1 7s2','1.36','639°C','4174°C'],
    [94,'Pu','钚','244','锕系',7,3,8,10,'固体','[Rn] 5f6 7s2','1.28','639°C','3232°C'],
    [95,'Am','镅','243','锕系',7,3,9,10,'固体','[Rn] 5f7 7s2','1.13','1176°C','2607°C'],
    [96,'Cm','锔','247','锕系',7,3,10,10,'固体','[Rn] 5f7 6d1 7s2','1.28','1340°C','3110°C'],
    [97,'Bk','锫','247','锕系',7,3,11,10,'固体','[Rn] 5f9 7s2','1.3','986°C','2627°C'],
    [98,'Cf','锎','251','锕系',7,3,12,10,'固体','[Rn] 5f10 7s2','1.3','900°C','1470°C'],
    [99,'Es','锿','252','锕系',7,3,13,10,'固体','[Rn] 5f11 7s2','1.3','860°C','996°C'],
    [100,'Fm','镄','257','锕系',7,3,14,10,'固体','[Rn] 5f12 7s2','1.3','1527°C',''],
    [101,'Md','钔','258','锕系',7,3,15,10,'固体','[Rn] 5f13 7s2','1.3','827°C',''],
    [102,'No','锘','259','锕系',7,3,16,10,'固体','[Rn] 5f14 7s2','1.3','827°C',''],
    [103,'Lr','铹','266','锕系',7,3,17,10,'固体','[Rn] 5f14 7s2 7p1','1.3','1627°C',''],
    [104,'Rf','𬬻','267','过渡金属',7,4,4,7,'固体','[Rn] 5f14 6d2 7s2','','2127°C','5527°C'],
    [105,'Db','𬭊','268','过渡金属',7,5,5,7,'固体','[Rn] 5f14 6d3 7s2','','',''],
    [106,'Sg','𬭳','269','过渡金属',7,6,6,7,'固体','[Rn] 5f14 6d4 7s2','','',''],
    [107,'Bh','𬭛','270','过渡金属',7,7,7,7,'固体','[Rn] 5f14 6d5 7s2','','',''],
    [108,'Hs','𬭶','269','过渡金属',7,8,8,7,'固体','[Rn] 5f14 6d6 7s2','','',''],
    [109,'Mt','鿏','278','未知',7,9,9,7,'固体','[Rn] 5f14 6d7 7s2','','',''],
    [110,'Ds','𫟼','281','未知',7,10,10,7,'固体','[Rn] 5f14 6d9 7s1','','',''],
    [111,'Rg','𬬭','282','未知',7,11,11,7,'固体','[Rn] 5f14 6d10 7s1','','',''],
    [112,'Cn','鿔','285','过渡金属',7,12,12,7,'液体','[Rn] 5f14 6d10 7s2','','10°C','67°C'],
    [113,'Nh','鿭','286','未知',7,13,13,7,'固体','[Rn] 5f14 6d10 7s2 7p1','','427°C','1157°C'],
    [114,'Fl','𫓧','289','后过渡金属',7,14,14,7,'固体','[Rn] 5f14 6d10 7s2 7p2','','67°C','147°C'],
    [115,'Mc','镆','289','未知',7,15,15,7,'固体','[Rn] 5f14 6d10 7s2 7p3','','397°C','1127°C'],
    [116,'Lv','𫟷','293','未知',7,16,16,7,'固体','[Rn] 5f14 6d10 7s2 7p4','','436°C','812°C'],
    [117,'Ts','鿬','294','未知',7,17,17,7,'固体','[Rn] 5f14 6d10 7s2 7p5','','450°C','610°C'],
    [118,'Og','鿫','294','稀有气体（预测）',7,18,18,7,'固体','[Rn] 5f14 6d10 7s2 7p6','','','77°C'],  ];

  var ELEMENTS = RAW.map(function (r) {
    return {
      n: r[0], sy: r[1], cn: r[2], mass: r[3], cat: r[4],
      period: r[5], group: r[6], x: r[7], y: r[8], phase: r[9],
      cfg: r[10], en: r[11], melt: r[12], boil: r[13]
    };
  });

  var BY_Z = {};
  ELEMENTS.forEach(function (e) { BY_Z[e.n] = e; });

  function catKey(cat) {
    if (cat.indexOf('碱金属') === 0) return 'alkali';
    if (cat.indexOf('碱土金属') === 0) return 'alkaline';
    if (cat.indexOf('过渡金属') === 0) return 'transition';
    if (cat.indexOf('后过渡金属') === 0) return 'post';
    if (cat.indexOf('类金属') === 0) return 'metalloid';
    if (cat.indexOf('非金属') === 0) return 'nonmetal';
    if (cat.indexOf('稀有气体') === 0) return 'noble';
    if (cat.indexOf('镧系') === 0) return 'lanth';
    if (cat.indexOf('锕系') === 0) return 'actin';
    return 'unknown';
  }

  function blockOf(e) {
    if (e.cat.indexOf('镧系') === 0 || e.cat.indexOf('锕系') === 0) return 'f';
    if (e.sy === 'He' || e.group <= 2) return 's';
    if (e.group >= 13) return 'p';
    return 'd';
  }

  function cellHtml(e) {
    if (!e) return '<div class="pt-empty"></div>';
    var k = catKey(e.cat);
    return '<button class="pt-cell pt-cat-' + k + '" type="button" data-z="' + e.n + '" data-cat="' + k + '" ' +
      'aria-label="' + TB.esc(e.cn + ' ' + e.sy + '，原子序数 ' + e.n) + '">' +
      '<span class="pt-num">' + e.n + '</span>' +
      '<b class="pt-sy">' + e.sy + '</b>' +
      '<span class="pt-cn">' + TB.esc(e.cn) + '</span>' +
    '</button>';
  }

  function starHtml(mark, group) {
    return '<div class="pt-star" style="grid-column:' + (group + 1) + '">' + mark + '</div>';
  }

  function buildTable() {
    var html = '<div class="pt-corner"></div>';
    for (var g = 1; g <= 18; g++) html += '<div class="pt-gh">' + g + '</div>';

    for (var p = 1; p <= 7; p++) {
      html += '<div class="pt-ph">' + p + '</div>';
      for (var c = 1; c <= 18; c++) {
        var e = null;
        ELEMENTS.forEach(function (x) { if (x.period === p && x.group === c && x.y <= 7) e = x; });
        if (e) html += cellHtml(e);
        else if (p >= 6 && c === 3) html += starHtml(p === 6 ? '*' : '**', c);
        else html += '<div class="pt-empty"></div>';
      }
    }

    ['镧系', '锕系'].forEach(function (label, idx) {
      var y = 9 + idx;
      if (idx === 0) html += '<div class="pt-spacer" style="grid-column:1 / -1"></div>';
      html += '<div class="pt-f-label" style="grid-column:1">' + label + '</div>' +
        '<div class="pt-empty" style="grid-column:2"></div>' +
        '<div class="pt-empty" style="grid-column:3"></div>';
      for (var x = 3; x <= 17; x++) {
        var fe = null;
        ELEMENTS.forEach(function (el) { if (el.y === y && el.x === x) fe = el; });
        if (fe) {
          var k = catKey(fe.cat);
          html += '<button class="pt-cell pt-cat-' + k + '" type="button" data-z="' + fe.n + '" data-cat="' + k + '" ' +
            'style="grid-column:' + (x + 1) + '" aria-label="' + TB.esc(fe.cn + ' ' + fe.sy) + '">' +
            '<span class="pt-num">' + fe.n + '</span><b class="pt-sy">' + fe.sy + '</b><span class="pt-cn">' + TB.esc(fe.cn) + '</span></button>';
        }
      }
    });
    return html;
  }

  var LEGEND = [
    ['alkali', '碱金属'], ['alkaline', '碱土金属'], ['transition', '过渡金属'],
    ['post', '后过渡金属'], ['metalloid', '类金属'], ['nonmetal', '非金属'],
    ['noble', '稀有气体'], ['lanth', '镧系'], ['actin', '锕系'], ['unknown', '未知 / 预测']
  ];

  TB.def({
    slug: 'periodic', cat: 'data', name: '元素周期表', desc: '118 元素查询与分类', icon: '🧪',
    kw: '元素 周期表 化学 原子 原子序数 相对原子质量 电子排布 金属 非金属 118',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="pt-toolbar">' +
            '<div class="field"><div class="label"><b>搜索元素</b></div>' +
              '<input class="input" id="ptQ" placeholder="输入名称、符号或原子序数，如 铁 / Fe / 26" autocomplete="off"></div>' +
            '<div class="field pt-view-field"><div class="label"><b>视图</b></div>' +
              '<div class="seg pt-view"><button class="on" type="button" data-view="table">周期表</button><button type="button" data-view="list">列表</button></div></div>' +
          '</div>' +
          '<div class="pt-legend" id="ptLegend">' +
            '<button class="pt-lg on" type="button" data-lg="all"><span class="pt-dot pt-dot-all"></span>全部</button>' +
            LEGEND.map(function (l) {
              return '<button class="pt-lg" type="button" data-lg="' + l[0] + '"><span class="pt-dot pt-cat-' + l[0] + '"></span>' + l[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="pt-count" id="ptCount">—</div>' +
          '<div class="pt-wrap"><div class="pt-grid" id="ptGrid">' + buildTable() + '</div></div>' +
          '<div class="pt-list" id="ptList" hidden></div>' +
        '</div>' +
        '<div class="panel pt-detail" id="ptDetail"></div>' +
        '<div class="note">原子序数、符号、中文名、相对原子质量、分类、周期族、电子排布与熔沸点均为公开化学数据；104 号以后元素的熔沸点和部分性质多为理论预测值，仅供学习参考，不作为实验或工程依据。</div>';

      var grid = TB.$('#ptGrid', root);
      var list = TB.$('#ptList', root);
      var count = TB.$('#ptCount', root);
      var detail = TB.$('#ptDetail', root);
      var q = TB.$('#ptQ', root);
      var view = 'table';
      var filter = 'all';
      var selected = 1;

      function matches(e) {
        if (filter !== 'all' && catKey(e.cat) !== filter) return false;
        var term = q.value.trim().toLowerCase();
        if (!term) return true;
        return String(e.n) === term ||
          e.sy.toLowerCase().indexOf(term) >= 0 ||
          e.cn.indexOf(term) >= 0 ||
          e.cat.indexOf(term) >= 0 ||
          (term === 'fe' && e.n === 26);
      }

      function showDetail(z) {
        var e = BY_Z[z];
        if (!e) return;
        selected = z;
        TB.$$('.pt-cell', grid).forEach(function (c) { c.classList.toggle('on', +c.getAttribute('data-z') === z); });
        var k = catKey(e.cat);
        detail.innerHTML =
          '<div class="pt-d-head">' +
            '<div class="pt-d-symbol pt-cat-' + k + '"><span>' + e.n + '</span><b>' + e.sy + '</b></div>' +
            '<div class="pt-d-title"><h2>' + TB.esc(e.cn) + '</h2>' +
              '<div>' + TB.esc(e.cat) + ' · 第 ' + e.period + ' 周期' + (e.group ? ' · 第 ' + e.group + ' 族' : '') + ' · ' + blockOf(e) + ' 区</div>' +
            '</div>' +
          '</div>' +
          '<div class="kv pt-d-kv">' + [
            ['原子序数', e.n],
            ['相对原子质量', e.mass || '—'],
            ['类别', TB.esc(e.cat)],
            ['周期 / 族', e.period + ' / ' + (e.group || '—')],
            ['常温状态', TB.esc(e.phase)],
            ['电子排布', '<span class="mono">' + TB.esc(e.cfg || '—') + '</span>'],
            ['电负性（Pauling）', e.en || '—'],
            ['熔点', e.melt || '—'],
            ['沸点', e.boil || '—']
          ].map(function (r) {
            return '<div class="kv-item"><div class="kv-k">' + r[0] + '</div><div class="kv-v">' + r[1] + '</div></div>';
          }).join('') + '</div>';
      }

      function apply() {
        var hits = ELEMENTS.filter(matches);
        count.textContent = '显示 ' + hits.length + ' / ' + ELEMENTS.length + ' 个元素' +
          (filter === 'all' ? '' : ' · ' + LEGEND.filter(function (l) { return l[0] === filter; })[0][1]);
        TB.$$('.pt-cell', grid).forEach(function (c) {
          c.classList.toggle('dim', !matches(BY_Z[+c.getAttribute('data-z')]));
        });
        list.innerHTML = hits.length ? hits.map(function (e) {
          return '<button class="pt-row" type="button" data-z="' + e.n + '">' +
            '<span class="pt-row-z">' + e.n + '</span>' +
            '<b class="pt-row-sy">' + e.sy + '</b>' +
            '<span class="pt-row-cn">' + TB.esc(e.cn) + '</span>' +
            '<span class="pt-row-cat pt-cat-' + catKey(e.cat) + '">' + TB.esc(e.cat) + '</span>' +
            '<span class="pt-row-mass">' + (e.mass || '—') + '</span>' +
          '</button>';
        }).join('') : '<div class="pt-empty-list">没有匹配的元素</div>';
        if (hits.length && !matches(BY_Z[selected])) showDetail(hits[0].n);
      }

      grid.addEventListener('click', function (e) {
        var cell = e.target.closest('.pt-cell');
        if (cell) showDetail(+cell.getAttribute('data-z'));
      });

      list.addEventListener('click', function (e) {
        var row = e.target.closest('.pt-row');
        if (row) {
          showDetail(+row.getAttribute('data-z'));
          if (view === 'list') detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      TB.$('#ptLegend', root).addEventListener('click', function (e) {
        var btn = e.target.closest('.pt-lg');
        if (!btn) return;
        filter = btn.getAttribute('data-lg');
        TB.$$('.pt-lg', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
        apply();
      });

      root.querySelector('.pt-view').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-view]');
        if (!btn) return;
        view = btn.getAttribute('data-view');
        TB.$$('button[data-view]', root).forEach(function (b) { b.classList.toggle('on', b === btn); });
        grid.parentNode.hidden = view !== 'table';
        list.hidden = view !== 'list';
      });

      q.addEventListener('input', apply);
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var hits = ELEMENTS.filter(matches);
          if (hits.length) showDetail(hits[0].n);
        }
      });

      showDetail(26);
      apply();
    }
  });
})();
