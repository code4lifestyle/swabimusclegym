import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const LINEN = 0xe6dfd2
const MUTED = 0x8a847a
const INK = 0x1a1d20

function makeRibbon(width, depth, segsX, segsZ, color, opacity) {
  const geometry = new THREE.PlaneGeometry(width, depth, segsX, segsZ)
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    wireframe: true,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI * 0.5
  return mesh
}

function makeGlowDots(count, spread) {
  const positions = new Float32Array(count * 3)
  const speeds = new Float32Array(count)

  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2
    const r = 0.4 + Math.random() * spread
    positions[i * 3] = Math.cos(a) * r
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.55
    positions[i * 3 + 2] = Math.sin(a) * r * 0.72
    speeds[i] = 0.35 + Math.random() * 0.85
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: LINEN,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    }),
  )

  return { points, speeds, base: positions.slice(0) }
}

export default function SceneBackdrop({ variant = 'desk' }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const isLogin = variant === 'login'
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0.35, 7.4)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const root = new THREE.Group()
    scene.add(root)

    const ribbonA = makeRibbon(9.5, 5.2, 48, 28, LINEN, isLogin ? 0.22 : 0.16)
    const ribbonB = makeRibbon(7.2, 4.1, 36, 22, MUTED, isLogin ? 0.14 : 0.1)
    ribbonB.position.y = 0.35
    ribbonB.rotation.z = 0.18
    root.add(ribbonA, ribbonB)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.012, 8, 128),
      new THREE.MeshBasicMaterial({
        color: LINEN,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    )
    ring.rotation.x = Math.PI * 0.62
    ring.position.set(isLogin ? -0.4 : -0.2, 0.05, 0.2)
    root.add(ring)

    const softOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 32),
      new THREE.MeshBasicMaterial({
        color: INK,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    )
    softOrb.position.set(isLogin ? 1.6 : 1.2, 0.55, -0.8)
    root.add(softOrb)

    const accent = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({
        color: LINEN,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    root.add(accent)

    const { points, speeds, base } = makeGlowDots(isLogin ? 90 : 70, isLogin ? 4.6 : 4.1)
    root.add(points)

    if (isLogin) {
      root.position.set(-0.85, 0.05, 0)
      root.scale.setScalar(1.05)
    } else {
      root.position.set(-0.35, -0.1, 0)
      root.scale.setScalar(0.94)
    }

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    function onPointer(event) {
      const x = event.clientX / window.innerWidth
      const y = event.clientY / window.innerHeight
      pointer.tx = (x - 0.5) * 0.45
      pointer.ty = (y - 0.5) * 0.28
    }

    let frame = 0
    let alive = true

    function warpRibbon(mesh, time, amp, speed) {
      const position = mesh.geometry.attributes.position
      const w = mesh.geometry.parameters.widthSegments + 1
      const d = mesh.geometry.parameters.heightSegments + 1
      for (let z = 0; z < d; z += 1) {
        for (let x = 0; x < w; x += 1) {
          const i = z * w + x
          const u = x / (w - 1)
          const v = z / (d - 1)
          const wave =
            Math.sin(u * Math.PI * 2.2 + time * speed) * amp +
            Math.cos(v * Math.PI * 1.8 - time * speed * 0.7) * amp * 0.55 +
            Math.sin((u + v) * Math.PI * 1.4 + time * speed * 0.45) * amp * 0.35
          position.setZ(i, wave)
        }
      }
      position.needsUpdate = true
      mesh.geometry.computeVertexNormals()
    }

    function resize() {
      const width = host.clientWidth || window.innerWidth
      const height = host.clientHeight || window.innerHeight
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    function animate(time) {
      if (!alive) return
      frame = window.requestAnimationFrame(animate)
      const t = time * 0.001

      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04

      warpRibbon(ribbonA, t, 0.42, 0.55)
      warpRibbon(ribbonB, t + 1.4, 0.28, 0.42)

      ring.rotation.z = t * 0.12
      ring.rotation.y = Math.sin(t * 0.35) * 0.18
      softOrb.position.y = 0.55 + Math.sin(t * 0.6) * 0.12
      softOrb.scale.setScalar(1 + Math.sin(t * 0.8) * 0.08)

      accent.position.set(
        Math.cos(t * 0.55) * 2.4,
        0.2 + Math.sin(t * 0.9) * 0.55,
        Math.sin(t * 0.55) * 1.5,
      )

      const pos = points.geometry.attributes.position
      for (let i = 0; i < speeds.length; i += 1) {
        const ix = i * 3
        const drift = Math.sin(t * speeds[i] + i) * 0.12
        pos.array[ix] = base[ix] + drift
        pos.array[ix + 1] = base[ix + 1] + Math.cos(t * speeds[i] * 0.8 + i) * 0.16
        pos.array[ix + 2] = base[ix + 2] + Math.sin(t * speeds[i] * 0.6 + i * 0.3) * 0.1
      }
      pos.needsUpdate = true
      points.rotation.y = t * 0.04

      root.rotation.y = pointer.x * 0.35 + Math.sin(t * 0.2) * 0.05
      root.rotation.x = -pointer.y * 0.22
      root.position.y = (isLogin ? 0.05 : -0.1) + Math.sin(t * 0.45) * 0.06

      camera.position.x = pointer.x * 0.35
      camera.position.y = 0.35 - pointer.y * 0.2
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    frame = window.requestAnimationFrame(animate)

    return () => {
      alive = false
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      ribbonA.geometry.dispose()
      ribbonA.material.dispose()
      ribbonB.geometry.dispose()
      ribbonB.material.dispose()
      ring.geometry.dispose()
      ring.material.dispose()
      softOrb.geometry.dispose()
      softOrb.material.dispose()
      accent.geometry.dispose()
      accent.material.dispose()
      points.geometry.dispose()
      points.material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [variant])

  return <div ref={hostRef} className={`scene-backdrop scene-backdrop-${variant}`} aria-hidden="true" />
}
