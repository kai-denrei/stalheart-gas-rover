# Race 01 — The Last Leap

Open **http://localhost:8166/?mode=race**, or choose **Race · The last leap** in the mode selector. This is an independent mode inside the standalone rover lab. The main Stalheart checkout is not modified.

## Course and controls

One player competes against four physical AI rovers: orange Ember, blue Cobalt, purple Orchid and yellow Solar. Each has a small top-speed/lift variation; everyone starts with 160 units of finite gas and stabilized flight assistance. The existing cyan thrust, orange speed and rear gas displays remain on each rover.

The course has straights, right-angle corners, two tight hairpins, seven solid rock barriers and four real Stalheart sinkholes. Road arrows and the minimap show the direction. Each mandatory gate is marked by a matching pair of animated CTF flags from [jelaludo’s flag kit](https://jelaludo.github.io/SentryTowers_A6/ctf-flags/). Six designs alternate along the course. Ember (火) and Vanguard (力) use plain red and blue fabric with their insignia geometry removed; Eclipse, Helix, Horizon and Void retain their original marks. The numbered contact strip between the flags is cyan for the active gate and green for passed gates. The sky, planet, rover rig, boosters, steering, suspension and collision assets are reused locally.

- **W/S:** accelerate / brake then reverse; forward/backward jets in flight.
- **A/D:** steer; lateral jets in flight.
- **Shift:** rear handbrake. Hold while steering to drift; release to regain grip. Hold without throttle to stop.
- **Space:** boost. Gravity brings the rover down when released.
- **Arrow keys / Q/E:** pitch, yaw and roll corrections.
- **R:** recover to the last validated gate, refill, and wait three seconds.
- **P:** pause; **V:** camera; mouse drag/scroll changes the view.
- **Restart race:** reset all five rovers and start a shared five-second countdown.

Gates must be crossed **in order between the flags**, on the ground or airborne. Swept validation catches fast crossings; there is no altitude ceiling. Return through a missed gate; the next gate remains cyan until then. Crossing the last gate validates the course but does not finish the race.

Leaving the 18 m wide road corridor for more than 0.7 seconds triggers a three-second recovery at the last validated gate. Falling into a throat, a severe crash or overturning uses the same recovery. Checkpoint progress is preserved; gas is replenished. AI recovery from exhausted gas or being stuck also incurs this penalty. The same recovery is available to the player with R. The platform approach broadens to the deck footprint.

## Raised finish

The finish is a solid 64 × 68 m platform, 6.5 m above the surface, with no ramp. Boost over the lip and land on top. All fourteen gates must be validated before claiming a spot.

The three solid podiums rise 2.4 m, 1.6 m and 0.8 m above the deck for #1, #2 and #3. The authentic Terraformer 3000 / Stalheart gantry stands inside the platform. Its rails and pillars are solid, with the central area open to rovers.

The three circles open sequentially: **#1**, then **#2**, then **#3**. Fully stop with the entire rover footprint inside the open 4.8 m radius circle for **1.25 seconds**. The solver permits less than 0.12 m/s linear motion and 0.12 rad/s rotation as its stationary tolerance. Movement or leaving the circle resets the hold.

A protective bubble appears as soon as the stationary claim begins. It pushes overlapping rivals outward and keeps the claimant protected from rover contact. An interrupted claim loses its bubble. A completed claim permanently owns that spot and freezes the winner inside its shield. Once all three spots are claimed, the race ends; the remaining two rovers receive DNF. Finished players can watch the other competitors until the last spot is claimed.

## Implementation and validation

`race-world.js` defines the course and rules; `race.js` owns countdown, checkpoints, recovery, rover contacts and podium arbitration. `race-ai.js` steers and meters boosts through the same simulation commands as the player. It does not teleport rivals forward or award skipped gates. `race-render.js` shares the GLB geometry and texture across cloned, recolored rigs; every rover uses the existing 120 Hz simulation/render interpolation. `race-flags.js` loads the pinned local flag assets, gives each fabric its own animated skeleton, and batches static pole/base geometry by material to keep draw calls down. Flag animation follows the interpolated race clock and freezes when paused. `race-hud.js` supplies standings, checkpoint progress and the course map.

This is a first racing prototype using the lab's custom low-gravity vehicle physics. Rivals can collide, overshoot, recover, and compete awkwardly for the small landing spot. Recoveries and the AI controller are intentionally visible parts of the experiment; laps, difficulty levels and opponents with combat behavior are future work.

Race tuning is fixed so the competition is consistent. Camera, resolution, particles, sound and diagnostics remain adjustable. Switch to Proving ground for the full physics tuning controls.

```sh
npm test                 # simulation, interpolation, collision and race-rule tests
npm run check            # pinned assets, syntax and imports
npm run test:browser     # existing proving-ground browser acceptance
npm run test:race        # five models, keyboard, full AI race, podium and restart
```

The race browser check uses the actual rendered sinkhole collision geometry and runs the AI until three distinct racers claim the podium. Reports and screenshots are in `artifacts/race-browser-run.json`, `race-grid.png`, `race-podium.png` and `race-performance.json`. Deterministic rule tests also cover missing/out-of-order gates, airborne gate crossings, boundary grace, interrupted claims, partial footprint rejection, overlapping rival displacement and player ID zero ownership.

## Persistent rover damage

All five rovers accumulate localized collision and landing damage. D1 is cosmetic; D2 reduces wheel grip/steering or thruster authority; D3 disables the part. Repeated severe hits can destroy the core. Damage survives gate validation. R or automatic wreck recovery repairs at the last gate with the existing three-second penalty. An unrecovered wreck cannot claim a podium. The HUD shows remaining steering and thrust capacity.

## Dome city, live tremors and the podium disco

The course now runs between twelve domes using all six roles from [Dome City](https://jelaludo.github.io/SentryTowers_A6/dome-city/). The lab adapts their layout to the existing racing line and spherical planet. Elevated bridges join the safe connections; connections whose support feet would obstruct the road are omitted. Domes, masts, bridge floors and individual supports have conservative solid proxies. Bridge underpasses remain open. Buildings share geometry/materials, switch between LOD1 and LOD2 at 90/110 m with hysteresis, and cast no additional shadows. The imported city machinery and demonstration railguns are omitted.

Jumps 2 and 4 begin as continuous solid ground. The first rover within 34 m and below 20 m altitude triggers a 1.2-second tremor warning: vibrating amber fractures, quake audio, a map warning and a HUD call. The original Stalheart breach effect then opens the hole over about two seconds, including its short cast lead-in. Its live radius drives both terrain physics and road/ground shader cutouts. Settled rubble becomes solid. All competitors share the same opening; recovery preserves it, while **Restart race** closes it and removes its rubble colliders. Jumps 1 and 3 are already open.

The third podium claim freezes results and starts the **43.8-second day-42 celebration**. The camera reveals the podium, the original disco ball hangs from the actual Stalheart gantry’s animated extrusion tip, and its named pivots use Stalheart's original celebration choreography. Two original LANCER T1 sentries turn their yaw/pitch joints and shoot decorative laser beams from their actual muzzle sockets toward the moving ball. Colored beams and floor dots provide the party lighting without extra dynamic lights, shadow passes or postprocessing.

The exact `day_42_music.mp3` from the main Stalheart checkout plays once. **P**, help, or losing focus pauses the celebration and its music; resume seeks to the current celebration time. Volume uses the existing lab control. At 43.8 seconds the music and lasers stop, leaving the podium and results visible. Restart clears the entire celebration. Assets and audio are loaded before Start; the main Stalheart checkout remains unchanged.

`race-city.js`, `race-hazards.js` and `race-celebration.js` own these additions. Exact local copies and hashes are recorded in `docs/assets.lock.json`: city commit `7466a4a15ecd6b520dc405316cbeaa58a4e211a2`, Stalheart celebration source revision `5c36b5a13b5ca72532396c5cdc03303841b15c8f`. Models by jelaludo; day-42 music is the owner's supplied track already present in Stalheart.

Run `npm run test:city` for browser checks of visible warning/opening, shared physical/render radius, collider resets, LODs, LANCER aiming, music play/pause/end, and matched-camera city rendering costs. Evidence: `artifacts/city-browser-report.json` and `artifacts/city-*.png`. Full physical race completion remains covered by `npm run test:race`. Browser FPS measurements describe the tested desktop/headless viewport, not a phone performance guarantee.


## Rear-wheel drift and player claims

Shift brakes the rear wheels and reduces rear lateral grip while the front axle retains bite. Countersteer during the slide and release Shift to recover traction; bounded rear tyre marks show the path. This applies in driving and racing. Kick-Flip mode retains Q/E as its airborne trick control.

The claim regression exposed a slightly off-center physical landing whose wheels appeared inside the old ring while the full bumper footprint was outside it. Wider 4.8 m rings fit the new 10 m square podiums; the entire rover still has to fit. Static wheel support now holds a resting rover without tiny contact-bias velocities repeatedly interrupting the 1.25-second hold. Input, external impulses and lost wheel support wake it again. Close to the finish, the HUD identifies the next missing gate, wrong podium, incomplete landing, movement or footprint problem. Every gate is still mandatory. Player-ID-zero ownership is tested through real falling/landing/stopping physics on all three tiers and in the browser.

## Light city defense

Twelve working dome-mounted sentries alternate authentic Rotor T1 and LANCER T1 assets from the main game. Their canonical yaw, pitch, rotor and muzzle nodes are retained; rigid geometry is batched within each joint. Rotors fire three-round bursts then reload; LANCERs fire slower, stronger beams. Target selection runs at 10 Hz, movement at 20 Hz, and creature presentation interpolates between steps. Line-of-fire clipping prevents shots through building/bridge/podium proxies, the sphere, or a rover. Shots deduct health, visibly hit, and kill enemies; this is not a canned firing loop.

Three small Reeds enter from alternating sides every eight seconds, capped at 18 total live/dying bodies. Most are intercepted; some reach the track shoulders or cross nearby. A moving rover can run over these small soft enemies. Creatures avoid solid proxies, fall into open throats, and retire at the end of their path or after a bounded lifetime. Dead bodies collapse and disappear. Pause freezes the system; race completion stops combat; restart clears all enemies and shots.

The Reed surface and its exposed tetrahedral distance mesh come from Stalheart’s actual `reed.json` / `reed.bin` assets, with the source license retained. This background adaptation uses instanced geometry and a lightweight shader gait, **not** the full soft-body solver. No transmission pass, new lights or shadow maps. The Stalheart gantry uses the articulated 10-draw LOD1 asset. New copies are hashed in the existing asset lock.

Validation commands: `npm run test:drift` (real Shift/W/D input and tyre marks), `npm run test:expansion` (physical human claim, gantry hook, working guns and waves), plus existing full-race/city/damage/trick checks. Reports and images are in `artifacts/drift-browser-report.json`, `artifacts/expansion-browser-report.json`, `artifacts/expansion-*.png`, and the usual race performance files.

Next stage requested by the owner: heavier enemies and distant Gunship/SOL support. The current pass contains only small Reed streams and dome sentries.

## Race readability update

The Great Divide black-hole formation keeps its compass bearing and is raised above Base 2’s local horizon to frame the finish gantry. Decorative direction chevrons and leftover proving-ground runway strips are removed from races; kerbs, flags and service pads remain.

The five-light start sequence and beeps use the physical board only, without a duplicate countdown HUD. Recovery displays a large `PENALTY 3`, `2`, `1` with its reason. The duration remains three seconds.

Damaging rover–alien contacts produce red envelopes around both bodies plus a short expanding contact ring. The effect is capped at 16 simultaneous impacts, uses two instanced batches, and follows the existing contact cooldown. Actual impulse recoil remains mass-dependent; killed small bodies carry their knockback briefly before settling.
