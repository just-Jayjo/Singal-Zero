import * as THREE from 'three'
import { Player } from './player.js'
import { WeaponManager } from './weapon.js'
import { HUD } from '../ui/hud.js'
import { AudioManager } from './audio.js'
import { NarrativeScreen } from '../ui/narrative.js'
import { WaveSystem } from './waveSystem.js'
import { Level1 } from '../levels/level1.js'
import { Level2 } from '../levels/level2.js'
import { Level3 } from '../levels/level3.js'
import { Level4 } from '../levels/level4.js'
import { Level5 } from '../levels/level5.js'
import { TrainingRange } from '../levels/trainingRange.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { NARRATIVE_INTRO } from './narrativeData.js'
import { addCombatMethods } from './gameCombat.js'
import { addLevelMethods } from './gameLevel.js'
import { addEndingMethods } from './gameEnding.js'
import { addTrainingMethods } from './gameTraining.js'

const LEVEL_CLASSES = [Level1, Level2, Level4, Level3, Level5]

const _textureCache = new Map()
const _modelCache = new Map()

export class Game {
  constructor() {
    window.__game = this

    /* === Three.js 核心 === */
    this.scene = null
    this.camera = null
    this.renderer = null
    this.clock = new THREE.Clock()

    /* === 遊戲系統 === */
    this.player = null
    this.weaponManager = null
    this.hud = null
    this.audio = null
    this.level = null
    this.narrative = new NarrativeScreen()
    this.waveSystem = new WaveSystem(this)

    /* === 狀態旗標 === */
    this.running = false
    this.listening = false
    this.paused = false
    this.transitioning = false
    this.clearReady = false
    this.endingSequence = false
    this.devMode = false
    this.trainingMode = false

    /* === 進度與計數 === */
    this.currentLevel = 0
    this._retryLevel = 0
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.totalEnemies = 0
    this.startTime = 0
    this.elapsedTime = 0
    this.trainingScore = 0

    /* === 關卡物件集合 === */
    this.enemies = []
    this.datalogPickups = []

    /* === 難度 === */
    this.difficulty = 'normal'
    this.difficultyModifiers = {
      easy: { enemyHp: 0.7, damageMultiplier: 0.5 },
      normal: { enemyHp: 1.0, damageMultiplier: 1.0 },
      hard: { enemyHp: 1.3, damageMultiplier: 1.3 }
    }

    /* === 訓練模式 === */
    this.trainingEnemy = null
    this._trainingSpawned = false

    /* === 視覺特效 === */
    this._ambientParticles = null
    this._particleVelocities = []
    this._debrisList = []
    this._explosions = null
    this._enemyTrails = null
    this._rusherBeepTimers = {}

    /* === 音效 === */
    this._datalogTimeout = null

    /* === DevMode 真實血量（用於顯示實際損傷） === */
    this._realHealth = 100
    this._realRegenHealed = 0

    /* === Ending 序列 === */
    this.endingTimer = 0
    this._endingOverlay = null
    this._endingParticles = []
    this._endingCameraPos = null
    this._endingTarget = null
    this._endingOrbitAngle = 0
    this._endingKeyHandler = null
    this._endingClickHandler = null

    /* === 作弊碼 === */
    this._devCode = []

    /* === 共享幾何體（避免重複建立） === */
    this._sharedGeo = {
      box: new THREE.BoxGeometry(0.04, 0.03, 0.02),
      sphere: new THREE.SphereGeometry(1, 6, 6)
    }

    /* === 載入器 === */
    this._texLoader = new THREE.TextureLoader()
    this._gltfLoader = new GLTFLoader()

    /* === 事件繫結參考 === */
    this._bound = {
      mousemove: (e) => { if (this.player && document.pointerLockElement) this.player.onMouseMove(e) },
      keydown: (e) => {
        if (this.narrative.isActive()) return
        if (this.player) this.player.onKeyDown(e)
        if (e.code === 'KeyR' && this.weaponManager) {
          this.weaponManager.currentWeapon.reload()
        }
        if (!this.devMode && !e.repeat) {
          const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA']
          this._devCode.push(e.code)
          if (this._devCode.length > KONAMI.length) this._devCode.shift()
          if (this._devCode.length === KONAMI.length && this._devCode.every((c,i) => c === KONAMI[i])) {
            this.devMode = true
            this._devCode = []
            if (this.player) this.player.health = this.player.maxHealth
            if (this.weaponManager) {
              this.weaponManager.currentWeapon.currentAmmo = this.weaponManager.currentWeapon.magazineSize
              this.weaponManager.currentWeapon.reserveAmmo = Infinity
            }
            this.hud.showDevMode(true)
          }
        }
        if (e.code === 'KeyM' && this.devMode) {
          this.clearReady = false
          this.transitioning = true
          this.hud.showLevelAdvanceHint(false)
          this.advanceLevel()
        }
        if (e.code === 'KeyQ' && !this.narrative.isActive() && !this.transitioning && this.enemies.length === 0) {
          this.clearReady = false
          this.transitioning = true
          this.hud.showLevelAdvanceHint(false)
          this.advanceLevel()
        }
      },
      keyup: (e) => this.player && this.player.onKeyUp(e),
      pointerlockchange: () => this.onPointerLockChange(),
      mousedown: (e) => this.onMouseDown(e),
      mouseup: (e) => this.player && this.player.onMouseUp(e),
      preventComposition: (e) => { if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyR'].some(k => e.data?.includes(k))) e.preventDefault() }
    }

    this._preloadAssets()
  }

  static getTexture(key) { return _textureCache.get(key) }
  static getModel(key) { return _modelCache.get(key) }

  _preloadAssets() {
    const modelUrls = [
      './models/shipping_crate.glb',
      './models/robot_polygonal_mind.glb',
      './models/robot_drone.glb',
      './models/sci-fi_turret_animated_by_get3dmodels.glb',
      './models/robot_-_runaway_boy_stealth_escape_by_get3dmodels.glb',
      './models/cyberpunk_drone_concept_design_by_get3dmodels.glb',
      './models/abandoned_mecha_by_get3dmodels.glb',
      './models/babys_first_mecha_by_get3dmodels.glb'
    ]
    for (const url of modelUrls) {
      this._gltfLoader.load(url, gltf => {
        const key = url.split('/').pop().replace('.glb', '')
        _modelCache.set(key, gltf.scene.clone())
      })
    }
    const texUrls = [
      { key: 'floorColor', url: './textures/Metal009/Metal009_2K-JPG_Color.jpg' },
      { key: 'floorNormal', url: './textures/Metal009/Metal009_2K-JPG_NormalGL.jpg' },
      { key: 'floorRoughness', url: './textures/Metal009/Metal009_2K-JPG_Roughness.jpg' },
      { key: 'floorMetalness', url: './textures/Metal009/Metal009_2K-JPG_Metalness.jpg' },
      { key: 'wallColor', url: './textures/Metal022/Metal022_2K-JPG_Color.jpg' },
      { key: 'wallNormal', url: './textures/Metal022/Metal022_2K-JPG_NormalGL.jpg' },
      { key: 'wallRoughness', url: './textures/Metal022/Metal022_2K-JPG_Roughness.jpg' },
      { key: 'wallMetalness', url: './textures/Metal022/Metal022_2K-JPG_Metalness.jpg' }
    ]
    for (const { key, url } of texUrls) {
      this._texLoader.load(url, tex => _textureCache.set(key, tex))
    }
  }

  init() {
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    const spawn = this._getSpawnPosition(0)
    this.camera.position.set(spawn.x, 1.6, spawn.z)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.domElement.setAttribute('inputmode', 'none')
    document.body.prepend(this.renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xaaccee, 2.5)
    this.scene.add(ambientLight)
    const hemiLight = new THREE.HemisphereLight(0xccddff, 0x88aacc, 1.5)
    this.scene.add(hemiLight)
    const dirLight = new THREE.DirectionalLight(0xddeeff, 3.0)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 512
    dirLight.shadow.mapSize.height = 512
    this.scene.add(dirLight)
    const pointLight = new THREE.PointLight(0x00aaff, 1.2, 25)
    pointLight.position.set(0, 3, 0)
    this.scene.add(pointLight)

    this.player = new Player(this.camera, this.scene)
    this.audio = new AudioManager()
    this.weaponManager = new WeaponManager(this.scene, this.camera)
    this.weaponManager.weapons.forEach(w => {
      if (w.setPlayer) w.setPlayer(this.player)
    })
    this.weaponManager.setAudio(this.audio)
    this.hud = new HUD()

    document.addEventListener('pointerlockchange', this._bound.pointerlockchange)
    document.addEventListener('fullscreenchange', () => this.resize())
  }

  listen() {
    this.unlisten()
    this.listening = true
    document.addEventListener('mousemove', this._bound.mousemove)
    document.addEventListener('keydown', this._bound.keydown)
    document.addEventListener('keyup', this._bound.keyup)
    document.addEventListener('mousedown', this._bound.mousedown)
    document.addEventListener('mouseup', this._bound.mouseup)
    this.renderer.domElement.addEventListener('compositionstart', this._bound.preventComposition)
    this.renderer.domElement.addEventListener('compositionupdate', this._bound.preventComposition)
    this.renderer.domElement.addEventListener('compositionend', this._bound.preventComposition)
    this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())
    this.renderer.domElement.addEventListener('click', () => {
      if (!document.pointerLockElement) this.lockPointer()
    })
  }

  unlisten() {
    this.listening = false
    document.removeEventListener('mousemove', this._bound.mousemove)
    document.removeEventListener('keydown', this._bound.keydown)
    document.removeEventListener('keyup', this._bound.keyup)
    document.removeEventListener('mousedown', this._bound.mousedown)
    document.removeEventListener('mouseup', this._bound.mouseup)
    this.renderer.domElement.removeEventListener('compositionstart', this._bound.preventComposition)
    this.renderer.domElement.removeEventListener('compositionupdate', this._bound.preventComposition)
    this.renderer.domElement.removeEventListener('compositionend', this._bound.preventComposition)
  }

  setDifficulty(diff) {
    this.difficulty = diff
    document.getElementById('difficulty-select').style.display = 'none'
  }

  lockPointer() {
    if (this.player) this.player._pointerLockFrame = 0
    this.renderer.domElement.requestPointerLock()
  }

  start() {
    if (this.running) return
    window.__game = this
    this.running = true
    this.startTime = performance.now()
    document.getElementById('blocker').style.display = 'none'
    document.getElementById('hud').style.display = 'block'
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    this.lockPointer()
    this.listen()
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.enemies = []
    this.transitioning = true
    this.clearReady = false
    this.datalogPickups = []
    this._devCode = []
    this._trainingSpawned = false
    this.player.reset()
    this.weaponManager.reset()
    this.weaponManager.onShoot = (hit) => {
      this.shotsFired++
      if (hit) { this.shotsHit++; this.hud.showHit() }
    }
    const rifle = this.weaponManager.weapons.find(w => w.name === '連發步槍')
    if (rifle) {
      rifle._reportShot = () => this.shotsFired++
    }

    if (this.difficulty === 'easy') {
      this._startTrainingMode()
    } else {
      this.narrative.show(NARRATIVE_INTRO, () => {
        this._buildCurrentLevel()
        this.transitioning = false
        this.lockPointer()
        this._showControlsHint()
      })
    }
    this.animate()
  }

  animate() {
    if (!this.running) return
    requestAnimationFrame(() => this.animate())

    const rawDelta = this.clock.getDelta()
    if (this.paused) {
      this.renderer.render(this.scene, this.camera)
      return
    }
    const delta = Math.min(rawDelta, 0.05)
    if (this.trainingMode && this.player) {
      this.player.health = this.player.maxHealth
    }
    if (this.devMode && this.player) {
      const damageTaken = Math.max(0, this.player.maxHealth - this.player.health)
      this._realHealth = Math.max(0, (this._realHealth ?? this.player.maxHealth) - damageTaken)
      if (damageTaken > 0) this._realRegenHealed = 0
      if (this._realHealth < this.player.maxHealth && this.player.lastDamageTime) {
        const timeSinceDamage = (performance.now() - this.player.lastDamageTime) / 1000
        if (timeSinceDamage > 3 && this._realRegenHealed < this.player.segmentSize) {
          const healAmt = delta * 6
          this._realHealth = Math.min(this.player.maxHealth, this._realHealth + healAmt)
          this._realRegenHealed += healAmt
        }
      }
      this.player.health = this.player.maxHealth
      if (this.weaponManager) {
        this.weaponManager.currentWeapon.currentAmmo = this.weaponManager.currentWeapon.magazineSize
        this.weaponManager.currentWeapon.reserveAmmo = Infinity
      }
    }
    this.elapsedTime = (performance.now() - this.startTime) / 1000

    if (this.narrative.isActive() || this.transitioning) {
      this.renderer.render(this.scene, this.camera)
      return
    }

    this.player.update(delta, this.level)
    if (this.player.health <= 0 && !this.trainingMode) {
      if (this.audio) this.audio.playDeath()
      this.showResults()
      return
    }
    this.weaponManager.update(delta)

    const bossLevel = this.currentLevel === 2 || this.currentLevel === 4
    if (bossLevel) {
      const boss = this.enemies.find(e => (e.type === 'shieldGuardian' || e.type === 'signalCore'))
      if (boss && boss.dead && !boss._killOthersDone) {
        boss._killOthersDone = true
        for (const other of this.enemies) {
          if (other !== boss && !other.dead) {
            other.hp = 0
            other.die()
          }
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      enemy.update(delta, this.player, this.level)
      if (enemy.dead) {
        if (!enemy._debrisSpawned) {
          this._createDeathDebris(enemy.mesh.position.clone())
          enemy._debrisSpawned = true
          enemy.deathTimer = 0.5
        }
        if (!enemy.deathDone) continue
        this.scene.remove(enemy.mesh)
        this.enemies.splice(i, 1)
        this.kills++
        this.hud.addKillFeed(enemy.type)
        if (this.audio) this.audio.playDeath()
      }
    }

    if (this.trainingMode && this.enemies.length === 0 && this.trainingEnemy && this.trainingEnemy !== 'targetDummy') {
      this._spawnTrainingEnemies()
    }

    const boss = this.enemies.find(e => e.type === 'shieldGuardian' || e.type === 'signalCore')
    if (boss) {
      if (boss.dead && boss.deathDone) {
        this.showBossHealthBar(false)
      } else {
        const pct = (boss.hp / boss.maxHp) * 100
        const label = boss.type === 'shieldGuardian' ? '<span class="ico ico-diamond"></span> 封鎖單位' : '<span class="ico ico-diamond"></span> 訊號核心'
        const labelEl = document.querySelector('#boss-health-container .boss-label')
        if (labelEl) labelEl.innerHTML = label
        this.updateBossHealthBar(pct)
      }
    } else {
      this.showBossHealthBar(false)
    }

    for (const enemy of this.enemies) {
      if (enemy.type === 'signalCore' && !enemy.dead) {
        enemy.updateProjectiles(delta, this.level ? this.level.collisionBoxes : null)
      }
    }

    this.checkEnemyCollisions(delta)
    this.checkAmmoPickups()
    this.checkHealthPickups()
    this.checkGrenadePickups()
    this.checkDataLogs()
    this.updateEnemyTrails()
    this.updateExplosions()
    this._updateDebris(delta)
    this._updateAmbientParticles(delta)
    if (this.level && this.level.updateFlicker) this.level.updateFlicker(delta)
    if (this.level && this.level.updatePulse) this.level.updatePulse(delta)

    if (!this.trainingMode) {
      this.waveSystem.update(delta)
    }

    if (this.weaponManager.currentWeapon && this.weaponManager.currentWeapon.setBobPhase) {
      this.weaponManager.currentWeapon.setBobPhase(this.player.weaponBob)
    }

    this.hud.update(this.player, this.weaponManager.currentWeapon, this.kills, this.elapsedTime, this.totalEnemies, this.enemies.length, this.devMode ? this._realHealth : null)

    for (let i = this.datalogPickups.length - 1; i >= 0; i--) {
      this.datalogPickups[i].update(delta, this.camera.position)
    }

    if (this.level && this.level.updatePickups) this.level.updatePickups(delta)

    if (!this.trainingMode && !this.transitioning && !this.clearReady && this.player.health > 0) {
      const bossAlive = this.enemies.find(e => (e.type === 'shieldGuardian' || e.type === 'signalCore') && !e.dead)
      if (this.currentLevel === 2 || this.currentLevel === 4) {
        if (!bossAlive) {
          this.clearReady = true
        }
      } else if (this.currentLevel < 2 || this.currentLevel === 3) {
        if (this.waveSystem.isComplete()) {
          this.clearReady = true
        }
      } else {
        this.clearReady = true
      }
    }

    if (this.clearReady && this.player.health > 0 && !this.endingSequence && !this.trainingMode) {
      if (this.currentLevel >= LEVEL_CLASSES.length - 1) {
        this.startEndingSequence()
      } else {
        this.hud.showLevelAdvanceHint(true)
      }
    }

    if (this.endingSequence) {
      this.updateEndingSequence(delta)
    }

    this.renderer.render(this.scene, this.camera)
  }

  restart() {
    this.running = false
    if (this.audio) this.audio.stopBGM()
    this.clock.stop()
    this.clock = new THREE.Clock()

    if (this._explosions) {
      for (const e of this._explosions) {
        for (const p of e.particles) { this.scene.remove(p); p.geometry.dispose(); p.material.dispose() }
      }
      this._explosions = []
    }
    if (this._enemyTrails) {
      for (const t of this._enemyTrails) { this.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose() }
      this._enemyTrails = []
    }
    if (this._datalogTimeout) { clearTimeout(this._datalogTimeout); this._datalogTimeout = null }
    this._devCode = []
    this._particleVelocities = []
    for (const d of this._debrisList) { this.scene.remove(d.mesh); d.mesh.material.dispose() }
    this._debrisList = []

    if (this._endingParticles) {
      for (const p of this._endingParticles) { this.scene.remove(p); p.geometry.dispose(); p.material.dispose() }
      this._endingParticles = []
    }
    if (this._endingKeyHandler) {
      document.removeEventListener('keydown', this._endingKeyHandler)
      this._endingKeyHandler = null
    }
    if (this._endingClickHandler) {
      document.removeEventListener('mousedown', this._endingClickHandler)
      this._endingClickHandler = null
    }
    if (this._endingOverlay) {
      this._endingOverlay.remove()
      this._endingOverlay = null
    }

    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh)
    }
    this.enemies = []
    this.waveSystem.reset()
    if (this.level) this.level.clear()

    this.camera.position.set(0, 1.6, 0)
    this.camera.rotation.set(0, 0, 0)
    this.player.reset()

    document.getElementById('results-screen').style.display = 'none'
    document.getElementById('blocker').style.display = 'flex'
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    const retry = this._retryLevel
    this.currentLevel = retry
    this._retryLevel = 0
    this.transitioning = false
    this.paused = false
    this.devMode = false
    this.endingSequence = false
    this.trainingMode = false
    this.trainingEnemy = null
    this._trainingSpawned = false
    this.trainingScore = 0
    this._realHealth = 100
    this._realRegenHealed = 0

    if (retry > 0) {
      document.getElementById('difficulty-select').style.display = 'none'
      document.getElementById('blocker').querySelector('h1').textContent = '訊號：零層'
      const subEl = document.getElementById('blocker').querySelector('.sub')
      if (subEl) subEl.textContent = 'SIGNAL ZERO'
      document.getElementById('blocker').querySelector('.flash').textContent = '點擊繼續'
    } else {
      document.getElementById('difficulty-select').style.display = 'flex'
      document.getElementById('blocker').querySelector('h1').textContent = '訊號：零層'
      const subEl = document.getElementById('blocker').querySelector('.sub')
      if (subEl) subEl.textContent = 'SIGNAL ZERO'
      document.getElementById('blocker').querySelector('.flash').textContent = '點擊開始'
    }
  }

  restartContinue() {
    document.getElementById('blocker').style.display = 'none'
    if (this.audio) this.audio.resumeContext()
    this.start()
  }

  resize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }
  }
}

addCombatMethods(Game)
addLevelMethods(Game, LEVEL_CLASSES, _textureCache, _modelCache)
addEndingMethods(Game, LEVEL_CLASSES)
addTrainingMethods(Game)
