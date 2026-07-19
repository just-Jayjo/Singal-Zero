import * as THREE from 'three'
import { PatrolBot } from './patrolBot.js'
import { Rusher } from './rusher.js'

export class ShieldGuardian extends PatrolBot {
  constructor(position) {
    super(position)
    this.type = 'shieldGuardian'
    this.hp = 1000
    this.maxHp = 1000
    this.speed = 2.5
    this.damage = 6
    this.shootCooldown = 1.8
    this.shootTimer = 2.0
    this.detectionRange = 30
    this.radius = 1.2
    this.shieldActive = false
    this._shieldActivateTimer = 6
    this._shieldDuration = 5
    this._shieldActiveTimer = 0
    this._shieldMesh = null
    this._shieldDir = new THREE.Vector3(0, 0, 1)
    this.patrolBase = position.clone()
    this.phase = 1
    this._enraged = false
    this._chargeCooldown = 0
    this._charging = false
    this._chargeVelocity = new THREE.Vector3()
    this._summonCooldown = 0
    this._slamCooldown = 0
    this._burstCooldown = 0
    this._missileCooldown = 0
    this._laserCooldown = 0
    this._coreMesh = null
    this._game = null
    this._laserBeam = null
    this._laserActive = false
    this._descentProtection = 3.0
    this._deathExplosionTimer = 0
    this.createShield()
  }

  createMesh(position) {
    const group = new THREE.Group()
    const S = 2.5

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a3a28, metalness: 0.92, roughness: 0.15 })
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, metalness: 0.85, roughness: 0.25 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, metalness: 0.7, roughness: 0.4 })
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, metalness: 0.9, roughness: 0.2 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5 })
    const glowBlue = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x0088ff, emissiveIntensity: 1.0 })
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, metalness: 0.7, roughness: 0.35 })

    /* ── Torso ── */
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1 * S, 0.9 * S, 0.7 * S), bodyMat)
    torso.position.y = 0.75 * S
    torso.castShadow = true
    group.add(torso)

    /* chest trim (horizontal armor band) */
    const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.85 * S, 0.06 * S, 0.04 * S), trimMat)
    chestBand.position.set(0, 0.55 * S, -0.36 * S)
    group.add(chestBand)

    /* second chest band */
    const chestBand2 = new THREE.Mesh(new THREE.BoxGeometry(0.65 * S, 0.06 * S, 0.04 * S), trimMat)
    chestBand2.position.set(0, 0.7 * S, -0.36 * S)
    group.add(chestBand2)

    /* ── Core reactor ── */
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 3.0 })
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22 * S, 12, 12), coreMat)
    core.position.set(0, 0.85 * S, -0.36 * S)
    group.add(core)
    this._coreMesh = core

    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.32 * S, 0.02 * S, 8, 16), glowMat)
    coreRing.position.copy(core.position)
    coreRing.rotation.x = Math.PI / 2
    group.add(coreRing)

    /* ── Waist ── */
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * S, 0.55 * S, 0.2 * S, 12), armorMat)
    waist.position.y = 0.3 * S
    group.add(waist)

    const waistTrim = new THREE.Mesh(new THREE.TorusGeometry(0.5 * S, 0.015 * S, 8, 16), trimMat)
    waistTrim.position.y = 0.38 * S
    waistTrim.rotation.x = Math.PI / 2
    group.add(waistTrim)

    const hipArmor = new THREE.Mesh(new THREE.BoxGeometry(0.8 * S, 0.06 * S, 0.55 * S), armorMat)
    hipArmor.position.set(0, 0.22 * S, 0)
    group.add(hipArmor)

    /* ── Shoulders ── */
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.35 * S, 0.18 * S, 0.45 * S), armorMat)
      pauldron.position.set(side * 0.65 * S, 1.05 * S, 0)
      group.add(pauldron)

      const pTrim = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06 * S, 0.35 * S), trimMat)
      pTrim.position.set(side * 0.82 * S, 1.05 * S, 0)
      group.add(pTrim)

      const glowStripe = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04 * S, 0.25 * S), glowMat)
      glowStripe.position.set(side * 0.82 * S, 1.07 * S, 0)
      group.add(glowStripe)

      /* arm */
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * S, 0.15 * S, 0.35 * S, 8), bodyMat)
      arm.rotation.z = side * 0.2
      arm.position.set(side * 0.5 * S, 0.7 * S, 0)
      group.add(arm)
    }

    /* ── Main cannon (right) ── */
    const cannonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * S, 0.18 * S, 0.15 * S, 8), darkMat)
    cannonBase.rotation.x = Math.PI / 2
    cannonBase.position.set(-0.5 * S, 0.6 * S, -0.3 * S)
    group.add(cannonBase)

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.08 * S, 0.55 * S, 8), darkMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(-0.5 * S, 0.6 * S, -0.65 * S)
    group.add(barrel)

    const barrelTrim = new THREE.Mesh(new THREE.TorusGeometry(0.07 * S, 0.012 * S, 6, 8), trimMat)
    barrelTrim.position.set(-0.5 * S, 0.6 * S, -0.5 * S)
    barrelTrim.rotation.x = Math.PI / 2
    group.add(barrelTrim)

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.08 * S, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 }))
    muzzle.position.set(-0.5 * S, 0.6 * S, -0.92 * S)
    group.add(muzzle)

    /* left side pod */
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.08 * S, 0.25 * S, 8), armorMat)
    pod.rotation.x = Math.PI / 2
    pod.position.set(0.5 * S, 0.6 * S, -0.5 * S)
    group.add(pod)

    const podTrim = new THREE.Mesh(new THREE.TorusGeometry(0.07 * S, 0.01 * S, 6, 8), trimMat)
    podTrim.position.set(0.5 * S, 0.6 * S, -0.45 * S)
    podTrim.rotation.x = Math.PI / 2
    group.add(podTrim)

    const podTip = new THREE.Mesh(new THREE.SphereGeometry(0.05 * S, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x0088ff, emissiveIntensity: 1.2 }))
    podTip.position.set(0.5 * S, 0.6 * S, -0.62 * S)
    group.add(podTip)

    /* ── Head ── */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4 * S, 0.3 * S, 0.4 * S), bodyMat)
    head.position.y = 1.2 * S
    group.add(head)

    /* jaw plate */
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, 0.06 * S, 0.02 * S), armorMat)
    jaw.position.set(0, 1.08 * S, -0.21 * S)
    group.add(jaw)

    /* T-visor */
    const visorH = new THREE.Mesh(new THREE.BoxGeometry(0.35 * S, 0.04 * S, 0.02 * S), glowBlue)
    visorH.position.set(0, 1.22 * S, -0.21 * S)
    group.add(visorH)

    const visorV = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.12 * S, 0.02 * S), glowBlue)
    visorV.position.set(0, 1.19 * S, -0.21 * S)
    group.add(visorV)

    /* crown/halo */
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.3 * S, 0.02 * S, 8, 16), glowMat)
    crownRing.position.y = 1.45 * S
    crownRing.rotation.x = Math.PI / 6
    group.add(crownRing)

    /* ── Backpack ── */
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.6 * S, 0.35 * S, 0.25 * S), armorMat)
    bp.position.set(0, 0.8 * S, 0.4 * S)
    group.add(bp)

    const bpTrim = new THREE.Mesh(new THREE.BoxGeometry(0.55 * S, 0.02 * S, 0.01), trimMat)
    bpTrim.position.set(0, 0.88 * S, 0.52 * S)
    group.add(bpTrim)

    const thrusterGlow = new THREE.Mesh(new THREE.BoxGeometry(0.3 * S, 0.02 * S, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 }))
    thrusterGlow.position.set(0, 0.92 * S, 0.52 * S)
    group.add(thrusterGlow)

    /* ── Legs ── */
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.35 * S, 0.2 * S), armorMat)
      thigh.position.set(side * 0.35 * S, 0.02 * S, 0)
      group.add(thigh)

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08 * S, 6, 6), jointMat)
      knee.position.set(side * 0.35 * S, -0.15 * S, 0)
      group.add(knee)

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.15 * S, 0.18 * S), bodyMat)
      shin.position.set(side * 0.35 * S, -0.22 * S, 0)
      group.add(shin)

      const shinTrim = new THREE.Mesh(new THREE.BoxGeometry(0.16 * S, 0.02 * S, 0.01), trimMat)
      shinTrim.position.set(side * 0.35 * S, -0.18 * S, -0.1 * S)
      group.add(shinTrim)

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, 0.06 * S, 0.3 * S), armorMat)
      foot.position.set(side * 0.35 * S, -0.28 * S, 0.04 * S)
      group.add(foot)
    }

    /* ── Orbiting energy ring ── */
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.8 * S, 0.015 * S, 8, 24), glowBlue)
    orbRing.position.y = 1.0 * S
    orbRing.rotation.x = Math.PI / 3
    orbRing.rotation.z = 0.3
    group.add(orbRing)
    this._orbRing = orbRing

    group.position.copy(position)
    this.mesh = group
  }

  createShield() {
    const geo = new THREE.SphereGeometry(2.2, 20, 20)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff4400,
      emissiveIntensity: 1.5, transparent: true,
      opacity: 0.2, side: THREE.DoubleSide,
      wireframe: false
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = 1.2
    this.mesh.add(mesh)
    this._shieldMesh = mesh

    const ringGeo = new THREE.TorusGeometry(2.3, 0.03, 10, 28)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff4400,
      emissiveIntensity: 1.0, transparent: true, opacity: 0.4
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.y = 1.2
    ring.rotation.x = Math.PI / 2
    this.mesh.add(ring)
    this._shieldRing = ring

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.015, 10, 28),
      new THREE.MeshStandardMaterial({
        color: 0xff8800, emissive: 0xff6600,
        emissiveIntensity: 0.6, transparent: true, opacity: 0.25
      }))
    ring2.position.y = 1.2
    ring2.rotation.z = Math.PI / 3
    this.mesh.add(ring2)
    this._shieldRing2 = ring2
  }

  updateShield() {
    const dirToPlayer = new THREE.Vector3().subVectors(
      this._lastPlayerPos || new THREE.Vector3(0, 0, 0),
      this.mesh.position
    ).normalize()

    if (this.shieldActive) {
      this._shieldActiveTimer -= 0.016
      if (this._shieldActiveTimer <= 0) {
        this.shieldActive = false
        this._shieldActivateTimer = 8 + Math.random() * 4
        if (this._shieldMesh) {
          this._shieldMesh.material.opacity = 0.02
          this._shieldMesh.material.emissiveIntensity = 0.1
        }
        this._hideShieldHint()
      } else {
        if (this._shieldMesh) {
          this._shieldMesh.material.opacity = 0.25 + Math.sin(Date.now() * 0.005) * 0.05
          this._shieldMesh.material.emissiveIntensity = 1.5
          this._shieldMesh.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.02)
        }
        if (this._shieldRing) {
          this._shieldRing.rotation.z += 0.03
        }
        if (this._shieldRing2) {
          this._shieldRing2.rotation.y += 0.02
          this._shieldRing2.rotation.x += 0.015
        }
      }
      if (this._orbRing) {
        this._orbRing.rotation.y += 0.01
        this._orbRing.rotation.z += 0.005
      }
    } else {
      this._shieldActivateTimer -= 0.016
      if (this._shieldActivateTimer <= 0) {
        this.shieldActive = true
        this._shieldActiveTimer = this._shieldDuration
        if (this._shieldMesh) {
          this._shieldMesh.material.opacity = 0.35
          this._shieldMesh.material.emissiveIntensity = 2.0
        }
        this._showShieldHint()
      } else {
        if (this._shieldMesh) {
          this._shieldMesh.material.opacity = 0.02
          this._shieldMesh.material.emissiveIntensity = 0.1
        }
      }
    }
  }

  _showShieldHint() {
    if (!this._game) return
    const hud = document.getElementById('hud')
    if (!hud) return
    const existing = document.getElementById('shield-hint')
    if (existing) existing.remove()
    const hint = document.createElement('div')
    hint.id = 'shield-hint'
    hint.textContent = '防護罩啟動 — 切換 3 號武器使用脈衝炸彈破解'
    Object.assign(hint.style, {
      position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '25', fontSize: '1rem', color: '#ff8800', letterSpacing: '0.15em',
      textShadow: '0 0 20px rgba(255,136,0,0.5)',
      fontFamily: "'Courier New', monospace", pointerEvents: 'none',
      opacity: '1', transition: 'opacity 0.5s ease',
      background: 'rgba(0,0,0,0.6)', padding: '10px 20px',
      border: '1px solid rgba(255,136,0,0.3)'
    })
    document.body.appendChild(hint)
    setTimeout(() => { const el = document.getElementById('shield-hint'); if (el) el.style.opacity = '0.7' }, 100)
  }

  _hideShieldHint() {
    const el = document.getElementById('shield-hint')
    if (el) {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 500)
    }
  }

  takeDamage(amount) {
    if (this.dead) return
    if (this.shieldActive) {
      this.hp -= Math.round(amount / 5)
      if (this._shieldMesh) {
        this._shieldMesh.material.opacity = 0.5
        setTimeout(() => {
          if (this._shieldMesh && this.shieldActive) this._shieldMesh.material.opacity = 0.25
        }, 100)
      }
      return
    }
    if (this._descentProtection > 0) {
      this.hp -= Math.round(amount / 5)
      return
    }
    this.hp -= amount
    this.state = 'chase'
    this.alertTimer = 8
    const ratio = this.hp / this.maxHp
    if (ratio <= 0.5 && !this._enraged) {
      this._enraged = true
      this.phase = 2
      this.speed = 3.2
      this.shootCooldown = 1.2
      this.damage = 9
      if (this._coreMesh) {
        this._coreMesh.material.emissiveIntensity = 4.0
      }
    }
    if (this.hp <= 0) {
      this.die()
    }
  }

  takeGrenadeDamage(amount) {
    if (this.dead) return
    if (this.shieldActive) {
      this.shieldActive = false
      this._shieldActivateTimer = 8 + Math.random() * 4
      this._hideShieldHint()
      if (this._shieldMesh) {
        this._shieldMesh.material.opacity = 0.02
        this._shieldMesh.material.emissiveIntensity = 0.1
      }
      this.hp -= amount
      const ratio = this.hp / this.maxHp
      if (ratio <= 0.5 && !this._enraged) {
        this._enraged = true
        this.phase = 2
        this.speed = 3.2
        this.shootCooldown = 1.2
        this.damage = 9
        if (this._coreMesh) this._coreMesh.material.emissiveIntensity = 4.0
      }
      if (this.hp <= 0) this.die()
    } else {
      this.takeDamage(amount)
    }
  }

  update(delta, player, level) {
    if (this.dead) {
      this.deathTimer -= delta
      this._deathVelocity += delta * 2
      this._deathExplosionTimer -= delta
      if (this.mesh) {
        this.mesh.rotation.x += this._deathVelocity * delta * 0.5
        this.mesh.position.y -= delta * 2.0
        if (this._shieldMesh) this._shieldMesh.visible = false
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.opacity = Math.max(0, this.deathTimer / 2.0)
            child.material.transparent = true
          }
        })
      }
      if (this._deathExplosionTimer <= 0) {
        this._deathExplosionTimer = 0.2 + Math.random() * 0.15
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 2.5,
          (Math.random() - 0.5) * 2
        )
        this._createExplosion(this.mesh.position.clone().add(offset))
        if (this.mesh.parent || this.mesh.scene) {
          const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
          )
          spark.position.copy(this.mesh.position).add(offset)
          const scene = this.mesh.parent || this.mesh.scene
          if (scene) {
            scene.add(spark)
            const dir = offset.clone().normalize()
            let t = 0
            const iv = setInterval(() => {
              t += 0.016
              spark.position.add(dir.clone().multiplyScalar(3 * 0.016))
              if (t >= 0.5) {
                clearInterval(iv)
                scene.remove(spark)
                spark.geometry.dispose()
                spark.material.dispose()
              }
            }, 16)
          }
        }
      }
      if (this.deathTimer <= 0) {
        this._createExplosion(this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)))
        setTimeout(() => {
          this._createExplosion(this.mesh.position.clone().add(new THREE.Vector3(1, 0.5, 0.5)))
          this._createExplosion(this.mesh.position.clone().add(new THREE.Vector3(-1, 0.5, -0.5)))
        }, 100)
        setTimeout(() => {
          this._createExplosion(this.mesh.position.clone().add(new THREE.Vector3(0.5, 1.8, -0.5)))
          this._createExplosion(this.mesh.position.clone().add(new THREE.Vector3(-0.5, 0.2, 0.5)))
        }, 200)
        this.deathDone = true
      }
      return
    }

    if (this._descentProtection > 0) {
      this._descentProtection -= delta
    }

    this._lastPlayerPos = player.camera.position.clone()
    this.shootTimer -= delta
    this._chargeCooldown -= delta
    this._summonCooldown -= delta
    this._slamCooldown -= delta
    this._burstCooldown -= delta
    this._missileCooldown -= delta
    this._laserCooldown -= delta
    this.updateShield()

    const playerDist = this.mesh.position.distanceTo(player.camera.position)

    if (this._laserActive) {
      this._updateLaserBeam(delta, player)
    }

    if (this._charging) {
      this.mesh.position.add(this._chargeVelocity.clone().multiplyScalar(delta))
      if (this._chargeCooldown <= 0 || playerDist > 2.5) {
        this._charging = false
      }
      if (playerDist < 1.8) {
        player.takeDamage(this.damage)
        this._charging = false
        this._chargeCooldown = 2.0
      }
      this.mesh.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3().subVectors(player.camera.position, this.mesh.position).setY(0).normalize()
        ),
        delta * 4
      )
      return
    }

    if (playerDist < this.detectionRange) {
      this.state = 'chase'
      this.lastKnownPlayerPos = player.camera.position.clone()
      this.chase(delta, player.camera.position, level)

      if (this._slamCooldown <= 0 && playerDist < 7) {
        this._slamCooldown = this._enraged ? 5.0 : 6.0
        this._groundSlam(player)
      }

      if (this._burstCooldown <= 0 && playerDist < 25 && this.hasLineOfSight(player, level)) {
        this._burstCooldown = 12.0
        const boxes = level.collisionBoxes
        const count = 2
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            if (!this.dead) this._fireCannon(player, boxes)
          }, i * 150)
        }
      }

      if (this._enraged && this._missileCooldown <= 0 && playerDist < 25) {
        this._missileCooldown = 16.0
        this._fireMissileVolley(player, level.collisionBoxes)
      }

      if (this._enraged && this._laserCooldown <= 0 && !this._laserActive && playerDist < 15) {
        this._laserCooldown = 15.0
        this._startLaserBeam(player)
      }

      if (this._chargeCooldown <= 0 && playerDist < 15 && playerDist > 4) {
        this._charging = true
        this._chargeCooldown = this._enraged ? 7.0 : 10.0
        const dir = new THREE.Vector3().subVectors(player.camera.position, this.mesh.position).setY(0).normalize()
        this._chargeVelocity.copy(dir.multiplyScalar(this._enraged ? 10 : 7))
        return
      }

      if (this.shootTimer <= 0 && playerDist < 25 && this.hasLineOfSight(player, level)) {
        this.shootTimer = this.shootCooldown
        const boxes = level.collisionBoxes
        this._fireCannon(player, boxes)
        if (this._enraged) {
          setTimeout(() => {
            const spread = new THREE.Vector3().subVectors(player.camera.position, this.mesh.position).normalize()
            spread.x += (Math.random() - 0.5) * 0.15
            spread.z += (Math.random() - 0.5) * 0.15
            spread.normalize()
            this._fireCannonDir(player, spread, boxes)
          }, 200)
        }
      }

      if (this._summonCooldown <= 0) {
        this._summonCooldown = this._enraged ? 10.0 : 10.0
        this._summonMinions()
      }
    } else if (this.state === 'chase') {
      this.alertTimer -= delta
      if (this.alertTimer <= 0) this.state = 'patrol'
    }

    this.mesh.quaternion.slerp(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3().subVectors(player.camera.position, this.mesh.position).setY(0).normalize()
      ),
      delta * 2
    )
  }

  _fireCannon(player, collisionBoxes) {
    const start = this.mesh.position.clone().add(new THREE.Vector3(-0.6 * 2.5, 0.5 * 2.5, -0.7 * 2.5))
    const dir = new THREE.Vector3().subVectors(player.camera.position, start).normalize()

    const trailMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.9 })
    const trail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), trailMat)
    trail.position.copy(start)
    if (this.mesh.parent) this.mesh.parent.add(trail)
    else if (this.mesh.scene) this.mesh.scene.add(trail)

    const speed = 28
    const travelTime = 1.8
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 0.016
      const t = elapsed / travelTime
      const pos = trail.position.clone().add(dir.clone().multiplyScalar(speed * 0.016))
      if (collisionBoxes) {
        for (const box of collisionBoxes) {
          const test = box.clone()
          test.expandByScalar(0.3)
          if (test.containsPoint(pos)) {
            clearInterval(interval)
            trail.parent?.remove(trail)
            trail.geometry.dispose()
            trail.material.dispose()
            return
          }
        }
      }
      trail.position.copy(pos)
      const hitDist = player.camera.position.distanceTo(trail.position)
      if (hitDist < 1.2) {
        clearInterval(interval)
        player.takeDamage(this.damage)
        this._createExplosion(trail.position)
        trail.parent?.remove(trail)
        trail.geometry.dispose()
        trail.material.dispose()
        return
      }
      if (t >= 1) {
        clearInterval(interval)
        this._createExplosion(trail.position)
        trail.parent?.remove(trail)
        trail.geometry.dispose()
        trail.material.dispose()
        return
      }
    }, 16)
  }

  _createExplosion(pos) {
    const geo = new THREE.SphereGeometry(0.3, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 1 })
    const exp = new THREE.Mesh(geo, mat)
    exp.position.copy(pos)
    const scene = this.mesh.parent || this.mesh.scene
    if (scene) scene.add(exp)
    let t = 0
    const iv = setInterval(() => {
      t += 0.016
      if (t >= 0.3) {
        clearInterval(iv)
        exp.parent?.remove(exp)
        exp.geometry.dispose()
        exp.material.dispose()
        return
      }
      exp.scale.setScalar(1 + t * 10)
      exp.material.opacity = 1 - t / 0.3
    }, 16)
  }

  _fireCannonDir(player, dir, collisionBoxes) {
    const start = this.mesh.position.clone().add(new THREE.Vector3(-0.6 * 2.5, 0.5 * 2.5, -0.7 * 2.5))
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 })
    const trail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), trailMat)
    trail.position.copy(start)
    if (this.mesh.parent) this.mesh.parent.add(trail)
    else if (this.mesh.scene) this.mesh.scene.add(trail)

    const speed = 28
    const travelTime = 1.8
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 0.016
      const t = elapsed / travelTime
      const pos = trail.position.clone().add(dir.clone().multiplyScalar(speed * 0.016))
      if (collisionBoxes) {
        for (const box of collisionBoxes) {
          const test = box.clone()
          test.expandByScalar(0.3)
          if (test.containsPoint(pos)) {
            clearInterval(interval)
            trail.parent?.remove(trail)
            trail.geometry.dispose()
            trail.material.dispose()
            return
          }
        }
      }
      trail.position.copy(pos)
      const hitDist = player.camera.position.distanceTo(trail.position)
      if (hitDist < 1.2) {
        clearInterval(interval)
        player.takeDamage(this.damage)
        this._createExplosion(trail.position)
        trail.parent?.remove(trail)
        trail.geometry.dispose()
        trail.material.dispose()
        return
      }
      if (t >= 1) {
        clearInterval(interval)
        this._createExplosion(trail.position)
        trail.parent?.remove(trail)
        trail.geometry.dispose()
        trail.material.dispose()
        return
      }
    }, 16)
  }

  _summonMinions() {
    if (!this._game || !this._game.scene || !this._game.enemies) return
    const count = 2
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        this.mesh.position.x + (Math.random() - 0.5) * 6,
        0,
        this.mesh.position.z + (Math.random() - 0.5) * 6
      )
      const rusher = new Rusher(pos)
      rusher.hp = Math.round(rusher.maxHp * (this._enraged ? 1.5 : 1.3))
      rusher.damage = Math.round(rusher.damage * (this._enraged ? 1.3 : 1.2))
      this._game.scene.add(rusher.mesh)
      this._game.enemies.push(rusher)
    }
  }

  _groundSlam(player) {
    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return

    const hud = document.getElementById('hud')
    if (hud) {
      const hint = document.createElement('div')
      hint.id = 'jump-hint'
      hint.textContent = '␣ 跳躍閃避'
      Object.assign(hint.style, {
        position: 'fixed', bottom: '140px', left: '50%', transform: 'translateX(-50%)',
        zIndex: '20', fontSize: '1.1rem', color: '#ff8800', letterSpacing: '0.2em',
        textShadow: '0 0 20px rgba(255,136,0,0.4)',
        opacity: '0', transition: 'opacity 0.3s ease',
        fontFamily: "'Courier New', monospace", pointerEvents: 'none'
      })
      document.body.appendChild(hint)
      setTimeout(() => hint.style.opacity = '1', 50)
    }

    const warnMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.15 })
    const warning = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.5, 32), warnMat)
    warning.rotation.x = -Math.PI / 2
    warning.position.copy(this.mesh.position)
    warning.position.y = 0.03
    scene.add(warning)
    let warnTimer = 0
    const warnIv = setInterval(() => {
      warnTimer += 0.016
      warning.scale.setScalar(1 + warnTimer * 2)
      warning.material.opacity = 0.08 + Math.sin(warnTimer * 20) * 0.06
      if (warnTimer >= 0.5) {
        const hintEl = document.getElementById('jump-hint')
        if (hintEl) { hintEl.style.opacity = '0'; setTimeout(() => hintEl.remove(), 300) }
        clearInterval(warnIv)
        warning.parent?.remove(warning)
        warning.geometry.dispose()
        warning.material.dispose()

        const slamDist = player.camera.position.distanceTo(this.mesh.position)
        if (slamDist < 6 && (!player._isAirborne)) {
          player.takeDamage(this._enraged ? 8 : 5)
        }

        const expMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 1, 24), expMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.copy(this.mesh.position)
        ring.position.y = 0.05
        scene.add(ring)
        let t = 0
        const iv = setInterval(() => {
          t += 0.016
          if (t >= 0.6) {
            clearInterval(iv)
            ring.parent?.remove(ring)
            ring.geometry.dispose()
            ring.material.dispose()
            return
          }
          const s = 1 + t * 8
          ring.scale.setScalar(s)
          ring.material.opacity = 0.3 * (1 - t / 0.6)
        }, 16)
      }
    }, 16)
  }

  _fireMissileVolley(player, collisionBoxes) {
    const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, -1.5))
    const count = 3
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.dead) return
        const spread = 3 + Math.random() * 4
        const target = new THREE.Vector3(
          player.camera.position.x + (Math.random() - 0.5) * spread,
          player.camera.position.y,
          player.camera.position.z + (Math.random() - 0.5) * spread
        )
        const dir = new THREE.Vector3().subVectors(target, origin).normalize()
        const trailMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.9 })
        const trail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), trailMat)
        trail.position.copy(origin)
        const scene = this.mesh.parent || this.mesh.scene
        if (scene) scene.add(trail)
        const speed = 18
        const lifetime = 1.5
        let elapsed = 0
        const iv = setInterval(() => {
          elapsed += 0.016
          if (elapsed >= lifetime || this.dead) {
            clearInterval(iv)
            trail.parent?.remove(trail)
            trail.geometry.dispose()
            trail.material.dispose()
            return
          }
          const pos = trail.position.clone().add(dir.clone().multiplyScalar(speed * 0.016))
          if (collisionBoxes) {
            for (const box of collisionBoxes) {
              const test = box.clone()
              test.expandByScalar(0.3)
              if (test.containsPoint(pos)) {
                clearInterval(iv)
                trail.parent?.remove(trail)
                trail.geometry.dispose()
                trail.material.dispose()
                return
              }
            }
          }
          trail.position.copy(pos)
          const hitDist = player.camera.position.distanceTo(trail.position)
          if (hitDist < 1.8) {
            player.takeDamage(this.damage + 3)
            clearInterval(iv)
            trail.parent?.remove(trail)
            trail.geometry.dispose()
            trail.material.dispose()
          }
        }, 16)
      }, i * 150)
    }
  }

  _startLaserBeam(player) {
    this._laserActive = true
    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5 })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 12, 6), beamMat)
    beam.position.copy(this.mesh.position)
    beam.position.y = 1.0
    beam.lookAt(player.camera.position)
    beam.rotateX(Math.PI / 2)
    scene.add(beam)
    this._laserBeam = beam
    this._laserTimer = 1.5
  }

  _updateLaserBeam(delta, player) {
    if (!this._laserBeam || this.dead) {
      this._laserActive = false
      return
    }
    this._laserTimer -= delta
    this._laserBeam.lookAt(player.camera.position)
    this._laserBeam.rotateX(Math.PI / 2)
    const dist = this.mesh.position.distanceTo(player.camera.position)
    if (dist < 3.5) {
      player.takeDamage(10 * delta)
    }
    if (this._laserTimer <= 0) {
      this._laserBeam.parent?.remove(this._laserBeam)
      this._laserBeam.geometry.dispose()
      this._laserBeam.material.dispose()
      this._laserBeam = null
      this._laserActive = false
    }
  }

  die() {
    this.dead = true
    this.deathTimer = 2.0
    this.deathDone = false
    this._deathVelocity = 0
    this._charging = false
    this._laserActive = false
    if (this._laserBeam) {
      this._laserBeam.parent?.remove(this._laserBeam)
      this._laserBeam = null
    }
    if (this._shieldMesh) this._shieldMesh.visible = false
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(0xff2200)
          child.material.emissiveIntensity = 3.0
          child.material.needsUpdate = true
        }
      })
    }
  }
}
