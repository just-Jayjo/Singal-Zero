import * as THREE from 'three'

class WeaponBase {
  constructor(scene, camera) {
    this.scene = scene
    this.camera = camera
    this.audio = null
    this.mesh = null
    this._handGroup = null
    this.name = '未知武器'
    this.damage = 9
    this.fireRate = 0.2
    this.magazineSize = 30
    this.currentAmmo = 30
    this.reserveAmmo = 90
    this.reloadTime = 1.5
    this.isReloading = false
    this.reloadTimer = 0
    this.fireTimer = 0
    this.range = 50
    this.spread = 0.02
    this.auto = false
    this.lastTarget = null
  }

  reset() {
    this.currentAmmo = this.magazineSize
    this.reserveAmmo = this.magazineSize * 3
    this.isReloading = false
    this.reloadTimer = 0
    this.fireTimer = 0
    if (this._trails) {
      for (const t of this._trails) {
        this.scene.remove(t.mesh)
        t.mesh.geometry.dispose()
        t.mesh.material.dispose()
      }
      this._trails = []
    }
  }

  createMesh() {
    const group = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.8, roughness: 0.25 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.7, roughness: 0.3 })
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, metalness: 0.7, roughness: 0.25 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.6 })

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.25, 8), darkMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, -0.02, -0.2)
    group.add(barrel)

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.15), bodyMat)
    body.position.set(0, -0.02, -0.05)
    group.add(body)

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.03), darkMat)
    grip.position.set(0, -0.08, 0.05)
    group.add(grip)

    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.01), accentMat)
    trigger.position.set(0, -0.045, 0.03)
    group.add(trigger)

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), glowMat)
    sight.position.set(0, 0.015, -0.12)
    group.add(sight)

    this.mesh = group
    this.mesh.frustumCulled = false
    this.scene.add(group)
  }

  update(delta) {
    if (this.fireTimer > 0) this.fireTimer -= delta
    if (this.isReloading) {
      this.reloadTimer -= delta
      if (this.reloadTimer <= 0) {
        const needed = this.magazineSize - this.currentAmmo
        const available = Math.min(needed, this.reserveAmmo)
        this.currentAmmo += available
        this.reserveAmmo -= available
        this.isReloading = false
      }
    }
    if (this.mesh) {
      this._updateWeaponTransform()
    }
    this.updateTrails()
  }

  _updateWeaponTransform() {
    const pos = new THREE.Vector3()
    this.camera.getWorldPosition(pos)
    const quat = new THREE.Quaternion()
    this.camera.getWorldQuaternion(quat)

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)

    const bob = this._bobPhase || 0
    const bX = Math.sin(bob * 2) * 0.008
    const bY = Math.abs(Math.sin(bob)) * 0.01

    const offset = new THREE.Vector3()
      .addScaledVector(right, 0.40 + bX)
      .addScaledVector(up, -0.12 - bY)
      .addScaledVector(forward, 0.55)
    this.mesh.position.copy(pos).add(offset)

    this.mesh.quaternion.copy(quat)
    this.mesh.rotateX(0.06 + Math.sin(bob * 2) * 0.02)
    this.mesh.rotateY(0.12 + Math.sin(bob) * 0.015)
    this.mesh.rotateZ(0.03)
    this.mesh.scale.setScalar(1.1)

    /* 同步前臂位置（手掌+手指已在武器群組中，隨武器旋轉，前臂單獨懸垂） */
    if (this._forearmGroup) {
      const gripWorld = this._gripPos.clone().applyQuaternion(this.mesh.quaternion)
      gripWorld.add(this.mesh.position)
      this._forearmGroup.position.copy(gripWorld)
      this._forearmGroup.quaternion.copy(quat)
      this._forearmGroup.scale.copy(this.mesh.scale)
    }
  }

  setBobPhase(phase) { this._bobPhase = phase }

  _createHand(group, gripPos) {
    this._gripPos = gripPos.clone()

    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.1, roughness: 0.9 })
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.2, roughness: 0.8 })
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, metalness: 0.1, roughness: 0.7 })

    /* 前臂（袖管）— 從畫面下方伸向握把 */
    this._forearmGroup = new THREE.Group()
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.032, 0.10, 6),
      sleeveMat
    )
    forearm.position.set(0, -0.03, 0.06)
    forearm.rotation.x = -0.3
    this._forearmGroup.add(forearm)
    this.scene.add(this._forearmGroup)

    /* 手掌 — 放在武器群組中隨武器旋轉 */
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.035), gloveMat)
    palm.position.copy(gripPos)
    group.add(palm)

    /* 四根手指 — 在握把前方包覆 */
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.007, 0.02), skinMat)
      finger.position.set(gripPos.x - 0.012 + i * 0.008, gripPos.y + 0.002, gripPos.z - 0.018)
      group.add(finger)
    }

    /* 拇指 — 在握把側面 */
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.01, 0.016), skinMat)
    thumb.position.set(gripPos.x + 0.022, gripPos.y + 0.002, gripPos.z - 0.006)
    thumb.rotation.z = 0.4
    group.add(thumb)
  }
  shoot(enemies, camera, level) {
    if (this.isReloading) return null
    if (this.currentAmmo <= 0) {
      if (this.reserveAmmo > 0) this.reload()
      return null
    }
    if (this.fireTimer > 0) return null

    this.fireTimer = this.fireRate
    this.currentAmmo--
    if (this.currentAmmo <= 0 && this.reserveAmmo > 0) {
      this.reload()
    }

    if (this.audio) this.audio.playShoot()

    const dir = camera.getWorldDirection(new THREE.Vector3())
    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * this.spread,
      (Math.random() - 0.5) * this.spread,
      (Math.random() - 0.5) * this.spread
    )
    dir.add(spread).normalize()

    const raycaster = new THREE.Raycaster(camera.position, dir, 0, this.range)
    const allMeshes = []
    for (const enemy of enemies) {
      if (enemy.mesh && enemy.mesh.visible) allMeshes.push(enemy.mesh)
    }
    /* 牆壁碰撞 — 子彈不能穿牆 */
    let wallDist = Infinity
    if (level && level.walls) {
      const wallHits = raycaster.intersectObjects(level.walls, true)
      if (wallHits.length > 0) wallDist = wallHits[0].distance
    }

    const hits = raycaster.intersectObjects(allMeshes, true)
    if (hits.length > 0 && hits[0].distance < wallDist) {
      const hitEnemy = enemies.find(e => {
        let obj = hits[0].object
        while (obj) {
          if (obj === e.mesh) return true
          obj = obj.parent
        }
        return false
      })
      if (hitEnemy && !hitEnemy.dead) {
        const dmgMult = hits[0].distance < 5 ? 1.5 : hits[0].distance < 15 ? 1.0 : 0.7
        hitEnemy.takeDamage(this.damage * dmgMult, hits[0])
        this.createMuzzleFlash()
        this.createImpactSpark(hits[0].point)
        if (this.audio) this.audio.playHitMarker()
        return true
      }
    }
    return false
  }

  createMuzzleFlash() {
    if (!this.mesh) return
    const flash = new THREE.PointLight(this.muzzleColor || 0xffaa44, 3, 6)
    flash.position.copy(this.mesh.position)
    flash.position.add(new THREE.Vector3(0, 0, -0.4).applyQuaternion(this.mesh.quaternion))
    this.scene.add(flash)
    setTimeout(() => this.scene.remove(flash), 50)
  }

  createImpactSpark(point) {
    const count = 5 + Math.floor(Math.random() * 4)
    const particles = []
    const color = this.trailColor || 0xffaa44
    for (let i = 0; i < count; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      )
      spark.position.copy(point)
      spark.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3
      )
      spark.userData.life = 0.3 + Math.random() * 0.2
      this.scene.add(spark)
      particles.push(spark)
    }
    if (!this._sparks) this._sparks = []
    for (const s of particles) {
      this._sparks.push(s)
      const start = performance.now()
      const dur = s.userData.life * 1000
      const update = () => {
        const elapsed = (performance.now() - start) / 1000
        if (elapsed >= s.userData.life) {
          this.scene.remove(s)
          s.geometry.dispose()
          s.material.dispose()
          return
        }
        s.position.add(s.userData.vel.clone().multiplyScalar(0.016))
        s.userData.vel.y -= 4 * 0.016
        s.material.opacity = 1 - elapsed / s.userData.life
        requestAnimationFrame(update)
      }
      update()
    }
  }

  createBulletTrail(start, end, color) {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(end, start)
    const length = dir.length()
    if (length < 0.01) return
    dir.normalize()

    const radius = color === 0xff4444 ? 0.015 : 0.025
    const geo = new THREE.CylinderGeometry(radius, radius, length, 8, 1)
    const mat = new THREE.MeshBasicMaterial({
      color: color || 0x00ccff,
      transparent: true,
      opacity: 0.85
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

    const startTime = performance.now()
    const duration = 120
    const trail = { mesh, startTime, duration }
    if (!this._trails) this._trails = []
    this._trails.push(trail)
  }

  updateTrails() {
    if (!this._trails) return
    const now = performance.now()
    for (let i = this._trails.length - 1; i >= 0; i--) {
      const t = this._trails[i]
      const elapsed = now - t.startTime
      const alpha = 1 - elapsed / t.duration
      if (alpha <= 0) {
        this.scene.remove(t.mesh)
        t.mesh.geometry.dispose()
        t.mesh.material.dispose()
        this._trails.splice(i, 1)
      } else {
        t.mesh.material.opacity = alpha * 0.85
      }
    }
  }

  reload() {
    if (this.isReloading || this.currentAmmo >= this.magazineSize || this.reserveAmmo <= 0) return
    this.isReloading = true
    this.reloadTimer = this.reloadTime
    if (this.audio) this.audio.playReload()
  }
}

class PulsePistol extends WeaponBase {
  constructor(scene, camera) {
    super(scene, camera)
    this.name = '脈衝手槍'
    this.damage = 13
    this.fireRate = 0.15
    this.magazineSize = 15
    this.currentAmmo = 15
    this.reserveAmmo = 45
    this.reloadTime = 0.8
    this.range = 55
    this.spread = 0.03
    this.color = 0x4488ff
    this.muzzleColor = 0x00ccff
    this.trailColor = 0x00aaff
    this.createMesh()
  }

  createMesh() {
    const group = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.8, roughness: 0.2 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.7, roughness: 0.3 })
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x6a9acf, metalness: 0.6, roughness: 0.3 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x0066ff, emissiveIntensity: 0.8 })

    /* 槍身 */
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.18), bodyMat)
    body.position.set(0, -0.02, -0.04)
    group.add(body)

    /* 上半部滑套 */
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 0.16), accentMat)
    slide.position.set(0, 0.01, -0.04)
    group.add(slide)

    /* 槍管 */
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.14, 8), darkMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, -0.02, -0.16)
    group.add(barrel)

    /* 槍口裝置 */
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 8), darkMat)
    muzzle.position.set(0, -0.02, -0.24)
    muzzle.rotation.x = Math.PI / 2
    group.add(muzzle)

    /* 握把 */
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.03), darkMat)
    grip.position.set(0, -0.08, 0.06)
    group.add(grip)

    /* 握把紋路 */
    for (let i = -2; i <= 2; i++) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.005, 0.035), accentMat)
      ridge.position.set(0.025, -0.06 + i * 0.015, 0.06)
      group.add(ridge)
      const ridge2 = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.005, 0.035), accentMat)
      ridge2.position.set(-0.025, -0.06 + i * 0.015, 0.06)
      group.add(ridge2)
    }

    /* 板機 */
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.01), darkMat)
    trigger.position.set(0, -0.04, 0.04)
    group.add(trigger)

    /* 板機護弓 */
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 4, 6), darkMat)
    guard.position.set(0, -0.035, 0.045)
    guard.rotation.x = Math.PI / 2
    group.add(guard)

    /* 彈匣 */
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.025), darkMat)
    mag.position.set(0, -0.11, 0.04)
    group.add(mag)

    /* 核心發光體 */
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), glowMat)
    core.position.set(0, 0.01, -0.18)
    group.add(core)

    /* 發光環 */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 8), glowMat)
    ring.position.set(0, 0.01, -0.12)
    ring.rotation.x = Math.PI / 2
    group.add(ring)

    /* 槍身側板 */
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.12), accentMat)
    sideL.position.set(-0.035, -0.02, -0.04)
    group.add(sideL)
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.12), accentMat)
    sideR.position.set(0.035, -0.02, -0.04)
    group.add(sideR)

    this._createHand(group, new THREE.Vector3(0, -0.08, 0.06))

    this.mesh = group
    this.mesh.frustumCulled = false
    this.scene.add(group)
  }
}

class BurstRifle extends WeaponBase {
  constructor(scene, camera) {
    super(scene, camera)
    this.name = '連發步槍'
    this.damage = 8
    this.fireRate = 0.45
    this.magazineSize = 15
    this.currentAmmo = 15
    this.reserveAmmo = 45
    this.reloadTime = 1.2
    this.range = 65
    this.spread = 0.04
    this.auto = true
    this.muzzleColor = 0xffaa44
    this.trailColor = 0xff8800
    this.burstCount = 5
    this.burstDelay = 0.09
    this.burstRemaining = 0
    this.burstTimer = 0
    this.createMesh()
  }

  createMesh() {
    const group = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, metalness: 0.8, roughness: 0.2 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.7, roughness: 0.3 })
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x6a7a8a, metalness: 0.6, roughness: 0.3 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 0.6 })

    /* 下機匣 */
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.22), bodyMat)
    body.position.set(0, -0.02, -0.05)
    group.add(body)

    /* 上機匣 */
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.03, 0.20), accentMat)
    upper.position.set(0, 0.01, -0.04)
    group.add(upper)

    /* 槍管 */
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.2, 8), darkMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, -0.02, -0.2)
    group.add(barrel)

    /* 槍管隔熱罩 */
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), darkMat)
    shroud.rotation.x = Math.PI / 2
    shroud.position.set(0, -0.02, -0.08)
    group.add(shroud)

    /* 槍口制退器 */
    const brake = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.008, 6, 8), darkMat)
    brake.position.set(0, -0.02, -0.31)
    brake.rotation.x = Math.PI / 2
    group.add(brake)

    /* 護木散熱孔 */
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.02, 0.008), darkMat)
      vent.position.set(0.026, -0.02, -0.10 - i * 0.025)
      group.add(vent)
      const vent2 = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.02, 0.008), darkMat)
      vent2.position.set(-0.026, -0.02, -0.10 - i * 0.025)
      group.add(vent2)
    }

    /* 握把 */
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.03), darkMat)
    grip.position.set(0, -0.08, 0.06)
    group.add(grip)

    /* 握把紋路 */
    for (let i = -2; i <= 2; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.003, 0.002), accentMat)
      line.position.set(0, -0.06 + i * 0.018, 0.078)
      group.add(line)
    }

    /* 板機 */
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.01), darkMat)
    trigger.position.set(0, -0.04, 0.04)
    group.add(trigger)

    /* 板機護弓 */
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 4, 6), darkMat)
    guard.position.set(0, -0.035, 0.045)
    guard.rotation.x = Math.PI / 2
    group.add(guard)

    /* 彈匣 */
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), darkMat)
    mag.position.set(0, -0.08, -0.02)
    group.add(mag)

    /* 彈匣底部 */
    const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.042), accentMat)
    magBase.position.set(0, -0.12, -0.02)
    group.add(magBase)

    /* 前準星 */
    const sightFront = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.025, 0.005), bodyMat)
    sightFront.position.set(0, 0.02, -0.14)
    group.add(sightFront)

    /* 後照門 */
    const sightRear = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.01), bodyMat)
    sightRear.position.set(0, 0.02, 0.02)
    group.add(sightRear)

    /* 槍托 */
    const stockTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.06), darkMat)
    stockTop.position.set(0, -0.01, 0.12)
    group.add(stockTop)
    const stockBottom = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.04), accentMat)
    stockBottom.position.set(0, -0.05, 0.13)
    group.add(stockBottom)

    /* 戰術軌道 */
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.16), accentMat)
    rail.position.set(0, -0.04, -0.08)
    group.add(rail)

    /* 拋殼口 */
    const eject = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.01, 0.01), darkMat)
    eject.position.set(0.035, 0.0, -0.02)
    group.add(eject)

    /* 發光條 */
    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.08), glowMat)
    glowStrip.position.set(0, -0.005, -0.06)
    group.add(glowStrip)

    this._createHand(group, new THREE.Vector3(0, -0.08, 0.06))

    this.mesh = group
    this.mesh.frustumCulled = false
    this.scene.add(group)
  }

  shoot(enemies, camera, level) {
    if (this.isReloading) return null
    if (this.currentAmmo <= 0) {
      if (this.reserveAmmo > 0) this.reload()
      return null
    }
    if (this.fireTimer > 0) return null

    this.fireTimer = this.fireRate
    this.burstRemaining = this.burstCount
    this.burstTimer = 0
    this._burstEnemies = enemies
    this._burstCamera = camera
    this._burstLevel = level

    this.fireBurst()
    return true
  }

  fireBurst() {
    if (this.burstRemaining <= 0 || this.currentAmmo <= 0) return
    this.burstRemaining--
    this.currentAmmo--
    if (this.currentAmmo <= 0 && this.reserveAmmo > 0) {
      this.reload()
    }

    if (this.audio) this.audio.playRifleBurst()

    const dir = this._burstCamera.getWorldDirection(new THREE.Vector3())
    const spread = new THREE.Vector3(
      (Math.random() - 0.5) * this.spread * 1.5,
      (Math.random() - 0.5) * this.spread * 1.5,
      (Math.random() - 0.5) * this.spread
    )
    dir.add(spread).normalize()

    const raycaster = new THREE.Raycaster(this._burstCamera.position, dir, 0, this.range)
    const allMeshes = []
    for (const enemy of this._burstEnemies) {
      if (enemy.mesh && enemy.mesh.visible) allMeshes.push(enemy.mesh)
    }
    let wallDist = Infinity
    if (this._burstLevel && this._burstLevel.walls) {
      const wallHits = raycaster.intersectObjects(this._burstLevel.walls, true)
      if (wallHits.length > 0) wallDist = wallHits[0].distance
    }
    const hits = raycaster.intersectObjects(allMeshes, true)
    if (hits.length > 0 && hits[0].distance < wallDist) {
      const hitEnemy = this._burstEnemies.find(e => {
        let obj = hits[0].object
        while (obj) {
          if (obj === e.mesh) return true
          obj = obj.parent
        }
        return false
      })
      if (hitEnemy && !hitEnemy.dead) {
        const dmgMult = hits[0].distance < 5 ? 1.3 : hits[0].distance < 15 ? 1.0 : 0.6
        hitEnemy.takeDamage(this.damage * dmgMult, hits[0])
        this.createImpactSpark(hits[0].point)
        if (this.audio) this.audio.playHitMarker()
      }
    }

    this.createMuzzleFlash()
  }

  update(delta) {
    super.update(delta)
    if (this.burstRemaining > 0) {
      this.burstTimer += delta
      if (this.burstTimer >= this.burstDelay) {
        this.burstTimer = 0
        this.fireBurst()
        if (this._reportShot) this._reportShot()
      }
    }
  }
}

class Grenade extends WeaponBase {
  constructor(scene, camera) {
    super(scene, camera)
    this.name = '脈衝炸彈'
    this.damage = 60
    this.fireRate = 0.8
    this.magazineSize = 1
    this.currentAmmo = 1
    this.reserveAmmo = 8
    this.reloadTime = 0
    this.range = 20
    this.spread = 0
    this.explosionRadius = 5
    this.throwStrength = 8
    this.projectiles = []
    this.player = null
    this.createMesh()
  }

  setPlayer(player) { this.player = player }

  createMesh() {
    const group = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.8, roughness: 0.2 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.7, roughness: 0.3 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffaa, emissiveIntensity: 1.5 })

    /* 主體 — 光滑橢球 */
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), bodyMat)
    body.scale.y = 1.3
    group.add(body)

    /* 赤道發光環 */
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.005, 8, 16), glowMat)
    glowRing.rotation.x = Math.PI / 2
    group.add(glowRing)

    /* 頂端感應引信（小半球＋發光尖端） */
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), darkMat)
    tip.position.y = 0.058
    tip.scale.y = 0.5
    group.add(tip)
    const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), glowMat)
    tipGlow.position.y = 0.07
    group.add(tipGlow)

    /* 尾翼 × 4 */
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.03, 0.02), darkMat)
      fin.position.set(Math.cos(angle) * 0.05, -0.045, Math.sin(angle) * 0.05)
      fin.rotation.y = -angle
      group.add(fin)
    }

    /* 尾部噴口 */
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.01, 8), darkMat)
    nozzle.position.y = -0.055
    group.add(nozzle)
    const nozzleGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.005, 0.008, 6), glowMat)
    nozzleGlow.position.y = -0.065
    group.add(nozzleGlow)

    this._createHand(group, new THREE.Vector3(0, -0.02, 0.04))

    this.mesh = group
    this.mesh.frustumCulled = false
    this.scene.add(group)
  }

  reload() {
    if (this.currentAmmo >= this.magazineSize || this.reserveAmmo <= 0) return
    const needed = this.magazineSize - this.currentAmmo
    const available = Math.min(needed, this.reserveAmmo)
    this.currentAmmo += available
    this.reserveAmmo -= available
  }

  shoot(enemies, camera) {
    if (this.currentAmmo <= 0) {
      this.reload()
      if (this.currentAmmo <= 0) return null
    }
    if (this.fireTimer > 0 || this.isReloading) return null

    this.fireTimer = this.fireRate
    this.currentAmmo--

    const dir = camera.getWorldDirection(new THREE.Vector3())
    const spawnPos = camera.position.clone().add(dir.clone().multiplyScalar(0.5))
    spawnPos.y -= 0.1

    const vel = dir.clone().multiplyScalar(this.throwStrength)
    vel.y += 3

    const proj = {
      mesh: new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a5a3a, metalness: 0.3, roughness: 0.8 })),
      pos: spawnPos.clone(),
      vel: vel,
      life: 3.0,
      enemies: enemies,
      exploded: false
    }
    proj.mesh.position.copy(spawnPos)
    this.scene.add(proj.mesh)
    this.projectiles.push(proj)

    return true
  }

  update(delta) {
    super.update(delta)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]

      if (p.exploded) {
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        this.projectiles.splice(i, 1)
        continue
      }

      p.vel.y -= 9.8 * delta
      p.pos.add(p.vel.clone().multiplyScalar(delta))
      if (p.pos.y < 0.1) p.pos.y = 0.1
      p.mesh.position.copy(p.pos)
      p.life -= delta

      if (p.pos.y <= 0.1 || p.life <= 0) {
        p.exploded = true
        this._explode(p.pos, p.enemies)
      }
    }
  }

  _explode(pos, enemies) {
    const explosion = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 1 })
    )
    explosion.position.copy(pos)
    this.scene.add(explosion)

    const startTime = performance.now()
    const duration = 600
    const expand = () => {
      const elapsed = (performance.now() - startTime) / duration
      if (elapsed >= 1) {
        this.scene.remove(explosion)
        explosion.geometry.dispose()
        explosion.material.dispose()
        return
      }
      const scale = 1 + elapsed * 16
      explosion.scale.setScalar(scale)
      explosion.material.opacity = 1 - elapsed
      requestAnimationFrame(expand)
    }
    expand()

    const flash = new THREE.PointLight(0xff6600, 15, 40)
    flash.position.copy(pos)
    this.scene.add(flash)
    setTimeout(() => this.scene.remove(flash), 300)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    )
    ring.position.copy(pos)
    ring.lookAt(this.camera.position)
    this.scene.add(ring)
    const ringStart = performance.now()
    const ringExpand = () => {
      const el = (performance.now() - ringStart) / 500
      if (el >= 1) { this.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); return }
      ring.scale.setScalar(1 + el * 12)
      ring.material.opacity = 0.8 * (1 - el)
      ring.lookAt(this.camera.position)
      requestAnimationFrame(ringExpand)
    }
    ringExpand()

    /* 爆炸影子圓盤 */
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
    )
    shadowDisc.position.set(pos.x, 0.02, pos.z)
    shadowDisc.rotation.x = -Math.PI / 2
    this.scene.add(shadowDisc)
    const shadowStart = performance.now()
    const shadowAnim = () => {
      const el = (performance.now() - shadowStart) / 400
      if (el >= 1) { this.scene.remove(shadowDisc); shadowDisc.geometry.dispose(); shadowDisc.material.dispose(); return }
      const s = 1 + el * 8
      shadowDisc.scale.set(s, s, 1)
      shadowDisc.material.opacity = 0.5 * (1 - el)
      requestAnimationFrame(shadowAnim)
    }
    shadowAnim()

    /* 視野震盪 */
    if (this.player && this.player.shake) {
      const dist = pos.distanceTo(this.player.camera.position)
      const intensity = Math.max(0, 1 - dist / this.explosionRadius) * 0.15
      if (intensity > 0.02) this.player.shake(intensity, 300)
    }

    if (this.audio) this.audio.playExplosion()

    for (const enemy of enemies) {
      if (!enemy || !enemy.mesh || enemy.dead) continue
      const dist = pos.distanceTo(enemy.mesh.position)
      if (dist < this.explosionRadius) {
        const falloff = 1 - (dist / this.explosionRadius)
        const dmg = Math.floor(this.damage * falloff)
        if (dmg > 0) {
          if (enemy.type === 'shieldGuardian') {
            enemy.takeGrenadeDamage(dmg)
          } else {
            enemy.takeDamage(dmg)
          }
        }
      }
    }

    if (this.player) {
      const dist = pos.distanceTo(this.player.camera.position)
      if (dist < this.explosionRadius) {
        const falloff = 1 - (dist / this.explosionRadius)
        const dmg = Math.floor(this.damage * falloff * 0.5)
        if (dmg > 0) this.player.takeDamage(dmg)
      }
    }
  }

  reset() {
    super.reset()
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      p.mesh.material.dispose()
    }
    this.projectiles = []
  }
}

export class WeaponManager {
  constructor(scene, camera) {
    this.scene = scene
    this.camera = camera
    this.audio = null
    this.weapons = []
    this.currentIndex = 0
    this.currentWeapon = null
    this.onShoot = null
    this.init()
  }

  init() {
    const pistol = new PulsePistol(this.scene, this.camera)
    this.weapons.push(pistol)
    const rifle = new BurstRifle(this.scene, this.camera)
    this.weapons.push(rifle)
    rifle.mesh.visible = false
    const grenade = new Grenade(this.scene, this.camera)
    this.weapons.push(grenade)
    grenade.mesh.visible = false
    this.currentWeapon = pistol
    this.setupWeaponSwitch()
  }

  setAudio(audio) {
    this.audio = audio
    for (const w of this.weapons) w.audio = audio
  }

  setupWeaponSwitch() {
    document.addEventListener('keydown', (e) => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= this.weapons.length) {
        this.switchTo(num - 1)
      }
    })
  }

  switchTo(index) {
    if (this.currentWeapon && this.currentWeapon.mesh) {
      this.currentWeapon.mesh.visible = false
    }
    this.currentIndex = index
    this.currentWeapon = this.weapons[index]
    if (this.currentWeapon && this.currentWeapon.mesh) {
      this.currentWeapon.mesh.visible = true
    }
  }

  update(delta) {
    if (this.currentWeapon) this.currentWeapon.update(delta)
  }

  shoot(enemies, camera, level) {
    if (!this.currentWeapon) return
    const hit = this.currentWeapon.shoot(enemies, camera, level)
    if (this.onShoot) this.onShoot(hit)
  }

  reset() {
    for (const w of this.weapons) {
      w.reset()
      if (w.name === '連發步槍') {
        w._reportShot = () => {}
      }
    }
    this.currentIndex = 0
    this.currentWeapon = this.weapons[0]
    for (let i = 0; i < this.weapons.length; i++) {
      if (this.weapons[i] && this.weapons[i].mesh) {
        this.weapons[i].mesh.visible = i === 0
      }
    }
  }
}