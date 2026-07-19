import * as THREE from 'three'
import { PatrolBot } from '../enemies/patrolBot.js'
import { Rusher } from '../enemies/rusher.js'
import { Sniper } from '../enemies/sniper.js'
import { createBulletPickup, createMedkit } from '../core/pickups.js'

const ENEMY_CLASSES = {
  patrolBot: PatrolBot,
  rusher: Rusher,
  sniper: Sniper
}

export class WaveSystem {
  constructor(game) {
    this.game = game
    this.waves = []
    this.currentWave = -1
    this.active = false
    this.waveDelay = 0
    this._countdownActive = false
    this._countdownTimer = 0
    this._countdownDuration = 0
    this._countdownCallback = null
  }

  reset() {
    this.waves = []
    this.currentWave = -1
    this.active = false
    this.waveDelay = 0
    this._countdownActive = false
    this._countdownTimer = 0
    this._countdownDuration = 0
    this._countdownCallback = null
  }

  defineWaves(waveDefs) {
    this.waves = waveDefs
  }

  start() {
    this.active = true
    this.currentWave = -1
    this._startNextWave()
  }

  _dropPickup() {
    const x = (Math.random() - 0.5) * 8
    const z = (Math.random() - 0.5) * 8
    const isAmmo = Math.random() > 0.5
    const game = this.game
    if (isAmmo) {
      const p = createBulletPickup()
      p.position.set(x, 1.2, z)
      game.scene.add(p)
      if (game.level) {
        if (!game.level.ammoPickups) game.level.ammoPickups = []
        game.level.ammoPickups.push(p)
        if (game.level.decorations) game.level.decorations.push(p)
      }
    } else {
      const p = createMedkit()
      p.position.set(x, 1.2, z)
      game.scene.add(p)
      if (game.level) {
        if (!game.level.healthPickups) game.level.healthPickups = []
        game.level.healthPickups.push(p)
        if (game.level.decorations) game.level.decorations.push(p)
      }
    }
  }

  _startNextWave() {
    this.currentWave++
    if (this.currentWave > 0) this._dropPickup()
    if (this.currentWave >= this.waves.length) {
      this.active = false
      return
    }
    const def = this.waves[this.currentWave]
    const delay = def.delay || 0
    if (delay > 0) {
      this._countdown(delay, () => this._spawnWave(def))
    } else {
      this._spawnWave(def)
    }
  }

  _spawnWave(def) {
    const spawns = def.enemies || []
    for (const entry of spawns) {
      const Cls = ENEMY_CLASSES[entry.type]
      if (!Cls) continue
      const count = entry.count || 1
      for (let i = 0; i < count; i++) {
        const pos = this._pickSpawn(entry.spawnArea)
        const enemy = new Cls(pos)
        if (entry.hpMult) enemy.hp = Math.round(enemy.maxHp * entry.hpMult)
        if (entry.dmgMult) enemy.damage = Math.round(enemy.damage * entry.dmgMult)
        this.game.scene.add(enemy.mesh)
        this.game.enemies.push(enemy)
      }
    }
    if (def.message) {
      this._showWaveMessage(def.message)
    }
  }

  _pickSpawn(area) {
    if (!area) return new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10)
    const cx = area.x || 0, cz = area.z || 0
    const hw = (area.w || 8) / 2, hd = (area.d || 8) / 2
    return new THREE.Vector3(
      cx + (Math.random() - 0.5) * hw * 2,
      0,
      cz + (Math.random() - 0.5) * hd * 2
    )
  }

  _showWaveMessage(msg) {
    const el = document.getElementById('wave-message')
    if (!el) return
    el.innerHTML = '<span class="ico ico-diamond" style="color:rgba(0,242,255,0.6);margin-right:6px"></span> ' + msg
    el.style.opacity = '1'
    setTimeout(() => { el.style.opacity = '0' }, 3000)
  }

  _countdown(duration, callback) {
    this._countdownActive = true
    this._countdownTimer = duration
    this._countdownDuration = duration
    this._countdownCallback = callback
  }

  update(delta) {
    if (this._countdownActive) {
      this._countdownTimer -= delta
      this._updateWaveHUD()
      if (this._countdownTimer <= 0) {
        this._countdownActive = false
        const cb = this._countdownCallback
        this._countdownCallback = null
        if (cb) cb()
      }
      return
    }
    if (!this.active) return
    const alive = this.game.enemies.filter(e => !e.dead).length
    if (alive === 0) {
      this._startNextWave()
    }
  }

  _updateWaveHUD() {
    const el = document.getElementById('wave-countdown')
    if (!el) return
    const sec = Math.ceil(this._countdownTimer)
    el.textContent = `下一波攻擊：${sec}s`
    el.style.opacity = sec > 0 ? '1' : '0'
  }

  hasMoreWaves() {
    return this.active || this.currentWave < this.waves.length - 1
  }

  isComplete() {
    return !this.active && this.currentWave >= this.waves.length - 1
  }
}
