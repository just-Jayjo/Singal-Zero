import * as THREE from 'three'

export function addCombatMethods(Game) {

  Game.prototype.checkAmmoPickups = function() {
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

  Game.prototype.checkHealthPickups = function() {
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

  Game.prototype.checkGrenadePickups = function() {
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

  Game.prototype.checkDataLogs = function() {
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

  Game.prototype.showBossHealthBar = function(show) {
    const container = document.getElementById('boss-health-container')
    if (container) container.style.display = show ? 'flex' : 'none'
  }

  Game.prototype.updateBossHealthBar = function(pct) {
    const fill = document.getElementById('boss-health-fill')
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%'
  }

  Game.prototype.showDatalogPopup = function(id, name, text) {
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

  Game.prototype._playRusherBeep = function() {
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

  Game.prototype._createAmbientParticles = function() {
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

  Game.prototype._updateAmbientParticles = function(delta) {
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

  Game.prototype._showControlsHint = function() {
    const el = document.getElementById('controls-hint')
    if (!el) return
    el.classList.add('visible')
    setTimeout(() => el.classList.remove('visible'), 8000)
  }

  Game.prototype.checkEnemyCollisions = function(delta) {
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
          if (this.audio) this.audio.playDamage()
        }
        this.createEnemyBulletTrail(enemy, hit)
        enemy.shootTimer = enemy.shootCooldown
      }
    }
  }

  Game.prototype.createEnemyBulletTrail = function(enemy, hit) {
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

  Game.prototype.createExplosionEffect = function(position) {
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

  Game.prototype._createDeathDebris = function(position) {
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

  Game.prototype._updateDebris = function(delta) {
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

  Game.prototype.updateExplosions = function() {
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

  Game.prototype.updateEnemyTrails = function() {
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

  Game.prototype.onMouseDown = function(e) {
    if (this.player) this.player.onMouseDown(e)
    if (this.narrative.isActive() || this.transitioning) return
    if (e.target && e.target.closest && e.target.closest('button')) return
    if (e.button === 0 && document.pointerLockElement === this.renderer.domElement) {
      this.weaponManager.shoot(this.enemies, this.camera, this.level)
    }
  }

  Game.prototype.onPointerLockChange = function() {
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
}
