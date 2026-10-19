# R-47X / 6x6 Unmanned Reconnaissance Rover

A next-generation unmanned military reconnaissance rover engineered for extreme planetary terrain and low-gravity reconnaissance hops. Models by jelaludo. Built around a low-slung wedge-shaped titanium and graphite-composite armored hull (`4.66 m` length × `2.36 m` width across hubs × `1.58 m` mast height), six independently spinning chevron-treaded wheels with front steering pivots (`±34°`) and per-wheel articulated wishbone suspension, an **8-nozzle individually gimbaled cold-gas propulsion system** with a reusable Three.js cold-gas mist particle helper, a continuous 360° yaw + pitch EO/IR + LiDAR sensor mast, and **four UV-mapped, separately addressable onboard telemetry displays** (including an Apollo NASM FDAI-inspired codified yaw/pitch/roll rate and height/level panel on the rear black deck).

## Runtime contract & articulation hierarchy

- **Source of truth**: Plain GLBs in `lod0/`, `lod1/`, `lod2/` are authoritative. `derived/meshopt/` provides optional preview compression; release packing (`gltfpack -cc -kn -km -ke`) remains game-owned.
- **Coordinate system & rest pose**: Metres, `+Y` up, `+Z` forward. `R47X_ROVER_ROOT` sits on the ground at `(0, 0, 0)` at the centre of a `6 × 8 m` plot. No vehicle movement is baked (`clips: []`); the game owns driving, steering, jumps and landings.
- **LOD2 static distance limitations**: `LOD2` merges all geometry into a single static mesh and material (`ROVER_STATIC_BODY`, `1` draw call) for distant map/orbit views (`> 140 m`). All 82 engine and socket lookup nodes (`ENGINE_NODES`) remain present in `LOD2` as `Object3D` transforms at rest so node queries never fail, but individual wheel spin, steering, suspension, nozzle gimbaling, sensor articulation and separate display materials require `LOD1` (game tier) or `LOD0` (detailed master).

### 1. Six independent wheels, steering & per-wheel suspension

Each wheel station `ID` in `['FL', 'FR', 'ML', 'MR', 'RL', 'RR']` (axles at `z = +1.44 m`, `-0.42 m`, `-1.44 m` in `ROVER_CHASSIS_JUMP` space; wheel hub centres at `x = ±0.98 m, y = 0.48 m` world rest) uses a strict three-level kinematic chain so suspension travel is completely independent of steering and axle spin, and connected suspension arms follow the wheel assembly without gaps or clipping:

1. **`SUSP_PIVOT_<ID>`** (at inner chassis wishbone hinge `[±0.48, -0.08, az]` in chassis space):
   - Parents **`SUSP_ARM_<ID>`** (wishbone arms, steering knuckle carrier and twin exposed hydraulic shock absorbers; inner clevis barrel overlaps into the chassis side socket) and **`WHEEL_STEER_<ID>`** (at outer hub `[±0.50, 0, 0]`).
   - **Recommended articulation**: rotate `SUSP_PIVOT_<ID>.rotation.z` (swing-arm roll angle `-sideSign * asin(travelY / 0.50)`, collision-free range **`[-16°, +14°]`**, equivalent to **`-0.12 m` droop to `+0.14 m` compression** at the hub) or translate `SUSP_PIVOT_<ID>.position.y` (`[-0.12 m, +0.14 m]`). Because `SUSP_ARM_<ID>` and `WHEEL_STEER_<ID>` share `SUSP_PIVOT_<ID>`, the arm and hub never separate or clip.
2. **`WHEEL_STEER_<ID>`** (nested beneath `SUSP_PIVOT_<ID>` at the wheel hub centre, aligned with local `+Y` vertical at rest):
   - **Axis & sign convention**: local **`+Y`** (`rotation.y`). Positive `+rotation.y` (rad) steers **left** (CCW viewed from above); negative `-rotation.y` steers **right** (CW viewed from above).
   - **Collision-free mechanical limits**: Front wheels **`WHEEL_STEER_FL`** and **`WHEEL_STEER_FR`** clear the narrowed wedge nose and wishbones across **`±34°` (`±0.593 rad`)**, exceeding the `±30°` target. Middle and rear hubs (`WHEEL_STEER_ML/MR/RL/RR`) remain at `0°` for standard front steering or support up to `±15°` crab/all-wheel steering.
3. **`WHEEL_SPIN_<ID>`** (nested directly beneath `WHEEL_STEER_<ID>` at `[0, 0, 0]`, parenting mesh **`WHEEL_<ID>`**):
   - **Axis & sign convention**: local **`+X`** (`rotation.x`, wheel radius `0.48 m`). Positive `+rotation.x` rolls the wheel **forward** (`+Z` vehicle travel); negative `-rotation.x` rolls **backward** (`-Z`), where `omega = speedMps / 0.48`.

### 2. Eight individually articulated cold-gas thruster gimbals & mist particles

Each of the 8 nozzles has its own 2-axis gimbal pivot, nozzle mesh and child exit socket parented directly to the moving nozzle:

| Thruster ID | Gimbal Pivot | Nozzle Mesh | Child Exit Socket | World Rest Pivot `(x, y, z)` | Rest Exhaust Normal | Pitch Limit (`+X`) | Roll Limit (`+Z`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **V_FL** (Ventral Front-Left) | `GIMBAL_V_FL` | `THRUSTER_V_FL` | `SOCKET_THRUSTER_V_FL` | `(-0.48, 0.38, 0.68)` | `(-0.080, -0.997, 0)` | `-28° .. +28°` | `-25° .. +25°` |
| **V_FR** (Ventral Front-Right) | `GIMBAL_V_FR` | `THRUSTER_V_FR` | `SOCKET_THRUSTER_V_FR` | `(0.48, 0.38, 0.68)` | `(0.080, -0.997, 0)` | `-28° .. +28°` | `-25° .. +25°` |
| **V_RL** (Ventral Rear-Left) | `GIMBAL_V_RL` | `THRUSTER_V_RL` | `SOCKET_THRUSTER_V_RL` | `(-0.48, 0.38, -0.78)` | `(-0.080, -0.997, 0)` | `-28° .. +28°` | `-25° .. +25°` |
| **V_RR** (Ventral Rear-Right) | `GIMBAL_V_RR` | `THRUSTER_V_RR` | `SOCKET_THRUSTER_V_RR` | `(0.48, 0.38, -0.78)` | `(0.080, -0.997, 0)` | `-28° .. +28°` | `-25° .. +25°` |
| **L_FL** (Lateral Front-Left) | `GIMBAL_L_FL` | `THRUSTER_L_FL` | `SOCKET_THRUSTER_L_FL` | `(-0.80, 0.46, 0.64)` | `(-0.408, -0.913, 0)` | `-35° .. +35°` | `-42° .. +18°` |
| **L_FR** (Lateral Front-Right) | `GIMBAL_L_FR` | `THRUSTER_L_FR` | `SOCKET_THRUSTER_L_FR` | `(0.80, 0.46, 0.64)` | `(0.408, -0.913, 0)` | `-35° .. +35°` | `-18° .. +42°` |
| **L_RL** (Lateral Rear-Left) | `GIMBAL_L_RL` | `THRUSTER_L_RL` | `SOCKET_THRUSTER_L_RL` | `(-0.80, 0.46, 0.18)` | `(-0.408, -0.913, 0)` | `-35° .. +35°` | `-42° .. +18°` |
| **L_RR** (Lateral Rear-Right) | `GIMBAL_L_RR` | `THRUSTER_L_RR` | `SOCKET_THRUSTER_L_RR` | `(0.80, 0.46, 0.18)` | `(0.408, -0.913, 0)` | `-35° .. +35°` | `-18° .. +42°` |

- **Exhaust axis & force direction**: Every `SOCKET_THRUSTER_<ID>` sits at `[0, -0.14, 0]` inside its moving `THRUSTER_<ID>` mesh, with local **`-Y` (`[0, -1, 0]`)** pointing along the physical exhaust jet (and reaction thrust force on the vehicle pointing along local **`+Y` `[0, +1, 0]`**). Compute instantaneous world exhaust direction via `new THREE.Vector3(0, -1, 0).transformDirection(socket.matrixWorld)`.
- **Geometry-blocked directions (for physics reconciliation)**:
  - Neither ventral nor lateral nozzles can point into the upper `+Y` hemisphere (so nozzles cannot produce downward negative-lift thrust; ventral nozzles are recessed inside undercarriage skid collars and lateral nozzles sit directly beneath the twin flank COPV tanks).
  - Lateral nozzles (`L_*`) are canted `24°` outboard at rest and can vector an additional `42°` outboard (up to `66°` from vertical for strong lateral translation/roll authority), but inboard roll is mechanically limited to `18°` by the lower chassis hull tub.
- **Companion Cold-Gas Mist Particle Helper (`assets/recon-rover/thruster-fx.js` + `cold-gas-puff.png`)**:
  - `createColdGasSystem(THREE, root, { enabled, dust, maxPlumeParticles: 320, maxDustParticles: 96, textureUrl })` provides a bounded, zero-allocation particle pool with immediate ignition, pale nitrogen mist (`0.16–0.34 s` lifetime, proportional to per-nozzle intensity `0..1`), an effects-off toggle (`setEnabled(false)`), and separate ground surface dust (`setDustEnabled(bool)`).

### 3. Top EO/IR + LiDAR sensor mast

- **`SENSOR_MAST_YAW`** at `(0, 1.12, 0.26)` world: rotates about local **`+Y`** (`rotation.y`), supporting continuous **360°** rotation (`-180° .. +180°`).
- **`OPTICS_HEAD_PITCH`** (nested beneath `SENSOR_MAST_YAW`, parenting `SENSOR_MAST_HEAD` and `SOCKET_SENSOR_MAST`): rotates about local **`+X`** (`rotation.x`). Collision-free pitch limits are **`-38°` (nose-up elevation, `-0.663 rad`) to `+28°` (nose-down depression, `+0.489 rad`)**.

### 4. Onboard displays & rear NASM FDAI telemetry panel

All four onboard display surfaces are exported with clean `[0..1] × [0..1]` `TEXCOORD_0` UVs and distinct, separately addressable emissive materials:

| Display Mesh | Attachment Socket | Material Name | Location & Role |
| --- | --- | --- | --- |
| `DISPLAY_SPEED_LEFT` | `SOCKET_DISPLAY_SPEED_L` | `DISPLAY_SPEED_ORANGE_MAT` | Left rear wheel cover (viewed from behind): **orange** (`#d98a2b`) speed & wheel velocity bar |
| `DISPLAY_THRUST_RIGHT` | `SOCKET_DISPLAY_THRUST_R` | `DISPLAY_THRUST_CYAN_MAT` | Right rear wheel cover (viewed from behind): **cyan** (`#38e8ff`) vertical thrust & RCS lift bar |
| `DISPLAY_GAS_RESERVE_REAR` | `SOCKET_DISPLAY_GAS_REAR` | `DISPLAY_GAS_RESERVE_MAT` | Rear bulkhead panel: **mint/amber** (`#46f09a`) N2 COPV gas reserve (`PSIA` / `%`) |
| `DISPLAY_FDAI_TELEMETRY_PANEL` | `SOCKET_DISPLAY_FDAI_REAR` | `DISPLAY_FDAI_TELEMETRY_MAT` | Rear dorsal black panel: Apollo **NASM FDAI-inspired codified instrument panel** displaying live **Height/Altitude (`ALT m`)**, **Reserve (`PSIA`)**, **Mast X-Y cross-pointer**, and an octagonal **8-ball attitude reticle with graduated `ROLL RATE`, `PITCH RATE` and `YAW RATE` scales** (`createOnboardDisplays` in `thruster-fx.js`) |

## Measured exports

| Tier | Triangles | Draws | Plain bytes | Decoded Meshopt bytes |
| --- | ---: | ---: | ---: | ---: |
| LOD0 detailed | 9,176 | 26 | 650,216 | 172,484 |
| LOD1 game | 5,120 | 26 | 384,984 | 117,416 |
| LOD2 static distance | 2,712 | 1 | 203,012 | 70,064 |

`LOD1` (`5,120` triangles ≤ 8,000, `26` articulated draws, `384,984` bytes ≤ 400 KB plain) and `LOD2` (`2,712` triangles ≤ 3,000, `1` draw, `203,012` bytes ≤ 250 KB plain) pass all glTF, geometry, UV, socket and node-parity checks. Exact SHA-256 hashes, bounds and socket coordinates are recorded in `manifest.json`. No FPS claim is made.
