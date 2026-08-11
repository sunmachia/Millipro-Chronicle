// ============================================================
// Milipro Chronicle - ゲームデータ基盤（セーブスキーマ）
// 方針: LocalStorage で先行実装し、構造確定後に Firebase へ移行
// 参照: 企画書.md Ver.0.4
// ============================================================

const GAME_DATA_KEY = 'millipro_gamedata'
const GAME_DATA_VERSION = 1

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
const DUNGEON_REWARDS = {
  1: { currency: 20, exp: 15 },
  2: { currency: 50, exp: 35 },
  3: { currency: 100, exp: 70 },
  4: { currency: 180, exp: 120 },
  5: { currency: 300, exp: 200 },
}

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
    quests: { daily: { date: null, done: [] }, weekly: { week: null, done: [] } },
    memoryShards: [],
    stats: { videosWatched: 0, dungeonClears: 0, artworksSold: 0, galleryReactions: 0 },
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
