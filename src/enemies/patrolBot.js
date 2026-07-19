import * as THREE from 'three'

export class PatrolBot {
  constructor(position) {
    this.type = 'patrolBot'
    this.mesh = null
    this.hp = 40
    this.maxHp = 40
    this.speed = 2.5
    this.damage = 5
    this.dead = false
    this.canShoot = true
    this.shootCooldown = 1.5
    this.shootTimer = this.shootCooldown
    this.detectionRange = 14
    this.patrolPoints = []
    this.currentPatrolIndex = 0
    this.patrolWaitTimer = 0
    this.state = 'patrol'
    this.createMesh(position)
    this.alertTimer = 0
    this.lastKnownPlayerPos = null
    this.radius = 0.9
    this._strafeAngle = Math.random() * Math.PI * 2
    this.flankDir = Math.random() > 0.5 ? 1 : -1
  }

  createMesh(position) {
    const group = new THREE.Group()

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, metalness: 0.85, roughness: 0.25 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.75, roughness: 0.35 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00eeff, emissive: 0x00ccff, emissiveIntensity: 1.0 })
    const glowMat2 = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.5 })
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.7, roughness: 0.4 })
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.6, roughness: 0.5 })
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x5a7a9a, metalness: 0.8, roughness: 0.25 })

    const S = 1.5

    /* ── 軀幹 ── */
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7 * S, 0.55 * S, 0.5 * S), bodyMat)
    torso.position.y = 0.8 * S
    torso.castShadow = true
    group.add(torso)

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55 * S, 0.3 * S, 0.05 * S), darkMat)
    chestPlate.position.set(0, 0.88 * S, -0.26 * S)
    group.add(chestPlate)

    const plateLineMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.3, roughness: 0.8 })
    for (const side of [-1, 1]) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.01 * S, 0.22 * S, 0.04 * S), plateLineMat)
      div.position.set(side * 0.12 * S, 0.87 * S, -0.27 * S)
      group.add(div)
    }

    const reactorMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0066ff, emissiveIntensity: 1.2 })
    const reactor = new THREE.Mesh(new THREE.SphereGeometry(0.07 * S, 10, 10), reactorMat)
    reactor.position.set(0, 0.82 * S, -0.27 * S)
    group.add(reactor)

    const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(0.09 * S, 0.015 * S, 8, 12), glowMat)
    reactorRing.position.copy(reactor.position)
    reactorRing.rotation.x = Math.PI / 2
    group.add(reactorRing)

    const sidePanelMat = new THREE.MeshStandardMaterial({ color: 0x2a4a5a, metalness: 0.7, roughness: 0.3 })
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.03 * S, 0.35 * S, 0.4 * S), sidePanelMat)
      panel.position.set(side * 0.36 * S, 0.8 * S, 0)
      group.add(panel)

      const grill = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.1 * S, 0.12 * S), plateLineMat)
      grill.position.set(side * 0.36 * S, 0.85 * S, 0.22 * S)
      group.add(grill)
    }

    const panelLineMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.5, roughness: 0.6 })
    for (const side of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.01 * S, 0.3 * S, 0.4 * S), panelLineMat)
      line.position.set(side * 0.15 * S, 0.8 * S, 0)
      group.add(line)

      const hLine = new THREE.Mesh(new THREE.BoxGeometry(0.01 * S, 0.25 * S, 0.04 * S), panelLineMat)
      hLine.position.set(side * 0.36 * S, 0.78 * S, -0.21 * S)
      group.add(hLine)
    }

    const ventMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.4, roughness: 0.7 })
    const ventGrilleMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.3, roughness: 0.8 })
    for (let i = -1; i <= 1; i += 0.5) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.02 * S, 0.08 * S), ventMat)
      vent.position.set(i * 0.2 * S, 0.65 * S, 0.26 * S)
      group.add(vent)

      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.005 * S, 0.01 * S), ventGrilleMat)
      grille.position.set(i * 0.2 * S, 0.7 * S, 0.26 * S)
      group.add(grille)
    }

    for (const side of [-1, 1]) {
      const shoulderPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.08 * S, 0.12 * S), panelLineMat)
      shoulderPanel.position.set(side * 0.36 * S, 0.62 * S, -0.22 * S)
      group.add(shoulderPanel)
    }

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * S, 0.4 * S, 0.12 * S, 10), darkMat)
    waist.position.y = 0.48 * S
    group.add(waist)

    const beltGlow = new THREE.Mesh(new THREE.TorusGeometry(0.36 * S, 0.015 * S, 8, 12), glowMat)
    beltGlow.position.set(0, 0.52 * S, 0)
    beltGlow.rotation.x = Math.PI / 2
    group.add(beltGlow)

    const hipArmor = new THREE.Mesh(new THREE.BoxGeometry(0.4 * S, 0.04 * S, 0.06 * S), accentMat)
    hipArmor.position.set(0, 0.44 * S, -0.26 * S)
    group.add(hipArmor)

    for (const side of [-1, 1]) {
      const hipPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.04 * S, 0.02 * S), panelLineMat)
      hipPlate.position.set(side * 0.25 * S, 0.44 * S, -0.26 * S)
      group.add(hipPlate)
    }

    /* ── 背部推進器 ── */
    const packMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.7, roughness: 0.3 })
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4 * S, 0.25 * S, 0.12 * S), packMat)
    pack.position.set(0, 0.9 * S, 0.28 * S)
    group.add(pack)

    const packVent = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.015 * S, 0.1 * S), ventMat)
    packVent.position.set(0, 0.95 * S, 0.33 * S)
    group.add(packVent)

    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044ff, emissiveIntensity: 0.3 })
    const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * S, 0.015 * S, 0.08 * S, 6), jointMat)
    antennaBase.position.set(0, 1.32 * S, 0.16 * S)
    group.add(antennaBase)
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.015 * S, 6, 6), antennaMat)
    antennaTip.position.set(0, 1.36 * S, 0.16 * S)
    group.add(antennaTip)

    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044ff, emissiveIntensity: 0.6 })
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 })
    const flameCoreMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff44, emissiveIntensity: 2.0, transparent: true, opacity: 0.8 })
    for (const side of [-1, 1]) {
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * S, 0.05 * S, 0.06 * S, 8), thrusterMat)
      thruster.rotation.x = Math.PI / 2
      thruster.position.set(side * 0.14 * S, 0.9 * S, 0.34 * S)
      group.add(thruster)
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04 * S, 0.12 * S, 6), flameMat)
      flame.rotation.x = Math.PI / 2
      flame.position.set(side * 0.14 * S, 0.9 * S, 0.42 * S)
      group.add(flame)
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.015 * S, 0.06 * S, 6), flameCoreMat)
      core.rotation.x = Math.PI / 2
      core.position.set(side * 0.14 * S, 0.9 * S, 0.42 * S)
      group.add(core)
    }

    /* ── 頭部 ── */
    const headBase = new THREE.Mesh(new THREE.BoxGeometry(0.38 * S, 0.2 * S, 0.32 * S), bodyMat)
    headBase.position.y = 1.2 * S
    group.add(headBase)

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26 * S, 0.05 * S, 0.02 * S), glowMat)
    visor.position.set(0, 1.2 * S, -0.17 * S)
    group.add(visor)

    const visorTop = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.015 * S, 0.02 * S), glowMat2)
    visorTop.position.set(0, 1.24 * S, -0.17 * S)
    group.add(visorTop)

    const jawPlate = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.04 * S, 0.02 * S), darkMat)
    jawPlate.position.set(0, 1.1 * S, -0.16 * S)
    group.add(jawPlate)

    const headCrest = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.1 * S, 0.04 * S), darkMat)
    headCrest.position.set(0, 1.34 * S, 0)
    group.add(headCrest)

    const sensorMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 })
    for (const side of [-1, 1]) {
      const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.02 * S, 6, 6), sensorMat)
      sensor.position.set(side * 0.18 * S, 1.22 * S, -0.1 * S)
      group.add(sensor)
    }

    /* ── 肩膀 ── */
    for (const side of [-1, 1]) {
      const pauldronTop = new THREE.Mesh(new THREE.BoxGeometry(0.28 * S, 0.05 * S, 0.32 * S), darkMat)
      pauldronTop.position.set(side * 0.48 * S, 1.05 * S, 0)
      group.add(pauldronTop)

      const pauldronGlow = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.015 * S, 0.02 * S), glowMat)
      pauldronGlow.position.set(side * 0.48 * S, 1.03 * S, -0.17 * S)
      group.add(pauldronGlow)

      const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.04 * S, 0.24 * S), accentMat)
      shoulderPad.position.set(side * 0.48 * S, 0.97 * S, 0)
      group.add(shoulderPad)

      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.3 * S, 0.1 * S), jointMat)
      upperArm.position.set(side * 0.48 * S, 0.78 * S, 0)
      group.add(upperArm)

      const armBand = new THREE.Mesh(new THREE.TorusGeometry(0.07 * S, 0.015 * S, 6, 8), glowMat)
      armBand.position.set(side * 0.48 * S, 0.84 * S, 0)
      armBand.rotation.x = Math.PI / 2
      group.add(armBand)

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06 * S, 8, 8), jointMat)
      elbow.position.set(side * 0.48 * S, 0.62 * S, 0)
      group.add(elbow)

      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.2 * S, 0.08 * S), panelMat)
      forearm.position.set(side * 0.48 * S, 0.48 * S, 0)
      group.add(forearm)
    }

    /* ── 武器（右手整合）── */
    const weaponMount = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.05 * S, 0.1 * S), darkMat)
    weaponMount.position.set(-0.48 * S, 0.55 * S, -0.15 * S)
    group.add(weaponMount)

    const weaponBody = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.06 * S, 0.3 * S), darkMat)
    weaponBody.position.set(-0.48 * S, 0.55 * S, -0.3 * S)
    group.add(weaponBody)

    const coilMat = new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: 0x0044ff, emissiveIntensity: 0.8 })
    for (let i = 0; i < 3; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.035 * S, 0.01 * S, 6, 8), coilMat)
      coil.position.set(-0.48 * S, 0.55 * S, -0.2 * S - i * 0.07 * S)
      coil.rotation.y = Math.PI / 2
      group.add(coil)
    }

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * S, 0.04 * S, 0.2 * S, 8), jointMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(-0.48 * S, 0.55 * S, -0.5 * S)
    group.add(barrel)

    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * S, 0.025 * S, 0.04 * S, 8), darkMat)
    barrelTip.rotation.x = Math.PI / 2
    barrelTip.position.set(-0.48 * S, 0.55 * S, -0.62 * S)
    group.add(barrelTip)

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S, 8, 8), glowMat)
    muzzle.position.set(-0.48 * S, 0.55 * S, -0.64 * S)
    group.add(muzzle)

    /* ── 腿 ── */
    for (const side of [-1, 1]) {
      const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.06 * S, 6, 6), jointMat)
      hipJoint.position.set(side * 0.2 * S, 0.4 * S, 0)
      group.add(hipJoint)

      const thighArmor = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.2 * S, 0.14 * S), darkMat)
      thighArmor.position.set(side * 0.2 * S, 0.28 * S, 0)
      group.add(thighArmor)

      const thighGlow = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.12 * S, 0.01 * S), glowMat)
      thighGlow.position.set(side * 0.2 * S, 0.28 * S, -0.07 * S)
      group.add(thighGlow)

      const pistonMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.9, roughness: 0.15 })
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * S, 0.02 * S, 0.1 * S, 6), pistonMat)
      piston.position.set(side * 0.22 * S, 0.2 * S, -0.08 * S)
      piston.rotation.x = 0.15
      group.add(piston)

      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.055 * S, 8, 8), jointMat)
      kneeJoint.position.set(side * 0.2 * S, 0.16 * S, 0)
      group.add(kneeJoint)

      const kneeSpike = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.02 * S, 0.06 * S), darkMat)
      kneeSpike.position.set(side * 0.2 * S, 0.16 * S, -0.06 * S)
      group.add(kneeSpike)

      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.09 * S, 0.16 * S, 0.11 * S), panelMat)
      calf.position.set(side * 0.2 * S, 0.04 * S, 0)
      group.add(calf)

      const calfVent = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.04 * S, 0.02 * S), panelMat)
      calfVent.position.set(side * 0.2 * S, 0.06 * S, -0.06 * S)
      group.add(calfVent)

      const ankle = new THREE.Mesh(new THREE.TorusGeometry(0.055 * S, 0.015 * S, 6, 8), darkMat)
      ankle.position.set(side * 0.2 * S, 0.02 * S, 0)
      ankle.rotation.x = Math.PI / 2
      group.add(ankle)

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.03 * S, 0.16 * S), darkMat)
      foot.position.set(side * 0.2 * S, 0.015 * S, 0.04 * S)
      group.add(foot)

      const toeArmor = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.015 * S, 0.04 * S), accentMat)
      toeArmor.position.set(side * 0.2 * S, 0.025 * S, 0.1 * S)
      group.add(toeArmor)
    }

    group.position.copy(position)
    this.mesh = group
    this.patrolBase = position.clone()
  }

  takeDamage(amount) {
    if (this.dead) return
    this.hp -= amount
    this.state = 'chase'
    this.alertTimer = 5
    if (this.hp <= 0) {
      this.die()
    }
  }

  die() {
    this.dead = true
    this.deathTimer = 2.0
    this.deathDone = false
    this._deathVelocity = 0
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(0xff6600)
          child.material.emissiveIntensity = 3.0
          child.material.needsUpdate = true
        }
      })
    }
  }

  hasLineOfSight(player, level) {
    const start = this.mesh.position.clone()
    start.y += 1.2
    const end = player.camera.position.clone()
    const dir = new THREE.Vector3().subVectors(end, start)
    const dist = dir.length()
    dir.normalize()
    const rayBox = new THREE.Box3(
      new THREE.Vector3(-0.15, -0.15, -0.15),
      new THREE.Vector3(0.15, 0.15, 0.15)
    )
    const step = 0.5
    for (let d = 0; d < dist; d += step) {
      const p = start.clone().add(dir.clone().multiplyScalar(d))
      rayBox.translate(new THREE.Vector3().subVectors(p, rayBox.getCenter(new THREE.Vector3())))
      for (const box of level.collisionBoxes) {
        if (box.intersectsBox(rayBox)) return false
      }
    }
    return true
  }

  update(delta, player, level) {
    if (this.dead) {
      this.deathTimer -= delta
      this._deathVelocity += delta * 6
      if (this.mesh) {
        this.mesh.rotation.x += this._deathVelocity * delta * 0.8
        this.mesh.rotation.z += this._deathVelocity * delta * 0.4
        this.mesh.position.y -= delta * 1.5
        this.mesh.position.x += Math.sin(performance.now() * 0.02) * delta * 0.3
        if (this.mesh.position.y < -2) this.mesh.position.y = -2

        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.opacity = Math.max(0, this.deathTimer / 2.0)
            child.material.transparent = true
          }
        })
      }
      if (this.deathTimer <= 0) {
        this.deathDone = true
      }
      return
    }

    this.shootTimer -= delta

    const playerDist = this.mesh.position.distanceTo(player.camera.position)

    if (this.state === 'patrol') {
      if (playerDist < this.detectionRange) {
        this.state = 'chase'
        this.lastKnownPlayerPos = player.camera.position.clone()
      } else {
        this.patrol(delta, level)
      }
    } else if (this.state === 'chase') {
      this.lastKnownPlayerPos = player.camera.position.clone()
      this.chase(delta, player.camera.position, level)

      this.alertTimer -= delta
      if (this.alertTimer <= 0 && playerDist > this.detectionRange * 1.5) {
        this.state = 'patrol'
      }
    }

    const dirToPlayer = new THREE.Vector3().subVectors(player.camera.position, this.mesh.position)
    dirToPlayer.y = 0
    if (dirToPlayer.length() > 0.1) {
      dirToPlayer.normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirToPlayer)
      this.mesh.quaternion.slerp(quat, delta * 5)
    }
  }

  patrol(delta, level) {
    const drift = new THREE.Vector3(
      Math.sin(performance.now() * 0.001) * 0.5,
      0,
      Math.cos(performance.now() * 0.0013) * 0.5
    )
    const target = this.patrolBase.clone().add(drift)
    const dir = new THREE.Vector3().subVectors(target, this.mesh.position)
    dir.y = 0
    if (dir.length() > 0.1) {
      dir.normalize()
      const move = dir.multiplyScalar(this.speed * 0.4 * delta)
      const newPos = this.mesh.position.clone().add(move)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      }
    }
  }

  chase(delta, targetPos, level) {
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position)
    dir.y = 0
    const dist = dir.length()
    const idealDist = 6 + Math.random() * 2
    this._strafeAngle = (this._strafeAngle || 0) + delta * this.flankDir * 1.2
    this.flankDir = this.flankDir || (Math.random() > 0.5 ? 1 : -1)

    if (dist > idealDist + 2) {
      dir.normalize()
      const move = dir.multiplyScalar(this.speed * delta)
      const newPos = this.mesh.position.clone().add(move)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      }
    } else if (dist < idealDist - 1.5) {
      dir.normalize()
      const move = dir.multiplyScalar(-this.speed * delta * 0.5)
      const newPos = this.mesh.position.clone().add(move)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      }
    } else {
      const strafeDir = new THREE.Vector3(
        Math.cos(this._strafeAngle) * this.speed * delta * 0.6,
        0,
        Math.sin(this._strafeAngle) * this.speed * delta * 0.6
      )
      const strafePos = this.mesh.position.clone().add(strafeDir)
      if (!level || !level.checkCollision(strafePos, this.radius)) {
        this.mesh.position.copy(strafePos)
      }
    }
  }
}
