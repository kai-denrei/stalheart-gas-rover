# Finish layout, perimeter battery, start lights and rover contacts

Open http://localhost:8166/?mode=race and refresh. This update is confined to the separate rover lab.

## Finish layout

The cylinders now form a shallow triangle. Relative to the deck centre, #1 is at (0, -25), #2 at (-11, -16), and #3 at (11, -16): #1 is nine metres nearer the incoming racers. Existing heights, five-metre radii, stationary whole-rover claim, sequential places and protective bubbles remain. Both rear cylinders clear the inner gantry rails by two metres. The bubbles do not overlap. AI pilots approach the rear places from the sides to avoid the occupied #1 bubble.

## Ground protection

Sixteen additional Sentries stand on low ground pads alongside the deck, eight per side, forty metres east/west of its centre. Every other emplacement is a Rotor. The intervening emplacements cover the full Stalheart roster: Plasma, Quiver, Relay, Mortar, Lancer, Needle and Heptapod (plus a second Plasma). Combined with the twelve dome guns, there are 28 combat emplacements. The two disco Lancers retain their celebration role.

The five newly required T1 GLBs are local copies from `/Users/minikai/Dev/stalheart/assets/models/sentries/`, with their source revision and SHA-256 hashes recorded in `assets.lock.json`. Existing models, authored pivots, shared aiming/recoil rules, firing cadence, missile controller and effects are reused. Ground models are batched by articulated joint, as with the dome guns.

- Rotor: spinning barrels, lead, subdivided fire and heat.
- Plasma / Lancer: sustained beams, with their source hold durations.
- Quiver: existing eject/drop/ignite/climb/dive flight.
- Relay: fixed mast, slowing nearby living enemies; a visible pulse indicates its field.
- Mortar: steep ballistic arc, correctly elevated barrel and splash impact.
- Needle: precise instantaneous damage, short narrow beam; prioritizes Gorogoro when acquiring targets.
- Heptapod: stationary defence role, cycling launch sockets and the source hook missile profile.

The lab adapts ranges and damage to its metre-scale enemies. Projectile collision and beam obstruction keep buildings and racers in the line-of-fire checks; new shell/missile impacts reuse the bounded explosion pools. These are active defenders, not decorative firing loops.

## Start sequence

The race now waits five seconds. At t=0, 1, 2, 3 and 4, one additional red light illuminates and a 1,000 Hz square-wave beep lasts 150 ms. At t=5 all five become green and a distinct 1,500 Hz / 350 ms GO tone releases every rover together. Short gain ramps avoid audio clicks.

An imported A6 Beacon housing is reshaped into a portrait start tower beside the grid. Five physical lamps match a compact HUD repeater. Audio is synthesized locally through the existing master volume; no sound download is required. The first beep is invoked directly from the start gesture; subsequent steps follow simulation time. Pause/help/blur freeze the sequence and silence active voices. Resume continues the current sequence without replaying earlier beeps; restart begins again. Green remains visible for two seconds. No late backlog of beeps is played after a diagnostic time skip.

## Rover contact mechanics

The former three-sphere approximation is replaced by a 2.46 × 1.68 × 4.8 m oriented hull, following actual yaw, pitch and roll. Separating-axis tests select the collision normal; clipped face contact points resolve bumper and side collisions. A ten-iteration impulse solver transfers linear/angular momentum, applies small restitution only to moving impacts, and limits sliding friction by the contact force. Position correction removes overlap without adding kinetic energy.

Fast movement uses a bounded swept-pose check between fixed 120 Hz ticks. Airborne rovers can physically strike or land on rivals. Side-swipes generate yaw/roll instead of pushing through large invisible spheres. A collision ends both unfinished stunt chains; earned points remain. Existing zoned damage, impact sounds, recovery and protected podium claims are retained. This is a single hull approximation, not deformable bodywork or individual tyre-to-tyre contact.

## Validation

- `npm test`: 102 passing tests, including momentum/energy, glancing friction, resting separation, airborne and swept impacts, interrupted tricks, five-light timing, eight-family placement, functioning new attacks and landing/claiming all tiers.
- `npm run check`: pinned assets and module syntax/import checks.
- `npm run test:race`: fully rendered race completed all 14 gates and three physical claims, in about 207 simulated seconds, without browser errors.
- `npm run test:finish`: real-time audio/light sequence, pause, ground rig placement, live shots from all seven weapon families plus Relay slowing, human front-podium landing and dense-battle performance. See `../artifacts/finish-update-browser-report.json`.

The final finish-area stress run sustained about 60 FPS with 533 live enemies at 2520×1597 (1.75×); GPU time was approximately 7.39 ms. Results are from this machine/headless Chrome; the live HUD continues to report interactive FPS and GPU timing.
