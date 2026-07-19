import * as THREE from 'three'

export class Sniper {
  constructor(position) {
    this.type = 'sniper'
    this.mesh = null
    this.hp = 25
    this.maxHp = 25
    this.speed = 1.5
    this.damage = 12
    this.dead = false
    this.canShoot = true
    this.shootCooldown = 4.5
    this.shootTimer = this.shootCooldown * 0.5
    this.detectionRange = 35
    this.preferredRange = 18
    this.state = 'patrol'
    this.alertTimer = 0
    this.radius = 0.6
    this.createMesh(position)
  }

  createMesh(position) {
    const group = new THREE.Group()
    const S = 1.4

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.8, roughness: 0.2 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.7, roughness: 0.3 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 1.5 })
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xcc0044, emissive: 0xcc0044, emissiveIntensity: 0.6 })
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.6, roughness: 0.4 })
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x122232, metalness: 0.7, roughness: 0.25 })
    const pistonMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.9, roughness: 0.1 })

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4 * S, 0.5 * S, 0.3 * S), bodyMat)
    torso.position.y = 0.9 * S
    group.add(torso)

    const torsoPanel = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, 0.35 * S, 0.02 * S), panelMat)
    torsoPanel.position.set(0, 0.9 * S, 0.16 * S)
    group.add(torsoPanel)

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3 * S, 0.3 * S, 0.04 * S), darkMat)
    chestPlate.position.set(0, 0.95 * S, -0.17 * S)
    group.add(chestPlate)

    for (const side of [-1, 1]) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.01 * S, 0.22 * S, 0.03 * S), panelMat)
      div.position.set(side * 0.06 * S, 0.94 * S, -0.18 * S)
      group.add(div)
    }

    const packMat = new THREE.MeshStandardMaterial({ color: 0x0e1e2e, metalness: 0.6, roughness: 0.4 })
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.2 * S, 0.3 * S, 0.08 * S), packMat)
    backpack.position.set(0, 0.95 * S, 0.19 * S)
    group.add(backpack)

    for (const side of [-1, 1]) {
      const packVent = new THREE.Mesh(new THREE.BoxGeometry(0.03 * S, 0.06 * S, 0.06 * S), panelMat)
      packVent.position.set(side * 0.07 * S, 0.95 * S, 0.22 * S)
      group.add(packVent)
    }

    const packAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005 * S, 0.01 * S, 0.08 * S, 6), jointMat)
    packAntenna.position.set(0, 1.15 * S, 0.2 * S)
    group.add(packAntenna)
    const antGlow = new THREE.Mesh(new THREE.SphereGeometry(0.008 * S, 6, 6), lensMat)
    antGlow.position.set(0, 1.19 * S, 0.2 * S)
    group.add(antGlow)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, 0.18 * S, 0.22 * S), darkMat)
    head.position.set(0, 1.22 * S, 0)
    group.add(head)

    const headRidge = new THREE.Mesh(new THREE.BoxGeometry(0.16 * S, 0.02 * S, 0.02 * S), panelMat)
    headRidge.position.set(0, 1.28 * S, -0.1 * S)
    group.add(headRidge)

    for (const side of [-1, 1]) {
      const earSensor = new THREE.Mesh(new THREE.BoxGeometry(0.015 * S, 0.03 * S, 0.04 * S), panelMat)
      earSensor.position.set(side * 0.14 * S, 1.24 * S, -0.02 * S)
      group.add(earSensor)
    }

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18 * S, 0.04 * S, 0.02 * S), glowMat)
    visor.position.set(0, 1.22 * S, -0.13 * S)
    group.add(visor)

    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.06 * S, 0.02 * S), lensMat)
    lens.position.set(0, 1.22 * S, -0.13 * S)
    group.add(lens)
    this._visorMat = visor.material
    this._lensMat = lens.material

    const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.12 * S, 0.012 * S, 6, 10), jointMat)
    neckRing.position.set(0, 1.12 * S, 0)
    neckRing.rotation.x = Math.PI / 2
    group.add(neckRing)

    for (const side of [-1, 1]) {
      const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.03 * S, 0.16 * S), darkMat)
      shoulderPad.position.set(side * 0.26 * S, 1.05 * S, 0)
      group.add(shoulderPad)

      const shoulderPadTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.01 * S, 0.02 * S), glowMat)
      shoulderPadTrim.position.set(side * 0.26 * S, 1.04 * S, -0.09 * S)
      group.add(shoulderPadTrim)

      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.05 * S, 6, 6), jointMat)
      shoulder.position.set(side * 0.25 * S, 1.0 * S, 0)
      group.add(shoulder)

      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.22 * S, 0.06 * S), jointMat)
      upperArm.position.set(side * 0.25 * S, 0.8 * S, 0)
      group.add(upperArm)

      const upperArmPlate = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 0.1 * S, 0.02 * S), panelMat)
      upperArmPlate.position.set(side * 0.25 * S, 0.82 * S, -0.04 * S)
      group.add(upperArmPlate)

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.035 * S, 6, 6), jointMat)
      elbow.position.set(side * 0.25 * S, 0.68 * S, 0)
      group.add(elbow)

      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.05 * S, 0.18 * S, 0.05 * S), darkMat)
      forearm.position.set(side * 0.25 * S, 0.6 * S, 0)
      group.add(forearm)

      const armBand = new THREE.Mesh(new THREE.TorusGeometry(0.035 * S, 0.01 * S, 6, 8), glowMat)
      armBand.position.set(side * 0.25 * S, 0.7 * S, 0)
      armBand.rotation.x = Math.PI / 2
      group.add(armBand)

      for (const ss of [-1, 1]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.005 * S, 4, 4), panelMat)
        rivet.position.set(side * 0.26 * S, 0.75 * S + ss * 0.06 * S, -0.03 * S)
        group.add(rivet)
      }
    }

    const rifleMat = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.7, roughness: 0.3 })
    const rifleBody = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.04 * S, 0.5 * S), rifleMat)
    rifleBody.position.set(-0.25 * S, 0.65 * S, -0.3 * S)
    group.add(rifleBody)

    const rifleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.06 * S, 0.02 * S), darkMat)
    rifleGrip.position.set(-0.25 * S, 0.6 * S, -0.25 * S)
    group.add(rifleGrip)

    for (let i = 0; i < 3; i++) {
      const ventSlot = new THREE.Mesh(new THREE.BoxGeometry(0.03 * S, 0.005 * S, 0.02 * S), panelMat)
      ventSlot.position.set(-0.25 * S, 0.66 * S, -0.35 * S - i * 0.04 * S)
      group.add(ventSlot)
    }

    const scopeMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044ff, emissiveIntensity: 0.5 })
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * S, 0.02 * S, 0.04 * S, 8), scopeMat)
    scope.rotation.x = Math.PI / 2
    scope.position.set(-0.25 * S, 0.68 * S, -0.25 * S)
    group.add(scope)
    const scopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.005 * S, 0.01 * S, 0.06 * S), darkMat)
    scopeRail.position.set(-0.25 * S, 0.705 * S, -0.25 * S)
    group.add(scopeRail)
    const scopeLens = new THREE.Mesh(new THREE.SphereGeometry(0.012 * S, 6, 6), lensMat)
    scopeLens.position.set(-0.25 * S, 0.68 * S, -0.27 * S)
    group.add(scopeLens)

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * S, 0.015 * S, 0.3 * S, 8), darkMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(-0.25 * S, 0.65 * S, -0.6 * S)
    group.add(barrel)

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.013 * S, 0.003 * S, 6, 8), jointMat)
      ring.rotation.y = Math.PI / 2
      ring.position.set(-0.25 * S, 0.65 * S, -0.5 * S - i * 0.06 * S)
      group.add(ring)
    }

    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * S, 0.02 * S, 0.02 * S, 8), darkMat)
    muzzleBrake.rotation.x = Math.PI / 2
    muzzleBrake.position.set(-0.25 * S, 0.65 * S, -0.75 * S)
    group.add(muzzleBrake)
    const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.015 * S, 6, 6), glowMat)
    muzzleGlow.position.set(-0.25 * S, 0.65 * S, -0.77 * S)
    group.add(muzzleGlow)

    for (const side of [-1, 1]) {
      const hip = new THREE.Mesh(new THREE.SphereGeometry(0.04 * S, 6, 6), jointMat)
      hip.position.set(side * 0.12 * S, 0.55 * S, 0)
      group.add(hip)

      const hipSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.04 * S, 0.02 * S), panelMat)
      hipSkirt.position.set(side * 0.12 * S, 0.53 * S, -0.06 * S)
      group.add(hipSkirt)

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 0.2 * S, 0.07 * S), darkMat)
      thigh.position.set(side * 0.12 * S, 0.42 * S, 0)
      group.add(thigh)

      const thighRing = new THREE.Mesh(new THREE.TorusGeometry(0.045 * S, 0.007 * S, 6, 8), jointMat)
      thighRing.position.set(side * 0.12 * S, 0.46 * S, 0)
      thighRing.rotation.x = Math.PI / 2
      group.add(thighRing)

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S, 6, 6), jointMat)
      knee.position.set(side * 0.12 * S, 0.3 * S, 0)
      group.add(knee)

      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.18 * S, 0.06 * S), darkMat)
      leg.position.set(side * 0.12 * S, 0.2 * S, 0)
      group.add(leg)

      const legArmor = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.08 * S, 0.02 * S), panelMat)
      legArmor.position.set(side * 0.12 * S, 0.35 * S, -0.05 * S)
      group.add(legArmor)

      const lowerArmor = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 0.06 * S, 0.02 * S), panelMat)
      lowerArmor.position.set(side * 0.12 * S, 0.2 * S, -0.04 * S)
      group.add(lowerArmor)

      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * S, 0.012 * S, 0.06 * S, 6), pistonMat)
      piston.position.set(side * 0.14 * S, 0.35 * S, -0.05 * S)
      piston.rotation.x = 0.15
      group.add(piston)

      for (const pz of [0.03, -0.03]) {
        const piston2 = new THREE.Mesh(new THREE.CylinderGeometry(0.005 * S, 0.008 * S, 0.04 * S, 6), pistonMat)
        piston2.position.set(side * 0.14 * S, 0.35 * S, pz)
        piston2.rotation.x = 0.1
        group.add(piston2)
      }

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09 * S, 0.03 * S, 0.12 * S), darkMat)
      foot.position.set(side * 0.12 * S, 0.015 * S, 0.02 * S)
      group.add(foot)

      const toePlate = new THREE.Mesh(new THREE.BoxGeometry(0.05 * S, 0.015 * S, 0.02 * S), panelMat)
      toePlate.position.set(side * 0.12 * S, 0.025 * S, 0.07 * S)
      group.add(toePlate)
    }

    group.position.copy(position)
    this.mesh = group
    this.patrolBase = position.clone()

    /* 雷射瞄準線 */
    const laserGeo = new THREE.BufferGeometry()
    const laserPositions = new Float32Array([0, 0, 0, 0, 0, 100])
    laserGeo.setAttribute('position', new THREE.BufferAttribute(laserPositions, 3))
    const laserMat = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.4,
      depthTest: false
    })
    this._laserLine = new THREE.Line(laserGeo, laserMat)
    this._laserLine.position.set(-0.25 * 1.4, 0.65 * 1.4, -0.77 * 1.4)
    this._laserLine.raycast = () => {}
    group.add(this._laserLine)

    /* 雷射光源點（狙擊鏡發光） */
    this._laserDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    )
    this._laserDot.position.set(-0.25 * 1.4, 0.65 * 1.4, -0.77 * 1.4)
    group.add(this._laserDot)
  }

  takeDamage(amount) {
    if (this.dead) return
    this.hp -= amount
    this.state = 'chase'
    this.alertTimer = 5
    if (this.hp <= 0) this.die()
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
          child.material.emissive = new THREE.Color(0xff2266)
          child.material.emissiveIntensity = 3.0
          child.material.needsUpdate = true
        }
      })
    }
  }

  hasLineOfSight(player, level) {
    const start = this.mesh.position.clone()
    start.y += 1.0
    const end = player.camera.position.clone()
    const dir = new THREE.Vector3().subVectors(end, start)
    const dist = dir.length()
    dir.normalize()
    const step = 0.5
    for (let d = 0; d < dist; d += step) {
      const p = start.clone().add(dir.clone().multiplyScalar(d))
      const testBox = new THREE.Box3(
        new THREE.Vector3(p.x - 0.15, p.y - 0.15, p.z - 0.15),
        new THREE.Vector3(p.x + 0.15, p.y + 0.15, p.z + 0.15)
      )
      for (const box of level.collisionBoxes) {
        if (box.intersectsBox(testBox)) return false
      }
    }
    return true
  }

  update(delta, player, level) {
    if (this.dead) {
      this.deathTimer -= delta
      this._deathVelocity += delta * 5
      if (this.mesh) {
        this.mesh.rotation.x += this._deathVelocity * delta * 0.6
        this.mesh.rotation.z += this._deathVelocity * delta * 0.5
        this.mesh.position.y -= delta * 1.2
        this.mesh.position.x += Math.sin(performance.now() * 0.015) * delta * 0.3
        if (this.mesh.position.y < -2) this.mesh.position.y = -2
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.opacity = Math.max(0, this.deathTimer / 2.0)
            child.material.transparent = true
          }
        })
      }
      if (this.deathTimer <= 0) this.deathDone = true
      return
    }

    this.shootTimer -= delta
    const playerDist = this.mesh.position.distanceTo(player.camera.position)

    if (this.state === 'patrol') {
      if (playerDist < this.detectionRange) {
        this.state = 'chase'
        this.alertTimer = 8
      }
    }

    if (this.state === 'chase') {
      this.positionForShot(delta, player, level)

      this.alertTimer -= delta
      if (this.alertTimer <= 0 && playerDist > this.detectionRange) {
        this.state = 'patrol'
      }
    }

    const dirToPlayer = new THREE.Vector3().subVectors(player.camera.position, this.mesh.position)
    dirToPlayer.y = 0
    if (dirToPlayer.length() > 0.1) {
      dirToPlayer.normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirToPlayer)
      this.mesh.quaternion.slerp(quat, delta * 4)
    }

    /* 雷射與發光脈衝 — 瞄準玩家時強化 */
    if (this._laserLine) {
      const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(performance.now() * (this.state === 'chase' ? 0.008 : 0.003)))
      this._laserLine.material.opacity = this.state === 'chase' ? pulse * 0.7 : pulse * 0.3
    }
    if (this._laserDot) {
      const dotScale = 0.8 + 0.4 * Math.sin(performance.now() * (this.state === 'chase' ? 0.01 : 0.004))
      this._laserDot.scale.setScalar(dotScale)
    }
    if (this._visorMat) {
      const glowIntensity = this.state === 'chase'
        ? 1.5 + 1.5 * Math.sin(performance.now() * 0.006)
        : 0.8 + 0.7 * Math.sin(performance.now() * 0.003)
      this._visorMat.emissiveIntensity = glowIntensity
      this._lensMat.emissiveIntensity = glowIntensity * 0.4
    }
  }

  positionForShot(delta, player, level) {
    const targetPos = player.camera.position.clone()
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position)
    const dist = dir.length()
    dir.y = 0

    if (dist < this.preferredRange - 3) {
      const away = dir.clone().normalize().multiplyScalar(-this.speed * delta)
      const newPos = this.mesh.position.clone().add(away)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      }
    } else if (dist > this.preferredRange + 3) {
      const toward = dir.clone().normalize().multiplyScalar(this.speed * delta)
      const newPos = this.mesh.position.clone().add(toward)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      }
    } else {
      const strafeAngle = Math.sin(performance.now() * 0.001) * 0.8
      const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize()
      const strafe = right.multiplyScalar(strafeAngle * this.speed * delta * 0.6)
      const newPos = this.mesh.position.clone().add(strafe)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      }
    }
  }
}
