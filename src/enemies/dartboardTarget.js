import * as THREE from 'three'

export class DartboardTarget {
  constructor(position, wallNormal = new THREE.Vector3(-1, 0, 0)) {
    this.type = 'dartboardTarget'
    this.mesh = null
    this.hp = 999
    this.maxHp = 999
    this.dead = false
    this.canShoot = false
    this.radius = 0.5
    this.moving = true
    this._alive = true
    this._respawnTimer = 0
    this._moveRange = 6
    this._moveSpeed = 0.6
    this._spawnPos = position.clone()
    this._moveOrigin = position.clone()
    this._wallNormal = wallNormal.clone().normalize()
    this._faceMesh = null
    this._score = 0
    this.createMesh(position)
  }

  _generateTexture() {
    const size = 512
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    const cx = size / 2, cy = size / 2, R = size / 2 - 4

    ctx.clearRect(0, 0, size, size)

    const zones = [
      { pct: 1.0, color: '#cc3333' },
      { pct: 0.75, color: '#ffffff' },
      { pct: 0.50, color: '#cc3333' },
      { pct: 0.25, color: '#ffd700' },
    ]
    for (const z of zones) {
      const r = R * z.pct
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = z.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    /* 紅心 */
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.08, 0, Math.PI * 2)
    ctx.fillStyle = '#ff4444'
    ctx.fill()

    /* inner ring outline */
    for (const pct of [0.75, 0.5, 0.25]) {
      ctx.beginPath()
      ctx.arc(cx, cy, R * pct, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    /* 分數標示 */
    const labels = [
      { pct: 0.88, text: '50', size: 28 },
      { pct: 0.63, text: '100', size: 32 },
      { pct: 0.38, text: '150', size: 36 },
      { pct: 0.13, text: '250', size: 42 },
    ]
    for (const l of labels) {
      ctx.fillStyle = 'rgba(0, 242, 255, 0.3)'
      ctx.font = `bold ${l.size}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(l.text, cx, cy + (1 - l.pct) * R * 0.6)
    }

    const tex = new THREE.CanvasTexture(c)
    tex.needsUpdate = true
    return tex
  }

  createMesh(position) {
    const group = new THREE.Group()
    const R = 0.6

    const tex = this._generateTexture()
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex, side: THREE.DoubleSide,
      metalness: 0.3, roughness: 0.6
    })
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 32), faceMat)
    this._faceMesh = face

    /* 邊框 */
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x334466, metalness: 0.7, roughness: 0.3
    })
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.025, 8, 32), rimMat)
    face.add(rim)

    /* 壁掛支架 */
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x555577, metalness: 0.8, roughness: 0.2
    })
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), bracketMat)
    bracket.position.set(0, -R * 0.5, -0.06)
    face.add(bracket)

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), bracketMat)
    arm.position.set(0, -R * 0.5, -0.14)
    face.add(arm)

    /* 壁軌 */
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x4444aa, emissive: 0x4444ff, emissiveIntensity: 0.15
    })
    const railLen = 10
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, railLen), railMat)
    rail.position.set(0, 0, 0)
    group.add(rail)

    /* 軌道端點 */
    for (const zOff of [-railLen / 2, railLen / 2]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), railMat)
      cap.position.set(0, 0, zOff)
      group.add(cap)
    }

    group.position.copy(position)

    /* 面向牆外 */
    const up = new THREE.Vector3(0, 1, 0)
    const target = position.clone().add(this._wallNormal)
    group.lookAt(target, up)

    this.mesh = group
  }

  getScoreForHit(localPoint) {
    const R = 0.6
    const dist = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y)
    const norm = dist / R
    if (norm < 0.25) return 250
    if (norm < 0.5) return 150
    if (norm < 0.75) return 100
    return 50
  }

  takeDamage(amount, hitInfo) {
    if (!this._alive || this.dead || !this.mesh.visible) return false
    let score = 50
    if (hitInfo && hitInfo.point && this._faceMesh) {
      this._faceMesh.updateWorldMatrix(true, false)
      const localPt = new THREE.Vector3().copy(hitInfo.point)
      this._faceMesh.worldToLocal(localPt)
      score = this.getScoreForHit(localPt)
    }
    this._score += score
    this._alive = false
    this.mesh.visible = false
    this._respawnTimer = 1.0
    this._spawnScorePopup(hitInfo ? hitInfo.point : this.mesh.position, score)

    const game = this._getGame()
    if (game && game.trainingMode) {
      game.trainingScore = (game.trainingScore || 0) + score
      game._updateTrainingScoreDisplay()
    }
    return true
  }

  _spawnScorePopup(worldPos, score) {
    const el = document.createElement('div')
    el.className = 'score-popup'
    el.textContent = `+${score}`
    if (score >= 200) {
      el.style.color = '#ffd700'
      el.style.fontSize = '1.4rem'
      el.style.textShadow = '0 0 20px rgba(255,215,0,0.6)'
    } else if (score >= 100) {
      el.style.color = '#00f2ff'
      el.style.fontSize = '1.2rem'
    }
    document.body.appendChild(el)

    const screenPos = this._worldToScreen(worldPos)
    el.style.left = screenPos.x + 'px'
    el.style.top = screenPos.y + 'px'
    el.style.opacity = '1'
    el.style.transform = 'translate(-50%, -50%) scale(1)'

    requestAnimationFrame(() => {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -120%) scale(1.3)'
    })

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    }, 800)
  }

  _worldToScreen(worldPos) {
    const game = this._getGame()
    if (!game) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const vec = worldPos.clone().project(game.camera)
    return {
      x: (vec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vec.y * 0.5 + 0.5) * window.innerHeight,
    }
  }

  _getGame() {
    if (!this._gameRef) {
      this._gameRef = typeof window !== 'undefined' && window.__game
    }
    return this._gameRef
  }

  update(delta, player, level) {
    if (!this._alive) {
      this._respawnTimer -= delta
      this.mesh.visible = false
      if (this._respawnTimer <= 0) {
        this._alive = true
        this.mesh.position.copy(this._spawnPos)
        this.mesh.visible = true
      }
      return
    }

    if (this.moving) {
      const t = performance.now() * 0.001 * this._moveSpeed
      const offset = Math.sin(t) * this._moveRange
      this.mesh.position.z = this._moveOrigin.z + offset
    }

    const bob = Math.sin(performance.now() * 0.002) * 0.005
    this.mesh.position.y = this._spawnPos.y + bob
  }

  clearProjectiles() {}
}
