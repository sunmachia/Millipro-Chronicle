// Canvas ハンバーガーメニュー化 回帰テスト
// renderCanvasScreen を script.js から抽出し、ミニDOMスタブ上で検証する
// 実行: node tests/canvastest.js
var fs = require('fs')
var path = require('path')
var vm = require('vm')
var root = path.join(__dirname, '..')
var src = fs.readFileSync(path.join(root, 'script.js'), 'utf8')
var count = 0
function ok(cond, name) {
  count++
  if (cond) { console.log('ok ' + count + ' ' + name) }
  else { console.log('NG ' + count + ' ' + name); process.exit(1) }
}

// ---- 抽出 ----
function extractFn(name) {
  var i = src.indexOf('function ' + name + '() {')
  if (i < 0) throw new Error('function ' + name + ' not found')
  i = src.indexOf('{', i)
  var depth = 0, j = i
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') { depth--; if (depth === 0) break }
  }
  return src.slice(i, j + 1)
}
var canvasBody = extractFn('renderCanvasScreen')
var stateMatch = src.match(/var canvasState = \{[\s\S]*?\n\}/)
if (!stateMatch) throw new Error('canvasState not found')
var colorsMatch = src.match(/var GALLERY_COLORS = \[[^\]]*\]/)
var sizesMatch = src.match(/var GALLERY_SIZES = \[[^\]]*\]/)

// ---- ミニDOM ----
function FakeEl(tag, attrs) {
  this.tag = tag
  this.attrs = attrs || {}
  this.children = []
  this.listeners = {}
  this.dataset = {}
  this.style = {}
  this.textContent = ''
  this.classList = {
    _s: new Set(),
    add: function (n) { this._s.add(n) },
    remove: function (n) { this._s.delete(n) },
    toggle: function (n, force) {
      if (force === undefined) { if (this._s.has(n)) { this._s.delete(n); return false } this._s.add(n); return true }
      if (force) this._s.add(n); else this._s.delete(n); return force
    },
    contains: function (n) { return this._s.has(n) },
  }
  this.value = ''
  this.files = null
}
FakeEl.prototype.addEventListener = function (ev, h) { (this.listeners[ev] = this.listeners[ev] || []).push(h) }
FakeEl.prototype.click = function () {
  var self = this
  if (this.listeners['click']) {
    this.listeners['click'].forEach(function (h) { h({ stopPropagation: function () {}, target: self, pointerId: 1, clientX: 10, clientY: 10 }) })
  }
}
FakeEl.prototype.contains = function (el) {
  for (var i = 0; i < this.children.length; i++) {
    if (this.children[i] === el || this.children[i].contains(el)) return true
  }
  return false
}
FakeEl.prototype.querySelectorAll = function (sel) {
  var out = []
  function walk(el) {
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i]
      if (matchSel(c, sel)) out.push(c)
      walk(c)
    }
  }
  walk(this)
  return out
}
FakeEl.prototype.querySelector = function (sel) {
  var all = this.querySelectorAll(sel)
  return all.length ? all[0] : null
}
function matchSel(el, sel) {
  var attrs = []
  var rest = sel
  var am
  while ((am = rest.match(/\[([a-z-]+)(?:="([^"]*)")?\]/))) {
    attrs.push([am[1].replace(/^data-/, ''), am[2]])
    rest = rest.replace(am[0], '')
  }
  var id = null
  var classes = rest.split('.').filter(function (p) {
    if (p === '') return false
    if (p.charAt(0) === '#') { id = p.slice(1); return false }
    return true
  })
  if (id !== null && el.attrs.id !== id) return false
  for (var i = 0; i < classes.length; i++) {
    if (el.classList.contains(classes[i])) continue
    if ((el.attrs['class'] || '').split(/\s+/).indexOf(classes[i]) < 0) return false
  }
  for (var j = 0; j < attrs.length; j++) {
    var key = attrs[j][0]
    if (attrs[j][1] === undefined) { if (el.dataset[key] === undefined) return false }
    else if (el.dataset[key] !== attrs[j][1]) return false
  }
  return true
}

var byId = {}
function parseHTML(html, parent) {
  var re = /<([a-z]+)((?:\s+[a-z][a-z-]*(?:="[^"]*")?)*)\s*(\/)?>|<\/([a-z]+)>|([^<]+)/g
  var stack = [parent]
  var m
  while ((m = re.exec(html))) {
    if (m[1]) {
      var attrs = {}
      var am = m[2].match(/([a-z][a-z-]*)="([^"]*)"/g) || []
      for (var i = 0; i < am.length; i++) {
        var kv = am[i].match(/([a-z][a-z-]*)="([^"]*)"/)
        attrs[kv[1]] = kv[2]
      }
      var el = new FakeEl(m[1], attrs)
      if (attrs['class']) {
        attrs['class'].split(/\s+/).forEach(function (cl) { if (cl) el.classList._s.add(cl) })
      }
      for (var k in attrs) {
        if (k === 'id') continue
        if (k.indexOf('data-') === 0) el.dataset[k.replace(/^data-/, '')] = attrs[k]
        else el.attrs[k] = attrs[k]
      }
      if (attrs.id && !byId[attrs.id]) byId[attrs.id] = el
      stack[stack.length - 1].children.push(el)
      if (!m[3]) stack.push(el)
    } else if (m[4]) {
      stack.pop()
    } else if (m[5]) {
      stack[stack.length - 1].textContent += m[5]
    }
  }
  return parent
}

var body = new FakeEl('div', {})
Object.defineProperty(body, 'innerHTML', {
  set: function (v) { body.children = []; parseHTML(v, body) },
  get: function () { return '' },
})
byId['canvas-body'] = body

// ---- コンテキスト ----
var calls = { renderGallery: [], closePopup: [], openPopup: [], playTap: 0, scaleImage: 0, anchorClicked: 0 }
function ctx2d() {
  var c = {}
  ;['fillRect', 'beginPath', 'arc', 'moveTo', 'lineTo', 'stroke', 'fill'].forEach(function (m) { c[m] = function () {} })
  return c
}
var context = {
  document: {
    getElementById: function (id) { return byId[id] || null },
    createElement: function (tag) {
      var el = new FakeEl(tag)
      el.click = function () { calls.anchorClicked++ }
      return el
    },
  },
  FileReader: function () { this.readAsDataURL = function () { this.onload({ target: { result: 'data:image/jpeg;base64,xxx' } }) } },
  Image: function () {
    this.onload = null
    Object.defineProperty(this, 'src', { set: function (v) { if (this.onload) this.onload() } })
  },
  playTapSound: function () { calls.playTap++ },
  scaleImageData: function () { calls.scaleImage++; return 'data:image/jpeg;base64,scaled' },
  renderGalleryScreen: function (m) { calls.renderGallery.push(m) },
  closePopup: function (id) { calls.closePopup.push(id) },
  openPopup: function (id) { calls.openPopup.push(id) },
  console: console,
}
vm.runInNewContext(stateMatch[0], context)
context.canvasState = context.canvasState
context.GALLERY_COLORS = vm.runInNewContext(colorsMatch[0] + '\nGALLERY_COLORS', context)
context.GALLERY_SIZES = vm.runInNewContext(sizesMatch[0] + '\nGALLERY_SIZES', context)

var canvasEl = new FakeEl('canvas', { id: 'canvas-main' })
canvasEl.getContext = function () {
  if (!canvasEl._ctx) canvasEl._ctx = ctx2d()
  return canvasEl._ctx
}
canvasEl.getBoundingClientRect = function () { return { left: 0, top: 0, width: 512, height: 512 } }
canvasEl.setPointerCapture = function () {}
canvasEl.toDataURL = function () { return 'data:image/png;base64,art' }
byId['canvas-main'] = canvasEl

vm.runInContext('(function() {' + canvasBody + '\n})()', context)

// ---- アサーション ----
function click(el) {
  el.listeners['click'].forEach(function (h) { h({ stopPropagation: function () {}, target: el, pointerId: 1, clientX: 10, clientY: 10 }) })
}
function el(id) { return byId[id] }

ok(el('canvas-menu-btn') !== null, '☰ボタン存在')
ok(el('canvas-status') !== null, 'ステータス表示存在')
ok(el('canvas-menu') !== null, 'ハンバーガーメニュー存在')
ok(el('canvas-upload-btn') !== null, 'メニュー内:画像を選ぶ')
ok(el('canvas-save-btn') !== null, 'メニュー内:端末に保存')
ok(el('canvas-post-btn') !== null, 'メニュー内:投稿')
ok(el('canvas-tool-clear') !== null, 'クイック:🗑️')
ok(el('canvas-file-input') !== null, 'ファイル入力存在')
ok(!byId['canvas-tool-pen'] && !byId['canvas-tool-eraser'], '旧ツールバー除去')
ok(body.querySelectorAll('.canvas-color').length === context.GALLERY_COLORS.length, 'スウォッチ数=' + context.GALLERY_COLORS.length)
ok(body.querySelectorAll('.canvas-menu-size').length === context.GALLERY_SIZES.length, '太さボタン数=' + context.GALLERY_SIZES.length)
ok(body.querySelectorAll('[data-tool].active').length === 2, '初期アクティブツール2箇所（クイック+メニュー）')
ok(el('canvas-menu').classList.contains('hidden'), 'メニュー初期は閉')
ok(el('canvas-status').textContent.indexOf('ペン') >= 0, '初期ステータス=ペン')

click(el('canvas-menu-btn'))
ok(!el('canvas-menu').classList.contains('hidden'), '☰で開く')
click(el('canvas-menu-btn'))
ok(el('canvas-menu').classList.contains('hidden'), '☰で閉じる')
click(el('canvas-menu-btn'))
ok(!el('canvas-menu').classList.contains('hidden'), '再度開く')

click(body.querySelectorAll('.canvas-quick[data-tool="eraser"]')[0])
ok(context.canvasState.tool === 'eraser', 'ツール=eraser')
ok(el('canvas-status').textContent.indexOf('消しゴム') >= 0, 'ステータス表示更新')
ok(el('canvas-menu').classList.contains('hidden'), '選択後メニュー閉')

click(body.querySelectorAll('.canvas-menu-size[data-size="12"]')[0])
ok(context.canvasState.size === 12, '太さ=12')
ok(body.querySelectorAll('.canvas-menu-size[data-active="1"]')[0].dataset.size === '12', '太さactive表示')

click(body.querySelectorAll('.canvas-color[data-color="#ef4444"]')[0])
ok(context.canvasState.color === '#ef4444', '色=#ef4444')
ok(context.canvasState.tool === 'pen', '色選択でペンに戻る')
ok(body.querySelectorAll('[data-tool].active').length === 2, 'アクティブはペンのみ2箇所')

click(el('canvas-menu-btn'))
ok(!el('canvas-menu').classList.contains('hidden'), '外側テスト:開いた状態')
click(body)
ok(el('canvas-menu').classList.contains('hidden'), '外側クリックで閉')
click(el('canvas-menu-btn'))
click(el('canvas-upload-btn'))
ok(el('canvas-menu').classList.contains('hidden'), 'アクション後メニュー閉')

click(el('canvas-save-btn'))
ok(calls.anchorClicked === 1, '保存a.click呼び出し')

click(el('canvas-post-btn'))
ok(context.canvasState.imageData === 'data:image/png;base64,art', '投稿でimageData設定')
ok(calls.renderGallery[0] === 'upload', 'renderGalleryScreen(upload)')
ok(calls.closePopup[0] === 'popup-canvas' && calls.openPopup[0] === 'popup-gallery', 'ギャラリーへ遷移')

click(el('canvas-upload-btn'))
el('canvas-file-input').files = [{ name: 'a.png' }]
el('canvas-file-input').listeners['change'].forEach(function (h) { h.call(el('canvas-file-input')) })
ok(calls.scaleImage === 1, 'scaleImageData呼び出し')
ok(context.canvasState.imageData === 'data:image/jpeg;base64,scaled', '画像読込でimageData更新')
ok(calls.renderGallery[1] === 'upload', '画像読込でギャラリー遷移')

click(el('canvas-tool-clear'))
ok(canvasEl.listeners['pointerdown'] && canvasEl.listeners['pointermove'] && canvasEl.listeners['pointerup'], 'ポインタ描画ハンドラ維持')

console.log('ALL PASS (' + count + ')')