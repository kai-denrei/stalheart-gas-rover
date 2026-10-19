# R-47X / 6x6 Unmanned Reconnaissance Rover (`recon_rover`)

Next-generation unmanned military reconnaissance rover (`R-47X`) designed for extreme terrain and low-gravity planetary exploration, featuring **graduated physical damage states (`D0`–`D3`)** across **`LOD0`–`LOD2`** (12 plain source-of-truth GLBs + 12 derived Meshopt GLBs), **19 separately selectable localized damage zones** with zero-reload in-place geometry swapping (`applyLocalizedDamage`), **6 independent wheels with Ackermann front steering and per-wheel suspension**, **8 individual 2-axis gimbaled cold-gas thrusters**, **optional `D2` COPV manifold cold-gas leak mist**, **6 bounded `D3` detachable debris fragments with convex collision proxies**, and **4 UV-mapped onboard telemetry displays** with a separate `DISPLAY_CRACK_OVERLAY` layer.

- **Concept Design Sheet**: `research/recon-rover/concept-01.png`
- **Interactive Lab Viewer**: `/recon-rover/`
- **Damage Brief**: `research/recon-rover/rover-damage-asset-brief.md`
- **Source Generator**: `tools/asset-pipeline/recon-rover-shape.mjs`
- **Runtime Articulation & Localized Damage Adapter**: `assets/recon-rover/runtime.js`
- **Cold-Gas Mist, D2 Leak & Onboard Telemetry Helper**: `assets/recon-rover/thruster-fx.js` (`assets/recon-rover/cold-gas-puff.png`)

## Coordinate System & Rear Chase-Camera Side Convention

- **Units**: Metres (`1 unit = 1 m`)
- **Axes**: `+Y` up, `+Z` forward, ground contact at `(0, 0, 0)`
- **Signed-X vs. Chase-Camera Screen Side**:
  - `-X` (`x < 0`) is the rover's **left flank (`FLANK_NEG_X`, `WHEEL_FL`, `WHEEL_ML`, `WHEEL_RL`, `NOZZLE_V_FL`, `NOZZLE_V_RL`, `NOZZLE_L_FL`, `NOZZLE_L_RL`, `DISPLAY_SPEED_LEFT`)**. Because a rear chase camera sits at `-Z` looking toward `+Z`, **`-X` appears on screen-right** in rear chase view.
  - `+X` (`x > 0`) is the rover's **right flank (`FLANK_POS_X`, `WHEEL_FR`, `WHEEL_MR`, `WHEEL_RR`, `NOZZLE_V_FR`, `NOZZLE_V_RR`, `NOZZLE_L_FR`, `NOZZLE_L_RR`, `DISPLAY_THRUST_RIGHT`)**. From the `-Z` rear chase camera looking toward `+Z`, **`+X` appears on screen-left**.

## Measured Metrics (`D0`–`D3` × `LOD0`–`LOD2`)

Plain GLB is the source of truth; `derived/meshopt/` files are optional `EXT_meshopt_compression` preview copies. Damage states (`D0`–`D3`) are strictly orthogonal to detail tiers (`LOD0`–`LOD2`).

| Asset ID | Damage | Tier | Plain File | Triangles | Draw Calls | Materials | Plain Bytes | Meshopt Bytes | Role |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `r47x_recon_rover_d0_lod0` | `D0` Intact | `LOD0` | `lod0/r47x_recon_rover_d0_lod0.glb` | 8,652 | 37 | 5 | 637,592 B | 182,764 B | Detailed master (intact) |
| `r47x_recon_rover_d0_lod1` | `D0` Intact | `LOD1` | `lod1/r47x_recon_rover_d0_lod1.glb` | 4,796 | 37 | 5 | 383,848 B | 135,352 B | Game tier (`≤ 8,000` tris, `≤ 400 KB`) |
| `r47x_recon_rover_d0_lod2` | `D0` Intact | `LOD2` | `lod2/r47x_recon_rover_d0_lod2.glb` | 2,772 | 1 | 1 | 215,964 B | 79,464 B | Static merged distance (`1` draw) |
| `r47x_recon_rover_d1_lod0` | `D1` Battered | `LOD0` | `lod0/r47x_recon_rover_d1_lod0.glb` | 8,616 | 37 | 5 | 635,616 B | 204,088 B | Detailed master (dented armor + cracked glass) |
| `r47x_recon_rover_d1_lod1` | `D1` Battered | `LOD1` | `lod1/r47x_recon_rover_d1_lod1.glb` | 4,760 | 37 | 5 | 382,184 B | 148,620 B | Game tier (full articulation preserved) |
| `r47x_recon_rover_d1_lod2` | `D1` Battered | `LOD2` | `lod2/r47x_recon_rover_d1_lod2.glb` | 2,736 | 1 | 1 | 213,920 B | 83,044 B | Static merged distance (`1` draw) |
| `r47x_recon_rover_d2_lod0` | `D2` Component | `LOD0` | `lod0/r47x_recon_rover_d2_lod0.glb` | 7,960 | 37 | 5 | 590,376 B | 200,476 B | Detailed master (buckled suspension/nozzles + gas leak) |
| `r47x_recon_rover_d2_lod1` | `D2` Component | `LOD1` | `lod1/r47x_recon_rover_d2_lod1.glb` | 4,640 | 37 | 5 | 373,444 B | 149,740 B | Game tier (degraded capability + COPV leak) |
| `r47x_recon_rover_d2_lod2` | `D2` Component | `LOD2` | `lod2/r47x_recon_rover_d2_lod2.glb` | 2,616 | 1 | 1 | 204,204 B | 81,384 B | Static merged distance (`1` draw) |
| `r47x_recon_rover_d3_lod0` | `D3` Wreck | `LOD0` | `lod0/r47x_recon_rover_d3_lod0.glb` | 6,992 | 37 | 5 | 521,292 B | 183,220 B | Detailed master (collapsed axle + 6 debris fragments) |
| `r47x_recon_rover_d3_lod1` | `D3` Wreck | `LOD1` | `lod1/r47x_recon_rover_d3_lod1.glb` | 4,616 | 37 | 5 | 372,012 B | 149,540 B | Game tier (disabled wreck + detachable debris) |
| `r47x_recon_rover_d3_lod2` | `D3` Wreck | `LOD2` | `lod2/r47x_recon_rover_d3_lod2.glb` | 2,664 | 1 | 1 | 208,536 B | 82,900 B | Static merged distance (`1` draw) |

## Graduated Damage States (`D0`–`D3`)

| State | Label | Visual Silhouette & Surface Changes | Functional Capability & Rig Behavior |
| --- | --- | --- | --- |
| `D0` | **Intact** | Clean wedge-shaped titanium chassis, intact wheel fenders, true 6x6 wheels, straight 8 thruster bells, upright sensor mast, uncracked display covers. | `100%` drive speed, `±34°` front steering, full suspension travel, `100%` 8-nozzle thrust & gimbal range, continuous `360°` mast scan. |
| `D1` | **Battered** | Dented/bent nose beak and flank plates, scuffed titanium edges, and fractured display cover overlay (`DISPLAY_CRACK_OVERLAY`). | Full articulation (`95–100%` drive/steer/gimbal/sensor); subtle `0.015 rad` rim wobble on battered wheels. |
| `D2` | **Component Damage** | Visibly buckled wheel fender & kinked hydraulic damper rod, flat-spotted/cambered tire, bent/crimped nozzle bell, tilted sensor head with exposed copper internals, and ruptured COPV manifold cold-gas leak (`SOCKET_GAS_LEAK_*`). | Affected wheels drop to `45%` spin efficiency & `±17°` steer limit; affected nozzles drop to `48%` thrust & `35%` gimbal range; sensor mast limited to `±75°` sector; NASM FDAI displays amber/red `WRN` flag and `N2 LEAK DETECTED`. Surviving components remain fully drivable! |
| `D3` | **Disabled Wreck** | Collapsed suspension/axle posture, sheared hull & fender panels, crushed nozzle bells, snapped sensor mast pitched down (`+26°`), and **6 bounded detachable debris fragments** deployed on the ground. | `0%` drive/steer/thrust; displays dim to fault mode (`SPD / DRIVE FAULT`, `RCS / DISABLED`, red `OFF` flag on the NASM FDAI 8-ball). All 107 engine nodes and sockets remain intact at their contract hierarchy paths. |

## 19 Addressable Localized Damage Zones (`applyLocalizedDamage`)

Any combination of the 19 zones can be set independently to `D0`, `D1`, `D2`, or `D3` at runtime using `applyLocalizedDamage(liveRoot, variantBank, zoneStates, { showDebris })`. Geometry references are swapped in-place from the preloaded `D0`–`D3` scene bank with **zero network reloads and zero `BufferGeometry`/`Material` allocations**.

| Zone ID | Category | Signed X (`m`) | Rear Chase-Camera Side | Target Mesh Node(s) | Convex Collision Proxy |
| --- | --- | ---: | --- | --- | --- |
| `FRONT_BUMPER` | Hull | `0.00` | Center (`+Z` nose) | `ZONE_FRONT_BUMPER` | `PROXY_FRONT_BUMPER` (`convex_box`) |
| `REAR_PANEL` | Hull | `0.00` | Center (`-Z` stern) | `ZONE_REAR_PANEL` | `PROXY_REAR_PANEL` (`convex_box`) |
| `FLANK_NEG_X` | Hull | `-0.74` | **Screen-Right (`-X`)** | `ZONE_FLANK_NEG_X` | `PROXY_FLANK_NEG_X` (`convex_box`) |
| `FLANK_POS_X` | Hull | `+0.74` | **Screen-Left (`+X`)** | `ZONE_FLANK_POS_X` | `PROXY_FLANK_POS_X` (`convex_box`) |
| `SENSOR_MAST` | Mast | `0.00` | Center (`+Y` dorsal) | `SENSOR_MAST_HEAD` | `PROXY_SENSOR_MAST` (`convex_box`) |
| `WHEEL_FL` | Wheel/Susp | `-0.98` | **Screen-Right (`-X`)** | `SUSP_ARM_FL`, `WHEEL_FL` | `PROXY_WHEEL_FL` (`convex_cylinder`) |
| `WHEEL_FR` | Wheel/Susp | `+0.98` | **Screen-Left (`+X`)** | `SUSP_ARM_FR`, `WHEEL_FR` | `PROXY_WHEEL_FR` (`convex_cylinder`) |
| `WHEEL_ML` | Wheel/Susp | `-0.98` | **Screen-Right (`-X`)** | `SUSP_ARM_ML`, `WHEEL_ML` | `PROXY_WHEEL_ML` (`convex_cylinder`) |
| `WHEEL_MR` | Wheel/Susp | `+0.98` | **Screen-Left (`+X`)** | `SUSP_ARM_MR`, `WHEEL_MR` | `PROXY_WHEEL_MR` (`convex_cylinder`) |
| `WHEEL_RL` | Wheel/Susp | `-0.98` | **Screen-Right (`-X`)** | `SUSP_ARM_RL`, `WHEEL_RL` | `PROXY_WHEEL_RL` (`convex_cylinder`) |
| `WHEEL_RR` | Wheel/Susp | `+0.98` | **Screen-Left (`+X`)** | `SUSP_ARM_RR`, `WHEEL_RR` | `PROXY_WHEEL_RR` (`convex_cylinder`) |
| `NOZZLE_V_FL` | Ventral RCS | `-0.48` | **Screen-Right (`-X`)** | `THRUSTER_V_FL` | `PROXY_NOZZLE_V_FL` (`convex_box`) |
| `NOZZLE_V_FR` | Ventral RCS | `+0.48` | **Screen-Left (`+X`)** | `THRUSTER_V_FR` | `PROXY_NOZZLE_V_FR` (`convex_box`) |
| `NOZZLE_V_RL` | Ventral RCS | `-0.48` | **Screen-Right (`-X`)** | `THRUSTER_V_RL` | `PROXY_NOZZLE_V_RL` (`convex_box`) |
| `NOZZLE_V_RR` | Ventral RCS | `+0.48` | **Screen-Left (`+X`)** | `THRUSTER_V_RR` | `PROXY_NOZZLE_V_RR` (`convex_box`) |
| `NOZZLE_L_FL` | Lateral RCS | `-0.80` | **Screen-Right (`-X`)** | `THRUSTER_L_FL` | `PROXY_NOZZLE_L_FL` (`convex_box`) |
| `NOZZLE_L_FR` | Lateral RCS | `+0.80` | **Screen-Left (`+X`)** | `THRUSTER_L_FR` | `PROXY_NOZZLE_L_FR` (`convex_box`) |
| `NOZZLE_L_RL` | Lateral RCS | `-0.80` | **Screen-Right (`-X`)** | `THRUSTER_L_RL` | `PROXY_NOZZLE_L_RL` (`convex_box`) |
| `NOZZLE_L_RR` | Lateral RCS | `+0.80` | **Screen-Left (`+X`)** | `THRUSTER_L_RR` | `PROXY_NOZZLE_L_RR` (`convex_box`) |

## 6 Bounded Detachable Debris Fragments & Leak Sockets

| Debris Node | Source Zone | Detach Threshold | Attachment Socket | Convex Proxy | Size (`m`) |
| --- | --- | --- | --- | --- | --- |
| `DEBRIS_FRONT_BEAK` | `FRONT_BUMPER` | `D2+` | `SOCKET_DEBRIS_FRONT_BEAK` | `PROXY_DEBRIS_FRONT_BEAK` | `0.46 × 0.08 × 0.28` |
| `DEBRIS_FLANK_NEG_X` | `FLANK_NEG_X` | `D2+` | `SOCKET_DEBRIS_FLANK_NEG_X` | `PROXY_DEBRIS_FLANK_NEG_X` | `0.12 × 0.22 × 0.56` |
| `DEBRIS_FENDER_POS_X` | `FLANK_POS_X` | `D3` | `SOCKET_DEBRIS_FENDER_POS_X` | `PROXY_DEBRIS_FENDER_POS_X` | `0.28 × 0.08 × 0.52` |
| `DEBRIS_WHEEL_RIM_FL` | `WHEEL_FL` | `D2+` | `SOCKET_DEBRIS_WHEEL_RIM_FL` | `PROXY_DEBRIS_WHEEL_RIM_FL` | `0.14 × 0.26 × 0.26` |
| `DEBRIS_SENSOR_VISOR` | `SENSOR_MAST` | `D2+` | `SOCKET_DEBRIS_SENSOR_VISOR` | `PROXY_DEBRIS_SENSOR_VISOR` | `0.28 × 0.12 × 0.14` |
| `DEBRIS_NOZZLE_BELL` | `NOZZLE_L_FL` | `D3` | `SOCKET_DEBRIS_NOZZLE_BELL` | `PROXY_DEBRIS_NOZZLE_BELL` | `0.16 × 0.18 × 0.16` |

### `D2` Cold-Gas Leak Sockets

- `SOCKET_GAS_LEAK_NEG_X`: `[-0.78, 0.58, 0.35]` (ruptured `-X` COPV manifold; active when `FLANK_NEG_X`, `NOZZLE_L_FL`, or `NOZZLE_L_RL` is in `D2`)
- `SOCKET_GAS_LEAK_POS_X`: `[+0.78, 0.58, 0.35]` (ruptured `+X` COPV manifold; active when `FLANK_POS_X`, `NOZZLE_L_FR`, or `NOZZLE_L_RR` is in `D2`)
- `SOCKET_GAS_LEAK_REAR`: `[+0.18, 0.68, -1.96]` (rear manifold bleed; active when `REAR_PANEL`, `NOZZLE_V_RL`, or `NOZZLE_V_RR` is in `D2`)

## Validation Commands

```bash
node tools/asset-pipeline/build-recon-rover.mjs
node tools/asset-pipeline/validate-recon-rover.mjs
node tools/asset-pipeline/test-recon-rover.mjs
```
