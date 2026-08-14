/* ============================================================
   配信ダンジョン（ライブ配信風） dungeon.js
   ・自動生成コメントで流れるライブチャット
   ・タレント vs トラブルのターン制バトル
   ・通貨を使ったギフト（サイリウム / ペンライト / スパチャ）
   ・報酬は gameData.js の関数経由で LocalStorage に保存
   ============================================================ */

// ---- タレント定義（script.js と同内容をこのページ用に保持） ----
var DUNGEON_TALENTS = {
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

// ---- ユーザーデータ読み込み ----
var USER_KEY = 'millipro_userdata'

function loadUserDataLocal() {
  try {
    var raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

var user = loadUserDataLocal() || { name: 'リスナー' }

// ---- ゲームデータ（gameData.js の関数を利用） ----
var gd = loadGameData() || ensureGameData()

// ---- 表示状態 ----
var VIEW = 'select' // select | battle | result
var bossRank = null
var talentId = null
var state = null // バトル状態

function dungeonRand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// ---- 立ち絵: images/standing/<id>.png を使用。無ければ talents/<id>.webp へフォールバック ----
function talentImg(id, cls) {
  var onErr = "this.onerror=null;this.src='images/talents/" + id + ".webp';this.classList.add('portrait');"
  return '<img class="' + (cls || '') + '" src="images/standing/' + id + '.png" alt="" loading="lazy" onerror="' + onErr + '">'
}

// ---- チャット生成 ----
var FAN_NAMES = [
  'ミリリスA', 'こんぺいとう', '夜行バス推し', 'しろくま推し', 'あんこまる',
  'みるくてぃ', 'ほしぞらP', 'てぃあら', 'もこもこ先輩', 'さくらもち',
  'ねむねむリスナー', 'ぱんだ山', 'たこやき', 'めろめろん', 'ちくわぶ',
  'どらねこ', 'ふわふわ', 'ゆきだるま'
]

var FAN_MSG_POOL = [
  'おおお！！', '初見です！', 'わーい！', 'www', '今日の推しも尊い', 'がんばれ〜！',
  '///', '応援してるよ！', 'かわいい', '待ってた！！', '推しが最強なのは確定',
  'この配信すき', '画面見てるだけでも楽しい', '💜💜💜', 'クリアできるかな…',
  'ドキドキする', '寝るの我慢して見てる', 'ミリプロ最高！！！', 'ガチで感動',
  'ライブ配信たのしい', '初コメです', '飛び入り参加！', 'よろしくお願いします',
  'いっけーー！！', 'ふぁいと！！', '今日は勝てそう', 'この空気感すき',
  '右に見えてるボス強そう…', '配信事故だけは…', '何ターンでいくかな', '超楽しみ'
]

var NAME_COLORS = ['#7ed6df', '#ffd166', '#8ef0b0', '#f6a5c0', '#b8a9ff', '#ff9f68', '#9be8c8', '#f3e37c']

var REACTIONS = {
  attack: ['おおお！！', 'いけいけ！', 'いいねぇ！', 'いいダメージ！'],
  attackCrit: ['やったー！！', '最強だ！！！', 'ここで決める！', 'スゴイ！！'],
  guard: ['防御！！', 'かたい！', 'いいぞいいぞ'],
  heal: ['ナイスヒール！！', '助かった…', '回復助かる！'],
  chest: ['宝箱きたああ', '運試し！', 'ドキドキする'],
  chestFail: ['あちゃー', 'しかたない…', '次いこう！'],
  bossAtk: ['えええ…', 'やばいやばい', '倒れないで…！', 'ヒヤヒヤする'],
  win: ['クリアおめでとう！！！', '最高の配信だった', 'また見ます！！', '🎉🎉🎉'],
  lose: ['無念…', '次こそは！', 'おつかれさまでした！', 'また挑戦しよう！'],
  giftCyalume: ['サイリウムあがった！！', 'ぬいた！'],
  giftPenlight: ['ペンライトしゅごい', 'あがったああ！'],
  superchat: ['スパチャ神！', '太っ腹！！', 'スパチャきたあああ']
}

// ---- ギフト定義 ----
var GIFTS = {
  cyalume:   { id: 'cyalume',   label: 'サイリウム', price: 10,  emoji: '💡', desc: '次の攻撃1.5倍' },
  penlight:  { id: 'penlight',  label: 'ペンライト', price: 50,  emoji: '🎀', desc: '次の攻撃2倍' },
  superchat: { id: 'superchat', label: 'スパチャ',   price: 100, emoji: '💰', desc: '大ダメージ+回復' }
}

// ---- 効果音（WebAudio） ----
var audioCtx = null

function playSE(type) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    var t = audioCtx.currentTime
    var o = audioCtx.createOscillator()
    var g = audioCtx.createGain()
    o.connect(g)
    g.connect(audioCtx.destination)

    if (type === 'hit') {
      o.type = 'square'
      o.frequency.setValueAtTime(220, t)
      o.frequency.exponentialRampToValueAtTime(80, t + 0.15)
      g.gain.setValueAtTime(0.18, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    } else if (type === 'heal') {
      o.type = 'sine'
      o.frequency.setValueAtTime(440, t)
      o.frequency.exponentialRampToValueAtTime(880, t + 0.2)
      g.gain.setValueAtTime(0.12, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    } else if (type === 'chest') {
      o.type = 'triangle'
      ;[523, 659, 784].forEach(function (f, i) {
        o.frequency.setValueAtTime(f, t + i * 0.09)
      })
      g.gain.setValueAtTime(0.14, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    } else if (type === 'win') {
      o.type = 'triangle'
      ;[523, 659, 784, 1047].forEach(function (f, i) {
        o.frequency.setValueAtTime(f, t + i * 0.12)
      })
      g.gain.setValueAtTime(0.15, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    } else if (type === 'lose') {
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(300, t)
      o.frequency.exponentialRampToValueAtTime(100, t + 0.5)
      g.gain.setValueAtTime(0.12, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    }
    o.start(t)
    o.stop(t + 0.7)
  } catch (e) { /* 音声が使えない環境では無視 */ }
}

// ---- 視聴者数シミュレーション ----
function startViewerSim() {
  var viewers = 1200 + Math.floor(Math.random() * 300)
  setInterval(function () {
    viewers = Math.max(800, viewers + Math.floor(Math.random() * 41) - 20)
    var el = document.getElementById('viewer-count')
    if (el) el.textContent = '👁 ' + viewers.toLocaleString()
    var online = document.getElementById('chat-online')
    if (online) online.textContent = Math.max(viewers - 200, 300).toLocaleString()
  }, 2500)
}

// ---- チャット ----
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pushChat(text, opts) {
  var log = document.getElementById('chat-log')
  if (!log) return
  opts = opts || {}
  var msg = document.createElement('div')
  msg.className = 'chat-msg' + (opts.me ? ' me' : '')

  if (opts.super) {
    msg.className = 'chat-super'
    var top = document.createElement('div')
    top.className = 'chat-super-top'
    top.textContent = '💰 スーパーチャット ' + opts.amount + '通貨'
    var body = document.createElement('div')
    body.className = 'chat-super-body'
    body.textContent = text
    msg.appendChild(top)
    msg.appendChild(body)
  } else {
    var author = document.createElement('span')
    author.className = 'chat-author'
    author.style.color = opts.color || NAME_COLORS[Math.floor(Math.random() * NAME_COLORS.length)]
    author.textContent = opts.name || (opts.me ? user.name : pick(FAN_NAMES))
    var span = document.createElement('span')
    span.textContent = text
    msg.appendChild(author)
    msg.appendChild(span)
  }

  log.appendChild(msg)
  while (log.children.length > 120) log.removeChild(log.firstChild)
  log.scrollTop = log.scrollHeight
}

function pushReaction(key) {
  var pool = REACTIONS[key]
  if (pool) setTimeout(function () {
    pushChat(pick(pool), { name: pick(FAN_NAMES) })
  }, 250 + Math.random() * 350)
}

var commentFlow = null

function startCommentFlow() {
  if (commentFlow) return
  commentFlow = setInterval(function () {
    if (VIEW !== 'battle') return
    if (Math.random() < 0.2) {
      pushChat(pick(FAN_NAMES) + ' さんが ' + pick(['通貨を送った', 'スタンプを押した', '参戦した', '応援を送った']))
    } else {
      pushChat(pick(FAN_MSG_POOL))
    }
  }, 900 + Math.random() * 1400)
}

function stopCommentFlow() {
  if (commentFlow) {
    clearInterval(commentFlow)
    commentFlow = null
  }
}

// ---- ヘッダー更新 ----
function refreshHeader() {
  var cur = document.getElementById('header-currency')
  if (cur) cur.textContent = '💰 ' + gd.currency.toLocaleString()
}

// ---- ステージ描画 ----
function renderStage(html) {
  var view = document.getElementById('stage-view')
  if (view) view.innerHTML = html
}

function setStreamMeta(meta) {
  var el = document.getElementById('stream-meta')
  if (el) el.textContent = meta
}

function getRemainingTries() {
  return remainingDungeonTries(gd)
}

// ============================================================
// 選択画面
// ============================================================
function renderSelectView() {
  stopCommentFlow()
  VIEW = 'select'
  setStreamMeta('トラブル討伐ライブ')

  var attempts = getRemainingTries()

  var html = '<div class="stage-inner">';
  html += '<div class="stage-heading">挑戦するトラブルを選んでください<small>挑戦回数は1時間で ' + DUNGEON_LIMIT + ' 回まで（残り <b style="color:#ffd166">' + attempts + '</b> 回）</small></div>';
  html += '<div class="boss-grid">';

  DUNGEON_BOSSES.forEach(function (boss) {
    var reward = DUNGEON_REWARDS[boss.rank]
    var locked = gd.level < boss.reqLevel
    html += '<button class="boss-card" data-rank="' + boss.rank + '"' + (locked ? ' disabled' : '') + '>';
    html += '<div class="boss-card-emoji">' + boss.emoji + '</div>';
    html += '<div class="boss-card-name">★' + boss.rank + ' ' + boss.name + '</div>';
    html += '<div class="boss-card-desc">' + boss.desc + '</div>';
    html += '<div class="boss-card-meta">推奨Lv.' + boss.reqLevel + ' / 報酬 💰' + reward.currency + ' / EXP ' + reward.exp + ' / 📣' + reward.cheer + '</div>';
    if (locked) {
      html += '<div class="boss-card-lock">🔒 推奨 Lv.' + boss.reqLevel + ' 以上（現在 Lv.' + gd.level + '）</div>';
    }
    html += '</button>';
  });

  html += '</div>';

  // 挑戦タレント選択（最推し+推し優先）
  var talentIds = []
  if (user.ultimateOshi) talentIds.push(user.ultimateOshi)
  ;(user.favorites || []).forEach(function (id) {
    if (talentIds.indexOf(id) < 0) talentIds.push(id)
  })
  if (!talentIds.length) talentIds = Object.keys(DUNGEON_TALENTS)

  html += '<div class="stage-sub">挑戦するタレントを選択してください</div>';
  html += '<div class="talent-grid">';
  talentIds.forEach(function (id) {
    var t = DUNGEON_TALENTS[id]
    if (!t) return
    html += '<button class="talent-chip" data-talent="' + id + '">';
    html += talentImg(id, '');
    html += '<span>' + t.name + '</span>';
    html += '</button>';
  });
  html += '</div>';
  html += '</div>';

  renderStage(html)

  Array.prototype.forEach.call(document.querySelectorAll('.boss-card'), function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return
      bossRank = parseInt(btn.getAttribute('data-rank'), 10)
      var tEl = document.querySelector('.talent-chip.selected')
      if (!tEl) {
        alert('まずタレントを選択してください')
        return
      }
      talentId = tEl.getAttribute('data-talent')
      startBattle()
    })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.talent-chip'), function (chip) {
    chip.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.talent-chip'), function (c) {
        c.classList.remove('selected')
        c.style.borderColor = ''
      })
      chip.classList.add('selected')
      chip.style.borderColor = '#ff4d6d'
    })
  })

  var first = document.querySelector('.talent-chip')
  if (first) first.click()
}

// ============================================================
// バトル開始
// ============================================================
function startBattle() {
  var boss = dungeonBossByRank(bossRank)
  var talent = DUNGEON_TALENTS[talentId]
  if (!boss || !talent) return

  if (getRemainingTries() <= 0) {
    alert('挑戦回数の上限に達しました。1時間後にまた挑戦できます！')
    renderSelectView()
    return
  }

  recordDungeonTry(gd)
  saveGameData(gd)

  var stats = talentBattleStats(gd.level)

  state = {
    rank: bossRank,
    boss: boss,
    talent: talent,
    talentId: talentId,
    bossHp: boss.hp,
    talentHp: stats.maxHp,
    talentMaxHp: stats.maxHp,
    talentAtk: stats.atk,
    talentDef: stats.def,
    log: [],
    turns: 0,
    over: false,
    won: false,
    nextAtkMult: 1,
    guarding: false,
  }

  VIEW = 'battle'
  setStreamMeta('【' + talent.name + '】 が トラブル『' + boss.name + '』に挑戦！')
  renderBattle()
  pushTelop('配信開始！ ' + talent.name + ' が ' + boss.name + ' に挑む！！', 'good')
  pushChat('配信開始！ よろしくお願いします！', { me: true })
  pushChat('🎉 配信開始！', { name: pick(FAN_NAMES) })

  // BGM
  var bgm = document.getElementById('dungeon-bgm')
  if (bgm) {
    bgm.volume = 0.18
    var p = bgm.play()
    if (p) p.catch(function () { /* 自動再生制限時は無視 */ })
  }
}

function renderBattle() {
  var talent = state.talent
  var boss = state.boss
  var stats = talentBattleStats(gd.level)
  var buff = state.nextAtkMult > 1 ? ' <b style="color:#ffd166">⚡次の攻撃' + state.nextAtkMult + '倍</b>' : ''

  var html = '<div class="battle-wrap" id="battle-wrap">'
  html += '<div class="battle-stage" id="battle-stage">'
  html += '<div class="battle-floor"></div>'

  // タレント（立ち絵）
  html += '<div class="fighter">'
  html += '<div class="fighter-stand">' + talentImg(talentId, 'fighter-avatar') + '</div>'
  html += '<div class="fighter-name">' + talent.name + ' <span style="font-size:10px;color:#aaa">Lv.' + gd.level + '</span></div>'
  html += '<div class="hp-wrap"><div class="hp-fill talent-hp" id="hp-talent" style="width:' + (state.talentHp / state.talentMaxHp * 100) + '%"></div></div>'
  html += '<div class="hp-num">' + state.talentHp + ' / ' + state.talentMaxHp + '</div>'
  html += '<div class="fighter-stats">⚔️' + stats.atk + ' 🛡️' + stats.def + buff + '</div>'
  html += '</div>'

  html += '<div class="vs-divider">VS</div>'

  // ボス（像）
  html += '<div class="fighter boss">'
  html += '<div class="boss-stand"><span class="boss-emoji">' + boss.emoji + '</span></div>'
  html += '<div class="fighter-name">★' + state.rank + ' ' + boss.name + '</div>'
  html += '<div class="hp-wrap"><div class="hp-fill boss-hp" id="hp-boss" style="width:' + (state.bossHp / boss.hp * 100) + '%"></div></div>'
  html += '<div class="hp-num">' + state.bossHp + ' / ' + boss.hp + '</div>'
  html += '<div class="fighter-stats">⚔️' + boss.atk + ' 🛡️' + boss.def + '</div>'
  html += '</div>'

  html += '</div>'

  // ターン表示
  html += '<div class="turn-banner" id="turn-banner">ターン ' + (state.turns + 1) + ' — <b>' + talent.name + '</b> のターン</div>'

  // テロップ
  html += '<div class="telop-log" id="telop-log"></div>'

  // コマンド
  html += '<div class="command-bar">'
  html += '<button class="cmd-btn" id="cmd-attack">⚔️ 攻撃</button>'
  html += '<button class="cmd-btn" id="cmd-guard">🛡️ 防御</button>'
  html += '<button class="cmd-btn" id="cmd-heal">💊 回復</button>'
  html += '<button class="cmd-btn" id="cmd-chest">📦 宝箱</button>'
  html += '</div>'

  // ギフト
  html += '<div class="gift-bar">'
  html += '<button class="gift-btn gift-cyalume" data-gift="cyalume">💡 サイリウム <small>10通貨 / 次の攻撃1.5倍</small></button>'
  html += '<button class="gift-btn gift-penlight" data-gift="penlight">🎀 ペンライト <small>50通貨 / 次の攻撃2倍</small></button>'
  html += '<button class="gift-btn gift-super" data-gift="superchat">💰 スパチャ <small>100通貨 / 大ダメージ+回復</small></button>'
  html += '</div>'

  html += '</div>'

  renderStage(html)
  refreshGiftButtons()

  document.getElementById('cmd-attack').addEventListener('click', function () { doCommand('attack') })
  document.getElementById('cmd-guard').addEventListener('click', function () { doCommand('guard') })
  document.getElementById('cmd-heal').addEventListener('click', function () { doCommand('heal') })
  document.getElementById('cmd-chest').addEventListener('click', function () { doCommand('chest') })

  Array.prototype.forEach.call(document.querySelectorAll('.gift-btn'), function (btn) {
    btn.addEventListener('click', function () { doGift(btn.getAttribute('data-gift')) })
  })
}

function refreshGiftButtons() {
  Array.prototype.forEach.call(document.querySelectorAll('.gift-btn'), function (btn) {
    var g = GIFTS[btn.getAttribute('data-gift')]
    btn.disabled = gd.currency < g.price
  })
}

// ---- テロップ ----
function pushTelop(text, cls) {
  state.log.push({ text: text, cls: cls || '' })
  if (state.log.length > 6) state.log.shift()
  var el = document.getElementById('telop-log')
  if (!el) return
  el.innerHTML = ''
  state.log.forEach(function (l) {
    var div = document.createElement('div')
    div.className = 'telop-line ' + l.cls
    div.textContent = l.text
    el.appendChild(div)
  })
  el.scrollTop = el.scrollHeight
}

// ---- ダメージポップ ----
function dmgPop(target, amount, heal) {
  var stage = document.getElementById('battle-stage')
  if (!stage) return
  var pop = document.createElement('div')
  pop.className = 'dmg-pop' + (heal ? ' heal' : '')
  pop.textContent = heal ? '+' + amount : '-' + amount
  pop.style.left = (target === 'talent' ? '14%' : '76%')
  pop.style.top = '38%'
  stage.appendChild(pop)
  setTimeout(function () { pop.remove() }, 900)
}

// ---- 攻撃演出 ----
function shakeStage() {
  var stage = document.getElementById('battle-stage')
  if (!stage) return
  stage.classList.remove('shake')
  void stage.offsetWidth
  stage.classList.add('shake')
}

function updateHp() {
  var thp = document.getElementById('hp-talent')
  var bhp = document.getElementById('hp-boss')
  if (thp) thp.style.width = Math.max(0, state.talentHp / state.talentMaxHp * 100) + '%'
  if (bhp) bhp.style.width = Math.max(0, state.bossHp / state.boss.hp * 100) + '%'
  var talentNum = document.querySelector('.fighter .hp-num')
  var bossNum = document.querySelector('.fighter.boss .hp-num')
  if (talentNum) talentNum.textContent = Math.max(0, state.talentHp) + ' / ' + state.talentMaxHp
  if (bossNum) bossNum.textContent = Math.max(0, state.bossHp) + ' / ' + state.boss.hp
}

// ---- ターン進行 ----
function finishTurn() {
  if (state.over) return
  state.turns++
  if (state.turns >= 30) {
    endBattle(false, true)
    return
  }
  var banner = document.getElementById('turn-banner')
  if (banner) banner.innerHTML = 'ターン ' + (state.turns + 1) + ' — <b>' + state.talent.name + '</b> のターン'
}

// ---- コマンド ----
function doCommand(type) {
  if (state.over || VIEW !== 'battle') return

  var stats = talentBattleStats(gd.level)
  var dmg

  if (type === 'attack') {
    dmg = Math.max(1, Math.round((stats.atk * state.nextAtkMult + dungeonRand(-2, 2)) - state.boss.def))
    state.nextAtkMult = 1
    state.bossHp -= dmg
    pushTelop(state.talent.name + ' の攻撃！ ' + state.boss.name + ' に ' + dmg + ' ダメージ！', 'good')
    dmgPop('boss', dmg, false)
    playSE('hit')
    if (dmg >= stats.atk * 1.5) pushReaction('attackCrit')
    else pushReaction('attack')
  } else if (type === 'guard') {
    pushTelop(state.talent.name + ' は身を守った！（次の被ダメ半減）', 'good')
    state.guarding = true
    pushReaction('guard')
  } else if (type === 'heal') {
    var heal = Math.round(state.talentMaxHp * 0.25)
    state.talentHp = Math.min(state.talentMaxHp, state.talentHp + heal)
    pushTelop(state.talent.name + ' は ' + heal + ' 回復した！', 'good')
    dmgPop('talent', heal, true)
    playSE('heal')
    pushReaction('heal')
  } else if (type === 'chest') {
    if (Math.random() < 0.6) {
      dmg = Math.max(1, Math.round(state.talentAtk * 1.8) - state.boss.def)
      state.bossHp -= dmg
      pushTelop('宝箱から ひかりが！ ' + state.boss.name + ' に ' + dmg + ' ダメージ！', 'super')
      dmgPop('boss', dmg, false)
      playSE('chest')
      pushReaction('chest')
    } else {
      pushTelop('宝箱は トラップだった！ 反撃を受けた！', 'danger')
      var back = Math.max(1, Math.round(state.boss.atk * 1.3 * (state.guarding ? 0.5 : 1)))
      state.talentHp -= back
      dmgPop('talent', back, false)
      shakeStage()
      playSE('hit')
      pushReaction('chestFail')
    }
    state.guarding = false
  }

  updateHp()

  if (state.bossHp <= 0) {
    state.bossHp = 0
    updateHp()
    endBattle(true)
    return
  }

  bossTurn()
}

function bossTurn() {
  if (state.over) return
  var boss = state.boss
  var dmg = Math.max(1, Math.round((boss.atk + dungeonRand(-1, 1) - state.talentDef) * (state.guarding ? 0.5 : 1)))
  state.guarding = false
  state.talentHp -= dmg
  pushTelop(boss.name + ' の攻撃！ ' + state.talent.name + ' は ' + dmg + ' ダメージ！', 'danger')
  dmgPop('talent', dmg, false)
  shakeStage()
  playSE('hit')
  updateHp()
  pushReaction('bossAtk')

  if (state.talentHp <= 0) {
    state.talentHp = 0
    updateHp()
    endBattle(false)
    return
  }
  finishTurn()
}

// ---- ギフト（通貨消費・ターン消費） ----
function doGift(id) {
  if (state.over || VIEW !== 'battle') return
  var g = GIFTS[id]
  if (gd.currency < g.price) {
    pushTelop('通貨が足りません！', 'danger')
    return
  }
  gd.currency -= g.price
  saveGameData(gd)
  refreshHeader()
  refreshGiftButtons()

  var stats = talentBattleStats(gd.level)

  if (id === 'cyalume') {
    state.nextAtkMult = Math.max(state.nextAtkMult, 1.5)
    pushTelop('💡 サイリウムが投げ込まれた！ 次の攻撃 1.5倍！', 'super')
    pushChat('ミリリスA さんが サイリウム を送りました！', { super: true, amount: g.price })
    playSE('heal')
    pushReaction('giftCyalume')
  } else if (id === 'penlight') {
    state.nextAtkMult = Math.max(state.nextAtkMult, 2)
    pushTelop('🎀 ペンライトが振られた！ 次の攻撃 2倍！', 'super')
    pushChat('みるくてぃ さんが ペンライト を送りました！', { super: true, amount: g.price })
    playSE('heal')
    pushReaction('giftPenlight')
  } else if (id === 'superchat') {
    var dmg = Math.max(1, Math.round(stats.atk * 2) - state.boss.def)
    var heal = Math.round(state.talentMaxHp * 0.2)
    state.bossHp -= dmg
    state.talentHp = Math.min(state.talentMaxHp, state.talentHp + heal)
    pushTelop('💰 スパチャの一撃！ ' + state.boss.name + ' に ' + dmg + ' ダメージ！ ' + state.talent.name + ' は ' + heal + ' 回復！', 'super')
    pushChat('こんぺいとう さんが スパチャ を送りました！「ナイスバトル！！」', { super: true, amount: g.price })
    dmgPop('boss', dmg, false)
    dmgPop('talent', heal, true)
    playSE('chest')
    pushReaction('superchat')
    updateHp()

    if (state.bossHp <= 0) {
      state.bossHp = 0
      updateHp()
      endBattle(true)
      return
    }
  }

  bossTurn()
}

// ---- バトル終了 ----
function endBattle(won, timeout) {
  if (state.over) return
  state.over = true
  state.won = won
  state.timeout = !!timeout
  VIEW = 'result'

  var bgm = document.getElementById('dungeon-bgm')
  if (bgm) bgm.pause()

  state.reward = applyRewards()

  if (won) {
    pushReaction('win')
    pushChat('クリアおめでとう！！！', { name: pick(FAN_NAMES) })
    playSE('win')
  } else {
    pushReaction('lose')
    pushChat('おつかれさまでした…！', { name: pick(FAN_NAMES) })
    playSE('lose')
  }

  setTimeout(function () { renderResult() }, 1200)
}

// ---- 報酬適用（gameData.js の関数を使用） ----
function applyRewards() {
  var reward = dungeonReward(state.rank, state.won)

  gd.currency += reward.currency
  var lv = addExp(gd, reward.exp)
  gd.points.cheer += reward.cheer
  if (state.won) gd.stats.dungeonClears++
  saveGameData(gd)
  refreshHeader()

  reward.leveledUp = lv.leveledUp
  reward.newLevel = lv.newLevel
  return reward
}

function renderResult() {
  var won = state.won
  var boss = state.boss
  var reward = state.reward
  var attempts = getRemainingTries()

  var html = '<div class="result-wrap">'
  html += '<div class="result-icon">' + (won ? '🎉' : '😭') + '</div>'
  html += '<div class="result-title ' + (won ? 'win' : 'lose') + '">' + (state.timeout ? '配信時間切れ…' : (won ? '配信大成功！' : '配信終了…')) + '</div>'
  html += '<div class="result-sub">' + state.talent.name + ' × トラブル『' + boss.name + '』 — ' + (won ? 'クリア！' : '敗北…') + '</div>'

  html += '<div class="result-box">'
  if (reward.currency > 0) html += '<div class="result-row"><span>💰 ゲーム内通貨</span><span>+' + reward.currency + '</span></div>'
  if (reward.exp > 0) html += '<div class="result-row"><span>⭐ 経験値</span><span>+' + reward.exp + '</span></div>'
  if (reward.cheer > 0) html += '<div class="result-row"><span>📣 応援力</span><span>+' + reward.cheer + '</span></div>'
  if (reward.leveledUp) {
    html += '<div class="result-levelup">🎊 レベルアップ！ 現在 Lv.' + reward.newLevel + '</div>'
  }
  html += '</div>'

  html += '<div class="attempt-note">挑戦可能回数：あと <b>' + attempts + '</b> 回（1時間 ' + DUNGEON_LIMIT + ' 回まで）</div>'

  html += '<div class="result-actions">'
  html += '<button class="result-btn green" id="retry-btn">⚔️ もう一度挑戦</button>'
  html += '<button class="result-btn secondary" id="select-btn">トラブルを選び直す</button>'
  html += '<button class="result-btn secondary" id="home-btn">メイン画面へ戻る</button>'
  html += '</div>'

  html += '</div>'
  renderStage(html)

  document.getElementById('retry-btn').addEventListener('click', function () {
    if (getRemainingTries() <= 0) {
      alert('挑戦回数の上限に達しました。1時間後にまた挑戦できます！')
      renderSelectView()
      return
    }
    startBattle()
  })
  document.getElementById('select-btn').addEventListener('click', renderSelectView)
  document.getElementById('home-btn').addEventListener('click', closeDungeon)
}

// ---- 戻る ----
function bindBack() {
  var back = document.getElementById('btn-back')
  if (back) back.addEventListener('click', closeDungeon)
}

function closeDungeon() {
  stopCommentFlow()
  var bgm = document.getElementById('dungeon-bgm')
  if (bgm) bgm.pause()
  if (window.opener) {
    window.close()
  } else {
    location.href = 'index.html'
  }
}

// ---- チャット送信 ----
function bindChat() {
  var input = document.getElementById('chat-input')
  var send = document.getElementById('chat-send')
  if (!input || !send) return
  function submit() {
    var text = input.value.trim()
    if (!text) return
    pushChat(text, { me: true })
    input.value = ''
    input.focus()
  }
  send.addEventListener('click', submit)
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submit()
  })
}

// ============================================================
// 初期化
// ============================================================
function initDungeon() {
  refreshHeader()
  renderSelectView()
  bindBack()
  bindChat()
  startViewerSim()
  startCommentFlow()
}

initDungeon()
