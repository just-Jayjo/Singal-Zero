import * as THREE from 'three'

export class Rusher {
  constructor(position) {
    this.type = 'rusher'
    this.mesh = null
    this.hp = 20
    this.maxHp = 20
    this.speed = 3.5
    this.damage = 3
    this.dead = false
    this.canShoot = false
    this.detectionRange = 22
    this.state = 'patrol'
    this.flankAngle = 0
    this.flankDir = 1
    this.alertTimer = 0
    this.radius = 0.9
    this.createMesh(position)
  }

  createMesh(position) {
    const group = new THREE.Group()
    const S = 1.8

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, metalness: 0.7, roughness: 0.4 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, metalness: 0.6, roughness: 0.5 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.0 })
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, metalness: 0.5, roughness: 0.6 })
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x4a2a1a, metalness: 0.6, roughness: 0.4 })
    const pistonMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, metalness: 0.8, roughness: 0.2 })

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.4 * S, 0.35 * S), bodyMat)
    torso.position.y = 0.7 * S
    group.add(torso)

    const torsoLineMat = new THREE.MeshStandardMaterial({ color: 0x1a0a08, metalness: 0.3, roughness: 0.8 })
    for (const side of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.01 * S, 0.3 * S, 0.3 * S), torsoLineMat)
      line.position.set(side * 0.1 * S, 0.72 * S, 0)
      group.add(line)
    }

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.35 * S, 0.2 * S, 0.03 * S), panelMat)
    chestPlate.position.set(0, 0.75 * S, -0.19 * S)
    group.add(chestPlate)

    for (const side of [-1, 1]) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.01 * S, 0.14 * S, 0.02 * S), torsoLineMat)
      div.position.set(side * 0.08 * S, 0.76 * S, -0.2 * S)
      group.add(div)
    }

    const torsoVent = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.015 * S, 0.02 * S), darkMat)
    torsoVent.position.set(0, 0.6 * S, -0.18 * S)
    group.add(torsoVent)

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x3a1a0a, metalness: 0.6, roughness: 0.5 })
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42 * S, 0.04 * S, 0.3 * S), beltMat)
    belt.position.set(0, 0.52 * S, 0)
    group.add(belt)

    const beltGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.01 * S, 0.02 * S), glowMat)
    beltGlow.position.set(0, 0.54 * S, -0.16 * S)
    group.add(beltGlow)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25 * S, 0.15 * S, 0.2 * S), darkMat)
    head.position.set(0, 0.95 * S, -0.05 * S)
    group.add(head)

    const headCrest = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.06 * S, 0.02 * S), panelMat)
    headCrest.position.set(0, 1.05 * S, -0.05 * S)
    group.add(headCrest)

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.04 * S, 0.06 * S), panelMat)
      ear.position.set(side * 0.14 * S, 0.98 * S, -0.05 * S)
      group.add(ear)
    }

    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.04 * S, 0.02 * S), glowMat)
    eye.position.set(0, 0.95 * S, -0.14 * S)
    group.add(eye)

    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.04 * S, 6, 6), jointMat)
      shoulder.position.set(side * 0.28 * S, 0.85 * S, 0)
      group.add(shoulder)

      const shoulderPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.03 * S, 0.1 * S), panelMat)
      shoulderPlate.position.set(side * 0.29 * S, 0.87 * S, -0.04 * S)
      group.add(shoulderPlate)

      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 0.22 * S, 0.07 * S), jointMat)
      upperArm.position.set(side * 0.28 * S, 0.68 * S, 0)
      group.add(upperArm)

      const armSpike = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.04 * S, 0.06 * S), darkMat)
      armSpike.position.set(side * 0.3 * S, 0.62 * S, -0.05 * S)
      group.add(armSpike)

      for (const ss of [-1, 1]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.006 * S, 4, 4), panelMat)
        rivet.position.set(side * 0.3 * S, 0.66 * S + ss * 0.06 * S, -0.04 * S)
        group.add(rivet)
      }

      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.2 * S, 0.06 * S), darkMat)
      forearm.position.set(side * 0.28 * S, 0.48 * S, 0)
      group.add(forearm)

      const armBand = new THREE.Mesh(new THREE.TorusGeometry(0.04 * S, 0.008 * S, 6, 8), glowMat)
      armBand.position.set(side * 0.28 * S, 0.55 * S, 0)
      armBand.rotation.x = Math.PI / 2
      group.add(armBand)

      const clawBase = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.03 * S, 0.06 * S), darkMat)
      clawBase.position.set(side * 0.28 * S, 0.38 * S, 0)
      group.add(clawBase)
      for (const ct of [-1, 1]) {
        const clawTip = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.04 * S, 0.02 * S), darkMat)
        clawTip.position.set(side * 0.28 * S + ct * 0.03 * S, 0.35 * S, 0)
        group.add(clawTip)
      }
    }

    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8 })
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * S, 0.06 * S, 0.08 * S, 8), thrusterMat)
    thruster.position.set(0, 0.1 * S, -0.2 * S)
    thruster.rotation.x = 0.3
    group.add(thruster)
    const thrusterRing = new THREE.Mesh(new THREE.TorusGeometry(0.05 * S, 0.01 * S, 6, 8), glowMat)
    thrusterRing.position.set(0, 0.12 * S, -0.22 * S)
    thrusterRing.rotation.x = Math.PI / 2
    group.add(thrusterRing)
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 })
    const flameCoreMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff44, emissiveIntensity: 2.0, transparent: true, opacity: 0.8 })
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055 * S, 0.14 * S, 6), flameMat)
    flame.position.set(0, 0.08 * S, -0.32 * S)
    flame.rotation.x = 0.5
    group.add(flame)
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.02 * S, 0.07 * S, 6), flameCoreMat)
    core.position.set(0, 0.08 * S, -0.32 * S)
    core.rotation.x = 0.5
    group.add(core)

    for (const side of [-1, 1]) {
      const thighArmor = new THREE.Mesh(new THREE.BoxGeometry(0.12 * S, 0.14 * S, 0.12 * S), panelMat)
      thighArmor.position.set(side * 0.15 * S, 0.42 * S, -0.03 * S)
      group.add(thighArmor)

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.3 * S, 0.1 * S), jointMat)
      thigh.position.set(side * 0.15 * S, 0.4 * S, 0)
      group.add(thigh)

      const thighRing = new THREE.Mesh(new THREE.TorusGeometry(0.06 * S, 0.008 * S, 6, 8), darkMat)
      thighRing.position.set(side * 0.15 * S, 0.45 * S, 0)
      thighRing.rotation.x = Math.PI / 2
      group.add(thighRing)

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.04 * S, 6, 6), jointMat)
      knee.position.set(side * 0.15 * S, 0.25 * S, 0)
      group.add(knee)

      const kneeSpike = new THREE.Mesh(new THREE.BoxGeometry(0.03 * S, 0.02 * S, 0.05 * S), darkMat)
      kneeSpike.position.set(side * 0.15 * S, 0.25 * S, -0.05 * S)
      group.add(kneeSpike)

      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.25 * S, 0.08 * S), darkMat)
      calf.position.set(side * 0.15 * S, 0.15 * S, 0)
      group.add(calf)

      const calfArmor = new THREE.Mesh(new THREE.BoxGeometry(0.09 * S, 0.1 * S, 0.02 * S), panelMat)
      calfArmor.position.set(side * 0.15 * S, 0.18 * S, -0.05 * S)
      group.add(calfArmor)

      const calfVent = new THREE.Mesh(new THREE.BoxGeometry(0.03 * S, 0.04 * S, 0.02 * S), darkMat)
      calfVent.position.set(side * 0.15 * S, 0.18 * S, -0.06 * S)
      group.add(calfVent)

      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.01 * S, 0.015 * S, 0.08 * S, 6), pistonMat)
      piston.position.set(side * 0.17 * S, 0.3 * S, -0.06 * S)
      piston.rotation.x = 0.2
      group.add(piston)

      for (const pz of [0.04, -0.04]) {
        const pDetail = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * S, 0.008 * S, 0.05 * S, 6), pistonMat)
        pDetail.position.set(side * 0.17 * S, 0.3 * S, pz)
        pDetail.rotation.x = 0.15
        group.add(pDetail)
      }

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1 * S, 0.03 * S, 0.14 * S), darkMat)
      foot.position.set(side * 0.15 * S, 0.015 * S, 0.03 * S)
      group.add(foot)

      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.06 * S, 0.015 * S, 0.03 * S), panelMat)
      toe.position.set(side * 0.15 * S, 0.025 * S, 0.09 * S)
      group.add(toe)

      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.04 * S, 0.02 * S, 0.02 * S), darkMat)
      heel.position.set(side * 0.15 * S, 0.025 * S, -0.05 * S)
      group.add(heel)
    }

    group.position.copy(position)
    this.mesh = group
    this.patrolBase = position.clone()
    this.flankAngle = Math.random() * Math.PI * 2
    this.flankDir = Math.random() > 0.5 ? 1 : -1
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
    this.deathTimer = 1.5
    this.deathDone = false
    this._deathVelocity = 0
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone()
          child.material.emissive = new THREE.Color(0xff4400)
          child.material.emissiveIntensity = 3.5
          child.material.needsUpdate = true
        }
      })
    }
  }

  update(delta, player, level) {
    if (this.dead) {
      this.deathTimer -= delta
      this._deathVelocity += delta * 8
      if (this.mesh) {
        this.mesh.rotation.x += this._deathVelocity * delta * 1.2
        this.mesh.rotation.z += this._deathVelocity * delta * 0.6
        this.mesh.position.y -= delta * 2.0
        this.mesh.position.x += Math.sin(performance.now() * 0.03) * delta * 0.5
        this.mesh.position.z += Math.cos(performance.now() * 0.025) * delta * 0.4
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.opacity = Math.max(0, this.deathTimer / 1.5)
            child.material.transparent = true
          }
        })
      }
      if (this.deathTimer <= 0) this.deathDone = true
      return
    }

    const playerDist = this.mesh.position.distanceTo(player.camera.position)

    if (this.state === 'patrol') {
      if (playerDist < this.detectionRange) {
        this.state = 'chase'
      }
    }

    if (this.state === 'chase') {
      this.chase(delta, player, level)
    }

    const dirToPlayer = new THREE.Vector3().subVectors(player.camera.position, this.mesh.position)
    dirToPlayer.y = 0
    if (dirToPlayer.length() > 0.1) {
      dirToPlayer.normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirToPlayer)
      this.mesh.quaternion.slerp(quat, delta * 6)
    }
  }

  chase(delta, player, level) {
    const targetPos = player.camera.position.clone()
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position)
    dir.y = 0
    const dist = dir.length()

    if (dist > 0.5) {
      dir.normalize()
      const move = dir.multiplyScalar(this.speed * delta)
      const newPos = this.mesh.position.clone().add(move)
      if (!level || !level.checkCollision(newPos, this.radius)) {
        this.mesh.position.copy(newPos)
      } else {
        const escapeAngle = Math.random() * Math.PI * 2
        const escape = new THREE.Vector3(
          Math.cos(escapeAngle) * this.speed * delta * 0.5,
          0,
          Math.sin(escapeAngle) * this.speed * delta * 0.5
        )
        const escapePos = this.mesh.position.clone().add(escape)
        if (!level || !level.checkCollision(escapePos, this.radius)) {
          this.mesh.position.copy(escapePos)
        }
      }
    }
  }
}
