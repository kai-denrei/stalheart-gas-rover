# XB-12 / Terrain Scout

Separate four-wheel D0–D3 damage prototype based on the R-47X visual language. The original R-47X model, generator, exports and runtime are unchanged. XB-12 uses its own source, namespaced root, exports, viewer and articulation adapter.

## Design and controls

Four independent lateral swing arms with chassis-fixed upper damper mounts and sliding piston rods. Wheel steering and spin are separate transforms. The sensor sphere is a truncated octahedron with eight hexagonal faces and six square faces: four lower radar panels, two upper-front camera apertures and an upper-rear lidar aperture, all integrated into hexagonal faces without round lenses or a top cap. Its yaw and pitch are independent of the chassis. The sensors are visual representations; this prototype does not simulate sensing.

Open `/xb12/` for a D0–D3 damage selector, play/pause, a four-second timeline, articulation/landing/manual modes, common compression plus four independent offsets, ±30° front steering, sensor yaw, wireframe, damper mount markers, three camera views, LOD and plain/Meshopt selection. The floor is lowered in the suspension test stand to show full droop. Wheel contact, vehicle forces and driving are not simulated.

## Measured exports

| State | Tier | Triangles | Mesh draws | Plain bytes | Derived Meshopt bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| D0 | LOD0 | 10,684 | 19 | 604,004 | 126,520 |
| D0 | LOD1 | 5,948 | 19 | 369,196 | 87,472 |
| D0 | LOD2 | 2,348 | 1 | 134,096 | 44,580 |
| D1 | LOD0 | 10,684 | 19 | 604,672 | 233,492 |
| D1 | LOD1 | 5,948 | 19 | 369,624 | 153,848 |
| D1 | LOD2 | 2,348 | 1 | 134,100 | 57,532 |
| D2 | LOD0 | 10,444 | 19 | 586,056 | 228,572 |
| D2 | LOD1 | 5,756 | 19 | 354,800 | 149,872 |
| D2 | LOD2 | 2,300 | 1 | 130,412 | 56,728 |
| D3 | LOD0 | 7,868 | 19 | 430,708 | 96,252 |
| D3 | LOD1 | 4,556 | 19 | 268,272 | 70,436 |
| D3 | LOD2 | 2,204 | 1 | 123,164 | 45,464 |

Each tier uses one shared vertex-color material. Counts describe asset mesh submissions, excluding viewer ground, overlays and lighting. No FPS claim. LOD1 is under the collaboration contract's 25k-triangle unit target. LOD2 is an optional static map/loading representation, not an animated gameplay replacement. Use LOD1 before motion is readable; no automatic distance threshold has been certified. LOD0 adds armor fasteners, wheel bolts, denser split tread blocks, protective rails, antennas, vents and higher radial detail for close views. The revised muted olive-gray body uses connected armored wheel shoulders, layered maintenance panels, guarded lamps and recovery fittings.

## Runtime contract

Metres, +Y up, +Z forward, root at the ground-centred plot origin; reserve a 4 × 5 m plot. `-X` is left and `+X` right in rover coordinates. Nominal hubs are X ±1.20 m, Y 0.50 m, Z ±1.475 m. Swing arms are 0.70 m long. Positive compression moves the hub upward: range −0.12 to +0.14 m. This intentionally uses an explicit compression sign rather than the R-47X's old travel sign. Steering is parallel front-wheel steering, not an Ackermann solver.

Import `applyXB12` from `runtime.js` and call it with the loaded scene and `{compression:{FL,FR,RL,RR}, steerDeg, spinRad, sensorYaw, sensorPitch}`. Compression is in metres, steering in degrees, the other angles in radians. In D0/D1, sensor pitch clamps to ±0.25 rad. Damage modifiers below apply in D2/D3. The game should supply solved physics state; `demoPose(time, mode, bias)` is an art-directed preview helper. Do not stack its oscillations on game physics. Pass finite numeric inputs. The loaded scene must carry `userData.static=true` for LOD2, as the viewer does using the manifest.

Per-wheel hierarchy: `SUSP_PIVOT_*` → `UPRIGHT_*` → `WHEEL_STEER_*` → `WHEEL_SPIN_*` → `WHEEL_*`. The upright inherits swing-arm camber; it is not a double-wishbone or compensated upright. `SOCKET_DAMPER_UPPER_*` stays chassis-fixed, `SOCKET_DAMPER_LOWER_*` follows the arm, `DAMPER_AIM_*` aims at it and `DAMPER_ROD_*` slides to the lower endpoint. Barrel and rod are each 0.44 m long. Sampled damper lengths are 0.605–0.762 m, retaining at least 0.118 m overlap. Engine-facing names and socket positions match across tiers of each damage state. Sentry and payload sockets also match across all states. The authored D2 sensor tilt and D3 locked suspension/sensor pose intentionally move their driven sockets; pivot translations and hierarchy remain stable. LOD2 names are lookup-only: its mesh cannot articulate.

`SENSOR_YAW`, `SENSOR_PITCH`, `SOCKET_CAMERA_L/R`, four `SOCKET_RADAR_*`, `SOCKET_LIDAR` and `SOCKET_PAYLOAD` provide integration points. Socket positions and parents are recorded in `manifest.json`. This revision relocates camera and lidar sockets into the hexagonal faces; radar sockets also follow the revised flush faces. Socket names are preserved, but consumers must refresh their pinned manifest. The elongated revision moves the sensor assembly to [0, 1.84, −1.15] m and the payload socket to [0, 1.52, 0] m. Wheel stations and both damper mounts move to Z ±1.475 m; local arm dimensions, travel and axes are unchanged. No production clips are baked (`clips: []`); the preview articulation and landing cycles each last four seconds.

## Sources and validation

- Procedural authoring source: `tools/asset-pipeline/xb12-shape.mjs`.
- Build: `node tools/asset-pipeline/build-xb12.mjs`.
- Validate: `node tools/asset-pipeline/validate-xb12.mjs`.
- Editable derived Blender review assembly: `source/blender/xb12.blend`; regenerate with `tools/blender/render_xb12.py`. This includes review lights, camera and ground, and is not the source of truth.
- Plain GLBs are source-of-truth exports. `derived/meshopt/` files are optional compressed derivatives. Game release compression remains game-owned.

The validation report covers all 12 plain and 12 decoded Meshopt files, zero glTF errors/warnings, no degenerate triangles, hashes, triangle/draw counts, stable dot-free names, socket parity, and 240 sampled travel/steering poses across articulated exports. Samples check finite transforms, positive-compression hub movement, upper/lower attachment and piston overlap. Desktop Safari checks cover visible animation, pause, camera views, export/tier selection, D0→D3→D2 switching, disabled wreck controls and preserved Rotor T2 selection with normal materials restored after leaving D3. The Blender preview was visually inspected.

Pending: continuous tire/fender/chassis clearance certification, game physics/contact and independent wheel speeds, full radar/lidar coverage assessment, localized damage, mobile/game-camera profiling and consuming-game acceptance. D0–D3 are whole-rover states; do not inherit R-47X localized damage mappings. This is an animated design prototype, not a claim of production physics readiness.

Hand-off: use the commit containing this folder together with `assets/xb12/`; pin that commit and the hashes in `manifest.json`. Credit: Models by jelaludo.

The original XB-12 prototype is preserved in commit `64f1612eaa1d444dab0638c8d287c112f66d6f1d`. The rugged revision follows the two user-supplied R-47X orthographic references for visual character, not their inconsistent dimension annotations.

Hull profile: 25% longer along Z than the prior revision. The longitudinal upper ridge is Y 1.48 m at Z 0 and the underside rises to Y 0.88 m at the centre, falling toward Y 0.52 m at the ends. The belly uses a concave extruded profile, not a convex hull that fills the notch. Deck slopes are approximately 13.5° after lengthening. Earlier shape preserved at commit `13fafb4`.

## Optional front sentry

`SOCKET_SENTRY` is at [0, 1.41, 0.95] m, level, with +Y up and +Z forward. The viewer offers Empty mount and all 33 family/equipment combinations from `assets/sentries/manifest.json` (11 families × T1–T3), plus size and bearing. The chosen sentry follows the selected LOD and encoding. These are separate attached assets; the rover GLBs and rover download retain an empty mount, and the original sentry files are unchanged.

`equipment.js` computes uniform placement relative to the rover using canonical sentry bounds: maximum width 1.10 m, height 1.25 m, overall length 2.50 m, forward reach 1.75 m, and at most 70% original scale. The support plate is 1.12 × 1.40 m; barrels deliberately overhang it. Railgun T3 now uses 56.5% original scale (previously 10.6%). Size adjusts from 60–100% of that fitted maximum. Raise by `yOffset` so the base sits on the socket. Parent the attachment to the socket; preserve its internal pivots. Bearing rotates the entire attachment. The larger barrel sweep is not constrained to the support plate, so rear-facing or elevated configurations require collision review before gameplay use. Attachments add their own triangles/draws; the viewer reports these separately from rover metrics. Static LOD2 loads the sentry’s static tier; mounting choices and bearing are configuration controls, not baked animation.

`node tools/asset-pipeline/test-xb12-equipment.mjs` checks actual vertices from all 33 game-tier GLBs at both size limits for seating, width, forward reach, length and height. Results are in `equipment-validation.json`. This does not certify weapon elevation, recoil, firing or animated mobile-sentry motion; those are not driven in this viewer. Desktop Safari verified selection and loading of Railgun T3.

## Damage states and runtime behavior

| State | Visible damage | Movement |
| --- | --- | --- |
| D0 / Intact | Original armor, tires and hexagonal sensor panels | Full drive, ±30° front steering, full suspension and sensor range |
| D1 / Battered | Dented/scuffed armor, minor rim and arm distortion | Full capability |
| D2 / Component damage | Folded shoulders, buckled FL/RR arms and piston rods, crushed tire profiles with missing tread blocks, deformed sensor housing | FL/RR spin and travel at 40%; front-left steering limited to ±15°; other stations remain fully functional. Sensor yaw limited to ±60° with a 0.12 rad pitch offset |
| D3 / Disabled wreck | Deeply folded armor, stripped lamps/trim/rails and shoulder cover panels, crushed wheels with missing treads, heavily scorched surfaces, compressed sensor housing and drooped head | All wheel travel locked to −0.08 m; spin and steering disabled. Sensor yaw fixed at zero and pitch at 0.65 rad. Sentry offline |

Damage is authored geometry, not just a tint. The viewer loads the selected state and tier and retains the selected front sentry, size and bearing settings. In D3 it disables the bearing control, parks the sentry at zero bearing and dims its materials with emissive output off. The sentry remains a separate original D0 attachment; no weapon-specific damage mesh is claimed. Returning to D0–D2 loads its normal materials again.

`applyXB12` reads `XB12_ROOT.userData.damage_level`; do not replace this with a scene-level field or run the intact pose adapter over the damaged rig. `damagePolicy(damage, wheelId)` exposes the wheel capability modifiers. The game must enforce disabled firing/drive; the viewer does not implement combat. Static LOD2 bakes the selected damage posture into its single mesh. No engine-driven pivots are baked into clips.

Validation additionally checks damaged-wheel travel/spin reduction, sensor range limits, exact D3 pose invariance under opposing drive commands and fixed payload/sentry socket parity across damage levels. Rendered previews: `damage-d1.png`, `damage-d2.png`, `damage-d3.png`. Regenerate one with Blender using `tools/blender/render_xb12.py -- --damage 2` (choose 1–3); the D0 editable Blender assembly remains the nominal review scene. The procedural source and per-state GLBs author all damaged states. Earlier intact revision is preserved at `02eed85`.
