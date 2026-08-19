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

// ポップアップ制御（全画面ナビゲーション）
// 常に1画面のみ表示。タブ画面はボトムタブで切替、サブ画面は戻るボタンで1つ前の画面へ戻る
var screenHistory = []
var TAB_MAP = {
  'popup-shop': 'shop',
  'popup-gallery': 'gallery',
  'popup-quests': 'quests',
  'popup-office': 'office'
}
var TAB_RENDER = {
  shop: function () { renderShopScreen() },
  gallery: function () { renderGalleryScreen('mine') },
  quests: function () { renderQuestsScreen() },
  office: function () {
    var gdVisit = loadGameData()
    questAddProgress(gdVisit, 'officeVisits')
    saveGameData(gdVisit)
    renderOfficeScreen()
  }
}

function setActiveTab(tab) {
  document.querySelectorAll('#tab-bar .tab-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.tab === tab)
  })
}

function openPopup(id) {
  var el = document.getElementById(id)
  if (!el) return
  // 常に1画面のみ表示（開く前に他を閉じる）
  document.querySelectorAll('.popup-overlay:not(.hidden)').forEach(function (o) {
    o.classList.add('hidden')
  })
  el.classList.remove('hidden')
  // タブ画面は履歴を置き換え、サブ画面は履歴に積む
  if (TAB_MAP[id]) {
    screenHistory = [id]
  } else if (screenHistory[screenHistory.length - 1] !== id) {
    screenHistory.push(id)
  }
  if (TAB_MAP[id]) setActiveTab(TAB_MAP[id])
  updateTabBarVisibility()
}

function closePopup() {
  if (screenHistory.length > 1) {
    // サブ画面：1つ前の画面に戻る
    screenHistory.pop()
    var prev = screenHistory[screenHistory.length - 1]
    document.querySelectorAll('.popup-overlay:not(.hidden)').forEach(function (o) {
      o.classList.add('hidden')
    })
    var prevEl = document.getElementById(prev)
    if (prevEl) prevEl.classList.remove('hidden')
    updateTabBarVisibility()
    return
  }
  // ホームへ戻る
  screenHistory = []
  document.querySelectorAll('.popup-overlay:not(.hidden)').forEach(function (o) {
    o.classList.add('hidden')
  })
  setActiveTab('home')
  updateTabBarVisibility()
}

// タブバーの表示/非表示（タイトル・ログインゲート・初期設定・PCデスクトップ中は非表示）
function updateTabBarVisibility() {
  var tabBar = document.getElementById('tab-bar')
  if (!tabBar) return
  function isVisible(el) {
    return el && !el.classList.contains('hidden')
  }
  var hidden =
    isVisible(document.getElementById('title-screen')) ||
    isVisible(document.getElementById('login-gate')) ||
    isVisible(document.getElementById('setup-screen')) ||
    isVisible(document.getElementById('pc-overlay'))
  tabBar.classList.toggle('hidden', hidden)
}

// 全画面ポップアップのヘッダーに戻るボタンを追加
document.querySelectorAll('.popup-header').forEach(function (header) {
  var back = document.createElement('button')
  back.className = 'popup-back-btn'
  back.innerHTML = '←'
  back.setAttribute('aria-label', '戻る')
  back.addEventListener('click', function (e) {
    e.stopPropagation()
    closePopup()
  })
  header.appendChild(back)
})

document.querySelectorAll('.popup-close-btn').forEach(btn => {
  btn.addEventListener('click', closePopup)
})

document.querySelectorAll('.popup-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopup()
  })
})

// ボトムタブバー
document.querySelectorAll('#tab-bar .tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var tab = btn.dataset.tab
    if (tab === 'home') {
      closePopup()
    } else {
      var render = TAB_RENDER[tab]
      if (render) render()
      openPopup('popup-' + tab)
    }
    playTapSound()
  })
})

// 報酬ダイアログ（自作ポップアップ）
function showGameDialog(opts) {
  var dlg = document.getElementById('game-dialog')
  if (!dlg) return
  var icon = document.getElementById('game-dialog-icon')
  if (icon) icon.textContent = opts.icon || '🎉'
  var title = document.getElementById('game-dialog-title')
  if (title) title.textContent = opts.title || ''
  var body = document.getElementById('game-dialog-body')
  if (body) body.innerHTML = opts.body || ''
  var ok = document.getElementById('game-dialog-ok')
  if (ok) ok.textContent = opts.okText || 'OK'
  dlg.classList.remove('hidden')
}

function closeGameDialog() {
  var dlg = document.getElementById('game-dialog')
  if (dlg) dlg.classList.add('hidden')
}

function rewardLine(text, cls) {
  return '<div class="game-dialog-reward' + (cls ? ' ' + cls : '') + '">' + text + '</div>'
}

document.getElementById('game-dialog-ok').addEventListener('click', closeGameDialog)
document.getElementById('game-dialog').addEventListener('click', function (e) {
  if (e.target === this) closeGameDialog()
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
          updateTabBarVisibility()
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
// プレイヤーアイコン（絵文字 or アップロード画像）
// ============================================================

// 絵文字選択リスト（後から追加できる）
const ICON_EMOJIS = [
  '😊', '😆', '🥰', '😎', '🤩', '😇',
  '😴', '🥳', '😉', '😍', '🫶', '✨',
  '⭐', '🌟', '🌈', '🌸', '💖', '🎀',
  '🎧', '🎤', '🎮', '🎬', '📚', '☕',
  '🍀', '🍰', '🐱', '🐶', '🐰', '🦊',
  '🐻', '🐼', '⚡', '🔥', '💫', '🧸',
]

// icon がアップロード画像（data URL）かどうか
function isImageIcon(icon) {
  return typeof icon === 'string' && icon.indexOf('data:image/') === 0
}

// アイコンを表示（絵文字はテキスト、画像は <img>、未設定は名前一文字）
function renderUserIcon(el, user) {
  if (!el) return
  var icon = user && user.icon
  if (isImageIcon(icon)) {
    el.textContent = ''
    var img = document.createElement('img')
    img.src = icon
    img.alt = 'icon'
    img.loading = 'lazy'
    el.appendChild(img)
  } else if (icon && String(icon).trim()) {
    el.textContent = icon
  } else {
    el.textContent = user && user.playerName ? user.playerName.charAt(0) : '?'
  }
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

  // ログイン中なら最推し/推しを共有プロフィール（全サイト共通）へ保存
  if (isAuthAvailable() && getMilliproUid()) {
    updateMilliproOshi(data.ultimateOshi, data.favorites).catch(function () {})
  }

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
    renderUserIcon(avatar, data)
  }
  document.getElementById('home-screen').classList.remove('hidden')

  ensureGameData()
  var statusBar = document.getElementById('player-status-bar')
  if (statusBar) statusBar.classList.remove('hidden')
  refreshPlayerStatus()
  renderCollectionShelf()
  renderWallArtwork()

  // 外部連携報酬の自動同期（config 設定済みのときだけ動作）
  syncExternalRewards().catch(function () {})
  // ギャラリー売上の自動回収
  syncGallerySales().catch(function () {})

  // スマホは最初に真ん中（スマホ）の位置にスクロール
  if (window.innerWidth < 768) {
    var deskSection = document.querySelector('.room-desk')
    if (deskSection) deskSection.scrollIntoView({ behavior: 'auto', inline: 'start' })
  }
  updateTabBarVisibility()
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
  renderUserIcon(avatar, user)

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
        return '<span class="pt-chip">' + JOB_DEFS[id].emoji + ' ' + JOB_DEFS[id].name + ' Lv.' + gd.jobs[id].level + '</span>'
      }).join('')
    : '<div class="player-card-note">未解放（基本Lv5以上になると解放条件を確認できます）</div>'

  body.innerHTML =
    '<div class="player-card-head">' +
      '<div class="player-card-avatar" id="player-card-avatar"></div>' +
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
    '<div class="player-card-pts">' + jobsHtml + '</div>' +
    '<button class="jobs-open-btn" id="jobs-open-btn">🎖️ ジョブを管理する（解放・育成）</button>' +

    '<div class="player-card-section-title">プロフィール編集</div>' +
    '<button class="profile-edit-btn" id="profile-edit-btn">✏️ アイコンを変更</button>' +
    '<button class="profile-edit-btn" id="oshi-edit-btn">💖 推し設定を変更</button>' +
    '<div class="icon-editor hidden" id="icon-editor"></div>'

  renderUserIcon(document.getElementById('player-card-avatar'), user)

  var jobsBtn = document.getElementById('jobs-open-btn')
  if (jobsBtn) jobsBtn.addEventListener('click', function () {
    renderJobsScreen()
    openPopup('popup-jobs')
  })

  var editBtn = document.getElementById('profile-edit-btn')
  if (editBtn) editBtn.addEventListener('click', function () {
    var editor = document.getElementById('icon-editor')
    if (!editor) return
    editor.classList.toggle('hidden')
    if (!editor.classList.contains('hidden')) renderIconEditor()
  })

  var oshiBtn = document.getElementById('oshi-edit-btn')
  if (oshiBtn) oshiBtn.addEventListener('click', function () {
    renderOshiScreen()
    openPopup('popup-oshi')
  })
}

// アイコンエディタの編集中状態（null=名前一文字 / 絵文字 or dataURL）
var iconEditState = { pending: null }

// アイコンエディタ（絵文字グリッド + 画像アップロード）を描画
function renderIconEditor() {
  var editor = document.getElementById('icon-editor')
  if (!editor) return
  var user = loadUserData()

  iconEditState.pending = user && user.icon ? user.icon : null

  editor.innerHTML =
    '<div class="icon-editor-preview" id="icon-editor-preview"></div>' +
    '<div class="icon-editor-label">絵文字を選ぶ</div>' +
    '<div class="icon-editor-emojis">' +
      ICON_EMOJIS.map(function (e) {
        return '<button type="button" class="icon-emoji-btn" data-emoji="' + e + '">' + e + '</button>'
      }).join('') +
    '</div>' +
    '<div class="icon-editor-label">または画像をアップロード</div>' +
    '<button type="button" class="icon-upload-btn" id="icon-upload-btn">📁 画像を選ぶ</button>' +
    '<input type="file" id="icon-file-input" accept="image/*" class="hidden">' +
    '<p class="icon-editor-hint">画像は正方形に切り抜いて保存されます（5MBまで・JPEG/PNG/GIF等）</p>' +
    '<div class="icon-editor-actions">' +
      '<button type="button" class="icon-action-btn primary" id="icon-save-btn">保存</button>' +
      '<button type="button" class="icon-action-btn" id="icon-reset-btn">名前一文字に戻す</button>' +
      '<button type="button" class="icon-action-btn" id="icon-cancel-btn">キャンセル</button>' +
    '</div>'

  renderIconEditorPreview()

  editor.querySelectorAll('.icon-emoji-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      iconEditState.pending = btn.dataset.emoji
      renderIconEditorPreview()
    })
  })

  var uploadBtn = document.getElementById('icon-upload-btn')
  var fileInput = document.getElementById('icon-file-input')
  if (uploadBtn) uploadBtn.addEventListener('click', function () {
    if (fileInput) fileInput.click()
  })
  if (fileInput) fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0]
    if (file) handleIconUpload(file)
    fileInput.value = ''
  })

  document.getElementById('icon-save-btn').addEventListener('click', saveIconEditor)
  document.getElementById('icon-reset-btn').addEventListener('click', function () {
    iconEditState.pending = null
    renderIconEditorPreview()
  })
  document.getElementById('icon-cancel-btn').addEventListener('click', function () {
    var editorEl = document.getElementById('icon-editor')
    if (editorEl) editorEl.classList.add('hidden')
  })
}

// エディタのプレビュー表示
function renderIconEditorPreview() {
  var preview = document.getElementById('icon-editor-preview')
  if (!preview) return
  var user = loadUserData()
  var tmp = { playerName: user ? user.playerName : '', icon: iconEditState.pending }
  renderUserIcon(preview, tmp)
}

// アップロード画像を正方形に切り抜いて圧縮（256px・JPEG）
function handleIconUpload(file) {
  if (!file || file.type.indexOf('image/') !== 0) {
    alert('画像ファイルを選択してください')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('5MB以下の画像を選択してください')
    return
  }
  var reader = new FileReader()
  reader.onload = function () {
    var img = new Image()
    img.onload = function () {
      var size = 256
      var canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      var ctx = canvas.getContext('2d')
      var side = Math.min(img.width, img.height)
      var sx = (img.width - side) / 2
      var sy = (img.height - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      iconEditState.pending = canvas.toDataURL('image/jpeg', 0.85)
      renderIconEditorPreview()
    }
    img.onerror = function () { alert('画像を読み込めませんでした') }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

// アイコンを保存（ローカル + クラウドプロフィール）
function saveIconEditor() {
  var user = loadUserData()
  if (!user) return
  user.icon = iconEditState.pending || ''
  saveUserData(user)
  updateMilliproProfile({ icon: user.icon }).catch(function () {})
  var editor = document.getElementById('icon-editor')
  if (editor) editor.classList.add('hidden')
  refreshPlayerStatus()
  renderPlayerCard()
  playTapSound()
}

// 他の機能からも呼べるようにグローバル公開
window.refreshPlayerStatus = refreshPlayerStatus

// 配信ダンジョン（dungeon.html）で報酬が加算されたら状態を更新
window.addEventListener('storage', function (e) {
  if (e.key === GAME_DATA_KEY) refreshPlayerStatus()
})

// ============================================================
// 推し設定（最推し1人 + 推し最大10人。全サイト共通プロフィールと同期）
// ============================================================
var oshiEditState = { ultimateOshi: null, favorites: [] }

function renderOshiScreen() {
  var body = document.getElementById('oshi-body')
  if (!body) return
  var ud = loadUserData() || {}
  oshiEditState.ultimateOshi = ud.ultimateOshi || null
  oshiEditState.favorites = Array.isArray(ud.favorites) ? ud.favorites.slice() : []

  var ultCards = Object.keys(TALENTS).map(function (id) {
    var t = TALENTS[id]
    return '<button type="button" class="oshi-ult-card' + (id === oshiEditState.ultimateOshi ? ' selected' : '') + '" data-ult="' + id + '">' +
      '<img src="images/talents/' + id + '.webp" alt="' + t.name + '" loading="lazy">' +
      '<span>' + t.name + '</span>' +
      '</button>'
  }).join('')

  var favCards = Object.keys(TALENTS).map(function (id) {
    var t = TALENTS[id]
    return '<button type="button" class="oshi-fav-card' + (oshiEditState.favorites.indexOf(id) >= 0 ? ' selected' : '') + '" data-fav="' + id + '">' +
      '<img src="images/talents/' + id + '.webp" alt="' + t.name + '" loading="lazy">' +
      '<span>' + t.name + '</span>' +
      '</button>'
  }).join('')

  body.innerHTML =
    '<div class="oshi-section-title">最推し（1人を選択）</div>' +
    '<div class="oshi-ult-grid">' + ultCards + '</div>' +
    '<div class="oshi-section-title">推し（最大10人） <span class="oshi-count" id="oshi-fav-count">' + oshiEditState.favorites.length + ' / 10</span></div>' +
    '<div class="oshi-fav-grid">' + favCards + '</div>' +
    '<button type="button" class="oshi-save-btn" id="oshi-save-btn">💾 保存</button>' +
    '<div class="oshi-msg" id="oshi-msg"></div>'

  body.querySelectorAll('.oshi-ult-card').forEach(function (btn) {
    btn.addEventListener('click', function () {
      oshiEditState.ultimateOshi = btn.dataset.ult
      body.querySelectorAll('.oshi-ult-card').forEach(function (b) { b.classList.toggle('selected', b === btn) })
      playTapSound()
    })
  })

  body.querySelectorAll('.oshi-fav-card').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.fav
      var idx = oshiEditState.favorites.indexOf(id)
      if (idx >= 0) {
        oshiEditState.favorites.splice(idx, 1)
      } else {
        if (oshiEditState.favorites.length >= 10) {
          showGameDialog({ icon: '⚠️', title: '選択しすぎ', body: '<p style="margin:8px 0">推しは10人までです。</p>' })
          return
        }
        oshiEditState.favorites.push(id)
      }
      btn.classList.toggle('selected', oshiEditState.favorites.indexOf(id) >= 0)
      var c = document.getElementById('oshi-fav-count')
      if (c) c.textContent = oshiEditState.favorites.length + ' / 10'
      playTapSound()
    })
  })

  document.getElementById('oshi-save-btn').addEventListener('click', function () {
    if (!oshiEditState.ultimateOshi) {
      showGameDialog({ icon: '⚠️', title: '最推し未選択', body: '<p style="margin:8px 0">最推しを1人選んでください。</p>' })
      return
    }
    var ud = loadUserData() || {}
    ud.ultimateOshi = oshiEditState.ultimateOshi
    ud.favorites = oshiEditState.favorites.slice()
    saveUserData(ud)
    if (isAuthAvailable() && getMilliproUid()) {
      updateMilliproOshi(oshiEditState.ultimateOshi, oshiEditState.favorites).catch(function () {})
    }
    closePopup('popup-oshi')
    showGameDialog({ icon: '💖', title: '推し設定を保存しました', body: '<p style="margin:8px 0">最推し・推しは全サイトで共有されます。</p>' })
    playTapSound()
  })
}

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
    // ジョブバフ（§20: 応援力系ジョブLvで拡張コスト -5%/Lv、上限 -30%）
    var discountRate = officeCostDiscountRate(gd)
    var cost = Math.round(nextStage.cost * discountRate)
    var canUpgrade = cheer >= cost
    upgradeHtml =
      '<div class="office-upgrade">' +
        '<div class="office-upgrade-head">次の段階: ' + nextStage.name + '</div>' +
        '<div class="office-upgrade-unlocks">' + nextStage.unlocks.map(function (id) {
          return '<span class="office-unlock-chip">' + (OFFICE_FACILITY_EMOJI[id] || '') + ' ' + OFFICE_FACILITY_NAMES[id] + '</span>'
        }).join('') + '</div>' +
        '<div class="office-upgrade-cost">📣 応援力 ' + cost +
          (discountRate < 1 ? '<span class="office-upgrade-discount">（' + nextStage.cost + ' から ' + Math.round((1 - discountRate) * 100) + '%OFF）</span>' : '') +
        '</div>' +
        '<div class="office-upgrade-progress"><div class="office-upgrade-fill" style="width:' + Math.min(100, Math.round(cheer / cost * 100)) + '%"></div></div>' +
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
      if (!next) return
      var cost = Math.round(next.cost * officeCostDiscountRate(gdNow))
      if (gdNow.points.cheer < cost) return
      gdNow.points.cheer -= cost
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

// 効果音（現状は全て無効化。tap to start のみタイトル画面で再生）
function playTapSound() {}

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
            '<button type="button" class="password-reset-link" id="auth-forgot-btn">パスワードをお忘れですか？</button>' +
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
  var forgotBtn = document.getElementById('auth-forgot-btn')
  if (forgotBtn) forgotBtn.addEventListener('click', openPasswordResetDialog)
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
  updateTabBarVisibility()
}

function hideLoginGate() {
  var gate = document.getElementById('login-gate')
  if (gate) gate.classList.add('hidden')
  updateTabBarVisibility()
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

// ============================================================
// パスワード再設定（全サイト共通アカウント宛の再設定メール送信）
// ============================================================
function openPasswordResetDialog() {
  var dialog = document.getElementById('password-reset-dialog')
  if (!dialog) return
  var email = document.getElementById('login-gate-email')
  var email2 = document.getElementById('auth-email')
  var input = document.getElementById('reset-email')
  if (input) {
    var hint = ''
    if (email && email.value.trim()) hint = email.value.trim()
    else if (email2 && email2.value.trim()) hint = email2.value.trim()
    input.value = hint
  }
  var msg = document.getElementById('reset-msg')
  if (msg) msg.textContent = ''
  dialog.classList.remove('hidden')
  if (input) input.focus()
}

function closePasswordResetDialog() {
  var dialog = document.getElementById('password-reset-dialog')
  if (dialog) dialog.classList.add('hidden')
}

function resetPasswordError(e) {
  var j = e && e.code ? e.code : String(e)
  if (j.indexOf('user-not-found') >= 0) return 'そのメールアドレスは登録されていません'
  if (j.indexOf('invalid-email') >= 0) return 'メールアドレスの形式が正しくありません'
  if (j.indexOf('too-many-requests') >= 0) return '試行回数が多すぎます。しばらくしてから再度お試しください'
  return '送信に失敗しました: ' + j
}

function submitPasswordReset() {
  var input = document.getElementById('reset-email')
  var msg = document.getElementById('reset-msg')
  var btn = document.getElementById('reset-send-btn')
  if (!input || !msg) return
  var email = input.value.trim()
  if (!email) { msg.textContent = 'メールアドレスを入力してください'; return }
  if (!isAuthAvailable()) { msg.textContent = 'アカウント連携が設定されていません'; return }
  if (btn) btn.disabled = true
  var prev = msg.textContent
  msg.textContent = '送信中...'
  milliproResetPassword(email).then(function () {
    msg.textContent = '再設定メールを送信しました。メールのリンクからパスワードを再設定してください。'
  }).catch(function (e) {
    msg.textContent = resetPasswordError(e)
  }).finally(function () {
    if (btn) btn.disabled = false
  })
}

var resetSendBtn = document.getElementById('reset-send-btn')
if (resetSendBtn) resetSendBtn.addEventListener('click', submitPasswordReset)
var resetCloseBtn = document.getElementById('reset-close-btn')
if (resetCloseBtn) resetCloseBtn.addEventListener('click', closePasswordResetDialog)
var resetEmailInput = document.getElementById('reset-email')
if (resetEmailInput) resetEmailInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitPasswordReset() })
var loginGateForgotBtn = document.getElementById('login-gate-forgot-btn')
if (loginGateForgotBtn) loginGateForgotBtn.addEventListener('click', openPasswordResetDialog)
document.addEventListener('click', function (e) {
  var dialog = document.getElementById('password-reset-dialog')
  if (!dialog || dialog.classList.contains('hidden')) return
  if (e.target === dialog) closePasswordResetDialog()
})

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
      var rewardParts = [
        rewardLine('💰 通貨 +' + reward.currency),
        rewardLine('⭐ EXP +' + reward.exp)
      ]
      if (lv.leveledUp) rewardParts.push(rewardLine('⬆️ レベルアップ！ Lv.' + lv.level, 'levelup'))
      showGameDialog({
        icon: '🎁',
        title: '報酬を受け取りました',
        body: rewardParts.join('')
      })
    })
  })
}

// ============================================================
// ショップ（§18: 通貨の消費・グッズ購入）
// ============================================================

// ホームのコレクション棚に所持グッズを飾る（9スロットまで）
function renderCollectionShelf() {
  var gd = loadGameData()
  var slots = document.querySelectorAll('.shelf-slot')
  if (!slots.length) return
  var owned = ownedGoodsList(gd)
  slots.forEach(function (slot, i) {
    slot.classList.remove('filled')
    slot.textContent = ''
    if (owned[i]) {
      slot.classList.add('filled')
      slot.textContent = owned[i].def.emoji
    }
  })
}

// ショップ画面の描画
// ショップのカテゴリ分け（表示用）
var SHOP_CATS = [
  { key: 'accessory', label: 'アクセサリー', ids: ['badgeParts', 'canBadge', 'acrylicKeychain', 'acrylicStand'] },
  { key: 'itabag', label: '痛バグッズ', ids: ['itabagBody'] },
  { key: 'interior', label: 'ルームグッズ', ids: ['poster', 'tapestry', 'shelf'] }
]
// 商品サムネイルの背景グラデーション（高級感・品目ごとに色を変える）
var SHOP_THUMB = {
  badgeParts: 'linear-gradient(135deg,#fdf2e3,#fbe0c3)',
  canBadge: 'linear-gradient(135deg,#ffe9ee,#ffd3dd)',
  acrylicKeychain: 'linear-gradient(135deg,#e6f3ff,#cfe7ff)',
  acrylicStand: 'linear-gradient(135deg,#ece7ff,#dcd2ff)',
  itabagBody: 'linear-gradient(135deg,#e7fff4,#c6efdc)',
  poster: 'linear-gradient(135deg,#fff6df,#ffe6ae)',
  tapestry: 'linear-gradient(135deg,#f3e8ff,#e2d2ff)',
  shelf: 'linear-gradient(135deg,#f1efe9,#ddd8ca)'
}

function renderShopScreen() {
  var gd = loadGameData()
  var body = document.getElementById('shop-body')
  if (!body) return

  var owned = {}
  ownedGoodsList(gd).forEach(function (o) { owned[o.def.id] = o.count })

  function cardHtml(g) {
    var count = owned[g.id] || 0
    var canBuy = gd.currency >= g.price
    return (
      '<div class="shop-card">' +
        '<div class="shop-card-thumb" style="background:' + (SHOP_THUMB[g.id] || 'linear-gradient(135deg,#f2ecff,#e4d9ff)') + '">' +
          '<span>' + g.emoji + '</span>' +
          (count > 0 ? '<span class="shop-card-owned">所持 ' + count + '</span>' : '') +
        '</div>' +
        '<div class="shop-card-info">' +
          '<div class="shop-card-name">' + g.name + '</div>' +
          '<div class="shop-card-desc">' + g.desc + '</div>' +
        '</div>' +
        '<div class="shop-card-foot">' +
          '<span class="shop-card-price">💰 ' + g.price + '</span>' +
          '<button class="shop-card-buy' + (canBuy ? '' : ' disabled') + '" data-goods="' + g.id + '"' + (canBuy ? '' : ' disabled') + '>' + (canBuy ? '購入する' : '通貨不足') + '</button>' +
        '</div>' +
      '</div>'
    )
  }

  var sectionsHtml = SHOP_CATS.map(function (cat) {
    var goods = cat.ids.map(function (id) {
      return SHOP_GOODS.find(function (g) { return g.id === id })
    }).filter(Boolean)
    if (!goods.length) return ''
    return (
      '<div class="shop-cat-title">' + cat.label + '</div>' +
      '<div class="shop-grid">' + goods.map(cardHtml).join('') + '</div>'
    )
  }).join('')

  body.innerHTML =
    '<div class="shop-hero">' +
      '<img src="images/pc/Milli Shop.png" alt="Milli Shop">' +
      '<div class="shop-hero-text">' +
        '<div class="shop-hero-title">Milli Pro オンラインショップ</div>' +
        '<div class="shop-hero-sub">公式グッズで、推し活をもっと楽しく。</div>' +
      '</div>' +
    '</div>' +
    '<div class="shop-wallet">' +
      '<span class="shop-wallet-label">💰 所持通貨</span>' +
      '<span class="shop-wallet-value">' + gd.currency + '</span>' +
    '</div>' +
    sectionsHtml +
    '<p class="shop-note">購入したグッズはホームのコレクション棚に飾られます</p>'

  body.querySelectorAll('.shop-card-buy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gdNow = loadGameData()
      var result = buyGoods(gdNow, btn.dataset.goods)
      if (!result.ok) {
        if (result.reason === 'currency') alert('通貨が足りません')
        return
      }
      questAddProgress(gdNow, 'goodsPurchased')
      saveGameData(gdNow)
      refreshPlayerStatus()
      renderShopScreen()
      renderCollectionShelf()
      playTapSound()
      showGameDialog({
        icon: '🛍️',
        title: '購入しました',
        body: rewardLine(result.goods.name + ' を手に入れた！')
      })
    })
  })
}

// ============================================================
// 痛バッグ制作（§16: 注文通りにバッジを配置するタイムアタック）
// 3つの注文を連続でこなす。各注文60秒。★はタイムと正確さで判定
// ============================================================

var itabagState = null

// メニュー画面（説明 + 開始）
function renderItabagScreen() {
  var body = document.getElementById('itabag-body')
  if (!body) return
  if (window._itabagTimer) { clearInterval(window._itabagTimer); window._itabagTimer = null }
  var gd = loadGameData()
  var clears = (gd.stats && gd.stats.itabagClears) || 0
  body.innerHTML =
    '<div class="itabag-menu">' +
      '<div class="itabag-menu-emoji">🎒</div>' +
      '<p class="itabag-menu-title">痛バッグ制作</p>' +
      '<p class="itabag-menu-desc">注文通りにバッジを配置して痛バッグを完成させるタイムアタック！</p>' +
      '<p class="itabag-menu-rule">・3つの注文を連続でこなします<br>・各注文の制限時間は60秒<br>・「完成！」の押し間違いは星評価に影響<br>・★はタイムと正確さで判定（★1〜3）</p>' +
      '<div class="itabag-menu-reward">報酬 ★1: 💰20/⭐10 ・ ★2: 💰35/⭐18 ・ ★3: 💰50/⭐25</div>' +
      '<div class="itabag-menu-stats">これまでの完成数: <b>' + clears + '</b> 個</div>' +
      '<button class="itabag-start-btn" id="itabag-start-btn">🎒 はじめる</button>' +
    '</div>'
  document.getElementById('itabag-start-btn').addEventListener('click', startItabagGame)
}

// 注文（お手本）をランダム生成: 4〜6スロットにランダムなバッジ
function generateItabagOrder() {
  var slots = []
  var count = 4 + Math.floor(Math.random() * 3)
  while (slots.length < count) {
    var idx = Math.floor(Math.random() * 9)
    if (slots.indexOf(idx) >= 0) continue
    slots.push(idx)
  }
  var order = []
  for (var i = 0; i < 9; i++) order.push(null)
  slots.forEach(function (idx) {
    order[idx] = ITABAG_BADGES[Math.floor(Math.random() * ITABAG_BADGES.length)].id
  })
  return order
}

// ゲーム開始（3ラウンド）
function startItabagGame() {
  itabagState = {
    round: 1,
    totalStars: 0,
    order: null,
    grid: null,
    selected: null,
    remaining: 60,
    timerId: null,
  }
  renderItabagRound()
}

function renderItabagRound() {
  var body = document.getElementById('itabag-body')
  if (!body || !itabagState) return
  itabagState.order = generateItabagOrder()
  itabagState.grid = []
  for (var i = 0; i < 9; i++) itabagState.grid.push(null)
  itabagState.selected = null
  itabagState.remaining = 60
  renderItabagGame()

  window._itabagTimer = setInterval(function () {
    itabagState.remaining--
    var t = document.getElementById('itabag-timer')
    if (t) {
      t.textContent = itabagState.remaining + '秒'
      t.classList.toggle('danger', itabagState.remaining <= 10)
    }
    if (itabagState.remaining <= 0) {
      clearInterval(window._itabagTimer)
      window._itabagTimer = null
      itabagRoundEnd(0)
    }
  }, 1000)
}

function renderItabagGame() {
  var body = document.getElementById('itabag-body')
  if (!body || !itabagState) return

  function badgeOf(id) {
    return ITABAG_BADGES.find(function (b) { return b.id === id })
  }

  var orderHtml = itabagState.order.map(function (bid) {
    var def = badgeOf(bid)
    return '<div class="itabag-order-slot">' + (def ? def.emoji : '') + '</div>'
  }).join('')

  var gridHtml = itabagState.grid.map(function (bid, i) {
    var def = badgeOf(bid)
    return '<div class="itabag-slot' + (bid ? ' filled' : '') + '" data-slot="' + i + '"' + (bid ? ' draggable="true"' : '') + '>' + (def ? def.emoji : '') + '</div>'
  }).join('')

  var paletteHtml = ITABAG_BADGES.map(function (b) {
    return '<button type="button" class="itabag-palette-btn' + (itabagState.selected === b.id ? ' selected' : '') + '" data-badge="' + b.id + '" draggable="true">' + b.emoji + '<span>' + b.name + '</span></button>'
  }).join('')

  body.innerHTML =
    '<div class="itabag-game">' +
      '<div class="itabag-top">' +
        '<span class="itabag-round">注文 ' + itabagState.round + ' / 3</span>' +
        '<span class="itabag-timer" id="itabag-timer">' + itabagState.remaining + '秒</span>' +
        '<span class="itabag-stars">★ 合計 ' + itabagState.totalStars + '</span>' +
      '</div>' +
      '<div class="itabag-order-label">🎫 注文（この通りに配置！）</div>' +
      '<div class="itabag-order">' + orderHtml + '</div>' +
      '<div class="itabag-bag-label">👜 バッグ（ドラッグ or タップで配置・タップで外す）</div>' +
      '<div class="itabag-bag">' + gridHtml + '</div>' +
      '<div class="itabag-palette-label">バッジパレット（ドラッグ or タップで選択）</div>' +
      '<div class="itabag-palette">' + paletteHtml + '</div>' +
      '<div class="itabag-actions">' +
        '<button type="button" class="itabag-done-btn" id="itabag-done-btn">完成！</button>' +
        '<button type="button" class="itabag-clear-btn" id="itabag-clear-btn">全部消す</button>' +
      '</div>' +
    '</div>'

  // パレットボタン: タップで選択 + ドラッグ&ドロップ（PC: drag / スマホ: touch）
  body.querySelectorAll('.itabag-palette-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (itabagState.selected === btn.dataset.badge) itabagState.selected = null
      else itabagState.selected = btn.dataset.badge
      renderItabagGame()
    })
    btn.addEventListener('dragstart', function (e) {
      itabagDragSource = null
      e.dataTransfer.setData('text/plain', btn.dataset.badge)
      e.dataTransfer.effectAllowed = 'copy'
      btn.classList.add('dragging')
    })
    btn.addEventListener('dragend', function () {
      btn.classList.remove('dragging')
    })
    btn.addEventListener('touchstart', function (e) {
      var t = e.touches[0]
      itabagDrag = { badgeId: btn.dataset.badge, sourceIdx: null, startX: t.clientX, startY: t.clientY, active: false, ghost: null }
    }, { passive: true })
  })

  // スロット: タップで配置/解除 + ドロップ受け入れ + 配置済みはドラッグで移動
  body.querySelectorAll('.itabag-slot').forEach(function (slot) {
    slot.addEventListener('click', function () {
      var idx = parseInt(slot.dataset.slot, 10)
      if (itabagState.selected) {
        itabagState.grid[idx] = itabagState.selected
      } else {
        itabagState.grid[idx] = null
      }
      renderItabagGame()
    })
    slot.addEventListener('dragover', function (e) {
      e.preventDefault()
      e.dataTransfer.dropEffect = itabagDragSource !== null ? 'move' : 'copy'
      slot.classList.add('drop-target')
    })
    slot.addEventListener('dragleave', function () {
      slot.classList.remove('drop-target')
    })
    slot.addEventListener('drop', function (e) {
      e.preventDefault()
      slot.classList.remove('drop-target')
      var id = e.dataTransfer.getData('text/plain')
      if (id) itabagPlaceBadge(slot.dataset.slot, id, itabagDragSource)
      itabagDragSource = null
    })
    if (itabagState.grid[parseInt(slot.dataset.slot, 10)]) {
      slot.addEventListener('dragstart', function (e) {
        itabagDragSource = parseInt(slot.dataset.slot, 10)
        e.dataTransfer.setData('text/plain', itabagState.grid[itabagDragSource])
        e.dataTransfer.effectAllowed = 'move'
      })
      slot.addEventListener('touchstart', function (e) {
        var idx = parseInt(slot.dataset.slot, 10)
        var t = e.touches[0]
        itabagDrag = { badgeId: itabagState.grid[idx], sourceIdx: idx, startX: t.clientX, startY: t.clientY, active: false, ghost: null }
      }, { passive: true })
    }
  })

  document.getElementById('itabag-clear-btn').addEventListener('click', function () {
    for (var i = 0; i < 9; i++) itabagState.grid[i] = null
    renderItabagGame()
  })

  document.getElementById('itabag-done-btn').addEventListener('click', function () {
    var correct = itabagState.order.every(function (bid, i) { return itabagState.grid[i] === bid })
    if (!correct) {
      itabagState.mistakes = (itabagState.mistakes || 0) + 1
      var msg = document.createElement('div')
      msg.className = 'itabag-fail-msg'
      msg.textContent = '⚠️ 注文と違う配置です（' + itabagState.mistakes + '回目）'
      var game = body.querySelector('.itabag-game')
      if (game && !game.querySelector('.itabag-fail-msg')) game.appendChild(msg)
      return
    }
    clearInterval(window._itabagTimer)
    window._itabagTimer = null
    var elapsed = 60 - itabagState.remaining
    var mistakes = itabagState.mistakes || 0
    var stars
    if (elapsed <= 20 && mistakes === 0) stars = 3
    else if (elapsed <= 35) stars = 2
    else stars = 1
    itabagRoundEnd(stars, elapsed, mistakes)
  })
}

// ドラッグ&ドロップ用の共有状態（PC: drag / スマホ: touch）
var itabagDragSource = null // 移動元スロット（パレット起点は null）
var itabagDrag = null // { badgeId, sourceIdx, startX, startY, active, ghost }

function itabagBadgeEmoji(id) {
  var def = null
  ITABAG_BADGES.forEach(function (b) { if (b.id === id) def = b })
  return def ? def.emoji : '📛'
}

// 配置（パレットから / スロット間の移動）
function itabagPlaceBadge(targetIdx, badgeId, sourceIdx) {
  if (!itabagState) return
  var idx = parseInt(targetIdx, 10)
  if (isNaN(idx) || idx < 0 || idx > 8) return
  if (sourceIdx !== null && sourceIdx !== undefined && itabagState.grid[sourceIdx] === badgeId) {
    if (itabagState.grid[idx]) return
    itabagState.grid[sourceIdx] = null
    itabagState.grid[idx] = badgeId
    renderItabagGame()
    return
  }
  if (itabagState.grid[idx]) return
  itabagState.grid[idx] = badgeId
  renderItabagGame()
}

function positionItabagGhost(t) {
  if (!itabagDrag || !itabagDrag.ghost) return
  itabagDrag.ghost.style.left = t.clientX + 'px'
  itabagDrag.ghost.style.top = t.clientY + 'px'
}

function endItabagTouchDrag() {
  if (!itabagDrag) return
  if (itabagDrag.ghost && itabagDrag.ghost.parentNode) itabagDrag.ghost.parentNode.removeChild(itabagDrag.ghost)
  itabagDrag = null
}

// タッチドラッグ（スマホ）: ドキュメント共通リスナー（一度だけ）
document.addEventListener('touchmove', function (e) {
  if (!itabagDrag || itabagDrag.active) return
  var t = e.touches[0]
  var dx = t.clientX - itabagDrag.startX
  var dy = t.clientY - itabagDrag.startY
  if (dx * dx + dy * dy < 100) return
  e.preventDefault()
  itabagDrag.active = true
  var ghost = document.createElement('div')
  ghost.className = 'itabag-drag-ghost'
  ghost.textContent = itabagBadgeEmoji(itabagDrag.badgeId)
  document.body.appendChild(ghost)
  itabagDrag.ghost = ghost
  positionItabagGhost(t)
}, { passive: false })

document.addEventListener('touchmove', function (e) {
  if (!itabagDrag || !itabagDrag.active) return
  e.preventDefault()
  positionItabagGhost(e.touches[0])
}, { passive: false })

document.addEventListener('touchend', function (e) {
  if (!itabagDrag) return
  var t = e.changedTouches[0]
  if (itabagDrag.active && t) {
    var el = document.elementFromPoint(t.clientX, t.clientY)
    var slot = el ? el.closest('.itabag-slot') : null
    if (slot) itabagPlaceBadge(slot.dataset.slot, itabagDrag.badgeId, itabagDrag.sourceIdx)
  }
  endItabagTouchDrag()
})

document.addEventListener('touchcancel', function () {
  endItabagTouchDrag()
})

// ラウンド終了（stars=0 はタイムアップ）
function itabagRoundEnd(stars, elapsed, mistakes) {
  var body = document.getElementById('itabag-body')
  if (!body || !itabagState) return
  itabagState.totalStars += stars

  if (stars === 0) {
    // タイムアップ → その注文は失敗扱いで次の注文へ
    if (itabagState.round >= 3) {
      finishItabagGame()
      return
    }
    itabagState.round++
    renderItabagRound()
    return
  }

  if (itabagState.round < 3) {
    body.innerHTML =
      '<div class="itabag-result">' +
        '<div class="itabag-result-stars">' + '★'.repeat(stars) + '</div>' +
        '<p>注文 ' + itabagState.round + ' 完成！ 残り ' + elapsed + '秒</p>' +
        '<button type="button" class="itabag-next-btn" id="itabag-next-btn">次の注文へ →</button>' +
      '</div>'
    document.getElementById('itabag-next-btn').addEventListener('click', function () {
      itabagState.round++
      renderItabagRound()
    })
    return
  }

  finishItabagGame(stars, elapsed)
}

// 全ラウンド終了 → 報酬付与
function finishItabagGame(lastStars) {
  var body = document.getElementById('itabag-body')
  if (!body || !itabagState) return
  var gd = loadGameData()
  var total = itabagState.totalStars
  var reward = applyJobBuff(gd, 'cheer', itabagTotalReward(Math.max(1, Math.min(9, total))))
  gd.currency += reward.currency
  var lv = addExp(gd, reward.exp)
  recordItabag(gd, total, 0, itabagState.mistakes || 0)
  questAddProgress(gd, 'itabagComplete')
  saveGameData(gd)
  refreshPlayerStatus()
  playTapSound()

  body.innerHTML =
    '<div class="itabag-result final">' +
      '<div class="itabag-result-stars">' + '★'.repeat(total) + (total < 3 ? '☆'.repeat(3 - total) : '') + '</div>' +
      '<p class="itabag-result-title">痛バッグ制作完了！</p>' +
      '<p class="itabag-result-reward">💰 +' + reward.currency + ' / ⭐ EXP +' + reward.exp + (lv.leveledUp ? '（🎊 レベルアップ！ Lv.' + lv.newLevel + '）' : '') + '</p>' +
      '<button type="button" class="itabag-next-btn" id="itabag-retry-btn">もう一度遊ぶ</button>' +
      '<button type="button" class="itabag-back-btn" id="itabag-back-btn">メニューへ戻る</button>' +
    '</div>'
  itabagState = null

  document.getElementById('itabag-retry-btn').addEventListener('click', startItabagGame)
  document.getElementById('itabag-back-btn').addEventListener('click', renderItabagScreen)
}

// ポップアップを閉じたらタイマーを止める（痛バッグ制作の進行を破棄）
;(function () {
  var popup = document.getElementById('popup-itabag')
  if (!popup) return
  function stopTimer() {
    if (window._itabagTimer) { clearInterval(window._itabagTimer); window._itabagTimer = null }
    itabagState = null
  }
  popup.addEventListener('click', function (e) {
    if (e.target === popup || e.target.closest('.popup-close-btn')) stopTimer()
  })
})()

// ============================================================
// ギャラリー（§22: お絵かき・投稿・展示・売買・壁飾り）
// ============================================================

var canvasState = {
  drawing: false,
  color: '#333333',
  size: 6,
  tool: 'pen',
  imageData: null,
}
var GALLERY_COLORS = ['#333333', '#ffffff', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e', '#111827']
var GALLERY_SIZES = [3, 6, 12]
var galleryRemoteList = []

function newArtworkId() {
  return 'art-' + Date.now() + '-' + Math.floor(Math.random() * 1e6)
}

// Canvas（お絵かき）画面
function renderCanvasScreen() {
  var body = document.getElementById('canvas-body')
  if (!body) return

  var colorSwatches = GALLERY_COLORS.map(function (c) {
    return '<button class="canvas-color" data-color="' + c + '" style="background:' + c + '"' +
      (c === canvasState.color ? ' data-active="1"' : '') + '></button>'
  }).join('')
  var sizeBtns = GALLERY_SIZES.map(function (s) {
    return '<button class="canvas-menu-size" data-size="' + s + '"' + (s === canvasState.size ? ' data-active="1"' : '') + '>' +
      '<span class="canvas-size-dot" style="width:' + s + 'px;height:' + s + 'px"></span>' + s + '</button>'
  }).join('')

  function canvasToolLabel() {
    return canvasState.tool === 'eraser' ? '🧽 消しゴム' : '✏️ ペン'
  }

  body.innerHTML =
    '<div class="canvas-topbar">' +
      '<button type="button" class="canvas-menu-btn" id="canvas-menu-btn" aria-label="メニュー">☰</button>' +
      '<span class="canvas-status" id="canvas-status">' + canvasToolLabel() + '</span>' +
      '<div class="canvas-top-tools">' +
        '<button type="button" class="canvas-quick" data-tool="pen">✏️</button>' +
        '<button type="button" class="canvas-quick" data-tool="eraser">🧽</button>' +
        '<button type="button" class="canvas-quick canvas-quick-danger" id="canvas-tool-clear">🗑️</button>' +
      '</div>' +
      '<div class="canvas-menu hidden" id="canvas-menu">' +
        '<div class="canvas-menu-group">' +
          '<div class="canvas-menu-title">ツール</div>' +
          '<div class="canvas-menu-row">' +
            '<button type="button" class="canvas-menu-tool" data-tool="pen">✏️ ペン</button>' +
            '<button type="button" class="canvas-menu-tool" data-tool="eraser">🧽 消しゴム</button>' +
          '</div>' +
        '</div>' +
        '<div class="canvas-menu-group">' +
          '<div class="canvas-menu-title">太さ</div>' +
          '<div class="canvas-menu-row">' + sizeBtns + '</div>' +
        '</div>' +
        '<div class="canvas-menu-group">' +
          '<div class="canvas-menu-title">アクション</div>' +
          '<div class="canvas-menu-row">' +
            '<button type="button" class="canvas-menu-action" id="canvas-upload-btn">📁 画像を選ぶ</button>' +
            '<button type="button" class="canvas-menu-action" id="canvas-save-btn">💾 端末に保存</button>' +
            '<button type="button" class="canvas-menu-action canvas-post-btn" id="canvas-post-btn">🖼️ 投稿</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="canvas-colors">' + colorSwatches + '</div>' +
    '<div class="canvas-wrap"><canvas id="canvas-main" width="512" height="512"></canvas></div>' +
    '<input type="file" id="canvas-file-input" accept="image/*" class="hidden">'

  var canvas = document.getElementById('canvas-main')
  var ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 512, 512)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  function strokeColor() {
    return canvasState.tool === 'eraser' ? '#ffffff' : canvasState.color
  }

  function posFromEvent(e) {
    var rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (512 / rect.width),
      y: (e.clientY - rect.top) * (512 / rect.height),
    }
  }

  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId)
    var p = posFromEvent(e)
    canvasState.drawing = true
    canvasState.lastX = p.x
    canvasState.lastY = p.y
    ctx.beginPath()
    ctx.arc(p.x, p.y, canvasState.size / 2, 0, Math.PI * 2)
    ctx.fillStyle = strokeColor()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    playTapSound()
  })
  canvas.addEventListener('pointermove', function (e) {
    if (!canvasState.drawing) return
    var p = posFromEvent(e)
    ctx.strokeStyle = strokeColor()
    ctx.lineWidth = canvasState.size
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  })
  canvas.addEventListener('pointerup', function () { canvasState.drawing = false })
  canvas.addEventListener('pointercancel', function () { canvasState.drawing = false })

  // ---- ツール切替（トップバー + メニュー共通） ----
  var menuEl = document.getElementById('canvas-menu')
  var statusEl = document.getElementById('canvas-status')

  function setCanvasTool(tool) {
    canvasState.tool = tool
    statusEl.textContent = canvasToolLabel()
    body.querySelectorAll('[data-tool]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tool === tool)
    })
  }
  function closeCanvasMenu() { menuEl.classList.add('hidden') }

  body.querySelectorAll('[data-tool]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setCanvasTool(btn.dataset.tool)
      closeCanvasMenu()
      playTapSound()
    })
  })
  setCanvasTool(canvasState.tool)

  // ---- ハンバーガーメニュー開閉（外側クリックで閉じる） ----
  document.getElementById('canvas-menu-btn').addEventListener('click', function (e) {
    e.stopPropagation()
    menuEl.classList.toggle('hidden')
    playTapSound()
  })
  body.addEventListener('click', function (e) {
    if (menuEl.classList.contains('hidden')) return
    if (menuEl.contains(e.target)) return
    if (e.target.closest && e.target.closest('#canvas-menu-btn')) return
    closeCanvasMenu()
  })

  // ---- 色（選ぶとペンに切替） ----
  body.querySelectorAll('.canvas-color').forEach(function (btn) {
    btn.addEventListener('click', function () {
      canvasState.color = btn.dataset.color
      setCanvasTool('pen')
      body.querySelectorAll('.canvas-color').forEach(function (b) { b.dataset.active = b === btn ? '1' : '' })
      playTapSound()
    })
  })

  // ---- 太さ ----
  body.querySelectorAll('.canvas-menu-size').forEach(function (btn) {
    btn.addEventListener('click', function () {
      canvasState.size = Number(btn.dataset.size)
      body.querySelectorAll('.canvas-menu-size').forEach(function (b) { b.dataset.active = b === btn ? '1' : '' })
      playTapSound()
    })
  })

  // ---- 全部消す ----
  document.getElementById('canvas-tool-clear').addEventListener('click', function () {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)
    playTapSound()
  })

  // ---- 端末に保存 ----
  document.getElementById('canvas-save-btn').addEventListener('click', function () {
    closeCanvasMenu()
    var a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'canvas-art.png'
    a.click()
    playTapSound()
  })

  // ---- 画像を選ぶ ----
  document.getElementById('canvas-upload-btn').addEventListener('click', function () {
    closeCanvasMenu()
    document.getElementById('canvas-file-input').click()
  })
  document.getElementById('canvas-file-input').addEventListener('change', function () {
    var file = this.files && this.files[0]
    this.value = ''
    if (!file) return
    var reader = new FileReader()
    reader.onload = function () {
      var img = new Image()
      img.onload = function () {
        canvasState.imageData = scaleImageData(img)
        renderGalleryScreen('upload')
        closePopup('popup-canvas')
        openPopup('popup-gallery')
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

  // ---- ギャラリーへ投稿 ----
  document.getElementById('canvas-post-btn').addEventListener('click', function () {
    canvasState.imageData = canvas.toDataURL('image/jpeg', 0.85)
    renderGalleryScreen('upload')
    closePopup('popup-canvas')
    openPopup('popup-gallery')
    playTapSound()
  })
}

// 画像を長辺512pxに縮小してJPEG dataURL に変換
function scaleImageData(img) {
  var max = 512
  var w = img.naturalWidth || img.width
  var h = img.naturalHeight || img.height
  var scale = Math.min(1, max / Math.max(w, h))
  var c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  var ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

// ギャラリー画面（tab: upload / mine / all）
function renderGalleryScreen(tab) {
  var body = document.getElementById('gallery-body')
  if (!body) return

  var tabs = [
    { key: 'upload', label: '🎨 投稿' },
    { key: 'mine', label: '🗂️ マイギャラリー' },
    { key: 'all', label: '🌐 みんなのギャラリー' },
  ]
  var tabHtml = '<div class="gallery-tabs">' + tabs.map(function (t) {
    return '<button class="gallery-tab' + (t.key === tab ? ' active' : '') + '" data-tab="' + t.key + '">' + t.label + '</button>'
  }).join('') + '</div>'

  var content = ''
  if (tab === 'upload') content = renderGalleryUploadTab()
  else if (tab === 'mine') content = renderGalleryMineTab()
  else content = renderGalleryAllTab()

  body.innerHTML = tabHtml + '<div class="gallery-tab-body">' + content + '</div>'

  body.querySelectorAll('.gallery-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      renderGalleryScreen(btn.dataset.tab)
      playTapSound()
    })
  })

  bindGalleryUploadEvents(body, tab)
  bindGalleryMineEvents(body, tab)
  bindGalleryAllEvents(body, tab)
}

// ---- 投稿タブ ----
function renderGalleryUploadTab() {
  var ud = loadUserData()
  if (!canvasState.imageData) {
    return (
      '<div class="gallery-upload-empty">' +
        '<div class="gallery-upload-icon">🎨</div>' +
        '<p>Canvasでお絵かきするか、画像ファイルを選んで投稿しましょう。</p>' +
        '<button class="canvas-open-btn" id="gallery-canvas-open">✏️ お絵かきを開く</button>' +
        '<button class="canvas-upload-btn" id="gallery-file-open">📁 画像を選ぶ</button>' +
        '<input type="file" id="gallery-file-input" accept="image/*" class="hidden">' +
      '</div>'
    )
  }
  return (
    '<div class="gallery-upload-form">' +
      '<div class="gallery-upload-preview"><img id="gallery-preview-img" src="' + canvasState.imageData + '" alt="プレビュー"></div>' +
      '<input type="text" id="gallery-title-input" class="gallery-input" placeholder="作品タイトル（20文字まで）" maxlength="20">' +
      '<input type="text" id="gallery-desc-input" class="gallery-input" placeholder="説明・コメント（60文字まで・任意）" maxlength="60">' +
      '<div class="gallery-mode-row">' +
        '<label class="gallery-mode-opt"><input type="radio" name="gallery-mode" value="private" checked> 自分用</label>' +
        '<label class="gallery-mode-opt"><input type="radio" name="gallery-mode" value="exhibit"> 展示</label>' +
        '<label class="gallery-mode-opt"><input type="radio" name="gallery-mode" value="sale"> 出品</label>' +
      '</div>' +
      '<div class="gallery-price-row hidden" id="gallery-price-row">' +
        '<label class="gallery-price-label">💰 販売価格</label>' +
        '<input type="number" id="gallery-price-input" class="gallery-input" min="10" max="10000" step="10" value="100">' +
        '<div class="gallery-price-note">売れたら販売額の90%を受け取れます（10%は手数料）</div>' +
      '</div>' +
      '<div class="gallery-author-note">投稿者: ' + (ud ? (ud.playerName || ud.playerId || 'あなた') : 'あなた') + '</div>' +
      '<button class="gallery-submit-btn" id="gallery-submit-btn">📤 投稿する</button>' +
      '<button class="gallery-cancel-btn" id="gallery-cancel-btn">✕ 取り消す</button>' +
    '</div>'
  )
}

function bindGalleryUploadEvents(body, tab) {
  if (tab !== 'upload') return
  var canvasOpen = document.getElementById('gallery-canvas-open')
  if (canvasOpen) canvasOpen.addEventListener('click', function () {
    renderCanvasScreen()
    openPopup('popup-canvas')
    playTapSound()
  })
  var fileOpen = document.getElementById('gallery-file-open')
  var fileInput = document.getElementById('gallery-file-input')
  if (fileOpen && fileInput) fileOpen.addEventListener('click', function () { fileInput.click() })
  if (fileInput) fileInput.addEventListener('change', function () {
    var file = this.files && this.files[0]
    this.value = ''
    if (!file) return
    var reader = new FileReader()
    reader.onload = function () {
      var img = new Image()
      img.onload = function () { canvasState.imageData = scaleImageData(img); renderGalleryScreen('upload') }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

  body.querySelectorAll('input[name="gallery-mode"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      document.getElementById('gallery-price-row').classList.toggle('hidden', radio.value !== 'sale')
      playTapSound()
    })
  })

  var cancelBtn = document.getElementById('gallery-cancel-btn')
  if (cancelBtn) cancelBtn.addEventListener('click', function () {
    canvasState.imageData = null
    renderGalleryScreen('upload')
    playTapSound()
  })

  var submitBtn = document.getElementById('gallery-submit-btn')
  if (!submitBtn) return
  submitBtn.addEventListener('click', function () {
    var title = document.getElementById('gallery-title-input').value.trim()
    if (!title) { alert('タイトルを入力してください'); return }
    var mode = body.querySelector('input[name="gallery-mode"]:checked').value
    var price = 0
    if (mode === 'sale') {
      price = Math.max(10, Number(document.getElementById('gallery-price-input').value) || 0)
    }
    var gd = loadGameData()
    var art = {
      id: newArtworkId(),
      title: title,
      desc: document.getElementById('gallery-desc-input').value.trim(),
      imageData: canvasState.imageData,
      price: price,
      mode: mode,
      createdAt: Date.now(),
    }
    addLocalArtwork(gd, art)
    // 初回投稿報酬（§18）と創作力（§17）
    if (!gd.stats.artworksListed) {
      gd.stats.artworksListed = 1
      gd.currency += GALLERY_FIRST_REWARD.currency
      addExp(gd, GALLERY_FIRST_REWARD.exp)
    }
    gd.points.create += 5
    questAddProgress(gd, 'galleryPosts')
    saveGameData(gd)
    refreshPlayerStatus()

    var posted = true
    if (mode !== 'private') {
      posted = false
      gallerySubmitRemote(art).then(function (ok) {
        posted = ok
        if (!ok) alert('⚠️ Firebase が未設定のため他のプレイヤーには公開されません（自分用として保存）')
        canvasState.imageData = null
        renderGalleryScreen('mine')
      })
    }
    if (posted) {
      canvasState.imageData = null
      renderGalleryScreen('mine')
    }
    showGameDialog({
      icon: '🎉',
      title: '投稿しました',
      body: rewardLine('作品が保存されました！')
    })
    playTapSound()
  })
}

// 作品をクラウド（millipro/gallery）に公開
function gallerySubmitRemote(art) {
  return new Promise(function (resolve) {
    if (!firebaseAvailable()) return resolve(false)
    var pid = getMilliproPlayerId()
    if (!pid) return resolve(false)
    var ud = loadUserData() || {}
    firebase.database().ref('millipro/gallery/' + art.id).set({
      id: art.id,
      playerId: pid,
      playerName: ud.playerName || '',
      icon: ud.icon || '',
      title: art.title,
      desc: art.desc,
      imageData: art.imageData,
      price: art.price,
      mode: art.mode,
      createdAt: art.createdAt,
    }).then(function () { resolve(true) }).catch(function () { resolve(false) })
  })
}

// 作品の公開設定を更新（private なら削除）
function galleryUpdateRemote(art) {
  if (art.mode === 'private') return galleryDeleteRemote(art.id)
  return gallerySubmitRemote(art)
}

// 作品をクラウドから削除
function galleryDeleteRemote(id) {
  return new Promise(function (resolve) {
    if (!firebaseAvailable()) return resolve(false)
    var pid = getMilliproPlayerId()
    if (!pid) return resolve(false)
    firebase.database().ref('millipro/gallery/' + id).remove()
      .then(function () { resolve(true) })
      .catch(function () { resolve(false) })
  })
}

// ---- マイギャラリータブ ----
function renderGalleryMineTab() {
  var gd = loadGameData()
  var mine = gd.gallery && gd.gallery.artworks || []
  var owned = gd.collection && gd.collection.artworks || []

  var mineHtml = mine.length === 0
    ? '<div class="gallery-empty">まだ作品がありません。投稿タブからお絵かきや画像を投稿しましょう。</div>'
    : mine.map(function (a) {
        return galleryMineCard(a)
      }).join('')

  var ownedHtml = owned.length === 0
    ? '<div class="gallery-empty">購入した絵はありません。</div>'
    : owned.map(function (a) {
        return (
          '<div class="gallery-card owned">' +
            '<div class="gallery-card-img"><img src="' + a.imageData + '" alt="' + a.title + '"></div>' +
            '<div class="gallery-card-info">' +
              '<div class="gallery-card-title">' + a.title + '</div>' +
              '<div class="gallery-card-sub">購入: 💰 ' + a.price + '</div>' +
              '<div class="gallery-card-btns">' +
                '<button class="gallery-wall-btn" data-own-id="' + a.id + '">🖼️ 壁に飾る</button>' +
                '<button class="gallery-save-btn" data-save-id="' + a.id + '">💾 保存</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        )
      }).join('')

  return (
    '<div class="gallery-section-title">自分の作品</div>' +
    '<div class="gallery-list">' + mineHtml + '</div>' +
    '<div class="gallery-section-title">購入した絵</div>' +
    '<div class="gallery-list">' + ownedHtml + '</div>'
  )
}

function galleryMineCard(a) {
  var modeBadge = a.mode === 'sale' ? '💰 出品中 ' + a.price : (a.mode === 'exhibit' ? '🖼️ 展示中' : '🔒 自分用')
  return (
    '<div class="gallery-card">' +
      '<div class="gallery-card-img"><img src="' + a.imageData + '" alt="' + a.title + '"></div>' +
      '<div class="gallery-card-info">' +
        '<div class="gallery-card-title">' + a.title + '</div>' +
        '<div class="gallery-card-mode">' + modeBadge + '</div>' +
        '<div class="gallery-card-edit">' +
          '<select class="gallery-mode-select" data-art-id="' + a.id + '">' +
            '<option value="private"' + (a.mode === 'private' ? ' selected' : '') + '>自分用</option>' +
            '<option value="exhibit"' + (a.mode === 'exhibit' ? ' selected' : '') + '>展示</option>' +
            '<option value="sale"' + (a.mode === 'sale' ? ' selected' : '') + '>出品</option>' +
          '</select>' +
          '<input type="number" class="gallery-price-input" data-art-id="' + a.id + '" min="10" max="10000" step="10" value="' + (a.price || 100) + '"' + (a.mode === 'sale' ? '' : ' disabled') + '>' +
          '<button class="gallery-update-btn" data-art-id="' + a.id + '">更新</button>' +
        '</div>' +
        '<div class="gallery-card-btns">' +
          '<button class="gallery-wall-btn" data-mine-id="' + a.id + '">🖼️ 壁に飾る</button>' +
          '<button class="gallery-save-btn" data-save-id="' + a.id + '">💾 保存</button>' +
          '<button class="gallery-delete-btn" data-art-id="' + a.id + '">🗑️ 削除</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  )
}

function bindGalleryMineEvents(body, tab) {
  if (tab !== 'mine') return
  body.querySelectorAll('.gallery-mode-select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var input = body.querySelector('.gallery-price-input[data-art-id="' + sel.dataset.artId + '"]')
      if (input) input.disabled = sel.value !== 'sale'
    })
  })
  body.querySelectorAll('.gallery-update-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gd = loadGameData()
      var art = (gd.gallery && gd.gallery.artworks || []).find(function (a) { return a.id === btn.dataset.artId })
      if (!art) return
      var sel = body.querySelector('.gallery-mode-select[data-art-id="' + art.id + '"]')
      var priceInput = body.querySelector('.gallery-price-input[data-art-id="' + art.id + '"]')
      art.mode = sel.value
      if (sel.value === 'sale') art.price = Math.max(10, Number(priceInput.value) || 10)
      saveGameData(gd)
      galleryUpdateRemote(art).then(function (ok) {
        if (!ok && art.mode !== 'private') alert('⚠️ Firebase が未設定のため公開できませんでした')
        renderGalleryScreen('mine')
      })
      playTapSound()
    })
  })
  body.querySelectorAll('.gallery-delete-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!confirm('この作品を削除しますか？')) return
      var gd = loadGameData()
      removeLocalArtwork(gd, btn.dataset.artId)
      saveGameData(gd)
      galleryDeleteRemote(btn.dataset.artId)
      renderGalleryScreen('mine')
      playTapSound()
    })
  })
  body.querySelectorAll('.gallery-save-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gd = loadGameData()
      var art = (gd.gallery && gd.gallery.artworks || []).concat(gd.collection && gd.collection.artworks || [])
        .find(function (a) { return a.id === btn.dataset.saveId })
      if (!art) return
      var a = document.createElement('a')
      a.href = art.imageData
      a.download = (art.title || 'artwork') + '.jpg'
      a.click()
      playTapSound()
    })
  })
  body.querySelectorAll('.gallery-wall-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gd = loadGameData()
      if (btn.dataset.mineId) setWallArtwork(gd, { kind: 'mine', id: btn.dataset.mineId })
      else if (btn.dataset.ownId) setWallArtwork(gd, { kind: 'owned', id: btn.dataset.ownId })
      saveGameData(gd)
      renderWallArtwork()
      showGameDialog({
        icon: '🖼️',
        title: '壁に飾りました',
        body: rewardLine('ホーム画面で確認できます')
      })
      playTapSound()
    })
  })
}

// ---- みんなのギャラリータブ ----
function renderGalleryAllTab() {
  if (!firebaseAvailable()) {
    return '<div class="gallery-empty">Firebase が未設定のためみんなのギャラリーを表示できません。</div>'
  }
  var pid = getMilliproPlayerId()
  if (!pid) {
    return '<div class="gallery-empty">プレイヤーIDがありません。プロフィール画面でプレイヤーIDを設定してください。</div>'
  }
  return '<div class="gallery-loading">読み込んでいます...</div>'
}

function loadGalleryAll() {
  var body = document.getElementById('gallery-body')
  if (!body) return
  syncGallerySales().then(function (result) {
    if (result.count > 0) {
      showGameDialog({
        icon: '💰',
        title: '売上を回収しました',
        body: rewardLine('+' + result.currency + ' 通貨（作品 ' + result.count + ' 点）')
      })
    }
    var pid = getMilliproPlayerId()
    var db = firebase.database()
    db.ref('millipro/gallery').once('value').then(function (snap) {
      var all = snap.val() || {}
      galleryRemoteList = Object.keys(all).map(function (k) { return all[k] })
        .filter(function (a) { return a && a.mode === 'sale' || (a && a.mode === 'exhibit') })
        .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })

      var mineId = pid
      var cards = galleryRemoteList.map(function (a) {
        var isMine = a.playerId === mineId
        var reactions = a.reactions || {}
        var reactCount = Object.keys(reactions).length
        var reacted = !isMine && !!reactions[mineId]
        var sold = !!a.sold
        var modeBadge = a.mode === 'sale'
          ? (sold ? '💰 売約済み' : '💰 出品中 ' + a.price)
          : '🖼️ 展示中'
        var buyBtn = (!isMine && a.mode === 'sale' && !sold)
          ? '<button class="gallery-buy-btn" data-art-id="' + a.id + '">💰 購入する（' + a.price + '）</button>'
          : (isMine ? '<span class="gallery-own-tag">自分の作品</span>' : (sold ? '<span class="gallery-sold-tag">売約済み</span>' : ''))
        var reactBtn = isMine
          ? ''
          : (reacted
              ? '<button class="gallery-react-btn reacted" disabled>💛 応援済み ' + reactCount + '</button>'
              : '<button class="gallery-react-btn" data-art-id="' + a.id + '">💛 応援する（' + reactCount + '）</button>')
        return (
          '<div class="gallery-card remote">' +
            '<div class="gallery-card-img"><img src="' + a.imageData + '" alt="' + a.title + '"></div>' +
            '<div class="gallery-card-info">' +
              '<div class="gallery-card-title">' + a.title + '</div>' +
              '<div class="gallery-card-author">' + renderUserIconHTML(a) + ' ' + (a.playerName || a.playerId) + '</div>' +
              (a.desc ? '<div class="gallery-card-desc">' + a.desc + '</div>' : '') +
              '<div class="gallery-card-mode">' + modeBadge + '</div>' +
              '<div class="gallery-card-btns">' + reactBtn + buyBtn + '</div>' +
            '</div>' +
          '</div>'
        )
      }).join('')

      var bodyEl = body.querySelector('.gallery-tab-body')
      if (!bodyEl) return
      bodyEl.innerHTML = cards
        ? '<div class="gallery-list">' + cards + '</div>'
        : '<div class="gallery-empty">まだ公開作品がありません。あなたの作品を投稿してみましょう！</div>'

      bodyEl.querySelectorAll('.gallery-react-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { galleryReactArtwork(btn.dataset.artId) })
      })
      bodyEl.querySelectorAll('.gallery-buy-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { galleryBuyArtwork(btn.dataset.artId) })
      })
    })
  })
}

// ギャラリー用の作者アイコン表示（絵文字 or 画像 or 名前一文字）
function renderUserIconHTML(art) {
  if (art.icon && art.icon.indexOf('data:image') === 0) {
    return '<img class="gallery-author-icon" src="' + art.icon + '" alt="">'
  }
  if (art.icon) return '<span class="gallery-author-icon gallery-author-emoji">' + art.icon + '</span>'
  return '<span class="gallery-author-icon gallery-author-emoji">' + (art.playerName || '?').charAt(0) + '</span>'
}

function bindGalleryAllEvents(body, tab) {
  if (tab !== 'all') return
  loadGalleryAll()
}

// 応援する（リモートに記録）
function galleryReactArtwork(artId) {
  var pid = getMilliproPlayerId()
  if (!pid) return
  var db = firebase.database()
  db.ref('millipro/gallery/' + artId + '/reactions/' + pid).set(Date.now())
    .then(function () {
      var gd = loadGameData()
      gd.stats.galleryReactions++
      saveGameData(gd)
      loadGalleryAll()
      playTapSound()
    })
    .catch(function () { alert('応援できませんでした') })
}

// 購入する（トランザクションで二重購入防止 → 売り手へ売上記録）
function galleryBuyArtwork(artId) {
  var art = galleryRemoteList.find(function (a) { return a.id === artId })
  if (!art || art.sold) return
  var gd = loadGameData()
  if (gd.currency < art.price) { alert('💰 通貨が足りません（必要: ' + art.price + ' / 所持: ' + gd.currency + '）'); return }
  var pid = getMilliproPlayerId()
  var db = firebase.database()
  var ref = db.ref('millipro/gallery/' + artId)
  ref.transaction(function (cur) {
    if (!cur || cur.sold) return undefined
    cur.sold = { to: pid, at: Date.now() }
    return cur
  }, function (err, committed) {
    if (err || !committed) {
      alert('その作品はすでに売約済みです')
      loadGalleryAll()
      return
    }
    var gd2 = loadGameData()
    gd2.currency -= art.price
    addOwnedArtwork(gd2, {
      id: art.id,
      title: art.title,
      imageData: art.imageData,
      sourcePlayerId: art.playerId,
      price: art.price,
      purchasedAt: Date.now(),
    })
    saveGameData(gd2)
    refreshPlayerStatus()
    // 売り手へ売上（90%）を記録 → 売り手が同期で受け取る
    db.ref('millipro/gallerySales/' + art.playerId + '/' + art.id)
      .set({ price: Math.round(art.price * GALLERY_SALE_RATE), at: Date.now() })
    showGameDialog({
      icon: '🖼️',
      title: '購入しました',
      body: rewardLine('マイギャラリーに追加されました')
    })
    renderGalleryScreen('mine')
    playTapSound()
  })
}

// 売上を同期して付与する（売上90% + 人気+10/件）
// 戻り値: Promise<result>（result.available=false なら未設定）
function syncGallerySales() {
  return new Promise(function (resolve) {
    var result = { available: true, noPlayerId: false, count: 0, currency: 0 }
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
    var db = firebase.database()
    var ref = db.ref('millipro/gallerySales/' + pid)
    ref.once('value').then(function (snap) {
      var sales = snap.val()
      if (!sales || typeof sales !== 'object') { resolve(result); return }
      var gd = loadGameData()
      Object.keys(sales).forEach(function (artId) {
        var s = sales[artId]
        if (!s || !s.price) return
        gd.currency += s.price
        gd.points.popularity += 10
        gd.stats.artworksSold++
        result.count++
        result.currency += s.price
      })
      if (result.count > 0) {
        questAddProgress(gd, 'currencyEarned', result.currency)
        saveGameData(gd)
        refreshPlayerStatus()
      }
      ref.remove()
      resolve(result)
    }).catch(function () { resolve(result) })
  })
}

// 壁に飾った絵をホームの部屋の壁に表示
function renderWallArtwork() {
  var wall = document.querySelector('.room-shelf .room-wall')
  if (!wall) return
  var existing = wall.querySelector('.wall-artwork')
  if (existing) existing.remove()
  var gd = loadGameData()
  var art = getWallArtwork(gd)
  if (!art) return
  var el = document.createElement('div')
  el.className = 'wall-artwork'
  var img = document.createElement('img')
  img.src = art.imageData
  img.alt = art.title || '壁の絵'
  el.appendChild(img)
  wall.appendChild(el)
}

// ============================================================
// ジョブ（§20: 解放・育成・ジョブLvバフ）
// ============================================================

// ジョブ管理画面の描画（解放条件表示 + 解放/育成ボタン）
function renderJobsScreen() {
  var gd = loadGameData()
  var body = document.getElementById('jobs-body')
  if (!body) return

  var title = getUpperJobTitle(gd)
  var buffNote =
    '<div class="jobs-note">ジョブLvを上げると対応するポイント種の報酬が <b>+5%/Lv</b>（通貨・EXP・上限+100%）で増えます。応援力系ジョブは事務所拡張コストも軽減（-5%/Lv・上限-30%）。</div>'

  var cardsHtml = Object.keys(JOB_DEFS).map(function (id) {
    var def = JOB_DEFS[id]
    var job = gd.jobs[id]
    var pointEmoji = POINT_EMOJI[def.point]
    var pointName = POINT_NAMES[def.point]
    var have = gd.points[def.point]
    var buffPct = Math.round(jobBuffRate(gd, def.point) * 100 - 100)

    if (!job.unlocked) {
      var canUnlock = canUnlockJob(gd, id)
      var needLv = gd.level >= 5
      return (
        '<div class="job-card locked">' +
          '<div class="job-card-head">' +
            '<span class="job-card-emoji">' + def.emoji + '</span>' +
            '<div class="job-card-info">' +
              '<div class="job-card-name">' + def.name + '</div>' +
              '<div class="job-card-status">🔒 未解放</div>' +
            '</div>' +
          '</div>' +
          '<div class="job-card-req">解放条件: 基本Lv5以上 + ' + pointEmoji + ' ' + pointName + ' ' + JOB_UNLOCK_POINTS +
            '（現在 ' + have + '）' + (needLv ? '' : ' / Lv' + gd.level) + '</div>' +
          '<button class="job-unlock-btn' + (canUnlock ? '' : ' disabled') + '" data-job="' + id + '"' + (canUnlock ? '' : ' disabled') + '>' +
            (canUnlock ? '🎖️ 解放する' : (gd.level < 5 ? '基本Lv5以上で解放できます（現在 Lv' + gd.level + '）' : pointName + 'が足りません')) +
          '</button>' +
        '</div>'
      )
    }

    var nextCost = jobLevelUpCost(job.level)
    var canLevel = have >= nextCost
    return (
      '<div class="job-card">' +
        '<div class="job-card-head">' +
          '<span class="job-card-emoji">' + def.emoji + '</span>' +
          '<div class="job-card-info">' +
            '<div class="job-card-name">' + def.name + '</div>' +
            '<div class="job-card-status">Lv.' + job.level + ' <span class="job-card-buff">獲得バフ +' + buffPct + '%</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="job-card-req">次: Lv.' + (job.level + 1) + ' まで ' + pointEmoji + ' ' + pointName + ' ' + nextCost +
          '（所持 ' + have + '）' +
          (job.level >= 2 && job.level % 5 === 0 ? ' ・ Lvアップでバフ増' : '') +
        '</div>' +
        '<button class="job-level-btn' + (canLevel ? '' : ' disabled') + '" data-job="' + id + '"' + (canLevel ? '' : ' disabled') + '>' +
          (canLevel ? '⬆️ Lv.' + job.level + ' → Lv.' + (job.level + 1) + ' に上げる' : pointName + 'が足りません') +
        '</button>' +
      '</div>'
    )
  }).join('')

  body.innerHTML =
    '<div class="jobs-title">現在の称号: <b>' + title + '</b></div>' +
    buffNote +
    '<div class="jobs-list">' + cardsHtml + '</div>' +
    '<p class="jobs-hint">ジョブの解放条件を満たしたら解放し、ポイントを消費して育成しましょう</p>'

  body.querySelectorAll('.job-unlock-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gdNow = loadGameData()
      var result = unlockJob(gdNow, btn.dataset.job)
      if (!result.ok) {
        alert('解放条件を満たしていません')
        return
      }
      saveGameData(gdNow)
      refreshPlayerStatus()
      renderJobsScreen()
      playTapSound()
      var jobName = JOB_DEFS[btn.dataset.job].name
      showGameDialog({
        icon: '🎖️',
        title: 'ジョブ解放',
        body: rewardLine(jobName + ' を解放しました！')
      })
    })
  })

  body.querySelectorAll('.job-level-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gdNow = loadGameData()
      var result = levelUpJob(gdNow, btn.dataset.job)
      if (!result.ok) {
        alert(result.reason === 'points' ? 'ポイントが足りません' : 'ジョブを解放してください')
        return
      }
      questAddProgress(gdNow, 'jobLevelUps')
      saveGameData(gdNow)
      refreshPlayerStatus()
      renderJobsScreen()
      playTapSound()
      var jobName = JOB_DEFS[btn.dataset.job].name
      showGameDialog({
        icon: '⬆️',
        title: 'レベルアップ',
        body: rewardLine(jobName + ' が Lv.' + result.newLevel + ' になりました') + rewardLine('消費: ' + result.cost + 'ポイント')
      })
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
// 図鑑（§12: 発見 → 解読 → 完全解放）
// ============================================================
var ZUKAN_CURRENT_CAT = 'quotes'

function renderZukanScreen(cat) {
  if (cat) ZUKAN_CURRENT_CAT = cat
  var body = document.getElementById('zukan-body')
  if (!body) return
  var gd = loadGameData()

  // 発見スイープ（既存の進行状況から条件を満たした項目を発見し、知識ポイントを付与）
  var newly = zukanSweepDiscoveries(gd)
  if (newly.length) saveGameData(gd)

  var catDef = null
  ZUKAN_CATEGORIES.forEach(function (c) { if (c.key === ZUKAN_CURRENT_CAT) catDef = c })
  if (!catDef) { ZUKAN_CURRENT_CAT = ZUKAN_CATEGORIES[0].key; catDef = ZUKAN_CATEGORIES[0] }

  // 全体サマリ
  var allFound = 0, allDecoded = 0, allTotal = 0
  ZUKAN_CATEGORIES.forEach(function (c) {
    var p = zukanCategoryProgress(gd, c.key)
    allFound += p.found; allDecoded += p.decoded; allTotal += p.total
  })

  var html = ''
  html += '<div class="zukan-overview popup-card">' +
    '<div class="zukan-overview-title">📚 ミリプロ図鑑</div>' +
    '<div class="zukan-overview-sub">発見 <b>' + allFound + '</b> / ' + allTotal +
      ' ・ 解読 <b>' + allDecoded + '</b> / ' + allTotal +
      ' ・ 知識 ' + gd.points.knowledge + '</div>' +
  '</div>'

  // カテゴリタブ
  html += '<div class="zukan-tabs">'
  ZUKAN_CATEGORIES.forEach(function (c) {
    var p = zukanCategoryProgress(gd, c.key)
    html += '<button type="button" class="zukan-tab' + (c.key === catDef.key ? ' active' : '') + '" data-cat="' + c.key + '">' +
      c.emoji + ' ' + c.name + '<span class="zukan-tab-count">' + p.decoded + '/' + p.total + '</span></button>'
  })
  html += '</div>'

  // 現在カテゴリの説明 + 完了バナー
  var cp = zukanCategoryProgress(gd, catDef.key)
  html += '<div class="zukan-cat-desc">' + catDef.emoji + ' ' + catDef.name + ' 図鑑（' + cp.decoded + '/' + cp.total + ' 解読）</div>'
  if (cp.decoded === cp.total) {
    html += '<div class="zukan-complete-banner">🎉 完全制覇！この図鑑はコンプリート！</div>'
  }

  // 項目リスト
  html += '<div class="zukan-list">'
  ZUKAN_DEFS[catDef.key].forEach(function (def) {
    var s = zukanStateOf(gd, catDef.key, def.id)
    if (s <= 0) {
      html += '<div class="zukan-entry zukan-unknown">' +
        '<div class="zukan-entry-emoji">🔒</div>' +
        '<div class="zukan-entry-info">' +
          '<div class="zukan-entry-title">？？？？？</div>' +
          '<div class="zukan-entry-text">未発見。ミリプロの活動で発見できるかも…</div>' +
        '</div>' +
      '</div>'
    } else if (s === 1) {
      html += '<div class="zukan-entry zukan-found">' +
        '<div class="zukan-entry-emoji">' + def.emoji + '</div>' +
        '<div class="zukan-entry-info">' +
          '<div class="zukan-entry-title">' + def.title + '</div>' +
          '<div class="zukan-entry-text">詳細はまだ解読されていない</div>' +
          '<button type="button" class="zukan-decode-btn" data-cat="' + catDef.key + '" data-id="' + def.id + '">📚 解読する（知識 ' + ZUKAN_DECODE_COST + '）</button>' +
        '</div>' +
      '</div>'
    } else {
      html += '<div class="zukan-entry zukan-decoded">' +
        '<div class="zukan-entry-emoji">' + def.emoji + '</div>' +
        '<div class="zukan-entry-info">' +
          '<div class="zukan-entry-title">' + def.title + ' <span class="zukan-done-chip">✓ 解読済</span></div>' +
          '<div class="zukan-entry-text">' + def.text + '</div>' +
          '<div class="zukan-entry-how">🔎 発見条件: ' + def.how + '</div>' +
        '</div>' +
      '</div>'
    }
  })
  html += '</div>'
  html += '<div class="zukan-note">💡 ミリプロの活動で発見 → 知識を獲得。知識を消費して詳細を解読。全解読で完全制覇報酬！<br><span style="opacity:.55">出典: ミリプロ公式サイト・非公式wiki（2026年8月時点）</span></div>'

  body.innerHTML = html

  // カテゴリタブの切替
  body.querySelectorAll('.zukan-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      renderZukanScreen(btn.dataset.cat)
    })
  })

  // 解読ボタン
  body.querySelectorAll('.zukan-decode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gd2 = loadGameData()
      var res = zukanDecode(gd2, btn.dataset.cat, btn.dataset.id)
      if (!res.ok) {
        var msg = res.reason === 'knowledge'
          ? '知識ポイントが足りません（必要: 知識 ' + ZUKAN_DECODE_COST + '）'
          : 'この項目は解読できません'
        showGameDialog({ icon: '📚', title: '解読に失敗', body: '<p style="margin:8px 0">' + msg + '</p>' })
        return
      }
      var comp = claimZukanCategoryReward(gd2, btn.dataset.cat)
      saveGameData(gd2)
      refreshPlayerStatus()
      renderZukanScreen(btn.dataset.cat)
      if (comp) {
        var r = comp.rewards
        showGameDialog({
          icon: '🏆',
          title: '完全制覇！',
          body:
            '<p style="margin:8px 0">「' + catDef.name + ' 図鑑」を全て解読しました！</p>' +
            rewardLine('💰 通貨 +' + r.currency) +
            rewardLine('⭐ EXP +' + r.exp + (comp.leveledUp ? '（🎊 Lv.' + comp.newLevel + '）' : '')) +
            rewardLine('📣 応援力 +' + r.cheer)
        })
      } else {
        showGameDialog({
          icon: '📖',
          title: '解読完了',
          body: '<p style="margin:8px 0">詳細が解放されました！</p>' + rewardLine('📚 知識 -' + res.cost)
        })
      }
    })
  })

  // 新発見のお知らせ
  if (newly.length) {
    var listHtml = newly.map(function (f) { return f.def.emoji + ' ' + f.def.title }).join('<br>')
    showGameDialog({
      icon: '✨',
      title: '図鑑に新発見！',
      body: '<p style="margin:8px 0">' + listHtml + '</p>' +
        rewardLine('📚 知識 +' + (newly.length * ZUKAN_DISCOVER_KNOWLEDGE))
    })
  }
}

// ホームの本棚クリック → 図鑑
;(function () {
  var bookshelf = document.querySelector('.room-bookshelf .bookshelf-frame')
  if (bookshelf) {
    bookshelf.addEventListener('click', function () {
      renderZukanScreen('quotes')
      openPopup('popup-zukan')
    })
  }
  var shelfArea = document.querySelector('.room-bookshelf .furniture-area')
  if (shelfArea) {
    shelfArea.addEventListener('click', function (e) {
      if (e.target === shelfArea) {
        renderZukanScreen('quotes')
        openPopup('popup-zukan')
      }
    })
  }
})()

// ============================================================
// 記憶の庭（§11: 知識で開拓 → 欠片で記憶を植える）
// ============================================================
function renderGardenScreen() {
  var body = document.getElementById('garden-body')
  if (!body) return
  var gd = loadGameData()

  // 欠片スイープ（既存の進行状況から条件を満たした欠片を獲得）
  var gained = gardenSweepShards(gd)
  if (gained.length) saveGameData(gd)

  // 全体サマリ
  var cultivated = 0, plantedAll = 0, totalMem = 0
  GARDEN_AREAS.forEach(function (a) {
    var p = gardenAreaProgress(gd, a)
    if (p.cultivated) cultivated++
    plantedAll += p.planted
    totalMem += p.total
  })

  var html = ''
  html += '<div class="garden-overview popup-card">' +
    '<div class="garden-overview-title">🌳 ミリプロ記憶の庭</div>' +
    '<div class="garden-overview-sub">開拓 <b>' + cultivated + '</b> / ' + GARDEN_AREAS.length +
      ' ・ 記憶 <b>' + plantedAll + '</b> / ' + totalMem +
      ' ・ 知識 ' + gd.points.knowledge + '</div>' +
    '<div class="garden-overview-shards">🧩 欠片 ' + (gd.memoryShards ? gd.memoryShards.length : 0) + ' / ' + GARDEN_SHARDS.length + '</div>' +
  '</div>'

  // 所持欠片段
  html += '<div class="garden-shards">'
  GARDEN_SHARDS.forEach(function (s) {
    var own = gardenOwnsShard(gd, s.id)
    html += own
      ? '<span class="garden-shard own" title="' + s.how + '">' + s.emoji + ' ' + s.name + '</span>'
      : '<span class="garden-shard" title="' + s.how + '">🔒 ？？？</span>'
  })
  html += '</div>'

  // エリアリスト
  html += '<div class="garden-areas">'
  GARDEN_AREAS.forEach(function (a) {
    var st = gardenAreaState(gd, a.id)
    var p = gardenAreaProgress(gd, a)
    var locked = a.officeStage > 1 && (!gd.office || gd.office.stage < a.officeStage)

    if (locked) {
      html += '<div class="garden-area garden-locked">' +
        '<div class="garden-area-head"><span class="garden-area-emoji">🔒</span>' +
        '<div class="garden-area-info"><div class="garden-area-name">' + a.name + '</div>' +
        '<div class="garden-area-desc">事務所 第' + a.officeStage + '段階で解放（現在 第' + (gd.office ? gd.office.stage : 1) + '段階）</div></div></div>' +
      '</div>'
      return
    }

    if (!st.cultivated) {
      html += '<div class="garden-area">' +
        '<div class="garden-area-head"><span class="garden-area-emoji">🌫️</span>' +
        '<div class="garden-area-info"><div class="garden-area-name">' + a.name + '</div>' +
        '<div class="garden-area-desc">' + a.desc + '</div></div></div>' +
        '<button type="button" class="garden-cultivate-btn" data-area="' + a.id + '">🌱 開拓する（知識 ' + a.cost + '）</button>' +
      '</div>'
      return
    }

    // 開拓済み: 記憶カード表示
    html += '<div class="garden-area garden-open">' +
      '<div class="garden-area-head"><span class="garden-area-emoji">' + a.emoji + '</span>' +
      '<div class="garden-area-info"><div class="garden-area-name">' + a.name + ' <span class="garden-cultivated-chip">🌱 開拓済み</span></div>' +
      '<div class="garden-area-desc">' + a.desc + '（記憶 ' + p.planted + '/' + p.total + '）</div></div></div>'
    a.memories.forEach(function (m) {
      if (st.planted[m.id]) {
        html += '<div class="garden-memory">' +
          '<div class="garden-memory-emoji">' + m.emoji + '</div>' +
          '<div class="garden-memory-info"><div class="garden-memory-title">' + m.title + ' <span class="zukan-done-chip">✓ 植えられた</span></div>' +
          '<div class="garden-memory-text">' + m.text + '</div></div>' +
        '</div>'
      } else {
        var shardDef = gardenShardDef(m.shard)
        var own = gardenOwnsShard(gd, m.shard)
        html += '<div class="garden-memory garden-memory-plantable">' +
          '<div class="garden-memory-emoji">🕳️</div>' +
          '<div class="garden-memory-info"><div class="garden-memory-title">？？？</div>' +
          '<div class="garden-memory-text">' + (own ? '「' + shardDef.name + '」を植えると記憶が咲く' : '必要欠片: ' + shardDef.emoji + ' ' + shardDef.name) + '</div>' +
          (own
            ? '<button type="button" class="garden-plant-btn" data-area="' + a.id + '" data-mem="' + m.id + '">🌸 植える（' + shardDef.name + '）</button>'
            : '<div class="garden-memory-need">🔒 ' + shardDef.how + '</div>') +
        '</div></div>'
      }
    })
    if (p.planted === p.total) {
      html += '<div class="garden-complete-banner">🌸 このエリアは完成！</div>'
    }
    html += '</div>'
  })
  html += '</div>'

  // 星見台（未来）ティーザー
  html += '<div class="garden-area garden-future">' +
    '<div class="garden-area-head"><span class="garden-area-emoji">🔭</span>' +
    '<div class="garden-area-info"><div class="garden-area-name">星見台 / Chronicle Gate</div>' +
    '<div class="garden-area-desc">未来のエリアと Mili Story への入口。準備中。</div></div></div>' +
  '</div>'

  html += '<div class="garden-note">🌱 開拓には知識、記憶を咲かせるには欠片が必要。欠片はミリプロの活動で集まる。<br><span style="opacity:.55">出典: ミリプロ公式サイト・非公式wiki（2026年8月時点）</span></div>'

  body.innerHTML = html

  // 開拓ボタン
  body.querySelectorAll('.garden-cultivate-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var areaDef = null
      GARDEN_AREAS.forEach(function (a) { if (a.id === btn.dataset.area) areaDef = a })
      var gd2 = loadGameData()
      var res = gardenCultivate(gd2, btn.dataset.area)
      if (!res.ok) {
        var msg = res.reason === 'knowledge'
          ? '知識ポイントが足りません（必要: 知識 ' + (areaDef ? areaDef.cost : 0) + '）'
          : 'このエリアは開拓できません'
        showGameDialog({ icon: '🌱', title: '開拓に失敗', body: '<p style="margin:8px 0">' + msg + '</p>' })
        return
      }
      saveGameData(gd2)
      refreshPlayerStatus()
      renderGardenScreen()
      showGameDialog({
        icon: '🌱',
        title: '開拓完了！',
        body: '<p style="margin:8px 0">「' + (areaDef ? areaDef.name : '') + '」が開拓された！欠片を植えて記憶を咲かせよう。</p>' +
          rewardLine('📚 知識 -' + res.cost)
      })
    })
  })

  // 植えるボタン
  body.querySelectorAll('.garden-plant-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var areaDef = null
      GARDEN_AREAS.forEach(function (a) { if (a.id === btn.dataset.area) areaDef = a })
      var memDef = null
      if (areaDef) areaDef.memories.forEach(function (m) { if (m.id === btn.dataset.mem) memDef = m })
      var shardDef = memDef ? gardenShardDef(memDef.shard) : null
      var gd2 = loadGameData()
      var res = gardenPlant(gd2, btn.dataset.area, btn.dataset.mem)
      if (!res.ok) {
        showGameDialog({ icon: '🌸', title: '植えるのに失敗', body: '<p style="margin:8px 0">この記憶はまだ植えられない…</p>' })
        return
      }
      var areaReward = claimGardenAreaReward(gd2, btn.dataset.area)
      var completeReward = claimGardenCompleteReward(gd2)
      saveGameData(gd2)
      refreshPlayerStatus()
      renderGardenScreen()
      if (areaReward) {
        var r = areaReward.rewards
        showGameDialog({
          icon: '🌸',
          title: 'エリア完成！',
          body:
            '<p style="margin:8px 0">「' + (areaDef ? areaDef.name : '') + '」が完成した！</p>' +
            rewardLine('💰 通貨 +' + r.currency) +
            rewardLine('⭐ EXP +' + r.exp + (areaReward.leveledUp ? '（🎊 Lv.' + areaReward.newLevel + '）' : '')) +
            rewardLine('📣 応援力 +' + r.cheer) +
            (completeReward
              ? '<p style="margin:8px 0">🎉 そして記憶の庭がすべて咲き誇った！</p>' +
                rewardLine('💰 通貨 +' + completeReward.rewards.currency) +
                rewardLine('⭐ EXP +' + completeReward.rewards.exp) +
                rewardLine('📣 応援力 +' + completeReward.rewards.cheer) +
                rewardLine('📚 知識 +' + completeReward.rewards.knowledge)
              : '')
        })
      } else if (completeReward) {
        var rc = completeReward.rewards
        showGameDialog({
          icon: '🏆',
          title: '記憶の庭 完全制覇！',
          body:
            '<p style="margin:8px 0">すべてのエリアが完成した！</p>' +
            rewardLine('💰 通貨 +' + rc.currency) +
            rewardLine('⭐ EXP +' + rc.exp + (completeReward.leveledUp ? '（🎊 Lv.' + completeReward.newLevel + '）' : '')) +
            rewardLine('📣 応援力 +' + rc.cheer) +
            rewardLine('📚 知識 +' + rc.knowledge)
        })
      } else {
        showGameDialog({
          icon: '🌸',
          title: '記憶が咲いた！',
          body: '<p style="margin:8px 0">「' + (shardDef ? shardDef.name : '') + '」を植えて、記憶が花開いた！</p>'
        })
      }
    })
  })

  // 新規欠片のお知らせ
  if (gained.length) {
    var listHtml = gained.map(function (s) { return s.emoji + ' ' + s.name }).join('<br>')
    showGameDialog({
      icon: '🧩',
      title: '記憶の欠片を獲得！',
      body: '<p style="margin:8px 0">' + listHtml + '</p><p style="margin:8px 0">欠片を記憶の庭に植えると、ミリプロの記憶が咲く。</p>'
    })
  }
}

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
    updateTabBarVisibility()
  }

  function closePC() {
    if (pcOverlay) pcOverlay.classList.add('hidden')
    updateTabBarVisibility()
  }

  window.openPC = openPC
  window.closePC = closePC

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
    shop: function () {
      closePC()
      renderShopScreen()
      openPopup('popup-shop')
    },
    canvas: function () {
      closePC()
      renderCanvasScreen()
      openPopup('popup-canvas')
    },
    gallery: function () {
      closePC()
      renderGalleryScreen('mine')
      openPopup('popup-gallery')
    },
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
    zukan: function () {
      closePC()
      renderZukanScreen('quotes')
      openPopup('popup-zukan')
    },
    garden: function () {
      closePC()
      renderGardenScreen()
      openPopup('popup-garden')
    },
    dungeon: function () {
      closePC()
      window.open('dungeon.html', '_blank')
    },
    itabag: function () {
      closePC()
      renderItabagScreen()
      openPopup('popup-itabag')
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

    var bgmToggle = document.querySelector('.setting-toggle[data-setting="bgm"]')
    if (bgmToggle) bgmToggle.classList.toggle('on', settings.bgmEnabled)
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

  // トグル（BGMのみ。効果音は廃止）
  document.querySelectorAll('.setting-toggle').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.dataset.setting === 'bgm') settings.bgmEnabled = !settings.bgmEnabled
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
