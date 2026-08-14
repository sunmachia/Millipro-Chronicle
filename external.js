// ============================================================
// 外部連携（Milli Unishare / Milli Games）の報酬同期
// 設計: 「連携ハンドオフ.md」参照
//   - イベント記録: watchEvents / gameEvents（各サイトが書き込み）
//   - 報酬付与: 本アプリのみ。受取済みマーカーを rewards/ に書き二重付与を防止
// ============================================================

// 報酬テーブル（企画書 §18・§17）: 動画視聴 15通貨/8EXP/応援力5、ミニゲーム 10通貨/5EXP
const EXTERNAL_REWARD = {
  video: { currency: 15, exp: 8, cheer: 5 },
  game: { currency: 10, exp: 5, cheer: 0 },
}

// 同一ミニゲームは1時間に1回だけ報酬
const GAME_CLAIM_WINDOW_MS = 60 * 60 * 1000

// 受取済みマーカーを transaction で書き、二重付与を防ぐ
// メモ: RTDB の transaction は更新関数が undefined を返すと中断される。
// 同じ参照を返す場合は中断されず committed になるため、必ず undefined で中断する
// 付与成功時、deletePath があればイベントノードを削除（無料枠のストレージ消費を防ぐ）。
// rewards/ マーカーは別デバイスからの二重付与防止のため残す
// 戻り値: Promise<boolean>（付与できたか）
function claimMarkerOnce(path, onGranted, deletePath) {
  return new Promise(function (resolve) {
    var ref = firebase.database().ref(path)
    ref.transaction(function (current) {
      if (current) return undefined // 既に受取済み → 中断
      return { grantedAt: Date.now() }
    }, function (err, committed) {
      if (err) {
        console.warn('claim transaction failed:', path, err)
        resolve(false)
        return
      }
      if (committed) {
        if (deletePath) {
          firebase.database().ref(deletePath).remove().catch(function (e) {
            console.warn('consumed event delete failed:', deletePath, e)
          })
        }
        onGranted()
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}

// 動画視聴報酬（1動画1日1回: watchEvents/{videoId}/{date} 単位）
function syncVideoRewards(gd, pid, db, result) {
  return new Promise(function (resolve) {
    db.ref('millipro/watchEvents/' + pid).once('value').then(function (snap) {
      var vids = snap.val() || {}
      var keys = []
      Object.keys(vids).forEach(function (videoId) {
        var dates = vids[videoId] || {}
        Object.keys(dates).forEach(function (date) {
          keys.push({ videoId: videoId, date: date })
        })
      })
      var chain = Promise.resolve()
      keys.forEach(function (k) {
        chain = chain.then(function () {
          return claimMarkerOnce('millipro/rewards/' + pid + '/watch/' + k.videoId + '/' + k.date, function () {
            var r = EXTERNAL_REWARD.video
            result.videoCount++
            result.currency += r.currency
            result.exp += r.exp
            result.cheer += r.cheer
          }, 'millipro/watchEvents/' + pid + '/' + k.videoId + '/' + k.date)
        })
      })
      return chain.then(function () { resolve() })
    }).catch(function (e) {
      console.warn('watchEvents read failed:', e)
      result.error = true
      resolve()
    })
  })
}

// ミニゲーム報酬（同一ゲーム1時間1回: gameEvents/{gameId}/{timestamp} 単位）
function syncGameRewards(gd, pid, db, result) {
  return new Promise(function (resolve) {
    db.ref('millipro/gameEvents/' + pid).once('value').then(function (snap) {
      var games = snap.val() || {}
      if (!gd.externalRewards.gameLastClaimed) gd.externalRewards.gameLastClaimed = {}
      // 同一バッチ内のウィンドウ判定を同期で行うためのローカル記録（onGranted は非同期のため）
      var lastByGame = {}
      var chain = Promise.resolve()
      Object.keys(games).forEach(function (gameId) {
        var events = games[gameId] || {}
        lastByGame[gameId] = gd.externalRewards.gameLastClaimed[gameId] || 0
        Object.keys(events).forEach(function (ts) {
          var ev = events[ts] || {}
          var playedAt = ev.playedAt || parseInt(ts, 10) || Date.now()
          chain = chain.then(function () {
            // 直前の受取（同一バッチ内の付与含む）から1時間以内ならスキップ
            if (playedAt - lastByGame[gameId] < GAME_CLAIM_WINDOW_MS) return
            return claimMarkerOnce('millipro/rewards/' + pid + '/games/' + gameId + '/' + ts, function () {
              var r = EXTERNAL_REWARD.game
              lastByGame[gameId] = Math.max(lastByGame[gameId], playedAt)
              gd.externalRewards.gameLastClaimed[gameId] = lastByGame[gameId]
              result.gameCount++
              result.currency += r.currency
              result.exp += r.exp
            }, 'millipro/gameEvents/' + pid + '/' + gameId + '/' + ts)
          })
        })
      })
      return chain.then(function () { resolve() })
    }).catch(function (e) {
      console.warn('gameEvents read failed:', e)
      result.error = true
      resolve()
    })
  })
}

// 外部報酬を同期して付与する
// 戻り値: Promise<result>（result.available=false なら未設定）
// 注意: 並行呼び出しは直列化する（read-modify-write 競合で報酬が消えるのを防ぐ）
var externalSyncQueue = Promise.resolve()

function syncExternalRewards() {
  var run = externalSyncQueue.then(function () {
    return runExternalSync()
  })
  // 失敗してもキューを詰まらせない
  run.catch(function (e) { console.warn('external sync failed:', e) })
  externalSyncQueue = run.catch(function () {})
  return run
}

function runExternalSync() {
  return new Promise(function (resolve) {
    var result = { available: true, noPlayerId: false, videoCount: 0, gameCount: 0, currency: 0, exp: 0, cheer: 0 }
    if (!firebaseAvailable()) {
      result.available = false
      resolve(result)
      return
    }
    var pid = getMilliproPlayerId()
    if (!pid) {
      result.noPlayerId = true
      resolve(result)
      return
    }
    var gd = loadGameData()
    if (!gd.externalRewards) gd.externalRewards = defaultGameData().externalRewards
    var db = firebase.database()
    syncVideoRewards(gd, pid, db, result)
      .then(function () { return syncGameRewards(gd, pid, db, result) })
      .then(function () {
        if (result.videoCount > 0 || result.gameCount > 0) {
          gd.currency += result.currency
          var lv = addExp(gd, result.exp)
          gd.points.cheer += result.cheer
          result.leveledUp = lv.leveledUp
          result.newLevel = lv.newLevel
          // クエスト進行（動画視聴）
          if (result.videoCount > 0) questAddProgress(gd, 'videosWatched', result.videoCount)
          saveGameData(gd)
          refreshPlayerStatus()
        }
        resolve(result)
      })
  })
}
