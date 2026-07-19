(function () {
  'use strict'

  let deferredPrompt = null

  const overlay = document.getElementById('pwa-overlay')
  const bannerText = document.getElementById('pwa-banner-text')
  const actionBtn = document.getElementById('pwa-action-btn')
  const closeBtn = document.getElementById('pwa-close-btn')
  const installBtn = document.getElementById('pwa-install-btn')
  const bannerButtons = document.querySelector('.pwa-banner-buttons')

  function showBanner(msg, btnText, btnHandler, forced) {
    bannerText.textContent = msg
    if (btnText && btnHandler) {
      actionBtn.textContent = btnText
      actionBtn.onclick = btnHandler
      actionBtn.style.display = ''
    } else {
      actionBtn.style.display = 'none'
    }
    closeBtn.style.display = forced ? 'none' : ''
    installBtn.style.display = 'none'
    if (bannerButtons) bannerButtons.style.display = forced ? 'none' : ''
    overlay.classList.add('show')
    if (forced) overlay.classList.add('forced')
  }

  function hideBanner() {
    overlay.classList.remove('show', 'forced')
  }

  function isDismissed() {
    const t = localStorage.getItem('pwa_banner_dismissed')
    if (!t) return false
    return (Date.now() - parseInt(t, 10)) < 7 * 24 * 60 * 60 * 1000
  }

  function updateActionBtn() {
    actionBtn.textContent = 'ホーム画面に追加'
    actionBtn.onclick = async () => {
      if (!deferredPrompt) return
      hideBanner()
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      deferredPrompt = null
    }
  }

  function showInstallBtn() {
    if (installBtn) installBtn.style.display = ''
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    const el = document.getElementById('pwa-overlay')
    if (!el || !el.classList.contains('show')) return
    if (/Android/i.test(navigator.userAgent)) {
      updateActionBtn()
    } else {
      showInstallBtn()
    }
  })

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return
    hideBanner()
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
  })

  closeBtn.addEventListener('click', () => {
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString())
    hideBanner()
  })

  document.addEventListener('DOMContentLoaded', () => {
    const ua = navigator.userAgent
    const platform = navigator.platform

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://') ||
      document.fullscreenElement ||
      document.webkitFullscreenElement
    ) return

    if (/Twitter/i.test(ua)) {
      showBanner(
        'Xアプリ内で閲覧しています。画面下部中央の ⋮ から「ブラウザで開く」を選んでください。',
        null, null, true
      )
      return
    }
    if (/LINE/i.test(ua)) {
      showBanner(
        'LINEアプリ内で閲覧しています。右下の ⋮ から「ブラウザで開く」を選んでください。',
        null, null, true
      )
      return
    }
    if (/Instagram/i.test(ua)) {
      showBanner(
        'Instagramアプリ内で閲覧しています。右上の ⋯ から「外部ブラウザーで開く」を選んでください。',
        null, null, true
      )
      return
    }

    if (isDismissed()) return

    const isIPad = /MacIntel/.test(platform) && navigator.maxTouchPoints > 1
    const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPad
    const isAndroid = /Android/.test(ua)
    const isDesktop = !/Android|iPhone|iPad|iPod/i.test(ua) && !isIPad

    if (isDesktop) {
      showBanner(
        'パソコンの大画面で快適にご覧いただくために、全画面表示またはアプリのインストールを推奨します。',
        '全画面にする',
        () => {
          const d = document.documentElement
          if (d.requestFullscreen) d.requestFullscreen()
          else if (d.webkitRequestFullscreen) d.webkitRequestFullscreen()
          hideBanner()
        }
      )
      if (deferredPrompt) showInstallBtn()
    } else if (isIOS) {
      showBanner(
        'ホーム画面に追加すると、次回からアプリのように素早くアクセスできます。',
        '追加方法を見る',
        () => {
          alert(
            '画面下部の「共有ボタン（四角から矢印が出ているアイコン）」をタップし、「ホーム画面に追加」を選択してください。'
          )
          hideBanner()
        }
      )
    } else if (isAndroid) {
      showBanner(
        'ホーム画面に追加すると、次回からアプリのように素早くアクセスできます。',
        '追加方法を見る',
        () => {
          alert(
            'Chromeのメニュー（右上の ⋮）から「アプリをインストール」または「ホーム画面に追加」を選択してください。'
          )
          hideBanner()
        }
      )
    }

    if (deferredPrompt && overlay.classList.contains('show')) {
      if (/Android/i.test(navigator.userAgent)) {
        updateActionBtn()
      } else {
        showInstallBtn()
      }
    }
  })
})()
