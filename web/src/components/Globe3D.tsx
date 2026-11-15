// La Luna en 3D a pantalla completa: relieve LOLA real del polo sur, luz del Sol de JPL Horizons,
// el Sol y la Tierra en su dirección real (tamaño angular real) y los 9 sitios pegados al terreno.
import { Html, Line, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  MOON_SPHERE_ROTATION,
  R_KM,
  buildMoonSphere,
  buildTerrainGeometry,
  drapedDisc,
  heightAt,
  localFrame,
  skyDir,
  terrainEdgeLat,
  toVec,
} from '../lib/moon'
import { useApp } from '../store'
import type { Site, Terrain } from '../types'
import { nowHsl } from './colors'

export type View = 'site' | 'pole' | 'moon'

const SUN_DIST = 30000 // km (escala de escena; el tamaño angular sí es real)
const EARTH_DIST = 5000
const SUN_R = SUN_DIST * Math.tan((0.533 / 2) * (Math.PI / 180))
const EARTH_R = EARTH_DIST * Math.tan((1.9 / 2) * (Math.PI / 180))
const RAY_KM = 60
const POLE = new THREE.Vector3(0, R_KM, 0) // el polo sur queda hacia +Y

function siteHeightKm(site: Site, terrain: Terrain | null) {
  const h = terrain ? heightAt(terrain, site.lat, site.lon) : null
  return (h ?? site.elevM ?? 0) / 1000
}

/** Semáforo como color de three.js (no entiende la sintaxis CSS 'hsl(a b c)') */
export function semaphore(p: number) {
  const x = Math.max(0, Math.min(1, p / 100))
  return new THREE.Color().setHSL((130 * x) / 360, 0.42, 0.56)
}

const RELIEF_MAX_DIST = 2600 // km: más lejos se ve la esfera completa con textura (como Google Earth)

function MoonBody({ view }: { view: View }) {
  const { data } = useApp()
  const tex = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}textures/moon_lroc_4k.jpg`)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const terrain = data.terrain
  const holed = useMemo(() => buildMoonSphere(terrain ? terrainEdgeLat(terrain) : -90.5), [terrain])
  const full = useMemo(() => buildMoonSphere(-90.5), [])
  const relief = useMemo(() => (terrain ? buildTerrainGeometry(terrain, 1) : null), [terrain])
  // Se fija al elegir la vista (correcto desde el primer cuadro) y luego sigue al zoom manual
  const [near, setNear] = useState(view !== 'moon')
  useEffect(() => setNear(view !== 'moon'), [view])
  useFrame(({ camera }) => {
    const n = !!relief && camera.position.distanceTo(POLE) < RELIEF_MAX_DIST
    if (n !== near) setNear(n)
  })
  return (
    <group>
      <mesh geometry={near ? holed : full} rotation={MOON_SPHERE_ROTATION} receiveShadow>
        <meshStandardMaterial map={tex} roughness={1} metalness={0} />
      </mesh>
      {relief && (
        <mesh geometry={relief} castShadow receiveShadow visible={near}>
          {/* albedo medio de LROC a 76–80°S para empatar con la esfera */}
          <meshStandardMaterial color="#aeaba4" roughness={1} metalness={0} />
        </mesh>
      )}
    </group>
  )
}

/** Luz solar con sombras; la caja de sombras sigue a la cámara para tener detalle de cerca */
function SunLight({ dir }: { dir: THREE.Vector3 }) {
  const light = useRef<THREE.DirectionalLight>(null)
  const { controls, camera } = useThree() as unknown as { controls: OrbitControlsImpl | null; camera: THREE.Camera }
  useFrame(() => {
    const l = light.current
    if (!l) return
    const center = controls?.target ?? POLE
    const dist = camera.position.distanceTo(center)
    const s = THREE.MathUtils.clamp(dist * 0.9, 40, 420)
    l.position.copy(center).addScaledVector(dir, 4000)
    l.target.position.copy(center)
    l.target.updateMatrixWorld()
    const cam = l.shadow.camera as THREE.OrthographicCamera
    if (Math.abs(cam.right - s) > 1) {
      cam.left = -s
      cam.right = s
      cam.top = s
      cam.bottom = -s
      cam.updateProjectionMatrix()
      l.shadow.normalBias = s * 0.0025
    }
  })
  return (
    <directionalLight
      ref={light}
      intensity={6}
      color="#fff6e8"
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-camera-near={100}
      shadow-camera-far={9000}
      shadow-bias={-0.0004}
    />
  )
}

function SunAndEarth({ site, sunDir, earthDir }: { site: THREE.Vector3; sunDir: THREE.Vector3; earthDir: THREE.Vector3 }) {
  const { t } = useApp()
  const sunGlow = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!
    const glow = context.createRadialGradient(128, 128, 0, 128, 128, 128)
    glow.addColorStop(0, 'rgba(255, 249, 225, 1)')
    glow.addColorStop(0.12, 'rgba(255, 229, 158, 0.9)')
    glow.addColorStop(0.25, 'rgba(255, 194, 87, 0.45)')
    glow.addColorStop(0.5, 'rgba(255, 151, 51, 0.12)')
    glow.addColorStop(1, 'rgba(255, 151, 51, 0)')
    context.fillStyle = glow
    context.fillRect(0, 0, 256, 256)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
  useEffect(() => () => sunGlow.dispose(), [sunGlow])
  const sunPos = site.clone().addScaledVector(sunDir, SUN_DIST)
  const earthPos = site.clone().addScaledVector(earthDir, EARTH_DIST)
  return (
    <group>
      <mesh position={sunPos}>
        <sphereGeometry args={[SUN_R, 32, 16]} />
        <meshBasicMaterial color="#fff5d9" toneMapped={false} />
      </mesh>
      <sprite position={sunPos} scale={[SUN_R * 9, SUN_R * 9, 1]}>
        <spriteMaterial map={sunGlow} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh position={earthPos}>
        <sphereGeometry args={[EARTH_R, 32, 16]} />
        <meshStandardMaterial color="#4a8fe8" emissive="#1d4f8f" emissiveIntensity={0.6} roughness={0.6} />
      </mesh>
      <Html position={earthPos} center zIndexRange={[10, 0]}>
        <span className="pointer-events-none whitespace-nowrap pl-6 text-[11px] text-earth/90">{t('earth')}</span>
      </Html>
      <Html position={sunPos} center zIndexRange={[10, 0]}>
        <span className="pointer-events-none whitespace-nowrap pl-8 text-[11px] text-sun/90">{t('sun')}</span>
      </Html>
    </group>
  )
}

/** Rosa de los vientos del sitio y líneas de visión al Sol y a la Tierra */
function SiteCompass({ site, h, sunDir, earthDir, sunVis, earthVis }: { site: Site; h: number; sunDir: THREE.Vector3; earthDir: THREE.Vector3; sunVis: boolean; earthVis: boolean }) {
  const { north, east } = useMemo(() => localFrame(site.lat, site.lon), [site])
  const c = useMemo(() => toVec(site.lat, site.lon, h + 0.6), [site, h])
  const card = (az: number, r: number) =>
    c.clone().addScaledVector(north, r * Math.cos((az * Math.PI) / 180)).addScaledVector(east, r * Math.sin((az * Math.PI) / 180))
  return (
    <group>
      {(['N', 'E', 'S', 'W'] as const).map((l, i) => (
        <Html key={l} position={card(i * 90, 30)} center zIndexRange={[10, 0]}>
          <span className={`pointer-events-none text-[10px] font-semibold ${l === 'N' ? 'text-white' : 'text-white/50'}`}>{l}</span>
        </Html>
      ))}
      <Line points={[c, c.clone().addScaledVector(sunDir, RAY_KM)]} color="#d8b36a" lineWidth={2.5} dashed={!sunVis} dashSize={3} gapSize={3} />
      <Line points={[c, c.clone().addScaledVector(earthDir, RAY_KM)]} color="#7ea6d8" lineWidth={2.5} dashed={!earthVis} dashSize={3} gapSize={3} />
    </group>
  )
}

// Radio del marcador (km). De cerca es el tamaño real de una región (~15 km de ancho);
// al alejarse crece para que se siga viendo. Se redondea a niveles para no rehacer mallas a cada cuadro.
const LEVELS = [7.5, 10, 14, 20, 28, 40]
function levelFor(distKm: number) {
  const want = distKm * 0.012
  return LEVELS.find((l) => l >= want) ?? LEVELS[LEVELS.length - 1]
}

/** Marcador de sitio pegado al terreno: disco translúcido + borde, del color del semáforo */
function SiteMarker({ site, r, color, selected, hovered, onPick, onHover, showLabel, star }: {
  site: Site
  r: number
  color: THREE.Color
  selected: boolean
  hovered: boolean
  onPick: () => void
  onHover: (on: boolean) => void
  showLabel: boolean
  star: boolean
}) {
  const { data } = useApp()
  const center = useMemo(() => toVec(site.lat, site.lon, siteHeightKm(site, data.terrain)), [site, data.terrain])
  const disc = useMemo(() => drapedDisc(data.terrain, site.lat, site.lon, r, Math.max(0.12, r * 0.015)), [data.terrain, site, r])
  const css = `#${color.getHexString()}`
  return (
    <group>
      <mesh
        geometry={disc.geometry}
        renderOrder={2}
        onClick={(e) => {
          e.stopPropagation()
          onPick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(false)
          document.body.style.cursor = ''
        }}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.45 : hovered ? 0.4 : 0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          toneMapped={false}
        />
      </mesh>
      <Line key={r} points={disc.edge} color={selected ? '#ffffff' : css} lineWidth={selected ? 3 : 2} transparent opacity={0.95} renderOrder={3} />
      {(showLabel || selected || hovered) && (
        <Html position={center} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="-translate-x-1/2 -translate-y-[calc(100%+10px)]">
            <div className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs backdrop-blur-md ${selected ? 'border-white/40 bg-black/70 text-white' : 'border-white/10 bg-black/50 text-white/85'}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: css }} />
              {site.name}
              {star && <span className="text-both">★</span>}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

function SiteMarkers({ view, hover, setHover }: { view: View; hover: string | null; setHover: (id: string | null) => void }) {
  const { data, site, focus, selectSite, yearMetrics, now, nowRanking, rankBy, isCandidate } = useApp()
  // Color: según la hora elegida (modo "Ahora") o según todo el año
  const colorOf = (id: string) => {
    if (rankBy === 'year') return semaphore(yearMetrics[id].bothPct)
    const [h, s, l] = nowHsl(now[id])
    return new THREE.Color().setHSL(h / 360, s / 100, l / 100)
  }
  // La estrella solo marca regiones Artemis (las que compiten como candidatas)
  const best =
    rankBy === 'now'
      ? now[nowRanking[0]].both
        ? nowRanking[0]
        : null
      : data.sites.filter((s) => isCandidate(s.id)).sort((a, b) => yearMetrics[b.id].bothPct - yearMetrics[a.id].bothPct)[0]?.id
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: OrbitControlsImpl | null }
  // De cerca se etiquetan todos; de lejos solo el elegido o el que está bajo el cursor
  const byView = (v: View) => (v === 'moon' ? LEVELS[LEVELS.length - 1] : v === 'pole' ? 10 : LEVELS[0])
  const [near, setNear] = useState(view === 'site')
  const [r, setR] = useState(() => byView(view))
  useEffect(() => {
    setR(byView(view))
    setNear(view === 'site')
  }, [view])
  useFrame(() => {
    const n = camera.position.distanceTo(controls?.target ?? POLE) < 260
    if (n !== near) setNear(n)
    const l = levelFor(camera.position.distanceTo(controls?.target ?? POLE))
    if (l !== r) setR(l)
  })
  return (
    <group>
      {data.sites.map((s) => (
        <SiteMarker
          key={s.id}
          site={s}
          r={r}
          color={colorOf(s.id)}
          selected={focus && s.id === site.id}
          hovered={hover === s.id}
          onPick={() => selectSite(s.id)}
          onHover={(on) => setHover(on ? s.id : null)}
          showLabel={near}
          star={s.id === best}
        />
      ))}
    </group>
  )
}

/** Mueve la cámara suavemente al cambiar de sitio o de vista */
function CameraRig({ view, target, earthDir, sunDir, nonce }: { view: View; target: THREE.Vector3; earthDir: THREE.Vector3; sunDir: THREE.Vector3; nonce: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null }
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null)

  useEffect(() => {
    // El norte lunar es -Y en este marco. En la vista global debe quedar
    // arriba en pantalla; las vistas de terreno conservan su vertical local.
    camera.up.set(0, view === 'moon' ? -1 : 1, 0)
    const up = target.clone().normalize()
    if (view === 'site') {
      // vista oblicua desde atrás del sitio, mirando hacia la Tierra
      const horiz = earthDir.clone().addScaledVector(up, -earthDir.dot(up)).normalize()
      goal.current = { tgt: target.clone(), pos: target.clone().addScaledVector(up, 70).addScaledVector(horiz, -130) }
    } else if (view === 'pole') {
      const sun = sunDir.clone().setY(0).normalize()
      goal.current = { tgt: POLE.clone(), pos: POLE.clone().addScaledVector(sun, 250).add(new THREE.Vector3(0, 400, 0)) }
    } else {
      // la Luna entera, vista desde el lado iluminado y con el polo sur a la vista
      const sun = sunDir.clone().setY(0).normalize()
      const side = new THREE.Vector3(0, 1, 0).cross(sun).normalize()
      const dir = new THREE.Vector3(0, 0.72, 0).addScaledVector(sun, 0.62).addScaledVector(side, 0.3).normalize()
      goal.current = { tgt: new THREE.Vector3(0, 0, 0), pos: dir.multiplyScalar(R_KM * 3.3) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, nonce])

  const first = useRef(true)
  useFrame((_, dt) => {
    const g = goal.current
    if (!g || !controls) return
    // La primera vista se coloca directo (sin vuelo desde la posición por defecto)
    const k = first.current ? 1 : 1 - Math.exp(-dt * 3)
    first.current = false
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.tgt, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.5 && controls.target.distanceTo(g.tgt) < 0.5) goal.current = null
  })
  return null
}

function Scene({ view, nonce, hover, setHover }: { view: View; nonce: number; hover: string | null; setHover: (id: string | null) => void }) {
  const { site, data, timeIndex, flags, focus } = useApp()
  const sample = data.samples[site.id][Math.min(timeIndex, data.samples[site.id].length - 1)]
  const h = siteHeightKm(site, data.terrain)
  const sitePos = useMemo(() => toVec(site.lat, site.lon, h), [site, h])
  const sunDir = skyDir(site.lat, site.lon, sample.sunAz, sample.sunEl)
  const earthDir = skyDir(site.lat, site.lon, sample.earthAz, sample.earthEl)
  const f = flags[site.id]
  const i = Math.min(timeIndex, f.sun.length - 1)

  return (
    <>
      <color attach="background" args={['#05070b']} />
      <Stars radius={60000} depth={20000} count={3500} factor={700} saturation={0} fade />
      <ambientLight intensity={0.16} color="#9fb8ff" />
      <SunLight dir={sunDir} />
      <Suspense fallback={null}>
        <MoonBody view={view} />
      </Suspense>
      <SunAndEarth site={sitePos} sunDir={sunDir} earthDir={earthDir} />
      <SiteMarkers view={view} hover={hover} setHover={setHover} />
      {focus && <SiteCompass site={site} h={h} sunDir={sunDir} earthDir={earthDir} sunVis={!!f.sun[i]} earthVis={!!f.earth[i]} />}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={R_KM * 10} zoomSpeed={0.8} />
      <CameraRig view={view} target={sitePos} earthDir={earthDir} sunDir={sunDir} nonce={nonce} />
    </>
  )
}

export function MoonCanvas({ view, nonce, hover, setHover }: { view: View; nonce: number; hover: string | null; setHover: (id: string | null) => void }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.5, far: 400000, position: [0, R_KM * 3.3, R_KM], up: [0, -1, 0] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Scene view={view} nonce={nonce} hover={hover} setHover={setHover} />
    </Canvas>
  )
}
