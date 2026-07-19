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
  if (bgm) {
    if (s.bgmEnabled) {
      bgm.play().catch(function () {})
    } else {
      bgm.pause()
    }
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

  // スマホは最初に真ん中（スマホ）の位置にスクロール
  if (window.innerWidth < 768) {
    var deskSection = document.querySelector('.room-desk')
    if (deskSection) deskSection.scrollIntoView({ behavior: 'auto', inline: 'start' })
  }
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
      alert('プロフィール画面は準備中です')
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
