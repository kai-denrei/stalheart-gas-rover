# Dome entrances: clearance fix for the asset team

Ready-to-send handoff — recipient/channel not supplied yet.

The rover lab reproduces the entrance overlap with the Dome City / Colony assets pinned at `7466a4a15ecd6b520dc405316cbeaa58a4e211a2`.

## Reproduction

1. Load a habitat D0 LOD1 and connect its N port to a long bridge. Hide `PORT_CAP_N`.
2. Look towards the doorway from dome-local `(7,14,23)`, targeting `(0,9.9,12)`. Try an opaque shell as in the supplied screenshot, then the exported transparent shell.
3. The cap disappears, but shell/body triangles still intersect the corridor. The cap is only 3.8 m wide (±1.9 m); the bridge envelope is approximately 4.4 m wide (±2.2 m).
4. In the original habitat `BODY`, a downward ray at local `(0,20,10)` hits two faces at exactly `y=7.900000095`: the radial walkway and inner floor overlap. The duplicate coplanar surfaces cause the shimmer seen through the doorway. Boolean-union those floors before export.
5. Switch to LOD2: the cap is merged into `BODY`, so hiding a named cap cannot open it. On the spherical placement, overlapping bridge/dome floor faces also produce a noisy seam.

## Geometry changes to reproduce our fix

Metres, +Y up. Preserve the existing E/W/N/S sockets: radius 14 m, y=9.7 m. Preserve all sentry mount pivots and sockets.

- Subtract a real passage from **both `SHELL` and `BODY`**, in addition to hiding the connected cap. For N, our box is `x=[-2.3,2.3], y=[7.95,11.85], z=[7,16]`. Rotate it by 90° increments for E/S/W. This gives a 4.6 m clear width with margin around the bridge.
- Split triangles at the passage boundary; do not simply discard every intersecting triangle. Interpolate normals/UVs/vertex colors. Only open ports that have a connection.
- Apply the same cut to LOD2's merged `BODY`. Prefer separately addressable caps/door infills in future exports, or export connected-port variants; distant closed doors must not reappear.
- Trim the bridge's above-deck geometry to its socket planes `x=±26 m` for `y≥7.48 m`. Retain the supports below this height. The authored body extends beyond those socket planes and otherwise overlaps the dome floor.
- Union the radial walkway with the inner walking floor at y=7.9 m. Keep one surface per point, rather than two coincident overlapping triangles. Our `unionWalkingFloor` splits and subtracts overlaps while preserving colors and normals, at both LODs.
- Add a small threshold over the junction: 4.5 m wide × 1.7 m long × 0.08 m thick, centered at radius 14.2 m, y=7.95 m (top 7.99 m), along the selected port. This masks the meeting of the two differently tilted floors on the spherical host. Longer/steeper connections should use a hinged or fitted collar, rather than assume both socket frames have the same up vector.

The local reference implementation is `src/dome-ports.js` (`subtractBox`, `passageBox`, `openDomePort`) and the bridge/threshold placement in `src/race-city.js`. Original pinned GLBs are unchanged: each affected runtime mesh gets its own trimmed geometry, so unconnected instances keep their doors.

## Acceptance

- Open portal stays clear in all four directions and both game/distance tiers; disconnected ports stay closed.
- No shell wedge, cap, or wall crosses the 4.4 m bridge envelope. No overlapping floor shimmer when orbiting the junction.
- Keep the 7.9 m walking floor and 7.5 m underside contract; no change to the sentry cradle or tower animation hierarchy.
- Inspect a flat socket match and a spherical match (lab planet radius 753.325 m, dome spacing about 100 m), from outside and inside.
- Regression check: the local passage ray test retains the adjacent wall, clears the middle of the opening, and keeps interpolated normals finite.

Review image: `artifacts/dome-entrance-fixed.png`. Local test: `npm test` and `npm run test:combat`.
