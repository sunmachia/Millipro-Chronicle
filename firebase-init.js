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
