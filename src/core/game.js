import * as THREE from 'three'
import { Player } from './player.js'
import { WeaponManager } from './weapon.js'
import { HUD } from '../ui/hud.js'
import { AudioManager } from './audio.js'
import { NarrativeScreen } from '../ui/narrative.js'
import { createDataLogPickup, getAllDatalogIds, getFullDatalogText, getDatalogName } from './datalog.js'
import { WaveSystem } from './waveSystem.js'
import { ShieldGuardian } from '../enemies/shieldGuardian.js'
import { SignalCore } from '../enemies/signalCore.js'
import { PatrolBot } from '../enemies/patrolBot.js'
import { Rusher } from '../enemies/rusher.js'
import { Sniper } from '../enemies/sniper.js'
import { Level1 } from '../levels/level1.js'
import { Level2 } from '../levels/level2.js'
import { Level3 } from '../levels/level3.js'
import { Level4 } from '../levels/level4.js'
import { Level5 } from '../levels/level5.js'
import { TrainingRange } from '../levels/trainingRange.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { LEVEL_NAMES, NARRATIVE_INTRO, NARRATIVE_LEVELS, NARRATIVE_BOSS_INTRO, NARRATIVE_ENDING } from './narrativeData.js'

const LEVEL_CLASSES = [Level1, Level2, Level4, Level3, Level5]

const _textureCache = new Map()
const _modelCache = new Map()

export class Game {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.player = null
    this.weaponManager = null
    this.hud = null
    this.level = null
    this.difficulty = 'normal'
    this.clock = new THREE.Clock()
    this.enemies = []
    this.kills = 0
    this.shotsFired = 0
    this.shotsHit = 0
    this.startTime = 0
    this.elapsedTime = 0
    this.narrative = new NarrativeScreen()
    this.waveSystem = new WaveSystem(this)
    this.datalogPickups = []
    this.running = false
    this.listening = false
    this.currentLevel = 0
    this.transitioning = false
    this.clearReady = false
    this.difficultyModifiers = {
      easy: { enemyHp: 0.7, damageMultiplier: 0.5 },
      normal: { enemyHp: 1.0, damageMultiplier: 1.0 },
      hard: { enemyHp: 1.3, damageMultiplier: 1.3 }
    }
    this.paused = false
    this.devMode = false
    this.trainingMode = false
    this.trainingEnemy = null
    this._trainingSpawned = false
    this._retryLevel = 0
    this._devCode = []
    this.endingSequence = false
    this.endingTimer = 0
    this._rusherBeepTimers = {}
    this._ambientParticles = null
    this._particleVelocities = []
    this._debrisList = []
    this._sharedGeo = {
      box: new THREE.BoxGeometry(0.04, 0.03, 0.02),
      sphere: new THREE.SphereGeometry(1, 6, 6)
    }
    this._endingOverlay = null
    this._realHealth = 100
    this._realRegenHealed = 0
    this._endingCameraPos = null
    this._endingTarget = null
    this._texLoader = new THREE.TextureLoader()
    this._gltfLoader = new GLTFLoader()
    this._preloadAssets()

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
          console.log(`[DEBUG] M key skip: currentLevel=${this.currentLevel}, transitioning=${this.transitioning}, enemies=${this.enemies.length}`)
          this.clearReady = false
          this.transitioning = true
          this.hud.showLevelAdvanceHint(false)
          this.advanceLevel()
        }
        if (e.code === 'KeyQ' && !this.narrative.isActive() && !this.transitioning && this.enemies.length === 0) {
          console.log(`[DEBUG] Q key skip: currentLevel=${this.currentLevel}, transitioning=${this.transitioning}, enemies=${this.enemies.length}`)
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
  }

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

  static getTexture(key) { return _textureCache.get(key) }
  static getModel(key) { return _modelCache.get(key) }

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

  _startTrainingMode() {
    this.trainingMode = true
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

  _showEnemyProfile() {
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

  _hideEnemyProfile() {
    const el = document.getElementById('enemy-profile')
    if (el) el.style.display = 'none'
  }

  _spawnTrainingEnemies() {
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

  _buildCurrentLevel() {
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
      console.log(`[DEBUG] Building level idx=${this.currentLevel}, class=${LevelClass.name}`)
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

  _setupWaves() {
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

  _estimateWaveTotal() {
    let total = 0
    for (const wave of this.waveSystem.waves) {
      for (const e of (wave.enemies || [])) {
        total += e.count || 1
      }
    }
    return total
  }

  _spawnShieldGuardian() {
    const boss = new ShieldGuardian(new THREE.Vector3(4, 0, 0))
    boss._game = this
    this.scene.add(boss.mesh)
    this.enemies.push(boss)
    this.totalEnemies = this.enemies.length
    this.showBossHealthBar(true)
  }

  _spawnBossWithDescent() {
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

  _spawnFinalBossEnemies() {
    const core = new SignalCore(new THREE.Vector3(0, 0, 0))
    core._game = this
    this.scene.add(core.mesh)
    this.enemies.push(core)
    this.totalEnemies = this.enemies.length
    this.showBossHealthBar(true)
  }

  _spawnDatalogPickups() {
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
      } else if (this.currentLevel < 2 || this.currentLevel === 3) {
        this.hud.showLevelAdvanceHint(this.currentLevel + 1 < LEVEL_CLASSES.length)
      } else {
        this.hud.showLevelAdvanceHint(this.currentLevel + 1 < LEVEL_CLASSES.length)
      }
    }

    if (this.endingSequence) {
      this.updateEndingSequence(delta)
    }

    this.renderer.render(this.scene, this.camera)
  }

  checkAmmoPickups() {
    if (!this.level || !this.level.ammoPickups) return
    const weapon = this.weaponManager.currentWeapon
    if (!weapon) return
    const pos = this.camera.position
    for (let i = this.level.ammoPickups.length - 1; i >= 0; i--) {
      const pickup = this.level.ammoPickups[i]
      const dist = pos.distanceTo(pickup.position)
      if (dist < 1.5) {
        weapon.reserveAmmo += weapon.magazineSize
        this.scene.remove(pickup)
        if (pickup.traverse) {
          pickup.traverse(child => {
            if (child.isMesh) {
              child.geometry.dispose()
              child.material.dispose()
            }
          })
        }
        this.level.ammoPickups.splice(i, 1)
      }
    }
  }

  checkHealthPickups() {
    if (!this.level || !this.level.healthPickups) return
    const pos = this.camera.position
    for (let i = this.level.healthPickups.length - 1; i >= 0; i--) {
      const pickup = this.level.healthPickups[i]
      const dist = pos.distanceTo(pickup.position)
      if (dist < 1.5) {
        this.player.heal(30)
        if (this.devMode) {
          this._realHealth = Math.min(this.player.maxHealth, this._realHealth + 30)
          this._realRegenHealed = 0
        }
        this.scene.remove(pickup)
        if (pickup.traverse) {
          pickup.traverse(child => {
            if (child.isMesh) {
              child.geometry.dispose()
              child.material.dispose()
            }
          })
        }
        this.level.healthPickups.splice(i, 1)
      }
    }
  }

  checkGrenadePickups() {
    if (!this.level || !this.level.grenadePickups) return
    const grenade = this.weaponManager.weapons.find(w => w.name === '脈衝炸彈')
    if (!grenade) return
    const pos = this.camera.position
    for (let i = this.level.grenadePickups.length - 1; i >= 0; i--) {
      const pickup = this.level.grenadePickups[i]
      const dist = pos.distanceTo(pickup.position)
      if (dist < 1.5) {
        grenade.reserveAmmo += 2
        this.scene.remove(pickup)
        if (pickup.traverse) {
          pickup.traverse(child => {
            if (child.isMesh) {
              child.geometry.dispose()
              child.material.dispose()
            }
          })
        }
        this.level.grenadePickups.splice(i, 1)
      }
    }
  }

  checkDataLogs() {
    const pos = this.camera.position
    for (let i = this.datalogPickups.length - 1; i >= 0; i--) {
      const d = this.datalogPickups[i]
      if (d.isCollected()) {
        this.datalogPickups.splice(i, 1)
        continue
      }
      const dist = pos.distanceTo(d.mesh.position)
      if (dist < 1.5) {
        d.collect()
        this.datalogPickups.splice(i, 1)
      }
    }
  }

  showBossHealthBar(show) {
    const container = document.getElementById('boss-health-container')
    if (container) container.style.display = show ? 'flex' : 'none'
  }

  updateBossHealthBar(pct) {
    const fill = document.getElementById('boss-health-fill')
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%'
  }

  showDatalogPopup(id, name, text) {
    const popup = document.getElementById('datalog-popup')
    if (!popup) return
    const titleEl = popup.querySelector('.dl-title')
    if (titleEl) titleEl.textContent = `${name}：${text}`
    popup.style.opacity = '1'
    if (this._datalogTimeout) clearTimeout(this._datalogTimeout)
    this._datalogTimeout = setTimeout(() => {
      popup.style.opacity = '0'
    }, 5000)
  }

  _playRusherBeep() {
    if (!this.audio || !this.audio.ctx) return
    const t = this.audio.ctx.currentTime
    const osc = this.audio.ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, t)
    const g = this.audio.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.15, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    const hp = this.audio.ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.setValueAtTime(600, t)
    osc.connect(hp)
    hp.connect(g)
    g.connect(this.audio.masterGain)
    osc.start(t)
    osc.stop(t + 0.12)
  }

  _createAmbientParticles() {
    if (this._ambientParticles) {
      this.scene.remove(this._ambientParticles)
      this._ambientParticles.geometry.dispose()
      this._ambientParticles.material.dispose()
    }
    this._particleVelocities = []
    const count = 200
    const positions = new Float32Array(count * 3)
    const hs = this.level ? this.level.halfSize || 24 : 24
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * hs * 1.6
      positions[i * 3 + 1] = Math.random() * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * hs * 1.6
      this._particleVelocities.push({
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.15,
        z: (Math.random() - 0.5) * 0.5
      })
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0x88aacc, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false,
      size: 0.08
    })
    this._ambientParticles = new THREE.Points(geo, mat)
    this.scene.add(this._ambientParticles)
  }

  _updateAmbientParticles(delta) {
    if (!this._ambientParticles) return
    const pos = this._ambientParticles.geometry.attributes.position.array
    const hs = this.level ? this.level.halfSize || 24 : 24
    const limit = hs * 1.6
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3] += this._particleVelocities[i].x * delta
      pos[i * 3 + 1] += this._particleVelocities[i].y * delta
      pos[i * 3 + 2] += this._particleVelocities[i].z * delta
      if (pos[i * 3] > limit) pos[i * 3] = -limit
      if (pos[i * 3] < -limit) pos[i * 3] = limit
      if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = 0
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 8
      if (pos[i * 3 + 2] > limit) pos[i * 3 + 2] = -limit
      if (pos[i * 3 + 2] < -limit) pos[i * 3 + 2] = limit
    }
    this._ambientParticles.geometry.attributes.position.needsUpdate = true
  }

  _showControlsHint() {
    const el = document.getElementById('controls-hint')
    if (!el) return
    el.classList.add('visible')
    setTimeout(() => el.classList.remove('visible'), 8000)
  }

  _getSpawnPosition(levelIdx) {
    const positions = [
      { x: 0, z: 0 },       // Level1 (idx 0) - waves
      { x: 0, z: 0 },       // Level2 (idx 1) - waves
      { x: 0, z: -16 },     // Level4 (idx 2) - Shield Guardian boss, face toward boss at (4,0,0)
      { x: 0, z: 0 },       // Level3 (idx 3) - waves
      { x: 0, z: -16 },     // Level5 (idx 4) - Signal Core boss, face toward boss at (0,0,0)
    ]
    return positions[levelIdx] || { x: 0, z: 0 }
  }

  _getSpawnYaw(levelIdx) {
    switch (levelIdx) {
      case 2:
        return Math.atan2(-(4 - 0), -(0 - (-16)))
      case 4:
        return Math.atan2(-(0 - 0), -(0 - (-16)))
      default:
        return 0
    }
  }

  checkEnemyCollisions(delta) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue
      const dx = this.camera.position.x - enemy.mesh.position.x
      const dz = this.camera.position.z - enemy.mesh.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (enemy.type === 'rusher' && dist < 12) {
        const key = enemy.mesh.id || enemy.mesh.uuid
        const now = performance.now()
        const interval = Math.max(0.15, dist / 8)
        if (!this._rusherBeepTimers[key] || now - this._rusherBeepTimers[key] > interval * 1000) {
          this._rusherBeepTimers[key] = now
          this._playRusherBeep()
        }
      }
      if (enemy.type === 'rusher' && dist < 1.8) {
        this.player.takeDamage(enemy.damage * 3 * this.difficultyModifiers[this.difficulty].damageMultiplier)
        this.hud.showDamage()
        if (this.audio) this.audio.playExplosion()
        this.createExplosionEffect(enemy.mesh.position.clone())
        if (this.player.shake) this.player.shake(0.12, 200)
        enemy.die()
      }
      const maxRange = enemy.type === 'sniper' ? 35 : 20
      if (enemy.canShoot && enemy.shootTimer <= 0 && dist < maxRange) {
        const hasLOS = !enemy.hasLineOfSight || enemy.hasLineOfSight(this.player, this.level)
        if (!hasLOS) {
          enemy.shootTimer = enemy.shootCooldown * 0.3
          continue
        }
        const dir = new THREE.Vector3().subVectors(this.camera.position, enemy.mesh.position).normalize()
        const dot = this.camera.getWorldDirection(new THREE.Vector3()).dot(dir.clone().negate())
        const hit = dot > 0.7
        if (hit) {
          this.player.takeDamage(enemy.damage * this.difficultyModifiers[this.difficulty].damageMultiplier)
          this.hud.showDamage()
        }
        this.createEnemyBulletTrail(enemy, hit)
        enemy.shootTimer = enemy.shootCooldown
      }
    }
  }

  createEnemyBulletTrail(enemy, hit) {
    const start = enemy.mesh.position.clone()
    start.y += 1.2
    const target = this.camera.position.clone()
    const end = hit ? target : start.clone().add(new THREE.Vector3().subVectors(target, start).normalize().multiplyScalar(10))
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(end, start)
    const length = dir.length()
    if (length < 0.01) return
    dir.normalize()

    const radius = 0.03
    const geo = new THREE.CylinderGeometry(radius, radius, length, 6, 1)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(mid)
    const up = new THREE.Vector3(0, 1, 0)
    if (Math.abs(dir.dot(up)) > 0.999) {
      mesh.quaternion.setFromUnitVectors(up, new THREE.Vector3(0, 0, -1))
    } else {
      mesh.quaternion.setFromUnitVectors(up, dir)
    }
    this.scene.add(mesh)
    if (!this._enemyTrails) this._enemyTrails = []
    this._enemyTrails.push({ mesh, startTime: performance.now(), duration: 150 })
  }

  createExplosionEffect(position) {
    const count = 8
    const particles = []
    for (let i = 0; i < count; i++) {
      const size = 0.05 + Math.random() * 0.1
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff6600 : 0xffcc00,
        transparent: true, opacity: 1
      })
      const p = new THREE.Mesh(this._sharedGeo.sphere, mat)
      p.scale.setScalar(size)
      p.position.copy(position)
      p.position.y += 0.5 + Math.random() * 0.3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      p.userData.vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * (2 + Math.random() * 3),
        Math.abs(Math.cos(phi)) * (3 + Math.random() * 3),
        Math.sin(phi) * Math.sin(theta) * (2 + Math.random() * 3)
      )
      this.scene.add(p)
      particles.push(p)
    }
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8800, transparent: true, opacity: 1
      })
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), mat)
      p.position.copy(position)
      p.position.y += 0.3 + Math.random() * 0.5
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 4
      )
      p.userData.rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      )
      this.scene.add(p)
      particles.push(p)
    }
    if (!this._explosions) this._explosions = []
    this._explosions.push({ particles, startTime: performance.now(), duration: 500 })
  }

  _createDeathDebris(position) {
    const colors = [0x4a6a8a, 0x2a3a4a, 0x5a7a9a, 0x3a4a5a, 0x1a2a3a]
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true, opacity: 1
      })
      const p = new THREE.Mesh(this._sharedGeo.box, mat)
      p.position.copy(position)
      p.position.x += (Math.random() - 0.5) * 0.3
      p.position.y += 0.2 + Math.random() * 0.4
      p.position.z += (Math.random() - 0.5) * 0.3
      const speed = 2 + Math.random() * 4
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed + 1,
        (Math.random() - 0.5) * speed
      )
      p.userData.rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      )
      this.scene.add(p)
      this._debrisList.push({ mesh: p, timer: 2.0 })
    }
  }

  _updateDebris(delta) {
    for (let i = this._debrisList.length - 1; i >= 0; i--) {
      const d = this._debrisList[i]
      d.timer -= delta
      if (d.timer <= 0) {
        this.scene.remove(d.mesh)
        d.mesh.material.dispose()
        this._debrisList.splice(i, 1)
      } else {
        d.mesh.position.add(d.mesh.userData.vel.clone().multiplyScalar(delta))
        d.mesh.userData.vel.y -= 9.8 * delta
        d.mesh.rotation.x += d.mesh.userData.rotSpeed.x * delta
        d.mesh.rotation.y += d.mesh.userData.rotSpeed.y * delta
        d.mesh.rotation.z += d.mesh.userData.rotSpeed.z * delta
        d.mesh.material.opacity = Math.min(1, d.timer * 2)
        if (d.mesh.position.y < -0.5) {
          d.mesh.userData.vel.x *= 0.8
          d.mesh.userData.vel.z *= 0.8
          d.mesh.position.y = -0.5
        }
      }
    }
  }

  updateExplosions() {
    if (!this._explosions) return
    const now = performance.now()
    for (let i = this._explosions.length - 1; i >= 0; i--) {
      const e = this._explosions[i]
      const elapsed = now - e.startTime
      const t = elapsed / e.duration
      if (t >= 1) {
        for (const p of e.particles) { p.geometry = undefined; this.scene.remove(p); p.material.dispose() }
        this._explosions.splice(i, 1)
      } else {
        for (const p of e.particles) {
          p.position.add(p.userData.vel.clone().multiplyScalar(0.016))
          p.userData.vel.y -= 9.8 * 0.016
          p.material.opacity = 1 - t
          p.scale.setScalar(1 + t * 2)
        }
      }
    }
  }

  updateEnemyTrails() {
    if (!this._enemyTrails) return
    const now = performance.now()
    for (let i = this._enemyTrails.length - 1; i >= 0; i--) {
      const t = this._enemyTrails[i]
      const elapsed = now - t.startTime
      const alpha = 1 - elapsed / t.duration
      if (alpha <= 0) {
        this.scene.remove(t.mesh)
        t.mesh.geometry.dispose()
        t.mesh.material.dispose()
        this._enemyTrails.splice(i, 1)
      } else {
        t.mesh.material.opacity = alpha * 0.8
      }
    }
  }

  onMouseDown(e) {
    if (this.player) this.player.onMouseDown(e)
    if (this.narrative.isActive() || this.transitioning) return
    if (e.target && e.target.closest && e.target.closest('button')) return
    if (e.button === 0 && document.pointerLockElement === this.renderer.domElement) {
      this.weaponManager.shoot(this.enemies, this.camera, this.level)
    }
  }

  onPointerLockChange() {
    if (!this.running) return
    if (this.narrative.isActive() || this.endingSequence) return
    if (document.pointerLockElement === this.renderer.domElement) {
      document.getElementById('blocker').style.display = 'none'
      this.paused = false
    } else {
      document.getElementById('blocker').style.display = 'flex'
      document.getElementById('blocker').querySelector('h1').textContent = '暫停'
      const subEl = document.getElementById('blocker').querySelector('.sub')
      if (subEl) subEl.textContent = ''
      const divEl = document.getElementById('blocker').querySelector('.divider')
      if (divEl) divEl.style.display = 'none'
      document.getElementById('blocker').querySelector('.flash').textContent = '按任意鍵繼續'
      const sysEl = document.getElementById('blocker').querySelector('.sys-info')
      if (sysEl) sysEl.textContent = ''
      document.getElementById('training-exit-btn').style.display = this.trainingMode ? 'block' : 'none'
      this.paused = true
    }
  }

  resumeFromPause() {
    if (!this.running) return
    document.getElementById('training-exit-btn').style.display = 'none'
    document.getElementById('blocker').style.display = 'none'
    this.paused = false
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    this.lockPointer()
  }

  exitTraining() {
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
    this._hideEnemyProfile()
    document.getElementById('difficulty-select').style.display = 'flex'
    if (document.pointerLockElement) document.exitPointerLock()
  }

  advanceLevel() {
    const prevLevel = this.currentLevel
    if (prevLevel === 2) {
      this.player.maxHealth = 150
      this.player.health = 150
      this.player.segmentSize = this.player.maxHealth / this.player.segmentCount
    }
    this.currentLevel++
    console.log(`[DEBUG] advanceLevel: prev=${prevLevel}, new=${this.currentLevel}, total=${LEVEL_CLASSES.length}`)
    if (this.currentLevel >= LEVEL_CLASSES.length) {
      console.log(`[DEBUG] advanceLevel: reached end, showResults()`)
      this.showResults()
      return
    }
    this.transitioning = true

    console.log(`[DEBUG] advanceLevel: cleaning up previous level (idx=${prevLevel})`)
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

  startEndingSequence() {
    this.endingSequence = true
    this.endingTimer = 0
    this.transitioning = true
    this.clearReady = false
    for (const e of this.enemies) {
      if (e.clearProjectiles) e.clearProjectiles()
    }
    if (this.audio) this.audio.stopBGM()
    this._endingCameraPos = this.camera.position.clone()
    this._endingOrbitAngle = 0
    this._endingParticles = []
    document.getElementById('hud').style.display = 'none'

    for (let i = 0; i < 60; i++) {
      const geo = new THREE.SphereGeometry(0.02, 4, 4)
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f2ff, transparent: true, opacity: 0.3 + Math.random() * 0.4
      })
      const p = new THREE.Mesh(geo, mat)
      const a = Math.random() * Math.PI * 2
      const r = 1 + Math.random() * 8
      p.position.set(
        Math.cos(a) * r,
        Math.random() * 4,
        Math.sin(a) * r
      )
      p.userData = { angle: a, radius: r, speed: 0.1 + Math.random() * 0.2, height: p.position.y }
      this.scene.add(p)
      this._endingParticles.push(p)
    }

    this.narrative.show(NARRATIVE_ENDING, () => {
      this._showFinalEndingOverlay()
    })
  }

  _showFinalEndingOverlay() {
    if (this._endingOverlay) return

    const overlay = document.createElement('div')
    overlay.id = 'ending-overlay'
    overlay.innerHTML = `
      <div class="ending-line ending-title">信號中斷</div>
      <div class="ending-line ending-sub">零層已淨化</div>
      <div class="ending-line ending-detail">最後的訊號脈衝已消散於深空</div>
      <div class="ending-line ending-report">
        <div style="margin-bottom:10px;color:rgba(0,242,255,0.5);font-size:0.75rem;letter-spacing:0.2em;">作戰報告</div>
        <div class="ending-stat">擊殺數：<span id="end-kills">0</span></div>
        <div class="ending-stat">任務時長：<span id="end-time">0:00</span></div>
        <div class="ending-stat">存活狀態：<span id="end-status">存活</span></div>
      </div>
      <div class="ending-line ending-credits">
        <div style="margin-bottom:6px;color:rgba(0,242,255,0.3);font-size:0.8rem;letter-spacing:0.3em;">— 訊號：零層 —</div>
        <div class="ending-credit-line">Made with Three.js</div>
        <div class="ending-credit-line">Web Audio API</div>
        <div class="ending-credit-line">原型開發 2026</div>
      </div>
      <div class="ending-line ending-final"><span style="display:inline-block;width:8px;height:8px;border:1.5px solid rgba(0,242,255,0.3);margin-right:6px;vertical-align:middle"></span> 任務存檔已記錄</div>
      <div class="ending-line ending-buttons" style="opacity:0;transition:opacity 1s ease;">
        <button id="ending-datalog-btn" style="margin:20px 10px 0 0;padding:12px 30px;background:transparent;border:1px solid rgba(0,242,255,0.3);color:rgba(0,242,255,0.7);font-family:'Courier New',monospace;font-size:0.85rem;letter-spacing:0.15em;cursor:pointer;transition:all 0.3s;pointer-events:auto;">檢索日誌</button>
        <button id="ending-menu-btn" style="margin:20px 0 0 10px;padding:12px 30px;background:transparent;border:1px solid rgba(0,242,255,0.3);color:rgba(0,242,255,0.7);font-family:'Courier New',monospace;font-size:0.85rem;letter-spacing:0.15em;cursor:pointer;transition:all 0.3s;pointer-events:auto;">返回主選單</button>
      </div>
    `
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '300',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0)',
      pointerEvents: 'none',
      fontFamily: "'Courier New', monospace"
    })
    document.body.appendChild(overlay)

    for (const el of overlay.querySelectorAll('.ending-line')) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 1.5s ease'
    }

    const reportEl = overlay.querySelector('.ending-report')
    if (reportEl) {
      reportEl.style.textAlign = 'left'
      reportEl.style.fontSize = '13px'
      reportEl.style.color = '#88bbdd'
      reportEl.style.lineHeight = '1.8'
      reportEl.style.border = '1px solid rgba(0,242,255,0.1)'
      reportEl.style.padding = '14px 22px'
      reportEl.style.background = 'rgba(0,10,20,0.4)'
      reportEl.style.minWidth = '200px'
    }

    const creditsEl = overlay.querySelector('.ending-credits')
    if (creditsEl) {
      creditsEl.style.textAlign = 'center'
      creditsEl.style.fontSize = '11px'
      creditsEl.style.color = '#557799'
      creditsEl.style.lineHeight = '1.6'
    }

    const finalEl = overlay.querySelector('.ending-final')
    if (finalEl) {
      finalEl.style.fontSize = '10px'
      finalEl.style.color = '#335566'
    }

    document.getElementById('end-kills').textContent = this.kills
    const minutes = Math.floor(this.elapsedTime / 60)
    const seconds = Math.floor(this.elapsedTime % 60)
    document.getElementById('end-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    document.getElementById('end-status').textContent = this.player.health > 0 ? '存活' : '墜落'

    this._endingOverlay = overlay

    if (this.audio) {
      try { this.audio.playEndingBGM() } catch {}
    }

    const dlgBtn = overlay.querySelector('#ending-datalog-btn')
    if (dlgBtn) {
      dlgBtn.onclick = () => { this._showDatalogGallery() }
      dlgBtn.addEventListener('mouseenter', () => { dlgBtn.style.borderColor = '#00f2ff'; dlgBtn.style.color = '#00f2ff' })
      dlgBtn.addEventListener('mouseleave', () => { dlgBtn.style.borderColor = 'rgba(0,242,255,0.3)'; dlgBtn.style.color = 'rgba(0,242,255,0.7)' })
    }
    const menuBtn = overlay.querySelector('#ending-menu-btn')
    if (menuBtn) {
      menuBtn.onclick = () => { this._endingOverlay?.remove(); this._endingOverlay = null; this.restart() }
      menuBtn.addEventListener('mouseenter', () => { menuBtn.style.borderColor = '#00f2ff'; menuBtn.style.color = '#00f2ff' })
      menuBtn.addEventListener('mouseleave', () => { menuBtn.style.borderColor = 'rgba(0,242,255,0.3)'; menuBtn.style.color = 'rgba(0,242,255,0.7)' })
    }

    this.enableEndingSequenceControls()
  }

  enableEndingSequenceControls() {
    this._endingKeyHandler = (e) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        this.skipEndingSequence()
      }
    }
    document.addEventListener('keydown', this._endingKeyHandler)
    this._endingClickHandler = () => { this.skipEndingSequence() }
    document.addEventListener('mousedown', this._endingClickHandler)
  }

  updateEndingSequence(delta) {
    this.endingTimer += delta
    const t = this.endingTimer

    this._endingOrbitAngle += delta * 0.5
    const orbitR = 3 + Math.sin(t * 0.3) * 1.5
    this.camera.position.x = this._endingCameraPos.x + Math.cos(this._endingOrbitAngle) * orbitR
    this.camera.position.z = this._endingCameraPos.z + Math.sin(this._endingOrbitAngle) * orbitR
    this.camera.position.y = 1.6 + Math.sin(t * 0.4) * 0.3
    this.camera.lookAt(this._endingCameraPos.x, 1.0, this._endingCameraPos.z)

    for (const p of this._endingParticles) {
      p.userData.angle += delta * p.userData.speed
      p.position.x = Math.cos(p.userData.angle) * p.userData.radius
      p.position.z = Math.sin(p.userData.angle) * p.userData.radius
      p.position.y = p.userData.height + Math.sin(t * 0.5 + p.userData.angle) * 0.3
      p.material.opacity = 0.2 + Math.sin(t * 0.8 + p.userData.angle * 2) * 0.2
    }

    if (this._endingOverlay) {
      const fadeProgress = Math.min(t / 3, 1)
      this._endingOverlay.style.background = `rgba(0,0,0,${fadeProgress * 0.88})`

      const titleEl = this._endingOverlay.querySelector('.ending-title')
      const subEl = this._endingOverlay.querySelector('.ending-sub')
      const detailEl = this._endingOverlay.querySelector('.ending-detail')
      const reportEl = this._endingOverlay.querySelector('.ending-report')
      const creditsEl = this._endingOverlay.querySelector('.ending-credits')
      const finalEl = this._endingOverlay.querySelector('.ending-final')
      const buttonsEl = this._endingOverlay.querySelector('.ending-buttons')

      if (t > 2 && titleEl && titleEl.style.opacity === '0') {
        titleEl.style.opacity = '1'
        titleEl.style.transition = 'opacity 2s ease'
      }
      if (t > 4.5 && subEl) {
        subEl.style.opacity = '1'
        subEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 6.5 && detailEl) {
        detailEl.style.opacity = '1'
        detailEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 8.5 && reportEl) {
        reportEl.style.opacity = '1'
        reportEl.style.transition = 'opacity 1.2s ease'
      }
      if (t > 11 && creditsEl) {
        creditsEl.style.opacity = '1'
        creditsEl.style.transition = 'opacity 1.5s ease'
      }
      if (t > 13 && finalEl) {
        finalEl.style.opacity = '1'
        finalEl.style.transition = 'opacity 1s ease'
        finalEl.style.color = '#00f2ff'
        finalEl.style.textShadow = '0 0 8px rgba(0,242,255,0.3)'
      }
      if (t > 15 && buttonsEl) {
        buttonsEl.style.opacity = '1'
      }
    }

    if (this.endingTimer > 20) {
      this.skipEndingSequence()
    }
  }

  skipEndingSequence() {
    if (this._endingOverlay) {
      this._endingOverlay.remove()
      this._endingOverlay = null
    }
    for (const p of this._endingParticles) {
      this.scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    }
    this._endingParticles = []
    if (this._endingKeyHandler) {
      document.removeEventListener('keydown', this._endingKeyHandler)
      this._endingKeyHandler = null
    }
    if (this._endingClickHandler) {
      document.removeEventListener('mousedown', this._endingClickHandler)
      this._endingClickHandler = null
    }
    if (this.narrative.isActive()) {
      this.narrative.hide()
    }
    this.endingSequence = false
    this.currentLevel = LEVEL_CLASSES.length
    this.showResults()
  }

  showResults() {
    this.running = false
    this.unlisten()
    if (this.audio) this.audio.stopBGM()
    const dead = this.player.health <= 0
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0
    const minutes = Math.floor(this.elapsedTime / 60)
    const seconds = Math.floor(this.elapsedTime % 60)
    const score = dead ? 0 : this.kills * 100 + accuracy * 5 - this.elapsedTime * 2
    let grade = dead ? 'F' : 'C'
    if (!dead) {
      if (score > 800) grade = 'S'
      else if (score > 600) grade = 'A'
      else if (score > 400) grade = 'B'
    }

    const won = !dead && this.currentLevel >= LEVEL_CLASSES.length && this.currentLevel > 0
    this._retryLevel = dead ? this.currentLevel : 0
    document.getElementById('result-title').innerHTML = won ? '<span style="display:inline-block;width:14px;height:14px;border:2px solid #00f2ff;margin-right:8px;vertical-align:middle;position:relative;top:-2px"></span> 訊號中斷' : dead ? '任務失敗' : '任務完成'
    document.getElementById('result-subtitle').textContent = won ? '零層已淨化。訊號源頭已被摧毀。倖存者正在撤離。' : ''
    document.getElementById('result-subtitle').style.display = won ? 'block' : 'none'
    document.getElementById('stat-kills').textContent = this.kills
    document.getElementById('stat-accuracy').textContent = accuracy + '%'
    document.getElementById('stat-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    const gradeEl = document.getElementById('grade')
    gradeEl.textContent = grade
    gradeEl.className = 'grade grade-' + grade.toLowerCase()
    document.getElementById('results-screen').style.display = 'flex'
    if (document.pointerLockElement) document.exitPointerLock()

    const dlgBtn = document.getElementById('datalog-gallery-btn')
    if (dlgBtn) {
      dlgBtn.style.display = won ? 'inline-block' : 'none'
      dlgBtn.onclick = () => this._showDatalogGallery()
    }
    const dgalClose = document.getElementById('dgal-close')
    if (dgalClose) {
      dgalClose.onclick = () => {
        document.getElementById('datalog-gallery').style.display = 'none'
      }
    }
  }

  _showDatalogGallery() {
    const container = document.getElementById('dgal-entries')
    if (!container) return
    container.innerHTML = ''
    for (const id of getAllDatalogIds()) {
      const name = getDatalogName(id)
      const text = getFullDatalogText(id)
      const div = document.createElement('div')
      Object.assign(div.style, {
        marginBottom: '24px', padding: '16px', borderLeft: '2px solid rgba(0,242,255,0.2)',
        background: 'rgba(0,10,20,0.3)'
      })
      div.innerHTML = `<div style="color:#00f2ff;font-size:0.9rem;letter-spacing:0.1em;margin-bottom:8px;">${name}</div>
<div style="color:rgba(255,255,255,0.6);font-size:0.85rem;line-height:1.7;white-space:pre-wrap;">${text}</div>`
      container.appendChild(div)
    }
    const gal = document.getElementById('datalog-gallery')
    gal.style.display = 'block'
    gal.scrollTop = 0
    const closeBtn = document.getElementById('dgal-close')
    if (closeBtn) {
      closeBtn.onclick = () => { gal.style.display = 'none' }
    }
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
