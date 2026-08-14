// Firebase 設定（Milli Unishare / Milli Games との共有バックエンド）
// 設定手順は「連携ハンドオフ.md」§6 を参照。
// Firebase コンソール → プロジェクト設定 → マイアプリ → ウェブアプリ の firebaseConfig を貼り付ける。
// ※apiKey が空の間は連携機能は無効（エラーも出さない）
const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}
