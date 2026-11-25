/* =============================================================================
 * 开发者工具：RSA / ECC 密钥工具、AES 加密解密
 * -----------------------------------------------------------------------------
 * 全部使用浏览器原生 WebCrypto，不引入第三方库：
 *   - RSA-OAEP-SHA256：公钥加密、私钥解密（只适合短文本或密钥）
 *   - RSA-PSS-SHA256：私钥签名、公钥验签
 *   - ECDSA P-256 / P-384：私钥签名、公钥验签
 *   - AES-256-GCM + PBKDF2-SHA256：文本与文件加密，带完整性校验
 *
 * 密钥和文件只在当前页面内存里处理，刷新即清空，不上传服务器。
 * ========================================================================== */

(function () {
  'use strict';

  var AES_ITER = 310000;                 // PBKDF2 迭代次数，平衡安全与手机端耗时
  var FILE_MAGIC = 'TBENC1';             // 文件容器标识
  var FILE_VERSION = 1;

  /* ------------------------------------------------------------ 公共小工具 */
  function msg(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text
      ? '<div class="note" style="margin-top:12px"><span class="' +
        (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>'
      : '';
  }

  function needCrypto() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('当前页面不是安全上下文，浏览器禁用了 WebCrypto。请用 https 或 localhost 打开。');
    }
  }

  function bytesToB64(buf) {
    var bytes = new Uint8Array(buf);
    var out = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(out);
  }

  function b64ToBytes(str) {
    var clean = String(str || '').replace(/\s+/g, '');
    if (!clean) throw new Error('内容为空');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('不是有效的 Base64 内容');
    var bin = atob(clean);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* PEM 只接受标准 SPKI 公钥与 PKCS#8 私钥；PKCS#1 需要用户先转换 */
  function pemToDer(text) {
    var s = String(text || '').trim();
    if (!s) throw new Error('请先填写 PEM 内容');
    if (/-----BEGIN RSA PRIVATE KEY-----/.test(s)) {
      throw new Error('检测到 PKCS#1 私钥。WebCrypto 只接受 PKCS#8，请先执行 openssl pkcs8 -topk8 -nocrypt 转换');
    }
    if (/-----BEGIN RSA PUBLIC KEY-----/.test(s)) {
      throw new Error('检测到 PKCS#1 公钥。请使用 SPKI 格式（BEGIN PUBLIC KEY）');
    }
    var m = s.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
    var body = m ? m[1] : s;
    return b64ToBytes(body);
  }

  function derToPem(buf, label) {
    var line = bytesToB64(buf).replace(/(.{64})/g, '$1\n').replace(/\n$/, '');
    return '-----BEGIN ' + label + '-----\n' + line + '\n-----END ' + label + '-----';
  }

  function randomBytes(n) {
    var a = new Uint8Array(n);
    window.crypto.getRandomValues(a);
    return a;
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
    btn.disabled = !!busy;
    btn.textContent = busy ? label : btn.getAttribute('data-label');
  }

  function downloadPem(text, filename) {
    TB.downloadText(text, filename, 'application/x-pem-file');
  }

  function copyButton(btn, text) {
    if (!text) { TB.toast('还没有内容'); return; }
    TB.copy(text);
  }

  /* ------------------------------------------------------------ RSA / ECC */
  TB.def({
    slug: 'rsa-key', cat: 'web', name: 'RSA / ECC 密钥工具', icon: '🔑',
    desc: '生成密钥、签名验签、RSA 加解密',
    kw: 'rsa ecc ecdsa 公私钥 密钥 签名 验签 加密 解密 pem pkcs8 spki oaep pss',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="rkTabs">' +
            '<button class="tab on" type="button" data-rk-tab="gen">生成密钥</button>' +
            '<button class="tab" type="button" data-rk-tab="sign">签名验签</button>' +
            '<button class="tab" type="button" data-rk-tab="enc">RSA 加解密</button>' +
          '</div>' +

          /* 生成密钥 */
          '<div class="rk-pane on" id="rkGen">' +
            '<div class="row">' +
              '<div class="field" style="flex:2 1 260px"><div class="label"><b>算法与用途</b></div>' +
                '<select class="select" id="rkAlg">' +
                  '<option value="rsa-oaep-2048">RSA-OAEP · 2048 位 · 加密</option>' +
                  '<option value="rsa-oaep-4096">RSA-OAEP · 4096 位 · 加密</option>' +
                  '<option value="rsa-pss-2048">RSA-PSS · 2048 位 · 签名</option>' +
                  '<option value="rsa-pss-4096">RSA-PSS · 4096 位 · 签名</option>' +
                  '<option value="ecdsa-p256">ECDSA · P-256 · 签名</option>' +
                  '<option value="ecdsa-p384">ECDSA · P-384 · 签名</option>' +
                '</select></div>' +
              '<div class="field" style="flex:0 0 auto"><div class="label">&nbsp;</div>' +
                '<button class="btn primary" type="button" id="rkGenBtn">生成密钥</button></div>' +
            '</div>' +
            '<div id="rkGenMsg"></div>' +
            '<div id="rkKeys" style="display:none;margin-top:14px">' +
              '<div class="field"><div class="label"><b>公钥 PEM</b><span class="hint">SPKI，可公开分发</span></div>' +
                '<textarea class="textarea codeIn key-area" id="rkPub" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px">' +
                  '<button class="btn" type="button" id="rkPubCopy">复制公钥</button>' +
                  '<button class="btn" type="button" id="rkPubDl">下载公钥</button>' +
                '</div></div>' +
              '<div class="field"><div class="label"><b>私钥 PEM</b><span class="hint">PKCS#8，不要发给别人</span></div>' +
                '<textarea class="textarea codeIn key-area" id="rkPriv" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px">' +
                  '<button class="btn" type="button" id="rkPrivCopy">复制私钥</button>' +
                  '<button class="btn" type="button" id="rkPrivDl">下载私钥</button>' +
                '</div></div>' +
            '</div>' +
            '<div class="note">密钥只在当前页面内存中生成；刷新页面即消失。RSA-OAEP 密钥用于加密，RSA-PSS / ECDSA 密钥用于签名，二者不能混用。</div>' +
          '</div>' +

          /* 签名验签 */
          '<div class="rk-pane" id="rkSign">' +
            '<div class="field"><div class="label"><b>签名算法</b></div>' +
              '<select class="select" id="rkSignAlg" style="max-width:320px">' +
                '<option value="rsa-pss">RSA-PSS · SHA-256</option>' +
                '<option value="ecdsa-p256">ECDSA · P-256 · SHA-256</option>' +
                '<option value="ecdsa-p384">ECDSA · P-384 · SHA-384</option>' +
              '</select></div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>私钥 PEM</b></div>' +
                '<textarea class="textarea codeIn key-area" id="rkSignPriv" placeholder="粘贴 PKCS#8 私钥"></textarea></div>' +
              '<div class="field"><div class="label"><b>公钥 PEM</b></div>' +
                '<textarea class="textarea codeIn key-area" id="rkSignPub" placeholder="粘贴 SPKI 公钥"></textarea></div>' +
            '</div>' +
            '<div class="field"><div class="label"><b>待签名内容</b></div>' +
              '<textarea class="textarea codeIn" id="rkSignMsg" placeholder="输入要签名的文本"></textarea></div>' +
            '<div class="btns"><button class="btn primary" type="button" id="rkSignBtn">生成签名</button></div>' +
            '<div id="rkSignMsgBox"></div>' +
            '<div class="field" style="margin-top:14px"><div class="label"><b>签名值（Base64）</b></div>' +
              '<textarea class="textarea codeIn key-area" id="rkSignOut" placeholder="签名结果会出现在这里"></textarea></div>' +
            '<div class="field"><div class="label"><b>验签</b><span class="hint">把上面的签名值和原文一起校验</span></div>' +
              '<textarea class="textarea codeIn key-area" id="rkVerifySig" placeholder="粘贴签名值 Base64"></textarea></div>' +
            '<div class="btns"><button class="btn" type="button" id="rkVerifyBtn">验证签名</button></div>' +
            '<div id="rkVerifyMsg"></div>' +
            '<div class="note">签名值是本工具输出的 Base64；ECDSA 使用 WebCrypto 原始签名格式，不是 OpenSSL 常见的 DER 序列化格式。跨工具使用前请确认格式。</div>' +
          '</div>' +

          /* RSA 加解密 */
          '<div class="rk-pane" id="rkEnc">' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>公钥 PEM</b><span class="hint">RSA-OAEP</span></div>' +
                '<textarea class="textarea codeIn key-area" id="rkEncPub" placeholder="粘贴 RSA-OAEP 公钥"></textarea></div>' +
              '<div class="field"><div class="label"><b>私钥 PEM</b><span class="hint">RSA-OAEP</span></div>' +
                '<textarea class="textarea codeIn key-area" id="rkEncPriv" placeholder="粘贴 RSA-OAEP 私钥"></textarea></div>' +
            '</div>' +
            '<div class="field"><div class="label"><b>明文</b><span class="hint">RSA 只能加密短内容，长文本请用 AES 工具</span></div>' +
              '<textarea class="textarea codeIn" id="rkEncText" placeholder="输入要加密的短文本"></textarea></div>' +
            '<div class="btns"><button class="btn primary" type="button" id="rkEncBtn">公钥加密</button></div>' +
            '<div id="rkEncMsg"></div>' +
            '<div class="field" style="margin-top:14px"><div class="label"><b>密文（Base64）</b></div>' +
              '<textarea class="textarea codeIn key-area" id="rkEncOut" placeholder="加密结果会出现在这里"></textarea></div>' +
            '<div class="btns"><button class="btn" type="button" id="rkDecBtn">私钥解密</button></div>' +
            '<div id="rkDecMsg"></div>' +
            '<div class="field" style="margin-top:14px"><div class="label"><b>解密结果</b></div>' +
              '<textarea class="textarea codeIn" id="rkDecOut" readonly></textarea></div>' +
            '<div class="note">算法固定为 RSA-OAEP + SHA-256。2048 位最多加密约 190 字节，4096 位约 446 字节；超过限制请改用 AES-GCM。</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">使用边界</div>' +
          '<div class="note">只使用 WebCrypto 能正确支持的算法：RSA 2048 / 4096、ECDSA P-256 / P-384。不提供 512 / 1024 位 RSA、DSA、DH 或自写大数运算。私钥不会被保存到 localStorage，也不会自动上传。</div>' +
        '</div>';

      var tabs = TB.$$('[data-rk-tab]', root);
      var panes = {
        gen: TB.$('#rkGen', root), sign: TB.$('#rkSign', root), enc: TB.$('#rkEnc', root)
      };
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var name = tab.getAttribute('data-rk-tab');
          tabs.forEach(function (t) { t.classList.toggle('on', t === tab); });
          Object.keys(panes).forEach(function (k) { panes[k].classList.toggle('on', k === name); });
        });
      });

      var lastKeys = { pub: '', priv: '' };

      /* -- 生成 -- */
      function specOf(value) {
        if (value === 'rsa-oaep-2048' || value === 'rsa-oaep-4096') {
          var bits = value.slice(-4) === '4096' ? 4096 : 2048;
          return {
            kind: 'rsa-oaep', bits: bits,
            gen: { name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
            usages: ['encrypt', 'decrypt'],
            importAlg: { name: 'RSA-OAEP', hash: 'SHA-256' }
          };
        }
        if (value === 'rsa-pss-2048' || value === 'rsa-pss-4096') {
          var bits2 = value.slice(-4) === '4096' ? 4096 : 2048;
          return {
            kind: 'rsa-pss', bits: bits2,
            gen: { name: 'RSA-PSS', modulusLength: bits2, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
            usages: ['sign', 'verify'],
            importAlg: { name: 'RSA-PSS', hash: 'SHA-256' }
          };
        }
        var curve = value === 'ecdsa-p384' ? 'P-384' : 'P-256';
        return {
          kind: 'ecdsa', curve: curve,
          gen: { name: 'ECDSA', namedCurve: curve, hash: curve === 'P-384' ? 'SHA-384' : 'SHA-256' },
          usages: ['sign', 'verify'],
          importAlg: { name: 'ECDSA', namedCurve: curve }
        };
      }

      TB.$('#rkGenBtn', root).addEventListener('click', async function () {
        var btn = this;
        var box = TB.$('#rkGenMsg', root);
        try {
          needCrypto();
          msg(box, '正在生成密钥，请稍候…');
          setBusy(btn, true, '生成中…');
          var spec = specOf(TB.$('#rkAlg', root).value);
          var kp = await window.crypto.subtle.generateKey(spec.gen, true, spec.usages);
          var pubDer = await window.crypto.subtle.exportKey('spki', kp.publicKey);
          var privDer = await window.crypto.subtle.exportKey('pkcs8', kp.privateKey);
          lastKeys.pub = derToPem(pubDer, 'PUBLIC KEY');
          lastKeys.priv = derToPem(privDer, 'PRIVATE KEY');
          TB.$('#rkPub', root).value = lastKeys.pub;
          TB.$('#rkPriv', root).value = lastKeys.priv;
          TB.$('#rkKeys', root).style.display = '';
          msg(box, '已生成 ' + (spec.kind === 'ecdsa' ? 'ECDSA ' + spec.curve : (spec.kind === 'rsa-oaep' ? 'RSA-OAEP ' : 'RSA-PSS ') + spec.bits + ' 位') + ' 密钥对。');
        } catch (e) {
          msg(box, '生成失败：' + e.message, true);
        } finally {
          setBusy(btn, false);
        }
      });

      TB.$('#rkPubCopy', root).addEventListener('click', function () { copyButton(this, lastKeys.pub); });
      TB.$('#rkPrivCopy', root).addEventListener('click', function () { copyButton(this, lastKeys.priv); });
      TB.$('#rkPubDl', root).addEventListener('click', function () {
        if (!lastKeys.pub) { TB.toast('还没有公钥'); return; }
        downloadPem(lastKeys.pub, 'public-key.pem');
      });
      TB.$('#rkPrivDl', root).addEventListener('click', function () {
        if (!lastKeys.priv) { TB.toast('还没有私钥'); return; }
        downloadPem(lastKeys.priv, 'private-key.pem');
      });

      /* -- 签名验签 -- */
      function signSpec(value) {
        if (value === 'ecdsa-p256') {
          return {
            importAlg: { name: 'ECDSA', namedCurve: 'P-256' },
            signAlg: { name: 'ECDSA', hash: { name: 'SHA-256' } },
            label: 'ECDSA P-256'
          };
        }
        if (value === 'ecdsa-p384') {
          return {
            importAlg: { name: 'ECDSA', namedCurve: 'P-384' },
            signAlg: { name: 'ECDSA', hash: { name: 'SHA-384' } },
            label: 'ECDSA P-384'
          };
        }
        return {
          importAlg: { name: 'RSA-PSS', hash: 'SHA-256' },
          signAlg: { name: 'RSA-PSS', saltLength: 32 },
          label: 'RSA-PSS'
        };
      }

      TB.$('#rkSignBtn', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#rkSignMsgBox', root);
        try {
          needCrypto();
          var spec = signSpec(TB.$('#rkSignAlg', root).value);
          var privDer = pemToDer(TB.$('#rkSignPriv', root).value);
          var key = await window.crypto.subtle.importKey('pkcs8', privDer, spec.importAlg, false, ['sign']);
          var data = new TextEncoder().encode(TB.$('#rkSignMsg', root).value);
          var sig = await window.crypto.subtle.sign(spec.signAlg, key, data);
          TB.$('#rkSignOut', root).value = bytesToB64(sig);
          /* 顺手填到验签框，方便同一页直接验证；用户仍可改成别的签名 */
          TB.$('#rkVerifySig', root).value = TB.$('#rkSignOut', root).value;
          msg(box, spec.label + ' 签名完成，签名值 ' + sig.byteLength + ' 字节。');
        } catch (e) {
          msg(box, '签名失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      });

      TB.$('#rkVerifyBtn', root).addEventListener('click', async function () {
        var box = TB.$('#rkVerifyMsg', root);
        try {
          needCrypto();
          var spec = signSpec(TB.$('#rkSignAlg', root).value);
          var pubDer = pemToDer(TB.$('#rkSignPub', root).value);
          var key = await window.crypto.subtle.importKey('spki', pubDer, spec.importAlg, false, ['verify']);
          var sig = b64ToBytes(TB.$('#rkVerifySig', root).value);
          var data = new TextEncoder().encode(TB.$('#rkSignMsg', root).value);
          var ok = await window.crypto.subtle.verify(spec.signAlg, key, sig, data);
          msg(box, ok ? '签名有效，原文与公钥匹配。' : '签名无效：原文、签名或公钥至少有一项不匹配。', !ok);
        } catch (e) {
          msg(box, '验签失败：' + e.message, true);
        }
      });

      /* -- RSA 加解密 -- */
      TB.$('#rkEncBtn', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#rkEncMsg', root);
        try {
          needCrypto();
          var key = await window.crypto.subtle.importKey(
            'spki', pemToDer(TB.$('#rkEncPub', root).value),
            { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
          );
          var plain = new TextEncoder().encode(TB.$('#rkEncText', root).value);
          var max = key.algorithm.modulusLength / 8 - 2 * 32 - 2;
          if (!plain.length) throw new Error('请先填写明文');
          if (plain.length > max) throw new Error('明文 ' + plain.length + ' 字节，超过当前密钥上限 ' + max + ' 字节');
          var ct = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, plain);
          TB.$('#rkEncOut', root).value = bytesToB64(ct);
          msg(box, '加密完成：明文 ' + plain.length + ' 字节，密文 ' + ct.byteLength + ' 字节。');
        } catch (e) {
          msg(box, '加密失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      });

      TB.$('#rkDecBtn', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#rkDecMsg', root);
        try {
          needCrypto();
          var key = await window.crypto.subtle.importKey(
            'pkcs8', pemToDer(TB.$('#rkEncPriv', root).value),
            { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']
          );
          var ct = b64ToBytes(TB.$('#rkEncOut', root).value);
          if (!ct.length) throw new Error('请先填写密文');
          var plain = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, ct);
          TB.$('#rkDecOut', root).value = new TextDecoder('utf-8', { fatal: true }).decode(plain);
          msg(box, '解密完成。');
        } catch (e) {
          msg(box, '解密失败：' + (e.message || e.name || '未知错误') + '。密钥不匹配或密文被改动。', true);
        } finally { setBusy(btn, false); }
      });
    }
  });

  /* ------------------------------------------------------------ AES 加密 */
  TB.def({
    slug: 'aes-crypt', cat: 'web', name: 'AES 加密解密', icon: '🔐',
    desc: 'AES-GCM 文本与文件本地加密',
    kw: 'aes gcm 加密 解密 密码 文件加密 文本加密 pbkdf2 对称加密',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="aesTabs">' +
            '<button class="tab on" type="button" data-aes-tab="text">文本加密</button>' +
            '<button class="tab" type="button" data-aes-tab="file">文件加密</button>' +
          '</div>' +

          '<div class="rk-pane on" id="aesTextPane">' +
            '<div class="field"><div class="label"><b>密码</b><span class="hint">至少 8 位，密码丢失无法恢复</span></div>' +
              '<input class="input" type="password" id="aesTextPw" placeholder="输入加密密码" autocomplete="new-password"></div>' +
            '<div class="field"><div class="label"><b>明文</b></div>' +
              '<textarea class="textarea codeIn" id="aesTextIn" placeholder="输入要加密的文本"></textarea></div>' +
            '<div class="btns"><button class="btn primary" type="button" id="aesTextEnc">加密文本</button></div>' +
            '<div id="aesTextMsg"></div>' +
            '<div class="field" style="margin-top:14px"><div class="label"><b>密文</b><span class="hint">JSON 格式，可直接保存或发送</span></div>' +
              '<textarea class="textarea codeIn key-area" id="aesTextOut" placeholder="加密结果会出现在这里"></textarea>' +
              '<div class="btns" style="margin-top:8px">' +
                '<button class="btn" type="button" id="aesTextCopy">复制密文</button>' +
                '<button class="btn" type="button" id="aesTextDl">下载密文</button>' +
              '</div></div>' +
            '<div class="btns"><button class="btn" type="button" id="aesTextDec">解密文本</button></div>' +
            '<div id="aesTextDecMsg"></div>' +
            '<div class="field" style="margin-top:14px"><div class="label"><b>解密结果</b></div>' +
              '<textarea class="textarea codeIn" id="aesTextPlain" readonly></textarea></div>' +
            '<div class="note">算法：AES-256-GCM，密钥由 PBKDF2-SHA256（' + AES_ITER.toLocaleString('zh-CN') + ' 次）从密码派生。每次加密随机生成 16 字节盐和 12 字节 IV，同一密码每次输出的密文都不同。</div>' +
          '</div>' +

          '<div class="rk-pane" id="aesFilePane">' +
            '<div class="field"><div class="label"><b>密码</b><span class="hint">加密与解密使用同一密码</span></div>' +
              '<input class="input" type="password" id="aesFilePw" placeholder="输入文件密码" autocomplete="new-password"></div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>加密文件</b></div><div id="aesEncDrop"></div>' +
                '<div class="btns"><button class="btn primary" type="button" id="aesFileEncBtn">加密并下载 .tben</button></div>' +
                '<div id="aesFileEncMsg"></div></div>' +
              '<div class="field"><div class="label"><b>解密文件</b></div><div id="aesDecDrop"></div>' +
                '<div class="btns"><button class="btn" type="button" id="aesFileDecBtn">解密并下载原文件</button></div>' +
                '<div id="aesFileDecMsg"></div></div>' +
            '</div>' +
            '<div class="note">文件容器格式：<code>TBENC1</code> + 版本 + PBKDF2 迭代次数 + 盐 + IV + AES-GCM 密文。解密时会校验认证标签，密码错误或文件被改动都会直接失败。大文件受浏览器内存限制，建议单文件不超过 64 MB。</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel"><div class="panel-h">安全边界</div>' +
          '<div class="note">这是浏览器本地加密工具，不上传文件，也不保存密码。它适合给文件加一层密码保护、在聊天工具里传密文；不适合替代磁盘加密、密钥管理服务或企业级加密方案。密码一旦忘记，AES-GCM 密文无法恢复。</div>' +
        '</div>';

      var tabs = TB.$$('[data-aes-tab]', root);
      var panes = { text: TB.$('#aesTextPane', root), file: TB.$('#aesFilePane', root) };
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var name = tab.getAttribute('data-aes-tab');
          tabs.forEach(function (t) { t.classList.toggle('on', t === tab); });
          Object.keys(panes).forEach(function (k) { panes[k].classList.toggle('on', k === name); });
        });
      });

      function checkPassword(pw) {
        if (!pw || pw.length < 8) throw new Error('密码至少 8 位');
        return pw;
      }

      async function deriveKey(password, salt, iterations) {
        var raw = await window.crypto.subtle.importKey(
          'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
        );
        return window.crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        );
      }

      /* -- 文本 -- */
      TB.$('#aesTextEnc', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#aesTextMsg', root);
        try {
          needCrypto();
          var pw = checkPassword(TB.$('#aesTextPw', root).value);
          var text = TB.$('#aesTextIn', root).value;
          if (!text) throw new Error('请先填写明文');
          setBusy(btn, true, '加密中…');
          var salt = randomBytes(16);
          var iv = randomBytes(12);
          var key = await deriveKey(pw, salt, AES_ITER);
          var ct = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text)
          );
          var obj = {
            v: 1, alg: 'AES-GCM', kdf: 'PBKDF2-SHA256', iter: AES_ITER,
            salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(ct)
          };
          TB.$('#aesTextOut', root).value = JSON.stringify(obj, null, 2);
          msg(box, '加密完成。密文 ' + ct.byteLength + ' 字节。');
        } catch (e) {
          msg(box, '加密失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      });

      TB.$('#aesTextDec', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#aesTextDecMsg', root);
        try {
          needCrypto();
          var pw = checkPassword(TB.$('#aesTextPw', root).value);
          var obj = JSON.parse(TB.$('#aesTextOut', root).value);
          if (!obj || obj.v !== 1 || obj.alg !== 'AES-GCM' || !obj.salt || !obj.iv || !obj.data) {
            throw new Error('密文格式不正确，需要本工具生成的 JSON');
          }
          var iter = parseInt(obj.iter, 10);
          if (!iter || iter < 10000 || iter > 1000000) throw new Error('PBKDF2 迭代次数异常');
          setBusy(btn, true, '解密中…');
          var key = await deriveKey(pw, b64ToBytes(obj.salt), iter);
          var plain = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: b64ToBytes(obj.iv) }, key, b64ToBytes(obj.data)
          );
          TB.$('#aesTextPlain', root).value = new TextDecoder('utf-8', { fatal: true }).decode(plain);
          msg(box, '解密完成。');
        } catch (e) {
          msg(box, '解密失败：' + (e.message || e.name || '未知错误') + '。密码错误或密文被改动。', true);
        } finally { setBusy(btn, false); }
      });

      TB.$('#aesTextCopy', root).addEventListener('click', function () {
        copyButton(this, TB.$('#aesTextOut', root).value);
      });
      TB.$('#aesTextDl', root).addEventListener('click', function () {
        var v = TB.$('#aesTextOut', root).value;
        if (!v) { TB.toast('还没有密文'); return; }
        TB.downloadText(v, 'aes-encrypted.json', 'application/json');
      });

      /* -- 文件 -- */
      var encPicker = TB.filePicker(TB.$('#aesEncDrop', root), {
        hint: '选择要加密的文件，建议不超过 64 MB'
      });
      var decPicker = TB.filePicker(TB.$('#aesDecDrop', root), {
        hint: '选择本工具生成的 .tben 文件',
        accept: '.tben,application/octet-stream'
      });

      function fileInfo(picker, box, label) {
        if (!picker.files.length) { msg(box, ''); return; }
        var f = picker.files[0].file;
        msg(box, label + '：' + f.name + ' · ' + TB.fmtBytes(f.size));
      }
      encPicker.onChange = function () { fileInfo(encPicker, TB.$('#aesFileEncMsg', root), '已选择'); };
      decPicker.onChange = function () { fileInfo(decPicker, TB.$('#aesFileDecMsg', root), '已选择'); };

      function header(salt, iv, iter) {
        var h = new Uint8Array(39);
        for (var i = 0; i < 6; i++) h[i] = FILE_MAGIC.charCodeAt(i);
        h[6] = FILE_VERSION;
        new DataView(h.buffer).setUint32(7, iter, false);
        h.set(salt, 11);
        h.set(iv, 27);
        return h;
      }

      TB.$('#aesFileEncBtn', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#aesFileEncMsg', root);
        try {
          needCrypto();
          if (!encPicker.files.length) throw new Error('请先选择要加密的文件');
          var pw = checkPassword(TB.$('#aesFilePw', root).value);
          var file = encPicker.files[0].file;
          setBusy(btn, true, '加密中…');
          msg(box, '正在读取文件…');
          var buf = await TB.readArrayBuffer(file);
          var salt = randomBytes(16);
          var iv = randomBytes(12);
          var key = await deriveKey(pw, salt, AES_ITER);
          var ct = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, buf);
          var h = header(salt, iv, AES_ITER);
          var out = new Uint8Array(h.length + ct.byteLength);
          out.set(h, 0);
          out.set(new Uint8Array(ct), h.length);
          TB.download(new Blob([out], { type: 'application/octet-stream' }), file.name + '.tben');
          msg(box, '加密完成：' + file.name + ' → ' + TB.fmtBytes(out.length));
        } catch (e) {
          msg(box, '加密失败：' + e.message, true);
        } finally { setBusy(btn, false); }
      });

      TB.$('#aesFileDecBtn', root).addEventListener('click', async function () {
        var btn = this, box = TB.$('#aesFileDecMsg', root);
        try {
          needCrypto();
          if (!decPicker.files.length) throw new Error('请先选择 .tben 文件');
          var pw = checkPassword(TB.$('#aesFilePw', root).value);
          var file = decPicker.files[0].file;
          setBusy(btn, true, '解密中…');
          msg(box, '正在读取文件…');
          var buf = new Uint8Array(await TB.readArrayBuffer(file));
          if (buf.length < 39) throw new Error('文件太短，不是有效的 .tben 容器');
          for (var i = 0; i < 6; i++) {
            if (buf[i] !== FILE_MAGIC.charCodeAt(i)) throw new Error('文件头不匹配，不是本工具生成的 .tben 文件');
          }
          if (buf[6] !== FILE_VERSION) throw new Error('不支持的容器版本：' + buf[6]);
          var iter = new DataView(buf.buffer).getUint32(7, false);
          if (iter < 10000 || iter > 1000000) throw new Error('容器里的 PBKDF2 迭代次数异常');
          var salt = buf.slice(11, 27);
          var iv = buf.slice(27, 39);
          var ct = buf.slice(39);
          var key = await deriveKey(pw, salt, iter);
          var plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
          var name = file.name.replace(/\.tben$/i, '') || 'decrypted.bin';
          TB.download(new Blob([plain], { type: 'application/octet-stream' }), name);
          msg(box, '解密完成：' + file.name + ' → ' + name + ' · ' + TB.fmtBytes(plain.byteLength));
        } catch (e) {
          msg(box, '解密失败：' + (e.message || e.name || '未知错误') + '。密码错误或文件被改动。', true);
        } finally { setBusy(btn, false); }
      });
    }
  });

})();
