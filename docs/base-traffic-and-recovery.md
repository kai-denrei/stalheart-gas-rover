# Recovery, NEEDLE and base traffic

The standalone lab now reserves free recovery spaces, restores NEEDLE's sniper presentation, adds the automated SOL-88 alongside SOL-82, runs periodic SH02 traffic at a HUGIN pad, and mixes six clear with six opaque domes.

## Recovery

The search starts at the last validated gate, tries progressively farther positions behind it, and can search earlier checkpoints without changing gate progress. It checks the whole footprint against course limits and sinkhole support, the chassis against scenery, and a 6.5 m separation from every other rover, including rovers already serving a recovery penalty. A short velocity projection also rejects an approaching rover's space. Recoveries processed in the same tick see the spaces already reserved by earlier recoveries.

The same check runs when the three-second penalty expires. If the space has become occupied, the rover moves to another free spot. If no checked spot is available, it waits out of the collision/render loop and retries at four Hz; the HUD explains the wait. There is no unchecked fallback, added penalty, or loss of validated gates or earned stunt points. Recovery cancels an unfinished stunt chain.

## NEEDLE

The previous integration treated NEEDLE as a faint, short beam. It now uses Stalheart's `SENTRY_FX.needle`: a 9 px tracer with eight trailing points, its flash/spark muzzle burst, spark/flash/debris impact, original recoil and `needle_fire.mp3`. Damage remains immediate hitscan, one shot per reload, with preference for hard targets. The visible tracer travels independently of damage, as in the source weapon contract.

Blocked targets are temporarily excluded from selection, instead of repeatedly reacquiring the same hidden target. Friendly rovers also prevent a shot and cause a brief target exclusion. Both obstruction checks still apply before damage.

## SOL-88

The actual `sol88_platform_game.glb` is a second orbital laser platform, independent of the existing SOL-82 and Gunship. It plays its idle, convergence, aperture, firing and recovery clips. The source `domain/orbital-laser.js` owns its pass, energy, acceleration-limited spherical aiming and contact burn rules; `domain/laser-auto.js` selects the densest safe enemy cluster.

For the lab, the first pass arrives after seven seconds of racing, then repeats every 55 seconds. It retains the game's 30-second overhead window, 15 seconds of beam energy, 8 m footprint, three-second pre-fire delay, 0.6-second retarget interval and safety margin. Rovers, ISAO and structures exclude nearby targets, and the current beam contact is checked before every burn. The spherical state is translated through the lab planet's center. Both SOL adapters pass actual vectors to the effect’s placement methods; the older SOL-82 adapter passed arrays, producing invalid beam endpoints. The browser check now verifies finite endpoints and contact-glow scales for both platforms. The original laser effect supplies the beam, glowing ground contact, smoke and persistent scorch trail. Soft enemies die on contact; Red Core bodies require the original sustained hard-target burn.

## HUGIN / SH02

The HUGIN launchpad stands inside the city at course coordinates (40, 235), away from the driving route. Its bundled parked booster and cargo are hidden so they do not duplicate the incoming SH02. The SH02 uses the original intro's landing timeline and authored `Legs_Deploy`, `Landing_Shock` and `Top_Door_Open` clips, with the original six-engine plume shader, touchdown dust, scorch and rocket/pneumatic sounds.

Traffic begins after twelve seconds of racing and repeats every seventy seconds. After landing the rocket stays for fourteen seconds, closes its door, ignites, climbs away over seven seconds and retracts its legs with the authored departure clips. This departure schedule is lab-specific; the descent and landing are the intro's source sequence. The source story's separate ISAO emergence and recycling cut are not part of the traffic loop. Static rocket pieces are merged within their animated joints; the pad's static pieces are merged by material. Dust and sound loops are released when finished. Pause and restart stop/reset the sequence.

## Dome materials and detail levels

Six sites have clear cyan glazing; six have opaque ceramic shells. The near-tier shell already has its own mesh. In LOD2 the shell was merged into BODY with an empty SHELL node. `dome-glazing.js` separates the 144 authored ellipsoid triangles (14 m radial axes, 12 m vertical axis, 1.4 m base) into their own mesh without deleting structural triangles. Both tiers then receive the same per-site material. Existing clipped entrance openings remain applied to both shells and bodies. Glass uses one transparent pass without transmission/refraction rendering.

## Provenance and validation

Thirteen additional unchanged files from Stalheart revision `5c36b5a13b5ca72532396c5cdc03303841b15c8f` are pinned in `assets.lock.json`: models, audio, source landing and laser rules, impact recipes and plume shader. Model credit remains **jelaludo**; inherited plume attribution remains in `upstream/stalheart/ATTRIBUTIONS.md`. The main Stalheart checkout is used only as a source.

- `npm test`: 110 tests, including simultaneous recovery, occupied release, blocked queue/retry, NEEDLE obstruction/damage/reload, automatic-laser safety, traffic cycle and all six far-tier shell separations.
- `npm run check`: 201 pinned files verified; local modules parse and resolve.
- `npm run test:base`: actual loaded rigs, NEEDLE muzzle/tracer/recoil/damage, both dome tiers, SOL-88 kills/scorch, SH02 landing/takeoff/repeat, recovery with rendered scenery and clean restart.
- Browser stress sample: 435 live enemies, about 60 FPS at 1440 × 913 and 1× DPR; 4.16 ms GPU and 598 draw calls, no runtime or shader errors. This is a local Chrome sample, not a guarantee on every machine or camera view. Captures taken during accelerated simulation are not FPS benchmarks.

Local evidence: `artifacts/base-update-browser-report.json`, `hugin-sh02-landed.png`, `sh02-takeoff.png`, `needle-shot-restored.png` and `base-update-performance.png`.

Full rendered race regression also passed: all fourteen gates validated and three podium owners secured in 242.64 simulated seconds, with no browser errors.
