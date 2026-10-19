// sample.js — blue-noise-ish point sampling on the unit sphere.
//
// Mitchell best-candidate: for each new point, draw k uniform candidates
// and keep the one farthest from the existing set. The nearest-neighbor
// query is the whole cost; the naive version is O(n²k) (2.7s at n=8000).
// Points live on the sphere, so a 3D VOXEL hash over [-1,1]³ works with no
// cube-map face-seam logic: only ~O(n) surface voxels are ever occupied.
// NN search expands Chebyshev rings of voxels around the candidate and
// stops once no farther ring can beat the best found — exact, not
// approximate, so results stay deterministic per seed. Below a small point
// count the grid is too sparse to help; brute force covers that regime.
//
// Chord distance is used instead of geodesic: monotonically equivalent on
// a sphere, and cheaper.

// Uniform random point on the unit sphere (area-preserving: z uniform).
export function uniformSpherePoint(rng) {
  const z = 2 * rng() - 1;
  const theta = 2 * Math.PI * rng();
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [r * Math.cos(theta), r * Math.sin(theta), z];
}

// n points on the unit sphere, best-candidate with k candidates per point.
export function bestCandidateSphere(rng, { n = 600, k = 12 } = {}) {
  // voxel edge ≈ expected point spacing (√(surface area / n))
  const cell = Math.sqrt((4 * Math.PI) / Math.max(n, 1));
  const inv = 1 / cell;
  const res = Math.ceil(2 * inv) + 2; // voxels per axis spanning [-1,1] + pad
  const buckets = new Map(); // voxel key -> array of point indices

  const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n);
  let count = 0;

  const voxOf = (v) => Math.min(res - 1, Math.max(0, Math.floor((v + 1) * inv) + 1));
  const keyOf = (ix, iy, iz) => (ix * res + iy) * res + iz;

  const insert = (i) => {
    const key = keyOf(voxOf(px[i]), voxOf(py[i]), voxOf(pz[i]));
    let list = buckets.get(key);
    if (list === undefined) { list = []; buckets.set(key, list); }
    list.push(i);
  };

  const BRUTE_LIMIT = 96; // grid sparser than ~one point per ring below this

  // squared distance from (x,y,z) to its nearest existing point
  const nearestSq = (x, y, z) => {
    let best = Infinity;
    if (count <= BRUTE_LIMIT) {
      for (let i = 0; i < count; i++) {
        const dx = x - px[i], dy = y - py[i], dz = z - pz[i];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) best = d;
      }
      return best;
    }
    const cx = voxOf(x), cy = voxOf(y), cz = voxOf(z);
    for (let ring = 0; ring < res; ring++) {
      // nothing in ring r or beyond can be closer than (r−1)·cell
      if (ring > 1 && best <= ((ring - 1) * cell) ** 2) break;
      const x0 = Math.max(0, cx - ring), x1 = Math.min(res - 1, cx + ring);
      const y0 = Math.max(0, cy - ring), y1 = Math.min(res - 1, cy + ring);
      const z0 = Math.max(0, cz - ring), z1 = Math.min(res - 1, cz + ring);
      for (let ix = x0; ix <= x1; ix++) {
        for (let iy = y0; iy <= y1; iy++) {
          for (let iz = z0; iz <= z1; iz++) {
            // shell only: interior voxels were scanned in earlier rings
            if (ring > 0
              && ix !== cx - ring && ix !== cx + ring
              && iy !== cy - ring && iy !== cy + ring
              && iz !== cz - ring && iz !== cz + ring) continue;
            const list = buckets.get(keyOf(ix, iy, iz));
            if (list === undefined) continue;
            for (const i of list) {
              const dx = x - px[i], dy = y - py[i], dz = z - pz[i];
              const d = dx * dx + dy * dy + dz * dz;
              if (d < best) best = d;
            }
          }
        }
      }
    }
    return best;
  };

  const p0 = uniformSpherePoint(rng);
  px[0] = p0[0]; py[0] = p0[1]; pz[0] = p0[2];
  count = 1;
  insert(0);

  while (count < n) {
    let bx = 0, by = 0, bz = 0, bestD = -1;
    for (let c = 0; c < k; c++) {
      const cand = uniformSpherePoint(rng);
      const d = nearestSq(cand[0], cand[1], cand[2]);
      if (d > bestD) { bestD = d; bx = cand[0]; by = cand[1]; bz = cand[2]; }
    }
    px[count] = bx; py[count] = by; pz[count] = bz;
    insert(count);
    count++;
  }

  const points = new Array(n);
  for (let i = 0; i < n; i++) points[i] = [px[i], py[i], pz[i]];
  return points;
}
