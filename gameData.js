// ============================================================
// Milipro Chronicle - ゲームデータ基盤（セーブスキーマ）
// 方針: LocalStorage で先行実装し、構造確定後に Firebase へ移行
// 参照: 企画書.md Ver.0.4
// ============================================================

const GAME_DATA_KEY = 'millipro_gamedata'
const GAME_DATA_VERSION = 4

// ---- 定数・バランステーブル（企画書 Ver.0.4 初期案）----

// 5種ポイント（§17）
const POINT_KEYS = ['cheer', 'knowledge', 'create', 'music', 'popularity']

const POINT_NAMES = {
  cheer: '応援力',
  knowledge: '知識',
  create: '創作力',
  music: '音楽力',
  popularity: '人気',
}

const POINT_EMOJI = {
  cheer: '📣',
  knowledge: '📚',
  create: '🎨',
  music: '🎵',
  popularity: '⭐',
}

// ジョブ定義（§20）: point = ジョブLv育成に必要なポイント種
const JOB_DEFS = {
  illustrator: { name: 'イラストレーター', point: 'create', emoji: '🎨' },
  mix: { name: 'MIX師', point: 'music', emoji: '🎵' },
  editor: { name: '動画編集者', point: 'create', emoji: '📹' },
  staff: { name: 'スタッフ', point: 'cheer', emoji: '🛠️' },
  itabag: { name: '痛バ職人', point: 'cheer', emoji: '🧵' },
  cheerleader: { name: '応援隊長', point: 'cheer', emoji: '📣' },
  reporter: { name: 'レポーター', point: 'knowledge', emoji: '✍️' },
  fansite: { name: 'ファンサイト管理人', point: 'knowledge', emoji: '🌐' },
}

// 事務所段階（§10）: cost = 必要応援力
const OFFICE_STAGES = [
  { stage: 1, name: '小規模事務所', cost: 0, unlocks: ['streamRoom'] },
  { stage: 2, name: '拡張オフィス', cost: 5000, unlocks: ['recordBooth'] },
  { stage: 3, name: '中規模事務所', cost: 20000, unlocks: ['meetingRoom'] },
  { stage: 4, name: 'スタジオ', cost: 60000, unlocks: ['archiveRoom'] },
  { stage: 5, name: 'イベントホール', cost: 150000, unlocks: ['eventHall'] },
  { stage: 6, name: '大型施設', cost: 500000, unlocks: ['dreamFacility'] },
]

const OFFICE_FACILITY_NAMES = {
  streamRoom: '配信室',
  recordBooth: '録音ブース',
  meetingRoom: '会議室',
  archiveRoom: '資料室',
  eventHall: 'イベントホール',
  dreamFacility: '大型施設',
}

// EXPテーブル（§19）: Lv帯ごとに1レベル上げるのに必要なEXP
function expRequiredForLevel(level) {
  if (level >= 40) return 600
  if (level >= 30) return 400
  if (level >= 20) return 250
  if (level >= 10) return 150
  return 100
}

// 配信ダンジョン報酬（§16）: ボスランク別
// 2026-08-14 バランス調整: 低Lv帯のレベル上げが遅すぎたため全報酬を強化
const DUNGEON_REWARDS = {
  1: { currency: 50, exp: 50, cheer: 25 },
  2: { currency: 120, exp: 100, cheer: 50 },
  3: { currency: 250, exp: 180, cheer: 100 },
  4: { currency: 400, exp: 300, cheer: 180 },
  5: { currency: 650, exp: 480, cheer: 300 },
}

// 配信ダンジョンのボス（§16: タレントではなく"トラブル"）
// 数値: 推奨Lvでは安定勝利できるが、1つ下のレベルではかなり苦戦する設計
const DUNGEON_BOSSES = [
  { rank: 1, id: 'slime', name: '寝坊スライムキング', emoji: '🫠', hp: 190, atk: 11, def: 2, reqLevel: 1, desc: '配信開始時間に寝坊するお馴染みのトラブル' },
  { rank: 2, id: 'golem', name: '回線ゴーレム', emoji: '🪨', hp: 380, atk: 22, def: 8, reqLevel: 10, desc: '重い！繋がらない！回線トラブルの化身' },
  { rank: 3, id: 'dragon', name: '締切ドラゴン', emoji: '🐉', hp: 610, atk: 35, def: 14, reqLevel: 20, desc: '何かと襲いかかる締切の大暴君' },
  { rank: 4, id: 'bug', name: 'バグの魔王', emoji: '👾', hp: 860, atk: 47, def: 18, reqLevel: 30, desc: 'ゲーム配信中に現れる最凶の不具合' },
  { rank: 5, id: 'crash', name: 'システムクラッシュ', emoji: '💥', hp: 1090, atk: 59, def: 24, reqLevel: 40, desc: 'あらゆるトラブルの頂点に立つ存在' },
]

// ダンジョン挑戦頻度制限（§16: 1時間に5回まで）
// 1時間窓の挑戦回数上限（2026-08-14: 5回→8回に緩和）
const DUNGEON_LIMIT = 8
const DUNGEON_LIMIT_WINDOW_MS = 60 * 60 * 1000

// ショップ品目（§18）
const SHOP_GOODS = [
  { id: 'badgeParts', name: '痛バ用バッジパーツ', price: 50 },
  { id: 'canBadge', name: '缶バッジ', price: 100 },
  { id: 'acrylicKeychain', name: 'アクキー', price: 200 },
  { id: 'acrylicStand', name: 'アクスタ', price: 300 },
  { id: 'itabagBody', name: '痛バッグ本体', price: 300 },
  { id: 'poster', name: 'ポスター', price: 250 },
  { id: 'tapestry', name: 'タペストリー', price: 500 },
  { id: 'shelf', name: '部屋家具（棚）', price: 400 },
]

// ---- セーブデータ ----

function defaultGameData() {
  var jobs = {}
  Object.keys(JOB_DEFS).forEach(function (id) {
    jobs[id] = { level: 1, unlocked: false }
  })

  var facilities = {}
  Object.keys(OFFICE_FACILITY_NAMES).forEach(function (id) {
    facilities[id] = id === 'streamRoom' // 初期解放は配信室のみ
  })

  return {
    version: GAME_DATA_VERSION,
    currency: 0,
    level: 1,
    exp: 0,
    points: { cheer: 0, knowledge: 0, create: 0, music: 0, popularity: 0 },
    jobs: jobs,
    office: { stage: 1, facilities: facilities },
    collection: { goods: {}, artworks: [], itabags: [] },
    gallery: { artworks: [] },
    zukan: { quotes: {}, streams: {}, trivia: {}, history: {}, memoryCards: {} },
    garden: { areas: {} },
    dungeon: { attempts: [] },
    quests: { daily: { date: null, done: [], claimed: [], progress: {} }, weekly: { week: null, done: [], claimed: [], progress: {} } },
    memoryShards: [],
    stats: { videosWatched: 0, dungeonClears: 0, artworksSold: 0, galleryReactions: 0 },
    externalRewards: { gameLastClaimed: {} },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function loadGameData() {
  try {
    var raw = localStorage.getItem(GAME_DATA_KEY)
    return raw ? migrateGameData(JSON.parse(raw)) : defaultGameData()
  } catch (e) {
    return defaultGameData()
  }
}

function migrateGameData(data) {
  if (!data || typeof data !== 'object') return defaultGameData()
  var base = defaultGameData()
  Object.keys(base).forEach(function (k) {
    if (data[k] !== undefined) base[k] = data[k]
  })
  // quests のネスト構造を新スキーマに統合（progress / claimed 追加）
  if (data.quests && typeof data.quests === 'object') {
    if (!base.quests) base.quests = defaultGameData().quests
    ;['daily', 'weekly'].forEach(function (kind) {
      var old = data.quests[kind]
      var cur = base.quests[kind]
      if (old && typeof old === 'object') {
        if (old.date !== undefined) cur.date = old.date
        if (old.week !== undefined) cur.week = old.week
        if (Array.isArray(old.done)) cur.done = old.done
        if (Array.isArray(old.claimed)) cur.claimed = old.claimed
      }
    })
  }
  // externalRewards のネスト統合（ゲームの受取履歴を維持）
  if (data.externalRewards && typeof data.externalRewards === 'object') {
    if (!base.externalRewards) base.externalRewards = defaultGameData().externalRewards
    if (data.externalRewards.gameLastClaimed) base.externalRewards.gameLastClaimed = data.externalRewards.gameLastClaimed
  }
  base.version = GAME_DATA_VERSION
  return base
}

function saveGameData(data) {
  data.updatedAt = Date.now()
  localStorage.setItem(GAME_DATA_KEY, JSON.stringify(data))
}

// ゲームデータが無ければ作成し、現状データを返す
function ensureGameData() {
  if (!localStorage.getItem(GAME_DATA_KEY)) {
    saveGameData(defaultGameData())
  }
  return loadGameData()
}

// ---- レベル計算（§19）----

function expNeededToNext(level) {
  if (level >= 50) return 0
  return expRequiredForLevel(level)
}

// EXP加算 + レベルアップ処理。戻り値: { leveledUp, newLevel }
function addExp(data, amount) {
  data.exp += amount
  var leveledUp = false
  while (data.level < 50 && data.exp >= expNeededToNext(data.level)) {
    data.exp -= expNeededToNext(data.level)
    data.level++
    leveledUp = true
  }
  if (data.level >= 50) data.exp = 0
  return { leveledUp: leveledUp, newLevel: data.level }
}

// ジョブ解放判定（§19）: 基本Lv5以上 + 必要ポイント一定以上
function canUnlockJob(data, jobId) {
  var job = data.jobs[jobId]
  if (!job || job.unlocked) return false
  if (data.level < 5) return false
  var def = JOB_DEFS[jobId]
  return data.points[def.point] >= 10 // 解放目安（実装時に調整）
}

// ---- 配信ダンジョン（§16）----

// 残り挑戦回数（1時間窓で最大 DUNGEON_LIMIT 回）
function remainingDungeonTries(data) {
  var now = Date.now()
  var attempts = (data.dungeon && data.dungeon.attempts || []).filter(function (t) {
    return now - t < DUNGEON_LIMIT_WINDOW_MS
  })
  data.dungeon.attempts = attempts
  return Math.max(0, DUNGEON_LIMIT - attempts.length)
}

function recordDungeonTry(data) {
  if (!data.dungeon) data.dungeon = { attempts: [] }
  data.dungeon.attempts.push(Date.now())
}

// 挑戦タレントのステータス（プレイヤーレベル基準）
function talentBattleStats(level) {
  return {
    maxHp: 90 + level * 12,
    atk: 12 + level * 2,
    def: 5 + Math.floor(level / 2),
  }
}

// ボス定義をランクで取得
function dungeonBossByRank(rank) {
  return DUNGEON_BOSSES.find(function (b) { return b.rank === rank }) || null
}

// 勝利/敗北時の報酬（2026-08-14: 敗北時も勝利の30%のEXP+通貨を付与）
function dungeonReward(rank, won) {
  var r = DUNGEON_REWARDS[rank] || DUNGEON_REWARDS[1]
  if (won) return { currency: r.currency, exp: r.exp, cheer: r.cheer }
  return { currency: Math.round(r.currency * 0.3), exp: Math.round(r.exp * 0.3), cheer: 0 } // 敗北時は30%のみ
}

// ---- クエスト（§14: 日替わり・週替わり）----

// クエスト定義
// type: daily / weekly / progressKey: 進行をカウントするキー（questAddProgress で進む）
const DAILY_QUESTS = [
  { id: 'dungeon_try', name: 'ダンジョンに挑戦', desc: '配信ダンジョンに挑戦しよう', progressKey: 'dungeonTries', target: 1, currency: 50, exp: 30 },
  { id: 'office_visit', name: '事務所を訪れる', desc: '事務所をのぞいてみよう', progressKey: 'officeVisits', target: 1, currency: 50, exp: 30 },
  { id: 'currency_earn', name: '通貨を稼ぐ', desc: 'ダンジョン報酬などで通貨を獲得', progressKey: 'currencyEarned', target: 100, currency: 50, exp: 30 },
  { id: 'video_watch', name: '動画を1本視聴', desc: 'Milli Unishare で動画を見よう', progressKey: 'videosWatched', target: 1, currency: 50, exp: 30 },
]

const WEEKLY_QUESTS = [
  { id: 'dungeon_clear', name: 'ダンジョンを3回クリア', desc: '配信ダンジョンで勝利を重ねよう', progressKey: 'dungeonClears', target: 3, currency: 200, exp: 100 },
  { id: 'cheer_gain', name: '応援力を300集める', desc: 'ダンジョン報酬などで応援力を獲得', progressKey: 'cheerGained', target: 300, currency: 200, exp: 100 },
]

// 今日の日付キー (YYYY-MM-DD、ローカル時刻)
function todayKey() {
  var d = new Date()
  var mm = String(d.getMonth() + 1).padStart(2, '0')
  var dd = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + mm + '-' + dd
}

// 今週の週キー（月曜始まりの週番号）
function weekKey() {
  var d = new Date()
  var day = d.getDay() || 7
  var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1)
  var mm = String(monday.getMonth() + 1).padStart(2, '0')
  var dd = String(monday.getDate()).padStart(2, '0')
  return monday.getFullYear() + '-' + mm + '-' + dd
}

// クエストのリセットチェック（日替わり・週替わり）
function rollQuests(data) {
  if (!data.quests) data.quests = { daily: { date: null, done: [], claimed: [], progress: {} }, weekly: { week: null, done: [], claimed: [], progress: {} } }
  var tk = todayKey()
  if (data.quests.daily.date !== tk) {
    data.quests.daily.date = tk
    data.quests.daily.done = []
    data.quests.daily.progress = {}
  }
  var wk = weekKey()
  if (data.quests.weekly.week !== wk) {
    data.quests.weekly.week = wk
    data.quests.weekly.done = []
    data.quests.weekly.progress = {}
  }
}

// クエスト進行を加算（進行フック: ダンジョン挑戦/クリア、事務所訪問、報酬獲得 等）
// 戻り値: { daily: 完了になった数, weekly: 完了になった数 }
function questAddProgress(data, progressKey, amount) {
  rollQuests(data)
  var newlyDone = 0
  if (typeof progressKey === 'string') progressKey = [progressKey]

  progressKey.forEach(function (key) {
    ;['daily', 'weekly'].forEach(function (kind) {
      var q = data.quests[kind]
      if (!q.progress[key]) q.progress[key] = 0
      q.progress[key] += amount || 1
    })
  })

  // 完了判定（クリアしたものを done に追加）
  ;['daily', 'weekly'].forEach(function (kind) {
    var defs = kind === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS
    var q = data.quests[kind]
    defs.forEach(function (def) {
      if (q.done.indexOf(def.id) >= 0) return
      var p = q.progress[def.progressKey] || 0
      if (p >= def.target) {
        q.done.push(def.id)
        newlyDone++
      }
    })
  })
  return newlyDone
}

// クエスト報酬を受け取り（done 一覧から未受取分を確認し、受取済みフラグを付ける）
// 戻り値: { currency, exp } の合計。受け取れるものが無ければ null
function claimQuestRewards(data, kind) {
  rollQuests(data)
  var defs = kind === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS
  var q = data.quests[kind]
  if (!q.claimed) q.claimed = []

  var total = { currency: 0, exp: 0 }
  var any = false
  defs.forEach(function (def) {
    if (q.done.indexOf(def.id) >= 0 && q.claimed.indexOf(def.id) < 0) {
      total.currency += def.currency
      total.exp += def.exp
      q.claimed.push(def.id)
      any = true
    }
  })
  return any ? total : null
}
