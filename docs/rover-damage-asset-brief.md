# R–47X — graduated physical damage

Follow-up to the articulated rover delivery. Please author visible geometry damage for collision impacts, with the current intact rover as **D0**. Damage level and LOD must remain separate choices.

| Level | Appearance | Intended game use |
| --- | --- | --- |
| D0 — intact | Current model | Normal operation |
| D1 — battered | Dented/bent armor, scuffed edges, cracked display covers; wheels and nozzles still articulate | Light collisions; mostly cosmetic |
| D2 — component damage | Buckled wheel cover or suspension arm, damaged tire/hub, bent/broken nozzle, damaged sensor head or exposed internals | Affected component can lose capability; rover may remain drivable |
| D3 — disabled wreck | Clearly collapsed chassis/axle, missing panels and visibly ruined propulsion/sensor components | Disabled vehicle awaiting reset/recovery |

## Localized damage

Provide separately selectable variants for front bumper, rear panel, each flank, each wheel/suspension station (`FL/FR/ML/MR/RL/RR`), each of the eight nozzles, and the sensor mast. One front-wheel impact should not damage every wheel or force a whole-rover mesh swap. Reuse geometry/materials where practical. Include example full-rover D1–D3 presets assembled from those parts.

Make deformation readable from the normal third-person chase distance. Prioritize bent geometry and changed silhouette over tiny scratches. Identify sides by signed X as well as names: from our rear chase view, negative X appears on screen-right.

## Rig and collision contract

- Keep metres, +Y up, +Z forward, root origin, intact pivot/socket names and rest transforms consistent across interchangeable variants.
- Retain steering, axle spin, suspension, sensor and nozzle articulation wherever the component remains functional. For missing/disabled parts, preserve named lookup anchors and document which functions cease to work.
- Supply simple named convex collision proxies for each damaged part/state, plus bounds. Avoid concave triangle meshes as the runtime collision contract.
- Include detachable fragment meshes only where useful, with attachment transforms and simplified colliders; use a small bounded debris count.
- Preserve the three live gauges and rear attitude-panel binding wherever their surfaces survive. Cracks/breakage should be a separate visual layer or documented variant.

## Effects and delivery

Optional D2 gas leak: short pale mist with an intensity control and off switch, using the existing bounded particle helper. Persistent fire is not the default for this cold-gas rover. The game will decide impact thresholds, gas loss, handling penalties, breakage and recovery; do not bake those rules or vehicle movement into the asset.

Start with D1/D2 LOD1 for playtesting, then D3 and distance variants. Supply a node/variant manifest, collider names, triangle/draw-call budgets, local dependencies and revision hashes. In the asset viewer, demonstrate part/state selection and surviving articulation without reloads or geometry/material leaks.
