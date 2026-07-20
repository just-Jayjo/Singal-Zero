import * as THREE from 'three'
import { Rusher } from './rusher.js'
import { PatrolBot } from './patrolBot.js'
import { Sniper } from './sniper.js'

export class SignalCore {
  constructor(position) {
    this.type = 'signalCore'
    this.mesh = null
    this.hp = 2000
    this.maxHp = 2000
    this.dead = false
    this.deathDone = false
    this.deathTimer = 4.0
    this._deathVelocity = 0
    this.phase = 1
    this.phaseTransitioning = false
    this._playerPos = new THREE.Vector3()
    this._game = null

    this._projectiles = []
    this._orbitalRings = []
    this._shockwaves = []
    this._vortexActive = false
    this._vortexTimer = 0
    this._vortexPullTarget = new THREE.Vector3()
    this._coreGlow = null
    this._coreMesh = null
    this._coreInner = null
    this._laserActive = false
    this._laserBeam = null
    this._laserAngle = 0

    this.shootTimer = 1.5
    this.orbitalTimer = 99.0
    this.pulseTimer = 99.0
    this.summonTimer = 99.0
    this.vortexTimer = 99.0
    this.missileTimer = 99.0
    this.laserTimer = 99.0
    this.trackTimer = 0
    this._lastSfxTime = 0

    this.createMesh(position)
  }

  createMesh(position) {
    const group = new THREE.Group()
    const S = 1.0

    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0510, metalness: 0.9, roughness: 0.1 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x00aaff, emissiveIntensity: 2.0 })
    const pulseMat = new THREE.MeshStandardMaterial({ color: 0xff4488, emissive: 0xff2266, emissiveIntensity: 1.5 })
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x4466aa, emissive: 0x2244aa, emissiveIntensity: 0.8, transparent: true, opacity: 0.4, side: THREE.DoubleSide })

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.15, 12), darkMat)
    base.position.y = -0.1
    group.add(base)

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 12), darkMat)
    pedestal.position.y = 0.05
    group.add(pedestal)

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f2ff, emissive: 0x00aaff,
      emissiveIntensity: 3.0, transparent: true, opacity: 0.9
    })
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), coreMat)
    core.position.y = 0.5
    group.add(core)
    this._coreMesh = core

    const coreInner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x88ddff, emissiveIntensity: 4.0 })
    )
    coreInner.position.y = 0.5
    group.add(coreInner)
    this._coreInner = coreInner

    const glowGeo = new THREE.SphereGeometry(0.5, 16, 16)
    const glowMat2 = new THREE.MeshStandardMaterial({
      color: 0x00f2ff, emissive: 0x00aaff,
      emissiveIntensity: 1.0, transparent: true, opacity: 0.1
    })
    const glow = new THREE.Mesh(glowGeo, glowMat2)
    glow.position.y = 0.5
    group.add(glow)
    this._coreGlow = glow

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6 + i * 0.15, 0.02, 8, 24), ringMat)
      ring.position.y = 0.5
      ring.rotation.x = Math.PI / 3 + i * Math.PI / 4
      ring.rotation.y = i * Math.PI / 3
      group.add(ring)
      this._orbitalRings.push({ mesh: ring, speed: 0.3 + i * 0.2, tilt: i })
    }

    const columnMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, metalness: 0.8, roughness: 0.2 })
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), columnMat)
      col.position.set(Math.cos(angle) * 0.45, 0.2, Math.sin(angle) * 0.45)
      group.add(col)

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pulseMat)
      tip.position.set(Math.cos(angle) * 0.45, 0.55, Math.sin(angle) * 0.45)
      group.add(tip)
    }

    group.position.copy(position)
    this.mesh = group
  }

  _getPhaseHpThresholds() {
    return { phase2: 0.50, phase3: 0.25 }
  }

  takeDamage(amount) {
    if (this.dead || this.phaseTransitioning) return
    this.hp -= amount
    const ratio = this.hp / this.maxHp
    const thresh = this._getPhaseHpThresholds()
    if (this._game && this._game.audio && performance.now() - this._lastSfxTime > 800) {
      this._game.audio.playSFX('bossGrowl')
      this._lastSfxTime = performance.now()
    }

    if (ratio <= 0) {
      this.hp = 0
      this.die()
      return
    }

    if (ratio <= thresh.phase3 && this.phase < 3) {
      this._transitionPhase(3)
    } else if (ratio <= thresh.phase2 && this.phase < 2) {
      this._transitionPhase(2)
    }
  }

  _transitionPhase(newPhase) {
    this.phaseTransitioning = true
    this.phase = newPhase
    this.shootTimer = 2.0
    if (this._game && this._game.audio) {
      this._game.audio.playSFX('bossRoar')
    }

    if (this._coreGlow) {
      const color = newPhase === 2 ? 0xff4488 : 0xff0000
      this._coreGlow.material.color.setHex(color)
      this._coreGlow.material.emissive.setHex(color)
      this._coreGlow.material.emissiveIntensity = 2.0
    }
    if (this._coreMesh) {
      const color = newPhase === 2 ? 0xff4488 : 0xff0000
      this._coreMesh.material.color.setHex(color)
      this._coreMesh.material.emissive.setHex(color)
    }

    if (newPhase === 3) {
      if (this._coreMesh) this._coreMesh.material.emissiveIntensity = 5.0
      if (this._coreInner) {
        this._coreInner.material.color.setHex(0xffffff)
        this._coreInner.material.emissive.setHex(0xff4400)
        this._coreInner.material.emissiveIntensity = 6.0
      }
    }

    this._fireNova(12)

    setTimeout(() => {
      this.phaseTransitioning = false
    }, 1500)
  }

  update(delta, player, level) {
    this._playerPos.copy(player.camera.position)
    const dist = this.mesh.position.distanceTo(player.camera.position)

    if (this.dead) {
      this.deathTimer -= delta
      this._deathVelocity += delta * 3

      if (this._laserBeam) {
        this._laserBeam.parent?.remove(this._laserBeam)
        this._laserBeam = null
      }
      this._laserActive = false

      if (this.mesh) {
        this.mesh.rotation.y += delta * 0.5
        this.mesh.position.y -= delta * 0.3
        if (this._coreMesh) {
          this._coreMesh.scale.setScalar(1 + Math.sin(this.deathTimer * 10) * 0.1 * this.deathTimer)
        }
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true
            child.material.opacity = Math.max(0, this.deathTimer / 4.0)
          }
        })
      }

      if (this._coreGlow) {
        this._coreGlow.scale.setScalar(1 + (4 - this.deathTimer) * 2)
        this._coreGlow.material.opacity = Math.max(0, this.deathTimer / 4.0) * 0.3
      }

      if (this.deathTimer <= 0) {
        this.deathDone = true
      }
      return
    }

    this._updateOrbitalRings(delta)
    this._updateCorePulse(delta)
    this._updateShockwaves(delta, player)
    this._updateVortex(delta, player)

    if (this.phaseTransitioning) {
      this._coreMesh.rotation.x += delta * 3
      this._coreMesh.rotation.z += delta * 2
      return
    }

    this.shootTimer -= delta
    if (this.shootTimer <= 0 && dist < 40) {
      this._fireAimedShot()
      const cooldowns = [0.8, 0.9, 1.0]
      this.shootTimer = cooldowns[Math.min(this.phase - 1, cooldowns.length - 1)]
    }

    this.trackTimer -= delta
    if (this.trackTimer <= 0 && dist < 40) {
      this._fireTrackingOrbs()
      this.trackTimer = this.phase === 1 ? 3.5 : (this.phase === 2 ? 3.0 : 2.5)
    }

    if (this.phase >= 2) {
      this.orbitalTimer -= delta
      if (this.orbitalTimer <= 0 && dist < 40) {
        this._fireOrbitalBurst()
        this.orbitalTimer = this.phase === 2 ? 9.0 : 7.0
      }

      this.pulseTimer -= delta
      if (this.pulseTimer <= 0 && dist < 40) {
        this._firePulseWave()
        this.pulseTimer = this.phase === 2 ? 10.0 : 8.0
      }

      this.summonTimer -= delta
      if (this.summonTimer <= 0) {
        this._summonMinions()
        this.summonTimer = 18.0
      }

      this.missileTimer -= delta
      if (this.missileTimer <= 0 && dist < 40) {
        this._fireMissiles()
        this.missileTimer = 14.0
      }
    }

    if (this.phase === 3) {
      this.laserTimer -= delta
      this.vortexTimer -= delta

      if (this.laserTimer <= 0 && dist < 35) {
        this._startLaserSweep(player)
        this.laserTimer = 8.0
      }

      if (this.vortexTimer <= 0 && dist < 20 && !this._vortexActive) {
        this._startVortex(player)
        this.vortexTimer = 14.0
      }

      if (!this._laserActive && dist < 6) {
        player.takeDamage(4 * delta)
      }
    }

    if (this._laserActive) {
      this._updateLaserSweep(delta, player)
    }
  }

  updateProjectiles(delta, collisionBoxes) {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i]
      p.lifetime -= delta

      if (p.tracking) {
        const toPlayer = new THREE.Vector3().subVectors(this._playerPos, p.mesh.position).normalize()
        p.dir.lerp(toPlayer, delta * p.trackStrength * 0.5).normalize()
        if (p.trackStrength > 0) p.trackStrength -= delta * 0.8
      }

      const nextPos = p.mesh.position.clone().add(p.dir.clone().multiplyScalar(p.speed * delta))

      if (collisionBoxes) {
        let hitWall = false
        for (const box of collisionBoxes) {
          const test = box.clone()
          test.expandByScalar(0.25)
          if (test.containsPoint(nextPos)) {
            hitWall = true
            break
          }
        }
        if (hitWall) {
          this._removeProjectile(i)
          continue
        }
      }

      p.mesh.position.copy(nextPos)
      p.mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.02) * 0.2)

      const playerDist = p.mesh.position.distanceTo(this._playerPos)
      if (playerDist < 1.5 && p.lifetime > 0) {
        this._hitPlayer(p)
        this._removeProjectile(i)
        continue
      }

      if (p.lifetime <= 0 || p.mesh.position.length() > 35) {
        this._removeProjectile(i)
      }
    }
  }

  _updateOrbitalRings(delta) {
    for (const r of this._orbitalRings) {
      r.mesh.rotation.x += delta * r.speed
      r.mesh.rotation.y += delta * r.speed * 0.7
      const pulse = 1 + Math.sin(Date.now() * 0.002 + r.tilt) * 0.05
      r.mesh.scale.setScalar(pulse)
    }
  }

  _updateCorePulse(delta) {
    if (!this._coreMesh) return
    const pulse = 1 + Math.sin(Date.now() * 0.003 * this.phase) * 0.04 * this.phase
    this._coreMesh.scale.setScalar(pulse)
    if (this._coreInner) {
      this._coreInner.scale.setScalar(1 + Math.sin(Date.now() * 0.005 * this.phase) * 0.1)
    }
    if (this._coreGlow) {
      const intensity = this.phase === 3 ? 0.3 : 0.1
      this._coreGlow.material.opacity = intensity + Math.sin(Date.now() * 0.004) * 0.05
      const s = 1 + Math.sin(Date.now() * 0.002) * 0.1 * this.phase
      this._coreGlow.scale.setScalar(s)
    }
  }

  _updateShockwaves(delta, player) {
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i]
      sw.life -= delta
      sw.radius += delta * sw.speed

      sw.mesh.scale.setScalar(sw.radius / sw.baseRadius)
      sw.mesh.material.opacity = Math.max(0, sw.life / sw.maxLife) * 0.4

      const playerDist = this.mesh.position.distanceTo(player.camera.position)
      if (!sw.hasHit && Math.abs(playerDist - sw.radius) < 0.5 && playerDist < 25) {
        sw.hasHit = true
        if (this._game && this._game.player) {
          this._game.player.takeDamage(sw.damage)
          if (this._game.hud) this._game.hud.showDamage()
        }
      }

      if (sw.life <= 0) {
        sw.mesh.parent?.remove(sw.mesh)
        sw.mesh.geometry.dispose()
        sw.mesh.material.dispose()
        this._shockwaves.splice(i, 1)
      }
    }
  }

  _updateVortex(delta, player) {
    if (!this._vortexActive) return
    this._vortexTimer -= delta

    const dir = new THREE.Vector3().subVectors(this.mesh.position, player.camera.position)
    const dist = dir.length()
    dir.y = 0
    if (dist > 0.5) {
      dir.normalize()
      const pullStrength = 4 * delta
      player.camera.position.x += dir.x * pullStrength
      player.camera.position.z += dir.z * pullStrength
    }

    if (this._vortexTimer <= 0) {
      this._vortexActive = false
      this._explodeVortex(player)
    }
  }

  _explodeVortex(player) {
    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return

    const expMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.6
    })
    const exp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), expMat)
    exp.position.copy(this.mesh.position)
    exp.position.y += 0.5
    scene.add(exp)

    let t = 0
    const iv = setInterval(() => {
      t += 0.016
      if (t >= 0.6) {
        clearInterval(iv)
        exp.parent?.remove(exp)
        exp.geometry.dispose()
        exp.material.dispose()
        return
      }
      exp.scale.setScalar(1 + t * 12)
      exp.material.opacity = 0.6 * (1 - t / 0.6)
    }, 16)

    const dist = this.mesh.position.distanceTo(player.camera.position)
    if (dist < 8 && this._game && this._game.player) {
      this._game.player.takeDamage(15)
      if (this._game.hud) this._game.hud.showDamage()
    }
  }

  /* Attack 1: Aimed projectile burst */
  _fireAimedShot() {
    const origin = this.mesh.position.clone()
    origin.y += 0.5
    const dir = new THREE.Vector3().subVectors(this._playerPos, origin).normalize()

    const counts = [2, 3, 3]
    const damages = [4, 5, 7]
    const colors = [0xff4488, 0xff2266, 0xff0000]
    const spreadAmount = [0.15, 0.25, 0.35]
    const count = counts[Math.min(this.phase - 1, counts.length - 1)]

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const s = new THREE.Vector3().subVectors(this._playerPos, origin).normalize()
        s.x += (Math.random() - 0.5) * spreadAmount[this.phase - 1]
        s.z += (Math.random() - 0.5) * spreadAmount[this.phase - 1]
        s.normalize()
        this._fireProjectile(origin, s, colors[this.phase - 1], damages[this.phase - 1])
      }, i * 150)
    }
  }

  /* Attack: Tracking homing orbs */
  _fireTrackingOrbs() {
    if (this._game && this._game.audio) this._game.audio.playSFX('bossPulse')
    const origin = this.mesh.position.clone()
    origin.y += 0.5
    const count = 2 + this.phase * 1
    const color = 0x00ffff
    const damage = 3 + this.phase
    const spread = 0.6

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * spread
      const dir = new THREE.Vector3(
        Math.cos(angle),
        (Math.random() - 0.5) * 0.2,
        Math.sin(angle)
      ).normalize()
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat)
      mesh.position.copy(origin)
      this.mesh.parent?.add(mesh)
      this._projectiles.push({
        mesh, dir: dir.clone(),
        speed: 5,
        lifetime: 5.0,
        damage,
        color,
        tracking: true,
        trackStrength: 0.8 + this.phase * 0.2
      })
    }
  }

  /* Attack 2: Orbital ring radial burst */
  _fireOrbitalBurst() {
    const origin = this.mesh.position.clone()
    origin.y += 0.5
    const countPerRing = 6 + this.phase * 2
    const damage = 3 + this.phase * 1
    const color = this.phase === 2 ? 0xff6688 : 0xff4444

    for (let ri = 0; ri < this._orbitalRings.length; ri++) {
      setTimeout(() => {
        for (let i = 0; i < countPerRing; i++) {
          const angle = (i / countPerRing) * Math.PI * 2 + Math.random() * 0.1
          const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
          this._fireProjectile(origin, dir, color, damage)
        }
      }, ri * 100)
    }
  }

  /* Attack 3: Pulse wave shockwave */
  _firePulseWave() {
    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return

    const geo = new THREE.RingGeometry(0.01, 0.5, 48)
    const mat = new THREE.MeshBasicMaterial({
      color: this.phase === 2 ? 0xff4488 : 0xff0000,
      transparent: true, opacity: 0.4, side: THREE.DoubleSide
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.copy(this.mesh.position)
    mesh.position.y += 0.5
    scene.add(mesh)

    this._shockwaves.push({
      mesh, baseRadius: 0.5, radius: 0.5,
      speed: 6 + this.phase * 1.5, life: 2.0, maxLife: 2.0,
      damage: 4 + this.phase * 2, hasHit: false
    })
  }

  /* Attack: Missile barrage */
  _fireMissiles() {
    const origin = this.mesh.position.clone()
    origin.y += 0.5
    const count = 3
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
        const spread = 5 + Math.random() * 8
        const target = new THREE.Vector3(
          this._playerPos.x + (Math.random() - 0.5) * spread,
          this._playerPos.y + (Math.random() - 0.5) * 2,
          this._playerPos.z + (Math.random() - 0.5) * spread
        )
        const dir = new THREE.Vector3().subVectors(target, origin).normalize()
        const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.9 })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat)
        mesh.position.copy(origin)
        this.mesh.parent?.add(mesh)
        const speed = 8 + Math.random() * 3
        this._projectiles.push({ mesh, dir, speed, lifetime: 3.0, damage: 10, color: 0xff8800 })
      }, i * 200)
    }
  }

  /* Attack: Laser sweep */
  _startLaserSweep(player) {
    this._laserActive = true
    this._laserAngle = 0
    this._laserDir = 1
    this._laserSweepTime = 2.0

    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return

    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.1, side: THREE.DoubleSide
    })
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.15), warnMat)
    warn.position.copy(this.mesh.position)
    warn.position.y = 0.2
    warn.lookAt(player.camera.position)
    scene.add(warn)
    this._laserWarn = warn

    let t = 0
    const iv = setInterval(() => {
      t += 0.016
      if (t >= 0.8 || !this._laserActive) {
        clearInterval(iv)
        warn.parent?.remove(warn)
        warn.geometry.dispose()
        warn.material.dispose()
        this._laserWarn = null
        if (this._laserActive) {
          this._fireLaserBeam(player)
        }
        return
      }
      warn.material.opacity = 0.1 * (Math.sin(t * 20) * 0.5 + 0.5)
    }, 16)
  }

  _fireLaserBeam(player) {
    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.6
    })
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 16, 6), beamMat)
    beam.position.copy(this.mesh.position)
    beam.position.y = 0.5
    beam.lookAt(player.camera.position)
    beam.rotateX(Math.PI / 2)
    scene.add(beam)
    this._laserBeam = beam
    this._laserAngle = 0

    const dist = this.mesh.position.distanceTo(player.camera.position)
    if (dist < 16) {
      player.takeDamage(14)
    }

    let t = 0
    const iv = setInterval(() => {
      t += 0.016
      this._laserAngle += t * 0.5
      beam.rotation.z = Math.sin(this._laserAngle) * 0.3
      if (t >= 1.5) {
        clearInterval(iv)
        beam.parent?.remove(beam)
        beam.geometry.dispose()
        beam.material.dispose()
        this._laserBeam = null
        this._laserActive = false
      }
    }, 16)
  }

  _updateLaserSweep(delta, player) {
    if (!this._laserBeam) return
    const dist = this.mesh.position.distanceTo(player.camera.position)
    if (dist < 16) {
      player.takeDamage(6 * delta)
    }
  }

  /* Attack 4: Summon minions */
  _summonMinions() {
    if (!this._game || !this._game.scene || !this._game.enemies) return
    const arenaHalf = 12
    const types = []

    if (this.phase < 3) {
      types.push('patrolBot')
    } else {
      types.push('patrolBot', 'rusher', 'sniper')
    }

    for (const type of types) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * arenaHalf * 2,
        0,
        (Math.random() - 0.5) * arenaHalf * 2
      )

      let enemy
      if (type === 'rusher') {
        enemy = new Rusher(pos)
        if (this.phase === 3) {
          enemy.hp = Math.round(enemy.maxHp * 1.3)
          enemy.damage = Math.round(enemy.damage * 1.2)
        }
      } else if (type === 'sniper') {
        enemy = new Sniper(pos)
        if (this.phase === 3) {
          enemy.hp = Math.round(enemy.maxHp * 1.2)
          enemy.damage = Math.round(enemy.damage * 1.2)
        }
      } else {
        enemy = new PatrolBot(pos)
        if (this.phase === 3) {
          enemy.hp = Math.round(enemy.maxHp * 1.5)
          enemy.damage = Math.round(enemy.damage * 1.2)
        }
      }
      this._game.scene.add(enemy.mesh)
      this._game.enemies.push(enemy)
    }
  }

  /* Attack 5: Vortex pull + explosion */
  _startVortex(player) {
    this._vortexActive = true
    this._vortexTimer = 2.0

    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return

    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0.15, side: THREE.DoubleSide
    })
    const warn = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16), warnMat)
    warn.position.copy(this.mesh.position)
    warn.position.y += 0.5
    scene.add(warn)

    let t = 0
    const iv = setInterval(() => {
      t += 0.016
      if (t >= 2.0 || this._vortexTimer <= 0) {
        clearInterval(iv)
        warn.parent?.remove(warn)
        warn.geometry.dispose()
        warn.material.dispose()
        return
      }
      warn.material.opacity = 0.15 * (1 + Math.sin(t * 8) * 0.5)
      warn.scale.setScalar(1 + t * 0.1)
    }, 16)
  }

  /* Attack 6: Nova burst (phase transition) */
  _fireNova(count) {
    const origin = this.mesh.position.clone()
    origin.y += 0.5
    const color = this.phase === 2 ? 0xff4488 : 0xff0000

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const pitch = (Math.random() - 0.5) * 0.5
      const dir = new THREE.Vector3(
        Math.cos(angle),
        pitch,
        Math.sin(angle)
      ).normalize()
      this._fireProjectile(origin, dir, color, 5)
    }
  }

  _fireProjectile(origin, dir, color, damage) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), mat)
    mesh.position.copy(origin)
    this.mesh.parent?.add(mesh)

    const speed = 14 + this.phase * 3
    const lifetime = 3.0
    this._projectiles.push({ mesh, dir: dir.clone(), speed, lifetime, damage, color })
  }

  _hitPlayer(p) {
    const game = this._game
    if (game && game.player) {
      game.player.takeDamage(p.damage || 8)
      if (game.hud) game.hud.showDamage()
    }
    const scene = this.mesh.parent || this.mesh.scene
    if (!scene) return
    const expMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 1 })
    const exp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), expMat)
    exp.position.copy(p.mesh.position)
    scene.add(exp)
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
      exp.scale.setScalar(1 + t * 8)
      exp.material.opacity = 1 - t / 0.3
    }, 16)
  }

  _removeProjectile(idx) {
    const p = this._projectiles[idx]
    if (p && p.mesh) {
      p.mesh.parent?.remove(p.mesh)
      p.mesh.geometry.dispose()
      p.mesh.material.dispose()
    }
    this._projectiles.splice(idx, 1)
  }

  clearProjectiles() {
    for (const p of this._projectiles) {
      if (p.mesh) {
        p.mesh.parent?.remove(p.mesh)
        p.mesh.geometry?.dispose()
        p.mesh.material?.dispose()
      }
    }
    this._projectiles = []

    for (const sw of this._shockwaves) {
      if (sw.mesh) {
        sw.mesh.parent?.remove(sw.mesh)
        sw.mesh.geometry?.dispose()
        sw.mesh.material?.dispose()
      }
    }
    this._shockwaves = []
  }

  die() {
    this.dead = true
    this.deathTimer = 4.0
    this.deathDone = false
    this._deathVelocity = 0
    this._vortexActive = false
    this._laserActive = false
    if (this._laserBeam) {
      this._laserBeam.parent?.remove(this._laserBeam)
      this._laserBeam = null
    }
    this.clearProjectiles()
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(0xffffff)
          child.material.emissiveIntensity = 5.0
          child.material.needsUpdate = true
        }
      })
    }
  }
}
