# Updated R–47X integration

Imported the [3D team’s delivery](https://jelaludo.github.io/SentryTowers_A6/recon-rover/) at commit `9c3ec9d28947541a43121891e41355a1c7512a96`. The LOD1 GLB matches its manifest SHA-256. All runtime dependencies are local; the main Stalheart checkout is untouched. The previous local package is retained under `artifacts/rover-before-update/`.

## Connected in the lab

- Both front-wheel steering pivots, all six axle-spin pivots, and six suspension pivots. Steering respects ±34°; spin is integrated from actual hub velocity and freezes when paused. Suspension follows terrain within the delivered limits.
- Eight individual gimbals. The simulation now uses the delivered pitch/roll limits and fixed cants, and rendered socket directions agree with allocated forces. This replaces the original broad 85° vectoring approximation. Lateral corrections can now add more lift: expect slightly different hop/landing timing.
- The supplied cold-gas mist helper and puff texture, with 320 plume particles maximum, fixed 60 Hz emission, pause/reset behavior, and an immediate effects toggle. The flat-ground dust feature is disabled because it would intersect the lab’s spherical terrain incorrectly.
- Continuous sensor yaw and independent pitch scanning, inside the documented pitch range.
- The delivered UV display meshes, with our existing cyan vertical thrust, orange speed, and rear nominal-gas shaders. The new rear-deck FDAI-style panel shows actual attitude, angular rates, height, reserve and mast direction, refreshed at 10 Hz.

## Local adaptations / feedback

`assets/recon-rover/thruster-fx.js` is an unchanged source copy. `src/rover-fx.js` is its lab adaptation: it renders only the additional FDAI display, labels reserve as normalized gas rather than fictional PSIA, uses a 20 m height scale, and makes the particle toggle immediately hide its group. The rig disables the helper’s flat-floor clamp/dust through configuration and updates particles in simulation time.

The delivered display names put `DISPLAY_SPEED_LEFT` at negative X, which appears on the **right** from our rear chase camera. The lab binds cyan thrust there and orange speed on positive X. It also relocates/scales those small end-cap meshes into the long wheel-cover strips requested by the owner. Mesh names in the original GLB are unchanged. These are lab adapter choices, not edits to the asset source.

The suspension demo’s stated swing sign does not match the child hub’s signed X offset. The lab computes the geometric sign from that offset so positive compression actually raises each hub. Ground turning/contact remain a simplified chassis solver; this update does not introduce a full tire or spring simulation.

## Validation

18 simulation tests and 27 browser checks pass, including all eight socket/force alignments, steering/spin, bounded mist, pause/toggle behavior, gas exhaustion, crossing/landing, and bowl recovery. All WebGL programs compile. Asset checks verify 62 pinned files and parse/resolve 67 modules.

At 1439 × 901 CSS pixels and 1.75× rendering, the headless Chrome sample held about **60 FPS** at idle, during boost with mist, and during boost without mist. The boost samples measured approximately **1.55 / 1.42 ms draw CPU** and **5.15 / 5.08 ms GPU**, respectively. These short runs are diagnostic observations, not a promise for other hardware or proof of an isolated performance difference. See `artifacts/perf-new-rover.json`; reproduce with `node scripts/profile-rover.mjs` against the running server.
