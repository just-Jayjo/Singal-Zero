import * as THREE from 'three'
import { PatrolBot } from '../enemies/patrolBot.js'
import { Rusher } from '../enemies/rusher.js'
import { createBulletPickup, createMedkit, createGrenadePickup } from '../core/pickups.js'

const C = {
  bg: 0x1a2e42,
  floor: 0x1e3448,
  wallBase: 0x223a50,
  wallPanel: 0x26445a,
  colBase: 0x1e3448,
  cyan: 0x00f2ff,
  metalDark: 0x2a4058,
  metalMid: 0x36506a,
  serverGreen: 0x00ff88,
  screenBlue: 0x4488ff
}

export class Level2 {
  constructor(scene, difficulty = 'normal', assets = null) {
    this.scene = scene
    this.difficulty = difficulty
    this.isTraining = difficulty === 'easy'
    this.isHard = difficulty === 'hard'
    this.atmosColor = this.isHard ? 0x060c14 : this.isTraining ? 0x0e2234 : 0x0a1620
    this.halfSize = this.isTraining ? 28 : 26
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
    this.buildServerRacks()
    this.buildHeightFeatures()
    this.buildElevatedPlatforms()
    this.buildLighting()
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
      const c = new THREE.Color(this.isHard ? 0x88aaff : 0x44ddff)
      c.multiplyScalar(0.2 + Math.random() * 0.3)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.03, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
      vertexColors: true
    })
    const pts = new THREE.Points(geo, mat)
    this.scene.add(pts)
    this.decorations.push(pts)
  }

  buildCeiling() {
    const ceilMat = new THREE.MeshStandardMaterial({ color: C.bg, roughness: 0.8, metalness: 0.2 })
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.size + 4, this.size + 4), ceilMat)
    ceil.rotation.x = Math.PI / 2
    ceil.position.y = 6.0
    this.scene.add(ceil)
    this.floorMeshes.push(ceil)

    const beamMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.3, metalness: 0.85 })
    const glowMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.08 : 0.15, transparent: true, opacity: 0.06 })
    const step = 4
    const n = Math.floor(this.halfSize / step)
    for (let i = -n; i <= n; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(step * 0.08, 0.08, this.size + 2), beamMat)
      beam.position.set(i * step, 5.92, 0)
      this.scene.add(beam); this.decorations.push(beam)

      const strip = new THREE.Mesh(new THREE.BoxGeometry(step * 0.06, 0.015, this.size + 2), glowMat)
      strip.position.set(i * step, 5.9, 0)
      this.scene.add(strip); this.decorations.push(strip)
    }
    for (let i = -n; i <= n; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(this.size + 2, 0.08, step * 0.08), beamMat)
      beam.position.set(0, 5.92, i * step)
      this.scene.add(beam); this.decorations.push(beam)

      const strip = new THREE.Mesh(new THREE.BoxGeometry(this.size + 2, 0.015, step * 0.06), glowMat)
      strip.position.set(0, 5.9, i * step)
      this.scene.add(strip); this.decorations.push(strip)
    }

    const panelMat = new THREE.MeshStandardMaterial({ color: C.wallPanel, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.5 })
    for (let i = -n + 1; i <= n - 1; i++) {
      for (let j = -n + 1; j <= n - 1; j++) {
        if (Math.abs(i) < 1 && Math.abs(j) < 1) continue
        const panel = new THREE.Mesh(new THREE.BoxGeometry(step * 0.85, 0.02, step * 0.85), panelMat)
        panel.position.set(i * step, 5.85, j * step)
        this.scene.add(panel); this.decorations.push(panel)
      }
    }
  }

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
      colorTex.wrapS = THREE.RepeatWrapping; colorTex.wrapT = THREE.RepeatWrapping; colorTex.repeat.set(repeats, repeats)
      if (normalTex) { normalTex.wrapS = THREE.RepeatWrapping; normalTex.wrapT = THREE.RepeatWrapping; normalTex.repeat.set(repeats, repeats) }
      if (roughTex) { roughTex.wrapS = THREE.RepeatWrapping; roughTex.wrapT = THREE.RepeatWrapping; roughTex.repeat.set(repeats, repeats) }
      if (metalTex) { metalTex.wrapS = THREE.RepeatWrapping; metalTex.wrapT = THREE.RepeatWrapping; metalTex.repeat.set(repeats, repeats) }
      floorMat = new THREE.MeshStandardMaterial({
        map: colorTex, normalMap: normalTex || undefined, roughnessMap: roughTex || undefined, metalnessMap: metalTex || undefined,
        roughness: 0.4, metalness: 0.8, color: 0x8899bb,
        emissive: C.cyan, emissiveIntensity: 0.02
      })
    } else {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024
      const ctx = canvas.getContext('2d')
      const bg = '#0a1620'; const panel = '#122236'; const seam = '#00f2ff'; const bolt = '#4a6a8a'; const cells = 10
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
        emissive: C.cyan, emissiveIntensity: 0.03
      })
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.size + 4, this.size + 4), floorMat)
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; floor.receiveShadow = true
    this.scene.add(floor); this.floorMeshes.push(floor)
  }

  buildTerrain() {
    const rampMat = new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.6, metalness: 0.6 })
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.5, metalness: 0.7 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.15 : 0.3, transparent: true, opacity: 0.2 })
    const ramps = this.isTraining ? [[-10,0.6,-10],[10,0.6,10],[-10,0.6,10],[10,0.6,-10]] : [[-6,0.6,-6],[6,0.6,6],[-6,0.6,6],[6,0.6,-6]]
    for (const [rx, rh, rz] of ramps) {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.0, rh, 1.5), rampMat)
      ramp.position.set(rx, rh/2, rz); ramp.rotation.x = 0.15
      ramp.castShadow = true; ramp.receiveShadow = true
      this.scene.add(ramp); this.decorations.push(ramp); this.walls.push(ramp)
    }
    const platforms = this.isTraining ? [[-12,0.6,0,3],[12,0.6,0,3],[0,0.6,-12,3],[0,0.6,12,3]] : [[-8,0.5,0,3],[8,0.5,0,3],[0,0.5,-8,3],[0,0.5,8,3]]
    for (const [px, ph, pz, ps] of platforms) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(ps, ph, ps), platMat)
      plat.position.set(px, ph/2, pz)
      plat.receiveShadow = true; plat.castShadow = true
      this.scene.add(plat); this.decorations.push(plat); this.walls.push(plat)
      const lip = new THREE.Mesh(new THREE.BoxGeometry(ps+0.1, 0.03, ps+0.1), edgeMat)
      lip.position.set(px, ph+0.015, pz)
      this.scene.add(lip); this.decorations.push(lip)
    }
  }

  buildPerimeterWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: C.wallBase, roughness: 0.4, metalness: 0.8 })
    const frameMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.3, metalness: 0.85 })
    const panelMat = new THREE.MeshStandardMaterial({ color: C.wallPanel, roughness: 0.5, metalness: 0.6 })
    const stripMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.5 : 1.0 })
    const greenMat = new THREE.MeshStandardMaterial({ color: C.serverGreen, emissive: C.serverGreen, emissiveIntensity: this.isHard ? 0.3 : 0.6 })
    const glowMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.3 : 0.6, transparent: true, opacity: 0.12 })
    const h = this.halfSize
    const wh = 6.0
    const inset = h - 0.06

    const sides = [
      { pos: [0, wh / 2, -h], s: [this.size, wh, 0.12], axis: 'z', dir: -1 },
      { pos: [0, wh / 2, h], s: [this.size, wh, 0.12], axis: 'z', dir: 1 },
      { pos: [-h, wh / 2, 0], s: [0.12, wh, this.size], axis: 'x', dir: -1 },
      { pos: [h, wh / 2, 0], s: [0.12, wh, this.size], axis: 'x', dir: 1 }
    ]
    for (const s of sides) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(...s.s), wallMat)
      w.position.set(...s.pos)
      w.castShadow = true
      w.receiveShadow = true
      this.scene.add(w); this.walls.push(w)
    }

    const panelW = 3
    const panelGap = 0.4
    const nPerSide = Math.floor((this.size - 2) / panelW)
    for (let side = 0; side < 4; side++) {
      const isX = side < 2
      const baseX = isX ? 0 : (side === 2 ? -inset : inset)
      const baseZ = isX ? (side === 0 ? -inset : inset) : 0
      for (let k = -nPerSide; k <= nPerSide; k++) {
        if (Math.abs(k) < 1) continue
        const cp = k * panelW
        const cx = isX ? cp : baseX
        const cz = isX ? baseZ : cp

        const recessed = new THREE.Mesh(new THREE.BoxGeometry(isX ? panelW - panelGap : 0.06, 4.8, isX ? 0.06 : panelW - panelGap), panelMat)
        recessed.position.set(cx, 3.0, cz)
        this.scene.add(recessed); this.decorations.push(recessed)

        const border = new THREE.Mesh(new THREE.BoxGeometry(isX ? panelW : 0.08, 5.0, isX ? 0.08 : panelW), frameMat)
        border.position.set(cx, 3.0, cz)
        this.scene.add(border); this.decorations.push(border)

        if (k % 2 === 0) {
          const screen = new THREE.Mesh(new THREE.BoxGeometry(isX ? panelW * 0.5 : 0.025, 0.25, isX ? 0.025 : panelW * 0.5), greenMat)
          screen.position.set(cx, 2.5, cz)
          this.scene.add(screen); this.decorations.push(screen)
        } else {
          for (const yy of [1.5, 4.0]) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(isX ? 0.02 : 0.04, 0.5, isX ? 0.04 : 0.02), frameMat)
            slot.position.set(cx, yy, cz)
            this.scene.add(slot); this.decorations.push(slot)
          }
        }
      }
    }

    for (const yPos of [0.15, 5.5]) {
      for (const [x, y, z, w, hh, d] of [
        [0, yPos, -inset, this.size, 0.04, 0.04],
        [0, yPos, inset, this.size, 0.04, 0.04],
        [-inset, yPos, 0, 0.04, 0.04, this.size],
        [inset, yPos, 0, 0.04, 0.04, this.size]
      ]) {
        const glow = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), glowMat)
        glow.position.set(x, y, z)
        this.scene.add(glow); this.decorations.push(glow)
      }
    }

    const accessPanelW = this.isTraining ? 4 : 3
    const pHalf = this.halfSize - 3
    for (let side = 0; side < 4; side++) {
      const pp = []
      for (let k = -Math.floor(pHalf / accessPanelW); k <= Math.floor(pHalf / accessPanelW); k++) {
        if (Math.abs(k) < 1) continue
        pp.push(k * accessPanelW)
      }
      for (let pi = 1; pi < pp.length; pi += 2) {
        const px = pp[pi]
        const access = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), panelMat)
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), greenMat)
        if (side < 2) {
          access.position.set(px, 1.5, side === 0 ? -inset + 0.01 : inset - 0.01)
          led.position.set(px + 0.15, 1.5, side === 0 ? -inset + 0.02 : inset - 0.02)
        } else {
          access.position.set(side === 2 ? -inset + 0.01 : inset - 0.01, 1.5, px)
          led.position.set(side === 2 ? -inset + 0.02 : inset - 0.02, 1.5, px + 0.15)
        }
        this.scene.add(access); this.decorations.push(access)
        this.scene.add(led); this.decorations.push(led)
      }
    }
  }

  buildServerRacks() {
    const rackMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.4, metalness: 0.8 })
    const faceMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.3, metalness: 0.7 })
    const ledMat = new THREE.MeshStandardMaterial({
      color: C.serverGreen, emissive: C.serverGreen,
      emissiveIntensity: this.isHard ? 0.3 : 0.6
    })
    const screenMat = new THREE.MeshStandardMaterial({
      color: C.screenBlue, emissive: C.screenBlue,
      emissiveIntensity: 0.4
    })

    const rackRows = this.isTraining
      ? [[-5, 0], [5, 0], [-12, -7], [12, 7]]
      : [[-6, 0], [6, 0], [-10, -5], [10, 5], [-8, 8], [8, -8]]

    for (const [rx, rz] of rackRows) {
      const count = this.isTraining ? 3 : 4
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 2.8
        const g = new THREE.Group()

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.5), rackMat)
        body.position.y = 1.1
        body.castShadow = true
        g.add(body)

        const face = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.8, 0.04), faceMat)
        face.position.set(0, 1.1, 0.26)
        g.add(face)

        for (let j = 0; j < 4; j++) {
          const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), ledMat)
          led.position.set(-0.15 + j * 0.1, 0.2 + 0.4 * j, 0.27)
          g.add(led)
        }

        const ventStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.02, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x0a1a2a })
        )
        ventStrip.position.set(0, 0.3, 0.27)
        g.add(ventStrip)

        const dir = Math.abs(rx) > Math.abs(rz) ? 'x' : 'z'
        const perp = Math.abs(rx) > Math.abs(rz) ? 'z' : 'x'
        const perpVal = rx + rz + offset * (dir === 'x' ? 1 : 0)
        const mainVal = (dir === 'x' ? rz : rx) + offset * (dir === 'x' ? 0 : 1)

        if (dir === 'x') {
          g.position.set(rx, 0, perpVal)
        } else {
          g.position.set(perpVal, 0, rz)
        }

        if (Math.abs(rx) > Math.abs(rz)) {
          if (rx > 0) g.rotation.y = -Math.PI / 2
          else g.rotation.y = Math.PI / 2
        }

        this.scene.add(g)
        this.decorations.push(g)
        this.walls.push(body)
      }
    }
  }

  buildHeightFeatures() {
    const platMat = new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.5, metalness: 0.7 })
    const rampMat = new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.6, metalness: 0.6 })
    const edgeMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: this.isHard ? 0.2 : 0.4, transparent: true, opacity: 0.2 })
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x0a1620, roughness: 0.7, metalness: 0.3 })

    const elevated = this.isTraining
      ? [[-14, 0.8, -14, 5], [14, 0.8, -14, 5], [-14, 0.8, 14, 5], [14, 0.8, 14, 5]]
      : [[-9, 0.8, -9, 3], [9, 0.8, -9, 3], [-9, 0.8, 9, 3], [9, 0.8, 9, 3]]

    for (const [ex, eh, ez, es] of elevated) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(es, eh, es), platMat)
      plat.position.set(ex, eh / 2, ez)
      plat.receiveShadow = true; plat.castShadow = true
      this.scene.add(plat); this.decorations.push(plat); this.walls.push(plat)

      const lip = new THREE.Mesh(new THREE.BoxGeometry(es + 0.1, 0.03, es + 0.1), edgeMat)
      lip.position.set(ex, eh + 0.015, ez)
      this.scene.add(lip); this.decorations.push(lip)

      for (let side = 0; side < 4; side++) {
        const angle = (side / 4) * Math.PI * 2
        for (let i = 0; i < 2; i++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, eh * (i + 1) / 2, 0.5), rampMat)
          step.position.set(
            ex + Math.sin(angle) * (es / 2 + 0.3 + i * 0.35),
            eh * (i + 0.5) / 2,
            ez + Math.cos(angle) * (es / 2 + 0.3 + i * 0.35)
          )
          step.receiveShadow = true
          this.scene.add(step); this.decorations.push(step); this.walls.push(step)
        }
      }
    }

    const lowered = this.isTraining
      ? [[-16, -0.5, 0, 5], [16, -0.5, 0, 5]]
      : [[-11, -0.5, 0, 3], [11, -0.5, 0, 3]]

    for (const [lx, ld, lz, ls] of lowered) {
      const pit = new THREE.Mesh(new THREE.BoxGeometry(ls, -ld, ls), pitMat)
      pit.position.set(lx, ld / 2, lz)
      pit.receiveShadow = true
      this.scene.add(pit); this.decorations.push(pit)

      for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(dx !== 0 ? 0.3 : ls, -ld, dz !== 0 ? 0.3 : ls), rampMat)
        ramp.position.set(lx + dx * (ls / 2 + 0.15), ld / 2 + 0.01, lz + dz * (ls / 2 + 0.15))
        this.scene.add(ramp); this.decorations.push(ramp)
      }
    }
  }

  buildElevatedPlatforms() {
    const gc = C.cyan
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
      ? [[-10, 3.0, -10, 2.5], [10, 3.0, -10, 2.5], [-10, 3.0, 10, 2.5], [10, 3.0, 10, 2.5]]
      : [[-9, 3.0, -9, 2], [9, 3.0, -9, 2], [-9, 3.0, 9, 2], [9, 3.0, 9, 2],
         [-14, 2.5, -7, 1.8], [14, 2.5, 7, 1.8], [-7, 2.5, -14, 1.8], [7, 2.5, 14, 1.8]]

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

  buildLighting() {
    const amb = new THREE.AmbientLight(0x446688, 0.5)
    this.scene.add(amb); this.lights.push(amb)

    const spread = this.isTraining ? 8 : 6
    const lc = this.isHard ? 0x6688ff : 0x4488ff
    const li = this.isTraining ? 4.5 : this.isHard ? 3.5 : 4.5

    const positions = [[0, 5.5, 0],
      [-spread, 5.5, -spread], [spread, 5.5, -spread],
      [-spread, 5.5, spread], [spread, 5.5, spread]]

    const bulbMat = new THREE.MeshStandardMaterial({
      color: lc, emissive: lc,
      emissiveIntensity: this.isTraining ? 0.6 : this.isHard ? 0.2 : 0.4,
      transparent: true, opacity: this.isHard ? 0.4 : 0.6
    })

    for (const [x, y, z] of positions) {
      const light = new THREE.PointLight(lc, li, this.isTraining ? 28 : 26)
      light.position.set(x, y, z)
      this.scene.add(light)
      this.lights.push(light)

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bulbMat)
      bulb.position.copy(light.position)
      this.scene.add(bulb)
    }
  }

  spawnEnemies(game) {
    const count = this.isTraining ? 5 : this.isHard ? 6 : 5
    const spawnR = this.halfSize * 0.85
    const placed = []

    const spawnOne = (EnemyClass, idx, extra) => {
      let pos, attempts = 0
      const baseAngle = (idx / count) * Math.PI * 2
      while (attempts < 25) {
        const angle = baseAngle + (Math.random() - 0.5) * (Math.PI * 2 / count) * 1.5
        const dist = spawnR * 0.1 + Math.random() * spawnR * 0.8
        const x = Math.cos(angle) * dist; const z = Math.sin(angle) * dist
        pos = new THREE.Vector3(x, 0, z)
        const tooClose = placed.some(p => p.distanceTo(pos) < 10)
        const nearCenter = pos.length() < 4
        const blocked = this.checkCollision(pos, 0.5)
        if (!tooClose && !nearCenter && !blocked) break
        attempts++
      }
      if (!pos || attempts >= 25) return
      const e = new EnemyClass(pos)
      e.hp *= game.difficultyModifiers[game.difficulty].enemyHp
      if (extra) extra(e)
      game.scene.add(e.mesh); game.enemies.push(e)
      placed.push(pos.clone())
    }

    const types = ['patrol', 'patrol', 'patrol', 'patrol', 'rusher', 'patrol']
    if (this.isHard) types.push('rusher')
    for (let i = 0; i < count && i < types.length; i++) {
      if (types[i] === 'rusher') {
        spawnOne(Rusher, i)
      } else {
        spawnOne(PatrolBot, i, e => { if (this.isHard) e.speed *= 1.3; e.detectionRange = 16 })
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
    const positions = [[-5, -5], [5, 5], [-10, 0], [10, 0]]
    for (const [x, z] of positions) {
      const bullet = createBulletPickup()
      bullet.position.set(x, 1.2, z)
      this.scene.add(bullet)
      this.ammoPickups.push(bullet)
      this.decorations.push(bullet)
    }
  }

  buildHealthPickups() {
    const positions = [[-5, 5], [5, -5]]
    for (const [x, z] of positions) {
      const medkit = createMedkit()
      medkit.position.set(x, 1.2, z)
      this.scene.add(medkit)
      this.healthPickups.push(medkit)
      this.decorations.push(medkit)
    }
  }

  buildGrenadePickups() {
    const positions = [[-8, 0], [8, 0]]
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
