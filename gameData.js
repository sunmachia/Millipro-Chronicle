// ============================================================
// Milipro Chronicle - ゲームデータ基盤（セーブスキーマ）
// 方針: LocalStorage で先行実装し、構造確定後に Firebase へ移行
// 参照: 企画書.md Ver.0.4
// ============================================================

const GAME_DATA_KEY = 'millipro_gamedata'
const GAME_DATA_VERSION = 6

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
// emoji: コレクション棚・ショップ画面の表示用
const SHOP_GOODS = [
  { id: 'badgeParts', name: '痛バ用バッジパーツ', price: 50, emoji: '🧷', desc: '痛バッグ制作に使えるパーツ一式' },
  { id: 'canBadge', name: '缶バッジ', price: 100, emoji: '📛', desc: 'お気に入りのタレント缶バッジ' },
  { id: 'acrylicKeychain', name: 'アクキー', price: 200, emoji: '🔑', desc: 'キラキラ光るアクリルキーホルダー' },
  { id: 'acrylicStand', name: 'アクスタ', price: 300, emoji: '🖼️', desc: '机に飾れるアクリルスタンド' },
  { id: 'itabagBody', name: '痛バッグ本体', price: 300, emoji: '🎒', desc: '推し活の聖地・痛バッグの本体' },
  { id: 'poster', name: 'ポスター', price: 250, emoji: '📜', desc: '部屋の壁に貼れるB2ポスター' },
  { id: 'tapestry', name: 'タペストリー', price: 500, emoji: '🧵', desc: '特大布ポスター・存在感抜群' },
  { id: 'shelf', name: '部屋家具（棚）', price: 400, emoji: '🗄️', desc: 'コレクション棚の増設パーツ' },
]

// ショップで購入する（通貨を消費して collection.goods に追加）
// 戻り値: { ok: true, goods } または { ok: false, reason: 'currency' | 'notfound' }
function buyGoods(data, goodsId) {
  var goods = SHOP_GOODS.find(function (g) { return g.id === goodsId })
  if (!goods) return { ok: false, reason: 'notfound' }
  if (data.currency < goods.price) return { ok: false, reason: 'currency' }
  data.currency -= goods.price
  if (!data.collection) data.collection = { goods: {}, artworks: [], itabags: [] }
  if (!data.collection.goods) data.collection.goods = {}
  data.collection.goods[goodsId] = (data.collection.goods[goodsId] || 0) + 1
  return { ok: true, goods: goods }
}

// 所持グッズ一覧（購入回数付き）
function ownedGoodsList(data) {
  var goods = data.collection && data.collection.goods || {}
  return Object.keys(goods).map(function (id) {
    var def = SHOP_GOODS.find(function (g) { return g.id === id })
    if (!def) return null
    return { def: def, count: goods[id] }
  }).filter(function (x) { return x })
}

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
    zukan: { quotes: {}, streams: {}, trivia: {}, history: {}, memoryCards: {}, completed: {} },
    garden: { areas: {} },
    dungeon: { attempts: [] },
    quests: { daily: { date: null, done: [], claimed: [], progress: {} }, weekly: { week: null, done: [], claimed: [], progress: {} } },
    memoryShards: [],
    stats: { videosWatched: 0, dungeonClears: 0, artworksSold: 0, galleryReactions: 0, artworksListed: 0 },
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
  return data.points[def.point] >= JOB_UNLOCK_POINTS
}

// ---- ジョブ解放・育成（§20）----

// 解放に必要なポイント（§19: Lv5以上 + この数値以上）
const JOB_UNLOCK_POINTS = 50

// ジョブLv n→n+1 の育成コスト = JOB_LEVEL_COST_BASE × n（Lv1→2: 10、Lv2→3: 20…）
const JOB_LEVEL_COST_BASE = 10

// 次のジョブLvに上げるためのコスト（ポイント）
function jobLevelUpCost(level) {
  return JOB_LEVEL_COST_BASE * (level || 1)
}

// ジョブを解放する（ポイントは消費しない。条件は canUnlockJob）
// 戻り値: { ok: true } または { ok: false, reason: 'condition' }
function unlockJob(data, jobId) {
  var job = data.jobs[jobId]
  if (!job || job.unlocked || !canUnlockJob(data, jobId)) return { ok: false, reason: 'condition' }
  job.unlocked = true
  return { ok: true }
}

// ジョブLvを上げる（ジョブ固有のポイントを消費）
// 戻り値: { ok: true, cost, newLevel } または { ok: false, reason: 'locked' | 'points' }
function levelUpJob(data, jobId) {
  var job = data.jobs[jobId]
  if (!job || !job.unlocked) return { ok: false, reason: 'locked' }
  var def = JOB_DEFS[jobId]
  var cost = jobLevelUpCost(job.level)
  if (data.points[def.point] < cost) return { ok: false, reason: 'points' }
  data.points[def.point] -= cost
  job.level++
  return { ok: true, cost: cost, newLevel: job.level }
}

// ジョブLvによる獲得バフ（§20: 関連アクションの通貨/EXPが +5%/Lv、上限+100%）
// ポイント種ごとの解放済みジョブLv合計（Lv1はバフなし）で計算
// 戻り値: 倍率（1.0 = なし / 1.5 = +50%）
function jobBuffRate(data, pointType) {
  var total = 0
  Object.keys(JOB_DEFS).forEach(function (id) {
    var def = JOB_DEFS[id]
    if (def.point !== pointType) return
    var job = data.jobs[id]
    if (job && job.unlocked) total += job.level - 1
  })
  return 1 + Math.min(1, total * 0.05)
}

// 報酬にジョブバフを適用した結果（通貨/EXP を切り上げ）
function applyJobBuff(data, pointType, reward) {
  var rate = jobBuffRate(data, pointType)
  return {
    currency: Math.round(reward.currency * rate),
    exp: Math.round(reward.exp * rate),
    cheer: reward.cheer || 0,
  }
}

// 施設解放コスト軽減（応援力系ジョブLv1につき -5%、上限 -30%）
// 戻り値: 倍率（1.0 = なし / 0.85 = -15%）
function officeCostDiscountRate(data) {
  var total = 0
  ;['staff', 'itabag', 'cheerleader'].forEach(function (id) {
    var job = data.jobs[id]
    if (job && job.unlocked) total += job.level - 1
  })
  return 1 - Math.min(0.3, total * 0.05)
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

// ---- 痛バッグ制作（§16: 注文通りにバッジを配置するタイムアタック）----

// バッジパレット（購入不要・最初から所持）
const ITABAG_BADGES = [
  { id: 'canBadge', name: '缶バッジ', emoji: '📛' },
  { id: 'keychain', name: 'アクキー', emoji: '🔑' },
  { id: 'stand', name: 'アクスタ', emoji: '🖼️' },
  { id: 'poster', name: 'ポスター', emoji: '📜' },
  { id: 'parts', name: 'バッジパーツ', emoji: '🧷' },
]

// 星評価別報酬（§18: 基本 20通貨/10EXP + 星で増減）
const ITABAG_REWARDS = {
  1: { currency: 20, exp: 10 },
  2: { currency: 35, exp: 18 },
  3: { currency: 50, exp: 25 },
}

// 1セッション（3注文）の合計★に対する報酬（上限 = ★3×3 の 150/75）
const ITABAG_TOTAL_REWARDS = {
  1: { currency: 20, exp: 10 },
  2: { currency: 30, exp: 15 },
  3: { currency: 45, exp: 22 },
  4: { currency: 60, exp: 30 },
  5: { currency: 75, exp: 38 },
  6: { currency: 90, exp: 45 },
  7: { currency: 110, exp: 55 },
  8: { currency: 130, exp: 65 },
  9: { currency: 150, exp: 75 },
}

// 痛バッグ完成を記録（collection.itabags + stats.itabagClears）
function recordItabag(data, stars, seconds, mistakes) {
  if (!data.collection) data.collection = { goods: {}, artworks: [], itabags: [] }
  if (!data.collection.itabags) data.collection.itabags = []
  data.collection.itabags.push({ completedAt: Date.now(), stars: stars, seconds: seconds, mistakes: mistakes })
  if (!data.stats) data.stats = { videosWatched: 0, dungeonClears: 0, artworksSold: 0, galleryReactions: 0, artworksListed: 0 }
  data.stats.itabagClears = (data.stats.itabagClears || 0) + 1
}

// 星評価ごとの報酬を取得
function itabagReward(stars) {
  return ITABAG_REWARDS[stars] || ITABAG_REWARDS[1]
}

// 1セッション（3注文）の合計★に対する報酬を取得
function itabagTotalReward(totalStars) {
  var r = ITABAG_TOTAL_REWARDS[totalStars] || ITABAG_TOTAL_REWARDS[1]
  return r
}

// ---- ギャラリー（§22: お絵かき・投稿・売買・壁飾り）----

// 売買手数料（§18: 販売額の90%が売り手に）
const GALLERY_SALE_RATE = 0.9

// 初回出品報酬（§18: ギャラリー出品（初回のみ）30通貨/15EXP）
const GALLERY_FIRST_REWARD = { currency: 30, exp: 15 }

// 自分の作品を追加（ローカル）
// art = { id, title, desc, imageData, price, mode, createdAt }
function addLocalArtwork(data, art) {
  if (!data.gallery) data.gallery = { artworks: [] }
  if (!data.gallery.artworks) data.gallery.artworks = []
  data.gallery.artworks.push(art)
}

// 自分の作品を削除
function removeLocalArtwork(data, id) {
  if (!data.gallery || !data.gallery.artworks) return false
  var before = data.gallery.artworks.length
  data.gallery.artworks = data.gallery.artworks.filter(function (a) { return a.id !== id })
  return data.gallery.artworks.length < before
}

// 購入した絵をコレクションに追加
// art = { id, title, imageData, sourcePlayerId, price, purchasedAt }
function addOwnedArtwork(data, art) {
  if (!data.collection) data.collection = { goods: {}, artworks: [], itabags: [] }
  if (!data.collection.artworks) data.collection.artworks = []
  data.collection.artworks.push(art)
}

// 壁に飾る絵を設定（collection.artworks の id か、自分の作品 gallery.artworks の id）
// wallKey = { kind: 'owned'|'mine', id: ... }
function setWallArtwork(data, wallKey) {
  if (!data.gallery) data.gallery = { artworks: [] }
  data.gallery.wall = wallKey || null
}

// 壁に飾っている絵を取得
function getWallArtwork(data) {
  var w = data.gallery && data.gallery.wall
  if (!w) return null
  if (w.kind === 'owned') {
    var owned = data.collection && data.collection.artworks || []
    return owned.find(function (a) { return a.id === w.id }) || null
  }
  if (w.kind === 'mine') {
    var mine = data.gallery.artworks || []
    return mine.find(function (a) { return a.id === w.id }) || null
  }
  return null
}

// ---- クエスト（§14: 日替わり・週替わり）----

// クエスト定義
// type: daily / weekly / progressKey: 進行をカウントするキー（questAddProgress で進む）
const DAILY_QUESTS = [
  { id: 'dungeon_try', name: 'ダンジョンに挑戦', desc: '配信ダンジョンに挑戦しよう', progressKey: 'dungeonTries', target: 1, currency: 50, exp: 30 },
  { id: 'office_visit', name: '事務所を訪れる', desc: '事務所をのぞいてみよう', progressKey: 'officeVisits', target: 1, currency: 50, exp: 30 },
  { id: 'currency_earn', name: '通貨を稼ぐ', desc: 'ダンジョン報酬などで通貨を獲得', progressKey: 'currencyEarned', target: 100, currency: 50, exp: 30 },
  { id: 'video_watch', name: '動画を1本視聴', desc: 'Milli Unishare で動画を見よう', progressKey: 'videosWatched', target: 1, currency: 50, exp: 30 },
  { id: 'shop_buy', name: 'ショップでお買い物', desc: 'Milli Shop でグッズを1つ購入', progressKey: 'goodsPurchased', target: 1, currency: 50, exp: 30 },
  { id: 'itabag_complete', name: '痛バッグを完成', desc: '痛バッグ制作でバッグを1つ完成させよう', progressKey: 'itabagComplete', target: 1, currency: 50, exp: 30 },
  { id: 'job_level', name: 'ジョブを育成', desc: 'ジョブLvを1上げよう', progressKey: 'jobLevelUps', target: 1, currency: 50, exp: 30 },
  { id: 'gallery_post', name: 'ギャラリーに投稿', desc: 'お絵かきや画像を1つ投稿しよう', progressKey: 'galleryPosts', target: 1, currency: 30, exp: 15 },
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

// ---- 図鑑（§12: 発見 → 解読 → 完全解放）----
// 各項目の状態 (state): 0 = 未発見（？？？）/ 1 = 発見（タイトルのみ）/ 2 = 解読（詳細解放）
const ZUKAN_CATEGORIES = [
  { key: 'quotes', name: '名言', emoji: '💬', desc: '推し活の名言たち' },
  { key: 'streams', name: '神配信', emoji: '📺', desc: '語り継がれる伝説の配信' },
  { key: 'trivia', name: '小ネタ', emoji: '✨', desc: 'ミリプロの豆知識' },
  { key: 'history', name: '歴史', emoji: '📜', desc: '事務所の歩み' },
  { key: 'memoryCards', name: '記憶カード', emoji: '🃏', desc: '歴史イベントのカード' },
]

// 解読（詳細解放）に必要な知識ポイント / 発見時に得られる知識ポイント
const ZUKAN_DECODE_COST = 10
const ZUKAN_DISCOVER_KNOWLEDGE = 5

// カテゴリ完全制覇（全項目を解読）の報酬
const ZUKAN_COMPLETE_REWARDS = { currency: 300, exp: 150, cheer: 50 }

function zStat(gd, key) { return (gd.stats && gd.stats[key]) || 0 }
function zOwned(gd, id) { return (gd.collection && gd.collection.goods && gd.collection.goods[id]) || 0 }
function zDistinctGoods(gd) { return gd.collection && gd.collection.goods ? Object.keys(gd.collection.goods).length : 0 }
function zFacility(gd, key) { return !!(gd.office && gd.office.facilities && gd.office.facilities[key]) }

// 図鑑の内容（出典: ミリプロ公式サイト・非公式wiki。2026年8月時点）
const ZUKAN_DEFS = {
  quotes: [
    { id: 'q1', emoji: '💬', title: '「可能性を最大限に、もっと飛躍する。」', how: 'プレイヤーLv3到達', text: 'ミリプロ（Million Production）のスローガン。「Million」には無数の可能性を秘めたタレントを支えたいという想いが込められている。', cond: function (gd) { return gd.level >= 3 } },
    { id: 'q2', emoji: '💬', title: '「あなたと『すき』で繋がりたい」', how: 'ショップでグッズを1つ購入', text: '甘狼このみの公式紹介文の一節。イラストもLive2Dも自作する「完全セルフ受肉」の狼人間。', cond: function (gd) { return zDistinctGoods(gd) >= 1 } },
    { id: 'q3', emoji: '💬', title: '「ダイヤのように輝きたいっ！」', how: '配信ダンジョンで初勝利', text: '音ノ乃のののキャッチコピー。歌うことが大好きなVSingerで、ミリプロ1期生・ダイヤ担当。', cond: function (gd) { return zStat(gd, 'dungeonClears') >= 1 } },
    { id: 'q4', emoji: '💬', title: '「君との思い出つくってあげる」', how: '痛バッグを1つ完成', text: '眠雲ツクリの公式紹介文の一節。作曲・作詞・歌唱・編集・イラストなんでもこなすマルチクリエイティブVTuber。', cond: function (gd) { return zStat(gd, 'itabagClears') >= 1 } },
    { id: 'q5', emoji: '💬', title: '「霧に紛れて、心を撃ち抜く」', how: '動画を1本視聴（連携）', text: '夕霧レイのキャッチコピー。ミリプロUNIに所属する「霧のスナイパー」。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 1 } },
  ],
  streams: [
    { id: 's1', emoji: '📺', title: '甘狼このみ・初配信', how: '動画を1本視聴（連携）', text: '2022年12月23日。個人VTuberとして始まった初配信が、やがてミリプロ誕生の原点となる。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 1 } },
    { id: 's2', emoji: '📺', title: '1st 3D LIVE「Million Story」', how: '動画を5本視聴（連携）', text: '2026年5月9日、Zepp Shinjukuで開催されたミリプロ初の3Dオフラインライブ。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 5 } },
    { id: 's3', emoji: '📺', title: '全体楽曲「Mile Stone」リリース', how: '動画を15本視聴（連携）', text: 'ミリプロ初のオリジナル全体楽曲。ミリプロの"歩み"を刻んだ記念すべき一曲。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 15 } },
    { id: 's4', emoji: '📺', title: '夕霧レイ・初配信', how: '動画を30本視聴（連携）', text: '2026年7月11日「霧に紛れて、作戦開始――」。新たな物語を告げる伝説の初配信。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 30 } },
    { id: 's5', emoji: '📺', title: '20万人耐久歌枠リレー', how: '動画を50本視聴（連携）', text: 'ミリプロ20万人達成を祝う耐久歌枠リレー。眠雲ツクリが音源をかけ忘れ、意気込みと共にアカペラ熱唱した名場面が語り継がれる。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 50 } },
  ],
  trivia: [
    { id: 't1', emoji: '✨', title: '完全セルフ受肉の創設者', how: '事務所を訪れる', text: '甘狼このみはイラスト・Live2Dを全て自作。ミリプロの初期メンバー4人のキャラデザやモデリングも彼女が手がけた。', cond: function (gd) { return true } },
    { id: 't2', emoji: '✨', title: '紀文公認「ちくわ代表」', how: 'グッズを2種類以上購入', text: '音ノ乃ののはちくわが主食。1日最大8袋を空けたこともあり、大手練り物メーカーから「ちくわ代表」と呼ばれる。', cond: function (gd) { return zDistinctGoods(gd) >= 2 } },
    { id: 't3', emoji: '✨', title: 'なんでもこなすマルチクリエイター', how: '痛バッグを1つ完成', text: '眠雲ツクリは作曲・作詞・歌唱・MIX・動画編集・イラスト・デザインをひとりでこなす。バンド経験あり、ギターも弾ける。', cond: function (gd) { return zStat(gd, 'itabagClears') >= 1 } },
    { id: 't4', emoji: '✨', title: '口癖「えへへ」はグッズにまで', how: '配信ダンジョンで勝利', text: '甘狼このみの口癖「えへへ」。「えへへ言ったら即終了」配信を開くほどの持ち味で、グッズやLINEスタンプにもなっている。', cond: function (gd) { return zStat(gd, 'dungeonClears') >= 1 } },
    { id: 't5', emoji: '✨', title: '朝に弱いスナイパー', how: '動画を1本視聴（連携）', text: '夕霧レイは朝に弱く「毎日5度寝くらいしてる気がする」と語る。特技は、ごはんとおかずをぴったり同時に食べ切ること。', cond: function (gd) { return zStat(gd, 'videosWatched') >= 1 } },
  ],
  history: [
    { id: 'h1', emoji: '📜', title: '事務所の創設（2023年4月1日）', how: '事務所を訪れる', text: '甘狼このみが「ミリちゃん」と共にMillion Productionを設立。このみは0期生兼クリエイターとして所属する。', cond: function (gd) { return true } },
    { id: 'h2', emoji: '📜', title: '1期生デビュー（2023年6月3日）', how: '初期施設の配信室', text: 'ダイヤ担当のVSinger・音ノ乃のの がデビュー。のののイラストとLive2Dも甘狼このみが担当した。', cond: function (gd) { return zFacility(gd, 'streamRoom') } },
    { id: 'h3', emoji: '📜', title: '新ユニットNOVA始動', how: '事務所を第2段階に拡張', text: '音ノ瀬らこ・ゆらぎゆら・虹深°ぬふ による新グループ「ミリプロNOVA」が始動。', cond: function (gd) { return gd.office && gd.office.stage >= 2 } },
    { id: 'h4', emoji: '📜', title: '新ユニットUNI始動（2025年5月17日）', how: '事務所を第3段階に拡張', text: '雨夜リズと眠雲ツクリが「ミリプロUNI」としてデビュー。', cond: function (gd) { return gd.office && gd.office.stage >= 3 } },
    { id: 'h5', emoji: '📜', title: '10人目のタレント（2026年7月11日）', how: '事務所を第5段階に拡張', text: '「霧のスナイパー」夕霧レイがミリプロUNIに加入。これでタレントは10人に。', cond: function (gd) { return gd.office && gd.office.stage >= 5 } },
  ],
  memoryCards: [
    { id: 'm1', emoji: '🃏', title: 'デビュー', how: 'プレイヤーLv2到達', text: '2022年12月23日、甘狼このみが初配信。ここからミリプロの物語が始まる。', cond: function (gd) { return gd.level >= 2 } },
    { id: 'm2', emoji: '🃏', title: 'チャンネル登録1万人達成', how: '配信ダンジョンで勝利', text: '2023年1月9日、甘狼このみのチャンネル登録者数が1万人を突破。', cond: function (gd) { return zStat(gd, 'dungeonClears') >= 1 } },
    { id: 'm3', emoji: '🃏', title: 'メジャーデビュー', how: 'プレイヤーLv10到達', text: '2024年5月、音ノ乃のの がユニバーサルミュージックよりメジャーデビュー。初のオリジナル曲「約束」を公開。', cond: function (gd) { return gd.level >= 10 } },
    { id: 'm4', emoji: '🃏', title: '3Dお披露目', how: 'ギャラリーに初めて作品を', text: '2025年1月25日、甘狼このみが3Dモデルをお披露目。2026年には登録80万人も達成した。', cond: function (gd) { return (gd.gallery && gd.gallery.artworks && gd.gallery.artworks.length >= 1) || zStat(gd, 'artworksListed') >= 1 } },
    { id: 'm5', emoji: '🃏', title: '1st 3D LIVE', how: '事務所を第4段階に拡張', text: '2026年5月9日「Million Story」をZepp Shinjukuで開催。ミリプロにとって初の3Dオフラインライブとなった。', cond: function (gd) { return gd.office && gd.office.stage >= 4 } },
  ],
}

// 図鑑項目の現在状態（0/1/2）。未定義なら 0
function zukanStateOf(data, cat, id) {
  var catData = data.zukan && data.zukan[cat]
  if (!catData) return 0
  var s = catData[id]
  return (typeof s === 'number' && s >= 0) ? s : 0
}

// 発見チェック（スイープ）: 条件を満たす未発見項目をまとめて発見し、知識ポイントを付与
// 戻り値: 新しく発見された項目の配列 [{ cat, def }]
function zukanSweepDiscoveries(data) {
  if (!data.zukan) data.zukan = { quotes: {}, streams: {}, trivia: {}, history: {}, memoryCards: {}, completed: {} }
  if (!data.points) data.points = { cheer: 0, knowledge: 0, create: 0, music: 0, popularity: 0 }
  var found = []
  ZUKAN_CATEGORIES.forEach(function (catDef) {
    var key = catDef.key
    if (!data.zukan[key]) data.zukan[key] = {}
    ZUKAN_DEFS[key].forEach(function (def) {
      var cur = data.zukan[key][def.id]
      if (typeof cur === 'number' && cur >= 1) return
      if (!def.cond || !def.cond(data)) return
      data.zukan[key][def.id] = 1
      data.points.knowledge += ZUKAN_DISCOVER_KNOWLEDGE
      found.push({ cat: key, def: def })
    })
  })
  return found
}

// 解読（詳細解放）。知識ポイントを消費
// 戻り値: { ok: true, cost } または { ok: false, reason: 'hidden'|'decoded'|'knowledge'|'notfound' }
function zukanDecode(data, cat, id) {
  var catData = data.zukan && data.zukan[cat]
  if (!catData || !catData[id]) return { ok: false, reason: 'hidden' }
  if (catData[id] >= 2) return { ok: false, reason: 'decoded' }
  if (data.points.knowledge < ZUKAN_DECODE_COST) return { ok: false, reason: 'knowledge' }
  data.points.knowledge -= ZUKAN_DECODE_COST
  catData[id] = 2
  return { ok: true, cost: ZUKAN_DECODE_COST }
}

// カテゴリ内の発見数 / 解読数 / 総数
function zukanCategoryProgress(data, cat) {
  var defs = ZUKAN_DEFS[cat] || []
  var found = 0
  var decoded = 0
  defs.forEach(function (def) {
    var s = zukanStateOf(data, cat, def.id)
    if (s >= 1) found++
    if (s >= 2) decoded++
  })
  return { found: found, decoded: decoded, total: defs.length }
}

// カテゴリ完全制覇（全解読）の報酬を初回のみ付与（完了フラグは data.zukan.completed に記録）
// 戻り値: { rewards, leveledUp, newLevel } または null（未完了 or 受取済み）
function claimZukanCategoryReward(data, cat) {
  var prog = zukanCategoryProgress(data, cat)
  if (prog.decoded < prog.total) return null
  if (!data.zukan.completed) data.zukan.completed = {}
  if (data.zukan.completed[cat]) return null
  data.zukan.completed[cat] = true
  var r = ZUKAN_COMPLETE_REWARDS
  data.currency += r.currency
  data.points.cheer += r.cheer
  var lv = addExp(data, r.exp)
  return { rewards: r, leveledUp: lv.leveledUp, newLevel: lv.newLevel }
}

// ---- 記憶の庭（§11: 知識で開拓 → 欠片で記憶を植える）----
// エリア状態: { cultivated: bool, planted: { memoryId: true }, rewarded: bool }
// 完全制覇フラグ: data.garden.completeRewarded

// エリア完成（全記憶を植える）の報酬 / 全エリア完成の完全制覇報酬
const GARDEN_CULTIVATE_REWARDS = { currency: 200, exp: 100, cheer: 30 }
const GARDEN_COMPLETE_REWARDS = { currency: 1000, exp: 500, cheer: 150, knowledge: 100 }

// 記憶の欠片（§15）。ゲーム内進行から獲得する収集要素
const GARDEN_SHARDS = [
  { id: 'sh1', emoji: '🧩', name: '初配信の欠片', how: '動画を1本視聴（連携）', cond: function (gd) { return zStat(gd, 'videosWatched') >= 1 } },
  { id: 'sh2', emoji: '🧩', name: '初勝利の欠片', how: '配信ダンジョンで勝利', cond: function (gd) { return zStat(gd, 'dungeonClears') >= 1 } },
  { id: 'sh3', emoji: '🧩', name: '応援の欠片', how: '作品に応援をもらう', cond: function (gd) { return zStat(gd, 'galleryReactions') >= 1 } },
  { id: 'sh4', emoji: '🧩', name: '初グッズの欠片', how: 'ショップでグッズを購入', cond: function (gd) { return zDistinctGoods(gd) >= 1 } },
  { id: 'sh5', emoji: '🧩', name: '創作の欠片', how: 'ギャラリーに作品を投稿', cond: function (gd) { return zStat(gd, 'artworksListed') >= 1 } },
  { id: 'sh6', emoji: '🧩', name: '事務所の欠片', how: '事務所を第2段階に拡張', cond: function (gd) { return gd.office && gd.office.stage >= 2 } },
  { id: 'sh7', emoji: '🧩', name: '図鑑の欠片', how: '図鑑を1つ完全制覇', cond: function (gd) { var c = gd.zukan && gd.zukan.completed; return !!(c && Object.keys(c).length > 0) } },
  { id: 'sh8', emoji: '🧩', name: 'ブレイクの欠片', how: 'プレイヤーLv10到達', cond: function (gd) { return gd.level >= 10 } },
  { id: 'sh9', emoji: '🧩', name: '伝説の欠片', how: 'プレイヤーLv20到達', cond: function (gd) { return gd.level >= 20 } },
  { id: 'sh10', emoji: '🧩', name: '完走の欠片', how: '配信ダンジョンで3回勝利', cond: function (gd) { return zStat(gd, 'dungeonClears') >= 3 } },
]

// エリア定義（出典: ミリプロ公式サイト・非公式wiki。2026年8月時点）
const GARDEN_AREAS = [
  {
    id: 'g1', name: 'デビューの丘', emoji: '🌱', cost: 20, officeStage: 1, desc: 'ミリプロの物語はここから始まった。',
    memories: [
      { id: 'g1m1', shard: 'sh1', emoji: '📡', title: '第一声', text: '2022年12月23日、甘狼このみが初配信。その第一声が、全ての物語の始まり。' },
      { id: 'g1m2', shard: 'sh4', emoji: '🏢', title: '事務所の旗揚げ', text: '2023年4月1日、甘狼このみが「ミリちゃん」と共にMillion Productionを設立。0期生兼クリエイターとして一歩を踏み出す。' },
      { id: 'g1m3', shard: 'sh7', emoji: '💎', title: 'ダイヤの歌声', text: '2023年6月3日、1期生・ダイヤ担当のVSinger音ノ乃のの がデビュー。キャラデザもLive2Dもこのみが手がけた。' },
    ],
  },
  {
    id: 'g2', name: '配信の森', emoji: '🌳', cost: 30, officeStage: 1, desc: '語り継がれる配信の記憶が、木々のように育つ森。',
    memories: [
      { id: 'g2m1', shard: 'sh2', emoji: '🎙️', title: '20万人耐久歌枠リレー', text: 'ミリプロ20万人達成を祝う耐久歌枠リレー。眠雲ツクリが音源をかけ忘れ、アカペラ熱唱する名シーンが伝説に。' },
      { id: 'g2m2', shard: 'sh8', emoji: '🎵', title: '「Mile Stone」誕生', text: 'ミリプロ初のオリジナル全体楽曲「Mile Stone」。ミリプロの"歩み"を刻んだ記念すべき一曲。' },
      { id: 'g2m3', shard: 'sh10', emoji: '🎤', title: 'Zepp Shinjukuの夜', text: '2026年5月9日、1st 3D LIVE「Million Story」をZepp Shinjukuで開催。ミリプロ初の3Dオフラインライブ。' },
    ],
  },
  {
    id: 'g3', name: '歌みたの泉', emoji: '⛲', cost: 40, officeStage: 1, desc: '歌声の記憶が、清らかに湧き出る泉。',
    memories: [
      { id: 'g3m1', shard: 'sh8', emoji: '🎧', title: 'メジャーデビュー', text: '2024年5月、音ノ乃のの がユニバーサルミュージックよりメジャーデビュー。初オリジナル曲「約束」をリリース。' },
      { id: 'g3m2', shard: 'sh4', emoji: '🍢', title: 'ちくわの歌声', text: '音ノ乃ののはちくわが主食で、1日最大8袋。大手練り物メーカーから「ちくわ代表」と呼ばれる。' },
      { id: 'g3m3', shard: 'sh9', emoji: '💖', title: '想わせ♡らぶりー', text: '2025年12月27日、甘狼このみが1st Digital Single「想わせ♡らぶりー」をリリース。' },
    ],
  },
  {
    id: 'g4', name: '周年の塔', emoji: '🗼', cost: 50, officeStage: 1, desc: '登録者達成や周年の節目が、積み上がる塔。',
    memories: [
      { id: 'g4m1', shard: 'sh2', emoji: '🎊', title: '1万人達成', text: '2023年1月9日、甘狼このみのチャンネル登録者が1万人を突破。' },
      { id: 'g4m2', shard: 'sh6', emoji: '🎂', title: '3Dお披露目', text: '2025年1月25日、甘狼このみが3Dモデルをお披露目。完全セルフ受肉の狼が、ついに立体化。' },
      { id: 'g4m3', shard: 'sh9', emoji: '🚀', title: '80万人達成', text: '2026年5月4日、甘狼このみのチャンネル登録者が80万人を達成。' },
    ],
  },
  {
    id: 'g5', name: '記憶の花畑', emoji: '🌸', cost: 60, officeStage: 1, desc: '大切な出来事が、花となって咲き誇る畑。',
    memories: [
      { id: 'g5m1', shard: 'sh6', emoji: '🌠', title: 'NOVA始動', text: '音ノ瀬らこ・ゆらぎゆら・虹深°ぬふ による新グループ「ミリプロNOVA」が始動。' },
      { id: 'g5m2', shard: 'sh7', emoji: '🌌', title: 'UNI始動', text: '2025年5月17日、雨夜リズと眠雲ツクリが「ミリプロUNI」としてデビュー。' },
      { id: 'g5m3', shard: 'sh10', emoji: '🌫️', title: '霧のスナイパー', text: '2026年7月11日、夕霧レイがミリプロUNIに加入。これでタレントは10人に。' },
    ],
  },
  {
    id: 'g6', name: '図書館', emoji: '📚', cost: 80, officeStage: 4, desc: '事務所 第4段階「スタジオ」で解放。資料と記録の殿堂。',
    memories: [
      { id: 'g6m1', shard: 'sh3', emoji: '📖', title: '書架に並ぶ2冊', text: '甘狼このみは書籍を2冊出版。書架に並ぶ著書が、その軌跡を物語る。' },
      { id: 'g6m2', shard: 'sh5', emoji: '🏬', title: 'TOKYO TOWER共演', text: '2026年4月、BOOKOFF・RED° TOKYO TOWERとのコラボを開催。街にミリプロの記憶が溢れた。' },
      { id: 'g6m3', shard: 'sh3', emoji: '✂️', title: '公式切り抜き', text: '公式切り抜きアカウント「@mil_kiri」が開設。名場面が切り抜かれ、記憶として残り続ける。' },
    ],
  },
]

// 欠片の所持判定
function gardenOwnsShard(data, id) {
  return data.memoryShards && data.memoryShards.indexOf(id) !== -1
}

function gardenShardDef(id) {
  var found = null
  GARDEN_SHARDS.forEach(function (s) { if (s.id === id) found = s })
  return found
}

// エリアの現在状態（未定義なら未開拓）
function gardenAreaState(data, areaId) {
  var areas = (data.garden && data.garden.areas) || {}
  return areas[areaId] || { cultivated: false, planted: {} }
}

function gardenAreaProgress(data, area) {
  var st = gardenAreaState(data, area.id)
  var planted = 0
  area.memories.forEach(function (m) { if (st.planted[m.id]) planted++ })
  return { cultivated: st.cultivated, planted: planted, total: area.memories.length }
}

// スイープ: 条件を満たした未所持の欠片をまとめて獲得
// 戻り値: 新しく獲得した欠片の配列
function gardenSweepShards(data) {
  if (!data.memoryShards) data.memoryShards = []
  var gained = []
  GARDEN_SHARDS.forEach(function (s) {
    if (data.memoryShards.indexOf(s.id) !== -1) return
    if (!s.cond || !s.cond(data)) return
    data.memoryShards.push(s.id)
    gained.push(s)
  })
  return gained
}

// エリアを開拓（知識消費）。戻り値: { ok: true, cost } または { ok: false, reason }
function gardenCultivate(data, areaId) {
  var area = null
  GARDEN_AREAS.forEach(function (a) { if (a.id === areaId) area = a })
  if (!area) return { ok: false, reason: 'notfound' }
  var st = gardenAreaState(data, areaId)
  if (st.cultivated) return { ok: false, reason: 'cultivated' }
  if (area.officeStage > 1 && (!data.office || data.office.stage < area.officeStage)) return { ok: false, reason: 'office' }
  if (data.points.knowledge < area.cost) return { ok: false, reason: 'knowledge' }
  data.points.knowledge -= area.cost
  if (!data.garden) data.garden = { areas: {} }
  if (!data.garden.areas) data.garden.areas = {}
  data.garden.areas[areaId] = { cultivated: true, planted: {} }
  return { ok: true, cost: area.cost }
}

// 記憶を植える（欠片を所持していることが必要。欠片は消費しない）。戻り値: { ok: true } または { ok: false, reason }
function gardenPlant(data, areaId, memoryId) {
  var area = null
  GARDEN_AREAS.forEach(function (a) { if (a.id === areaId) area = a })
  if (!area) return { ok: false, reason: 'notfound' }
  var mem = null
  area.memories.forEach(function (m) { if (m.id === memoryId) mem = m })
  if (!mem) return { ok: false, reason: 'notfound' }
  var st = gardenAreaState(data, areaId)
  if (!st.cultivated) return { ok: false, reason: 'cultivate' }
  if (st.planted[memoryId]) return { ok: false, reason: 'planted' }
  if (!gardenOwnsShard(data, mem.shard)) return { ok: false, reason: 'shard' }
  if (!data.garden.areas) data.garden.areas = {}
  if (!data.garden.areas[areaId]) data.garden.areas[areaId] = { cultivated: true, planted: {} }
  data.garden.areas[areaId].planted[memoryId] = true
  return { ok: true }
}

// エリア完成（全記憶を植える）の報酬を初回のみ付与
// 戻り値: { rewards, leveledUp, newLevel } または null
function claimGardenAreaReward(data, areaId) {
  var area = null
  GARDEN_AREAS.forEach(function (a) { if (a.id === areaId) area = a })
  if (!area) return null
  var prog = gardenAreaProgress(data, area)
  if (!prog.cultivated || prog.planted < prog.total) return null
  if (!data.garden.areas) data.garden.areas = {}
  if (!data.garden.areas[areaId]) data.garden.areas[areaId] = { cultivated: true, planted: {} }
  var st = data.garden.areas[areaId]
  if (st.rewarded) return null
  st.rewarded = true
  var r = GARDEN_CULTIVATE_REWARDS
  data.currency += r.currency
  data.points.cheer += r.cheer
  var lv = addExp(data, r.exp)
  return { rewards: r, leveledUp: lv.leveledUp, newLevel: lv.newLevel }
}

// 全エリア完成で完全制覇報酬を初回のみ付与
// 戻り値: { rewards, leveledUp, newLevel } または null
function claimGardenCompleteReward(data) {
  if (data.garden && data.garden.completeRewarded) return null
  var allDone = true
  GARDEN_AREAS.forEach(function (a) {
    var prog = gardenAreaProgress(data, a)
    if (!prog.cultivated || prog.planted < prog.total) allDone = false
  })
  if (!allDone) return null
  if (!data.garden) data.garden = { areas: {} }
  data.garden.completeRewarded = true
  var r = GARDEN_COMPLETE_REWARDS
  data.currency += r.currency
  data.points.cheer += r.cheer
  data.points.knowledge += r.knowledge
  var lv = addExp(data, r.exp)
  return { rewards: r, leveledUp: lv.leveledUp, newLevel: lv.newLevel }
}
