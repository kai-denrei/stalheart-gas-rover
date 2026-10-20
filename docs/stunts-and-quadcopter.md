# Racing stunts and ISAO quadcopter — October 19, 2026

Open http://localhost:8166/?mode=race and refresh an existing tab.

## Controls

After a podium claim or race completion, ISAO takes over as before. A/D rotates left/right; W/S flies forward/backward along his heading. Shift descends, Space ascends. Releasing the controls brakes to a hover. Drag orbits the camera without steering the drone; F swaps views. Heading is retained while reversing. Ground/world collision, pause, interpolation and the 130 m ceiling remain active.

Racing rovers use Q/E for Coronal Flip (roll), W/S for Sagittal Flip (pitch) and A/D for Transverse Flip (yaw) while no wheels touch the surface. Release to coast and counter with the opposite key. X brakes flight, Shift thrusts down, and C levels. Ground W/S drives, A/D steers and Shift drifts. [Current controls, scoring and crash rules](flight-and-traction.md).

## Points and callouts

| Achievement | Points |
| --- | ---: |
| Coronal Flip, full airborne 360° | 100 |
| Sagittal / Transverse Flip, full airborne 360° | 150 |
| Coronal / Transverse Gate Flip! | +400 |
| Sagittal Gate Flip! | +500 |
| Mixed Gate Flip! | +750 |
| Double Coronal Flip, 720° in the same flight | +200 (300 total) |
| Further rotations | +300, +400, then +500 per turn |
| Sinkhole Flip, crossing an open/opening hole | +500 |
| Tremor Flip!, crossing the seam and completing the flip before it opens | +1,000 |
| Alien Flip, clearing a living Reed or Gorogoro | +300 |
| Rover Flip, clearing another active racer | +400 |

Rotations are credited by the actual physics integrator, not key presses. Special bonuses require an airborne passage across the target, sufficient clearance, and at least one completed rotation during that flight. They can combine, once per category per flight. A trembling seam that opens before verification receives the ordinary Sinkhole Flip bonus instead. Hovering over a hole is not a crossing. Ground contact ends the flight; a failed landing does not revoke already-earned points. Recoveries discard unfinished attempts but retain earned points. Restart clears every racer's score and achievement tally.

Stunt ranking is separate from gate progress and podium finishing order. Each of the five racers has its own score; equal scores use flip count, then starting-grid order. Cobalt attempts one real first-jump stunt, while the other pilots prioritize racing. There are no invented rival points. The other racers use the same scorer if they complete a kick.

The HUD shows the top three, the player's points and achievement counts. Verified human tricks get a brief CRT callout. The finish deck also carries the actual **A6 Beacon Rivalry LOD1** housing and original GPU-instanced seven-segment runtime, with its three rows relabelled for racers. The local adapter changes rows only when ranking/points change, hides inactive segments for readability, and adds no per-frame canvas uploads. Six-digit world display; HUD retains the full score. The model is 204 triangles / one authored draw, plus two instanced display draws. Hardware collision is split into the exported disconnected components, preserving the gap beneath the board.

Source and attribution: [Rivalry Scoreboards by jelaludo](https://jelaludo.github.io/SentryTowers_A6/scoreboard-rivalry/). The GLB, original runtime and selected manifest entry are copied locally and SHA-256-pinned in `assets.lock.json`; no CDN is needed at runtime. The GLB is checked against the source manifest's hash during import. All changes are confined to this separate rover lab.

## Round podiums

All three podiums are 64-sided cylinders with matching convex collision hulls and a 5 m outer radius. Claim rings remain 4.8 m. Heights remain 2.4 / 1.6 / 0.8 m above the elevated deck, with #1 tallest. Whole-rover containment, full stop, sequential reservation and protective shields retain their existing rules. Disco ground projections also use the circular footprint.

## Verification

- `npm test`: physics scoring, single/double rotations, crossing bonuses, duplicate prevention, late-opening fallback, per-racer ranking, recovery/reset, yaw/forward/reverse/vertical drone controls, round podium collisions and open scoreboard supports.
- `npm run check`: pinned asset hashes, module syntax/imports.
- `npm run test:race`: all 14 gates and three physical podium claims in the fully rendered course. Cobalt earned 1,000 points from a flip, sinkhole crossing and rover crossing; the race finished.
- `npm run test:stunts`: real E input, physical double/counter burst, synchronized HUD/world board, human cylinder landing/claim, actual ISAO keyboard yaw/forward/down/up, dense battle and restart. Report: `../artifacts/stunt-browser-report.json`.

Measured final dense-battle result: 603 live enemies, approximately 60 FPS, 6.12 ms GPU at 2520×1597 (1.75×). All 92 unit tests passed; 183 pinned assets and 171 modules verified. Browser checks reported no console errors. Measurements are from this machine/headless Chrome; the live FPS/GPU panel remains available for interactive comparisons.
