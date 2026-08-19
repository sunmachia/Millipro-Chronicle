// パスワード再設定機能 回帰テスト
// 実行: node tests/resettest.js
var fs = require('fs')
var path = require('path')
var vm = require('vm')
var root = path.join(__dirname, '..')
var count = 0
function ok(cond, name) {
  count++
  if (cond) { console.log('ok ' + count + ' ' + name) }
  else { console.log('NG ' + count + ' ' + name); process.exit(1) }
}

var initSrc = fs.readFileSync(path.join(root, 'firebase-init.js'), 'utf8')
var jsSrc = fs.readFileSync(path.join(root, 'script.js'), 'utf8')
var htmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8')

// ---- firebase-init.js に milliproResetPassword が定義されている ----
var fnMatch = initSrc.match(/function milliproResetPassword\(email\) \{[\s\S]*?\n\}/)
ok(!!fnMatch, 'milliproResetPassword 定義あり')
ok(initSrc.indexOf('sendPasswordResetEmail') >= 0, 'sendPasswordResetEmail を使用')
ok(initSrc.indexOf('window.location.origin') >= 0, 'リセット後 URL に自サイトのオリジンを使用')

// ---- 挙動: スタブ firebase で送信内容を検証 ----
var sent = null
var ctx = {
  console: console,
  window: { location: { origin: 'https://test.example' } },
  firebase: {
    auth: function () {
      return {
        sendPasswordResetEmail: function (email, opts) { sent = { email: email, opts: opts } },
      }
    },
  },
}
ctx.firebaseReady = true
vm.runInNewContext(initSrc, ctx)
vm.runInContext('firebaseReady = true', ctx)
vm.runInContext('milliproResetPassword("  hoge@example.com  ")', ctx)
ok(sent && sent.email === 'hoge@example.com', 'メールの trim 処理')
ok(sent && sent.opts.url === 'https://test.example/', 'continueUrl=自サイトオリジン')
ok(sent && sent.opts.handleCodeInApp === false, 'handleCodeInApp=false')

// ---- index.html: ダイアログとリンク ----
ok(htmlSrc.indexOf('id="password-reset-dialog"') >= 0, '再設定ダイアログあり')
ok(htmlSrc.indexOf('id="reset-email"') >= 0, 'メール入力欄あり')
ok(htmlSrc.indexOf('id="reset-send-btn"') >= 0, '送信ボタンあり')
ok(htmlSrc.indexOf('id="reset-close-btn"') >= 0, '閉じるボタンあり')
ok(htmlSrc.indexOf('id="login-gate-forgot-btn"') >= 0, 'ゲートに「忘れましたか」リンク')
ok(htmlSrc.indexOf('パスワードをお忘れですか？') >= 0, 'リンク文言あり')

// ---- script.js: 関数と連携画面リンク ----
ok(jsSrc.indexOf('function openPasswordResetDialog') >= 0, 'openPasswordResetDialog あり')
ok(jsSrc.indexOf('function closePasswordResetDialog') >= 0, 'closePasswordResetDialog あり')
ok(jsSrc.indexOf('function submitPasswordReset') >= 0, 'submitPasswordReset あり')
ok(jsSrc.indexOf('function resetPasswordError') >= 0, 'resetPasswordError あり')
ok(jsSrc.indexOf('id="auth-forgot-btn"') >= 0, '連携画面にもリンクあり')
ok(jsSrc.indexOf('milliproResetPassword(email)') >= 0, 'submitPasswordReset が milliproResetPassword を呼ぶ')
ok(jsSrc.indexOf("if (e.key === 'Enter') submitPasswordReset()") >= 0, 'Enter で送信')

// ---- CSS ----
var cssSrc = fs.readFileSync(path.join(root, 'style.css'), 'utf8')
ok(cssSrc.indexOf('.password-reset-dialog') >= 0, 'ダイアログCSSあり')
ok(cssSrc.indexOf('.password-reset-link') >= 0, 'リンクCSSあり')

console.log('ALL PASS (' + count + ')')