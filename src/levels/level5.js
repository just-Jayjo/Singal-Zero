import * as THREE from 'three'
import { PatrolBot } from '../enemies/patrolBot.js'
import { Rusher } from '../enemies/rusher.js'
import { Sniper } from '../enemies/sniper.js'
import { createBulletPickup, createMedkit, createGrenadePickup } from '../core/pickups.js'

const C = {
  bg: 0x181012,
  floor: 0x1c1416,
  wallBase: 0x22181c,
  wallPanel: 0x281e22,
  metalDark: 0x22181c,
  metalMid: 0x30262a,
  red: 0xff2222,
  darkRed: 0x880000,
  pulse: 0xff0044,
  gold: 0xffcc44
}

export class Level5 {
  constructor(scene, difficulty = 'normal', assets = null) {
    this.scene = scene
    this.difficulty = difficulty
    this.isTraining = difficulty === 'easy'
    this.isHard = difficulty === 'hard'
    this.atmosColor = this.isHard ? 0x040202 : this.isTraining ? 0x0a060a : 0x080406
    this.halfSize = this.isTraining ? 32 : 28
    this.size = this.halfSize * 2
    this.walls = []
    this.floorMeshes = []
    this.decorations = []
    this.lights = []
    this.pulseLights = []
    this.pulseTimer = 0
    this.ammoPickups = []
    this.healthPickups = []
    this.grenadePickups = []
    this.collisionBoxes = []
    this.assets = assets
    this.elevatedPlatforms = []
    this.stairAreas = []
  }

  build() {
    this.buildSky()
    this.buildCeiling()
    this.buildFloor()
    this.buildPerimeterWalls()
    this.buildRitualPlatform()
    this.buildFloorSigils()
    this.buildLighting()
    this.buildCeilingLights()
    this.buildFloorGlow()
    this.buildConduits()
    this.buildTerminals()
    this.computeCollisionBoxes()
  }

  buildSky() {
    const count = 200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const spread = this.halfSize - 2
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread * 2
      positions[i * 3 + 1] = 0.5 + Math.random() * 3
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2
      const c = new THREE.Color(this.isHard ? 0xff0044 : 0xff2244)
      c.multiplyScalar(0.15 + Math.random() * 0.25)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.04, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
      vertexColors: true
    })
    const pts = new THREE.Points(geo, mat)
    this.scene.add(pts)
    this.decorations.push(pts)
  }

  buildCeiling() {
    const mat = new THREE.MeshStandardMaterial({ color: C.bg, roughness: 0.7, metalness: 0.3 })
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.size + 4, this.size + 4), mat)
    ceil.rotation.x = Math.PI / 2
    ceil.position.y = 5.0
    this.scene.add(ceil)
    this.floorMeshes.push(ceil)

    const ringMat = new THREE.MeshStandardMaterial({
      color: C.darkRed, emissive: C.darkRed,
      emissiveIntensity: this.isHard ? 0.2 : 0.4,
      transparent: true, opacity: 0.12
    })
    for (let r = 2; r < 6; r++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 2, r * 2 + 0.05, 48), ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(0, 4.98, 0)
      this.scene.add(ring)
      this.floorMeshes.push(ring)
    }
  }

  buildFloor() {
    const step = this.isTraining ? 6 : 5
    const n = Math.floor(this.halfSize / step)
    const repeats = n * 2 / 5

    let floorMat
    const colorTex = this.assets?.textures.get('floorColor')
    const normalTex = this.assets?.textures.get('floorNormal')
    const roughTex = this.assets?.textures.get('floorRoughness')
    const metalTex = this.assets?.textures.get('floorMetalness')

    if (colorTex) {
      colorTex.wrapS = THREE.RepeatWrapping; colorTex.wrapT = THREE.RepeatWrapping; colorTex.repeat.set(repeats, repeats)
      if (normalTex) { normalTex.wrapS = THREE.RepeatWrapping; normalTex.wrapT = THREE.RepeatWrapping; normalTex.repeat.set(repeats, repeats) }
      if (roughTex) { roughTex.wrapS = THREE.RepeatWrapping; roughTex.wrapT = THREE.RepeatWrapping; roughTex.repeat.set(repeats, repeats) }
      if (metalTex) { metalTex.wrapS = THREE.RepeatWrapping; metalTex.wrapT = THREE.RepeatWrapping; metalTex.repeat.set(repeats, repeats) }
      floorMat = new THREE.MeshStandardMaterial({
        map: colorTex, normalMap: normalTex || undefined, roughnessMap: roughTex || undefined, metalnessMap: metalTex || undefined,
        roughness: 0.4, metalness: 0.8, color: 0x8899bb,
        emissive: C.red, emissiveIntensity: 0.02
      })
    } else {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024
      const ctx = canvas.getContext('2d')
      const bg = '#080406'; const panel = '#100a0c'; const seam = '#ff2222'; const bolt = '#6a2a2a'; const cells = 10
      const cellSize = 1024 / cells; const margin = cellSize * 0.08; const inner = cellSize - margin * 2
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 1024)
      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          const x = i * cellSize + margin, y = j * cellSize + margin
          ctx.fillStyle = panel; ctx.fillRect(x, y, inner, inner)
          ctx.strokeStyle = seam; ctx.globalAlpha = 0.1; ctx.lineWidth = 1; ctx.strokeRect(x, y, inner, inner); ctx.globalAlpha = 1
          for (const [dx, dz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            ctx.fillStyle = bolt; ctx.beginPath(); ctx.arc(x + inner/2 + dx*(inner/2-4), y + inner/2 + dz*(inner/2-4), 3, 0, Math.PI*2); ctx.fill()
          }
        }
      }
      for (let i = 0; i <= cells; i++) {
        const p = i * cellSize; ctx.strokeStyle = seam; ctx.globalAlpha = 0.08; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 1024); ctx.moveTo(0, p); ctx.lineTo(1024, p); ctx.stroke(); ctx.globalAlpha = 1
      }
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(n * 2 / cells, n * 2 / cells)
      floorMat = new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.5, metalness: 0.7, color: 0x88bbdd,
        emissive: C.red, emissiveIntensity: 0.03
      })
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.size + 4, this.size + 4), floorMat)
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; floor.receiveShadow = true
    this.scene.add(floor); this.floorMeshes.push(floor)
  }

  buildTerrain() {
    const rampMat = new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.6, metalness: 0.6 })
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.5, metalness: 0.7 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: this.isHard ? 0.15 : 0.3, transparent: true, opacity: 0.2 })
    const ramps = this.isTraining ? [[-12,0.5,-12],[12,0.5,12],[-12,0.5,12],[12,0.5,-12]] : [[-9,0.4,-9],[9,0.4,9],[-9,0.4,9],[9,0.4,-9]]
    for (const [rx, rh, rz] of ramps) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.0, rh, 1.0), rampMat)
      ramp.position.set(rx, rh/2, rz); ramp.rotation.x = 0.15
      ramp.castShadow = true; ramp.receiveShadow = true
      this.scene.add(ramp); this.decorations.push(ramp)
    }
    const platforms = this.isTraining ? [[-14,0.6,0,3],[14,0.6,0,3],[0,0.6,-14,3],[0,0.6,14,3]] : [[-11,0.5,0,2.5],[11,0.5,0,2.5],[0,0.5,-11,2.5],[0,0.5,11,2.5]]
    for (const [px, ph, pz, ps] of platforms) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(ps, ph, ps), platMat)
      plat.position.set(px, ph/2, pz)
      plat.receiveShadow = true; plat.castShadow = true
      this.scene.add(plat); this.decorations.push(plat)
      const lip = new THREE.Mesh(new THREE.BoxGeometry(ps+0.1, 0.03, ps+0.1), edgeMat)
      lip.position.set(px, ph+0.015, pz)
      this.scene.add(lip); this.decorations.push(lip)
    }
  }

  buildPerimeterWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: C.wallBase, roughness: 0.45, metalness: 0.65 })
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a0e0e, roughness: 0.5, metalness: 0.6 })
    const railMat = new THREE.MeshStandardMaterial({ color: 0x221212, roughness: 0.4, metalness: 0.7 })
    const h = this.halfSize
    const wh = 5.0

    const sides = [
      { pos: [0, wh / 2, -h], s: [this.size, wh, 0.12] },
      { pos: [0, wh / 2, h], s: [this.size, wh, 0.12] },
      { pos: [-h, wh / 2, 0], s: [0.12, wh, this.size] },
      { pos: [h, wh / 2, 0], s: [0.12, wh, this.size] }
    ]
    for (const s of sides) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(...s.s), wallMat)
      w.position.set(...s.pos)
      w.castShadow = true
      w.receiveShadow = true
      this.scene.add(w)
      this.walls.push(w)
    }

    const trimMat = new THREE.MeshStandardMaterial({
      color: C.red, emissive: C.red,
      emissiveIntensity: this.isHard ? 0.4 : 0.8
    })
    const dimRedMat = new THREE.MeshStandardMaterial({
      color: C.red, emissive: C.red,
      emissiveIntensity: this.isHard ? 0.15 : 0.3,
      transparent: true, opacity: 0.1
    })
    const inset = h - 0.06
    const panelW = this.isTraining ? 5 : 4
    const nPerSide = Math.floor((this.size - 2) / panelW)

    for (let side = 0; side < 4; side++) {
      for (let k = -nPerSide; k <= nPerSide; k++) {
        if (Math.abs(k) < 1) continue
        const cp = k * panelW
        let cx, cz, fz, fx
        if (side < 2) { cx = cp; cz = side === 0 ? -inset : inset; fz = cz; fx = 0 }
        else { cx = side === 2 ? -inset : inset; cz = cp; fx = cx; fz = 0 }

        const div = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.6, 0.03), frameMat)
        div.position.set(cx, 2.8, cz)
        this.scene.add(div); this.decorations.push(div)

        for (const py of [1.6, 4.0]) {
          const pw = panelW - 0.6
          const ph = 0.8
          const fd = 0.015
          const isXWall = side < 2
          const bars = isXWall
            ? [
                { s: [0.02, ph, fd], p: [cx - pw / 2, py, fz] },
                { s: [0.02, ph, fd], p: [cx + pw / 2, py, fz] },
                { s: [pw, 0.02, fd], p: [cx, py - ph / 2, fz] },
                { s: [pw, 0.02, fd], p: [cx, py + ph / 2, fz] }
              ]
            : [
                { s: [fd, ph, 0.02], p: [fx, py, cz - pw / 2] },
                { s: [fd, ph, 0.02], p: [fx, py, cz + pw / 2] },
                { s: [fd, 0.02, pw], p: [fx, py - ph / 2, cz] },
                { s: [fd, 0.02, pw], p: [fx, py + ph / 2, cz] }
              ]
          for (const b of bars) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(...b.s), frameMat)
            bar.position.set(...b.p)
            this.scene.add(bar); this.decorations.push(bar)
          }
        }
      }
    }

    for (const [x, y, z, w, hh, d] of [
      [0, 2.8, -inset, this.size, 0.05, 0.04],
      [0, 2.8, inset, this.size, 0.05, 0.04],
      [-inset, 2.8, 0, 0.04, 0.05, this.size],
      [inset, 2.8, 0, 0.04, 0.05, this.size]
    ]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), railMat)
      rail.position.set(x, y, z)
      this.scene.add(rail); this.decorations.push(rail)
    }

    for (const yOff of [-0.06, 0.06]) {
      for (const [x, y, z, w, hh, d] of [
        [0, 2.8 + yOff, -inset, this.size, 0.015, 0.035],
        [0, 2.8 + yOff, inset, this.size, 0.015, 0.035],
        [-inset, 2.8 + yOff, 0, 0.035, 0.015, this.size],
        [inset, 2.8 + yOff, 0, 0.035, 0.015, this.size]
      ]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), trimMat)
        strip.position.set(x, y, z)
        this.scene.add(strip); this.decorations.push(strip)
      }
    }

    for (const yPos of [0.1, 4.8]) {
      for (const [x, y, z, w, hh, d] of [
        [0, yPos, -inset, this.size, 0.03, 0.03],
        [0, yPos, inset, this.size, 0.03, 0.03],
        [-inset, yPos, 0, 0.03, 0.03, this.size],
        [inset, yPos, 0, 0.03, 0.03, this.size]
      ]) {
        const glow = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), yPos < 1 ? trimMat : dimRedMat)
        glow.position.set(x, y, z)
        this.scene.add(glow); this.decorations.push(glow)
      }
    }
  }

  buildRitualPlatform() {
    const baseMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.4, metalness: 0.7 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.35, metalness: 0.75 })
    const glowMat = new THREE.MeshStandardMaterial({
      color: C.red, emissive: C.red,
      emissiveIntensity: this.isHard ? 0.5 : 1.0
    })

    const pw = this.isTraining ? 10 : 7
    const pd = this.isTraining ? 0.4 : 0.3

    const base = new THREE.Mesh(new THREE.CylinderGeometry(pw / 2, pw / 2 + 0.5, pd, 16), baseMat)
    base.position.set(0, pd / 2, 0)
    base.receiveShadow = true
    base.castShadow = true
    this.scene.add(base)
    this.decorations.push(base)

    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(pw / 2, 0.06, 8, 24),
      edgeMat
    )
    edge.position.set(0, pd + 0.03, 0)
    edge.rotation.x = Math.PI / 2
    this.scene.add(edge)
    this.decorations.push(edge)

    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(pw / 4, 0.04, 8, 24),
      glowMat
    )
    inner.position.set(0, pd + 0.04, 0)
    inner.rotation.x = Math.PI / 2
    this.scene.add(inner)
    this.decorations.push(inner)

    const steps = this.isTraining ? 4 : 3
    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(pw / 2 - i * 0.3, 0.1, 0.4),
        edgeMat
      )
      const angle = (i / steps) * Math.PI * 2
      step.position.set(
        Math.sin(angle) * (pw / 2 + 0.3),
        0.05,
        Math.cos(angle) * (pw / 2 + 0.3)
      )
      this.scene.add(step)
      this.decorations.push(step)
      this.walls.push(step)
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: C.pulse, emissive: C.pulse,
      emissiveIntensity: this.isHard ? 1.0 : 2.0
    })
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), coreMat)
    core.position.set(0, pd + 0.15, 0)
    this.scene.add(core)
    this.decorations.push(core)

    const pillarMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.3, metalness: 0.8 })
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      const pr = pw / 2 + 0.5
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 3.5, 0.3),
        pillarMat
      )
      pillar.position.set(Math.cos(angle) * pr, 1.25, Math.sin(angle) * pr)
      pillar.castShadow = true
      this.scene.add(pillar)
      this.walls.push(pillar)
      this.decorations.push(pillar)

      const topGlow = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), glowMat)
      topGlow.position.set(Math.cos(angle) * pr, 3.52, Math.sin(angle) * pr)
      this.scene.add(topGlow)
      this.decorations.push(topGlow)
    }
  }

  buildMonoliths() {
    const monMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.3, metalness: 0.85 })
    const runeMat = new THREE.MeshStandardMaterial({
      color: C.red, emissive: C.red,
      emissiveIntensity: this.isHard ? 0.3 : 0.6,
      transparent: true, opacity: 0.3
    })

    const count = this.isTraining ? 4 : 6
    const r = this.halfSize * 0.6

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.3
      const mx = Math.cos(angle) * r
      const mz = Math.sin(angle) * r

      const mw = this.isTraining ? 1.0 : 0.7
      const mh = this.isTraining ? 3.5 : 3.0

      const body = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, 0.4), monMat)
      body.position.set(mx, mh / 2, mz)
      body.castShadow = true
      this.scene.add(body)
      this.walls.push(body)
      this.decorations.push(body)

      const rune = new THREE.Mesh(new THREE.PlaneGeometry(mw * 0.6, mh * 0.5), runeMat)
      rune.position.set(
        mx + 0.21 * Math.cos(angle),
        mh / 2,
        mz + 0.21 * Math.sin(angle)
      )
      rune.rotation.y = -angle
      this.scene.add(rune)
      this.decorations.push(rune)
    }
  }

  buildFloorSigils() {
    const sigilMat = new THREE.MeshStandardMaterial({
      color: C.pulse, emissive: C.pulse,
      emissiveIntensity: this.isHard ? 0.15 : 0.3,
      transparent: true, opacity: 0.08
    })

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const sr = 3 + Math.random() * 4
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(sr, sr + 0.04, 32),
        sigilMat
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(
        Math.cos(angle) * 6,
        0.008,
        Math.sin(angle) * 6
      )
      this.scene.add(ring)
      this.floorMeshes.push(ring)
    }
  }

  buildHeightFeatures() {
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.4, metalness: 0.8 })
    const rampMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.5, metalness: 0.6 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: this.isHard ? 0.15 : 0.3, transparent: true, opacity: 0.2 })

    const elevated = [
      { x: -13, z: -13, w: 2.0, h: 0.9, s: 2.0 },
      { x: 13, z: 13, w: 2.0, h: 0.9, s: 2.0 },
      { x: -13, z: 13, w: 2.0, h: 0.7, s: 1.5 },
      { x: 13, z: -13, w: 2.0, h: 0.7, s: 1.5 }
    ]
    for (const e of elevated) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(e.w, e.h, e.s), platMat)
      plat.position.set(e.x, e.h / 2, e.z)
      plat.receiveShadow = true; plat.castShadow = true
      this.scene.add(plat); this.decorations.push(plat)
      const lip = new THREE.Mesh(new THREE.BoxGeometry(e.w + 0.1, 0.03, e.s + 0.1), edgeMat)
      lip.position.set(e.x, e.h + 0.015, e.z)
      this.scene.add(lip); this.decorations.push(lip)
      for (let side = 0; side < 4; side++) {
        const angle = (side / 4) * Math.PI * 2
        const stair = new THREE.Mesh(new THREE.BoxGeometry(0.25, e.h * 0.5, 0.25), rampMat)
        stair.position.set(
          e.x + Math.sin(angle) * (e.w / 2 + 0.25),
          e.h * 0.25,
          e.z + Math.cos(angle) * (e.s / 2 + 0.25)
        )
        this.scene.add(stair); this.decorations.push(stair)
      }
    }

    const pillars = []
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      const r = this.halfSize * 0.5
      pillars.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r })
    }
    for (const p of pillars) {
      for (let layer = 0; layer < 3; layer++) {
        const debris = new THREE.Mesh(
          new THREE.BoxGeometry(0.3 + Math.random() * 0.4, 0.1 + Math.random() * 0.15, 0.3 + Math.random() * 0.4),
          rampMat
        )
        debris.position.set(
          p.x + (Math.random() - 0.5) * 0.5,
          0.05 + layer * 0.15,
          p.z + (Math.random() - 0.5) * 0.5
        )
        debris.rotation.set(Math.random() * 0.3, Math.random() * 0.3, 0)
        this.scene.add(debris); this.decorations.push(debris)
      }
    }
  }

  buildElevatedPlatforms() {
    const gc = C.red
    const eI = this.isHard ? 0.25 : 0.4
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.5, metalness: 0.7 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI, transparent: true, opacity: 0.35 })
    const stairMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.6, metalness: 0.5 })
    const railMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: this.isHard ? 0.25 : 0.5, transparent: true, opacity: 0.2 })
    const supMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.3, metalness: 0.85 })
    const stripMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI * 0.6, transparent: true, opacity: 0.15 })
    const glowMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI * 1.2 })
    const dimMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: this.isHard ? 0.15 : 0.3, transparent: true, opacity: 0.06 })
    const trimMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.4, metalness: 0.8 })
    const boltMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI, metalness: 0.9, roughness: 0.2 })

    const positions = this.isTraining
      ? [[-12, 3.0, -12, 2.5], [12, 3.0, -12, 2.5], [-12, 3.0, 12, 2.5], [12, 3.0, 12, 2.5]]
      : [[-9, 3.0, -9, 2], [9, 3.0, -9, 2], [-9, 3.0, 9, 2], [9, 3.0, 9, 2],
         [-16, 2.5, -7, 1.8], [16, 2.5, 7, 1.8], [-7, 2.5, -16, 1.8], [7, 2.5, 16, 1.8]]

    for (const [px, ph, pz, ps] of positions) {
      const hs = ps / 2

      const plat = new THREE.Mesh(new THREE.BoxGeometry(ps, ph, ps), platMat)
      plat.position.set(px, ph / 2, pz)
      plat.castShadow = true; plat.receiveShadow = true
      this.scene.add(plat); this.decorations.push(plat)
      this.elevatedPlatforms.push({ position: new THREE.Vector3(px, ph, pz), size: ps })

      const ew = 0.03
      for (const [ex, ez] of [[-hs, 0], [hs, 0]]) {
        const xw = ex !== 0 ? ew : ps; const zw = ex !== 0 ? ps : ew
        this.collisionBoxes.push(new THREE.Box3(
          new THREE.Vector3(px + ex - xw / 2, 0, pz + ez - zw / 2),
          new THREE.Vector3(px + ex + xw / 2, ph, pz + ez + zw / 2)
        ))
      }

      const lip = new THREE.Mesh(new THREE.BoxGeometry(ps + 0.08, 0.04, ps + 0.08), edgeMat)
      lip.position.set(px, ph + 0.02, pz)
      this.scene.add(lip); this.decorations.push(lip)

      const band = new THREE.Mesh(new THREE.BoxGeometry(ps + 0.04, 0.03, ps + 0.04), dimMat)
      band.position.set(px, ph * 0.5, pz)
      this.scene.add(band); this.decorations.push(band)

      const pOff = ps * 0.4
      for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const cx = px + sx * pOff; const cz = pz + sz * pOff

        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, ph, 0.1), supMat)
        pillar.position.set(cx, ph / 2, cz)
        pillar.castShadow = true
        this.scene.add(pillar); this.decorations.push(pillar)
        this.collisionBoxes.push(new THREE.Box3(
          new THREE.Vector3(cx - 0.06, 0, cz - 0.06),
          new THREE.Vector3(cx + 0.06, ph, cz + 0.06)
        ))

        for (const [fx, fz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const fl = new THREE.Mesh(
            new THREE.BoxGeometry(fx !== 0 ? 0.004 : 0.07, ph * 0.6, fz !== 0 ? 0.004 : 0.07),
            dimMat
          )
          fl.position.set(cx + fx * 0.055, ph * 0.5, cz + fz * 0.055)
          this.scene.add(fl); this.decorations.push(fl)
        }

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.13), trimMat)
        cap.position.set(cx, ph - 0.02, cz)
        this.scene.add(cap); this.decorations.push(cap)

        const base = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.13), trimMat)
        base.position.set(cx, 0.02, cz)
        this.scene.add(base); this.decorations.push(base)

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 8), edgeMat)
        ring.position.set(cx, 0.015, cz)
        ring.rotation.x = Math.PI / 2
        this.scene.add(ring); this.decorations.push(ring)

        const vStrip = new THREE.Mesh(new THREE.BoxGeometry(0.015, ph * 0.6, 0.015), stripMat)
        vStrip.position.set(cx, ph * 0.5, cz)
        this.scene.add(vStrip); this.decorations.push(vStrip)

        const topLight = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), glowMat)
        topLight.position.set(cx, ph, cz)
        this.scene.add(topLight); this.decorations.push(topLight)

        for (const [bx, bz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4), boltMat)
          bolt.position.set(cx + bx * 0.055, ph * 0.5, cz + bz * 0.055)
          this.scene.add(bolt); this.decorations.push(bolt)
        }
      }

      for (const [sx, sz] of [[-hs, 0], [hs, 0], [0, -hs], [0, hs]]) {
        const ix = sx !== 0
        const rL = ix ? ps * 0.82 : 0.03; const rW = ix ? 0.03 : ps * 0.82

        const tR = new THREE.Mesh(new THREE.BoxGeometry(rL, 0.03, rW), railMat)
        tR.position.set(px + sx, ph + 0.32, pz + sz)
        this.scene.add(tR); this.decorations.push(tR)
        if (ix) this.collisionBoxes.push(new THREE.Box3(
          new THREE.Vector3(px + sx - 0.02, ph + 0.3, pz + sz - ps * 0.41),
          new THREE.Vector3(px + sx + 0.02, ph + 0.35, pz + sz + ps * 0.41)
        ))

        const bR = new THREE.Mesh(new THREE.BoxGeometry(rL, 0.025, rW), railMat)
        bR.position.set(px + sx, ph + 0.1, pz + sz)
        this.scene.add(bR); this.decorations.push(bR)

        const eStrip = new THREE.Mesh(new THREE.BoxGeometry(ix ? 0.015 : ps * 0.78, 0.2, ix ? ps * 0.78 : 0.015), stripMat)
        eStrip.position.set(px + sx * (ix ? 1 : 0.05), ph * 0.4, pz + sz * (ix ? 0.05 : 1))
        this.scene.add(eStrip); this.decorations.push(eStrip)

        const nP = Math.max(2, Math.floor(ps / 0.6))
        for (let i = 0; i <= nP; i++) {
          const t = (i / nP - 0.5) * ps * (ix ? 0 : 0.82)
          const post = new THREE.Mesh(new THREE.BoxGeometry(ix ? 0.02 : 0.035, 0.25, ix ? 0.035 : 0.02), railMat)
          post.position.set(px + sx + (ix ? 0 : t), ph + 0.2, pz + sz + (ix ? t : 0))
          this.scene.add(post); this.decorations.push(post)
          this.collisionBoxes.push(new THREE.Box3(
            new THREE.Vector3(post.position.x - (ix ? 0.012 : 0.02), ph, post.position.z - (ix ? 0.02 : 0.012)),
            new THREE.Vector3(post.position.x + (ix ? 0.012 : 0.02), ph + 0.26, post.position.z + (ix ? 0.02 : 0.012))
          ))
        }
      }

      for (const sm of [-1, 1]) {
        const nS = Math.ceil(ph / 0.4)
        let stepMinZ = 0; let stepMaxZ = 0
        for (let i = 0; i < nS; i++) {
          const stepZ = pz + sm * (hs + (nS - 1 - i + 0.5) * 0.3)
          const stepY = 0.06 + (i / nS) * ph
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.3), stairMat)
          step.position.set(px, stepY, stepZ)
          step.receiveShadow = true
          this.scene.add(step); this.decorations.push(step)
          const sGlow = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.015, 0.02), glowMat)
          sGlow.position.set(px, stepY + 0.07, stepZ + sm * 0.15)
          this.scene.add(sGlow); this.decorations.push(sGlow)
          if (i === 0) stepMinZ = stepZ
          if (i === nS - 1) stepMaxZ = stepZ
        }
        if (nS > 0) {
          this.stairAreas.push({
            cx: px, cy: ph,
            cz: (stepMinZ + stepMaxZ) / 2,
            hw: 0.85 / 2 + 0.1,
            hd: Math.abs(stepMaxZ - stepMinZ) / 2 + 0.25,
            platformZ: stepMaxZ, groundZ: stepMinZ, direction: sm
          })
        }
      }
    }
  }

  buildRobotDecorations() {
    const robotModel = this.assets?.models.get('sci-fi_turret_animated_by_get3dmodels')
    if (!robotModel) return

    const rScale = this.isTraining ? 1.0 : 0.7
    const positions = this.isTraining
      ? [[-16, 0, 0], [16, 0, 0], [0, 0, -16], [0, 0, 16]]
      : [[-12, 0, 0], [12, 0, 0], [0, 0, -12], [0, 0, 12], [-10, 0, 10], [10, 0, -10]]

    for (const [rx, _, rz] of positions) {
      if (this.checkCollision(new THREE.Vector3(rx, 0, rz), 0.8)) continue
      const inst = robotModel.clone()
      inst.scale.setScalar(rScale)
      inst.position.set(rx, 0.01, rz)
      inst.rotation.y = Math.random() * Math.PI * 2
      inst.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true } })
      this.scene.add(inst); this.decorations.push(inst)
      this.collisionBoxes.push(new THREE.Box3(
        new THREE.Vector3(rx - 0.5, 0, rz - 0.5),
        new THREE.Vector3(rx + 0.5, 1.2, rz + 0.5)
      ))
    }
  }

  buildLighting() {
    const amb = new THREE.AmbientLight(0x663344, 0.35)
    this.scene.add(amb); this.lights.push(amb)

    const lc = 0xff2222
    const li = this.isTraining ? 4.5 : this.isHard ? 2.5 : 3.8

    const positions = [[0, 4.8, 0],
      [-8, 4.8, -8], [8, 4.8, -8],
      [-8, 4.8, 8], [8, 4.8, 8],
      [0, 4.8, -12], [0, 4.8, 12], [-12, 4.8, 0], [12, 4.8, 0]]

    const bulbMat = new THREE.MeshStandardMaterial({
      color: lc, emissive: lc,
      emissiveIntensity: this.isTraining ? 0.7 : this.isHard ? 0.25 : 0.5,
      transparent: true, opacity: this.isHard ? 0.4 : 0.6
    })

    for (const [x, y, z] of positions) {
      const light = new THREE.PointLight(lc, li, this.isTraining ? 35 : 28)
      light.position.set(x, y, z)
      this.scene.add(light)
      this.lights.push(light)
      this.pulseLights.push(light)

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), bulbMat)
      bulb.position.copy(light.position)
      this.scene.add(bulb)
    }
  }

  buildCeilingLights() {
    const gc = 0xff2222
    const eI = this.isHard ? 0.12 : 0.25
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0e, metalness: 0.8, roughness: 0.3 })
    const fixMat = new THREE.MeshStandardMaterial({ color: 0x2a1018, metalness: 0.7, roughness: 0.4 })
    const glowMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI * 2 })
    const h = this.halfSize - 1
    for (const [px, pz] of [[-h * 0.6, -h * 0.6], [h * 0.6, -h * 0.6], [-h * 0.6, h * 0.6], [h * 0.6, h * 0.6]]) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), wireMat)
      wire.position.set(px, 4.9, pz); this.scene.add(wire); this.decorations.push(wire)
      const fix = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), fixMat)
      fix.position.set(px, 4.6, pz); this.scene.add(fix); this.decorations.push(fix)
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), glowMat)
      glow.position.set(px, 4.55, pz); this.scene.add(glow); this.decorations.push(glow)
    }
  }

  buildFloorGlow() {
    const gc = 0xff2222
    const eI = this.isHard ? 0.06 : 0.12
    const stripMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI, transparent: true, opacity: 0.06 })
    const h = this.halfSize - 1
    for (const [x, z, w, d] of [[0, -h * 0.7, h * 0.4, 0.025], [0, h * 0.7, h * 0.4, 0.025], [-h * 0.7, 0, 0.025, h * 0.4], [h * 0.7, 0, 0.025, h * 0.4]]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.005, d), stripMat)
      strip.position.set(x, 0.015, z); this.scene.add(strip); this.floorMeshes.push(strip)
    }
  }

  buildConduits() {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0e, metalness: 0.8, roughness: 0.3 })
    const jointMat = new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: this.isHard ? 0.15 : 0.3, transparent: true, opacity: 0.15 })
    const h = this.halfSize - 1
    const placements = [[-h, -h * 0.4], [h, -h * 0.4], [-h, h * 0.4], [h, h * 0.4]]
    for (const [px, pz] of placements) {
      const dir = Math.random() > 0.5 ? 'x' : 'z'
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.25, 6), pipeMat)
        seg.position.set(dir === 'x' ? px + (i - 2) * 0.3 : px + (Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 2, dir === 'z' ? pz + (i - 2) * 0.3 : pz + (Math.random() - 0.5) * 1.5)
        seg.rotation.z = dir === 'x' ? Math.PI / 2 : 0; this.scene.add(seg); this.decorations.push(seg)
        if (i % 3 === 0) {
          const joint = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 8), jointMat)
          joint.position.copy(seg.position); joint.rotation.x = Math.PI / 2; this.scene.add(joint); this.decorations.push(joint)
        }
      }
    }
  }

  buildTerminals() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.4, metalness: 0.7 })
    const screenMat = new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: 0.5 })
    const n = this.isTraining ? 4 : 2
    const r = this.halfSize - 2
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + 0.3
      const tx = Math.cos(angle) * r; const tz = Math.sin(angle) * r
      const rot = -angle + Math.PI
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.2), bodyMat)
      body.position.set(tx, 0.4, tz); this.scene.add(body); this.decorations.push(body)
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), screenMat)
      screen.position.set(tx + 0.11 * Math.sin(rot), 0.6, tz + 0.11 * Math.cos(rot))
      screen.rotation.y = rot; this.scene.add(screen); this.decorations.push(screen)
    }
  }

  updatePulse(delta) {
    if (this.pulseLights.length === 0) return
    this.pulseTimer += delta
    const intensity = 0.6 + 0.4 * Math.sin(this.pulseTimer * 2)
    for (const light of this.pulseLights) {
      light.intensity = (this.isHard ? 1.0 : 1.5) * intensity
    }
  }

  spawnEnemies(game) {
    const count = this.isTraining ? 5 : this.isHard ? 7 : 6
    const spawnR = this.halfSize * 0.8
    const placed = []

    const spawnOne = (EnemyClass, idx, extra, overridePos) => {
      let pos, attempts = 0
      if (overridePos) {
        pos = overridePos.clone()
      } else {
        const baseAngle = (idx / count) * Math.PI * 2
        while (attempts < 25) {
          const angle = baseAngle + (Math.random() - 0.5) * (Math.PI * 2 / count) * 1.5
          const dist = spawnR * 0.1 + Math.random() * spawnR * 0.8
          const x = Math.cos(angle) * dist; const z = Math.sin(angle) * dist
          pos = new THREE.Vector3(x, 0, z)
          const tooClose = placed.some(p => p.distanceTo(pos) < 12)
          const nearCenter = pos.length() < 4
          const blocked = this.checkCollision(pos, 0.5)
          if (!tooClose && !nearCenter && !blocked) break
          attempts++
        }
      }
      if (!pos || attempts >= 25) return
      const e = new EnemyClass(pos)
      if (overridePos) e.mesh.position.y = overridePos.y
      e.hp *= game.difficultyModifiers[game.difficulty].enemyHp
      if (extra) extra(e)
      game.scene.add(e.mesh); game.enemies.push(e)
      placed.push(pos.clone())
    }

    const types = ['patrol', 'rusher', 'sniper', 'rusher', 'patrol', 'patrol']
    if (this.isHard) types.push('sniper')

    let floorCount = this.isTraining ? count : Math.ceil(count * 0.6)
    for (let i = 0; i < floorCount && i < types.length; i++) {
      if (types[i] === 'rusher') {
        spawnOne(Rusher, i)
      } else if (types[i] === 'sniper') {
        spawnOne(Sniper, i, e => { if (this.isHard) { e.damage *= 1.4; e.speed *= 1.2 } })
      } else {
        spawnOne(PatrolBot, i, e => { if (this.isHard) { e.speed *= 1.5; e.damage *= 1.4 }; e.detectionRange = 20 })
      }
    }

    if (!this.isTraining && this.elevatedPlatforms.length > 0) {
      const elevatedCount = count - floorCount
      const shuffled = this.elevatedPlatforms.slice().sort(() => Math.random() - 0.5)
      for (let n = 0; n < Math.min(elevatedCount, shuffled.length); n++) {
        const plat = shuffled[n]
        const pos = plat.position.clone()
        pos.y = plat.position.y + 0.5
        spawnOne(PatrolBot, n, e => { if (this.isHard) e.speed *= 1.2; e.mesh.position.y = pos.y }, pos)
      }
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

  buildAmmoPickups() {
    const positions = [[-6, -6], [6, 6]]
    for (const [x, z] of positions) {
      const bullet = createBulletPickup()
      bullet.position.set(x, 1.2, z)
      this.scene.add(bullet)
      this.ammoPickups.push(bullet)
      this.decorations.push(bullet)
    }
  }

  buildHealthPickups() {
    const positions = [[-6, 6], [6, -6]]
    for (const [x, z] of positions) {
      const medkit = createMedkit()
      medkit.position.set(x, 1.2, z)
      this.scene.add(medkit)
      this.healthPickups.push(medkit)
      this.decorations.push(medkit)
    }
  }

  buildGrenadePickups() {
    const positions = [[-10, 0], [10, 0]]
    for (const [x, z] of positions) {
      const grenade = createGrenadePickup()
      grenade.position.set(x, 1.2, z)
      this.scene.add(grenade)
      this.grenadePickups.push(grenade)
      this.decorations.push(grenade)
    }
  }

  updatePickups(delta) {
    const t = performance.now() * 0.001
    for (const p of this.ammoPickups) {
      p.position.y = 1.2 + Math.sin(t * 2 + p.position.x * 0.1) * 0.15
      p.rotation.y += delta * 1.5
    }
    for (const p of this.healthPickups) {
      p.position.y = 1.2 + Math.sin(t * 1.8 + p.position.z * 0.1) * 0.15
      p.rotation.y += delta * 1.2
    }
    for (const p of this.grenadePickups) {
      p.position.y = 1.2 + Math.sin(t * 2.2 + p.position.x * 0.15) * 0.15
      p.rotation.y += delta * 2.0
    }
  }

  clear() {
    for (const list of [this.walls, this.floorMeshes, this.decorations, this.lights, this.pulseLights, this.ammoPickups, this.healthPickups, this.grenadePickups]) {
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
    this.pulseLights = []
    this.ammoPickups = []
    this.healthPickups = []
    this.grenadePickups = []
    this.collisionBoxes = []
    this.elevatedPlatforms = []
    this.stairAreas = []
  }
}
