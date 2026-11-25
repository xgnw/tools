/* =============================================================================
 * 证书与 CSR 工具
 * -----------------------------------------------------------------------------
 * 本地解析 X.509 证书、生成 PKCS#10 CSR、查看 CSR。
 * 依赖：@peculiar/x509 2.2.0（MIT）+ @abraham/reflection 0.14.0（MIT）。
 * 两个库都由 assets/lib/ 懒加载，证书与私钥不上传服务器。
 * ========================================================================== */

(function () {
  'use strict';

  var x509Promise = null;

  function msg(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text
      ? '<div class="note" style="margin-top:12px"><span class="' +
        (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>'
      : '';
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
    btn.disabled = !!busy;
    btn.textContent = busy ? label : btn.getAttribute('data-label');
  }

  /* 先加载 Reflect polyfill，再加载 x509；两者都只加载一次 */
  function loadX509() {
    if (window.x509) return Promise.resolve(window.x509);
    if (!x509Promise) {
      x509Promise = TB.loadLib('reflection.js')
        .then(function () { return TB.loadLib('x509.js'); })
        .then(function () {
          if (!window.x509) throw new Error('证书库加载完成，但没有找到全局 x509 对象');
          return window.x509;
        })
        .catch(function (e) {
          x509Promise = null;
          throw e;
        });
    }
    return x509Promise;
  }

  function hex(buf, sep) {
    var a = Array.from(new Uint8Array(buf));
    return a.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join(sep || '');
  }

  async function fingerprint(buf, name) {
    if (!window.crypto || !crypto.subtle) throw new Error('当前页面不是安全上下文，无法计算指纹');
    return hex(await crypto.subtle.digest(name, buf), ':').toUpperCase();
  }

  function fmtDate(date) {
    if (!date) return '—';
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  function fmtAlg(alg) {
    if (!alg) return '—';
    var s = alg.name || String(alg);
    if (alg.hash && alg.hash.name) s += ' / ' + alg.hash.name;
    if (alg.namedCurve) s += ' / ' + alg.namedCurve;
    if (alg.modulusLength) s += ' / ' + alg.modulusLength + ' 位';
    return s;
  }

  function fmtPub(key) {
    if (!key || !key.algorithm) return '—';
    var a = key.algorithm;
    if (a.modulusLength) return 'RSA ' + a.modulusLength + ' 位';
    if (a.namedCurve) return 'ECDSA ' + a.namedCurve;
    return (a.name || '公钥') + (a.hash && a.hash.name ? ' / ' + a.hash.name : '');
  }

  var EKU = {
    '1.3.6.1.5.5.7.3.1': '服务器身份验证',
    '1.3.6.1.5.5.7.3.2': '客户端身份验证',
    '1.3.6.1.5.5.7.3.3': '代码签名',
    '1.3.6.1.5.5.7.3.4': '邮件保护',
    '1.3.6.1.5.5.7.3.8': '时间戳',
    '1.3.6.1.5.5.7.3.9': 'OCSP 签名'
  };

  var EXT_NAME = {
    '2.5.29.14': 'Subject Key Identifier',
    '2.5.29.15': 'Key Usage',
    '2.5.29.17': 'Subject Alternative Name',
    '2.5.29.19': 'Basic Constraints',
    '2.5.29.35': 'Authority Key Identifier',
    '2.5.29.37': 'Extended Key Usage',
    '1.3.6.1.5.5.7.1.1': 'Authority Info Access'
  };

  function extName(oid) { return EXT_NAME[oid] || oid; }

  function namesOf(ext) {
    if (!ext || !ext.names) return [];
    var n = ext.names;
    if (Array.isArray(n)) return n;
    if (n.items) return n.items;
    if (typeof n.length === 'number') return Array.prototype.slice.call(n);
    return [];
  }

  function sanText(ext) {
    return namesOf(ext).map(function (n) { return (n.type || 'dns') + ': ' + n.value; }).join('，');
  }

  function keyUsageText(usages) {
    if (typeof usages !== 'number') return String(usages || '—');
    var flags = [
      [1, '数字签名'], [2, '不可否认'], [4, '密钥加密'], [8, '数据加密'],
      [16, '密钥协商'], [32, '签发证书'], [64, '签发 CRL'],
      [128, '仅加密'], [256, '仅解密']
    ];
    var out = flags.filter(function (f) { return (usages & f[0]) === f[0]; }).map(function (f) { return f[1]; });
    return out.length ? out.join('、') : '无';
  }

  function ekuText(usages) {
    if (!usages || typeof usages.length !== 'number') return '—';
    return Array.prototype.map.call(usages, function (u) {
      return EKU[u] ? EKU[u] + '（' + u + '）' : u;
    }).join('、') || '—';
  }

  function findExt(extensions, oid) {
    if (!extensions) return null;
    for (var i = 0; i < extensions.length; i++) if (extensions[i].type === oid) return extensions[i];
    return null;
  }

  function certRows(cert, prints) {
    var now = new Date();
    var state = now < cert.notBefore ? '尚未生效' : now > cert.notAfter ? '已过期' : '有效';
    var days = Math.ceil((cert.notAfter - now) / 86400000);
    var san = findExt(cert.extensions, '2.5.29.17');
    var ku = findExt(cert.extensions, '2.5.29.15');
    var eku = findExt(cert.extensions, '2.5.29.37');
    var bc = findExt(cert.extensions, '2.5.29.19');
    var skid = findExt(cert.extensions, '2.5.29.14');
    var akid = findExt(cert.extensions, '2.5.29.35');

    return [
      ['证书类型', 'X.509 证书'],
      ['序列号', cert.serialNumber || '—'],
      ['主体（Subject）', cert.subject || '—'],
      ['签发者（Issuer）', cert.issuer || '—'],
      ['生效时间', fmtDate(cert.notBefore)],
      ['到期时间', fmtDate(cert.notAfter)],
      ['当前状态', state + (state === '有效' ? '，剩余 ' + days + ' 天' : '')],
      ['签名算法', fmtAlg(cert.signatureAlgorithm)],
      ['公钥算法', fmtPub(cert.publicKey)],
      ['SAN', san ? sanText(san) : '未设置'],
      ['密钥用途', ku ? keyUsageText(ku.usages) : '未设置'],
      ['扩展密钥用途', eku ? ekuText(eku.usages) : '未设置'],
      ['CA / 路径长度', bc ? (bc.ca ? '是' : '否') + (bc.pathLength != null ? ' · pathLength=' + bc.pathLength : '') : '未设置'],
      ['Subject Key ID', skid && skid.keyId ? skid.keyId : '—'],
      ['Authority Key ID', akid && akid.keyId ? akid.keyId : '—'],
      ['SHA-1 指纹', prints.sha1],
      ['SHA-256 指纹', prints.sha256],
      ['DER 大小', cert.rawData.byteLength + ' B']
    ];
  }

  function extTable(extensions) {
    if (!extensions || !extensions.length) return '<div class="note">没有扩展项。</div>';
    return '<div class="table-wrap" style="margin-top:14px"><table class="table">' +
      '<thead><tr><th>扩展</th><th>OID</th><th>关键</th><th>摘要</th></tr></thead><tbody>' +
      extensions.map(function (e) {
        var summary = '';
        if (e.names) summary = sanText(e);
        else if (e.type === '2.5.29.15') summary = keyUsageText(e.usages);
        else if (e.type === '2.5.29.37') summary = ekuText(e.usages);
        else if (e.type === '2.5.29.19') summary = (e.ca ? 'CA=是' : 'CA=否') + (e.pathLength != null ? '，pathLength=' + e.pathLength : '');
        else if (e.keyId) summary = e.keyId;
        else summary = e.constructor && e.constructor.name ? e.constructor.name : '—';
        return '<tr><td>' + TB.esc(extName(e.type)) + '</td><td style="font-family:ui-monospace,monospace">' +
          TB.esc(e.type) + '</td><td>' + (e.critical ? '是' : '否') + '</td><td style="white-space:normal;word-break:break-all">' +
          TB.esc(summary) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function csrRows(csr, valid) {
    var san = findExt(csr.extensions, '2.5.29.17');
    var ku = findExt(csr.extensions, '2.5.29.15');
    var attrs = [];
    if (csr.attributes && csr.attributes.length) {
      csr.attributes.forEach(function (a) {
        var oid = a.type || a.oid || '';
        if (a.password || oid === '1.2.840.113549.1.9.7') {
          attrs.push('Challenge Password：' + (a.password || '已设置'));
        } else if (oid === '1.2.840.113549.1.9.14') {
          attrs.push('扩展请求（见下方扩展表）');
        } else {
          attrs.push(oid ? '属性 ' + oid : '未知属性');
        }
      });
    }
    return [
      ['CSR 签名', valid ? '有效' : '无效'],
      ['主体（Subject）', csr.subject || '—'],
      ['签名算法', fmtAlg(csr.signatureAlgorithm)],
      ['公钥算法', fmtPub(csr.publicKey)],
      ['SAN', san ? sanText(san) : '未设置'],
      ['密钥用途', ku ? keyUsageText(ku.usages) : '未设置'],
      ['附加属性', attrs.length ? attrs.join('；') : '无'],
      ['DER 大小', csr.rawData.byteLength + ' B']
    ];
  }

  function rowsHTML(rows) {
    return '<div class="kv">' + rows.map(function (r) {
      return '<div class="kv-item"><div class="kv-k">' + TB.esc(r[0]) + '</div>' +
        '<div class="kv-v" style="font-weight:500;word-break:break-all">' + TB.esc(r[1]) + '</div></div>';
    }).join('') + '</div>';
  }

  function parsePemOrDer(X, input, isFile) {
    /* 文件优先按 DER 解析，失败再按文本解析；粘贴内容优先按 PEM / Base64 */
    if (isFile) {
      return TB.readArrayBuffer(isFile).then(function (buf) {
        try { return { cert: new X.X509Certificate(buf), raw: buf, text: '' }; }
        catch (e) {
          return TB.readText(isFile).then(function (text) {
            return { cert: new X.X509Certificate(text.trim()), raw: null, text: text };
          });
        }
      });
    }
    var text = String(input || '').trim();
    if (!text) throw new Error('请粘贴 PEM / Base64 证书内容，或选择文件');
    var blocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    return Promise.resolve({
      cert: new X.X509Certificate(blocks ? blocks[0] : text),
      raw: null,
      text: text,
      count: blocks ? blocks.length : 1
    });
  }

  function parseCsrInput(X, input, isFile) {
    if (isFile) {
      return TB.readArrayBuffer(isFile).then(function (buf) {
        try { return new X.Pkcs10CertificateRequest(buf); }
        catch (e) { return TB.readText(isFile).then(function (t) { return new X.Pkcs10CertificateRequest(t.trim()); }); }
      });
    }
    var text = String(input || '').trim();
    if (!text) throw new Error('请粘贴 PEM / Base64 CSR 内容，或选择文件');
    return Promise.resolve(new X.Pkcs10CertificateRequest(text));
  }

  function downloadPem(text, name) {
    TB.downloadText(text, name, 'application/x-pem-file');
  }

  /* ------------------------------------------------------------ 页面 */
  TB.def({
    slug: 'cert-csr', cat: 'web', name: '证书与 CSR 工具', icon: '📜',
    desc: '查看 X.509 证书、生成与解析 CSR',
    kw: 'x509 证书 ssl tls csr pkcs10 pem der 证书解析 证书生成 签名 san',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="ctTabs">' +
            '<button class="tab on" type="button" data-ct-tab="view">查看证书</button>' +
            '<button class="tab" type="button" data-ct-tab="gen">生成 CSR</button>' +
            '<button class="tab" type="button" data-ct-tab="csr">查看 CSR</button>' +
          '</div>' +

          /* 查看证书 */
          '<div class="rk-pane on" id="ctView">' +
            '<div class="field"><div class="label"><b>证书 PEM / Base64</b><span class="hint">只解析本地内容</span></div>' +
              '<textarea class="textarea codeIn key-area" id="ctPem" placeholder="粘贴 -----BEGIN CERTIFICATE----- 内容"></textarea></div>' +
            '<div class="field"><div class="label"><b>或上传证书文件</b></div><div id="ctDrop"></div></div>' +
            '<div class="btns"><button class="btn primary" type="button" id="ctViewBtn">查看证书</button></div>' +
            '<div id="ctViewMsg"></div>' +
            '<div id="ctViewOut" style="margin-top:14px"></div>' +
            '<div class="note">支持 PEM、Base64 与 DER 文件；证书链会展示第一张证书。不会根据域名在线拉取证书，也不会上传你的文件。</div>' +
          '</div>' +

          /* 生成 CSR */
          '<div class="rk-pane" id="ctGen">' +
            '<div class="row">' +
              '<div class="field" style="flex:2 1 240px"><div class="label"><b>Common Name（CN）</b><span class="hint">必填</span></div>' +
                '<input class="input" id="ctCn" placeholder="example.com"></div>' +
              '<div class="field"><div class="label"><b>Organization（O）</b></div>' +
                '<input class="input" id="ctO" placeholder="公司 / 组织"></div>' +
            '</div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>Organizational Unit（OU）</b></div>' +
                '<input class="input" id="ctOu" placeholder="部门"></div>' +
              '<div class="field"><div class="label"><b>Country（C）</b></div>' +
                '<input class="input" id="ctC" placeholder="CN" maxlength="2"></div>' +
              '<div class="field"><div class="label"><b>State（ST）</b></div>' +
                '<input class="input" id="ctSt" placeholder="省 / 州"></div>' +
              '<div class="field"><div class="label"><b>Locality（L）</b></div>' +
                '<input class="input" id="ctL" placeholder="城市"></div>' +
            '</div>' +
            '<div class="field"><div class="label"><b>SAN</b><span class="hint">每行一个，支持 DNS:、IP:、EMAIL:、URI:</span></div>' +
              '<textarea class="textarea codeIn" id="ctSan" placeholder="DNS:example.com&#10;DNS:www.example.com&#10;IP:127.0.0.1"></textarea></div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>密钥算法</b></div>' +
                '<select class="select" id="ctAlg">' +
                  '<option value="rsa-2048">RSA · 2048 位</option>' +
                  '<option value="rsa-4096">RSA · 4096 位</option>' +
                  '<option value="ecdsa-p256">ECDSA · P-256</option>' +
                  '<option value="ecdsa-p384">ECDSA · P-384</option>' +
                '</select></div>' +
              '<div class="field" style="flex:2 1 240px"><div class="label"><b>密钥用途</b></div>' +
                '<div class="checks" style="padding-top:8px">' +
                  '<label><input type="checkbox" id="ctKuDs" checked> 数字签名</label>' +
                  '<label><input type="checkbox" id="ctKuKe" checked> 密钥加密</label>' +
                  '<label><input type="checkbox" id="ctKuKa"> 密钥协商</label>' +
                '</div></div>' +
            '</div>' +
            '<div class="btns"><button class="btn primary" type="button" id="ctGenBtn">生成 CSR 与私钥</button></div>' +
            '<div id="ctGenMsg"></div>' +
            '<div id="ctGenOut" style="display:none;margin-top:14px">' +
              '<div class="field"><div class="label"><b>CSR（PEM）</b><span class="hint">交给 CA 签发</span></div>' +
                '<textarea class="textarea codeIn key-area" id="ctCsrOut" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px">' +
                  '<button class="btn" type="button" id="ctCsrCopy">复制 CSR</button>' +
                  '<button class="btn" type="button" id="ctCsrDl">下载 CSR</button>' +
                '</div></div>' +
              '<div class="field"><div class="label"><b>私钥（PKCS#8 PEM）</b><span class="hint">只留在本页，刷新即消失</span></div>' +
                '<textarea class="textarea codeIn key-area" id="ctPrivOut" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px">' +
                  '<button class="btn" type="button" id="ctPrivCopy">复制私钥</button>' +
                  '<button class="btn" type="button" id="ctPrivDl">下载私钥</button>' +
                '</div></div>' +
            '</div>' +
            '<div class="note">CSR 只包含公钥和主体信息，不包含私钥。请把 CSR 交给 CA，私钥自己保存；不要把自己的私钥发给任何人。</div>' +
          '</div>' +

          /* 查看 CSR */
          '<div class="rk-pane" id="ctCsr">' +
            '<div class="field"><div class="label"><b>CSR PEM / Base64</b></div>' +
              '<textarea class="textarea codeIn key-area" id="ctCsrIn" placeholder="粘贴 -----BEGIN CERTIFICATE REQUEST----- 内容"></textarea></div>' +
            '<div class="field"><div class="label"><b>或上传 CSR 文件</b></div><div id="ctCsrDrop"></div></div>' +
            '<div class="btns"><button class="btn primary" type="button" id="ctCsrViewBtn">查看 CSR</button></div>' +
            '<div id="ctCsrViewMsg"></div>' +
            '<div id="ctCsrViewOut" style="margin-top:14px"></div>' +
            '<div class="note">会校验 CSR 的自签名，并显示主体、公钥、SAN、密钥用途与附加属性。上传文件只在本地读取。</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">证书库说明</div>' +
          '<div class="note">证书解析使用本地部署的 <b>@peculiar/x509 2.2.0</b>（MIT）和 <b>@abraham/reflection 0.14.0</b>（MIT）。首次点击“查看证书”或“生成 CSR”时才加载，约 230 KB；不请求外部接口。</div>' +
        '</div>';

      var tabs = TB.$$('[data-ct-tab]', root);
      var panes = { view: TB.$('#ctView', root), gen: TB.$('#ctGen', root), csr: TB.$('#ctCsr', root) };
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var name = tab.getAttribute('data-ct-tab');
          tabs.forEach(function (t) { t.classList.toggle('on', t === tab); });
          Object.keys(panes).forEach(function (k) { panes[k].classList.toggle('on', k === name); });
        });
      });

      /* -- 查看证书 -- */
      var viewFile = null;
      var viewPicker = TB.filePicker(TB.$('#ctDrop', root), {
        hint: '选择 .pem / .crt / .cer / .der 文件',
        accept: '.pem,.crt,.cer,.der,.txt'
      });
      viewPicker.onChange = function () {
        viewFile = viewPicker.files.length ? viewPicker.files[0].file : null;
        if (viewFile) {
          /* 新选文件时清掉旧粘贴内容，避免继续解析文本框里的上一张证书 */
          TB.$('#ctPem', root).value = '';
          viewCert();
        }
      };

      async function viewCert() {
        var btn = TB.$('#ctViewBtn', root);
        var box = TB.$('#ctViewMsg', root);
        var out = TB.$('#ctViewOut', root);
        try {
          setBusy(btn, true, '解析中…');
          msg(box, '正在加载证书库…');
          var X = await loadX509();
          var pemText = TB.$('#ctPem', root).value.trim();
          var input = pemText || null;
          var file = pemText ? null : viewFile;
          var data = await parsePemOrDer(X, input, file);
          var cert = data.cert;
          var prints = {
            sha1: await fingerprint(cert.rawData, 'SHA-1'),
            sha256: await fingerprint(cert.rawData, 'SHA-256')
          };
          out.innerHTML = rowsHTML(certRows(cert, prints)) +
            '<div class="note">扩展项：' + (cert.extensions ? cert.extensions.length : 0) + ' 个' +
            (data.count && data.count > 1 ? '；检测到 ' + data.count + ' 张证书，当前展示第一张' : '') + '。</div>' +
            extTable(cert.extensions);
          msg(box, '证书解析完成。');
        } catch (e) {
          out.innerHTML = '';
          msg(box, '解析失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      }
      TB.$('#ctViewBtn', root).addEventListener('click', viewCert);

      /* -- 生成 CSR -- */
      function dnEscape(v) {
        return String(v || '').trim().replace(/([,+"\\<>;])/g, '\\$1');
      }

      function buildDN() {
        var cn = TB.$('#ctCn', root).value.trim();
        if (!cn) throw new Error('Common Name（CN）不能为空');
        var parts = ['CN=' + dnEscape(cn)];
        [['O', '#ctO'], ['OU', '#ctOu'], ['C', '#ctC'], ['ST', '#ctSt'], ['L', '#ctL']].forEach(function (p) {
          var v = TB.$(p[1], root).value.trim();
          if (v) parts.push(p[0] + '=' + dnEscape(v));
        });
        return parts.join(', ');
      }

      function parseSan() {
        var raw = TB.$('#ctSan', root).value.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        var items = [];
        raw.forEach(function (line) {
          var m = line.match(/^(DNS|IP|EMAIL|URI):\s*(.*)$/i);
          var type = m ? m[1].toLowerCase() : 'dns';
          var value = m ? m[2].trim() : line;
          if (!value) throw new Error('SAN 有空值：' + line);
          if (type === 'ip' && !/^[0-9a-f:.]+$/i.test(value)) throw new Error('IP SAN 格式不正确：' + value);
          if (type === 'email' && !/^[^@\s]+@[^@\s]+$/.test(value)) throw new Error('EMAIL SAN 格式不正确：' + value);
          if (type === 'dns' && /\s/.test(value)) throw new Error('DNS SAN 不能包含空格：' + value);
          items.push({ type: type === 'email' ? 'email' : type === 'uri' ? 'url' : type, value: value });
        });
        return items;
      }

      function keySpec(value) {
        if (value === 'rsa-4096' || value === 'rsa-2048') {
          var bits = value === 'rsa-4096' ? 4096 : 2048;
          return {
            gen: { name: 'RSASSA-PKCS1-v1_5', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
            sig: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            label: 'RSA ' + bits + ' 位'
          };
        }
        var curve = value === 'ecdsa-p384' ? 'P-384' : 'P-256';
        return {
          gen: { name: 'ECDSA', namedCurve: curve, hash: curve === 'P-384' ? 'SHA-384' : 'SHA-256' },
          sig: { name: 'ECDSA', hash: { name: curve === 'P-384' ? 'SHA-384' : 'SHA-256' } },
          label: 'ECDSA ' + curve
        };
      }

      function b64(buf) {
        var bytes = new Uint8Array(buf);
        var s = '';
        for (var i = 0; i < bytes.length; i += 0x8000) {
          s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(s);
      }

      function derToPem(buf, label) {
        return '-----BEGIN ' + label + '-----\n' +
          b64(buf).replace(/(.{64})/g, '$1\n').replace(/\n$/, '') +
          '\n-----END ' + label + '-----';
      }

      TB.$('#ctGenBtn', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#ctGenMsg', root), out = TB.$('#ctGenOut', root);
        try {
          if (!window.crypto || !crypto.subtle) throw new Error('当前页面不是安全上下文，浏览器禁用了 WebCrypto');
          setBusy(btn, true, '生成中…');
          msg(box, '正在加载证书库并生成密钥…');
          var X = await loadX509();
          var dn = buildDN();
          var items = parseSan();
          var spec = keySpec(TB.$('#ctAlg', root).value);
          var flags = 0;
          if (TB.$('#ctKuDs', root).checked) flags |= 1;
          if (TB.$('#ctKuKe', root).checked) flags |= 4;
          if (TB.$('#ctKuKa', root).checked) flags |= 16;

          var keys = await crypto.subtle.generateKey(spec.gen, true, ['sign', 'verify']);
          var extensions = [];
          if (items.length) extensions.push(new X.SubjectAlternativeNameExtension(items));
          if (flags) extensions.push(new X.KeyUsagesExtension(flags, true));

          var csr = await X.Pkcs10CertificateRequestGenerator.create({
            name: dn,
            keys: keys,
            signingAlgorithm: spec.sig,
            extensions: extensions
          });
          var csrPem = csr.toString('pem');
          var privDer = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
          var privPem = derToPem(privDer, 'PRIVATE KEY');
          TB.$('#ctCsrOut', root).value = csrPem;
          TB.$('#ctPrivOut', root).value = privPem;
          out.style.display = '';
          msg(box, spec.label + ' CSR 已生成，DER ' + csr.rawData.byteLength + ' 字节。');
        } catch (e) {
          out.style.display = 'none';
          msg(box, '生成失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      });

      TB.$('#ctCsrCopy', root).addEventListener('click', function () {
        var v = TB.$('#ctCsrOut', root).value;
        if (v) TB.copy(v); else TB.toast('还没有 CSR');
      });
      TB.$('#ctPrivCopy', root).addEventListener('click', function () {
        var v = TB.$('#ctPrivOut', root).value;
        if (v) TB.copy(v); else TB.toast('还没有私钥');
      });
      TB.$('#ctCsrDl', root).addEventListener('click', function () {
        var v = TB.$('#ctCsrOut', root).value;
        if (v) downloadPem(v, 'request.csr'); else TB.toast('还没有 CSR');
      });
      TB.$('#ctPrivDl', root).addEventListener('click', function () {
        var v = TB.$('#ctPrivOut', root).value;
        if (v) downloadPem(v, 'private-key.pem'); else TB.toast('还没有私钥');
      });

      /* -- 查看 CSR -- */
      var csrFile = null;
      var csrPicker = TB.filePicker(TB.$('#ctCsrDrop', root), {
        hint: '选择 .csr / .pem / .req 文件',
        accept: '.csr,.pem,.req,.txt'
      });
      csrPicker.onChange = function () {
        csrFile = csrPicker.files.length ? csrPicker.files[0].file : null;
        if (csrFile) viewCsr();
      };

      async function viewCsr() {
        var btn = TB.$('#ctCsrViewBtn', root);
        var box = TB.$('#ctCsrViewMsg', root);
        var out = TB.$('#ctCsrViewOut', root);
        try {
          setBusy(btn, true, '解析中…');
          msg(box, '正在加载证书库…');
          var X = await loadX509();
          var csr = await parseCsrInput(X, csrFile ? null : TB.$('#ctCsrIn', root).value, csrFile);
          var valid = false;
          try { valid = !!(await csr.verify()); } catch (e) { valid = false; }
          out.innerHTML = rowsHTML(csrRows(csr, valid)) + extTable(csr.extensions) +
            '<div class="note">CSR 的 PEM 内容：</div>' +
            '<textarea class="textarea codeIn key-area" id="ctCsrPemOut" readonly></textarea>' +
            '<div class="btns" style="margin-top:8px"><button class="btn" type="button" id="ctCsrPemCopy">复制 CSR</button></div>';
          TB.$('#ctCsrPemOut', root).value = csr.toString('pem');
          TB.$('#ctCsrPemCopy', root).addEventListener('click', function () {
            TB.copy(csr.toString('pem'));
          });
          msg(box, valid ? 'CSR 解析完成，自签名有效。' : 'CSR 已解析，但自签名校验未通过。', !valid);
        } catch (e) {
          out.innerHTML = '';
          msg(box, '解析失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      }
      TB.$('#ctCsrViewBtn', root).addEventListener('click', viewCsr);
    }
  });

})();
