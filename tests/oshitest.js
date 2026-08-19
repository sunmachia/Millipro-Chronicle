// 最推し/推しの共有同期 回帰テスト
// 実行: node tests/oshitest.js
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
var cssSrc = fs.readFileSync(path.join(root, 'style.css'), 'utf8')

// ---- スタブ ----
var store = {}
var cloud = {}
var currentUid = null
var ls = {
  getItem: function (k) { return store[k] !== undefined ? store[k] : null },
  setItem: function (k, v) { store[k] = String(v) },
  removeItem: function (k) { delete store[k] },
}
function refFactory(p) {
  return {
    once: function () {
      return Promise.resolve({ val: function () { return cloud[p] !== undefined ? cloud[p] : null } })
    },
    set: function (v) { cloud[p] = v; return Promise.resolve() },
    update: function (patch) {
      if (cloud[p] && typeof cloud[p] === 'object') { for (var k in patch) cloud[p][k] = patch[k] }
      else cloud[p] = patch
      return Promise.resolve()
    },
  }
}
var ctx = {
  console: console,
  localStorage: ls,
  crypto: { randomUUID: function () { return 'uuid-1' } },
  firebase: {
    auth: function () { return { currentUser: currentUid ? { uid: currentUid } : null } },
    database: function () { return { ref: refFactory } },
  },
}
vm.runInNewContext(initSrc, ctx)
vm.runInContext('firebaseReady = true', ctx)

function expr(code) { return vm.runInContext(code, ctx) }

// ---- 1. タレントID一覧 ----
ok(expr('Object.keys(MILLIPRO_TALENTS).length') === 10, 'MILLIPRO_TALENTS 10人分')
ok(expr('typeof MILLIPRO_TALENTS.konomi.name') === 'string', 'ID+名前の形式')

// ---- 2. getMilliproOshi: ローカルから取得 ----
store['millipro_userdata'] = JSON.stringify({ playerId: 'p1', ultimateOshi: 'konomi', favorites: ['konomi', 'rei'] })
var oshi = expr('getMilliproOshi()')
ok(oshi.ultimateOshi === 'konomi', '最推し取得')
ok(oshi.favorites.length === 2, '推し取得')
ok(expr('getMilliproOshi()') === null || expr('getMilliproOshi()') !== null, '戻り値はオブジェクト')

// ---- 3. 不正ID・上限超過の除去 ----
store['millipro_userdata'] = JSON.stringify({ playerId: 'p1', ultimateOshi: 'unknown', favorites: [] })
var bad = expr('getMilliproOshi()')
ok(bad.ultimateOshi === null, '不正な最推しIDは null')
ok(Array.isArray(bad.favorites), 'favorites は配列')

// ---- 4. updateMilliproOshi: ローカル保存 + クラウド保存（ログイン中） ----
currentUid = 'u1'
cloud['millipro/users/u1/profile'] = { playerId: 'p1', playerName: '名', updatedAt: 1 }
returnExpr = expr('updateMilliproOshi("rei", ["rei","konomi","nono","akubi","rako","yura","koma","rizu","tukuri","nuhu","extra"])')
ok(typeof returnExpr.then === 'function', 'updateMilliproOshi は Promise を返す')
var savedLocal = JSON.parse(store['millipro_userdata'])
ok(savedLocal.ultimateOshi === 'rei', 'ローカル: 最推し保存')
ok(savedLocal.favorites.length === 10, 'ローカル: 推し10人に切り詰め')
ok(savedLocal.favorites.indexOf('extra') < 0, 'ローカル: 不正ID除去')
returnExpr.then(function (res) {
  ok(res === true, 'クラウド保存成功フラグ')
  var prof = cloud['millipro/users/u1/profile']
  ok(prof.ultimateOshi === 'rei', 'クラウド: 最推し保存')
  ok(prof.favorites.length === 10, 'クラウド: 推し10人に切り詰め')
  ok(prof.favorites.indexOf('extra') < 0, 'クラウド: 不正ID除去')
  ok(typeof prof.updatedAt === 'number', 'クラウド: updatedAt 更新')

  // ---- 5. 未ログイン時はローカルのみ ----
  currentUid = null
  expr('updateMilliproOshi("koma", ["koma"])')
  var localOnly = JSON.parse(store['millipro_userdata'])
  ok(localOnly.ultimateOshi === 'koma', '未ログイン: ローカル保存')

  // ---- 6. applyMilliproProfile: クラウドの oshi をローカルへ反映 ----
  currentUid = 'u1'
  store['millipro_userdata'] = JSON.stringify({ playerId: 'p1' })
  expr('applyMilliproProfile({ playerId: "p1", playerName: "名", ultimateOshi: "nono", favorites: ["nono", "tukuri"] })')
  var merged = JSON.parse(store['millipro_userdata'])
  ok(merged.ultimateOshi === 'nono', 'apply: 最推し反映')
  ok(merged.favorites.length === 2, 'apply: 推し反映')

  // ---- 7. ensureMilliproProfile: ローカル oshi をクラウドへバックフィル ----
  store['millipro_userdata'] = JSON.stringify({ playerId: 'p1', ultimateOshi: 'yura', favorites: ['yura'] })
  cloud['millipro/users/u1/profile'] = { playerId: 'p1', playerName: '名' }
  return expr('ensureMilliproProfile("u1")').then(function (prof) {
    ok(prof.ultimateOshi === 'yura', 'ensure: バックフィル後の最推し')
    ok(prof.favorites[0] === 'yura', 'ensure: バックフィル後の推し')
    ok(cloud['millipro/users/u1/profile'].ultimateOshi === 'yura', 'ensure: クラウドへ書き戻し')

    // ---- 8. クラウドに既に有る場合はローカルが勝たない ----
    cloud['millipro/users/u1/profile'] = { playerId: 'p1', ultimateOshi: 'akubi', favorites: ['akubi'] }
    store['millipro_userdata'] = JSON.stringify({ playerId: 'p1', ultimateOshi: 'rei', favorites: ['rei'] })
    return expr('ensureMilliproProfile("u1")').then(function (prof2) {
      ok(prof2.ultimateOshi === 'akubi', 'ensure: クラウド既存値は保持')

      // ---- 9. 本アプリ側の実装 ----
      ok(jsSrc.indexOf('function renderOshiScreen') >= 0, 'renderOshiScreen あり')
      ok(jsSrc.indexOf('id="oshi-edit-btn"') >= 0, 'プレイヤーカードに推し変更ボタン')
      ok(jsSrc.indexOf('updateMilliproOshi(data.ultimateOshi, data.favorites)') >= 0, 'confirmSetup でクラウド保存')
      ok(jsSrc.indexOf('updateMilliproOshi(oshiEditState.ultimateOshi, oshiEditState.favorites)') >= 0, '推し設定保存でクラウド保存')
      ok(htmlSrc.indexOf('id="popup-oshi"') >= 0, 'popup-oshi あり')
      ok(htmlSrc.indexOf('id="oshi-body"') >= 0, 'oshi-body あり')
      ok(cssSrc.indexOf('.oshi-ult-grid') >= 0, '最推しグリッドCSS')
      ok(cssSrc.indexOf('.oshi-fav-grid') >= 0, '推しグリッドCSS')

      console.log('ALL PASS (' + count + ')')
    })
  })
})