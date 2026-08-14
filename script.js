// BGM
;(function () {
  const bgm = document.getElementById('title-bgm')
  if (!bgm) return
  applyVolume(getSettings().volume)

  window._bgmTimer = null
  window._bgmStopped = false
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  function onInteraction() {
    if (window._bgmStopped) return
    if (window._bgmTimer) return
    if (!bgm.paused) return
    if (isMobile) {
      bgm.play().catch(() => {})
    } else {
      window._bgmTimer = setTimeout(() => {
        if (window._bgmStopped) return
        applyVolume(getSettings().volume)
        bgm.play().catch(() => {})
      }, 2000)
    }
    document.removeEventListener('touchstart', onInteraction)
    document.removeEventListener('mousedown', onInteraction)
  }

  document.addEventListener('touchstart', onInteraction)
  document.addEventListener('mousedown', onInteraction)

  bgm.play().then(onInteraction).catch(() => {})
})()

// BGM停止
function stopBgm() {
  const bgm = document.getElementById('title-bgm')
  if (!bgm) return
  window._bgmStopped = true
  if (window._bgmTimer) {
    clearTimeout(window._bgmTimer)
    window._bgmTimer = null
  }
  if (bgm.paused) return
  bgm.pause()
  bgm.currentTime = 0
}

// パーティクル生成
;(function () {
  const titleScreen = document.getElementById('title-screen')
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div')
    p.className = 'particle'
    p.style.setProperty('--p-size', (1.5 + Math.random() * 3.5) + 'px')
    p.style.setProperty('--p-x', Math.random() * 100 + '%')
    p.style.setProperty('--p-duration', (5 + Math.random() * 7) + 's')
    p.style.setProperty('--p-delay', Math.random() * 6 + 's')
    p.style.setProperty('--p-opacity', (0.25 + Math.random() * 0.25))
    p.style.setProperty('--p-drift', (-40 + Math.random() * 80) + 'px')
    titleScreen.appendChild(p)
  }
})()

// 端末に応じてキャプション切替
;(function () {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const el = document.getElementById('caption-start')
  if (el) el.textContent = isMobile ? 'タップして開始' : 'クリックして開始'
})()

// ポップアップ制御
function openPopup(id) {
  document.getElementById(id).classList.remove('hidden')
}

function closePopup() {
  document.querySelectorAll('.popup-overlay:not(.hidden)').forEach(el => {
    el.classList.add('hidden')
  })
}

document.querySelectorAll('.popup-close-btn').forEach(btn => {
  btn.addEventListener('click', closePopup)
})

document.querySelectorAll('.popup-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup()
  })
})

// 情報 / 設定ボタン
document.getElementById('btn-info').addEventListener('click', (e) => {
  e.stopPropagation()
  openPopup('popup-info')
})

document.getElementById('btn-setting').addEventListener('click', (e) => {
  e.stopPropagation()
  openPopup('popup-setting')
})

// タイトル → ホーム（トランジション付き）
document.getElementById('title-screen').addEventListener('click', () => {
  var _s = getSettings()
  if (_s.seEnabled) {
    var se = document.getElementById('tap-se')
    if (se) {
      se.currentTime = 0
      se.play().catch(function () {})
    }
  }

  stopBgm()

  const overlay = document.getElementById('transition-overlay')
  const loading = document.getElementById('loading')

  overlay.classList.remove('hidden')
  requestAnimationFrame(() => {
    overlay.style.opacity = '1'
  })

  setTimeout(() => {
    overlay.classList.add('dark')

    setTimeout(() => {
      loading.classList.remove('hidden')

      setTimeout(() => {
        loading.classList.add('hidden')
        overlay.classList.add('hidden')
        overlay.classList.remove('dark')
        overlay.style.opacity = '0'
        document.getElementById('title-screen').classList.add('hidden')

        const _userData = loadUserData()
        if (_userData) {
          showHomeScreen(_userData)
        } else {
          document.getElementById('setup-screen').classList.remove('hidden')
          initWizard()
        }
      }, 1200)
    }, 400)
  }, 1200)
})

// ============================================================
// プレイヤー設定ウィザード
// ============================================================
const STORAGE_KEY = 'millipro_userdata'

const TALENTS = {
  konomi: { name: '甘狼このみ', group: null },
  nono: { name: '音ノ乃のの', group: null },
  akubi: { name: 'あくび・でもんすぺーど', group: null },
  rako: { name: '音ノ瀬らこ', group: 'nova' },
  yura: { name: 'ゆらぎゆら', group: 'nova' },
  koma: { name: '小廻こま', group: null },
  rizu: { name: '雨夜リズ', group: 'uni' },
  tukuri: { name: '眠雲ツクリ', group: 'uni' },
  nuhu: { name: '虹深°ぬふ', group: 'nova' },
  rei: { name: '夕霧レイ', group: 'uni' },
}

const GROUP_TALENTS = {
  nova: ['rako', 'yura', 'nuhu'],
  uni: ['rizu', 'tukuri', 'rei'],
  all: Object.keys(TALENTS),
}

function loadUserData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveUserData(data) {
  data.updatedAt = Date.now()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function talentLogoPath(id) {
  return id === 'rei' ? 'images/rogo/reirogo.webp' : 'images/rogo/' + id + 'rogo.png'
}

// ============================================================
// システム設定 (音量・効果音・BGM)
// ============================================================
var SETTINGS_KEY = 'millipro_settings'

function loadSettings() {
  try {
    var raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function defaultSettings() {
  return { volume: 70, seEnabled: true, bgmEnabled: true }
}

function getSettings() {
  return loadSettings() || defaultSettings()
}

function applyVolume(vol) {
  var bgm = document.getElementById('title-bgm')
  if (bgm) bgm.volume = (vol / 100) * 0.7
}

function applySettingsToBgm() {
  var s = getSettings()
  applyVolume(s.volume)
  var bgm = document.getElementById('title-bgm')
  var titleScreen = document.getElementById('title-screen')
  if (!bgm) return
  if (s.bgmEnabled) {
    if (titleScreen && !titleScreen.classList.contains('hidden')) {
      bgm.play().catch(function () {})
    }
  } else {
    bgm.pause()
  }
}

let wizardState = {
  playerName: '',
  ultimateOshi: null,
  favorites: [],
  comment: '',
  currentPage: 0,
}

function initWizard() {
  wizardState = {
    playerName: '',
    ultimateOshi: null,
    favorites: [],
    comment: '',
    currentPage: 0,
  }
  document.getElementById('input-name').value = ''
  document.getElementById('input-comment').value = ''
  renderUltimateCarousel()
  renderFavoriteCards()
  showWizardPage(0)
}

function renderUltimateCarousel() {
  var track = document.getElementById('ultimate-carousel-track')
  var dots = document.getElementById('ultimate-carousel-dots')
  track.innerHTML = ''
  dots.innerHTML = ''

  var talentIds = Object.keys(TALENTS)
  var startId = wizardState.ultimateOshi || talentIds[0]

  talentIds.forEach(function (id) {
    var t = TALENTS[id]
    var card = document.createElement('div')
    card.className = 'carousel-card'
    var portraitDiv = document.createElement('div')
    portraitDiv.className = 'carousel-card-portrait'
    var portraitImg = document.createElement('img')
    portraitImg.src = 'images/talents/' + id + '.webp'
    portraitImg.alt = t.name
    portraitImg.loading = 'lazy'
    portraitDiv.appendChild(portraitImg)
    var logoDiv = document.createElement('div')
    logoDiv.className = 'carousel-card-logo'
    var logoImg = document.createElement('img')
    logoImg.src = talentLogoPath(id)
    logoImg.alt = t.name
    logoImg.loading = 'lazy'
    logoDiv.appendChild(logoImg)
    var nameSpan = document.createElement('span')
    nameSpan.className = 'carousel-card-name'
    nameSpan.textContent = t.name
    card.appendChild(portraitDiv)
    card.appendChild(logoDiv)
    card.appendChild(nameSpan)
    track.appendChild(card)

    var dot = document.createElement('div')
    dot.className = 'carousel-dot'
    dot.addEventListener('click', function () {
      goToSlide(parseInt(dot.dataset.index))
    })
    dots.appendChild(dot)
  })

  var startIndex = talentIds.indexOf(startId)
  if (startIndex < 0) startIndex = 0

  wizardState.carouselIndex = startIndex
  wizardState.ultimateOshi = talentIds[startIndex]
  goToSlide(startIndex)
}

function goToSlide(index) {
  var track = document.getElementById('ultimate-carousel-track')
  var talentIds = Object.keys(TALENTS)
  var clamped = Math.max(0, Math.min(index, talentIds.length - 1))

  track.style.transform = 'translateX(-' + (clamped * 100) + '%)'

  var dots = document.querySelectorAll('.carousel-dot')
  dots.forEach(function (d, i) {
    d.classList.toggle('active', i === clamped)
    d.dataset.index = i
  })

  wizardState.carouselIndex = clamped
  wizardState.ultimateOshi = talentIds[clamped]
}

function nextSlide() {
  goToSlide(wizardState.carouselIndex + 1)
}

function prevSlide() {
  goToSlide(wizardState.carouselIndex - 1)
}

function renderFavoriteCards() {
  const container = document.getElementById('favorites-list')
  container.innerHTML = ''
  Object.entries(TALENTS).forEach(function (_ref) {
    var id = _ref[0], t = _ref[1]
    var card = document.createElement('div')
    card.className = 'talent-card'
    card.dataset.id = id
    var portraitDiv = document.createElement('div')
    portraitDiv.className = 'talent-card-portrait'
    var portraitImg = document.createElement('img')
    portraitImg.src = 'images/talents/' + id + '.webp'
    portraitImg.alt = t.name
    portraitImg.loading = 'lazy'
    portraitDiv.appendChild(portraitImg)
    var logoDiv = document.createElement('div')
    logoDiv.className = 'talent-card-logo'
    var logoImg = document.createElement('img')
    logoImg.src = talentLogoPath(id)
    logoImg.alt = t.name
    logoImg.loading = 'lazy'
    logoDiv.appendChild(logoImg)
    var nameSpan = document.createElement('span')
    nameSpan.className = 'talent-card-name'
    nameSpan.textContent = t.name
    card.appendChild(portraitDiv)
    card.appendChild(logoDiv)
    card.appendChild(nameSpan)
    card.addEventListener('click', function () { toggleFavorite(id) })
    container.appendChild(card)
  })
}

function toggleFavorite(id) {
  var idx = wizardState.favorites.indexOf(id)
  if (idx >= 0) {
    wizardState.favorites.splice(idx, 1)
  } else {
    wizardState.favorites.push(id)
  }
  document.querySelectorAll('#favorites-list .talent-card').forEach(function (c) {
    c.classList.toggle('selected', wizardState.favorites.indexOf(c.dataset.id) >= 0)
  })
  updateFavoritesCount()
  updateGroupButtons()
}

function toggleGroup(group) {
  var members = GROUP_TALENTS[group]
  var allSelected = members.every(function (m) { return wizardState.favorites.indexOf(m) >= 0 })

  if (allSelected) {
    wizardState.favorites = wizardState.favorites.filter(function (m) { return members.indexOf(m) < 0 })
  } else {
    members.forEach(function (m) {
      if (wizardState.favorites.indexOf(m) < 0) wizardState.favorites.push(m)
    })
  }

  document.querySelectorAll('#favorites-list .talent-card').forEach(function (c) {
    c.classList.toggle('selected', wizardState.favorites.indexOf(c.dataset.id) >= 0)
  })
  updateFavoritesCount()
  updateGroupButtons()
}

function updateFavoritesCount() {
  document.getElementById('favorites-count').textContent = wizardState.favorites.length + ' / 10人 選択中'
}

function updateGroupButtons() {
  document.querySelectorAll('.group-btn').forEach(function (btn) {
    var group = btn.dataset.group
    var members = GROUP_TALENTS[group]
    var allSelected = members.every(function (m) { return wizardState.favorites.indexOf(m) >= 0 })
    btn.classList.toggle('active', allSelected)
  })
}

function showWizardPage(index) {
  var pages = document.querySelectorAll('.setup-page')
  pages.forEach(function (p, i) { p.classList.toggle('hidden', i !== index) })
  wizardState.currentPage = index

  var fill = document.querySelector('.setup-progress-fill')
  if (fill) fill.style.width = ((index + 1) / 5 * 100) + '%'

  var step = document.querySelector('.setup-step')
  if (step) step.textContent = (index + 1) + ' / 5'

  if (index === 4) updateConfirmPage()

  if (index === 1) {
    var talentIds = Object.keys(TALENTS)
    var currentId = wizardState.ultimateOshi
    var restoreIndex = currentId ? talentIds.indexOf(currentId) : 0
    if (restoreIndex < 0) restoreIndex = 0
    goToSlide(restoreIndex)
  }

  var container = document.querySelector('.setup-pages')
  if (container) container.scrollTop = 0
}

function updateConfirmPage() {
  document.getElementById('confirm-name').textContent = wizardState.playerName
  document.getElementById('confirm-comment').textContent = wizardState.comment || '（未入力）'

  function makeCard(id) {
    var t = TALENTS[id]
    var card = document.createElement('div')
    card.className = 'confirm-card'
    card.innerHTML =
      '<div class="confirm-card-portrait"><img src="images/talents/' + id + '.webp" alt="' + t.name + '" loading="lazy"></div>' +
      '<div class="confirm-card-logo"><img src="' + talentLogoPath(id) + '" alt="' + t.name + '" loading="lazy"></div>'
    return card
  }

  var utScroll = document.getElementById('confirm-ultimate-scroll')
  utScroll.innerHTML = ''
  if (wizardState.ultimateOshi) {
    utScroll.appendChild(makeCard(wizardState.ultimateOshi))
  }

  var favScroll = document.getElementById('confirm-favorites-scroll')
  favScroll.innerHTML = ''
  wizardState.favorites.forEach(function (id) {
    favScroll.appendChild(makeCard(id))
  })
}

function nextPage() {
  var page = wizardState.currentPage

  if (page === 0) {
    var name = document.getElementById('input-name').value.trim()
    if (!name) {
      document.getElementById('name-error').classList.remove('hidden')
      return
    }
    document.getElementById('name-error').classList.add('hidden')
    wizardState.playerName = name
  }

  if (page === 3) {
    wizardState.comment = document.getElementById('input-comment').value
  }

  showWizardPage(page + 1)
}

function prevPage() {
  if (wizardState.currentPage === 0) return
  showWizardPage(wizardState.currentPage - 1)
}

function confirmSetup() {
  var data = {
    playerName: wizardState.playerName,
    playerId: crypto.randomUUID(),
    firebaseUid: null,
    ultimateOshi: wizardState.ultimateOshi,
    favorites: wizardState.favorites,
    profileComment: wizardState.comment,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  saveUserData(data)
  ensureGameData()

  var confirmCard = document.querySelector('.setup-page[data-page="4"] .setup-page-inner')
  confirmCard.innerHTML =
    '<div class="setup-success">' +
      '<div class="setup-success-icon">✓</div>' +
      '<h2>設定完了！</h2>' +
      '<p>ようこそ、' + data.playerName + ' さん</p>' +
      '<p class="setup-success-sub">これから一緒にミリプロの世界を楽しみましょう！</p>' +
    '</div>'
  document.querySelector('.setup-page[data-page="4"] .setup-footer').classList.add('hidden')

  setTimeout(function () {
    document.getElementById('setup-screen').classList.add('hidden')
    showHomeScreen(data)
  }, 2000)
}

function showHomeScreen(data) {
  if (data) {
    document.getElementById('pc-user-name').textContent = data.playerName
    document.getElementById('pc-user-id').textContent = 'ID: ' + data.playerId
    var avatar = document.getElementById('pc-user-avatar')
    if (avatar) avatar.textContent = data.playerName.charAt(0)
  }
  document.getElementById('home-screen').classList.remove('hidden')

  ensureGameData()
  var statusBar = document.getElementById('player-status-bar')
  if (statusBar) statusBar.classList.remove('hidden')
  refreshPlayerStatus()

  // 外部連携報酬の自動同期（config 設定済みのときだけ動作）
  syncExternalRewards().catch(function () {})

  // スマホは最初に真ん中（スマホ）の位置にスクロール
  if (window.innerWidth < 768) {
    var deskSection = document.querySelector('.room-desk')
    if (deskSection) deskSection.scrollIntoView({ behavior: 'auto', inline: 'start' })
  }
}

// ============================================================
// プレイヤーステータス表示（Lv・通貨・EXP・ポイント）
// ============================================================

// 上位職判定（企画書 §20）
function getUpperJobTitle(gd) {
  var unlocked = Object.keys(JOB_DEFS).filter(function (id) {
    return gd.jobs[id] && gd.jobs[id].unlocked
  })
  function has() {
    var ids = Array.prototype.slice.call(arguments)
    return ids.every(function (id) { return unlocked.indexOf(id) >= 0 })
  }
  if (has('illustrator', 'editor') || has('mix', 'editor')) return 'マルチクリエイター'
  if (has('cheerleader', 'reporter')) return '古参勢'
  if (has('cheerleader', 'fansite')) return 'コミュニティリーダー'
  if (has('itabag', 'cheerleader')) return 'スーパーオタク'
  return unlocked.length ? JOB_DEFS[unlocked[0]].name : 'ミリリス'
}

function expProgressPct(gd) {
  var need = expNeededToNext(gd.level)
  return need > 0 ? Math.min(100, Math.round((gd.exp / need) * 100)) : 100
}

// ステータスバー（ホーム画面上部）を更新
function refreshPlayerStatus() {
  var user = loadUserData()
  var gd = loadGameData()
  if (!user) return

  var avatar = document.getElementById('status-avatar')
  if (avatar) avatar.textContent = user.playerName.charAt(0)

  var nameEl = document.getElementById('status-name')
  if (nameEl) nameEl.textContent = user.playerName

  var lvEl = document.getElementById('status-lv')
  if (lvEl) lvEl.textContent = 'Lv.' + gd.level

  var curEl = document.getElementById('status-currency')
  if (curEl) curEl.textContent = '💰 ' + gd.currency

  var fill = document.getElementById('status-exp-fill')
  if (fill) fill.style.width = expProgressPct(gd) + '%'

  var label = document.getElementById('status-exp-label')
  if (label) {
    var need = expNeededToNext(gd.level)
    label.textContent = need > 0 ? gd.exp + ' / ' + need : 'MAX'
  }

  // PCデスクトップのユーザー情報にもレベルを反映
  var idEl = document.getElementById('pc-user-id')
  if (idEl) idEl.textContent = 'ID: ' + user.playerId + ' ・ Lv.' + gd.level

  var namePc = document.getElementById('pc-user-name')
  if (namePc) namePc.textContent = user.playerName
}

// プレイヤーカード（ポップアップ）を描画
function renderPlayerCard() {
  var user = loadUserData()
  var gd = loadGameData()
  var body = document.getElementById('player-card-body')
  if (!body || !user) return

  var title = getUpperJobTitle(gd)
  var need = expNeededToNext(gd.level)
  var stage = OFFICE_STAGES[gd.office.stage - 1]
  var nextStage = OFFICE_STAGES[gd.office.stage]

  var unlockedJobs = Object.keys(JOB_DEFS).filter(function (id) {
    return gd.jobs[id] && gd.jobs[id].unlocked
  })

  var pointsHtml = POINT_KEYS.map(function (k) {
    return '<span class="pt-chip">' + POINT_EMOJI[k] + ' ' + POINT_NAMES[k] + ' ' + gd.points[k] + '</span>'
  }).join('')

  var jobsHtml = unlockedJobs.length
    ? unlockedJobs.map(function (id) {
        return '<span class="pt-chip">' + JOB_DEFS[id].emoji + ' ' + JOB_DEFS[id].name + '</span>'
      }).join('')
    : '<div class="player-card-note">未解放（基本Lv5以上になると解放条件を確認できます）</div>'

  body.innerHTML =
    '<div class="player-card-head">' +
      '<div class="player-card-avatar">' + user.playerName.charAt(0) + '</div>' +
      '<div>' +
        '<div class="player-card-name">' + user.playerName + '</div>' +
        '<div class="player-card-title">' + title + '</div>' +
        '<div class="player-card-id">ID: ' + user.playerId + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="player-card-section-title">ステータス</div>' +
    '<div class="player-card-row"><span>レベル</span><span>Lv.' + gd.level + '</span></div>' +
    '<div class="exp-bar"><div class="exp-bar-fill" style="width:' + expProgressPct(gd) + '%"></div></div>' +
    '<div class="exp-label">' + (need > 0 ? 'EXP ' + gd.exp + ' / ' + need : 'EXP MAX') + '</div>' +
    '<div class="player-card-row"><span>ゲーム内通貨</span><span>💰 ' + gd.currency + '</span></div>' +

    '<div class="player-card-section-title">ポイント</div>' +
    '<div class="player-card-pts">' + pointsHtml + '</div>' +

    '<div class="player-card-section-title">事務所</div>' +
    '<div class="player-card-row"><span>段階</span><span>' + (stage ? stage.name : '?') + '</span></div>' +
    '<div class="player-card-row"><span>次段階</span><span>' + (nextStage ? nextStage.name + '（応援力 ' + nextStage.cost + '）' : 'MAX') + '</span></div>' +

    '<div class="player-card-section-title">ジョブ</div>' +
    '<div class="player-card-pts">' + jobsHtml + '</div>'
}

// 他の機能からも呼べるようにグローバル公開
window.refreshPlayerStatus = refreshPlayerStatus

// 配信ダンジョン（dungeon.html）で報酬が加算されたら状態を更新
window.addEventListener('storage', function (e) {
  if (e.key === GAME_DATA_KEY) refreshPlayerStatus()
})

// ============================================================
// 事務所（§10: 段階制・応援力で拡張・施設解放）
// ============================================================

// 施設の絵文字（OFFICE_FACILITY_NAMES と対応）
var OFFICE_FACILITY_EMOJI = {
  streamRoom: '📡',
  recordBooth: '🎙️',
  meetingRoom: '🗂️',
  archiveRoom: '📚',
  eventHall: '🏟️',
  dreamFacility: '🌌',
}

// 事務所の建物イラスト（段階ごとの絵文字+雰囲気文言）
var OFFICE_STAGE_VISUALS = [
  { emoji: '🏠', note: 'こじんまりした始まりの事務所' },
  { emoji: '🏢', note: '窓が増えて少し広くなった！' },
  { emoji: '🏬', note: '看板が目立つ中規模オフィス' },
  { emoji: '🎙️', note: '防音スタジオ完備の本格事務所' },
  { emoji: '🏟️', note: 'イベントが開ける立派なホール' },
  { emoji: '🌌', note: 'ミリプロの夢が詰まった大型施設' },
]

// ミリメンの状態（事務所にいるタレントの様子）
var OFFICE_MEMBER_STATES = [
  '配信準備中 📡',
  '収録中 🎧',
  '休憩中 ☕',
  'グッズ確認中 🎁',
  '打ち合わせ中 💬',
  '練習中 🎤',
  'お昼寝中 😴',
  '作業中 💻',
]

function officeBuildingVisual(stage) {
  var v = OFFICE_STAGE_VISUALS[stage - 1] || OFFICE_STAGE_VISUALS[0]
  return v
}

// 事務所画面の描画
function renderOfficeScreen() {
  var gd = loadGameData()
  var body = document.getElementById('office-body')
  if (!body) return

  var stageIdx = gd.office.stage - 1
  var stage = OFFICE_STAGES[stageIdx]
  var nextStage = OFFICE_STAGES[gd.office.stage]
  var visual = officeBuildingVisual(gd.office.stage)
  var cheer = gd.points.cheer

  // 施設一覧
  var facilityHtml = Object.keys(OFFICE_FACILITY_NAMES).map(function (id) {
    var unlocked = gd.office.facilities[id]
    var emoji = OFFICE_FACILITY_EMOJI[id] || '🚪'
    var stageNo = OFFICE_STAGES.findIndex(function (s) { return s.unlocks.indexOf(id) >= 0 }) + 1
    return (
      '<div class="office-facility' + (unlocked ? '' : ' locked') + '">' +
        '<span class="office-facility-emoji">' + emoji + '</span>' +
        '<span class="office-facility-name">' + OFFICE_FACILITY_NAMES[id] + '</span>' +
        (unlocked ? '' : '<span class="office-facility-lock">🔒 段階' + stageNo + '</span>') +
      '</div>'
    )
  }).join('')

  // ミリメンの様子（タレント名をランダムに表示）
  var members = Object.keys(TALENTS).map(function (id) {
    return { id: id, name: TALENTS[id].name }
  })
  // シャッフルして3人表示
  for (var i = members.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var tmp = members[i]
    members[i] = members[j]
    members[j] = tmp
  }
  var shownMembers = members.slice(0, 3).map(function (m) {
    var st = OFFICE_MEMBER_STATES[Math.floor(Math.random() * OFFICE_MEMBER_STATES.length)]
    return (
      '<div class="office-member">' +
        '<img class="office-member-img" src="images/talents/' + m.id + '.webp" alt="' + m.name + '">' +
        '<span class="office-member-name">' + m.name + '</span>' +
        '<span class="office-member-state">' + st + '</span>' +
      '</div>'
    )
  }).join('')

  // 拡張セクション
  var upgradeHtml = ''
  if (nextStage) {
    var canUpgrade = cheer >= nextStage.cost
    upgradeHtml =
      '<div class="office-upgrade">' +
        '<div class="office-upgrade-head">次の段階: ' + nextStage.name + '</div>' +
        '<div class="office-upgrade-unlocks">' + nextStage.unlocks.map(function (id) {
          return '<span class="office-unlock-chip">' + (OFFICE_FACILITY_EMOJI[id] || '') + ' ' + OFFICE_FACILITY_NAMES[id] + '</span>'
        }).join('') + '</div>' +
        '<div class="office-upgrade-cost">📣 応援力 ' + nextStage.cost + '</div>' +
        '<div class="office-upgrade-progress"><div class="office-upgrade-fill" style="width:' + Math.min(100, Math.round(cheer / nextStage.cost * 100)) + '%"></div></div>' +
        '<div class="office-upgrade-have">所持: 📣 ' + cheer + '</div>' +
        '<button class="office-upgrade-btn' + (canUpgrade ? '' : ' disabled') + '" id="office-upgrade-btn"' + (canUpgrade ? '' : ' disabled') + '>' +
          (canUpgrade ? '🏗️ 拡張する' : '応援力が足りません') +
        '</button>' +
      '</div>'
  } else {
    upgradeHtml =
      '<div class="office-upgrade max">' +
        '<div class="office-upgrade-head">🌟 事務所は最上段階です！</div>' +
        '<div class="office-upgrade-unlocks">ミリプロの夢はここに集まる</div>' +
      '</div>'
  }

  body.innerHTML =
    '<div class="office-visual">' +
      '<div class="office-building">' + visual.emoji + '</div>' +
      '<div class="office-stage-name">' + stage.name + '</div>' +
      '<div class="office-stage-note">' + visual.note + '</div>' +
    '</div>' +

    '<div class="office-section-title">📣 応援力（事務所の拡張に使用）</div>' +
    '<div class="office-cheer">' + cheer + '</div>' +

    '<div class="office-section-title">🏛️ 施設</div>' +
    '<div class="office-facility-grid">' + facilityHtml + '</div>' +

    upgradeHtml +

    '<div class="office-section-title">ミリメンの様子</div>' +
    '<div class="office-members">' + shownMembers + '</div>'

  // 拡張ボタン
  var upBtn = document.getElementById('office-upgrade-btn')
  if (upBtn) {
    upBtn.addEventListener('click', function () {
      var gdNow = loadGameData()
      var next = OFFICE_STAGES[gdNow.office.stage]
      if (!next || gdNow.points.cheer < next.cost) return
      gdNow.points.cheer -= next.cost
      gdNow.office.stage++
      next.unlocks.forEach(function (id) {
        gdNow.office.facilities[id] = true
      })
      saveGameData(gdNow)
      refreshPlayerStatus()
      renderOfficeScreen()
      playTapSound()
    })
  }
}

// 効果音（タップ音を再利用）
function playTapSound() {
  var se = document.getElementById('tap-se')
  var settings = getSettings()
  if (se && settings.seEnabled) {
    se.currentTime = 0
    se.play().catch(function () {})
  }
}

// ============================================================
// 外部連携（Milli Unishare / Milli Games）画面
// ============================================================

function renderExternalScreen() {
  var body = document.getElementById('external-body')
  if (!body) return

  if (!firebaseAvailable()) {
    body.innerHTML =
      '<div class="external-notice">' +
        '<div class="external-notice-icon">🔗</div>' +
        '<p>Firebase の設定がまだです。</p>' +
        '<p class="external-notice-sub">「連携ハンドオフ.md」§6 の手順に従い、<b>firebase-config.js</b> に config を設定すると、Milli Unishare（動画視聴）と Milli Games（ミニゲーム）の報酬が自動で届くようになります。</p>' +
      '</div>'
    return
  }

  var pid = getMilliproPlayerId()
  if (!pid) {
    body.innerHTML =
      '<div class="external-notice">' +
        '<div class="external-notice-icon">🙋</div>' +
        '<p>プレイヤーIDがありません。設定をやり直してください。</p>' +
      '</div>'
    return
  }

  var uid = getMilliproUid()
  var accountHtml
  if (isAuthAvailable()) {
    if (uid) {
      var email = firebase.auth().currentUser.email
      accountHtml =
        '<div class="external-account logged-in">' +
          '<div class="external-account-head">👤 アカウント連携済み</div>' +
          '<div class="external-account-row"><span>メール</span><b>' + (email || '') + '</b></div>' +
          '<div class="external-account-row"><span>連携ID</span><b>' + pid + '</b></div>' +
          '<div class="external-account-note">このIDで Unishare / ミニゲームの報酬が届きます。別の端末では「アカウント連携（ログイン）」をしてください。</div>' +
          '<button class="external-logout-btn" id="external-logout-btn">ログアウト</button>' +
          '<div class="external-auth-msg" id="auth-msg"></div>' +
        '</div>'
    } else {
      accountHtml =
        '<div class="external-account">' +
          '<div class="external-account-head">🔐 アカウント連携（全サイト共通ログイン）</div>' +
          '<div class="external-account-row"><span>連携ID</span><b>' + pid + '</b><button class="external-copy-btn" id="external-copy-btn">コピー</button></div>' +
          '<div class="external-account-note">Milli Unishare / ミニゲームでも同じアカウントでログインすると、プレイヤーIDが自動で統一されます。ログイン不要で使う場合は「連携ID」を各サイトに入力してください。</div>' +
          '<div class="auth-tabs">' +
            '<button class="auth-tab-btn active" id="auth-tab-login">ログイン</button>' +
            '<button class="auth-tab-btn" id="auth-tab-signup">新規登録</button>' +
          '</div>' +
          '<div id="auth-panel-login">' +
            '<input class="external-input" id="auth-email" type="email" placeholder="メールアドレス" autocomplete="email">' +
            '<div class="password-field">' +
              '<input class="external-input" id="auth-pass" type="password" placeholder="パスワード" autocomplete="current-password">' +
              '<button type="button" class="pass-toggle-btn" id="auth-pass-toggle">👁</button>' +
            '</div>' +
            '<button class="external-auth-btn" id="auth-login-btn">ログイン</button>' +
          '</div>' +
          '<div id="auth-panel-signup" class="hidden">' +
            '<input class="external-input" id="auth2-email" type="email" placeholder="メールアドレス" autocomplete="email">' +
            '<div class="password-field">' +
              '<input class="external-input" id="auth2-pass" type="password" placeholder="パスワード（6文字以上）" autocomplete="new-password">' +
              '<button type="button" class="pass-toggle-btn" id="auth2-pass-toggle">👁</button>' +
            '</div>' +
            '<div class="password-field">' +
              '<input class="external-input" id="auth2-pass2" type="password" placeholder="パスワード（確認）" autocomplete="new-password">' +
              '<button type="button" class="pass-toggle-btn" id="auth2-pass2-toggle">👁</button>' +
            '</div>' +
            '<button class="external-auth-btn" id="auth-signup-btn">新規登録</button>' +
          '</div>' +
          '<div class="external-auth-msg" id="auth-msg"></div>' +
        '</div>'
    }
  } else {
    accountHtml =
      '<div class="external-account">' +
        '<div class="external-account-head">🔐 アカウント連携</div>' +
        '<div class="external-account-row"><span>連携ID</span><b>' + pid + '</b><button class="external-copy-btn" id="external-copy-btn">コピー</button></div>' +
        '<div class="external-account-note">このIDを Unishare / ミニゲームに入力すると報酬が届きます。</div>' +
      '</div>'
  }

  body.innerHTML =
    accountHtml +
    '<div class="external-status">' +
      '<div class="external-status-row"><span>プレイヤーID</span><b>' + pid + '</b></div>' +
      '<div class="external-status-row"><span>連携サイト</span><b>Milli Unishare / Milli Games</b></div>' +
      '<div class="external-status-row"><span>報酬</span><b>動画 15💰/8⭐/応援5 📣 ・ ゲーム 10💰/5⭐</b></div>' +
    '</div>' +
    '<div class="external-result" id="external-result"></div>' +
    '<button class="external-sync-btn" id="external-sync-btn">🔄 同期する</button>'

  var copyBtn = document.getElementById('external-copy-btn')
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copyMilliproPlayerId(pid)
    })
  }
  var loginBtn = document.getElementById('auth-login-btn')
  var signupBtn = document.getElementById('auth-signup-btn')
  if (loginBtn && signupBtn) {
    loginBtn.addEventListener('click', function () { submitMilliproAuth('login') })
    signupBtn.addEventListener('click', function () { submitMilliproAuth('signup') })
  }
  var tabLogin = document.getElementById('auth-tab-login')
  var tabSignup = document.getElementById('auth-tab-signup')
  if (tabLogin) tabLogin.addEventListener('click', function () { switchAuthTab('login', false) })
  if (tabSignup) tabSignup.addEventListener('click', function () { switchAuthTab('signup', false) })
  var tog1 = document.getElementById('auth-pass-toggle')
  var tog2 = document.getElementById('auth2-pass-toggle')
  var tog3 = document.getElementById('auth2-pass2-toggle')
  if (tog1) tog1.addEventListener('click', function () { togglePassVisibility('auth-pass', 'auth-pass-toggle') })
  if (tog2) tog2.addEventListener('click', function () { togglePassVisibility('auth2-pass', 'auth2-pass-toggle') })
  if (tog3) tog3.addEventListener('click', function () { togglePassVisibility('auth2-pass2', 'auth2-pass2-toggle') })
  var logoutBtn = document.getElementById('external-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      milliproLogout().then(function () {
        renderExternalScreen()
      })
    })
  }
  document.getElementById('external-sync-btn').addEventListener('click', function () {
    runExternalSync()
  })
}

// 連携IDをクリップボードにコピー（失敗時は選択を促す）
function copyMilliproPlayerId(pid) {
  var done = function () { playTapSound() }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pid).then(done).catch(function () { done() })
  } else {
    done()
  }
}

// ログイン / 新規作成の送信（gateMode ならログイン必須ゲートからの呼び出し）
// フォームはログイン/新規登録でタブ分け（新規登録はパスワードを2回入力）
function submitMilliproAuth(mode, gateMode) {
  var msg = document.getElementById(gateMode ? 'login-gate-msg' : 'auth-msg')
  var email, pass, pass2
  if (gateMode) {
    email = document.getElementById(mode === 'signup' ? 'signup-gate-email' : 'login-gate-email').value.trim()
    pass = document.getElementById(mode === 'signup' ? 'signup-gate-pass' : 'login-gate-pass').value
    pass2 = document.getElementById(mode === 'signup' ? 'signup-gate-pass2' : null)
  } else {
    email = document.getElementById(mode === 'signup' ? 'auth2-email' : 'auth-email').value.trim()
    pass = document.getElementById(mode === 'signup' ? 'auth2-pass' : 'auth-pass').value
    pass2 = document.getElementById(mode === 'signup' ? 'auth2-pass2' : null)
  }
  if (!email || !pass) {
    msg.textContent = 'メールアドレスとパスワードを入力してください。'
    return
  }
  if (mode === 'signup') {
    if (pass2 && pass !== pass2.value) {
      msg.textContent = 'パスワードが一致しません。もう一度入力してください。'
      return
    }
    if (pass.length < 6) {
      msg.textContent = 'パスワードは6文字以上にしてください。'
      return
    }
  }
  msg.textContent = '処理中...'
  var p = mode === 'signup' ? milliproSignup(email, pass) : milliproLogin(email, pass)
  p.then(function () {
    var uid = getMilliproUid()
    if (!uid) throw new Error('uid not found')
    return ensureLoginSync(uid).then(function (res) {
      if (gateMode) {
        hideLoginGate()
      } else {
        refreshPlayerStatus()
        renderExternalScreen()
      }
      runExternalSync()
      var msg2 = document.getElementById(gateMode ? 'login-gate-msg' : 'auth-msg')
      if (msg2) msg2.textContent = '✓ ログインしました。ゲームデータを' + (res && res.syncMode === 'pulled' ? '読み込みました' : '保存しました')
    })
  }).catch(function (e) {
    msg.textContent = e && e.message ? e.message : 'エラーが発生しました。'
  })
}

// ログイン / 新規登録のタブ切替（gateMode ならゲート、それ以外は連携画面）
function switchAuthTab(tab, gateMode) {
  var p = gateMode ? 'gate' : 'auth'
  var loginPanel = document.getElementById(p + '-panel-login')
  var signupPanel = document.getElementById(p + '-panel-signup')
  var loginTab = document.getElementById(p + '-tab-login')
  var signupTab = document.getElementById(p + '-tab-signup')
  if (loginPanel) loginPanel.classList.toggle('hidden', tab !== 'login')
  if (signupPanel) signupPanel.classList.toggle('hidden', tab !== 'signup')
  if (loginTab) loginTab.classList.toggle('active', tab === 'login')
  if (signupTab) signupTab.classList.toggle('active', tab === 'signup')
}

// パスワードの表示 / 非表示を切り替える
function togglePassVisibility(inputId, btnId) {
  var input = document.getElementById(inputId)
  var btn = document.getElementById(btnId)
  if (!input) return
  var show = input.type === 'password'
  input.type = show ? 'text' : 'password'
  if (btn) btn.textContent = show ? '🙈' : '👁'
}

// ============================================================
// ログイン必須ゲート（未ログインではゲームを操作できない）
// ============================================================
function showLoginGate() {
  var gate = document.getElementById('login-gate')
  if (gate) gate.classList.remove('hidden')
}

function hideLoginGate() {
  var gate = document.getElementById('login-gate')
  if (gate) gate.classList.add('hidden')
}

// ログイン後に一度だけクラウド同期を実行する（並行呼び出しは同じ Promise を共有）
var loginSyncPromise = null
function ensureLoginSync(uid) {
  if (loginSyncPromise) return loginSyncPromise
  loginSyncPromise = completeMilliproLogin(uid).then(function (res) {
    loginSyncPromise = null
    refreshPlayerStatus()
    return res
  }).catch(function (e) {
    loginSyncPromise = null
    console.warn('login sync failed:', e)
    return null
  })
  return loginSyncPromise
}

// ログイン状態が変わったら（起動時・別タブ・ログアウト時）
// 未ログインならゲートを表示し、ログイン済みならゲームデータを同期する
// 注意: auth 未設定（config なし）の環境ではゲートを出さない
onMilliproAuth(function (uid) {
  if (!isAuthAvailable()) {
    hideLoginGate()
    return
  }
  if (uid) {
    hideLoginGate()
    ensureLoginSync(uid).then(function (res) {
      if (res && res.syncMode === 'pulled') {
        // クラウドが新しい → 表示中のデータを最新化
        var home = document.getElementById('home-screen')
        if (home && !home.classList.contains('hidden')) showHomeScreen(loadUserData())
      }
    })
  } else {
    if (isAuthAvailable()) showLoginGate()
  }
  var popup = document.getElementById('popup-external')
  if (popup && !popup.classList.contains('hidden')) renderExternalScreen()
})

var gateLoginBtn = document.getElementById('login-gate-login-btn')
var gateSignupBtn = document.getElementById('login-gate-signup-btn')
if (gateLoginBtn) gateLoginBtn.addEventListener('click', function () { submitMilliproAuth('login', true) })
if (gateSignupBtn) gateSignupBtn.addEventListener('click', function () { submitMilliproAuth('signup', true) })
var gateTabLogin = document.getElementById('gate-tab-login')
var gateTabSignup = document.getElementById('gate-tab-signup')
if (gateTabLogin) gateTabLogin.addEventListener('click', function () { switchAuthTab('login', true) })
if (gateTabSignup) gateTabSignup.addEventListener('click', function () { switchAuthTab('signup', true) })
document.getElementById('login-gate-pass-toggle').addEventListener('click', function () { togglePassVisibility('login-gate-pass', 'login-gate-pass-toggle') })
document.getElementById('signup-gate-pass-toggle').addEventListener('click', function () { togglePassVisibility('signup-gate-pass', 'signup-gate-pass-toggle') })
document.getElementById('signup-gate-pass2-toggle').addEventListener('click', function () { togglePassVisibility('signup-gate-pass2', 'signup-gate-pass2-toggle') })

// 同期実行（外部報酬を付与して結果を表示）
function runExternalSync() {
  var resultEl = document.getElementById('external-result')
  var btn = document.getElementById('external-sync-btn')
  if (!resultEl || !btn) return
  btn.disabled = true
  btn.textContent = '同期中...'
  resultEl.innerHTML = '<div class="external-syncing">同期しています...</div>'

  syncExternalRewards().then(function (result) {
    btn.disabled = false
    btn.textContent = '🔄 同期する'
    if (!result.available) {
      resultEl.innerHTML = '<div class="external-syncing">Firebase が未設定のため同期できませんでした。</div>'
      return
    }
    if (result.noPlayerId) {
      resultEl.innerHTML = '<div class="external-syncing">プレイヤーIDが見つかりません。</div>'
      return
    }
    if (result.videoCount === 0 && result.gameCount === 0) {
      resultEl.innerHTML = '<div class="external-syncing">新しい報酬はありませんでした。</div>'
      return
    }
    var lines =
      '動画視聴報酬 ' + result.videoCount + '件' +
      (result.gameCount > 0 ? ' ・ ミニゲーム報酬 ' + result.gameCount + '件' : '') +
      ' を受け取りました！'
    var html = '<div class="external-ok">🎉 ' + lines + '</div>'
    html += '<div class="external-ok-detail">💰 +' + result.currency + ' / ⭐ +' + result.exp + (result.cheer > 0 ? ' / 📣 +' + result.cheer : '') + '</div>'
    if (result.leveledUp) html += '<div class="external-ok-detail">🎊 レベルアップ！ 現在 Lv.' + result.newLevel + '</div>'
    resultEl.innerHTML = html
    refreshPlayerStatus()
  })
}

// ============================================================
// クエスト（§14: 日替わり・週替わり・報酬受け取り式）
// ============================================================

// 残り時間表示（次の日替わりまで）
function questResetLabel(gd) {
  var d = new Date()
  var end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0)
  var diff = Math.max(0, end - d)
  var h = Math.floor(diff / 3600000)
  var m = Math.floor((diff % 3600000) / 60000)
  return 'あと ' + h + '時間' + (m > 0 ? m + '分' : '')
}

function renderQuestsScreen() {
  var gd = loadGameData()
  var body = document.getElementById('quests-body')
  if (!body) return

  rollQuests(gd)
  saveGameData(gd)

  function questCard(def, kind, q) {
    var done = q.done.indexOf(def.id) >= 0
    var claimed = (q.claimed || []).indexOf(def.id) >= 0
    var progress = q.progress[def.progressKey] || 0
    var pct = Math.min(100, Math.round(progress / def.target * 100))
    var statusHtml = ''
    if (claimed) {
      statusHtml = '<div class="quest-status claimed">✓ 受取済み</div>'
    } else if (done) {
      statusHtml = '<button class="quest-claim-btn" data-kind="' + kind + '" data-id="' + def.id + '">🎁 報酬を受け取る</button>'
    }
    return (
      '<div class="quest-card' + (done ? ' done' : '') + '">' +
        '<div class="quest-card-top">' +
          '<span class="quest-name">' + def.name + '</span>' +
          statusHtml +
        '</div>' +
        '<div class="quest-desc">' + def.desc + '</div>' +
        '<div class="quest-progress"><div class="quest-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="quest-meta">' +
          '<span class="quest-count">' + Math.min(progress, def.target) + ' / ' + def.target + '</span>' +
          '<span class="quest-reward">💰 ' + def.currency + ' / ⭐ EXP ' + def.exp + '</span>' +
        '</div>' +
      '</div>'
    )
  }

  var dailyHtml = DAILY_QUESTS.map(function (def) {
    return questCard(def, 'daily', gd.quests.daily)
  }).join('')

  var weeklyHtml = WEEKLY_QUESTS.map(function (def) {
    return questCard(def, 'weekly', gd.quests.weekly)
  }).join('')

  var dailyDone = gd.quests.daily.done.length
  var weeklyDone = gd.quests.weekly.done.length

  body.innerHTML =
    '<div class="quest-section-title">日替わりクエスト <span class="quest-reset">' + questResetLabel(gd) + ' リセット</span></div>' +
    '<div class="quest-list">' + dailyHtml + '</div>' +
    '<div class="quest-section-title">週替わりクエスト <span class="quest-reset">月曜リセット</span></div>' +
    '<div class="quest-list">' + weeklyHtml + '</div>' +
    '<div class="quest-summary">達成: 日替わり ' + dailyDone + '/' + DAILY_QUESTS.length +
    ' ・ 週替わり ' + weeklyDone + '/' + WEEKLY_QUESTS.length + '</div>'

  // 報酬受け取り
  body.querySelectorAll('.quest-claim-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gdNow = loadGameData()
      var reward = claimQuestRewards(gdNow, btn.dataset.kind)
      if (!reward) return
      gdNow.currency += reward.currency
      var lv = addExp(gdNow, reward.exp)
      saveGameData(gdNow)
      refreshPlayerStatus()
      renderQuestsScreen()
      playTapSound()
      alert('🎁 クエスト報酬を受け取りました！ 💰' + reward.currency + ' / EXP ' + reward.exp + (lv.leveledUp ? '（レベルアップ！）' : ''))
    })
  })
}

// 設定画面のイベントリスナー
;(function () {
  // 名前入力
  var nameInput = document.getElementById('input-name')
  if (nameInput) {
    nameInput.addEventListener('input', function () {
      document.getElementById('name-error').classList.add('hidden')
    })
  }

  // コメント入力（ボタン切替）
  var commentInput = document.getElementById('input-comment')
  var commentBtn = document.getElementById('comment-next-btn')
  if (commentInput && commentBtn) {
    commentInput.addEventListener('input', function () {
      wizardState.comment = commentInput.value
      commentBtn.textContent = commentInput.value.trim() ? '確認画面へ' : 'スキップ'
    })
  }

  // グループボタン
  document.querySelectorAll('.group-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { toggleGroup(btn.dataset.group) })
  })

  // 次へ
  document.querySelectorAll('.setup-btn-next').forEach(function (btn) {
    btn.addEventListener('click', nextPage)
  })

  // 戻る
  document.querySelectorAll('.setup-btn-back').forEach(function (btn) {
    btn.addEventListener('click', prevPage)
  })

  // 確定
  var confirmBtn2 = document.getElementById('setup-confirm-btn')
  if (confirmBtn2) confirmBtn2.addEventListener('click', confirmSetup)

  // 最推し決定
  var decideBtn = document.getElementById('ultimate-decide-btn')
  if (decideBtn) decideBtn.addEventListener('click', nextPage)

  // カルーセル矢印
  var prevArrow = document.getElementById('carousel-prev')
  var nextArrow = document.getElementById('carousel-next')
  if (prevArrow) prevArrow.addEventListener('click', prevSlide)
  if (nextArrow) nextArrow.addEventListener('click', nextSlide)

  // スワイプ
  var viewport = document.querySelector('.carousel-viewport')
  if (viewport) {
    var touchStartX = 0
    viewport.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX
    }, { passive: true })
    viewport.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide()
        else prevSlide()
      }
    }, { passive: true })
  }
})()

// ============================================================
// PCデスクトップ
// ============================================================
;(function () {
  // PCを開く
  var monitor = document.getElementById('pc-monitor')
  var pcClickArea = document.getElementById('pc-click-area')
  var pcOverlay = document.getElementById('pc-overlay')

  function openPC() {
    if (pcOverlay) pcOverlay.classList.remove('hidden')
  }

  function closePC() {
    if (pcOverlay) pcOverlay.classList.add('hidden')
  }

  if (monitor) monitor.addEventListener('click', openPC)
  var phone = document.getElementById('pc-smartphone')
  if (phone) phone.addEventListener('click', openPC)
  if (pcClickArea) pcClickArea.addEventListener('click', function (e) {
    if (e.target === pcClickArea) openPC()
  })

  // 閉じる
  var closeBtn = document.getElementById('pc-close-btn')
  if (closeBtn) closeBtn.addEventListener('click', closePC)

  // オーバーレイ背景クリックで閉じる
  if (pcOverlay) pcOverlay.addEventListener('click', function (e) {
    if (e.target === pcOverlay) closePC()
  })

  // ユーザー
  var userArea = document.getElementById('pc-user-area')
  if (userArea) {
    userArea.addEventListener('click', function () {
      renderPlayerCard()
      openPopup('popup-player-card')
    })
  }

  // ステータスバー → プレイヤーカード
  var statusBtn = document.getElementById('status-open-btn')
  if (statusBtn) {
    statusBtn.addEventListener('click', function () {
      renderPlayerCard()
      openPopup('popup-player-card')
    })
  }

  // アプリケーション
  var APP_ACTIONS = {
    unishare: function () { window.open('https://milli-unishare.onrender.com') },
    sns: function () { alert('SNS機能は準備中です') },
    shop: function () { alert('Milli Shopは準備中です') },
    canvas: function () { alert('Canvasは準備中です') },
    system: function () {
      closePC()
      openPopup('popup-setting')
    },
    bloom: function () { alert('Milli Bloomは準備中です') },
    office: function () {
      closePC()
      // クエスト進行（事務所訪問）
      var gdVisit = loadGameData()
      questAddProgress(gdVisit, 'officeVisits')
      saveGameData(gdVisit)
      renderOfficeScreen()
      openPopup('popup-office')
    },
    quests: function () {
      closePC()
      renderQuestsScreen()
      openPopup('popup-quests')
    },
    external: function () {
      closePC()
      renderExternalScreen()
      openPopup('popup-external')
    },
    dungeon: function () {
      closePC()
      window.open('dungeon.html', '_blank')
    },
    milligames: function () { window.open('https://milli-games.onrender.com') },
    gameA: function () { alert('「ミリプロアドベンチャー」は準備中です') },
    gameB: function () { alert('「タレントクイズ」は準備中です') },
    gameC: function () { alert('「リズムチャレンジ」は準備中です') },
  }

  document.querySelectorAll('.pc-app').forEach(function (app) {
    app.addEventListener('click', function () {
      var key = app.dataset.app
      var action = APP_ACTIONS[key]
      if (action) action()
    })
  })
})()


// ============================================================
// 設定UI操作
// ============================================================
;(function () {
  var settings = getSettings()

  function refreshSettingsUI() {
    var fill = document.getElementById('setting-volume-fill')
    if (fill) fill.style.width = settings.volume + '%'

    document.querySelectorAll('.setting-toggle').forEach(function (el) {
      var key = el.dataset.setting
      var isOn = key === 'se' ? settings.seEnabled : settings.bgmEnabled
      el.classList.toggle('on', isOn)
    })
  }

  function saveAndApply() {
    saveSettings(settings)
    if (settings.bgmEnabled) {
      applyVolume(settings.volume)
      applySettingsToBgm()
    } else {
      var bgm = document.getElementById('title-bgm')
      if (bgm) bgm.pause()
    }
    window._milliproSettings = settings
  }

  // 音量バー
  var volumeBar = document.getElementById('setting-volume-bar')
  if (volumeBar) {
    function setVolumeFromEvent(e) {
      var rect = volumeBar.getBoundingClientRect()
      var x = (e.clientX || e.touches[0].clientX) - rect.left
      var pct = Math.round(Math.max(0, Math.min(100, (x / rect.width) * 100)))
      settings.volume = pct
      var fill = document.getElementById('setting-volume-fill')
      if (fill) fill.style.width = pct + '%'
      saveAndApply()
    }

    volumeBar.addEventListener('mousedown', function (e) {
      setVolumeFromEvent(e)
      function onMove(ev) { setVolumeFromEvent(ev) }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })

    volumeBar.addEventListener('touchstart', function (e) {
      setVolumeFromEvent(e)
    }, { passive: true })

    volumeBar.addEventListener('touchmove', function (e) {
      setVolumeFromEvent(e)
    }, { passive: true })
  }

  // トグル
  document.querySelectorAll('.setting-toggle').forEach(function (el) {
    el.addEventListener('click', function () {
      var key = el.dataset.setting
      if (key === 'se') {
        settings.seEnabled = !settings.seEnabled
      } else if (key === 'bgm') {
        settings.bgmEnabled = !settings.bgmEnabled
      }
      el.classList.toggle('on')
      saveAndApply()
    })
  })

  // 設定ポップアップが開かれたらUIを最新に
  var origOpenPopup = openPopup
  window.openPopup = function (id) {
    if (id === 'popup-setting') {
      settings = getSettings()
      refreshSettingsUI()
    }
    origOpenPopup(id)
  }

  // 初回反映
  refreshSettingsUI()
  saveAndApply()
})()
