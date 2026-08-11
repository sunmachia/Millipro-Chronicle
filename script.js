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
    dungeon: function () {
      closePC()
      openDungeonScreen()
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
// 配信ダンジョン（§16: ターン制バトル・1時間5回制限）
// ============================================================
var dungeonState = null

function dungeonRand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function openDungeonScreen() {
  var screen = document.getElementById('dungeon-screen')
  if (screen) screen.classList.remove('hidden')
  dungeonState = null
  renderDungeonBossSelect()
}

function closeDungeonScreen() {
  var screen = document.getElementById('dungeon-screen')
  if (screen) screen.classList.add('hidden')
}

function dungeonBody() {
  return document.getElementById('dungeon-body')
}

function updateDungeonTriesLabel() {
  var gd = loadGameData()
  var left = remainingDungeonTries(gd)
  var el = document.getElementById('dungeon-tries-left')
  if (el) el.textContent = left
  return left
}

// ボス選択画面
function renderDungeonBossSelect() {
  var gd = loadGameData()
  var left = updateDungeonTriesLabel()

  var cards = DUNGEON_BOSSES.map(function (b) {
    var reward = DUNGEON_REWARDS[b.rank]
    var locked = gd.level < b.reqLevel
    var lockHtml = locked
      ? '<div class="dungeon-boss-lock">🔒 推奨 Lv.' + b.reqLevel + ' 以上（現在 Lv.' + gd.level + '）</div>'
      : ''
    return (
      '<button class="dungeon-boss-card"' + (locked ? ' disabled' : '') + ' data-rank="' + b.rank + '">' +
        '<div class="dungeon-boss-emoji">' + b.emoji + '</div>' +
        '<div class="dungeon-boss-info">' +
          '<div class="dungeon-boss-name">★' + b.rank + ' ' + b.name + '</div>' +
          '<div class="dungeon-boss-desc">' + b.desc + '</div>' +
          '<div class="dungeon-boss-meta">推奨Lv.' + b.reqLevel + ' ・ 報酬: 💰' + reward.currency + ' / EXP ' + reward.exp + ' / 応援力 ' + reward.cheer + '</div>' +
          lockHtml +
        '</div>' +
      '</button>'
    )
  }).join('')

  dungeonBody().innerHTML =
    '<div class="dungeon-view-title">挑戦するダンジョンを選ぼう（クリアで報酬獲得！）</div>' +
    '<div class="dungeon-boss-list">' + cards + '</div>'

  dungeonBody().querySelectorAll('.dungeon-boss-card').forEach(function (card) {
    card.addEventListener('click', function () {
      if (card.disabled) return
      renderDungeonTalentSelect(parseInt(card.dataset.rank))
    })
  })
}

// 挑戦タレント選択画面
function renderDungeonTalentSelect(rank) {
  var user = loadUserData()
  if (!user) return
  var boss = dungeonBossByRank(rank)
  if (!boss) return

  // 最推し + 推しから選択（なければ全員）
  var talentIds = []
  if (user.ultimateOshi) talentIds.push(user.ultimateOshi)
  ;(user.favorites || []).forEach(function (id) {
    if (talentIds.indexOf(id) < 0) talentIds.push(id)
  })
  if (!talentIds.length) talentIds = Object.keys(TALENTS)

  var cards = talentIds.map(function (id) {
    var t = TALENTS[id]
    return (
      '<button class="dungeon-talent-card" data-talent="' + id + '">' +
        '<img src="images/talents/' + id + '.webp" alt="' + t.name + '" loading="lazy">' +
        '<span>' + t.name + '</span>' +
      '</button>'
    )
  }).join('')

  dungeonBody().innerHTML =
    '<div class="dungeon-view-title">★' + rank + '「' + boss.name + '」に挑戦するタレントを選ぼう</div>' +
    '<div class="dungeon-talent-list">' + cards + '</div>' +
    '<div style="margin-top:12px"><button class="dungeon-action-btn secondary" id="dungeon-back-boss">← ボス選択に戻る</button></div>'

  dungeonBody().querySelectorAll('.dungeon-talent-card').forEach(function (card) {
    card.addEventListener('click', function () {
      startDungeonBattle(rank, card.dataset.talent)
    })
  })

  var back = document.getElementById('dungeon-back-boss')
  if (back) back.addEventListener('click', renderDungeonBossSelect)
}

// バトル開始
function startDungeonBattle(rank, talentId) {
  var gd = loadGameData()
  if (remainingDungeonTries(gd) <= 0) {
    renderDungeonLimitNote()
    return
  }
  var boss = dungeonBossByRank(rank)
  var t = TALENTS[talentId]
  if (!boss || !t) return

  recordDungeonTry(gd)
  saveGameData(gd)
  updateDungeonTriesLabel()

  var stats = talentBattleStats(gd.level)
  dungeonState = {
    rank: rank,
    boss: boss,
    talent: t,
    talentId: talentId,
    bossHp: boss.hp,
    talentHp: stats.maxHp,
    talentMaxHp: stats.maxHp,
    talentAtk: stats.atk,
    talentDef: stats.def,
    log: [],
    over: false,
    won: false,
    turns: 0,
  }

  dungeonState.log.push('📡 配信開始！ ' + t.name + ' が「' + boss.name + '」に挑戦！')
  dungeonState.log.push('コメント: 『がんばれー！』『まってた！』')

  renderDungeonBattle()
}

// バトル画面描画
function renderDungeonBattle() {
  var s = dungeonState
  if (!s) return

  var bossHpPct = Math.max(0, Math.round((s.bossHp / s.boss.hp) * 100))
  var talentHpPct = Math.max(0, Math.round((s.talentHp / s.talentMaxHp) * 100))

  var logHtml = s.log.map(function (line, i) {
    var cls = ''
    if (line.indexOf('ダメージ') >= 0 && line.indexOf(s.talent.name) === 0) cls = ' highlight'
    else if (line.indexOf('回復') >= 0) cls = ' heal'
    else if (line.indexOf('攻撃') >= 0 || line.indexOf('隙') >= 0) cls = ' danger'
    var last = i === s.log.length - 1 ? ' last' : ''
    return '<div class="dungeon-log-line' + cls + last + '">' + line + '</div>'
  }).join('')

  dungeonBody().innerHTML =
    '<div class="dungeon-battle">' +
      '<div class="dungeon-char-hud boss">' +
        '<div class="dungeon-char-emoji">' + s.boss.emoji + '</div>' +
        '<div class="dungeon-char-info">' +
          '<div class="dungeon-char-name">★' + s.rank + ' ' + s.boss.name + '</div>' +
          '<div class="dungeon-hp-bar"><div class="dungeon-hp-fill" style="width:' + bossHpPct + '%"></div></div>' +
          '<div class="dungeon-hp-num">' + s.bossHp + ' / ' + s.boss.hp + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dungeon-char-hud">' +
        '<img class="dungeon-char-portrait" src="images/talents/' + s.talentId + '.webp" alt="' + s.talent.name + '">' +
        '<div class="dungeon-char-info">' +
          '<div class="dungeon-char-name">' + s.talent.name + '</div>' +
          '<div class="dungeon-hp-bar"><div class="dungeon-hp-fill" style="width:' + talentHpPct + '%"></div></div>' +
          '<div class="dungeon-hp-num">' + s.talentHp + ' / ' + s.talentMaxHp + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dungeon-log">' + logHtml + '</div>' +
      '<div class="dungeon-commands">' +
        '<button class="dungeon-cmd-btn" data-cmd="attack">⚔️ 攻撃</button>' +
        '<button class="dungeon-cmd-btn" data-cmd="guard">🛡️ 防御</button>' +
        '<button class="dungeon-cmd-btn" data-cmd="heal">💊 回復</button>' +
        '<button class="dungeon-cmd-btn" data-cmd="chest">📦 宝箱</button>' +
      '</div>' +
    '</div>'

  dungeonBody().querySelectorAll('.dungeon-cmd-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      dungeonCommand(btn.dataset.cmd)
    })
  })

  var logEl = dungeonBody().querySelector('.dungeon-log')
  if (logEl) logEl.scrollTop = logEl.scrollHeight
}

// コマンド実行（ターン処理）
function dungeonCommand(cmd) {
  var s = dungeonState
  if (!s || s.over) return

  s.turns++
  var defending = false
  var chestFailed = false

  if (cmd === 'attack') {
    var dmg = Math.max(1, s.talentAtk + dungeonRand(-2, 2) - s.boss.def)
    s.bossHp -= dmg
    s.log.push(s.talent.name + ' の攻撃！ ' + s.boss.name + ' に ' + dmg + ' ダメージ！')
  } else if (cmd === 'guard') {
    defending = true
    s.log.push(s.talent.name + ' は防御の構えをとった！')
  } else if (cmd === 'heal') {
    var heal = Math.round(s.talentMaxHp * 0.25)
    s.talentHp = Math.min(s.talentMaxHp, s.talentHp + heal)
    s.log.push(s.talent.name + ' は ' + heal + ' 回復した！')
  } else if (cmd === 'chest') {
    if (Math.random() < 0.6) {
      var cDmg = Math.max(1, Math.round(s.talentAtk * 1.8) - s.boss.def)
      s.bossHp -= cDmg
      s.log.push('📦 宝箱は大当たり！ ' + s.boss.name + ' に ' + cDmg + ' ダメージ！')
    } else {
      chestFailed = true
      s.log.push('📦 宝箱は空っぽ… 隙を突かれてしまった！')
    }
  }

  if (s.bossHp <= 0) {
    s.bossHp = 0
    s.over = true
    s.won = true
    s.log.push('🎉 ' + s.boss.name + ' を撃破！ 配信大成功！')
    finishDungeonBattle()
    return
  }

  // ボスのターン
  var bDmg = Math.max(1, s.boss.atk + dungeonRand(-1, 1) - s.talentDef)
  if (chestFailed) bDmg = Math.round(bDmg * 1.3)
  if (defending) bDmg = Math.max(1, Math.round(bDmg / 2))
  s.talentHp -= bDmg
  s.log.push(s.boss.name + ' の攻撃！ ' + s.talent.name + ' に ' + bDmg + ' ダメージ！')

  if (s.talentHp <= 0) {
    s.talentHp = 0
    s.over = true
    s.won = false
    s.log.push('📡 配信終了… ' + s.talent.name + ' が倒れてしまった…')
    finishDungeonBattle()
    return
  }

  if (s.turns >= 30) {
    s.over = true
    s.won = false
    s.log.push('⏰ 配信時間切れ！ タイムアップ！')
    finishDungeonBattle()
    return
  }

  renderDungeonBattle()
}

// バトル終了処理（報酬付与）
function finishDungeonBattle() {
  var s = dungeonState
  var gd = loadGameData()
  var reward = dungeonReward(s.rank, s.won)

  gd.currency += reward.currency
  var lv = addExp(gd, reward.exp)
  gd.points.cheer += reward.cheer
  if (s.won) gd.stats.dungeonClears++

  saveGameData(gd)
  refreshPlayerStatus()

  var logHtml = s.log.map(function (line) {
    var cls = ''
    if (line.indexOf('大成功') >= 0) cls = ' highlight'
    else if (line.indexOf('配信終了') >= 0 || line.indexOf('時間切れ') >= 0) cls = ' danger'
    return '<div class="dungeon-log-line' + cls + '">' + line + '</div>'
  }).join('')

  var icon = s.won ? '🎉' : '😭'
  var title = s.won ? '配信大成功！' : '配信終了…'
  var sub = s.won ? '見事トラブルを撃退した！' : '次はもっと強い推し活でリベンジ！'

  var rewardRows = ''
  if (reward.currency > 0) {
    rewardRows += '<div class="dungeon-reward-row"><span>ゲーム内通貨</span><span>+💰 ' + reward.currency + '</span></div>'
  }
  if (reward.exp > 0) {
    rewardRows += '<div class="dungeon-reward-row"><span>経験値</span><span>+EXP ' + reward.exp + '</span></div>'
  }
  if (reward.cheer > 0) {
    rewardRows += '<div class="dungeon-reward-row"><span>応援力</span><span>+📣 ' + reward.cheer + '</span></div>'
  }

  dungeonBody().innerHTML =
    '<div class="dungeon-result">' +
      '<div class="dungeon-result-icon">' + icon + '</div>' +
      '<div class="dungeon-result-title">' + title + '</div>' +
      '<div class="dungeon-result-sub">' + sub + '</div>' +
      '<div class="dungeon-reward-box">' + rewardRows + '</div>' +
      (lv.leveledUp ? '<div class="dungeon-result-sub">🎊 レベルアップ！ 現在 Lv.' + lv.newLevel + '</div>' : '') +
      '<div class="dungeon-log" style="height:100px">' + logHtml + '</div>' +
      '<div class="dungeon-result-actions">' +
        '<button class="dungeon-action-btn secondary" id="dungeon-back-boss">ボス選択へ</button>' +
        '<button class="dungeon-action-btn" id="dungeon-retry">もう一度挑戦</button>' +
      '</div>' +
    '</div>'

  var back = document.getElementById('dungeon-back-boss')
  if (back) back.addEventListener('click', renderDungeonBossSelect)

  var retry = document.getElementById('dungeon-retry')
  if (retry) {
    retry.addEventListener('click', function () {
      if (remainingDungeonTries(loadGameData()) <= 0) {
        renderDungeonLimitNote()
      } else {
        renderDungeonTalentSelect(s.rank)
      }
    })
  }
}

// 回数制限到達時の表示
function renderDungeonLimitNote() {
  dungeonBody().innerHTML =
    '<div class="dungeon-limit-note">⏳ 1時間の挑戦回数（5回）を使い切りました！<br>しばらく待ってからまた挑戦しよう！</div>' +
    '<div style="margin-top:12px;text-align:center"><button class="dungeon-action-btn secondary" id="dungeon-back-boss">← ボス選択に戻る</button></div>'

  var back = document.getElementById('dungeon-back-boss')
  if (back) back.addEventListener('click', renderDungeonBossSelect)
}

// ダンジョン画面のイベント
;(function () {
  var closeBtn = document.getElementById('dungeon-close-btn')
  if (closeBtn) closeBtn.addEventListener('click', closeDungeonScreen)

  var screen = document.getElementById('dungeon-screen')
  if (screen) {
    screen.addEventListener('click', function (e) {
      if (e.target === screen) closeDungeonScreen()
    })
  }
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
