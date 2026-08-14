// Firebase 初期化（config 未設定なら何もしない）
var firebaseReady = false

function initFirebase() {
  if (firebaseReady || typeof firebase === 'undefined') return
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.databaseURL) return
  try {
    firebase.initializeApp(FIREBASE_CONFIG)
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
