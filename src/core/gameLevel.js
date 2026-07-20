import * as THREE from 'three'
import { ShieldGuardian } from '../enemies/shieldGuardian.js'
import { SignalCore } from '../enemies/signalCore.js'
import { createDataLogPickup } from './datalog.js'
import { NARRATIVE_BOSS_INTRO, NARRATIVE_LEVELS, LEVEL_NAMES } from './narrativeData.js'

export function addLevelMethods(Game, LEVEL_CLASSES, _textureCache, _modelCache) {

  Game.prototype._buildCurrentLevel = function() {
    try {
      const fogBase = this.difficulty === 'hard' ? 0x080606
        : this.difficulty === 'easy' ? 0x0c1a2a
        : 0x0a101e
      this.scene.background = new THREE.Color(fogBase)
      this.scene.fog = new THREE.FogExp2(fogBase, this.difficulty === 'hard' ? 0.018 : this.difficulty === 'easy' ? 0.008 : 0.012)
      if (this.audio && !this.trainingMode) {
        if (this.currentLevel === 4) {
          this.audio.playBGMFile('./audio/bgm_boss.wav', () => this.audio.playBossBGMLayer())
        } else {
          this.audio.playBGMFile('./audio/bgm_normal.wav', () => this.audio.playBGMLayer())
        }
      }
      const LevelClass = LEVEL_CLASSES[this.currentLevel]
      this.level = new LevelClass(this.scene, this.difficulty, { textures: _textureCache, models: _modelCache })
      this.level.build()
      this._setupWaves()
      if (this.currentLevel === 0 && this.waveSystem.waves.length === 0) {
        this.level.spawnEnemies(this)
        this.totalEnemies = this.enemies.length
      }
      if (this.level.buildAmmoPickups) this.level.buildAmmoPickups(this)
      if (this.level.buildHealthPickups) this.level.buildHealthPickups(this)
      if (this.level.buildGrenadePickups) this.level.buildGrenadePickups()
      this._spawnDatalogPickups()
      this._createAmbientParticles()
    } catch (e) {
      console.error('Build level error:', e)
    }
  }

  Game.prototype._setupWaves = function() {
    this.waveSystem.defineWaves([])
    switch (this.currentLevel) {
      case 0:
        this.waveSystem.defineWaves([
          { enemies: [{ type: 'patrolBot', count: 1, spawnArea: { x: 0, z: 0, w: 8, d: 8 } }], message: '第一波：偵測到巡邏單位——測試武器' },
          { delay: 5, enemies: [{ type: 'patrolBot', count: 2, spawnArea: { x: 0, z: 0, w: 10, d: 10 } }], message: '第二波：兩台巡邏機——善用掩體' },
          { delay: 5, enemies: [{ type: 'rusher', count: 2, spawnArea: { x: 5, z: 5, w: 8, d: 8 } }], message: '第三波：自殺無人機——保持距離' },
          { delay: 5, enemies: [{ type: 'patrolBot', count: 1, hpMult: 1.3 }, { type: 'rusher', count: 2, dmgMult: 0.8 }], message: '最終波：混合部隊——全力迎擊' }
        ])
        break
      case 1:
        this.waveSystem.defineWaves([
          { enemies: [{ type: 'patrolBot', count: 2, spawnArea: { x: 0, z: 0, w: 12, d: 12 } }], message: '波次 1/5：偵測到巡邏單位' },
          { delay: 3, enemies: [{ type: 'rusher', count: 2, spawnArea: { x: 0, z: 0, w: 10, d: 10 } }], message: '波次 2/5：快速單位接近中' },
          { delay: 4, enemies: [{ type: 'patrolBot', count: 2, hpMult: 1.2 }, { type: 'sniper', count: 1, spawnArea: { x: 5, z: 5, w: 6, d: 6 } }], message: '波次 3/5：狙擊封鎖' },
          { delay: 4, enemies: [{ type: 'rusher', count: 2 }, { type: 'patrolBot', count: 2, hpMult: 1.2 }], message: '波次 4/5：全面壓制' },
          { delay: 5, enemies: [{ type: 'patrolBot', count: 2, hpMult: 1.2 }, { type: 'rusher', count: 2 }, { type: 'sniper', count: 1, hpMult: 1.1 }], message: '波次 5/5：最終部隊' }
        ])
        break
      case 2:
        return
      case 3:
        this.waveSystem.defineWaves([
          { enemies: [{ type: 'patrolBot', count: 5, hpMult: 1.3, spawnArea: { x: 0, z: 0, w: 16, d: 16 } }], message: '波次 1/6：強化巡邏分隊' },
          { delay: 3, enemies: [{ type: 'rusher', count: 5 }], message: '波次 2/6：快攻壓制' },
          { delay: 3, enemies: [{ type: 'patrolBot', count: 4, hpMult: 1.2 }, { type: 'rusher', count: 3 }], message: '波次 3/6：聯合攻勢' },
          { delay: 4, enemies: [{ type: 'sniper', count: 3, hpMult: 1.2, spawnArea: { x: 4, z: 4, w: 8, d: 8 } }], message: '波次 4/6：多重狙擊' },
          { delay: 4, enemies: [{ type: 'patrolBot', count: 4, hpMult: 1.3 }, { type: 'rusher', count: 5 }], message: '波次 5/6：猛烈反擊' },
          { delay: 5, enemies: [{ type: 'patrolBot', count: 5, hpMult: 1.3 }, { type: 'rusher', count: 5 }, { type: 'sniper', count: 2, hpMult: 1.2 }], message: '波次 6/6：最終防線' }
        ])
        break
      case 4:
        this._spawnFinalBossEnemies()
        return
    }
    if (this.currentLevel < 2 || this.currentLevel === 3) {
      const startCount = this.enemies.length
      this.waveSystem.start()
      this.totalEnemies = startCount + this._estimateWaveTotal()
    }
  }

  Game.prototype._estimateWaveTotal = function() {
    let total = 0
    for (const wave of this.waveSystem.waves) {
      for (const e of (wave.enemies || [])) {
        total += e.count || 1
      }
    }
    return total
  }

  Game.prototype._spawnShieldGuardian = function() {
    const boss = new ShieldGuardian(new THREE.Vector3(4, 0, 0))
    boss._game = this
    this.scene.add(boss.mesh)
    this.enemies.push(boss)
    this.totalEnemies = this.enemies.length
    this.showBossHealthBar(true)
  }

  Game.prototype._spawnBossWithDescent = function() {
    const boss = new ShieldGuardian(new THREE.Vector3(4, 12, 0))
    boss._game = this
    boss._entering = true
    const dirToPlayer = new THREE.Vector3(0, 0, -16).sub(new THREE.Vector3(4, 0, 0)).setY(0).normalize()
    boss.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirToPlayer)
    this.scene.add(boss.mesh)
    this.enemies.push(boss)
    this.totalEnemies = this.enemies.length
    this.showBossHealthBar(true)
    this.transitioning = false
    this.lockPointer()

    const descentSphere = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0xff6600, emissive: 0xff4400,
        emissiveIntensity: 0.8, transparent: true,
        opacity: 0.15, side: THREE.DoubleSide
      })
    )
    descentSphere.position.set(4, 6, 0)
    this.scene.add(descentSphere)

    const startY = 12
    const duration = 2500
    const startTime = performance.now()
    const iv = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 2)
      boss.mesh.position.y = startY * (1 - eased)
      descentSphere.position.y = boss.mesh.position.y + 6
      descentSphere.material.opacity = 0.15 * (1 - eased * 0.7)
      if (progress >= 1) {
        clearInterval(iv)
        boss.mesh.position.y = 0
        boss._entering = false
        boss._descentProtection = false
        this.scene.remove(descentSphere)
        descentSphere.geometry.dispose()
        descentSphere.material.dispose()
      }
    }, 16)
  }

  Game.prototype._spawnFinalBossEnemies = function() {
    const core = new SignalCore(new THREE.Vector3(0, 0, 0))
    core._game = this
    this.scene.add(core.mesh)
    this.enemies.push(core)
    this.totalEnemies = this.enemies.length
    this.showBossHealthBar(true)
  }

  Game.prototype._spawnDatalogPickups = function() {
    const perLevel = [
      { id: 'log_01', x: 6, z: 2 },
      { id: 'log_02', x: -4, z: 7 },
      { id: 'log_03', x: 3, z: -6 },
      { id: 'log_04', x: -7, z: -3 },
      { id: 'log_05', x: 5, z: -8 },
    ]
    const extras = {
      2: { id: 'log_06', x: -3, z: 4 },
      4: { id: 'log_07', x: 0, z: -5 }
    }
    const entry = perLevel[this.currentLevel]
    if (!entry) return
    const pickup = createDataLogPickup(this.scene,
      new THREE.Vector3(entry.x, 0.5, entry.z),
      entry.id,
      (id, text, name) => this.showDatalogPopup(id, name, text)
    )
    if (pickup) this.datalogPickups.push(pickup)
    const extra = extras[this.currentLevel]
    if (extra) {
      const p2 = createDataLogPickup(this.scene,
        new THREE.Vector3(extra.x, 0.5, extra.z),
        extra.id,
        (id, text, name) => this.showDatalogPopup(id, name, text)
      )
      if (p2) this.datalogPickups.push(p2)
    }
  }

  Game.prototype._getSpawnPosition = function(levelIdx) {
    const positions = [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: -16 },
      { x: 0, z: 0 },
      { x: 0, z: -16 },
    ]
    return positions[levelIdx] || { x: 0, z: 0 }
  }

  Game.prototype._getSpawnYaw = function(levelIdx) {
    switch (levelIdx) {
      case 2:
        return Math.atan2(-(4 - 0), -(0 - (-16)))
      case 4:
        return Math.atan2(-(0 - 0), -(0 - (-16)))
      default:
        return 0
    }
  }

  Game.prototype.advanceLevel = function() {
    const prevLevel = this.currentLevel
    if (prevLevel === 2) {
      this.player.maxHealth = 150
      this.player.health = 150
      this.player.segmentSize = this.player.maxHealth / this.player.segmentCount
    }
    this.currentLevel++
    if (this.currentLevel >= LEVEL_CLASSES.length) {
      this.showResults()
      return
    }
    this.transitioning = true

    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh)
      if (enemy.mesh.traverse) {
        enemy.mesh.traverse(child => {
          if (child.isMesh) {
            child.geometry.dispose()
            child.material.dispose()
          }
        })
      }
    }
    this.enemies = []
    this.datalogPickups = []
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
    for (const d of this._debrisList) { this.scene.remove(d.mesh); d.mesh.material.dispose() }
    this._debrisList = []
    this.waveSystem.reset()
    if (this.player) { this.player._shakeIntensity = 0; this.player._shakeDuration = 0 }
    if (this.level) this.level.clear()

    const savedHealth = this.player.health
    const savedStamina = this.player.sprintStamina

    this.player.reset()
    this.player.health = savedHealth
    this.player.sprintStamina = savedStamina
    const idx = this.currentLevel
    const spawn = this._getSpawnPosition(idx)
    const yaw = this._getSpawnYaw(idx)
    this.camera.position.set(spawn.x, 1.6, spawn.z)
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = yaw
    this.camera.rotation.x = 0
    this.player.pitch = 0
    this.player.yaw = yaw

    const pages = NARRATIVE_LEVELS[idx] || [`進入 ${LEVEL_NAMES[idx]}`]

    if (this.currentLevel === 2) {
      this._buildCurrentLevel()
      this.narrative.show(NARRATIVE_BOSS_INTRO, () => {
        this._spawnBossWithDescent()
      })
    } else {
      this.narrative.show(pages, () => {
        this._buildCurrentLevel()
        this.transitioning = false
        this.lockPointer()
      })
    }
  }
}
