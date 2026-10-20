# Flight, bounds and stunt crashes

Controls switch on actual supporting wheel contact. With any wheel touching, the rover uses the ground set; with none touching, it uses the airborne set. ISAO keeps its separate quadcopter controls.

| Keys | Wheels touching | Airborne |
| --- | --- | --- |
| W / S | Drive / brake / reverse | Sagittal Flip: pitch forward / backward |
| A / D | Steer left / right | Transverse Flip: yaw left / right |
| Q / E | Inactive | Coronal Flip: roll left / right |
| Space | Take off | Main lift jets |
| Shift + W / S | Forward / backward gas boost, plus drive / braking | Body-forward / backward gas boost; no W/S pitch or downward thrust |
| Shift + Space | Downforce toward the planet; no lift | Straight down-thrust toward the planet |
| Shift alone | No action | No action |
| X | Rear handbrake / drift | Brake translation without stopping rotation |
| C | Inactive | Counter angular velocity and level out |

Arrow keys remain pitch/yaw aliases. All three rotation pairs have matching initial angular acceleration. Release to coast; press the opposite key to counter. C discards partial winding and restores stabilization. Unmodified W/S rotates in the air; Shift+W/S supplies body-forward/backward translation. Shift+Space replaces lift with down-thrust and can combine with those longitudinal boosts. Releasing W/S while keeping Shift held adds no force. X remains a direct flight brake. Every reaction jet consumes the same finite gas reserve and scales with thruster damage.

The painted road remains 18 m wide. Out-of-bounds checking adds 4 m beyond each edge and checks only wheel contact positions. A countdown starts only when every touching wheel is outside that generous boundary. `OUT OF BOUNDS 5 → 4 → 3 → 2 → 1` gives five seconds to return; returning any touching wheel inside or becoming airborne clears it. Expiry triggers the normal three-second checkpoint penalty. Airborne travel alone never triggers out-of-bounds recovery.

Mandatory gates accept the rover centre between the flags, from road level to the actual top of that flag model (4.60–4.93 m). Swept validation catches fast crossings. Flying above the flag tops does not count. Gates remain ordered.

Completed physical turns score Coronal Flip (100), Sagittal Flip (150), and Transverse Flip (150). Additional turns increase the award up to 5×. An airborne gate crossing during a visible rotation (at least a quarter turn and 1 rad/s of spin) adds a named Gate Flip bonus: coronal/transverse 400, sagittal 500, or mixed planes 750. Each gate awards once; a straight hover or tiny flick earns no stunt bonus. Existing Sinkhole, Tremor, Alien and Rover crossing bonuses apply to all three planes.

Two or more completed rotations in one uninterrupted flight followed by a collision closing speed of at least 16 m/s trigger total destruction. This uses the full D3 geometry for every assembly, the authored detached fragments and a local explosion. The destroyed rover remains for eight seconds before the normal three-second checkpoint recovery. Manual recovery cannot skip the wreck hold; race restart still starts a fresh run. Gentle landings and non-stunt impacts keep the ordinary accumulated damage rules. Damage-disabled practice remains exempt.

Fixture and rover collisions retain the softer torque/friction response. Fast cornering physically lifts inside wheels; drive, steering and grip scale with wheel support, and `GRIP n/6` reports reduced contact. Ease the throttle, straighten or counter-steer to settle the chassis.

Validation: `npm test`, `npm run test:planes`, and the rendered expedition race. The focused suite covers all input planes, five-second bounds, airborne exemption, authored flag height, gate stunt scoring, catastrophic impact, recovery locking and repair.

Longitudinal boosts use the same finite gas reserve as lift and rotation, delivering 8 m/s² through opposed jets without added torque. Gas regenerates at 0.6 units/s. An empty tank supplies only this weak trickle until the driver lets it recharge; the unlimited lab toggle keeps full thrust available. The last five units are isolated from tank leaks, so damaged plumbing cannot prevent saving up a recovery burst. Pads still refill the entire reserve. W/S still powers the wheels on the road; above motor cruise speed, boosting coasts the drivetrain instead of fighting the jets. Forward motor acceleration is now capped at 9 m/s² (previously 6). Powered drifting starts above 4.5 m/s, breaks rear grip faster, and adds 18% yaw authority at full drift; straightening restores grip.

Pitch and roll flips preserve the chase-camera heading; yaw turns it. Landing eases the view back to the grounded heading. A newly wrecked chassis loses 80% of its linear momentum and 90% of its spin, cancels upward rebound, and settles with passive drag; the driving/righting controller is disabled throughout salvage.

Automatic overturned recovery: after five continuous seconds tilted past 100° on a surface without driving input, recover with the normal three-second race penalty. A single roof contact counts, short contact gaps are tolerated, and sliding does not block rescue. Driving input, getting upright or becoming airborne clears the timer. This works with an empty tank after the final gate; recovery refills gas and preserves validated gates and scores. Wreck salvage keeps its separate timer.

## Recovering from the roof or side

Space plus Q/E lifts away from the surface and rolls the rover onto its wheels. A short burst (roughly half a second) followed by C gives a controlled recovery; W/S pitch is also available while overturned. This uses gas and damaged thrusters still reduce authority. Recovery lift uses the opposed RCS ports toward the local sky until the chassis is mostly upright; ordinary inverted flight keeps its body-relative lift. Merely rolling off the roof is not a completed-flip bonus. The existing five-second idle reset remains a fallback.

## Small props and gantry structure

Flag poles, pad posts, small rocks and small loose sinkhole fragments use restrained angular response and reduced damage severity. Shallow side strikes cannot turn forward motion into an upward launch, and contact-induced spin is bounded. They remain solid. Large barriers, the deck and gantry retain their structural collision response.

The gantry now uses separate convex proxies from the visible model's connected beam, foot, rail and arm components, omitting tiny decorative trim. Its central underpass stays open; the arm and travelling assembly update their proxies with the celebration pose. Battle broad-phase envelopes include their full movement range.

During the disco song, screen HUDs disappear and the canvas fills the viewport. H/Tab can still explicitly open controls/settings. ISAO remains controllable, and normal HUDs return when the song ends or the race restarts.
