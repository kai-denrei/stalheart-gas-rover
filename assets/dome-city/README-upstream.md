# Dome City / Four Squares

A 220 × 220 m flat-datum diorama: nine specialized domes on an 80 m grid, twelve 52 m elevated hallways, and four working squares. Each square is framed by four connected domes. Six roles share the same dome envelope: habitat, biosphere, research, power, fabrication and logistics. Every dome retains a build-ready elevated sentry cradle; four corner domes demonstrate the canonical Railgun T3 and five mounts are empty.

Launch court contains ARC-01, a packed collector and a resource drill. Fabrication court contains the missile factory, robotic assembly line and MÖRK garage. Solar services contains the solar complex, seven heliostats, a crucible and another drill. Cargo court contains a hauler, three armored containers and eight ore cassettes. One MÖRK patrols the ground route and another is parked in the garage. External machines remain in rest poses.

## Source and integration

`layout.json` is a derived composition of unchanged library references and the expanded `../dome-colony/` family. Referenced plain GLBs remain the source of truth; there is no merged city GLB. The layout records source paths, SHA-256, byte sizes, loaded bounds and primitive counts. Hand off the containing commit plus `assets/dome-city/`, `assets/dome-colony/` and the exact referenced library folders. Credit: Models by jelaludo. All variants here are D0; no new damage states are supplied.

Metres, +Y up, +Z forward. Each instance receives an ID wrapper and a ground-centered model root. Look up sockets and pivots within that wrapper; canonical node names are deliberately repeated across instances. `runtime.js` composes the scene with the caller's Three.js and `SkeletonUtils.clone` function. Skeleton-aware cloning is required for the assembly line. Repeated files share geometry/materials; each inspected dome shell owns its own material. Dispose only those shell materials on a tier change. No GPU instancing claim.

Each dome's E/W/N/S ports are 14 m from its center at y=9.7 m. The long bridge's ends are ±26 m. Adjacent dome centers are 80 m apart, so all twelve connections have coincident sockets and opposing normals in every LOD. Hide the named connected caps at LOD0/1 using `open_ports`; LOD2 keeps static simplified port silhouettes. Walking floors are 7.9 m high and hallway undersides are 7.5 m. The 32 m thin sentry platforms and 35.6 m cradle origins retain the earlier module contract.

The assembly line is raised 0.28 m and the solar complex 0.25 m as instance placement corrections for their existing local bounds; originals are unmodified. The garage tank uses the existing static proxy and a 0.31 m floor offset. Machinery footprints fit their courts in conservative rest-pose mesh-bound checks. These are not reserved operational sweeps: launch trajectories, crane/robot travel and deployed collector envelopes need separate integration.

## Detail tiers and measurements

| City selection | Triangles, repeated copies counted | Exported primitive draws | Unique GLB bytes | Unique files |
| --- | ---: | ---: | ---: | ---: |
| LOD0 / detailed buildings | 254,978 | 462 | 7,536,032 | 22 |
| LOD1 / game candidates | 129,442 | 350 | 4,981,084 | 22 |
| LOD2 / static distance | 75,020 | 118 | 2,345,168 | 21 |

Values exclude viewer terrain, road markings, labels and line guides. They include both tanks and all four sentries. Primitive counts are not measured renderer calls or FPS. Existing single-tier containers are retained in every view; assembly line and solar use their game tier in the detailed city view. Consequently the city distance scene is not a one-draw merged export and does not imply retroactive compliance of every older asset.

New modules include detailed LOD0, articulated game LOD1 and one-material static LOD2; their per-module metrics and provisional 150 m / 20 m hysteresis selection metadata are in `../dome-colony/manifest.json`. All new game/distance modules meet landmark budget targets. The viewer manually switches the whole composition and starts at LOD1; the engine should select per-instance tiers, initially load distance proxies, and swap before pivots or interiors become readable. LOD2 must not animate its sentry mounts or use shell/cap hiding. Plain exports only; no new compressed derivatives. Existing references are loaded with Meshopt decoding enabled where required.

## Clearance and defense

`validation-report.json` checks hashes, four-corner square topology, coincident/opposed sockets at every tier, ground placement, conservative machinery AABB overlap against domes/hallways/other machinery, and the level-gun patrol's swept bounds. At 0.55 m hover the tank is 5.819 m wide in its 10 m lane: 2.090 m margin on each side and 3.934 m below the hallway underside. At its three crossings, the nearest support columns leave 19 m clear (18 m at low feet). The patrol moves at 4 m/s from z=−98 to +98 along x=−40 and reverses translation without turning its hull. This demonstration is not an exported clip.

The original two-dome firing report does not certify this larger city. The viewer offers a fresh nine-ray, 0.20 m-diameter straight-shot envelope against the currently loaded city geometry, including visually hidden/clear shells. A blocked trace inhibits the displayed eligibility. Use actual world collision geometry for game fire permission, not this preview's LOD-dependent result or a blanket maximum-angle rule. Perimeter coverage, crossfire, ballistics and terrain/planet curvature remain pending.

## Viewer and rebuild

Viewer: `../../dome-city/`. Choose a court, inspect a dome, switch three detail tiers, change clear/opaque/cutaway shells, show labels or machinery, inspect wireframe, drive/pause MÖRK, or adjust a corner sentry and inspect its firing path. Camera presets provide overview, plan and ground-route views. Distance mode disables motion and shell/aim controls. Links expose the layout, validation and individual dome GLBs.

Rebuild modules with `node tools/asset-pipeline/build-dome-colony.mjs`, then run `node tools/asset-pipeline/validate-dome-colony.mjs`. Rebuild the composition with `node tools/asset-pipeline/build-dome-city.mjs` and check it using `node tools/asset-pipeline/validate-dome-city.mjs`. Generate shared navigation after documentation changes using `python3 tools/build-workshop-docs.py`.

`source/blender/dome-city.blend` and `preview.png` are derived review artifacts, rebuilt by `tools/blender/render_dome_city.py`. The Blender camera/lighting and parked patrol position serve presentation, not engine behavior. Future work includes spherical placement, articulating connections, damage/construction states, active production/launch staging, complete defense coverage and in-game/reference-device performance review.
