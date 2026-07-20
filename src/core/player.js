import * as THREE from 'three'

export class Player {
  constructor(camera, scene) {
    this.camera = camera
    this.scene = scene
    this.velocity = new THREE.Vector3()
    this.direction = new THREE.Vector3()
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ')
    this.moveForward = false
    this.moveBackward = false
    this.moveLeft = false
    this.moveRight = false
    this.isRunning = false
    this.sprintHeld = false
    this.health = 100
    this.maxHealth = 100
    this.sprintStamina = 100
    this.baseSpeed = 3.5
    this.sprintSpeed = 6
    this.mouseSensitivity = 0.002
    this.gravity = 20
    this.playerHeight = 1.6
    this.onGround = false
    this.weaponBob = 0
    this.pitch = 0
    this.yaw = 0
    this.pitchMultiplier = 1.0
    this.bobAmount = 0.04
    this.bobSpeed = 8
    this._pointerLockFrame = 0
    this._shakeIntensity = 0
    this._shakeDuration = 0
    this._recoilPitch = 0
    this._recoilRecovery = 8
    this.jumping = false
    this.jumpVelocity = 0
    this._jumpPressed = false

    this.segmentCount = 7
    this.segmentSize = this.maxHealth / this.segmentCount
    this.regenSegmentHealed = 0
    this.keyState = {}
    this.lastDamageTime = 0
  }

  reset() {
    this.health = 100
    this.sprintStamina = 100
    this.velocity.set(0, 0, 0)
    this.moveForward = false
    this.moveBackward = false
    this.moveLeft = false
    this.moveRight = false
    this.isRunning = false
    this.pitch = 0
    this.yaw = 0
    this.pitchMultiplier = 1.0
    this._pointerLockFrame = 0
    this._shakeIntensity = 0
    this._shakeDuration = 0
    this._recoilPitch = 0
    this.jumping = false
    this.jumpVelocity = 0
    this._jumpPressed = false
  }

  shake(intensity, duration) {
    this._shakeIntensity = intensity
    this._shakeDuration = duration
  }

  applyRecoil(amount) {
    this._recoilPitch += amount
    this._recoilPitch = Math.max(-0.25, Math.min(0.25, this._recoilPitch))
  }

  onMouseMove(event) {
    if (this._pointerLockFrame < 3) { this._pointerLockFrame++; return }
    this.yaw -= event.movementX * this.mouseSensitivity
    this.pitch -= event.movementY * this.mouseSensitivity * this.pitchMultiplier
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch))
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch + this._recoilPitch
  }

  onKeyDown(event) {
    this.keyState[event.code] = true
    switch (event.code) {
      case 'KeyW': this.moveForward = true; event.preventDefault(); break
      case 'KeyS': this.moveBackward = true; event.preventDefault(); break
      case 'KeyA': this.moveLeft = true; event.preventDefault(); break
      case 'KeyD': this.moveRight = true; event.preventDefault(); break
      case 'Space': this._jumpPressed = true; event.preventDefault(); break
      case 'KeyR': event.preventDefault(); break
    }
  }

  onKeyUp(event) {
    this.keyState[event.code] = false
    switch (event.code) {
      case 'KeyW': this.moveForward = false; event.preventDefault(); break
      case 'KeyS': this.moveBackward = false; event.preventDefault(); break
      case 'KeyA': this.moveLeft = false; event.preventDefault(); break
      case 'KeyD': this.moveRight = false; event.preventDefault(); break
      case 'Space': this._jumpPressed = false; break
    }
  }

  onMouseDown(e) {
    if (e.button === 2) this.sprintHeld = true
  }

  onMouseUp(e) {
    if (e.button === 2) this.sprintHeld = false
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)
    this.lastDamageTime = performance.now()
    this.regenSegmentHealed = 0
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.regenSegmentHealed = this.health >= this.maxHealth ? 0 : this.regenSegmentHealed
  }

  update(delta, level) {
    if (this.health <= 0) return

    if (this.health < this.maxHealth && this.lastDamageTime) {
      const timeSinceDamage = (performance.now() - this.lastDamageTime) / 1000
      if (timeSinceDamage > 3 && this.regenSegmentHealed < this.segmentSize) {
        const healAmt = delta * 3
        this.health = Math.min(this.maxHealth, this.health + healAmt)
        this.regenSegmentHealed += healAmt
      }
    }

    const sprinting = this.sprintHeld && this.sprintStamina > 0
    const speed = sprinting ? this.sprintSpeed : this.baseSpeed
    if (sprinting) {
      this.sprintStamina = Math.max(0, this.sprintStamina - delta * 20)
    } else if (!this.isRunning) {
      this.sprintStamina = Math.min(100, this.sprintStamina + delta * 10)
    }
    const targetFov = sprinting ? 85 : 75
    this.camera.fov += (targetFov - this.camera.fov) * delta * 6
    this.camera.updateProjectionMatrix()

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)

    const moveDir = new THREE.Vector3()
    if (this.moveForward) moveDir.add(forward)
    if (this.moveBackward) moveDir.sub(forward)
    if (this.moveRight) moveDir.add(right)
    if (this.moveLeft) moveDir.sub(right)
    if (moveDir.length() > 0) {
      moveDir.normalize()
      this.weaponBob += delta * this.bobSpeed * (speed / this.baseSpeed)
    }

    if (moveDir.length() > 0.01) {
      const r = 0.3
      const newX = this.camera.position.x + moveDir.x * speed * delta
      if (!this._checkCollisionXZ(newX, this.camera.position.z, level, r)) {
        this.camera.position.x = newX
      }
      const newZ = this.camera.position.z + moveDir.z * speed * delta
      if (!this._checkCollisionXZ(this.camera.position.x, newZ, level, r)) {
        this.camera.position.z = newZ
      }
    }

    let groundY = 0
    const px = this.camera.position.x; const pz = this.camera.position.z
    for (const plat of level.elevatedPlatforms || []) {
      const hs = plat.size / 2
      if (Math.abs(px - plat.position.x) <= hs && Math.abs(pz - plat.position.z) <= hs) {
        groundY = Math.max(groundY, plat.position.y)
      }
    }
    for (const sa of level.stairAreas || []) {
      if (Math.abs(px - sa.cx) < sa.hw && Math.abs(pz - sa.cz) < sa.hd) {
        const totalD = Math.abs(sa.platformZ - sa.groundZ)
        const playerD = Math.abs(pz - sa.groundZ)
        const t = Math.min(1, Math.max(0, playerD / totalD))
        groundY = Math.max(groundY, sa.cy * t)
      }
    }
    const targetGroundY = groundY + this.playerHeight
    const isOnGround = this.camera.position.y <= targetGroundY + 0.05

    if (this._jumpPressed && isOnGround && !this.jumping) {
      this.jumping = true
      this.jumpVelocity = 5
    }

    if (this.jumping || this.camera.position.y > targetGroundY) {
      this.jumpVelocity -= this.gravity * delta
      this.camera.position.y += this.jumpVelocity * delta
      if (this.camera.position.y <= targetGroundY) {
        this.camera.position.y = targetGroundY
        this.jumping = false
        this.jumpVelocity = 0
      }
    } else {
      this.camera.position.y = targetGroundY
    }
    this._isAirborne = this.camera.position.y > targetGroundY + 0.05

    if (this._shakeDuration > 0) {
      const amount = this._shakeIntensity * (this._shakeDuration / 300)
      this.camera.position.x += (Math.random() - 0.5) * amount * 0.1
      this.camera.position.y += (Math.random() - 0.5) * amount * 0.1
      this._shakeDuration -= delta * 1000
      if (this._shakeDuration <= 0) { this._shakeDuration = 0; this._shakeIntensity = 0 }
    }

    if (this._recoilPitch !== 0) {
      this._recoilPitch -= Math.sign(this._recoilPitch) * delta * this._recoilRecovery
      if (Math.abs(this._recoilPitch) < 0.001) this._recoilPitch = 0
    }
  }

  _checkCollisionXZ(x, z, level, r) {
    if (!level) return false
    for (const box of level.collisionBoxes) {
      if (x + r > box.min.x && x - r < box.max.x && z + r > box.min.z && z - r < box.max.z) {
        return true
      }
    }
    return false
  }

  getForward() {
    const dir = new THREE.Vector3(0, 0, -1)
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
    dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch)
    return dir
  }
}
