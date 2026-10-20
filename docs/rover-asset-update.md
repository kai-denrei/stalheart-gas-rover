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


## XB-12 and R-47X-S fleet integration — 2026-10-20

Imported from `jelaludo/SentryTowers_A6` revision `94e33c6db18ff37267c8cd9fda50644fdd443146`. Both families' D0–D3 plain LOD1 GLBs, manifests, README and runtime helpers are local, unmodified and SHA-256 pinned in `assets.lock.json`. Models by **jelaludo** — https://jelaludo.github.io/SentryTowers_A6/ . The original R-47X remains available.

Races default to R-47X-S / XB-12 / R-47X / XB-12 / R-47X-S. **Lab settings → Starting lineup** offers all three, the two new types, R-47X-S only, and original-only for comparison. **Your rover** selects a member of that fleet. Changing either restarts the session; query parameters make the selection shareable (`fleet=mixed|new|r47xs|original`, `rover=r47x|r47xs|xb12`). The proving ground retains its original default but permits any model. Only selected families' damage banks load; XB-12 additionally needs the original D0 propulsion kit when R-47X is absent.

R-47X-S retains six independently steered/spinning wheel joints, localized damage, eight gimbaled nozzles, sensor scan, FDAI and three diegetic gauges. Swing arms respond to actual terrain/support clearance. A cached implementation of the supplied endpoint solver aims each damper between its chassis/arm sockets and slides its piston without changing diameter. D2 arms have reduced travel; D3 locks them. Removed wheel covers are not restored; gauges sit on the inner chassis instead.

XB-12 has four physical wheel contacts at its authored ±1.20 m track half-width and ±1.475 m wheelbase half-length, 0.50 m wheel radius, 0.70 m swing arms, ±30° steering and independently integrated wheel spin. The two unused middle slots remain only for stable six-slot interpolation/damage bookkeeping and never contact terrain or solids. Collision probes, enemy contacts, bounds checks and tyre trails use its actual stations. Podium containment includes its wider outer wheels. Overall chassis dynamics remain the lab's simplified rover simulation, not a new full tire/spring solver.

XB-12 has no authored thrusters or telemetry screens. The lab mounts the existing eight-nozzle R-47X cold-gas kit, reaction ports and three chassis gauges. The optional sentry socket remains empty. XB-12 damage exports are whole-rover variants, so damage swaps the complete matching geometry bank in place while retaining paint, pivots and added equipment. Visible stage uses the worst damaged system capped at D2 until the chassis is wrecked; D3 disables drive/steer. D2 applies the delivered front-left/rear-right degradation. R-47X-S continues to use its 19-zone geometry mapping, including damaged damper barrels/rods. No per-zone XB-12 meshes are claimed.

### Matched rendering comparison

Desktop headless Chrome, 1439 × 901 CSS pixels at 1.75 DPR (2518 × 1576 render target). Same camera and all five rovers visible in the complete Last Leap starting environment. Simulation paused to isolate fleet rendering; all rig update paths still run. Six seconds of warm-up followed by five samples, repeated in reverse order. These measurements do not characterize every combat/explosion scene or mobile hardware.

| Fleet | FPS | Render CPU | GPU | Scene draws |
| --- | ---: | ---: | ---: | ---: |
| Original R-47X only | 60.0 | 3.54 ms | 4.53 ms | 518 |
| All three types | 60.0 | 3.56 ms | 4.52 ms | 542 |
| Two new types | 60.0 | 3.53 ms | 4.43 ms | 554 |
| R-47X-S only | 60.0 | 3.38 ms | 4.32 ms | 578 |

All configurations stayed within the same 16.67 ms frame interval (P95 ~16.75–16.76 ms). Differences this small are not a reliable speed ranking. Keep all three by default; fewer model types do not inherently reduce draw calls, and the six articulated dampers give R-47X-S more submissions than XB-12. Detailed measurements: `docs/fleet-performance.json`; repeat with `npm run profile:fleet`.

Validation includes physics coverage for real four-wheel traction/no phantom middle contacts and damage disable/repair; browser checks exercise driving, steering, wheel spin, independent compression, damper endpoint attachment, gas/plumes, all four damage geometries and recovery on each model. Run `npm run test:fleet`.


The mixed fleet completed both rendered obstacle courses and physically claimed all three podiums. Testing exposed the old corner-exit line running through an already-cleared flagpole; the AI now steers around cleared pole hardware without bypassing the next mandatory gate. This also removes the repeated recovery loop previously seen in the Great Divide. Automatic ISAO handoff and permanent rocket-pad/celebration checks pass on both courses. Final validation: 199 unit tests, 255 pinned asset hashes, module resolution and production build, per-family rig/damage browser checks and the existing damage regression.
