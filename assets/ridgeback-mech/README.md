# MX-06 Ridgeback / Six-legged mech prototype

Original game-oriented model based on the user-supplied military exploration mech concept. Exactly six articulated hydraulic legs (three per side), with three hardened spike claws per foot; one rotary minigun, one laser cannon and two six-tube missile pods. Sand/graphite vertex-color armor, protected hose segments, layered panels, joint guards, reconnaissance optics and restrained amber details. No reference image or external texture is embedded. This is a geometric prototype, not a photoreal texture reproduction.

## Authoritative package and coordinates

`assets/ridgeback-mech/` contains 12 plain source-of-truth GLBs and 12 optional derived Meshopt copies. Each is self-contained. Metres, +Y up, +Z forward, ground-centred `MX06_ROOT`, 8 × 8 m reserved plot. Root, articulated node names and sockets match across all damage states and tiers. Socket rest coordinates match across tiers within a damage state; the D3 collapsed pose deliberately lowers body-mounted sockets. Exact bounds, hashes, sockets, clip names, durations and collider notes are in `manifest.json`.

LOD0 is the detailed close-shot/recording master; LOD1 retains the complete walking and weapon rig. LOD2 is one static mesh and one material, parked in the appropriate damage pose, with named lookup objects retained. It has no clips and must not be animated. Initial load may use LOD2, approaching at 140 m with 20 m hysteresis (provisional); keep LOD1 while moving or seen closely. Damage and LOD are separate axes.

## Damage states

| State | Geometry and appearance | Capability |
| --- | --- | --- |
| D0 | LOD0 | 20,004 | 38 | 1,363,788 | 239,784 |
| D0 | LOD1 | 8,016 | 38 | 862,912 | 168,564 |
| D0 | LOD2 | 2,936 | 1 | 201,112 | 75,164 |
| D1 | LOD0 | 20,004 | 38 | 1,364,552 | 318,240 |
| D1 | LOD1 | 8,016 | 38 | 863,708 | 208,200 |
| D1 | LOD2 | 2,936 | 1 | 201,112 | 95,900 |
| D2 | LOD0 | 20,096 | 38 | 1,369,676 | 329,308 |
| D2 | LOD1 | 8,076 | 38 | 867,480 | 215,032 |
| D2 | LOD2 | 2,980 | 1 | 204,040 | 97,896 |
| D3 | LOD0 | 19,932 | 38 | 974,668 | 191,892 |
| D3 | LOD1 | 8,020 | 38 | 481,172 | 117,500 |
| D3 | LOD2 | 2,924 | 1 | 199,788 | 75,996 |

Game tiers are under the 25k articulated-unit triangle target. Their 38 independently animated meshes and animated plain export sizes listed above are reported explicitly; they do not meet the separate landmark 10-draw/400 KB reference. Distance tiers meet 3k triangles, one draw and 250 KB. The game can apply its own release-time gltfpack compression to the plain sources.

## Viewer and validation

Open `/ridgeback-mech/`. Select D0–D3, detailed/game/distance, plain or Meshopt, procedural walk/exported clip/park, pause or scrub, weapon bearing/elevation, rotary barrel preview, 18 claw-contact markers, wireframe and three camera views. D3 and LOD2 disable animation/aiming controls. Downloads match the selected state/tier/encoding.

`validation-report.json` records 24 validated exports, zero glTF errors/warnings (compressed copies validated after decoding), unique dot-free node names, node/socket tier parity, measured geometry/bytes/hashes, nondegenerate triangles, 1,296 procedural pose samples and 384 decoded clip samples. At least three feet stay planted; all spike tips remain level and fixed during stance when root motion is applied. Maximum sampled clip foot error versus procedural IK: 1.30 mm. D3 ignores motion commands.

Build: `node tools/asset-pipeline/build-ridgeback-mech.mjs`.
Validate: `node tools/asset-pipeline/validate-ridgeback-mech.mjs`.
Render: Blender `--background --python tools/blender/render_ridgeback_mech.py`; optionally `-- --damage 1`, `2`, or `3`.

`source/blender/ridgeback-mech.blend` is a derived editable parked review assembly. Detailed GLBs retain the walk clips for animation/recording. The preview and D1–D3 images are renders of actual exported geometry. Generator: `tools/asset-pipeline/ridgeback-mech-shape.mjs`.

Hand-off: the repository commit containing this README plus folder `assets/ridgeback-mech/`; use manifest SHA-256 values for lock files. Credit: **Models by jelaludo**. Original rovers, sentries and extractor assets are preserved.

## Outboard missile pods and gunship airdrop / 22 October 2026

Both pods are moved to ±1.18 m outboard, raised and set farther aft, with braced supports. Each pod has 30° local outward yaw under the shared `MISSILE_ELEVATION` frame, whose nominal elevation is 33.2°. Combined muzzle directions are approximately 34.6° outward bearing and 28.3° elevation; consult socket transforms for exact launch directions. Newly named `MISSILE_OUTBOARD_L/R` groups retain pod mesh and muzzle names. Conservative pod/gun bounding boxes and forward missile rays pass 650 sampled healthy aiming combinations across LOD0/1. This is not full projectile/terrain certification.

`Airdrop_Land` is a seven-second one-shot in D0–D2, LOD0/1. Play once and clamp at the last frame. It animates vertical `DROP_ROOT` displacement, `MECH_BODY` compression and the leg/hydraulic rig; it does not bake weapon aiming. The outer `MX06_ROOT` stays at the landing site. Do not add a second copy of the vertical drop translation in the game. The clip ends in the normal parked pose so walking can take over without a pose snap.

| Time | Event |
| --- | --- |
| 0–0.6 s | Suspended under KORP; root 6 m above landing site, legs tucked |
| 0.6 s | Sling release |
| 1.6 s | Underside braking burn begins; legs deploy |
| 2.6 s | Feet touch down with 2 m/s downward hull speed; dust impulse |
| 2.82 s | Maximum 0.64 m hull/suspension compression |
| 3.37 s | Small rebound crest, followed by damped settling |
| 7 s | Parked and ready; playback stops |

The trajectory is authored cinematic motion, not a gravity/force simulation. `applyAirdrop(root,time,{damage})` reproduces it procedurally; use it OR the GLB clip. `dropState(time)` supplies deterministic jet intensity, height, compression and event timing for the game's effects. Call `solveHydraulics` after mixer updates. Airdrop is unavailable for D3 and static LOD2.

The underbody `SOCKET_BRAKE_JET` emits along local -Y. Four `SOCKET_AIRDROP_{L/R}_{FRONT/REAR}` anchors support release effects. The socket and modeled nozzle are in every state/tier. The viewer reuses the unmodified, full-scale `assets/korp/korp_d0_lod1.glb` as a separate carrier with a preview sling rack/cables. `ridgeback-mech/airdrop-fx.js` contains the bounded, deterministic braking plume and 36 dust particles; carrier, cables, dust and camera movement are not embedded in the mech GLBs. The cinematic framing can be disabled. Release/Brake/Impact/Settled buttons scrub to review poses; Replay/reset restarts the one-shot.

`airdrop-validation-report.json`: 5,052 decoded procedural deployment poses, 1,692 decoded landing-clip samples, maximum foot interpolation error 1.95 mm, minimum piston overlap 0.1377 m, planted feet and no below-ground claw samples. Both export encodings pass. Run `node tools/asset-pipeline/test-ridgeback-airdrop.mjs`. Original KORP assets are unchanged.
