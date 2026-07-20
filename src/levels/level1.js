import * as THREE from 'three'
import { PatrolBot } from '../enemies/patrolBot.js'
import { Rusher } from '../enemies/rusher.js'
import { createBulletPickup, createMedkit, createGrenadePickup } from '../core/pickups.js'

const C = {
    bg: 0x0a1420,
    floor: 0x0f1a2a,
    floorLine: 0x1a324a,
    wallBase: 0x101e2e,
    wallPanel: 0x142436,
    colBase: 0x0f1a2a,
    colAccent: 0x1a2e42,
    cyan: 0x00f2ff,
    red: 0xff3e3e,
    amber: 0xffb800,
    metalDark: 0x162436,
    metalMid: 0x1e3046,
    trim: 0x00f2ff
  }

export class Level1 {
  constructor(scene, difficulty = 'normal', assets = null) {
    this.scene = scene
    this.difficulty = difficulty
    this.isHard = difficulty === 'hard'
    this.isTraining = difficulty === 'easy'
    this.atmosColor = this.isHard ? 0x080e14 : this.isTraining ? 0x0c2030 : 0x0a1420
    this.halfSize = this.isTraining ? 60 : 40
    this.size = this.halfSize * 2
    this.walls = []
    this.floorMeshes = []
    this.decorations = []
    this.lights = []
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
    this.buildTerrain()
    this.buildPerimeterWalls()
    this.buildSupportColumns()
    this.buildCentralPlatform()
    this.buildElevatedPlatforms()
    this.buildLighting()
    this.computeCollisionBoxes()
  }

  /* ── 天空裝飾（懸浮粒子）── */
  buildSky() {
    const count = 300
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const spread = this.halfSize - 2
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread * 2
      positions[i * 3 + 1] = 0.5 + Math.random() * 3
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2
      const c = new THREE.Color(this.isHard ? 0xff6666 : 0x00ffff)
      c.multiplyScalar(0.3 + Math.random() * 0.4)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.04, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
      vertexColors: true
    })
    const pts = new THREE.Points(geo, mat)
    this.scene.add(pts)
    this.decorations.push(pts)
  }

  /* ── 天花板（含網格紋理）── */
  buildCeiling() {
    const ceilCanvas = document.createElement('canvas')
    ceilCanvas.width = 512
    ceilCanvas.height = 512
    const ctx = ceilCanvas.getContext('2d')
    ctx.fillStyle = '#0a1420'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = '#00f2ff'
    ctx.globalAlpha = 0.08
    ctx.lineWidth = 1
    for (let i = 0; i <= 16; i++) {
      const p = i * 32
      ctx.beginPath()
      ctx.moveTo(p, 0); ctx.lineTo(p, 512)
      ctx.moveTo(0, p); ctx.lineTo(512, p)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    const ceilTex = new THREE.CanvasTexture(ceilCanvas)
    const step = this.isTraining ? 5 : 4
    const n = Math.floor(this.halfSize / step)
    ceilTex.wrapS = THREE.RepeatWrapping
    ceilTex.wrapT = THREE.RepeatWrapping
    ceilTex.repeat.set(n / 4, n / 4)

    const mat = new THREE.MeshStandardMaterial({
      map: ceilTex, roughness: 0.9, metalness: 0.1,
      emissive: C.cyan, emissiveIntensity: this.isHard ? 0.04 : 0.08,
      transparent: true, opacity: 0.8
    })
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.size + 6, this.size + 6), mat)
    ceil.rotation.x = Math.PI / 2
    ceil.position.y = 6.0
    this.scene.add(ceil)
    this.floorMeshes.push(ceil)
  }

  /* ── 地板（PBR 紋理優先，後備 Canvas）── */
  buildFloor() {
    const step = this.isTraining ? 6 : 4
    const n = Math.floor(this.halfSize / step)
    const repeats = n * 2 / 5

    let floorMat
    const colorTex = this.assets?.textures.get('floorColor')
    const normalTex = this.assets?.textures.get('floorNormal')
    const roughTex = this.assets?.textures.get('floorRoughness')
    const metalTex = this.assets?.textures.get('floorMetalness')

    if (colorTex) {
      colorTex.wrapS = THREE.RepeatWrapping
      colorTex.wrapT = THREE.RepeatWrapping
      colorTex.repeat.set(repeats, repeats)
      if (normalTex) { normalTex.wrapS = THREE.RepeatWrapping; normalTex.wrapT = THREE.RepeatWrapping; normalTex.repeat.set(repeats, repeats) }
      if (roughTex) { roughTex.wrapS = THREE.RepeatWrapping; roughTex.wrapT = THREE.RepeatWrapping; roughTex.repeat.set(repeats, repeats) }
      if (metalTex) { metalTex.wrapS = THREE.RepeatWrapping; metalTex.wrapT = THREE.RepeatWrapping; metalTex.repeat.set(repeats, repeats) }

      floorMat = new THREE.MeshStandardMaterial({
        map: colorTex,
        normalMap: normalTex || undefined,
        roughnessMap: roughTex || undefined,
        metalnessMap: metalTex || undefined,
        roughness: 0.4,
        metalness: 0.8,
        color: 0x8899bb,
        emissive: C.cyan,
        emissiveIntensity: 0.02
      })
    } else {
      const texSize = 1024
      const canvas = document.createElement('canvas')
      canvas.width = texSize; canvas.height = texSize
      const ctx = canvas.getContext('2d')
      const bg = '#0f1a2a'; const panel = '#162a3e'; const seam = '#00f2ff'; const bolt = '#3a5a7a'
      const cells = 10; const cellSize = texSize / cells; const margin = cellSize * 0.08; const inner = cellSize - margin * 2
      ctx.fillStyle = bg; ctx.fillRect(0, 0, texSize, texSize)
      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          const x = i * cellSize + margin; const y = j * cellSize + margin
          ctx.fillStyle = panel; ctx.fillRect(x, y, inner, inner)
          ctx.strokeStyle = seam; ctx.globalAlpha = 0.12; ctx.lineWidth = 1; ctx.strokeRect(x, y, inner, inner); ctx.globalAlpha = 1
          const hs = inner / 2
          for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            ctx.fillStyle = bolt; ctx.beginPath(); ctx.arc(x + hs + dx * (hs - 4), y + hs + dz * (hs - 4), 3, 0, Math.PI * 2); ctx.fill()
          }
        }
      }
      for (let i = 0; i <= cells; i++) {
        const p = i * cellSize; ctx.strokeStyle = seam; ctx.globalAlpha = 0.1; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, texSize); ctx.moveTo(0, p); ctx.lineTo(texSize, p); ctx.stroke(); ctx.globalAlpha = 1
      }
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(n * 2 / cells, n * 2 / cells)
      floorMat = new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.5, metalness: 0.7, color: 0x88bbdd,
        emissive: C.cyan, emissiveIntensity: 0.03
      })
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.size + 4, this.size + 4), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    floor.receiveShadow = true
    this.scene.add(floor)
    this.floorMeshes.push(floor)
  }

  /* ── 地形起伏（高台 + 凹坑）── */
  buildTerrain() {
    const rampMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.5, metalness: 0.75 })
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.45, metalness: 0.8 })
    const edgeMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.5 : 1.0, transparent: true, opacity: 0.35
    })
    const stripMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.4 : 0.8, transparent: true, opacity: 0.25
    })
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.7, metalness: 0.3 })

    const pPos = this.isTraining
      ? [[-16, 0.8, -16], [16, 0.8, -16], [-16, 0.8, 16], [16, 0.8, 16]]
      : [[-10, 0.8, -10], [10, 0.8, -10], [-10, 0.8, 10], [10, 0.8, 10]]
    const pSize = this.isTraining ? 6 : 4

    for (const [px, ph, pz] of pPos) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(pSize, ph, pSize), platMat)
      plat.position.set(px, ph / 2, pz)
      plat.receiveShadow = true; plat.castShadow = true
      this.scene.add(plat); this.decorations.push(plat); this.walls.push(plat)

      const lip = new THREE.Mesh(new THREE.BoxGeometry(pSize + 0.1, 0.03, pSize + 0.1), edgeMat)
      lip.position.set(px, ph + 0.015, pz)
      this.scene.add(lip); this.decorations.push(lip)

      for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const rw = dx !== 0 ? 1.2 : 0.8
        const rd = dz !== 0 ? 1.2 : 0.8
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(rw, ph * 0.45, rd), rampMat)
        ramp.position.set(px + dx * (pSize / 2 + 0.6), ph * 0.225, pz + dz * (pSize / 2 + 0.6))
        if (dx !== 0) ramp.rotation.x = dx * 0.15
        else ramp.rotation.z = -dz * 0.15
        ramp.castShadow = true; ramp.receiveShadow = true
        this.scene.add(ramp); this.decorations.push(ramp); this.walls.push(ramp)

        for (let i = 0; i < 3; i++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(dx !== 0 ? 0.6 : pSize * 0.4, 0.08, dz !== 0 ? 0.6 : pSize * 0.4), rampMat)
          const t = (i + 1) / 4
          if (dx !== 0) {
            step.position.set(px + dx * (pSize / 2 + 0.25 + i * 0.3), t * ph, pz)
          } else {
            step.position.set(px, t * ph, pz + dz * (pSize / 2 + 0.25 + i * 0.3))
          }
          step.receiveShadow = true
          this.scene.add(step); this.decorations.push(step); this.walls.push(step)
        }
      }

      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const s = new THREE.Mesh(dx !== 0 ? new THREE.BoxGeometry(0.02, 0.015, pSize - 0.2) : new THREE.BoxGeometry(pSize - 0.2, 0.015, 0.02), stripMat)
        s.position.set(px + dx * pSize / 2, ph + 0.03, pz + dz * pSize / 2)
        this.scene.add(s); this.decorations.push(s)
      }
    }

    const pitPos = this.isTraining
      ? [[-18, -0.6, 0], [18, -0.6, 0]]
      : [[-12, -0.6, 0], [12, -0.6, 0]]
    const pitSize = this.isTraining ? 5 : 3

    for (const [px, pd, pz] of pitPos) {
      const pit = new THREE.Mesh(new THREE.BoxGeometry(pitSize, -pd, pitSize), pitMat)
      pit.position.set(px, pd / 2, pz)
      pit.receiveShadow = true
      this.scene.add(pit); this.decorations.push(pit)

      for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(dx !== 0 ? 0.06 : pitSize, 0.02, dz !== 0 ? 0.06 : pitSize),
          edgeMat
        )
        edge.position.set(px + dx * (pitSize / 2), pd + 0.01, pz + dz * (pitSize / 2))
        this.scene.add(edge); this.decorations.push(edge)
      }
    }
  }

  /* ── 外牆 ── */
  buildPerimeterWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: C.wallBase, roughness: 0.5, metalness: 0.7 })
    const h = this.halfSize
    const wh = 6.0

    const sides = [
      { pos: [0, wh / 2, -h], s: [this.size, wh, 0.3] },
      { pos: [0, wh / 2, h], s: [this.size, wh, 0.3] },
      { pos: [-h, wh / 2, 0], s: [0.3, wh, this.size] },
      { pos: [h, wh / 2, 0], s: [0.3, wh, this.size] }
    ]
    for (const s of sides) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(...s.s), wallMat)
      w.position.set(...s.pos); w.castShadow = true; w.receiveShadow = true
      this.scene.add(w); this.walls.push(w)
    }

    const panelMat = new THREE.MeshStandardMaterial({ color: C.wallPanel, roughness: 0.5, metalness: 0.6 })
    const pw = this.isTraining ? 5 : 4
    const pn = Math.floor((this.size - 2) / pw)
    for (let side = 0; side < 4; side++) {
      for (let k = -pn; k <= pn; k += 2) {
        if (Math.abs(k) < 2) continue
        const x = side < 2 ? k * pw : (side === 2 ? -h + 0.2 : h - 0.2)
        const z = side < 2 ? (side === 0 ? -h + 0.2 : h - 0.2) : k * pw
        const ry = side === 0 ? Math.PI : side === 1 ? 0 : side === 2 ? Math.PI / 2 : -Math.PI / 2

        const p = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.6, 1.6), panelMat)
        p.position.set(x, 0.9, z)
        p.rotation.y = ry
        this.scene.add(p); this.decorations.push(p)
      }
    }

    const lineMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.8 : 1.5
    })
    const lineMatDim = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.4 : 0.8
    })
    const inset = h - 0.15

    const positions = [
      { pos: [0, 5.5, -inset], s: [this.size, 0.08, 0.08] },
      { pos: [0, 5.5, inset], s: [this.size, 0.08, 0.08] },
      { pos: [-inset, 5.5, 0], s: [0.08, 0.08, this.size] },
      { pos: [inset, 5.5, 0], s: [0.08, 0.08, this.size] },
      { pos: [0, 0.4, -inset], s: [this.size, 0.04, 0.04] },
      { pos: [0, 0.4, inset], s: [this.size, 0.04, 0.04] },
      { pos: [-inset, 0.4, 0], s: [0.04, 0.04, this.size] },
      { pos: [inset, 0.4, 0], s: [0.04, 0.04, this.size] },
      { pos: [0, 1.75, -inset], s: [this.size, 0.04, 0.04] },
      { pos: [0, 1.75, inset], s: [this.size, 0.04, 0.04] },
      { pos: [-inset, 1.75, 0], s: [0.04, 0.04, this.size] },
      { pos: [inset, 1.75, 0], s: [0.04, 0.04, this.size] }
    ]

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      const l = new THREE.Mesh(new THREE.BoxGeometry(...p.s), i < 4 ? lineMat : lineMatDim)
      l.position.set(...p.pos)
      this.scene.add(l); this.decorations.push(l)
    }

    const cornerBracketMat = new THREE.MeshStandardMaterial({
      color: C.metalDark, roughness: 0.3, metalness: 0.85
    })
    for (const [cx, cz] of [[-h + 0.15, -h + 0.15], [-h + 0.15, h - 0.15], [h - 0.15, -h + 0.15], [h - 0.15, h - 0.15]]) {
      for (let y = 0.5; y < 5.5; y += 1.2) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), cornerBracketMat)
        bracket.position.set(cx, y, cz)
        this.scene.add(bracket); this.decorations.push(bracket)
      }
    }

    const divMat = new THREE.MeshStandardMaterial({ color: C.wallPanel, roughness: 0.5, metalness: 0.6 })
    const step = this.isTraining ? 8 : 6
    for (let side = 0; side < 4; side++) {
      for (let k = -Math.floor((this.size - 2) / step); k <= Math.floor((this.size - 2) / step); k++) {
        if (Math.abs(k) < 1) continue
        const div = new THREE.Mesh(new THREE.BoxGeometry(0.02, 4.5, 0.02), divMat)
        const pos = k * step
        if (side < 2) div.position.set(pos, 3.0, side === 0 ? -inset : inset)
        else div.position.set(side === 2 ? -inset : inset, 3.0, pos)
        this.scene.add(div); this.decorations.push(div)
      }
    }

    const dataPanelMat = new THREE.MeshStandardMaterial({ color: 0x0e1a28, roughness: 0.4, metalness: 0.7 })
    const dataLedMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.3 : 0.6
    })
    const panelW = this.isTraining ? 4 : 3
    for (let side = 0; side < 4; side++) {
      const pp = []
      for (let k = -Math.floor((this.halfSize - 3) / panelW); k <= Math.floor((this.halfSize - 3) / panelW); k++) {
        if (Math.abs(k) < 1) continue
        pp.push(k * panelW)
      }
      for (let pi = 1; pi < pp.length; pi += 2) {
        const px = pp[pi]
        const access = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.04), dataPanelMat)
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4), dataLedMat)
        if (side < 2) {
          access.position.set(px, 2.2, side === 0 ? -inset + 0.01 : inset - 0.01)
          led.position.set(px + 0.12, 2.2, side === 0 ? -inset + 0.02 : inset - 0.02)
        } else {
          access.position.set(side === 2 ? -inset + 0.01 : inset - 0.01, 2.2, px)
          led.position.set(side === 2 ? -inset + 0.02 : inset - 0.02, 2.2, px + 0.12)
        }
        this.scene.add(access); this.decorations.push(access)
        this.scene.add(led); this.decorations.push(led)
      }
    }

    const floorGuideMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.12 : 0.25,
      transparent: true, opacity: 0.15
    })
    const halfLen = this.halfSize - 2
    for (let dir = 0; dir < 4; dir++) {
      const gx = dir === 2 ? -halfLen : dir === 3 ? halfLen : 0
      const gz = dir === 0 ? -halfLen : dir === 1 ? halfLen : 0
      const gl = dir < 2 ? 0.05 : halfLen * 2
      const gw = dir < 2 ? halfLen * 2 : 0.05
      const guide = new THREE.Mesh(new THREE.PlaneGeometry(gl, gw), floorGuideMat)
      guide.rotation.x = -Math.PI / 2
      guide.position.set(
        dir < 2 ? 0 : gx,
        0.015,
        dir < 2 ? gz : 0
      )
      this.scene.add(guide); this.floorMeshes.push(guide)
    }
  }

  /* ── 支撐柱（華麗柱式）── */
  buildSupportColumns() {
    const colMat = new THREE.MeshStandardMaterial({ color: C.colBase, roughness: 0.35, metalness: 0.85 })
    const accentMat = new THREE.MeshStandardMaterial({ color: C.colAccent, roughness: 0.3, metalness: 0.75 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f1a28, roughness: 0.5, metalness: 0.7 })
    const grooveMat = new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 0.6, metalness: 0.6 })
    const trimMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.4 : 0.8
    })
    const glowMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.6 : 1.2
    })
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x162a3e, roughness: 0.5, metalness: 0.6 })
    const boltMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.4 : 0.8, metalness: 0.9, roughness: 0.2 })

    const place = this.isTraining
      ? [[-10, -10], [10, -10], [-10, 10], [10, 10],
         [-20, -20], [20, -20], [-20, 20], [20, 20],
         [-15, 0], [15, 0], [0, -15], [0, 15]]
      : [[-7, -7], [7, -7], [-7, 7], [7, 7],
         [-14, -14], [14, -14], [-14, 14], [14, 14]]

    for (const [px, pz] of place) {
      const group = new THREE.Group()
      const w = 0.5

      /* 主柱體 — 分段階梯式 */
      const tiers = [
        { y: 1.8, h: 3.2, w: w },       // 中段（主體）
        { y: 0.5, h: 1.0, w: w + 0.04 },  // 下段加粗
        { y: 5.0, h: 1.0, w: w + 0.04 },  // 上段加粗
      ]
      const colMeshes = []
      for (const t of tiers) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.w), colMat)
        seg.position.y = t.y
        seg.castShadow = true; seg.receiveShadow = true
        group.add(seg)
        colMeshes.push(seg)
      }

      /* 垂直凹槽溝紋（每面 3 條） */
      const grooveDepth = 0.025
      for (let side = 0; side < 4; side++) {
        const gw = 0.025
        const gh = 4.0
        for (let ri = 0; ri < 3; ri++) {
          const offset = (ri - 1) * 0.08
          const g = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, grooveDepth), grooveMat)
          if (side < 2) {
            g.position.set(offset, 3.0, side === 0 ? 0.254 : -0.254)
          } else {
            g.position.set(side === 2 ? 0.254 : -0.254, 3.0, offset)
          }
          group.add(g)
        }
      }

      /* 柱頭（capitol）三層階梯 + 發光邊 */
      const capLayers = [
        { y: 5.76, w: w + 0.12, h: 0.04 },
        { y: 5.86, w: w + 0.22, h: 0.06 },
        { y: 5.96, w: w + 0.08, h: 0.04 },
      ]
      for (const l of capLayers) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.w), accentMat)
        cap.position.y = l.y
        cap.castShadow = true
        group.add(cap)
        const capTrim = new THREE.Mesh(new THREE.BoxGeometry(l.w + 0.02, l.h * 0.5, l.w + 0.02), trimMat)
        capTrim.position.y = l.y - l.h * 0.25
        group.add(capTrim)
      }

      /* 柱基（base）三層階梯 + 發光邊 */
      const baseLayers = [
        { y: 0.04, w: w + 0.10, h: 0.04 },
        { y: 0.12, w: w + 0.20, h: 0.06 },
        { y: 0.24, w: w + 0.08, h: 0.06 },
      ]
      for (const l of baseLayers) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.w), accentMat)
        base.position.y = l.y
        base.castShadow = true
        group.add(base)
        const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(l.w + 0.02, l.h * 0.5, l.w + 0.02), trimMat)
        baseTrim.position.y = l.y + l.h * 0.25
        group.add(baseTrim)
      }

      /* 發光垂直條（四角） */
      const half = w / 2 + 0.005
      for (const [sx, sz] of [[-half, 0], [half, 0], [0, -half], [0, half]]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(sx !== 0 ? 0.02 : 0.015, 3.6, sz !== 0 ? 0.02 : 0.015),
          glowMat
        )
        strip.position.set(sx, 3.0, sz)
        group.add(strip)
      }

      /* 角位裝飾面板 + 螺栓（四組 × 四層高度） */
      const cornerOff = half
      for (const yPos of [0.8, 2.0, 4.0, 5.2]) {
        for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), panelMat)
          panel.position.set(sx * cornerOff, yPos, sz * cornerOff)
          group.add(panel)
          const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 4), boltMat)
          bolt.position.set(sx * cornerOff, yPos + 0.05, sz * cornerOff)
          group.add(bolt)
        }
      }

      /* 中間腰帶裝飾 — 雙層發光環 */
      for (const yOff of [-0.15, 0.15]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.02, w + 0.08), trimMat)
        band.position.y = 3.0 + yOff
        group.add(band)
      }
      const bandInner = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.015, w + 0.04),
        new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.1 : 0.2, transparent: true, opacity: 0.15 })
      )
      bandInner.position.y = 3.0
      group.add(bandInner)

      /* 底部通風格柵（兩側） */
      for (const sideX of [-1, 1]) {
        for (const sz of [-0.5, 0.5]) {
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), darkMat)
          v.position.set(sideX * 0.12, 0.4, sz * 0.12)
          group.add(v)
        }
      }

      /* 頂部透明掃描環 */
      const scanRing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.01, w + 0.14),
        new THREE.MeshStandardMaterial({
          color: C.cyan, emissive: C.cyan, emissiveIntensity: 0.3,
          transparent: true, opacity: 0.15
        })
      )
      scanRing.position.y = 5.55
      group.add(scanRing)

      group.position.set(px, 0, pz)
      this.scene.add(group)
      this.decorations.push(group)
      this.walls.push(...colMeshes)

      if (this.isHard) {
        const warn = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.04, w + 0.04),
          new THREE.MeshStandardMaterial({ color: C.red, emissive: C.red, emissiveIntensity: 0.3 }))
        warn.position.y = 1.75
        group.add(warn)
      }
    }
  }

  /* ── 中央平台 ── */
  buildCentralPlatform() {
    const platMat = new THREE.MeshStandardMaterial({ color: C.wallBase, roughness: 0.4, metalness: 0.7 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: C.colAccent, roughness: 0.35, metalness: 0.7 })
    const pw = this.isTraining ? 8 : 5
    const pd = this.isTraining ? 0.3 : 0.2

    const plat = new THREE.Mesh(new THREE.BoxGeometry(pw, pd, pw), platMat)
    plat.position.set(0, pd / 2, 0)
    plat.receiveShadow = true; plat.castShadow = true
    this.scene.add(plat); this.decorations.push(plat); this.walls.push(plat)

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(pw + 0.1, 0.05, pw + 0.1), edgeMat
    )
    edge.position.set(0, pd + 0.02, 0)
    this.scene.add(edge); this.decorations.push(edge)

    const stepMat = new THREE.MeshStandardMaterial({ color: C.colAccent, roughness: 0.6, metalness: 0.4 })
    for (let side = 0; side < 4; side++) {
      const sw = side < 2 ? 0.4 : pw * 0.3
      const sd = side < 2 ? pw * 0.3 : 0.4
      const sx = side === 2 ? -pw / 2 - 0.2 : side === 3 ? pw / 2 + 0.2 : 0
      const sz = side === 0 ? -pw / 2 - 0.2 : side === 1 ? pw / 2 + 0.2 : 0
      const step = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.12, sd), stepMat)
      step.position.set(sx, 0.06, sz)
      step.receiveShadow = true
      this.scene.add(step); this.decorations.push(step); this.walls.push(step)
    }

    if (this.isTraining) {
      const guideMat = new THREE.MeshStandardMaterial({
        color: C.cyan, emissive: C.cyan, emissiveIntensity: 0.2, transparent: true, opacity: 0.15
      })
      const guide = new THREE.Mesh(new THREE.RingGeometry(pw / 2 + 0.3, pw / 2 + 0.5, 32), guideMat)
      guide.rotation.x = -Math.PI / 2
      guide.position.set(0, pd + 0.01, 0)
      this.scene.add(guide); this.floorMeshes.push(guide)
    } else if (this.isHard) {
      const dangerMat = new THREE.MeshStandardMaterial({
        color: C.red, emissive: C.red, emissiveIntensity: 0.2, transparent: true, opacity: 0.12
      })
      const ring = new THREE.Mesh(new THREE.RingGeometry(pw / 2 + 0.3, pw / 2 + 0.5, 32), dangerMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(0, pd + 0.01, 0)
      this.scene.add(ring); this.floorMeshes.push(ring)
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 1.0 : 2.0
    })
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), coreMat)
    core.position.set(0, pd + 0.1, 0)
    this.scene.add(core); this.decorations.push(core)

    const rimMat = new THREE.MeshStandardMaterial({
      color: C.cyan, emissive: C.cyan,
      emissiveIntensity: this.isHard ? 0.5 : 1.0
    })
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const r = pw / 2 + 0.05
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), rimMat)
      dot.position.set(Math.cos(a) * r, pd + 0.03, Math.sin(a) * r)
      this.scene.add(dot); this.decorations.push(dot)
    }
  }

  /* ── 高架平台（含樓梯）── */
  buildElevatedPlatforms() {
    const gc = C.cyan
    const eI = this.isHard ? 0.25 : 0.4
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.5, metalness: 0.7 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI, transparent: true, opacity: 0.35 })
    const stairMat = new THREE.MeshStandardMaterial({ color: C.colAccent, roughness: 0.6, metalness: 0.5 })
    const railMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: this.isHard ? 0.25 : 0.5, transparent: true, opacity: 0.2 })
    const supMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.3, metalness: 0.85 })
    const stripMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI * 0.6, transparent: true, opacity: 0.15 })
    const glowMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI * 1.2 })
    const dimMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: this.isHard ? 0.15 : 0.3, transparent: true, opacity: 0.06 })
    const trimMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.4, metalness: 0.8 })
    const boltMat = new THREE.MeshStandardMaterial({ color: gc, emissive: gc, emissiveIntensity: eI, metalness: 0.9, roughness: 0.2 })

    const positions = this.isTraining
      ? [[-18, 3.0, -18, 3], [18, 3.0, -18, 3], [-18, 3.0, 18, 3], [18, 3.0, 18, 3],
         [-30, 2.5, 0, 2.5], [30, 2.5, 0, 2.5], [0, 2.5, -30, 2.5], [0, 2.5, 30, 2.5]]
      : [[-12, 3.0, -12, 2.5], [12, 3.0, -12, 2.5], [-12, 3.0, 12, 2.5], [12, 3.0, 12, 2.5],
         [-20, 2.5, -8, 2], [20, 2.5, 8, 2], [-8, 2.5, -20, 2], [8, 2.5, 20, 2]]

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

  /* ── 照明 ── */
  buildLighting() {
    const spread = this.isTraining ? 20 : 12
    const far = this.isTraining ? 40 : 24
    const lc = this.isHard ? 0xff6666 : 0x88ccff
    const li = this.isTraining ? 4.0 : this.isHard ? 2.8 : 3.5

    const positions = [[0, 5.5, 0],
      [-spread, 5.5, -spread], [spread, 5.5, -spread],
      [-spread, 5.5, spread], [spread, 5.5, spread],
      [-far, 5.5, -far], [far, 5.5, -far],
      [-far, 5.5, far], [far, 5.5, far]]

    const bulbMat = new THREE.MeshStandardMaterial({
      color: lc, emissive: lc,
      emissiveIntensity: this.isTraining ? 0.6 : this.isHard ? 0.2 : 0.4,
      transparent: true, opacity: this.isHard ? 0.5 : 0.7
    })

    for (const [x, y, z] of positions) {
      const light = new THREE.PointLight(lc, li, this.isTraining ? 50 : 40)
      light.position.set(x, y, z)
      this.scene.add(light); this.lights.push(light)

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bulbMat)
      bulb.position.copy(light.position)
      this.scene.add(bulb)
    }
  }

  /* ── 彈藥拾取 ── */
  buildAmmoPickups() {
    const positions = this.isTraining
      ? [[-24, -24], [24, 24], [-16, 0], [16, 0], [-24, 0], [0, -24], [0, 24]]
      : [[-14, -14], [14, 14], [0, -10], [0, 10], [-20, -7], [20, 7]]

    for (const [x, z] of positions) {
      const bullet = createBulletPickup()
      bullet.position.set(x, 1.2, z)
      this.scene.add(bullet)
      this.ammoPickups.push(bullet)
      this.decorations.push(bullet)
    }
  }

  /* ── 醫療包拾取 ── */
  buildHealthPickups() {
    const positions = [[-10, -10], [10, 10]]
    for (const [x, z] of positions) {
      const medkit = createMedkit()
      medkit.position.set(x, 1.2, z)
      this.scene.add(medkit)
      this.healthPickups.push(medkit)
      this.decorations.push(medkit)
    }
  }

  /* ── 手榴彈拾取 ── */
  buildGrenadePickups() {
    const positions = this.isTraining
      ? [[-12, -5], [12, 5]]
      : [[-8, -3], [8, 3]]

    for (const [x, z] of positions) {
      const grenade = createGrenadePickup()
      grenade.position.set(x, 1.2, z)
      this.scene.add(grenade)
      this.grenadePickups.push(grenade)
      this.decorations.push(grenade)
    }
  }

  /* ── 拾取物浮動動畫 ── */
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

  /* ── 敵人生成（隨機分散 + 高台）── */
  spawnEnemies(game) {
    const count = this.isTraining ? 5 : this.isHard ? 6 : 5
    const spawnR = this.halfSize * 0.75
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

    let floorCount = Math.ceil(count * 0.6)
    if (this.isTraining) floorCount = count

    for (let n = 0; n < floorCount; n++) {
      spawnOne(PatrolBot, n, e => { if (this.isHard) e.speed *= 1.3 })
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

  /* ── 碰撞檢測 ── */
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
    this.walls = []; this.floorMeshes = []; this.decorations = []; this.lights = []; this.ammoPickups = []; this.healthPickups = []; this.grenadePickups = []; this.collisionBoxes = []; this.elevatedPlatforms = []; this.stairAreas = []
  }
}
