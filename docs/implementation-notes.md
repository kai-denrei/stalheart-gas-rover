# Rover lab — implementation record

2026-10-18. This is the first playable standalone implementation of the agreed lab. The main Stalheart checkout is not modified. Enjoyment, difficulty, camera preference, and final tuning require the owner's playtest.

## Implemented

- A local Three r160 browser host, the real R-47X LOD1 GLB, and the pinned Stalheart organic sphere lattice at approximately 753 m radius. A derived binary stores the original relaxed vertices and quad topology; the lab authors its own open proving ground and obstacles rather than running the story's dungeon/campaign.
- Four independently sized sinkholes, four refill/checkpoint pads, scattered physical rock blocks, a runway, and a recovery bowl. Sinkholes reuse the original rim/bowl functions, stone maps, opening ability, rubble, cracks, and quake sample. Each floor cut has its own radius and tangent frame.
- Fixed-step rigid chassis motion at 120 Hz: radial gravity, quaternion orientation, world angular velocity, six wheel support probes, eight chassis contact probes, and iterated collision impulses against terrain and rock boxes. Contact-derived suspension motion uses the six authored wheel pivots; front steering and individual axle spin are driven by simulation state. No canned jump animation drives position.
- Physical thrust allocation, pitch/roll/yaw commands, three assistance modes, and per-nozzle plumes from actual allocated forces. Synthesized burst/drive/landing audio supplements the imported sinkhole quake.
- Shared finite gas; unlimited refill with a latched first nominal-exhaustion time/location; assisted stabilization cost; settled pad refill/checkpoints; recovery on a deep fall, accumulated chassis destruction, or operator command. Hard impacts leave persistent damage.
- Chase, orbit, overhead, and mast cameras; keyboard input; pause/focus-loss handling; chassis-mounted thrust/speed/gas displays; FPS and CPU/GPU telemetry; lab sliders and diagnostics; opening replay and restore defaults.

## Onboard displays, sky, and performance follow-up

The rear wheel-cover plates follow the GLB’s actual sloped surfaces and remain attached to `ROVER_CHASSIS_JUMP`: cyan eight-nozzle vertical bars on screen-right from behind, orange tangential speed on the left, and a horizontal nominal-reserve meter on the rear panel. Static label/digit textures and shader uniforms avoid uploading a new canvas texture each frame. Unlimited mode still shows the nominal reserve, with a cyan marker on the rear display.

The black hole, Veil/Bloom nebulae, and seeded stars/galaxies reuse four unchanged Stalheart modules copied at revision `2d1d64395d047a40faf0e9d36467dc2a3bd0e7af`. Their individual hashes and source revision are recorded in the asset lock. The lab adapter scales sky distances to its metre-sized planet and aims the black hole beside the first crossing, retaining the source’s low horizon elevation. Shader stills and the galaxy cube are baked during loading; no sky ray marching runs in the driving loop.

A measured bug caused a canvas resize every frame at fractional Retina dimensions: Three floors physical pixel sizes, while the old comparison rounded. At 1439 × 901 CSS pixels and 1.75× rendering, the original recorded **301 resizes over five seconds**. Caching logical dimensions and DPR reduced this to **one initial resize** in the same-sized run. The browser regression also verifies that ten subsequent renders cause zero resizes. DOM telemetry now refreshes at 20 Hz; the rover displays continue updating every frame.

The five-second headless runs held about 60 FPS both before and after, so this is evidence of eliminated work, not proof that all owner-observed lag is resolved. The updated Retina run reported about 0.12 ms simulation CPU, 0.86 ms draw CPU, and 2.82 ms GPU time in its final rolling window. Machine/browser load and compositor behavior affect these readings. Raw reports: `artifacts/perf-before.json` and `artifacts/perf-after.json`.

The visible counter averages up to 120 frames, reports P95 frame interval and renderer draw calls, and samples GPU timing through asynchronous disjoint timer queries when supported. CPU and GPU durations overlap and should not be added. Frames over 250 ms reset the averaging window to exclude tab suspension; ordinary slower frames remain included. Diagnostics also show long tasks and canvas resize counts. Render resolution offers 1.75×, 1.25×, or 1× caps without changing simulation rate. The main Stalheart checkout remains clean and untouched.

## Thruster and contact decisions

The updated rover at revision `9c3ec9d28947541a43121891e41355a1c7512a96` has eight independent two-axis gimbals. The allocator now respects each delivered pitch/roll limit and fixed nozzle cant, replacing the first version’s assumed 85-degree cone. The visible nozzles and socket-emitted mist follow those same allocated force directions. Moments use the gimbal pivots relative to the centre of mass; moving exits lie on the same force lines. This tighter hardware range adds upward force during some lateral corrections, so landing timing differs from v1. The browser crossing now uses the same three-second coast as the simulation crossing test.

A bounded projected-gradient allocator approximately matches requested body force and moment. Forces below the centre of mass and uneven socket spacing couple translation to rotation; stabilization counters through the same gas-funded actuators. Saturation can reduce requested translation or prevent perfect leveling at full power. There are no hidden downward jets, free reaction wheels, or render-only orientation corrections.

The assumed centre of mass is root + 0.44 m. Wheel contacts now use the delivered hub x/z positions and 0.48 m wheel radius, with the model aligned to those contacts. Inertia is specified per unit mass. All mass properties, force limits, and gas units are gameplay tuning, not engineering measurements of the model. Assistance uses quaternion-derived local-up error and angular-rate feedback. Airborne translation commands are body-relative; the chase camera maintains the local horizon.

Contacts are a lightweight custom solver rather than a complete tire/suspension simulator. Wheel and hull samples use the same spherical bowl sampler as the visible surface; the throat returns no contact, rather than interpreting the original deep sentinel as a floor. Authored barriers, pad beacons, settled sinkhole boulders and rim rubble have solid convex contacts; see the collision follow-up below. Probe coverage and the fixed timestep are appropriate to current lab speeds; high-speed grazing, inverted contacts, and severe impact behavior remain areas for playtesting. Six individual wheels spin from hub velocity in simulation time. Front steering follows input with an Ackermann visual offset, while the existing ground turn controller remains a simplified chassis model rather than a tire-force simulation. Suspension uses the sampled surface and authored pivot limits; it does not simulate individual springs.

## Gas and input semantics

The reservoir is a normalized gas budget. Every nozzle's actual force magnitude contributes to cost, including stabilization. Unlimited mode removes the supply limit but continues normal-reserve accounting. The first exhaustion marker remains until a valid pad refill/reset. Turning unlimited off exposes the remaining nominal budget; zero means no thrust. Ground driving can continue without gas.

Pads require low speed, modest tilt, ground support, and 1.2 seconds inside the pad to refill. A reset clears velocity, spin, input, gas expenditure, and the exhaustion marker. Changing sinkhole scale or replaying the opening returns the rover to its checkpoint. Restoring defaults also resets experiment tuning. These are explicit lab operations, not campaign rules.

Ground steering and airborne lateral jets switch using a short wheel-support grace period. Holding lift immediately requests flight thrust. On keyboard focus loss the lab pauses and clears held keys. Mouse/GUI operations never mutate the physics pose; camera switching does not change the simulation. Settings are session-local and reload to the same defaults.

## Reuse and provenance

The actual imported bytes and hashes are in [assets.lock.json](assets.lock.json).

- Stalheart source snapshot: `9b253a412ccbf885d573adb2d6436f2fc055cb93`. Original planet/kernel and sinkhole provenance records are preserved under `upstream/stalheart/docs/`.
- The local copy of `src/sinkhole.js` removes campaign content/audio/creature imports, injects lab audio, and requires `game: true`. The underlying opening/effect kit, surface wrapping, shape functions, and source textures remain reused. The lab supplies its own palette. Soft particles stay disabled under the source kit's no-depth-buffer behavior; cracks, moving fragments, bowl/rubble, and audio remain active.
- The original single-hole boss wrapper and game wrapper's shared radius uniform are not used. The lab patches all visible floor/grid materials using independent hole frames and radii, and samples those same states for contact.
- R-47X source revision: `9c3ec9d28947541a43121891e41355a1c7512a96`. LOD1 is 5,120 triangles, 26 source draw calls, 384,984 bytes, SHA-256 `a6746318daa2fedb424aec781dfad6351d30afdaab1669c322398121266a03e4`. The delivered helper, puff texture, README and manifest are pinned alongside the model. See [asset update notes](rover-asset-update.md).
- Models by **jelaludo** — https://jelaludo.github.io/SentryTowers_A6/. [Model reuse notice](../assets/recon-rover/LICENSE.md) permits reuse/modification with credit. The damage family below supersedes the intact-only rover at runtime.
- Three.js r160 retains its MIT header. The sinkhole ability kit's inherited upstream is `achrefelouafi/LinearAbiltyCastingExtendedThreeJS`, revision `364c9ce70ba784809291e87981ca83a19560f73d`; its provenance and Stalheart's adaptations are preserved in the copied lock and [attributions](../upstream/stalheart/ATTRIBUTIONS.md). Stone maps are ambientCG Rock030 (CC0). The quake sample is the existing owner-provided Stalheart audio, with its copied provenance record.

## Validation and next playtest

Completed locally: 32 simulation/motion/collision tests passed; 62 pinned files verified and 70 modules parsed/resolved; 31 browser acceptance checks passed with no runtime or shader errors. Browser evidence is in `artifacts/browser-report.json` and its adjacent PNGs. These are functional checks, not owner approval of the feel or a device-performance claim.

`npm test` covers gravity/frame transforms, idle contact, driving/braking, a complete crossing, all rotation axes, actuator constraints, stabilization cost, finite/unlimited gas, refills, independent hole sampling, throat failure, bowl rescue, and fixed-step reproducibility. `npm run check` verifies local source imports and asset hashes. Browser acceptance exercises actual keyboard input, flight and landing, gas toggles, recovery, camera changes, all opening states, and repeated reset. Reports/screenshots are generated under `artifacts/`.

The first playtest should judge short-burst response, steering before takeoff, body-relative corrections, braking before touchdown, recovery from a bowl, gas pressure, and camera readability. Human approval of the fun/feel gate is still open. Surveying, enemies, caves, races, game integration, and phone controls remain outside this implementation.


## Motion timing fix — 2026-10-19

A report of steady 50 FPS with a juddering rover led to a temporal probe, rather than screenshot inspection. At a synthetic 50 Hz render cadence, the 120 Hz simulation alternates two- and three-tick updates. Rendering only the newest pose moved a near-full-speed rover approximately 0.30 m then 0.45 m per frame, while the chase camera smoothed those jumps. On a flat spherical-ground run, frame-to-frame projected rover displacement had a 3.19 CSS-pixel range (1.49 px standard deviation). The parked rover was stable, with no contact-state flipping; this test did not reproduce suspension vibration.

`src/motion.js` now retains the previous fixed-step pose and interpolates position, quaternion, velocity, wheel rotation, steering and nozzle forces at the accumulator phase. The rover rig, shadow and camera all consume that same presentation state. Physics/input/gas remain unchanged at 120 Hz. Presentation runs one physics tick (8.33 ms) behind the simulation, avoiding prediction or collision changes. Reset and explicit placement synchronize both poses; paused/harness rendering uses the current state directly.

The identical 50 Hz probe reduced projected displacement variation to 0.012 px range (0.0031 px standard deviation), with identical underlying physics motion. Reports are `artifacts/motion-before.json` and `artifacts/motion-after.json`; reproduce the current measurement with `node scripts/motion-probe.mjs`. New tests cover uniform motion at 50/60/75/144/240 FPS, read-only render sampling, and checkpoint resets without a visual return sweep. This addresses the reproduced timing defect; owner confirmation of the perceived improvement remains a playtest step. The average FPS counter may remain at 50 because the correction changes motion sampling, not the display refresh rate.


## Solid collision follow-up — 2026-10-19

The missing collision was in the reused presentation: sinkhole boulders and rim rubble previously had no physics representation. Old barrier checks also used sparse point probes that could miss thin objects between chassis corners.

The lab now bakes convex colliders from visible instanced-rock vertices after applying their instance transforms and the same spherical warp as the shader. Authored barriers use oriented boxes; pad beacons use small convex cylinders. A rounded compound rover proxy covers six wheels, the bumper/hull and sensor. Sphere/convex tests are conservative at sharp corners, with friction, impulse response and bounded penetration correction; they are not exact triangle contact. Wheel support on solid tops contributes to grounded state and suspension presentation. Terrain/throat contact still uses the original surface sampler. The camera checks these solids too.

Rock shapes are cached at load. Reopening or resizing a sinkhole removes its previous colliders immediately; once instance transforms remain unchanged across the settling checks, the new shapes are baked. Flying/opening fragments remain visual during that transient phase. Settled rocks are static obstacles, not pushable rigid bodies. Pads select a clear reset location within the checkpoint ring where available, avoiding a reset inside scattered debris.

Impacts above 1.5 m/s report location, outward normal, closing speed, collider ID, part/zone and light/moderate/heavy severity, with a 0.3 s notification debounce. They produce a short impact sound and HUD message without camera shake. Existing hard-impact/overturn reset behavior remains. These thresholds are provisional gameplay values, not engineering damage estimates. No cumulative health, broken actuator behavior or damaged mesh is implemented yet; the [asset-team damage brief](rover-damage-asset-brief.md) specifies the next D0–D3 delivery.

Validation adds thin-post and thin-wall impacts, an extreme-speed collision/reset, landing on solids, low-barrier clearance, spherical rock-transform agreement and clear checkpoint placement. Browser checks also physically drop the rover onto a rendered boulder and exercise collider removal/rebuild during opening replay. Performance samples are saved in `artifacts/perf-collisions.json`.

## Accumulated damage in driving and racing

The playable sim and all five race rovers now use the four D0–D3 LOD1 models from asset revision `7466a4a15ecd6b520dc405316cbeaa58a4e211a2`, pinned under `assets/recon-rover/damage/`. One loaded geometry bank is shared across vehicles. Geometry swaps preserve racer paint and the existing instruments. The supplied helper is adapted so one destroyed component does not replace the whole chassis with a wreck; chassis damage has its own accumulated budget. Authored floating debris and cracks at the old display positions are hidden. The standalone impact and accumulation previews remain available separately.

Impacts use incoming normal contact speed, including angular velocity. Each struck zone accumulates points only above 4 m/s; terrain wheel landings receive a 20% suspension allowance. The current dose is `min(6, ((effectiveSpeed - 3) / 6)^1.4)`, with D1/D2/D3 at 1/3/6 points. These are forgiving gameplay tuning values, not engineering estimates. Contacts have a 0.65 s cooldown per collider and zone to prevent solver iterations and settling from repeatedly charging the same impact. The principal hit also transfers smaller amounts to adjacent wheels/nozzles and the core. Terrain, solid obstacles, and rover-to-rover hits use the same damage state.

D1 is cosmetic. D2 wheels retain 60% drive, 50% grip and (at the front) 50% steering; D3 wheels lose drive and steering and retain 18% skid grip. Aggregate ground control accounts for the six wheel conditions, and asymmetric damage introduces a steady pull rather than visual vibration. Ground control remains a simplified chassis controller, not six independently simulated tyre forces. D2 nozzles have 50% thrust and 45% gimbal range; D3 nozzles produce no force. These constraints apply inside the allocator, including stabilization. Flank/rear manifold damage leaks finite gas with visible socket particles. Sensors have reduced movement at D2 and stop at D3.

Damage persists through pads and race gates. Pads refill gas only. R recovers and repairs; race recovery preserves gate progress and applies the existing three-second penalty. Core D3 disables the rover, displays the wreck for three simulation seconds, then recovers. A wreck cannot validate a gate or claim a podium. Opponents use the same rules, reduce cruising speed as steering fails, and retain their existing stuck/gas recovery policies. Kick-Flip practice keeps damage disabled.

The footer reports hull stage and remaining steering/thrust capacity; settings show drive/grip and gas-leak rates. Unit coverage includes accumulation, contact cooldowns, asymmetric handling, actual thrust/gimbal limits, leaks, safe/hard landings, visible wreck duration and race repair semantics.

Damage integration validation: 61 unit tests, 31 general browser checks, the full five-rover race through three podium claims, and dedicated driving/race damage browser checks. The race completed at 178.2 s simulated time. Its final active-render window measured approximately 60 FPS at 1440 × 913, 1× resolution (393 draws); this is one local headless run, not a device-wide performance guarantee. Dedicated damage checks confirmed repeated real barrier impacts, disabled nozzle force, visible leaks, per-racer paint, repairs, and unchanged geometry counts across repeated damage/recovery cycles. Reports: `artifacts/damage-browser-report.json`, `artifacts/race-browser-run.json`, and `artifacts/race-performance.json`.

## City race and day-42 finale (2026-10-19)

Added twelve dome modules across six roles, eleven elevated connections fitted to the spherical world, and separate solid building/support/bridge proxies. LOD1 within 90 m, LOD2 beyond 110 m, shared asset resources and no new dynamic lights/shadows. Two holes start dormant, warn on any racer's approach, then use the reused sinkhole effect's exact radius for visual cutouts and physical terrain. Race reset removes their rubble proxies.

The third podium claim starts the original day-42 disco choreography and music for 43.8 seconds. Two original LANCER T1 models aim their articulated barrels at the ball, with beams originating at MUZZLE_00. Pause, help, blur, track end and restart stop/resume the music correctly. A podium camera and modest emissive geometry provide the finish scene. The main Stalheart repository was only read; all assets are pinned local lab copies.

Validation: 65 unit tests, asset/import checks (99 pinned files), full physical AI race with three winners, 31 proving-ground browser checks, damage browser regression, and new city/audio/hazard browser acceptance passed. The occupied-podium test records aim dot products of 1 for both LANCER barrels, without runtime errors. At 1440 × 913, DPR 1 in headless desktop Chrome: grid ~60 FPS, 399 draws, 3.46 ms GPU; occupied podium ~60 FPS, 358 draws, 2.05 ms GPU. These are local samples, not a mobile benchmark. Matched-camera city visibility comparison adds 23 draws at the starting area. Reports: `artifacts/city-browser-report.json`, `artifacts/race-celebration-performance.json`, `artifacts/race-performance.json`.

## Drift, player podium regression, Stalheart gantry and light defense

Rear handbrake on Shift in driving/racing: front/rear axle forces permit genuine lateral slip, rear wheels lock, releasing Shift restores grip, and a fixed 320-segment tyre-mark pool draws the rear paths. Kick-Flip controls are preserved. Wheel sleep prevents a stationary supported rover from continually rebuilding tiny contact-bias velocities; throttle, steering, boost, lost support or outside momentum wake it.

Human-claim regression now exercises a real off-center fall onto the podium, a deliberately missing gate, then braking and ownership by player ID 0. All three tiers also have deterministic physical landing/claim tests. The original 4 m ring was too tight for the full bumper footprint after a modest landing drift. Rings are now 4.8 m and drawn from the same rule; all corners must still fit. The finish HUD explains missing gates, wrong tiers, incomplete landings, motion and footprint problems.

Finish deck is 64 × 68 m, elevated 6.5 m, at (136,264); podiums stand another 2.4 / 1.6 / 0.8 m high. Original articulated Stalheart LOD1 stands inside it, solid rails/pillars and open central space. The disco socket is attached exactly to EXTRUSION_TIP while the original celebration pose drives the arm. Both party LANCERs still target the ball. One rear city dome moved to clear the enlarged deck, leaving ten safe bridge connections.

Twelve original Rotor/LANCER T1 sentries on dome sockets have yaw/pitch aiming, actual muzzle-origin fire, terrain/building/rover occlusion, shot damage and target deaths. Three small Reed assets arrive from alternating sides every eight seconds; cap 18 including corpses. A measured 126-second run spawned 48, with 10 reaching the track vicinity, peak 10 bodies. Fixed-rate movement/targeting, interpolation, rigid batches per gun joint, an instanced Reed surface and exposed-cage distance tier keep the load modest. Gait is a lightweight shader adaptation, not the full Reed soft-body solver. Source asset copies and Reed license are retained and hashed. Heavy enemies/Gunship/SOL are deferred as requested.

Validation: 71 unit tests; 104 pinned-file hashes and module checks; full five-rover physical race and podium; real-keyboard Shift drift/release with skid marks; physical human landing/claim; active firing/kill/track-incursion checks; all existing proving-ground, city/audio, damage and Kick-Flip browser checks passed without runtime errors. Desktop headless Chrome at 1440 × 913, DPR 1: racing grid ~60 FPS, ~4.28 ms GPU, 421 draws; occupied podium ~60 FPS, ~2.29 ms GPU, 376 draws. Light-defense camera sample ~60 FPS, ~2.57 ms GPU. Reports: `artifacts/expansion-browser-report.json`, `artifacts/drift-browser-report.json`, and current race performance files. These are local desktop measurements, not a phone result.

### City combat and post-podium exploration

See [combat-expansion.md](combat-expansion.md) for controls, original Stalheart/Creature Lab source reuse, performance bounds and validation. The dome entrance exporter feedback is ready in [dome-entrance-asset-team.md](dome-entrance-asset-team.md).

### ISAO handoff, solid flags and circuit surface

See [isao-and-circuit.md](isao-and-circuit.md). Post-race exploration now controls the actual animated builder drone; every flag has physical hardware, and the road has continuous painted boundaries and corner kerbs.

### Shared firing profiles and hundreds of enemies

See [battle-expansion.md](battle-expansion.md) for the original Quiver trajectory, weapon cadence, three-strike disco salvo, adaptive crowd controls and the 640-body FPS measurements.

## Racing stunts / ISAO quadcopter update

See [stunts-and-quadcopter.md](stunts-and-quadcopter.md) for turn-and-fly drone controls, race Kick-Flips and context bonuses, the imported A6 rivalry board, round podiums, scoring rules and validation. The score system keeps stunt ranking independent of finishing order.

## Finish battery, start and contact update

See [finish-battery-and-start.md](finish-battery-and-start.md) for staggered cylindrical podiums, the 16-emplacement ground battery, five-second audiovisual start sequence, oriented rover contact solver and validation.
