/* =============================================================================
 * 国密 SM2 工具
 * -----------------------------------------------------------------------------
 * 使用 sm-crypto 0.5.9 的 sm2 构建（MIT），在浏览器本地完成：
 *   - 密钥对生成、公钥校验、公钥压缩、私钥导出公钥
 *   - SM2 加密 / 解密（C1C3C2 与旧版 C1C2C3）
 *   - SM2 签名 / 验签（SM3 杂凑、UserId、R+S 或 ASN.1 签名）
 *
 * 私钥只在页面内存里处理，刷新即消失，不上传服务器。
 * ========================================================================== */

(function () {
  'use strict';

  var SM2_USER_ID = '1234567812345678';

  /* ------------------------------------------------------------ 公共小工具 */
  function msg(el, text, isErr) {
    if (!el) return;
    el.innerHTML = text
      ? '<div class="note" style="margin-top:12px"><span class="' +
        (isErr ? 'result-err' : '') + '">' + TB.esc(text) + '</span></div>'
      : '';
  }

  function hexToBytes(hex) {
    var h = String(hex || '');
    var out = [];
    for (var i = 0; i < h.length; i += 2) out.push(parseInt(h.substr(i, 2), 16));
    return out;
  }

  function bytesToHex(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return out;
  }

  function hexToB64(hex) {
    var bytes = hexToBytes(hex);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.slice(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function b64ToHex(str) {
    var clean = String(str || '').replace(/\s+/g, '');
    if (!clean) throw new Error('内容为空');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('不是有效的 Base64 内容');
    var bin = atob(clean);
    var bytes = [];
    for (var i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i));
    return bytesToHex(bytes);
  }

  /* 自动识别 Hex / Base64，统一转成小写 Hex */
  function toHexLoose(value) {
    var t = String(value || '').trim().replace(/^0x/i, '').replace(/[\s:]/g, '');
    if (!t) throw new Error('内容为空');
    if (/^(?:[0-9a-fA-F]{2})+$/.test(t)) return t.toLowerCase();
    var h = b64ToHex(t);
    if (!/^(?:[0-9a-f]{2})+$/.test(h)) throw new Error('不是有效的 Hex 或 Base64 内容');
    return h;
  }

  function pubHex(value) {
    var h = toHexLoose(value);
    if (h.length === 128) h = '04' + h;          // 兼容没有 04 前缀的旧数据
    if (h.length !== 130 && h.length !== 66) {
      throw new Error('公钥应为 130 位未压缩 Hex（04 开头）或 66 位压缩 Hex');
    }
    if (!window.sm2) throw new Error('SM2 库没有加载成功，请刷新页面重试');
    if (!window.sm2.verifyPublicKey(h)) throw new Error('公钥不在 SM2 曲线上，或格式不正确');
    return h;
  }

  function privHex(value) {
    var h = toHexLoose(value);
    if (h.length !== 64) throw new Error('私钥应为 64 位 Hex');
    if (/^0{64}$/.test(h)) throw new Error('私钥不能全为 0');
    return h;
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
    btn.disabled = !!busy;
    btn.textContent = busy ? label : btn.getAttribute('data-label');
  }

  function copy(btn, value) {
    if (!value) { TB.toast('还没有内容'); return; }
    TB.copy(value);
  }

  function sm2Ready() {
    if (!window.sm2) throw new Error('SM2 库没有加载成功，请刷新页面重试');
    return window.sm2;
  }

  /* ---------------------------------------------------------------- 工具页 */
  TB.def({
    slug: 'sm2', cat: 'web', name: '国密 SM2 工具', icon: '🔐',
    desc: '密钥生成、加密解密、签名验签',
    kw: 'sm2 国密 商密 密钥 公钥 私钥 加密 解密 签名 验签 sm3 c1c3c2 userId asn1',
    render: function (ctx) {
      var root = ctx.root;
      root.innerHTML =
        '<div class="panel">' +
          '<div class="tabs" id="smTabs">' +
            '<button class="tab on" type="button" data-sm-tab="key">密钥</button>' +
            '<button class="tab" type="button" data-sm-tab="enc">加密解密</button>' +
            '<button class="tab" type="button" data-sm-tab="sig">签名验签</button>' +
          '</div>' +

          /* 密钥 */
          '<div class="rk-pane on" id="smKeyPane">' +
            '<div class="row">' +
              '<div class="field" style="flex:2 1 240px"><div class="label"><b>生成 SM2 密钥对</b><span class="hint">私钥 64 位，公钥 130 / 66 位</span></div>' +
                '<div class="note" style="margin:0">使用浏览器密码学随机源生成，密钥只在当前页面内存中保存。</div></div>' +
              '<div class="field" style="flex:0 0 auto"><div class="label">&nbsp;</div>' +
                '<button class="btn primary" type="button" id="smGenBtn">生成密钥对</button></div>' +
            '</div>' +
            '<div id="smKeyMsg"></div>' +
            '<div id="smKeys" style="display:none;margin-top:14px">' +
              '<div class="field"><div class="label"><b>公钥</b><span class="hint">未压缩 Hex，可公开分发</span></div>' +
                '<textarea class="textarea codeIn key-area" id="smPub" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px"><button class="btn" type="button" id="smPubCopy">复制公钥</button></div></div>' +
              '<div class="field"><div class="label"><b>压缩公钥</b><span class="hint">66 位，部分接口使用</span></div>' +
                '<textarea class="textarea codeIn key-area" id="smPubC" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px"><button class="btn" type="button" id="smPubCCopy">复制压缩公钥</button></div></div>' +
              '<div class="field"><div class="label"><b>私钥</b><span class="hint">64 位 Hex，不要发给别人</span></div>' +
                '<textarea class="textarea codeIn key-area" id="smPriv" readonly></textarea>' +
                '<div class="btns" style="margin-top:8px"><button class="btn" type="button" id="smPrivCopy">复制私钥</button></div></div>' +
            '</div>' +

            '<div class="panel-h" style="margin-top:22px">公钥检查</div>' +
            '<div class="field"><div class="label"><b>公钥</b><span class="hint">支持 Hex / Base64、压缩 / 未压缩</span></div>' +
              '<textarea class="textarea codeIn" id="smCheckPub" style="min-height:86px" placeholder="04... 或 02/03 开头的压缩公钥"></textarea></div>' +
            '<div class="btns">' +
              '<button class="btn" type="button" id="smCheckBtn">验证公钥</button>' +
              '<button class="btn" type="button" id="smCompressBtn">压缩公钥</button>' +
              '<button class="btn" type="button" id="smCompressCopy">复制压缩结果</button>' +
            '</div>' +
            '<div id="smCheckMsg"></div>' +
            '<div class="field" style="margin-top:12px"><div class="label">压缩结果</div>' +
              '<textarea class="textarea codeIn" id="smCompressed" readonly style="min-height:70px"></textarea></div>' +
            '<div class="panel-h" style="margin-top:22px">私钥导出公钥</div>' +
            '<div class="field"><div class="label"><b>私钥</b><span class="hint">64 位 Hex</span></div>' +
              '<textarea class="textarea codeIn" id="smDerivePriv" style="min-height:78px" placeholder="粘贴私钥"></textarea></div>' +
            '<div class="btns"><button class="btn" type="button" id="smDeriveBtn">导出公钥</button>' +
              '<button class="btn" type="button" id="smDeriveCopy">复制结果</button></div>' +
            '<div id="smDeriveMsg"></div>' +
            '<div class="field" style="margin-top:12px"><div class="label">公钥</div>' +
              '<textarea class="textarea codeIn" id="smDerived" readonly style="min-height:70px"></textarea></div>' +
            '<div class="note">SM2 只适合短文本加密。公钥和私钥都只在本地参与运算，不会上传；刷新页面后密钥消失。</div>' +
          '</div>' +

          /* 加密解密 */
          '<div class="rk-pane" id="smEncPane">' +
            '<div class="field"><div class="label"><b>公钥</b><span class="hint">Hex / Base64，130 或 66 位</span></div>' +
              '<textarea class="textarea codeIn" id="smEncPub" style="min-height:78px" placeholder="用于加密的公钥"></textarea></div>' +
            '<div class="field"><div class="label"><b>明文</b><span class="hint">UTF-8 文本</span></div>' +
              '<textarea class="textarea" id="smEncText" style="min-height:100px" placeholder="输入需要加密的文本"></textarea></div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>密文顺序</b></div>' +
                '<select class="select" id="smEncMode">' +
                  '<option value="1">C1C3C2（新版，默认）</option>' +
                  '<option value="0">C1C2C3（旧版）</option>' +
                '</select></div>' +
              '<div class="field"><div class="label"><b>密文输出格式</b></div>' +
                '<select class="select" id="smEncFmt">' +
                  '<option value="hex">Hex</option>' +
                  '<option value="b64">Base64</option>' +
                '</select></div>' +
            '</div>' +
            '<div class="btns">' +
              '<button class="btn primary" type="button" id="smEncBtn">加密</button>' +
              '<button class="btn" type="button" id="smEncClear">清空</button>' +
            '</div>' +
            '<div id="smEncMsg"></div>' +
            '<div class="field" style="margin-top:12px"><div class="label"><b>密文</b><span class="hint">解密时把密文粘贴到这里</span></div>' +
              '<textarea class="textarea codeIn" id="smCipher" style="min-height:100px" placeholder="Hex 或 Base64 密文"></textarea></div>' +
            '<div class="field"><div class="label"><b>私钥</b><span class="hint">64 位 Hex，仅用于解密</span></div>' +
              '<textarea class="textarea codeIn" id="smEncPriv" style="min-height:78px" placeholder="用于解密的私钥"></textarea></div>' +
            '<div class="btns">' +
              '<button class="btn primary" type="button" id="smDecBtn">解密</button>' +
              '<button class="btn" type="button" id="smDecCopy">复制明文</button>' +
            '</div>' +
            '<div id="smDecMsg"></div>' +
            '<div class="field" style="margin-top:12px"><div class="label"><b>解密结果</b></div>' +
              '<textarea class="textarea" id="smPlainOut" readonly style="min-height:100px"></textarea></div>' +
            '<div class="note">sm-crypto 生成的密文不带 04 前缀；解密时会自动补 04。从其他工具拿到的密文如果带 04，可保留，解密失败时会自动尝试去掉前缀。</div>' +
          '</div>' +

          /* 签名验签 */
          '<div class="rk-pane" id="smSigPane">' +
            '<div class="field"><div class="label"><b>待签名 / 待验签文本</b></div>' +
              '<textarea class="textarea" id="smSigText" style="min-height:100px" placeholder="输入原文"></textarea></div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>私钥</b><span class="hint">64 位 Hex</span></div>' +
                '<textarea class="textarea codeIn" id="smSigPriv" style="min-height:78px" placeholder="签名私钥"></textarea></div>' +
              '<div class="field"><div class="label"><b>公钥</b><span class="hint">Hex / Base64，130 或 66 位</span></div>' +
                '<textarea class="textarea codeIn" id="smSigPub" style="min-height:78px" placeholder="验签公钥"></textarea></div>' +
            '</div>' +
            '<div class="row">' +
              '<div class="field"><div class="label"><b>签名格式</b></div>' +
                '<select class="select" id="smSigFmt">' +
                  '<option value="raw">R+S（128 位 Hex）</option>' +
                  '<option value="der">ASN.1 DER</option>' +
                '</select></div>' +
              '<div class="field"><div class="label"><b>UserId</b><span class="hint">默认 1234567812345678</span></div>' +
                '<input class="input" id="smUserId" value="1234567812345678"></div>' +
            '</div>' +
            '<div class="field"><div class="label" style="display:flex;align-items:center;gap:8px">' +
              '<input type="checkbox" id="smHash" checked style="width:auto;margin:0"> <b>先做 SM3 杂凑</b>' +
              '<span class="hint">取消后为纯签名，不计算杂凑</span></div></div>' +
            '<div class="btns">' +
              '<button class="btn primary" type="button" id="smSignBtn">签名</button>' +
              '<button class="btn primary" type="button" id="smVerifyBtn">验签</button>' +
              '<button class="btn" type="button" id="smSigCopy">复制签名</button>' +
            '</div>' +
            '<div id="smSigMsg"></div>' +
            '<div class="field" style="margin-top:12px"><div class="label"><b>签名值</b><span class="hint">签名后自动填入；验签时读取这里</span></div>' +
              '<textarea class="textarea codeIn" id="smSigOut" style="min-height:100px" placeholder="Hex 或 Base64 签名"></textarea></div>' +
            '<div id="smVerifyMsg"></div>' +
            '<div class="note">默认签名会先做 SM3 杂凑并混入 UserId；验签时必须使用相同的 UserId 和签名格式。纯签名适合和已有系统对接，双方参数必须一致。</div>' +
          '</div>' +
        '</div>';

      var msgEl = {
        key: TB.$('#smKeyMsg', root),
        check: TB.$('#smCheckMsg', root),
        derive: TB.$('#smDeriveMsg', root),
        enc: TB.$('#smEncMsg', root),
        dec: TB.$('#smDecMsg', root),
        sig: TB.$('#smSigMsg', root),
        verify: TB.$('#smVerifyMsg', root)
      };

      var el = {
        pub: TB.$('#smPub', root), pubC: TB.$('#smPubC', root), priv: TB.$('#smPriv', root),
        checkPub: TB.$('#smCheckPub', root), compressed: TB.$('#smCompressed', root),
        derivePriv: TB.$('#smDerivePriv', root), derived: TB.$('#smDerived', root),
        encPub: TB.$('#smEncPub', root), encText: TB.$('#smEncText', root),
        encMode: TB.$('#smEncMode', root), encFmt: TB.$('#smEncFmt', root),
        cipher: TB.$('#smCipher', root), encPriv: TB.$('#smEncPriv', root),
        plainOut: TB.$('#smPlainOut', root),
        sigText: TB.$('#smSigText', root), sigPriv: TB.$('#smSigPriv', root),
        sigPub: TB.$('#smSigPub', root), sigFmt: TB.$('#smSigFmt', root),
        userId: TB.$('#smUserId', root), hash: TB.$('#smHash', root),
        sigOut: TB.$('#smSigOut', root)
      };

      /* 标签切换 */
      TB.$('#smTabs', root).addEventListener('click', function (e) {
        var tab = e.target.getAttribute && e.target.getAttribute('data-sm-tab');
        if (!tab) return;
        Array.prototype.forEach.call(root.querySelectorAll('#smTabs .tab'), function (b) {
          b.classList.toggle('on', b.getAttribute('data-sm-tab') === tab);
        });
        ['key', 'enc', 'sig'].forEach(function (k) {
          var pane = TB.$('#sm' + (k === 'key' ? 'Key' : k === 'enc' ? 'Enc' : 'Sig') + 'Pane', root);
          if (pane) pane.classList.toggle('on', k === tab);
        });
      });

      /* 生成密钥 */
      TB.$('#smGenBtn', root).addEventListener('click', function () {
        var btn = this;
        setBusy(btn, true, '生成中…');
        msg(msgEl.key, '');
        setTimeout(function () {
          try {
            var kp = sm2Ready().generateKeyPairHex();
            el.pub.value = kp.publicKey;
            el.pubC.value = sm2Ready().compressPublicKeyHex(kp.publicKey);
            el.priv.value = kp.privateKey;
            TB.$('#smKeys', root).style.display = '';
            msg(msgEl.key, '密钥对已生成。私钥只保存在当前页面内存中。');
          } catch (err) {
            msg(msgEl.key, err.message || '生成失败', true);
          } finally {
            setBusy(btn, false);
          }
        }, 30);
      });

      TB.$('#smPubCopy', root).addEventListener('click', function () { copy(this, el.pub.value); });
      TB.$('#smPubCCopy', root).addEventListener('click', function () { copy(this, el.pubC.value); });
      TB.$('#smPrivCopy', root).addEventListener('click', function () { copy(this, el.priv.value); });

      /* 公钥检查 */
      TB.$('#smCheckBtn', root).addEventListener('click', function () {
        msg(msgEl.check, '');
        try {
          pubHex(el.checkPub.value);
          msg(msgEl.check, '公钥有效，位于 SM2 曲线上。');
        } catch (err) {
          msg(msgEl.check, err.message || '公钥无效', true);
        }
      });

      TB.$('#smCompressBtn', root).addEventListener('click', function () {
        msg(msgEl.check, '');
        try {
          var h = pubHex(el.checkPub.value);
          if (h.length === 66) {
            el.compressed.value = h;
            msg(msgEl.check, '输入已经是压缩公钥。');
          } else {
            el.compressed.value = sm2Ready().compressPublicKeyHex(h);
            msg(msgEl.check, '已压缩为 66 位公钥。');
          }
        } catch (err) {
          el.compressed.value = '';
          msg(msgEl.check, err.message || '压缩失败', true);
        }
      });

      TB.$('#smCompressCopy', root).addEventListener('click', function () { copy(this, el.compressed.value); });

      /* 私钥导出公钥 */
      TB.$('#smDeriveBtn', root).addEventListener('click', function () {
        msg(msgEl.derive, '');
        try {
          el.derived.value = sm2Ready().getPublicKeyFromPrivateKey(privHex(el.derivePriv.value));
          msg(msgEl.derive, '已根据私钥推导出未压缩公钥。');
        } catch (err) {
          el.derived.value = '';
          msg(msgEl.derive, err.message || '导出失败', true);
        }
      });

      TB.$('#smDeriveCopy', root).addEventListener('click', function () { copy(this, el.derived.value); });

      /* 加密 */
      TB.$('#smEncBtn', root).addEventListener('click', function () {
        msg(msgEl.enc, '');
        msg(msgEl.dec, '');
        try {
          var pub = pubHex(el.encPub.value);
          var text = el.encText.value;
          if (!text) throw new Error('请先输入明文');
          var mode = Number(el.encMode.value);
          var cipherHex = sm2Ready().doEncrypt(text, pub, mode);
          el.cipher.value = el.encFmt.value === 'b64' ? hexToB64(cipherHex) : cipherHex;
          el.plainOut.value = '';
          msg(msgEl.enc, '加密完成。密文长度 ' + el.cipher.value.length + ' 个字符。');
        } catch (err) {
          msg(msgEl.enc, err.message || '加密失败', true);
        }
      });

      TB.$('#smEncClear', root).addEventListener('click', function () {
        el.encText.value = '';
        el.cipher.value = '';
        el.plainOut.value = '';
        msg(msgEl.enc, '');
        msg(msgEl.dec, '');
      });

      /* 解密 */
      TB.$('#smDecBtn', root).addEventListener('click', function () {
        msg(msgEl.dec, '');
        try {
          var priv = privHex(el.encPriv.value);
          var raw = String(el.cipher.value || '').trim();
          if (!raw) throw new Error('请先填写密文');
          var cipherHex = toHexLoose(raw);
          var mode = Number(el.encMode.value);
          var out = sm2Ready().doDecrypt(cipherHex, priv, mode);
          if (!out && cipherHex.indexOf('04') === 0 && cipherHex.length > 194) {
            out = sm2Ready().doDecrypt(cipherHex.slice(2), priv, mode);
          }
          if (!out) throw new Error('解密失败：请检查私钥、密文顺序和密文格式是否匹配');
          el.plainOut.value = out;
          msg(msgEl.dec, '解密完成。');
        } catch (err) {
          el.plainOut.value = '';
          msg(msgEl.dec, err.message || '解密失败', true);
        }
      });

      TB.$('#smDecCopy', root).addEventListener('click', function () { copy(this, el.plainOut.value); });

      /* 签名 */
      function signOptions() {
        return {
          der: el.sigFmt.value === 'der',
          hash: !!el.hash.checked,
          userId: el.userId.value.trim() || SM2_USER_ID
        };
      }

      TB.$('#smSignBtn', root).addEventListener('click', function () {
        msg(msgEl.sig, '');
        msg(msgEl.verify, '');
        try {
          var priv = privHex(el.sigPriv.value);
          var text = el.sigText.value;
          if (!text) throw new Error('请先输入待签名文本');
          var opt = signOptions();
          var sigHex = sm2Ready().doSignature(text, priv, opt);
          el.sigOut.value = sigHex;
          msg(msgEl.sig, '签名完成。签名长度 ' + sigHex.length + ' 个字符。');
        } catch (err) {
          msg(msgEl.sig, err.message || '签名失败', true);
        }
      });

      /* 验签 */
      TB.$('#smVerifyBtn', root).addEventListener('click', function () {
        msg(msgEl.verify, '');
        try {
          var pub = pubHex(el.sigPub.value);
          var text = el.sigText.value;
          var sig = String(el.sigOut.value || '').trim();
          if (!text) throw new Error('请先输入待验签文本');
          if (!sig) throw new Error('请先填写签名值');
          var sigHex = toHexLoose(sig);
          var opt = signOptions();
          var ok = sm2Ready().doVerifySignature(text, sigHex, pub, opt);
          if (ok) msg(msgEl.verify, '验签通过。');
          else msg(msgEl.verify, '验签未通过：原文、签名、公钥、UserId 或签名格式不匹配。', true);
        } catch (err) {
          msg(msgEl.verify, err.message || '验签失败', true);
        }
      });

      TB.$('#smSigCopy', root).addEventListener('click', function () { copy(this, el.sigOut.value); });
    }
  });
})();
