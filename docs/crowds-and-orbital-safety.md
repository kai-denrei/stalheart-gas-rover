# Living crowds and safer orbital support

The racing lab now mixes Reeds and weak Cutis-Maku with up to eight Cutis-Gorogoro. Reeds have stable individual size (83–117%), tint, walking rate, phase, pace and gentle lateral wandering. Animation rate scales with movement pace and body size, with the same traits at both mesh detail levels.

Cutis-Maku uses Stalheart's original instanced soft-body swarm, spherical projection, distance detail, culling, death deflation and reusable slots. About 40% of ordinary arrivals are weak Cutis (1.5 HP). Gorogoro arrive roughly every nineteenth body, bounded to eight actors. All share the existing adaptive crowd cap, up to 640 bodies, and actual sentry/Gunship/SOL targeting.

A single Nih-Daira arrives after 32 seconds when a crowd slot is available. Its authored resting width is 16 m, about five average Reeds, with the original live soft-body solver and gait. Close views retain the translucent skin; distant views use the opaque skin pass to avoid rendering the entire city twice. It has 90 HP, cannot be instantly killed by driving through its centre, and no second boss may coexist, including during death. Another becomes eligible 70 seconds after death or departure. Subsequent updates keep destroyable remains for 60 seconds; see `the-great-divide.md`. The boss remains an ambient combat target; this does not add the main game's boss-fight objectives or grab attacks.

Both SOL platforms orbit at 1,100 m, above a tighter footprint. Before firing and throughout a strike they check the beam's width and target safety area against rovers, ISAO, city collision bounds, mounted sentries, SH02 and the other support craft. Shots below a 0.82 dot product with the target's surface normal are rejected. A friendly crossing the beam cuts it off. SOL-88 lifts before jumping between distant targets, preventing a scorch trail drawn across the base between strikes.

The Heptapod mount becomes a second NEEDLE sniper; seven Quivers remain. World-space floating labels are removed, including rover names, sinkhole/gate names and finish/disco banners. Podium numbers are painted on the podium surfaces; HUD callouts and physical scoreboards remain.

Powered turns above 5.5 m/s progressively release rear traction, reaching full power-drift strength around 12 m/s. Strong throttle/steering now reaches 98% traction release, with less rear axle grip and a longer slide. Front tyres retain bite, while releasing steering restores grip. SHIFT retains the stronger handbrake drift. Rear wheel presentation distinguishes throttle wheelspin from braking.

## Enemy contacts and grounded movement (19 October update)

All four enemy families avoid the entire irregular sinkhole bowl, with a conservative rim margin. Trembling holes reserve their future footprint. Walkers caught within the warning zone retreat outward; an opening that overtakes a creature kills it rather than leaving it walking over empty ground. New arrivals are placed outside active holes.

Living enemies collide with the rover's compound chassis/wheel shapes. Impacts transfer momentum and damage both parties, with different masses for weak Cutis, Reeds, red cores and the boss. Repeated resting contacts have a damage cooldown; a rover above the body clears it. Protected podium owners and recovering racers are excluded. The boss's large body pushes back instead of being an instant run-over kill.

The Reed motion bake uses the original soft-body solver with a lab adapter that anchors contacting front probes during the pull phase. A seeded RNG varies reach length, spread and reach/pull/pause durations at each burst. Recorded root travel drives gameplay movement and the same pose clock drives both mesh detail levels. Size and individual pace scale the clock consistently, and blocked Reeds stop their pose clock. This keeps the existing two instanced draw pools rather than adding hundreds of live CPU solvers. Regenerate with `node scripts/bake-reed-motion.mjs`; it writes the texture, metadata and `src/reed-gait-data.js` together.

Both SOL platforms kill non-boss enemies immediately on contact, including Gorogoro. Nih-Dairia keeps its previous SOL damage/dwell rules.

Gunship support checks friendly dome/corridor/gantry/flag/podium geometry, sentries, rovers, ISAO and SH02 along the shot and around its blast. An obstructed target waits for another angle; no empty fallback shot is fired. The actual scattered muzzle-to-impact line is checked again before launch. Nuclear drops also sample their full ballistic/ignition/dive trajectory before release. The three finale strikes can shift farther into the empty background if a city structure blocks the original aim point. The orbit runs at 0.13 rad/s (about 48 seconds per circuit, previously 114). Moving friendlies at a normal round's impact can suppress its blast.

Focused validation: 130 unit tests, rendered impacts against all four families, SOL non-boss lethality, safe Gunship paths, and race/celebration checks. Latest 1440×913 performance samples held 60 FPS with 618 live enemies at the canyon and 615 at Base 2 (16.7–16.8 ms p95).

## Source and licensing

Imported unchanged from Stalheart revision `5c36b5a13b5ca72532396c5cdc03303841b15c8f` with `scripts/import-creature-crowds.mjs`. Original module and model hashes are recorded in `assets.lock.json`. The Cutis-Maku kit derives from the owner's Jelly-Baby project; Nih-Dairia derives from lab-creatures/Jelly Baby by scottstts. Their GPL-3.0 notices and LICENSE files are retained under `upstream/stalheart/src/fx/`. Integration lives in the lab; the source game is unchanged.

## Validation

- 115 unit tests: crowd traits, mixed arrivals, boss lifetime/cooldown, beam interception and buildings, orbit incidence, throttle drift and recovery, plus existing simulation/race tests.
- `npm run test:crowds`: actual animated bodies, varied Reed attributes, both SOLs firing, immediate beam interruption by ISAO, no browser errors. 369 live enemies at 36 seconds, including seven Gorogoro and one boss; adaptive cap disabled at 640 for the test.
- Measured 60 FPS in both the track and ISAO views. Final ISAO measurement: 16.7 ms p95, ~4.3 ms simulation, ~3.3 ms render submission, ~2.5 ms GPU at 1440×913, DPR 1. This is a measured view, not a guarantee for every camera/resolution; the original adaptive cap remains available.
- Full rendered race completed in 204.12 simulation seconds with all 14 gates and three distinct podium claims. Reset and celebration checks passed.
