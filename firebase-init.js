// Firebase 初期化（config 未設定なら何もしない）
// config 変数名は Firebase コンソール貼り付け時の firebaseConfig と、
// ハンドオフ資料記載の FIREBASE_CONFIG のどちらでも受け付ける
var firebaseReady = false

function getFirebaseConfig() {
  if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG) return FIREBASE_CONFIG
  if (typeof firebaseConfig !== 'undefined' && firebaseConfig) return firebaseConfig
  return null
}

function initFirebase() {
  if (firebaseReady || typeof firebase === 'undefined') return
  var cfg = getFirebaseConfig()
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) return
  try {
    firebase.initializeApp(cfg)
    firebaseReady = true
  } catch (e) {
    console.warn('Firebase init failed:', e)
  }
}

// 連携が利用可能か（config 設定済み + SDK 読込済み）
function firebaseAvailable() {
  initFirebase()
  return firebaseReady
}

// 本アプリが発行した playerId を取得（milli-unishare / milli-games と共通形式）
function getMilliproPlayerId() {
  try {
    var ud = JSON.parse(localStorage.getItem('millipro_userdata'))
    return ud && ud.playerId ? ud.playerId : null
  } catch (e) {
    return null
  }
}

// 連携IDを手動設定（ログイン不要の「ID持ち込み方式」用。各サイトの入力UIから呼ぶ）
function setMilliproPlayerId(id) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  if (!ud || typeof ud !== 'object') ud = { createdAt: Date.now() }
  ud.playerId = String(id)
  ud.updatedAt = Date.now()
  localStorage.setItem('millipro_userdata', JSON.stringify(ud))
  return ud
}

// ============================================================
// 共通アカウント（Firebase Auth）: 3サイトすべてが同じユーザーを使う
// データパス: millipro/users/{uid}/profile = { playerId, playerName, icon, comment, updatedAt }
//            millipro/users/{uid}/gamedata = ゲームデータ（本アプリのみ同期）
// 名前・アイコン・一言は各サイト共通で表示できる（各サイトのローカルに反映）
// ============================================================

// 全サイト共通のタレントID一覧（最推し/推しの共有に使う。IDは本アプリの TALENTS と同一）
var MILLIPRO_TALENTS = {
  konomi: { name: '甘狼このみ' },
  nono: { name: '音ノ乃のの' },
  akubi: { name: 'あくび・でもんすぺーど' },
  rako: { name: '音ノ瀬らこ' },
  yura: { name: 'ゆらぎゆら' },
  koma: { name: '小廻こま' },
  rizu: { name: '雨夜リズ' },
  tukuri: { name: '眠雲ツクリ' },
  nuhu: { name: '虹深°ぬふ' },
  rei: { name: '夕霧レイ' },
}

// 最推し/推しをローカル（millipro_userdata）から取得
// ログイン後は applyMilliproProfile でクラウドの値が反映済み
// 戻り値: { ultimateOshi: string|null, favorites: string[] }
function getMilliproOshi() {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  var ultimate = ud && MILLIPRO_TALENTS[ud.ultimateOshi] ? ud.ultimateOshi : null
  var favs = (ud && Array.isArray(ud.favorites)) ? ud.favorites.filter(function (id) { return MILLIPRO_TALENTS[id] }).slice(0, 10) : []
  return { ultimateOshi: ultimate, favorites: favs }
}

// 最推し/推しをローカル + クラウド（ログイン中のみ）に保存
// クラウドの profile.ultimateOshi / profile.favorites は全サイト共通
// 戻り値: Promise<boolean>（クラウドに保存できたか。未ログインでもローカル保存は行う）
function updateMilliproOshi(ultimateOshi, favorites) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  if (!ud || typeof ud !== 'object') ud = { createdAt: Date.now() }
  var ult = ultimateOshi && MILLIPRO_TALENTS[ultimateOshi] ? ultimateOshi : null
  var favs = (Array.isArray(favorites) ? favorites : []).filter(function (id) { return MILLIPRO_TALENTS[id] }).slice(0, 10)
  ud.ultimateOshi = ult
  ud.favorites = favs
  ud.updatedAt = Date.now()
  localStorage.setItem('millipro_userdata', JSON.stringify(ud))
  var uid = getMilliproUid()
  if (!uid) return Promise.resolve(false)
  return updateMilliproProfile({ ultimateOshi: ult, favorites: favs })
}

function isAuthAvailable() {
  return firebaseAvailable() && typeof firebase.auth === 'function'
}

function getMilliproUid() {
  if (!isAuthAvailable()) return null
  var u = firebase.auth().currentUser
  return u ? u.uid : null
}

// ログイン状態の変化を監視（未ログイン/未設定なら null を渡す）
function onMilliproAuth(cb) {
  if (!isAuthAvailable()) {
    cb(null)
    return
  }
  firebase.auth().onAuthStateChanged(function (user) {
    cb(user ? user.uid : null)
  })
}

function milliproLogin(email, password) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  return firebase.auth().signInWithEmailAndPassword(email, password)
}

function milliproSignup(email, password) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  return firebase.auth().createUserWithEmailAndPassword(email, password)
}

function milliproLogout() {
  if (!isAuthAvailable()) return Promise.resolve()
  return firebase.auth().signOut()
}

// パスワード再設定メールを送信（どのサイトからでも共通アカウントに対して送れる）
// リセット後に戻る URL は呼び出し元サイトのオリジンを指定する（他のサイトでも同じ関数を使う）
function milliproResetPassword(email) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  return firebase.auth().sendPasswordResetEmail(String(email).trim(), {
    url: (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin + '/' : '',
    handleCodeInApp: false,
  })
}

function newPlayerIdFallback() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'P' + Date.now()
}

// プロフィールを保証する（無ければローカルの playerId / 名前 / アイコン / 一言で作成）
// 既存プロフィールに欠けている項目はローカル値で補充する
// 戻り値: Promise<profile>
function ensureMilliproProfile(uid) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  var localId = ud && ud.playerId
  var localName = ud && ud.playerName
  var localIcon = ud && ud.icon
  var localComment = ud && ud.comment
  var localUltimateOshi = ud && MILLIPRO_TALENTS[ud.ultimateOshi] ? ud.ultimateOshi : null
  var localFavorites = (ud && Array.isArray(ud.favorites)) ? ud.favorites.filter(function (id) { return MILLIPRO_TALENTS[id] }).slice(0, 10) : []

  return firebase.database().ref('millipro/users/' + uid + '/profile').once('value').then(function (snap) {
    var p = snap.val()
    var now = Date.now()
    if (p && typeof p === 'object') {
      var changed = false
      if (!p.playerId) { p.playerId = localId || newPlayerIdFallback(); changed = true }
      if (!p.playerName && localName) { p.playerName = localName; changed = true }
      if (!p.icon && localIcon) { p.icon = localIcon; changed = true }
      if (!p.comment && localComment) { p.comment = localComment; changed = true }
      if (!p.ultimateOshi && localUltimateOshi) { p.ultimateOshi = localUltimateOshi; changed = true }
      if (!p.favorites && localFavorites.length) { p.favorites = localFavorites; changed = true }
      if (changed) firebase.database().ref('millipro/users/' + uid + '/profile').set(p)
      return p
    }
    var np = {
      playerId: localId || newPlayerIdFallback(),
      playerName: localName || '',
      icon: localIcon || '',
      comment: localComment || '',
      ultimateOshi: localUltimateOshi,
      favorites: localFavorites,
      updatedAt: now,
    }
    firebase.database().ref('millipro/users/' + uid + '/profile').set(np)
    return np
  })
}

// プロフィールの playerId / playerName / icon / comment をこの端末の localStorage に反映（他項目は保持）
// 戻り値: 反映後のユーザーデータ（なければ新規作成）
function applyMilliproProfile(profile) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  if (!ud || typeof ud !== 'object') ud = { createdAt: Date.now() }
  ud.playerId = profile.playerId
  if (profile.playerName) ud.playerName = profile.playerName
  if (profile.icon) ud.icon = profile.icon
  if (profile.comment) ud.comment = profile.comment
  if (profile.ultimateOshi && MILLIPRO_TALENTS[profile.ultimateOshi]) ud.ultimateOshi = profile.ultimateOshi
  if (Array.isArray(profile.favorites)) {
    ud.favorites = profile.favorites.filter(function (id) { return MILLIPRO_TALENTS[id] }).slice(0, 10)
  }
  ud.updatedAt = Date.now()
  localStorage.setItem('millipro_userdata', JSON.stringify(ud))
  return ud
}

// プロフィールの一部をクラウドに保存（ログイン中のみ。未ログインなら何もしない）
// patch 例: { icon: '😊' } や { playerName: '...', comment: '...' }
// 戻り値: Promise<boolean>（保存できたか）
function updateMilliproProfile(patch) {
  if (!isAuthAvailable()) return Promise.resolve(false)
  var uid = getMilliproUid()
  if (!uid) return Promise.resolve(false)
  if (!patch || typeof patch !== 'object') return Promise.resolve(false)
  patch.updatedAt = Date.now()
  var ref = firebase.database().ref('millipro/users/' + uid + '/profile')
  return ref.once('value').then(function (snap) {
    var p = snap.val()
    if (p && typeof p === 'object') return ref.update(patch)
    return ref.set(patch)
  }).then(function () { return true }).catch(function (e) {
    console.warn('profile update failed:', e)
    return false
  })
}

// クラウドとゲームデータを同期（新しい方を採用。クラウドが無ければローカルをアップロード）
// 戻り値: Promise<'pulled' | 'pushed' | 'none'>
function syncMilliproGameData(uid) {
  var ref = firebase.database().ref('millipro/users/' + uid + '/gamedata')
  return ref.once('value').then(function (snap) {
    var cloud = snap.val()
    var local = loadGameData()
    if (cloud && typeof cloud === 'object' && cloud.updatedAt > local.updatedAt) {
      // クラウドが新しい → ローカルに反映
      localStorage.setItem('millipro_gamedata', JSON.stringify(migrateGameData(cloud)))
      return 'pulled'
    }
    // ローカルが新しい or クラウドが無い → アップロード
    ref.set(local)
    return cloud ? 'pushed' : 'pushed'
  }).catch(function (e) {
    console.warn('gamedata sync failed:', e)
    return 'none'
  })
}

// ログイン時にまとめて実行: プロフィール保証 → playerId を端末へ反映 → ゲームデータ同期
// 戻り値: Promise<{ profile, syncMode }>
function completeMilliproLogin(uid) {
  return ensureMilliproProfile(uid).then(function (profile) {
    applyMilliproProfile(profile)
    return syncMilliproGameData(uid).then(function (mode) {
      return { profile: profile, syncMode: mode }
    })
  })
}
