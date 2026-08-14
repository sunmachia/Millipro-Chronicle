// Firebase 設定（Milli Unishare / Milli Games との共有バックエンド）
// 設定手順は「連携ハンドオフ.md」§6 を参照。
// Firebase コンソール → プロジェクト設定 → マイアプリ → ウェブアプリ の firebaseConfig を貼り付ける。
// ※apiKey が空の間は連携機能は無効（エラーも出さない）
const firebaseConfig = {
  apiKey: "AIzaSyDRLe4o7AfW6lC6wMPvHuGOTFdiXUFwFBY",
  authDomain: "millipro-shared.firebaseapp.com",
  databaseURL: "https://millipro-shared-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "millipro-shared",
  storageBucket: "millipro-shared.firebasestorage.app",
  messagingSenderId: "253805227800",
  appId: "1:253805227800:web:2dec947f613b49ae6fb86d"
};

