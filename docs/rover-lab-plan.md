# Stalheart rover lab — implementation plan

Status: documentation only, 2026-10-18. Product scope and controls are in [the agreed specification](rover-lab-spec.md). This plan proposes engineering choices and gates; it does not claim a working prototype or validated physical tuning.

## Slice 0 — freeze sources and settle the physical contract

1. Inventory the smallest reusable Stalheart planet/grid, surface, sinkhole, rendering, and audio dependencies. Read their contracts before copying. Keep the sibling game untouched.
2. Vendor the needed source/assets locally, preserving licences and recording source paths, revisions, byte hashes, and any local adaptations. Use Stalheart's single vendored Three r160 and compatible loaders, not the rover viewer's application shell or another Three instance.
3. Inspect the actual LOD1 GLB and manifest: bounds, body centre, wheel contact locations, socket transforms, exhaust directions, gimbal axes/ranges, preserved node names. Disable the scripted jump displacement; simulation owns the chassis pose.
4. Build a force/torque authority table. For each nozzle, inspect thrust direction and moment arm about the proposed centre of mass. Confirm the desired up/forward/back/sideways forces and pitch/roll/yaw torques are achievable, including paired commands and assistance. If not, record the smallest model/gimbal or controller approximation needed; do not silently promise arbitrary six-axis motion from the existing geometry.
5. Choose the simplest contact solver that can support a rigid chassis, wheel support/suspension, sliding bowl contact, airborne impacts, and a genuine throat opening. A fixed-step rigid body with suspension contact probes is a candidate, not a settled library choice. Wheel probes alone do not protect the chassis from rim/rock impacts.

**Gate:** standalone asset loading has no sibling filesystem or mutable CDN dependency; one Three instance is used; all required pivots resolve; metre scale and force directions have an inspectable diagnostic. Contact and thruster choices are documented before flight tuning.

Provenance starting points:

- Observed clean Stalheart checkout: `9b253a412ccbf885d573adb2d6436f2fc055cb93`. Record the actual files transferred, including inherited kernel and sinkhole provenance.
- Verified R-47X revision: `1abaa099e36f4bbf206746499e31c548c82239a1`; `assets/recon-rover/lod1/r47x_recon_rover_d0_lod1.glb`, 381,172 bytes, SHA-256 `a1a43313fd23952d20de73e412cd216ef658e6cdc86dd6147497abb4e63aa081`, matching its pinned manifest. Record this in the local asset lock when importing. `ASSET-LICENSE.md` permits model/animation reuse and modification with jelaludo attribution; retain third-party licences. The public viewer is a reference, not a runtime dependency.
- Sinkhole provenance: `docs/sinkhole-assets.lock.json`; audio provenance: `docs/breach-audio.lock.json`. Retain required upstream attribution.

## Slice 1 — drive on the curved world

Create a minimal local browser host with the lab planet recipe, one rover, a starting pad, and open terrain. Reuse the grid/visual language while clearing sufficient room for traversal. Keep geometry and collision queries in one metre-based world contract.

Proposed code boundaries are input commands, fixed-step vehicle simulation, terrain queries, thruster allocation, gas accounting, rover presentation, camera, and lab controls. These are responsibilities, not a requirement to create a framework. Use a reproducible seed/config and bounded telemetry.

Implement acceleration, braking/reverse, steering, radial gravity, grounded contact, a chassis collider, and visual suspension driven from measured contact. Use the grouped left/right pivots honestly; independent wheel movement is not implied by independent contact samples. Third-person chase follows local up and includes obstruction handling. Provide reset and neutralize held keys on blur/pause to prevent stuck commands.

**Gate:** the rover rests without creeping or sinking, drives and stops on the sphere, meets rocks physically, and resets with zero stale velocity/input/audio. Traversing the test area does not flip the camera frame. Normal variations in render rate do not change stopping or support materially.

## Slice 2 — the first jump, correction, and landing

Add actual thrust forces and torques with the agreed keyboard mapping. Stabilized mode is the first usable configuration; add Assisted and Manual through the same controller boundary. Build smooth grounded/airborne command transitions and explicit arbitration between player rotation and leveling.

Use small observable bursts, gas-proportional plumes/audio, shadow/contact cues, and suspension compression. Tune gravity, thrust-to-weight ratio, angular response, grip, and damping together on a short jump between pads. Physical tuning remains lab data. Verify counter-bursts work instead of hiding residual spin with render-only leveling.

**Gate:** a short tap causes measurable lift; releasing preserves momentum; sustained boost differs clearly; lateral and forward corrections work; pitch/roll/yaw respond with expected signs. Gravity brings the rover down and upward boost cushions it. All assistance modes are distinguishable and obey the same actuator limits. The user can repeat a jump without fighting the camera.

## Slice 3 — one real sinkhole

Adapt the Stalheart boundary, bowl, and throat into the planet frame. The same opening state, scale, orientation, and shape parameters must drive the visible floor cut, bowl mesh, and contact queries. The throat's deep sentinel must not become a flat catch floor. Include chassis collision and adequate stepping/sweeps to prevent tunnelling at rims and rocks.

Begin with a settled hole for repeated movement tuning. Then restore the opening sequence and its existing audio/effects, validating collision transition timing. Do not inherit creature spawns, campaign camera shots, navigation mutations, or game progression from the wrapper.

Place two pads for a forgiving crossing and give the bowl a recoverable approach. Add fall/reset and configurable wreck thresholds. No immediate failure at rim entry; reserve enough room and thrust to demonstrate an escape.

**Gate:** inspect contact at multiple angles around the irregular rim, on the sloped bowl, and at the throat. A slow slide can be recovered; a deep fall resets. There is no invisible floor spanning the opening, no visible-ground fall-through, and no camera seizure from the source game's cinematic logic. Opening, restart, and disposal clean up effects and sound.

## Slice 4 — finite gas and useful unlimited practice

Track shared gas consumption from actual firing, including stabilization. Add pad refill and nominal capacity. Proposed pad eligibility is a supported, settled rover inside the pad footprint; tune the speed/tilt limits rather than importing the 2D reference numbers.

Implement finite and unlimited-refill modes with separate actual availability and nominal reserve accounting. Proposed semantics: toggling unlimited on preserves expenditure since the last real refill; turning it off restores the clamped nominal remainder, preventing a free refill through toggle cycling. Record the first nominal exhaustion time/location once per refill leg and retain it until a pad refill/reset. Beyond that event, expenditure remains diagnostic; it is not a counterfactual physics replay.

**Gate:** finite gas disables all gas-driven thrust at exhaustion while wheel driving remains possible. Unlimited mode continues firing and marks the correct first exhaustion. Assistance cost is included, toggles do not erase expenditure, and valid pad refills/reset clear the record predictably. Basic telemetry makes outcomes explainable without overwhelming the driving view.

## Slice 5 — expand only enough to judge the mechanic

Extend the proving ground with straight and offset crossings, a recovery bowl, scattered rocks, and open run-up/turnaround space. Keep world/layout tuning independent from the source Stalheart recipe. Add inspection camera choices and the small lab tuning panel with restore-defaults.

Audit the imported breach adapter before creating differently sized holes: the game wrapper currently shares a `uBreachRadius` value that is updated on creation, while the boss wrapper assumes one active hole. Give each hole consistent visual and contact parameters; do not copy either wrapper unchanged and assume multi-hole parity.

**Gate:** several differently sized holes render and collide correctly at once, and repeated reset does not accumulate resources. Play the same crossing at different approach speeds and assistance levels. Confirm readable landings, enjoyable recoveries, useful gas choices, and an urge to retry. Capture a short findings record and the exact tested config. Continue tuning this slice before adding missions if the movement is not yet enjoyable.

## Validation proportional to risk

Use deterministic simulation checks for radial gravity/frame transforms, thrust/torque directions, finite gas and exhaustion markers, reset state, and bowl/throat collision agreement. Compare scripted inputs at different render cadences while retaining the same fixed simulation step. Test high-speed rim contact and partially supported takeoff; these expose meaningful failures beyond a flat-floor drive test.

Browser acceptance should load only local pinned assets, reject missing assets/shader errors, exercise keyboard focus loss, switch cameras, repeat jump/reset cycles, and inspect settled/opening/multiple sinkholes. Record frame-time measurements on the actual test machine and declared scene before setting a performance target. Manual playtesting decides camera readability and movement satisfaction.

## Open implementation research

- **Nozzle authority:** can the current grouped gimbals and socket layout deliver the agreed commands without unrealistic invisible forces? What compromises are visible and acceptable?
- **Contact solver:** which minimal solver handles six support samples plus chassis/rim impacts without jitter or tunnelling? How should collision follow animated subsidence?
- **Control frame:** validate whether airborne direction commands are body-relative or interpreted through the local surface by assistance; keep actual thrust body/nozzle-oriented. Test this during tilted flight, inversion, and grounded transitions.
- **Articulation:** grouped geometry limits true independent wheel steering/spin/suspension. Use honest grouped animation first; record any later asset changes separately.
- **World adapter:** ensure all holes share the correct spherical mapping while retaining independent radius and opening state; measure the cost of several settled and opening effects.
- **Tuning and feel:** gravity, impulse duration, thrust, mass/inertia, tank size, refill eligibility, wreck/fall thresholds, damping, camera response, and course dimensions remain experimental.

Phone input, gamepad support, survey tasks, enemies, caves, races, and integration into Stalheart begin only after the movement/look/feel gate. Future integration should consume a reviewed movement/assets contract, not a runtime dependency back into this standalone lab.
