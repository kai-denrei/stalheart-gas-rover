# ISAO and circuit update — October 19, 2026

Open **http://localhost:8166/?mode=race** and refresh an existing tab.

## Post-race ISAO

Claiming any podium automatically hands control to ISAO. Players who miss the podium also receive control once the race ends. F switches between ISAO and the parked rover's views. Restart removes the drone and locks the handoff again.

| Control | Action |
| --- | --- |
| A / D | Rotate left / right |
| W / S | Forward / backward along ISAO’s heading |
| Shift+Space / Space | Descend / ascend |
| Drag | Orbit the third-person camera |
| Mouse wheel | Zoom |
| F | ISAO / rover view |
| P / Escape | Pause |

The original `isao_birudoron_lod1.glb` is copied from Stalheart revision `5c36b5a13b5ca72532396c5cdc03303841b15c8f` and hash-pinned. The model is fitted to a 1.4 m span for this playable role. Its original `Hover_Idle`, `Rotor_Cycle`, happy, determined and surprised expressions drive the character. ISAO retains his commanded heading when hovering or reversing. Mouse dragging only orbits the camera; it does not steer flight.

This is a separate physical actor with a 0.75 m collision sphere, acceleration and automatic hover braking. He collides with the terrain and static world solids, including buildings, podiums and flag hardware. Flight runs at 120 Hz with interpolated presentation and a collision-aware third-person camera. Horizontal speed is 12 m/s, yaw rate is 1.6 rad/s; vertical speed is 8 m/s, with a 130 m flight ceiling. There is no ISAO combat/damage mode in this iteration. His cyan minimap marker and HUD follow his position. Rover inputs are suppressed while he is controlled. Pause/help/blur stop simulation; restart clears his state. Combat continues during exploration.

## Solid flags

All 28 flags now have four separate convex hardware proxies: shaft, capture foot, locking collar and the faction's beacon/cap/finial. Geometry is taken from the actual loaded mesh vertices, including the placement rotation and 1.45× display scale. Exported numeric name suffixes are handled across all six factions. These 112 static proxies participate in the existing rover collision/damage solver and ISAO movement.

The animated cloth remains cloth; no large invisible box spans the flag or gate opening. The red and blue flags retain their plain cloth without the removed glyphs. A browser acceptance test drives a rover into the first flag, records a physical impact and accumulated damage, and verifies that the centre passage remains clear.

## Circuit

The original route, gate locations, penalty boundary and sinkholes are retained. The road is a spherical mesh with a continuous distance-based asphalt/paint shader, replacing the one-metre yellow border cells. It includes white edge lines, alternating red/white kerbs at corners, green straight shoulders, subtle asphalt/rubber variation, a chequered start stripe and outlined starting slots. Gate strips are thin cyan/green lines. Decorative direction chevrons were removed in the race readability update.

The road uses the same polyline/capsule union as the race boundary and the existing dynamic sinkhole cutout uniforms. Unit coverage samples its painted boundary against the penalty predicate and checks corner kerb selection.

## Validation

- 78 unit tests pass; 164 pinned assets and 149 modules pass hash, syntax and import checks.
- Browser acceptance verifies actual flag impacts, physical player podium claim, automatic ISAO takeover, keyboard movement isolated from the rover, paused movement, F switching, continued combat and reset cleanup.
- Full physical race completes all 14 gates and fills the three podiums at about 189 seconds with solid flags present.
- Local desktop Chrome samples remain approximately 60 FPS at 1440×913 (DPR 1) and 2520×1597 (DPR 1.75). The ISAO battle samples average about 1.01 ms simulation, 2.48–2.61 ms render submission and 2.10–4.37 ms GPU; P95 frame interval 16.7 ms. These are local measurements, not a phone benchmark.

Reports: `artifacts/combat-browser-report.json`, `artifacts/combat-performance.json`, `artifacts/race-validation-output.txt`, `artifacts/unit-test-output.txt`. Visuals: `artifacts/isao-handoff.png`, `artifacts/isao-flight.png`, `artifacts/track-v2-grid.png`, `artifacts/track-v2-corners.png`.
