# Shared weapons and crowd stress test — October 19, 2026

Refresh **http://localhost:8166/?mode=race**. **Lab settings → Battle pressure** offers adaptive hundreds, light (80), or a fixed 640-body stress test. The FPS panel reports living enemies, the current admission limit, visible bodies and queued arrivals. Reducing pressure holds new arrivals; it does not delete living enemies.

## Firing behaviour

The Quiver now calls Stalheart's original `launchDart` / `advanceDart`, spherical adapter and A6 flight sampler, using `STORY_QUIVER.missile`. Lab metres are converted to the source's unit sphere around its true planet centre. The six-second authored clock includes unpowered ejection, coast and fall, ignition, a powered climb, crest and a 2.6× dive clock. The opening height remains capped at eight metres. The climb retains its launch target; only beyond the crest does it blend toward the moving target.

The launcher aims its actual muzzle to the source elevation of 55.8°, acquires the source lock, and permits one missile in flight per launcher. Its exhaust is invisible until the shared pose says ignition. Release and ignition have separate sounds. Impacts and damage wait for actual flight arrival or interception by a solid; the lab supplies its own convex world collision and enemy-health adapter.

Rotors use the source tower rate multiplied by the source six-round subdivision (13.2 rounds/s), 0.25-second spin-up, alternating real muzzle sockets, barrel spin, recoil, heat and cooling rules. Their moving targets are led with the original `leadPoint`; rounds travel before applying damage. The original point-tracer builder supplies their appearance, consolidated into one bounded point batch.

Lancers use the original `makeBeamShot` shader/taper and three-second hold from `FIRING`. Their articulated muzzles follow targets, with continuous piercing damage in the lab's health units. Buildings, terrain and friendly rover lines block the beam. Servo state, slew, recoil and muzzle cycling still use the shared sentry module.

The lab retains its own ranges, health/damage balance and local collision model. It does not instantiate the main game's entire board/controller. Shared source files are copied unchanged and pinned at Stalheart revision `5c36b5a13b5ca72532396c5cdc03303841b15c8f`; the main checkout was read only.

## Gunship, SOL and disco

The KORP alternates the source 2.6-second automatic bursts and 1.4-second rests. Its 25 mm uses the original 30 rounds/s heat rule; 40 mm uses 2.4 rounds/s, six-round magazines and 2.8-second reloads. `makeGunship`, `selectGun`, `stepGun`, `fireRound` and `stepRounds` own cadence and delayed arrival. Up to 128 visible rounds share an instanced draw. All rounds apply splash on arrival; one in three 25 mm impacts gets an explosion renderer to bound presentation cost.

SOL fires a 2.2-second pass every 3.4 seconds. Target selection uses Stalheart's `densestTarget`, sampling at most 48 candidate bodies while counting all neighbours. Orbital support now damages actual incoming enemies. Its target selection stays outside the circuit and clear of friendly units; this remains support spectacle without damaging race vehicles or the city.

Regular MK-9 drops occur every 12 seconds, using the original cargo socket, aircraft velocity, forward/side throw, 2.4-second unpowered fall and 1.8-second accelerating burn. Release and ignition retain the original sound keys.

At the arrival of the final disco song, the first three bombs are scheduled at party times **0.0, 0.8 and 1.6 seconds**. Each uses the original 4.2-second drop. Seven seconds after the third release, a second three-bomb volley starts, staggered by 0.8 seconds. These land farther beyond the gantry; the final mushroom cloud, blast radius and persistent scorch are **3× the linear size** of a normal celebration strike.

Blocked trajectories wait for a clear shot and try alternate positions in the hinterland. Any delay preserves the stagger and the seven-second interval. The gunship gradually moves its orbit toward the finish and climbs from 105 to 230 metres during the finale so distant shots clear the curved horizon, including when the human rover finishes far from the podium. The giant blast requires a 165-metre friendly clearance radius. The initial ISAO handoff faces the show; exploring never loses camera control.

The original mushroom-cloud effect runs at about 16 seconds, with scorch lasting 65 seconds. Nuclear capacity stays capped at four concurrent effects; when a newer cloud needs that slot, the oldest cloud retires while its ground scorch remains. The giant effect scales the existing geometry and particles rather than tripling their number. Regular drops pause during the first 18 seconds of the party. Pause freezes the shared race clock; restart clears missiles, beams, effects and salvo history.

## Hundreds of actual enemies

Waves queue 96 enemies across four lanes on both sides every 2.5 seconds. Admission is staggered across simulation steps. Default admission starts at 360 and can grow to 640. Stalheart's original `makeCrowdCap` / `stepCrowdCap` measures real unpaused frame intervals; only a populated, fast field earns growth. The lab targets roughly 60 Hz: growth below 18 ms, reduction above 23 ms, with a 160-body adaptive floor. The fixed 640 stress setting bypasses adaptation for an honest measurement.

Optimisations shared from Stalheart include the adaptive crowd policy, bounded candidate sampling, pooled missile models and its instanced explosion renderers. The lab also keeps its captured source Reed gait in a shared GPU animation texture, draws Reeds in two instanced distance tiers, caps full-detail nearby skins at 24, and culls off-camera bodies. All living enemies continue moving, targeting and taking damage when not drawn. Four Gorogoro retain their full original rolling solver.

A lab-specific spatial grid narrows convex collision queries; creature neighbourhoods are cached until they move or sinkhole solids change. Movement and combat run at 40 Hz with interpolated presentation. Wave queues, projectiles, transient audio and each effect class have explicit bounds.

## Validation

84 unit tests pass, including the Quiver's unlit fall, ignition, crest-only homing, faster dive, sphere conversion, bounded/resuming crowd queue, adaptive policy, spatial collision equivalence and exactly-once disco releases. Asset checks verify 180 pinned files and 168 parseable/resolvable modules.

The browser stress run reaches 640 bodies and checks all missile phases, substantial 25/40 mm fire, SOL strikes, all three simultaneous nuclear aftermath effects, paused clocks and complete reset cleanup. A full physical five-rover race also validates all gates and fills the three podiums with the larger battle running.

Measured in local desktop Chrome; these are samples, not a guarantee for another device:

| View | Living / visible Reeds* | Resolution | FPS | GPU time |
| --- | --- | --- | --- | --- |
| Track, fixed 640 cap | 621 / 329 | 1440×913 | 60.0 | 4.68 ms |
| Three disco strikes | 631 / 6 | 1440×913 | 60.0 | 3.53 ms |
| Three-strike aftermath | 583 / 7 | 2520×1597 | 60.0 | 8.55 ms |
| Dense battle | 629 / 449 | 2520×1597 | 60.0 | 10.62 ms |

*Living count includes Gorogoro; visible column counts the two Reed instance pools. Different views draw different portions of the same running battle. Frustum culling reduces drawing, not simulation population.

Reports: `artifacts/battle-browser-report.json`, `artifacts/battle-unit-tests.txt`, `artifacts/battle-check.txt`, `artifacts/battle-race-validation.txt`. Reproduce with `npm run test:battle`, `npm test`, `npm run check` and `npm run test:race`. The source import script is `scripts/import-battle-assets.mjs`.

Visuals: `artifacts/battle-disco-three-nukes.png`, `artifacts/battle-disco-retina-aftermath.png`, `artifacts/battle-640-track.png`, `artifacts/battle-640-retina.png`.

October 20 follow-up: `npm run test:boost-finale` verifies real Shift+W keyboard translation and gas use, both staggered volleys, the triple-size blast, pause and reset. Set `LAB_URL=http://localhost:8166/?mode=expedition` to run it in Base 2.
