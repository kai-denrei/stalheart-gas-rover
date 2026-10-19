# Stalheart rover lab — agreed specification

Status: agreed direction, planning only. Recorded 2026-10-18. Implementation sequence: [rover-lab-plan.md](rover-lab-plan.md).

## Purpose and first scope

Build a standalone 3D movement lab using Stalheart's planet language and the R-47X reconnaissance rover. The main pleasure is driving toward an obstacle, briefly becoming airborne through booster bursts, correcting the trajectory and attitude, and cushioning the landing. Jumping one sinkhole should make the player want to turn around and jump it again.

The first playable scope is ground driving, short boosted flights, obstacles, sinkhole crossings, recoverable bowl slips, gas management, and quick resets. The lab is separate from the main game. Surveying and returning remain a possible mission structure after traversal feels good. Enemy evasion with Nih-Dairia or Reeds, cave/platform exploration, rover racing, game integration, and a phone port are later directions, not initial requirements.

## World and assets

- Reuse the Stalheart spherical grid, planet scale, and visual language. A separate lab recipe may create different terrain and a large open proving ground; the exact story topology need not be preserved.
- Begin with one sinkhole and two pads. Extend into a broad area containing a forgiving straight crossing, an offset landing requiring sideways correction, a shallow bowl for recovery practice, rock obstacles, and open driving space. Roughly 500 m across is an initial layout proposal, not a fixed dimension.
- Reuse the actual Stalheart sinkhole rim, bowl, throat, textures, and opening effects. Rover contact must follow the visible terrain. Shader clipping alone does not remove physical ground; the inner throat must allow a fall.
- Use the actual R-47X game GLB, preserving its industrial silhouette, authored pivots, and sockets. Its six wheels, eight thrusters, and four tanks present one shared gameplay gas reserve.
- Keep all required code/assets local to this standalone project, with provenance and immutable hashes. Runtime must not depend on the sibling checkout or mutable remote asset URLs. Use one compatible Three.js version throughout.

## Motion and input

Keyboard and mouse are primary. Keep command semantics independent of key bindings so a later touch experiment can reuse the movement model.

Translation and rotation are separate: translation moves the rover up, forward/backward, or sideways; rotation changes pitch, roll, and yaw. Gravity points toward the planet centre. Local up follows the planetary surface, while actual thrust follows the rover's nozzle orientation. Gravity causes descent; there is no dedicated downward thrust command. Releasing a thruster removes its force, not the rover's momentum.

| Input | Grounded | Airborne |
| --- | --- | --- |
| W / S | Accelerate / brake, then reverse | Forward / backward thrust |
| A / D | Steer | Left / right thrust |
| Space | Upward boost | Upward boost to gain height or slow descent |
| Arrow keys | No flight command | Pitch and yaw |
| Q / E | No flight command | Roll |
| Mouse drag / wheel | Orbit camera / adjust distance | Same |
| R | Reset to last pad | Same |

Taps produce short bursts; holding sustains thrust and spends gas. Arrow directions, rotation signs, grounded/airborne transition handling, and controller mixing are implementation details to test. Preserve continuity through partial wheel contact so controls do not flicker at the rim. Do not inherit the old 2D prototype's pattern-selection controls, free reaction wheel, or 2.5-second burst cap by accident.

Three assistance settings share the same physical capabilities:

| Setting | Behaviour |
| --- | --- |
| Stabilized | Automatically levels the rover and damps rotation; the player controls movement and landing thrust. |
| Assisted | The player controls pitch, roll, and yaw; releasing rotation input arrests unwanted spin. |
| Manual | No automatic stabilization; counter-bursts arrest rotation. |

Assistance operates the thrusters, consumes gas, and gives visible feedback. It must respect available force/torque rather than teleporting the orientation. Stabilized is the initial default. Exact gains and authority limits remain unvalidated tuning.

## Gas, recovery, and reset

Finite mode has one shared reserve and refill pads. Player and assistance thrust both consume it; empty means no further gas thrust. Wheel driving remains available when the rover has ground contact.

The **unlimited refill** lab toggle keeps practice possible while retaining a clearly separate normal-reserve accounting value. Show where and when that nominal reserve first would have emptied, even though practice thrust continues. For a useful experiment, retain that marker until the next legitimate refill-pad visit or reset; repeated unlimited refills must not erase it. This records expenditure on the actual practice trajectory, not a prediction of the route the rover would have followed without gas. The exact toggle transition behaviour is an implementation proposal to document before coding.

A missed jump can become a bowl slide followed by a scramble or boost back out. Crossing the rim is not immediate failure. Falling irretrievably into the throat or wrecking the rover resets to the last pad; R allows a voluntary reset. Wreck criteria and safe touchdown thresholds require playtesting. A damage simulation or authored destruction models are not required for this slice.

## View, feedback, and feel

Third-person chase is the main view. Follow the local horizon without inheriting every chassis roll, preserving orientation during flight and tumbles. Optional orbit, overhead, and rover-mounted views support lab inspection. Camera switching must not affect physics.

Prioritize weight on the wheels, a sharp and readable kick per burst, persistent airborne momentum, and visible touchdown compression. Plumes and sound should reflect actual firing, including assistance. The landing should be readable from the main camera; a ground shadow and modest landing aid are initial presentation proposals.

Keep essential feedback legible: current gas, unlimited status, nominal exhaustion marker, assistance mode, and reset help. Speed, vertical speed, altitude, attitude, contact state, and per-thruster output belong in an optional diagnostic view. Gravity, thrust, capacity, assistance, and sinkhole size should be tunable in the lab, with defaults restorable.

## Success gates

1. The player can drive, jump the first sinkhole, correct sideways, and land using the primary camera and keyboard.
2. A bad approach can produce a readable, recoverable bowl slip; falling through the throat gives a prompt clean reset.
3. Brief taps and sustained burns feel distinct. Attitude and translation remain understandable in each assistance mode.
4. Finite gas changes decisions. Unlimited practice reveals nominal exhaustion without interrupting the run.
5. Terrain contact agrees with the visible rim and bowl; frame rate and camera choice do not materially change the manoeuvre.
6. Human playtesting finds repeated crossings enjoyable before adding missions, enemies, or more content. Automated checks cannot establish this gate.

## Source record and constraints

| Source | Confirmed facts / integration limits |
| --- | --- |
| [Original cold-gas notes](../Cold-gas%20rover.md) | Inspiration for scarce gas, pad refills, and careful landing. Its 2D controls, ten-thruster description, 300 bar tank, 3 m/s landing speed and 8° angle are not approved 3D tuning. |
| Stalheart `src/content/story-defaults.js`, `assets/story/planet.bin`, `docs/kernel-provenance.json` in `/Users/minikai/Dev/stalheart` | Story recipe uses nominal 10 m cells and 4 m walls; radius is approximately 753 m. Reuse scale/grid, author lab terrain separately. Kernel commit is `1900c9ddcad99cc7004fe423d89dd812e6589efc`. |
| Stalheart `src/core/sinkhole-shape.js`, `src/sinkhole-terrain.js`, `src/sinkhole.js`, `src/game-breaches.js`, `docs/SINKHOLE.md` | Shared irregular boundary and bowl sampler exist. The throat uses a deep sentinel height; new rover collision must represent a real opening and recoverable bowl. Existing creature motion is not a rover physics solution. |
| [R-47X viewer](https://jelaludo.github.io/SentryTowers_A6/recon-rover/) and [asset contract](https://jelaludo.github.io/SentryTowers_A6/assets/recon-rover/README.md) | LOD1: 5,508 triangles, nine draw calls, 381,172 plain bytes. Metres, +Y up, +Z forward. Game pivots group wheels/suspension by side and thrusters by cluster; independent wheel articulation needs asset work. LOD2 keeps lookup nodes but merges into a static body. |

The viewer's scripted jump is presentation, not reusable vehicle physics. Eight nozzles and named gimbals do not establish full translational and rotational authority: inspect actual transforms and bounds before choosing the thruster mixer. No gravity, mass, thrust, gas capacity, speed, landing tolerance, performance target, or suspension values have been approved as final.
