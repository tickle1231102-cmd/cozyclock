import * as THREE from 'three';

// Shader ocean: Gerstner swells that shoal and break on the sand, fresnel sky
// reflection, sun glint, depth-tinted shallows, crest foam and shore swash.
// Coordinates are three.js (Y-up); Blender (x, y, z) maps to (x, z, -y).

const WATER_LEVEL = -0.05;

const common = /* glsl */ `
  uniform float uTime;
  // Sand height from blender/beach3d.py, converted to three.js space.
  float sandHeight(vec2 xz) {
    float bx = xz.x, ly = -xz.y - 6.0;
    if (abs(bx) > 30.0 || abs(ly) > 30.0) return -6.0;
    return 0.25 * sin(bx * 0.35) + 0.18 * cos(ly * 0.5 + bx * 0.2) - max(0.0, ly - 2.0) * 0.12;
  }
  float waterDepth(vec2 xz) { return max(${WATER_LEVEL.toFixed(2)} - sandHeight(xz), 0.0) + max(-xz.y - 36.0, 0.0) * 0.2; }

  // Gerstner wave: dir, steepness, wavelength. Accumulates offset and tangents.
  void gerstner(vec2 dir, float steep, float len, vec2 p, float amp,
                inout vec3 off, inout vec3 tan, inout vec3 bin) {
    float k = 6.28318 / len;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(dir);
    float f = k * (dot(d, p) - c * uTime);
    float a = steep / k * amp;
    off += vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
    tan += vec3(-d.x * d.x * steep * amp * sin(f), d.x * steep * amp * cos(f), -d.x * d.y * steep * amp * sin(f));
    bin += vec3(-d.x * d.y * steep * amp * sin(f), d.y * steep * amp * cos(f), -d.y * d.y * steep * amp * sin(f));
  }
`;

const vertexShader = /* glsl */ `
  ${common}
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;
  varying float vDepth;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    float depth = waterDepth(p.xz);
    // waves shrink in very shallow water but steepen just before (shoaling)
    float amp = smoothstep(0.0, 0.6, depth) * (1.0 + 0.6 * (1.0 - smoothstep(0.6, 3.0, depth)));
    vec3 off = vec3(0.0), tan = vec3(1.0, 0.0, 0.0), bin = vec3(0.0, 0.0, 1.0);
    gerstner(vec2( 0.05, 1.0), 0.16, 14.0, p.xz, amp, off, tan, bin);
    gerstner(vec2( 0.30, 1.0), 0.12,  8.5, p.xz, amp, off, tan, bin);
    gerstner(vec2(-0.40, 1.0), 0.10,  5.0, p.xz, amp, off, tan, bin);
    gerstner(vec2( 0.80, 0.6), 0.10,  3.1, p.xz, amp, off, tan, bin);
    gerstner(vec2(-0.90, 0.5), 0.08,  1.9, p.xz, amp, off, tan, bin);
    p += off;
    vWorld = p;
    vNormal = normalize(cross(bin, tan));
    vCrest = off.y;
    vDepth = depth;
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  ${common}
  uniform vec3 uSunDir, uSunColor, uSkyTop, uSkyMid, uSkyBottom, uShallow, uDeep;
  uniform float uGlint;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;
  varying float vDepth;
  #include <fog_pars_fragment>

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  vec3 skyColor(vec3 d) {
    float h = clamp(d.y, 0.0, 1.0);
    vec3 c = mix(uSkyBottom, uSkyMid, smoothstep(0.0, 0.18, h));
    c = mix(c, uSkyTop, smoothstep(0.18, 0.75, h));
    float s = max(dot(normalize(d), uSunDir), 0.0);
    return c + uSunColor * pow(s, 8.0) * 0.35 * uGlint;
  }

  void main() {
    // fine ripples from noise gradients on top of the swell normal
    vec2 uv = vWorld.xz;
    float e = 0.05;
    vec2 q = uv * 1.6 + vec2(0.0, uTime * 0.35);
    vec2 r = uv * 3.7 + vec2(uTime * 0.2, uTime * 0.5);
    float h0 = fbm(q) + 0.5 * fbm(r);
    float hx = fbm(q + vec2(e, 0)) + 0.5 * fbm(r + vec2(e, 0));
    float hz = fbm(q + vec2(0, e)) + 0.5 * fbm(r + vec2(0, e));
    vec3 n = normalize(vNormal + vec3(h0 - hx, 0.0, h0 - hz) * 2.2);

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.02 + 0.7 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
    vec3 refl = skyColor(reflect(-V, n));

    // body colour: clear sand-tinted shallows → turquoise → deep blue
    vec3 sandCol = vec3(0.86, 0.76, 0.56) * (0.25 + 0.75 * uGlint);
    vec3 shallow = uShallow;
    vec3 deep = uDeep;
    float d = vDepth;
    vec3 body = mix(shallow, deep, smoothstep(0.3, 4.0, d));
    body = mix(sandCol, body, smoothstep(0.0, 0.5, d));
    body *= 0.85 + 0.3 * max(dot(n, uSunDir), 0.0) * uGlint;
    // light passing through thin wave crests
    body += vec3(0.1, 0.35, 0.3) * smoothstep(0.05, 0.4, vCrest) * smoothstep(1.0, 4.0, d);

    vec3 col = mix(body, refl, fres);

    // sun glint
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(n, H), 0.0), 380.0) * step(0.0, uSunDir.y);
    col += uSunColor * spec * 3.0 * max(uGlint, 0.35);

    // foam: whitecaps on crests + swash band that runs up and back
    float foamTex = fbm(uv * 2.2 + vec2(0.0, uTime * 0.6));
    float crest = smoothstep(0.42, 0.62, vCrest + foamTex * 0.2) * 0.85 * smoothstep(0.5, 2.0, d);
    float swash = sin(uTime * 0.8) * 0.5 + 0.5;
    float shoreLine = 0.03 + 0.1 * swash;
    float shore = smoothstep(shoreLine + 0.12, shoreLine, d) * smoothstep(0.45, 0.65, foamTex);
    float edge = smoothstep(0.06, 0.0, abs(d - shoreLine)) * 0.6;
    float foam = clamp(crest + shore + edge, 0.0, 1.0);
    col = mix(col, mix(uSkyMid, vec3(0.97, 0.98, 1.0), 0.3 + 0.6 * uGlint), foam);

    // wet-sand fade so the edge melts into the beach
    float alpha = smoothstep(0.0, 0.03, d - 0.02) * smoothstep(6.5, 8.5, -vWorld.z);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createOcean(sunDir: THREE.Vector3) {
  // dense near the shore, coarser offshore
  const geo = new THREE.PlaneGeometry(260, 220, 260, 280);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getZ(i) + 110) / 220; // 0 far … 1 near
    pos.setZ(i, -2 - Math.pow(1 - t, 2.2) * 220);
  }
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 }, uSunDir: { value: sunDir.clone() }, uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
        uSkyTop: { value: new THREE.Color() }, uSkyMid: { value: new THREE.Color() }, uSkyBottom: { value: new THREE.Color() },
        uShallow: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uGlint: { value: 1 },
      },
    ]),
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = WATER_LEVEL;
  mesh.frustumCulled = false;
  return mesh;
}
