import * as THREE from 'three'

export function createBulletPickup() {
  const group = new THREE.Group()
  const s = 3.0
  const gap = 0.06 * s
  const casingMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xffdd66, metalness: 0.8, roughness: 0.3 })

  for (let i = -1; i <= 1; i++) {
    const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.035 * s, 0.065 * s, 8), casingMat)
    casing.position.set(i * gap, 0.0325 * s, 0)
    group.add(casing)

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.055 * s, 8), tipMat)
    tip.position.set(i * gap, 0.0925 * s, 0)
    group.add(tip)
  }

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 1.0, transparent: true, opacity: 0.35
  })
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.005, 0.12 * s), glowMat)
  glow.position.y = 0.04 * s
  group.add(glow)

  return group
}

export function createGrenadePickup() {
  const group = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, metalness: 0.4, roughness: 0.7 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, metalness: 0.3, roughness: 0.8 })
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x6a7a5a, metalness: 0.5, roughness: 0.5 })

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bodyMat)
  body.position.y = 0.12
  group.add(body)

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.01, 0.18), darkMat)
    groove.position.set(Math.cos(angle) * 0.1, 0.12, Math.sin(angle) * 0.1)
    groove.rotation.y = -angle
    group.add(groove)
  }

  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.08), accentMat)
  lever.position.set(0, 0.22, -0.03)
  group.add(lever)

  const pin = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 4, 6), accentMat)
  pin.position.set(0, 0.24, -0.03)
  pin.rotation.x = Math.PI / 2
  group.add(pin)

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.0, transparent: true, opacity: 0.35
  })
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.005, 0.32), glowMat)
  glow.position.y = 0.04
  group.add(glow)

  return group
}

export function createMedkit() {
  const group = new THREE.Group()
  const s = 3.0

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.1 * s, 0.12 * s), bodyMat)
  group.add(body)

  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x006633, emissive: 0x006633, emissiveIntensity: 1.2
  })

  const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.025 * s, 0.13 * s), crossMat)
  group.add(hBar)
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.025 * s, 0.07 * s, 0.13 * s), crossMat)
  group.add(vBar)

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x006633, emissive: 0x006633, emissiveIntensity: 1.5, transparent: true, opacity: 0.3
  })
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.20 * s, 0.14 * s), glowMat)
  group.add(glow)

  return group
}
