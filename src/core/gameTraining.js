import * as THREE from 'three'
import { TrainingRange } from '../levels/trainingRange.js'
import { PatrolBot } from '../enemies/patrolBot.js'
import { Rusher } from '../enemies/rusher.js'
import { Sniper } from '../enemies/sniper.js'

export function addTrainingMethods(Game) {

  Game.prototype._startTrainingMode = function() {
    this.trainingMode = true
    this.trainingScore = 0
    this.transitioning = true
    this.level = new TrainingRange(this.scene, 'easy', this.trainingEnemy === 'targetDummy')
    this.level.build()
    this._spawnTrainingEnemies()
    this.transitioning = false
    this.player.yaw = -Math.PI / 2
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.player.yaw
    this.camera.rotation.x = 0
    this.lockPointer()
    for (const w of this.weaponManager.weapons) {
      w.reserveAmmo = Infinity
      w.currentAmmo = w.magazineSize
    }
    document.getElementById('training-exit-hud').style.display = 'block'
    this._showEnemyProfile()
  }

  Game.prototype._showEnemyProfile = function() {
    const type = this.trainingEnemy || 'targetDummy'
    const svgIcons = {
      targetDummy: '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="13" fill="none" stroke="#00f2ff" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="none" stroke="#00f2ff" stroke-width="2"/><line x1="20" y1="7" x2="20" y2="12" stroke="#00f2ff" stroke-width="2"/><line x1="20" y1="28" x2="20" y2="33" stroke="#00f2ff" stroke-width="2"/><line x1="7" y1="20" x2="12" y2="20" stroke="#00f2ff" stroke-width="2"/><line x1="28" y1="20" x2="33" y2="20" stroke="#00f2ff" stroke-width="2"/></svg>',
      patrolBot: '<svg viewBox="0 0 40 40" width="40" height="40"><rect x="8" y="8" width="24" height="24" rx="4" fill="none" stroke="#00f2ff" stroke-width="2" transform="rotate(45,20,20)"/><circle cx="20" cy="20" r="5" fill="none" stroke="#00f2ff" stroke-width="2"/><path d="M20 12 L20 16 M20 24 L20 28 M12 20 L16 20 M24 20 L28 20" stroke="#00f2ff" stroke-width="2"/></svg>',
      rusher: '<svg viewBox="0 0 40 40" width="40" height="40"><path d="M22 4 L10 20 L18 18 L14 36 L30 18 L22 20 Z" fill="none" stroke="#00f2ff" stroke-width="2" stroke-linejoin="round"/><line x1="20" y1="34" x2="20" y2="38" stroke="#00f2ff" stroke-width="2" stroke-linecap="round"/></svg>',
      sniper: '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="13" fill="none" stroke="#00f2ff" stroke-width="2"/><line x1="20" y1="5" x2="20" y2="11" stroke="#00f2ff" stroke-width="2"/><line x1="20" y1="29" x2="20" y2="35" stroke="#00f2ff" stroke-width="2"/><line x1="5" y1="20" x2="11" y2="20" stroke="#00f2ff" stroke-width="2"/><line x1="29" y1="20" x2="35" y2="20" stroke="#00f2ff" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#00f2ff"/></svg>'
    }
    const data = {
      targetDummy: { name: '定點標靶', type: 'targetDummy', hp: 1, spd: 0, dmg: 0, threat: '無', desc: '固定與移動式射擊標靶，用於測試武器準度與手感。完全沒有攻擊性，是熟悉操作的最佳起點。', quote: '「連這個都打不中的話，建議改行當文書兵。」' },
      patrolBot: { name: '巡邏機兵', type: 'patrolBot', hp: 3, spd: 3, dmg: 2, threat: '低', desc: '標準中距離作戰單位，配備電磁步槍。發現目標後會進行側移迴避，同時保持 6-8 公尺的作戰距離，考驗玩家的跟槍與預判能力。', quote: '「它真的在躲子彈——不，它只是程式寫得比較好。」' },
      rusher: { name: '突擊無人機', type: 'rusher', hp: 2, spd: 5, dmg: 5, threat: '高', desc: '高速衝刺型近接攻擊單位。鎖定目標後以直線路徑全力衝刺，近身造成大量傷害。考驗玩家的距離控制、後撤射擊與危機反應。', quote: '「跑給它追，回頭射爆，活下來。做不到的話，重來。」' },
      sniper: { name: '狙擊無人機', type: 'sniper', hp: 2, spd: 1, dmg: 4, threat: '中', desc: '遠距精準打擊單位。鎖定目標後發射前會先以紅外線雷射標定，提供約零點五秒的閃避窗口。考驗玩家對環境警示的警覺與快速位移能力。', quote: '「看到紅線的時候，你只剩下⋯⋯大概半秒可以後悔。」' }
    }
    const p = data[type]
    document.getElementById('ep-icon').innerHTML = svgIcons[p.type]
    document.getElementById('ep-name').textContent = p.name
    document.getElementById('ep-stat-hp').style.width = (p.hp / 5 * 100) + '%'
    document.getElementById('ep-stat-spd').style.width = (p.spd / 5 * 100) + '%'
    document.getElementById('ep-stat-dmg').style.width = (p.dmg / 5 * 100) + '%'
    document.getElementById('ep-stat-threat').textContent = p.threat
    document.getElementById('ep-desc').textContent = p.desc
    document.getElementById('ep-quote').textContent = p.quote
    document.getElementById('enemy-profile').style.display = 'block'
  }

  Game.prototype._hideEnemyProfile = function() {
    const el = document.getElementById('enemy-profile')
    if (el) el.style.display = 'none'
  }

  Game.prototype._updateTrainingScoreDisplay = function() {
    const el = document.getElementById('training-score')
    if (el) {
      el.textContent = `得分 ${this.trainingScore || 0}`
      el.style.opacity = '1'
    }
  }

  Game.prototype._spawnTrainingEnemies = function() {
    const type = this.trainingEnemy || 'targetDummy'
    const hints = {
      targetDummy: '定點與移動靶射擊練習 — 固定靶測試準度，移動靶訓練跟槍。善用不同距離的靶位調整手感，推薦做為每次訓練的熱身項目。',
      patrolBot: '巡邏機兵會側移閃避並保持中距離射擊 — 練習跟槍穩定度與掩體運用。試著在它側移時預判它的移動方向，提前將準心放在它的路徑上。',
      rusher: '突擊無人機以直線高速衝刺逼近 — 練習後撤射擊與距離控制。核心策略是在它近身之前將其擊殺，保持移動並持續輸出火力。',
      sniper: '狙擊無人機遠距鎖定，發射前有紅外線雷射標定警示 — 練習快速察覺雷射方向並利用障礙物阻斷視線。聽到鎖定音效時立刻變換位置。'
    }
    if (!this._trainingSpawned) {
      const hintEl = document.getElementById('training-hint')
      if (hintEl) {
        hintEl.textContent = hints[type] || ''
        hintEl.classList.add('visible')
        setTimeout(() => hintEl.classList.remove('visible'), 10000)
      }
      this._trainingSpawned = true
    }
    if (type === 'targetDummy') {
      this.level.spawnTargets(this)
      return
    }
    const positions = [
      { x: 8, z: -5 }, { x: 9, z: 5 },
      { x: 13, z: -6 }, { x: 14, z: 6 },
      { x: 16, z: -4 }, { x: 17, z: 4 },
      { x: 22, z: -7 }, { x: 24, z: 7 }
    ]
    const constructors = { patrolBot: PatrolBot, rusher: Rusher, sniper: Sniper }
    const Ctor = constructors[type]
    if (!Ctor) return
    for (const pos of positions) {
      const enemy = new Ctor(new THREE.Vector3(pos.x, 0.3, pos.z))
      this.scene.add(enemy.mesh)
      this.enemies.push(enemy)
    }
  }

  Game.prototype.resumeFromPause = function() {
    if (!this.running) return
    document.getElementById('training-exit-btn').style.display = 'none'
    document.getElementById('blocker').style.display = 'none'
    this.paused = false
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    this.lockPointer()
  }

  Game.prototype.exitTraining = function() {
    this.running = false
    this.unlisten()
    if (this.audio) this.audio.stopBGM()
    this.clock.stop()
    this.clock = new THREE.Clock()
    for (const enemy of this.enemies) { this.scene.remove(enemy.mesh) }
    this.enemies = []
    for (const d of this._debrisList) { this.scene.remove(d.mesh); d.mesh.material.dispose() }
    this._debrisList = []
    if (this._explosions) {
      for (const e of this._explosions) {
        for (const p of e.particles) { this.scene.remove(p); p.material.dispose() }
      }
      this._explosions = []
    }
    if (this._enemyTrails) {
      for (const t of this._enemyTrails) { this.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose() }
      this._enemyTrails = []
    }
    if (this.level) this.level.clear()
    this.camera.position.set(0, 1.6, 0)
    this.camera.rotation.set(0, 0, 0)
    this.player.reset()
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.currentLevel = 0
    this._retryLevel = 0
    this._trainingSpawned = false
    this.trainingMode = false
    this.trainingEnemy = null
    this.paused = false
    this.transitioning = false
    this.devMode = false
    this._realHealth = 100
    this._realRegenHealed = 0
    document.getElementById('hud').style.display = 'none'
    document.getElementById('blocker').style.display = 'flex'
    document.getElementById('blocker').querySelector('h1').textContent = '訊號：零層'
    const subEl = document.getElementById('blocker').querySelector('.sub')
    if (subEl) subEl.textContent = 'SIGNAL ZERO'
    const divEl = document.getElementById('blocker').querySelector('.divider')
    if (divEl) divEl.style.display = 'block'
    document.getElementById('blocker').querySelector('.flash').textContent = '點擊開始'
    const sysEl = document.getElementById('blocker').querySelector('.sys-info')
    if (sysEl) sysEl.textContent = 'SYSTEM v0.1.0 ｜ STATUS: STANDBY ｜ AUDIO LOG: ENABLED'
    document.getElementById('training-exit-btn').style.display = 'none'
    document.getElementById('training-exit-hud').style.display = 'none'
    document.getElementById('training-hint').classList.remove('visible')
    const ts = document.getElementById('training-score')
    if (ts) { ts.style.opacity = '0'; ts.textContent = '' }
    this._hideEnemyProfile()
    document.getElementById('difficulty-select').style.display = 'flex'
    if (document.pointerLockElement) document.exitPointerLock()
  }
}
