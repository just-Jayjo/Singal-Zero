import * as THREE from 'three'

export class TargetDummy {
  constructor(position, moving = false) {
    this.type = 'targetDummy'
    this.mesh = null
    this.hp = 1
    this.maxHp = 1
    this.dead = false
    this.canShoot = false
    this.radius = 0.5
    this.moving = moving
    this._alive = true
    this._respawnTimer = 0
    this._hitFlash = 0
    this._moveDir = new THREE.Vector3(0, 0, 1)
    this._moveRange = 4
    this._moveSpeed = 2.5
    this._spawnPos = position.clone()
    this._moveOrigin = position.clone()
    this.createMesh(position)
  }

  createMesh(position) {
    const group = new THREE.Group()
    const S = 1.2

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, metalness: 0.3, roughness: 0.6 })
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xff6644, emissive: 0xff4422, emissiveIntensity: 0.1 })
    const hitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })

    /* 底座 */
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8, roughness: 0.2 }))
    base.position.y = 0.02
    group.add(base)

    /* 支柱 */
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 }))
    pole.position.y = 0.32
    group.add(pole)

    /* 身體 — 圓形靶面 */
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), bodyMat)
    body.position.set(0, 0.65, 0)
    body.rotation.x = -Math.PI / 2
    group.add(body)

    /* 靶心 */
    const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.041, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff4444, emissiveIntensity: 0.3 }))
    bullseye.position.set(0, 0.65, 0)
    bullseye.rotation.x = -Math.PI / 2
    group.add(bullseye)

    /* 靶環 */
    for (let i = 1; i <= 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06 + i * 0.04, 0.006, 8, 16),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xffffff : 0xcc4444, metalness: 0.2, roughness: 0.7 }))
      ring.position.set(0, 0.65, 0.001)
      ring.rotation.x = -Math.PI / 2
      group.add(ring)
    }

    /* 移動靶的軌道提示 */
    if (this.moving) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x4444aa, emissive: 0x4444ff, emissiveIntensity: 0.2 })
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 8), railMat)
      rail.position.y = 0.04
      group.add(rail)
    }

    this._hitMat = hitMat
    this._bodyMat = bodyMat
    this._bullseye = bullseye
    this._bodyMesh = body

    group.position.copy(position)
    group.lookAt(0, group.position.y, 0)
    this.mesh = group
  }

  takeDamage(amount) {
    if (!this._alive || this.dead || !this.mesh.visible) return false
    this.hp -= amount
    this._alive = false
    this.mesh.visible = false
    this._respawnTimer = 1.2
    this._hitFlash = 0.15
    this._flashBody(true)
    return true
  }

  _flashBody(on) {
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.material?.dispose()
        child.material = child.material.clone()
        if (on) {
          child.material.emissive = new THREE.Color(0xffffff)
          child.material.emissiveIntensity = 2.0
        } else {
          child.material.emissive = new THREE.Color(0x000000)
          child.material.emissiveIntensity = 0
        }
      }
    })
  }

  update(delta, player, level) {
    if (this._hitFlash > 0) {
      this._hitFlash -= delta
      if (this._hitFlash <= 0) this._flashBody(false)
    }

    if (!this._alive) {
      this._respawnTimer -= delta
      this.mesh.visible = false
      if (this._respawnTimer <= 0) {
        this._alive = true
        this.hp = this.maxHp
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

    /* 微微浮動讓標靶有生氣 */
    const bob = Math.sin(performance.now() * 0.002) * 0.005
    this.mesh.position.y = this._spawnPos.y + bob
  }
}
