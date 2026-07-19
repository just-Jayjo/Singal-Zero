import * as THREE from 'three'
import { TargetDummy } from '../enemies/targetDummy.js'
import { DartboardTarget } from '../enemies/dartboardTarget.js'

export class TrainingRange {
  constructor(scene, difficulty = 'easy', noObstacles = false) {
    this.scene = scene
    this.halfSize = 30
    this.size = this.halfSize * 2
    this.walls = []
    this.floorMeshes = []
    this.decorations = []
    this.lights = []
    this.ammoPickups = []
    this.healthPickups = []
    this.grenadePickups = []
    this.collisionBoxes = []
    this.elevatedPlatforms = []
    this.stairAreas = []
    this._noObstacles = noObstacles
  }

  build() {
    this.buildFloor()
    this.buildWalls()
    this.buildCeiling()
    this.buildLights()
    this.buildDistanceMarkers()
    if (!this._noObstacles) this.buildObstacles()
    this.computeCollisionBoxes()
  }

  buildFloor() {
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a2233, metalness: 0.5, roughness: 0.4
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    this.scene.add(floor)
    this.floorMeshes.push(floor)

    /* 地面格線 */
    const gridHelper = new THREE.GridHelper(this.size, 20, 0x00f2ff, 0x334466)
    gridHelper.position.y = 0.01
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.3
    this.scene.add(gridHelper)
    this.decorations.push(gridHelper)
  }

  buildWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0a1220, metalness: 0.6, roughness: 0.5
    })
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a44, emissive: 0x0044aa, emissiveIntensity: 0.1
    })
    const h = 8

    for (const [x, z, w, d] of [[0, -this.halfSize, this.size, 0.3], [0, this.halfSize, this.size, 0.3],
                                  [-this.halfSize, 0, 0.3, this.size], [this.halfSize, 0, 0.3, this.size]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w || 0.3, h, d || 0.3), wallMat)
      wall.position.set(x, h / 2, z)
      this.scene.add(wall)
      this.walls.push(wall)

      const trim = new THREE.Mesh(new THREE.BoxGeometry((w || 0.3) + 0.1, 0.04, (d || 0.3) + 0.1), trimMat)
      trim.position.set(x, h - 0.02, z)
      this.scene.add(trim)
      this.decorations.push(trim)
    }
  }

  buildCeiling() {
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x080e18, metalness: 0.3, roughness: 0.8
    })
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), ceilMat)
    ceil.rotation.x = Math.PI / 2
    ceil.position.y = 8
    this.scene.add(ceil)
    this.decorations.push(ceil)
  }

  buildLights() {
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 0.5
    })
    for (let x = -20; x <= 20; x += 8) {
      for (let z = -20; z <= 20; z += 8) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), lightMat)
        panel.position.set(x, 7.95, z)
        panel.rotation.x = Math.PI / 2
        this.scene.add(panel)
        this.lights.push(panel)

        const light = new THREE.DirectionalLight(0xaaccff, 0.3)
        light.position.set(x, 8, z)
        this.scene.add(light)
        this.lights.push(light)
      }
    }
    const amb = new THREE.AmbientLight(0x88aacc, 1.5)
    this.scene.add(amb)
    this.lights.push(amb)
  }

  buildDistanceMarkers() {
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0x00f2ff, emissive: 0x00aaff, emissiveIntensity: 0.2, transparent: true, opacity: 0.6
    })
    for (let dist = 5; dist <= 25; dist += 5) {
      const marker = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.3), markerMat)
      marker.position.set(dist, 0.02, 0)
      marker.rotation.x = -Math.PI / 2
      this.scene.add(marker)
      this.decorations.push(marker)

      /* 距離標示柱 */
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x4466aa, emissive: 0x2244aa, emissiveIntensity: 0.2 }))
      pole.position.set(dist, 0.25, -1.5)
      this.scene.add(pole)
      this.decorations.push(pole)
    }
  }

  buildObstacles() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2a44, metalness: 0.6, roughness: 0.5 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.5, roughness: 0.7 })
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x223355, metalness: 0.7, roughness: 0.3 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x0088cc, emissiveIntensity: 0.2 })
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x2a3a55, metalness: 0.5, roughness: 0.6 })
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x335577, metalness: 0.6, roughness: 0.4 })

    this._addWall = (x, z, w, h, d, mat = wallMat) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      box.position.set(x, h / 2, z)
      box.castShadow = true
      box.receiveShadow = true
      this.scene.add(box)
      this.walls.push(box)
      return box
    }
    this._addTrim = (x, z, w, d, yOffset) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.04, d + 0.06), glowMat)
      t.position.set(x, yOffset, z)
      this.scene.add(t)
      this.decorations.push(t)
    }

    /* —— 障礙群（寬面沿 Z 軸擋敵） —— */

    /* 左側橫向擋牆 — 阻擋敵方從 +X 接近的側面路線 */
    this._addWall(5, -6, 0.35, 3.5, 2.4)
    this._addTrim(5, -6, 0.35, 2.4, 3.5)
    this._addWall(5, -2.5, 1.6, 1.8, 0.35, darkMat)
    this._addTrim(5, -2.5, 1.6, 0.35, 1.8)

    this._addWall(10, -7, 0.35, 3.5, 3.0)
    this._addTrim(10, -7, 0.35, 3.0, 3.5)
    this._addWall(10, -3.5, 2.4, 1.8, 0.35, darkMat)
    this._addTrim(10, -3.5, 2.4, 0.35, 1.8)

    /* 中央柱 */
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.0, 0.5), pillarMat)
    pillar.position.set(7, 1.5, 0)
    pillar.castShadow = true
    this.scene.add(pillar)
    this.walls.push(pillar)
    const pillarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 8), glowMat)
    pillarTrim.position.set(7, 3.0, 0)
    pillarTrim.rotation.x = Math.PI / 2
    this.scene.add(pillarTrim)
    this.decorations.push(pillarTrim)

    /* —— 中央縱向擋牆 —— */
    this._addWall(14, -5, 0.35, 3.0, 2.4)
    this._addTrim(14, -5, 0.35, 2.4, 3.0)
    this._addWall(14, 5, 0.35, 3.0, 2.4)
    this._addTrim(14, 5, 0.35, 2.4, 3.0)

    /* 中央U型掩體 */
    this._addWall(15, 0, 2.8, 2.5, 0.35)
    this._addTrim(15, 0, 2.8, 0.35, 2.5)

    /* —— 右側擋牆 —— */
    this._addWall(11, 3.5, 2.4, 1.8, 0.35, darkMat)
    this._addTrim(11, 3.5, 2.4, 0.35, 1.8)

    this._addWall(11, 7, 0.35, 3.5, 3.0)
    this._addTrim(11, 7, 0.35, 3.0, 3.5)

    /* 貨櫃堆疊 */
    for (const [cx, cz, ch] of [[18, -3.5, 1.2], [18, -3.5, 2.0], [18, 3.5, 1.2], [18, 3.5, 2.0]]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), crateMat)
      crate.position.set(cx, ch, cz)
      crate.castShadow = true
      crate.receiveShadow = true
      this.scene.add(crate)
      this.walls.push(crate)
      const accent = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.9), accentMat)
      accent.position.set(cx, ch - 0.4, cz)
      this.scene.add(accent)
      this.decorations.push(accent)
    }

    /* —— 遠端擋牆 —— */
    this._addWall(21, -5, 0.35, 2.5, 2.4, darkMat)
    this._addTrim(21, -5, 0.35, 2.4, 2.5)
    this._addWall(21, 5, 0.35, 2.5, 2.4, darkMat)
    this._addTrim(21, 5, 0.35, 2.4, 2.5)
  }

  spawnTargets(game) {
    const targetPositions = [
      { x: 8, z: -3, moving: false }, { x: 8, z: 3, moving: false },
      { x: 13, z: -5, moving: false }, { x: 13, z: 5, moving: false },
      { x: 18, z: -3, moving: false }, { x: 18, z: 3, moving: false },
      { x: 24, z: -4, moving: false }, { x: 24, z: 4, moving: false },
      { x: 10, z: 0, moving: true }, { x: 16, z: -1, moving: true },
      { x: 16, z: 1, moving: true }, { x: 22, z: 0, moving: true },
    ]
    for (const t of targetPositions) {
      const dummy = new TargetDummy(new THREE.Vector3(t.x, 0.3, t.z), t.moving)
      game.scene.add(dummy.mesh)
      game.enemies.push(dummy)
    }

    /* 壁掛飛鏢靶 — 東牆 (x=30)，面朝 -X */
    const wallFaceX = this.halfSize - 0.15
    const wallNormal = new THREE.Vector3(-1, 0, 0)
    const dartboardPositions = [
      { z: -3, y: 1.6 }, { z: 3, y: 1.6 },
    ]
    for (const t of dartboardPositions) {
      const db = new DartboardTarget(new THREE.Vector3(wallFaceX, t.y, t.z), wallNormal)
      game.scene.add(db.mesh)
      game.enemies.push(db)
    }
  }

  computeCollisionBoxes() {
    try {
      this.scene.updateMatrixWorld(true)
      for (const wall of this.walls) {
        if (!wall.geometry) continue
        const box = new THREE.Box3().setFromObject(wall)
        this.collisionBoxes.push(box)
      }
    } catch (e) {
      console.warn('computeCollisionBoxes error:', e)
    }
  }

  checkCollision(position, radius) {
    for (const box of this.collisionBoxes) {
      const test = new THREE.Box3(
        new THREE.Vector3(position.x - radius, position.y - radius, position.z - radius),
        new THREE.Vector3(position.x + radius, position.y + radius + 1, position.z + radius)
      )
      if (box.intersectsBox(test)) return true
    }
    return false
  }

  buildAmmoPickups() {}
  buildHealthPickups() {}
  buildGrenadePickups() {}
  updatePickups(delta) {}

  clear() {
    for (const list of [this.walls, this.floorMeshes, this.decorations, this.lights, this.ammoPickups, this.healthPickups, this.grenadePickups]) {
      for (const obj of list) {
        this.scene.remove(obj)
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        }
      }
    }
    this.walls = []
    this.floorMeshes = []
    this.decorations = []
    this.lights = []
    this.ammoPickups = []
    this.healthPickups = []
    this.grenadePickups = []
    this.collisionBoxes = []
    this.elevatedPlatforms = []
    this.stairAreas = []
  }
}
