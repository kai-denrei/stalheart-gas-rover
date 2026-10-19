# R–47X rover — feedback for the 3D team

For the standalone Stalheart rover lab. Please supply an updated GLB plus an interactive asset-viewer demo of the articulation and effects below. Preserve the current silhouette, metres, +Y up, +Z forward, root origin, and existing lookup names where possible; document any changes.

## 1. Wheels and steering — priority

- Separate all six wheels so each can spin about its own axle.
- Give both front wheels independent steering pivots through their hubs, aligned with local +Y at rest. Nest each wheel’s axle-spin pivot beneath its steering pivot.
- Start with roughly ±30° steering clearance; document actual limits and rotation signs. The game will calculate steering angles and wheel speed.
- Keep suspension travel independent of steering/spin. Make the connected arms follow the wheel assembly without visible gaps or clipping. Per-wheel suspension would be useful if practical; document any simplified linkage.

## 2. Thrusters and particles — priority

- Separate the eight nozzles into individually articulated gimbals. Currently the four ventral and four lateral nozzles each share one group pivot; our lab simulates independent force directions.
- Provide a socket at each nozzle exit, parented to its moving nozzle, with a documented exhaust axis and mechanical angular limits. Flag any directions the geometry cannot support so we can reconcile the physics.
- Add a pale, short-lived cold-gas mist/particle burst in the asset viewer: immediate ignition, strength proportional to thrust, and a brief dissipation tail. Avoid a persistent fire/rocket flame look.
- Deliver the reusable Three.js effect helper and any local textures alongside the GLB. Expose per-nozzle intensity (0–1) and follow the nozzle’s direction; runtime particles need this companion code.
- Include an effects-off toggle and a bounded particle count. Optional: surface dust on nearby ground, separate from the nozzle plume.

## 3. Top sensor (“radar”)

The current GLB already has `SENSOR_MAST_YAW` (+Y), with `OPTICS_HEAD_PITCH` (+X) beneath it. It is described as an EO/IR + LiDAR head. Preserve these pivots; demonstrate continuous 360° yaw and independent pitch, and document collision-free pitch limits. No new radar dish is requested. The lab currently animates yaw only.

## 4. Onboard displays

Provide named attachment surfaces/sockets on the rear wheel covers and rear panel: cyan vertical thrust on the right when viewed from behind, orange speed on the left, and gas reserve on the back. Supply clean UVs and separately addressable emissive surfaces; the game supplies live values.

## Handoff checks

Demonstrate steering + wheel spin + suspension together, sensor movement, and individual nozzle firing/vectoring. Preserve articulation in LOD0/LOD1; document LOD2 limitations. Include node/axis/limit notes, bounds, and updated triangle/draw-call counts. Avoid baked vehicle movement: the game owns driving, jumps, and landings.
