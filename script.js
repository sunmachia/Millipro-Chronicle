// BGM
;(function () {
  const bgm = document.getElementById('title-bgm')
  if (!bgm) return
  bgm.volume = 0.7

  window._bgmTimer = null
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  function onInteraction() {
    if (window._bgmTimer) return
    if (!bgm.paused) return
    if (isMobile) {
      bgm.play().catch(() => {})
    } else {
      window._bgmTimer = setTimeout(() => {
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
  if (window._bgmTimer) {
    clearTimeout(window._bgmTimer)
    window._bgmTimer = null
  }
  if (bgm.paused) return
  bgm.pause()
  bgm.currentTime = 0
  bgm.volume = 0.7
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
  const se = document.getElementById('tap-se')
  if (se) {
    se.currentTime = 0
    se.play().catch(() => {})
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
  renderUltimateOshiCards()
  renderFavoriteCards()
  showWizardPage(0)
}

function renderUltimateOshiCards() {
  const container = document.getElementById('ultimate-oshi-list')
  container.innerHTML = ''
  Object.entries(TALENTS).forEach(function (_ref) {
    var id = _ref[0], t = _ref[1]
    var card = document.createElement('div')
    card.className = 'talent-card'
    card.dataset.id = id
    var imgDiv = document.createElement('div')
    imgDiv.className = 'talent-card-img'
    var img = document.createElement('img')
    img.src = talentLogoPath(id)
    img.alt = t.name
    img.loading = 'lazy'
    imgDiv.appendChild(img)
    var nameSpan = document.createElement('span')
    nameSpan.className = 'talent-card-name'
    nameSpan.textContent = t.name
    card.appendChild(imgDiv)
    card.appendChild(nameSpan)
    card.addEventListener('click', function () { selectUltimate(id) })
    container.appendChild(card)
  })
}

function renderFavoriteCards() {
  const container = document.getElementById('favorites-list')
  container.innerHTML = ''
  Object.entries(TALENTS).forEach(function (_ref) {
    var id = _ref[0], t = _ref[1]
    var card = document.createElement('div')
    card.className = 'talent-card'
    card.dataset.id = id
    var imgDiv = document.createElement('div')
    imgDiv.className = 'talent-card-img'
    var img = document.createElement('img')
    img.src = talentLogoPath(id)
    img.alt = t.name
    img.loading = 'lazy'
    imgDiv.appendChild(img)
    var nameSpan = document.createElement('span')
    nameSpan.className = 'talent-card-name'
    nameSpan.textContent = t.name
    card.appendChild(imgDiv)
    card.appendChild(nameSpan)
    card.addEventListener('click', function () { toggleFavorite(id) })
    container.appendChild(card)
  })
}

function selectUltimate(id) {
  wizardState.ultimateOshi = id
  document.querySelectorAll('#ultimate-oshi-list .talent-card').forEach(function (c) {
    c.classList.toggle('selected', c.dataset.id === id)
  })
  document.getElementById('ultimate-next-btn').classList.remove('disabled')
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

  var container = document.querySelector('.setup-pages')
  if (container) container.scrollTop = 0
}

function updateConfirmPage() {
  document.getElementById('confirm-name').textContent = wizardState.playerName

  var ut = TALENTS[wizardState.ultimateOshi]
  var utEl = document.getElementById('confirm-ultimate')
  if (ut) {
    utEl.innerHTML = '<span class="confirm-talent"><img src="' + talentLogoPath(wizardState.ultimateOshi) + '" class="confirm-talent-icon">' + ut.name + '</span>'
  } else {
    utEl.textContent = '未選択'
  }

  var favNames = wizardState.favorites.map(function (id) { return TALENTS[id].name }).join('、')
  document.getElementById('confirm-favorites').textContent = favNames || 'なし'
  document.getElementById('confirm-comment').textContent = wizardState.comment || '（未入力）'
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

  if (page === 1 && !wizardState.ultimateOshi) return

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
  var h1 = document.querySelector('#home-header h1')
  if (h1) h1.textContent = data ? data.playerName + ' の Chronicle' : 'Chronicle'
  document.getElementById('home-screen').classList.remove('hidden')
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

  // コメント入力
  var commentInput = document.getElementById('input-comment')
  if (commentInput) {
    commentInput.addEventListener('input', function () {
      wizardState.comment = commentInput.value
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
  var confirmBtn = document.querySelector('.setup-btn-confirm')
  if (confirmBtn) confirmBtn.addEventListener('click', confirmSetup)
})()
