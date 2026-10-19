// hull.js — spherical Delaunay triangulation via 3D convex hull.
//
// For points ON a sphere, the convex hull IS the Delaunay triangulation of
// the sphere (every point is an extreme point; the empty-circumcircle
// property maps to hull faces). This replaces the planar Delaunator of the
// 2D pipeline. Three.js's quickhull implementation produces triangular faces
// wound CCW as seen from outside (outward normals) — a consistent global
// orientation the 2D version had to normalize into existence.

import { Vector3 } from '../vendor/three.module.js';
import { ConvexHull } from '../vendor/ConvexHull.js';

// points: Array<[x,y,z]> on the sphere -> Array<[i0,i1,i2]> triangles,
// CCW viewed from outside.
export function sphericalDelaunay(points) {
  const vecs = points.map((p) => new Vector3(p[0], p[1], p[2]));
  const index = new Map();
  vecs.forEach((v, i) => index.set(v, i));

  const hull = new ConvexHull().setFromPoints(vecs);

  const tris = [];
  for (const face of hull.faces) {
    const tri = [];
    let edge = face.edge;
    do {
      const vi = index.get(edge.head().point);
      if (vi === undefined) throw new Error('hull produced an unknown vertex');
      tri.push(vi);
      edge = edge.next;
    } while (edge !== face.edge);
    if (tri.length !== 3) throw new Error(`non-triangular hull face (${tri.length} verts)`);
    tris.push(tri);
  }
  return tris;
}
