# Race 2 — The Great Divide

Select **Race 2 · The great divide** in the mode menu, or open `?mode=expedition`. Race 1 remains at `?mode=race`.

The second race runs about **1.7 km including the podium approach**, roughly 2.7 times Race 1's length. It has **35 mandatory wheel-contact gates** and the same five-rover, three-podium finish rules.

1. **Base 1, reversed.** Start near the old finish approach, facing south. Every original course segment is driven in reverse, including the hairpins and existing Tremor crossings.
2. **The wilds.** An exposed dogleg and long acceleration straight pass through instanced basalt formations and enemy fronts. The Great Divide is a real **84 m wide sinkhole**, with intact launch and landing gates on opposite shores. No bridge or invisible floor crosses it. The amber rim beacons mark the crossing without floating labels.
3. **Base 2, Amber.** A separate 12-dome city uses rust-colored opaque shells and amber glazing, a different arrangement of building roles and bridges, its own hairpin and switchback circuit, and two more breaches. The elevated gantry and three podiums finish this circuit.

The race has 260 units of finite gas. Two visible service pads, before the canyon and at Base 2's entrance, refill after stopping for 1.2 seconds. AI drivers can use the same pads. Recovery retains its existing three-second penalty and repairs/refills at a safe position behind the last validated gate.

Both cities carry working sentries. Enemy waves cover both cities and the wilderness while sharing one global adaptive crowd budget. The orbital support follows the human racer's region, and the finish's three nuclear strikes move with the Base 2 celebration. The boss's later appearances can occur at either city or in the wilds.

## Persistent Nih-Dairia remains

The boss now collapses using the original Stalheart solver and death gravity. After 1.5 seconds it transitions into Stalheart's actual `createRemains` system. The carcass remains for **60 seconds**, fading during the last five, and stays vulnerable to subsequent impacts:

- Multi-hit limb segments darken, sever and fling away.
- Detached limb runs hop, settle and crumble from the tips.
- The core cracks into separate chunks after enough damage.
- Gunship rounds, explosive sentry impacts and orbital blast hits reach the carcass. Nearby fighting can continue to take it apart.

The original carcass geometry builder, destruction rules and tuning are imported unchanged and hash-pinned. The source game's files are unchanged. This retains Stalheart's effect-based debris physics; it does not add solid limb obstacles to the race track.

## Validation and performance

- `npm test`: 121 tests passed, including course reversal, grid separation, real canyon ground, mixed enemy fronts, longer corpse retention, hit forwarding and AI service-pad stopping/refill/resumption.
- `npm run test:remains`: actual source geometry transition, repeated shell impacts severing three of six limbs, persistent remains after 17 seconds, nuclear core cracking and restart cleanup; no browser errors.
- `npm run test:expedition`: full rendered course with city/flag/sinkhole collisions and the battle running. Three rivals validated all 35 gates and claimed the podiums in **454.75 simulated seconds**. No browser errors.
- Physical service-pad check restored a depleted human reserve to 260 without a recovery penalty. A powered human jump cleared the canyon's far rim without a bounds penalty; landing and gate validation still require controlling the rover.
- `node scripts/expedition-performance.mjs`: at 1440×913, DPR 1, fixed 640 crowd cap, both sampled views held **60 FPS**. Canyon: **609 live enemies**, 16.7 ms p95, 5.2 ms simulation, 5.3 ms render submission and 3.85 ms GPU. Base 2: **547 live enemies**, 16.8 ms p95, 4.9 ms simulation, 5.6 ms render submission and 3.11 ms GPU.

Terrain cutouts now skip distant holes before expensive spherical projection. The road and start grid use course data; city LOD/culling, instanced wilderness rocks, shared creature pools and the existing crowd cap bound the expanded scene's cost. Measurements describe these views, not a frame-rate guarantee at every resolution.
