// タレント定義一元化 + 配信ダンジョン推し反映 回帰テスト
// 実行: node tests/talenttest.js
var fs = require('fs')
var path = require('path')
var vm = require('vm')
var root = path.join(__dirname, '..')
var count = 0
function ok(cond, name) {
  count++
  if (cond) { console.log('ok ' + count + ' ' + name) }
  else { console.log('NG ' + count + ' ' + name); process.exit(1) }
}

var initSrc = fs.readFileSync(path.join(root, 'firebase-init.js'), 'utf8')
var scriptSrc = fs.readFileSync(path.join(root, 'script.js'), 'utf8')
var dungeonSrc = fs.readFileSync(path.join(root, 'dungeon.js'), 'utf8')
var dungeonHtmlSrc = fs.readFileSync(path.join(root, 'dungeon.html'), 'utf8')
var dataSrc = fs.readFileSync(path.join(root, 'gameData.js'), 'utf8')
var indexHtmlSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8')

// ---- 1. 単一ソース: MILLIPRO_TALENTS ----
ok(initSrc.indexOf('var MILLIPRO_TALENTS = {') >= 0, 'MILLIPRO_TALENTS 定義あり')
var m = initSrc.match(/var MILLIPRO_TALENTS = \{[\s\S]*?\n\}/)
ok(!!m, 'MILLIPRO_TALENTS ブロック抽出')
var ctxTmp = {}
vm.runInNewContext(initSrc, ctxTmp)
vm.runInContext('firebaseReady = true', ctxTmp)
var ids = vm.runInContext('Object.keys(MILLIPRO_TALENTS)', ctxTmp)
ok(ids.length === 10, 'MILLIPRO_TALENTS 10人分')
;['konomi','nono','akubi','rako','yura','koma','rizu','tukuri','nuhu','rei'].forEach(function(id){
  ok(ids.indexOf(id) >= 0, 'ID ' + id + ' あり')
  ok(vm.runInContext('typeof MILLIPRO_TALENTS["' + id + '"].name === "string"', ctxTmp), id + ' nameあり')
  ok(vm.runInContext('typeof MILLIPRO_TALENTS["' + id + '"].group !== "undefined"', ctxTmp), id + ' groupあり')
  ok(vm.runInContext('typeof MILLIPRO_TALENTS["' + id + '"].battle === "object"', ctxTmp), id + ' battleあり')
  ok(vm.runInContext('typeof MILLIPRO_TALENTS["' + id + '"].battle.atk === "number"', ctxTmp), id + ' battle.atk 数値')
  ok(vm.runInContext('typeof MILLIPRO_TALENTS["' + id + '"].battle.def === "number"', ctxTmp), id + ' battle.def 数値')
})

// ---- 2. 一元化: script.js / dungeon.js は参照のみ ----
ok(scriptSrc.indexOf('var TALENTS = MILLIPRO_TALENTS') >= 0, 'script.js: TALENTS = MILLIPRO_TALENTS 参照')
ok(scriptSrc.indexOf("const TALENTS = {") < 0, 'script.js: 旧 TALENTS リテラル無し')
ok(dungeonSrc.indexOf('var DUNGEON_TALENTS = MILLIPRO_TALENTS') >= 0, 'dungeon.js: DUNGEON_TALENTS = MILLIPRO_TALENTS 参照')
ok(dungeonSrc.indexOf("var DUNGEON_TALENTS = {") < 0, 'dungeon.js: 旧 DUNGEON_TALENTS リテラル無し')
ok(scriptSrc.indexOf('var GROUP_TALENTS') >= 0, 'GROUP_TALENTS 維持')

// ---- 3. HTML 読み込み順 ----
ok(dungeonHtmlSrc.indexOf('firebase-init.js') >= 0, 'dungeon.html: firebase-init 読み込みあり')
ok(dungeonHtmlSrc.indexOf('firebase-config.js') >= 0, 'dungeon.html: firebase-config 読み込みあり')
ok(dungeonHtmlSrc.indexOf('firebase-init.js') < dungeonHtmlSrc.indexOf('dungeon.js'), 'dungeon.html: firebase-init は dungeon.js より前')
ok(dungeonHtmlSrc.indexOf('gameData.js') < dungeonHtmlSrc.indexOf('dungeon.js'), 'dungeon.html: gameData は dungeon.js より前')
ok(indexHtmlSrc.indexOf('firebase-init.js') < indexHtmlSrc.indexOf('script.js'), 'index.html: firebase-init は script.js より前')

// ---- 4. gameData.js: talentBattleStats が推し対応 ----
ok(dataSrc.indexOf('function talentBattleStats(level, talentId)') >= 0, 'talentBattleStats は (level, talentId) シグネチャ')
ok(dataSrc.indexOf('MILLIPRO_TALENTS') >= 0, 'talentBattleStats は MILLIPRO_TALENTS を参照')
ok(dungeonSrc.indexOf('talentBattleStats(gd.level, talentId)') >= 0, 'startBattle: talentBattleStats に talentId を渡す')
ok(dungeonSrc.indexOf('talentBattleStats(gd.level, state.talentId)') >= 0, 'renderBattle/doCommand/doGift: talentId を渡す')
var calls = (dungeonSrc.match(/talentBattleStats\(/g) || []).length
ok(calls === 4, 'dungeon.js: talentBattleStats 呼び出し4箇所すべて更新')
ok((dungeonSrc.match(/talentBattleStats\(gd\.level\)/g) || []).length === 0, '旧シグネチャ(引数1つ)呼び出しは残っていない')

// ---- 5. 挙動: タレントで atk/def が変わる ----
var ctx = { console: console, localStorage: { getItem: function(){return null}, setItem: function(){} }, window: {}, document: {} }
vm.createContext(ctx)
vm.runInContext(initSrc, ctx)
vm.runInContext(dataSrc, ctx)
// Lv10: base maxHp 210, atk 32, def 10
var base = vm.runInContext('talentBattleStats(10)', ctx)
ok(base.maxHp === 210 && base.atk === 32 && base.def === 10, 'Lv10 base=210/32/10')
var atk = vm.runInContext('talentBattleStats(10, "akubi")', ctx)
ok(atk.atk === 37 && atk.def === 9, 'akubi(atk型): 37/9')
var def = vm.runInContext('talentBattleStats(10, "yura")', ctx)
ok(def.atk === 29 && def.def === 12, 'yura(def型): 29/12')
var bal = vm.runInContext('talentBattleStats(10, "konomi")', ctx)
ok(bal.atk === 32 && bal.def === 10, 'konomi(balance): 32/10')
var unknown = vm.runInContext('talentBattleStats(10, "unknown")', ctx)
ok(unknown.atk === 32 && unknown.def === 10, '未知IDは base にフォールバック')
var noarg = vm.runInContext('talentBattleStats(10, null)', ctx)
ok(noarg.atk === 32 && noarg.def === 10, 'null は base にフォールバック')
var noarg2 = vm.runInContext('talentBattleStats(10, undefined)', ctx)
ok(noarg2.atk === 32 && noarg2.def === 10, 'undefined は base にフォールバック')
// atk型は atk>base, def<base / def型は逆
;['akubi','rako','rizu','rei'].forEach(function(id){
  var s = vm.runInContext('talentBattleStats(10, "' + id + '")', ctx)
  ok(s.atk > 32 && s.def < 10, id + '(atk型): atk>base, def<base')
})
;['yura','koma','tukuri'].forEach(function(id){
  var s = vm.runInContext('talentBattleStats(10, "' + id + '")', ctx)
  ok(s.atk < 32 && s.def > 10, id + '(def型): atk<base, def>base')
})
;['konomi','nono','nuhu'].forEach(function(id){
  var s = vm.runInContext('talentBattleStats(10, "' + id + '")', ctx)
  ok(s.atk === 32 && s.def === 10, id + '(balance): base と同値')
})
// Lv1 でも最低1ガード
var lv1atk = vm.runInContext('talentBattleStats(1, "yura")', ctx)
ok(lv1atk.atk >= 1 && lv1atk.def >= 1, 'Lv1 でも最低1')

console.log('ALL PASS (' + count + ')')
