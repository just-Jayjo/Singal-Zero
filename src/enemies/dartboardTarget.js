import * as THREE from 'three'

export class DartboardTarget {
  constructor(position) {
    this.type = 'dartboardTarget'
    this.mesh = null
    this.hp = 999
    this.maxHp = 999
    this.dead = false
    this.canShoot = false
    this.radius = 0.8
    this.moving = true
    this._alive = true
    this._respawnTimer = 0
    this._hitFlash = 0
    this._moveRange = 5
    this._moveSpeed = 0.8
    this._spawnPos = position.clone()
    this._moveOrigin = position.clone()
    this._scorePopups = []
    this._totalScore = 0
    this._faceMesh = null
    this.createMesh(position)
  }

  createMesh(position) {
    const group = new THREE.Group()
    const R = 0.6

    const outerMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, metalness: 0.3, roughness: 0.6 })
    const midMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.7 })
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, metalness: 0.3, roughness: 0.6 })
    const bullseyeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xff8800, emissiveIntensity: 0.2 })
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8, roughness: 0.2 })
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 })
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x0088cc, emissiveIntensity: 0.15, transparent: true, opacity: 0.3 })

    /* 底座 */
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.04, 12), baseMat)
    base.position.y = 0.02
    group.add(base)

    /* 支柱 */
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.7, 8), poleMat)
    pole.position.y = 0.38
    group.add(pole)

    /* 靶面 — 單一碰撞體，各區塊用子 mesh 裝飾 */
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.7, side: THREE.DoubleSide })
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 32), faceMat)
    face.position.set(0, 0.75, 0)
    face.rotation.x = -Math.PI / 2
    group.add(face)
    this._faceMesh = face

    /* 計分環裝飾 */
    const zones = [
      { radius: R, color: 0xcc4444, emissive: 0x441111, label: '50' },
      { radius: R * 0.75, color: 0xffffff, emissive: 0x222222, label: '100' },
      { radius: R * 0.5, color: 0xcc4444, emissive: 0x441111, label: '150' },
      { radius: R * 0.25, color: 0xffd700, emissive: 0xff8800, label: '250' },
    ]

    for (const z of zones) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.01, z.radius, 32),
        new THREE.MeshStandardMaterial({ color: z.color, emissive: z.emissive, emissiveIntensity: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      )
      ring.position.set(0, 0.75, 0.001)
      ring.rotation.x = -Math.PI / 2
      group.add(ring)

      const outline = new THREE.Mesh(
        new THREE.TorusGeometry(z.radius, 0.012, 8, 32),
        ringMat
      )
      outline.position.set(0, 0.75, 0.002)
      outline.rotation.x = -Math.PI / 2
      group.add(outline)
    }

    /* 標示文字「50」「100」「150」「250」 */
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 256
    textCanvas.height = 256
    const ctx = textCanvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 256)

    const labels = [
      { r: 0.88, text: '50', size: 18 },
      { r: 0.63, text: '100', size: 20 },
      { r: 0.38, text: '150', size: 22 },
      { r: 0.13, text: '250', size: 26 },
    ]
    for (const l of labels) {
      ctx.fillStyle = 'rgba(0, 242, 255, 0.25)'
      ctx.font = `${l.size}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(l.text, 128, 128 + (1 - l.r) * 110)
    }

    const textTex = new THREE.CanvasTexture(textCanvas)
    const textMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), textMat)
    textPlane.position.set(0, 0.75, 0.003)
    textPlane.rotation.x = -Math.PI / 2
    group.add(textPlane)

    /* 軌道平台 */
    const railMat = new THREE.MeshStandardMaterial({ color: 0x4444aa, emissive: 0x4444ff, emissiveIntensity: 0.2 })
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 10), railMat)
    rail.position.y = 0.04
    group.add(rail)

    group.position.copy(position)
    group.lookAt(0, group.position.y, 0)
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
      const localPt = new THREE.Vector3().copy(hitInfo.point)
      this._faceMesh.worldToLocal(localPt)
      score = this.getScoreForHit(localPt)
    }
    this._totalScore += score
    this._alive = false
    this.mesh.visible = false
    this._respawnTimer = 1.0
    this._hitFlash = 0.15
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
      const xOffset = Math.cos(t * 0.7) * this._moveRange * 0.3
      this.mesh.position.x = this._moveOrigin.x + xOffset
    }

    const bob = Math.sin(performance.now() * 0.002) * 0.005
    this.mesh.position.y = this._spawnPos.y + bob
  }

  clearProjectiles() {}
}
