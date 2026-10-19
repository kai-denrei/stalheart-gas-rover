// beamdraw.js — HOW THE BEAM IS DRAWN, in one place.
//
// This was inline in td-tab, which meant the beam lab could not show it: the
// lab drew two straight beamfx ribbons on a flat floor while the board drew a
// chained arc plus a plasma plume hugging a sphere. A tuning surface that
// shows a different weapon than the game is worse than none — it is confident
// and wrong, and this project has already paid for that once with a preset
// tuned in a lab whose tone mapping the game did not have.
//
// So a RIG owns the meshes and the update, and both surfaces build one. The
// lab is now honest by construction rather than by discipline.
//
// THE ANATOMY. A flamethrower is two things:
//
//   the ROOT   the tuned beamfx ribbon, chained in short straight links along
//              a great circle. Straight links because beamfx draws a segment
//              between two endpoints and is vendored VERBATIM — bending it
//              would fork the vendor file and end the mechanical re-port.
//   the PLUME  a dot cloud, this codebase's native idiom, one draw call per
//              gun. Dots ride muzzle -> tip and recycle, so it reads as
//              something thrown rather than a shape held.
//
// NOTE the vendor import carries no ?v= token, and must not: a tokened vendor
// URL loads a SECOND copy of three.js.
import * as THREE from '../vendor/three.module.js';
import { createBeam } from './beamfx.js';
import { arcPoint } from './arc.js';

// The plume's shape. Every one of these is a live knob on both surfaces,
// because the shape of a flame is taste and a derived value is a starting
// point and nothing more.
export const PLASMA_DEFAULTS = {
  // THE RIBBON RUNS THE WHOLE BEAM (operator, 2026-09-02). It used to cover
  // 0.45 of it, on the "hot root plus long plume" reading — but that made the
  // drawn ribbon 45% of the beam that actually damages, and left the dots as
  // the only marker of the real reach. They then flew far past the ribbon,
  // which is exactly what the operator's screenshot showed.
  coreFrac: 1.0,
  points: 220,      // dots per gun

  // --- THE PLUME IS LINKED TO THE RIBBON ---------------------------------
  // "I don't think we need both the dots and the beams in Plasma, or they
  // could be linked. I don't want those particles going much further or
  // wider than the main beam."
  //
  // So the dots no longer have a length or a width of their own — the old
  // `flare` and `rootFlare` are gone. Both are read off the ribbon:
  // `plumeLen` is a fraction of the DRAWN beam, and `plumeWidth` is a
  // multiple of the ribbon's LOCAL half-width, which is itself tapered from
  // the muzzle, so the dots inherit the cone for free. Widen the beam and
  // the dots widen with it; there is no second shape to keep in sync, and no
  // setting of these two can send a dot past the tip.
  dots: true,        // the plume at all — off leaves the bare ribbon
  plumeLen: 1.0,     // fraction of the DRAWN beam the dots cover (<=1)
  plumeWidth: 1.6,   // multiple of the ribbon's own half-width at that point
  // The hot root's width at the muzzle as a fraction of the preset width, so
  // the core emerges narrow and opens along the chain instead of leaving the
  // gun already a cell wide.
  coreRoot: 0.22,
  flow: 1.9,        // plume travels muzzle -> tip this many times a second
  bias: 1.35,       // >1 crowds the dots toward the root, where flame is dense
  squash: 0.55,     // vertical spread against lateral — a plume HUGS
  twist: 7.0,       // radians of corkscrew per unit of arc
  size: 3.2,        // screen px, matching the board's other clouds
};

// THE SHIPPED PRESET, in ONE place (operator, 2026-09-02, pasted from the
// lab's ⧉ copy). It lived in td-tab while the lab kept its own lab-scaled
// copy, so "try these presets in the game" was two edits and a unit
// conversion — which is exactly the seam a tuned value goes stale in.
//
// Widths are in CELLS. The rig multiplies them by `scale`, which is world
// units per cell on whichever surface is drawing: 0.08 on the board, 1 in
// the lab. glowColor is a placeholder — the pilot's RANK owns the colour
// (beamranks.js) and overwrites it on every rig.
export const BOARD_PRESET = {
  coreColor: '#ffffff', coreWidth: 0.0025, coreIntensity: 8,
  glowColor: '#666100', glowWidth: 0.464, glowIntensity: 2, glowFalloff: 8,
  capStart: 0.155, capEnd: 0.4, blast: 0,
  scrollSpeed: -4, noiseScale: 16.9, noiseAmount: 0.61, flicker: 0.5,
  jitterAmount: 0.19, jitterFreq: 118,
  burstRate: 0, burstDuty: 0.54, burstDecay: 3.15, burstAttack: 0,
};
// Intensity at the midpoint of the burst — the preset's `peakIntensity`.
export const BEAM_PEAK = 8;

// Straight links in the root. Solved, not guessed: at the rank-15 reach the
// root spans 0.36 rad, so three links sag 0.02 cells — a fortieth of the
// 3.51 cells a single chord flew.
// Five rather than three since the root tapers across them: three steps of
// width read as a stack of boxes, five read as a cone. Costs four more draw
// calls on a frame that spends about a thousand.
export const CORE_SEGS = 5;

// mulberry32, the project's one stream. Copied rather than imported because
// this module is the render layer and grid.js is the sim layer; a render
// module reaching into the sim for a PRNG is the wrong direction of arrow.
function rng32(a) {
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a rig: `guns` root chains and `guns` plumes, added to `scene`.
//
//   preset   the beamfx parameter object (BEAM_PRESET on the board)
//   plasma   a LIVE object — the caller keeps it and mutates it from its GUI,
//            and the rig reads it every frame rather than caching it
//   seed     so two runs on one seed burn identically
//   widthKeys  preset keys expressed in CELLS, multiplied by cellSide at use.
//            The lab tunes against a 1-unit tank and the board runs one about
//            0.85 of a cell wide; a width copied across raw is either
//            invisible or swallows the screen.
export function createBeamRig({
  scene, guns = 2, preset, plasma = { ...PLASMA_DEFAULTS }, seed = 1,
  widthKeys = ['coreWidth', 'glowWidth', 'jitterAmount'],
}) {
  const beams = [];
  for (let i = 0; i < guns * CORE_SEGS; i++) {
    const bm = createBeam(new THREE.Vector3(), new THREE.Vector3(), preset);
    bm.mesh.visible = false;
    scene.add(bm.mesh);
    beams.push(bm);
  }

  const rand = rng32(seed >>> 0);
  const plumes = [];
  for (let g = 0; g < guns; g++) {
    const N = plasma.points;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const phase = new Float32Array(N), ang = new Float32Array(N), rad = new Float32Array(N);
    for (let j = 0; j < N; j++) {
      phase[j] = rand();
      ang[j] = rand() * Math.PI * 2;
      rad[j] = Math.sqrt(rand());   // fills the disc evenly, no pile on the axis
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: plasma.size, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.95, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    pts.frustumCulled = false;   // the positions move every frame anyway
    pts.renderOrder = 10;
    pts.visible = false;
    scene.add(pts);
    plumes.push({ pts, geo, pos, col, phase, ang, rad });
  }

  // The muzzle taper, as ONE curve that both the ribbon and the plume read.
  // Two copies of this is how the dots stop matching the beam the first time
  // either is touched.
  const widthAt = (u) => plasma.coreRoot + (1 - plasma.coreRoot) * Math.pow(u, 0.7);

  const col = new THREE.Color(preset.glowColor || '#ffffff');
  const a = new THREE.Vector3(), b = new THREE.Vector3();

  // One gun's beam, drawn along the great circle leaving `from` toward `dir`.
  //
  //   from   UNIT vector: the muzzle, projected to the sphere
  //   dir    UNIT TANGENT at `from`
  //   len    ARC LENGTH to draw — the CHOKED length, not the clear-air reach
  //   heat   0..1 through the burst; drives the bell
  //   lift   radial multiplier so the beam clears the ground
  //   scale  what a "cell" is in this world, for the width keys
  //   peak   glow intensity at the middle of the bell
  function draw(gun, { from, dir, len, heat, lift = 1, scale = 1, time = 0, peak = 8 }) {
    // THE BELL. 0 at the trigger, peak at the midpoint, 0 as the tubes lock —
    // driving INTENSITY rather than opacity, because under bloom the two read
    // very differently.
    const env = Math.sin(Math.min(1, Math.max(0, heat)) * Math.PI);
    const coreLen = len * plasma.coreFrac;
    for (let k = 0; k < CORE_SEGS; k++) {
      const bm = beams[gun * CORE_SEGS + k];
      if (!bm) continue;
      const p0 = arcPoint(from, dir, coreLen * (k / CORE_SEGS));
      const p1 = arcPoint(from, dir, coreLen * ((k + 1) / CORE_SEGS));
      a.set(p0[0] * lift, p0[1] * lift, p0[2] * lift);
      b.set(p1[0] * lift, p1[1] * lift, p1[2] * lift);
      bm.setEndpoints(a, b);
      // NARROW AT THE MUZZLE, opening along the chain. Sampled at each link's
      // midpoint so the first link is not uniformly the root width.
      const mid = (k + 0.5) / CORE_SEGS;
      const wMul = widthAt(mid);
      for (const key of widthKeys) {
        const u = bm.uniforms['u' + key[0].toUpperCase() + key.slice(1)];
        if (u) u.value = preset[key] * scale * wMul;
      }
      // THE JOINTS MUST NOT TAPER. beamfx fades each ribbon to nothing over
      // capStart/capEnd of its OWN length; leave that on and a chained root
      // reads as three dashes with gaps rather than one beam. Only the true
      // ends of the chain keep their cap.
      const cs = bm.uniforms.uCapStart, ce = bm.uniforms.uCapEnd;
      if (cs) cs.value = k === 0 ? preset.capStart : 0;
      if (ce) ce.value = k === CORE_SEGS - 1 ? preset.capEnd : 0;
      const gi = bm.uniforms.uGlowIntensity;
      if (gi) gi.value = peak * env;
      bm.mesh.visible = true;
      bm.update(time);
      bm.setAlpha(1);
    }

    const pl = plumes[gun];
    if (!pl) return;
    if (!plasma.dots) { pl.pts.visible = false; return; }
    // The ribbon's own half-width, in the unit-sphere frame these offsets are
    // built in. `scale / lift` puts a cell into that frame and lands on the
    // same number on both surfaces: the board is 1 cell = 0.08 world at lift
    // 1; the lab is 1 cell = 1 world at lift 12.5.
    const ribbonUnit = (preset.glowWidth || 0) * scale / lift;
    const plumeSpan = coreLen * Math.min(1, plasma.plumeLen);
    const N = Math.min(plasma.points, pl.phase.length);
    for (let j = 0; j < N; j++) {
      // FLOW. Each dot rides muzzle -> tip and recycles.
      let u = (pl.phase[j] + time * plasma.flow) % 1;
      if (u < 0) u += 1;
      const s = plumeSpan * Math.pow(u, plasma.bias);
      // arcPoint and arcTangent are the same cos/sin pair — this runs `points`
      // times per gun per frame, so share them rather than paying four
      // transcendentals where two will do.
      const c = Math.cos(s), n = Math.sin(s);
      const qx = from[0] * c + dir[0] * n;
      const qy = from[1] * c + dir[1] * n;
      const qz = from[2] * c + dir[2] * n;
      const tx = dir[0] * c - from[0] * n;
      const ty = dir[1] * c - from[1] * n;
      const tz = dir[2] * c - from[2] * n;
      // q IS the outward normal there, and it is perpendicular to the tangent
      // by construction — so their cross is already unit and a normalise would
      // only cost a sqrt to confirm it.
      const rx = qy * tz - qz * ty, ry = qz * tx - qx * tz, rz = qx * ty - qy * tx;
      // WIDTH COMES FROM THE RIBBON at this point along it, so the dots wear
      // the same muzzle taper and can never exceed the beam's own width by
      // more than plumeWidth.
      const spread = ribbonUnit * widthAt(u) * plasma.plumeWidth;
      const rr = pl.rad[j] * spread;
      const ang = pl.ang[j] + s * plasma.twist;
      const lat = Math.cos(ang) * rr, vert = Math.sin(ang) * rr * plasma.squash;
      pl.pos[j * 3] = (qx + rx * lat + qx * vert) * lift;
      pl.pos[j * 3 + 1] = (qy + ry * lat + qy * vert) * lift;
      pl.pos[j * 3 + 2] = (qz + rz * lat + qz * vert) * lift;
      // COLOUR: white-hot at the muzzle, the rank's colour through the body,
      // guttering out at the tip. The white is what stops a coloured cloud
      // reading as smoke.
      const bri = Math.pow(1 - u, 1.1) * env;
      const w = Math.max(0, 1 - u * 3.2);
      pl.col[j * 3] = (col.r + (1 - col.r) * w) * bri;
      pl.col[j * 3 + 1] = (col.g + (1 - col.g) * w) * bri;
      pl.col[j * 3 + 2] = (col.b + (1 - col.b) * w) * bri;
    }
    pl.geo.attributes.position.needsUpdate = true;
    pl.geo.attributes.color.needsUpdate = true;
    pl.pts.material.size = plasma.size;
    pl.pts.visible = true;
  }

  return {
    beams,
    plumes,
    color: col,
    setColor(hex) {
      col.set(hex);
      for (const bm of beams) {
        const u = bm.uniforms.uGlowColor;
        if (u) u.value.set(hex);
      }
    },
    draw,
    hide() {
      for (const bm of beams) bm.mesh.visible = false;
      for (const pl of plumes) pl.pts.visible = false;
    },
  };
}
