import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createOcean } from './ocean'
import { createSky, sample } from './beachTime'

/** Animated 3D beach (built by blender/beach3d.py) drawn into a container. */
export type Beach3D = {
  setHour(hour: number): void
  setActive(active: boolean): void
}

const MODEL_URL = `${import.meta.env.BASE_URL}beach3d/beach.glb`

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function mountBeach3D(container: HTMLElement, onReady?: () => void): Beach3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.className = 'beach-3d-canvas'
  container.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const sky = createSky()
  scene.add(sky)
  const fog = new THREE.Fog('#cfe6ef', 60, 180)
  scene.fog = fog

  const ocean = createOcean(new THREE.Vector3(-8, 14, 10).normalize())
  scene.add(ocean)
  const hemi = new THREE.HemisphereLight('#cfe9ff', '#e8c890', 1.4)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff0d8', 2.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, far: 60 })
  sun.shadow.bias = -0.0005
  scene.add(sun)

  let camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  const leaves: { o: THREE.Object3D; rx: number; rz: number; ph: number }[] = []
  const clouds: { o: THREE.Mesh; x0: number }[] = []

  new GLTFLoader().load(MODEL_URL, (gltf) => {
    gltf.scene.traverse((o) => {
      if ((o as THREE.Light).isLight) o.visible = false
      if ((o as THREE.PerspectiveCamera).isPerspectiveCamera) camera = o as THREE.PerspectiveCamera
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = mesh.receiveShadow = true
      if (/^(Sea|Shallow|Foam)/.test(o.name)) {
        o.visible = false // replaced by the shader ocean
      } else if (o.name.startsWith('Leaf')) {
        leaves.push({ o, rx: o.rotation.x, rz: o.rotation.z, ph: Math.random() * 6 })
      } else if (o.name.startsWith('Cloud')) {
        mesh.castShadow = false
        mesh.material = (mesh.material as THREE.Material).clone()
        clouds.push({ o: mesh, x0: o.position.x })
      }
    })
    scene.add(gltf.scene)
    resize()
    applyTime(hour, 0)
    onReady?.()
  })

  function resize() {
    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // keep the portrait framing on wide screens
    camera.fov = camera.aspect > 9 / 16 ? 70 : (70 * (9 / 16)) / camera.aspect
    camera.far = 1000
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(container)

  let hour = 12
  function applyTime(h: number, t: number) {
    const s = sample(h)
    const u = sky.material.uniforms
    u.uTop.value.copy(s.skyTop)
    u.uMid.value.copy(s.skyMid)
    u.uBottom.value.copy(s.skyBottom)
    u.uSunDir.value.copy(s.sunDir)
    u.uSunColor.value.copy(s.light)
    u.uSunUp.value = s.sunUp
    u.uMoonDir.value.copy(s.moonDir)
    u.uStars.value = s.stars
    u.uTime.value = t
    const o = ocean.material.uniforms
    o.uSkyTop.value.copy(s.skyTop)
    o.uSkyMid.value.copy(s.skyMid)
    o.uSkyBottom.value.copy(s.skyBottom)
    o.uShallow.value.copy(s.shallow)
    o.uDeep.value.copy(s.deep)
    o.uSunDir.value.copy(s.keyDir)
    o.uSunColor.value.copy(s.light)
    o.uGlint.value = s.sunUp
    sun.position.copy(s.keyDir).multiplyScalar(20)
    sun.color.copy(s.light)
    sun.intensity = s.lightI
    sun.shadow.intensity = s.shadow
    hemi.color.copy(s.hemiSky)
    hemi.groundColor.copy(s.hemiGround)
    hemi.intensity = s.hemiI
    fog.color.copy(s.fog)
    renderer.toneMappingExposure = s.exposure
    for (const c of clouds) {
      const m = c.o.material as THREE.MeshStandardMaterial
      m.color.copy(s.cloud)
      m.emissive?.copy(s.cloud).multiplyScalar(0.6)
    }
  }

  const clock = new THREE.Clock()
  function frame() {
    const t = clock.getElapsedTime()
    ocean.material.uniforms.uTime.value = t
    for (const l of leaves) {
      const w = Math.sin(t * 1.3 + l.ph) * 0.06 + Math.sin(t * 2.7 + l.ph) * 0.02
      l.o.rotation.x = l.rx + w
      l.o.rotation.z = l.rz + w * 0.5
    }
    for (const c of clouds) c.o.position.x = c.x0 + ((t * 0.4) % 80) - 20
    applyTime(hour, t)
    renderer.render(scene, camera)
  }

  let active = false
  const sync = () => renderer.setAnimationLoop(active && !document.hidden ? frame : null)
  document.addEventListener('visibilitychange', sync)

  return {
    setHour(h) {
      hour = h
    },
    setActive(a) {
      if (a === active) return
      active = a
      if (a) resize()
      sync()
    },
  }
}
